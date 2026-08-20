import assert from 'node:assert/strict';
import { mkdtemp, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findProblem } from './catalog.js';
import { getLocale, setLocale } from './messages.js';
import {
  formatCustomResult,
  formatResults,
  isCancelledResult,
  isCompilationFailure,
  runCustomTest,
  runTests,
} from './runner.js';

test('runs a correct Python solution', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(
    solution,
    'def two_sum(nums, target):\n    seen = {}\n    for i, value in enumerate(nums):\n        if target - value in seen:\n            return [seen[target - value], i]\n        seen[value] = i\n',
  );
  const problem = findProblem('two-sum');
  assert.ok(problem);
  const results = await runTests(problem, solution, true);
  assert.equal(results.every((result) => result.passed), true);
});

test('reports a wrong answer', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(solution, 'def two_sum(nums, target):\n    return [0, 0]\n');
  const problem = findProblem('two-sum');
  assert.ok(problem);
  const results = await runTests(problem, solution, false);
  assert.equal(results.some((result) => !result.passed), true);
});

test('formats the first public array and string difference', () => {
  const arrayOutput = formatResults([{
    index: 0,
    passed: false,
    input: [[4, 5, 6], 9],
    expected: [1, 2, 3],
    actual: [1, 9, 3],
    durationMs: 1,
  }]);
  assert.match(arrayOutput, /答案错误/);
  assert.match(arrayOutput, /输入:/);
  assert.match(arrayOutput, /4/);
  assert.match(arrayOutput, /result\[1\] 应为 2，实际为 9/);

  const stringOutput = formatResults([{
    index: 0,
    passed: false,
    expected: 'abc',
    actual: 'axc',
    durationMs: 1,
  }]);
  assert.match(stringOutput, /result\[1\] 应为 "b"，实际为 "x"/);
});

test('shows complete values for every failed local test', () => {
  const longValue = 'x'.repeat(400);
  const output = formatResults([{
    index: 0,
    passed: false,
    input: [[1, 2, 3], longValue],
    expected: longValue,
    actual: 'wrong',
    durationMs: 1,
  }]);
  assert.match(output, /输入:/);
  assert.match(output, /期望:/);
  assert.match(output, /实际:/);
  assert.equal(output.includes(longValue), true);
  assert.doesNotMatch(output, /…/);
});

test('accepts an equivalent unordered pair', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(
    solution,
    'def two_sum(nums, target):\n    seen = {}\n    for i, value in enumerate(nums):\n        if target - value in seen:\n            return [i, seen[target - value]]\n        seen[value] = i\n',
  );
  const problem = findProblem('two-sum');
  assert.ok(problem);
  const results = await runTests(problem, solution, true);
  assert.equal(results.every((result) => result.passed), true);
});

test('compiles and runs a correct C++ solution', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <unordered_map>
#include <vector>
using namespace std;
vector<int> two_sum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < static_cast<int>(nums.size()); ++i) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {i, it->second};
        seen[nums[i]] = i;
    }
    return {};
}
`,
  );
  const problem = findProblem('two-sum');
  assert.ok(problem);
  const results = await runTests(problem, solution, true, 'cpp');
  assert.equal(results.every((result) => result.passed), true);
});

test('isolates C++ cases in separate processes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <vector>
using namespace std;
static int calls = 0;
int binary_search(const vector<int>& nums, int target) {
    ++calls;
    if (calls != 1) return 999;
    int left = 0, right = static_cast<int>(nums.size()) - 1;
    while (left <= right) {
        int middle = left + (right - left) / 2;
        if (nums[middle] == target) return middle;
        if (nums[middle] < target) left = middle + 1;
        else right = middle - 1;
    }
    return -1;
}
`,
  );
  const problem = findProblem('binary-search');
  assert.ok(problem);
  const results = await runTests(problem, solution, false, 'cpp');
  assert.equal(results.length, problem.sampleTests.length);
  assert.equal(results.every((result) => result.passed), true);
});

