import { applyTheme } from '../contents/theme'
import { getConfig, saveConfig } from '../storage'
import type { Config, ThemeMode } from '../types'

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readPath(config: Config, path: string): boolean {
  const [group, key] = path.split('.') as ['home' | 'topic', string]
  return Boolean((config[group] as unknown as Record<string, unknown>)[key])
}

function writePath(config: Config, path: string, value: boolean): void {
  const [group, key] = path.split('.') as ['home' | 'topic', string]
  ;(config[group] as unknown as Record<string, unknown>)[key] = value
}

function isThemeMode(v: string | undefined): v is ThemeMode {
  return v === 'auto' || v === 'light' || v === 'dark'
}

async function main(): Promise<void> {
  const config = await getConfig()

  // popup 自身也跟随主题。
  applyTheme(document.documentElement, config.theme, prefersDark())

  const themeBox = document.getElementById('theme')
  const syncThemeButtons = (): void => {
    for (const btn of themeBox?.querySelectorAll<HTMLButtonElement>('button') ?? []) {
      btn.classList.toggle('active', btn.dataset['theme'] === config.theme)
    }
  }
  syncThemeButtons()

  themeBox?.addEventListener('click', (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('button[data-theme]')
    const theme = btn?.dataset['theme']
    if (!isThemeMode(theme)) return

    config.theme = theme
    syncThemeButtons()
    applyTheme(document.documentElement, theme, prefersDark())
    void saveConfig(config)
  })

  for (const input of document.querySelectorAll<HTMLInputElement>('input[data-path]')) {
    const path = input.dataset['path']
    if (path === undefined) continue

    input.checked = readPath(config, path)
    input.addEventListener('change', () => {
      writePath(config, path, input.checked)
      void saveConfig(config)
    })
  }

  document.getElementById('open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })
}

void main()
