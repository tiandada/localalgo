import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Language, Problem, TestCase, TestResult } from './types.js';

const resultMarker = '__LOCALALGO_RESULT__';
const maxProcessOutputBytes = 1024 * 1024;

function processErrorMessage(error: Error): string {
  return error.name === 'AbortError' ? '执行已取消' : error.message;
}

const pythonHarness = String.raw`
import importlib.util, json, sys, time, traceback

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def build_list(values):
    dummy = ListNode()
    current = dummy
    for value in values:
        current.next = ListNode(value)
        current = current.next
    return dummy.next

def build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    index = 1
    while queue and index < len(values):
        node = queue.pop(0)
        if index < len(values) and values[index] is not None:
            node.left = TreeNode(values[index])
            queue.append(node.left)
        index += 1
        if index < len(values) and values[index] is not None:
            node.right = TreeNode(values[index])
            queue.append(node.right)
        index += 1
    return root

def convert_argument(value, argument_type):
    if argument_type == "ListNode":
        return build_list(value)
    if argument_type == "TreeNode":
        return build_tree(value)
    return value

def normalize(value):
    if isinstance(value, ListNode):
        result = []
        seen = set()
        while value is not None:
            if id(value) in seen:
                raise ValueError("返回的链表包含环")
            seen.add(id(value))
            result.append(value.val)
            value = value.next
        return result
    if isinstance(value, TreeNode):
        result = []
        queue = [value]
        while queue:
            node = queue.pop(0)
            if node is None:
                result.append(None)
            else:
                result.append(node.val)
                queue.extend([node.left, node.right])
        while result and result[-1] is None:
            result.pop()
        return result
    return value

solution_path, function_name, encoded_input, encoded_types = sys.argv[1:5]
try:
    spec = importlib.util.spec_from_file_location("localalgo_solution", solution_path)
    module = importlib.util.module_from_spec(spec)
    module.ListNode = ListNode
    module.TreeNode = TreeNode
    spec.loader.exec_module(module)
    fn = getattr(module, function_name)
    raw_args = json.loads(encoded_input)
    argument_types = json.loads(encoded_types)
    args = [convert_argument(value, argument_types[index]) for index, value in enumerate(raw_args)]
    started = time.perf_counter()
    value = fn(*args)
    elapsed = (time.perf_counter() - started) * 1000
    print("${resultMarker}" + json.dumps({"value": normalize(value), "durationMs": elapsed}, ensure_ascii=False))
except Exception:
    print("${resultMarker}" + json.dumps({"error": traceback.format_exc()}, ensure_ascii=False))
    sys.exit(1)
`;

function valuesEqual(actual: unknown, expected: unknown, unordered = false): boolean {
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (unordered) {
      const normalize = (values: unknown[]) => [...values].sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
      return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
    }
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
  return Object.is(actual, expected);
}

