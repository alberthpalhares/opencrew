import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/cli.js';
import { exists } from '../src/lib/fsx.js';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd, snapshot, captureOutput, exitPromptError } from './_helpers.js';
import { promises as fs } from 'node:fs';
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

// ── Fase 1 (specs/fase-1-hotfix.md) — strict parsing, --help never runs a command ──

async function runIn(dir, argv, deps) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => run(argv, deps)));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

for (const flag of ['--help', '-h']) {
  test(`F1-02a: update ${flag} prints help and changes nothing`, async () => {
    const dir = await mkTmp('cli');
    await withCwd(dir, () => init({ ide: ['claude-code'] }));
    // An old stamp makes an accidental update visible (it would rewrite the stamp).
    await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '0.0.1\n');
    const before = await snapshot(dir);
    const { out, code } = await runIn(dir, ['update', flag]);
    assert.equal(code, 0);
    assert.match(out, /Usage/);
    assert.deepEqual(await snapshot(dir), before);
  });
}

test('F1-02b: init --help in an empty folder creates nothing', async () => {
  const dir = await mkTmp('cli');
  const { code } = await runIn(dir, ['init', '--help']);
  assert.equal(code, 0);
  assert.deepEqual(await fs.readdir(dir), []);
});

test('F1-02c: update --dry-run behaves like --check (nothing written)', async () => {
  const dir = await mkTmp('cli');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '0.0.1\n');
  const before = await snapshot(dir);
  const { out, code } = await runIn(dir, ['update', '--dry-run']);
  assert.equal(code, 1, '--check semantics: exit 1 when an update is available');
  assert.match(out, /Update available/);
  assert.deepEqual(await snapshot(dir), before);
});

test('F1-02d: an unknown option fails before writing anything', async () => {
  const dir = await mkTmp('cli');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '0.0.1\n');
  const before = await snapshot(dir);
  const { out, code } = await runIn(dir, ['update', '--foo']);
  assert.equal(code, 1);
  assert.match(out, /Unknown option '--foo' for "update"\./);
  assert.deepEqual(await snapshot(dir), before);
});

test('F1-02e: --ide accepts a space-separated value', async () => {
  const dir = await mkTmp('cli');
  const { code } = await runIn(dir, ['init', '--ide', 'claude-code']);
  assert.equal(code, 0);
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await exists(path.join(dir, 'GEMINI.md')), false);
});

test('F1-02f: grouped short flags (-yv) are split, not treated as a command', async () => {
  const dir = await mkTmp('cli');
  const { out, code } = await runIn(dir, ['init', '-yv']);
  assert.equal(code, 0);
  assert.match(out, /^\d+\.\d+\.\d+/m);
  assert.doesNotMatch(out, /Unknown command/);
  assert.deepEqual(await fs.readdir(dir), [], '-v only prints the version');
});

test('F1-02g: --ide with no valid id fails before writing anything', async () => {
  const dir = await mkTmp('cli');
  const { out, code } = await runIn(dir, ['init', '--ide=bogus']);
  assert.equal(code, 1);
  assert.match(out, /Unknown IDE "bogus"/);
  assert.deepEqual(await fs.readdir(dir), []);
});

test('F1-02h: init with a positional argument fails before writing anything', async () => {
  const dir = await mkTmp('cli');
  const { out, code } = await runIn(dir, ['init', 'minha-pasta']);
  assert.equal(code, 1);
  assert.match(out, /does not take a directory/);
  assert.deepEqual(await fs.readdir(dir), []);
});

test('F1-07a (cli): a cancelled prompt exits 130 with a clear message', async () => {
  const dir = await mkTmp('cli');
  const commands = { init: async () => { throw exitPromptError(); } };
  const { out, code } = await runIn(dir, ['init'], { commands });
  assert.equal(code, 130);
  assert.match(out, /Cancelled — nothing was written\./);
});

test('F1-07d: an unexpected error exits 1 with one line and no stack trace', async () => {
  const dir = await mkTmp('cli');
  const commands = { update: async () => { throw new Error('EPERM: operation not permitted, open AGENTS.md'); } };
  const { out, code } = await runIn(dir, ['update'], { commands });
  assert.equal(code, 1);
  assert.match(out, /✗ EPERM: operation not permitted, open AGENTS\.md/);
  assert.doesNotMatch(out, /\n\s+at /, 'no stack trace without OPENCREW_DEBUG');
});
