import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

/* Two scopes, two rules.
   - The component layer (packages/**) may not name any host stack, backend
     surface or upstream product, and may not invent curves or raw sizes.
   - The whole repository (docs, skills, apps, READMEs) may discuss host
     frameworks — that is what integration docs are for — but the upstream
     product name may not appear anywhere: the kit ships as an independent
     design system. */
const coreFiles = [];
for await (const file of glob('packages/**/*.{css,js,html}', { cwd: new URL('..', import.meta.url), exclude: ['node_modules/**'] })) coreFiles.push(file);
const repoFiles = [...coreFiles];
for await (const file of glob('{docs,apps,skills}/**/*.{md,js,html,json}', { cwd: new URL('..', import.meta.url), exclude: ['node_modules/**'] })) repoFiles.push(file);
for (const doc of ['README.md', 'README.en.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'NOTICE.md', 'TODO.md', 'skills.sh.json']) repoFiles.push(doc);

const read = files => Promise.all(files.map(file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
const coreText = await read(coreFiles);
const repoText = await read(repoFiles);

const hits = [];
const scan = (scope, sources, label) => {
  const joined = sources.join('\n');
  for (const pattern of scope) {
    if (pattern.test(joined)) hits.push(`${pattern} (${label})`);
  }
};

scan([/magpie/i], repoText, 'repository');
scan([/wails/i, /\/api\//, /agent/i, /provider/i, /gateway/i], coreText, 'component layer');

const nonMotionText = coreText.filter((_, index) => !coreFiles[index].endsWith('motion.css')).join('\n');
if (/cubic-bezier\(/.test(nonMotionText)) hits.push('arbitrary cubic-bezier outside motion.css');

/* The README promises component-layer type sizes resolve to tokens. Values in
   this list are deliberate optical sizes — keep it in sync with the inline
   comment next to the declaration in index.css. */
const FONT_SIZE_ALLOWLIST = new Set(['12.5px']);
const rawFontSizes = [];
coreText.forEach((source, index) => {
  if (!coreFiles[index].endsWith('index.css')) return;
  for (const match of source.matchAll(/font-size:\s*([\d.]+px)/g)) {
    if (!FONT_SIZE_ALLOWLIST.has(match[1])) rawFontSizes.push(`${match[1]} (${coreFiles[index]})`);
  }
});
if (rawFontSizes.length) hits.push(`raw font-size outside tokens: ${rawFontSizes.join(', ')}`);

if (hits.length) { console.error(`audit failed: ${hits.join(', ')}`); process.exit(1); }
console.log(`audit passed: ${coreFiles.length} core assets, ${repoFiles.length} repository files`);
