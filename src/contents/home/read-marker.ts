import { SELECTOR } from '../../constants'
import { getReadTopics, markTopicRead } from '../../storage'
import type { TopicItemInfo } from '../../types'
import { extractTopicId } from '../../utils'
import { applyReadMarks } from './parse'

/** 渲染已读标记，并在点击标题时记录已读。 */
export async function initReadMarker(items: readonly TopicItemInfo[]): Promise<void> {
  applyReadMarks(items, await getReadTopics())

  document.addEventListener(
    'click',
    (ev) => {
      const target = ev.target
      if (!(target instanceof Element)) return
      const link = target.closest<HTMLAnchorElement>(
        `${SELECTOR.TOPIC_ITEM} ${SELECTOR.TOPIC_ITEM_TITLE_LINK}`
      )
      if (!link) return
      const id = extractTopicId(link.getAttribute('href') ?? '')
      if (id !== null) {
        // 扩展被重载后旧页面的 chrome.* 会失效，这里不能让它变成未捕获异常。
        void markTopicRead(id).catch(() => {})
      }
    },
    true
  )
}
