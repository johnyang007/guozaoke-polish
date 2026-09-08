import { CLASS, SELECTOR } from '../../constants'
import { getConfig, markTopicRead } from '../../storage'
import type { Config, ParsedReply } from '../../types'
import { extractTopicId, extractUsername, qs } from '../../utils'
import { stripReplyAnchors } from '../strip-anchor'
import { applyAnchors, scrollToFloor } from './anchor'
import { applyCollapse } from './collapse'
import { pickHotReplies, renderHotReplies } from './hot-replies'
import { mergeReplyPages } from './merge-pages'
import { markOpReplies } from './op'
import { parseReplies } from './parse'
import { resolveQuotes } from './quote'
import { renderQuotes } from './render-quote'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function showTip(text: string): void {
  const header = qs<HTMLElement>(document, SELECTOR.REPLY_HEADER)
  if (!header) return

  let tip = header.querySelector<HTMLElement>(`.${CLASS.MERGE_TIP}`)
  if (!tip) {
    tip = document.createElement('span')
    tip.className = CLASS.MERGE_TIP
    header.appendChild(tip)
  }
  tip.textContent = text
}

function topicAuthor(): string | null {
  const link = qs<HTMLAnchorElement>(document, SELECTOR.TOPIC_DETAIL_AUTHOR)
  return link ? extractUsername(link.getAttribute('href') ?? '') : null
}

function enhance(replies: ParsedReply[], config: Config): void {
  const author = topicAuthor()
  resolveQuotes(replies, author)

  if (config.topic.anchor) applyAnchors(replies)
  if (config.topic.quote) renderQuotes(document, replies)
  // 放在引用渲染之后，「楼主」才会紧贴用户名排在「N 条回应」之前。
  markOpReplies(replies, author)
  if (config.topic.hotReplies) {
    renderHotReplies(document, pickHotReplies(replies, config.topic.hotThreshold))
  }
  if (config.topic.collapse) applyCollapse(document, replies, config.topic.collapseHeight)
}

async function main(): Promise<void> {
  if (!qs(document, SELECTOR.REPLY_BOX)) return

  const config = await getConfig()

  // 侧栏「相关主题」同样带 #replyN 尾巴，一并清掉。
  stripReplyAnchors(document)

  const topicId = extractTopicId(location.pathname + location.search)
  if (topicId !== null) void markTopicRead(topicId).catch(() => {})

  if (config.topic.mergePages) {
    try {
      const result = await mergeReplyPages(document, fetchPage, (done, total) => {
        showTip(`正在加载第 ${done}/${total} 页…`)
      })
      if (result !== null) showTip(`已合并 ${result.pages} 页`)
    } catch {
      showTip('分页合并失败，已保留原有分页')
    }
  }

  enhance(parseReplies(document), config)

  // 站点自身输出的 /t/{id}#reply{n} 链接原本没有锚点，注入后补一次跳转。
  if (config.topic.anchor) {
    const m = /^#reply(\d+)$/.exec(location.hash)
    if (m?.[1] !== undefined) {
      const floor = Number(m[1])
      requestAnimationFrame(() => {
        scrollToFloor(document, floor)
      })
    }
  }
}

void main().catch(() => {
  // 静默降级：任何异常都不应影响原站阅读。
})
