import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Storage } from './storage.js';

test('persists progress in the selected workspace', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-storage-'));
  const storage = new Storage(directory);
  const state = {
    activeProblem: 'two-sum',
    activeLanguage: 'cpp' as const,
    problems: {
      'two-sum': {
        status: 'solved' as const,
        attempts: 1,
        updatedAt: '2026-08-17T00:00:00.000Z',
      },
    },
  };
  await storage.save(state);
  assert.deepEqual(await storage.load(), state);
  const stored = JSON.parse(await readFile(storage.stateFile, 'utf8')) as { schemaVersion: number };
  assert.equal(stored.schemaVersion, 3);
});

test('persists and reloads the interface locale', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-storage-'));
  const storage = new Storage(directory);
  const state = {
    locale: 'en' as const,
    activeLanguage: 'python' as const,
    problems: {},
  };
  await storage.save(state);
  assert.deepEqual(await storage.load(), state);
  const stored = JSON.parse(await readFile(storage.stateFile, 'utf8')) as {
    schemaVersion: number;
    state: { locale?: string };
  };
  assert.equal(stored.schemaVersion, 3);
  assert.equal(stored.state.locale, 'en');
});

test('loads a version 2 state file without a locale', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-storage-'));
  const storage = new Storage(directory);
  await storage.ensureDirectories();
  const state = {
    activeLanguage: 'python' as const,
    problems: {},
  };
  await writeFile(storage.stateFile, JSON.stringify({ schemaVersion: 2, state }));
  assert.deepEqual(await storage.load(), state);
});

test('rejects an invalid locale', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-storage-'));
  const storage = new Storage(directory);
  await storage.ensureDirectories();
  await writeFile(storage.stateFile, JSON.stringify({
    schemaVersion: 3,
    state: { locale: 'fr', problems: {} },
  }));
  await assert.rejects(storage.load(), /locale/);
});

test('migrates a version 1 state envelope', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-storage-'));
  const storage = new Storage(directory);
  await storage.ensureDirectories();
  const state = {
    activeLanguage: 'python' as const,
    problems: {
      'two-sum': {
        status: 'started' as const,
        attempts: 2,
        updatedAt: '2026-08-17T00:00:00.000Z',
      },
    },
  };
  await writeFile(storage.stateFile, JSON.stringify({ schemaVersion: 1, state }));
  assert.deepEqual(await storage.load(), state);
  await storage.save(state);
  const stored = JSON.parse(await readFile(storage.stateFile, 'utf8')) as { schemaVersion: number };
  assert.equal(stored.schemaVersion, 3);
});

test('persists wrong-answer review metadata', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-storage-'));
  const storage = new Storage(directory);
  const state = {
    activeLanguage: 'cpp' as const,
    problems: {
      'two-sum': {
        status: 'started' as const,
        attempts: 1,
        failedAttempts: 1,
        lastAttemptAt: '2026-08-18T01:00:00.000Z',
        updatedAt: '2026-08-18T01:00:00.000Z',
      },
    },
  };
  await storage.save(state);
  assert.deepEqual(await storage.load(), state);
});

test('loads a legacy state file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-storage-'));
  const storage = new Storage(directory);
  await storage.ensureDirectories();
  const legacy = { activeLanguage: 'python', problems: {} };
  await writeFile(storage.stateFile, JSON.stringify(legacy));
  assert.deepEqual(await storage.load(), legacy);
});

test('migrates the old .localcode data directory', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-storage-'));
  const legacyDirectory = path.join(directory, '.localcode');
  await mkdir(legacyDirectory);
  const legacy = { activeLanguage: 'python', problems: {} };
  await writeFile(path.join(legacyDirectory, 'state.json'), JSON.stringify(legacy));
  const storage = new Storage(directory);
  assert.deepEqual(await storage.load(), legacy);
  assert.equal(storage.dataDirectory, path.join(directory, '.localalgo'));
  assert.equal(storage.migratedFromLegacyDirectory, true);
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, '.localalgo', 'state.json'), 'utf8')), legacy);
  await assert.rejects(readFile(path.join(legacyDirectory, 'state.json')), /ENOENT/);
});

test('recovers progress from backup when the main state is corrupted', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-storage-'));
  const storage = new Storage(directory);
  const first = {
    activeLanguage: 'python' as const,
    problems: {
      'two-sum': {
        status: 'started' as const,
        attempts: 1,
        updatedAt: '2026-08-18T00:00:00.000Z',
      },
    },
  };
  const second = {
    ...first,
    problems: {
      'two-sum': {
        ...first.problems['two-sum'],
        attempts: 2,
      },
    },
  };
  await storage.save(first);
  await storage.save(second);
  await writeFile(storage.stateFile, '{broken json');
  assert.deepEqual(await storage.load(), first);
  assert.equal(storage.recoveredFromBackup, true);
  await storage.save(first);
  assert.deepEqual(await storage.load(), first);
});

test('imports and reloads a local problem pack', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localcode-storage-'));
  const source = path.join(directory, 'pack.json');
  const example = await readFile(new URL('../examples/problem-pack.json', import.meta.url), 'utf8');
  await writeFile(source, example);
  const storage = new Storage(path.join(directory, 'workspace'));
  const imported = await storage.importProblemPack(source, new Set());
  assert.equal(imported[0]?.slug, 'fibonacci-number');
  assert.equal((await storage.loadProblems())[0]?.title, '斐波那契数');
  await writeFile(path.join(storage.problemsDirectory, 'broken.json'), '{broken json');
  assert.equal((await storage.loadProblems())[0]?.slug, 'fibonacci-number');
  assert.equal(storage.problemLoadErrors.length, 1);
  assert.match(storage.problemLoadErrors[0]!, /broken\.json/);
  await assert.rejects(
    storage.importProblemPack(source, new Set(['fibonacci-number'])),
    /题目已存在/,
  );
});

test('stores a multi-problem import as one atomic pack file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'localalgo-storage-'));
  const source = path.join(directory, 'pack.json');
  const example = JSON.parse(
    await readFile(new URL('../examples/problem-pack.json', import.meta.url), 'utf8'),
  ) as { problems: Array<Record<string, unknown>> };
  const first = example.problems[0]!;
  const second = {
    ...first,
    slug: 'fibonacci-number-copy',
    title: '斐波那契数副本',
  };
  await writeFile(source, JSON.stringify({ problems: [first, second] }));
  const storage = new Storage(path.join(directory, 'workspace'));
  const imported = await storage.importProblemPack(source, new Set());
  assert.equal(imported.length, 2);
  const files = (await readdir(storage.problemsDirectory))
    .filter((file) => file.endsWith('.json'));
  assert.equal(files.length, 1);
  assert.equal((await storage.loadProblems()).length, 2);
});
