// specs/fase-e4-robustez-do-escritorio.md — E4-03: `caminho.mjs pasta` does not open a second run
// of a crew that has one open and recent without the user being asked; `--nova` opens it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/caminho.mjs';
import { novoRegistro } from '../templates/_opencrew/core/scripts/execucao/registro.mjs';
import { CREW, SAIDA, projeto, gravar, registro, fora } from './_execucao.js';

const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core');
const AGORA = new Date(2026, 9, 12, 15, 0, 0);
const ha = (minutos) => new Date(AGORA.getTime() - minutos * 60_000).toISOString();
const USO = 'Uso: node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]';
const NOVO = `${SAIDA}/2026-10-12-150000`;
const LINHAS = (run, tema, minutos) => [
  `A crew atas já tem uma execução aberta: ${run}${tema ? ` (${tema})` : ''}, com atividade há ${minutos} min.`,
  'Essa execução ainda tem um vínculo recente com uma sessão.',
  'Pergunte ao usuário: continuar aquela (/opencrew retomar atas) ou abrir outra (repita este comando com --nova).',
  `CAMINHO:ABERTA ${run}`,
];

/** The record of a run, as it is on disk: started `minutos` ago, plus what `extra` says. */
const execucao = (run, minutos, extra = {}, visual = { sessao: 'sessao-teste' }) => ({
  [`${SAIDA}/${run}/execucao.json`]: `${JSON.stringify({ ...novoRegistro({ crew: CREW, run, tema: 'Ata de outubro', passos: 5, em: ha(minutos) }), ...extra }, null, 2)}\n`,
  [`${SAIDA}/${run}/estado-escritorio.json`]: JSON.stringify({ runId: run, agents: [], ...visual }),
});

async function rodar(raiz, ...argv) {
  const linhas = [];
  const code = await main([CREW, ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), agora: () => AGORA });
  return [code, linhas];
}

async function rodarProcesso(raiz, ...opcoes) {
  const script = pathToFileURL(path.join(CORE, 'scripts', 'caminho.mjs')).href;
  const args = JSON.stringify([CREW, 'pasta', '--nova', ...opcoes]);
  const codigo = `import { main } from ${JSON.stringify(script)}; await main(${args}, { cwd: ${JSON.stringify(raiz)}, agora: () => new Date(2026, 9, 12, 15, 0, 0), escrever: console.log });`;
  return new Promise((resolve, reject) => {
    const processo = spawn(process.execPath, ['--input-type=module', '-e', codigo], { cwd: raiz, windowsHide: true });
    let saida = '';
    processo.stdout.setEncoding('utf8').on('data', (parte) => { saida += parte; });
    processo.stderr.setEncoding('utf8').on('data', (parte) => { saida += parte; });
    processo.once('error', reject);
    processo.once('close', (code) => resolve({ code, linhas: saida.trim().split(/\r?\n/) }));
  });
}

test('E4-03a: a run open with activity 3 minutes ago — the three lines and CAMINHO:ABERTA, exit 0, nothing written', async (t) => {
  const raiz = await projeto(t, execucao('r1', 3));
  const antes = await fora(raiz, []);
  assert.deepEqual(await rodar(raiz, 'pasta', '--tema', 'Outra ata', '--passos', '5'), [0, LINHAS('r1', 'Ata de outubro', 3)]);
  assert.deepEqual(await fora(raiz, []), antes, 'no folder, no record');
  const semTema = await projeto(t, execucao('r1', 0, { tema: '' }));
  assert.deepEqual((await rodar(semTema, 'pasta'))[1], LINHAS('r1', '', 0));
});

test('E4-03b: the same with --nova — CAMINHO:OK with a new run, recorded as always', async (t) => {
  const raiz = await projeto(t, execucao('r1', 3));
  assert.deepEqual(await rodar(raiz, 'pasta', '--nova', '--tema', 'Outra ata', '--passos', '5'), [0, [`CAMINHO:OK ${NOVO}`]]);
  const novo = await registro(raiz, '2026-10-12-150000');
  assert.deepEqual([novo.status, novo.tema, novo.passosPrevistos], ['aberta', 'Outra ata', 5]);
  assert.equal((await registro(raiz, 'r1')).status, 'aberta', 'the other run stays as it was');
});

