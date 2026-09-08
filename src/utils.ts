/** 从形如 /t/133089#reply40 或 /t/132793?p=2 的链接中提取话题 ID。 */
export function extractTopicId(href: string): string | null {
  const m = /\/t\/(\d+)(?:[?#/]|$)/.exec(href)
  return m ? m[1]! : null
}

/** 从形如 /node/water 的链接中提取节点 slug。 */
export function extractNodeSlug(href: string): string | null {
  const m = /\/node\/([^/?#]+)/.exec(href)
  return m ? decodeURIComponent(m[1]!) : null
}

/** 从形如 /u/BlueSandMu 的链接中提取用户名。 */
export function extractUsername(href: string): string | null {
  const m = /\/u\/([^/?#]+)/.exec(href)
  return m ? decodeURIComponent(m[1]!) : null
}

export function text(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? ''
}

export function qs<T extends Element = HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector<T>(sel)
}

export function qsa<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel))
}

/** 解析「#12」「12」这类楼层文本，失败返回 NaN。 */
export function parseFloorNumber(raw: string): number {
  const m = /(\d+)/.exec(raw)
  return m ? Number(m[1]) : Number.NaN
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number
): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (t !== undefined) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

/** 以最大并发 limit 依次执行任务，返回与输入同序的结果。 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i]!, i)
    }
  })
  await Promise.all(workers)
  return results
}
