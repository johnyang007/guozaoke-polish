import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/constants'
import { mergeConfig, pruneReadTopics } from '../src/storage'
import { extractTopicId } from '../src/utils'

describe('mergeConfig', () => {
  it('空输入返回默认配置', () => {
    expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })

  it('深合并已存字段，其余保留默认值', () => {
    const c = mergeConfig({ theme: 'dark', topic: { hotThreshold: 9 } })
    expect(c.theme).toBe('dark')
    expect(c.topic.hotThreshold).toBe(9)
    expect(c.topic.collapse).toBe(DEFAULT_CONFIG.topic.collapse)
    expect(c.home.readMarker).toBe(DEFAULT_CONFIG.home.readMarker)
  })

  it('丢弃非法的 theme 值', () => {
    expect(mergeConfig({ theme: 'neon' }).theme).toBe(DEFAULT_CONFIG.theme)
  })

  it('过滤结构不合法的屏蔽规则', () => {
    const c = mergeConfig({
      home: {
        blockRules: [
          { id: 'a', type: 'keyword', value: '广告', enabled: true },
          { id: 'b', type: 'bogus', value: 'x', enabled: true },
          { id: 'c', type: 'user', value: '', enabled: true },
        ],
      },
    })
    expect(c.home.blockRules).toEqual([{ id: 'a', type: 'keyword', value: '广告', enabled: true }])
  })
})

describe('pruneReadTopics', () => {
  it('超出上限时保留时间戳最新的若干条', () => {
    expect(pruneReadTopics({ a: 1, b: 5, c: 3, d: 4 }, 2)).toEqual({ b: 5, d: 4 })
  })

  it('未超出上限时原样返回', () => {
    const map = { a: 1, b: 2 }
    expect(pruneReadTopics(map, 5)).toEqual(map)
  })
})

describe('extractTopicId', () => {
  it.each([
    ['https://www.guozaoke.com/t/133089#reply40', '133089'],
    ['/t/132793?p=2', '132793'],
    ['/t/1', '1'],
  ])('从 %s 提取 %s', (href, id) => {
    expect(extractTopicId(href)).toBe(id)
  })

  it('非话题链接返回 null', () => {
    expect(extractTopicId('/u/guozaoke')).toBeNull()
    expect(extractTopicId('/nodes')).toBeNull()
  })
})
