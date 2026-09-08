import { DEFAULT_CONFIG } from '../constants'
import { applyTheme } from '../contents/theme'
import { clearReadTopics, getConfig, mergeConfig, saveConfig } from '../storage'
import type { BlockRule, BlockRuleType, Config } from '../types'

export function createRule(type: BlockRuleType, value: string): BlockRule | null {
  const v = value.trim()
  if (v === '') return null
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    value: v,
    enabled: true,
  }
}

export function parseImported(json: string): Config | null {
  try {
    return mergeConfig(JSON.parse(json))
  } catch {
    return null
  }
}

const TYPE_LABEL: Record<BlockRuleType, string> = {
  keyword: '关键词',
  node: '节点',
  user: '用户',
}

async function main(): Promise<void> {
  // 单测里以模块方式导入本文件，此时没有设置页 DOM，直接返回避免副作用。
  if (typeof document === 'undefined' || !document.getElementById('rule-list')) return

  let config = await getConfig()
  applyTheme(
    document.documentElement,
    config.theme,
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const status = document.getElementById('status')!
  const say = (msg: string): void => {
    status.textContent = msg
    setTimeout(() => {
      if (status.textContent === msg) status.textContent = ''
    }, 2000)
  }

  const persist = async (): Promise<void> => {
    config = await saveConfig(config)
    say('已保存')
  }

  const hotThreshold = document.getElementById('hot-threshold') as HTMLInputElement
  const collapseHeight = document.getElementById('collapse-height') as HTMLInputElement
  hotThreshold.value = String(config.topic.hotThreshold)
  collapseHeight.value = String(config.topic.collapseHeight)

  hotThreshold.addEventListener('change', () => {
    config.topic.hotThreshold = Number(hotThreshold.value) || DEFAULT_CONFIG.topic.hotThreshold
    void persist()
  })
  collapseHeight.addEventListener('change', () => {
    config.topic.collapseHeight =
      Number(collapseHeight.value) || DEFAULT_CONFIG.topic.collapseHeight
    void persist()
  })

  const list = document.getElementById('rule-list')!
  const renderRules = (): void => {
    list.textContent = ''
    for (const rule of config.home.blockRules) {
      const li = document.createElement('li')

      const toggle = document.createElement('input')
      toggle.type = 'checkbox'
      toggle.checked = rule.enabled
      toggle.addEventListener('change', () => {
        rule.enabled = toggle.checked
        void persist()
      })

      const label = document.createElement('span')
      label.textContent = `${TYPE_LABEL[rule.type]}：${rule.value}`

      const del = document.createElement('button')
      del.type = 'button'
      del.textContent = '删除'
      del.addEventListener('click', () => {
        config.home.blockRules = config.home.blockRules.filter((r) => r.id !== rule.id)
        renderRules()
        void persist()
      })

      li.append(toggle, label, del)
      list.appendChild(li)
    }
  }
  renderRules()

  document.getElementById('rule-add')?.addEventListener('click', () => {
    const type = (document.getElementById('rule-type') as HTMLSelectElement).value as BlockRuleType
    const input = document.getElementById('rule-value') as HTMLInputElement

    const rule = createRule(type, input.value)
    if (!rule) {
      say('内容不能为空')
      return
    }

    config.home.blockRules = [...config.home.blockRules, rule]
    input.value = ''
    renderRules()
    void persist()
  })

  const io = document.getElementById('io') as HTMLTextAreaElement

  document.getElementById('export')?.addEventListener('click', () => {
    io.value = JSON.stringify(config, null, 2)
    say('已导出到下方文本框')
  })

  document.getElementById('import')?.addEventListener('click', () => {
    const parsed = parseImported(io.value)
    if (!parsed) {
      say('配置格式不正确')
      return
    }

    config = parsed
    hotThreshold.value = String(config.topic.hotThreshold)
    collapseHeight.value = String(config.topic.collapseHeight)
    renderRules()
    void persist()
  })

  document.getElementById('clear-read')?.addEventListener('click', () => {
    void clearReadTopics().then(() => {
      say('已清空已读记录')
    })
  })
}

void main()
