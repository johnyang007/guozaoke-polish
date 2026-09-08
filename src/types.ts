export type ThemeMode = 'auto' | 'light' | 'dark'
export type BlockRuleType = 'keyword' | 'node' | 'user'

export interface BlockRule {
  id: string
  type: BlockRuleType
  value: string
  enabled: boolean
}

export interface HomeConfig {
  readMarker: boolean
  heatBadge: boolean
  blockRules: BlockRule[]
}

export interface TopicConfig {
  quote: boolean
  hotReplies: boolean
  hotThreshold: number
  collapse: boolean
  collapseHeight: number
  anchor: boolean
  mergePages: boolean
}

export interface Config {
  theme: ThemeMode
  home: HomeConfig
  topic: TopicConfig
}

/** 列表页单条主题的解析结果。 */
export interface TopicItemInfo {
  el: HTMLElement
  topicId: string | null
  title: string
  node: string | null
  nodeSlug: string | null
  username: string | null
  replyCount: number
}

/** 话题页单条回复的解析结果。 */
export interface ParsedReply {
  el: HTMLElement
  floor: number
  username: string
  replyId: string | null
  votes: number
  time: string
  location: string | null
  /** 正文首个 @用户名 链接指向的用户，无则 null。 */
  mentionedUser: string | null
  contentText: string
  /** 由 resolveQuotes 填充。 */
  quotedFloor: number | null
}

export interface PaginationInfo {
  current: number
  total: number
  /** 页码 -> URL，含当前页。 */
  urls: Map<number, string>
}
