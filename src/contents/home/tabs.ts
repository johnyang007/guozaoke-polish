import { CLASS } from '../../constants'
import { qsa } from '../../utils'

/** 去掉域名、查询串与末尾斜杠，方便和 location.pathname 直接比。 */
function normalize(href: string): string {
  return href
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
}

/**
 * 站点页签栏不给当前节点任何选中标记，这里按路径自己比对补上，
 * 对齐 V2EX 页签的选中框。
 */
export function markActiveTab(root: ParentNode, pathname: string): HTMLAnchorElement | null {
  const here = normalize(pathname)
  let active: HTMLAnchorElement | null = null

  for (const a of qsa<HTMLAnchorElement>(root, '.topics .hotlink a')) {
    a.classList.remove(CLASS.TAB_ACTIVE)
    const target = normalize(a.getAttribute('href') ?? '')
    if (active === null && target !== '' && target === here) active = a
  }

  active?.classList.add(CLASS.TAB_ACTIVE)
  return active
}
