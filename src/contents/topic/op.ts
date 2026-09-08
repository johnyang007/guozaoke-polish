import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs, qsa } from '../../utils'

/**
 * 站点自己会给楼主的回复吐一个 <span class="time">楼主</span>——和时间、
 * 归属地共用一个类名，只能按文案认。交给我们的徽章统一呈现，去掉原件。
 */
function dropNativeMark(el: HTMLElement): void {
  for (const span of qsa(el, `${SELECTOR.REPLY_TIME}`)) {
    if (span.textContent?.trim() === '楼主') span.remove()
  }
}

/**
 * 标出楼主的回复：行首挂 .gzk-op（配色见 topic.scss），用户名后补一枚「楼主」徽章。
 * 返回标记条数。
 */
export function markOpReplies(replies: ParsedReply[], author: string | null): number {
  if (author === null || author === '') return 0

  let count = 0
  for (const reply of replies) {
    if (reply.username !== author) continue

    reply.el.classList.add(CLASS.OP)
    count += 1
    dropNativeMark(reply.el)

    const link = qs(reply.el, SELECTOR.REPLY_USERNAME_LINK)
    if (!link || link.nextElementSibling?.classList.contains(CLASS.OP_BADGE) === true) continue

    const badge = reply.el.ownerDocument.createElement('span')
    badge.className = CLASS.OP_BADGE
    badge.textContent = '楼主'
    link.insertAdjacentElement('afterend', badge)
  }
  return count
}
