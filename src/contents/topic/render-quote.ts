import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'
import { scrollToFloor } from './anchor'
import type { QuoteChainItem } from './quote'
import { OP_FLOOR, buildQuoteChain, buildQuoteChildren } from './quote'

const SUMMARY_LENGTH = 60

/** 引用堆默认展开的层数，更早的折叠在按钮后面。 */
const VISIBLE_LEVELS = 3

export function quoteSummary(
  reply: ParsedReply | null,
  maxLength: number = SUMMARY_LENGTH
): string {
  if (reply === null) return ''
  const t = reply.contentText.trim()
  return t.length > maxLength ? `${t.slice(0, maxLength)}…` : t
}

/** 渲染引用链上的一环。level 从最早的一层算起，供 CSS 做递进缩进。 */
function createQuoteBlock(doc: Document, item: QuoteChainItem, level: number): HTMLElement {
  const block = doc.createElement('div')
  block.className = CLASS.QUOTE_BLOCK
  block.title = '点击定位到被引用的楼层'
  block.style.setProperty('--gzk-quote-level', String(level))

  const who = doc.createElement('span')
  who.className = 'gzk-quote-who'
  who.textContent = item.reply === null ? '楼主' : `#${item.reply.floor} ${item.reply.username}`

  const summary = doc.createElement('span')
  summary.className = 'gzk-quote-text'
  summary.textContent = quoteSummary(item.reply)

  block.append(who, summary)
  block.addEventListener('click', () => {
    scrollToFloor(doc, item.floor)
  })
  return block
}

/** 折叠更早层数的开关。 */
function createMoreToggle(doc: Document, hidden: HTMLElement[]): HTMLElement {
  const btn = doc.createElement('button')
  btn.type = 'button'
  btn.className = CLASS.QUOTE_MORE
  btn.textContent = `展开更早的 ${hidden.length} 层`

  btn.addEventListener('click', () => {
    const expand = hidden[0]?.hidden === true
    for (const el of hidden) el.hidden = !expand
    btn.textContent = `${expand ? '收起' : '展开'}更早的 ${hidden.length} 层`
  })
  return btn
}

/**
 * 在有引用关系的回复正文上方插入引用堆（沿盖楼链由远及近逐层缩进），
 * 并给被引用的回复加回应数徽章。
 */
export function renderQuotes(doc: Document, replies: readonly ParsedReply[]): void {
  const byFloor = new Map(replies.map((r) => [r.floor, r]))
  const children = buildQuoteChildren(replies)

  for (const reply of replies) {
    if (reply.quotedFloor === null) continue
    if (reply.el.querySelector(`.${CLASS.QUOTE_STACK}`)) continue

    // buildQuoteChain 由近及远，展示时反过来：最早的一层在上、缩进最小。
    const chain = buildQuoteChain(replies, reply).reverse()
    if (chain.length === 0) continue

    const stack = doc.createElement('div')
    stack.className = CLASS.QUOTE_STACK

    const blocks = chain.map((item, level) => createQuoteBlock(doc, item, level))
    const folded = blocks.slice(0, Math.max(0, blocks.length - VISIBLE_LEVELS))
    for (const el of folded) el.hidden = true
    if (folded.length > 0) stack.append(createMoreToggle(doc, folded))
    stack.append(...blocks)

    qs<HTMLElement>(reply.el, SELECTOR.REPLY_CONTENT)?.insertAdjacentElement('beforebegin', stack)
  }

  for (const [floor, list] of children) {
    if (floor === OP_FLOOR) continue
    const reply = byFloor.get(floor)
    if (!reply) continue
    if (reply.el.querySelector(`.${CLASS.REPLY_CHILDREN_BADGE}`)) continue

    const badge = doc.createElement('span')
    badge.className = CLASS.REPLY_CHILDREN_BADGE
    badge.textContent = `${list.length} 条回应`
    badge.title = list.map((f) => `#${f}`).join(' ')
    badge.addEventListener('click', () => {
      const first = list[0]
      if (first !== undefined) scrollToFloor(doc, first)
    })

    // 挂在用户名之后（而非楼层号之后）——楼层号在视觉上已被推到行尾。
    const anchorEl =
      qs<HTMLElement>(reply.el, SELECTOR.REPLY_USERNAME_LINK) ??
      qs<HTMLElement>(reply.el, SELECTOR.REPLY_FLOOR)
    anchorEl?.insertAdjacentElement('afterend', badge)
  }
}
