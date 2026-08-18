import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteBackward, deleteForward } from './composer.js';

test('backspace deletes the character before the cursor', () => {
  assert.deepEqual(deleteBackward('/pock', 3), { value: '/pck', cursor: 2 });
});

test('deletion handles Chinese characters as one input character', () => {
  assert.deepEqual(deleteBackward('测试a', 2), { value: '测a', cursor: 1 });
  assert.deepEqual(deleteForward('测试a', 1), { value: '测a', cursor: 1 });
});
