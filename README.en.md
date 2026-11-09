# Universal UI

> [简体中文](README.md) | **English**

[![check](https://github.com/Emotion04/universal-ui/actions/workflows/check.yml/badge.svg)](https://github.com/Emotion04/universal-ui/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Agent Skill](https://img.shields.io/badge/npx_skills_add-universal--ui-blue?logo=npm)](https://skills.sh/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A framework-neutral desktop UI design system. It keeps a compact, quiet visual
language with restrained motion and complete keyboard/accessibility behaviour,
while staying free of product branding, business logic, backend assumptions and
host APIs.

**One repository, three ways in.** Clone it to work on the kit, point an AI agent
at it for context, or install just the Agent Skill. A Skill is knowledge, not a
runtime package: only method 1 puts the CSS/JS on disk, so methods 2 and 3 also
need [Getting the kit into a project](#getting-the-kit-into-a-project).

## Table of Contents

- [Three ways to use this repository](#three-ways-to-use-this-repository)
- [Getting the kit into a project](#getting-the-kit-into-a-project)
- [Inventory](#inventory)
- [Development](#development)
- [Repository layout](#repository-layout)
- [Runtime support](#runtime-support)
- [Tokens and design rules](#tokens-and-design-rules)
- [Documentation](#documentation)
- [Agent Skills](#agent-skills)
- [Status](#status)
- [Contributing](#contributing)
- [License](#license)

## Three ways to use this repository

| Method | What you get | Runtime included | Use it when |
|---|---|---|---|
| [1. Clone](#1-clone-the-repository) | Source, docs, showcase, tests and Skills | Yes | Contributing, running checks, reading the full contract |
| [2. Reference from an agent](#2-point-an-agent-at-the-repository) | Remote context, no local checkout | No | Your agent can fetch URLs or clone, and you want it to read the live source |
| [3. `npx skills add`](#3-install-the-agent-skill) | `skills/universal-ui/` only | No | Your agent should carry the kit's contract into any project |

All three read from the same `main` branch. Methods 2 and 3 deliver the contract;
the runtime CSS/JS is a separate dependency.

### 1. Clone the repository

```bash
git clone https://github.com/Emotion04/universal-ui.git
cd universal-ui
npm ci
npm run showcase    # http://127.0.0.1:4173
npm run check       # unit + manifest contract + typecheck + real Chrome assertions
```

This is the only mode that includes the showcase, the test suite, `docs/`, and
everything needed to change the kit itself. It also contains the Skills, so no
separate install is needed here.

### 2. Point an agent at the repository

Paste a prompt like this into an agent that can fetch URLs or clone repositories:

> Read https://github.com/Emotion04/universal-ui and use its
> `docs/components.md` and `docs/integration.md` as the contract for the UI you
> write. Reuse existing `ui-*` components instead of inventing new ones.

If the agent can only fetch plain URLs, give it explicit ones:

| File | Raw URL |
|---|---|
| Styles (imports tokens + motion) | `https://raw.githubusercontent.com/Emotion04/universal-ui/main/packages/core/index.css` |
| Behaviour module | `https://raw.githubusercontent.com/Emotion04/universal-ui/main/packages/vanilla/index.js` |
| Component manifest | `https://raw.githubusercontent.com/Emotion04/universal-ui/main/docs/components.md` |
| Integration contract | `https://raw.githubusercontent.com/Emotion04/universal-ui/main/docs/integration.md` |

For reproducible results, replace `main` with a tag or commit SHA. A repository
URL is a pointer, not content: an agent without network or git access cannot
resolve it — use method 1 or 3 in that case. A CDN mirror is available at
`https://cdn.jsdelivr.net/gh/Emotion04/universal-ui@main/packages/core/index.css`.

### 3. Install the Agent Skill

```bash
npx skills add Emotion04/universal-ui --skill universal-ui

# inspect what this repository publishes first
npx skills add Emotion04/universal-ui --list
```

Or tell your agent: *"Install `npx skills add Emotion04/universal-ui --skill universal-ui`."*

The CLI copies only this folder into your agent's skills directory:

```text
skills/universal-ui/
├── SKILL.md               # contract, hard boundaries, completion checks
├── references/
│   ├── contract.md        # component/export inventory, import paths, integration facts
│   └── authoring.md       # read only when editing the kit inside this repository
└── scripts/
    └── fetch-kit.mjs      # places the runtime files into a host project
```

It contains no CSS or JavaScript — the Skill teaches the agent how to use the
kit, it does not distribute the kit. It follows the open
[Agent Skills](https://skill.md/) format, so any client that supports the format
can load it (see [skills.sh](https://skills.sh/) for the client list). The
`skills.sh.json` file at the repository root groups the Skill for the directory
listing.

## Getting the kit into a project

**The package is not published to npm yet** (`package.json` sets `private: true`).
`@universal-ui/core` is the package's self-reference, used only after it has been
installed as a dependency — `npm install @universal-ui/core` from the registry
will not work.

The simplest route is the script shipped with the Skill. It places all five
runtime files in one directory (paths below are relative to the installed Skill
folder):

```bash
node scripts/fetch-kit.mjs --dest ./src/ui
node scripts/fetch-kit.mjs --dest ./src/ui --from /path/to/universal-ui  # local clone, no network
node scripts/fetch-kit.mjs --dest ./src/ui --ref v0.3.4                  # pinned version
```

| Option | How | Then import |
|---|---|---|
| Copy the files | Copy `packages/core/*.css` and `packages/vanilla/index.js` into your project | Relative paths |
| Install from GitHub | `npm i github:Emotion04/universal-ui` | `@universal-ui/core/core.css`, `@universal-ui/core/vanilla` |
| CDN | jsDelivr URLs from method 2 | Absolute URLs |

Remote URLs (raw.githubusercontent.com, jsDelivr, `npm i github:...`) only work
once this repository is pushed to GitHub. While it has no remote, use `--from`
or copy from `packages/`.

`index.css` already `@import`s `tokens.css` and `motion.css` from the same
directory, so one stylesheet link is enough — but keep all three files together.

```html
<link rel="stylesheet" href="/path/to/index.css">
<script type="module">
  import { bindDialog, setTheme } from '/path/to/index.js';

  bindDialog(document.querySelector('#confirm'), {
    triggers: [document.querySelector('#delete')],
    initialFocus: () => document.querySelector('#cancel'),
  });
</script>
```

There is no build step and no template compiler. The same markup works in a
plain page, a webview, or any framework; the host project owns its lifecycle,
and each binder returns a disposer to call on unmount.

## Inventory

`docs/components.md` is the manifest and the contract test enforces it: a
component marked `done` must have a style, an exported behaviour where relevant,
and a showcase example.

| Group | Components |
|---|---|
| Layout | shell, sidebar, nav item, topbar (compact shell), page header, toolbar, grid, stack, cluster, breadcrumb |
| Surfaces | card, row, badge, chip, avatar, empty state, skeleton, meter, stat tile, sparkline |
| Controls | button, icon button, input, textarea, select, checkbox, radio, switch, segmented, slider |
| Disclosure | tabs, section nav, disclosure, menu (checkbox/radio items), popover, dialog, sheet |
| Feedback | tooltip, toast, toast stack, command list, copy button, arm button |
| Structure | resizer, drag sort, scroll container, screen-reader only |

Behaviour: `setTheme`, `bindSwitch`, `bindSegmented`, `bindCheckboxGroup`,
`bindTabs`, `bindSectionNav`, `bindDisclosure`, `bindMenu`, `bindDialog`,
`openPopover`, `openSheet`, `bindSheet`, `bindCommandList`, `createTooltip`,
`createToast`, `createToastStack`, `bindCopyButton`, `copyText`, `bindArmButton`,
`bindSlider`, `bindThumb`, `bindResizer`, `bindDragSort`, `drawSparkline`,
`startViewTransition`, `prefersReducedMotion`.

Each binder returns a cleanup function; each emits a `ui-*` CustomEvent.
TypeScript declarations ship alongside (`packages/vanilla/index.d.ts`), and the
contract test fails if an export and its declaration drift apart.

`bindTabs` shows one panel at a time (`tablist` semantics). `bindSectionNav`
keeps every section on the page and reports position with
`aria-current="location"`. They are separate components on purpose — see
`docs/architecture.md` for why a single mode flag cannot serve both.

## Development

```bash
npm run showcase    # http://127.0.0.1:4173 (next free port if taken)
npm run check       # unit + manifest contract + typecheck + real Chrome assertions
npm run typecheck   # tsc --noEmit over the public declarations
```

`npm run browser` drives a real Chrome over CDP (no Playwright download), asserts
97 behaviours at desktop and phone viewports, and writes
`test-results/showcase-*.png` (light, dark, per-page, mobile, drawer, sheet).
Set `CHROME_PATH` if Chrome or Edge is not in a default location.

## Repository layout

```text
universal-ui/
├── README.md          # 简体中文 (primary)
├── README.en.md       # English (this file)
├── packages/
│   ├── core/        # index.css, tokens.css, motion.css
│   └── vanilla/     # index.js + index.d.ts — public behaviour API
├── apps/showcase/   # static showcase + dev server
├── docs/            # contract, manifest, architecture, testing, versioning
├── tests/           # node:test suites + real-browser assertions
├── skills/
│   └── universal-ui/  # installable Agent Skill (method 3)
├── skill/             # archived single-file entry, no longer discovered
├── skills.sh.json     # skills.sh directory grouping
└── .github/workflows/check.yml
```

## Runtime support

The kit targets the engine modern desktop shells already ship. It uses
`color-mix()`, `:has()`, `backdrop-filter`, native `<dialog>` and (optionally)
View Transitions, which sets the floor:

| Engine | Minimum | Used by |
|---|---|---|
| Chromium | 111 | Chrome, Edge, **WebView2** (Wails on Windows, Tauri, Electron) |
| Safari / WebKit | 16.4 | WKWebView (Wails on macOS) |
| Firefox | 121 | desktop browsers |

View Transitions degrade to an immediate switch where unsupported; nothing else
is optional. **WebView2 is the Edge engine** — a Wails or Tauri app on Windows
renders through the same Chromium that Edge uses, so check the WebView2 runtime
version before assuming the kit is at fault when a feature looks different.

## Tokens and design rules

Everything is retunable from `:root`. Font sizes and spacing in the component
layer resolve to tokens, so density changes globally. The shipped accent is a
muted Morandi blue (`#4C6B82` light / `#9DBBD2` dark) — a runnable starting
value, not a design contract. Override `--ui-accent`, `--ui-accent-soft`,
`--ui-accent-fg` and `--ui-focus` for both themes to match your project.
The block below is an example override; shipped values live in
`packages/core/tokens.css`.

```css
:root {
  --ui-text-base: 14px;   /* body size */
  --ui-space-6: 14px;     /* card and control padding */
  --ui-accent: #0f766e;   /* example override: teal */
}
```

| Group | Tokens |
|---|---|
| Type | `--ui-text-xs` … `--ui-text-2xl`, leading, weight |
| Space | `--ui-space-1` … `--ui-space-12` (4px rhythm, 2px at the small end) |
| Motion | `--ui-ease-standard`, four `--ui-duration-*` tiers, distance |
| Surface | `--ui-radius-*`, `--ui-shadow-sm`, `--ui-shadow` |
| Layers | `--ui-z-sticky`, `--ui-z-popover`, `--ui-z-modal`, `--ui-z-toast` |

- One easing curve, `var(--ui-ease-standard)`; durations only from tokens.
- Components read tokens; they never hard-code a colour, size or spacing value.
- Every component covers focus-visible, keyboard, disabled, dark theme, touch
  and `prefers-reduced-motion` — with the correct final state, not just a
  shorter animation.
- Application code consumes the kit; it does not fork a primitive.

## Documentation

| Document | Read it when |
|---|---|
| [docs/integration.md](docs/integration.md) | Consuming the kit: the public API and the invariants that break it |
| [docs/components.md](docs/components.md) | Looking for a component — this is the manifest the tests enforce |
| [docs/architecture.md](docs/architecture.md) | Understanding the layers, or choosing tabs vs section nav |
| [docs/motion.md](docs/motion.md) | Adding any animation |
| [docs/accessibility.md](docs/accessibility.md) | Changing keyboard, focus or announcement behaviour |
| [docs/testing.md](docs/testing.md) | Adding a test, or wondering why a check exists |
| [docs/host-surfaces.md](docs/host-surfaces.md) | Wrapping the kit in a desktop shell (tray, frameless window) |
| [docs/versioning.md](docs/versioning.md) | Deciding whether a change is breaking |
| [skills/universal-ui/SKILL.md](skills/universal-ui/SKILL.md) | Working with the installable Agent Skill |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Adding a component or changing behaviour |
| [TODO.md](TODO.md) | Picking up unfinished work |
| [CHANGELOG.md](CHANGELOG.md) | Upgrading |

There are no framework adapter packages by design — the contract (tokens,
`ui-*` classes, behaviour functions, `ui-*` events) is enough for any stack, and
an agent can follow it without rewriting components.

## Agent Skills

Skills live under `skills/<name>/SKILL.md`, one folder per installable unit:

```text
skills/<name>/
├── SKILL.md       # required: YAML frontmatter (name, description) + instructions
├── references/    # optional: loaded on demand
├── scripts/       # optional: executable code
├── assets/        # optional: templates and other output resources
└── examples/      # optional
```

The `skills` CLI searches several standard locations and falls back to a
recursive scan, so a `SKILL.md` elsewhere is still discoverable — the `s` is not
a hard CLI requirement. `skills/` is the path the skills.sh indexer prefers and
the convention that lets one repository hold several Skills. The folder name
must match the `name` field in frontmatter, and `description` states both the
capability and when to trigger. Detailed material belongs in `references/`
behind a pointer that says what is there and when to read it. Keep each Skill
self-contained: `npx skills add` copies only that folder, so a Skill must never
rely on files elsewhere in this repository being present.

Keep exactly one `universal-ui` Skill in the repository. Two `SKILL.md` files
sharing the same `name` make the CLI resolve to the wrong one — the earlier
single-file entry (`skill/SKILL.md`) has been folded into this Skill and
archived as `skill/LEGACY-SKILL.md`, so it is no longer discovered.

To add another Skill, create `skills/<new-name>/SKILL.md`, add its name to the
`groupings` list in `skills.sh.json`, document it here, then verify with
`npx skills add Emotion04/universal-ui --list`.

## Status

Pre-release core. Not published to npm. The public contract is the tokens,
`ui-*` classes and exported functions above; everything else may still move.
The Agent Skill is distributed from this repository via `npx skills add`, and
tracks the same version as the kit.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The one rule: **the core is CSS +
vanilla DOM — no framework, no build step, no bundler.** `npm run check` must
exit 0 before and after any change.

## License

[MIT](LICENSE) · Copyright © 2026 Emotion04. See [NOTICE.md](NOTICE.md) for
additional notices.
