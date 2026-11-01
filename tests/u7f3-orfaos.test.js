// specs/fase-u7-f3-update-que-reconcilia.md — rule 1: a file the package no longer delivers
// (an orphan) leaves the project, with a copy, unless the user edited it. Nothing that is the
// user's is touched, and nothing is removed through a link or outside the four folders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot, mkTmp } from './_helpers.js';
import { newDelivery } from '../src/lib/manifest.js';
import { candidateKey, planOrphans, removeOrphans, payloadKeys } from '../src/lib/reconciliar.js';
import { workspace, manifesto, gravarManifesto, carimboAntigo, entregueAntes, rodar, pastaDeCopia, criarLink, lerOuNada, hashOf, MANIFESTO } from './_reconciliar.js';

const ORFAO = '_opencrew/core/prompts/obsoleto.md';
const aqui = (dir, chave) => path.join(dir, ...chave.split('/'));

test('U7F3-01a: an unedited orphan is removed, a copy goes to .opencrew-backup/, and the summary names it', async () => {
  const dir = await workspace();
  await entregueAntes(dir, ORFAO, 'conteudo antigo\n');
  await carimboAntigo(dir);
  const { out } = await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, ORFAO)), null);
  const copia = await pastaDeCopia(dir);
  assert.equal(await lerOuNada(path.join(copia, ...ORFAO.split('/'))), 'conteudo antigo\n');
  assert.match(out, /saíram do pacote e foram removidos/);
  assert.ok(out.includes(ORFAO));
  assert.equal(ORFAO in (await manifesto(dir)).files, false);
});

test('U7F3-01b: an orphan the user edited stays, leaves the manifest, and the summary warns', async () => {
  const dir = await workspace();
  await entregueAntes(dir, ORFAO, 'o usuário mexeu aqui\n', { registrar: 'o que o OpenCrew entregou\n' });
  await carimboAntigo(dir);
  const { out } = await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, ORFAO)), 'o usuário mexeu aqui\n');
  assert.equal(await pastaDeCopia(dir), null, 'nothing was copied');
  assert.match(out, /você editou, então ficaram/);
  assert.equal(ORFAO in (await manifesto(dir)).files, false);
});

test('U7F3-01c: what is the user\'s is never touched, even with a forged manifest entry', async () => {
  const dir = await workspace();
  const deles = ['crews/minha/crew.yaml', '_opencrew/_memory/nota.md', '.env', 'skills/.custom/minha/SKILL.md', 'qualquer-coisa.txt', 'src/app.js'];
  for (const chave of deles) await entregueAntes(dir, chave, `do usuário: ${chave}\n`);
  await carimboAntigo(dir);
  await rodar(dir);
  for (const chave of deles) assert.equal(await lerOuNada(aqui(dir, chave)), `do usuário: ${chave}\n`, chave);
  assert.equal(await pastaDeCopia(dir), null);
});

test('U7F3-01d: an orphan that is a link is left alone (link and target); with no usable manifest nothing is removed', async (t) => {
  const dir = await workspace();
  const fora = path.join(dir, 'fora.txt');
  await fs.writeFile(fora, 'do outro lado\n');
  const link = aqui(dir, ORFAO);
  if (!(await criarLink(fora, link))) return t.skip('cannot create symbolic links here');
  const m = await manifesto(dir);
  m.files[ORFAO] = hashOf('do outro lado\n');
  await gravarManifesto(dir, m);
  await carimboAntigo(dir);
  await rodar(dir);
  assert.ok((await fs.lstat(link)).isSymbolicLink());
  assert.equal(await lerOuNada(fora), 'do outro lado\n');
  assert.equal(await pastaDeCopia(dir), null);

  const semRegistro = await workspace();
  await entregueAntes(semRegistro, ORFAO, 'x\n');
  await fs.writeFile(path.join(semRegistro, MANIFESTO), '{ não é json');
  await carimboAntigo(semRegistro);
  await rodar(semRegistro);
  assert.equal(await lerOuNada(aqui(semRegistro, ORFAO)), 'x\n');
});

