import { STORAGE_KEY } from '../constants'
import { getConfig, saveConfig } from '../storage'
import type { ThemeMode } from '../types'
import { applyTheme, initTheme } from './theme'
import { mountThemeSwitch, setActiveMode } from './theme-switch'

void initTheme()

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true })
  } else {
    fn()
  }
}

/** 在个人信息卡右上角挂主题切换控件，点击即时生效并写回配置。 */
async function initThemeSwitch(): Promise<void> {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const config = await getConfig()

  const el = mountThemeSwitch(document, config.theme, (mode: ThemeMode) => {
    applyTheme(document.documentElement, mode, mq.matches)
    void saveConfig({ ...config, theme: mode }).catch(() => {})
    config.theme = mode
  })
  if (!el) return

  // 从弹窗或设置页改动时，控件跟着更新。
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return
    const t = (changes[STORAGE_KEY.CONFIG]?.newValue as { theme?: unknown } | undefined)?.theme
    if (t === 'auto' || t === 'light' || t === 'dark') setActiveMode(el, t)
  })
}

onReady(() => {
  void initThemeSwitch().catch(() => {
    // 静默降级
  })
})
