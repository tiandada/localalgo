import { copyFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseProblemPack } from './problem-pack.js';
import type { Language, Problem, ProgressState } from './types.js';

const stateSchemaVersion = 2;

function validateState(value: unknown): ProgressState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('状态根节点必须是对象');
  }
  const record = value as Record<string, unknown>;
  const storedVersion = record.schemaVersion;
  if (storedVersion !== undefined && storedVersion !== 1 && storedVersion !== stateSchemaVersion) {
    throw new Error(`不支持的状态版本：${String(storedVersion)}`);
  }
  const rawState = storedVersion === 1 || storedVersion === stateSchemaVersion ? record.state : record;
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
    throw new Error('state 必须是对象');
  }
  const state = rawState as Record<string, unknown>;
  if (state.activeProblem !== undefined && typeof state.activeProblem !== 'string') {
    throw new Error('activeProblem 必须是字符串');
  }
  if (state.activeLanguage !== undefined && state.activeLanguage !== 'python' && state.activeLanguage !== 'cpp') {
    throw new Error('activeLanguage 必须是 python 或 cpp');
  }
  if (!state.problems || typeof state.problems !== 'object' || Array.isArray(state.problems)) {
    throw new Error('problems 必须是对象');
  }
  const problems: ProgressState['problems'] = {};
  for (const [slug, rawEntry] of Object.entries(state.problems as Record<string, unknown>)) {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      throw new Error(`problems.${slug} 必须是对象`);
    }
    const entry = rawEntry as Record<string, unknown>;
    if (entry.status !== 'started' && entry.status !== 'solved') {
      throw new Error(`problems.${slug}.status 无效`);
    }
    if (typeof entry.attempts !== 'number' || !Number.isInteger(entry.attempts) || entry.attempts < 0) {
      throw new Error(`problems.${slug}.attempts 必须是非负整数`);
    }
    if (typeof entry.updatedAt !== 'string' || Number.isNaN(Date.parse(entry.updatedAt))) {
      throw new Error(`problems.${slug}.updatedAt 必须是有效日期`);
    }
    if (entry.failedAttempts !== undefined && (
      typeof entry.failedAttempts !== 'number' ||
      !Number.isInteger(entry.failedAttempts) ||
      entry.failedAttempts < 0
    )) {
      throw new Error(`problems.${slug}.failedAttempts 必须是非负整数`);
    }
    if (entry.lastAttemptAt !== undefined && (
      typeof entry.lastAttemptAt !== 'string' || Number.isNaN(Date.parse(entry.lastAttemptAt))
    )) {
      throw new Error(`problems.${slug}.lastAttemptAt 必须是有效日期`);
    }
    const validatedEntry: ProgressState['problems'][string] = {
      status: entry.status,
      attempts: entry.attempts,
      updatedAt: entry.updatedAt,
    };
    if (typeof entry.failedAttempts === 'number') validatedEntry.failedAttempts = entry.failedAttempts;
    if (typeof entry.lastAttemptAt === 'string') validatedEntry.lastAttemptAt = entry.lastAttemptAt;
    problems[slug] = validatedEntry;
  }
  const result: ProgressState = {
    activeLanguage: (state.activeLanguage as Language | undefined) ?? 'python',
    problems,
  };
  if (typeof state.activeProblem === 'string') result.activeProblem = state.activeProblem;
  return result;
}

export class Storage {
  readonly dataDirectory: string;
  readonly legacyDataDirectory: string;
  readonly solutionsDirectory: string;
  readonly problemsDirectory: string;
  readonly stateFile: string;
  readonly stateBackupFile: string;
  recoveredFromBackup = false;
  migratedFromLegacyDirectory = false;
  private preserveBackupOnNextSave = false;

