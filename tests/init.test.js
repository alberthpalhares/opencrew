import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { exists, readFile } from '../src/lib/fsx.js';
import { packageJsonPath } from '../src/lib/paths.js';
import { mkTmp, withCwd } from './_helpers.js';

test('init scaffolds the core framework files', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  assert.equal(await exists(path.join(dir, 'AGENTS.md')), true);
  assert.equal(await exists(path.join(dir, '.mcp.json')), true);
  assert.equal(await exists(path.join(dir, '.env.example')), true);
  assert.equal(await exists(path.join(dir, '.gitignore')), true);
  assert.equal(await exists(path.join(dir, '_opencrew', 'core', 'runner.pipeline.md')), true);
  assert.equal(await exists(path.join(dir, '_opencrew', '_memory', 'company.md')), true);
  assert.equal(await exists(path.join(dir, 'skills', 'resend', 'SKILL.md')), true);
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await exists(path.join(dir, '.claude', 'skills', 'opencrew', 'SKILL.md')), true);

  // AGENTS.md is now a thin bridge — full system is in _opencrew/core/
  const agents = await readFile(path.join(dir, 'AGENTS.md'));
  assert.ok(agents.includes('_opencrew/core/system.md'), 'AGENTS.md should point to system.md');
  assert.ok(agents.includes('<!-- opencrew:start -->'), 'AGENTS.md should have markers');

  const system = await readFile(path.join(dir, '_opencrew', 'core', 'system.md'));
  assert.ok(system.includes('# opencrew Instructions'), 'system.md should have full system definition');
  assert.ok(system.includes('## Command Routing'), 'system.md should have command routing');
});

test('init only writes bridge files for the selected IDE(s)', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['cursor'] }));

  assert.equal(await exists(path.join(dir, '.cursor', 'rules', 'opencrew.mdc')), true);
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), false);
  assert.equal(await exists(path.join(dir, '.claude')), false);
});

test('init writes bridges for every IDE when --all is passed', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ all: true }));

  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await exists(path.join(dir, 'GEMINI.md')), true);
  assert.equal(await exists(path.join(dir, 'QWEN.md')), true);
  assert.equal(await exists(path.join(dir, '.cursor', 'rules', 'opencrew.mdc')), true);
  assert.equal(await exists(path.join(dir, '.trae', 'rules', 'opencrew.md')), true);
});

test('init never overwrites an existing company.md / preferences.md on re-run', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const companyFile = path.join(dir, '_opencrew', '_memory', 'company.md');
  await fs.writeFile(companyFile, '# Acme Inc.\nReal company data.');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  assert.equal(await fs.readFile(companyFile, 'utf8'), '# Acme Inc.\nReal company data.');
});

test('init never touches an existing crew directory on re-run', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const crewFile = path.join(dir, 'crews', 'my-crew', 'crew.yaml');
  await fs.mkdir(path.dirname(crewFile), { recursive: true });
  await fs.writeFile(crewFile, 'name: my-crew\n');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  assert.equal(await fs.readFile(crewFile, 'utf8'), 'name: my-crew\n');
});

test('init preserves an existing .mcp.json (overwrite:false)', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const mcpFile = path.join(dir, '.mcp.json');
  await fs.writeFile(mcpFile, '{"mcpServers":{"custom":{}}}');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  assert.equal(await fs.readFile(mcpFile, 'utf8'), '{"mcpServers":{"custom":{}}}');
});

test('init preserves an existing .gitignore (overwrite:false)', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const giFile = path.join(dir, '.gitignore');
  await fs.writeFile(giFile, 'my-custom-ignore/\n');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  assert.equal(await fs.readFile(giFile, 'utf8'), 'my-custom-ignore/\n');
});

test('init writes .opencrew-version matching package.json', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const version = (await fs.readFile(path.join(dir, '_opencrew', '.opencrew-version'), 'utf8')).trim();
  assert.equal(version, pkg.version);
});

test('init with no --ide and --yes falls back to non-interactive defaults', async () => {
  const dir = await mkTmp('init');
  // In a test environment (no TTY), init without --ide/--all should fall back
  // to all IDEs automatically — no crash, no hang waiting for input.
  await withCwd(dir, () => init({ yes: true }));

  assert.equal(await exists(path.join(dir, 'AGENTS.md')), true);
  assert.equal(await exists(path.join(dir, '_opencrew', 'core', 'runner.pipeline.md')), true);
  // With --yes and no TTY, all IDEs should be configured.
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
});

