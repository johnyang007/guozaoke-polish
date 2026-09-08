import { DEFAULT_CONFIG, READ_TOPICS_LIMIT, STORAGE_KEY } from './constants'
import type { BlockRule, BlockRuleType, Config, ThemeMode } from './types'

const THEMES: readonly ThemeMode[] = ['auto', 'light', 'dark']
const RULE_TYPES: readonly BlockRuleType[] = ['keyword', 'node', 'user']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function pickBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function pickPositiveNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback
}

function sanitizeRules(v: unknown): BlockRule[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((raw): BlockRule[] => {
    if (!isRecord(raw)) return []
    const { id, type, value, enabled } = raw
    if (typeof id !== 'string' || id === '') return []
    if (typeof type !== 'string' || !RULE_TYPES.includes(type as BlockRuleType)) return []
    if (typeof value !== 'string' || value.trim() === '') return []
    return [
      { id, type: type as BlockRuleType, value: value.trim(), enabled: pickBoolean(enabled, true) },
    ]
  })
}

/** 把存储中的任意值安全地合并成完整 Config。非法字段回落到默认值。 */
export function mergeConfig(stored: unknown, base: Config = DEFAULT_CONFIG): Config {
  const s = isRecord(stored) ? stored : {}
  const home = isRecord(s['home']) ? s['home'] : {}
  const topic = isRecord(s['topic']) ? s['topic'] : {}
  const rawTheme = s['theme']
  const theme =
    typeof rawTheme === 'string' && THEMES.includes(rawTheme as ThemeMode)
      ? (rawTheme as ThemeMode)
      : base.theme

  return {
    theme,
    home: {
      readMarker: pickBoolean(home['readMarker'], base.home.readMarker),
      heatBadge: pickBoolean(home['heatBadge'], base.home.heatBadge),
      blockRules: 'blockRules' in home ? sanitizeRules(home['blockRules']) : base.home.blockRules,
    },
    topic: {
      quote: pickBoolean(topic['quote'], base.topic.quote),
      hotReplies: pickBoolean(topic['hotReplies'], base.topic.hotReplies),
      hotThreshold: pickPositiveNumber(topic['hotThreshold'], base.topic.hotThreshold),
      collapse: pickBoolean(topic['collapse'], base.topic.collapse),
      collapseHeight: pickPositiveNumber(topic['collapseHeight'], base.topic.collapseHeight),
      anchor: pickBoolean(topic['anchor'], base.topic.anchor),
      mergePages: pickBoolean(topic['mergePages'], base.topic.mergePages),
    },
  }
}

/** 已读记录超限时按时间戳降序裁剪。 */
export function pruneReadTopics(
  map: Record<string, number>,
  limit: number
): Record<string, number> {
  const entries = Object.entries(map)
  if (entries.length <= limit) return map
  entries.sort((a, b) => b[1] - a[1])
  return Object.fromEntries(entries.slice(0, limit))
}

export async function getConfig(): Promise<Config> {
  const got = await chrome.storage.sync.get(STORAGE_KEY.CONFIG)
  return mergeConfig(got[STORAGE_KEY.CONFIG])
}

export async function saveConfig(config: Config): Promise<Config> {
  const merged = mergeConfig(config)
  await chrome.storage.sync.set({ [STORAGE_KEY.CONFIG]: merged })
  return merged
}

export async function getReadTopics(): Promise<Record<string, number>> {
  const got = await chrome.storage.local.get(STORAGE_KEY.READ_TOPICS)
  const v = got[STORAGE_KEY.READ_TOPICS]
  return typeof v === 'object' && v !== null ? (v as Record<string, number>) : {}
}

export async function markTopicRead(id: string): Promise<void> {
  const map = await getReadTopics()
  map[id] = Date.now()
  await chrome.storage.local.set({
    [STORAGE_KEY.READ_TOPICS]: pruneReadTopics(map, READ_TOPICS_LIMIT),
  })
}

export async function clearReadTopics(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY.READ_TOPICS)
}
