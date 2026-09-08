# GuoZaoKe Polish 设计文档

日期：2026-09-08
状态：待评审

## 1. 目标

为 https://www.guozaoke.com/ （过早客）开发一款浏览器扩展，参照 [V2EX_Polish](https://github.com/coolpace/V2EX_Polish) 的架构与产品思路，**只做浏览侧增强**：界面美化与深色模式、列表增强、话题页阅读增强。

明确不做（本期）：发帖/回复编辑器增强、图片上传、每日签到、分享图生成、稍后阅读、用户标签、油猴脚本分发、悬停预览正文。

## 2. 目标站点现状（已实测）

### 2.1 技术栈

服务端渲染的传统站点：Bootstrap 3.3.4 + jQuery 1.11.1 + Font Awesome 3.2.1 + 站点自有 `main1003v3.css`。无前端框架，无 CSS 变量，DOM 结构稳定且语义清晰。

### 2.2 页面与访问权限

| 路径 | 内容 | 匿名可访问 |
| --- | --- | --- |
| `/`、`/?tab=latest\|elite\|interest\|follows`、`/?p=N` | 主题列表 | 是 |
| `/t/{id}` | 话题详情 | 否，需登录 |
| `/node/{name}` | 节点主题列表 | 否，需登录 |
| `/u/{name}` | 用户主页 | 是 |
| `/nodes`、`/members` | 节点/成员索引 | 是 |

站点前置阿里云 WAF，首次请求返回 `acw_sc__v2` JS 挑战页。浏览器内正常访问不受影响；但**扩展主动发起的额外请求会增加风控暴露面**，因此本设计避免任何非必要的后台请求。

### 2.3 关键 DOM 结构

**列表页主题项**

```html
<div class="topic-item">
  <a href="/u/{user}"><img class="avatar"></a>
  <div class="main">
    <h3 class="title"><a href="/t/{id}#reply{n}">标题 <i class="icon-pushpin"></i></a></h3>
    <div class="meta">
      <span class="node"><a href="/node/{name}">节点名</a></span> •
      <span class="username"><a href="/u/{user}">用户名</a></span> •
      <span class="last-touched">25 秒前</span> •
      <span class="last-reply-username">最后回复来自 <a href="/u/{user}"><strong>用户名</strong></a></span>
    </div>
  </div>
  <div class="count"><a href="/t/{id}#reply{n}">40</a></div>
</div>
```

分页：`nav > ul.pagination`（桌面）与 `.pagination-wap`（移动），链接形如 `/?p=2`。

**话题详情页**

```html
<div class="topic-detail container-box">
  <div class="ui-header">
    <a href="/u/{author}"><img class="avatar"></a>
    <div class="main">
      <h3 class="title">标题</h3>
      <div class="meta mt10">
        <span class="node">…</span> • <span class="username">…</span> •
        <span class="created-time">发表于 5 小时前</span> •
        <span class="last-reply-username">…</span> • <span class="last-reply-time">…</span>
      </div>
    </div>
  </div>
  <div class="ui-content"><p>正文…</p></div>
  <div class="topic-tags"><a class="tag-badge">标签</a></div>
  <div class="ui-footer">
    <a class="J_topicFavorite">加入收藏</a> <a class="J_topicVote">❤赞</a>
    <span class="hits fr mr10">1995 次点击</span>
    <span class="up_vote fr mr10">1 人赞</span>
    <span class="favorited fr mr10">0 人收藏</span>
  </div>
</div>

<div class="topic-reply container-box mt10">
  <div class="ui-header"><span>共收到40条回复</span></div>
  <div class="ui-content">
    <div class="reply-item">
      <a href="/u/{user}"><img class="avatar"></a>
      <div class="main">
        <div class="meta">
          <a href="/u/{user}" class="reply-username"><span class="username">daleatt</span></a>
          <span class="time">4 小时前</span>
          <span class="time">美国</span>            <!-- 第二个 .time 是 IP 归属地 -->
          <span class="fr floor">#1</span>
          <span class="reply-to fr J_replyTo" data-username="daleatt"><img></span>
          <span class="fr reply-to floor">
            <a class="J_replyVote" data-count="17" href="/replyVote?reply_id=1560971">赞 17</a>
          </span>
        </div>
        <span class="content"><p>正文…</p></span>
      </div>
    </div>
    …
  </div>
  <div class="ui-footer"></div>
</div>
```

