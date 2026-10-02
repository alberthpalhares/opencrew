// AGENTS.md rule 3 — init never destroys user data (specs/fase-1-hotfix.md F1-05..F1-07).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init, installPayload } from '../src/commands/init.js';
import { exists, writeBridgeFile } from '../src/lib/fsx.js';
import { packageJsonPath } from '../src/lib/paths.js';
import { mkTmp, withCwd, exitPromptError } from './_helpers.js';

const BLOCK = /# opencrew:start\n[\s\S]*?\n# opencrew:end/g;

test('F1-05a: an existing .env.example keeps its content on top, opencrew block appended', async () => {
  const dir = await mkTmp('safe');
  const original = 'MY_KEY=\nOTHER=1\n';
  await fs.writeFile(path.join(dir, '.env.example'), original);

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const after = await fs.readFile(path.join(dir, '.env.example'), 'utf8');
  assert.ok(after.startsWith(original), 'user lines stay first, byte for byte');
  assert.equal(after.match(BLOCK)?.length, 1);
  assert.match(after.match(BLOCK)[0], /OPENROUTER_API_KEY|INSTAGRAM_ACCESS_TOKEN/);
});

test('F1-05b: writing the .env.example block twice leaves exactly one block', async () => {
  const dir = await mkTmp('safe');
  const file = path.join(dir, '.env.example');
  await fs.writeFile(file, 'MY_KEY=\n');
  await writeBridgeFile(file, 'A=1', { comment: 'hash', position: 'append' });
  await writeBridgeFile(file, 'A=2', { comment: 'hash', position: 'append' });
  const after = await fs.readFile(file, 'utf8');
  assert.equal(after.match(BLOCK).length, 1);
  assert.equal(after, 'MY_KEY=\n\n# opencrew:start\nA=2\n# opencrew:end\n');
});

test('F1-05c: without a .env.example, init creates one with the template variables', async () => {
  const dir = await mkTmp('safe');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const env = await fs.readFile(path.join(dir, '.env.example'), 'utf8');
  assert.match(env, /OPENROUTER_API_KEY|INSTAGRAM_ACCESS_TOKEN/);
});

test('F1-06a: an existing .gitignore keeps its content; the block protects secrets and sessions', async () => {
  const dir = await mkTmp('safe');
  const original = 'dist/\n# my comment\n';
  await fs.writeFile(path.join(dir, '.gitignore'), original);

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const after = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
  assert.ok(after.startsWith(original), 'user lines stay first, byte for byte');
  const [block] = after.match(BLOCK);
  for (const entry of ['.env', '_opencrew/_browser_profile/', '.claude/settings.local.json', 'crews/*/state.json', 'crews/*/_investigations/']) {
    assert.ok(block.split('\n').includes(entry), `missing ${entry} in the opencrew block`);
  }
});

test('F1-06b: writing the .gitignore block twice leaves exactly one block', async () => {
  const dir = await mkTmp('safe');
  await fs.writeFile(path.join(dir, '.gitignore'), 'dist/\n');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.rm(path.join(dir, '_opencrew'), { recursive: true }); // force a second full init
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const after = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
  assert.equal(after.match(BLOCK).length, 1);
});

test('F1-06c: an orphan start marker (end deleted by hand) never makes user lines disappear', async () => {
  const dir = await mkTmp('safe');
  const file = path.join(dir, '.gitignore');
  const original = 'dist/\n# opencrew:start\n.env\nmine/\n';
  await fs.writeFile(file, original);
  await writeBridgeFile(file, '.env', { comment: 'hash', position: 'append' });
  await writeBridgeFile(file, '.env\nnew/', { comment: 'hash', position: 'append' }); // second run
  const after = await fs.readFile(file, 'utf8');
  for (const line of original.trimEnd().split('\n')) {
    assert.ok(after.split('\n').includes(line), `user line lost: ${line}`);
  }
});

test('F1-07a: cancelling the IDE prompt writes nothing at all', async () => {
  const dir = await mkTmp('safe');
  const pickIdes = async () => { throw exitPromptError(); };
  await assert.rejects(withCwd(dir, () => init({}, { pickIdes })), { name: 'ExitPromptError' });
  assert.deepEqual(await fs.readdir(dir), []);
});

test('F1-07b: an interrupted install (core without stamp) is resumed by init', async () => {
  const dir = await mkTmp('safe');
  await installPayload(dir); // what an interrupted run leaves behind
  const company = path.join(dir, '_opencrew', '_memory', 'company.md');
  await fs.writeFile(company, '# Acme — real data');

  await withCwd(dir, () => init({ ide: ['claude-code'] }));

  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  assert.equal((await fs.readFile(path.join(dir, '_opencrew', '.opencrew-version'), 'utf8')).trim(), pkg.version);
  assert.equal(await exists(path.join(dir, '_opencrew', 'core', 'system.md')), true);
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), true);
  assert.equal(await fs.readFile(company, 'utf8'), '# Acme — real data', 'resume never overwrites');
});

test('F1-07c: copying the payload never writes the version stamp (only a finished init does)', async () => {
  const dir = await mkTmp('safe');
  await installPayload(dir);
  assert.equal(await exists(path.join(dir, '_opencrew', 'core', 'runner.pipeline.md')), true);
  assert.equal(await exists(path.join(dir, '_opencrew', '.opencrew-version')), false);
});
