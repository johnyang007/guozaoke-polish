import { CLASS } from '../../constants'
import type { BlockRule, TopicItemInfo } from '../../types'

export function matchBlockRule(item: TopicItemInfo, rules: readonly BlockRule[]): BlockRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue
    const value = rule.value.toLowerCase()
    if (rule.type === 'keyword' && item.title.toLowerCase().includes(value)) return rule
    if (rule.type === 'node' && item.nodeSlug !== null && item.nodeSlug.toLowerCase() === value) {
      return rule
    }
    if (rule.type === 'user' && item.username !== null && item.username.toLowerCase() === value) {
      return rule
    }
  }
  return null
}

const REASON_LABEL: Record<BlockRule['type'], string> = {
  keyword: '关键词',
  node: '节点',
  user: '用户',
}

/** 折叠命中屏蔽规则的主题项，返回被屏蔽的条数。 */
export function applyBlocking(
  items: readonly TopicItemInfo[],
  rules: readonly BlockRule[]
): number {
  if (rules.length === 0) return 0
  let blocked = 0

  for (const item of items) {
    const rule = matchBlockRule(item, rules)
    if (!rule) continue
    blocked++
    item.el.classList.add(CLASS.BLOCKED)

    const tip = item.el.ownerDocument.createElement('div')
    tip.className = CLASS.BLOCK_PLACEHOLDER
    tip.textContent = `已屏蔽（${REASON_LABEL[rule.type]}：${rule.value}）· 点击展开`
    tip.addEventListener('click', () => {
      item.el.classList.remove(CLASS.BLOCKED)
      tip.remove()
    })
    item.el.insertAdjacentElement('afterbegin', tip)
  }

  return blocked
}
