import { describe, expect, it, vi } from 'vitest'
import { extractReplyElements, mergeReplyPages } from '../src/contents/topic/merge-pages'
import { parseReplies } from '../src/contents/topic/parse'
import { readSample } from './helpers'

const p1 = readSample('samples/topic-paged-p1.html')
const p2 = readSample('samples/topic-paged-p2.html')
const single = readSample('samples/topic.html')

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('extractReplyElements', () => {
  it('从整页 HTML 中取出全部 reply-item', () => {
    expect(extractReplyElements(p2)).toHaveLength(38)
  })

  it('无回复的 HTML 返回空数组', () => {
    expect(extractReplyElements('<html><body></body></html>')).toHaveLength(0)
  })
})

describe('mergeReplyPages', () => {
  it('未分页时不发请求并返回 null', async () => {
    const fetchPage = vi.fn()
    expect(await mergeReplyPages(parse(single), fetchPage)).toBeNull()
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('把第二页回复合并进第一页，楼层连续到 144', async () => {
    const doc = parse(p1)
    const fetchPage = vi.fn(async (_url: string) => p2)

    const result = await mergeReplyPages(doc, fetchPage)

    expect(result).toEqual({ merged: 38, pages: 2 })
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toContain('p=2')

    const replies = parseReplies(doc)
    expect(replies).toHaveLength(144)
    expect(replies.map((r) => r.floor)).toEqual(Array.from({ length: 144 }, (_, i) => i + 1))
  })

  it('按楼层升序插入，即使当前页不是第一页', async () => {
    const doc = parse(p2)
    const floors = await mergeReplyPages(doc, async () => p1).then(() =>
      parseReplies(doc).map((r) => r.floor)
    )

    expect(floors).toEqual([...floors].sort((a, b) => a - b))
    expect(floors[0]).toBe(1)
    expect(floors.at(-1)).toBe(144)
  })

  it('抓取失败时抛出，由调用方降级', async () => {
    await expect(
      mergeReplyPages(parse(p1), async () => {
        throw new Error('network down')
      })
    ).rejects.toThrow('network down')
  })

  it('上报进度', async () => {
    const onProgress = vi.fn()
    await mergeReplyPages(parse(p1), async () => p2, onProgress)
    expect(onProgress).toHaveBeenCalledWith(1, 1)
  })
})
