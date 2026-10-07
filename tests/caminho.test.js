// specs/fase-r3-runner-em-uso-real.md — R3-01 (where a step writes) and R3-02 (where a step reads):
// the path of every file of a run comes from `caminho.mjs`, not from the model.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/caminho.mjs';
import { naExecucao, proximaVersao, daMaisNova } from '../templates/_opencrew/core/scripts/caminho/nucleo.mjs';
import { mkTmp, snapshot } from './_helpers.js';

const RUN = '2026-10-06-101500';
const SAIDA = `crews/x/output/${RUN}`;

/** A fake installed project with one crew, `x`; goes away when the test `t` ends. */
async function projeto(t) {
  const raiz = await mkTmp('caminho');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  return raiz;
}

/** Writes each `path: content` under the root (a path ending in `/` is an empty folder). */
async function gravar(raiz, arquivos) {
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const abs = path.join(raiz, rel);
    await fs.mkdir(rel.endsWith('/') ? abs : path.dirname(abs), { recursive: true });
    if (!rel.endsWith('/')) await fs.writeFile(abs, conteudo);
  }
}

/** Runs the command line for crew `x` in `raiz`. */
async function rodar(raiz, argv) {
  const linhas = [];
  const code = await main(['x', ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas };
}
const saida = (raiz, arquivo, run = RUN) => rodar(raiz, ['saida', '--run', run, '--arquivo', arquivo]);
const entrada = (raiz, arquivo, run = RUN) => rodar(raiz, ['entrada', '--run', run, '--arquivo', arquivo]);
const ehPasta = async (p) => (await fs.stat(p).catch(() => null))?.isDirectory() ?? false;
const ok = (caminho) => ({ code: 0, linhas: [`CAMINHO:OK ${caminho}`] });

// ── R3-01 Saída ─────────────────────────────────────────────────────────────────────

test('R3-01a: the first output of a run goes to v1, and the folder exists', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await saida(raiz, 'crews/x/output/pesquisa.md'), ok(`${SAIDA}/v1/pesquisa.md`));
  assert.equal(await ehPasta(path.join(raiz, SAIDA, 'v1')), true);
  assert.deepEqual(await snapshot(raiz), [], 'the script never creates a file');
});

test('R3-01a: a path written with backslashes or with ./ is the same path', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await saida(raiz, 'crews\\x\\output\\pesquisa.md'), ok(`${SAIDA}/v1/pesquisa.md`));
  assert.deepEqual(await saida(raiz, './crews/x/output/post.md'), ok(`${SAIDA}/v2/post.md`));
});

test('R3-01b: with v1 and v3 the output goes to v4 (gaps are not filled)', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v1/`]: '', [`${SAIDA}/v3/`]: '' });
  assert.deepEqual(await saida(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v4/post.md`));
});

test('R3-01b: the order is numeric — with v9 and v10 the output goes to v11', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v9/`]: '', [`${SAIDA}/v10/`]: '' });
  assert.deepEqual(await saida(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v11/post.md`));
});

test('R3-01b: a folder called versao2 and a file called v5 do not count', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/versao2/`]: '', [`${SAIDA}/v2x/`]: '', [`${SAIDA}/v5`]: 'sou um arquivo' });
  assert.deepEqual(await saida(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v1/post.md`));
});

test('R3-01b: the pure rule — highest vN plus 1, v1 when there is none', () => {
  assert.equal(proximaVersao([]), 'v1');
  assert.equal(proximaVersao(['v1', 'v3']), 'v4');
  assert.equal(proximaVersao(['v10', 'v9', 'v2']), 'v11');
  assert.equal(proximaVersao(['versao2', 'V7', 'v', 'v-1', 'v1.5', ' v8']), 'v1');
  assert.deepEqual(daMaisNova(['v2', 'v10', 'slides', 'v9']), ['v10', 'v9', 'v2']);
});

test('R3-01c: a file in a subfolder — the group is that subfolder and its versions are counted alone', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v1/`]: '', [`${SAIDA}/v2/`]: '', [`${SAIDA}/v3/`]: '' });
  assert.deepEqual(await saida(raiz, 'crews/x/output/slides/capa.md'), ok(`${SAIDA}/slides/v1/capa.md`));
  assert.deepEqual(await saida(raiz, 'crews/x/output/slides/capa.md'), ok(`${SAIDA}/slides/v2/capa.md`));
  assert.deepEqual(await saida(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v4/post.md`));
});

