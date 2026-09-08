import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'
import { scrollToFloor } from './anchor'
import { buildQuoteChildren } from './quote'
import { quoteSummary } from './render-quote'

const DEFAULT_QUOTE_THRESHOLD = 3
const DEFAULT_LIMIT = 5
const HOT_SUMMARY_LENGTH = 80

/** 赞数达标或被引用次数达标的回复即为热门，按赞数降序、楼层升序。 */
export function pickHotReplies(
  replies: readonly ParsedReply[],
  voteThreshold: number,
  quoteThreshold: number = DEFAULT_QUOTE_THRESHOLD,
  limit: number = DEFAULT_LIMIT
): ParsedReply[] {
  const children = buildQuoteChildren(replies)

  return replies
    .filter(
      (r) => r.votes >= voteThreshold || (children.get(r.floor)?.length ?? 0) >= quoteThreshold
    )
    .sort((a, b) => b.votes - a.votes || a.floor - b.floor)
    .slice(0, limit)
}

/** 表头补一句「· N 条热门回复」，对齐 V2EX 的信息密度。 */
function renderHotCount(doc: Document, header: HTMLElement, count: number): void {
  header.querySelector(`.${CLASS.HOT_COUNT}`)?.remove()

  const el = doc.createElement('span')
  el.className = CLASS.HOT_COUNT
  el.textContent = `· ${count} 条热门回复`
  header.appendChild(el)
}

/** 在回复区头部下方插入「热门回复」区块。热门列表为空时什么都不做。 */
export function renderHotReplies(doc: Document, hot: readonly ParsedReply[]): void {
  if (hot.length === 0) return

  const box = qs<HTMLElement>(doc, SELECTOR.REPLY_BOX)
  if (!box) return
  box.querySelector(`.${CLASS.HOT_BOX}`)?.remove()

  const wrap = doc.createElement('div')
  wrap.className = CLASS.HOT_BOX

  const title = doc.createElement('div')
  title.className = 'gzk-hot-title'
  // 条数已由表头给出，这里不再重复。
  title.textContent = '热门回复'

  const list = doc.createElement('div')
  list.className = 'gzk-hot-list'

  for (const reply of hot) {
    const item = doc.createElement('div')
    item.className = 'gzk-hot-item'
    item.title = '点击定位到该楼层'

    const meta = doc.createElement('span')
    meta.className = 'gzk-hot-meta'
    meta.textContent = `#${reply.floor} ${reply.username} · 赞 ${reply.votes}`

    const text = doc.createElement('span')
    text.className = 'gzk-hot-text'
    text.textContent = quoteSummary(reply, HOT_SUMMARY_LENGTH)

    item.append(meta, text)
    item.addEventListener('click', () => {
      scrollToFloor(doc, reply.floor)
    })
    list.appendChild(item)
  }

  wrap.append(title, list)

  const header = qs<HTMLElement>(doc, SELECTOR.REPLY_HEADER)
  if (header) {
    header.insertAdjacentElement('afterend', wrap)
    renderHotCount(doc, header, hot.length)
  } else {
    box.insertAdjacentElement('afterbegin', wrap)
  }
}