test('attributes a later C++ runtime failure to its actual case', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <cstdlib>
#include <vector>
using namespace std;
int binary_search(const vector<int>& nums, int target) {
    if (target == 2) abort();
    for (int index = 0; index < static_cast<int>(nums.size()); ++index) {
        if (nums[index] == target) return index;
    }
    return -1;
}
`,
  );
  const problem = findProblem('binary-search');
  assert.ok(problem);
  const results = await runTests(problem, solution, false, 'cpp');
  assert.equal(results.length, 2);
  assert.equal(results[0]?.passed, true);
  assert.equal(results[1]?.passed, false);
  assert.deepEqual(results[1]?.input, problem.sampleTests[1]?.input);
  assert.equal(results[1]?.failureKind, 'runtime');
});

test('attributes a later C++ timeout to its actual case', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <vector>
using namespace std;
int binary_search(const vector<int>& nums, int target) {
    if (target == 2) while (true) {}
    for (int index = 0; index < static_cast<int>(nums.size()); ++index) {
        if (nums[index] == target) return index;
    }
    return -1;
}
`,
  );
  const problem = findProblem('binary-search');
  assert.ok(problem);
  const results = await runTests(problem, solution, false, 'cpp', 100);
  assert.equal(results.length, 2);
  assert.equal(results[0]?.passed, true);
  assert.equal(results[1]?.passed, false);
  assert.deepEqual(results[1]?.input, problem.sampleTests[1]?.input);
  assert.match(results[1]?.error ?? '', /终止|terminated/i);
});

test('serializes C++ strings containing JSON control characters', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <string>
#include <vector>
using namespace std;
string longest_common_prefix(const vector<string>&) {
    return "line 1\\n\\\"quoted\\\"\\tend";
}
`,
  );
  const original = findProblem('longest-common-prefix');
  assert.ok(original);
  const expected = 'line 1\n"quoted"\tend';
  const problem = {
    ...original,
    sampleTests: [{ input: [['ignored']], expected }],
    hiddenTests: [],
  };
  const results = await runTests(problem, solution, false, 'cpp');
  assert.equal(results.length, 1);
  assert.equal(results[0]?.passed, true);
  assert.equal(results[0]?.actual, expected);
});

test('caches C++ builds and invalidates them for source or test changes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-cache-test-'));
  const solution = path.join(directory, 'solution.cpp');
  const cache = path.join(directory, 'cache');
  const source = `#include <unordered_map>
#include <vector>
using namespace std;
vector<int> two_sum(const vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < static_cast<int>(nums.size()); ++i) {
        auto it = seen.find(target - nums[i]);
        if (it != seen.end()) return {it->second, i};
        seen[nums[i]] = i;
    }
    return {};
}
`;
  await writeFile(solution, source);
  const problem = findProblem('two-sum');
  assert.ok(problem);

  assert.equal((await runTests(problem, solution, false, 'cpp', 2000, undefined, cache))
    .every((result) => result.passed), true);
  const firstFiles = await readdir(cache);
  assert.equal(firstFiles.length, 1);
  const firstCacheFile = path.join(cache, firstFiles[0]!);
  const firstModifiedAt = (await stat(firstCacheFile)).mtimeMs;

  assert.equal((await runTests(problem, solution, false, 'cpp', 2000, undefined, cache))
    .every((result) => result.passed), true);
  assert.deepEqual(await readdir(cache), firstFiles);
  assert.equal((await stat(firstCacheFile)).mtimeMs, firstModifiedAt);

  assert.equal((await runTests(problem, solution, true, 'cpp', 2000, undefined, cache))
    .every((result) => result.passed), true);
  assert.equal((await readdir(cache)).length, 2);

  await writeFile(solution, `${source}\n// cache invalidation\n`);
  assert.equal((await runTests(problem, solution, false, 'cpp', 2000, undefined, cache))
    .every((result) => result.passed), true);
  assert.equal((await readdir(cache)).length, 3);
});

