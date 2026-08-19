#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Static, Text, render, useApp, useInput, useStdin } from 'ink';
import { problems as builtInProblems } from './catalog.js';
import { completeInput, formatHelp, suggestionsForInput } from './commands.js';
import { deleteBackward, deleteForward } from './composer.js';
import {
  formatCustomResult,
  formatResults,
  isCancelledResult,
  runCustomTest,
  runTests,
} from './runner.js';
import { getLocale, localeLabel, setLocale, t } from './messages.js';
import { Storage } from './storage.js';
import { findTutorial, formatRoadmap, formatTutorial, tutorials } from './tutorials.js';
import type { Difficulty, Language, Message, MessageKind, Problem, ProgressState } from './types.js';
import { packageVersion, wantsVersion } from './version.js';

const cliRunTimeoutMs = 5000;

function problemText(problem: Problem): string {
  const examples = problem.examples
    .map((example, index) => `示例 ${index + 1}\n  input:  ${example.input}\n  output: ${example.output}`)
    .join('\n\n');
  const constraints = problem.constraints.length
    ? `\n\n约束\n${problem.constraints.map((constraint) => `  • ${constraint}`).join('\n')}`
    : '';
  return `${problem.title} · ${problem.difficulty}\n${problem.tags.join(' · ')}\n\n题目\n${problem.summary}\n\n${examples}${constraints}`;
}

function solutionFileText(problem: Problem, language: Language): string {
  const prefix = language === 'cpp' ? '// ' : '# ';
  const lines = [
    `${problem.title} (${problem.slug}) · ${problem.difficulty}`,
    '',
    ...problem.summary.split('\n'),
    '',
    '示例：',
    ...problem.examples.flatMap((example) => [
      `  输入：${example.input}`,
      `  输出：${example.output}`,
    ]),
    ...(problem.constraints.length
      ? ['', '约束：', ...problem.constraints.map((constraint) => `  ${constraint}`)]
      : []),
  ];
  const header = lines.map((line) => line ? `${prefix}${line}` : prefix.trimEnd()).join('\n');
  return `${header}\n\n${problem.starters[language]}`;
}

function messageColor(kind: MessageKind): string | undefined {
  if (kind === 'user') return 'cyan';
  if (kind === 'success') return 'green';
  if (kind === 'error') return 'red';
  if (kind === 'system') return 'yellow';
  return undefined;
}

function MessageView({ message }: { message: Message }) {
  const prefix = message.kind === 'user' ? '› ' : message.kind === 'system' ? '● ' : '  ';
  return (
    <Box marginBottom={1}>
      <Text color={messageColor(message.kind)}>{prefix}</Text>
      <Text color={messageColor(message.kind)}>{message.text}</Text>
    </Box>
  );
}

function splitEditorCommand(command: string): string[] {
  return command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^(["'])|(["'])$/g, '')) ?? [];
}

function parseLanguage(value?: string): Language | undefined {
  if (!value) return undefined;
  if (value === 'python' || value === 'py') return 'python';
  if (value === 'cpp' || value === 'c++') return 'cpp';
  return undefined;
}

function languageLabel(language: Language): string {
  return language === 'cpp' ? 'C++' : 'Python';
}

async function toolVersion(command: string): Promise<string> {
  return await new Promise((resolve) => {
    const child = spawn(command, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 3000,
    });
    let output = '';
    let settled = false;
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (output += chunk));
    child.stderr.on('data', (chunk: string) => (output += chunk));
    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        resolve(`✗ ${command} · ${error.message}`);
      }
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      const firstLine = output.split('\n').map((line) => line.trim()).find(Boolean);
      resolve(code === 0
        ? `✓ ${command} · ${firstLine ?? t('tool.available')}`
        : `✗ ${command} · ${signal
          ? t('tool.terminated', { signal })
          : t('tool.exitCode', { code: code ?? 'unknown' })}`);
    });
  });
}

interface ComposerProps {
  busy: string;
  problemSlugs: string[];
  topics: string[];
  tutorialTopics: string[];
  onSubmit: (value: string) => void;
}

