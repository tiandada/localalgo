import assert from 'node:assert/strict';
import test from 'node:test';
import { problems } from './catalog.js';
import { curatedProblems } from './curated-catalog.js';

test('provides distinct curated problems across weak topics', () => {
  assert.equal(curatedProblems.length, 14);
  assert.equal(new Set(curatedProblems.map((problem) => problem.slug)).size, curatedProblems.length);
  assert.deepEqual(
    Object.fromEntries(['easy', 'medium', 'hard'].map((difficulty) => [
      difficulty,
      curatedProblems.filter((problem) => problem.difficulty === difficulty).length,
    ])),
    { easy: 6, medium: 6, hard: 2 },
  );
  for (const topic of ['栈', '二分查找', '前缀和', '链表', '二叉树', '贪心']) {
    assert.ok(curatedProblems.filter((problem) => problem.tags.includes(topic)).length >= 2, `${topic} 精选题不足`);
  }
});

test('merges curated problems into the main catalog', () => {
  assert.equal(problems.length, 330);
  for (const problem of curatedProblems) {
    assert.equal(problems.filter((candidate) => candidate.slug === problem.slug).length, 1);
  }
});
