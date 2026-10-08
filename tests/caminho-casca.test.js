// specs/fase-r3-runner-em-uso-real.md — R3-03: the check of a written file and the shell of
// `caminho.mjs` (usage errors, last line, exit code, and what it may touch on disk).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/caminho.mjs';
import { motivoDeReprovacao } from '../templates/_opencrew/core/scripts/caminho/nucleo.mjs';
import { mkTmp, snapshot } from './_helpers.js';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/scripts/caminho.mjs');
const USO = 'Uso: node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]';
const AUSENTE = 'CAMINHO:REPROVADO arquivo ausente ou vazio';
const SEM_TLDR = 'CAMINHO:REPROVADO falta a seção TL;DR';
const ARQ = 'crews/x/output/r1/v1/post.md';

/** A fake installed project with one crew, `x`; goes away when the test `t` ends. */
async function projeto(t, { instalado = true } = {}) {
  const raiz = await mkTmp('caminho-casca');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  if (instalado) await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  return raiz;
}

async function gravar(raiz, rel, conteudo) {
  await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
  await fs.writeFile(path.join(raiz, rel), conteudo);
}

async function rodar(raiz, argv) {
  const linhas = [];
  const code = await main(argv, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas };
}
const conferir = (raiz, ...opcoes) => rodar(raiz, ['x', 'conferir', '--arquivo', ARQ, ...opcoes]);
const ok = { code: 0, linhas: [`CAMINHO:OK ${ARQ}`] };
const reprovado = (linha) => ({ code: 0, linhas: [linha] });

/** Every folder under `dir`, relative and with `/`. */
async function pastas(dir, rel = '') {
  const filhas = (await fs.readdir(path.join(dir, rel), { withFileTypes: true })).filter((e) => e.isDirectory());
  const achadas = [];
  for (const e of filhas) achadas.push(`${rel}${e.name}`, ...(await pastas(dir, `${rel}${e.name}/`)));
  return achadas;
}

// ── R3-03a to R3-03c Conferência ────────────────────────────────────────────────────

test('R3-03a: a file with content is CAMINHO:OK; a missing one, an empty one and a folder are reproved', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await conferir(raiz), reprovado(AUSENTE));
  await gravar(raiz, ARQ, '');
  assert.deepEqual(await conferir(raiz), reprovado(AUSENTE));
  await gravar(raiz, ARQ, 'Um post.\n');
  assert.deepEqual(await conferir(raiz), ok);
  await fs.mkdir(path.join(raiz, 'crews/x/output/r1/v2/post.md'), { recursive: true });
  assert.deepEqual(await rodar(raiz, ['x', 'conferir', '--arquivo', 'crews/x/output/r1/v2/post.md']), reprovado(AUSENTE));
});

test('R3-03a: a missing file is the first reason, whatever else was asked', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await conferir(raiz, '--secoes', '3', '--tldr'), reprovado(AUSENTE));
});

test('R3-03b: --secoes 3 with two "## " lines is reproved with the count; with three it passes; ### does not count', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, ARQ, '# Título\n\n## Fontes\n\n### Detalhe\n\n## Descobertas\ntexto ## no meio\n');
  assert.deepEqual(await conferir(raiz, '--secoes', '3'), reprovado('CAMINHO:REPROVADO 2 seções, mínimo 3'));
  assert.deepEqual(await conferir(raiz, '--secoes=2'), ok);
  await gravar(raiz, ARQ, '## Fontes\r\n\r\n## Descobertas\r\n\r\n## TL;DR\r\n');
  assert.deepEqual(await conferir(raiz, '--secoes', '3'), ok);
});

test('R3-03c: --tldr without the "## TL;DR" line is reproved; with it, CAMINHO:OK', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, ARQ, '## Resumo\n\nO TL;DR fica para depois.\n### TL;DR\n');
  assert.deepEqual(await conferir(raiz, '--tldr'), reprovado(SEM_TLDR));
  assert.deepEqual(await conferir(raiz), ok);
  await gravar(raiz, ARQ, '## Resumo\n\n## TL;DR\n- ponto\n');
  assert.deepEqual(await conferir(raiz, '--tldr'), ok);
  assert.deepEqual(await conferir(raiz, '--secoes', '2', '--tldr'), ok);
});

test('R3-03c: with both options the first reason of the table wins (sections before TL;DR)', () => {
  assert.equal(motivoDeReprovacao('## Um\n', { secoes: 2, tldr: true }), '1 seções, mínimo 2');
  assert.equal(motivoDeReprovacao('## Um\n## Dois\n', { secoes: 2, tldr: true }), 'falta a seção TL;DR');
  assert.equal(motivoDeReprovacao(`${String.fromCharCode(0xfeff)}## TL;DR\n`, { secoes: 1, tldr: true }), null);
  assert.equal(motivoDeReprovacao('sem título', {}), null);
});

// ── R3-03d Erro de uso ──────────────────────────────────────────────────────────────

