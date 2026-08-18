import assert from 'node:assert/strict';
import test from 'node:test';
import { completeInput, suggestionsForInput } from './commands.js';

const slugs = ['two-sum', 'valid-brackets', 'max-profit'];

test('completes a unique slash command', () => {
  assert.equal(completeInput('/sub', slugs), '/submit ');
  assert.equal(completeInput('/te', slugs), '/test ');
});

test('completes problem and language arguments', () => {
  assert.equal(completeInput('/pick tw', slugs), '/pick two-sum ');
  assert.equal(completeInput('/lang c', slugs), '/lang cpp ');
  assert.equal(completeInput('/topic 滑', slugs, ['数组', '滑动窗口']), '/topic 滑动窗口 ');
  assert.equal(completeInput('/learn 滑', slugs, [], ['数组', '滑动窗口']), '/learn 滑动窗口 ');
  assert.equal(completeInput('/next 双', slugs, [], ['数组', '双指针']), '/next 双指针 ');
  assert.equal(completeInput('/topic 数组 m', slugs, ['数组']), '/topic 数组 medium ');
  assert.equal(completeInput('/pick two-sum c', slugs), '/pick two-sum cpp ');
});

test('suggests matching commands and arguments', () => {
  assert.equal(suggestionsForInput('/doc', slugs)[0]?.startsWith('/doctor'), true);
  assert.deepEqual(suggestionsForInput('/random m', slugs), ['/random medium']);
  assert.deepEqual(suggestionsForInput('/topic 数组 e', slugs, ['数组']), ['/topic 数组 easy']);
  assert.deepEqual(suggestionsForInput('/learn 数', slugs, [], ['数组', '滑动窗口']), ['/learn 数组']);
  assert.deepEqual(suggestionsForInput('/next 滑', slugs, [], ['数组', '滑动窗口']), ['/next 滑动窗口']);
});
