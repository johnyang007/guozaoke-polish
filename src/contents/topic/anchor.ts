import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'

const FLOOR_LINK_CLASS = 'gzk-floor-link'
const HIGHLIGHT_MS = 1500

export function floorElementId(floor: number): string {
  return `reply${floor}`
}

/**
 * 给回复注入锚点 id，并把楼层号文本换成指向自身的链接。
 * 站点自身输出的 /t/{id}#reply{n} 链接原本没有对应锚点，这里顺带修复。
 */
export function applyAnchors(replies: readonly ParsedReply[]): void {
  for (const reply of replies) {
    reply.el.id = floorElementId(reply.floor)

    const floorEl = qs<HTMLElement>(reply.el, SELECTOR.REPLY_FLOOR)
    if (!floorEl || floorEl.querySelector(`a.${FLOOR_LINK_CLASS}`)) continue

    const link = reply.el.ownerDocument.createElement('a')
    link.className = FLOOR_LINK_CLASS
    link.href = `#${floorElementId(reply.floor)}`
    link.textContent = `#${reply.floor}`
    link.title = '点击定位到本楼层'
    floorEl.textContent = ''
    floorEl.appendChild(link)
  }
}

/** 滚动到指定楼层并短暂高亮。楼层 0 表示主题正文。 */
export function scrollToFloor(doc: Document, floor: number): boolean {
  const target =
    floor === 0
      ? qs<HTMLElement>(doc, SELECTOR.TOPIC_DETAIL)
      : doc.getElementById(floorElementId(floor))
  if (!target) return false

  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  target.classList.add(CLASS.HIGHLIGHT)
  setTimeout(() => target.classList.remove(CLASS.HIGHLIGHT), HIGHLIGHT_MS)
  return true
}
