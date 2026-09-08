# GuoZaoKe Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 guozaoke.com 构建一款 MV3 浏览器扩展，提供界面美化与深色模式、列表增强、话题页阅读增强三类纯浏览侧功能。

**Architecture:** 内容脚本按页面分片注入（全站 / 列表页 / 话题页），样式以 CSS 变量 token 层覆盖站点原有 Bootstrap 3 样式而不重建 DOM。所有 DOM 解析逻辑写成不依赖浏览器环境的纯函数，用真实页面快照做单元测试；渲染与网络层薄封装在纯函数之上。

**Tech Stack:** TypeScript 5 / tsup（打包）/ sass（样式）/ Vitest + happy-dom（测试）/ web-ext（开发与打包）/ pnpm

**Spec:** `docs/superpowers/specs/2026-09-08-guozaoke-polish-design.md`

## Global Constraints

- 包管理器 pnpm，Node ≥ 20
- Manifest V3，`permissions` 仅 `storage`，`host_permissions` 仅 `https://www.guozaoke.com/*` 与 `https://guozaoke.com/*`
- 不引入 jQuery，不引入任何前端框架；运行时依赖为零（devDependencies 除外）
- 所有注入的 DOM 元素与 CSS 类名一律以 `gzk-` 前缀命名，注入的 `data-*` 属性以 `data-gzk-` 前缀命名
- 扩展显示名 `过早客 Polish`，包名 `guozaoke-polish`
- 所有 DOM 查询失败必须静默降级（不增强），禁止抛错中断页面
- 单元测试只覆盖纯函数；不测 manifest 生成、构建脚本、popup/options 的 UI 交互
- 每个 Task 结束时提交一次，提交信息用中文，遵循 `feat:` / `test:` / `chore:` / `style:` 前缀
- 提交信息结尾附：
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```

---

## File Structure

```
package.json                     依赖与脚本
tsconfig.json                    TS 配置
tsup.config.ts                   打包入口配置
vitest.config.ts                 测试配置
scripts/build-manifest.ts        生成 manifest.json / manifest-firefox.json
scripts/make-icons.ts            生成扩展图标 PNG

src/constants.ts                 域名、存储 key、DOM 选择器、默认配置
src/types.ts                     配置与解析产物类型
src/utils.ts                     通用工具（防抖、topicId 提取、DOM 辅助）
src/storage.ts                   chrome.storage 封装

src/contents/common.ts           全站入口：主题注入 + 基础增强
src/contents/theme.ts            主题解析与应用（纯函数 + 应用函数）

src/contents/home/index.ts       列表页入口
src/contents/home/parse.ts       .topic-item 解析（纯函数）
src/contents/home/block.ts       屏蔽规则匹配（纯函数）+ 渲染
src/contents/home/read-marker.ts 已读淡化
src/contents/home/badge.ts       回复数热度着色

src/contents/topic/index.ts      话题页入口
src/contents/topic/parse.ts      .reply-item 与分页解析（纯函数）
src/contents/topic/quote.ts      引用关系解析（纯函数）+ 引用块渲染
src/contents/topic/merge-pages.ts 分页回复合并
src/contents/topic/hot-replies.ts 热门回复区
src/contents/topic/collapse.ts   长回复折叠
src/contents/topic/anchor.ts     楼层锚点与跳转

src/pages/popup.ts               popup 逻辑
src/pages/options.ts             options 逻辑
src/background/main.ts           安装引导与配置初始化

src/styles/theme-var.scss        设计 token（浅/深）
src/styles/base.scss             全站排版与容器覆盖
src/styles/home.scss             列表页样式
src/styles/topic.scss            话题页样式
src/styles/popup.scss
src/styles/options.scss

extension/pages/popup.html
extension/pages/options.html
extension/images/icon-{16,32,48,128}.png

tests/*.test.ts                  单元测试
samples/*.html                   真实页面快照（已存在）
```

---

### Task 1: 项目脚手架与构建管线

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `scripts/build-manifest.ts`, `scripts/make-icons.ts`, `src/contents/common.ts`, `extension/pages/popup.html`, `extension/pages/options.html`, `src/pages/popup.ts`, `src/pages/options.ts`, `src/background/main.ts`, `src/styles/theme-var.scss`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `pnpm build` 产出 `extension/manifest.json`、`extension/scripts/*.min.js`、`extension/css/*.css`；`pnpm test` 可运行 Vitest

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "guozaoke-polish",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "run-p build:manifest watch run:chrome",
    "run:chrome": "web-ext run -t chromium --source-dir ./extension --chromium-profile ./chrome-profile --profile-create-if-missing --keep-profile-changes --start-url https://www.guozaoke.com/",
    "build": "run-s build:all pack:chrome pack:firefox",
    "build:all": "run-p build:manifest build:icons build:style build:ext",
    "build:manifest": "tsx scripts/build-manifest.ts",
    "build:icons": "tsx scripts/make-icons.ts",
    "build:ext": "tsup",
    "build:style": "sass src/styles:extension/css --no-source-map --style=compressed",
    "watch": "run-p watch:style watch:ext",
    "watch:ext": "tsup --watch",
    "watch:style": "pnpm build:style --watch",
    "pack:chrome": "web-ext build -s extension -a build-chrome -o",
    "pack:firefox": "tsx scripts/pack-firefox.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.271",
    "@types/node": "^20.14.12",
    "happy-dom": "^15.7.4",
    "npm-run-all": "^4.1.5",
    "sass": "^1.79.3",
    "tsup": "^8.3.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1",
    "web-ext": "^8.3.0"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["chrome", "node"]
  },
  "include": ["src", "scripts", "tests"]
}
```

- [ ] **Step 3: 写 tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    common: 'src/contents/common.ts',
    'gzk-home': 'src/contents/home/index.ts',
    'gzk-topic': 'src/contents/topic/index.ts',
    background: 'src/background/main.ts',
    popup: 'src/pages/popup.ts',
    options: 'src/pages/options.ts',
  },
  outDir: 'extension/scripts',
  outExtension: () => ({ js: '.min.js' }),
  format: ['iife'],
  target: 'chrome110',
  minify: true,
  clean: false,
  splitting: false,
  sourcemap: false,
})
```

- [ ] **Step 4: 写 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: 写 scripts/build-manifest.ts**

```ts
import fs from 'node:fs'
import path from 'node:path'

const HOSTS = ['guozaoke.com', 'www.guozaoke.com']
const matches = HOSTS.map((h) => `https://${h}/*`)
const topicMatches = HOSTS.map((h) => `https://${h}/t/*`)

const manifest: chrome.runtime.ManifestV3 = {
  manifest_version: 3,
  name: '过早客 Polish',
  version: '0.1.0',
  description: '为过早客（guozaoke.com）带来现代化的浏览体验：界面美化、深色模式、列表增强与话题页阅读增强。',
  permissions: ['storage'],
  host_permissions: matches,
  icons: {
    '16': 'images/icon-16.png',
    '32': 'images/icon-32.png',
    '48': 'images/icon-48.png',
    '128': 'images/icon-128.png',
  },
  content_scripts: [
    {
      matches,
      css: ['css/theme-var.css', 'css/base.css', 'css/home.css', 'css/topic.css'],
      run_at: 'document_start',
    },
    {
      matches,
      js: ['scripts/common.min.js'],
      run_at: 'document_start',
    },
    {
      matches,
      exclude_matches: topicMatches,
      js: ['scripts/gzk-home.min.js'],
      run_at: 'document_end',
    },
    {
      matches: topicMatches,
      js: ['scripts/gzk-topic.min.js'],
      run_at: 'document_end',
    },
  ],
  background: { service_worker: 'scripts/background.min.js' },
  options_ui: { page: 'pages/options.html', open_in_tab: true },
  action: { default_title: '过早客 Polish', default_popup: 'pages/popup.html' },
}

fs.mkdirSync('extension', { recursive: true })
fs.writeFileSync(path.join('extension', 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

const firefox = JSON.parse(JSON.stringify(manifest)) as Record<string, unknown>
firefox.browser_specific_settings = { gecko: { id: 'guozaoke-polish@local' } }
firefox.background = { scripts: ['scripts/background.min.js'] }
fs.writeFileSync(path.join('extension', 'manifest-firefox.json'), JSON.stringify(firefox, null, 2), 'utf8')

console.log('manifest generated')
```

- [ ] **Step 6: 写 scripts/make-icons.ts**

用纯 Node 生成不依赖任何图形库的 PNG（手写 zlib + CRC 的最小 PNG 编码器），画一个圆角方块底 + 白色对角条纹标记。

```ts
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

function crc32(buf: Buffer): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/** 生成 size×size 的 RGBA PNG。pixel(x, y) 返回 [r, g, b, a]。 */
function png(size: number, pixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y)
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG: [number, number, number] = [217, 119, 6]   // --gzk-accent
const FG: [number, number, number] = [255, 255, 255]

fs.mkdirSync(path.join('extension', 'images'), { recursive: true })
for (const size of [16, 32, 48, 128]) {
  const r = size * 0.22
  const buf = png(size, (x, y) => {
    const cx = Math.min(x + 0.5, size - x - 0.5)
    const cy = Math.min(y + 0.5, size - y - 0.5)
    // 圆角矩形遮罩
    if (cx < r && cy < r && Math.hypot(r - cx, r - cy) > r) return [0, 0, 0, 0]
    // 白色横杠：模拟「三条列表线」，象征主题列表
    const unit = size / 16
    const inX = x > 3.5 * unit && x < 12.5 * unit
    const bars = [4.5, 7.5, 10.5].some((by) => y > by * unit && y < (by + 1.2) * unit)
    if (inX && bars) return [...FG, 255] as [number, number, number, number]
    return [...BG, 255] as [number, number, number, number]
  })
  fs.writeFileSync(path.join('extension', 'images', `icon-${size}.png`), buf)
}
console.log('icons generated')
```

- [ ] **Step 7: 写 scripts/pack-firefox.ts**

```ts
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const src = 'extension'
const tmp = 'build-firefox-src'
fs.rmSync(tmp, { recursive: true, force: true })
fs.cpSync(src, tmp, { recursive: true })
fs.rmSync(path.join(tmp, 'manifest.json'), { force: true })
fs.renameSync(path.join(tmp, 'manifest-firefox.json'), path.join(tmp, 'manifest.json'))
execFileSync('npx', ['web-ext', 'build', '-s', tmp, '-a', 'build-firefox', '-o'], { stdio: 'inherit' })
fs.rmSync(tmp, { recursive: true, force: true })
```

- [ ] **Step 8: 写各入口的空壳文件**

`src/contents/common.ts`：
```ts
export {}
console.debug('[gzk] common loaded')
```

`src/background/main.ts`：
```ts
export {}
```

`src/pages/popup.ts` 与 `src/pages/options.ts`：
```ts
export {}
```

`src/styles/theme-var.scss`：
```scss
:root {
  --gzk-accent: #d97706;
}
```

`extension/pages/popup.html`：
```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>过早客 Polish</title>
  <link rel="stylesheet" href="../css/popup.css" />
</head>
<body>
  <div id="app"></div>
  <script src="../scripts/popup.min.js"></script>
</body>
</html>
```

`extension/pages/options.html`：同结构，改 `options.css` / `options.min.js`，`<title>过早客 Polish 设置</title>`。

同时创建 `src/styles/popup.scss`、`src/styles/options.scss`、`src/styles/base.scss`、`src/styles/home.scss`、`src/styles/topic.scss`，内容各为一行注释 `// placeholder`，保证 sass 编译产出对应 CSS 文件。

- [ ] **Step 9: 写冒烟测试 tests/smoke.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('页面样本', () => {
  it('三份话题页样本存在且含 reply-item', () => {
    for (const f of ['samples/topic.html', 'samples/topic-paged-p1.html', 'samples/topic-paged-p2.html']) {
      const html = fs.readFileSync(f, 'utf8')
      expect(html).toContain('reply-item')
    }
  })

  it('首页样本含 topic-item', () => {
    expect(fs.readFileSync('samples/home.html', 'utf8')).toContain('topic-item')
  })
})
```

- [ ] **Step 10: 安装依赖并验证构建与测试**

Run:
```bash
pnpm install
pnpm build:all
pnpm test
pnpm typecheck
```
Expected: `extension/manifest.json`、`extension/images/icon-128.png`、`extension/scripts/common.min.js`、`extension/css/theme-var.css` 均存在；测试 2 passed；typecheck 无错误。

- [ ] **Step 11: 提交**

```bash
git add -A
git commit -m "chore: 搭建扩展工程脚手架与构建管线"
```

---

### Task 2: 类型、常量与存储层

**Files:**
- Create: `src/types.ts`, `src/constants.ts`, `src/utils.ts`, `src/storage.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `interface Config`、`interface BlockRule`、`type BlockRuleType`、`interface TopicItemInfo`、`interface ParsedReply`、`interface PaginationInfo`
  - `DEFAULT_CONFIG: Config`、`SELECTOR`、`STORAGE_KEY`、`READ_TOPICS_LIMIT`、`HEAT_LEVELS`
  - `mergeConfig(stored: unknown, base?: Config): Config`
  - `getConfig(): Promise<Config>`、`setConfig(patch: DeepPartial<Config>): Promise<Config>`
  - `getReadTopics(): Promise<Record<string, number>>`、`markTopicRead(id: string): Promise<void>`、`clearReadTopics(): Promise<void>`
  - `pruneReadTopics(map: Record<string, number>, limit: number): Record<string, number>`
  - `extractTopicId(href: string): string | null`

