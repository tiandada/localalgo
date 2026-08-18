export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'python' | 'cpp';
export type ArgumentType =
  | 'int'
  | 'long long'
  | 'double'
  | 'bool'
  | 'string'
  | 'vector<int>'
  | 'vector<string>'
  | 'vector<vector<int>>'
  | 'ListNode'
  | 'TreeNode';

export interface TestCase {
  input: unknown[];
  expected: unknown;
}

export interface Problem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  summary: string;
  constraints: string[];
  hints: string[];
  examples: Array<{ input: string; output: string }>;
  functionName: string;
  cppArgumentTypes: ArgumentType[];
  unorderedResult?: boolean;
  starters: Record<Language, string>;
  sampleTests: TestCase[];
  hiddenTests: TestCase[];
}

export interface TestResult {
  index: number;
  passed: boolean;
  input?: unknown[];
  expected: unknown;
  actual?: unknown;
  durationMs: number;
  error?: string;
}

export interface ProgressEntry {
  status: 'started' | 'solved';
  attempts: number;
  failedAttempts?: number;
  lastAttemptAt?: string;
  updatedAt: string;
}

export interface ProgressState {
  activeProblem?: string;
  activeLanguage?: Language;
  problems: Record<string, ProgressEntry>;
}

export type MessageKind = 'system' | 'user' | 'info' | 'success' | 'error';

export interface Message {
  id: number;
  kind: MessageKind;
  text: string;
}