function Composer({ busy, problemSlugs, topics, tutorialTopics, onSubmit }: ComposerProps) {
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState(0);
  const history = useRef<string[]>([]);
  const historyPosition = useRef<number | null>(null);
  const historyDraft = useRef('');
  const suggestions = useMemo(
    () => suggestionsForInput(value, problemSlugs, topics, tutorialTopics),
    [problemSlugs, topics, tutorialTopics, value],
  );

  const replaceValue = useCallback((next: string) => {
    setValue(next);
    setCursor(Array.from(next).length);
  }, []);

  useInput(
    (inputCharacter, key) => {
      const characters = Array.from(value);
      if (key.return) {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (history.current.at(-1) !== trimmed) {
          history.current.push(trimmed);
          if (history.current.length > 100) history.current.shift();
        }
        historyPosition.current = null;
        replaceValue('');
        onSubmit(trimmed);
        return;
      }
      if (key.tab) {
        replaceValue(completeInput(value, problemSlugs, topics, tutorialTopics));
        historyPosition.current = null;
        return;
      }
      if (key.upArrow && history.current.length) {
        if (historyPosition.current === null) {
          historyDraft.current = value;
          historyPosition.current = history.current.length - 1;
        } else {
          historyPosition.current = Math.max(0, historyPosition.current - 1);
        }
        replaceValue(history.current[historyPosition.current] ?? '');
        return;
      }
      if (key.downArrow && historyPosition.current !== null) {
        if (historyPosition.current < history.current.length - 1) {
          historyPosition.current += 1;
          replaceValue(history.current[historyPosition.current] ?? '');
        } else {
          historyPosition.current = null;
          replaceValue(historyDraft.current);
        }
        return;
      }
      if (key.leftArrow) {
        setCursor((current) => Math.max(0, current - 1));
        return;
      }
      if (key.rightArrow) {
        setCursor((current) => Math.min(characters.length, current + 1));
        return;
      }
      // Most terminals send DEL (0x7f) for Backspace. Ink exposes that as
      // key.delete, while Ctrl+H is exposed as key.backspace. Treat both as
      // backward deletion for consistent terminal behavior.
      if (key.backspace || key.delete) {
        const next = deleteBackward(value, cursor);
        setValue(next.value);
        setCursor(next.cursor);
        historyPosition.current = null;
        return;
      }
      if (key.ctrl && inputCharacter === 'd') {
        const next = deleteForward(value, cursor);
        setValue(next.value);
        setCursor(next.cursor);
        historyPosition.current = null;
        return;
      }
      if (key.home) {
        setCursor(0);
        return;
      }
      if (key.end) {
        setCursor(characters.length);
        return;
      }
      if (key.escape) {
        replaceValue('');
        historyPosition.current = null;
        return;
      }
      if (key.ctrl && inputCharacter === 'a') {
        setCursor(0);
        return;
      }
      if (key.ctrl && inputCharacter === 'e') {
        setCursor(characters.length);
        return;
      }
      if (key.ctrl && inputCharacter === 'u') {
        setValue(characters.slice(cursor).join(''));
        setCursor(0);
        historyPosition.current = null;
        return;
      }
      if (key.ctrl && inputCharacter === 'w') {
        const before = characters.slice(0, cursor).join('');
        const after = characters.slice(cursor).join('');
        const nextBefore = before.replace(/\s*\S+\s*$/, '');
        setValue(nextBefore + after);
        setCursor(Array.from(nextBefore).length);
        historyPosition.current = null;
        return;
      }
      if (key.ctrl || key.meta || !inputCharacter) return;
      const inserted = Array.from(inputCharacter.replace(/[\r\n]+/g, ' '));
      characters.splice(cursor, 0, ...inserted);
      setValue(characters.join(''));
      setCursor(cursor + inserted.length);
      historyPosition.current = null;
    },
    { isActive: !busy },
  );

  if (busy) return <Text color="yellow">  ◌ {busy}</Text>;

  const characters = Array.from(value);
  const before = characters.slice(0, cursor).join('');
  const atCursor = characters[cursor] ?? ' ';
  const after = characters.slice(cursor + 1).join('');
  return (
    <Box flexDirection="column">
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {suggestions.map((suggestion, index) => (
            <Text key={suggestion} dimColor={index !== 0} color={index === 0 ? 'cyan' : undefined}>
              {'  '}{suggestion}
            </Text>
          ))}
        </Box>
      )}
      <Box>
        <Text color="cyan">› </Text>
        {value ? (
          <Text>{before}<Text inverse>{atCursor}</Text>{after}</Text>
        ) : (
          <Text><Text inverse> </Text><Text dimColor> {t('cli.input')}</Text></Text>
        )}
      </Box>
    </Box>
  );
}

interface TopicChoice {
  name: string;
  solved: number;
  total: number;
  difficulties: Record<Difficulty, number>;
}

interface TopicPickerProps {
  choices: TopicChoice[];
  onCancel: () => void;
  onSelect: (topic: string, difficulty?: Difficulty) => void;
}

