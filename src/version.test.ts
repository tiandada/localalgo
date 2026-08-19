import assert from 'node:assert/strict';
import test from 'node:test';
import { packageVersion, wantsVersion } from './version.js';

test('reads the current version from package metadata', () => {
  assert.equal(packageVersion(), '0.1.2');
});

test('recognizes long and short version flags', () => {
  assert.equal(wantsVersion(['--version']), true);
  assert.equal(wantsVersion(['-v']), true);
  assert.equal(wantsVersion(['/tmp/practice']), false);
});
