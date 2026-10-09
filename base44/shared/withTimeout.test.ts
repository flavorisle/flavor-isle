import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TimeoutError, withTimeout } from './withTimeout.ts';

test('resolves with the value when the work finishes in time', async () => {
  assert.equal(await withTimeout(async () => 'ok', 50, 'fast'), 'ok');
});

test('rejects with a TimeoutError when the work never settles', async () => {
  await assert.rejects(withTimeout(() => new Promise(() => {}), 20, 'stalled'), (e) => e instanceof TimeoutError && /stalled timed out after 20ms/.test(e.message));
});

test('passes through the work error when it fails before the deadline', async () => {
  await assert.rejects(withTimeout(async () => { throw new Error('boom'); }, 50), /boom/);
});
