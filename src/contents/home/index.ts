import { getConfig } from '../../storage'
import { applyHeatBadges } from './badge'
import { applyBlocking } from './block'
import { stripReplyAnchors } from '../strip-anchor'
import { parseTopicList } from './parse'
import { initReadMarker } from './read-marker'
import { markActiveTab } from './tabs'

async function main(): Promise<void> {
  // 页签栏在节点页也在，放在主题列表判空之前。
  markActiveTab(document, location.pathname)

  const items = parseTopicList(document)
  if (items.length === 0) return

  stripReplyAnchors(document)

  const config = await getConfig()
  applyBlocking(items, config.home.blockRules)
  if (config.home.readMarker) await initReadMarker(items)
  if (config.home.heatBadge) applyHeatBadges(items)
}

void main().catch(() => {
  // 静默降级
})
