# Accessibility contract

Each component below has a minimum. A change that removes any of it is a
regression, even if it looks better.

## Keyboard

| Component | Keys |
|---|---|
| Any button / link | `Enter`, `Space` — native. No custom keydown handler that also fires on click |
| switch | `Space` / `Enter` via the native button; the handler must not add a second toggle |
| segmented, tabs | `←` `→` `↑` `↓` move and select; `Home` `End` jump; disabled items are skipped |
| menu | `↑` `↓` `Home` `End` move; `Enter` / `Space` activate; typeahead; `Esc` closes |
| command list | `↑` `↓` `Home` `End` move the highlight; `Enter` chooses; `Esc` dismisses; typing filters |
| dialog | `Tab` cycles inside; `Shift+Tab` reverses; `Esc` closes |
| popover | `Esc` closes and returns focus; `Tab` leaves and closes; arrows move between items |
| resizer | `←` `→` resize by `step`; `Home` `End` jump to min/max |

Roving tabindex is required for tabs, segmented and menu: exactly one item is
reachable with `Tab`. Leaving the rest at the default `0` makes `Tab` walk
through every entry instead of leaving the control.

## Announcement

| Component | Contract |
|---|---|
| switch | `role="switch"` + `aria-checked` |
| segmented | `role="group"`; `aria-pressed` per item |
| tabs | `role="tablist"` / `tab` / `tabpanel`; `aria-selected`; panel linked by `aria-controls` |
| section nav | `<nav>` with buttons; `aria-current="location"` — **not** `aria-selected` |
| dialog | `aria-labelledby` + `aria-describedby`; a native `<dialog>` does not associate its own heading |
| alert dialog | `role="alertdialog"`; initial focus on the safe action |
| popover / menu | `aria-expanded` on the trigger, `aria-controls` to the panel; `menuitemcheckbox` / `menuitemradio` carry `aria-checked` |
| command list | `role="combobox"` on the input, `aria-activedescendant` to the highlighted option, `aria-expanded="true"` |
| checkbox group | parent gets `aria-checked="mixed"` when some children are on |
| tooltip | `aria-describedby` on the anchor |
| toast | `role="status"`; `role="alert"` for danger |
| loading | `role="status"` on the spinner with an accessible label |

## Focus management

- **Dialog**: remember the opener, move focus inside on open, restore to the
  opener on close. Binding a dialog twice installs two traps — pass every opener
  through one `bindDialog` call.
- **Popover / menu**: restore focus to the trigger when dismissed with `Esc`.
  Do not restore on `Tab`; that would fight the user.
- **Tabs / section nav**: focus stays on the control that was activated. Do not
  move focus into the panel unless the panel is a form the user must fill.

## Colour and motion

- Every state must be distinguishable **without colour**. Status text says what
  the colour says.
- `prefers-reduced-motion: reduce` must land on the correct final state. A
  frozen half-drawn spinner is worse than none — the spinner switches to a
  static partial ring.
- `forced-colors: active` (Windows High Contrast): borders and the focus ring
  are re-declared in system colours. Without this, controls lose their outline
  entirely, because the OS discards author colours.
- Contrast: body text and control labels meet 4.5:1 on every surface they sit
  on, in both themes. `--ui-control-fg` exists specifically because `--ui-fg-muted`
  did not.

## Pointer and touch

- Touch targets are at least 44×44 where the layout allows; `.ui-button` is
  `min-height: 42px` at the `--lg` size.
- Hover-only affordances must have a non-hover path. Nothing important is
  revealed only on `:hover`.
- Drag interactions (`bindResizer`, `bindDragSort`) must also work with the
  keyboard or provide an equivalent control.

## How this is verified

`tests/browser-check.mjs` asserts focus return, initial focus, roving tabindex,
`aria-current`, `aria-checked="mixed"`, Escape dismissal and the dialog's
accessible name. It does not measure contrast — do that by eye against the two
theme screenshots in `test-results/`.
