import { qsa } from '../utils'

/** 只匹配「指向某个话题、且以 #replyN 结尾」的链接，页内锚点（#reply5）不受影响。 */
const TOPIC_REPLY_HREF = /^(?:https?:\/\/[^/]+)?\/t\/\d+#reply\d+$/

/**
 * 站点把列表、侧栏里的主题链接写成 /t/{id}#reply{回复数}。原站没有这些锚点
 * 所以无害，但本扩展给楼层补了 id 之后，点进去会直接落到最后一楼——清掉锚点，
 * 从列表进入一律停在顶部；分享出来的 #replyN 链接照常跳转。
 *
 * 返回改写的链接数。
 */
export function stripReplyAnchors(root: ParentNode): number {
  let count = 0

  for (const a of qsa<HTMLAnchorElement>(root, 'a[href*="#reply"]')) {
    const href = a.getAttribute('href') ?? ''
    if (!TOPIC_REPLY_HREF.test(href)) continue
    a.setAttribute('href', href.replace(/#reply\d+$/, ''))
    count += 1
  }

  return count
}