test('init skips an unknown IDE id without crashing', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['not-a-real-ide', 'claude-code'] }));

  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
});

test('init accepts --ide as a comma-separated string', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: 'claude-code,cursor' }));

  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await exists(path.join(dir, '.cursor', 'rules', 'opencrew.mdc')), true);
  assert.equal(await exists(path.join(dir, 'GEMINI.md')), false);
});

test('bridge files are written with opencrew markers', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const claudeMd = await readFile(path.join(dir, 'CLAUDE.md'));
  assert.ok(claudeMd.includes('<!-- opencrew:start -->'), 'CLAUDE.md should have start marker');
  assert.ok(claudeMd.includes('<!-- opencrew:end -->'), 'CLAUDE.md should have end marker');
  assert.ok(claudeMd.includes('opencrew — Project Instructions'), 'CLAUDE.md should have bridge content');
});

test('init merges bridge block into existing CLAUDE.md preserving user content', async () => {
  const dir = await mkTmp('init');

  // Pre-create CLAUDE.md with user content
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'CLAUDE.md'), '# My Project\n\nAlways use TypeScript.\n');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const claudeMd = await readFile(path.join(dir, 'CLAUDE.md'));
  assert.ok(claudeMd.includes('<!-- opencrew:start -->'), 'should have start marker');
  assert.ok(claudeMd.includes('<!-- opencrew:end -->'), 'should have end marker');
  assert.ok(claudeMd.includes('# My Project'), 'user content should be preserved');
  assert.ok(claudeMd.includes('Always use TypeScript.'), 'user content should be preserved');
  // OpenCrew block should come FIRST
  const openCrewEnd = claudeMd.indexOf('<!-- opencrew:end -->');
  const userContent = claudeMd.indexOf('# My Project');
  assert.ok(openCrewEnd < userContent, 'OpenCrew block should precede user content');
});

test('init merges bridge block into existing AGENTS.md preserving user content', async () => {
  const dir = await mkTmp('init');

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'AGENTS.md'), '# My Custom Agents\n\nCustom rules here.\n');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const agents = await readFile(path.join(dir, 'AGENTS.md'));
  assert.ok(agents.includes('<!-- opencrew:start -->'), 'should have start marker');
  assert.ok(agents.includes('_opencrew/core/system.md'), 'should point to system.md');
  assert.ok(agents.includes('# My Custom Agents'), 'user content should be preserved');
  assert.ok(agents.includes('Custom rules here.'), 'user content should be preserved');
  // OpenCrew block should come FIRST
  const openCrewEnd = agents.indexOf('<!-- opencrew:end -->');
  const userContent = agents.indexOf('# My Custom Agents');
  assert.ok(openCrewEnd < userContent, 'OpenCrew block should precede user content');
  // No sidecar
  assert.equal(await exists(path.join(dir, 'AGENTS.opencrew.md')), false);
});

test('init writes full system to _opencrew/core/system.md', async () => {
  const dir = await mkTmp('init');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const system = await readFile(path.join(dir, '_opencrew', 'core', 'system.md'));
  assert.ok(system.includes('# opencrew Instructions'), 'should have full system definition');
  assert.ok(system.includes('## Command Routing'), 'should have command routing table');
  assert.ok(system.includes('## Critical Rules'), 'should have critical rules');
  // system.md is the FULL doc, not a bridge
  assert.ok(!system.includes('<!-- opencrew:start -->'), 'system.md should NOT have bridge markers');
});

test('init updates bridge file block, preserves other content outside markers', async () => {
  const dir = await mkTmp('init');

  // First init creates the bridge
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  // User adds content after the OpenCrew block
  const claudePath = path.join(dir, 'CLAUDE.md');
  const firstPass = await readFile(claudePath);
  await fs.writeFile(claudePath, firstPass + '\n# My additions\nCustom project rules.\n');

  // Re-init (simulate via removing _opencrew/core so init runs again)
  await fs.rm(path.join(dir, '_opencrew', 'core'), { recursive: true, force: true });

  // The AGENTS.md was written by OpenCrew, so init will detect it as OpenCrew and overwrite
  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const updated = await readFile(claudePath);
  assert.ok(updated.includes('<!-- opencrew:start -->'), 'should still have start marker');
  assert.ok(updated.includes('<!-- opencrew:end -->'), 'should still have end marker');
  assert.ok(updated.includes('# My additions'), 'user additions outside markers should be preserved');
  assert.ok(updated.includes('Custom project rules.'), 'user content outside markers should be preserved');
});
