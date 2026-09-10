import { describe, expect, it } from 'vitest'
import {
  bumpVersion,
  extractNotes,
  promoteUnreleased,
  upsertCompareLink,
} from '../scripts/release-utils'

const CHANGELOG = `# 更新日志

## [Unreleased]

### 变更

- 背景改成暖色

## [0.1.1] - 2026-09-10

### 变更

- 旧的一条

## [0.1.0] - 2026-09-08

### 新增

- 首个版本

[0.1.1]: https://example.com/compare/v0.1.0...v0.1.1
[0.1.0]: https://example.com/releases/tag/v0.1.0
`

describe('bumpVersion', () => {
  it('按语义化版本递增', () => {
    expect(bumpVersion('0.1.1', 'patch')).toBe('0.1.2')
    expect(bumpVersion('0.1.1', 'minor')).toBe('0.2.0')
    expect(bumpVersion('0.1.1', 'major')).toBe('1.0.0')
  })

  it('接受显式版本号', () => {
    expect(bumpVersion('0.1.1', '0.3.0')).toBe('0.3.0')
  })

  it('拒绝非法输入', () => {
    expect(() => bumpVersion('0.1.1', 'v0.2')).toThrow()
    expect(() => bumpVersion('0.1.1', '0.1.1')).toThrow(/必须高于/)
    expect(() => bumpVersion('0.1.1', '0.1.0')).toThrow(/必须高于/)
  })
})

describe('promoteUnreleased', () => {
  it('把 Unreleased 段落定版为具体版本与日期', () => {
    const out = promoteUnreleased(CHANGELOG, '0.2.0', '2026-09-11')
    expect(out).toContain('## [0.2.0] - 2026-09-11')
    expect(out).not.toContain('## [Unreleased]')
    // 只动标题，正文原样保留
    expect(out).toContain('- 背景改成暖色')
  })

  it('已经手写好该版本段落时原样返回', () => {
    const written = CHANGELOG.replace('## [Unreleased]', '## [0.2.0] - 2026-09-11')
    expect(promoteUnreleased(written, '0.2.0', '2026-09-11')).toBe(written)
  })

  it('既没有 Unreleased 也没有该版本段落时报错', () => {
    // 发版说明得有人来写，脚本不替人编造内容
    const noUnreleased = CHANGELOG.replace(/## \[Unreleased\][\s\S]*?(?=## \[0\.1\.1\])/, '')
    expect(noUnreleased).not.toContain('Unreleased')
    expect(() => promoteUnreleased(noUnreleased, '0.3.0', '2026-09-11')).toThrow(/CHANGELOG/)
  })
})

describe('extractNotes', () => {
  it('摘出指定版本的正文，不含标题与相邻版本', () => {
    const notes = extractNotes(CHANGELOG, '0.1.1')
    expect(notes).toContain('- 旧的一条')
    expect(notes).not.toContain('## [0.1.1]')
    expect(notes).not.toContain('首个版本')
  })

  it('末尾版本不会把链接定义一起带出来', () => {
    const notes = extractNotes(CHANGELOG, '0.1.0')
    expect(notes).toContain('- 首个版本')
    expect(notes).not.toContain('[0.1.0]: https://')
  })

  it('版本不存在时报错', () => {
    expect(() => extractNotes(CHANGELOG, '9.9.9')).toThrow(/9\.9\.9/)
  })
})

describe('upsertCompareLink', () => {
  const repo = 'https://github.com/johnyang007/guozaoke-polish'

  it('在链接定义区补上与上一版本的 compare 链接', () => {
    const promoted = promoteUnreleased(CHANGELOG, '0.2.0', '2026-09-11')
    const out = upsertCompareLink(promoted, '0.2.0', repo)
    expect(out).toContain(`[0.2.0]: ${repo}/compare/v0.1.1...v0.2.0`)
    // 新链接排在旧链接之前，与版本段落的倒序一致
    expect(out.indexOf('[0.2.0]:')).toBeLessThan(out.indexOf('[0.1.1]:'))
  })

  it('已有链接时不重复插入', () => {
    const promoted = promoteUnreleased(CHANGELOG, '0.2.0', '2026-09-11')
    const once = upsertCompareLink(promoted, '0.2.0', repo)
    expect(upsertCompareLink(once, '0.2.0', repo)).toBe(once)
  })
})
