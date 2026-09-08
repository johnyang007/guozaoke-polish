import { describe, expect, it } from 'vitest'
import { parseReplies } from '../src/contents/topic/parse'
import { buildQuoteChain, buildQuoteChildren, resolveQuotes } from '../src/contents/topic/quote'
import type { ParsedReply } from '../src/types'
import { loadSample } from './helpers'

function reply(floor: number, username: string, mentionedUser: string | null): ParsedReply {
  return {
    el: document.createElement('div'),
    floor,
    username,
    replyId: String(floor),
    votes: 0,
    time: '',
    location: null,
    mentionedUser,
    contentText: '',
    quotedFloor: null,
  }
}

describe('resolveQuotes', () => {
  it('指向该用户此前最近的一个楼层', () => {
    const r = resolveQuotes(
      [reply(1, 'a', null), reply(2, 'b', null), reply(3, 'a', null), reply(4, 'c', 'a')],
      null
    )
    expect(r[3]!.quotedFloor).toBe(3)
  })

  it('被引用者只在更早楼层出现一次时正确指向', () => {
    const r = resolveQuotes([reply(1, 'a', null), reply(2, 'b', 'a')], null)
    expect(r[1]!.quotedFloor).toBe(1)
  })

  it('被引用者是楼主且此前无回复时指向 0', () => {
    const r = resolveQuotes([reply(1, 'b', 'op')], 'op')
    expect(r[0]!.quotedFloor).toBe(0)
  })

  it('楼主此前已回复过时指向其回复楼层而非 0', () => {
    const r = resolveQuotes([reply(1, 'op', null), reply(2, 'b', 'op')], 'op')
    expect(r[1]!.quotedFloor).toBe(1)
  })

  it('找不到被引用者时保持 null', () => {
    expect(resolveQuotes([reply(1, 'a', 'ghost')], null)[0]!.quotedFloor).toBeNull()
  })

  it('无 @ 的回复保持 null', () => {
    expect(resolveQuotes([reply(1, 'a', null)], null)[0]!.quotedFloor).toBeNull()
  })

  it('不会指向自身或更晚的楼层', () => {
    const r = resolveQuotes([reply(1, 'a', 'a'), reply(2, 'b', null)], null)
    expect(r[0]!.quotedFloor).toBeNull()
  })
})

describe('buildQuoteChildren', () => {
  it('汇总每个楼层被哪些楼层引用', () => {
    const replies = resolveQuotes(
      [reply(1, 'a', null), reply(2, 'b', 'a'), reply(3, 'c', 'a'), reply(4, 'd', 'b')],
      null
    )
    const children = buildQuoteChildren(replies)
    expect(children.get(1)).toEqual([2, 3])
    expect(children.get(2)).toEqual([4])
    expect(children.has(3)).toBe(false)
  })
})

describe('真实样本', () => {
  const doc = loadSample('samples/topic.html')
  const replies = resolveQuotes(parseReplies(doc), 'BlueSandMu')

  it('至少解析出 5 条引用关系', () => {
    expect(replies.filter((r) => r.quotedFloor !== null).length).toBeGreaterThanOrEqual(5)
  })

  it('所有已解析的引用都指向更早的楼层或楼主', () => {
    for (const r of replies) {
      if (r.quotedFloor === null) continue
      expect(r.quotedFloor).toBeLessThan(r.floor)
    }
  })
})

describe('buildQuoteChain', () => {
  /** #1 a → #2 b@a → #3 c@b → #4 d@c，构成一条四层盖楼。 */
  function chainReplies(): ParsedReply[] {
    return resolveQuotes(
      [
        reply(1, 'a', null),
        reply(2, 'b', 'a'),
        reply(3, 'c', 'b'),
        reply(4, 'd', 'c'),
      ],
      null
    )
  }

  it('由近及远返回整条引用链', () => {
    const replies = chainReplies()
    const chain = buildQuoteChain(replies, replies[3]!)
    expect(chain.map((c) => c.floor)).toEqual([3, 2, 1])
    expect(chain.map((c) => c.reply?.username)).toEqual(['c', 'b', 'a'])
  })

  it('受层数上限约束', () => {
    const replies = chainReplies()
    expect(buildQuoteChain(replies, replies[3]!, 2).map((c) => c.floor)).toEqual([3, 2])
  })

  it('没有引用关系时返回空链', () => {
    const replies = chainReplies()
    expect(buildQuoteChain(replies, replies[0]!)).toEqual([])
  })

  it('引用主题正文时以楼主收尾', () => {
    const replies = resolveQuotes([reply(1, 'b', 'a'), reply(2, 'c', 'b')], 'a')
    const chain = buildQuoteChain(replies, replies[1]!)
    expect(chain.map((c) => c.floor)).toEqual([1, 0])
    expect(chain[1]!.reply).toBeNull()
  })

  it('引用关系成环时不会死循环', () => {
    const a = reply(1, 'a', null)
    const b = reply(2, 'b', null)
    a.quotedFloor = 2
    b.quotedFloor = 1
    expect(buildQuoteChain([a, b], a).length).toBeLessThanOrEqual(2)
  })
})