侧栏：`.usercard`（自己的资料卡）、`.sidebox.hot-topics`（今日热议 / 相关主题）、`.sidebox .ui-content.ad`（广告位）。

**已确认的重要事实**

1. 回复的赞数直接可读：`.reply-item a.J_replyVote[data-count]`，回复 ID 在 `href` 的 `reply_id=` 中。
2. 楼层号已存在：`.reply-item .meta .fr.floor` 文本为 `#N`。
3. **回复项没有任何 `id` 或 `name` 锚点**，站点自身的 `/t/{id}#reply40` 链接实际上无法定位。
4. **回复会分页**。分页元素位于 `.topic-reply .ui-footer > nav.tr.hidden-xs > ul.pagination`（移动端为 `.pagination-wap`），链接形如 `/t/{id}?p=2`。实测样本 `/t/132793` 共 144 条回复分 2 页（第 1 页 106 条、第 2 页 38 条）。回复数少时（实测 40 条）不出现分页元素。**楼层号跨页连续**（第 2 页从 `#107` 开始），`.ui-header` 的「共收到 N 条回复」是全量总数。
5. 引用关系：被引用者是回复正文中的首个 `<a href="/u/{user}">@{user}</a>`，且必须位于 `.content` 的第一个 `<p>` 开头。**引用可能跨页**——第 2 页的回复常引用第 1 页的楼层。
6. 内容富度：主题正文可含 `<pre><code>`（站点加载了 `highlight.css`）；回复正文以 `<p>` 为主，偶有 `<img>` 与 `<blockquote>`。实测最长单条回复纯文本 3670 字，中位 29–61 字。

## 3. 技术架构

沿用 V2EX_Polish 的构建方式：TypeScript + tsup（打包 content/background/pages 脚本）+ sass（编译样式）+ `scripts/build-manifest.ts` 生成 manifest。Manifest V3，同时产出 Chrome 与 Firefox 两份包。不引入前端框架，DOM 操作用原生 API（不沿用参考项目的 jQuery 依赖）。

### 3.1 目录结构

```
src/
  constants.ts          域名列表、存储 key、默认配置、选择器常量
  types.ts              配置类型、解析产物类型
  utils.ts              通用工具
  storage.ts            chrome.storage 封装（sync 存配置，local 存已读记录）
  contents/
    common.ts           全站：主题注入、导航栏增强、设置入口
    home/
      index.ts          列表页入口
      read-marker.ts    已读淡化
      block.ts          屏蔽规则
      badge.ts          回复数热度着色
    topic/
      index.ts          话题页入口
      parse.ts          纯函数：从 DOM 解析回复模型
      quote.ts          引用关系渲染
      hot-replies.ts    热门回复区
      collapse.ts       长回复折叠
      anchor.ts         楼层锚点与跳转
      merge-pages.ts    分页回复合并
  styles/
    theme-var.scss      设计 token（浅色 / 深色两套）
    base.scss           全站排版与容器
    home.scss
    topic.scss
    popup.scss  options.scss
  pages/
    popup.ts  options.ts
  background/
    main.ts             安装引导、配置默认值迁移
scripts/
  build-manifest.ts
extension/              静态资源与构建产物（images/、pages/*.html）
samples/                真实页面 HTML 快照，供开发与单元测试使用
tests/                  单元测试
docs/superpowers/specs/ 设计文档
```

### 3.2 Manifest 与注入

- `host_permissions` / `matches`：`https://www.guozaoke.com/*`、`https://guozaoke.com/*`
- `permissions`：`storage`（不需要 `alarms`、`contextMenus`、`sidePanel`、`scripting`）
- CSS 在 `run_at: document_start` 注入，避免主题闪烁
- 内容脚本按页面分片：
  - 全站：`common.min.js`
  - 列表页：`matches` 全站，`exclude_matches` 排除 `/t/*`
  - 话题页：`matches` 为 `/t/*`

### 3.3 配置与存储

配置项存 `chrome.storage.sync`，结构：

```ts
interface Config {
  theme: 'auto' | 'light' | 'dark'
  home: { readMarker: boolean; blockRules: BlockRule[]; heatBadge: boolean }
  topic: { quote: boolean; hotReplies: boolean; hotThreshold: number; collapse: boolean; collapseHeight: number; anchor: boolean; mergePages: boolean }
}
```

