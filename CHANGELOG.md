# Changelog

Not published to npm yet. Entries describe what exists, so the first release
notes can be assembled from them.

## Unreleased — backdrop contract v2

### Changed
- Under `data-ui-backdrop`, chrome surfaces (sidebar/topbar) are now **fully
  transparent** instead of carrying a 65% surface tint, with a faint
  `--ui-line` separator marking the shell/content boundary. Rationale from the
  first real consumer: a heavy chrome tint over the material reads as a
  separate colour block — the two-tone look materials are supposed to remove
  (Windows 11 Settings keeps one material and lets opaque cards carry the
  hierarchy).

### Fixed
- `docs/host-surfaces.md` no longer sends Tauri Windows hosts down a broken
  path: `titleBarStyle: "Overlay"` is macOS-only in tao ≤ 0.37 (silently
  ignored on Windows — verified against the source and in a real app). The
  Windows Tauri recipe is now caption-colour matching via
  `DwmSetWindowAttribute` on `window.hwnd()`; Electron and Tauri macOS keep
  the extension route. The frameless checklist (opt-in) documents that tao
  keeps `WS_MINIMIZEBOX | WS_MAXIMIZEBOX` on frameless windows, so the taskbar
  toggle survives `decorations: false`.

## Unreleased — window backdrop contract

### Added
- `data-ui-backdrop` on :root is the host↔kit contract for window materials
  (Windows 11 Mica/Acrylic or any host-painted backdrop): the page background
  clears so the material shows through, the shell chrome becomes a translucent
  tint, and content cards stay opaque — the readability seam is between chrome
  and content, not between the app and the desktop. `docs/host-surfaces.md`
  now documents the integrated-titlebar pattern (transparent caption via DWM,
  the route the Windows 11 system applications take) with the support matrix,
  and keeps the frameless path as opt-in with its required style bits
  (`WS_MINIMIZEBOX | WS_MAXIMIZEBOX`) spelled out.
- The audit now scans the whole repository for the upstream product name and
  the component layer for host-stack vocabulary, so publishing keeps both
  clean by construction.

## Unreleased — interaction polish

### Added
- Top-level pages enter with a fade-and-rise (`.ui-view:not([hidden])`, 220ms
  panel duration), so a sidebar switch no longer reads as an instant swap. The
  showcase wraps its page switch in `startViewTransition`, which the kit always
  exported but never demonstrated.
- The sidebar can carry a gliding highlight:
  `bindThumb(nav).follow('[aria-current="page"]')` moves one pill between rows;
  when the thumb exists, a `:has()` rule hands the selection colour to the pill
  so there is exactly one selection shape.

### Changed
- The compact topbar shares the page background instead of drawing a divider:
  translucent `--ui-bg` plus `backdrop-filter` keeps it legible over scrolled
  content without a hard line. `.ui-popover` gained a solid `background`
  fallback ahead of its `color-mix`, so engines without `color-mix` render a
  solid surface instead of a transparent one.

### Fixed
- Entrance animations kept `fill: both`, and a filled transform animation
  leaves an identity matrix on computed style even when the last keyframe is
  `transform: none` — the view silently became the `offsetParent` of its
  contents and every `offsetTop` inside it was wrong after the first page
  switch. Entrances no longer fill; the trap is inherent to filled transforms.

## Unreleased — palette

### Changed
- Default accent retuned from high-saturation indigo to a muted Morandi blue
  (`#4C6B82` light / `#9DBBD2` dark), with matching `--ui-accent-soft`,
  `--ui-accent-fg` and `--ui-focus`. White-on-accent contrast is 5.63:1 (AA).
  It is documented as a replaceable starting value, not a design contract.

## Unreleased — performance pass (measured with CDP, not guessed)

No polling anywhere: the kit has no `setInterval`, no `requestAnimationFrame`
loop and no busy wait. Every timer is a one-shot tied to a visible state.

### Fixed
- `setTheme` leaked one `transitionend` listener per theme change. `{ once: true }`
  only detaches when the event fires; the timeout removed the transition class
  first, so no transition ended and the listener stayed for the session.
  Measured: 5 toggles added 5 listeners and removed 0. Both paths now settle
  through one idempotent function.
