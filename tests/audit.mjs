import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

const files = [];
for await (const file of glob('packages/**/*.{css,js,html}', { cwd: new URL('..', import.meta.url), exclude: ['node_modules/**'] })) files.push(file);
const text = await Promise.all(files.map(file => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
const joined = text.join('\n');
const forbidden = [/wails/i, /\/api\//, /agent/i, /provider/i, /gateway/i];
const hits = forbidden.flatMap(pattern => joined.match(pattern) ? [pattern.toString()] : []);
const nonMotionText = text.filter((_, index) => !files[index].endsWith('motion.css')).join('\n');
if (/cubic-bezier\(/.test(nonMotionText)) hits.push('arbitrary cubic-bezier outside motion.css');
/* The README promises component-layer type sizes resolve to tokens. Values in
   this list are deliberate optical sizes — keep it in sync with the inline
   comment next to the declaration in index.css. */
const FONT_SIZE_ALLOWLIST = new Set(['12.5px']);
const rawFontSizes = [];
text.forEach((source, index) => {
  if (!files[index].endsWith('index.css')) return;
  for (const match of source.matchAll(/font-size:\s*([\d.]+px)/g)) {
    if (!FONT_SIZE_ALLOWLIST.has(match[1])) rawFontSizes.push(`${match[1]} (${files[index]})`);
  }
});
if (rawFontSizes.length) hits.push(`raw font-size outside tokens: ${rawFontSizes.join(', ')}`);
if (hits.length) { console.error(`audit failed: ${hits.join(', ')}`); process.exit(1); }
console.log(`audit passed: ${files.length} core assets`);
