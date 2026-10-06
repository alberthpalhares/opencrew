#!/usr/bin/env node
// Single verification gate (AGENTS.md rule 7). Humans, CI and publish all run exactly
// this: `npm run verify`. Exits non-zero on the first failing step.
// `node scripts/verify.js test` runs only the test step (that is what `npm test` does).
//
// Every step spawns `node` directly (process.execPath) — no npm/shell wrapper that could
// swallow an exit code, and it works the same on Windows.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function testFiles() {
  return readdirSync(path.join(root, 'tests'))
    .filter((f) => f.endsWith('.test.js'))
    .sort()
    .map((f) => path.join('tests', f));
}

// Code that is linted: the CLI, its tooling and the code shipped in the payload — the runtime
// scripts (Node) and the office page (browser; see eslint.config.js).
const LINT_DIRS = ['bin/', 'src/', 'tests/', 'scripts/', 'templates/_opencrew/core/scripts/', 'templates/_opencrew/core/escritorio/'];

export function defaultSteps() {
  return [
    { name: 'lint', cmd: node, args: ['node_modules/eslint/bin/eslint.js', ...LINT_DIRS] },
    { name: 'test', cmd: node, args: ['--test', ...testFiles()] },
    { name: 'version-sync', cmd: node, args: ['scripts/check-version-sync.js'] },
    { name: 'size (alert only)', cmd: node, args: ['scripts/check-size.js'] },
  ];
}

export function runSteps(steps, { spawn = spawnSync, log = console.log, cwd = root } = {}) {
  for (const step of steps) {
    log(`\n▶ ${step.name}`);
    const res = spawn(step.cmd, step.args, { cwd, stdio: 'inherit' });
    if (res.status !== 0) {
      log(`\n✗ verify failed at "${step.name}" (exit ${res.status ?? res.signal ?? res.error?.code})`);
      return 1;
    }
  }
  log('\n✓ verify passed');
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const only = process.argv[2];
  const steps = defaultSteps().filter((s) => !only || s.name === only);
  if (steps.length === 0) {
    console.error(`Unknown verify step: ${only}`);
    process.exitCode = 1;
  } else {
    process.exitCode = runSteps(steps);
  }
}
