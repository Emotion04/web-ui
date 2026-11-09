# Universal UI

> **简体中文** · [English](README.en.md)

[![check](https://github.com/Emotion04/universal-ui/actions/workflows/check.yml/badge.svg)](https://github.com/Emotion04/universal-ui/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Agent Skill](https://img.shields.io/badge/npx_skills_add-universal--ui-blue?logo=npm)](https://skills.sh/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

框架无关的桌面 UI 设计系统：克制的视觉与动效、完整的键盘与无障碍行为，不含品牌、业务逻辑、后端假设和宿主 API。

**一个仓库，三种用法。** 先分清两件事：契约是知识，运行时是代码。只装 Skill、或只给 Agent 一个仓库地址，都不足以让页面跑起来。

## 目录

- [契约与运行时](#契约与运行时)
- [三种使用方式](#三种使用方式)
- [取得运行时文件](#取得运行时文件)
- [组件清单](#组件清单)
- [本地开发](#本地开发)
- [仓库结构](#仓库结构)
- [运行环境](#运行环境)
- [令牌与设计规则](#令牌与设计规则)
- [文档](#文档)
- [Agent Skill](#agent-skill)
- [状态](#状态)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

## 契约与运行时

| | 内容 | 来源 |
|---|---|---|
| 契约 | `--ui-*` 令牌、`ui-*` 类名、行为函数，以及如何正确使用它们 | `docs/`、Skill、README |
| 运行时 | `index.css` + `tokens.css` + `motion.css` + `index.js`（TypeScript 再加 `index.d.ts`） | `packages/` |

`npx skills add` 只复制 `skills/universal-ui/` 这一个文件夹，不含 CSS/JS；「让 Agent 参考仓库」给的是指针，不是文件。三种方式里只有克隆自带运行时，另外两种都要先[取得运行时文件](#取得运行时文件)。

这划清了 Skill 的职责：它教 Agent 别自造按钮、别硬编码颜色、别漏掉 disposer，**不负责分发代码**。把源码塞进 Skill 会制造两份副本和版本漂移，比缺文件更难排查。

## 三种使用方式

| 方式 | 得到什么 | 运行时 | 适用 |
|---|---|---|---|
| [克隆](#方式一克隆整个仓库) | 源码、文档、showcase、测试、Skill | 自带 | 贡献代码、跑检查、读完整契约 |
| [让 Agent 参考仓库](#方式二让-agent-参考仓库) | 在线上下文，无本地文件 | 需另取 | Agent 能联网，要读在线源码 |
| [安装 Skill](#方式三安装-agent-skill) | `skills/universal-ui/` 一个文件夹 | 需另取 | 让 Agent 在任何项目里带上这份契约 |

### 方式一：克隆整个仓库

```bash
git clone https://github.com/Emotion04/universal-ui.git
cd universal-ui
npm ci
npm run showcase    # http://127.0.0.1:4173
npm run check       # 单测 + 清单契约 + 类型检查 + 真实 Chrome 断言
```

唯一包含 showcase、测试、`docs/` 和改动 kit 所需全部内容的方式；Skill 也在里面，无需另外安装。

### 方式二：让 Agent 参考仓库

给能联网或能 clone 的 Agent 一段提示词：

> 阅读 https://github.com/Emotion04/universal-ui ，以 `docs/components.md` 和 `docs/integration.md` 作为写界面的契约，复用已有 `ui-*` 组件，不要另造一套。

只能抓纯 URL 的 Agent，直接给地址：`https://raw.githubusercontent.com/Emotion04/universal-ui/main/docs/components.md`（同前缀下还有 `docs/integration.md`、`packages/core/index.css`、`packages/vanilla/index.js`）。为可复现，把 `main` 换成 tag 或 commit SHA。仓库地址只是指针——Agent 没有网络或 git 能力时解析不了，改用方式一或三。

### 方式三：安装 Agent Skill

```bash
npx skills add Emotion04/universal-ui --skill universal-ui
npx skills add Emotion04/universal-ui --list          # 先看这个仓库发布了哪些 Skill
```

也可以直接对 Agent 说：「安装 `npx skills add Emotion04/universal-ui --skill universal-ui`」。CLI 只复制：

```text
skills/universal-ui/
├── SKILL.md               # 契约、硬边界、完成标准
├── references/
│   ├── contract.md        # 组件/导出清单、引入方式、集成要点
│   └── authoring.md       # 仅在仓库内扩展组件时读取
└── scripts/
    └── fetch-kit.mjs      # 把运行时文件放进宿主项目
```

遵循开放的 [Agent Skills](https://skill.md/) 格式，支持该格式的客户端都能加载（客户端列表见 [skills.sh](https://skills.sh/)）。根目录的 `skills.sh.json` 负责网站分组展示。

## 取得运行时文件

最省事的是 Skill 自带的脚本，一次取齐五个文件（路径相对于 Skill 安装目录）：

```bash
node scripts/fetch-kit.mjs --dest ./src/ui
node scripts/fetch-kit.mjs --dest ./src/ui --from /path/to/universal-ui   # 离线 / 仓库未推送
node scripts/fetch-kit.mjs --dest ./src/ui --ref v0.3.4                   # 固定版本
```

包尚未发布到 npm（`private: true`），`@universal-ui/core` 只是包内自引用，直接 `npm install @universal-ui/core` 装不到。其余路径：从仓库 `packages/` 复制、`npm i github:Emotion04/universal-ui`（装好后按 exports 写 `@universal-ui/core/core.css` 与 `/vanilla`）、或引用 jsDelivr 裸链。

> **当前限制**：仓库还没有推送到 GitHub，上述 raw / CDN / git 安装地址现在都返回 404，推送后才生效。在此之前用 `--from` 或直接复制 `packages/`。

`index.css` 开头已 `@import` 同目录的 `tokens.css` 与 `motion.css`，所以只引一个样式文件，但三个必须放在一起。没有构建步骤和模板编译器，同一份标记在原生页面、webview 和框架里都能用；每个 binder 返回 disposer，卸载时调用。

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

## 组件清单

`docs/components.md` 是清单，契约测试会强制校验：标记为 `done` 的组件必须有样式、有对应行为导出、有 showcase 示例。

| 分组 | 组件 |
|---|---|
| 布局 | shell、sidebar、nav item、topbar、page header、toolbar、grid、stack、cluster、breadcrumb |
| 表面 | card、row、badge、chip、avatar、empty state、skeleton、meter、stat tile、sparkline |
| 控件 | button、icon button、input、textarea、select、checkbox、radio、switch、segmented、slider |
| 展开 | tabs、section nav、disclosure、menu、popover、dialog、sheet |
| 反馈 | tooltip、toast、toast stack、command list、copy button、arm button |
| 结构 | resizer、drag sort、scroll container、screen-reader only |

行为函数：`setTheme`、`bindSwitch`、`bindSegmented`、`bindCheckboxGroup`、`bindTabs`、`bindSectionNav`、`bindDisclosure`、`bindMenu`、`bindDialog`、`openPopover`、`openSheet`、`bindSheet`、`bindCommandList`、`createTooltip`、`createToast`、`createToastStack`、`bindCopyButton`、`copyText`、`bindArmButton`、`bindSlider`、`bindThumb`、`bindResizer`、`bindDragSort`、`drawSparkline`、`startViewTransition`、`prefersReducedMotion`。类型声明在 `packages/vanilla/index.d.ts`。

`bindTabs` 一次只显示一个面板（tablist 语义），`bindSectionNav` 保留全部章节、用 `aria-current="location"` 报告位置；两者不能用一个 mode 开关互相替代，原因见 `docs/architecture.md`。

## 本地开发

```bash
npm run showcase    # http://127.0.0.1:4173（端口占用时自动顺延）
npm run check       # 单测 + 清单契约 + 类型检查 + 真实 Chrome 断言
npm run typecheck   # tsc --noEmit 检查公开声明
```

`npm run browser` 通过 CDP 驱动真实 Chrome，在桌面与手机视口断言 97 项行为并输出 `test-results/showcase-*.png`。Chrome / Edge 不在默认位置时设置 `CHROME_PATH`。

## 仓库结构

```text
universal-ui/
├── README.md          # 简体中文（主版）
├── README.en.md       # 英文
├── packages/
│   ├── core/          # index.css / tokens.css / motion.css
│   └── vanilla/       # index.js + index.d.ts，公开行为 API
├── apps/showcase/     # 静态 showcase 与开发服务器
├── docs/              # 契约、清单、架构、测试、版本
├── tests/             # node:test 与真实浏览器断言
├── skills/universal-ui/   # 可安装的 Agent Skill（方式三）
├── skill/             # 归档的旧单文件入口，不再被识别
├── skills.sh.json     # skills.sh 分组配置
└── .github/workflows/check.yml
```

## 运行环境

用到 `color-mix()`、`:has()`、`backdrop-filter`、原生 `<dialog>`，以及可选的 View Transitions，因此最低版本如下：

| 引擎 | 最低 | 用于 |
|---|---|---|
| Chromium | 111 | Chrome、Edge、**WebView2**（Wails on Windows、Tauri、Electron） |
| Safari / WebKit | 16.4 | WKWebView（Wails on macOS） |
| Firefox | 121 | 桌面浏览器 |

View Transitions 不支持时退化为即时切换，其余能力没有可选项。**WebView2 就是 Edge 引擎**：Windows 上的 Wails / Tauri 应用与同版本 Edge 渲染结果一致，视觉异常时先查 WebView2 运行时版本。

## 令牌与设计规则

组件层的字号与间距全部解析到令牌，改 `:root` 就能全局调整密度。`tokens.css` 里的莫兰迪蓝 `#4C6B82`（暗色 `#9DBBD2`）只是可运行的起始值，**不是设计契约**：接入时按自己项目的品牌色覆盖 `--ui-accent` 三件套与 `--ui-focus`，明暗两套都要改。下面是覆盖示例，完整默认值见 `packages/core/tokens.css`。

```css
:root {
  --ui-text-base: 14px;   /* 正文 */
  --ui-space-6: 14px;     /* 卡片与控件内边距 */
  --ui-accent: #0f766e;   /* 覆盖示例：换成青绿 */
}
```

| 分组 | 令牌 |
|---|---|
| 文字 | `--ui-text-xs` … `--ui-text-2xl`、行高、字重 |
| 间距 | `--ui-space-1` … `--ui-space-12`（4px 节奏，小端 2px） |
| 动效 | `--ui-ease-standard`、四档 `--ui-duration-*`、位移距离 |
| 表面 | `--ui-radius-*`、`--ui-shadow-sm`、`--ui-shadow` |
| 层级 | `--ui-z-sticky`、`--ui-z-popover`、`--ui-z-modal`、`--ui-z-toast` |

- 只有一条缓动曲线 `var(--ui-ease-standard)`，时长只从令牌取。
- 组件读令牌，不硬编码颜色、尺寸、间距；缺令牌就补令牌。
- 每个组件都要覆盖 focus-visible、键盘、禁用态、暗色主题、触屏与 `prefers-reduced-motion`，且减弱动效要落到**正确终态**，不是把动画缩短。
- 应用代码消费 kit，不复制基础组件自行改造。

## 文档

| 文档 | 什么时候读 |
|---|---|
| [docs/integration.md](docs/integration.md) | 接入 kit：公开 API 与破坏它的不变量 |
| [docs/components.md](docs/components.md) | 找组件——测试强制校验的清单 |
| [docs/architecture.md](docs/architecture.md) | 理解分层，或在 tabs / section nav 之间选择 |
| [docs/motion.md](docs/motion.md) | 加任何动画之前 |
| [docs/accessibility.md](docs/accessibility.md) | 改键盘、焦点或播报行为 |
| [docs/testing.md](docs/testing.md) | 加测试，或想知道某条检查为何存在 |
| [docs/host-surfaces.md](docs/host-surfaces.md) | 把 kit 包进桌面外壳（托盘、无边框窗口） |
| [docs/versioning.md](docs/versioning.md) | 判断改动是否破坏性 |
| [skills/universal-ui/SKILL.md](skills/universal-ui/SKILL.md) | 使用可安装的 Agent Skill |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 加组件或改行为 |
| [TODO.md](TODO.md) | 接手未完成的工作 |
| [CHANGELOG.md](CHANGELOG.md) | 升级 |

有意不提供框架适配包：令牌、`ui-*` 类名、行为函数、`ui-*` 事件这套契约对任何技术栈都够用，Agent 照着写即可，无需重写组件。

## Agent Skill

一个文件夹就是一个可安装单元，结构只用官方认可的目录名：

```text
skills/<name>/
├── SKILL.md       # 必需：YAML frontmatter（name、description）+ 指令
├── references/    # 可选：按需加载的文档
├── scripts/       # 可选：可执行代码
├── assets/        # 可选：模板等产出资源
└── examples/      # 可选：示例
```

**为什么是 `skills/` 而不是 `skill/`**：CLI 会扫描若干标准位置，找不到时还会递归兜底，所以任意位置的 `SKILL.md` 其实都能被发现，加 s 不是 CLI 的硬门槛。真正的原因是三条——`skills/<name>/SKILL.md` 是 skills.sh 索引器优先识别的路径；一个仓库要放多个 Skill 时靠复数目录各自命名；文件夹名必须与 frontmatter 的 `name` 一致（旧的 `skill/` 与 `universal-ui` 就不一致）。另外同名 Skill 只能留一个，否则 CLI 会解析到错的那份；旧入口已合并进来并归档为 `skill/LEGACY-SKILL.md`。

`name` 用小写 kebab-case，`description` 同时写能力和触发条件。细节材料放 `references/`，指针要说明「后面是什么、何时读取」。`npx skills add` 只复制该文件夹，因此 Skill 不能依赖仓库里其他位置的文件存在。

新增 Skill：`skills/<new-name>/SKILL.md` → 把名字加进 `skills.sh.json` 的 `groupings` → 在本文档登记 → 用 `npx skills add Emotion04/universal-ui --list` 验证。

## 状态

预发布阶段，尚未发布到 npm。公开契约是上面的令牌、`ui-*` 类名与导出函数，其余仍可能变动。Agent Skill 通过本仓库的 `npx skills add` 分发，版本与 kit 同步。

## 参与贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。唯一铁律：**核心是 CSS + 原生 DOM，没有框架、没有构建、没有打包器**。改动前后 `npm run check` 都必须退出 0。

## 许可证

[MIT](LICENSE) · Copyright © 2026 Emotion04。补充说明见 [NOTICE.md](NOTICE.md)。