const ERROS = [
  ['a crew that does not exist', ['fantasma', 'pasta', '--run', 'r1'], 'Crew não encontrada: fantasma'],
  ['a crew outside crews/', ['../fora', 'pasta', '--run', 'r1'], 'Caminho fora do projeto: ../fora'],
  ['--run with a slash', ['x', 'pasta', '--run', 'a/b'], 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.'],
  ['--run made of dots', ['x', 'pasta', '--run', '..'], 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.'],
  ['no --run', ['x', 'saida', '--arquivo', 'crews/x/output/post.md'], 'Falta a opção obrigatória --run.'],
  ['no --arquivo', ['x', 'entrada', '--run', 'r1'], 'Falta a opção obrigatória --arquivo.'],
  ['conferir with no --arquivo', ['x', 'conferir'], 'Falta a opção obrigatória --arquivo.'],
  ['no action', ['x'], 'Falta a ação. Ações: pasta, saida, entrada, conferir.'],
  ['an unknown action', ['x', 'apagar', '--run', 'r1'], 'Ação desconhecida: apagar. Ações: pasta, saida, entrada, conferir.'],
  ['no crew', [], 'Falta o nome da crew.'],
  ['--secoes 0', ['x', 'conferir', '--arquivo', ARQ, '--secoes', '0'], 'O --secoes é um número inteiro a partir de 1.'],
  ['a file outside the project', ['x', 'saida', '--run', 'r1', '--arquivo', '../fora.md'], 'Caminho fora do projeto: ../fora.md'],
  ['a file that leaves the run folder', ['x', 'saida', '--run', 'r1', '--arquivo', 'crews/x/output/../../y/post.md'], 'Caminho fora da pasta da execução: crews/x/output/../../y/post.md'],
  ['output/ with no file name', ['x', 'saida', '--run', 'r1', '--arquivo', 'crews/x/output/'], 'Falta o nome do arquivo em --arquivo: crews/x/output/'],
];
for (const [caso, argv, motivo] of ERROS) {
  test(`R3-03d: ${caso} — exit 1, the usage line and the reason, no CAMINHO: line, nothing created`, async (t) => {
    const raiz = await projeto(t);
    const antes = await pastas(raiz);
    assert.deepEqual(await rodar(raiz, argv), { code: 1, linhas: [USO, motivo] });
    assert.deepEqual(await pastas(raiz), antes);
  });
}

test('R3-03d: a folder with no _opencrew/ — exit 1 and nothing created', async (t) => {
  const raiz = await projeto(t, { instalado: false });
  const semRaiz = 'Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.';
  assert.deepEqual(await rodar(raiz, ['x', 'pasta', '--run', 'r1']), { code: 1, linhas: [USO, semRaiz] });
  assert.deepEqual(await pastas(raiz), ['crews', 'crews/x']);
});

test('R3-03d: called as a process — the exit code and the last line are the ones the runner reads', async (t) => {
  const raiz = await projeto(t);
  const chamar = (...argv) => spawnSync(process.execPath, [SCRIPT, ...argv], { cwd: raiz, encoding: 'utf8' });
  const certo = chamar('crews/x', 'saida', '--run', 'r1', '--arquivo', 'crews/x/output/post.md');
  assert.deepEqual([certo.status, certo.stdout.trimEnd().split('\n').at(-1)], [0, 'CAMINHO:OK crews/x/output/r1/v1/post.md']);
  const errado = chamar('x', 'saida', '--arquivo', 'crews/x/output/post.md');
  assert.equal(errado.status, 1);
  assert.doesNotMatch(errado.stdout, /CAMINHO:/);
  assert.match(errado.stdout, /^Uso: node _opencrew\/core\/scripts\/caminho\.mjs/);
});

// ── R3-03e O que o script toca ──────────────────────────────────────────────────────

test('R3-03e: after a sequence of actions no file was changed or deleted, the only new file is the record of the new run, and every new folder is inside output/<run>/', async (t) => {
  const raiz = await projeto(t);
  await gravar(raiz, 'crews/x/crew.yaml', 'name: x\n');
  await gravar(raiz, 'crews/x/output/antiga/v1/pesquisa.md', '## TL;DR\n');
  await gravar(raiz, 'crews/x/output/r1/v1/pesquisa.md', '## Fontes\n\n## TL;DR\n');
  await gravar(raiz, 'docs/briefing.md', 'Briefing.\n');
  const [arquivosAntes, pastasAntes] = [await snapshot(raiz), await pastas(raiz)];

  const SEQUENCIA = [
    ['pasta', '--run', 'r1'], ['pasta', '--run', 'r2'],
    ['saida', '--run', 'r1', '--arquivo', 'crews/x/output/post.md'],
    ['saida', '--run', 'r1', '--arquivo', 'crews/x/output/slides/capa.md'],
    ['saida', '--run', 'r1', '--arquivo', 'docs/fora.md'],
    ['saida', '--run', 'r1', '--arquivo', '../fora.md'],
    ['entrada', '--run', 'r1', '--arquivo', 'crews/x/output/pesquisa.md'],
    ['entrada', '--run', 'r3', '--arquivo', 'crews/x/output/novo/pesquisa.md'],
    ['entrada', '--run', 'r1', '--arquivo', 'docs/briefing.md'],
    ['conferir', '--arquivo', 'crews/x/output/r1/v1/pesquisa.md', '--secoes', '5', '--tldr'],
    ['conferir', '--arquivo', 'crews/x/output/r9/v1/nada.md'],
    ['apagar', '--run', 'r1'],
  ];
  for (const argv of SEQUENCIA) await rodar(raiz, ['x', ...argv]);

  // Since U5-3 the folder `pasta` creates (r2) is born with the run record; r1 already existed and gets none.
  const registro = (l) => l.split(path.sep).join('/').startsWith('crews/x/output/r2/execucao.json:');
  assert.deepEqual((await snapshot(raiz)).filter((l) => !registro(l)), arquivosAntes);
  assert.equal((await snapshot(raiz)).filter(registro).length, 1);
  const novas = (await pastas(raiz)).filter((p) => !pastasAntes.includes(p));
  assert.deepEqual(novas.sort(), ['crews/x/output/r1/slides', 'crews/x/output/r1/slides/v1', 'crews/x/output/r1/v2', 'crews/x/output/r2']);
  for (const p of novas) assert.match(p, /^crews\/x\/output\/r[12](\/|$)/);
});
