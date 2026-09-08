import { CLASS, SELECTOR } from '../../constants'
import type { TopicItemInfo } from '../../types'
import { extractNodeSlug, extractTopicId, extractUsername, qs, qsa, text } from '../../utils'

export function parseTopicItem(el: HTMLElement): TopicItemInfo {
  const titleLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_TITLE_LINK)
  const nodeLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_NODE_LINK)
  const userLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_USER_LINK)
  const countLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_COUNT_LINK)

  // 标题里可能混有 <i class="icon-pushpin">，取纯文本后压缩空白。
  const title = text(titleLink).replace(/\s+/g, ' ').trim()
  const count = Number.parseInt(text(countLink), 10)

  return {
    el,
    topicId: extractTopicId(titleLink?.getAttribute('href') ?? ''),
    title,
    node: nodeLink ? text(nodeLink) : null,
    nodeSlug: extractNodeSlug(nodeLink?.getAttribute('href') ?? ''),
    username: extractUsername(userLink?.getAttribute('href') ?? ''),
    replyCount: Number.isFinite(count) ? count : 0,
  }
}

export function parseTopicList(root: ParentNode): TopicItemInfo[] {
  return qsa<HTMLElement>(root, SELECTOR.TOPIC_ITEM).map(parseTopicItem)
}

export function applyReadMarks(
  items: readonly TopicItemInfo[],
  read: Record<string, number>
): void {
  for (const item of items) {
    if (item.topicId !== null && item.topicId in read) {
      item.el.classList.add(CLASS.READ)
    }
  }
}
