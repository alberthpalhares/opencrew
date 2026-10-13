// specs/fase-e4-robustez-do-escritorio.md — E4-03: `caminho.mjs pasta` does not open a second run
// of a crew that has one open and recent without the user being asked; `--nova` opens it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  'O painel do escritório é um só por crew: duas execuções ao mesmo tempo se misturam nele.',
  'Pergunte ao usuário: continuar aquela (/opencrew retomar atas) ou abrir outra (repita este comando com --nova).',
  `CAMINHO:ABERTA ${run}`,
];

/** The record of a run, as it is on disk: started `minutos` ago, plus what `extra` says. */
const execucao = (run, minutos, extra = {}) => ({ [`${SAIDA}/${run}/execucao.json`]: `${JSON.stringify({ ...novoRegistro({ crew: CREW, run, tema: 'Ata de outubro', passos: 5, em: ha(minutos) }), ...extra }, null, 2)}\n` });

async function rodar(raiz, ...argv) {
  const linhas = [];
  const code = await main([CREW, ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), agora: () => AGORA });
  return [code, linhas];
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
