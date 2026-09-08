import { describe, expect, it, vi } from 'vitest'
import { CLASS } from '../src/constants'
import {
  createThemeSwitch,
  HOST_CLASS,
  mountThemeSwitch,
  setActiveMode,
} from '../src/contents/theme-switch'
import type { ThemeMode } from '../src/types'

function doc(html: string): Document {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
}

const USERCARD = '<div class="usercard container-box"><div class="ui-header">someuser</div></div>'

describe('createThemeSwitch', () => {
  it('给出浅色/深色/跟随系统三个选项', () => {
    const el = createThemeSwitch(document, 'auto', () => {})
    const modes = Array.from(el.querySelectorAll('button')).map((b) => b.dataset['mode'])
    expect(modes).toEqual(['light', 'dark', 'auto'])
  })

  it('当前模式标记为选中', () => {
    const el = createThemeSwitch(document, 'dark', () => {})
    expect(el.querySelector('[data-mode="dark"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('[data-mode="light"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('点击回调传出对应模式', () => {
    const onSelect = vi.fn((_m: ThemeMode) => {})
    const el = createThemeSwitch(document, 'auto', onSelect)
    el.querySelector<HTMLButtonElement>('[data-mode="light"]')!.click()
    expect(onSelect).toHaveBeenCalledWith('light')
  })
})

describe('setActiveMode', () => {
  it('切换选中态', () => {
    const el = createThemeSwitch(document, 'auto', () => {})
    setActiveMode(el, 'light')
    expect(el.querySelector('[data-mode="light"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('[data-mode="auto"]')!.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('mountThemeSwitch', () => {
  it('挂到个人信息卡的头部', () => {
    const d = doc(USERCARD)
    const el = mountThemeSwitch(d, 'auto', () => {})
    expect(el).not.toBeNull()
    expect(el!.parentElement!.classList.contains('ui-header')).toBe(true)
  })

  it('未登录时退到登录卡片的头部', () => {
    const d = doc('<div class="login-box container-box"><div class="ui-header">标语</div></div>')
    const el = mountThemeSwitch(d, 'auto', () => {})
    expect(el!.parentElement!.classList.contains('ui-header')).toBe(true)
  })

  it('登录卡片没有头部时挂在卡片上', () => {
    const d = doc('<div class="login-box container-box">登录</div>')
    const el = mountThemeSwitch(d, 'auto', () => {})
    expect(el!.parentElement!.classList.contains('login-box')).toBe(true)
  })

  it('都没有时挂到导航栏右侧', () => {
    const d = doc('<nav class="navbar top-navbar"><ul class="nav navbar-nav navbar-right"><li>登录</li></ul></nav>')
    const el = mountThemeSwitch(d, 'auto', () => {})
    expect(el!.parentElement!.tagName).toBe('LI')
    expect(el!.closest('.navbar-right')).not.toBeNull()
  })

  it('给宿主打上标记，便于留出右上角空间', () => {
    const d = doc(USERCARD)
    const el = mountThemeSwitch(d, 'auto', () => {})
    expect(el!.parentElement!.classList.contains(HOST_CLASS)).toBe(true)
  })

  it('没有任何宿主时返回 null', () => {
    expect(mountThemeSwitch(doc('<div></div>'), 'auto', () => {})).toBeNull()
  })

  it('重复调用只保留一个', () => {
    const d = doc(USERCARD)
    mountThemeSwitch(d, 'auto', () => {})
    mountThemeSwitch(d, 'dark', () => {})
    expect(d.querySelectorAll(`.${CLASS.THEME_SWITCH}`)).toHaveLength(1)
  })
})
