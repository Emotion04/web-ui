#!/usr/bin/env node
// Skills carry the contract, not the runtime. Place the CSS/JS into a host project first.
//   node scripts/fetch-kit.mjs --dest ./src/ui
//   node scripts/fetch-kit.mjs --dest ./src/ui --from /path/to/universal-ui
//   node scripts/fetch-kit.mjs --dest ./src/ui --ref v0.3.4
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const FILES = [
  'packages/core/index.css',
  'packages/core/tokens.css',
  'packages/core/motion.css',
  'packages/vanilla/index.js',
  'packages/vanilla/index.d.ts',
];
const CDN = 'https://cdn.jsdelivr.net/gh/Emotion04/universal-ui';

const argv = process.argv.slice(2);
const val = (flag, fallback = null) => {
  const i = argv.indexOf(flag);
  return i < 0 ? fallback : argv[i + 1];
};

if (argv.includes('--help')) {
  console.log(`Usage: node scripts/fetch-kit.mjs --dest <dir> [--from <repo-root>] [--ref <tag|sha|branch>] [--base <url>]

  --dest  host directory that receives the runtime files (required, overwritten)
  --from  copy from a local clone of universal-ui instead of the network
  --ref   remote ref, default main; pin to a tag or SHA for reproducible builds
  --base  remote base URL, default ${CDN}`);
  process.exit(0);
}

const dest = val('--dest');
if (!dest) {
  console.error('Missing --dest <dir>. Run with --help.');
  process.exit(1);
}

const from = val('--from');
const ref = val('--ref', 'main');
const base = val('--base', CDN);
const target = resolve(dest);
await mkdir(target, { recursive: true });

for (const file of FILES) {
  const name = file.split('/').pop();
  let body;
  if (from) {
    body = await readFile(join(resolve(from), file));
  } else {
    const url = `${base}@${ref}/${file}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}: ${url}\nNot pushed to GitHub yet? Use --from <local-clone>.`);
    }
    body = Buffer.from(await res.arrayBuffer());
  }
  await writeFile(join(target, name), body);
  console.log(`  ${name}  ${body.length} bytes`);
}

console.log(`\nRuntime ready in ${target}`);
console.log('Link index.css and import index.js from there. Keep tokens.css and motion.css beside index.css.');
