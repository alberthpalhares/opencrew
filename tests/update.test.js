import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { packageJsonPath } from '../src/lib/paths.js';
import { mkTmp, withCwd } from './_helpers.js';

test('update does nothing when no opencrew workspace exists yet', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => update());
  assert.equal(await exists(path.join(dir, '_opencrew')), false);
});

test('update refreshes _opencrew/core and AGENTS.md but leaves crews/, memory, .env and IDE bridges untouched', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  // Simulate real user state accumulated after init.
  const crewFile = path.join(dir, 'crews', 'my-crew', 'crew.yaml');
  await fs.mkdir(path.dirname(crewFile), { recursive: true });
  await fs.writeFile(crewFile, 'name: my-crew\n');

  const companyFile = path.join(dir, '_opencrew', '_memory', 'company.md');
  await fs.writeFile(companyFile, '# Acme Inc.');

  const prefsFile = path.join(dir, '_opencrew', '_memory', 'preferences.md');
  await fs.writeFile(prefsFile, '- User Name: Jane');

  const envFile = path.join(dir, '.env');
  await fs.writeFile(envFile, 'SECRET_KEY=abc123');

  const claudeMd = path.join(dir, 'CLAUDE.md');
  const claudeMdOriginal = await fs.readFile(claudeMd, 'utf8');

  // Corrupt a core framework file to prove update() overwrites it.
  const runnerFile = path.join(dir, '_opencrew', 'core', 'runner.pipeline.md');
  await fs.writeFile(runnerFile, 'STALE CONTENT');

  await withCwd(dir, () => update());

  // Framework refreshed.
  const runnerContent = await fs.readFile(runnerFile, 'utf8');
  assert.notEqual(runnerContent, 'STALE CONTENT');
  assert.match(runnerContent, /Pipeline Runner/);

  // User data and IDE bridges untouched.
  assert.equal(await fs.readFile(crewFile, 'utf8'), 'name: my-crew\n');
  assert.equal(await fs.readFile(companyFile, 'utf8'), '# Acme Inc.');
  assert.equal(await fs.readFile(prefsFile, 'utf8'), '- User Name: Jane');
  assert.equal(await fs.readFile(envFile, 'utf8'), 'SECRET_KEY=abc123');
  assert.equal(await fs.readFile(claudeMd, 'utf8'), claudeMdOriginal);
});

test('update refreshes catalog skills but preserves user-authored skill directories', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const customSkillFile = path.join(dir, 'skills', 'my-custom-skill', 'SKILL.md');
  await fs.mkdir(path.dirname(customSkillFile), { recursive: true });
  await fs.writeFile(customSkillFile, '---\nname: my-custom-skill\n---\ncustom');

  await withCwd(dir, () => update());

  assert.equal(await fs.readFile(customSkillFile, 'utf8'), '---\nname: my-custom-skill\n---\ncustom');
  assert.equal(await exists(path.join(dir, 'skills', 'resend', 'SKILL.md')), true);
});

test('update bumps .opencrew-version to the current package version', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const versionFile = path.join(dir, '_opencrew', '.opencrew-version');
  await fs.writeFile(versionFile, '0.0.1\n');

  await withCwd(dir, () => update());

  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const version = (await fs.readFile(versionFile, 'utf8')).trim();
  assert.equal(version, pkg.version);
});

test('update --check with older version reports update available (exitCode 1)', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const versionFile = path.join(dir, '_opencrew', '.opencrew-version');
  await fs.writeFile(versionFile, '0.0.1\n');

  await withCwd(dir, () => update({ check: true }));

  assert.equal(process.exitCode, 1);
  process.exitCode = 0; // reset for other tests
});