test('E4-03c: an open run of 3 hours ago, only closed runs, or only an open request — pasta creates the run; pasta --pedido is never stopped', async (t) => {
  const casos = [
    execucao('r1', 180),
    { ...execucao('r1', 3, { status: 'aprovada', fechadaEm: ha(1) }), ...execucao('r2', 5, { status: 'abortada', fechadaEm: ha(4) }) },
    execucao('r1', 3, { tipo: 'pedido' }),
    {},
  ];
  for (const arquivos of casos) {
    const raiz = await projeto(t, arquivos);
    assert.deepEqual(await rodar(raiz, 'pasta', '--passos', '5'), [0, [`CAMINHO:OK ${NOVO}`]], Object.keys(arquivos).join(' '));
  }
  const raiz = await projeto(t, execucao('r1', 3));
  assert.deepEqual(await rodar(raiz, 'pasta', '--pedido'), [0, [`CAMINHO:OK ${NOVO}`]]);
  assert.deepEqual(await rodar(raiz, 'pasta', '--run', 'r1'), [0, [`CAMINHO:OK ${SAIDA}/r1`]], 'with --run the folder is the one asked for');
  await gravar(raiz, { [`${SAIDA}/r9/execucao.json`]: '{ "status": "aber' });
  assert.equal((await rodar(raiz, 'pasta'))[1].at(-1), 'CAMINHO:ABERTA r1', 'a record cut in half is not a run to ask about');
});

test('U7F3C-09d: an open run without a live session does not block a new run', async (t) => {
  for (const visual of [{}, { sessao: 'sessao-teste', desvinculadoEm: ha(1) }]) {
    const raiz = await projeto(t, execucao('r1', 3, {}, visual));
    assert.deepEqual(await rodar(raiz, 'pasta'), [0, [`CAMINHO:OK ${NOVO}`]]);
    assert.equal((await registro(raiz, 'r1')).status, 'aberta');
  }
});

test('U7F3C-10a: simultaneous generated runs and requests reserve distinct folders', async (t) => {
  const raiz = await projeto(t);
  const abrir = (opcoes) => Promise.all(Array.from({ length: 12 }, () => rodarProcesso(raiz, ...opcoes)));
  for (const opcoes of [['--passos', '5'], ['--pedido']]) {
    const respostas = await abrir(opcoes);
    const caminhos = respostas.map(({ linhas }) => linhas.at(-1).slice('CAMINHO:OK '.length));
    assert.ok(respostas.every(({ code }) => code === 0));
    assert.equal(new Set(caminhos).size, 12);
    for (const caminho of caminhos) assert.equal((await registro(raiz, path.basename(caminho))).status, 'aberta');
  }
});

test('E4-03d: the activity is the latest of the start, the steps and the marks; with two open runs, the one of the latest activity', async (t) => {
  const passos = [{ n: 1, arquivo: 'a.md', em: ha(40) }, { n: 2, arquivo: 'b.md', em: ha(10) }];
  const raiz = await projeto(t, execucao('r1', 180, { passos }));
  assert.deepEqual((await rodar(raiz, 'pasta'))[1], LINHAS('r1', 'Ata de outubro', 10));
  await gravar(raiz, execucao('r2', 170, { marcos: [{ passo: 1, evento: 'checkpoint', resultado: 'aprovado', nota: '', em: ha(4) }] }));
  await gravar(raiz, execucao('r3', 30));
  assert.deepEqual((await rodar(raiz, 'pasta'))[1], LINHAS('r2', 'Ata de outubro', 4));
});

test('E4-03e: --nova outside pasta, or with --run — usage error, exit 1, nothing created', async (t) => {
  const raiz = await projeto(t);
  const antes = await fora(raiz, []);
  assert.deepEqual(await rodar(raiz, 'saida', '--run', 'r1', '--arquivo', `${SAIDA}/a.md`, '--nova'), [1, [USO, 'O --nova só vale na ação pasta.']]);
  assert.deepEqual(await rodar(raiz, 'pasta', '--run', 'r1', '--nova'), [1, [USO, 'O --nova abre uma execução nova: não vai com --run.']]);
  assert.deepEqual(await fora(raiz, []), antes);
});

test('E4-03f: the runner names CAMINHO:ABERTA in the command that starts the run', () => {
  const runner = readFileSync(path.join(CORE, 'runner.pipeline.md'), 'utf8').replace(/\s+/g, ' ');
  assert.ok(runner.includes('(no `--run`: the script creates the `run_id`). Last line `CAMINHO:ABERTA {run_id}` instead: nothing was created — show the user the lines above it, ask, and do what they say |'));
});
