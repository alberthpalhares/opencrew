import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { copyDir, writeFileSafe, exists, ensureDir, deleteDir, readJson } from '../src/lib/fsx.js';

async function mkTmp() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'opencrew-fsx-'));
}

test('exists() reports true/false correctly', async () => {
  const dir = await mkTmp();
  assert.equal(await exists(path.join(dir, 'nope.txt')), false);
  await fs.writeFile(path.join(dir, 'yep.txt'), 'x');
  assert.equal(await exists(path.join(dir, 'yep.txt')), true);
});

test('writeFileSafe: overwrite:false never clobbers an existing file', async () => {
  const dir = await mkTmp();
  const file = path.join(dir, 'a.txt');
  await writeFileSafe(file, 'original');
  const wrote = await writeFileSafe(file, 'new', { overwrite: false });
  assert.equal(wrote, false);
  assert.equal(await fs.readFile(file, 'utf8'), 'original');
});

test('writeFileSafe: overwrite:true (default) replaces content', async () => {
  const dir = await mkTmp();
  const file = path.join(dir, 'a.txt');
  await writeFileSafe(file, 'original');
  const wrote = await writeFileSafe(file, 'new');
  assert.equal(wrote, true);
  assert.equal(await fs.readFile(file, 'utf8'), 'new');
});

test('writeFileSafe: creates parent directories automatically', async () => {
  const dir = await mkTmp();
  const file = path.join(dir, 'nested', 'deep', 'a.txt');
  await writeFileSafe(file, 'hi');
  assert.equal(await fs.readFile(file, 'utf8'), 'hi');
});

test('copyDir: overwrite:false preserves existing destination files (never clobbers user work)', async () => {
  const src = await mkTmp();
  const dest = await mkTmp();
  await fs.writeFile(path.join(src, 'file.txt'), 'from-template');
  await fs.writeFile(path.join(dest, 'file.txt'), 'user-edited');
  await copyDir(src, dest, { overwrite: false });
  assert.equal(await fs.readFile(path.join(dest, 'file.txt'), 'utf8'), 'user-edited');
});

test('copyDir: overwrite:false still copies new files that do not exist at destination', async () => {
  const src = await mkTmp();
  const dest = await mkTmp();
  await fs.writeFile(path.join(src, 'new.txt'), 'new-content');
  await copyDir(src, dest, { overwrite: false });
  assert.equal(await fs.readFile(path.join(dest, 'new.txt'), 'utf8'), 'new-content');
});

test('copyDir: overwrite:true replaces existing destination files', async () => {
  const src = await mkTmp();
  const dest = await mkTmp();
  await fs.writeFile(path.join(src, 'file.txt'), 'from-template');
  await fs.writeFile(path.join(dest, 'file.txt'), 'stale');
  await copyDir(src, dest, { overwrite: true });
  assert.equal(await fs.readFile(path.join(dest, 'file.txt'), 'utf8'), 'from-template');
});

test('copyDir: skip() excludes matching relative paths', async () => {
  const src = await mkTmp();
  const dest = await mkTmp();
  await ensureDir(path.join(src, 'logs'));
  await fs.writeFile(path.join(src, 'logs', 'run.log'), 'noisy');
  await fs.writeFile(path.join(src, 'logs', '.gitkeep'), '');
  await fs.writeFile(path.join(src, 'keep.txt'), 'keep');
  await copyDir(src, dest, {
    skip: (rel) => rel.startsWith('logs/') && rel !== 'logs/.gitkeep',
  });
  assert.equal(await exists(path.join(dest, 'logs', 'run.log')), false);
  assert.equal(await exists(path.join(dest, 'logs', '.gitkeep')), true);
  assert.equal(await exists(path.join(dest, 'keep.txt')), true);
});

test('copyDir: onCopy fires once per file actually copied', async () => {
  const src = await mkTmp();
  const dest = await mkTmp();
  await fs.writeFile(path.join(src, 'a.txt'), 'a');
  await fs.writeFile(path.join(src, 'b.txt'), 'b');
  await fs.writeFile(path.join(dest, 'a.txt'), 'existing');
  const copied = [];
  await copyDir(src, dest, { overwrite: false, onCopy: (rel) => copied.push(rel) });
  assert.deepEqual(copied.sort(), ['b.txt']);
});

test('copyDir: recurses into nested directories', async () => {
  const src = await mkTmp();
  const dest = await mkTmp();
  await ensureDir(path.join(src, 'a', 'b'));
  await fs.writeFile(path.join(src, 'a', 'b', 'deep.txt'), 'deep');
  await copyDir(src, dest);
  assert.equal(await fs.readFile(path.join(dest, 'a', 'b', 'deep.txt'), 'utf8'), 'deep');
});

test('deleteDir: removes directory and all contents', async () => {
  const dir = await mkTmp();
  const nested = path.join(dir, 'nested', 'deep');
  await ensureDir(nested);
  await fs.writeFile(path.join(nested, 'file.txt'), 'x');
  await fs.writeFile(path.join(dir, 'root.txt'), 'y');

  const deleted = await deleteDir(dir);
  assert.equal(deleted, true);
  // After deletion, the path should not be accessible.
  await assert.rejects(() => fs.access(dir), 'directory should be gone after deleteDir');
});

test('deleteDir: returns false for a path that does not exist', async () => {
  const dir = await mkTmp();
  const deleted = await deleteDir(path.join(dir, 'does-not-exist'));
  assert.equal(deleted, false);
});

test('readJson: throws with file path in the error message', async () => {
  const dir = await mkTmp();
  const bad = path.join(dir, 'bad.json');
  await fs.writeFile(bad, 'not json {{{');
  await assert.rejects(
    () => readJson(bad),
    /Failed to read.*bad\.json/,
    'readJson should include the file path in its error message'
  );
});

test('readJson: throws with ENOENT in the error message for missing files', async () => {
  const dir = await mkTmp();
  await assert.rejects(
    () => readJson(path.join(dir, 'missing.json')),
    /Failed to read.*file not found/,
    'readJson should report "file not found" for ENOENT'
  );
});
