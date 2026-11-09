# Architecture

## Layers

```text
packages/core      CSS only. Tokens, motion, reset, primitives, components.
                   No framework, no build step, no DOM behaviour.
packages/vanilla   DOM behaviour. Every export returns a cleanup function.
                   Never calls a product API; emits ui-* CustomEvents.
apps/showcase      The visual and behavioural contract, exercised as pages.
tests              Unit tests, manifest contract, real-browser assertions.
docs               Integration contract, motion rules, host surfaces.
```

The boundary is deliberate: CSS can be consumed by any stack with one `<link>`,
and behaviour is opt-in per component. A project that only needs styling never
loads the JavaScript.

## Why there are no framework adapters

An adapter has to track every framework's release cycle and adds nothing the
contract does not already give you:

- state lives in the DOM attribute, not in a component instance
- every behaviour returns a disposer, which maps to `useEffect` cleanup,
  `onUnmounted`, `onDestroy`
- communication is a DOM `CustomEvent`, which every framework can listen to

`docs/integration.md` states the three rules that keep animations and focus
intact under a virtual DOM: keep animating nodes mounted, keep keys stable, and
do not mirror DOM state into framework state.

## The manifest is executable

`docs/components.md` lists every component with its class and behaviour.
`tests/contract.test.mjs` parses it and fails when:

- a component marked `done` has no matching class in the core stylesheet
- a named behaviour is not exported
- a component marked `done` is absent from the showcase
- the table shrinks below its expected size

This exists because a component was once described as complete while being
entirely missing. Documentation that cannot fail is not a contract.

## Surfaces

| Surface | Component | Notes |
|---|---|---|
| Page | `.ui-view` | Switched by the sidebar; never scrolled into place |
| Sub-page | `.ui-tabs` / `.ui-tabpanel` | Switched by the tablist inside a page |
| Sidebar sub-list | `.ui-subnav` | The 1px rail plus pill highlight |
| Overlay | `.ui-dialog`, `.ui-sheet` | Native `<dialog>`; platform focus trap and inert background |
| Anchored | `.ui-popover`, `.ui-menu` | Focus returns to the trigger |
| Icon panel | `.ui-panel` | Compact, content-sized; the host anchors it under the tray icon |

Navigation layers are distinct on purpose: a sidebar that scrolls the current
page is indistinguishable from a broken link, and it makes "where am I"
ambiguous.

### Tabs or section nav

Two ways to present several sections. They are separate components rather than
one component with a mode flag, because their accessibility contracts differ:

| | `bindTabs` | `bindSectionNav` |
|---|---|---|
| Content | One panel visible | Every section visible |
| Roles | `tablist` / `tab` / `tabpanel` | `nav` with buttons/links |
| State | `aria-selected` | `aria-current="location"` |
| Click means | Switch content | Move the page |
| Use when | Sections are alternatives | Sections are read in sequence |

A single flag cannot express both: with all panels visible, `aria-selected` would
claim one is chosen while the other three are equally on screen, and the keyboard
model (roving focus among tabs) stops matching what the user sees.

`bindSectionNav` also marks the current section as the user scrolls, and adds
`scroll-margin-top` so a jumped-to heading clears a sticky header.

## Motion and the thumb

One curve (`--ui-ease-standard`) and four duration tiers. `bindThumb` glides a
single indicator element between options and reads the easing from the token at
runtime, so no curve is duplicated in JavaScript — the extraction audit fails
the build if one appears outside `motion.css`.

The thumb is *placed* rather than animated when its control was hidden or has
just been resized: a width measured while the panel was hidden has no meaningful
origin.

## Host boundary

The kit owns everything the web engine draws. The host owns the window, the tray
icon and the OS menus. A tray **click** usually opens a second small webview —
that surface is `.ui-panel` and belongs here. A tray **right-click** is a native
menu that cannot be styled; keep one data description and render it twice. See
`docs/host-surfaces.md`.