async function runPythonCase(
  problem: Problem,
  solutionPath: string,
  testCase: TestCase,
  index: number,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<TestResult> {
  return await new Promise((resolve) => {
    const child = spawn(
      'python3',
      [
        '-c',
        pythonHarness,
        solutionPath,
        problem.functionName,
        JSON.stringify(testCase.input),
        JSON.stringify(problem.cppArgumentTypes),
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, signal },
    );
    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let outputError: string | undefined;
    const collect = (target: 'stdout' | 'stderr', chunk: string) => {
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > maxProcessOutputBytes) {
        outputError = `程序输出超过 ${maxProcessOutputBytes / 1024} KiB 限制`;
        child.kill('SIGKILL');
        return;
      }
      if (target === 'stdout') stdout += chunk;
      else stderr += chunk;
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => collect('stdout', chunk));
    child.stderr.on('data', (chunk: string) => collect('stderr', chunk));
    child.on('error', (error) => {
      resolve({
        index,
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        durationMs: 0,
        error: processErrorMessage(error),
      });
    });
    child.on('close', (_code, processSignal) => {
      if (signal?.aborted) {
        resolve({ index, passed: false, input: testCase.input, expected: testCase.expected, durationMs: 0, error: '执行已取消' });
        return;
      }
      if (outputError) {
        resolve({ index, passed: false, input: testCase.input, expected: testCase.expected, durationMs: 0, error: outputError });
        return;
      }
      const markerLine = stdout
        .split('\n')
        .reverse()
        .find((line) => line.startsWith(resultMarker));
      if (!markerLine) {
        resolve({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: timeoutMs,
          error: processSignal ? `执行超时或被终止（${processSignal}）` : stderr.trim() || '程序没有返回可读取的结果',
        });
        return;
      }
      try {
        const payload = JSON.parse(markerLine.slice(resultMarker.length)) as {
          value?: unknown;
          durationMs?: number;
          error?: string;
        };
        resolve({
          index,
          input: testCase.input,
          passed:
            !payload.error &&
            valuesEqual(payload.value, testCase.expected, problem.unorderedResult),
          expected: testCase.expected,
          actual: payload.value,
          durationMs: payload.durationMs ?? 0,
          error: payload.error,
        });
      } catch (error) {
        resolve({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: `无法解析执行结果：${String(error)}`,
        });
      }
    });
  });
}

interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
  error?: string;
}

async function runProcess(
  command: string,
  args: string[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ProcessResult> {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      signal,
    });
    let stdout = '';
    let stderr = '';
    let spawnError: string | undefined;
    let outputBytes = 0;
    const collect = (target: 'stdout' | 'stderr', chunk: string) => {
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > maxProcessOutputBytes) {
        spawnError = `程序输出超过 ${maxProcessOutputBytes / 1024} KiB 限制`;
        child.kill('SIGKILL');
        return;
      }
      if (target === 'stdout') stdout += chunk;
      else stderr += chunk;
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => collect('stdout', chunk));
    child.stderr.on('data', (chunk: string) => collect('stderr', chunk));
    child.on('error', (error) => (spawnError = processErrorMessage(error)));
    child.on('close', (code, processSignal) =>
      resolve({
        stdout,
        stderr,
        code,
        signal: processSignal,
        error: signal?.aborted ? '执行已取消' : spawnError,
      }),
    );
  });
}

function toCppLiteral(
  value: unknown,
  type: Problem['cppArgumentTypes'][number],
): string {
  if (type === 'int' || type === 'long long') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(`无法将 ${JSON.stringify(value)} 转换为 C++ ${type}`);
    }
    return type === 'long long' ? `${value}LL` : String(value);
  }
  if (type === 'double') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`无法将 ${JSON.stringify(value)} 转换为 C++ double`);
    }
    return Number.isInteger(value) ? `${value}.0` : String(value);
  }
  if (type === 'bool') {
    if (typeof value !== 'boolean') throw new Error('C++ bool 参数必须是布尔值');
    return value ? 'true' : 'false';
  }
  if (type === 'string') {
    if (typeof value !== 'string') throw new Error('C++ string 参数必须是字符串');
    return `std::string(${JSON.stringify(value)})`;
  }
  if (type === 'vector<string>') {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error('C++ vector<string> 参数必须是字符串数组');
    }
    return `std::vector<std::string>{${value.map((item) => `std::string(${JSON.stringify(item)})`).join(', ')}}`;
  }
  if (type === 'vector<vector<int>>') {
    if (!Array.isArray(value) || !value.every(
      (row) => Array.isArray(row) && row.every((item) => Number.isInteger(item)),
    )) {
      throw new Error('C++ vector<vector<int>> 参数必须是二维整数数组');
    }
    const rows = value.map((row) => `std::vector<int>{${(row as number[]).join(', ')}}`);
    return `std::vector<std::vector<int>>{${rows.join(', ')}}`;
  }
  if (type === 'TreeNode') {
    if (value === null) return 'nullptr';
    if (!Array.isArray(value) || !value.every((item) => item === null || Number.isInteger(item))) {
      throw new Error('C++ TreeNode 参数必须是由整数和 null 构成的层序数组');
    }
    const nodes = value.map((item) => item === null ? 'std::nullopt' : `std::optional<int>{${item}}`);
    return `localalgo_tree(std::vector<std::optional<int>>{${nodes.join(', ')}})`;
  }
  if (!Array.isArray(value) || !value.every((item) => Number.isInteger(item))) {
    throw new Error(`C++ ${type} 参数必须是整数数组`);
  }
  const vector = `std::vector<int>{${value.join(', ')}}`;
  return type === 'ListNode' ? `localalgo_list(${vector})` : vector;
}

