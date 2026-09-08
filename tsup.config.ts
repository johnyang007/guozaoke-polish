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