test('update refreshes _opencrew/core/system.md and AGENTS.md bridge', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  // Corrupt system.md
  const systemPath = path.join(dir, '_opencrew', 'core', 'system.md');
  await fs.writeFile(systemPath, 'corrupted');

  // Remove markers from AGENTS.md bridge
  const agentsPath = path.join(dir, 'AGENTS.md');
  await fs.writeFile(agentsPath, 'stale bridge content');

  await withCwd(dir, () => update());

  const system = await fs.readFile(systemPath, 'utf8');
  assert.ok(system.includes('# opencrew Instructions'), 'system.md should be refreshed');
  assert.ok(!system.includes('corrupted'), 'old system.md content should be replaced');

  const agents = await fs.readFile(agentsPath, 'utf8');
  assert.ok(agents.includes('_opencrew/core/system.md'), 'AGENTS.md bridge should point to system.md');
});

// ── Fase 1 (specs/fase-1-hotfix.md) ───────────────────────────────────────

const LEGACY_CLAUDE_BLOCK = '<!-- opencrew:start -->\n# opencrew — Project Instructions\n\n'
  + 'Read `AGENTS.md`.\n\n## STATUS.md (gestão de sessão)\n\nThis project uses `STATUS.md`.\n'
  + '> Skill: /status\n<!-- opencrew:end -->\n\n# My notes\nkeep me\n';

test('F1-01c: update removes the leaked STATUS.md section from CLAUDE.md, keeping user text', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const claudeMd = path.join(dir, 'CLAUDE.md');
  await fs.writeFile(claudeMd, LEGACY_CLAUDE_BLOCK);

  await withCwd(dir, () => update());

  const after = await fs.readFile(claudeMd, 'utf8');
  assert.doesNotMatch(after, /STATUS\.md/);
  assert.doesNotMatch(after, /Skill: \/status/);
  assert.match(after, /<!-- opencrew:start -->\n# opencrew — Project Instructions[\s\S]*<!-- opencrew:end -->/);
  assert.ok(after.endsWith('# My notes\nkeep me\n'), 'user text outside the block must survive byte for byte');
});

test('F1-01d: update never creates a CLAUDE.md that did not exist', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['cursor'] }));
  await withCwd(dir, () => update());
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), false);
});

test('F1-03a: update without AGENTS.md creates the bridge and stamps the version', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.rm(path.join(dir, 'AGENTS.md'));
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '0.0.1\n');

  await withCwd(dir, () => update());

  const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /_opencrew\/core\/system\.md/);
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  assert.equal((await fs.readFile(path.join(dir, '_opencrew', '.opencrew-version'), 'utf8')).trim(), pkg.version);
});

const LEGACY_AGENTS = '# opencrew Instructions\n\nYou are opencrew (pre-1.3 full system).\n\nMY OWN RULE: never use emojis.\n';

test('F1-04a: legacy AGENTS.md is backed up byte for byte before being replaced', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.writeFile(path.join(dir, 'AGENTS.md'), LEGACY_AGENTS);

  await withCwd(dir, () => update());

  assert.equal(await fs.readFile(path.join(dir, 'AGENTS.md.bak'), 'utf8'), LEGACY_AGENTS);
  assert.match(await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8'), /_opencrew\/core\/system\.md/);
});

test('F1-04b: an existing AGENTS.md.bak is never overwritten — a timestamped backup is made', async () => {
  const dir = await mkTmp('update');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.writeFile(path.join(dir, 'AGENTS.md'), LEGACY_AGENTS);
  await fs.writeFile(path.join(dir, 'AGENTS.md.bak'), 'older backup\n');

  await withCwd(dir, () => update());

  assert.equal(await fs.readFile(path.join(dir, 'AGENTS.md.bak'), 'utf8'), 'older backup\n');
  const extra = (await fs.readdir(dir)).filter((f) => f.startsWith('AGENTS.md.bak-'));
  assert.equal(extra.length, 1, 'exactly one timestamped backup');
  assert.equal(await fs.readFile(path.join(dir, extra[0]), 'utf8'), LEGACY_AGENTS);
});