function buildCppHarness(problem: Problem, solutionPath: string, tests: TestCase[]): string {
  const cases = tests
    .map((testCase) => {
      if (testCase.input.length !== problem.cppArgumentTypes.length) {
        throw new Error(`题目 ${problem.slug} 的 C++ 参数类型定义不完整`);
      }
      const args = testCase.input
        .map((value, index) => toCppLiteral(value, problem.cppArgumentTypes[index]!))
        .join(', ');
      return `    {
        auto started = std::chrono::steady_clock::now();
        auto value = ${problem.functionName}(${args});
        auto elapsed = std::chrono::duration<double, std::milli>(
            std::chrono::steady_clock::now() - started).count();
        std::cout << "${resultMarker}{\\\"value\\\":" << localalgo_json(value)
                  << ",\\\"durationMs\\\":" << elapsed << "}\\n";
    }`;
    })
    .join('\n');

  return `#include <chrono>
#include <iomanip>
#include <iostream>
#include <optional>
#include <queue>
#include <sstream>
#include <string>
#include <vector>

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int value = 0, ListNode* next_node = nullptr) : val(value), next(next_node) {}
};

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int value = 0, TreeNode* left_node = nullptr, TreeNode* right_node = nullptr)
        : val(value), left(left_node), right(right_node) {}
};

ListNode* localalgo_list(const std::vector<int>& values) {
    ListNode dummy;
    ListNode* current = &dummy;
    for (int value : values) {
        current->next = new ListNode(value);
        current = current->next;
    }
    return dummy.next;
}

TreeNode* localalgo_tree(const std::vector<std::optional<int>>& values) {
    if (values.empty() || !values[0].has_value()) return nullptr;
    TreeNode* root = new TreeNode(*values[0]);
    std::queue<TreeNode*> nodes;
    nodes.push(root);
    std::size_t index = 1;
    while (!nodes.empty() && index < values.size()) {
        TreeNode* node = nodes.front();
        nodes.pop();
        if (index < values.size() && values[index].has_value()) {
            node->left = new TreeNode(*values[index]);
            nodes.push(node->left);
        }
        ++index;
        if (index < values.size() && values[index].has_value()) {
            node->right = new TreeNode(*values[index]);
            nodes.push(node->right);
        }
        ++index;
    }
    return root;
}

#include ${JSON.stringify(path.resolve(solutionPath))}

std::string localalgo_json(bool value) { return value ? "true" : "false"; }
std::string localalgo_json(int value) { return std::to_string(value); }
std::string localalgo_json(long long value) { return std::to_string(value); }
std::string localalgo_json(double value) {
    std::ostringstream out;
    out << std::setprecision(17) << value;
    return out.str();
}
std::string localalgo_json(const std::string& value) {
    std::ostringstream out;
    out << std::quoted(value);
    return out.str();
}
template <typename T>
std::string localalgo_json(const std::vector<T>& values) {
    std::string out = "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i) out += ",";
        out += localalgo_json(values[i]);
    }
    return out + "]";
}
std::string localalgo_json(ListNode* node) {
    std::vector<int> values;
    std::size_t remaining = 100000;
    while (node && remaining--) {
        values.push_back(node->val);
        node = node->next;
    }
    if (node) throw std::runtime_error("返回的链表过长或包含环");
    return localalgo_json(values);
}
std::string localalgo_json(TreeNode* root) {
    if (!root) return "null";
    std::vector<std::string> values;
    std::queue<TreeNode*> nodes;
    nodes.push(root);
    while (!nodes.empty()) {
        TreeNode* node = nodes.front();
        nodes.pop();
        if (!node) {
            values.push_back("null");
            continue;
        }
        values.push_back(std::to_string(node->val));
        nodes.push(node->left);
        nodes.push(node->right);
    }
    while (!values.empty() && values.back() == "null") values.pop_back();
    std::string out = "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i) out += ",";
        out += values[i];
    }
    return out + "]";
}

int main() {
${cases}
    return 0;
}
`;
}

