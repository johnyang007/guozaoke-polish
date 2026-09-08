import type { ParsedReply } from '../../types'

/** 引用指向主题正文（楼主）时使用的楼层号。 */
export const OP_FLOOR = 0

/**
 * 填充每条回复的 quotedFloor：
 * 被引用者 U 的目标楼层 = 楼层号小于当前楼层、且作者为 U 的最大楼层；
 * 若不存在且 U 是主题作者，则指向 OP_FLOOR；否则保持 null。
 *
 * 原地修改并返回同一数组。
 */
export function resolveQuotes(
  replies: ParsedReply[],
  topicAuthor: string | null
): ParsedReply[] {
  const author = topicAuthor?.toLowerCase() ?? null
  // 用户名 -> 目前见过的最大楼层。
  const lastFloor = new Map<string, number>()

  for (const reply of [...replies].sort((a, b) => a.floor - b.floor)) {
    const target = reply.mentionedUser?.toLowerCase() ?? null
    if (target === null) {
      reply.quotedFloor = null
    } else {
      const seen = lastFloor.get(target)
      reply.quotedFloor =
        seen !== undefined && seen < reply.floor
          ? seen
          : target === author
            ? OP_FLOOR
            : null
    }
    lastFloor.set(reply.username.toLowerCase(), reply.floor)
  }

  return replies
}

/** 被引用楼层 -> 引用它的楼层列表（升序）。 */
export function buildQuoteChildren(replies: readonly ParsedReply[]): Map<number, number[]> {
  const children = new Map<number, number[]>()

  for (const reply of [...replies].sort((a, b) => a.floor - b.floor)) {
    if (reply.quotedFloor === null) continue
    const list = children.get(reply.quotedFloor)
    if (list) list.push(reply.floor)
    else children.set(reply.quotedFloor, [reply.floor])
  }

  return children
}

/** 引用链上的一环：floor 为 OP_FLOOR 时 reply 为 null，代表主题正文（楼主）。 */
export interface QuoteChainItem {
  floor: number
  reply: ParsedReply | null
}

/** 默认最多往上追多少层，防止长链（或异常成环）把一条回复撑爆。 */
export const MAX_QUOTE_CHAIN = 6

/**
 * 沿 quotedFloor 逐层上溯，由近及远返回整条盖楼链。
 * 遇到主题正文（OP_FLOOR）、找不到目标楼层、层数超限或出现环即停止。
 */
export function buildQuoteChain(
  replies: readonly ParsedReply[],
  start: ParsedReply,
  limit: number = MAX_QUOTE_CHAIN
): QuoteChainItem[] {
  const byFloor = new Map(replies.map((r) => [r.floor, r]))
  const chain: QuoteChainItem[] = []
  const seen = new Set<number>([start.floor])

  let next = start.quotedFloor
  while (next !== null && chain.length < limit && !seen.has(next)) {
    seen.add(next)

    if (next === OP_FLOOR) {
      chain.push({ floor: OP_FLOOR, reply: null })
      break
    }

    const target = byFloor.get(next)
    if (!target) break

    chain.push({ floor: next, reply: target })
    next = target.quotedFloor
  }

  return chain
}