已读记录存 `chrome.storage.local`（数据量大且不必跨设备）：`Record<topicId, timestamp>`，保留最近 2000 条，超出按时间淘汰。

## 4. 功能设计

### 4.1 界面美化与深色模式

**Token 层**：站点无 CSS 变量，因此在 `:root` 定义一套自有 token，深色值挂在 `html[data-gzk-theme='dark']` 下。

```scss
:root {
  --gzk-bg: #f5f5f5;  --gzk-surface: #fff;  --gzk-fg: #1a1a1a;
  --gzk-muted: #8a8a8a;  --gzk-border: #e8e8e8;  --gzk-accent: #d97706;
}
html[data-gzk-theme='dark'] { /* 对应深色值 */ }
```

**主题切换**：`theme` 为 `auto` 时读 `matchMedia('(prefers-color-scheme: dark)')` 并监听变化；`light` / `dark` 时强制。属性写在 `document.documentElement` 的 `data-gzk-theme` 上，由 `document_start` 阶段的内容脚本尽早设置。

**样式改造范围**（覆盖而非重建 DOM）：

1. 全局：内容区宽度、正文行高 1.7、中文字体栈（`system-ui / PingFang SC / Microsoft YaHei`）、去除 Bootstrap 3 的圆角与阴影残留
2. 导航栏：扁平化，去掉渐变
3. `.container-box`：卡片化，统一圆角与边框色
4. `.topic-item`：hover 高亮、头像圆角、`.meta` 字号与颜色弱化、`.count` 徽章化
5. `.reply-item`：分隔线弱化、`.content` 段落间距、头像圆角
6. 深色模式需覆盖 Bootstrap 与 Font Awesome 带来的硬编码颜色（`.btn`、`.alert`、`.form-control`、`.pagination`、`.dropdown-menu`、表格）

**已知风险**：站点 CSS 由 CDN 提供且被 WAF 挡住无法离线获取，覆盖规则的特异性需要在真实页面上调试。深色模式对第三方广告位（`.ui-content.ad` 中的外链图片）不做处理。

### 4.2 列表增强

作用页面：`/`、`/?tab=*`、`/?p=N`、`/node/*`、`/u/*`（凡含 `.topic-item` 的页面）。

**已读淡化**
- 点击 `.topic-item .title a` 时把 `/t/{id}` 的 id 写入 local
- 渲染时给已读项加 `.gzk-read`，标题降透明度
- 提供「清空已读记录」入口（options）

**屏蔽规则**
- 规则类型：`keyword`（标题包含）、`node`（节点 slug）、`user`（用户名）
- 命中项折叠为一行灰色占位「已屏蔽：{原因}」，点击可临时展开
- 规则在 options 页管理

**回复数热度着色**
- 按 `.count` 数值分档着色（如 ≥50 强调色、≥20 次强调、其余默认）
- 阈值写死在常量中，本期不做可配

### 4.3 话题页阅读增强

**解析层（纯函数，可测）**

```ts
interface Reply {
  el: HTMLElement
  floor: number          // 来自 .fr.floor 的 "#N"
  username: string       // .reply-username .username
  replyId: string        // J_replyVote href 的 reply_id
  votes: number          // J_replyVote 的 data-count
  time: string           // 第一个 .time
  location: string       // 第二个 .time（可能不存在）
  mentionedUser: string | null  // .content 首个 <a href="/u/x"> 的用户名
  quotedFloor: number | null    // 解析出的被引用楼层
}
```

`parseReplies(container: HTMLElement): Reply[]` 与 `resolveQuotes(replies: Reply[]): Reply[]` 均为纯函数，用 `samples/topic.html` 做单元测试。

**引用关系解析规则**：若回复 N 的 `mentionedUser` 为 U，则被引用楼层取「楼层号小于 N 且作者为 U 的最大楼层」。若 U 是主题作者且没有更早的回复楼层，则指向楼主。找不到则不建立关系。

**引用渲染**：在回复正文上方插入可折叠的引用块，显示被引楼层号、作者与内容摘要（首 60 字）；点击滚动到该楼层并高亮 1.5 秒。同时给回复项加「有 N 条回应」的徽章，点击展开子楼层列表。

采用「插入引用块 + 跳转」而非物理嵌套 DOM，理由：过早客回复按时间线性排列且楼层号有意义，物理嵌套会破坏时间顺序与楼层连续性。

