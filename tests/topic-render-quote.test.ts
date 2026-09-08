import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { parseReplies } from '../src/contents/topic/parse'
import { resolveQuotes } from '../src/contents/topic/quote'
import { quoteSummary, renderQuotes } from '../src/contents/topic/render-quote'
import type { ParsedReply } from '../src/types'
import { loadSample } from './helpers'

function load(): Document {
  return loadSample('samples/topic.html')
}

function prepare(): { doc: Document; replies: ParsedReply[] } {
  const doc = load()
  return { doc, replies: resolveQuotes(parseReplies(doc), 'BlueSandMu') }
}

describe('quoteSummary', () => {
  it('截断超长文本并加省略号', () => {
    const r = { contentText: 'x'.repeat(100) } as ParsedReply
    expect(quoteSummary(r, 10)).toBe(`${'x'.repeat(10)}…`)
  })

  it('短文本原样返回', () => {
    expect(quoteSummary({ contentText: '短' } as ParsedReply, 10)).toBe('短')
  })

  it('传 null 表示楼主，返回空串', () => {
    expect(quoteSummary(null)).toBe('')
  })
})

describe('renderQuotes', () => {
  it('给有引用关系的回复插入引用块', () => {
    const { doc, replies } = prepare()
    renderQuotes(doc, replies)

    const quoted = replies.filter((r) => r.quotedFloor !== null)
    expect(quoted.length).toBeGreaterThan(0)
    for (const r of quoted) {
      expect(r.el.querySelector(`.${CLASS.QUOTE_BLOCK}`)).not.toBeNull()
    }
  })

  it('无引用关系的回复不插入引用块', () => {
    const { doc, replies } = prepare()
    renderQuotes(doc, replies)
    for (const r of replies.filter((x) => x.quotedFloor === null)) {
      expect(r.el.querySelector(`.${CLASS.QUOTE_BLOCK}`)).toBeNull()
    }
  })

  it('给被引用的回复加上回应数徽章', () => {
    const { doc, replies } = prepare()
    renderQuotes(doc, replies)

    const referenced = new Set(
      replies.map((r) => r.quotedFloor).filter((f): f is number => f !== null && f > 0)
    )
    expect(referenced.size).toBeGreaterThan(0)
    for (const floor of referenced) {
      const el = replies.find((r) => r.floor === floor)!.el
      expect(el.querySelector(`.${CLASS.REPLY_CHILDREN_BADGE}`)).not.toBeNull()
    }
  })

  it('引用块文本带被引用者楼层与用户名', () => {
    const { doc, replies } = prepare()
    renderQuotes(doc, replies)
    const target = replies.find((r) => r.quotedFloor !== null && r.quotedFloor > 0)!
    const who = target.el.querySelector('.gzk-quote-who')!
    expect(who.textContent).toMatch(/^#\d+ \S+$/)
  })

  it('重复调用不会重复插入', () => {
    const { doc, replies } = prepare()
    renderQuotes(doc, replies)
    const target = replies.find((r) => r.quotedFloor !== null)!
    const before = target.el.querySelectorAll(`.${CLASS.QUOTE_BLOCK}`).length

    renderQuotes(doc, replies)

    expect(target.el.querySelectorAll(`.${CLASS.QUOTE_STACK}`)).toHaveLength(1)
    expect(target.el.querySelectorAll(`.${CLASS.QUOTE_BLOCK}`)).toHaveLength(before)
  })
})

/** 造一条 #1 a ← #2 b ← #3 c ← … 的盖楼链，每层都有可插入引用块的 DOM。 */
function makeChain(doc: Document, depth: number): ParsedReply[] {
  const replies: ParsedReply[] = []
  for (let i = 1; i <= depth; i += 1) {
    const el = doc.createElement('div')
    el.className = 'reply-item'
    el.innerHTML = '<div class="main"><div class="meta"></div><div class="content"></div></div>'
    doc.body.appendChild(el)
    replies.push({
      el,
      floor: i,
      username: `u${i}`,
      replyId: String(i),
      votes: 0,
      time: '',
      location: null,
      mentionedUser: i === 1 ? null : `u${i - 1}`,
      contentText: `内容 ${i}`,
      quotedFloor: null,
    })
  }
  return resolveQuotes(replies, null)
}

describe('renderQuotes - 多层盖楼', () => {
  it('把整条引用链由远及近渲染成引用堆', () => {
    const doc = load()
    const replies = makeChain(doc, 3)
    renderQuotes(doc, replies)

    const stack = replies[2]!.el.querySelector(`.${CLASS.QUOTE_STACK}`)!
    const blocks = Array.from(stack.querySelectorAll(`.${CLASS.QUOTE_BLOCK}`))
    expect(blocks).toHaveLength(2)
    expect(blocks.map((b) => b.querySelector('.gzk-quote-who')!.textContent)).toEqual([
      '#1 u1',
      '#2 u2',
    ])
  })

  it('层级递进用 --gzk-quote-level 表达缩进', () => {
    const doc = load()
    const replies = makeChain(doc, 3)
    renderQuotes(doc, replies)

    const blocks = Array.from(
      replies[2]!.el.querySelectorAll<HTMLElement>(`.${CLASS.QUOTE_BLOCK}`)
    )
    expect(blocks.map((b) => b.style.getPropertyValue('--gzk-quote-level'))).toEqual(['0', '1'])
  })

  it('超过展示层数时折叠更早的层，点击展开再点收起', () => {
    const doc = load()
    const replies = makeChain(doc, 6)
    renderQuotes(doc, replies)

    const el = replies[5]!.el
    const blocks = Array.from(el.querySelectorAll<HTMLElement>(`.${CLASS.QUOTE_BLOCK}`))
    expect(blocks).toHaveLength(5)

    const more = el.querySelector<HTMLButtonElement>(`.${CLASS.QUOTE_MORE}`)!
    expect(more.textContent).toBe('展开更早的 2 层')
    expect(blocks.map((b) => b.hidden)).toEqual([true, true, false, false, false])

    more.click()
    expect(blocks.every((b) => !b.hidden)).toBe(true)
    expect(more.textContent).toBe('收起更早的 2 层')

    more.click()
    expect(blocks.map((b) => b.hidden)).toEqual([true, true, false, false, false])
  })

  it('链条不超过展示层数时不出现展开按钮', () => {
    const doc = load()
    const replies = makeChain(doc, 3)
    renderQuotes(doc, replies)
    expect(replies[2]!.el.querySelector(`.${CLASS.QUOTE_MORE}`)).toBeNull()
  })
})
