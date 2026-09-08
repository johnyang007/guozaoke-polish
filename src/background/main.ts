import { getConfig, saveConfig } from '../storage'

chrome.runtime.onInstalled.addListener((details) => {
  // 首次安装写入默认配置；升级时经 mergeConfig 补齐新增字段。
  void getConfig()
    .then((config) => saveConfig(config))
    .then(() => {
      if (details.reason === 'install') void chrome.runtime.openOptionsPage()
    })
    .catch(() => {
      // 忽略：配置会在首次读取时按默认值兜底。
    })
})