function TopicPicker({ choices, onCancel, onSelect }: TopicPickerProps) {
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const [notice, setNotice] = useState('');
  const visibleCount = 9;
  const start = Math.max(0, Math.min(selected - Math.floor(visibleCount / 2), choices.length - visibleCount));
  const visible = choices.slice(start, start + visibleCount);

  useInput((inputCharacter, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow || inputCharacter === 'k') {
      selectedRef.current = (selectedRef.current - 1 + choices.length) % choices.length;
      setSelected(selectedRef.current);
      setNotice('');
      return;
    }
    if (key.downArrow || inputCharacter === 'j') {
      selectedRef.current = (selectedRef.current + 1) % choices.length;
      setSelected(selectedRef.current);
      setNotice('');
      return;
    }
    const choice = choices[selectedRef.current];
    if (!choice) return;
    if (key.return) onSelect(choice.name);
    else {
      const shortcut = inputCharacter.toLowerCase();
      const difficulty = shortcut === 'e' ? 'easy' : shortcut === 'm' ? 'medium' : shortcut === 'h' ? 'hard' : undefined;
      if (!difficulty) return;
      if (choice.difficulties[difficulty] === 0) {
        setNotice(t('picker.noDifficulty', { topic: choice.name, difficulty }));
        return;
      }
      onSelect(choice.name, difficulty);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">{t('picker.topic')}</Text>
      {start > 0 && <Text dimColor>  {t('picker.up', { count: start })}</Text>}
      {visible.map((choice, index) => {
        const absoluteIndex = start + index;
        const active = absoluteIndex === selected;
        return (
          <Text key={choice.name} color={active ? 'cyan' : undefined} inverse={active}>
            {active ? '› ' : '  '}{choice.name}  {choice.solved}/{choice.total}  E{choice.difficulties.easy} M{choice.difficulties.medium} H{choice.difficulties.hard}
          </Text>
        );
      })}
      {start + visible.length < choices.length && (
        <Text dimColor>  {t('picker.down', { count: choices.length - start - visible.length })}</Text>
      )}
      <Box marginTop={1}>
        <Text color={notice ? 'yellow' : undefined} dimColor={!notice}>
          {notice || t('picker.topicControls')}
        </Text>
      </Box>
    </Box>
  );
}

interface LearnPickerProps {
  choices: typeof tutorials;
  onCancel: () => void;
  onSelect: (topic: string) => void;
}

function LearnPicker({ choices, onCancel, onSelect }: LearnPickerProps) {
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const visibleCount = 9;
  const start = Math.max(0, Math.min(selected - Math.floor(visibleCount / 2), choices.length - visibleCount));
  const visible = choices.slice(start, start + visibleCount);

  useInput((inputCharacter, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow || inputCharacter === 'k') {
      selectedRef.current = (selectedRef.current - 1 + choices.length) % choices.length;
      setSelected(selectedRef.current);
      return;
    }
    if (key.downArrow || inputCharacter === 'j') {
      selectedRef.current = (selectedRef.current + 1) % choices.length;
      setSelected(selectedRef.current);
      return;
    }
    if (key.return) {
      const choice = choices[selectedRef.current];
      if (choice) onSelect(choice.topic);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">{t('picker.learn')}</Text>
      {start > 0 && <Text dimColor>  {t('picker.up', { count: start })}</Text>}
      {visible.map((choice, index) => {
        const active = start + index === selected;
        return (
          <Text key={choice.slug} color={active ? 'cyan' : undefined} inverse={active}>
            {active ? '› ' : '  '}{choice.topic} · {choice.title}
          </Text>
        );
      })}
      {start + visible.length < choices.length && (
        <Text dimColor>  {t('picker.down', { count: choices.length - start - visible.length })}</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>{t('picker.learnControls')}</Text>
      </Box>
    </Box>
  );
}

interface AppProps {
  workspace: string;
  clearOutput: () => void;
}

function App({ workspace, clearOutput }: AppProps) {
  const storage = useMemo(() => new Storage(workspace), [workspace]);
  const [catalog, setCatalog] = useState<Problem[]>(builtInProblems);
  const [progress, setProgress] = useState<ProgressState>({ problems: {} });
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(t('cli.loading'));
  const [, setUiLocale] = useState(getLocale());
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [learnPickerOpen, setLearnPickerOpen] = useState(false);
  const nextMessageId = useRef(1);
  const hintLevels = useRef<Record<string, number>>({});
  const runController = useRef<AbortController | undefined>(undefined);
  const cancelKeyInFlight = useRef(false);
  const { exit } = useApp();
  const { setRawMode } = useStdin();

  const handleGlobalInput = useCallback((inputCharacter: string, key: { ctrl: boolean }) => {
    if (!key.ctrl || inputCharacter !== 'c') return;
    const controller = runController.current;
    if (controller && !controller.signal.aborted) {
      cancelKeyInFlight.current = true;
      setBusy(t('cli.cancelling'));
      controller.abort();
      setTimeout(() => {
        cancelKeyInFlight.current = false;
      }, 250);
    } else if (cancelKeyInFlight.current) {
      return;
    } else {
      exit();
    }
  }, [exit]);
  useInput(handleGlobalInput);

  const append = useCallback((kind: MessageKind, text: string) => {
    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, kind, text },
    ]);
  }, []);

  useEffect(() => {
    Promise.allSettled([storage.load(), storage.loadProblems()]).then(([stateResult, problemsResult]) => {
      if (stateResult.status === 'fulfilled') {
        setProgress(stateResult.value);
        const restoredLocale = stateResult.value.locale ?? 'zh';
        setLocale(restoredLocale);
        setUiLocale(restoredLocale);
        append('system', t('cli.welcome'));
        if (storage.migratedFromLegacyDirectory) append('system', t('state.migrated'));
        if (storage.recoveredFromBackup) append('system', t('state.recovered'));
      }
      else {
        append('system', t('cli.welcome'));
        append('error', t('state.failed', { error: String(stateResult.reason) }));
      }
      if (problemsResult.status === 'fulfilled') {
        const occupied = new Set(builtInProblems.map((problem) => problem.slug));
        const custom = problemsResult.value.filter((problem) => {
          if (occupied.has(problem.slug)) {
            append('error', t('catalog.conflict', { slug: problem.slug }));
            return false;
          }
          occupied.add(problem.slug);
          return true;
        });
        setCatalog([...builtInProblems, ...custom]);
      } else {
        append('error', t('catalog.failed', { error: String(problemsResult.reason) }));
      }
      setBusy('');
    });
  }, [append, storage]);

  const activeProblem = progress.activeProblem
    ? catalog.find((problem) => problem.slug === progress.activeProblem)
    : undefined;
  const activeLanguage = progress.activeLanguage ?? 'python';
  const problemSlugs = useMemo(() => catalog.map((problem) => problem.slug), [catalog]);
  const topics = useMemo(
    () => [...new Set(catalog.flatMap((problem) => problem.tags))].sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [catalog],
  );
  const tutorialTopics = useMemo(() => tutorials.map((tutorial) => tutorial.topic), []);
  const topicChoices = useMemo(
    () => topics.map((topic) => {
      const matching = catalog.filter((problem) => problem.tags.includes(topic));
      return {
        name: topic,
        total: matching.length,
        solved: matching.filter((problem) => progress.problems[problem.slug]?.status === 'solved').length,
        difficulties: {
          easy: matching.filter((problem) => problem.difficulty === 'easy').length,
          medium: matching.filter((problem) => problem.difficulty === 'medium').length,
          hard: matching.filter((problem) => problem.difficulty === 'hard').length,
        },
      };
    }),
    [catalog, progress.problems, topics],
  );

  const persist = useCallback(
    async (next: ProgressState) => {
      setProgress(next);
      await storage.save(next);
    },
    [storage],
  );

  const requireActive = useCallback((): Problem | undefined => {
    const problem = progress.activeProblem
      ? catalog.find((candidate) => candidate.slug === progress.activeProblem)
      : undefined;
    if (!problem) append('error', t('problem.none'));
    return problem;
  }, [append, catalog, progress.activeProblem]);

  const ensureSolutionFile = useCallback(
    async (problem: Problem, language: Language): Promise<string> => {
      await storage.ensureDirectories();
      const solutionPath = storage.solutionPath(problem.slug, language);
      try {
        await writeFile(solutionPath, solutionFileText(problem, language), {
          encoding: 'utf8',
          flag: 'wx',
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const existing = await readFile(solutionPath, 'utf8');
        if (existing === problem.starters[language]) {
          await writeFile(solutionPath, solutionFileText(problem, language), 'utf8');
        }
      }
      return solutionPath;
    },
    [storage],
  );

  const activateProblem = useCallback(
    async (problem: Problem, language: Language) => {
      const solutionPath = await ensureSolutionFile(problem, language);
      const previous = progress.problems[problem.slug];
      await persist({
        ...progress,
        activeProblem: problem.slug,
        activeLanguage: language,
        problems: {
          ...progress.problems,
          [problem.slug]: previous ?? {
            status: 'started',
            attempts: 0,
            updatedAt: new Date().toISOString(),
          },
        },
      });
      append(
        'info',
        t('problem.selected', {
          body: problemText(problem),
          language: languageLabel(language),
          path: path.relative(workspace, solutionPath),
        }),
      );
    },
    [append, ensureSolutionFile, persist, progress, workspace],
  );

  const editSolution = useCallback(
    async (problem: Problem, language: Language) => {
      const solutionPath = await ensureSolutionFile(problem, language);
      const editorCommand = process.env.VISUAL || process.env.EDITOR || 'vi';
      const [editor, ...editorArgs] = splitEditorCommand(editorCommand);
      if (!editor) {
        append('error', t('editor.invalid'));
        return;
      }
      append('info', t('editor.opening', {
        path: path.relative(workspace, solutionPath),
        editor: editorCommand,
      }));

      // Let Ink commit the command and the busy state before handing control to
      // a full-screen editor. Clearing Ink's dynamic region on both sides of
      // the editor prevents Vim's restored screen from leaving a stale prompt
      // above the newly rendered one.
      await new Promise<void>((resolve) => setImmediate(resolve));
      clearOutput();
      setRawMode(false);
      process.stdout.write('\x1b[?25h');
      const result = spawnSync(editor, [...editorArgs, solutionPath], { stdio: 'inherit' });
      clearOutput();
      setRawMode(true);
      // We explicitly reveal the hardware cursor for Vim above. Ink draws its
      // own cursor in Composer, so hide the hardware cursor again after Vim
      // exits; otherwise it remains visible on a separate line at the bottom.
      process.stdout.write('\x1b[?25l');
      if (result.error) append('error', t('editor.failed', { error: result.error.message }));
      else append('info', t('editor.returned', { path: path.relative(workspace, solutionPath) }));
    },
    [append, clearOutput, ensureSolutionFile, setRawMode, workspace],
  );

  const activateTopic = useCallback(
    async (topic: string, difficulty?: Difficulty) => {
      const matching = catalog.filter((problem) =>
        problem.tags.includes(topic) && (!difficulty || problem.difficulty === difficulty));
      const unsolved = matching.filter((problem) => progress.problems[problem.slug]?.status !== 'solved');
      const candidates = unsolved.length ? unsolved : matching;
      if (!candidates.length) {
        append('error', t('topic.empty', {
          topic,
          difficulty: difficulty ? `${difficulty} ` : '',
        }));
        return;
      }
      const problem = candidates[Math.floor(Math.random() * candidates.length)]!;
      await activateProblem(problem, activeLanguage);
    },
    [activateProblem, activeLanguage, append, catalog, progress.problems],
  );

  const execute = useCallback(
    async (rawCommand: string) => {
      const trimmed = rawCommand.trim();
      if (!trimmed) return;
      append('user', trimmed);
      if (!trimmed.startsWith('/')) {
        append('info', t('cli.offline'));
        return;
      }

      const commandInput = trimmed.slice(1);
      const separator = commandInput.search(/\s/);
      const command = (separator === -1 ? commandInput : commandInput.slice(0, separator)).toLowerCase();
      const argumentText = separator === -1 ? '' : commandInput.slice(separator).trim();
      const args = argumentText ? argumentText.split(/\s+/) : [];
      if (command === 'help') {
        append('info', formatHelp());
        return;
      }
      if (command === 'quit' || command === 'exit') {
        exit();
        return;
      }
      if (command === 'import') {
        if (!argumentText) {
          append('error', t('import.missing'));
          return;
        }
        const pathParts = splitEditorCommand(argumentText);
        if (pathParts.length !== 1) {
          append('error', t('import.quote'));
          return;
        }
        const sourcePath = path.resolve(process.cwd(), pathParts[0]!);
        const imported = await storage.importProblemPack(
          sourcePath,
          new Set(catalog.map((problem) => problem.slug)),
        );
        setCatalog((current) => [...current, ...imported]);
        append(
          'success',
          `${t('import.success', { count: imported.length })}\n${imported.map((problem) => `  ${problem.slug} · ${problem.title}`).join('\n')}`,
        );
        return;
      }
      if (command === 'list') {
        const listArguments = [...args];
        const lastArgument = listArguments.at(-1);
        const requestedPage = lastArgument && /^\d+$/.test(lastArgument)
          ? Number(listArguments.pop())
          : 1;
        const query = listArguments.join(' ').toLowerCase();
        const filtered = catalog.filter((problem) => {
          const haystack = [problem.slug, problem.title, problem.difficulty, ...problem.tags]
            .join(' ')
            .toLowerCase();
          return !query || haystack.includes(query);
        });
        append(
          'info',
          filtered.length
            ? (() => {
                const pageSize = 20;
                const pageCount = Math.ceil(filtered.length / pageSize);
                const page = Math.max(1, Math.min(requestedPage, pageCount));
                const rows = filtered
                  .slice((page - 1) * pageSize, page * pageSize)
                .map((problem) => {
                  const status = progress.problems[problem.slug]?.status === 'solved' ? '✓' : '·';
                  return `${status} ${problem.slug.padEnd(16)} ${problem.title} · ${problem.difficulty}\n  ${problem.summary}`;
                })
                  .join('\n');
                const next = page < pageCount
                  ? ` · ${t('list.next', { command: `/list${query ? ` ${query}` : ''} ${page + 1}` })}`
                  : '';
                return `${rows}\n\n${t('list.page', {
                  page,
                  pages: pageCount,
                  count: filtered.length,
                  next,
                })}`;
              })()
            : t('list.empty', { query }),
        );
        return;
      }
      if (command === 'topics') {
        append(
          'info',
          topics.map((topic) => {
            const matching = catalog.filter((problem) => problem.tags.includes(topic));
            const solved = matching.filter((problem) => progress.problems[problem.slug]?.status === 'solved').length;
            return `${topic.padEnd(8)} ${solved}/${matching.length}`;
          }).join('\n'),
        );
        return;
      }
      if (command === 'learn') {
        if (!argumentText) {
          setLearnPickerOpen(true);
          return;
        }
        const tutorial = findTutorial(argumentText);
        if (!tutorial) {
          append('error', t('learn.missing', { topic: argumentText }));
          return;
        }
        append('info', formatTutorial(tutorial));
        return;
      }
      if (command === 'roadmap') {
        append('info', formatRoadmap());
        return;
      }
      if (command === 'next') {
        const tutorial = argumentText ? findTutorial(argumentText) : undefined;
        if (argumentText && !tutorial) {
          append('error', t('next.missing', { topic: argumentText }));
          return;
        }
        const route = [...new Set(
          (tutorial ? tutorial.practiceSlugs : tutorials.flatMap((item) => item.practiceSlugs)),
        )]
          .map((slug) => catalog.find((problem) => problem.slug === slug))
          .filter((problem): problem is Problem => Boolean(problem));
        if (activeProblem && route.some((problem) => problem.slug === activeProblem.slug) &&
          progress.problems[activeProblem.slug]?.status !== 'solved') {
          append('info', t('next.incomplete', { slug: activeProblem.slug }));
          return;
        }
        const problem = route.find((candidate) => progress.problems[candidate.slug]?.status !== 'solved');
        if (!problem) {
          const route = tutorial
            ? t('next.topicRoute', { topic: tutorial.topic })
            : t('next.beginnerRoute');
          append('success', t('next.complete', { route }));
          return;
        }
        await activateProblem(problem, activeLanguage);
        return;
      }
      if (command === 'topic') {
        const requested = args[0];
        if (!requested) {
          setTopicPickerOpen(true);
          return;
        }
        const topic = topics.find((candidate) => candidate.toLowerCase() === requested?.toLowerCase());
        if (!topic) {
          append('error', t('topic.unknown', { topic: requested ? `：${requested}` : '' }));
          return;
        }
        const difficulty = args[1]?.toLowerCase() as Difficulty | undefined;
        if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
          append('error', t('difficulty.invalid'));
          return;
        }
        await activateTopic(topic, difficulty);
        return;
      }
      if (command === 'pick') {
        const problem = catalog.find((candidate) => candidate.slug === (args[0] ?? ''));
        if (!problem) {
          append('error', t('problem.unknown'));
          return;
        }
        const requestedLanguage = args[1] ? parseLanguage(args[1]) : activeLanguage;
        if (!requestedLanguage) {
          append('error', t('language.unsupported'));
          return;
        }
        await activateProblem(problem, requestedLanguage);
        return;
      }
      if (command === 'random') {
        const difficulty = args[0]?.toLowerCase();
        if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
          append('error', t('difficulty.invalid'));
          return;
        }
        const matching = catalog.filter((problem) => !difficulty || problem.difficulty === difficulty);
        const unsolved = matching.filter((problem) => progress.problems[problem.slug]?.status !== 'solved');
        const candidates = unsolved.length ? unsolved : matching;
        if (!candidates.length) {
          append('error', t('catalog.noDifficulty', { difficulty: difficulty ?? '' }));
          return;
        }
        const problem = candidates[Math.floor(Math.random() * candidates.length)]!;
        await activateProblem(problem, activeLanguage);
        return;
      }
      if (command === 'lang') {
        if (!args[0]) {
          append('info', t('language.current', { language: languageLabel(activeLanguage) }));
          return;
        }
        const language = parseLanguage(args[0]);
        if (!language) {
          append('error', t('language.unsupported'));
          return;
        }
        const problem = activeProblem;
        const solutionPath = problem
          ? await ensureSolutionFile(problem, language)
          : undefined;
        await persist({ ...progress, activeLanguage: language });
        append(
          'success',
          t('language.switched', {
            language: languageLabel(language),
            path: solutionPath ? ` · ${path.relative(workspace, solutionPath)}` : '',
          }),
        );
        return;
      }
      if (command === 'locale') {
        if (!args[0]) {
          append('info', t('cli.locale.current', { label: localeLabel(getLocale()) }));
          return;
        }
        const requested = args[0].toLowerCase();
        if (requested !== 'zh' && requested !== 'en') {
          append('error', t('cli.locale.unsupported'));
          return;
        }
        setLocale(requested);
        setUiLocale(requested);
        await persist({ ...progress, locale: requested });
        append('success', t('cli.locale.switched', { label: localeLabel(requested) }));
        return;
      }
      if (command === 'show') {
        const problem = requireActive();
        if (problem) append('info', problemText(problem));
        return;
      }
      if (command === 'hint') {
        const problem = requireActive();
        if (!problem) return;
        const currentLevel = hintLevels.current[problem.slug] ?? 0;
        const level = Math.min(currentLevel, problem.hints.length - 1);
        hintLevels.current[problem.slug] = level + 1;
        append(
          'info',
          `${t('hint.title', { current: level + 1, total: problem.hints.length })}\n${problem.hints[level]}${level === problem.hints.length - 1 ? `\n\n${t('hint.last')}` : ''}`,
        );
        return;
      }
      if (command === 'edit') {
        const problem = requireActive();
        if (problem) await editSolution(problem, activeLanguage);
        return;
      }
      if (command === 'test') {
        const problem = requireActive();
        if (!problem) return;
        if (!argumentText) {
          append('error', t('test.missing'));
          return;
        }
        let customInput: unknown;
        try {
          customInput = JSON.parse(argumentText);
        } catch (error) {
          append('error', t('test.json', { error: (error as Error).message }));
          return;
        }
        if (!Array.isArray(customInput)) {
          append('error', t('test.array'));
          return;
        }
        const solutionPath = storage.solutionPath(problem.slug, activeLanguage);
        try {
          await access(solutionPath, constants.R_OK);
        } catch {
          append('error', t('solution.missing', { path: path.relative(workspace, solutionPath) }));
          return;
        }
        setBusy(t('cli.runningCustom'));
        const controller = new AbortController();
        runController.current = controller;
        try {
          const result = await runCustomTest(
            problem,
            solutionPath,
            customInput,
            activeLanguage,
            cliRunTimeoutMs,
            controller.signal,
          );
          const displayedResult = controller.signal.aborted
            ? { ...result, passed: false, error: t('run.cancelled'), failureKind: 'cancelled' as const }
            : result;
          append(displayedResult.error ? 'error' : 'success', formatCustomResult(displayedResult));
        } finally {
          if (runController.current === controller) runController.current = undefined;
          setBusy('');
        }
        return;
      }
      if (command === 'run' || command === 'submit') {
        const problem = requireActive();
        if (!problem) return;
        const solutionPath = storage.solutionPath(problem.slug, activeLanguage);
        try {
          await access(solutionPath, constants.R_OK);
        } catch {
          append('error', t('solution.missing', { path: path.relative(workspace, solutionPath) }));
          return;
        }
        const submitting = command === 'submit';
        setBusy(submitting ? t('cli.runningAll') : t('cli.runningSamples'));
        const controller = new AbortController();
        runController.current = controller;
        try {
          const results = await runTests(
            problem,
            solutionPath,
            submitting,
            activeLanguage,
            cliRunTimeoutMs,
            controller.signal,
          );
          const displayedResults = controller.signal.aborted
            ? [{
                index: 0,
                passed: false,
                input: problem.sampleTests[0]?.input,
                expected: undefined,
                durationMs: 0,
                error: t('run.cancelled'),
                failureKind: 'cancelled' as const,
              }]
            : results;
          const cancelled = controller.signal.aborted || results.some(isCancelledResult);
          const allPassed = displayedResults.length > 0 && displayedResults.every((result) => result.passed);
          append(allPassed ? 'success' : 'error', formatResults(displayedResults));
          if (submitting && !cancelled) {
            const previous = progress.problems[problem.slug] ?? {
              status: 'started' as const,
              attempts: 0,
              updatedAt: new Date().toISOString(),
            };
            const attemptedAt = new Date().toISOString();
            await persist({
              ...progress,
              problems: {
                ...progress.problems,
                [problem.slug]: {
                  status: allPassed ? 'solved' : previous.status,
                  attempts: previous.attempts + 1,
                  failedAttempts: (previous.failedAttempts ?? 0) + (allPassed ? 0 : 1),
                  lastAttemptAt: attemptedAt,
                  updatedAt: attemptedAt,
                },
              },
            });
          }
        } finally {
          if (runController.current === controller) runController.current = undefined;
          setBusy('');
        }
        return;
      }
      if (command === 'progress') {
        const started = Object.values(progress.problems).length;
        const solved = Object.values(progress.problems).filter((entry) => entry.status === 'solved').length;
        const attempts = Object.values(progress.problems).reduce((sum, entry) => sum + entry.attempts, 0);
        const wrong = Object.values(progress.problems).filter((entry) => (entry.failedAttempts ?? 0) > 0).length;
        append('info', t('progress.summary', {
          solved,
          total: catalog.length,
          started,
          attempts,
          wrong,
        }));
        return;
      }
      if (command === 'wrong') {
        const wrongProblems = catalog
          .filter((problem) => (progress.problems[problem.slug]?.failedAttempts ?? 0) > 0)
          .sort((left, right) => {
            const leftEntry = progress.problems[left.slug]!;
            const rightEntry = progress.problems[right.slug]!;
            return (rightEntry.lastAttemptAt ?? rightEntry.updatedAt)
              .localeCompare(leftEntry.lastAttemptAt ?? leftEntry.updatedAt);
          });
        if (!wrongProblems.length) {
          append('info', t('wrong.empty'));
          return;
        }
        const visible = wrongProblems.slice(0, 20).map((problem) => {
          const entry = progress.problems[problem.slug]!;
          const status = entry.status === 'solved' ? t('wrong.mastered') : t('wrong.review');
          return `${status}  ${problem.slug} · ${t('wrong.failures', { count: entry.failedAttempts ?? 0 })}`;
        });
        const remaining = wrongProblems.length > visible.length
          ? `\n${t('wrong.more', { count: wrongProblems.length - visible.length })}`
          : '';
        append('info', `${t('wrong.title')}\n${visible.join('\n')}${remaining}\n\n${t('wrong.prompt')}`);
        return;
      }
      if (command === 'review') {
        const wrongProblems = catalog.filter(
          (problem) => (progress.problems[problem.slug]?.failedAttempts ?? 0) > 0,
        );
        const unsolved = wrongProblems.filter(
          (problem) => progress.problems[problem.slug]?.status !== 'solved',
        );
        const candidates = unsolved.length ? unsolved : wrongProblems;
        if (!candidates.length) {
          append('info', t('review.empty'));
          return;
        }
        await activateProblem(candidates[Math.floor(Math.random() * candidates.length)]!, activeLanguage);
        return;
      }
      if (command === 'doctor') {
        const editorCommand = process.env.VISUAL || process.env.EDITOR || 'vi';
        const editor = splitEditorCommand(editorCommand)[0] ?? 'vi';
        const [pythonStatus, cppStatus, editorStatus] = await Promise.all([
          toolVersion('python3'),
          toolVersion('g++'),
          toolVersion(editor),
        ]);
        append(
          'info',
          [
            `✓ node · ${process.version}`,
            pythonStatus,
            cppStatus,
            editorStatus,
            `  workspace · ${workspace}`,
          ].join('\n'),
        );
        return;
      }
      append('error', t('command.unknown', { command }));
    },
    [activateProblem, activateTopic, activeLanguage, activeProblem, append, catalog, editSolution, ensureSolutionFile, exit, persist, progress, requireActive, storage, topics, workspace],
  );

  const selectTopic = useCallback(
    (topic: string, difficulty?: Difficulty) => {
      setTopicPickerOpen(false);
      setBusy(t('cli.selecting'));
      append('user', `${topic}${difficulty ? ` · ${difficulty}` : ''}`);
      activateTopic(topic, difficulty)
        .catch((error) => append('error', t('topic.failed', { error: String(error) })))
        .finally(() => setBusy(''));
    },
    [activateTopic, append],
  );

  const selectTutorial = useCallback(
    (topic: string) => {
      setLearnPickerOpen(false);
      const tutorial = findTutorial(topic);
      if (!tutorial) {
        append('error', t('learn.notFound', { topic }));
        return;
      }
      append('user', `/learn ${topic}`);
      append('info', formatTutorial(tutorial));
    },
    [append],
  );

  const submit = useCallback(
    (value: string) => {
      setBusy(t('cli.processing'));
      execute(value)
        .catch((error) => append('error', t('command.failed', { error: String(error) })))
        .finally(() => setBusy(''));
    },
    [append, execute],
  );

  return (
    <Box flexDirection="column">
      <Static items={messages}>
        {(message) => <MessageView key={message.id} message={message} />}
      </Static>
      {topicPickerOpen ? (
        <TopicPicker
          choices={topicChoices}
          onCancel={() => {
            setTopicPickerOpen(false);
            append('info', t('topic.cancelled'));
          }}
          onSelect={selectTopic}
        />
      ) : learnPickerOpen ? (
        <LearnPicker
          choices={tutorials}
          onCancel={() => {
            setLearnPickerOpen(false);
            append('info', t('learn.cancelled'));
          }}
          onSelect={selectTutorial}
        />
      ) : (
        <Composer
          busy={busy}
          problemSlugs={problemSlugs}
          topics={topics}
          tutorialTopics={tutorialTopics}
          onSubmit={submit}
        />
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {activeProblem ? `${activeProblem.slug} · ${languageLabel(activeLanguage)}` : `${t('footer.none')} · ${languageLabel(activeLanguage)}`} · Ctrl+C {runController.current ? t('footer.cancel') : t('footer.exit')}
        </Text>
      </Box>
    </Box>
  );
}

const args = process.argv.slice(2);
if (wantsVersion(args)) {
  process.stdout.write(`${packageVersion()}\n`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    `${t('help.description')}\n\n${t('help.usage')}\n\n` +
    `${t('help.options')}\n  ${t('help.version')}\n  ${t('help.help')}\n\n${formatHelp()}\n`,
  );
  process.exit(0);
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write(`${t('tty.required')}\n`);
  process.exit(1);
}

const workspace = path.resolve(args[0] ?? process.cwd());
let inkInstance: ReturnType<typeof render> | undefined;
inkInstance = render(
  <App
    workspace={workspace}
    clearOutput={() => inkInstance?.clear()}
  />,
  { exitOnCtrlC: false },
);