- [ ] **Step 1: 写失败测试 tests/storage.test.ts**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG } from '../src/constants'
import { mergeConfig, pruneReadTopics } from '../src/storage'
import { extractTopicId } from '../src/utils'

describe('mergeConfig', () => {
  it('空输入返回默认配置', () => {
    expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })

  it('深合并已存字段，保留未知字段之外的默认值', () => {
    const c = mergeConfig({ theme: 'dark', topic: { hotThreshold: 9 } })
    expect(c.theme).toBe('dark')
    expect(c.topic.hotThreshold).toBe(9)
    expect(c.topic.collapse).toBe(DEFAULT_CONFIG.topic.collapse)
    expect(c.home.readMarker).toBe(DEFAULT_CONFIG.home.readMarker)
  })

  it('丢弃非法的 theme 值', () => {
    expect(mergeConfig({ theme: 'neon' }).theme).toBe(DEFAULT_CONFIG.theme)
  })

  it('过滤结构不合法的屏蔽规则', () => {
    const c = mergeConfig({
      home: {
        blockRules: [
          { id: 'a', type: 'keyword', value: '广告', enabled: true },
          { id: 'b', type: 'bogus', value: 'x', enabled: true },
          { id: 'c', type: 'user', value: '', enabled: true },
        ],
      },
    })
    expect(c.home.blockRules).toEqual([{ id: 'a', type: 'keyword', value: '广告', enabled: true }])
  })
})

describe('pruneReadTopics', () => {
  it('超出上限时保留时间戳最新的若干条', () => {
    const map = { a: 1, b: 5, c: 3, d: 4 }
    expect(pruneReadTopics(map, 2)).toEqual({ b: 5, d: 4 })
  })

  it('未超出上限时原样返回', () => {
    const map = { a: 1, b: 2 }
    expect(pruneReadTopics(map, 5)).toEqual(map)
  })
})

describe('extractTopicId', () => {
  it.each([
    ['https://www.guozaoke.com/t/133089#reply40', '133089'],
    ['/t/132793?p=2', '132793'],
    ['/t/1', '1'],
  ])('从 %s 提取 %s', (href, id) => {
    expect(extractTopicId(href)).toBe(id)
  })

  it('非话题链接返回 null', () => {
    expect(extractTopicId('/u/guozaoke')).toBeNull()
    expect(extractTopicId('/nodes')).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/storage.test.ts`
Expected: FAIL，报模块 `../src/constants`、`../src/storage`、`../src/utils` 不存在。

- [ ] **Step 3: 写 src/types.ts**

```ts
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
  /** 页码 -> 绝对或相对 URL，含当前页。 */
  urls: Map<number, string>
}
```

- [ ] **Step 4: 写 src/constants.ts**

```ts
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
  REPLY_CHILDREN_BADGE: 'gzk-replies-badge',
  HOT_BOX: 'gzk-hot-box',
  COLLAPSED: 'gzk-collapsed',
  COLLAPSE_TOGGLE: 'gzk-collapse-toggle',
  HIGHLIGHT: 'gzk-highlight',
  MERGE_TIP: 'gzk-merge-tip',
} as const
```

- [ ] **Step 5: 写 src/utils.ts**

```ts
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

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
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
```

- [ ] **Step 6: 写 src/storage.ts**

```ts
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
    return [{ id, type: type as BlockRuleType, value: value.trim(), enabled: pickBoolean(enabled, true) }]
  })
}

/** 把存储中的任意值安全地合并成完整 Config。非法字段回落到默认值。 */
export function mergeConfig(stored: unknown, base: Config = DEFAULT_CONFIG): Config {
  const s = isRecord(stored) ? stored : {}
  const home = isRecord(s.home) ? s.home : {}
  const topic = isRecord(s.topic) ? s.topic : {}
  const theme = typeof s.theme === 'string' && THEMES.includes(s.theme as ThemeMode) ? (s.theme as ThemeMode) : base.theme

  return {
    theme,
    home: {
      readMarker: pickBoolean(home.readMarker, base.home.readMarker),
      heatBadge: pickBoolean(home.heatBadge, base.home.heatBadge),
      blockRules: 'blockRules' in home ? sanitizeRules(home.blockRules) : base.home.blockRules,
    },
    topic: {
      quote: pickBoolean(topic.quote, base.topic.quote),
      hotReplies: pickBoolean(topic.hotReplies, base.topic.hotReplies),
      hotThreshold: pickPositiveNumber(topic.hotThreshold, base.topic.hotThreshold),
      collapse: pickBoolean(topic.collapse, base.topic.collapse),
      collapseHeight: pickPositiveNumber(topic.collapseHeight, base.topic.collapseHeight),
      anchor: pickBoolean(topic.anchor, base.topic.anchor),
      mergePages: pickBoolean(topic.mergePages, base.topic.mergePages),
    },
  }
}

/** 已读记录超限时按时间戳降序裁剪。 */
export function pruneReadTopics(map: Record<string, number>, limit: number): Record<string, number> {
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
  await chrome.storage.local.set({ [STORAGE_KEY.READ_TOPICS]: pruneReadTopics(map, READ_TOPICS_LIMIT) })
}

export async function clearReadTopics(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY.READ_TOPICS)
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `pnpm vitest run tests/storage.test.ts && pnpm typecheck`
Expected: PASS，全部用例通过，类型检查无错误。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 添加类型定义、常量与配置存储层"
```

---

### Task 3: 主题模式与设计 token

**Files:**
- Create: `src/contents/theme.ts`
- Modify: `src/styles/theme-var.scss`, `src/contents/common.ts`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: `Config`、`ThemeMode`、`getConfig`
- Produces: `resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark'`、`applyTheme(root: HTMLElement, mode: ThemeMode, prefersDark: boolean): void`、`initTheme(): Promise<void>`

- [ ] **Step 1: 写失败测试 tests/theme.test.ts**

```ts
import { describe, expect, it } from 'vitest'
import { applyTheme, resolveTheme } from '../src/contents/theme'

describe('resolveTheme', () => {
  it('auto 跟随系统', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
  })

  it('显式模式忽略系统偏好', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })
})

describe('applyTheme', () => {
  it('把结果写到 data-gzk-theme', () => {
    const root = document.createElement('html')
    applyTheme(root, 'dark', false)
    expect(root.getAttribute('data-gzk-theme')).toBe('dark')
    applyTheme(root, 'auto', false)
    expect(root.getAttribute('data-gzk-theme')).toBe('light')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/theme.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/theme.ts**

```ts
import { getConfig } from '../storage'
import type { ThemeMode } from '../types'

export const THEME_ATTR = 'data-gzk-theme'

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): 'light' | 'dark' {
  if (mode === 'auto') return prefersDark ? 'dark' : 'light'
  return mode
}

export function applyTheme(root: HTMLElement, mode: ThemeMode, prefersDark: boolean): void {
  root.setAttribute(THEME_ATTR, resolveTheme(mode, prefersDark))
}

/**
 * 读取配置并应用主题，同时监听系统偏好与配置变更。
 * 在 document_start 调用；storage 读取是异步的，
 * 因此 CSS 必须在无属性时也能通过 prefers-color-scheme 正确着色，避免闪烁。
 */
export async function initTheme(): Promise<void> {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  let mode: ThemeMode = 'auto'

  const render = (): void => applyTheme(document.documentElement, mode, mq.matches)

  try {
    mode = (await getConfig()).theme
  } catch {
    // 读取失败时保持 auto
  }
  render()

  mq.addEventListener('change', render)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return
    const next = changes['gzk_config']?.newValue
    if (typeof next === 'object' && next !== null && 'theme' in next) {
      const t = (next as { theme?: unknown }).theme
      if (t === 'auto' || t === 'light' || t === 'dark') {
        mode = t
        render()
      }
    }
  })
}
```

- [ ] **Step 4: 写 src/styles/theme-var.scss**

浅色 token 定义在裸 `:root`；深色 token 在 `@media (prefers-color-scheme: dark)` 下用 `html:not([data-gzk-theme='light'])` 保护，再在 `html[data-gzk-theme='dark']` 下重复一次，保证显式切换在两个方向都生效。

```scss
:root {
  --gzk-bg: #f4f5f7;
  --gzk-surface: #ffffff;
  --gzk-surface-2: #fafafa;
  --gzk-fg: #1f2328;
  --gzk-fg-2: #4a5058;
  --gzk-muted: #8b9099;
  --gzk-border: #e6e8eb;
  --gzk-border-2: #f0f1f3;
  --gzk-accent: #d97706;
  --gzk-accent-fg: #ffffff;
  --gzk-link: #1f6feb;
  --gzk-hot: #dc2626;
  --gzk-warm: #ea580c;
  --gzk-shadow: 0 1px 2px rgb(0 0 0 / 5%);
  --gzk-radius: 8px;
}

@mixin gzk-dark {
  --gzk-bg: #16181c;
  --gzk-surface: #1d2025;
  --gzk-surface-2: #24282e;
  --gzk-fg: #e3e6ea;
  --gzk-fg-2: #b6bcc4;
  --gzk-muted: #7c838d;
  --gzk-border: #2f343b;
  --gzk-border-2: #262a30;
  --gzk-accent: #f0a13a;
  --gzk-accent-fg: #16181c;
  --gzk-link: #6aa6ff;
  --gzk-hot: #f87171;
  --gzk-warm: #fb923c;
  --gzk-shadow: 0 1px 2px rgb(0 0 0 / 40%);
}

@media (prefers-color-scheme: dark) {
  html:not([data-gzk-theme='light']) { @include gzk-dark; }
}

html[data-gzk-theme='dark'] { @include gzk-dark; }
```

- [ ] **Step 5: 改 src/contents/common.ts 调用 initTheme**

```ts
import { initTheme } from './theme'

void initTheme()
```

- [ ] **Step 6: 运行测试与构建**

Run: `pnpm vitest run tests/theme.test.ts && pnpm build:style && pnpm typecheck`
Expected: 测试 PASS；`extension/css/theme-var.css` 中同时含 `prefers-color-scheme` 与 `[data-gzk-theme='dark']` 两处深色定义。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: 添加主题模式解析与浅深两套设计 token"
```

---

### Task 4: 全站基础样式改造

**Files:**
- Modify: `src/styles/base.scss`
- Test: 无（样式无单元测试，靠手工验证）

**Interfaces:**
- Consumes: `theme-var.scss` 中的 CSS 变量
- Produces: 全站排版与容器样式，供 home/topic 样式复用

- [ ] **Step 1: 写 src/styles/base.scss**

覆盖范围：页面底色、正文排版、导航栏、`.container-box` 卡片、侧栏、按钮与表单、分页控件、Bootstrap 3 硬编码颜色。

