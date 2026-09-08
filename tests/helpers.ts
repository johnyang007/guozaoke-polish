import fs from 'node:fs'

/**
 * 读取样本页面的 HTML 文本。happy-dom 会去请求样本里的外链资源
 * （iframe / link / script）并在游离窗口上抛错，这些资源与解析逻辑无关，
 * 读入时直接剔除。
 */
export function readSample(file: string): string {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<(?:iframe|link)\b[^>]*\/?>/gi, '')
}

/** 读取样本页面并解析为 Document。 */
export function loadSample(file: string): Document {
  return new DOMParser().parseFromString(readSample(file), 'text/html')
}