test('R3-01c: the pure rule — run_id right after output/, the group is the folder of the file', () => {
  assert.deepEqual(naExecucao('crews/x/output/slides/capa.md', 'x', 'r1'), { grupo: 'crews/x/output/r1/slides', nome: 'capa.md' });
  assert.deepEqual(naExecucao('crews/x/output/post.md', 'x', 'r1'), { grupo: 'crews/x/output/r1', nome: 'post.md' });
  assert.equal(naExecucao('crews/outra/output/post.md', 'x', 'r1'), null);
  assert.equal(naExecucao('docs/fora.md', 'x', 'r1'), null);
});

test('R3-01d: pasta twice — both answer CAMINHO:OK and the folder exists', async (t) => {
  const raiz = await projeto(t);
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await rodar(raiz, ['pasta', '--run', 'r1']), ok('crews/x/output/r1'));
    assert.equal(await ehPasta(path.join(raiz, 'crews', 'x', 'output', 'r1')), true);
  }
  assert.deepEqual(await fs.readdir(path.join(raiz, 'crews', 'x', 'output')), ['r1']);
});

test('R3-01e: a path outside output/ comes back as it is and nothing is created', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await saida(raiz, 'docs/fora.md'), ok('docs/fora.md'));
  assert.deepEqual(await saida(raiz, 'crews/x/pipeline/data/base.md'), ok('crews/x/pipeline/data/base.md'));
  assert.deepEqual((await fs.readdir(raiz)).sort(), ['_opencrew', 'crews']);
  assert.deepEqual(await fs.readdir(path.join(raiz, 'crews', 'x')), []);
});

// ── R3-02 Entrada ───────────────────────────────────────────────────────────────────

test('R3-02a: with v1/pesquisa.md and v2/post.md, the input pesquisa.md is the one in v1', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v1/pesquisa.md`]: '# Pesquisa\n', [`${SAIDA}/v2/post.md`]: '# Post\n' });
  assert.deepEqual(await entrada(raiz, 'crews/x/output/pesquisa.md'), ok(`${SAIDA}/v1/pesquisa.md`));
  assert.deepEqual(await entrada(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v2/post.md`));
});

test('R3-02b: rewritten in v3, the input is the one in v3', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v1/post.md`]: 'primeira', [`${SAIDA}/v2/revisao.md`]: 'REJECT', [`${SAIDA}/v3/post.md`]: 'segunda' });
  assert.deepEqual(await entrada(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v3/post.md`));
});

test('R3-02b: an empty file in v3 does not count — the input is the one in v1', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v1/post.md`]: 'primeira', [`${SAIDA}/v3/post.md`]: '' });
  assert.deepEqual(await entrada(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v1/post.md`));
});

test('R3-02b: the newest version is found by number — v10 before v9', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/v9/post.md`]: 'nona', [`${SAIDA}/v10/post.md`]: 'décima' });
  assert.deepEqual(await entrada(raiz, 'crews/x/output/post.md'), ok(`${SAIDA}/v10/post.md`));
});

test('R3-02c: a checkpoint answer written in the group, with no vN, is found', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/foco.md`]: '# Research Focus\n', [`${SAIDA}/v1/pesquisa.md`]: 'x' });
  assert.deepEqual(await entrada(raiz, 'crews/x/output/foco.md'), ok(`${SAIDA}/foco.md`));
});

test('R3-02c: when the file is also in a vN, the one in the vN wins', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, { [`${SAIDA}/foco.md`]: 'no grupo', [`${SAIDA}/v2/foco.md`]: 'na versão' });
  assert.deepEqual(await entrada(raiz, 'crews/x/output/foco.md'), ok(`${SAIDA}/v2/foco.md`));
});

test('R3-02d: no file anywhere — CAMINHO:FALTA with the path in the group, exit 0, nothing created', async (t) => {
  const raiz = await projeto(t);
  const falta = { code: 0, linhas: [`CAMINHO:FALTA ${SAIDA}/pesquisa.md`] };
  assert.deepEqual(await entrada(raiz, 'crews/x/output/pesquisa.md'), falta);
  await gravar(raiz, { [`${SAIDA}/v1/outro.md`]: 'x', [`${SAIDA}/v2/pesquisa.md/`]: '' }); // a folder with the file's name
  const antes = await snapshot(raiz);
  assert.deepEqual(await entrada(raiz, 'crews/x/output/pesquisa.md'), falta);
  assert.deepEqual(await snapshot(raiz), antes);
  assert.deepEqual((await fs.readdir(path.join(raiz, SAIDA))).sort(), ['v1', 'v2']);
});

test('R3-02d: an input outside output/ is looked for where it was declared', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await entrada(raiz, 'docs/briefing.md'), { code: 0, linhas: ['CAMINHO:FALTA docs/briefing.md'] });
  await gravar(raiz, { 'docs/briefing.md': '# Briefing\n' });
  assert.deepEqual(await entrada(raiz, 'docs/briefing.md'), ok('docs/briefing.md'));
});
