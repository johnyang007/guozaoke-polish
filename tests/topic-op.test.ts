import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { markOpReplies } from '../src/contents/topic/op'
import { parseReplies } from '../src/contents/topic/parse'
import { loadSample } from './helpers'

function opFloors(doc: Document): number[] {
  return parseReplies(doc)
    .filter((r) => r.el.classList.contains(CLASS.OP))
    .map((r) => r.floor)
}

describe('markOpReplies', () => {
  it('给楼主的回复打上标记与徽章', () => {
    const doc = loadSample('samples/topic.html')
    const replies = parseReplies(doc)
    const author = replies[0]!.username

    const marked = markOpReplies(replies, author)

    expect(marked).toBeGreaterThan(0)
    expect(opFloors(doc).length).toBe(marked)
    const badge = doc.querySelector(`.${CLASS.OP_BADGE}`)
    expect(badge?.textContent).toBe('楼主')
    // 徽章紧跟在用户名链接之后
    expect(badge?.previousElementSibling?.classList.contains('reply-username')).toBe(true)
  })

  it('只标记与楼主同名的回复', () => {
    const doc = loadSample('samples/topic.html')
    const replies = parseReplies(doc)
    const author = replies[0]!.username

    markOpReplies(replies, author)

    for (const r of replies) {
      expect(r.el.classList.contains(CLASS.OP)).toBe(r.username === author)
    }
  })

  it('重复执行不会重复插入徽章', () => {
    const doc = loadSample('samples/topic.html')
    const replies = parseReplies(doc)
    const author = replies[0]!.username

    const first = markOpReplies(replies, author)
    markOpReplies(replies, author)

    expect(doc.querySelectorAll(`.${CLASS.OP_BADGE}`)).toHaveLength(first)
  })

  it('接管站点自带的「楼主」标记，不留重复文案', () => {
    const doc = loadSample('samples/topic-65.html')
    const replies = parseReplies(doc)

    markOpReplies(replies, 'ipvantowuhan')

    const op = replies.find((r) => r.username === 'ipvantowuhan')!
    const marks = Array.from(op.el.querySelectorAll('.main .meta span')).filter(
      (el) => el.textContent?.trim() === '楼主'
    )
    expect(marks).toHaveLength(1)
    expect(marks[0]!.classList.contains(CLASS.OP_BADGE)).toBe(true)
  })

  it('拿不到楼主时什么都不做', () => {
    const doc = loadSample('samples/topic.html')
    expect(markOpReplies(parseReplies(doc), null)).toBe(0)
    expect(doc.querySelector(`.${CLASS.OP_BADGE}`)).toBeNull()
  })
})
