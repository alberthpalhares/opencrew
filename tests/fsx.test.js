import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mkTmp as criarTmp } from './_helpers.js';
import { writeFileSafe, exists, readJson, readFile } from '../src/lib/fsx.js';
import { deliverBlock } from '../src/lib/blocos.js';
import { newDelivery } from '../src/lib/manifest.js';

// A pasta some quando o processo de teste termina (specs/fase-u6a-polimento-do-uso-real.md, regra 12).
const mkTmp = () => criarTmp('fsx');

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

test('readFile returns file content as string', async () => {
  const dir = await mkTmp();
  const p = path.join(dir, 'hello.txt');
  await fs.writeFile(p, 'hello world');
  assert.equal(await readFile(p), 'hello world');
});

// Marked blocks: R2 (rule 4) replaced fsx.writeBridgeFile by the one writer, blocos.deliverBlock
// (file = path relative to the project root; `action` instead of { written, merged }).
test('deliverBlock creates file with markers when file does not exist', async () => {
  const dir = await mkTmp();
  const p = path.join(dir, 'bridge.md');
  const result = await deliverBlock(newDelivery(dir, null), 'bridge.md', '# Test Bridge');
  assert.equal(result.action, 'created');
  const content = await fs.readFile(p, 'utf8');
  assert.ok(content.includes('<!-- opencrew:start -->'));
  assert.ok(content.includes('# Test Bridge'));
  assert.ok(content.includes('<!-- opencrew:end -->'));
});

test('deliverBlock replaces block when markers exist, preserves other content', async () => {
  const dir = await mkTmp();
  const p = path.join(dir, 'bridge.md');
  await fs.writeFile(p, '<!-- opencrew:start -->\nold content\n<!-- opencrew:end -->\n\n# User Stuff\nmy notes');
  const result = await deliverBlock(newDelivery(dir, null), 'bridge.md', 'new content');
  assert.equal(result.action, 'updated');
  const content = await fs.readFile(p, 'utf8');
  assert.ok(content.includes('new content'));
  assert.ok(!content.includes('old content'));
  assert.ok(content.includes('# User Stuff'));
  assert.ok(content.includes('my notes'));
});

test('deliverBlock prepends block when file exists without markers', async () => {
  const dir = await mkTmp();
  const p = path.join(dir, 'bridge.md');
  await fs.writeFile(p, '# My Project\n\nSome content.');
  const result = await deliverBlock(newDelivery(dir, null), 'bridge.md', '# Bridge');
  assert.equal(result.action, 'added');
  const content = await fs.readFile(p, 'utf8');
  const openStart = content.indexOf('<!-- opencrew:start -->');
  const openEnd = content.indexOf('<!-- opencrew:end -->');
  const userIdx = content.indexOf('# My Project');
  assert.ok(openStart < openEnd);
  assert.ok(openEnd < userIdx, 'bridge block should precede user content');
  assert.ok(content.includes('Some content.'));
});

test('readJson: throws with ENOENT in the error message for missing files', async () => {
  const dir = await mkTmp();
  await assert.rejects(
    () => readJson(path.join(dir, 'missing.json')),
    /Failed to read.*file not found/,
    'readJson should report "file not found" for ENOENT'
  );
});