```scss
html[data-gzk-theme] {
  color-scheme: light;
}

html[data-gzk-theme='dark'] {
  color-scheme: dark;
}

body {
  background: var(--gzk-bg) !important;
  color: var(--gzk-fg) !important;
  font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  font-size: 14px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--gzk-link); }
a:hover { color: var(--gzk-link); }

/* 顶部导航 */
.navbar.top-navbar {
  background: var(--gzk-surface) !important;
  border: 0 !important;
  border-bottom: 1px solid var(--gzk-border) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.navbar.top-navbar .navbar-nav > li > a {
  color: var(--gzk-fg-2) !important;
  font-size: 14px;
}

.navbar.top-navbar .navbar-nav > .active > a,
.navbar.top-navbar .navbar-nav > li > a:hover {
  background: transparent !important;
  color: var(--gzk-accent) !important;
}

/* 卡片容器 */
.container-box {
  background: var(--gzk-surface) !important;
  border: 1px solid var(--gzk-border) !important;
  border-radius: var(--gzk-radius) !important;
  box-shadow: var(--gzk-shadow);
  overflow: hidden;
}

.container-box .ui-header {
  background: var(--gzk-surface-2) !important;
  border-bottom: 1px solid var(--gzk-border-2) !important;
  color: var(--gzk-fg-2) !important;
}

.container-box .ui-footer {
  background: var(--gzk-surface-2) !important;
  border-top: 1px solid var(--gzk-border-2) !important;
}

/* 侧栏 */
.sidebox .ui-header .title { color: var(--gzk-fg-2) !important; }
.sidebox .cell { border-bottom: 1px solid var(--gzk-border-2) !important; }
.hot_topic_title a { color: var(--gzk-fg-2) !important; }
.hot_topic_title a:hover { color: var(--gzk-accent) !important; }

/* 表单与按钮 */
.form-control {
  background: var(--gzk-surface) !important;
  border: 1px solid var(--gzk-border) !important;
  border-radius: 6px !important;
  box-shadow: none !important;
  color: var(--gzk-fg) !important;
}

.btn {
  border-radius: 6px !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

.btn-default {
  background: var(--gzk-surface) !important;
  border-color: var(--gzk-border) !important;
  color: var(--gzk-fg-2) !important;
}

.btn-primary,
.btn-success {
  background: var(--gzk-accent) !important;
  border-color: var(--gzk-accent) !important;
  color: var(--gzk-accent-fg) !important;
}

.alert {
  background: var(--gzk-surface-2) !important;
  border: 1px solid var(--gzk-border) !important;
  border-radius: var(--gzk-radius) !important;
  color: var(--gzk-fg-2) !important;
}

.dropdown-menu {
  background: var(--gzk-surface) !important;
  border: 1px solid var(--gzk-border) !important;
  border-radius: var(--gzk-radius) !important;
  box-shadow: var(--gzk-shadow) !important;
}

.dropdown-menu > li > a { color: var(--gzk-fg-2) !important; }

.dropdown-menu > li > a:hover {
  background: var(--gzk-surface-2) !important;
  color: var(--gzk-accent) !important;
}

/* 分页 */
.pagination > li > a,
.pagination > li > span {
  background: var(--gzk-surface) !important;
  border-color: var(--gzk-border) !important;
  color: var(--gzk-fg-2) !important;
}

.pagination > .active > a,
.pagination > .active > span {
  background: var(--gzk-accent) !important;
  border-color: var(--gzk-accent) !important;
  color: var(--gzk-accent-fg) !important;
}

.pagination > .disabled > a { color: var(--gzk-muted) !important; }

/* 标签页 */
.nav-pills > li > a {
  border-radius: 6px !important;
  color: var(--gzk-fg-2) !important;
}

.nav-pills > li.active > a,
.nav-pills > li.active > a:hover,
.nav-pills > li.active > a:focus {
  background: var(--gzk-accent) !important;
  color: var(--gzk-accent-fg) !important;
}

/* 代码块 */
pre,
code {
  background: var(--gzk-surface-2) !important;
  border: 1px solid var(--gzk-border-2) !important;
  border-radius: 6px !important;
  color: var(--gzk-fg) !important;
}

/* 页脚 */
.footer,
.footer-bg { background: transparent !important; }
.footer .links span,
.footer .fade-color { color: var(--gzk-muted) !important; }
```

- [ ] **Step 2: 编译样式确认无错**

Run: `pnpm build:style`
Expected: 无 sass 报错，`extension/css/base.css` 非空。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "style: 全站基础排版与容器改造，覆盖 Bootstrap 3 硬编码颜色"
```

---

### Task 5: 列表页解析与已读淡化

**Files:**
- Create: `src/contents/home/parse.ts`, `src/contents/home/read-marker.ts`, `src/contents/home/index.ts`
- Test: `tests/home-parse.test.ts`

**Interfaces:**
- Consumes: `SELECTOR`、`CLASS`、`TopicItemInfo`、`extractTopicId`、`extractNodeSlug`、`extractUsername`、`markTopicRead`、`getReadTopics`、`getConfig`
- Produces:
  - `parseTopicItem(el: HTMLElement): TopicItemInfo`
  - `parseTopicList(root: ParentNode): TopicItemInfo[]`
  - `applyReadMarks(items: TopicItemInfo[], read: Record<string, number>): void`
  - `initReadMarker(items: TopicItemInfo[]): Promise<void>`

- [ ] **Step 1: 写失败测试 tests/home-parse.test.ts**

```ts
import fs from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { applyReadMarks, parseTopicList } from '../src/contents/home/parse'
import { applyReadMarks as _unused } from '../src/contents/home/parse'

let doc: Document

beforeAll(() => {
  const html = fs.readFileSync('samples/home.html', 'utf8')
  doc = new DOMParser().parseFromString(html, 'text/html')
})

describe('parseTopicList', () => {
  it('解析出全部主题项', () => {
    const items = parseTopicList(doc)
    expect(items.length).toBeGreaterThan(10)
  })

  it('第一条主题的字段完整', () => {
    const first = parseTopicList(doc)[0]!
    expect(first.topicId).toMatch(/^\d+$/)
    expect(first.title.length).toBeGreaterThan(0)
    expect(first.nodeSlug).toBeTruthy()
    expect(first.username).toBeTruthy()
    expect(first.replyCount).toBeGreaterThanOrEqual(0)
  })

  it('标题不包含置顶图标带来的空白噪声', () => {
    for (const item of parseTopicList(doc)) {
      expect(item.title).toBe(item.title.trim())
      expect(item.title).not.toMatch(/\s{2,}/)
    }
  })
})

