# Handoff / TODO

Written for whoever picks this up next — human or agent. Read
`docs/architecture.md` and `docs/components.md` first; this file is about what is
*not* finished and what to watch out for.

## State at handoff (2026-10-30)

Repository: `D:\CCode\universal-ui` (moved out of `~/.codex/projects`, which is a
tool's config directory, not a workspace). Two commits; no remote yet.

The project contains no absolute paths, so it runs from any directory.

```text
packages/core/      ~700 lines CSS  — tokens, motion, primitives, components
packages/vanilla/  ~1250 lines JS   — 26 exports, each returns a disposer
packages/vanilla/index.d.ts         — hand-written, typechecked
apps/showcase/       runnable state matrix, 6 pages, 2 navigation modes
tests/               15 unit + contract tests, 97 real-browser assertions
.github/workflows/   check.yml — Chromium install + npm run check
```

`npm run check` = unit → audit → typecheck → browser. All four pass.

**The kit has never been consumed by a real project.** Everything is verified
inside its own showcase. That is the single largest unknown.

### Done since the previous handoff

- Correctness pass, each item verified in real Chromium before and after: button
  variant hover, slider thumb centring, toast stacking, system dark preference,
  disabled text controls and switches, reduced-motion loading button, drag
  handle `touch-action`, select chevron token.
- Compact shell: `.ui-topbar` + a left-sheet drawer below 760px, driven by the
  new `bindSheet`. Asserted at both viewports; desktop output is unchanged.
- `bindThumb` self-heals a static control; tooltips hide on scroll.
- Audit now enforces token-only font sizes; CI exists.

## Performance notes

Measured with CDP `Performance.getMetrics` and instrumented `localStorage` /
`getBoundingClientRect` counters, not estimated. Current state:

| Path | Cost | Note |
|---|---|---|
| Resizer drag | 1 layout per frame | Inherent: the width changes every frame |
| Resizer storage | 1 write per gesture | Was 1 per frame |
| Drag sort | 0 forced layouts while stationary | `elementFromPoint` only on pointer move |
| Popover + scroll burst | 1 reposition per frame | Was 1 per event (60 events → 120 rect reads) |
| Slider input | 1 style recalc per input | No layout |
| Theme toggle | ~100ms for 536 elements | Whole-tree style resolution; see below |

The theme crossfade is the only genuinely expensive operation left. It is not a
leak and not per-frame — it is a one-off cost that scales with DOM size, because
`.ui-theme-transition *` puts a colour transition on every element. On a page
with thousands of rows this becomes visible; `setTheme(theme, { animate: false })`
skips it. Do not widen that selector, and do not add `background` back to the
property list.

## Open tasks, highest value first

### 1. Verify in a real host project

Not a code task — an acceptance task. Take the smallest possible host (a Wails
or Tauri window, or a Vite page), import `packages/core/index.css` and two
behaviours, and confirm:

- the stylesheet applies without a reset fight (`body` margin, `box-sizing`)
- `bindDialog` traps focus inside the host's webview
- the sliding thumb measures correctly when the container starts hidden
- dark theme follows the OS preference

Record the result in this file. If something breaks, fix it here rather than
patching around it in the host — that is the whole point of the exercise.

### 2. Publish to npm

`package.json` is ready (`exports`, `files`, `sideEffects`, `types`). What is
missing:

- a version decision (see `docs/versioning.md`; 0.1.0 is correct for now)
- `npm publish --access public` from a clean tree
- confirm the published tarball contains `packages/`, `README.md`, `NOTICE.md`,
  `LICENSE` and nothing else

### 3. CI — done

`.github/workflows/check.yml` installs Chromium, resolves `CHROME_PATH` from the
Playwright cache and runs `npm run check`. Two caveats: it has never run on a
real runner (no remote yet), and the screenshots it writes are artifacts, not a
compared baseline — that is task 4.

### 4. Per-component state matrix

Screenshots today are page-level (`test-results/showcase-*.png`). A regression
in one component's disabled state would not be visible. The work: render each
component in its own page at every state (default / hover / active /
focus-visible / disabled / loading / dark / reduced-motion) and shoot each.

### 5. RTL — deliberate non-goal

Not supported, and **not half-supported by accident**. Converting the 13
physical CSS properties alone would produce a broken half-state. If RTL is ever
required, all of this has to move together:

| File | What computes physical coordinates |
|---|---|
| `packages/core/index.css` | `text-align: left` ×7, `left: 0`, `left: 3px` (switch knob), `padding-right` + `background-position: right` (select arrow) |
| `packages/vanilla/index.js` → `bindThumb` | `translateX(offsetLeft)` |
| `packages/vanilla/index.js` → `openPopover` | `rect.left`, `rect.right - width` |
| `packages/vanilla/index.js` → `bindResizer` | `clientX - rect.left` |
| `packages/vanilla/index.js` → `drawSparkline` | x axis runs left to right |

Alignment utilities (`.ui-text-start/-center/-end`) are direction-relative and
safe to use today.

### 6. Smaller items

- **Theme presets.** Only light and dark exist. A preset is a token set on
  `:root`; no component changes needed.
- **Icon set.** `.ui-icon` is a contract, not a library. Consumers bring icons.
  Keep it that way unless a project asks.
- **Command list grouping.** No group headers inside `.ui-command` yet.
- **Toast progress / pause on hover.** `createToast` auto-dismisses on a timer;
  hovering does not pause it.

### 7. Android / touch hosts

The kit is plain web code and has no Windows dependency, so an Android WebView
(Capacitor, Wails v3) renders it with the same Chromium the desktop shells use.
What is now in place: the compact shell below 760px, `touch-action: none` on the
drag handle and resizer, pointer-based drag sort, and `dvh`-free fixed overlays.

What is still unverified or missing for a phone host:

- **No real Android host has run it.** Same unknown as task 1, different engine
  wrapper.
- **Sub-navigation stays out of the drawer.** `.ui-subnav` lives in the sidebar
  only; a narrow implementation is expected to surface sub-pages in-page, as the
  Components page does with its tablist. If a host needs a second level in the
  drawer, that is a new component, not a CSS tweak.
- **Hover-only affordances** (`.ui-tooltip` on hover, hover-based menu previews)
  have no touch equivalent. Tooltips also show on focus, so a host should bind
  them to focus-visible targets.
- **Safe areas** are handled for the shell and the toast stack, not for the
  drawer's inside edges.

## Traps discovered while building this

Recorded because each cost real debugging time and would bite again.

1. **Author styles outrank the UA rule for `[hidden]`.** A component that sets
   `display` stays visible when `hidden` is set. Fixed globally with
   `[hidden] { display: none !important; }`. Do not remove that rule.
2. **`<dialog>` carries UA `margin: auto` and a default border.** A sheet must
   reset both, and scope `display` to `[open]`.
3. **`getComputedStyle`/`Attribute` selectors inside a view container.** Binding
   `[data-view]` matched the page sections as well as the sidebar buttons, so
   every click inside the page re-ran navigation and scrolled to the top.
   Scope queries to the control, not the page.
4. **A `.ui-tabpanel` demo inside an article nested inside a panel.** A
   descendant selector picked up the demo's panels. Use `>` when the component
   owns its children.
5. **`Read-Host`-style EOF loops** do not apply here, but the equivalent:
   `IntersectionObserver` fires for panels that were hidden at bind time, so a
   thumb placed while hidden has no meaningful origin. Place, do not animate.
6. **`CDP send` already unwraps `message.result`.** `await cdp.send('Runtime.evaluate', …)`
   resolves to `{ result: { value }, exceptionDetails }`, so the value is at
   `response.result.value`. One extra `.result` yields `undefined`, the probe
   returns `{}`, and the assertions vanish silently — the run reports success
   with fewer checks. Count the assertions when adding a batch.
7. **A third child in a two-column grid.** `.ui-shell` is `232px minmax(0,1fr)`;
   an extra visible child (the topbar) becomes a grid item and pushes `.ui-main`
   onto its own row. `display: none` removes it from layout — but only while
   that rule wins, which is why `desktopTopbarHidden` is asserted at the desktop
   viewport rather than trusted.
8. **`-var(--x)` is not valid CSS.** A negative custom property needs
   `calc(var(--x) * -1)`; the bare form is silently dropped by the parser, which
   is why the slider thumb had no `margin-top`. Check CSSOM rules, not just the
   rendered element, when a declaration seems ignored.
9. **`position: fixed` escapes a flex column.** The toast stack laid its children
   out with flex, but every fixed child resolved to the same viewport corner, so
   stacked toasts overlapped exactly. In-flow children restore the column.
10. **A `once` listener is not a cleanup guarantee.** It detaches when the event
    fires — if nothing ever fires it, it stays forever. Any listener paired with
    a timer needs one idempotent teardown called from both sides.
11. **`requestAnimationFrame` does not run when the page is not painting.** A
    probe that awaits rAF under automation can hang or read a stale value; assert
    the synchronous half of a coalescing contract instead, and treat the
    post-frame value as diagnostic.

## Before you hand this on again

```bash
npm run check      # must exit 0
npm run showcase   # open it, click through all six pages, both nav modes
```

Then update the state block at the top of this file.
