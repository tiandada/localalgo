import assert from 'node:assert/strict';
import test from 'node:test';
import { problems } from './catalog.js';
import { generatedProblems } from './generated-catalog.js';

test('built-in catalog is broad and has unique slugs', () => {
  assert.equal(generatedProblems.length, 300);
  assert.equal(problems.length, 330);
  assert.equal(new Set(problems.map((problem) => problem.slug)).size, problems.length);
  assert.ok(new Set(problems.flatMap((problem) => problem.tags)).size >= 10);
});

test('every built-in problem has a complete statement and valid cases', () => {
  for (const problem of problems) {
    assert.ok(problem.summary.length >= 20, `${problem.slug} 缺少题目描述`);
    assert.ok(problem.constraints.length > 0, `${problem.slug} 缺少约束`);
    assert.ok(problem.examples.length > 0, `${problem.slug} 缺少示例`);
    assert.ok(problem.sampleTests.length > 0, `${problem.slug} 缺少公开测试`);
    for (const testCase of [...problem.sampleTests, ...problem.hiddenTests]) {
      assert.equal(
        testCase.input.length,
        problem.cppArgumentTypes.length,
        `${problem.slug} 的测试参数数量不正确`,
      );
    }
  }
});
