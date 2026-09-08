import { CLASS } from '../constants'
import type { ThemeMode } from '../types'
import { qs } from '../utils'

interface ModeSpec {
  mode: ThemeMode
  icon: string
  label: string
}

const MODES: readonly ModeSpec[] = [
  { mode: 'light', icon: '☀', label: '浅色' },
  { mode: 'dark', icon: '☾', label: '深色' },
  { mode: 'auto', icon: '◐', label: '跟随系统' },
]

export const HOST_CLASS = 'gzk-switch-host'

/** 挂载优先级：个人信息卡头部 → 个人信息卡 → 登录卡片头部 → 登录卡片 → 导航栏右侧。 */
const HOSTS = [
  '.usercard .ui-header',
  '.usercard',
  '.login-box .ui-header',
  '.login-box',
  '.navbar-nav.navbar-right',
]

export function setActiveMode(el: HTMLElement, mode: ThemeMode): void {
  for (const btn of el.querySelectorAll<HTMLButtonElement>('button[data-mode]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset['mode'] === mode))
  }
}

/** 浅色 / 深色 / 跟随系统 三态分段控件。 */
export function createThemeSwitch(
  doc: Document,
  current: ThemeMode,
  onSelect: (mode: ThemeMode) => void
): HTMLElement {
  const wrap = doc.createElement('div')
  wrap.className = CLASS.THEME_SWITCH

  for (const { mode, icon, label } of MODES) {
    const btn = doc.createElement('button')
    btn.type = 'button'
    btn.dataset['mode'] = mode
    btn.textContent = icon
    btn.title = label
    btn.setAttribute('aria-label', label)
    btn.addEventListener('click', () => {
      setActiveMode(wrap, mode)
      onSelect(mode)
    })
    wrap.appendChild(btn)
  }

  setActiveMode(wrap, current)
  return wrap
}

/** 找到宿主并插入控件；已存在时先移除旧的。找不到宿主返回 null。 */
export function mountThemeSwitch(
  doc: Document,
  current: ThemeMode,
  onSelect: (mode: ThemeMode) => void
): HTMLElement | null {
  doc.querySelector(`.${CLASS.THEME_SWITCH}`)?.closest(`.${CLASS.THEME_SWITCH}-slot`)?.remove()
  doc.querySelector(`.${CLASS.THEME_SWITCH}`)?.remove()

  const host = HOSTS.reduce<HTMLElement | null>((found, sel) => found ?? qs(doc, sel), null)
  if (!host) return null

  const el = createThemeSwitch(doc, current, onSelect)

  // 控件绝对定位在宿主右上角，给宿主留出位置。
  host.classList.add(HOST_CLASS)

  // 导航栏是 <ul>，塞个 <li> 才不破坏结构。
  if (host.tagName === 'UL') {
    const li = doc.createElement('li')
    li.className = `${CLASS.THEME_SWITCH}-slot`
    li.appendChild(el)
    host.appendChild(li)
  } else {
    host.appendChild(el)
  }

  return el
}
