import { describe, expect, it } from 'vitest'
import { stripReplyAnchors } from '../src/contents/strip-anchor'
import { loadSample } from './helpers'

function doc(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

describe('stripReplyAnchors', () => {
  it('去掉主题链接尾部的 #replyN', () => {
    const d = doc('<div class="topic-item"><a href="/t/133088#reply1">帖子</a></div>')
    expect(stripReplyAnchors(d)).toBe(1)
    expect(d.querySelector('a')!.getAttribute('href')).toBe('/t/133088')
  })

  it('保留非 #replyN 的锚点', () => {
    const d = doc('<div class="topic-item"><a href="/t/1#comment">帖子</a></div>')
    expect(stripReplyAnchors(d)).toBe(0)
    expect(d.querySelector('a')!.getAttribute('href')).toBe('/t/1#comment')
  })

  it('侧栏等列表之外的主题链接同样处理', () => {
    const d = doc('<span class="hot_topic_title"><a href="/t/1#reply9">热议</a></span>')
    expect(stripReplyAnchors(d)).toBe(1)
    expect(d.querySelector('a')!.getAttribute('href')).toBe('/t/1')
  })

  it('不动页内楼层锚点', () => {
    const d = doc('<a class="gzk-floor-link" href="#reply9">#9</a>')
    expect(stripReplyAnchors(d)).toBe(0)
    expect(d.querySelector('a')!.getAttribute('href')).toBe('#reply9')
  })

  it('绝对地址的主题链接也处理', () => {
    const d = doc('<a href="https://www.guozaoke.com/t/2#reply3">帖子</a>')
    expect(stripReplyAnchors(d)).toBe(1)
    expect(d.querySelector('a')!.getAttribute('href')).toBe('https://www.guozaoke.com/t/2')
  })

  it('真实列表页里标题与回复数链接都不再带锚点', () => {
    const d = loadSample('samples/home.html')
    expect(stripReplyAnchors(d)).toBeGreaterThan(0)
    expect(d.querySelectorAll('a[href*="#reply"]')).toHaveLength(0)
  })
})
