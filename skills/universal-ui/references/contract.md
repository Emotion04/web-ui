# 使用侧契约

在 Universal UI 仓库之外使用本 Skill 时读取；在仓库内扩展组件改读 [authoring.md](authoring.md)。

本文件是随 Skill 分发的契约快照：安装后仓库内文档不可见，查清单与标记以本文件为准。权威来源与完整原文在 https://github.com/Emotion04/universal-ui 的 `docs/components.md`、`docs/integration.md` 与 `packages/vanilla/index.d.ts`；升级 kit 时同步本文件。

## 引入

先取得运行时文件：宿主项目里要有 `index.css`（与 `tokens.css`、`motion.css` 同目录）、`index.js`，TypeScript 项目再要 `index.d.ts`。用 `node scripts/fetch-kit.mjs --dest <宿主目录>` 一次取齐，参数见 `--help`；没有网络时用 `--from <本地仓库根>` 从 clone 复制。运行时未就位时不写 import 语句。

仓库尚未发布到 npm（`package.json` 标了 `private`），`@universal-ui/core` 只是包内自引用的名字，直接 `npm install @universal-ui/core` 装不到。可选路径：从仓库 `packages/` 复制（仓库未推送时最可靠）、`npm i github:Emotion04/universal-ui` 后按 exports 写 `@universal-ui/core/core.css` 与 `@universal-ui/core/vanilla`、或用 `https://cdn.jsdelivr.net/gh/Emotion04/universal-ui@<ref>/packages/...` 裸链。远程地址要等仓库推送到 GitHub 之后才生效，且建议把 `<ref>` 固定到 tag 或 commit SHA。

`index.css` 开头已经 `@import` 同目录的 `tokens.css` 与 `motion.css`，所以样式只引这一个文件，但三个文件必须放在一起。没有构建步骤与模板编译器，同一份标记在原生页面、webview 和框架里都能用。

```html
<link rel="stylesheet" href="/path/to/index.css">
<script type="module">
  import { bindDialog } from '/path/to/index.js';

  bindDialog(document.querySelector('#confirm'), {
    triggers: [document.querySelector('#delete')],
    initialFocus: () => document.querySelector('#cancel'),
  });
</script>
```

## 换配色

默认莫兰迪蓝只是可运行的起点，不是设计契约。按宿主项目的品牌色覆盖 `--ui-accent`、`--ui-accent-soft`、`--ui-accent-fg` 与 `--ui-focus`：亮色改 `:root`，暗色要同时改 `:root[data-ui-theme="dark"]` 和 `@media (prefers-color-scheme: dark)` 两块（`tokens.css` 要求这两块保持同步）。`--ui-focus` 的 rgb 通道跟 `--ui-accent` 一致；`--ui-accent-fg` 与 `--ui-accent` 的对比度至少 4.5:1，暗色里 `--ui-accent` 还会作为文字压在深色底上，同样要保证可读。

## 组件清单

列在这里的就是存在的，直接复用；带 `*` 的只有样式、无行为函数。

- 布局：`ui-shell` `ui-view` `ui-panel` `ui-sidebar`（`__section` `__brand`）`ui-nav-item` `ui-subnav` `ui-thumb` `ui-page-header*` `ui-topbar*` `ui-toolbar` `ui-grid*` `ui-stack*` `ui-cluster*` `ui-breadcrumb`
- 表面与展示：`ui-card` `ui-row` `ui-badge` `ui-chip` `ui-avatar*` `ui-icon` `ui-link` `ui-truncate` `ui-clamp-2` `ui-empty` `ui-skeleton` `ui-spinner` `ui-meter` `ui-ring` `ui-status` `ui-alert` `ui-field__error` `ui-kbd` `ui-divider` `ui-tile` `ui-stat` `ui-sparkline`
- 控件：`ui-button` `ui-icon-button` `ui-input` `ui-textarea` `ui-select` `ui-check` `ui-radio` `ui-switch` `ui-segmented` `ui-slider`
- 展开与导航：`ui-tabs` `ui-section-nav` `ui-section` `ui-disclosure` `ui-menu` `ui-popover` `ui-dialog` `ui-sheet`
- 反馈：`ui-tooltip` `ui-toast` `ui-toast-stack` `ui-command` `ui-copy` `ui-arm`
- 结构：`ui-resizer` `ui-drag` `ui-scroll*` `ui-sr-only*`

