import test from 'node:test';
import assert from 'node:assert/strict';
import { startViewTransition } from '../packages/vanilla/index.js';

function fakeDocument(start) {
  return { startViewTransition: start };
}

test('view transition calls update exactly once on normal completion', async () => {
  let calls = 0;
  const doc = fakeDocument(update => ({ finished: Promise.resolve().then(update) }));
  await startViewTransition(() => { calls++; }, { documentRef: doc, timeout: 10 });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(calls, 1);
});

test('view transition timeout does not repeat an already-started update', async () => {
  let calls = 0;
  const doc = fakeDocument(update => {
    update();
    return { finished: new Promise(() => {}) };
  });
  await startViewTransition(() => { calls++; }, { documentRef: doc, timeout: 5 });
  assert.equal(calls, 1);
});

test('unsupported transition API falls back to update', async () => {
  let calls = 0;
  await startViewTransition(() => { calls++; }, { documentRef: {}, timeout: 10 });
  assert.equal(calls, 1);
});

test('update exception is propagated from fallback path', async () => {
  const expected = new Error('update failed');
  await assert.rejects(startViewTransition(() => { throw expected; }, { documentRef: {}, timeout: 10 }), expected);
});
