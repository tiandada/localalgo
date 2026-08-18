import type { Difficulty, Language, Problem, TestCase } from './types.js';

const difficulties = new Set<Difficulty>(['easy', 'medium', 'hard']);
const cppTypes = new Set<Problem['cppArgumentTypes'][number]>([
  'int',
  'long long',
  'double',
  'bool',
  'string',
  'vector<int>',
  'vector<string>',
  'vector<vector<int>>',
  'ListNode',
  'TreeNode',
]);

function objectAt(value: unknown, location: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${location} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function stringAt(value: unknown, location: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${location} 必须是非空字符串`);
  }
  return value;
}

function stringsAt(value: unknown, location: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${location} 必须是字符串数组`);
  }
  return value;
}

function testsAt(value: unknown, location: string): TestCase[] {
  if (!Array.isArray(value)) throw new Error(`${location} 必须是数组`);
  return value.map((item, index) => {
    const test = objectAt(item, `${location}[${index}]`);
    if (!Array.isArray(test.input)) {
      throw new Error(`${location}[${index}].input 必须是参数数组`);
    }
    if (!Object.hasOwn(test, 'expected')) {
      throw new Error(`${location}[${index}].expected 缺失`);
    }
    return { input: test.input, expected: test.expected };
  });
}

function problemAt(value: unknown, location: string): Problem {
  const source = objectAt(value, location);
  const slug = stringAt(source.slug, `${location}.slug`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${location}.slug 只能包含小写字母、数字和单个连字符`);
  }
  if (!difficulties.has(source.difficulty as Difficulty)) {
    throw new Error(`${location}.difficulty 必须是 easy、medium 或 hard`);
  }
  const examplesSource = source.examples;
  if (!Array.isArray(examplesSource)) throw new Error(`${location}.examples 必须是数组`);
  const examples = examplesSource.map((item, index) => {
    const example = objectAt(item, `${location}.examples[${index}]`);
    return {
      input: stringAt(example.input, `${location}.examples[${index}].input`),
      output: stringAt(example.output, `${location}.examples[${index}].output`),
    };
  });
  const cppArgumentTypes = stringsAt(source.cppArgumentTypes, `${location}.cppArgumentTypes`);
  if (!cppArgumentTypes.every((type) => cppTypes.has(type as Problem['cppArgumentTypes'][number]))) {
    throw new Error(`${location}.cppArgumentTypes 含有暂不支持的类型`);
  }
  const starters = objectAt(source.starters, `${location}.starters`);
  const sampleTests = testsAt(source.sampleTests, `${location}.sampleTests`);
  const hiddenTests = testsAt(source.hiddenTests, `${location}.hiddenTests`);
  if (sampleTests.length === 0) throw new Error(`${location}.sampleTests 至少需要一个样例`);
  const result: Problem = {
    slug,
    title: stringAt(source.title, `${location}.title`),
    difficulty: source.difficulty as Difficulty,
    tags: stringsAt(source.tags, `${location}.tags`),
    summary: stringAt(source.summary, `${location}.summary`),
    constraints: stringsAt(source.constraints ?? [], `${location}.constraints`),
    hints: stringsAt(source.hints, `${location}.hints`),
    examples,
    functionName: stringAt(source.functionName, `${location}.functionName`),
    cppArgumentTypes: cppArgumentTypes as Problem['cppArgumentTypes'],
    starters: {
      python: stringAt(starters.python, `${location}.starters.python`),
      cpp: stringAt(starters.cpp, `${location}.starters.cpp`),
    } satisfies Record<Language, string>,
    sampleTests,
    hiddenTests,
  };
  if (source.unorderedResult !== undefined) {
    if (typeof source.unorderedResult !== 'boolean') {
      throw new Error(`${location}.unorderedResult 必须是布尔值`);
    }
    result.unorderedResult = source.unorderedResult;
  }
  if ([...result.sampleTests, ...result.hiddenTests].some(
    (test) => test.input.length !== result.cppArgumentTypes.length,
  )) {
    throw new Error(`${location}.cppArgumentTypes 数量必须与函数参数数量一致`);
  }
  return result;
}

export function parseProblemPack(value: unknown): Problem[] {
  const source = Array.isArray(value)
    ? value
    : objectAt(value, '题包').problems;
  if (!Array.isArray(source) || source.length === 0) {
    throw new Error('题包必须是非空题目数组，或包含 problems 数组的对象');
  }
  const problems = source.map((item, index) => problemAt(item, `problems[${index}]`));
  const slugs = new Set<string>();
  for (const problem of problems) {
    if (slugs.has(problem.slug)) throw new Error(`题包中存在重复 slug：${problem.slug}`);
    slugs.add(problem.slug);
  }
  return problems;
}
