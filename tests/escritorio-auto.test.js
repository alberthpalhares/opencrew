// specs/fase-u7-f3c-escritorio-auto-open.md — U7F3C-02a to 02d and 03b.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { procurarAutomatico } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { abrirNoSistema } from '../templates/_opencrew/core/scripts/escritorio/navegador.mjs';
import { lerEstadoDaConsulta } from '../templates/_opencrew/core/scripts/escritorio/leitura.mjs';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp } from './_helpers.js';

const RUN = '2026-11-12-120000';
const ESTADO = (runId, agente, updatedAt) => ({
  crew: 'teste', runId, pedido: true, status: 'running', step: { current: 1, total: 2, label: 'Redação' },
  agents: [{ id: agente, name: agente, status: 'working' }], updatedAt,
});

async function projeto(t) {
  const raiz = await mkTmp('escritorio-auto');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const pasta = path.join(raiz, '_opencrew', 'core', 'escritorio');
  const runA = path.join(raiz, 'crews', 'teste', 'output', RUN);
  const runB = path.join(raiz, 'crews', 'teste', 'output', `${RUN}-2`);
  await fs.mkdir(pasta, { recursive: true });
  await fs.mkdir(runA, { recursive: true });
  await fs.mkdir(runB, { recursive: true });
  await fs.writeFile(path.join(pasta, 'index.html'), '<!doctype html><title>Escritório</title>');
  await fs.writeFile(path.join(runA, 'estado-escritorio.json'), JSON.stringify(ESTADO(RUN, 'a', '2026-11-12T12:00:00.000Z')));
  await fs.writeFile(path.join(runB, 'estado-escritorio.json'), JSON.stringify(ESTADO(`${RUN}-2`, 'b', '2026-11-12T12:01:00.000Z')));
  return { raiz, pasta, arquivos: ['index.html'], runA, runB };
}

test('U7F3C-03b: run URL selects only its execution and the overview shows the most recently updated run', async (t) => {
  const p = await projeto(t);
  const run = await lerEstadoDaConsulta(p.raiz, new URLSearchParams(`crew=teste&run_id=${RUN}`));
  assert.equal(run[0].estado.runId, RUN);
  assert.deepEqual(run[0].estado.agents.map((a) => a.id), ['a']);
  const overview = await lerEstadoDaConsulta(p.raiz, new URLSearchParams());
  assert.equal(overview[0].estado.runId, `${RUN}-2`);
  const invalida = await lerEstadoDaConsulta(p.raiz, new URLSearchParams('crew=teste&run_id=..'));
  assert.deepEqual(invalida, []);
});

test('U7F3C-02a: automatic lookup reuses a compatible server before choosing a free earlier port', async () => {
  const sondagens = [];
  const tentativas = [];
  const alvo = await procurarAutomatico({
    inicial: 4747,
    projeto: 'projeto-local',
    versao: '1.21.0',
    tentativas: 3,
    sondar: async (porta) => {
      sondagens.push(porta);
      return porta === 4748 ? { projeto: 'projeto-local', versao: '1.21.0' } : null;
    },
    ocupada: async () => false,
    tentarAbrir: async (porta) => { tentativas.push(porta); return true; },
  });
  assert.deepEqual([alvo.tipo, alvo.porta, sondagens, tentativas], ['ja-aberto', 4748, [4747, 4748], []]);
});

test('U7F3C-02b: automatic lookup skips occupied and old servers, then starts on the next free port', async () => {
  const abertas = [];
  const alvo = await procurarAutomatico({
    inicial: 4747,
    projeto: 'projeto-local',
    versao: '1.21.0',
    tentativas: 3,
    sondar: async (porta) => porta === 4747 ? { projeto: 'projeto-local', versao: '1.20.0' } : null,
    ocupada: async (porta) => porta < 4749,
    tentarAbrir: async (porta) => { abertas.push(porta); return true; },
  });
  assert.deepEqual([alvo.tipo, alvo.porta, abertas], ['aberto', 4749, [4749]]);
});

test('U7F3C-02d: external browser launch keeps URL usable and reports a launch failure', async () => {
  const chamadas = [];
  const spawn = (exe, args, opcoes) => {
    chamadas.push([exe, args, opcoes]);
    const processo = new EventEmitter();
    processo.unref = () => {};
    queueMicrotask(() => processo.emit('spawn'));
    return processo;
  };
  const ok = await abrirNoSistema('http://127.0.0.1:4747/?crew=teste&run_id=2026-11-12-120000', { spawn, plataforma: 'linux', ambiente: { DISPLAY: ':0' } });
  assert.equal(ok, true);
  assert.equal(chamadas[0][0], 'xdg-open');
  const semTela = await abrirNoSistema('http://127.0.0.1:4747/', { spawn, plataforma: 'linux', ambiente: {} });
  assert.equal(semTela, false);
});

test('U7F3C-02a: automatic mode starts in the background, confirms the server and returns the run URL', async (t) => {
  const p = await projeto(t);
  let iniciado = false;
  const linhas = [];
  const spawn = () => {
    const processo = new EventEmitter();
    processo.unref = () => {};
    queueMicrotask(() => { iniciado = true; processo.emit('spawn'); });
    return processo;
  };
  const sondar = async () => iniciado ? { projeto: projetoDe(p.raiz), versao: '' } : null;
  const resultado = await main(['--automatico', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz,
    escrever: (linha) => linhas.push(linha),
    auto: { sondar, ocupada: async () => false, spawn, esperar: async () => {} },
  });
  const url = `http://127.0.0.1:4747/?crew=teste&run_id=${RUN}`;
  assert.deepEqual([resultado.code, resultado.url, linhas], [0, url, [`ESCRITORIO:URL ${url}`]]);
});
