import { describe, expect, it } from 'vitest'
import { heatClassName } from '../src/contents/home/badge'
import { matchBlockRule } from '../src/contents/home/block'
import type { BlockRule, TopicItemInfo } from '../src/types'

function item(overrides: Partial<TopicItemInfo> = {}): TopicItemInfo {
  return {
    el: document.createElement('div'),
    topicId: '1',
    title: '武汉光谷房价还能涨吗',
    node: '汤逊湖',
    nodeSlug: 'water',
    username: 'alice',
    replyCount: 3,
    ...overrides,
  }
}

const rule = (o: Partial<BlockRule>): BlockRule => ({
  id: 'r',
  type: 'keyword',
  value: 'x',
  enabled: true,
  ...o,
})

describe('matchBlockRule', () => {
  it('关键词命中标题（不区分大小写）', () => {
    expect(
      matchBlockRule(item({ title: 'AI 招聘专场' }), [rule({ type: 'keyword', value: 'ai' })])
    ).not.toBeNull()
  })

  it('关键词未命中返回 null', () => {
    expect(matchBlockRule(item(), [rule({ type: 'keyword', value: '区块链' })])).toBeNull()
  })

  it('节点按 slug 精确匹配', () => {
    expect(matchBlockRule(item(), [rule({ type: 'node', value: 'water' })])).not.toBeNull()
    expect(matchBlockRule(item(), [rule({ type: 'node', value: 'wat' })])).toBeNull()
  })

  it('用户按用户名精确匹配且不区分大小写', () => {
    expect(matchBlockRule(item(), [rule({ type: 'user', value: 'ALICE' })])).not.toBeNull()
    expect(matchBlockRule(item(), [rule({ type: 'user', value: 'bob' })])).toBeNull()
  })

  it('禁用的规则不参与匹配', () => {
    expect(
      matchBlockRule(item(), [rule({ type: 'node', value: 'water', enabled: false })])
    ).toBeNull()
  })

  it('返回第一条命中的规则', () => {
    const rules = [
      rule({ id: 'a', type: 'node', value: 'nope' }),
      rule({ id: 'b', type: 'node', value: 'water' }),
    ]
    expect(matchBlockRule(item(), rules)?.id).toBe('b')
  })
})

describe('heatClassName', () => {
  it.each([
    [0, null],
    [19, null],
    [20, 'gzk-heat-mid'],
    [49, 'gzk-heat-mid'],
    [50, 'gzk-heat-high'],
    [144, 'gzk-heat-high'],
  ])('回复数 %i 得到 %s', (count, expected) => {
    expect(heatClassName(count)).toBe(expected)
  })
})
