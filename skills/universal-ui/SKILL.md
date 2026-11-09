---
name: universal-ui
description: 用 Universal UI 设计系统构建或修改桌面界面。当任务涉及接入该设计系统、查找 ui-* 组件、编写 --ui-* 令牌样式、调用 vanilla 行为函数、切换明暗主题，或在 universal-ui 仓库内扩展组件时使用。与该项目无关的通用前端开发不触发。
metadata:
  version: "0.3.4"
---

# Universal UI

用现成契约完成界面：复用已有组件，样式读令牌，交互走导出的行为函数。本 Skill 只携带契约知识，不含 CSS 与 JS 源码，也不是一个可以直接 import 的 npm 包。

## 前置条件

宿主项目里要有运行时文件：`index.css`（与 `tokens.css`、`motion.css` 同目录）、`index.js`，TypeScript 项目再要 `index.d.ts`。没有时先运行 `node scripts/fetch-kit.mjs --dest <宿主目录>` 一次取齐，参数见 `--help`；离线时用 `--from <本地仓库根>` 从 clone 复制，或直接从仓库 `packages/` 拷。运行时未就位时不写 import 语句。

配色由宿主项目决定。`tokens.css` 里的莫兰迪蓝只是可运行的起始值，不是设计契约；接入时先按宿主项目的品牌色覆盖 `--ui-accent`、`--ui-accent-soft`、`--ui-accent-fg` 与 `--ui-focus`，明暗两套都要改。宿主项目已有品牌色时以它为准，没有时才沿用默认；主按钮文字对 `--ui-accent` 的对比度至少 4.5:1。

## 事实来源

按当前所处环境选唯一的事实来源，不混用：

- 在 universal-ui 仓库内 → `docs/components.md` 的清单、`docs/integration.md` 的契约、实际的 CSS 与 JS 导出。
- 只安装了本 Skill → [references/contract.md](references/contract.md) 的快照；需要完整原文时按其中的仓库地址获取。
- 已把 kit 引入宿主项目 → 以实际安装的 CSS/JS 为准；与快照版本不一致时，以文件为准。

清单里列着的组件就是存在的，直接复用；清单里没有的不算公共契约。

## 公共契约

对外承诺只有三样，其余都是实现细节，可能随版本变化：

- `--ui-*` 令牌：颜色、字号、间距、圆角、阴影、时长、缓动。
- `ui-*` 类名：组件标记。
- `packages/vanilla` 的行为函数：每个返回 disposer，并发出 `ui-*` CustomEvent。

## 硬边界

- 调主题与密度只覆盖 `:root` 上的令牌；应用代码不覆盖组件规则，颜色、字号、间距、时长一律取 `--ui-*`，缺令牌就补令牌。动效只用 `var(--ui-ease-standard)` 与四个 `--ui-duration-*` 档位。
- 每个元素只绑一次 binder；元素移除或组件卸载时调用返回的 disposer。DOM 属性是状态的唯一来源，不复制到框架状态；动画节点保持挂载、用 `hidden` 切换。
- 交互组件同时具备 `:focus-visible`、键盘操作、禁用态、暗色主题和 `prefers-reduced-motion` 的正确终态；破坏性操作用 `bindArmButton`，或初始焦点落在「取消」的对话框。
- 需要新组件时扩展核心并登记清单与示例，不把基础组件复制进应用代码。托盘、窗口边框等宿主外壳不交给 kit 渲染。

## 分支披露

- 在别的项目接入、查组件与导入路径、写标记、处理主题与响应式外壳 → 读 [references/contract.md](references/contract.md)。
- 当前工作目录是 universal-ui 仓库根，且要新增或修改组件 → 读 [references/authoring.md](references/authoring.md)。

## 完成标准

- 运行时文件已就位，用到的类名与导出在事实来源里真实存在，没有第二套按钮、对话框、菜单或提示。
- 明暗两套的强调色已按宿主项目确定，主按钮文字对比度不低于 4.5:1。
- 没有硬编码颜色、字号、间距与 `cubic-bezier`；每个 binder 的 disposer 都有对应调用。
- 明暗主题、键盘操作与减弱动效路径都落到正确终态。
