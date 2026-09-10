import fs from 'node:fs'
import path from 'node:path'

// 版本号以 package.json 为准，免得两处各写一份、发版时漏改其中一个
const pkg = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }

const HOSTS = ['guozaoke.com', 'www.guozaoke.com']
const matches = HOSTS.map((h) => `https://${h}/*`)
const topicMatches = HOSTS.map((h) => `https://${h}/t/*`)

const manifest: chrome.runtime.ManifestV3 = {
  manifest_version: 3,
  name: '过早客 Polish',
  version: pkg.version,
  description:
    '为过早客（guozaoke.com）带来现代化的浏览体验：界面美化、深色模式、列表增强与话题页阅读增强。',
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
firefox['browser_specific_settings'] = { gecko: { id: 'guozaoke-polish@local' } }
firefox['background'] = { scripts: ['scripts/background.min.js'] }
fs.writeFileSync(
  path.join('extension', 'manifest-firefox.json'),
  JSON.stringify(firefox, null, 2),
  'utf8'
)

console.log('manifest generated')
