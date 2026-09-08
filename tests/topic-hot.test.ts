import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { pickHotReplies, renderHotReplies } from '../src/contents/topic/hot-replies'
import { parseReplies } from '../src/contents/topic/parse'
import { resolveQuotes } from '../src/contents/topic/quote'
import type { ParsedReply } from '../src/types'
import { loadSample } from './helpers'

function reply(
  floor: number,
  votes: number,
  mentionedUser: string | null = null,
  username = `u${floor}`
): ParsedReply {
  return {
    el: document.createElement('div'),
    floor,
    username,
    replyId: String(floor),
    votes,
    time: '',
    location: null,
    mentionedUser,
    contentText: `内容 ${floor}`,
    quotedFloor: null,
  }
}

describe('pickHotReplies', () => {
  it('按赞数阈值筛选并降序排列', () => {
    const hot = pickHotReplies([reply(1, 1), reply(2, 12), reply(3, 7)], 5)
    expect(hot.map((r) => r.floor)).toEqual([2, 3])
  })

  it('赞数相同时楼层小的在前', () => {
    const hot = pickHotReplies([reply(3, 8), reply(1, 8)], 5)
    expect(hot.map((r) => r.floor)).toEqual([1, 3])
  })

  it('被引用次数达到阈值也入选，即便赞数不够', () => {
    const replies = resolveQuotes(
      [reply(1, 0, null, 'a'), reply(2, 0, 'a', 'b'), reply(3, 0, 'a', 'c'), reply(4, 0, 'a', 'd')],
      null
    )
    expect(pickHotReplies(replies, 5, 3).map((r) => r.floor)).toEqual([1])
  })

  it('限制返回条数', () => {
    const replies = Array.from({ length: 10 }, (_, i) => reply(i + 1, 100 - i))
    expect(pickHotReplies(replies, 5, 3, 5)).toHaveLength(5)
  })

  it('无人入选时返回空数组', () => {
    expect(pickHotReplies([reply(1, 0), reply(2, 1)], 5)).toEqual([])
  })
})

describe('renderHotReplies', () => {
  it('有热门回复时插入热门区', () => {
    const doc = loadSample('samples/topic.html')
    const hot = pickHotReplies(parseReplies(doc), 5)

    expect(hot.length).toBeGreaterThan(0)
    renderHotReplies(doc, hot)

    const box = doc.querySelector(`.${CLASS.HOT_BOX}`)
    expect(box).not.toBeNull()
    expect(box!.querySelectorAll('.gzk-hot-item')).toHaveLength(hot.length)
  })

  it('插在回复区头部之后', () => {
    const doc = loadSample('samples/topic.html')
    renderHotReplies(doc, pickHotReplies(parseReplies(doc), 5))
    const box = doc.querySelector(`.${CLASS.HOT_BOX}`)!
    expect(box.previousElementSibling!.classList.contains('ui-header')).toBe(true)
  })

  it('重复渲染只保留一个热门区', () => {
    const doc = loadSample('samples/topic.html')
    const hot = pickHotReplies(parseReplies(doc), 5)
    renderHotReplies(doc, hot)
    renderHotReplies(doc, hot)
    expect(doc.querySelectorAll(`.${CLASS.HOT_BOX}`)).toHaveLength(1)
  })

  it('在回复区表头追加热门条数', () => {
    const doc = loadSample('samples/topic.html')
    const hot = pickHotReplies(parseReplies(doc), 5)
    renderHotReplies(doc, hot)

    const count = doc.querySelector(`.${CLASS.HOT_COUNT}`)
    expect(count).not.toBeNull()
    expect(count!.textContent).toContain(`${hot.length} 条热门回复`)
    expect(count!.closest('.ui-header')).not.toBeNull()
  })

  it('重复渲染时表头只有一处热门条数', () => {
    const doc = loadSample('samples/topic.html')
    const hot = pickHotReplies(parseReplies(doc), 5)
    renderHotReplies(doc, hot)
    renderHotReplies(doc, hot)
    expect(doc.querySelectorAll(`.${CLASS.HOT_COUNT}`)).toHaveLength(1)
  })

  it('无热门回复时不插入任何东西', () => {
    const doc = loadSample('samples/topic.html')
    renderHotReplies(doc, [])
    expect(doc.querySelector(`.${CLASS.HOT_BOX}`)).toBeNull()
    expect(doc.querySelector(`.${CLASS.HOT_COUNT}`)).toBeNull()
  })
})
