import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const src = 'extension'
const tmp = 'build-firefox-src'

fs.rmSync(tmp, { recursive: true, force: true })
fs.cpSync(src, tmp, { recursive: true })
fs.rmSync(path.join(tmp, 'manifest.json'), { force: true })
fs.renameSync(path.join(tmp, 'manifest-firefox.json'), path.join(tmp, 'manifest.json'))
const args = [
  'web-ext',
  'build',
  '-s',
  tmp,
  '-a',
  'build-firefox',
  '-o',
  '--filename',
  'guozaoke-polish-firefox-{version}.zip',
]
execFileSync('npx', args, {
  stdio: 'inherit',
})
fs.rmSync(tmp, { recursive: true, force: true })
