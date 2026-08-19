export interface CommandDefinition {
  name: string;
  usage: string;
  description: string;
}

export const commands: CommandDefinition[] = [
  { name: 'list', usage: '/list [关键字] [页码]', description: '分页浏览和筛选本地题库' },
  { name: 'topics', usage: '/topics', description: '查看题目类型和分类进度' },
  { name: 'topic', usage: '/topic [类型] [难度]', description: '交互选择或按类型抽取题目' },
  { name: 'learn', usage: '/learn [类型]', description: '学习题型技巧和解题套路' },
  { name: 'roadmap', usage: '/roadmap', description: '查看初学者学习路线' },
  { name: 'next', usage: '/next [类型]', description: '进入学习路线中的下一道题' },
  { name: 'import', usage: '/import <题包.json>', description: '导入本地 JSON 题包' },
  { name: 'pick', usage: '/pick <slug> [语言]', description: '选择题目并创建解答文件' },
  { name: 'random', usage: '/random [难度]', description: '随机选择一道题' },
  { name: 'lang', usage: '/lang [python|cpp]', description: '查看或切换当前语言' },
  { name: 'locale', usage: '/locale [zh|en]', description: '查看或切换界面语言' },
  { name: 'show', usage: '/show', description: '重新显示当前题面' },
  { name: 'hint', usage: '/hint', description: '逐级显示当前题目的提示' },
  { name: 'edit', usage: '/edit', description: '使用 $VISUAL 或 $EDITOR 编辑代码' },
  { name: 'test', usage: '/test <JSON参数数组>', description: '使用自定义输入运行当前解答' },
  { name: 'run', usage: '/run', description: '运行公开样例' },
  { name: 'submit', usage: '/submit', description: '运行全部本地测试' },
  { name: 'progress', usage: '/progress', description: '查看本地完成进度' },
  { name: 'wrong', usage: '/wrong', description: '查看曾经提交失败的错题' },
  { name: 'review', usage: '/review', description: '选择一道错题进行复习' },
  { name: 'doctor', usage: '/doctor', description: '检查本地运行环境' },
  { name: 'help', usage: '/help', description: '显示帮助' },
  { name: 'quit', usage: '/quit', description: '退出' },
];

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
    return commands
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
    const matches = commands
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
  const width = Math.max(...commands.map((command) => displayWidth(command.usage)));
  return `可用命令\n${commands
    .map((command) =>
      `  ${command.usage}${' '.repeat(width - displayWidth(command.usage))}  ${command.description}`,
    )
    .join('\n')}\n\nTab 补全 · ↑/↓ 浏览命令历史`;
}
