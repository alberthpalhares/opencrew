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

test('AGENTS.md no longer warns about squads/ naming limitation', async () => {
  const agents = await read('AGENTS.md');
  assert.doesNotMatch(agents, /squads\//, 'should no longer reference the old squads/ directory');
});

test('skills.engine.md documents catalog.json as the primary discovery source', async () => {
  const engine = await read(path.join('_opencrew', 'core', 'skills.engine.md'));
  assert.match(engine, /catalog\.json/, 'skills engine should reference catalog.json');
  assert.match(engine, /baseUrl/, 'skills engine should support configurable base URL');
  assert.match(engine, /minVersion/, 'skills engine should validate minimum opencrew version');
});

test('catalog.json is valid and every skill has required fields', async () => {
  const raw = await read(path.join('skills', 'catalog.json'));
  const catalog = JSON.parse(raw);

  assert.equal(typeof catalog.version, 'string');
  assert.equal(typeof catalog.baseUrl, 'string');
  assert.ok(catalog.baseUrl.length > 0);
  assert.equal(typeof catalog.skills, 'object');

  const validTypes = new Set(['mcp', 'script', 'hybrid', 'prompt']);
  for (const [name, skill] of Object.entries(catalog.skills)) {
    assert.equal(typeof skill.type, 'string', `${name}: missing type`);
    assert.ok(validTypes.has(skill.type), `${name}: unknown type "${skill.type}"`);
    assert.equal(typeof skill.description, 'string', `${name}: missing description`);
    assert.ok(skill.description.length > 0, `${name}: empty description`);
    assert.equal(typeof skill.minVersion, 'string', `${name}: missing minVersion`);
    assert.match(skill.minVersion, /^\d+\.\d+\.\d+/, `${name}: minVersion should be semver`);
  }
});

test('catalog.json and README.md list the same skills', async () => {
  const raw = await read(path.join('skills', 'catalog.json'));
  const catalog = JSON.parse(raw);
  const readme = await read(path.join('skills', 'README.md'));

  for (const name of Object.keys(catalog.skills)) {
    assert.match(readme, new RegExp(`\`${name}\``),
      `README.md should mention skill "${name}" that is in catalog.json`);
  }
});

test('build.prompt.md specifies the crew-party.csv displayName column and gate', async () => {
  const build = await read(path.join('_opencrew', 'core', 'prompts', 'build.prompt.md'));

  // The runner renders agent names from the `displayName` column; the build prompt
  // must define it so the manifest is never generated with role/title instead of name.
  assert.match(build, /displayName/, 'build.prompt.md must document the displayName column');
  assert.match(build, /id,displayName,title,icon,path,execution/,
    'build.prompt.md must show the canonical crew-party.csv header');
  assert.match(build, /Gate 0b/, 'build.prompt.md must add the crew-party manifest gate');
});

test('repair.prompt.md exists and pulls names from .agent.md', async () => {
  const repair = await read(path.join('_opencrew', 'core', 'prompts', 'repair.prompt.md'));

  assert.match(repair, /crew-party\.csv/, 'repair prompt should rewrite crew-party.csv');
  assert.match(repair, /displayName/, 'repair prompt should populate the displayName column');
  assert.match(repair, /name:/, 'repair prompt should source names from .agent.md name: frontmatter');
});

test('AGENTS.md routes /opencrew repair to the repair prompt', async () => {
  const agents = await read('AGENTS.md');
  assert.match(agents, /\/opencrew repair/, 'AGENTS.md should route the repair command');
  assert.match(agents, /repair\.prompt\.md/, 'AGENTS.md should point repair at repair.prompt.md');
});