**热门回复区**
- 在 `.topic-reply .ui-header` 下方插入「热门回复」折叠区
- 入选条件：`votes >= hotThreshold`（默认 5）或被引用次数 >= 3
- 按 votes 降序，最多 5 条，展示楼层号、作者、内容摘要，点击跳转原楼层
- 无回复满足条件时不渲染该区块

**长回复折叠**
- `.content` 渲染高度超过 `collapseHeight`（默认 240px）时折叠，底部加渐隐遮罩与「展开全文」按钮
- 用 `ResizeObserver` 处理图片加载后的高度变化

**楼层锚点**
- 给每个 `.reply-item` 注入 `id="reply{N}"`，修复站点原有 `#reply{N}` 链接失效的问题
- 页面加载时若 URL 带 `#reply{N}` 则滚动定位并高亮
- `.fr.floor` 的 `#N` 变成可点击链接，点击复制该楼层直链

**分页合并**（配置项 `topic.mergePages`，默认开启）

回复分页会切断引用关系与热门回复的完整性，因此需要合并：

- 从 `.topic-reply .ui-footer ul.pagination` 读出总页数与各页 URL
- 当前页之外的页并发拉取（并发上限 2），解析出 `.reply-item` 后按楼层号顺序插入 `.topic-reply .ui-content`
- 合并期间在回复区顶部显示「正在加载第 N/M 页…」，完成后替换为「已合并 M 页共 N 条回复」并隐藏原分页控件
- 任一页失败则中止合并、保留已合并部分、提示失败并恢复分页控件；解析与渲染在失败时降级而非抛错
- 回复数未分页时（无 `ul.pagination`）不发起任何额外请求
- 额外请求量：实测 144 条回复仅需 1 个额外请求，对 WAF 的暴露面可忽略。用户可在设置中关闭
- 关闭合并时，引用解析找不到跨页的被引楼层，此时降级为仅展示 `@用户名`（不生成引用块与跳转）

### 4.4 popup 与 options

**popup**（点击扩展图标）
- 主题三态切换
- 各功能开关的快速切换
- 「打开设置」入口

**options**（独立标签页）
- 全部配置项
- 屏蔽规则的增删改
- 已读记录清空
- 配置导入 / 导出（JSON）

## 5. 测试策略

**单元测试**（Vitest + happy-dom）
- 覆盖 `topic/parse.ts`、`topic/quote.ts`、`home/block.ts` 的纯函数
- 输入取自 `samples/topic.html`、`samples/topic-paged-p1.html`、`samples/topic-paged-p2.html`、`samples/home.html` 真实快照
- 分页合并的解析部分（从 HTML 文本提取 `.reply-item` 与分页链接）做纯函数化后单测，网络层用样本文件桩替代
- 遵循 TDD：先写失败测试，再写实现

**手工验证**
- 样式与交互由开发者在真实登录态下逐项验证
- 深色模式需检查：列表页、话题页、节点页、用户页、设置页、登录/注册页

**不测**：manifest 生成、构建脚本、popup/options 的 UI 交互（成本高于收益）。

## 6. 风险与缓解

1. **站点改版导致选择器失效** —— 选择器集中在 `constants.ts`，解析逻辑与 DOM 查询分离；关键流程做防御性判空，解析失败时静默降级为不增强而非报错。
2. **WAF 风控** —— 唯一会发起后台请求的功能是分页回复合并，且仅在话题确实分页时触发（实测 144 条回复需 1 个额外请求），并发上限 2、可在设置中关闭。风险可控。
3. **深色模式覆盖不全** —— Bootstrap 3 硬编码颜色多，首版可能有遗漏。策略是先覆盖高频页面，遗漏项按用户反馈迭代。
4. **样本覆盖** —— 现有三份话题页快照：`topic.html`（40 条、未分页、纯文本）、`topic-paged-p1.html` / `topic-paged-p2.html`（144 条分 2 页，主题正文含代码块，回复含图片与引用块、最长 3670 字）。已覆盖分页、代码块、图片、超长回复四类情形。尚未覆盖：含视频/附件的主题、被删除或折叠的回复。解析逻辑对缺失字段一律判空降级。

## 7. 交付形态

- `pnpm build` 产出 `build-chrome/` 与 `build-firefox/` 及对应 zip
- 开发用 `pnpm dev`（web-ext 拉起带扩展的 Chrome，起始页 guozaoke.com）
- README 说明安装方式与功能列表
