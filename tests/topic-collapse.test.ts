import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { applyCollapse, shouldCollapse } from '../src/contents/topic/collapse'
import { parseReplies } from '../src/contents/topic/parse'
import { loadSample } from './helpers'

/** 按正文字数模拟高度：每 40 字约一行 24px。 */
const measure = (el: HTMLElement): number => Math.ceil((el.textContent ?? '').length / 40) * 24

describe('shouldCollapse', () => {
  it('高度超过阈值时折叠', () => {
    expect(shouldCollapse(300, 240)).toBe(true)
  })

  it('高度等于或低于阈值时不折叠', () => {
    expect(shouldCollapse(240, 240)).toBe(false)
    expect(shouldCollapse(100, 240)).toBe(false)
  })
})

describe('applyCollapse', () => {
  it('只折叠超长回复并插入展开按钮', () => {
    const doc = loadSample('samples/topic-paged-p1.html')
    const replies = parseReplies(doc)

    const collapsed = applyCollapse(doc, replies, 240, measure)

    expect(collapsed).toBeGreaterThan(0)
    expect(collapsed).toBeLessThan(replies.length)
    const anyCollapsed = replies.find((r) => r.el.classList.contains(CLASS.COLLAPSED))!
    expect(anyCollapsed.el.querySelector(`.${CLASS.COLLAPSE_TOGGLE}`)).not.toBeNull()
  })

  it('点击展开按钮后移除折叠状态', () => {
    const doc = loadSample('samples/topic-paged-p1.html')
    const replies = parseReplies(doc)

    applyCollapse(doc, replies, 240, measure)
    const target = replies.find((r) => r.el.classList.contains(CLASS.COLLAPSED))!
    const toggle = target.el.querySelector<HTMLElement>(`.${CLASS.COLLAPSE_TOGGLE}`)!

    toggle.click()

    expect(target.el.classList.contains(CLASS.COLLAPSED)).toBe(false)
    expect(target.el.querySelector(`.${CLASS.COLLAPSE_TOGGLE}`)).toBeNull()
  })

  it('全部回复都不超长时返回 0', () => {
    const doc = loadSample('samples/topic.html')
    expect(applyCollapse(doc, parseReplies(doc), 240, () => 10)).toBe(0)
  })

  it('重复调用不会重复插入按钮', () => {
    const doc = loadSample('samples/topic-paged-p1.html')
    const replies = parseReplies(doc)
    applyCollapse(doc, replies, 240, measure)
    applyCollapse(doc, replies, 240, measure)
    const target = replies.find((r) => r.el.classList.contains(CLASS.COLLAPSED))!
    expect(target.el.querySelectorAll(`.${CLASS.COLLAPSE_TOGGLE}`)).toHaveLength(1)
  })
})
