import { beforeAll, describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { applyReadMarks, parseTopicList } from '../src/contents/home/parse'
import { loadSample } from './helpers'

let doc: Document

beforeAll(() => {
  doc = loadSample('samples/home.html')
})

describe('parseTopicList', () => {
  it('解析出全部主题项', () => {
    expect(parseTopicList(doc).length).toBeGreaterThan(10)
  })

  it('第一条主题的字段完整', () => {
    const first = parseTopicList(doc)[0]!
    expect(first.topicId).toMatch(/^\d+$/)
    expect(first.title.length).toBeGreaterThan(0)
    expect(first.nodeSlug).toBeTruthy()
    expect(first.username).toBeTruthy()
    expect(first.replyCount).toBeGreaterThanOrEqual(0)
  })

  it('标题不包含置顶图标带来的空白噪声', () => {
    for (const item of parseTopicList(doc)) {
      expect(item.title).toBe(item.title.trim())
      expect(item.title).not.toMatch(/\s{2,}/)
    }
  })
})

describe('applyReadMarks', () => {
  it('只给已读主题加 class', () => {
    const items = parseTopicList(doc)
    const target = items[0]!
    applyReadMarks(items, { [target.topicId!]: Date.now() })
    expect(target.el.classList.contains(CLASS.READ)).toBe(true)
    expect(items[1]!.el.classList.contains(CLASS.READ)).toBe(false)
  })
})
