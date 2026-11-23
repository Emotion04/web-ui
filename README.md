# Universal UI

[![check](https://github.com/Emotion04/web-ui/actions/workflows/check.yml/badge.svg)](https://github.com/Emotion04/web-ui/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**框架无关的桌面 UI 设计系统。** 克制的视觉与动效、完整的键盘与无障碍行为，无框架、无构建、无模板编译器——同一份标记在原生页面、WebView2、WKWebView、Firefox 里直接运行。

## 设计取向

- **零依赖运行时**：核心是 CSS + vanilla JS，26 个行为函数各返回 disposer，卸载时调用
- **设计契约机器化**：组件清单（`docs/components.md`）与测试强制校验；audit 禁止发明曲线、硬编码颜色、宿主技术词混入核心层
- **无障碍基线**：每个组件覆盖 focus-visible、键盘、禁用、暗色主题、触屏、`prefers-reduced-motion`，减弱动效落到正确终态
- **平台收敛**：Chromium ≥ 111（含 WebView2）、WebKit ≥ 16.4、Firefox ≥ 121

## 快速开始

```html
<link rel="stylesheet" href="./ui/index.css">
<script type="module">
  import { bindDialog } from './ui/index.js';

  bindDialog(document.querySelector('#confirm'), {
    triggers: [document.querySelector('#delete')],
    initialFocus: () => document.querySelector('#cancel'),
  });
</script>
```

```bash
git clone https://github.com/Emotion04/web-ui.git
cd web-ui
npm run showcase    # http://127.0.0.1:4173，可交互状态矩阵
npm run check       # 单测 + 清单契约 + 类型检查 + 103 项真实 Chrome 断言
```

## 三种使用方式

| 方式 | 得到什么 |
|---|---|
| 克隆仓库 | 源码 + 文档 + showcase + 测试 |
| 让 Agent 参考仓库 | 在线上下文；给 Agent 这个 URL：`https://github.com/Emotion04/web-ui` |
| 安装 Agent Skill | 把契约带进任意 Agent 项目：`npx skills add Emotion04/web-ui --skill universal-ui` |

Skill 只教 Agent 别自造组件、别漏 disposer、别硬编码颜色——**分发代码仍用仓库路径**，见下。

## 运行时文件

五个文件，无构建步骤：

```text
packages/
├── core/        index.css（入口，已 @import tokens.css / motion.css）、tokens.css、motion.css
└── vanilla/     index.js（行为 API）+ index.d.ts（类型声明）
```

三种取得方式：

```bash
# 1. 从克隆的仓库复制 packages/ 到宿主项目
# 2. 直接引用 CDN（裸路径，可固定 commit SHA）
https://cdn.jsdelivr.net/gh/Emotion04/web-ui@main/packages/vanilla/index.js
# 3. 用 Skill 自带的脚本
node scripts/fetch-kit.mjs --dest ./src/ui --from /path/to/universal-ui
```

每个 binder 返回 disposer，应用卸载时调用，否则重复挂载会叠加监听。

## 组件

| 分组 | 组件 |
|---|---|
| 布局 | shell、sidebar、nav item、topbar、page header、toolbar、grid、stack、cluster、breadcrumb |
| 表面 | card、row、badge、chip、avatar、empty state、skeleton、meter、stat tile、sparkline |
| 控件 | button、icon button、input、textarea、select、checkbox、radio、switch、segmented、slider |
| 展开 | tabs、section nav、disclosure、menu、popover、dialog、sheet |
| 反馈 | tooltip、toast、toast stack、command list、copy button、arm button |
| 结构 | resizer、drag sort、scroll container、screen-reader only |

完整清单与状态见 `docs/components.md`，契约测试会校验。行为 API 全集见 `packages/vanilla/index.d.ts`。

## 主题与令牌

默认浅色跟随系统，`data-ui-theme="dark"` 强制暗色，`setTheme()` 支持 `system/dark/light`。所有颜色与尺寸解析到 `--ui-*` 令牌，接入时覆盖 `:root`：

```css
:root {
  --ui-accent: #4C6B82;   /* 默认中性蓝灰，按品牌覆盖 */
  --ui-space-6: 14px;     /* 改一处即全局调密度 */
}
```

完整令牌见 `packages/core/tokens.css`。动效只有一条缓动曲线、四档时长，全部走 token。

## 平台适配

| 平台 | 支持 | 备注 |
|---|---|---|
| Windows（WebView2 / Edge） | ✅ 完整 | 含窗口融合标题栏、Mica/亚克力材质，宿主约定见 `docs/host-surfaces.md` |
| macOS（WKWebView） | ✅ 完整 | Safari 16.4+ |
| Linux（WebKitGTK 4.1） | ⚠️ 可用 | 需装 WebKitGTK；系统暗色需 portal 桥接 |
| Android（WebView） | 🔜 规划 | 布局需重做：触摸目标、抽屉导航、系统返回键 |
| npm 发布 | 🔜 规划 | 包结构已就绪（`exports`/`files`/`sideEffects`/`types`），首次发布前再定版本号 |

## 文档

| 文档 | 用途 |
|---|---|
| `docs/components.md` | 组件清单（契约测试强制校验） |
| `docs/integration.md` | 公开 API 与接入不变量 |
| `docs/architecture.md` | 分层与决策记录 |
| `docs/motion.md` | 动效规范 |
| `docs/host-surfaces.md` | 窗口层契约：托盘、无边框、标题栏融合、系统材质 |
| `docs/accessibility.md` | 无障碍基线 |
| `docs/testing.md` | 测试体系 |

## 开发

```bash
npm run check       # 单元 + 清单契约 + 类型 + 真实浏览器断言（CDP，无 Playwright）
npm run typecheck   # tsc --noEmit 校验公开声明
npm run audit       # 禁止词与令牌审计
```

浏览器断言需要 Chrome/Edge；不在默认路径时设 `CHROME_PATH`。

## 许可证

[MIT](LICENSE) · Copyright © 2026 Emotion04
