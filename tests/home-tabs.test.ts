import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { markActiveTab } from '../src/contents/home/tabs'
import { loadSample } from './helpers'

function tabTexts(doc: Document): string[] {
  return Array.from(doc.querySelectorAll(`.${CLASS.TAB_ACTIVE}`)).map(
    (el) => el.textContent?.trim() ?? ''
  )
}

describe('markActiveTab', () => {
  it('标记与当前路径一致的页签', () => {
    const doc = loadSample('samples/home.html')
    const active = markActiveTab(doc, '/node/IT')

    expect(active?.textContent).toBe('IT技术')
    expect(tabTexts(doc)).toEqual(['IT技术'])
  })

  it('路径带末尾斜杠也能命中', () => {
    const doc = loadSample('samples/home.html')
    expect(markActiveTab(doc, '/node/qna/')?.textContent).toBe('你问我答')
  })

  it('首页不标记任何页签', () => {
    const doc = loadSample('samples/home.html')
    expect(markActiveTab(doc, '/')).toBeNull()
    expect(tabTexts(doc)).toEqual([])
  })

  it('重复调用只保留一个选中态', () => {
    const doc = loadSample('samples/home.html')
    markActiveTab(doc, '/node/IT')
    markActiveTab(doc, '/node/job')
    expect(tabTexts(doc)).toEqual(['找工作'])
  })
})
