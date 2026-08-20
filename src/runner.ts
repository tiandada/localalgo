import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { t } from './messages.js';
import type { Language, Problem, TestCase, TestResult } from './types.js';

const resultMarker = '__LOCALALGO_RESULT__';
const maxProcessOutputBytes = 1024 * 1024;
const cppCacheVersion = '1';
const cppCompileFlags = ['-std=c++17', '-O2', '-pipe'] as const;
const maxCppCacheEntries = 64;

function processErrorMessage(error: Error): string {
  return error.name === 'AbortError' ? t('runner.cancelled') : error.message;
}

export function isCancelledResult(result: TestResult): boolean {
  return result.failureKind === 'cancelled';
}

export function isCompilationFailure(result: TestResult): boolean {
  return result.failureKind === 'compilation';
}

function pythonHarness(): string {
  return String.raw`
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
                raise ValueError(${JSON.stringify(t('runner.listCycle'))})
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
}

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
        pythonHarness(),
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
        outputError = t('runner.outputLimit', { limit: maxProcessOutputBytes / 1024 });
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
        failureKind: error.name === 'AbortError' ? 'cancelled' : 'runtime',
      });
    });
    child.on('close', (_code, processSignal) => {
      if (signal?.aborted) {
        resolve({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: t('runner.cancelled'),
          failureKind: 'cancelled',
        });
        return;
      }
      if (outputError) {
        resolve({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: outputError,
          failureKind: 'runtime',
        });
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
          error: processSignal
            ? t('runner.terminated', { signal: processSignal })
            : stderr.trim() || t('runner.noResult'),
          failureKind: 'runtime',
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
          failureKind: payload.error ? 'runtime' : undefined,
        });
      } catch (error) {
        resolve({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: t('runner.parseFailed', { error: String(error) }),
          failureKind: 'runtime',
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
  failureKind?: 'cancelled' | 'runtime';
  errorSource?: 'spawn' | 'output';
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
        spawnError = t('runner.outputLimit', { limit: maxProcessOutputBytes / 1024 });
        failureKind = 'runtime';
        errorSource = 'output';
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
    let failureKind: ProcessResult['failureKind'];
    let errorSource: ProcessResult['errorSource'];
    child.on('error', (error) => {
      spawnError = processErrorMessage(error);
      failureKind = error.name === 'AbortError' ? 'cancelled' : 'runtime';
      errorSource = 'spawn';
    });
    child.on('close', (code, processSignal) =>
      resolve({
        stdout,
        stderr,
        code,
        signal: processSignal,
        error: signal?.aborted ? t('runner.cancelled') : spawnError,
        failureKind: signal?.aborted ? 'cancelled' : failureKind,
        errorSource,
      }),
    );
  });
}

let cppCompilerFingerprintPromise: Promise<string> | undefined;

function cppCompilerFingerprint(): Promise<string> {
  cppCompilerFingerprintPromise ??= runProcess('g++', ['--version'], 3000)
    .then((result) => result.stdout.split('\n').find((line) => line.trim())?.trim() ?? 'g++-unknown')
    .catch(() => 'g++-unknown');
  return cppCompilerFingerprintPromise;
}

async function cppCachePath(
  cacheDirectory: string,
  harness: string,
  solutionPath: string,
): Promise<string> {
  const [solution, compiler] = await Promise.all([
    readFile(solutionPath, 'utf8'),
    cppCompilerFingerprint(),
  ]);
  const digest = createHash('sha256')
    .update(cppCacheVersion)
    .update('\0')
    .update(process.platform)
    .update('\0')
    .update(process.arch)
    .update('\0')
    .update(compiler)
    .update('\0')
    .update(cppCompileFlags.join('\0'))
    .update('\0')
    .update(solution)
    .update('\0')
    .update(harness)
    .digest('hex');
  return path.join(cacheDirectory, digest);
}

async function readableExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function pruneCppCache(cacheDirectory: string): Promise<void> {
  try {
    const files = (await readdir(cacheDirectory))
      .filter((file) => !file.endsWith('.tmp'));
    if (files.length <= maxCppCacheEntries) return;
    const entries = await Promise.all(files.map(async (file) => ({
      file,
      modifiedAt: (await stat(path.join(cacheDirectory, file))).mtimeMs,
    })));
    entries.sort((left, right) => right.modifiedAt - left.modifiedAt);
    await Promise.all(entries.slice(maxCppCacheEntries).map(({ file }) =>
      rm(path.join(cacheDirectory, file), { force: true })));
  } catch {
    // Cache maintenance is best-effort and must never block judging.
  }
}

async function storeCppExecutable(source: string, destination: string): Promise<boolean> {
  const temporary = `${destination}.${process.pid}-${randomUUID()}.tmp`;
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, temporary);
    await chmod(temporary, 0o755);
    await rename(temporary, destination);
    await pruneCppCache(path.dirname(destination));
    return true;
  } catch {
    await rm(temporary, { force: true }).catch(() => undefined);
    return await readableExecutable(destination);
  }
}

function toCppLiteral(
  value: unknown,
  type: Problem['cppArgumentTypes'][number],
): string {
  if (type === 'int' || type === 'long long') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(t('runner.cppConvert', { value: JSON.stringify(value), type }));
    }
    return type === 'long long' ? `${value}LL` : String(value);
  }
  if (type === 'double') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(t('runner.cppConvert', { value: JSON.stringify(value), type: 'double' }));
    }
    return Number.isInteger(value) ? `${value}.0` : String(value);
  }
  if (type === 'bool') {
    if (typeof value !== 'boolean') throw new Error(t('runner.cppBool'));
    return value ? 'true' : 'false';
  }
  if (type === 'string') {
    if (typeof value !== 'string') throw new Error(t('runner.cppString'));
    return `std::string(${JSON.stringify(value)})`;
  }
  if (type === 'vector<string>') {
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error(t('runner.cppStringVector'));
    }
    return `std::vector<std::string>{${value.map((item) => `std::string(${JSON.stringify(item)})`).join(', ')}}`;
  }
  if (type === 'vector<vector<int>>') {
    if (!Array.isArray(value) || !value.every(
      (row) => Array.isArray(row) && row.every((item) => Number.isInteger(item)),
    )) {
      throw new Error(t('runner.cppMatrix'));
    }
    const rows = value.map((row) => `std::vector<int>{${(row as number[]).join(', ')}}`);
    return `std::vector<std::vector<int>>{${rows.join(', ')}}`;
  }
  if (type === 'TreeNode') {
    if (value === null) return 'nullptr';
    if (!Array.isArray(value) || !value.every((item) => item === null || Number.isInteger(item))) {
      throw new Error(t('runner.cppTree'));
    }
    const nodes = value.map((item) => item === null ? 'std::nullopt' : `std::optional<int>{${item}}`);
    return `localalgo_tree(std::vector<std::optional<int>>{${nodes.join(', ')}})`;
  }
  if (!Array.isArray(value) || !value.every((item) => Number.isInteger(item))) {
    throw new Error(t('runner.cppIntVector', { type }));
  }
  const vector = `std::vector<int>{${value.join(', ')}}`;
  return type === 'ListNode' ? `localalgo_list(${vector})` : vector;
}

function buildCppHarness(problem: Problem, solutionPath: string, tests: TestCase[]): string {
  const cases = tests
    .map((testCase, index) => {
      if (testCase.input.length !== problem.cppArgumentTypes.length) {
        throw new Error(t('runner.cppTypes', { slug: problem.slug }));
      }
      const args = testCase.input
        .map((value, index) => toCppLiteral(value, problem.cppArgumentTypes[index]!))
        .join(', ');
      return `    case ${index}: {
        auto started = std::chrono::steady_clock::now();
        auto value = ${problem.functionName}(${args});
        auto elapsed = std::chrono::duration<double, std::milli>(
            std::chrono::steady_clock::now() - started).count();
        std::cout << "${resultMarker}{\\\"value\\\":" << localalgo_json(value)
                  << ",\\\"durationMs\\\":" << elapsed << "}\\n";
        return 0;
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
    out << '"';
    for (unsigned char character : value) {
        switch (character) {
            case '"': out << "\\\\\\\""; break;
            case '\\\\': out << "\\\\\\\\"; break;
            case '\\b': out << "\\\\b"; break;
            case '\\f': out << "\\\\f"; break;
            case '\\n': out << "\\\\n"; break;
            case '\\r': out << "\\\\r"; break;
            case '\\t': out << "\\\\t"; break;
            default:
                if (character < 0x20) {
                    out << "\\\\u00" << std::hex << std::setw(2) << std::setfill('0')
                        << static_cast<int>(character) << std::dec;
                } else {
                    out << static_cast<char>(character);
                }
        }
    }
    out << '"';
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
    if (node) throw std::runtime_error(${JSON.stringify(t('runner.listTooLong'))});
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

int main(int argc, char** argv) {
    if (argc != 2) return 2;
    std::size_t selected_case = 0;
    try {
        selected_case = static_cast<std::size_t>(std::stoull(argv[1]));
    } catch (...) {
        return 2;
    }
    switch (selected_case) {
${cases}
        default: return 2;
    }
}
`;
}

async function runCppTests(
  problem: Problem,
  solutionPath: string,
  tests: TestCase[],
  timeoutMs: number,
  signal?: AbortSignal,
  cacheDirectory?: string,
): Promise<TestResult[]> {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-cpp-'));
  const harnessPath = path.join(directory, 'harness.cpp');
  const temporaryExecutablePath = path.join(directory, 'solution');
  try {
    const harness = buildCppHarness(problem, solutionPath, tests);
    const cachedPath = cacheDirectory
      ? await cppCachePath(cacheDirectory, harness, solutionPath)
      : undefined;
    let executablePath = cachedPath && await readableExecutable(cachedPath)
      ? cachedPath
      : undefined;
    if (!executablePath) {
      await writeFile(harnessPath, harness, 'utf8');
      const compilation = await runProcess(
        'g++',
        [...cppCompileFlags, harnessPath, '-o', temporaryExecutablePath],
        15_000,
        signal,
      );
      if (compilation.error || compilation.code !== 0) {
        const cancelled = compilation.failureKind === 'cancelled';
        const error = cancelled
          ? compilation.error ?? t('runner.cancelled')
          : compilation.error
            ? compilation.errorSource === 'spawn'
              ? t('runner.gppFailed', { error: compilation.error })
              : compilation.error
            : compilation.signal
              ? t('runner.compileTerminated', { signal: compilation.signal })
              : compilation.stderr.trim() || t('runner.compileFailed');
        return [{
          index: 0,
          passed: false,
          input: tests[0]?.input,
          expected: tests[0]?.expected,
          durationMs: 0,
          error,
          failureKind: cancelled ? 'cancelled' : 'compilation',
        }];
      }
      executablePath = cachedPath && await storeCppExecutable(temporaryExecutablePath, cachedPath)
        ? cachedPath
        : temporaryExecutablePath;
    }
    const results: TestResult[] = [];
    for (const [index, testCase] of tests.entries()) {
      if (signal?.aborted) {
        results.push({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: t('runner.cancelled'),
          failureKind: 'cancelled',
        });
        break;
      }
      const startedAt = Date.now();
      const execution = await runProcess(executablePath, [String(index)], timeoutMs, signal);
      const wallDurationMs = Date.now() - startedAt;
      if (execution.error || execution.code !== 0) {
        const cancelled = execution.failureKind === 'cancelled';
        results.push({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: wallDurationMs,
          error: execution.error ?? (execution.signal
            ? t('runner.terminated', { signal: execution.signal })
            : execution.stderr.trim() || t('runner.exitCode', { code: execution.code ?? 'unknown' })),
          failureKind: cancelled ? 'cancelled' : 'runtime',
        });
        if (cancelled) break;
        continue;
      }
      const line = execution.stdout
        .split('\n')
        .reverse()
        .find((candidate) => candidate.startsWith(resultMarker));
      if (!line) {
        results.push({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: t('runner.noResult'),
          failureKind: 'runtime',
        });
        continue;
      }
      try {
        const payload = JSON.parse(line.slice(resultMarker.length)) as {
          value: unknown;
          durationMs: number;
        };
        results.push({
          index,
          passed: valuesEqual(payload.value, testCase.expected, problem.unorderedResult),
          input: testCase.input,
          expected: testCase.expected,
          actual: payload.value,
          durationMs: payload.durationMs,
        });
      } catch (error) {
        results.push({
          index,
          passed: false,
          input: testCase.input,
          expected: testCase.expected,
          durationMs: 0,
          error: t('runner.cppParseFailed', { error: String(error) }),
          failureKind: 'runtime',
        });
      }
    }
    return results;
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
  cppCacheDirectory?: string,
): Promise<TestResult[]> {
  const tests = includeHidden
    ? [...problem.sampleTests, ...problem.hiddenTests]
    : problem.sampleTests;
  if (language === 'cpp') {
    return await runCppTests(problem, solutionPath, tests, timeoutMs, signal, cppCacheDirectory);
  }

  const results: TestResult[] = [];
  for (const [index, testCase] of tests.entries()) {
    if (signal?.aborted) {
      results.push({
        index,
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        durationMs: 0,
        error: t('runner.cancelled'),
        failureKind: 'cancelled',
      });
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
  cppCacheDirectory?: string,
): Promise<TestResult> {
  const testCase: TestCase = { input, expected: undefined };
  const result = language === 'cpp'
    ? (await runCppTests(
        problem,
        solutionPath,
        [testCase],
        timeoutMs,
        signal,
        cppCacheDirectory,
      ))[0]
    : await runPythonCase(problem, solutionPath, testCase, 0, timeoutMs, signal);
  if (!result) {
    return {
      index: 0,
      passed: false,
      input,
      expected: undefined,
      durationMs: 0,
      error: t('runner.noResult'),
      failureKind: 'runtime',
    };
  }
  return { ...result, passed: !result.error };
}

export function formatCustomResult(result: TestResult): string {
  if (result.error) {
    const errorLines = result.error.trim().split('\n');
    if (isCompilationFailure(result)) {
      const visible = errorLines.length > 12
        ? [...errorLines.slice(0, 6), '…', ...errorLines.slice(-6)]
        : errorLines;
      return `${t('runner.compileFailed')}\n${visible.map((line) => `  ${line}`).join('\n')}`;
    }
    return `${t('runner.executionFailed')}\n${result.error.trim()}`;
  }
  const serialized = JSON.stringify(result.actual, null, 2);
  return `${t('runner.returnValue')}\n${serialized ?? String(result.actual)}\n\n${t('runner.duration', {
    duration: result.durationMs.toFixed(1),
  })}`;
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
        return t('runner.diffValue', {
          path: `${path}[${index}]`,
          expected: inlineValue(expectedCharacters[index]),
          actual: inlineValue(actualCharacters[index]),
        });
      }
    }
    return t('runner.diffLength', {
      path,
      expected: expectedCharacters.length,
      actual: actualCharacters.length,
    });
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const sharedLength = Math.min(expected.length, actual.length);
    for (let index = 0; index < sharedLength; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return t('runner.diffLength', { path, expected: expected.length, actual: actual.length });
  }
  return t('runner.diffValue', {
    path,
    expected: inlineValue(expected),
    actual: inlineValue(actual),
  });
}

export function formatResults(results: TestResult[]): string {
  const lines = results.map((result) => {
    const timing = `${result.durationMs.toFixed(1)}ms`;
    if (result.passed) return `✓ case ${result.index + 1}  ${timing}`;
    if (result.error) {
      const errorLines = result.error.trim().split('\n');
      if (isCompilationFailure(result)) {
        const visible = errorLines.length > 10
          ? [...errorLines.slice(0, 5), '…', ...errorLines.slice(-5)]
          : errorLines;
        const excerpt = visible.map((line) => `    ${line}`).join('\n');
        return `✗ ${t('runner.compileFailed')}\n${excerpt}`;
      }
      return [
        `✗ case ${result.index + 1}  ${t('runner.runtimeError')}`,
        result.input ? labeledValue(t('runner.input'), result.input) : undefined,
        `    ${t('runner.error')}:\n${errorLines.map((line) => `      ${line}`).join('\n')}`,
      ].filter(Boolean).join('\n');
    }
    const difference = firstDifference(result.expected, result.actual);
    return [
      `✗ case ${result.index + 1}  ${t('runner.wrongAnswer')}`,
      result.input ? labeledValue(t('runner.input'), result.input) : undefined,
      labeledValue(t('runner.expected'), result.expected),
      labeledValue(t('runner.received'), result.actual),
      difference ? `    ${t('runner.firstDifference', { difference })}` : undefined,
    ].filter(Boolean).join('\n');
  });
  const passed = results.filter((result) => result.passed).length;
  lines.push(`\n${t('runner.summary', { passed, total: results.length })}`);
  return lines.join('\n');
}
