# Versioning

Semantic versioning, with the public API defined by `docs/integration.md`:
`--ui-*` tokens, `ui-*` classes, and the exports of `packages/vanilla`.

## What counts as breaking

| Change | Version |
|---|---|
| Remove or rename a `ui-*` class | **major** |
| Remove a `--ui-*` token | **major** |
| Remove or rename an export | **major** |
| Change an export's required parameters, or the shape of an event's `detail` | **major** |
| Change a component's default behaviour | **major** |
| Add a token, export, class, component or optional option | **minor** |
| Change a visual value (a colour, a duration, a padding step) | **minor** |
| Fix behaviour so it matches the documented contract | **patch** |
| Fix a bug in the showcase or test harness | **patch** |

Two rules that keep "minor" honest:

1. **Additive only.** A minor release never removes anything. If a token is
   superseded, keep the old one as an alias for a release and remove it in the
   next major.
2. **Defaults are part of the contract.** Changing what a component does when
   the caller passes no options is breaking, even if the signature is unchanged.

## What is *not* covered

These may change in a minor release:

- internal file layout under `packages/`
- the showcase's markup
- test helper structure
- anything documented as "implementation detail"

If a consumer depends on an internal, that is their bug to fix — but say so
clearly in the changelog when it happens.

## Pre-1.0

`0.x` releases may break on a **minor** bump. That freedom exists to stabilise
the API, not to churn: still write the changelog entry, still explain the
migration, still keep the old form for one release where it is cheap.

Publish `0.1.0` first. Move to `1.0.0` when a real project has consumed the kit
without needing changes (see `TODO.md` item 1) — that is the point at which the
API is proven, not when the file count stops growing.

## Writing a release

1. `npm run check` — must exit 0.
2. Decide the bump from the table above.
3. Update `CHANGELOG.md`: what changed, for whom, and what to do about it. Write
   it for someone who is upgrading, not for someone reading the diff.
4. `npm version <patch|minor|major>` — this tags and bumps in one step.
5. `npm publish --access public`.
6. Verify the published tarball: `npm pack --dry-run` should list `packages/`,
   `README.md`, `NOTICE.md`, `LICENSE` and nothing else.

## Changelog style

```markdown
## 0.3.0

### Added
- `.ui-alert` with `success` / `warning` / `danger` tones.

### Changed
- `--ui-space-6` is now `12px` (was `10px`); card padding reads one step
  looser. No markup change needed.

### Fixed
- A closed sheet stayed painted: author `display` outranked the UA `[hidden]`
  rule. `[hidden]` is now `display: none !important`.
```
