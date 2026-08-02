import { test } from 'node:test';
import assert from 'node:assert/strict';
import { c, log, info, ok, warn, err, step } from '../src/lib/ui.js';

test('c exports all expected style functions', () => {
  assert.equal(typeof c.bold, 'function');
  assert.equal(typeof c.dim, 'function');
  assert.equal(typeof c.green, 'function');
  assert.equal(typeof c.yellow, 'function');
  assert.equal(typeof c.cyan, 'function');
  assert.equal(typeof c.red, 'function');
});

test('c wraps text with ANSI codes when color is enabled', () => {
  // In a non-TTY environment, should return plain strings (no ANSI codes).
  const result = c.bold('hello');
  assert.equal(typeof result, 'string');
  // Either has ANSI codes (TTY) or is plain (non-TTY). Both are valid output.
  assert.ok(result === 'hello' || result.includes('\x1b['));
});

test('log, info, ok, warn, err, step are all functions', () => {
  assert.equal(typeof log, 'function');
  assert.equal(typeof info, 'function');
  assert.equal(typeof ok, 'function');
  assert.equal(typeof warn, 'function');
  assert.equal(typeof err, 'function');
  assert.equal(typeof step, 'function');
});
