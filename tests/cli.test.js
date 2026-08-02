import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/cli.js';
import { exists } from '../src/lib/fsx.js';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd } from './_helpers.js';
import path from 'node:path';

test('no arguments defaults to init (does not crash)', async () => {
  const dir = await mkTmp('cli');
  await withCwd(dir, () => run([]));
  // In non-TTY, defaults to all IDEs — core framework should be present.
  assert.equal(await exists(path.join(dir, 'AGENTS.md')), true);
});

test('unknown command sets exitCode and does not crash', async () => {
  const dir = await mkTmp('cli');
  process.exitCode = 0;
  await withCwd(dir, () => run(['notacommand']));
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
});

test('update --check reports dry-run without modifying files', async () => {
  const dir = await mkTmp('cli');
  process.exitCode = 0;
  await withCwd(dir, () => run(['update', '--check']));
  // No workspace: should warn cleanly, not crash.
  assert.equal(await exists(path.join(dir, '_opencrew')), false);
  // exitCode should remain 0 (check is informational, not an error for missing workspace).
  assert.equal(process.exitCode, 0);
});

test('upgrade is an alias for update', async () => {
  const dir = await mkTmp('cli');
  await withCwd(dir, () => run(['upgrade', '--check']));
  // Should behave identically to update --check.
  assert.equal(await exists(path.join(dir, '_opencrew')), false);
});

test('update --check in a real workspace reports up-to-date status', async () => {
  const dir = await mkTmp('cli');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  process.exitCode = 0;
  await withCwd(dir, () => update({ check: true }));
  // Should report up-to-date. exitCode 0 = no update needed.
  assert.equal(process.exitCode, 0);
});

test('init with --yes and no --ide configures all IDEs', async () => {
  const dir = await mkTmp('cli');
  await withCwd(dir, () => init({ yes: true }));
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await exists(path.join(dir, 'GEMINI.md')), true);
  assert.equal(await exists(path.join(dir, 'QWEN.md')), true);
});

// Smoke tests — verify expected text appears in CLI output.
test('help output contains expected sections', async () => {
  const dir = await mkTmp('cli');
  const out = [];
  const rest = console.log;
  console.log = (...a) => out.push(a.join(' '));
  try {
    await withCwd(dir, () => run(['help']));
  } finally {
    console.log = rest;
  }
  const text = out.join('\n');
  assert.match(text, /opencrew/);
  assert.match(text, /Usage/);
  assert.match(text, /Commands/);
  assert.match(text, /init/);
  assert.match(text, /update/);
  assert.match(text, /Examples/);
});

test('version command prints a version string', async () => {
  const dir = await mkTmp('cli');
  const out = [];
  const rest = console.log;
  console.log = (...a) => out.push(a.join(' '));
  try {
    await withCwd(dir, () => run(['version']));
  } finally {
    console.log = rest;
  }
  const text = out.join('\n');
  assert.match(text, /^\d+\.\d+\.\d+/);
});
