// Lightweight content assertions on the markdown files that drive agent behavior
// at runtime. These aren't executable code, but they encode real contracts (e.g.
// "the dashboard must be opt-in") that are easy to silently regress on a future edit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { templatesDir } from '../src/lib/paths.js';

async function read(relPath) {
  return fs.readFile(path.join(templatesDir, relPath), 'utf8');
}

test('runner.pipeline.md: dashboard state.json writes are opt-in, not mandatory', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));

  assert.match(runner, /dashboard_enabled/, 'runner should gate state.json writes on a dashboard_enabled flag');
  assert.doesNotMatch(
    runner,
    /Wait 10 seconds/,
    'the runner should never force a blocking delay for the dashboard'
  );
  assert.doesNotMatch(
    runner,
    /State writes are always mandatory/,
    'state.json writes must be conditional, not always mandatory'
  );
});

test('preferences.md template declares a Dashboard toggle, default disabled', async () => {
  const prefs = await read(path.join('_opencrew', '_memory', 'preferences.md'));
  assert.match(prefs, /\*\*Dashboard:\*\*\s*disabled/);
});

test('AGENTS.md documents the Dashboard as optional and loads preferences.md before running a pipeline', async () => {
  const agents = await read('AGENTS.md');
  assert.match(agents, /## Dashboard \(Optional\)/);
  assert.match(agents, /disabled by default/);
  assert.match(agents, /_opencrew\/_memory\/preferences\.md/);
});
