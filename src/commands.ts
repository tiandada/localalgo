import { t } from './messages.js';
import type { MessageKey } from './messages.js';

export interface CommandDefinition {
  name: string;
  usage: string;
  description: string;
}

const commandSpecs: Array<{ name: string; messageKey: MessageKey }> = [
  'list', 'topics', 'topic', 'learn', 'roadmap', 'next', 'import', 'pick',
  'random', 'lang', 'locale', 'show', 'hint', 'edit', 'test', 'run', 'submit',
  'progress', 'wrong', 'review', 'doctor', 'help', 'quit',
].map((name) => ({ name, messageKey: `cmd.${name}` as MessageKey }));

export function commands(): CommandDefinition[] {
  return commandSpecs.map(({ name, messageKey }) => {
    const localized = t(messageKey);
    const separator = localized.lastIndexOf('|');
    return {
      name,
      usage: localized.slice(0, separator),
      description: localized.slice(separator + 1),
    };
  });
}

interface CompletionContext {
  problemSlugs: string[];
  topics: string[];
  tutorialTopics: string[];
}

const argumentCandidates: Record<string, (context: CompletionContext) => string[]> = {
  pick: ({ problemSlugs }) => problemSlugs,
  topic: ({ topics }) => topics,
  learn: ({ tutorialTopics }) => tutorialTopics,
  next: ({ tutorialTopics }) => tutorialTopics,
  lang: () => ['python', 'cpp'],
  locale: () => ['zh', 'en'],
  random: () => ['easy', 'medium', 'hard'],
};

function commonPrefix(values: string[]): string {
  if (!values.length) return '';
  let prefix = values[0]!;
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

function argumentOptions(
  commandName: string,
  argumentText: string,
  context: CompletionContext,
): { prefix: string; fragment: string; candidates: string[] } {
  const secondArgument = argumentText.match(/^(\S+)\s+(.*)$/);
  if (commandName === 'topic' && secondArgument) {
    return {
      prefix: `${secondArgument[1]} `,
      fragment: secondArgument[2]!.trim().toLowerCase(),
      candidates: ['easy', 'medium', 'hard'],
    };
  }
  if (commandName === 'pick' && secondArgument) {
    return {
      prefix: `${secondArgument[1]} `,
      fragment: secondArgument[2]!.trim().toLowerCase(),
      candidates: ['python', 'cpp'],
    };
  }
  return {
    prefix: '',
    fragment: argumentText.trim().toLowerCase(),
    candidates: argumentCandidates[commandName]?.(context) ?? [],
  };
}

export function suggestionsForInput(
  input: string,
  problemSlugs: string[],
  topics: string[] = [],
  tutorialTopics: string[] = [],
): string[] {
  if (!input.startsWith('/')) return [];
  const raw = input.slice(1);
  const firstSpace = raw.indexOf(' ');
  if (firstSpace === -1) {
    return commands()
      .filter((command) => command.name.startsWith(raw.toLowerCase()))
      .map((command) => `${command.usage}  ${command.description}`)
      .slice(0, 5);
  }
  const commandName = raw.slice(0, firstSpace).toLowerCase();
  const { prefix, fragment, candidates } = argumentOptions(
    commandName,
    raw.slice(firstSpace + 1),
    { problemSlugs, topics, tutorialTopics },
  );
  return candidates
    .filter((candidate) => candidate.startsWith(fragment))
    .map((candidate) => `/${commandName} ${prefix}${candidate}`)
    .slice(0, 5);
}

export function completeInput(
  input: string,
  problemSlugs: string[],
  topics: string[] = [],
  tutorialTopics: string[] = [],
): string {
  if (!input.startsWith('/')) return input;
  const raw = input.slice(1);
  const firstSpace = raw.indexOf(' ');
  if (firstSpace === -1) {
    const matches = commandSpecs
      .map((command) => command.name)
      .filter((name) => name.startsWith(raw.toLowerCase()));
    if (!matches.length) return input;
    const completed = matches.length === 1 ? matches[0]! : commonPrefix(matches);
    return `/${completed}${matches.length === 1 ? ' ' : ''}`;
  }
  const commandName = raw.slice(0, firstSpace).toLowerCase();
  const { prefix, fragment, candidates } = argumentOptions(
    commandName,
    raw.slice(firstSpace + 1),
    { problemSlugs, topics, tutorialTopics },
  );
  const matches = candidates
    .filter((candidate) => candidate.startsWith(fragment));
  if (!matches.length) return input;
  const completed = matches.length === 1 ? matches[0]! : commonPrefix(matches);
  return `/${commandName} ${prefix}${completed}${matches.length === 1 ? ' ' : ''}`;
}

export function formatHelp(): string {
  const displayWidth = (value: string) =>
    Array.from(value).reduce((width, character) =>
      width + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1), 0);
  const localized = commands();
  const width = Math.max(...localized.map((command) => displayWidth(command.usage)));
  return `${t('help.title')}\n${localized
    .map((command) =>
      `  ${command.usage}${' '.repeat(width - displayWidth(command.usage))}  ${command.description}`,
    )
    .join('\n')}\n\n${t('help.footer')}`;
}
