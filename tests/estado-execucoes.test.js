// specs/fase-u7-f3c-escritorio-auto-open.md — U7F3C-03a and 03c.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/estado.mjs';
import { mkTmp } from './_helpers.js';

const CSV = 'id,displayName,title,icon,path,execution\na,Ana,Pesquisadora,🔎,./agents/a.agent.md,inline\nb,Beto,Redator,✍️,./agents/b.agent.md,inline\nc,Caio,Revisor,✅,./agents/c.agent.md,inline\n';
const RUN_A = '2026-11-12-120000';
const RUN_B = '2026-11-12-120001';

async function projeto(t) {
  const raiz = await mkTmp('estado-execucoes');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const crew = path.join(raiz, 'crews', 'teste');
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await fs.mkdir(path.join(crew, 'output', RUN_A), { recursive: true });
  await fs.mkdir(path.join(crew, 'output', RUN_B), { recursive: true });
  await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), '- **Dashboard:** disabled\n');
  await fs.writeFile(path.join(crew, 'crew-party.csv'), CSV);
  return raiz;
}

async function rodar(raiz, run, evento, ...opcoes) {
  const linhas = [];
  const code = await main(['teste', evento, '--run', run, ...opcoes], { cwd: raiz, escrever: (s) => linhas.push(s) });
  return { code, linhas };
}

const arquivo = (raiz, run) => path.join(raiz, 'crews', 'teste', 'output', run, 'estado-escritorio.json');
const ler = async (raiz, run) => JSON.parse(await fs.readFile(arquivo(raiz, run), 'utf8'));

test('U7F3C-03a: simultaneous runs of one crew keep independent office state files', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual(await rodar(raiz, RUN_A, 'iniciar', '--passos', '3'), { code: 0, linhas: ['ESTADO:OK'] });
  assert.deepEqual(await rodar(raiz, RUN_B, 'iniciar', '--passos', '3'), { code: 0, linhas: ['ESTADO:OK'] });
  await rodar(raiz, RUN_A, 'passo', '--n', '1', '--agente', 'a');
  await rodar(raiz, RUN_B, 'passo', '--n', '1', '--agente', 'b');

  assert.deepEqual((await ler(raiz, RUN_A)).agents.map((a) => [a.id, a.status]), [['a', 'working'], ['b', 'idle'], ['c', 'idle']]);
  assert.deepEqual((await ler(raiz, RUN_B)).agents.map((a) => [a.id, a.status]), [['a', 'idle'], ['b', 'working'], ['c', 'idle']]);
  assert.equal((await fs.stat(path.join(raiz, 'crews', 'teste', 'state.json')).catch(() => null)), null);
});

test('U7F3C-03d: reopening the Office for a confirmed resume preserves the saved run state', async (t) => {
  const raiz = await projeto(t);
  await rodar(raiz, RUN_A, 'iniciar', '--passos', '3');
  await rodar(raiz, RUN_A, 'passo', '--n', '1', '--agente', 'a');
  const antes = await ler(raiz, RUN_A);

  assert.deepEqual(await rodar(raiz, RUN_A, 'iniciar', '--passos', '3'), { code: 0, linhas: ['ESTADO:OK'] });
  assert.deepEqual(await ler(raiz, RUN_A), antes);
});

test('U7F3C-03c: pedido events keep the explicitly selected worker and reviewer', async (t) => {
  const raiz = await projeto(t);
  const crew = path.join(raiz, 'crews', 'teste');
  await fs.mkdir(path.join(crew, 'pipeline', 'steps'), { recursive: true });
  await fs.writeFile(path.join(crew, 'pipeline', 'pipeline.yaml'), 'steps:\n  - step: 1\n    file: steps/step-01.md\n  - step: 2\n    file: steps/step-02.md\n  - step: 3\n    file: steps/step-03.md\n');
  await fs.writeFile(path.join(crew, 'pipeline', 'steps', 'step-01.md'), '---\nagent: b\n---\n');
  await fs.writeFile(path.join(crew, 'pipeline', 'steps', 'step-02.md'), '---\nagent: a\n---\n');
  await fs.writeFile(path.join(crew, 'pipeline', 'steps', 'step-03.md'), '---\nagent: c\n---\n');

  await main(['teste', 'iniciar', '--run', RUN_A, '--pedido', '--agente', 'a', '--passos', '3'], { cwd: raiz, escrever() {} });
  await rodar(raiz, RUN_A, 'passo', '--pedido', '--n', '1', '--agente', 'a');
  await rodar(raiz, RUN_A, 'passo', '--pedido', '--n', '2', '--agente', 'c');

  assert.deepEqual((await ler(raiz, RUN_A)).agents.map((a) => [a.id, a.status]), [['a', 'done'], ['b', 'idle'], ['c', 'working']]);
  assert.equal((await ler(raiz, RUN_A)).pedido, true);
});

test('U7F3C-03b: run ids cannot escape the crew output directory', async (t) => {
  const raiz = await projeto(t);
  const linhas = [];
  const code = await main(['teste', 'iniciar', '--run', '..', '--passos', '1'], { cwd: raiz, escrever: (s) => linhas.push(s) });
  assert.equal(code, 1);
  assert.match(linhas.join('\n'), /run_id|run id|execução/i);
  assert.equal(await fs.stat(path.join(raiz, 'crews', 'state.json')).catch(() => null), null);
});
