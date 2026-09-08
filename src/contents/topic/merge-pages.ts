import { SELECTOR } from '../../constants'
import { mapWithConcurrency, parseFloorNumber, qs, qsa, text } from '../../utils'
import { parsePagination } from './parse'

const CONCURRENCY = 2

/** 从整页 HTML 文本中解析出 .reply-item 元素（脱离原文档，可直接 import 后 append）。 */
export function extractReplyElements(html: string): HTMLElement[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return qsa<HTMLElement>(doc, SELECTOR.REPLY_ITEM)
}

function floorOf(el: HTMLElement): number {
  const n = parseFloorNumber(text(qs(el, SELECTOR.REPLY_FLOOR)))
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

/**
 * 拉取回复区的其余分页并合并进当前文档。
 * 未分页时返回 null 且不发起任何请求。
 * 任一页抓取失败时抛出，由调用方负责降级与提示。
 */
export async function mergeReplyPages(
  doc: Document,
  fetchPage: (url: string) => Promise<string>,
  onProgress?: (done: number, total: number) => void
): Promise<{ merged: number; pages: number } | null> {
  const pagination = parsePagination(doc)
  if (pagination === null) return null

  const list = qs<HTMLElement>(doc, SELECTOR.REPLY_LIST)
  if (list === null) return null

  const targets = [...pagination.urls.entries()]
    .filter(([page]) => page !== pagination.current)
    .sort((a, b) => a[0] - b[0])
    .map(([, url]) => url)

  if (targets.length === 0) return null

  let done = 0
  const pagesHtml = await mapWithConcurrency(targets, CONCURRENCY, async (url) => {
    const html = await fetchPage(url)
    done++
    onProgress?.(done, targets.length)
    return html
  })

  const incoming = pagesHtml.flatMap(extractReplyElements)
  if (incoming.length === 0) return { merged: 0, pages: pagination.total }

  // 与现有回复合并后按楼层号整体重排，保证跨页顺序正确。
  const all = [
    ...qsa<HTMLElement>(list, SELECTOR.REPLY_ITEM),
    ...incoming.map((el) => doc.importNode(el, true)),
  ]
  all.sort((a, b) => floorOf(a) - floorOf(b))
  for (const el of all) list.appendChild(el)

  // 合并完成后隐藏原分页控件。
  const footer = qs<HTMLElement>(doc, SELECTOR.REPLY_FOOTER)
  const nav = footer ? qs<HTMLElement>(footer, SELECTOR.PAGINATION) : null
  nav?.closest('nav')?.setAttribute('hidden', '')
  qs<HTMLElement>(doc, '.pagination-wap')?.setAttribute('hidden', '')

  return { merged: incoming.length, pages: pagination.total }
}
