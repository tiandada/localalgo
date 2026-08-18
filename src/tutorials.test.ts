import assert from 'node:assert/strict';
import test from 'node:test';
import { problems } from './catalog.js';
import { findTutorial, formatRoadmap, formatTutorial, tutorials } from './tutorials.js';

test('provides complete and uniquely addressable beginner tutorials', () => {
  assert.equal(tutorials.length, 12);
  assert.equal(new Set(tutorials.map((tutorial) => tutorial.slug)).size, tutorials.length);
  assert.equal(new Set(tutorials.map((tutorial) => tutorial.topic)).size, tutorials.length);
  for (const tutorial of tutorials) {
    assert.ok(tutorial.summary);
    assert.ok(tutorial.signals.length >= 3);
    assert.ok(tutorial.steps.length >= 3);
    assert.ok(tutorial.pitfalls.length >= 3);
    assert.ok(tutorial.pseudocode);
    assert.ok(tutorial.practiceSlugs.length > 0);
    const knownSlugs = new Set(problems.map((problem) => problem.slug));
    for (const slug of tutorial.practiceSlugs) assert.ok(knownSlugs.has(slug), `${slug} 不存在`);
  }
});

test('finds tutorials by Chinese topic or English slug', () => {
  assert.equal(findTutorial('滑动窗口')?.slug, 'sliding-window');
  assert.equal(findTutorial('SLIDING-WINDOW')?.topic, '滑动窗口');
  assert.equal(findTutorial('不存在'), undefined);
});

test('formats a tutorial with study sections and practice entry points', () => {
  const output = formatTutorial(findTutorial('array')!);
  for (const section of ['识别信号', '标准步骤', '复杂度', '常见错误', '套路模板', '推荐题单', '/next 数组']) {
    assert.match(output, new RegExp(section));
  }
});

test('formats an ordered beginner roadmap', () => {
  const output = formatRoadmap();
  assert.match(output, /数组 → 哈希表/);
  assert.match(output, /动态规划 → 贪心/);
  assert.match(output, /\/learn/);
});
