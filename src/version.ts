import { readFileSync } from 'node:fs';

export function packageVersion(): string {
  const metadata = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version?: unknown };
  if (typeof metadata.version !== 'string') {
    throw new Error('package.json 中缺少有效的 version');
  }
  return metadata.version;
}

export function wantsVersion(args: string[]): boolean {
  return args.includes('--version') || args.includes('-v');
}
