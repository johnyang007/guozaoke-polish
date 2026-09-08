import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'

export function shouldCollapse(height: number, limit: number): boolean {
  return height > limit
}

function defaultMeasure(el: HTMLElement): number {
  return el.scrollHeight
}

/**
 * 折叠超过 limit 像素高的回复正文，返回被折叠的条数。
 * measure 可注入，便于在无布局能力的测试环境中替换。
 */
export function applyCollapse(
  doc: Document,
  replies: readonly ParsedReply[],
  limit: number,
  measure: (el: HTMLElement) => number = defaultMeasure
): number {
  let count = 0

  for (const reply of replies) {
    const content = qs<HTMLElement>(reply.el, SELECTOR.REPLY_CONTENT)
    if (!content) continue
    if (reply.el.classList.contains(CLASS.COLLAPSED)) continue
    if (!shouldCollapse(measure(content), limit)) continue

    count++
    reply.el.classList.add(CLASS.COLLAPSED)
    reply.el.style.setProperty('--gzk-collapse-height', `${limit}px`)

    const toggle = doc.createElement('button')
    toggle.type = 'button'
    toggle.className = CLASS.COLLAPSE_TOGGLE
    toggle.textContent = '展开全文'
    toggle.addEventListener('click', () => {
      reply.el.classList.remove(CLASS.COLLAPSED)
      reply.el.style.removeProperty('--gzk-collapse-height')
      toggle.remove()
    })
    content.insertAdjacentElement('afterend', toggle)
  }

  return count
}
