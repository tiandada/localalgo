import type { Difficulty, Problem, TestCase } from './types.js';

const generatedProblems: Problem[] = [];

function token(value: number): string {
  return value < 0 ? `neg-${Math.abs(value)}` : String(value);
}

function identifierToken(value: number): string {
  return value < 0 ? `neg_${Math.abs(value)}` : String(value);
}

function addProblem(options: {
  slug: string;
  title: string;
  difficulty?: Difficulty;
  tags: string[];
  summary: string;
  constraints: string[];
  hints: string[];
  examples: Problem['examples'];
  functionName: string;
  cppArgumentTypes: Problem['cppArgumentTypes'];
  pythonArguments: string;
  cppArguments: string;
  cppReturnType: string;
  cppDefault: string;
  sampleTests: TestCase[];
  hiddenTests: TestCase[];
}): void {
  generatedProblems.push({
    slug: options.slug,
    title: options.title,
    difficulty: options.difficulty ?? 'easy',
    tags: [...options.tags, '专项训练'],
    summary: options.summary,
    constraints: options.constraints,
    hints: options.hints,
    examples: options.examples,
    functionName: options.functionName,
    cppArgumentTypes: options.cppArgumentTypes,
    starters: {
      python: `def ${options.functionName}(${options.pythonArguments}):\n    pass\n`,
      cpp: `#include <string>\n#include <vector>\nusing namespace std;\n\n${options.cppReturnType} ${options.functionName}(${options.cppArguments}) {\n    return ${options.cppDefault};\n}\n`,
    },
    sampleTests: options.sampleTests,
    hiddenTests: options.hiddenTests,
  });
}

function countPairs(values: number[], target: number): number {
  let count = 0;
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left]! + values[right]! === target) count += 1;
    }
  }
  return count;
}

function maximumWindowSum(values: number[], size: number): number {
  let best = Number.NEGATIVE_INFINITY;
  for (let start = 0; start + size <= values.length; start += 1) {
    best = Math.max(best, values.slice(start, start + size).reduce((sum, value) => sum + value, 0));
  }
  return best;
}

function rotateRight(values: number[], amount: number): number[] {
  if (!values.length) return [];
  const shift = amount % values.length;
  return shift ? [...values.slice(-shift), ...values.slice(0, -shift)] : [...values];
}

function longestAbove(values: number[], threshold: number): number {
  let current = 0;
  let best = 0;
  for (const value of values) {
    current = value > threshold ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function digitSum(value: number, base: number): number {
  let remaining = Math.abs(value);
  let result = 0;
  while (remaining) {
    result += remaining % base;
    remaining = Math.floor(remaining / base);
  }
  return result;
}

for (let divisor = 2; divisor <= 26; divisor += 1) {
  const name = `count_divisible_by_${divisor}`;
  const sample = [divisor, divisor + 1, divisor * 2, -divisor, 0];
  addProblem({
    slug: `count-divisible-by-${divisor}`,
    title: `统计 ${divisor} 的倍数`,
    tags: ['数组', '数学'],
    summary: `给定整数数组 nums，返回其中能够被 ${divisor} 整除的元素数量。0 也视为 ${divisor} 的倍数。`,
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['遍历数组并使用取模运算判断每个元素。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: '4' }],
    functionName: name,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: 4 }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[1, 2, 3]], expected: [1, 2, 3].filter((value) => value % divisor === 0).length },
      { input: [[divisor * 3, divisor * 5, divisor + 2]], expected: 2 },
    ],
  });
}