- `bindResizer` wrote `localStorage` on every `pointermove` — a synchronous,
  disk-backed write per frame for the whole drag. The width is now held in
  memory during the gesture and committed once on release (and on dispose, so
  an interrupted drag still restores). Dragging no longer writes at all.
- `openPopover` repositioned synchronously on every `scroll` and `resize` event,
  each run forcing two layout reads. A burst of 60 scroll events caused 120
  reads; coalescing through `requestAnimationFrame` makes it 2.
- `bindDragSort` ran `elementFromPoint`, read a rect and cleared every item's
  drop marker on every pointer frame. It now skips unchanged pointer positions
  and only touches the item whose marker actually changes.
- `setPointerCapture` in the resizer and drag-sort handlers could throw
  `NotFoundError` (synthetic events, a cancelled touch) and abort the handler
  before `preventDefault`. Capture is now best-effort; the drag proceeds.

### Changed
- The theme crossfade no longer transitions the `background` shorthand, which
  pulled `background-image` and gradients into every element's transition. The
  property list is colours only.
- `setTheme(theme, { animate: false })` switches instantly. The crossfade still
  re-resolves style for the whole tree (536 elements in the showcase, ~100ms);
  a host with a very large DOM should use this to skip it.

## Unreleased — compact-shell support and hardening

### Added
- `.ui-topbar` + the compact shell: below the 760px breakpoint the sidebar is
  hidden and a sticky hamburger bar opens the same page list as a left sheet
  (`.ui-sheet[data-side="left"]`, which already existed). Desktop output is
  unchanged — the topbar is `display: none` above the breakpoint and a browser
  assertion fails if that ever regresses.
- `bindSheet`: the declarative counterpart of `openSheet`. Trigger buttons open
  a sheet repeatedly without stacking listeners, `[data-ui-close]` buttons close
  it, and each open closes the previous run first.
- Browser assertions for the compact shell (topbar visible, sidebar hidden, no
  horizontal overflow, drawer opens, closes on navigation, switches view) plus
  desktop guards (topbar hidden, no overflow). 97 assertions total, was 74.
- Drag sort is exercised with real CDP mouse input — the only way to reach its
  `setPointerCapture` path — covering the drop marker, the reorder, the emitted
  order and state cleanup after the drop.
- `.github/workflows/check.yml`: installs Chromium, resolves `CHROME_PATH`, runs
  `npm run check` on every push and pull request.

### Fixed
- `bindThumb` silently produced a mis-anchored thumb when the control was
  `position: static`: it now sets `relative` (which does not move the element in
  the flow) and warns, instead of anchoring to an unrelated ancestor.
- Tooltips stayed where they were while the page scrolled under them, floating
  over unrelated content. They now hide on scroll, which is what native `title`
  does and avoids per-frame repositioning.

### Changed
- `tests/audit.mjs` rejects raw `font-size: Npx` in the component layer, with an
  explicit allowlist for deliberate optical sizes. `.ui-kbd` moved to
  `--ui-text-xs`; `.ui-subnav__item`'s 12.5px is allowlisted and commented.
- README no longer claims every value is a token; it names the physical ones.

## Unreleased — correctness pass (verified in real Chromium via CDP probes)

### Fixed
- Hovering a primary or danger button collapsed it to the default hover style:
  `.ui-button:hover` (0,2,0) outranked the variant rules (0,1,0). Filled
  variants now carry their own `:hover`, nudged 10% toward the text colour.
- The webkit slider thumb lost its `margin-top` entirely: `-var(--ui-space-2)`
  is invalid CSS and the parser dropped the declaration, leaving the 14px thumb
  top-aligned to the 4px track. Now `-5px`, the geometric centre.
- Stacked toasts all landed on the same viewport coordinates: `.ui-toast` is
  `position: fixed`, which ignores the flex column. Stack children are in-flow
  now, and `createToast` without an explicit container uses a shared
  module-level stack instead of appending fixed toasts to `<body>`.
