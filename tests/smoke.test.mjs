import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('core exposes motion and reduced-motion contracts', async () => {
  const motion = await readFile(new URL('../packages/core/motion.css', import.meta.url), 'utf8');
  assert.match(motion, /--ui-ease-standard/);
  assert.match(motion, /prefers-reduced-motion/);
  assert.match(motion, /--ui-duration-press/);
});

test('showcase is framework and CDN independent', async () => {
  const html = await readFile(new URL('../apps/showcase/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /href="\/core\/index\.css"/);
  const js = await readFile(new URL('../apps/showcase/showcase.js', import.meta.url), 'utf8');
  assert.match(js, /from '\/vanilla\/index\.js'/);
  assert.doesNotMatch(js, /https?:\/\//);
});
