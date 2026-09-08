import { SELECTOR } from '../../constants'
import type { PaginationInfo, ParsedReply } from '../../types'
import { extractUsername, parseFloorNumber, qs, qsa, text } from '../../utils'

export function parseReply(el: HTMLElement): ParsedReply | null {
  const floor = parseFloorNumber(text(qs(el, SELECTOR.REPLY_FLOOR)))
  if (!Number.isFinite(floor)) return null

  const username = text(qs(el, SELECTOR.REPLY_USERNAME))
  if (username === '') return null

  const voteLink = qs<HTMLAnchorElement>(el, SELECTOR.REPLY_VOTE)
  const votes = Number.parseInt(voteLink?.getAttribute('data-count') ?? '', 10)
  const replyId = /reply_id=(\d+)/.exec(voteLink?.getAttribute('href') ?? '')?.[1] ?? null

  // .meta 内有一到两个 .time：第一个是时间，第二个（若有）是 IP 归属地。
  // 站点还把楼主标记也塞进 .time，按文案剔除。
  const times = qsa(el, SELECTOR.REPLY_TIME)
    .map(text)
    .filter((t) => t !== '楼主')

  const content = qs<HTMLElement>(el, SELECTOR.REPLY_CONTENT)
  const firstLink = content ? qs<HTMLAnchorElement>(content, 'a[href*="/u/"]') : null
  const mentionedUser =
    firstLink !== null && firstLink.textContent?.trim().startsWith('@') === true
      ? extractUsername(firstLink.getAttribute('href') ?? '')
      : null

  return {
    el,
    floor,
    username,
    replyId,
    votes: Number.isFinite(votes) ? votes : 0,
    time: times[0] ?? '',
    location: times[1] ?? null,
    mentionedUser,
    contentText: text(content).replace(/\s+/g, ' '),
    quotedFloor: null,
  }
}

export function parseReplies(root: ParentNode): ParsedReply[] {
  return qsa<HTMLElement>(root, SELECTOR.REPLY_ITEM)
    .map(parseReply)
    .filter((r): r is ParsedReply => r !== null)
}

/** 从「共收到 144 条回复」中读出总数。 */
export function parseTotalReplyCount(root: ParentNode): number | null {
  const m = /(\d+)/.exec(text(qs(root, SELECTOR.REPLY_HEADER)))
  return m ? Number(m[1]) : null
}

/**
 * 解析回复区分页。仅认 .topic-reply 内的 ul.pagination，
 * 避免误取列表页的分页控件。
 */
export function parsePagination(root: ParentNode): PaginationInfo | null {
  const box = qs(root, SELECTOR.REPLY_BOX)
  const nav = box ? qs(box, SELECTOR.PAGINATION) : null
  if (!nav) return null

  const urls = new Map<number, string>()
  let current = 1

  for (const li of qsa<HTMLElement>(nav, 'li')) {
    const page = Number.parseInt(text(li), 10)
    if (!Number.isFinite(page)) continue // 跳过「上一页」「下一页」
    if (li.classList.contains('active')) current = page
    const href = qs<HTMLAnchorElement>(li, 'a')?.getAttribute('href')
    if (href) urls.set(page, href)
  }

  const total = Math.max(current, ...urls.keys())
  if (!Number.isFinite(total) || total <= 1) return null

  return { current, total, urls }
}
