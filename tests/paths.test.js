import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageRoot, templatesDir, packageJsonPath } from '../src/lib/paths.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const expectedRoot = path.resolve(here, '..');

test('packageRoot resolves to the project root', () => {
  assert.equal(packageRoot, expectedRoot);
});

test('templatesDir is templates/ under packageRoot', () => {
  assert.equal(templatesDir, path.join(expectedRoot, 'templates'));
});

test('packageJsonPath is package.json under packageRoot', () => {
  assert.equal(packageJsonPath, path.join(expectedRoot, 'package.json'));
});

test('all paths are absolute', () => {
  assert.ok(path.isAbsolute(packageRoot));
  assert.ok(path.isAbsolute(templatesDir));
  assert.ok(path.isAbsolute(packageJsonPath));
});
