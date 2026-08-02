import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { exists } from '../src/lib/fsx.js';
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
