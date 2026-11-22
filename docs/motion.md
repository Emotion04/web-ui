# Motion contract

The system uses one standard easing curve for ordinary UI motion: `cubic-bezier(.2, .8, .2, 1)`.

- `--ui-duration-press`: 140ms, press feedback
- `--ui-duration-standard`: 160ms, controls and surfaces
- `--ui-duration-panel`: 220ms, panels and pages
- `--ui-duration-theme`: 350ms, theme crossfade
- `--ui-motion-distance-sm`: 4px
- `--ui-motion-distance-md`: 8px

New motion must consume these tokens. Components must provide a reduced-motion result that leaves the final state correct without relying on transition completion. View-transition adapters must feature-detect the API and include a timeout/fallback.

## Sliding thumb

`bindThumb` glides a single indicator between options in 280ms using the same
`--ui-ease-standard` curve, read from the token at runtime so the curve is never
duplicated in JavaScript.

It is placed rather than animated when the control was hidden (zero width) or
has just been resized. That distinction is the whole trick: a thumb measured
while its panel was hidden has no meaningful origin, and animating from it makes
every indicator appear to fly in from the left the first time a panel opens.

## Top-level view switching

Sidebar page switches must not be an instant swap. Wrap the DOM change in
`startViewTransition(() => { … })` — the old page crossfades into the new one
on engines that support it, and the plain update runs on engines that do not.
`.ui-view:not([hidden])` also carries an entrance (fade plus a
`--ui-motion-distance-sm` rise over `--ui-duration-panel`), so a page that
mounts without a transition still lands softly.

## Sidebar gliding highlight

`bindThumb(nav).follow('[aria-current="page"]')` turns the sidebar's static
per-item highlight into a single pill that glides to the selection — placed
still on load, animated on change, disabled under reduced motion. When the
thumb exists, the `:has()` rule in the stylesheet moves the selection colour
onto the pill and clears the item's own background, so there is exactly one
selection shape. This is the same contract the segmented control and tabs use.
