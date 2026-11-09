# 仓库内扩展

仅当工作目录是 universal-ui 仓库根、且要新增或修改组件时读取。只安装了本 Skill、没有仓库源码时本文件不适用。

以仓库内文档为唯一事实来源，按仓库根 `CONTRIBUTING.md` 里的组件添加顺序改动：样式 → 行为 → 类型声明 → showcase 全状态 → 清单加行 → 浏览器断言。`tests/contract.test.mjs` 会解析清单，跳过任何一步都会失败；`tests/audit.mjs` 拒绝品牌词、自造缓动曲线与组件层裸 `font-size`。

`npm run check` 必须退出 0。除了样式与行为，还要看 `test-results/showcase-*.png`：DOM 断言看不到「已关闭但仍绘制」的对话框，截图能。

改动前按需读：加动画读 `docs/motion.md`；改公共类名、导出、令牌或事件 `detail` 读 `docs/versioning.md`；碰 resizer、popover、drag-sort 或主题切换时读 `CHANGELOG.md` 的 performance pass——那里记录的性能契约由测试约束，改动容易无意中回退。