for (let threshold = -12; threshold <= 12; threshold += 1) {
  const sample = [threshold - 2, threshold, threshold + 1, threshold + 4];
  const sum = (values: number[]) => values.filter((value) => value >= threshold).reduce((total, value) => total + value, 0);
  addProblem({
    slug: `sum-at-least-${token(threshold)}`,
    title: `不小于 ${threshold} 的元素之和`,
    tags: ['数组', '模拟'],
    summary: `给定整数数组 nums，返回所有大于或等于 ${threshold} 的元素之和；没有符合条件的元素时返回 0。`,
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: ['遍历时只累加满足下界条件的元素。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: String(sum(sample)) }],
    functionName: `sum_at_least_${identifierToken(threshold)}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: sum(sample) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[threshold - 3, threshold - 1]], expected: 0 },
      { input: [[threshold, threshold + 2, threshold - 1]], expected: threshold * 2 + 2 },
    ],
  });
}

for (let target = -12; target <= 12; target += 1) {
  const sample = [target + 1, target, 0, target, target - 1];
  addProblem({
    slug: `first-occurrence-${token(target)}`,
    title: `查找 ${target} 的首次位置`,
    tags: ['数组', '线性查找'],
    summary: `给定整数数组 nums，返回数值 ${target} 第一次出现的下标；如果不存在则返回 -1。`,
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['从左向右遍历，在第一次匹配时立即返回。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: '1' }],
    functionName: `first_occurrence_${identifierToken(target)}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '-1',
    sampleTests: [{ input: [sample], expected: 1 }],
    hiddenTests: [
      { input: [[]], expected: -1 },
      { input: [[target]], expected: 0 },
      { input: [[target + 1, target + 2]], expected: -1 },
    ],
  });
}

for (let target = -12; target <= 12; target += 1) {
  const sample = [target, target + 1, target, target - 1, target];
  const count = (values: number[]) => values.filter((value) => value === target).length;
  addProblem({
    slug: `occurrence-count-${token(target)}`,
    title: `统计 ${target} 的出现次数`,
    tags: ['数组', '哈希表'],
    summary: `给定整数数组 nums，返回数值 ${target} 在数组中出现的总次数。数组为空或目标值不存在时返回 0。`,
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['遍历数组，每次遇到目标值就增加计数。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: String(count(sample)) }],
    functionName: `occurrence_count_${identifierToken(target)}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: count(sample) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[target]], expected: 1 },
      { input: [[target + 1, target + 2]], expected: 0 },
    ],
  });
}

for (let target = -12; target <= 12; target += 1) {
  const sample = [target, 0, 1, target - 1, -1];
  addProblem({
    slug: `pair-count-sum-${token(target)}`,
    title: `和为 ${target} 的下标对数量`,
    difficulty: 'medium',
    tags: ['数组', '哈希表'],
    summary: `给定整数数组 nums，返回满足 i < j 且 nums[i] + nums[j] = ${target} 的下标对数量。重复数值位于不同下标时应分别计数。`,
    constraints: ['0 ≤ nums.length ≤ 2 × 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['遍历数组时，用哈希表记录此前每个数值出现的次数。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: String(countPairs(sample, target)) }],
    functionName: `pair_count_sum_${identifierToken(target)}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: countPairs(sample, target) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[target, 0]], expected: 1 },
      { input: [[0, 0, 0, target]], expected: countPairs([0, 0, 0, target], target) },
    ],
  });
}

for (let size = 1; size <= 25; size += 1) {
  const sample = Array.from({ length: size + 4 }, (_, index) => (index % 7) - 3);
  const hidden = Array.from({ length: size + 2 }, (_, index) => (index % 2 ? index : -index));
  addProblem({
    slug: `max-window-sum-${size}`,
    title: `长度为 ${size} 的最大窗口和`,
    difficulty: 'medium',
    tags: ['数组', '滑动窗口'],
    summary: `给定长度不少于 ${size} 的整数数组 nums，返回所有长度恰好为 ${size} 的连续子数组中的最大元素和。`,
    constraints: [`${size} ≤ nums.length ≤ 10⁵`, '-10⁴ ≤ nums[i] ≤ 10⁴'],
    hints: ['相邻窗口只相差一个移出元素和一个移入元素。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: String(maximumWindowSum(sample, size)) }],
    functionName: `max_window_sum_${size}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: maximumWindowSum(sample, size) }],
    hiddenTests: [
      { input: [Array(size).fill(1)], expected: size },
      { input: [Array(size + 1).fill(-2)], expected: -2 * size },
      { input: [hidden], expected: maximumWindowSum(hidden, size) },
    ],
  });
}

for (let amount = 1; amount <= 25; amount += 1) {
  const sample = [1, 2, 3, 4, 5, 6, 7];
  addProblem({
    slug: `rotate-right-${amount}`,
    title: `数组向右轮转 ${amount} 位`,
    difficulty: 'medium',
    tags: ['数组', '双指针'],
    summary: `给定整数数组 nums，返回将全部元素循环向右移动 ${amount} 个位置后得到的新数组。输入数组可以为空。`,
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['实际移动次数可以先对数组长度取模。', '可以使用三次翻转在 O(1) 额外空间内完成。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: JSON.stringify(rotateRight(sample, amount)) }],
    functionName: `rotate_right_${amount}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'vector<int>',
    cppDefault: '{}',
    sampleTests: [{ input: [sample], expected: rotateRight(sample, amount) }],
    hiddenTests: [
      { input: [[]], expected: [] },
      { input: [[1]], expected: [1] },
      { input: [[-1, -100, 3, 99]], expected: rotateRight([-1, -100, 3, 99], amount) },
    ],
  });
}

for (let threshold = -12; threshold <= 12; threshold += 1) {
  const sample = [threshold + 1, threshold + 2, threshold, threshold + 3, threshold + 4, threshold - 1];
  addProblem({
    slug: `longest-run-above-${token(threshold)}`,
    title: `连续大于 ${threshold} 的最长长度`,
    difficulty: 'medium',
    tags: ['数组', '动态规划'],
    summary: `给定整数数组 nums，返回其中所有元素都严格大于 ${threshold} 的最长连续片段长度。`,
    constraints: ['0 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    hints: ['维护以当前位置结尾的合格连续片段长度。'],
    examples: [{ input: `nums = ${JSON.stringify(sample)}`, output: String(longestAbove(sample, threshold)) }],
    functionName: `longest_run_above_${identifierToken(threshold)}`,
    cppArgumentTypes: ['vector<int>'],
    pythonArguments: 'nums',
    cppArguments: 'const vector<int>& nums',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: longestAbove(sample, threshold) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[threshold, threshold]], expected: 0 },
      { input: [[threshold + 1, threshold + 2, threshold + 3]], expected: 3 },
    ],
  });
}

