import fs from 'node:fs'
import { defineConfig } from 'vitest/config'

/*
 * samples/ 是真实页面快照，含网友的用户名与发言原文，因此不入库（见
 * .gitignore）。仓库 clone 下来没有这些文件，依赖它们的用例就没法跑，
 * 这里直接排除掉，剩下的纯逻辑用例照常执行，不会红一片。
 * 自己抓一份样本放回 samples/ 后，它们会自动重新纳入。
 */
const hasSamples = fs.existsSync('samples/topic.html')

const SAMPLE_TESTS = [
  'tests/home-parse.test.ts',
  'tests/home-tabs.test.ts',
  'tests/smoke.test.ts',
  'tests/strip-anchor.test.ts',
  'tests/topic-anchor.test.ts',
  'tests/topic-collapse.test.ts',
  'tests/topic-hot.test.ts',
  'tests/topic-merge.test.ts',
  'tests/topic-op.test.ts',
  'tests/topic-parse.test.ts',
  'tests/topic-quote.test.ts',
  'tests/topic-render-quote.test.ts',
]

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: hasSamples ? [] : SAMPLE_TESTS,
    environmentOptions: {
      // 样本 HTML 里含外链 script/css，测试环境不应去加载或执行它们。
      happyDOM: {
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: true,
          disableCSSFileLoading: true,
        },
      },
    },
  },
})
