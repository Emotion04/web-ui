/*
 * The component manifest is executable.
 *
 * docs/components.md is the checklist. This test fails when a row marked
 * done/style names a `ui-*` class that no core stylesheet defines, or a
 * behaviour that the vanilla package does not export. That is what stops a
 * component from being "documented but missing" — the failure mode that let
 * checkboxes go absent while the manifest claimed the kit was complete.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function parseManifest() {
  const markdown = await read('docs/components.md');
  const rows = [];
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) continue;
    // Cells contain markdown emphasis (backticks around class and function
    // names); strip it so the value compares against the stylesheet verbatim.
    const cells = line.split('|').map(cell => cell.trim().replace(/`/g, ''));
    if (cells.length < 6) continue;
    const [, name, coreClass, behaviour, status] = cells;
    if (!name || name === 'Component' || /^-+$/.test(name)) continue;
    rows.push({ name, coreClass, behaviour, status });
  }
  return rows;
}

const isImplemented = status => status === 'done' || status === 'style';

test('every manifest row marked done has a class in the core stylesheet', async () => {
  const rows = await parseManifest();
  const css = await read('packages/core/index.css');
  const missing = rows
    .filter(row => isImplemented(row.status) && row.coreClass && row.coreClass !== '—')
    .filter(row => !new RegExp(`\\.${row.coreClass}(?![\\w-])`).test(css))
    .map(row => `${row.name} (.${row.coreClass})`);
  assert.deepEqual(missing, [], `missing core styles for: ${missing.join(', ')}`);
});

test('every manifest behaviour is exported by the vanilla package', async () => {
  const rows = await parseManifest();
  const js = await read('packages/vanilla/index.js');
  const names = new Set(
    rows
      .map(row => row.behaviour)
      .filter(value => value && value !== '—' && value !== 'host adapter')
      .flatMap(value => value.match(/[A-Za-z][A-Za-z0-9]*/g) ?? []),
  );
  const missing = [...names].filter(name => !new RegExp(`export (async )?function ${name}\\b|export const ${name}\\b`).test(js));
  assert.deepEqual(missing, [], `manifest names behaviour that does not exist: ${missing.join(', ')}`);
});

// These have no static markup because the behaviour creates them on demand:
// there is no tooltip until one is hovered, and no toast until one is pushed.
// Every other component must appear literally in the showcase HTML.
const RUNTIME_CREATED = new Set(['ui-tooltip', 'ui-toast', 'ui-toast-stack', 'ui-thumb']);

test('every component marked done is demonstrated in the showcase', async () => {
  const rows = await parseManifest();
  const html = await read('apps/showcase/index.html');
  const missing = rows
    .filter(row => row.status === 'done' && row.coreClass && row.coreClass !== '—')
    .filter(row => !RUNTIME_CREATED.has(row.coreClass))
    .filter(row => !html.includes(row.coreClass))
    .map(row => `${row.name} (.${row.coreClass})`);
  assert.deepEqual(missing, [], `not shown in apps/showcase/index.html: ${missing.join(', ')}`);
});

// Classes that cannot appear in static markup, with the reason each is exempt.
const NOT_STATIC = new Map([
  ['ui-thumb', 'created by bindThumb'],
  ['ui-tooltip', 'created on hover/focus'],
  ['ui-toast', 'created by createToast'],
  ['ui-toast-stack', 'created by createToastStack'],
  ['ui-toast--success', 'tone applied at runtime'],
  ['ui-toast--danger', 'tone applied at runtime'],
  ['ui-panel--floating', 'positioned by the host under the tray icon'],
  ['ui-section', 'added by bindSectionNav to anchor targets'],
]);

test('every styled class is either demonstrated or explicitly runtime-only', async () => {
  const css = await read('packages/core/index.css');
  const html = await read('apps/showcase/index.html');
  const classes = [...new Set([...css.matchAll(/\.(ui-[a-z0-9_-]+)/g)].map(match => match[1]))];
  const undemonstrated = classes
    .filter(name => !NOT_STATIC.has(name))
    .filter(name => !html.includes(name));
  assert.deepEqual(undemonstrated, [], `styled but never shown: ${undemonstrated.join(', ')}`);
});

test('every runtime-only exemption still exists in the stylesheet', async () => {
  const css = await read('packages/core/index.css');
  const stale = [...NOT_STATIC.keys()].filter(name => !css.includes(`.${name}`));
  assert.deepEqual(stale, [], `exempted class no longer styled: ${stale.join(', ')}`);
});

test('every exported function has a TypeScript declaration', async () => {
  const js = await read('packages/vanilla/index.js');
  const types = await read('packages/vanilla/index.d.ts');
  const exported = [...js.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)/gm)]
    .map(match => match[1] ?? match[2]);
  const declared = new Set(
    [...types.matchAll(/^export (?:declare )?(?:function|const|interface|type) (\w+)/gm)]
      .map(match => match[1]),
  );
  const missing = exported.filter(name => !declared.has(name));
  assert.deepEqual(missing, [], `exported without a type: ${missing.join(', ')}`);
});

test('the type file declares nothing that the runtime lacks', async () => {
  const js = await read('packages/vanilla/index.js');
  const types = await read('packages/vanilla/index.d.ts');
  const exported = new Set(
    [...js.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)/gm)]
      .map(match => match[1] ?? match[2]),
  );
  const declared = [...types.matchAll(/^export (?:declare )?(?:function|const) (\w+)/gm)]
    .map(match => match[1]);
  const orphans = declared.filter(name => !exported.has(name));
  assert.deepEqual(orphans, [], `declared but not exported: ${orphans.join(', ')}`);
});

test('every documentation link resolves', async () => {
  const { readdir } = await import('node:fs/promises');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('..', import.meta.url));

  const docs = ['README.md', 'CONTRIBUTING.md', 'TODO.md', 'CHANGELOG.md'];
  for (const name of await readdir(new URL('../docs', import.meta.url))) {
    if (name.endsWith('.md')) docs.push(`docs/${name}`);
  }

  const broken = [];
  for (const doc of docs) {
    const text = await read(doc);
    for (const match of text.matchAll(/\]\(([^)#]+\.md)\)/g)) {
      const target = resolve(root, dirname(doc), match[1]);
      try { await readFile(target); } catch { broken.push(`${doc} → ${match[1]}`); }
    }
  }
  assert.deepEqual(broken, [], `broken doc links: ${broken.join(', ')}`);
});

test('manifest has no duplicate component rows', async () => {
  const rows = await parseManifest();
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    if (seen.has(row.name)) duplicates.push(row.name);
    seen.set(row.name, true);
  }
  assert.deepEqual(duplicates, [], `duplicate rows: ${duplicates.join(', ')}`);
});

test('manifest is not silently shrinking', async () => {
  const rows = await parseManifest();
  // A floor, not a ceiling: it catches an accidental delete of half the table.
  assert.ok(rows.length >= 45, `expected at least 45 rows, found ${rows.length}`);
});
