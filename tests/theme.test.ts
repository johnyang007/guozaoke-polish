import { describe, expect, it } from 'vitest'
import { applyTheme, resolveTheme } from '../src/contents/theme'

describe('resolveTheme', () => {
  it('auto 跟随系统', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })

  it('显式模式忽略系统偏好', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })
})

describe('applyTheme', () => {
  it('把结果写到 data-gzk-theme', () => {
    const root = document.createElement('html')
    applyTheme(root, 'dark', false)
    expect(root.getAttribute('data-gzk-theme')).toBe('dark')
    applyTheme(root, 'auto', false)
    expect(root.getAttribute('data-gzk-theme')).toBe('light')
  })
})