describe('applyReadMarks', () => {
  it('只给已读主题加 class', () => {
    const items = parseTopicList(doc)
    const target = items[0]!
    applyReadMarks(items, { [target.topicId!]: Date.now() })
    expect(target.el.classList.contains(CLASS.READ)).toBe(true)
    expect(items[1]!.el.classList.contains(CLASS.READ)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/home-parse.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/home/parse.ts**

```ts
import { CLASS, SELECTOR } from '../../constants'
import type { TopicItemInfo } from '../../types'
import { extractNodeSlug, extractTopicId, extractUsername, qs, qsa, text } from '../../utils'

export function parseTopicItem(el: HTMLElement): TopicItemInfo {
  const titleLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_TITLE_LINK)
  const nodeLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_NODE_LINK)
  const userLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_USER_LINK)
  const countLink = qs<HTMLAnchorElement>(el, SELECTOR.TOPIC_ITEM_COUNT_LINK)

  // 标题里可能混有 <i class="icon-pushpin">，取纯文本后压缩空白。
  const title = text(titleLink).replace(/\s+/g, ' ').trim()
  const href = titleLink?.getAttribute('href') ?? ''
  const nodeHref = nodeLink?.getAttribute('href') ?? ''
  const userHref = userLink?.getAttribute('href') ?? ''
  const count = Number.parseInt(text(countLink), 10)

  return {
    el,
    topicId: extractTopicId(href),
    title,
    node: nodeLink ? text(nodeLink) : null,
    nodeSlug: extractNodeSlug(nodeHref),
    username: extractUsername(userHref),
    replyCount: Number.isFinite(count) ? count : 0,
  }
}

export function parseTopicList(root: ParentNode): TopicItemInfo[] {
  return qsa<HTMLElement>(root, SELECTOR.TOPIC_ITEM).map(parseTopicItem)
}

export function applyReadMarks(items: readonly TopicItemInfo[], read: Record<string, number>): void {
  for (const item of items) {
    if (item.topicId !== null && item.topicId in read) {
      item.el.classList.add(CLASS.READ)
    }
  }
}
```

- [ ] **Step 4: 写 src/contents/home/read-marker.ts**

```ts
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
      const link = target.closest<HTMLAnchorElement>(`${SELECTOR.TOPIC_ITEM} ${SELECTOR.TOPIC_ITEM_TITLE_LINK}`)
      if (!link) return
      const id = extractTopicId(link.getAttribute('href') ?? '')
      if (id !== null) void markTopicRead(id)
    },
    true
  )
}
```

- [ ] **Step 5: 写 src/contents/home/index.ts**

```ts
import { getConfig } from '../../storage'
import { parseTopicList } from './parse'
import { initReadMarker } from './read-marker'

async function main(): Promise<void> {
  const items = parseTopicList(document)
  if (items.length === 0) return

  const config = await getConfig()
  if (config.home.readMarker) await initReadMarker(items)
}

void main().catch(() => {
  // 静默降级：解析失败不影响原页面
})
```

- [ ] **Step 6: 在 home.scss 中加已读样式**

```scss
.topic-item.gzk-read .title a {
  color: var(--gzk-muted) !important;
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `pnpm vitest run tests/home-parse.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 列表页主题解析与已读淡化"
```

---

### Task 6: 列表页屏蔽规则与热度着色

**Files:**
- Create: `src/contents/home/block.ts`, `src/contents/home/badge.ts`
- Modify: `src/contents/home/index.ts`, `src/styles/home.scss`
- Test: `tests/home-block.test.ts`

**Interfaces:**
- Consumes: `TopicItemInfo`、`BlockRule`、`HEAT_LEVELS`、`CLASS`
- Produces:
  - `matchBlockRule(item: TopicItemInfo, rules: readonly BlockRule[]): BlockRule | null`
  - `applyBlocking(items: readonly TopicItemInfo[], rules: readonly BlockRule[]): number`
  - `heatClassName(count: number): string | null`
  - `applyHeatBadges(items: readonly TopicItemInfo[]): void`

- [ ] **Step 1: 写失败测试 tests/home-block.test.ts**

```ts
import { describe, expect, it } from 'vitest'
import { heatClassName } from '../src/contents/home/badge'
import { matchBlockRule } from '../src/contents/home/block'
import type { BlockRule, TopicItemInfo } from '../src/types'

function item(overrides: Partial<TopicItemInfo> = {}): TopicItemInfo {
  return {
    el: document.createElement('div'),
    topicId: '1',
    title: '武汉光谷房价还能涨吗',
    node: '汤逊湖',
    nodeSlug: 'water',
    username: 'alice',
    replyCount: 3,
    ...overrides,
  }
}

const rule = (o: Partial<BlockRule>): BlockRule => ({ id: 'r', type: 'keyword', value: 'x', enabled: true, ...o })

describe('matchBlockRule', () => {
  it('关键词命中标题（不区分大小写）', () => {
    expect(matchBlockRule(item({ title: 'AI 招聘专场' }), [rule({ type: 'keyword', value: 'ai' })])).not.toBeNull()
  })

  it('关键词未命中返回 null', () => {
    expect(matchBlockRule(item(), [rule({ type: 'keyword', value: '区块链' })])).toBeNull()
  })

  it('节点按 slug 精确匹配', () => {
    expect(matchBlockRule(item(), [rule({ type: 'node', value: 'water' })])).not.toBeNull()
    expect(matchBlockRule(item(), [rule({ type: 'node', value: 'wat' })])).toBeNull()
  })

  it('用户按用户名精确匹配且不区分大小写', () => {
    expect(matchBlockRule(item(), [rule({ type: 'user', value: 'ALICE' })])).not.toBeNull()
    expect(matchBlockRule(item(), [rule({ type: 'user', value: 'bob' })])).toBeNull()
  })

  it('禁用的规则不参与匹配', () => {
    expect(matchBlockRule(item(), [rule({ type: 'node', value: 'water', enabled: false })])).toBeNull()
  })

  it('返回第一条命中的规则', () => {
    const rules = [rule({ id: 'a', type: 'node', value: 'nope' }), rule({ id: 'b', type: 'node', value: 'water' })]
    expect(matchBlockRule(item(), rules)?.id).toBe('b')
  })
})

describe('heatClassName', () => {
  it.each([
    [0, null],
    [19, null],
    [20, 'gzk-heat-mid'],
    [49, 'gzk-heat-mid'],
    [50, 'gzk-heat-high'],
    [144, 'gzk-heat-high'],
  ])('回复数 %i 得到 %s', (count, expected) => {
    expect(heatClassName(count)).toBe(expected)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/home-block.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/home/block.ts**

```ts
import { CLASS } from '../../constants'
import type { BlockRule, TopicItemInfo } from '../../types'

export function matchBlockRule(item: TopicItemInfo, rules: readonly BlockRule[]): BlockRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue
    const value = rule.value.toLowerCase()
    if (rule.type === 'keyword' && item.title.toLowerCase().includes(value)) return rule
    if (rule.type === 'node' && item.nodeSlug !== null && item.nodeSlug.toLowerCase() === value) return rule
    if (rule.type === 'user' && item.username !== null && item.username.toLowerCase() === value) return rule
  }
  return null
}

const REASON_LABEL: Record<BlockRule['type'], string> = {
  keyword: '关键词',
  node: '节点',
  user: '用户',
}

/** 折叠命中屏蔽规则的主题项，返回被屏蔽的条数。 */
export function applyBlocking(items: readonly TopicItemInfo[], rules: readonly BlockRule[]): number {
  if (rules.length === 0) return 0
  let blocked = 0

  for (const item of items) {
    const rule = matchBlockRule(item, rules)
    if (!rule) continue
    blocked++
    item.el.classList.add(CLASS.BLOCKED)

    const tip = document.createElement('div')
    tip.className = CLASS.BLOCK_PLACEHOLDER
    tip.textContent = `已屏蔽（${REASON_LABEL[rule.type]}：${rule.value}）· 点击展开`
    tip.addEventListener('click', () => {
      item.el.classList.remove(CLASS.BLOCKED)
      tip.remove()
    })
    item.el.insertAdjacentElement('afterbegin', tip)
  }

  return blocked
}
```

- [ ] **Step 4: 写 src/contents/home/badge.ts**

```ts
import { HEAT_LEVELS, SELECTOR } from '../../constants'
import type { TopicItemInfo } from '../../types'
import { qs } from '../../utils'

export function heatClassName(count: number): string | null {
  for (const level of HEAT_LEVELS) {
    if (count >= level.min) return level.className
  }
  return null
}

export function applyHeatBadges(items: readonly TopicItemInfo[]): void {
  for (const item of items) {
    const cls = heatClassName(item.replyCount)
    if (cls === null) continue
    const count = qs<HTMLElement>(item.el, SELECTOR.TOPIC_ITEM_COUNT_LINK)
    count?.classList.add(cls)
  }
}
```

- [ ] **Step 5: 改 src/contents/home/index.ts 接入两个功能**

```ts
import { getConfig } from '../../storage'
import { applyHeatBadges } from './badge'
import { applyBlocking } from './block'
import { parseTopicList } from './parse'
import { initReadMarker } from './read-marker'

async function main(): Promise<void> {
  const items = parseTopicList(document)
  if (items.length === 0) return

  const config = await getConfig()
  applyBlocking(items, config.home.blockRules)
  if (config.home.readMarker) await initReadMarker(items)
  if (config.home.heatBadge) applyHeatBadges(items)
}

void main().catch(() => {
  // 静默降级
})
```

- [ ] **Step 6: 在 home.scss 中补样式**

```scss
.topic-item {
  transition: background-color 0.15s ease;

  &:hover { background: var(--gzk-surface-2) !important; }

  .avatar { border-radius: 6px; }

  .title a { color: var(--gzk-fg) !important; font-weight: 500; }
  .title a:hover { color: var(--gzk-accent) !important; }

  .meta,
  .meta a { color: var(--gzk-muted) !important; font-size: 12px; }
  .meta .node a { color: var(--gzk-fg-2) !important; }

  .count a {
    background: var(--gzk-surface-2) !important;
    border-radius: 10px;
    color: var(--gzk-muted) !important;
    padding: 1px 8px;
  }

  .count a.gzk-heat-mid { color: var(--gzk-warm) !important; }

  .count a.gzk-heat-high {
    background: var(--gzk-hot) !important;
    color: #fff !important;
  }
}

.topic-item.gzk-read .title a { color: var(--gzk-muted) !important; }

.topic-item.gzk-blocked > *:not(.gzk-block-placeholder) { display: none !important; }

.gzk-block-placeholder {
  color: var(--gzk-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 6px 10px;
}

.gzk-block-placeholder:hover { color: var(--gzk-accent); }
```

- [ ] **Step 7: 运行测试确认通过**

Run: `pnpm vitest run tests/home-block.test.ts && pnpm typecheck && pnpm build:style`
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat: 列表页屏蔽规则与回复数热度着色"
```

---

### Task 7: 话题页回复解析与分页解析

**Files:**
- Create: `src/contents/topic/parse.ts`
- Test: `tests/topic-parse.test.ts`

**Interfaces:**
- Consumes: `SELECTOR`、`ParsedReply`、`PaginationInfo`、`parseFloorNumber`、`extractUsername`
- Produces:
  - `parseReply(el: HTMLElement): ParsedReply | null`
  - `parseReplies(root: ParentNode): ParsedReply[]`
  - `parsePagination(root: ParentNode): PaginationInfo | null`
  - `parseTotalReplyCount(root: ParentNode): number | null`

- [ ] **Step 1: 写失败测试 tests/topic-parse.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePagination, parseReplies, parseTotalReplyCount } from '../src/contents/topic/parse'

function load(file: string): Document {
  return new DOMParser().parseFromString(fs.readFileSync(file, 'utf8'), 'text/html')
}

const simple = load('samples/topic.html')
const paged1 = load('samples/topic-paged-p1.html')
const paged2 = load('samples/topic-paged-p2.html')

describe('parseReplies - 未分页样本', () => {
  const replies = parseReplies(simple)

  it('解析出 40 条回复', () => {
    expect(replies).toHaveLength(40)
  })

  it('楼层从 1 连续到 40', () => {
    expect(replies.map((r) => r.floor)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
  })

  it('第一条回复字段正确', () => {
    const r = replies[0]!
    expect(r.username).toBe('daleatt')
    expect(r.votes).toBe(0)
    expect(r.replyId).toBe('1560968')
    expect(r.time).toBe('4 小时前')
    expect(r.location).toBe('美国')
    expect(r.mentionedUser).toBeNull()
    expect(r.contentText).toContain('我觉得都不止')
  })

  it('识别出正文首个 @用户名', () => {
    const mentioned = replies.filter((r) => r.mentionedUser !== null)
    expect(mentioned.length).toBeGreaterThan(5)
    expect(mentioned.every((r) => r.mentionedUser !== '')).toBe(true)
  })

  it('赞数取自 data-count', () => {
    expect(Math.max(...replies.map((r) => r.votes))).toBeGreaterThan(0)
  })
})

describe('parseReplies - 分页样本', () => {
  it('第一页 106 条，楼层 1..106', () => {
    const r = parseReplies(paged1)
    expect(r).toHaveLength(106)
    expect(r[0]!.floor).toBe(1)
    expect(r.at(-1)!.floor).toBe(106)
  })

  it('第二页 38 条，楼层从 107 开始连续', () => {
    const r = parseReplies(paged2)
    expect(r).toHaveLength(38)
    expect(r[0]!.floor).toBe(107)
    expect(r.at(-1)!.floor).toBe(144)
  })
})

describe('parseTotalReplyCount', () => {
  it('从「共收到 N 条回复」读出总数', () => {
    expect(parseTotalReplyCount(simple)).toBe(40)
    expect(parseTotalReplyCount(paged1)).toBe(144)
    expect(parseTotalReplyCount(paged2)).toBe(144)
  })
})

describe('parsePagination', () => {
  it('未分页时返回 null', () => {
    expect(parsePagination(simple)).toBeNull()
  })

  it('第一页解析出 current=1 total=2', () => {
    const p = parsePagination(paged1)!
    expect(p.current).toBe(1)
    expect(p.total).toBe(2)
    expect(p.urls.get(2)).toContain('/t/132793?p=2')
  })

  it('第二页解析出 current=2 total=2', () => {
    const p = parsePagination(paged2)!
    expect(p.current).toBe(2)
    expect(p.total).toBe(2)
    expect(p.urls.get(1)).toContain('/t/132793?p=1')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-parse.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/parse.ts**

```ts
import { SELECTOR } from '../../constants'
import type { PaginationInfo, ParsedReply } from '../../types'
import { extractUsername, parseFloorNumber, qs, qsa, text } from '../../utils'

export function parseReply(el: HTMLElement): ParsedReply | null {
  const floor = parseFloorNumber(text(qs(el, SELECTOR.REPLY_FLOOR)))
  if (!Number.isFinite(floor)) return null

  const username = text(qs(el, SELECTOR.REPLY_USERNAME))
  if (username === '') return null

  const voteLink = qs<HTMLAnchorElement>(el, SELECTOR.REPLY_VOTE)
  const votes = Number.parseInt(voteLink?.getAttribute('data-count') ?? '', 10)
  const replyId = /reply_id=(\d+)/.exec(voteLink?.getAttribute('href') ?? '')?.[1] ?? null

  // .meta 内有一到两个 .time：第一个是时间，第二个（若有）是 IP 归属地。
  const times = qsa(el, SELECTOR.REPLY_TIME).map(text)

  const content = qs<HTMLElement>(el, SELECTOR.REPLY_CONTENT)
  const firstLink = content ? qs<HTMLAnchorElement>(content, 'a[href*="/u/"]') : null
  const mentionedUser =
    firstLink !== null && firstLink.textContent?.trim().startsWith('@') === true
      ? extractUsername(firstLink.getAttribute('href') ?? '')
      : null

  return {
    el,
    floor,
    username,
    replyId,
    votes: Number.isFinite(votes) ? votes : 0,
    time: times[0] ?? '',
    location: times[1] ?? null,
    mentionedUser,
    contentText: text(content).replace(/\s+/g, ' '),
    quotedFloor: null,
  }
}

export function parseReplies(root: ParentNode): ParsedReply[] {
  return qsa<HTMLElement>(root, SELECTOR.REPLY_ITEM)
    .map(parseReply)
    .filter((r): r is ParsedReply => r !== null)
}

/** 从「共收到 144 条回复」中读出总数。 */
export function parseTotalReplyCount(root: ParentNode): number | null {
  const header = qs(root, SELECTOR.REPLY_HEADER)
  const m = /(\d+)/.exec(text(header))
  return m ? Number(m[1]) : null
}

/**
 * 解析回复区分页。仅认 .topic-reply 内的 ul.pagination，
 * 避免误取列表页的分页控件。
 */
export function parsePagination(root: ParentNode): PaginationInfo | null {
  const box = qs(root, SELECTOR.REPLY_BOX)
  const nav = box ? qs(box, SELECTOR.PAGINATION) : null
  if (!nav) return null

  const urls = new Map<number, string>()
  let current = 1

  for (const li of qsa<HTMLElement>(nav, 'li')) {
    const label = text(li)
    const page = Number.parseInt(label, 10)
    if (!Number.isFinite(page)) continue // 跳过「上一页」「下一页」
    if (li.classList.contains('active')) current = page
    const href = qs<HTMLAnchorElement>(li, 'a')?.getAttribute('href')
    if (href) urls.set(page, href)
  }

  const pages = [...urls.keys(), current]
  const total = pages.length > 0 ? Math.max(...pages) : 1
  if (total <= 1) return null

  return { current, total, urls }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-parse.test.ts && pnpm typecheck`
Expected: PASS，全部用例通过。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 话题页回复与分页解析"
```

---

### Task 8: 引用关系解析

**Files:**
- Create: `src/contents/topic/quote.ts`
- Test: `tests/topic-quote.test.ts`

**Interfaces:**
- Consumes: `ParsedReply`
- Produces:
  - `resolveQuotes(replies: ParsedReply[], topicAuthor: string | null): ParsedReply[]`（原地填充 `quotedFloor`，`0` 表示指向楼主，返回同一数组）
  - `buildQuoteChildren(replies: readonly ParsedReply[]): Map<number, number[]>`（被引楼层 -> 引用它的楼层列表）

- [ ] **Step 1: 写失败测试 tests/topic-quote.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseReplies } from '../src/contents/topic/parse'
import { buildQuoteChildren, resolveQuotes } from '../src/contents/topic/quote'
import type { ParsedReply } from '../src/types'

function reply(floor: number, username: string, mentionedUser: string | null): ParsedReply {
  return {
    el: document.createElement('div'),
    floor,
    username,
    replyId: String(floor),
    votes: 0,
    time: '',
    location: null,
    mentionedUser,
    contentText: '',
    quotedFloor: null,
  }
}

describe('resolveQuotes', () => {
  it('指向该用户此前最近的一个楼层', () => {
    const r = resolveQuotes([reply(1, 'a', null), reply(2, 'b', null), reply(3, 'a', null), reply(4, 'c', 'a')], null)
    expect(r[3]!.quotedFloor).toBe(3)
  })

  it('被引用者只在更早楼层出现一次时正确指向', () => {
    const r = resolveQuotes([reply(1, 'a', null), reply(2, 'b', 'a')], null)
    expect(r[1]!.quotedFloor).toBe(1)
  })

  it('被引用者是楼主且此前无回复时指向 0', () => {
    const r = resolveQuotes([reply(1, 'b', 'op')], 'op')
    expect(r[0]!.quotedFloor).toBe(0)
  })

  it('楼主此前已回复过时指向其回复楼层而非 0', () => {
    const r = resolveQuotes([reply(1, 'op', null), reply(2, 'b', 'op')], 'op')
    expect(r[1]!.quotedFloor).toBe(1)
  })

  it('找不到被引用者时保持 null', () => {
    const r = resolveQuotes([reply(1, 'a', 'ghost')], null)
    expect(r[0]!.quotedFloor).toBeNull()
  })

  it('无 @ 的回复保持 null', () => {
    const r = resolveQuotes([reply(1, 'a', null)], null)
    expect(r[0]!.quotedFloor).toBeNull()
  })

  it('不会指向自身或更晚的楼层', () => {
    const r = resolveQuotes([reply(1, 'a', 'a'), reply(2, 'b', null)], null)
    expect(r[0]!.quotedFloor).toBeNull()
  })
})

describe('buildQuoteChildren', () => {
  it('汇总每个楼层被哪些楼层引用', () => {
    const replies = resolveQuotes(
      [reply(1, 'a', null), reply(2, 'b', 'a'), reply(3, 'c', 'a'), reply(4, 'd', 'b')],
      null
    )
    const children = buildQuoteChildren(replies)
    expect(children.get(1)).toEqual([2, 3])
    expect(children.get(2)).toEqual([4])
    expect(children.has(3)).toBe(false)
  })
})

describe('真实样本', () => {
  const doc = new DOMParser().parseFromString(fs.readFileSync('samples/topic.html', 'utf8'), 'text/html')
  const replies = resolveQuotes(parseReplies(doc), 'BlueSandMu')

  it('至少解析出 5 条引用关系', () => {
    expect(replies.filter((r) => r.quotedFloor !== null).length).toBeGreaterThanOrEqual(5)
  })

  it('所有已解析的引用都指向更早的楼层或楼主', () => {
    for (const r of replies) {
      if (r.quotedFloor === null) continue
      expect(r.quotedFloor).toBeLessThan(r.floor)
    }
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-quote.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/quote.ts**

```ts
import type { ParsedReply } from '../../types'

/** 楼主的「楼层号」。引用块渲染时映射到主题正文。 */
export const OP_FLOOR = 0

/**
 * 为每条回复解析被引用的楼层，原地写入 quotedFloor。
 * 规则：被引用者 U 的目标楼层 = 楼层号小于当前楼层且作者为 U 的最大楼层；
 * 若不存在且 U 是主题作者，则指向 OP_FLOOR；否则保持 null。
 */
export function resolveQuotes(replies: ParsedReply[], topicAuthor: string | null): ParsedReply[] {
  const lastFloorOf = new Map<string, number>()
  const authorKey = topicAuthor?.toLowerCase() ?? null

  for (const reply of replies) {
    if (reply.mentionedUser !== null) {
      const key = reply.mentionedUser.toLowerCase()
      const prev = lastFloorOf.get(key)
      if (prev !== undefined) {
        reply.quotedFloor = prev
      } else if (authorKey !== null && key === authorKey) {
        reply.quotedFloor = OP_FLOOR
      }
    }
    lastFloorOf.set(reply.username.toLowerCase(), reply.floor)
  }

  return replies
}

/** 被引楼层 -> 引用它的楼层列表（按楼层升序）。 */
export function buildQuoteChildren(replies: readonly ParsedReply[]): Map<number, number[]> {
  const map = new Map<number, number[]>()
  for (const reply of replies) {
    if (reply.quotedFloor === null) continue
    const list = map.get(reply.quotedFloor)
    if (list) list.push(reply.floor)
    else map.set(reply.quotedFloor, [reply.floor])
  }
  for (const list of map.values()) list.sort((a, b) => a - b)
  return map
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-quote.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 回复引用关系解析"
```

---

### Task 9: 分页回复合并

**Files:**
- Create: `src/contents/topic/merge-pages.ts`
- Test: `tests/topic-merge.test.ts`

**Interfaces:**
- Consumes: `parsePagination`、`SELECTOR`、`CLASS`、`mapWithConcurrency`
- Produces:
  - `extractReplyElements(html: string): HTMLElement[]`（从整页 HTML 文本中取出 `.reply-item` 节点）
  - `mergeReplyPages(doc: Document, fetchPage: (url: string) => Promise<string>, onProgress?: (done: number, total: number) => void): Promise<{ merged: number; pages: number } | null>`

- [ ] **Step 1: 写失败测试 tests/topic-merge.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { parseReplies } from '../src/contents/topic/parse'
import { extractReplyElements, mergeReplyPages } from '../src/contents/topic/merge-pages'

const p1 = fs.readFileSync('samples/topic-paged-p1.html', 'utf8')
const p2 = fs.readFileSync('samples/topic-paged-p2.html', 'utf8')
const single = fs.readFileSync('samples/topic.html', 'utf8')

describe('extractReplyElements', () => {
  it('从整页 HTML 中取出全部 reply-item', () => {
    expect(extractReplyElements(p2)).toHaveLength(38)
  })

  it('无回复的 HTML 返回空数组', () => {
    expect(extractReplyElements('<html><body></body></html>')).toHaveLength(0)
  })
})

describe('mergeReplyPages', () => {
  it('未分页时不发请求并返回 null', async () => {
    const doc = new DOMParser().parseFromString(single, 'text/html')
    const fetchPage = vi.fn()
    expect(await mergeReplyPages(doc, fetchPage)).toBeNull()
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('把第二页回复合并进第一页，楼层连续到 144', async () => {
    const doc = new DOMParser().parseFromString(p1, 'text/html')
    const fetchPage = vi.fn(async () => p2)

    const result = await mergeReplyPages(doc, fetchPage)

    expect(result).toEqual({ merged: 38, pages: 2 })
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toContain('p=2')

    const replies = parseReplies(doc)
    expect(replies).toHaveLength(144)
    expect(replies.map((r) => r.floor)).toEqual(Array.from({ length: 144 }, (_, i) => i + 1))
  })

  it('按楼层升序插入，即使返回顺序被打乱', async () => {
    const doc = new DOMParser().parseFromString(p2, 'text/html')
    const fetchPage = vi.fn(async () => p1)

    await mergeReplyPages(doc, fetchPage)

    const floors = parseReplies(doc).map((r) => r.floor)
    expect(floors).toEqual([...floors].sort((a, b) => a - b))
    expect(floors[0]).toBe(1)
    expect(floors.at(-1)).toBe(144)
  })

  it('抓取失败时抛出，由调用方降级', async () => {
    const doc = new DOMParser().parseFromString(p1, 'text/html')
    const fetchPage = vi.fn(async () => {
      throw new Error('network down')
    })
    await expect(mergeReplyPages(doc, fetchPage)).rejects.toThrow('network down')
  })

  it('上报进度', async () => {
    const doc = new DOMParser().parseFromString(p1, 'text/html')
    const onProgress = vi.fn()
    await mergeReplyPages(doc, async () => p2, onProgress)
    expect(onProgress).toHaveBeenCalledWith(1, 1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-merge.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/merge-pages.ts**

```ts
import { SELECTOR } from '../../constants'
import { mapWithConcurrency, parseFloorNumber, qs, qsa, text } from '../../utils'
import { parsePagination } from './parse'

const CONCURRENCY = 2

/** 从整页 HTML 文本中解析出 .reply-item 元素（脱离原文档，可直接 append）。 */
export function extractReplyElements(html: string): HTMLElement[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return qsa<HTMLElement>(doc, SELECTOR.REPLY_ITEM)
}

function floorOf(el: HTMLElement): number {
  const n = parseFloorNumber(text(qs(el, SELECTOR.REPLY_FLOOR)))
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
}

/**
 * 拉取回复区的其余分页并合并进当前文档。
 * 未分页时返回 null 且不发起任何请求。
 * 任一页抓取失败时抛出，由调用方负责降级与提示。
 */
export async function mergeReplyPages(
  doc: Document,
  fetchPage: (url: string) => Promise<string>,
  onProgress?: (done: number, total: number) => void
): Promise<{ merged: number; pages: number } | null> {
  const pagination = parsePagination(doc)
  if (pagination === null) return null

  const list = qs<HTMLElement>(doc, SELECTOR.REPLY_LIST)
  if (list === null) return null

  const targets = [...pagination.urls.entries()]
    .filter(([page]) => page !== pagination.current)
    .sort((a, b) => a[0] - b[0])
    .map(([, url]) => url)

  if (targets.length === 0) return null

  let done = 0
  const pagesHtml = await mapWithConcurrency(targets, CONCURRENCY, async (url) => {
    const html = await fetchPage(url)
    done++
    onProgress?.(done, targets.length)
    return html
  })

  const incoming = pagesHtml.flatMap(extractReplyElements)
  if (incoming.length === 0) return { merged: 0, pages: pagination.total }

  // 与现有回复合并后按楼层号整体重排，保证跨页顺序正确。
  const existing = qsa<HTMLElement>(list, SELECTOR.REPLY_ITEM)
  const all = [...existing, ...incoming.map((el) => doc.importNode(el, true))]
  all.sort((a, b) => floorOf(a) - floorOf(b))
  for (const el of all) list.appendChild(el)

  // 合并完成后隐藏原分页控件
  const footer = qs<HTMLElement>(doc, SELECTOR.REPLY_FOOTER)
  const nav = footer ? qs<HTMLElement>(footer, SELECTOR.PAGINATION) : null
  nav?.closest('nav')?.setAttribute('hidden', '')
  qs<HTMLElement>(doc, '.pagination-wap')?.setAttribute('hidden', '')

  return { merged: incoming.length, pages: pagination.total }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-merge.test.ts && pnpm typecheck`
Expected: PASS，144 条楼层连续。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 分页回复合并"
```

---

### Task 10: 楼层锚点与跳转

**Files:**
- Create: `src/contents/topic/anchor.ts`
- Test: `tests/topic-anchor.test.ts`

**Interfaces:**
- Consumes: `ParsedReply`、`CLASS`
- Produces:
  - `floorElementId(floor: number): string`
  - `applyAnchors(replies: readonly ParsedReply[]): void`
  - `scrollToFloor(doc: Document, floor: number): boolean`

- [ ] **Step 1: 写失败测试 tests/topic-anchor.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { applyAnchors, floorElementId, scrollToFloor } from '../src/contents/topic/anchor'
import { parseReplies } from '../src/contents/topic/parse'

function load(): Document {
  return new DOMParser().parseFromString(fs.readFileSync('samples/topic.html', 'utf8'), 'text/html')
}

describe('floorElementId', () => {
  it('与站点原有 #replyN 锚点保持一致', () => {
    expect(floorElementId(40)).toBe('reply40')
  })
})

describe('applyAnchors', () => {
  it('给每条回复注入 id', () => {
    const doc = load()
    const replies = parseReplies(doc)
    applyAnchors(replies)
    expect(doc.getElementById('reply1')).toBe(replies[0]!.el)
    expect(doc.getElementById('reply40')).toBe(replies[39]!.el)
  })

  it('把楼层号变成可点击链接', () => {
    const doc = load()
    const replies = parseReplies(doc)
    applyAnchors(replies)
    const link = replies[0]!.el.querySelector('a.gzk-floor-link')
    expect(link).not.toBeNull()
    expect(link!.textContent).toBe('#1')
    expect(link!.getAttribute('href')).toBe('#reply1')
  })

  it('重复调用不会重复注入链接', () => {
    const doc = load()
    const replies = parseReplies(doc)
    applyAnchors(replies)
    applyAnchors(replies)
    expect(replies[0]!.el.querySelectorAll('a.gzk-floor-link')).toHaveLength(1)
  })
})

describe('scrollToFloor', () => {
  it('目标存在时加高亮并返回 true', () => {
    const doc = load()
    applyAnchors(parseReplies(doc))
    expect(scrollToFloor(doc, 3)).toBe(true)
    expect(doc.getElementById('reply3')!.classList.contains(CLASS.HIGHLIGHT)).toBe(true)
  })

  it('目标不存在时返回 false', () => {
    const doc = load()
    applyAnchors(parseReplies(doc))
    expect(scrollToFloor(doc, 999)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-anchor.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/anchor.ts**

```ts
import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'

const FLOOR_LINK_CLASS = 'gzk-floor-link'
const HIGHLIGHT_MS = 1500

export function floorElementId(floor: number): string {
  return `reply${floor}`
}

/**
 * 给回复注入锚点 id，并把楼层号文本换成指向自身的链接。
 * 站点自身输出的 /t/{id}#reply{n} 链接原本没有对应锚点，这里顺带修复。
 */
export function applyAnchors(replies: readonly ParsedReply[]): void {
  for (const reply of replies) {
    reply.el.id = floorElementId(reply.floor)

    const floorEl = qs<HTMLElement>(reply.el, SELECTOR.REPLY_FLOOR)
    if (!floorEl || floorEl.querySelector(`a.${FLOOR_LINK_CLASS}`)) continue

    const link = reply.el.ownerDocument.createElement('a')
    link.className = FLOOR_LINK_CLASS
    link.href = `#${floorElementId(reply.floor)}`
    link.textContent = `#${reply.floor}`
    link.title = '点击定位到本楼层'
    floorEl.textContent = ''
    floorEl.appendChild(link)
  }
}

/** 滚动到指定楼层并短暂高亮。楼层 0 表示主题正文。 */
export function scrollToFloor(doc: Document, floor: number): boolean {
  const target =
    floor === 0 ? qs<HTMLElement>(doc, SELECTOR.TOPIC_DETAIL) : doc.getElementById(floorElementId(floor))
  if (!target) return false

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add(CLASS.HIGHLIGHT)
  setTimeout(() => target.classList.remove(CLASS.HIGHLIGHT), HIGHLIGHT_MS)
  return true
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-anchor.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 楼层锚点注入与跳转高亮"
```

---

### Task 11: 引用块与回应徽章渲染

**Files:**
- Create: `src/contents/topic/render-quote.ts`
- Test: `tests/topic-render-quote.test.ts`

**Interfaces:**
- Consumes: `ParsedReply`、`buildQuoteChildren`、`OP_FLOOR`、`scrollToFloor`、`CLASS`
- Produces:
  - `quoteSummary(reply: ParsedReply | null, maxLength?: number): string`
  - `renderQuotes(doc: Document, replies: readonly ParsedReply[]): void`

- [ ] **Step 1: 写失败测试 tests/topic-render-quote.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { parseReplies } from '../src/contents/topic/parse'
import { resolveQuotes } from '../src/contents/topic/quote'
import { quoteSummary, renderQuotes } from '../src/contents/topic/render-quote'
import type { ParsedReply } from '../src/types'

function load(): Document {
  return new DOMParser().parseFromString(fs.readFileSync('samples/topic.html', 'utf8'), 'text/html')
}

describe('quoteSummary', () => {
  it('截断超长文本并加省略号', () => {
    const r = { contentText: 'x'.repeat(100) } as ParsedReply
    expect(quoteSummary(r, 10)).toBe(`${'x'.repeat(10)}…`)
  })

  it('短文本原样返回', () => {
    expect(quoteSummary({ contentText: '短' } as ParsedReply, 10)).toBe('短')
  })

  it('传 null 表示楼主，返回空串', () => {
    expect(quoteSummary(null)).toBe('')
  })
})

describe('renderQuotes', () => {
  it('给有引用关系的回复插入引用块', () => {
    const doc = load()
    const replies = resolveQuotes(parseReplies(doc), 'BlueSandMu')
    renderQuotes(doc, replies)

    const quoted = replies.filter((r) => r.quotedFloor !== null)
    expect(quoted.length).toBeGreaterThan(0)
    for (const r of quoted) {
      expect(r.el.querySelector(`.${CLASS.QUOTE_BLOCK}`)).not.toBeNull()
    }
  })

  it('无引用关系的回复不插入引用块', () => {
    const doc = load()
    const replies = resolveQuotes(parseReplies(doc), 'BlueSandMu')
    renderQuotes(doc, replies)
    for (const r of replies.filter((x) => x.quotedFloor === null)) {
      expect(r.el.querySelector(`.${CLASS.QUOTE_BLOCK}`)).toBeNull()
    }
  })

  it('给被引用的回复加上回应数徽章', () => {
    const doc = load()
    const replies = resolveQuotes(parseReplies(doc), 'BlueSandMu')
    renderQuotes(doc, replies)

    const referenced = new Set(replies.map((r) => r.quotedFloor).filter((f): f is number => f !== null && f > 0))
    expect(referenced.size).toBeGreaterThan(0)
    for (const floor of referenced) {
      const el = replies.find((r) => r.floor === floor)!.el
      expect(el.querySelector(`.${CLASS.REPLY_CHILDREN_BADGE}`)).not.toBeNull()
    }
  })

  it('重复调用不会重复插入', () => {
    const doc = load()
    const replies = resolveQuotes(parseReplies(doc), 'BlueSandMu')
    renderQuotes(doc, replies)
    renderQuotes(doc, replies)
    const target = replies.find((r) => r.quotedFloor !== null)!
    expect(target.el.querySelectorAll(`.${CLASS.QUOTE_BLOCK}`)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-render-quote.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/render-quote.ts**

```ts
import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'
import { scrollToFloor } from './anchor'
import { OP_FLOOR, buildQuoteChildren } from './quote'

const SUMMARY_LENGTH = 60

export function quoteSummary(reply: ParsedReply | null, maxLength: number = SUMMARY_LENGTH): string {
  if (reply === null) return ''
  const t = reply.contentText.trim()
  return t.length > maxLength ? `${t.slice(0, maxLength)}…` : t
}

/** 在有引用关系的回复正文上方插入引用块，并给被引用的回复加回应数徽章。 */
export function renderQuotes(doc: Document, replies: readonly ParsedReply[]): void {
  const byFloor = new Map(replies.map((r) => [r.floor, r]))
  const children = buildQuoteChildren(replies)

  for (const reply of replies) {
    if (reply.quotedFloor === null) continue
    if (reply.el.querySelector(`.${CLASS.QUOTE_BLOCK}`)) continue

    const target = reply.quotedFloor === OP_FLOOR ? null : byFloor.get(reply.quotedFloor) ?? null
    if (reply.quotedFloor !== OP_FLOOR && target === null) continue

    const label = reply.quotedFloor === OP_FLOOR ? '楼主' : `#${target!.floor} ${target!.username}`
    const block = doc.createElement('div')
    block.className = CLASS.QUOTE_BLOCK
    block.title = '点击定位到被引用的楼层'

    const who = doc.createElement('span')
    who.className = 'gzk-quote-who'
    who.textContent = label

    const summary = doc.createElement('span')
    summary.className = 'gzk-quote-text'
    summary.textContent = quoteSummary(target)

    block.append(who, summary)
    block.addEventListener('click', () => scrollToFloor(doc, reply.quotedFloor!))

    const content = qs<HTMLElement>(reply.el, SELECTOR.REPLY_CONTENT)
    content?.insertAdjacentElement('beforebegin', block)
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

    qs<HTMLElement>(reply.el, SELECTOR.REPLY_FLOOR)?.insertAdjacentElement('afterend', badge)
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-render-quote.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 引用块与回应数徽章渲染"
```

---

### Task 12: 热门回复区

**Files:**
- Create: `src/contents/topic/hot-replies.ts`
- Test: `tests/topic-hot.test.ts`

**Interfaces:**
- Consumes: `ParsedReply`、`buildQuoteChildren`、`scrollToFloor`、`quoteSummary`、`CLASS`、`SELECTOR`
- Produces:
  - `pickHotReplies(replies: readonly ParsedReply[], voteThreshold: number, quoteThreshold?: number, limit?: number): ParsedReply[]`
  - `renderHotReplies(doc: Document, hot: readonly ParsedReply[]): void`

- [ ] **Step 1: 写失败测试 tests/topic-hot.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { pickHotReplies, renderHotReplies } from '../src/contents/topic/hot-replies'
import { parseReplies } from '../src/contents/topic/parse'
import { resolveQuotes } from '../src/contents/topic/quote'
import type { ParsedReply } from '../src/types'

function reply(floor: number, votes: number, mentionedUser: string | null = null, username = `u${floor}`): ParsedReply {
  return {
    el: document.createElement('div'),
    floor,
    username,
    replyId: String(floor),
    votes,
    time: '',
    location: null,
    mentionedUser,
    contentText: `内容 ${floor}`,
    quotedFloor: null,
  }
}

describe('pickHotReplies', () => {
  it('按赞数阈值筛选并降序排列', () => {
    const hot = pickHotReplies([reply(1, 1), reply(2, 12), reply(3, 7)], 5)
    expect(hot.map((r) => r.floor)).toEqual([2, 3])
  })

  it('赞数相同时楼层小的在前', () => {
    const hot = pickHotReplies([reply(3, 8), reply(1, 8)], 5)
    expect(hot.map((r) => r.floor)).toEqual([1, 3])
  })

  it('被引用次数达到阈值也入选，即便赞数不够', () => {
    const replies = resolveQuotes(
      [reply(1, 0, null, 'a'), reply(2, 0, 'a', 'b'), reply(3, 0, 'a', 'c'), reply(4, 0, 'a', 'd')],
      null
    )
    const hot = pickHotReplies(replies, 5, 3)
    expect(hot.map((r) => r.floor)).toEqual([1])
  })

  it('限制返回条数', () => {
    const replies = Array.from({ length: 10 }, (_, i) => reply(i + 1, 100 - i))
    expect(pickHotReplies(replies, 5, 3, 5)).toHaveLength(5)
  })

  it('无人入选时返回空数组', () => {
    expect(pickHotReplies([reply(1, 0), reply(2, 1)], 5)).toEqual([])
  })
})

describe('renderHotReplies', () => {
  const doc = new DOMParser().parseFromString(fs.readFileSync('samples/topic.html', 'utf8'), 'text/html')
  const replies = parseReplies(doc)

  it('有热门回复时插入热门区', () => {
    const hot = pickHotReplies(replies, 5)
    expect(hot.length).toBeGreaterThan(0)
    renderHotReplies(doc, hot)
    const box = doc.querySelector(`.${CLASS.HOT_BOX}`)
    expect(box).not.toBeNull()
    expect(box!.querySelectorAll('.gzk-hot-item')).toHaveLength(hot.length)
  })

  it('无热门回复时不插入任何东西', () => {
    const d = new DOMParser().parseFromString(fs.readFileSync('samples/topic.html', 'utf8'), 'text/html')
    renderHotReplies(d, [])
    expect(d.querySelector(`.${CLASS.HOT_BOX}`)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-hot.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/hot-replies.ts**

```ts
import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'
import { scrollToFloor } from './anchor'
import { buildQuoteChildren } from './quote'
import { quoteSummary } from './render-quote'

const DEFAULT_QUOTE_THRESHOLD = 3
const DEFAULT_LIMIT = 5

/** 赞数达标或被引用次数达标的回复即为热门，按赞数降序、楼层升序。 */
export function pickHotReplies(
  replies: readonly ParsedReply[],
  voteThreshold: number,
  quoteThreshold: number = DEFAULT_QUOTE_THRESHOLD,
  limit: number = DEFAULT_LIMIT
): ParsedReply[] {
  const children = buildQuoteChildren(replies)

  return replies
    .filter((r) => r.votes >= voteThreshold || (children.get(r.floor)?.length ?? 0) >= quoteThreshold)
    .sort((a, b) => b.votes - a.votes || a.floor - b.floor)
    .slice(0, limit)
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
  title.textContent = `热门回复 · ${hot.length}`

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
    text.textContent = quoteSummary(reply, 80)

    item.append(meta, text)
    item.addEventListener('click', () => scrollToFloor(doc, reply.floor))
    list.appendChild(item)
  }

  wrap.append(title, list)
  const header = qs<HTMLElement>(doc, SELECTOR.REPLY_HEADER)
  if (header) header.insertAdjacentElement('afterend', wrap)
  else box.insertAdjacentElement('afterbegin', wrap)
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-hot.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 热门回复区"
```

---

### Task 13: 长回复折叠

**Files:**
- Create: `src/contents/topic/collapse.ts`
- Test: `tests/topic-collapse.test.ts`

**Interfaces:**
- Consumes: `ParsedReply`、`CLASS`、`SELECTOR`
- Produces:
  - `shouldCollapse(height: number, limit: number): boolean`
  - `applyCollapse(doc: Document, replies: readonly ParsedReply[], limit: number, measure?: (el: HTMLElement) => number): number`

**说明：** happy-dom 不做布局，`scrollHeight` 恒为 0，因此高度测量通过可注入的 `measure` 参数解耦，测试传入桩函数，运行时默认用 `el.scrollHeight`。

- [ ] **Step 1: 写失败测试 tests/topic-collapse.test.ts**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLASS } from '../src/constants'
import { applyCollapse, shouldCollapse } from '../src/contents/topic/collapse'
import { parseReplies } from '../src/contents/topic/parse'

function load(file: string): Document {
  return new DOMParser().parseFromString(fs.readFileSync(file, 'utf8'), 'text/html')
}

describe('shouldCollapse', () => {
  it('高度超过阈值时折叠', () => {
    expect(shouldCollapse(300, 240)).toBe(true)
  })

  it('高度等于或低于阈值时不折叠', () => {
    expect(shouldCollapse(240, 240)).toBe(false)
    expect(shouldCollapse(100, 240)).toBe(false)
  })
})

describe('applyCollapse', () => {
  it('只折叠超长回复并插入展开按钮', () => {
    const doc = load('samples/topic.html')
    const replies = parseReplies(doc)
    // 按正文字数模拟高度：每 40 字约一行 24px
    const measure = (el: HTMLElement): number => Math.ceil((el.textContent ?? '').length / 40) * 24

    const collapsed = applyCollapse(doc, replies, 240, measure)

    expect(collapsed).toBeGreaterThan(0)
    const anyCollapsed = replies.find((r) => r.el.classList.contains(CLASS.COLLAPSED))!
    expect(anyCollapsed.el.querySelector(`.${CLASS.COLLAPSE_TOGGLE}`)).not.toBeNull()
  })

  it('点击展开按钮后移除折叠状态', () => {
    const doc = load('samples/topic-paged-p1.html')
    const replies = parseReplies(doc)
    const measure = (el: HTMLElement): number => Math.ceil((el.textContent ?? '').length / 40) * 24

    applyCollapse(doc, replies, 240, measure)
    const target = replies.find((r) => r.el.classList.contains(CLASS.COLLAPSED))!
    const toggle = target.el.querySelector<HTMLElement>(`.${CLASS.COLLAPSE_TOGGLE}`)!

    toggle.click()

    expect(target.el.classList.contains(CLASS.COLLAPSED)).toBe(false)
    expect(target.el.querySelector(`.${CLASS.COLLAPSE_TOGGLE}`)).toBeNull()
  })

  it('全部回复都不超长时返回 0', () => {
    const doc = load('samples/topic.html')
    const replies = parseReplies(doc)
    expect(applyCollapse(doc, replies, 240, () => 10)).toBe(0)
  })

  it('重复调用不会重复插入按钮', () => {
    const doc = load('samples/topic-paged-p1.html')
    const replies = parseReplies(doc)
    const measure = (el: HTMLElement): number => Math.ceil((el.textContent ?? '').length / 40) * 24
    applyCollapse(doc, replies, 240, measure)
    applyCollapse(doc, replies, 240, measure)
    const target = replies.find((r) => r.el.classList.contains(CLASS.COLLAPSED))!
    expect(target.el.querySelectorAll(`.${CLASS.COLLAPSE_TOGGLE}`)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/topic-collapse.test.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写 src/contents/topic/collapse.ts**

```ts
import { CLASS, SELECTOR } from '../../constants'
import type { ParsedReply } from '../../types'
import { qs } from '../../utils'

export function shouldCollapse(height: number, limit: number): boolean {
  return height > limit
}

function defaultMeasure(el: HTMLElement): number {
  return el.scrollHeight
}

/**
 * 折叠超过 limit 像素高的回复正文，返回被折叠的条数。
 * measure 可注入，便于在无布局能力的测试环境中替换。
 */
export function applyCollapse(
  doc: Document,
  replies: readonly ParsedReply[],
  limit: number,
  measure: (el: HTMLElement) => number = defaultMeasure
): number {
  let count = 0

  for (const reply of replies) {
    const content = qs<HTMLElement>(reply.el, SELECTOR.REPLY_CONTENT)
    if (!content) continue
    if (reply.el.classList.contains(CLASS.COLLAPSED)) continue
    if (!shouldCollapse(measure(content), limit)) continue

    count++
    reply.el.classList.add(CLASS.COLLAPSED)
    reply.el.style.setProperty('--gzk-collapse-height', `${limit}px`)

    const toggle = doc.createElement('button')
    toggle.type = 'button'
    toggle.className = CLASS.COLLAPSE_TOGGLE
    toggle.textContent = '展开全文'
    toggle.addEventListener('click', () => {
      reply.el.classList.remove(CLASS.COLLAPSED)
      reply.el.style.removeProperty('--gzk-collapse-height')
      toggle.remove()
    })
    content.insertAdjacentElement('afterend', toggle)

    // 图片加载完成后高度会变化，若已不超限则自动取消折叠。
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (!reply.el.classList.contains(CLASS.COLLAPSED)) {
          ro.disconnect()
          return
        }
        if (!shouldCollapse(content.scrollHeight, limit)) {
          reply.el.classList.remove(CLASS.COLLAPSED)
          toggle.remove()
          ro.disconnect()
        }
      })
      ro.observe(content)
    }
  }

  return count
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run tests/topic-collapse.test.ts && pnpm typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 长回复折叠"
```

**实现偏差（2026-09-08）：** 实际实现去掉了计划中的 ResizeObserver
自动取消折叠。图片延迟加载只会让首次测量偏小、从而漏折叠，不会造成
错误折叠；为此常驻一个 observer 收益不抵复杂度。折叠时机改由话题页
入口在 DOM 就绪后一次性执行。

---

### Task 14: 话题页入口装配与样式

**Files:**
- Create: `src/contents/topic/index.ts`
- Modify: `src/styles/topic.scss`
- Test: 无新增单测（各模块已单独覆盖）

**Interfaces:**
- Consumes: 前述 topic/* 全部模块、`getConfig`、`markTopicRead`
- Produces: 话题页运行时装配逻辑

- [ ] **Step 1: 写 src/contents/topic/index.ts**

```ts
import { CLASS, SELECTOR } from '../../constants'
import { getConfig, markTopicRead } from '../../storage'
import type { ParsedReply } from '../../types'
import { extractTopicId, extractUsername, qs } from '../../utils'
import { applyAnchors, scrollToFloor } from './anchor'
import { applyCollapse } from './collapse'
import { pickHotReplies, renderHotReplies } from './hot-replies'
import { mergeReplyPages } from './merge-pages'
import { parseReplies } from './parse'
import { resolveQuotes } from './quote'
import { renderQuotes } from './render-quote'

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function showTip(text: string): HTMLElement | null {
  const header = qs<HTMLElement>(document, SELECTOR.REPLY_HEADER)
  if (!header) return null
  let tip = header.querySelector<HTMLElement>(`.${CLASS.MERGE_TIP}`)
  if (!tip) {
    tip = document.createElement('span')
    tip.className = CLASS.MERGE_TIP
    header.appendChild(tip)
  }
  tip.textContent = text
  return tip
}

function topicAuthor(): string | null {
  const link = qs<HTMLAnchorElement>(document, SELECTOR.TOPIC_DETAIL_AUTHOR)
  return link ? extractUsername(link.getAttribute('href') ?? '') : null
}

function enhance(replies: ParsedReply[], config: Awaited<ReturnType<typeof getConfig>>): void {
  resolveQuotes(replies, topicAuthor())

  if (config.topic.anchor) applyAnchors(replies)
  if (config.topic.quote) renderQuotes(document, replies)
  if (config.topic.hotReplies) renderHotReplies(document, pickHotReplies(replies, config.topic.hotThreshold))
  if (config.topic.collapse) applyCollapse(document, replies, config.topic.collapseHeight)
}

async function main(): Promise<void> {
  if (!qs(document, SELECTOR.REPLY_BOX)) return

  const config = await getConfig()

  const topicId = extractTopicId(location.pathname + location.search)
  if (topicId !== null) void markTopicRead(topicId)

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

  // 修复站点自身 #replyN 链接跳不动的问题
  if (config.topic.anchor) {
    const m = /^#reply(\d+)$/.exec(location.hash)
    if (m) requestAnimationFrame(() => scrollToFloor(document, Number(m[1])))
  }
}

void main().catch(() => {
  // 静默降级
})
```

- [ ] **Step 2: 写 src/styles/topic.scss**

```scss
/* 主题正文 */
.topic-detail .ui-header .title {
  color: var(--gzk-fg) !important;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.45;
}

.topic-detail .ui-header .meta,
.topic-detail .ui-header .meta a { color: var(--gzk-muted) !important; font-size: 12px; }

.topic-detail .ui-content {
  color: var(--gzk-fg) !important;
  font-size: 15px;
  line-height: 1.8;

  p { margin: 0 0 0.9em; }
  img { border-radius: 6px; max-width: 100%; }
}

.topic-detail .avatar { border-radius: 8px; }

.topic-detail .ui-footer,
.topic-detail .ui-footer a,
.topic-detail .ui-footer span { color: var(--gzk-muted) !important; font-size: 12px; }

.topic-tags .tag-badge {
  background: var(--gzk-surface-2) !important;
  color: var(--gzk-muted) !important;
}

/* 回复项 */
.reply-item {
  border-bottom: 1px solid var(--gzk-border-2) !important;
  transition: background-color 0.6s ease;

  .avatar { border-radius: 6px; }

  .meta,
  .meta a { color: var(--gzk-muted) !important; font-size: 12px; }
  .meta .reply-username .username { color: var(--gzk-fg-2) !important; font-weight: 500; }

  .content {
    color: var(--gzk-fg) !important;
    display: block;
    line-height: 1.75;

    p { margin: 0 0 0.7em; }
    p:last-child { margin-bottom: 0; }
    img { border-radius: 6px; max-width: 100%; }
  }
}

.gzk-floor-link { color: var(--gzk-muted) !important; }
.gzk-floor-link:hover { color: var(--gzk-accent) !important; }

/* 引用块 */
.gzk-quote {
  background: var(--gzk-surface-2);
  border-left: 3px solid var(--gzk-border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin: 0 0 6px;
  padding: 5px 10px;
}

.gzk-quote:hover { border-left-color: var(--gzk-accent); }
.gzk-quote-who { color: var(--gzk-accent); margin-right: 6px; }
.gzk-quote-text { color: var(--gzk-muted); }

/* 回应数徽章 */
.gzk-replies-badge {
  background: var(--gzk-surface-2);
  border-radius: 9px;
  color: var(--gzk-muted);
  cursor: pointer;
  font-size: 11px;
  margin-left: 6px;
  padding: 0 7px;
}

.gzk-replies-badge:hover { color: var(--gzk-accent); }

/* 热门回复区 */
.gzk-hot-box {
  background: var(--gzk-surface-2);
  border-bottom: 1px solid var(--gzk-border);
  padding: 8px 12px;
}

.gzk-hot-title {
  color: var(--gzk-accent);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}

.gzk-hot-item {
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  padding: 3px 6px;
}

.gzk-hot-item:hover { background: var(--gzk-surface); }
.gzk-hot-meta { color: var(--gzk-accent); margin-right: 8px; white-space: nowrap; }
.gzk-hot-text { color: var(--gzk-fg-2); }

/* 折叠 */
.reply-item.gzk-collapsed .content {
  -webkit-mask-image: linear-gradient(180deg, #000 60%, transparent);
  mask-image: linear-gradient(180deg, #000 60%, transparent);
  max-height: var(--gzk-collapse-height, 240px);
  overflow: hidden;
}

.gzk-collapse-toggle {
  background: none;
  border: 0;
  color: var(--gzk-accent);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 0;
}

/* 跳转高亮 */
.gzk-highlight { background: color-mix(in srgb, var(--gzk-accent) 18%, transparent) !important; }

/* 合并提示 */
.gzk-merge-tip { color: var(--gzk-muted); font-size: 12px; margin-left: 10px; }
```

- [ ] **Step 3: 全量校验**

Run: `pnpm test && pnpm typecheck && pnpm build:all`
Expected: 全部测试 PASS，类型检查通过，构建产物齐全。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: 话题页入口装配与阅读增强样式"
```

---

### Task 15: popup 面板

**Files:**
- Modify: `src/pages/popup.ts`, `extension/pages/popup.html`, `src/styles/popup.scss`
- Test: 无（UI 交互不做单测）

**Interfaces:**
- Consumes: `getConfig`、`saveConfig`、`DEFAULT_CONFIG`、`Config`
- Produces: popup 界面

- [ ] **Step 1: 写 extension/pages/popup.html**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>过早客 Polish</title>
  <link rel="stylesheet" href="../css/theme-var.css" />
  <link rel="stylesheet" href="../css/popup.css" />
</head>
<body>
  <header class="head">
    <span class="brand">过早客 Polish</span>
  </header>

  <section class="group">
    <div class="group-title">主题</div>
    <div class="seg" id="theme">
      <button type="button" data-theme="auto">跟随系统</button>
      <button type="button" data-theme="light">浅色</button>
      <button type="button" data-theme="dark">深色</button>
    </div>
  </section>

  <section class="group">
    <div class="group-title">列表页</div>
    <label class="row"><input type="checkbox" data-path="home.readMarker" /><span>已读主题淡化</span></label>
    <label class="row"><input type="checkbox" data-path="home.heatBadge" /><span>回复数热度着色</span></label>
  </section>

  <section class="group">
    <div class="group-title">话题页</div>
    <label class="row"><input type="checkbox" data-path="topic.quote" /><span>显示引用关系</span></label>
    <label class="row"><input type="checkbox" data-path="topic.hotReplies" /><span>热门回复区</span></label>
    <label class="row"><input type="checkbox" data-path="topic.collapse" /><span>长回复折叠</span></label>
    <label class="row"><input type="checkbox" data-path="topic.anchor" /><span>楼层锚点与跳转</span></label>
    <label class="row"><input type="checkbox" data-path="topic.mergePages" /><span>合并分页回复</span></label>
  </section>

  <footer class="foot">
    <button type="button" id="open-options">更多设置</button>
  </footer>

  <script src="../scripts/popup.min.js"></script>
</body>
</html>
```

- [ ] **Step 2: 写 src/pages/popup.ts**

```ts
import { applyTheme } from '../contents/theme'
import { getConfig, saveConfig } from '../storage'
import type { Config } from '../types'

type BooleanPath = 'home.readMarker' | 'home.heatBadge' | `topic.${'quote' | 'hotReplies' | 'collapse' | 'anchor' | 'mergePages'}`

function readPath(config: Config, path: string): boolean {
  const [group, key] = path.split('.') as ['home' | 'topic', string]
  return Boolean((config[group] as Record<string, unknown>)[key])
}

function writePath(config: Config, path: string, value: boolean): void {
  const [group, key] = path.split('.') as ['home' | 'topic', string]
  ;(config[group] as Record<string, unknown>)[key] = value
}

async function main(): Promise<void> {
  const config = await getConfig()

  // 让 popup 自身也跟随主题
  applyTheme(document.documentElement, config.theme, window.matchMedia('(prefers-color-scheme: dark)').matches)

  const themeBox = document.getElementById('theme')
  const syncThemeButtons = (): void => {
    for (const btn of themeBox?.querySelectorAll<HTMLButtonElement>('button') ?? []) {
      btn.classList.toggle('active', btn.dataset['theme'] === config.theme)
    }
  }
  syncThemeButtons()

  themeBox?.addEventListener('click', (ev) => {
    const btn = (ev.target as Element).closest<HTMLButtonElement>('button[data-theme]')
    const theme = btn?.dataset['theme']
    if (theme !== 'auto' && theme !== 'light' && theme !== 'dark') return
    config.theme = theme
    syncThemeButtons()
    applyTheme(document.documentElement, theme, window.matchMedia('(prefers-color-scheme: dark)').matches)
    void saveConfig(config)
  })

  for (const input of document.querySelectorAll<HTMLInputElement>('input[data-path]')) {
    const path = input.dataset['path'] as BooleanPath
    input.checked = readPath(config, path)
    input.addEventListener('change', () => {
      writePath(config, path, input.checked)
      void saveConfig(config)
    })
  }

  document.getElementById('open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })
}

void main()
```

- [ ] **Step 3: 写 src/styles/popup.scss**

```scss
body {
  background: var(--gzk-bg);
  color: var(--gzk-fg);
  font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  margin: 0;
  width: 260px;
}

.head {
  border-bottom: 1px solid var(--gzk-border);
  padding: 10px 14px;
}

.brand { color: var(--gzk-accent); font-weight: 600; }

.group { border-bottom: 1px solid var(--gzk-border-2); padding: 10px 14px; }
.group-title { color: var(--gzk-muted); font-size: 11px; margin-bottom: 6px; }

.seg { display: flex; gap: 4px; }

.seg button {
  background: var(--gzk-surface);
  border: 1px solid var(--gzk-border);
  border-radius: 6px;
  color: var(--gzk-fg-2);
  cursor: pointer;
  flex: 1;
  font-size: 12px;
  padding: 5px 0;
}

.seg button.active {
  background: var(--gzk-accent);
  border-color: var(--gzk-accent);
  color: var(--gzk-accent-fg);
}

.row {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 8px;
  padding: 4px 0;
}

.foot { padding: 10px 14px; }

.foot button {
  background: var(--gzk-surface);
  border: 1px solid var(--gzk-border);
  border-radius: 6px;
  color: var(--gzk-fg-2);
  cursor: pointer;
  padding: 6px 0;
  width: 100%;
}
```

- [ ] **Step 4: 构建校验**

Run: `pnpm build:all && pnpm typecheck`
Expected: 无报错，`extension/scripts/popup.min.js` 与 `extension/css/popup.css` 存在。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: popup 快捷设置面板"
```

---

### Task 16: options 设置页

**Files:**
- Modify: `src/pages/options.ts`, `extension/pages/options.html`, `src/styles/options.scss`
- Test: `tests/options-rules.test.ts`

**Interfaces:**
- Consumes: `getConfig`、`saveConfig`、`clearReadTopics`、`mergeConfig`、`BlockRule`
- Produces: `createRule(type: BlockRuleType, value: string): BlockRule | null`、`parseImported(json: string): Config | null`

- [ ] **Step 1: 写失败测试 tests/options-rules.test.ts**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/constants'
import { createRule, parseImported } from '../src/pages/options'

describe('createRule', () => {
  it('生成带唯一 id 的启用规则', () => {
    const a = createRule('keyword', ' 招聘 ')!
    expect(a.type).toBe('keyword')
    expect(a.value).toBe('招聘')
    expect(a.enabled).toBe(true)
    expect(a.id).not.toBe(createRule('keyword', '招聘')!.id)
  })

  it('空值返回 null', () => {
    expect(createRule('user', '   ')).toBeNull()
  })
})

describe('parseImported', () => {
  it('合法 JSON 合并成完整配置', () => {
    const c = parseImported(JSON.stringify({ theme: 'dark' }))!
    expect(c.theme).toBe('dark')
    expect(c.topic.hotThreshold).toBe(DEFAULT_CONFIG.topic.hotThreshold)
  })

  it('非法 JSON 返回 null', () => {
    expect(parseImported('{ not json')).toBeNull()
  })

  it('非对象 JSON 返回默认配置', () => {
    expect(parseImported('123')).toEqual(DEFAULT_CONFIG)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/options-rules.test.ts`
Expected: FAIL，`createRule`、`parseImported` 未导出。

- [ ] **Step 3: 写 extension/pages/options.html**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>过早客 Polish 设置</title>
  <link rel="stylesheet" href="../css/theme-var.css" />
  <link rel="stylesheet" href="../css/options.css" />
</head>
<body>
  <main class="page">
    <h1>过早客 Polish 设置</h1>

    <section class="card">
      <h2>话题页</h2>
      <label class="row"><span>热门回复赞数阈值</span><input type="number" min="1" id="hot-threshold" /></label>
      <label class="row"><span>长回复折叠高度（px）</span><input type="number" min="80" id="collapse-height" /></label>
    </section>

    <section class="card">
      <h2>屏蔽规则</h2>
      <div class="rule-form">
        <select id="rule-type">
          <option value="keyword">标题关键词</option>
          <option value="node">节点 slug</option>
          <option value="user">用户名</option>
        </select>
        <input type="text" id="rule-value" placeholder="输入要屏蔽的内容" />
        <button type="button" id="rule-add">添加</button>
      </div>
      <ul class="rule-list" id="rule-list"></ul>
    </section>

    <section class="card">
      <h2>数据</h2>
      <div class="actions">
        <button type="button" id="clear-read">清空已读记录</button>
        <button type="button" id="export">导出配置</button>
        <button type="button" id="import">导入配置</button>
      </div>
      <textarea id="io" rows="6" placeholder="导出的配置会显示在这里；粘贴配置后点击导入"></textarea>
    </section>

    <p class="status" id="status"></p>
  </main>
  <script src="../scripts/options.min.js"></script>
</body>
</html>
```

- [ ] **Step 4: 写 src/pages/options.ts**

```ts
import { DEFAULT_CONFIG } from '../constants'
import { applyTheme } from '../contents/theme'
import { clearReadTopics, getConfig, mergeConfig, saveConfig } from '../storage'
import type { BlockRule, BlockRuleType, Config } from '../types'

export function createRule(type: BlockRuleType, value: string): BlockRule | null {
  const v = value.trim()
  if (v === '') return null
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, value: v, enabled: true }
}

export function parseImported(json: string): Config | null {
  try {
    return mergeConfig(JSON.parse(json))
  } catch {
    return null
  }
}

const TYPE_LABEL: Record<BlockRuleType, string> = { keyword: '关键词', node: '节点', user: '用户' }

async function main(): Promise<void> {
  if (typeof document === 'undefined' || !document.getElementById('rule-list')) return

  let config = await getConfig()
  applyTheme(document.documentElement, config.theme, window.matchMedia('(prefers-color-scheme: dark)').matches)

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
    config.topic.collapseHeight = Number(collapseHeight.value) || DEFAULT_CONFIG.topic.collapseHeight
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
    void clearReadTopics().then(() => say('已清空已读记录'))
  })
}

void main()
```

- [ ] **Step 5: 写 src/styles/options.scss**

```scss
body {
  background: var(--gzk-bg);
  color: var(--gzk-fg);
  font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  margin: 0;
}

.page { margin: 0 auto; max-width: 680px; padding: 32px 20px 60px; }

h1 { font-size: 20px; margin: 0 0 20px; }
h2 { font-size: 14px; margin: 0 0 12px; }

.card {
  background: var(--gzk-surface);
  border: 1px solid var(--gzk-border);
  border-radius: var(--gzk-radius);
  margin-bottom: 16px;
  padding: 16px;
}

.row { align-items: center; display: flex; gap: 12px; justify-content: space-between; padding: 6px 0; }

input[type='number'],
input[type='text'],
select,
textarea {
  background: var(--gzk-surface);
  border: 1px solid var(--gzk-border);
  border-radius: 6px;
  color: var(--gzk-fg);
  font-family: inherit;
  padding: 5px 8px;
}

.rule-form { display: flex; gap: 8px; margin-bottom: 12px; }
.rule-form input[type='text'] { flex: 1; }

.rule-list { list-style: none; margin: 0; padding: 0; }

.rule-list li {
  align-items: center;
  border-top: 1px solid var(--gzk-border-2);
  display: flex;
  gap: 10px;
  padding: 7px 0;
}

.rule-list li span { flex: 1; }

button {
  background: var(--gzk-surface);
  border: 1px solid var(--gzk-border);
  border-radius: 6px;
  color: var(--gzk-fg-2);
  cursor: pointer;
  padding: 5px 12px;
}

button:hover { border-color: var(--gzk-accent); color: var(--gzk-accent); }

.actions { display: flex; gap: 8px; margin-bottom: 10px; }

textarea { width: 100%; }

.status { color: var(--gzk-accent); font-size: 12px; height: 18px; }
```

- [ ] **Step 6: 运行测试确认通过**

Run: `pnpm vitest run tests/options-rules.test.ts && pnpm typecheck`
Expected: PASS。`main()` 在无 DOM 目标时提前返回，因此导入模块不会有副作用。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: options 设置页与配置导入导出"
```

---

### Task 17: background、README 与完整打包验证

**Files:**
- Modify: `src/background/main.ts`
- Create: `README.md`
- Test: 全量回归

**Interfaces:**
- Consumes: `getConfig`、`saveConfig`
- Produces: 首次安装时写入默认配置；完整可安装的扩展包

- [ ] **Step 1: 写 src/background/main.ts**

```ts
import { getConfig, saveConfig } from '../storage'

chrome.runtime.onInstalled.addListener((details) => {
  // 首次安装写入默认配置；升级时用 mergeConfig 补齐新增字段。
  void getConfig()
    .then((config) => saveConfig(config))
    .then(() => {
      if (details.reason === 'install') void chrome.runtime.openOptionsPage()
    })
    .catch(() => {
      // 忽略：配置会在首次读取时按默认值兜底
    })
})
```

- [ ] **Step 2: 写 README.md**

```markdown
# 过早客 Polish

为 [过早客](https://www.guozaoke.com/) 打造的浏览器扩展，提供更现代的浏览体验。参考 [V2EX_Polish](https://github.com/coolpace/V2EX_Polish) 的产品思路重新实现。

## 功能

### 界面美化与深色模式
- 重排版式、卡片化容器、弱化次要信息
- 浅色 / 深色 / 跟随系统三态主题

### 列表增强
- 已读主题淡化
- 按关键词 / 节点 / 用户屏蔽主题，折叠为一行可展开的占位
- 回复数按热度着色

### 话题页阅读增强
- 解析 `@用户名` 引用关系，在回复上方插入可点击的引用块
- 被引用的回复显示「N 条回应」徽章
- 热门回复区：按赞数与被引用次数筛选并置顶展示
- 长回复折叠，一键展开
- 注入楼层锚点，修复站点原有 `#replyN` 链接跳不动的问题
- 自动合并分页回复，使引用关系与热门回复覆盖全部楼层

## 安装

### 开发模式
```bash
pnpm install
pnpm build:all
```
Chrome 打开 `chrome://extensions`，开启开发者模式，「加载已解压的扩展程序」选择 `extension/` 目录。

### 打包
```bash
pnpm build
```
产物在 `build-chrome/` 与 `build-firefox/`。

## 开发

```bash
pnpm dev          # 构建 + 监听 + 拉起带扩展的 Chrome
pnpm test         # 单元测试
pnpm typecheck    # 类型检查
```

`samples/` 下是真实页面快照，单元测试直接基于这些快照运行，不依赖网络。

## 隐私

扩展只在 guozaoke.com 域下运行，只申请 `storage` 权限。配置存在浏览器本地（`chrome.storage`），不上传任何数据。唯一的网络请求是话题分页合并时拉取同站的其余分页，可在设置中关闭。

## 许可

MIT
```

- [ ] **Step 3: 全量回归**

Run:
```bash
pnpm test
pnpm typecheck
pnpm build:all
```
Expected: 全部测试 PASS；类型检查无错误；`extension/` 下 manifest、图标、scripts、css、pages 齐全。

- [ ] **Step 4: 校验 manifest 与产物完整性**

Run:
```bash
node -e "const m=require('./extension/manifest.json');console.log(m.name,m.version,m.permissions,m.content_scripts.length)"
ls extension/scripts extension/css extension/images extension/pages
```
Expected: 名称 `过早客 Polish`，权限仅 `['storage']`，content_scripts 4 条；scripts 含 common/gzk-home/gzk-topic/background/popup/options 六个 min.js；css 含 theme-var/base/home/topic/popup/options 六个 css；images 含四个尺寸图标。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: background 初始化与项目 README"
```

---

## Self-Review

**Spec coverage**

| Spec 章节 | 对应 Task |
| --- | --- |
| 3.1 目录结构 | Task 1、2 |
| 3.2 Manifest 与注入 | Task 1 |
| 3.3 配置与存储 | Task 2 |
| 4.1 界面美化与深色模式 | Task 3、4 |
| 4.2 列表增强（已读 / 屏蔽 / 热度） | Task 5、6 |
| 4.3 解析层 | Task 7 |
| 4.3 引用关系解析与渲染 | Task 8、11 |
| 4.3 热门回复区 | Task 12 |
| 4.3 长回复折叠 | Task 13 |
| 4.3 楼层锚点 | Task 10 |
| 4.3 分页合并 | Task 9、14 |
| 4.4 popup | Task 15 |
| 4.4 options | Task 16 |
| 5 测试策略 | 各 Task 的 TDD 步骤 |
| 7 交付形态 | Task 1（脚本）、Task 17（验证与 README） |

无遗漏。

**类型一致性检查**

- `ParsedReply.quotedFloor` 由 `resolveQuotes` 写入，`renderQuotes`、`pickHotReplies`、`buildQuoteChildren` 读取，字段名一致
- `CLASS` 常量在 Task 2 定义，Task 5/6/10/11/12/13/14 引用，键名一致
- `SELECTOR.REPLY_FLOOR` 用 `:not(.reply-to)` 排除点赞容器，Task 7/10/11 复用同一常量
- `quoteSummary` 在 Task 11 定义，Task 12 引用，签名一致
- `scrollToFloor(doc, floor)` 在 Task 10 定义，Task 11/12/14 引用，签名一致
- `mergeConfig` 在 Task 2 定义并导出，Task 16 `parseImported` 复用
- `applyTheme` 在 Task 3 定义，Task 15/16 复用

**已知取舍**

- `tests/home-parse.test.ts` 中的 `import { applyReadMarks as _unused }` 是冗余导入，实现时删掉
- happy-dom 无布局能力，折叠功能的高度测量通过注入 `measure` 解耦，真实高度行为靠手工验证
