/*
 * 发版：pnpm release <patch|minor|major|1.2.3> [--dry-run]
 *
 * 把版本号、CHANGELOG、构建产物、tag 和 GitHub Release 串成一条路，避免
 * 人工发版时漏掉其中一步（比如打了 tag 却忘了传新 zip）。变更说明仍然由
 * 人写在 CHANGELOG 的 [Unreleased] 段里，脚本只负责定版和搬运。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { bumpVersion, extractNotes, promoteUnreleased, upsertCompareLink } from './release-utils'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md')
const PACKAGE = path.join(ROOT, 'package.json')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const spec = args.find((a) => !a.startsWith('-'))

if (!spec) {
  console.error('用法：pnpm release <patch|minor|major|1.2.3> [--dry-run]')
  process.exit(1)
}

const run = (cmd: string, argv: string[]): string =>
  execFileSync(cmd, argv, { cwd: ROOT, encoding: 'utf8' }).trim()

const step = (cmd: string, argv: string[]): void => {
  console.log(`\n$ ${cmd} ${argv.join(' ')}`)
  if (!dryRun) execFileSync(cmd, argv, { cwd: ROOT, stdio: 'inherit' })
}

const die = (msg: string): never => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// ── 前置检查：脏工作区或落后的分支会让 tag 指向意料之外的提交 ──
if (run('git', ['status', '--porcelain'])) die('工作区不干净，请先提交或暂存改动')

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
if (branch !== 'main') die(`发版要在 main 上进行，当前在 ${branch}`)

run('git', ['fetch', 'origin', 'main', '--tags', '--quiet'])
if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/main'])) {
  die('本地 main 与 origin/main 不一致，请先 pull --rebase 或 push')
}

const pkg = JSON.parse(fs.readFileSync(PACKAGE, 'utf8')) as { version: string }
const version = bumpVersion(pkg.version, spec)
const tag = `v${version}`

if (run('git', ['tag', '-l', tag])) die(`tag ${tag} 已存在`)

// ── 定版 CHANGELOG，顺带补 compare 链接 ──
const repo = run('git', ['remote', 'get-url', 'origin'])
  .replace(/^git@github\.com:/, 'https://github.com/')
  .replace(/\.git$/, '')
const today = new Date().toISOString().slice(0, 10)

let changelog = fs.readFileSync(CHANGELOG, 'utf8')
changelog = promoteUnreleased(changelog, version, today)
changelog = upsertCompareLink(changelog, version, repo)
const notes = extractNotes(changelog, version)

console.log(`\n${pkg.version} → ${version}${dryRun ? '（dry run，不落盘）' : ''}`)
console.log(`\n── ${tag} release notes ──\n${notes}\n──────────────────────────`)

if (!dryRun) {
  fs.writeFileSync(CHANGELOG, changelog)
  fs.writeFileSync(PACKAGE, fs.readFileSync(PACKAGE, 'utf8').replace(
    /"version":\s*"[^"]+"/,
    `"version": "${version}"`,
  ))
}

// ── 构建并校验产物版本，manifest 与 package.json 脱节就别发出去 ──
step('pnpm', ['typecheck'])
step('pnpm', ['test'])
step('pnpm', ['build'])

const zips = [
  path.join('build-chrome', `guozaoke-polish-chrome-${version}.zip`),
  path.join('build-firefox', `guozaoke-polish-firefox-${version}.zip`),
]

if (!dryRun) {
  for (const name of ['manifest.json', 'manifest-firefox.json']) {
    const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension', name), 'utf8')) as {
      version: string
    }
    if (m.version !== version) die(`${name} 的版本是 ${m.version}，与 ${version} 不符`)
  }
  for (const zip of zips) {
    if (!fs.existsSync(path.join(ROOT, zip))) die(`构建产物缺失：${zip}`)
  }
}

// ── 提交、打 tag、发布 ──
step('git', ['add', 'package.json', 'CHANGELOG.md'])
step('git', ['commit', '-m', `chore: 发布 ${tag}`])
step('git', ['tag', '-a', tag, '-m', tag])
step('git', ['push', 'origin', 'main'])
step('git', ['push', 'origin', tag])
step('gh', ['release', 'create', tag, ...zips, '--title', tag, '--notes', notes])

console.log(dryRun ? '\n✓ dry run 结束，未改动任何内容' : `\n✓ ${tag} 已发布`)
