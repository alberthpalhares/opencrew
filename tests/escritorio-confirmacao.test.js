// specs/fase-u7-f3c-escritorio-auto-open.md — U7F3C-07a.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { sondarPronto } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp } from './_helpers.js';

const RUN = '2026-11-12-120000';

async function projeto(t) {
  const raiz = await mkTmp('escritorio-confirmacao');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const pagina = path.join(raiz, '_opencrew', 'core', 'escritorio');
  const run = path.join(raiz, 'crews', 'teste', 'output', RUN);
  await fs.mkdir(pagina, { recursive: true });
  await fs.mkdir(run, { recursive: true });
  await fs.writeFile(path.join(pagina, 'index.html'), '<!doctype html><title>Escritório</title>');
  await fs.writeFile(path.join(run, 'estado-escritorio.json'), JSON.stringify({ crew: 'teste', runId: RUN }));
  return { raiz };
}

test('U7F3C-07a: confirmation requires HTTP 200 and exact project, version, crew, and run', async (t) => {
  const p = await projeto(t);
  const solicitudes = [];
  const solicitar = async (url) => {
    solicitudes.push(url);
    return url.endsWith('/')
      ? { status: 200, text: async () => '<!doctype html>' }
      : { status: 200, text: async () => JSON.stringify({
        projeto: projetoDe(p.raiz), versao: '', crews: [{ crew: 'teste', estado: { runId: RUN } }],
      }) };
  };
  const identidade = projetoDe(p.raiz);
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', RUN, 100, solicitar), true);
  assert.deepEqual(solicitudes.map((url) => new URL(url).pathname), ['/', '/estado']);
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', 'run-ausente', 100, solicitar), false);
  assert.equal(await sondarPronto(4747, identidade, '', undefined, undefined, 100, solicitar), true);
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', undefined, 100, solicitar), false);

  const paginaAusente = async (url) => url.endsWith('/')
    ? { status: 404, text: async () => 'Não encontrado' } : solicitar(url);
  const paginaNaoHtml = async (url) => url.endsWith('/')
    ? { status: 200, text: async () => 'serviço disponível' } : solicitar(url);
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', RUN, 100, paginaAusente), false);
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', RUN, 100, paginaNaoHtml), false);

  const divergente = (projetoCorpo, versao) => async (url) => url.endsWith('/') ? solicitar(url) : {
    status: 200,
    text: async () => JSON.stringify({ projeto: projetoCorpo, versao, crews: [{ crew: 'teste', estado: { runId: RUN } }] }),
  };
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', RUN, 100, divergente(identidade, 'anterior')), false);
  assert.equal(await sondarPronto(4747, identidade, '', 'teste', RUN, 100, divergente('outro-projeto', '')), false);

  const linhas = [];
  const resultado = await main(['--automatico', '--confirmar', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz, interfaces: {}, pronto: async () => true, sondar: async () => null, escrever: (linha) => linhas.push(linha),
  });
  assert.equal(resultado.url, `http://127.0.0.1:4747/?crew=teste&run_id=${RUN}`);
  let sondagens = 0;
  const demorou = await main(['--automatico', '--confirmar', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz, interfaces: {}, pronto: async () => ++sondagens === 3, sondar: async () => null,
    escrever() {}, auto: { esperar: async () => {} },
  });
  assert.equal(demorou.url, resultado.url);
  assert.equal(sondagens, 3);
  const ausente = await main(['--automatico', '--confirmar', '--porta', '4747', '--crew', 'teste', '--run', 'run-ausente'], {
    cwd: p.raiz, interfaces: {}, pronto: async () => false, sondar: async () => null, escrever: (linha) => linhas.push(linha),
  });
  assert.equal(ausente.url, undefined);
  assert.match(linhas.at(-1), /ESCRITORIO:INDISPONIVEL/);
  const ocupada = [];
  await main(['--automatico', '--confirmar', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz, interfaces: {}, pronto: async () => false,
    sondar: async () => ({ projeto: 'outro-projeto', versao: '1.21.1' }), escrever: (linha) => ocupada.push(linha),
  });
  assert.match(ocupada[0], /ESCRITORIO:PORTA_OCUPADA 4747/);
  const runDivergente = [];
  await main(['--automatico', '--confirmar', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz, interfaces: {}, pronto: async () => false,
    sondar: async () => ({ projeto: projetoDe(p.raiz), versao: '' }), escrever: (linha) => runDivergente.push(linha),
  });
  assert.match(runDivergente[0], /ESCRITORIO:INDISPONIVEL/);

  const falhaDeProntidao = [];
  const processosIniciados = [];
  const indisponivel = await main(['--automatico', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz, interfaces: {}, escrever: (linha) => falhaDeProntidao.push(linha),
    auto: {
      sondar: async (porta) => porta === 4747 ? ({ projeto: identidade, versao: '' }) : null,
      pronto: async () => false, ocupada: async (porta) => porta === 4747,
      spawn: () => {
        const processo = new EventEmitter();
        processo.unref = () => {};
        processosIniciados.push(processo);
        queueMicrotask(() => processo.emit('spawn'));
        return processo;
      },
      esperar: async () => {},
    },
  });
  assert.equal(indisponivel.code, 0);
  assert.equal(processosIniciados.length, 0, 'an existing compatible daemon is not duplicated after a failed readiness check');
  assert.match(falhaDeProntidao[0], /ESCRITORIO:INDISPONIVEL/);
});
