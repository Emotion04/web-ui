# Testing

Four layers. Each catches a class of defect the others cannot.

```bash
npm run check     # all four, in order; must exit 0
```

## 1. Unit — `tests/*.test.mjs`

Node's built-in runner, no dependencies. Covers logic that can be exercised
without a DOM: the view-transition runner's update-once guarantee, timeout
fallback and error propagation.

Run alone: `npm test`

## 2. Manifest contract — `tests/contract.test.mjs`

Parses `docs/components.md` and fails when documentation and code disagree:

| Assertion | Catches |
|---|---|
| Every `done` row has a class in the stylesheet | Component described but not built |
| Every named behaviour is exported | Row pointing at a function that no longer exists |
| Every `done` row appears in the showcase | Built but never demonstrated |
| Every styled class is demonstrated or exempted | New CSS nobody can see |
| Every exemption still exists in the stylesheet | Stale allowlist entries |
| Every export has a `.d.ts` declaration | Types drifting from runtime |
| Every declared type exists at runtime | Types drifting the other way |
| No duplicate manifest rows | Copy-paste errors |
| Row count floor | Half the table deleted by accident |

Exemptions live in `RUNTIME_CREATED` in that file, each with a reason. Adding
one requires justifying it in the same line.

## 3. Typecheck — `tsc --noEmit`

Validates `packages/vanilla/index.d.ts`. Only declarations are checked; the
runtime is plain JavaScript and is not type-checked.

Run alone: `npm run typecheck`

## 4. Real browser — `tests/browser-check.mjs`

Drives Chrome or Edge over the DevTools Protocol. No Playwright: the harness
speaks CDP directly, so there is nothing to download.

```bash
node tests/browser-check.mjs                 # starts the showcase if it is down
node tests/browser-check.mjs http://host:5173
CHROME_PATH=/path/to/chrome node tests/browser-check.mjs
```

When the target is `http://127.0.0.1:<port>` and nothing answers, the script
starts `apps/showcase/server.mjs` itself and stops it afterwards, so
`npm run check` needs no manual setup. Any other URL is the caller's to serve;
if it is unreachable the run fails with a clear message rather than a null
dereference deep inside the probe.

The probe navigates the way a user does — sidebar to a page, tablist to a
sub-page, mode toggle to scroll — then asserts behaviour. It also captures
screenshots.

Two coverage notes worth knowing when extending it:

- **Real pointer input for drag paths.** `bindDragSort` calls
  `setPointerCapture`, which rejects synthetic pointer ids, so its reorder path
  is driven with CDP `Input.dispatchMouseEvent` — the only way to cover it.
- **The `INFO` output channel.** Non-boolean probe results (counts, rect-read
  measurements) print as `INFO`, not pass/fail. Use them to reason about a
  threshold before pinning it into an assertion.

### Why both assertions and screenshots

They fail differently:

- **Assertions** catch logic: a focus return that stopped working, a clamped
  index, a scroll that did not happen.
- **Screenshots** catch what assertions cannot see: a `<dialog>` that is closed
  but still painted (author `display` outranks the UA `[hidden]` rule), a sheet
  rendered as a centred box (UA `margin: auto`), a thumb placed while its panel
  was hidden.

A passing suite with a wrong screenshot means the assertion was too weak. When
you find one of those, add the assertion that would have caught it.

### Writing an assertion

```js
results.descriptiveName = /* boolean */;
```

Every key must be a boolean; `false` fails the run. Rules:

- Assert the **observable outcome**, not the implementation. `scrollY > before`,
  not "the handler was called".
- Scope selectors to the control under test. A page-level query picks up the
  same component inside a hidden panel and reports a false failure.
- Wait for the effect (transitions are 140–350ms); do not assert synchronously.
- Leave the page in a known state — reset scroll, close dialogs — or the next
  assertion inherits your mess.

## Screenshots

Written to `test-results/`:

| File | Contents |
|---|---|
| `showcase-light` / `showcase-dark` | Foundations page, both themes |
| `showcase-components` / `showcase-controls` / `showcase-overlays` | Component pages |
| `showcase-scroll` | Same page in scroll navigation mode |
| `showcase-panel` / `showcase-states` / `showcase-sheet` | Tray panel, state matrix, sheet open |
| `showcase-mobile` | 390×844 |

They are baselines: look at them after any visual change. They are not
committed (see `.gitignore`).

## What is not covered

- **Contrast ratios.** Check by eye against the two theme screenshots.
- **Cross-engine rendering.** Only Chromium is exercised. WebKitGTK (Wails on
  Linux) and WKWebView (macOS) are untested.
- **Real host integration.** See `TODO.md`.
