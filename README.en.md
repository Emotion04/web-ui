# Universal UI

> **English** | [简体中文](README.md)

[![check](https://github.com/Emotion04/web-ui/actions/workflows/check.yml/badge.svg)](https://github.com/Emotion04/web-ui/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A framework-neutral desktop UI design system.** Restrained visuals and motion, complete keyboard and accessibility behaviour — no framework, no build step, no template compiler. The same markup runs in a plain page, WebView2, WKWebView and Firefox.

## Design principles

- **Zero-dependency runtime**: core is CSS + vanilla JS; 26 behaviour functions each return a disposer to call on unmount
- **Design contract is machine-enforced**: the component manifest (`docs/components.md`) and tests verify it; an audit bans invented easing curves, hard-coded colours and host-stack vocabulary in the core layer
- **Accessibility baseline**: every component covers focus-visible, keyboard, disabled, dark theme, touch and `prefers-reduced-motion`; reduced motion lands on the correct end state
- **Engine floor**: Chromium ≥ 111 (includes WebView2), WebKit ≥ 16.4, Firefox ≥ 121

## Quick start

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
npm run showcase    # http://127.0.0.1:4173, interactive state matrix
npm run check       # unit + manifest contract + typecheck + 103 real-Chrome assertions
```

## Three ways to consume

| Method | What you get |
|---|---|
| Clone the repo | Source + docs + showcase + tests |
| Point an Agent at the repo | Online context; give the agent this URL: `https://github.com/Emotion04/web-ui` |
| Install the Agent Skill | Carry the contract into any agent project: `npx skills add Emotion04/web-ui --skill universal-ui` |

The Skill teaches an agent not to invent its own components, drop disposers, or hard-code colours — **code delivery still uses the repo paths** (below).

## Runtime files

Five files, no build step:

```text
packages/
├── core/        index.css (entry, @imports tokens.css and motion.css), tokens.css, motion.css
└── vanilla/     index.js (behaviour API) + index.d.ts (types)
```

Three ways to obtain them:

```bash
# 1. Copy packages/ from the cloned repo into your host project
# 2. Reference the CDN directly (bare paths, pin a commit SHA)
https://cdn.jsdelivr.net/gh/Emotion04/web-ui@main/packages/vanilla/index.js
# 3. Use the script bundled with the Skill
node scripts/fetch-kit.mjs --dest ./src/ui --from /path/to/universal-ui
```

Every binder returns a disposer; call it when the component unmounts or listeners stack on remount.

## Components

| Group | Components |
|---|---|
| Layout | shell, sidebar, nav item, topbar, page header, toolbar, grid, stack, cluster, breadcrumb |
| Surfaces | card, row, badge, chip, avatar, empty state, skeleton, meter, stat tile, sparkline |
| Controls | button, icon button, input, textarea, select, checkbox, radio, switch, segmented, slider |
| Disclosure | tabs, section nav, disclosure, menu, popover, dialog, sheet |
| Feedback | tooltip, toast, toast stack, command list, copy button, arm button |
| Structure | resizer, drag sort, scroll container, screen-reader only |

Full inventory and status in `docs/components.md`, enforced by the contract test. The behaviour API is in `packages/vanilla/index.d.ts`.

## Themes and tokens

Light follows the system by default; `data-ui-theme="dark"` forces dark; `setTheme()` accepts `system/dark/light`. Every colour and size resolves to a `--ui-*` token — override on `:root`:

```css
:root {
  --ui-accent: #4C6B82;   /* neutral blue-grey default; override to brand */
  --ui-space-6: 14px;     /* change one value to retune density globally */
}
```

Full tokens in `packages/core/tokens.css`. Motion uses one easing curve and four durations, all from tokens.

## Platform support

| Platform | Status | Notes |
|---|---|---|
| Windows (WebView2 / Edge) | ✅ Full | Integrated titlebars, Mica/Acrylic material; host conventions in `docs/host-surfaces.md` |
| macOS (WKWebView) | ✅ Full | Safari 16.4+ |
| Linux (WebKitGTK 4.1) | ⚠️ Works | Requires WebKitGTK; dark theme via portal bridge |
| Android (WebView) | 🔜 Planned | Layout needs rework: touch targets, drawer navigation, back key |
| npm publish | 🔜 Planned | Package structure ready (`exports`/`files`/`sideEffects`/`types`); version decided before first release |

## Docs

| Doc | Purpose |
|---|---|
| `docs/components.md` | Component manifest (contract-test enforced) |
| `docs/integration.md` | Public API and integration invariants |
| `docs/architecture.md` | Layering and decision records |
| `docs/motion.md` | Motion contract |
| `docs/host-surfaces.md` | Window-layer contract: tray, frameless, titlebar blending, system materials |
| `docs/accessibility.md` | Accessibility baseline |
| `docs/testing.md` | Test suite |

## Development

```bash
npm run check       # unit + manifest contract + typecheck + real-browser assertions (CDP, no Playwright)
npm run typecheck   # tsc --noEmit over public declarations
npm run audit       # banned-word and token audit
```

Browser assertions need Chrome/Edge; set `CHROME_PATH` when not in default locations.

## License

[MIT](LICENSE) · Copyright © 2026 Emotion04