- The dark palette ignored the OS preference: tokens only reacted to
  `data-ui-theme`. `prefers-color-scheme: dark` now applies the same palette
  unless `data-ui-theme` pins light or dark; `setTheme('system')` really means
  system now.
- Text inputs, textareas, selects and switches had no disabled style.
- The loading button froze at a half-drawn frame under `prefers-reduced-motion`
  (same freeze the spinner got a fix for). Animation is dropped; the static
  partial arc remains.
- The drag-sort handle lost touch drags to scrolling: no `touch-action: none`,
  unlike `.ui-resizer`.

### Changed
- The select chevron colour moved from a hard-coded SVG stroke into
  `--ui-select-arrow`, themed per palette.
- Toasts use `--ui-z-toast` (50) instead of `--ui-z-modal` (40); the token
  existed but was unused.
- `openSheet` now wires `[data-ui-close]` buttons, matching `bindDialog`.
- `initialFocus` in the declarations accepts an element as well as a function,
  as the implementation always has.
- Removed the dead `.ui-list-item` selector from `motion.css`.

## 0.2.0 — navigation, tokens, platform support

### Added
- `.ui-section-nav` + `bindSectionNav`: in-page navigation where every section
  stays visible and the nav reports position with `aria-current="location"`.
  Deliberately a separate component from `bindTabs`; a single mode flag would
  produce a state where one item is "selected" while all panels are on screen.
- `.ui-thumb` + `bindThumb`: one indicator that glides between options in 280ms.
  It is *placed* rather than animated when its control was hidden or resized.
- `.ui-subnav`: the sidebar's secondary list — a 1px rail plus pill highlight.
- `.ui-panel`: the compact, content-sized surface a tray icon opens.
- `.ui-alert`, `.ui-status`, `.ui-kbd`, `.ui-divider`, `.ui-tile`,
  `.ui-spinner`, `.ui-ring`, `.ui-field__error`.
- `.ui-text-start` / `-center` / `-end`, `.ui-clamp-2`, `.ui-icon`, `.ui-link`.
- Button `--sm` / `--lg` / `--loading`, input `--sm`, badge `--warning` / `--accent`.
- `prefers-contrast`, `forced-colors` (Windows High Contrast), safe-area insets,
  `overscroll-behavior`.
- Hand-written TypeScript declarations for all 25 exports, checked by `tsc`.

### Changed
- **Every font size and spacing value is now a token.** Previously the type and
  space scales existed but were unused, so changing a token had no effect.
  Consumers can retune density globally from `:root`.
- Card elevation uses `--ui-shadow-sm`.

### Fixed
- A closed `<dialog>` kept rendering: author `display` outranks the UA rule for
  `[hidden]`. `[hidden]` is now `display: none !important`.
- A sheet rendered as a centred box: a native `<dialog>` carries UA
  `margin: auto` and a default border.
- Clicking a section scrolled to the top instead of to the section: the sidebar
  query matched the page containers too, so every click re-ran navigation.
- Binding one dialog twice installed two focus traps.
- `bindArmButton` destroyed child nodes when swapping its label.
- The slider published `--ui-range-fill` but no rule consumed it, so the track
  had no filled portion.
- Menu items all had `tabindex="0"`, so `Tab` walked through every entry.
- The spinner froze at a half-drawn frame under `prefers-reduced-motion`.

## 0.1.0 — initial core

### Added
- Tokens: light, dark, high-contrast; radius, shadow, focus, font, z-layers.
- Motion: one easing curve, four duration tiers, reduced-motion handling.
- Primitives: shell, sidebar, page header, toolbar, grid, stack, cluster,
  breadcrumb, card, row, badge, chip, avatar, empty state, skeleton, meter,
  stat tile, sparkline.
- Controls: button, icon button, input, textarea, select, checkbox, radio,
  switch, segmented, slider.
- Disclosure: tabs, disclosure, menu (checkbox/radio items), popover, dialog,
  sheet, tooltip, toast, toast stack, command list, copy button, arm button.
- Structure: resizer, drag sort, scroll container, screen-reader only.
- Showcase with six pages, 74 browser assertions, 15 unit/contract tests.
