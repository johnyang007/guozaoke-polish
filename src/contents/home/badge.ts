import { HEAT_LEVELS, SELECTOR } from '../../constants'
import type { TopicItemInfo } from '../../types'
import { qs } from '../../utils'

export function heatClassName(count: number): string | null {
  for (const level of HEAT_LEVELS) {
    if (count >= level.min) return level.className
  }
  return null
}

export function applyHeatBadges(items: readonly TopicItemInfo[]): void {
  for (const item of items) {
    const cls = heatClassName(item.replyCount)
    if (cls === null) continue
    qs<HTMLElement>(item.el, SELECTOR.TOPIC_ITEM_COUNT_LINK)?.classList.add(cls)
  }
}
