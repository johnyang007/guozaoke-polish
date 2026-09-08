import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/constants'
import { createRule, parseImported } from '../src/pages/options'

describe('createRule', () => {
  it('生成带唯一 id 的启用规则', () => {
    const a = createRule('keyword', ' 招聘 ')!
    expect(a.type).toBe('keyword')
    expect(a.value).toBe('招聘')
    expect(a.enabled).toBe(true)
    expect(a.id).not.toBe(createRule('keyword', '招聘')!.id)
  })

  it('空值返回 null', () => {
    expect(createRule('user', '   ')).toBeNull()
  })
})

describe('parseImported', () => {
  it('合法 JSON 合并成完整配置', () => {
    const c = parseImported(JSON.stringify({ theme: 'dark' }))!
    expect(c.theme).toBe('dark')
    expect(c.topic.hotThreshold).toBe(DEFAULT_CONFIG.topic.hotThreshold)
  })

  it('非法 JSON 返回 null', () => {
    expect(parseImported('{ not json')).toBeNull()
  })

  it('非对象 JSON 返回默认配置', () => {
    expect(parseImported('123')).toEqual(DEFAULT_CONFIG)
  })
})
