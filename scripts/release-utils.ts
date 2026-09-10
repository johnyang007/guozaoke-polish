/*
 * 发版流程里可以脱离文件系统单独验证的那部分：版本号推进、CHANGELOG 的
 * 定版与摘录。scripts/release.ts 只负责把它们和 git / gh / 构建串起来。
 */

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

type Level = 'major' | 'minor' | 'patch'

function parse(version: string): [number, number, number] {
  const m = SEMVER.exec(version)
  if (!m) throw new Error(`版本号格式不对：${version}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

function isHigher(next: string, current: string): boolean {
  const a = parse(next)
  const b = parse(current)
  for (let i = 0; i < 3; i += 1) {
    if (a[i]! !== b[i]!) return a[i]! > b[i]!
  }
  return false
}

/** spec 可以是 major / minor / patch，也可以是显式版本号。 */
export function bumpVersion(current: string, spec: string): string {
  const [major, minor, patch] = parse(current)
  if (spec === 'major') return `${major + 1}.0.0`
  if (spec === 'minor') return `${major}.${minor + 1}.0`
  if (spec === 'patch') return `${major}.${minor}.${patch + 1}`

  if (!SEMVER.test(spec)) {
    throw new Error(`版本参数只能是 major / minor / patch 或形如 1.2.3 的版本号，收到：${spec}`)
  }
  if (!isHigher(spec, current)) {
    throw new Error(`新版本 ${spec} 必须高于当前版本 ${current}`)
  }
  return spec
}

const headingOf = (version: string) => new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm')

/**
 * 把 `## [Unreleased]` 定版成 `## [x.y.z] - 日期`。发版说明得有人来写，
 * 所以两个段落都不存在时直接报错，而不是补一个空段落糊弄过去。
 */
export function promoteUnreleased(changelog: string, version: string, date: string): string {
  if (headingOf(version).test(changelog)) return changelog

  const unreleased = /^## \[Unreleased\].*$/m
  if (!unreleased.test(changelog)) {
    throw new Error(
      `CHANGELOG 里既没有 [Unreleased] 段落，也没有 [${version}] 段落，请先写好这一版的变更说明`,
    )
  }
  return changelog.replace(unreleased, `## [${version}] - ${date}`)
}

/** 摘出某个版本的正文，用作 release notes。 */
export function extractNotes(changelog: string, version: string): string {
  const lines = changelog.split('\n')
  const start = lines.findIndex((line) => headingOf(version).test(line))
  if (start < 0) throw new Error(`CHANGELOG 里找不到 ${version} 的段落`)

  const body: string[] = []
  for (const line of lines.slice(start + 1)) {
    // 下一个版本标题，或文末的链接定义区，都算这一段的结束
    if (line.startsWith('## ') || /^\[[^\]]+\]:\s/.test(line)) break
    body.push(line)
  }
  return body.join('\n').trim()
}

/** 在文末链接定义区补一行 compare 链接，上一版本取 CHANGELOG 里的下一个版本段。 */
export function upsertCompareLink(changelog: string, version: string, repo: string): string {
  if (new RegExp(`^\\[${version.replace(/\./g, '\\.')}\\]:\\s`, 'm').test(changelog)) {
    return changelog
  }

  const versions = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map((m) => m[1]!)
  const at = versions.indexOf(version)
  const previous = at >= 0 ? versions[at + 1] : undefined
  const link = previous
    ? `[${version}]: ${repo}/compare/v${previous}...v${version}`
    : `[${version}]: ${repo}/releases/tag/v${version}`

  const lines = changelog.split('\n')
  const first = lines.findIndex((line) => /^\[[^\]]+\]:\s/.test(line))
  if (first < 0) return `${changelog.trimEnd()}\n\n${link}\n`

  lines.splice(first, 0, link)
  return lines.join('\n')
}