async function runCppTests(
  problem: Problem,
  solutionPath: string,
  tests: TestCase[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<TestResult[]> {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-cpp-'));
  const harnessPath = path.join(directory, 'harness.cpp');
  const executablePath = path.join(directory, 'solution');
  try {
    await writeFile(harnessPath, buildCppHarness(problem, solutionPath, tests), 'utf8');
    const compilation = await runProcess(
      'g++',
      ['-std=c++17', '-O2', '-pipe', harnessPath, '-o', executablePath],
      15_000,
      signal,
    );
    if (compilation.error || compilation.code !== 0) {
      return [{
        index: 0,
        passed: false,
        input: tests[0]?.input,
        expected: tests[0]?.expected,
        durationMs: 0,
        error: compilation.error
          ? (compilation.error === '执行已取消' || compilation.error.startsWith('程序输出超过'))
            ? compilation.error
            : `无法启动 g++：${compilation.error}`
          : compilation.signal
            ? `编译超时或被终止（${compilation.signal}）`
            : `编译失败\n${compilation.stderr.trim()}`,
      }];
    }
    const execution = await runProcess(executablePath, [], timeoutMs, signal);
    if (execution.error || execution.code !== 0) {
      return [{
        index: 0,
        passed: false,
        input: tests[0]?.input,
        expected: tests[0]?.expected,
        durationMs: timeoutMs,
        error: execution.error ?? (execution.signal
          ? `执行超时或被终止（${execution.signal}）`
          : execution.stderr.trim() || `程序退出码 ${execution.code}`),
      }];
    }
    const lines = execution.stdout
      .split('\n')
      .filter((line) => line.startsWith(resultMarker));
    return tests.map((testCase, index) => {
      const line = lines[index];
      if (!line) {
        return {
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: '程序没有返回可读取的结果',
        };
      }
      try {
        const payload = JSON.parse(line.slice(resultMarker.length)) as {
          value: unknown;
          durationMs: number;
        };
        return {
          index,
          passed: valuesEqual(payload.value, testCase.expected, problem.unorderedResult),
          input: testCase.input,
          expected: testCase.expected,
          actual: payload.value,
          durationMs: payload.durationMs,
        };
      } catch (error) {
        return {
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: `无法解析 C++ 执行结果：${String(error)}`,
        };
      }
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function runTests(
  problem: Problem,
  solutionPath: string,
  includeHidden: boolean,
  language: Language = 'python',
  timeoutMs = 2000,
  signal?: AbortSignal,
): Promise<TestResult[]> {
  const tests = includeHidden
    ? [...problem.sampleTests, ...problem.hiddenTests]
    : problem.sampleTests;
  if (language === 'cpp') return await runCppTests(problem, solutionPath, tests, timeoutMs, signal);

  const results: TestResult[] = [];
  for (const [index, testCase] of tests.entries()) {
    if (signal?.aborted) {
      results.push({ index, passed: false, input: testCase.input, expected: testCase.expected, durationMs: 0, error: '执行已取消' });
      break;
    }
    results.push(await runPythonCase(problem, solutionPath, testCase, index, timeoutMs, signal));
  }
  return results;
}

export async function runCustomTest(
  problem: Problem,
  solutionPath: string,
  input: unknown[],
  language: Language = 'python',
  timeoutMs = 2000,
  signal?: AbortSignal,
): Promise<TestResult> {
  const testCase: TestCase = { input, expected: undefined };
  const result = language === 'cpp'
    ? (await runCppTests(problem, solutionPath, [testCase], timeoutMs, signal))[0]
    : await runPythonCase(problem, solutionPath, testCase, 0, timeoutMs, signal);
  if (!result) {
    return {
      index: 0,
      passed: false,
      input,
      expected: undefined,
      durationMs: 0,
      error: '程序没有返回可读取的结果',
    };
  }
  return { ...result, passed: !result.error };
}

export function formatCustomResult(result: TestResult): string {
  if (result.error) {
    const errorLines = result.error.trim().split('\n');
    if (errorLines[0] === '编译失败') {
      const details = errorLines.slice(1);
      const visible = details.length > 12
        ? [...details.slice(0, 6), '…', ...details.slice(-6)]
        : details;
      return `编译失败\n${visible.map((line) => `  ${line}`).join('\n')}`;
    }
    return `执行失败\n${result.error.trim()}`;
  }
  const serialized = JSON.stringify(result.actual, null, 2);
  return `返回值\n${serialized ?? String(result.actual)}\n\n耗时 ${result.durationMs.toFixed(1)}ms`;
}

function inlineValue(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function labeledValue(label: string, value: unknown): string {
  const serialized = JSON.stringify(value, null, 2) ?? String(value);
  if (!serialized.includes('\n')) return `    ${label}: ${serialized}`;
  return `    ${label}:\n${serialized.split('\n').map((line) => `      ${line}`).join('\n')}`;
}

function firstDifference(expected: unknown, actual: unknown, path = 'result'): string | undefined {
  if (Object.is(expected, actual)) return undefined;
  if (typeof expected === 'string' && typeof actual === 'string') {
    const expectedCharacters = Array.from(expected);
    const actualCharacters = Array.from(actual);
    const sharedLength = Math.min(expectedCharacters.length, actualCharacters.length);
    for (let index = 0; index < sharedLength; index += 1) {
      if (expectedCharacters[index] !== actualCharacters[index]) {
        return `${path}[${index}] 应为 ${inlineValue(expectedCharacters[index])}，实际为 ${inlineValue(actualCharacters[index])}`;
      }
    }
    return `${path} 长度应为 ${expectedCharacters.length}，实际为 ${actualCharacters.length}`;
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const sharedLength = Math.min(expected.length, actual.length);
    for (let index = 0; index < sharedLength; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return `${path} 长度应为 ${expected.length}，实际为 ${actual.length}`;
  }
  return `${path} 应为 ${inlineValue(expected)}，实际为 ${inlineValue(actual)}`;
}

export function formatResults(results: TestResult[]): string {
  const lines = results.map((result) => {
    const timing = `${result.durationMs.toFixed(1)}ms`;
    if (result.passed) return `✓ case ${result.index + 1}  ${timing}`;
    if (result.error) {
      const errorLines = result.error.trim().split('\n');
      if (errorLines[0] === '编译失败') {
        const details = errorLines.slice(1);
        const visible = details.length > 10
          ? [...details.slice(0, 5), '…', ...details.slice(-5)]
          : details;
        const excerpt = visible.map((line) => `    ${line}`).join('\n');
        return `✗ 编译失败\n${excerpt}`;
      }
      return [
        `✗ case ${result.index + 1}  Runtime Error`,
        result.input ? labeledValue('input', result.input) : undefined,
        `    error:\n${errorLines.map((line) => `      ${line}`).join('\n')}`,
      ].filter(Boolean).join('\n');
    }
    const difference = firstDifference(result.expected, result.actual);
    return [
      `✗ case ${result.index + 1}  Wrong Answer`,
      result.input ? labeledValue('input', result.input) : undefined,
      labeledValue('expected', result.expected),
      labeledValue('received', result.actual),
      difference ? `    首个差异：${difference}` : undefined,
    ].filter(Boolean).join('\n');
  });
  const passed = results.filter((result) => result.passed).length;
  lines.push(`\n${passed}/${results.length} tests passed`);
  return lines.join('\n');
}
