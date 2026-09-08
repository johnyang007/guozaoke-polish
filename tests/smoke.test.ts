import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('页面样本', () => {
  it('三份话题页样本存在且含 reply-item', () => {
    for (const f of [
      'samples/topic.html',
      'samples/topic-paged-p1.html',
      'samples/topic-paged-p2.html',
    ]) {
      const html = fs.readFileSync(f, 'utf8')
      expect(html).toContain('reply-item')
    }
  })

  it('首页样本含 topic-item', () => {
    expect(fs.readFileSync('samples/home.html', 'utf8')).toContain('topic-item')
  })
})
