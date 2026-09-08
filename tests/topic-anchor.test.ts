import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { applyAnchors, floorElementId, scrollToFloor } from '../src/contents/topic/anchor'
import { parseReplies } from '../src/contents/topic/parse'
import { loadSample } from './helpers'

function load(): Document {
  return loadSample('samples/topic.html')
}

describe('floorElementId', () => {
  it('与站点原有 #replyN 锚点保持一致', () => {
    expect(floorElementId(40)).toBe('reply40')
  })
})

describe('applyAnchors', () => {
  it('给每条回复注入 id', () => {
    const doc = load()
    const replies = parseReplies(doc)
    applyAnchors(replies)
    expect(doc.getElementById('reply1')).toBe(replies[0]!.el)
    expect(doc.getElementById('reply40')).toBe(replies[39]!.el)
  })

  it('把楼层号变成可点击链接', () => {
    const doc = load()
    const replies = parseReplies(doc)
    applyAnchors(replies)
    const link = replies[0]!.el.querySelector('a.gzk-floor-link')
    expect(link).not.toBeNull()
    expect(link!.textContent).toBe('#1')
    expect(link!.getAttribute('href')).toBe('#reply1')
  })

  it('重复调用不会重复注入链接', () => {
    const doc = load()
    const replies = parseReplies(doc)
    applyAnchors(replies)
    applyAnchors(replies)
    expect(replies[0]!.el.querySelectorAll('a.gzk-floor-link')).toHaveLength(1)
  })
})

describe('scrollToFloor', () => {
  it('目标存在时加高亮并返回 true', () => {
    const doc = load()
    applyAnchors(parseReplies(doc))
    expect(scrollToFloor(doc, 3)).toBe(true)
    expect(doc.getElementById('reply3')!.classList.contains(CLASS.HIGHLIGHT)).toBe(true)
  })

  it('楼层 0 定位到主题正文', () => {
    const doc = load()
    expect(scrollToFloor(doc, 0)).toBe(true)
  })

  it('目标不存在时返回 false', () => {
    const doc = load()
    applyAnchors(parseReplies(doc))
    expect(scrollToFloor(doc, 999)).toBe(false)
  })
})
