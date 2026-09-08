/**
 * 本地样式预览：把 samples/ 下的真实页面快照 + 过早客自身 CSS + 本扩展的
 * CSS/JS 组装成一个可直接用浏览器打开的 file:// 页面，用于迭代视觉效果。
 *
 * 站点自身的 CSS 从项目根目录的 .mhtml 快照里提取（未提交，用户本地留存）。
 * 用法：pnpm preview [样本名]，产物在 .preview/
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '.preview'
const SAMPLE = process.argv[2] ?? 'topic'
const THEME = process.argv[3] ?? 'auto'

function extractSiteAssets(): void {
  const mhtml = fs.readdirSync('.').find((f) => f.endsWith('.mhtml'))
  if (!mhtml) {
    console.warn('未找到 .mhtml 快照，站点原生 CSS 不可用，预览仅含扩展样式')
    return
  }

  const py = `
import email, pathlib, re, sys
msg = email.message_from_bytes(pathlib.Path(sys.argv[1]).read_bytes())
out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
for part in msg.walk():
    loc = part.get('Content-Location', '')
    if part.get_content_type() == 'text/css' and loc.startswith('http'):
        name = re.sub(r'[^A-Za-z0-9._-]', '_', loc.split('/')[-1])
        (out / name).write_bytes(part.get_payload(decode=True))
        print(name)
`
  const names = execFileSync('python3', ['-c', py, mhtml, path.join(OUT, 'site-css')], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
  fs.writeFileSync(path.join(OUT, 'site-css', 'index.json'), JSON.stringify(names), 'utf8')
}

function build(): void {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  extractSiteAssets()

  const siteCss: string[] = JSON.parse(
    fs.readFileSync(path.join(OUT, 'site-css', 'index.json'), 'utf8')
  ) as string[]

  let html = fs.readFileSync(path.join('samples', `${SAMPLE}.html`), 'utf8')
  // 快照里的外链资源在本地都取不到，清掉后换成本地副本。
  html = html
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')

  // 真实环境里内容脚本 CSS 在 document_start 注入，排在站点样式表之前，
  // 同特异性时站点规则胜出。预览必须保持同样的顺序，否则会看不到真实效果。
  const links = [
    '../extension/css/theme-var.css',
    '../extension/css/base.css',
    '../extension/css/home.css',
    '../extension/css/topic.css',
    ...siteCss.map((n) => `site-css/${n}`),
  ]
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join('\n')

  // 扩展的内容脚本需要 chrome.storage，这里用内存桩顶上。
  const stub = `<script>
    const CONFIG = { theme: ${JSON.stringify(THEME)} }
    const area = () => ({
      get: () => Promise.resolve({ 'gzk_config': CONFIG }),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    })
    window.chrome = {
      storage: { sync: area(), local: area(), onChanged: { addListener: () => {} } },
      runtime: { openOptionsPage: () => {}, onInstalled: { addListener: () => {} } },
    }
    window.fetch = () => Promise.reject(new Error('preview: 不联网'))
  </script>`

  html = html.replace(
    /<\/head>/i,
    `${links}\n${stub}\n</head>`
  )
  // 样本名决定加载哪个页面脚本：home* 走列表页，其余走话题页。
  const pageScript = SAMPLE.startsWith('home') ? 'gzk-home.min.js' : 'gzk-topic.min.js'
  html = html.replace(
    /<\/body>/i,
    `<script src="../extension/scripts/common.min.js"></script>
<script src="../extension/scripts/${pageScript}"></script>
</body>`
  )

  fs.writeFileSync(path.join(OUT, `${SAMPLE}.html`), html, 'utf8')
  console.log(`预览页已生成：${path.resolve(OUT, `${SAMPLE}.html`)}`)
}

build()
