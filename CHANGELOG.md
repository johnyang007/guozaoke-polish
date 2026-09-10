# 更新日志

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.1.1] - 2026-09-10

### 变更

- 中性色系整体转暖：浅色底 `#f4f5f7` → `#f7f6f3`，深色底 `#16181c` → `#171614`，边框与前景色同步去蓝味。原来的冷灰蓝与站点的橙色身份色（logo、发布按钮、热度数字）对冲，橙元素会被顶得过于显眼
- 容器阴影改为双层柔和投影，并用带暖味的深色代替纯黑，层次交给光影而不是色块硬顶
- 底色上叠加 5% 灰度噪点与顶部 480px 高的暖光晕，纯色平铺不再发死。噪点用内联 SVG 生成，不新增任何外部资源

### 内部

- manifest 的版本号改为从 `package.json` 读取，此前 `package.json` 与 `scripts/build-manifest.ts` 各写一份，发版容易漏改其中一处

## [0.1.0] - 2026-09-08

### 新增

- 界面美化与深色模式：重排版式、容器卡片化、弱化次要信息，浅色 / 深色 / 跟随系统三态主题，个人信息卡滚动吸顶
- 列表增强：已读主题淡化、按关键词 / 节点 / 用户屏蔽主题、回复数按热度着色、当前排序与节点页签高亮
- 话题页阅读增强：多层盖楼引用堆、楼主高亮、热门回复、长回复折叠、楼层锚点、分页合并
- 支持 Chrome / Edge / Firefox

[0.1.1]: https://github.com/johnyang007/guozaoke-polish/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/johnyang007/guozaoke-polish/releases/tag/v0.1.0
