import type { Locale } from './types.js';

const zh = {
  'cmd.locale.usage': '/locale [zh|en]',
  'cmd.locale.description': '查看或切换界面语言',
  'cli.locale.current': '当前界面语言：{label}\n可用语言：zh、en',
  'cli.locale.switched': '界面语言已切换为 {label}',
  'cli.locale.unsupported': '不支持的语言。目前可用：zh、en。',
} as const;

export type MessageKey = keyof typeof zh;

const en: Record<MessageKey, string> = {
  'cmd.locale.usage': '/locale [zh|en]',
  'cmd.locale.description': 'View or switch the interface language',
  'cli.locale.current': 'Current interface language: {label}\nAvailable languages: zh, en',
  'cli.locale.switched': 'Interface language switched to {label}',
  'cli.locale.unsupported': 'Unsupported language. Available: zh, en.',
};

const messages: Record<Locale, Record<MessageKey, string>> = { zh, en };

let currentLocale: Locale = 'zh';

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function localeLabel(locale: Locale): string {
  return locale === 'zh' ? '中文' : 'English';
}

export function messageKeys(): MessageKey[] {
  return Object.keys(zh) as MessageKey[];
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = messages[currentLocale][key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
