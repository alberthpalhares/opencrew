// specs/fase-e4-robustez-do-escritorio.md — E4-05: the agent of a step is the one the step file
// names in `agent:`; `estado.mjs` uses it when `--agente` comes different, and only when the count
// of steps of the run matches the crew.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/estado.mjs';
import { mkTmp } from './_helpers.js';

const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core');
const CSV = 'id,displayName,title,icon,path,execution\na,Ana,Pesquisadora,🔎,./agents/a.agent.md,inline\nb,Beto,Redator,✍️,./agents/b.agent.md,inline\nc,Caio,Revisor,✅,./agents/c.agent.md,inline\n';
const PIPELINE = 'steps:\n  - step: 1\n    file: steps/step-01.md\n  - step: 2\n    file: steps/step-02.md\n  - step: 3\n    file: steps/step-03.md\n';
const passo = (agente) => `---\n${agente ? `agent: ${agente}\n` : ''}format: texto-livre\n---\n\n# Passo\n`;
const OK = 'ESTADO:OK';
const DO_PASSO = (n, id) => `ESTADO:OK — agente do passo ${n}: ${id}`;

/** A project with the crew `teste`: three steps, of the agents given (null: a step with no `agent:`). */
async function projeto(t, { agentes = ['a', 'b', 'c'], pipeline = PIPELINE } = {}) {
  const raiz = await mkTmp('estado-passo');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const crew = path.join(raiz, 'crews', 'teste');
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await fs.mkdir(path.join(crew, 'pipeline', 'steps'), { recursive: true });
  await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), '- **Dashboard:** enabled\n');
  await fs.writeFile(path.join(crew, 'crew-party.csv'), CSV);
  if (pipeline) await fs.writeFile(path.join(crew, 'pipeline', 'pipeline.yaml'), pipeline);
  for (const [i, agente] of agentes.entries()) await fs.writeFile(path.join(crew, 'pipeline', 'steps', `step-0${i + 1}.md`), passo(agente));
  return raiz;
}

async function rodar(raiz, ...argv) {
  const linhas = [];
  await main(['teste', ...argv], { cwd: raiz, escrever: (s) => linhas.push(s) });
  return linhas.at(-1);
}
const status = async (raiz) => Object.fromEntries(JSON.parse(await fs.readFile(path.join(raiz, 'crews', 'teste', 'state.json'), 'utf8')).agents.map((a) => [a.id, a.status]));

test('E4-05a: passo --n 2 with the agent of another step — the agent of step 2 works, and the line says so', async (t) => {
  const raiz = await projeto(t);
  await rodar(raiz, 'iniciar', '--passos', '3');
  assert.equal(await rodar(raiz, 'passo', '--n', '1', '--agente', 'a'), OK, 'the right agent: the answer of always');
  assert.equal(await rodar(raiz, 'passo', '--n', '2', '--agente', 'a'), DO_PASSO(2, 'b'));
  assert.deepEqual(await status(raiz), { a: 'done', b: 'working', c: 'idle' });
  assert.equal(await rodar(raiz, 'passo', '--n', '3'), DO_PASSO(3, 'c'), 'no --agente: the one of the step');
  assert.deepEqual(await status(raiz), { a: 'done', b: 'done', c: 'working' });
});

test('E4-05a: an old step file names the agent by its path — the last segment is the id', async (t) => {
  const raiz = await projeto(t, { agentes: ['a', '"crews/teste/agents/b"', 'c'] });
  await rodar(raiz, 'iniciar', '--passos', '3');
  assert.equal(await rodar(raiz, 'passo', '--n', '2', '--agente', 'c'), DO_PASSO(2, 'b'));
});

test('E4-05b: with an agent skipped, the steps of that agent do not count', async (t) => {
  const raiz = await projeto(t);
  await rodar(raiz, 'iniciar', '--passos', '2');
  await rodar(raiz, 'pular', '--agente', 'b');
  assert.equal(await rodar(raiz, 'passo', '--n', '2', '--agente', 'a'), DO_PASSO(2, 'c'));
  assert.deepEqual(await status(raiz), { a: 'idle', b: 'skipped', c: 'working' });
});

test('E4-05c: the count does not match, or the crew has no steps to read — the --agente that came is the one', async (t) => {
  const semPassos = await projeto(t, { agentes: [], pipeline: null });
  for (const [raiz, passos] of [[await projeto(t), ['--passos', '5']], [await projeto(t), []], [semPassos, ['--passos', '3']]]) {
    await rodar(raiz, 'iniciar', ...passos);
    assert.equal(await rodar(raiz, 'passo', '--n', '2', '--agente', 'a'), OK);
    assert.equal((await status(raiz)).a, 'working');
  }
  const foraDoElenco = await projeto(t, { agentes: ['a', 'zeca', 'c'] });
  await rodar(foraDoElenco, 'iniciar', '--passos', '3');
  assert.equal(await rodar(foraDoElenco, 'passo', '--n', '2', '--agente', 'a'), OK, 'the agent of the step is not in the cast');
});

test('E4-05d: a step with no agent: — passo and checkpoint go without an agent', async (t) => {
  for (const evento of ['passo', 'checkpoint']) {
    const raiz = await projeto(t, { agentes: ['a', null, 'c'] });
    await rodar(raiz, 'iniciar', '--passos', '3');
    assert.equal(await rodar(raiz, evento, '--n', '2', '--agente', 'a'), DO_PASSO(2, 'nenhum'));
    assert.deepEqual(await status(raiz), { a: 'idle', b: 'idle', c: 'idle' });
    assert.equal(await rodar(raiz, evento, '--n', '2'), OK, 'nothing to correct');
  }
  const raiz = await projeto(t);
  await rodar(raiz, 'iniciar', '--passos', '3');
  assert.equal(await rodar(raiz, 'checkpoint', '--n', '3', '--agente', 'a'), DO_PASSO(3, 'c'));
  assert.equal((await status(raiz)).c, 'checkpoint');
});

test('E4-05e: the runner says that {id} comes from the agent: of the step', () => {
  const texto = readFileSync(path.join(CORE, 'runner', 'escritorio.md'), 'utf8').replace(/\s+/g, ' ');
  assert.ok(texto.includes("`{id}`: the step's `agent:` value (the same text as the agent's `id` column in `crew-party.csv`)"));
});
