import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseProblemPack } from './problem-pack.js';

test('parses the bundled problem pack example', async () => {
  const raw = await readFile(new URL('../examples/problem-pack.json', import.meta.url), 'utf8');
  const problems = parseProblemPack(JSON.parse(raw));
  assert.equal(problems.length, 1);
  assert.equal(problems[0]?.slug, 'fibonacci-number');
  assert.deepEqual(problems[0]?.constraints, ['0 ≤ n ≤ 30']);
});

test('rejects unsafe slugs and malformed tests', () => {
  assert.throws(
    () => parseProblemPack([{ slug: '../escape' }]),
    /slug 只能包含/,
  );
});