test('U7F3-01e: a folder left empty goes away; one with a user file (even hidden) stays; the four folders themselves never go', async () => {
  const dir = await workspace();
  const sozinho = '_opencrew/core/prompts/sub-a/x.md';
  const comOculto = '_opencrew/core/prompts/sub-b/y.md';
  await entregueAntes(dir, sozinho, 'x\n');
  await entregueAntes(dir, comOculto, 'y\n');
  await fs.writeFile(aqui(dir, '_opencrew/core/prompts/sub-b/.meu-arquivo'), 'meu\n');
  await carimboAntigo(dir);
  await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, sozinho)), null);
  await assert.rejects(() => fs.stat(aqui(dir, '_opencrew/core/prompts/sub-a')));
  assert.equal(await lerOuNada(aqui(dir, '_opencrew/core/prompts/sub-b/.meu-arquivo')), 'meu\n');
  for (const raiz of ['_opencrew/core', '_opencrew/agents', '_opencrew/config', 'skills']) assert.ok((await fs.stat(aqui(dir, raiz))).isDirectory(), raiz);
});

test('U7F3-01f: when the FOLDER of the orphan is a link (outside the project, or to another place in it), nothing is removed or copied', async (t) => {
  const dir = await workspace();
  const fora = await mkTmp('u7f3-fora'); // really outside the project
  const dentro = path.join(dir, 'pasta-dentro'); // another place of the project
  await fs.mkdir(dentro);
  for (const lado of [fora, dentro]) await fs.writeFile(path.join(lado, 'orfao.md'), 'do outro lado\n');
  if (!(await criarLink(fora, aqui(dir, '_opencrew/core/extra-fora'), 'dir'))) return t.skip('cannot create symbolic links here');
  await criarLink(dentro, aqui(dir, '_opencrew/core/extra-dentro'), 'dir');
  const m = await manifesto(dir);
  for (const pasta of ['extra-fora', 'extra-dentro']) m.files[`_opencrew/core/${pasta}/orfao.md`] = hashOf('do outro lado\n');
  await gravarManifesto(dir, m);
  await carimboAntigo(dir);
  await rodar(dir);
  for (const lado of [fora, dentro]) assert.equal(await lerOuNada(path.join(lado, 'orfao.md')), 'do outro lado\n', lado);
  assert.equal(await pastaDeCopia(dir), null);
});

test('U7F3-01g: a manifest key with .., absolute, backslash or colon is ignored; the file it points to outside the folders stays', async () => {
  const dir = await workspace();
  await fs.writeFile(aqui(dir, '.env'), 'SEGREDO=1\n');
  const m = await manifesto(dir);
  for (const chave of ['_opencrew/core/../../.env', '/etc/passwd', '_opencrew/core\\..\\..\\.env', 'C:/Windows/x', '_opencrew/core/../../../fora.txt']) m.files[chave] = hashOf('SEGREDO=1\n');
  await gravarManifesto(dir, m);
  await carimboAntigo(dir);
  const { code } = await rodar(dir);
  assert.equal(code, 0);
  assert.equal(await lerOuNada(aqui(dir, '.env')), 'SEGREDO=1\n');
  assert.equal(await pastaDeCopia(dir), null, 'nothing was copied for those keys');
});

test('U7F3-01h: a second update says and removes nothing new; an entry whose file is gone leaves silently; a folder in place of a file does not break it', async () => {
  const dir = await workspace();
  await entregueAntes(dir, ORFAO, 'x\n');
  await entregueAntes(dir, '_opencrew/core/prompts/ja-sumiu.md', 'y\n');
  await fs.rm(aqui(dir, '_opencrew/core/prompts/ja-sumiu.md'));
  await fs.mkdir(aqui(dir, '_opencrew/core/prompts/era-arquivo.md'));
  const m = await manifesto(dir);
  m.files['_opencrew/core/prompts/era-arquivo.md'] = hashOf('z\n');
  await gravarManifesto(dir, m);
  await carimboAntigo(dir);
  const primeiro = await rodar(dir);
  assert.equal(primeiro.code, 0);
  assert.doesNotMatch(primeiro.out, /ja-sumiu/, 'a gone file leaves the manifest without a word');
  assert.ok((await fs.stat(aqui(dir, '_opencrew/core/prompts/era-arquivo.md'))).isDirectory());
  const depois = JSON.stringify(await manifesto(dir));
  const segundo = await rodar(dir);
  assert.doesNotMatch(segundo.out, /saíram do pacote/);
  assert.equal(JSON.stringify(await manifesto(dir)), depois);
});

