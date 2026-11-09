# Contributing

## Before you change anything

```bash
npm install
npm run check      # unit + contract + typecheck + real browser
npm run showcase   # http://127.0.0.1:4173
```

`npm run check` must exit 0 before and after your change. It is the contract,
not a suggestion.

## The one rule

**The core is CSS + vanilla DOM. No framework, no build step, no bundler.**

If a change needs React, Vue, a compile step or a dependency at runtime, it
belongs in the consuming project, not here. The only development dependencies
are the test runner (built into Node) and TypeScript for checking declarations.

## Adding a component

Four files, in this order. The checks fail if you skip one.

1. **Style it** in `packages/core/index.css`. Use `--ui-*` tokens for colour,
   size, spacing, radius, shadow, duration and easing. A literal `px` for
   spacing, a raw `font-size` outside the audit allowlist, or any
   `cubic-bezier`, fails the audit.

2. **Give it behaviour** in `packages/vanilla/index.js` if it needs any. The
   function must:
   - return a disposer
   - guard its argument types with a `TypeError`
   - emit a `ui-*` `CustomEvent` for anything a consumer might react to
   - work without the caller knowing about internal state

3. **Declare it** in `packages/vanilla/index.d.ts`. The contract test fails if an
   export has no declaration.

4. **Show it** in `apps/showcase/index.html`, in every state it can be in:
   default, disabled, dark, and any failure state. The coverage test fails on a
   styled class that never appears in the showcase — unless it is listed in
   `RUNTIME_CREATED` in `tests/contract.test.mjs` with a reason.

5. **Add a row** to `docs/components.md`. The contract test parses that table.

6. **Assert it** in `tests/browser-check.mjs`: the behaviour, not the pixels.
   If the component has a state that is easy to get subtly wrong (a focus
   return, a scroll, a clamped index), assert exactly that and say why in a
   comment.

## Style rules

- **One easing curve.** `var(--ui-ease-standard)`. Durations from
  `--ui-duration-*` only.
- **Tokens, not literals.** If no token fits, add a token.
- **Every interactive component ships**: `:focus-visible`, keyboard operation,
  disabled state, dark theme, and a `prefers-reduced-motion` path that lands on
  the correct final state.
- **State lives in the DOM.** The attribute is the source of truth; do not keep
  a parallel copy in JavaScript.
- Comments explain *why*, in the code's own voice. Do not narrate what the next
  line does.

## What breaks users

Treat these as breaking and read `docs/versioning.md` before doing them:

- renaming or removing a `ui-*` class
- renaming or removing an export, or changing its parameters in an
  incompatible way
- removing a `--ui-*` token
- changing what an event's `detail` contains

Adding a token, a component, an option (with a default) or a class is always
fine.

## Commit and review

- One logical change per commit; the message says what changed for the user, not
  which file was edited.
- Run `npm run check` before each commit.
- A change to behaviour needs a change in `tests/browser-check.mjs`. A change
  that no test can observe is usually a change nobody needed.

## Do not

- Do not add a dependency to make something easier.
- Do not copy a primitive into the showcase or a host project to work around a
  limitation — fix the primitive.
- Do not disable a check to get green. Fix the cause or record the exception
  with a reason in the file that enforces it.