托盘菜单、窗口按钮、任务栏跳转列表属于宿主（Wails / Electron / Tauri），kit 只提供窗内等价的 `ui-menu`。

## 行为函数

`packages/vanilla` 的全部导出，签名以 `index.d.ts` 为准：

- 工具：`setTheme` `prefersReducedMotion` `startViewTransition` `copyText`
- 控件：`bindSwitch` `bindSegmented` `bindCheckboxGroup` `bindSlider` `bindCopyButton` `bindArmButton`
- 导航：`bindTabs` `bindSectionNav` `bindDisclosure`
- 浮层：`bindMenu` `openPopover` `bindDialog` `openSheet` `bindSheet` `createTooltip` `createToast` `createToastStack` `bindCommandList`
- 布局与展示：`bindResizer` `bindDragSort` `bindThumb` `drawSparkline`

`bindTabs` 一次只显示一个面板（tablist）；`bindSectionNav` 保留全部章节、用 `aria-current="location"` 报告位置。两者不能用一个 mode 开关互相替代。

## 组合约定

- `.ui-card` 是裸表面，内边距由 `__header/__body` 负责；只有一个不分割的内容块时，可以直接用同一个间距令牌给 card 加内边距。
- `.ui-row` 是带边框的键值行（52px，`__copy/__title/__subtitle`）；紧凑键值文字用 `min-height` 加 `align-items: baseline`，等宽值用省略号截断。横向排控件用 `.ui-cluster`，不是 row。
- `.ui-input/.ui-select` 默认 `width: 100%`，在工具栏和 flex 行里必须给显式宽度。
- `.ui-stat` 负责 label/value/delta 排版；凸起效果靠外层 card，提示行用 `__delta`。
- Canvas 图表在运行时用 `getComputedStyle(...).getPropertyValue('--ui-success')` 取令牌色，hex 可追加透明度后缀（如 `+'8C'`）；状态行用 `.ui-status` 配 `--success/--warning/--danger`，圆点来自 `::before`。
- 所有按钮共用同一尺寸，变体只改颜色。

## 需要记住的 kit 特性

- 主题：暗色跟随 `prefers-color-scheme`，无需 JS；`setTheme('dark'|'light'|'system')` 写 `data-ui-theme`。crossfade 会重解析整棵树的样式，超大 DOM 传 `setTheme(theme, { animate: false })`。
- 视图切换统一调 `startViewTransition()`，它已处理不支持的引擎、减弱动效、异常与超时。
- `createToast` 不传容器时用共享默认栈；`bindSheet` 是 `openSheet` 的声明式对应，反复打开不叠加监听器，sheet 内 `[data-ui-close]` 负责关闭。
- 选项卡用 `aria-controls` 关联面板，重复行用稳定标识；`bindThumb` 要求控件建立定位上下文。
- 唯一断点 760px：之下 `.ui-sidebar` 隐藏，`.ui-topbar` 的汉堡按钮打开左侧抽屉。抽屉是宿主标记——`<dialog class="ui-sheet" data-side="left">`，用 `bindSheet(sheet, { trigger })` 驱动，选中页面后由宿主 `sheet.close()`；桌面宽度下这段标记是惰性的。完整标记见 `docs/integration.md`。

交互组件的键盘与焦点基线、完整不变量表、性能契约见仓库 `docs/integration.md` 与 `CHANGELOG.md`，写标记前按需获取，本快照不复述。