test('U7F3-06b: a .opencrew-backup/ of another date is left as it is', async () => {
  const dir = await workspace();
  await fs.mkdir(aqui(dir, '.opencrew-backup/2020-01-01T00-00-00-000Z'), { recursive: true });
  await fs.writeFile(aqui(dir, '.opencrew-backup/2020-01-01T00-00-00-000Z/velho.md'), 'velho\n');
  await entregueAntes(dir, ORFAO, 'x\n');
  await carimboAntigo(dir);
  await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, '.opencrew-backup/2020-01-01T00-00-00-000Z/velho.md')), 'velho\n');
  assert.ok((await snapshot(path.join(dir, '.opencrew-backup'))).some((f) => f.includes('obsoleto.md')));
});

// ── Extra cases found by the independent review of the code (2026-11-01) ───────────────────────

test('U7F3-01i: what this run delivered is never an orphan, even if the package list came out empty', async () => {
  const dir = await workspace();
  const m = await manifesto(dir);
  const ctx = newDelivery(dir, m);
  ctx.files = { ...m.files }; // as after a run that delivered everything
  const { removed, edited } = await removeOrphans(ctx, new Set());
  assert.deepEqual([removed, edited], [[], []]);
  assert.ok(await lerOuNada(aqui(dir, '_opencrew/core/system.md')), 'system.md stays');
});

test('U7F3-01j: odd keys never name an orphan: trailing slash, the folder itself, skills/.custom without a slash', () => {
  for (const chave of ['_opencrew/core/system.md/', '_opencrew/core/', 'skills/', 'skills/.custom', 'skills/.custom/x/SKILL.md', '_opencrew/core/a//b.md', '_opencrew/core/./a.md']) {
    assert.equal(candidateKey(chave), false, chave);
  }
  for (const chave of ['_opencrew/core/prompts/x.md', 'skills/canva/SKILL.md', '_opencrew/agents/a.agent.md', '_opencrew/config/c.json']) assert.equal(candidateKey(chave), true, chave);
});

test('U7F3-01k: a rename that only changes the case is one file, not an orphan', async () => {
  const dir = await workspace();
  await entregueAntes(dir, '_opencrew/core/prompts/Obsoleto.md', 'x\n');
  const payload = await payloadKeys();
  assert.deepEqual(await planOrphans(dir, await manifesto(dir), payload), { remove: ['_opencrew/core/prompts/Obsoleto.md'], edited: [] }, 'with no such file in the package it is an orphan');
  payload.add('_opencrew/core/prompts/obsoleto.md'); // the package now ships the same name in lower case
  assert.deepEqual(await planOrphans(dir, await manifesto(dir), payload), { remove: [], edited: [] });
});

test('U7F3-01l: an unedited orphan saved with CRLF is still unedited (the manifest hashes the text with LF)', async () => {
  const dir = await workspace();
  await entregueAntes(dir, ORFAO, 'linha 1\r\nlinha 2\r\n', { registrar: 'linha 1\nlinha 2\n' });
  await carimboAntigo(dir);
  await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, ORFAO)), null);
});

test('U7F3-01g2: the whole skills/ folder gone: every catalog skill is uninstalled, nothing else is touched', async () => {
  const dir = await workspace();
  await fs.rm(aqui(dir, 'skills'), { recursive: true });
  await carimboAntigo(dir);
  const { out, code } = await rodar(dir);
  assert.equal(code, 0);
  await assert.rejects(() => fs.stat(aqui(dir, 'skills/canva')));
  assert.match(out, /Skill desinstalada, não recriei: /);
  assert.ok(await lerOuNada(aqui(dir, '_opencrew/core/system.md')));
});
