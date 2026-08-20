import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseProblemPack } from './problem-pack.js';

function validProblem(): Record<string, unknown> {
  return {
    slug: 'sum-two-values',
    title: '两个数之和',
    difficulty: 'easy',
    tags: ['数组'],
    summary: '给定两个整数，返回它们的和，用于验证离线题包的完整字段和参数类型。',
    constraints: ['两个参数都是 32 位整数'],
    hints: ['直接将两个参数相加。'],
    examples: [{ input: 'left = 1, right = 2', output: '3' }],
    functionName: 'sum_two_values',
    cppArgumentTypes: ['int', 'int'],
    starters: {
      python: 'def sum_two_values(left, right):\n    pass\n',
      cpp: 'int sum_two_values(int left, int right) { return 0; }\n',
    },
    sampleTests: [{ input: [1, 2], expected: 3 }],
    hiddenTests: [{ input: [-2, 2], expected: 0 }],
  };
}

test('parses the bundled problem pack example', async () => {
  const raw = await readFile(new URL('../examples/problem-pack.json', import.meta.url), 'utf8');
  const problems = parseProblemPack(JSON.parse(raw));
  assert.equal(problems.length, 1);
  assert.equal(problems[0]?.slug, 'fibonacci-number');
  assert.deepEqual(problems[0]?.constraints, ['0 ≤ n ≤ 30']);
});

test('rejects unsafe slugs and function names', () => {
  assert.throws(
    () => parseProblemPack([{ slug: '../escape' }]),
    /slug 只能包含/,
  );
  assert.throws(
    () => parseProblemPack([{ ...validProblem(), functionName: 'sum-values();' }]),
    /functionName 必须是/,
  );
});

test('requires tags, hints, and examples', () => {
  for (const field of ['tags', 'hints', 'examples'] as const) {
    assert.throws(
      () => parseProblemPack([{ ...validProblem(), [field]: [] }]),
      new RegExp(`${field}.*至少需要`),
    );
  }
});

test('validates test arguments against C++ parameter types', () => {
  assert.throws(
    () => parseProblemPack([{
      ...validProblem(),
      sampleTests: [{ input: ['1', 2], expected: 3 }],
    }]),
    /input\[0\] 必须是 32 位整数/,
  );
  assert.throws(
    () => parseProblemPack([{
      ...validProblem(),
      cppArgumentTypes: ['long long', 'int'],
      sampleTests: [{ input: [Number.MAX_SAFE_INTEGER + 1, 2], expected: 3 }],
      hiddenTests: [],
    }]),
    /JavaScript 安全整数范围/,
  );
});
