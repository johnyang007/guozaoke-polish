import { describe, expect, it } from 'vitest'
import { parsePagination, parseReplies, parseTotalReplyCount } from '../src/contents/topic/parse'
import { loadSample } from './helpers'

const simple = loadSample('samples/topic.html')
const paged1 = loadSample('samples/topic-paged-p1.html')
const paged2 = loadSample('samples/topic-paged-p2.html')

describe('parseReplies - 未分页样本', () => {
  const replies = parseReplies(simple)

  it('解析出 40 条回复', () => {
    expect(replies).toHaveLength(40)
  })

  it('楼层从 1 连续到 40', () => {
    expect(replies.map((r) => r.floor)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
  })

  it('第一条回复字段正确', () => {
    const r = replies[0]!
    expect(r.username).toBe('daleatt')
    expect(r.votes).toBe(0)
    expect(r.replyId).toBe('1560968')
    expect(r.time).toBe('4 小时前')
    expect(r.location).toBe('美国')
    expect(r.mentionedUser).toBeNull()
    expect(r.contentText).toContain('我觉得都不止')
  })

  it('楼主回复里站点混在 .time 中的「楼主」不算时间', () => {
    const op = parseReplies(loadSample('samples/topic-65.html')).find(
      (r) => r.username === 'ipvantowuhan'
    )!
    expect(op.time).toBe('昨天')
    expect(op.location).toBe('广东省')
  })

  it('识别出正文首个 @用户名', () => {
    const mentioned = replies.filter((r) => r.mentionedUser !== null)
    expect(mentioned.length).toBeGreaterThan(5)
    expect(mentioned.every((r) => r.mentionedUser !== '')).toBe(true)
  })

  it('赞数取自 data-count', () => {
    expect(Math.max(...replies.map((r) => r.votes))).toBeGreaterThan(0)
  })
})

describe('parseReplies - 分页样本', () => {
  it('第一页 106 条，楼层 1..106', () => {
    const r = parseReplies(paged1)
    expect(r).toHaveLength(106)
    expect(r[0]!.floor).toBe(1)
    expect(r.at(-1)!.floor).toBe(106)
  })

  it('第二页 38 条，楼层从 107 开始连续', () => {
    const r = parseReplies(paged2)
    expect(r).toHaveLength(38)
    expect(r[0]!.floor).toBe(107)
    expect(r.at(-1)!.floor).toBe(144)
  })
})

describe('parseTotalReplyCount', () => {
  it('从「共收到 N 条回复」读出总数', () => {
    expect(parseTotalReplyCount(simple)).toBe(40)
    expect(parseTotalReplyCount(paged1)).toBe(144)
    expect(parseTotalReplyCount(paged2)).toBe(144)
  })
})

describe('parsePagination', () => {
  it('未分页时返回 null', () => {
    expect(parsePagination(simple)).toBeNull()
  })

  it('第一页解析出 current=1 total=2', () => {
    const p = parsePagination(paged1)!
    expect(p.current).toBe(1)
    expect(p.total).toBe(2)
    expect(p.urls.get(2)).toContain('/t/132793?p=2')
  })

  it('第二页解析出 current=2 total=2', () => {
    const p = parsePagination(paged2)!
    expect(p.current).toBe(2)
    expect(p.total).toBe(2)
    expect(p.urls.get(1)).toContain('/t/132793?p=1')
  })
})