  constructor(readonly workspace = process.cwd()) {
    this.dataDirectory = path.join(workspace, '.localalgo');
    this.legacyDataDirectory = path.join(workspace, '.localcode');
    this.solutionsDirectory = path.join(workspace, 'solutions');
    this.problemsDirectory = path.join(this.dataDirectory, 'problems');
    this.stateFile = path.join(this.dataDirectory, 'state.json');
    this.stateBackupFile = path.join(this.dataDirectory, 'state.json.bak');
  }

  async ensureDirectories(): Promise<void> {
    try {
      await rename(this.legacyDataDirectory, this.dataDirectory);
      this.migratedFromLegacyDirectory = true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT' && code !== 'EEXIST' && code !== 'ENOTEMPTY') throw error;
    }
    await Promise.all([
      mkdir(this.dataDirectory, { recursive: true }),
      mkdir(this.solutionsDirectory, { recursive: true }),
      mkdir(this.problemsDirectory, { recursive: true }),
    ]);
  }

  solutionPath(slug: string, language: Language = 'python'): string {
    const extension = language === 'cpp' ? 'cpp' : 'py';
    return path.join(this.solutionsDirectory, `${slug}.${extension}`);
  }

  async load(): Promise<ProgressState> {
    await this.ensureDirectories();
    try {
      const raw = await readFile(this.stateFile, 'utf8');
      return validateState(JSON.parse(raw));
    } catch (error) {
      try {
        const backup = await readFile(this.stateBackupFile, 'utf8');
        const recovered = validateState(JSON.parse(backup));
        this.recoveredFromBackup = true;
        this.preserveBackupOnNextSave = true;
        return recovered;
      } catch (backupError) {
        if (
          (error as NodeJS.ErrnoException).code === 'ENOENT' &&
          (backupError as NodeJS.ErrnoException).code === 'ENOENT'
        ) return { problems: {} };
        throw new Error(`状态文件损坏，且无法读取备份：${String(error)}；备份：${String(backupError)}`);
      }
    }
  }

  async save(state: ProgressState): Promise<void> {
    await this.ensureDirectories();
    const temporaryFile = `${this.stateFile}.tmp`;
    const validated = validateState(state);
    if (!this.preserveBackupOnNextSave) {
      try {
        await copyFile(this.stateFile, this.stateBackupFile);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    const stored = { schemaVersion: stateSchemaVersion, state: validated };
    await writeFile(temporaryFile, `${JSON.stringify(stored, null, 2)}\n`, 'utf8');
    await rename(temporaryFile, this.stateFile);
    this.preserveBackupOnNextSave = false;
  }

  async loadProblems(): Promise<Problem[]> {
    await this.ensureDirectories();
    const files = (await readdir(this.problemsDirectory))
      .filter((file) => file.endsWith('.json'))
      .sort();
    const problems: Problem[] = [];
    for (const file of files) {
      const raw = await readFile(path.join(this.problemsDirectory, file), 'utf8');
      try {
        problems.push(...parseProblemPack(JSON.parse(raw)));
      } catch (error) {
        throw new Error(`${file}：${(error as Error).message}`);
      }
    }
    return problems;
  }

  async importProblemPack(sourcePath: string, occupiedSlugs: Set<string>): Promise<Problem[]> {
    const raw = await readFile(sourcePath, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`JSON 格式错误：${(error as Error).message}`);
    }
    const problems = parseProblemPack(parsed);
    for (const problem of problems) {
      if (occupiedSlugs.has(problem.slug)) throw new Error(`题目已存在：${problem.slug}`);
    }
    await this.ensureDirectories();
    const existingFiles = new Set(await readdir(this.problemsDirectory));
    for (const problem of problems) {
      if (existingFiles.has(`${problem.slug}.json`)) {
        throw new Error(`题目文件已存在：${problem.slug}.json`);
      }
    }
    for (const problem of problems) {
      const destination = path.join(this.problemsDirectory, `${problem.slug}.json`);
      await writeFile(destination, `${JSON.stringify([problem], null, 2)}\n`, { flag: 'wx' });
    }
    return problems;
  }
}
