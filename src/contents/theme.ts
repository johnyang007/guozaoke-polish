import { STORAGE_KEY } from '../constants'
import { getConfig } from '../storage'
import type { ThemeMode } from '../types'

export const THEME_ATTR = 'data-gzk-theme'

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark' {
  if (mode === 'auto') return prefersDark ? 'dark' : 'light'
  return mode
}

export function applyTheme(root: HTMLElement, mode: ThemeMode, prefersDark: boolean): void {
  root.setAttribute(THEME_ATTR, resolveTheme(mode, prefersDark))
}

/**
 * 读取配置并应用主题，同时监听系统偏好与配置变更。
 *
 * 在 document_start 调用；storage 读取是异步的，
 * 因此 CSS 必须在无属性时也能通过 prefers-color-scheme 正确着色，避免闪烁。
 */
export async function initTheme(): Promise<void> {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  let mode: ThemeMode = 'auto'

  const render = (): void => applyTheme(document.documentElement, mode, mq.matches)

  try {
    mode = (await getConfig()).theme
  } catch {
    // 读取失败时保持 auto
  }
  render()

  mq.addEventListener('change', render)

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return
    const next = changes[STORAGE_KEY.CONFIG]?.newValue
    if (typeof next !== 'object' || next === null) return
    const t = (next as { theme?: unknown }).theme
    if (t === 'auto' || t === 'light' || t === 'dark') {
      mode = t
      render()
    }
  })
}