for (let minimum = 1; minimum <= 25; minimum += 1) {
  const words = ['a'.repeat(Math.max(0, minimum - 1)), 'b'.repeat(minimum), 'c'.repeat(minimum + 2)];
  const count = (values: string[]) => values.filter((word) => word.length >= minimum).length;
  addProblem({
    slug: `words-min-length-${minimum}`,
    title: `长度至少为 ${minimum} 的单词数量`,
    tags: ['字符串', '数组'],
    summary: `给定字符串数组 words，返回其中长度大于或等于 ${minimum} 的字符串数量。字符串长度按字符数量计算。`,
    constraints: ['0 ≤ words.length ≤ 10⁴', '0 ≤ words[i].length ≤ 10³'],
    hints: ['逐个检查字符串长度并计数。'],
    examples: [{ input: `words = ${JSON.stringify(words)}`, output: String(count(words)) }],
    functionName: `words_min_length_${minimum}`,
    cppArgumentTypes: ['vector<string>'],
    pythonArguments: 'words',
    cppArguments: 'const vector<string>& words',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [words], expected: count(words) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [['', 'x']], expected: count(['', 'x']) },
      { input: [['z'.repeat(minimum), 'q'.repeat(minimum + 1)]], expected: 2 },
    ],
  });
}

for (let index = 0; index < 25; index += 1) {
  const character = String.fromCharCode(97 + index);
  const words = [`${character}lpha`, 'beta', `${character}${character}`, 'gamma'];
  const count = (values: string[]) => values.filter((word) => word.startsWith(character)).length;
  addProblem({
    slug: `words-starting-${character}`,
    title: `以 ${character} 开头的单词数量`,
    tags: ['字符串', '数组'],
    summary: `给定只包含小写英文字母的字符串数组 words，返回其中以字符 '${character}' 开头的非空字符串数量。`,
    constraints: ['0 ≤ words.length ≤ 10⁴', '0 ≤ words[i].length ≤ 10³'],
    hints: ['检查非空字符串的第一个字符。'],
    examples: [{ input: `words = ${JSON.stringify(words)}`, output: String(count(words)) }],
    functionName: `words_starting_${character}`,
    cppArgumentTypes: ['vector<string>'],
    pythonArguments: 'words',
    cppArguments: 'const vector<string>& words',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [words], expected: count(words) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [['', character, `${character}bc`]], expected: 2 },
      { input: [['abc', 'xyz']], expected: count(['abc', 'xyz']) },
    ],
  });
}

for (let divisor = 2; divisor <= 26; divisor += 1) {
  const matrix = [[divisor, divisor + 1], [divisor * 2, -divisor]];
  const count = (values: number[][]) => values.flat().filter((value) => value % divisor === 0).length;
  addProblem({
    slug: `matrix-multiples-${divisor}`,
    title: `矩阵中 ${divisor} 的倍数`,
    tags: ['矩阵', '数组', '数学'],
    summary: `给定整数矩阵 matrix，返回其中能够被 ${divisor} 整除的元素数量。矩阵每一行可以具有不同长度。`,
    constraints: ['0 ≤ matrix.length ≤ 500', '所有行的元素总数不超过 10⁵'],
    hints: ['逐行遍历矩阵中的每个元素。'],
    examples: [{ input: `matrix = ${JSON.stringify(matrix)}`, output: String(count(matrix)) }],
    functionName: `matrix_multiples_${divisor}`,
    cppArgumentTypes: ['vector<vector<int>>'],
    pythonArguments: 'matrix',
    cppArguments: 'const vector<vector<int>>& matrix',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [matrix], expected: count(matrix) }],
    hiddenTests: [
      { input: [[]], expected: 0 },
      { input: [[[divisor, divisor * 3], []]], expected: 2 },
      { input: [[[1, 2], [3, 4]]], expected: count([[1, 2], [3, 4]]) },
    ],
  });
}

for (let base = 2; base <= 26; base += 1) {
  const sample = base * base + base + 1;
  addProblem({
    slug: `digit-sum-base-${base}`,
    title: `${base} 进制数位和`,
    tags: ['数学', '模拟'],
    summary: `给定非负整数 n，将它表示为 ${base} 进制后，返回所有数位之和。返回数值而不是表示字符串。`,
    constraints: ['0 ≤ n ≤ 10⁹'],
    hints: [`反复对 ${base} 取模得到最低位，再执行整除。`],
    examples: [{ input: `n = ${sample}`, output: String(digitSum(sample, base)) }],
    functionName: `digit_sum_base_${base}`,
    cppArgumentTypes: ['int'],
    pythonArguments: 'n',
    cppArguments: 'int n',
    cppReturnType: 'int',
    cppDefault: '0',
    sampleTests: [{ input: [sample], expected: 3 }],
    hiddenTests: [
      { input: [0], expected: 0 },
      { input: [base - 1], expected: base - 1 },
      { input: [base * base - 1], expected: 2 * (base - 1) },
    ],
  });
}

export { generatedProblems };
