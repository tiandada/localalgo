import assert from 'node:assert/strict';
import test from 'node:test';
import type { MessageKey } from './messages.js';
import { getLocale, messageKeys, setLocale, t } from './messages.js';

function withLocale<T>(locale: 'zh' | 'en', run: () => T): T {
  const original = getLocale();
  setLocale(locale);
  try {
    return run();
  } finally {
    setLocale(original);
  }
}

test('zh and en tables cover the same keys', () => {
  for (const key of messageKeys()) {
    withLocale('zh', () => assert.notEqual(t(key), key, `zh table is missing ${key}`));
    withLocale('en', () => assert.notEqual(t(key), key, `en table is missing ${key}`));
  }
});

test('zh and en messages use the same interpolation parameters', () => {
  const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .sort();
  for (const key of messageKeys()) {
    const zh = withLocale('zh', () => t(key));
    const en = withLocale('en', () => t(key));
    assert.deepEqual(placeholders(en), placeholders(zh), `placeholder mismatch for ${key}`);
  }
});

test('interpolates named parameters', () => {
  assert.equal(
    withLocale('zh', () => t('cli.locale.switched', { label: '中文' })),
    '界面语言已切换为 中文',
  );
  assert.equal(
    withLocale('en', () => t('cli.locale.switched', { label: 'English' })),
    'Interface language switched to English',
  );
});

test('keeps placeholders that have no matching parameter', () => {
  assert.equal(withLocale('zh', () => t('cli.locale.switched')), '界面语言已切换为 {label}');
  assert.equal(withLocale('zh', () => t('cli.locale.switched', {})), '界面语言已切换为 {label}');
});

test('falls back to the key when a message is missing at runtime', () => {
  assert.equal(withLocale('en', () => t('missing.key' as MessageKey)), 'missing.key');
});
