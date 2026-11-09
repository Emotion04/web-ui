# Motion contract

The system uses one standard easing curve for ordinary UI motion: `cubic-bezier(.2, .8, .2, 1)`.

- `--ui-duration-press`: 140ms, press feedback
- `--ui-duration-standard`: 160ms, controls and surfaces
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