test('supports bool results in the C++ runner', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <stack>
#include <string>
using namespace std;
bool valid_brackets(const string& s) {
    stack<char> open;
    for (char ch : s) {
        if (ch == '(' || ch == '[' || ch == '{') open.push(ch);
        else {
            if (open.empty()) return false;
            char expected = ch == ')' ? '(' : ch == ']' ? '[' : '{';
            if (open.top() != expected) return false;
            open.pop();
        }
    }
    return open.empty();
}
`,
  );
  const problem = findProblem('valid-brackets');
  assert.ok(problem);
  const results = await runTests(problem, solution, true, 'cpp');
  assert.equal(results.every((result) => result.passed), true);
});

test('supports an empty vector argument in the C++ runner', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    `#include <algorithm>
#include <vector>
using namespace std;
int max_profit(const vector<int>& prices) {
    int lowest = prices.empty() ? 0 : prices[0];
    int best = 0;
    for (int price : prices) {
        lowest = min(lowest, price);
        best = max(best, price - lowest);
    }
    return best;
}
`,
  );
  const problem = findProblem('max-profit');
  assert.ok(problem);
  const results = await runTests(problem, solution, true, 'cpp');
  assert.equal(results.every((result) => result.passed), true);
});

test('returns a readable C++ compilation error', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(solution, 'this is not valid C++\n');
  const problem = findProblem('two-sum');
  assert.ok(problem);
  const results = await runTests(problem, solution, false, 'cpp');
  assert.equal(results.length, 1);
  assert.equal(isCompilationFailure(results[0]!), true);
  assert.match(formatResults(results), /this is not valid C\+\+/);
  assert.match(formatResults(results), /编译失败/);
});

test('runs a custom Python input and returns its value', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(solution, 'def max_profit(prices):\n    return max(prices) - min(prices)\n');
  const problem = findProblem('max-profit');
  assert.ok(problem);
  const result = await runCustomTest(problem, solution, [[2, 8, 3]], 'python');
  assert.equal(result.error, undefined);
  assert.equal(result.actual, 6);
  assert.match(formatCustomResult(result), /返回值\n6/);
});

test('runs a custom C++ input and returns its value', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(
    solution,
    '#include <vector>\nusing namespace std;\nint max_profit(const vector<int>& prices) { return prices.size(); }\n',
  );
  const problem = findProblem('max-profit');
  assert.ok(problem);
  const result = await runCustomTest(problem, solution, [[5, 4, 3]], 'cpp');
  assert.equal(result.error, undefined);
  assert.equal(result.actual, 3);
});

test('supports ListNode arguments and results in Python', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(solution, `def add_two_numbers(l1, l2):
    dummy = ListNode()
    current = dummy
    carry = 0
    while l1 or l2 or carry:
        total = carry + (l1.val if l1 else 0) + (l2.val if l2 else 0)
        carry, digit = divmod(total, 10)
        current.next = ListNode(digit)
        current = current.next
        l1 = l1.next if l1 else None
        l2 = l2.next if l2 else None
    return dummy.next
`);
  const problem = findProblem('add-two-numbers');
  assert.ok(problem);
  const results = await runTests(problem, solution, true, 'python');
  assert.equal(results.every((result) => result.passed), true);
});

test('supports ListNode arguments and results in C++', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(solution, `ListNode* add_two_numbers(ListNode* l1, ListNode* l2) {
    ListNode dummy;
    ListNode* current = &dummy;
    int carry = 0;
    while (l1 || l2 || carry) {
        int total = carry + (l1 ? l1->val : 0) + (l2 ? l2->val : 0);
        carry = total / 10;
        current->next = new ListNode(total % 10);
        current = current->next;
        l1 = l1 ? l1->next : nullptr;
        l2 = l2 ? l2->next : nullptr;
    }
    return dummy.next;
}
`);
  const problem = findProblem('add-two-numbers');
  assert.ok(problem);
  const results = await runTests(problem, solution, true, 'cpp');
  assert.equal(results.every((result) => result.passed), true);
});

test('supports TreeNode arguments and results in Python and C++', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const pythonSolution = path.join(directory, 'solution.py');
  const cppSolution = path.join(directory, 'solution.cpp');
  await writeFile(pythonSolution, `def invert_binary_tree(root):
    if root:
        root.left, root.right = invert_binary_tree(root.right), invert_binary_tree(root.left)
    return root
`);
  await writeFile(cppSolution, `TreeNode* invert_binary_tree(TreeNode* root) {
    if (!root) return nullptr;
    TreeNode* left = invert_binary_tree(root->left);
    root->left = invert_binary_tree(root->right);
    root->right = left;
    return root;
}
`);
  const problem = findProblem('invert-binary-tree');
  assert.ok(problem);
  const [pythonResults, cppResults] = await Promise.all([
    runTests(problem, pythonSolution, true, 'python'),
    runTests(problem, cppSolution, true, 'cpp'),
  ]);
  assert.equal(pythonResults.every((result) => result.passed), true);
  assert.equal(cppResults.every((result) => result.passed), true);
});

test('supports matrix and string-vector arguments in C++', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const matrixSolution = path.join(directory, 'matrix.cpp');
  const stringsSolution = path.join(directory, 'strings.cpp');
  await writeFile(matrixSolution, `#include <vector>
using namespace std;
int matrix_diagonal_sum(const vector<vector<int>>& mat) {
    int result = 0;
    for (int i = 0; i < (int)mat.size(); ++i) {
        result += mat[i][i];
        if (i != (int)mat.size() - 1 - i) result += mat[i][mat.size() - 1 - i];
    }
    return result;
}
`);
  await writeFile(stringsSolution, `#include <string>
#include <vector>
using namespace std;
string longest_common_prefix(const vector<string>& values) {
    string prefix = values[0];
    for (const string& value : values) {
        while (value.rfind(prefix, 0) != 0) prefix.pop_back();
    }
    return prefix;
}
`);
  const matrixProblem = findProblem('matrix-diagonal-sum');
  const stringsProblem = findProblem('longest-common-prefix');
  assert.ok(matrixProblem);
  assert.ok(stringsProblem);
  const [matrixResults, stringsResults] = await Promise.all([
    runTests(matrixProblem, matrixSolution, true, 'cpp'),
    runTests(stringsProblem, stringsSolution, true, 'cpp'),
  ]);
  assert.equal(matrixResults.every((result) => result.passed), true);
  assert.equal(stringsResults.every((result) => result.passed), true);
});

test('runs a generated drill in both Python and C++', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const pythonSolution = path.join(directory, 'solution.py');
  const cppSolution = path.join(directory, 'solution.cpp');
  await writeFile(
    pythonSolution,
    'def count_divisible_by_7(nums):\n    return sum(value % 7 == 0 for value in nums)\n',
  );
  await writeFile(cppSolution, `#include <vector>
using namespace std;
int count_divisible_by_7(const vector<int>& nums) {
    int count = 0;
    for (int value : nums) count += value % 7 == 0;
    return count;
}
`);
  const problem = findProblem('count-divisible-by-7');
  assert.ok(problem);
  const [pythonResults, cppResults] = await Promise.all([
    runTests(problem, pythonSolution, true, 'python'),
    runTests(problem, cppSolution, true, 'cpp'),
  ]);
  assert.equal(pythonResults.every((result) => result.passed), true);
  assert.equal(cppResults.every((result) => result.passed), true);
});

test('runs a curated monotonic-stack problem in Python', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(solution, `def daily_temperatures(temperatures):
    answer = [0] * len(temperatures)
    stack = []
    for index, temperature in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < temperature:
            previous = stack.pop()
            answer[previous] = index - previous
        stack.append(index)
    return answer
`);
  const problem = findProblem('daily-temperatures');
  assert.ok(problem);
  assert.equal((await runTests(problem, solution, true)).every((result) => result.passed), true);
});

test('runs a curated prefix-sum problem in C++', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.cpp');
  await writeFile(solution, `#include <vector>
using namespace std;
vector<int> range_sums(const vector<int>& nums, const vector<vector<int>>& queries) {
    vector<int> prefix(nums.size() + 1), answer;
    for (int i = 0; i < static_cast<int>(nums.size()); ++i) prefix[i + 1] = prefix[i] + nums[i];
    for (const auto& query : queries) answer.push_back(prefix[query[1] + 1] - prefix[query[0]]);
    return answer;
}
`);
  const problem = findProblem('range-sum-queries');
  assert.ok(problem);
  assert.equal((await runTests(problem, solution, true, 'cpp')).every((result) => result.passed), true);
});

test('cancels a running solution without waiting for its timeout', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(solution, 'def max_profit(prices):\n    while True:\n        pass\n');
  const problem = findProblem('max-profit');
  assert.ok(problem);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50);
  const started = Date.now();
  const result = await runCustomTest(problem, solution, [[]], 'python', 5000, controller.signal);
  clearTimeout(timer);
  assert.equal(result.error, '执行已取消');
  assert.equal(isCancelledResult(result), true);
  assert.ok(Date.now() - started < 2000);
});

test('localizes result formatting without changing failure predicates', () => {
  const original = getLocale();
  try {
    setLocale('en');
    const wrong = formatResults([{
      index: 0,
      passed: false,
      input: [[1, 2]],
      expected: [1, 3],
      actual: [1, 4],
      durationMs: 1,
    }]);
    assert.match(wrong, /Wrong Answer/);
    assert.match(wrong, /First difference/);
    assert.match(wrong, /0\/1 tests passed/);

    const compilation = {
      index: 0,
      passed: false,
      expected: undefined,
      durationMs: 0,
      error: 'compiler details',
      failureKind: 'compilation' as const,
    };
    assert.equal(isCompilationFailure(compilation), true);
    assert.match(formatCustomResult(compilation), /Compilation failed/);

    const cancelled = { ...compilation, failureKind: 'cancelled' as const };
    assert.equal(isCancelledResult(cancelled), true);
    assert.equal(isCompilationFailure(cancelled), false);
  } finally {
    setLocale(original);
  }
});

test('stops a solution that exceeds the output limit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-test-'));
  const solution = path.join(directory, 'solution.py');
  await writeFile(
    solution,
    'def max_profit(prices):\n    print("x" * (2 * 1024 * 1024))\n    return 0\n',
  );
  const problem = findProblem('max-profit');
  assert.ok(problem);
  const result = await runCustomTest(problem, solution, [[]], 'python');
  assert.match(result.error ?? '', /输出超过 1024 KiB/);
});
