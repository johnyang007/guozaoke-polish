import type { Config } from './types'

export const HOSTS = ['guozaoke.com', 'www.guozaoke.com'] as const

export const STORAGE_KEY = {
  CONFIG: 'gzk_config',
  READ_TOPICS: 'gzk_read_topics',
} as const

/** 已读记录保留条数上限。 */
export const READ_TOPICS_LIMIT = 2000

/** 回复数热度分档，从高到低匹配。 */
export const HEAT_LEVELS = [
  { min: 50, className: 'gzk-heat-high' },
  { min: 20, className: 'gzk-heat-mid' },
] as const

export const DEFAULT_CONFIG: Config = {
  theme: 'auto',
  home: {
    readMarker: true,
    heatBadge: true,
    blockRules: [],
  },
  topic: {
    quote: true,
    hotReplies: true,
    hotThreshold: 5,
    collapse: true,
    collapseHeight: 240,
    anchor: true,
    mergePages: true,
  },
}

/**
 * 站点 DOM 选择器集中定义。站点改版时只需改这里。
 *
 * 注意：.reply-item .meta 内有两个含 floor 类的 span——
 * `span.fr.floor` 是楼层号，`span.fr.reply-to.floor` 是点赞按钮容器，
 * 因此楼层号必须用 :not(.reply-to) 排除。
 */
export const SELECTOR = {
  TOPIC_ITEM: '.topic-item',
  TOPIC_ITEM_TITLE_LINK: '.main .title a',
  TOPIC_ITEM_NODE_LINK: '.main .meta .node a',
  TOPIC_ITEM_USER_LINK: '.main .meta .username a',
  TOPIC_ITEM_COUNT_LINK: '.count a',

  TOPIC_DETAIL: '.topic-detail',
  TOPIC_DETAIL_CONTENT: '.topic-detail .ui-content',
  TOPIC_DETAIL_AUTHOR: '.topic-detail .ui-header .meta .username a',

  REPLY_BOX: '.topic-reply',
  REPLY_LIST: '.topic-reply > .ui-content',
  REPLY_FOOTER: '.topic-reply > .ui-footer',
  REPLY_HEADER: '.topic-reply > .ui-header',
  REPLY_ITEM: '.reply-item',
  REPLY_USERNAME: '.main .meta .reply-username .username',
  REPLY_USERNAME_LINK: '.main .meta .reply-username',
  REPLY_FLOOR: '.main .meta span.floor:not(.reply-to)',
  REPLY_VOTE: '.main .meta a.J_replyVote',
  REPLY_TIME: '.main .meta .time',
  REPLY_CONTENT: '.main > .content',

  PAGINATION: 'ul.pagination',
} as const

/** 注入元素统一使用的类名。 */
export const CLASS = {
  READ: 'gzk-read',
  BLOCKED: 'gzk-blocked',
  BLOCK_PLACEHOLDER: 'gzk-block-placeholder',
  QUOTE_BLOCK: 'gzk-quote',
  QUOTE_STACK: 'gzk-quote-stack',
  QUOTE_MORE: 'gzk-quote-more',
  REPLY_CHILDREN_BADGE: 'gzk-replies-badge',
  HOT_BOX: 'gzk-hot-box',
  HOT_COUNT: 'gzk-hot-count',
  THEME_SWITCH: 'gzk-theme-switch',
  TAB_ACTIVE: 'gzk-tab-active',
  OP: 'gzk-op',
  OP_BADGE: 'gzk-op-badge',
  COLLAPSED: 'gzk-collapsed',
  COLLAPSE_TOGGLE: 'gzk-collapse-toggle',
  HIGHLIGHT: 'gzk-highlight',
  MERGE_TIP: 'gzk-merge-tip',
} as const
