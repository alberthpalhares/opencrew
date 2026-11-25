// specs/fase-u7-f3c-escritorio-auto-open.md: U7F3C-08a, 08c, 08d and 08e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { main as estado } from '../templates/_opencrew/core/scripts/estado.mjs';
import { criarServidor } from '../templates/_opencrew/core/scripts/escritorio/servidor.mjs';
import { montarModelo } from '../templates/_opencrew/core/escritorio/modelo.js';
import { criarVigia, lerAtividade, prazoDeEncerramento } from '../templates/_opencrew/core/scripts/escritorio/vigia.mjs';
import { garantirServidor } from '../templates/_opencrew/core/scripts/escritorio/automatico.mjs';
import { abrir } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { procurarAutomatico } from '../templates/_opencrew/core/scripts/escritorio/procurar.mjs';
import { lerEstadoDaConsulta } from '../templates/_opencrew/core/scripts/escritorio/leitura.mjs';
import { mkTmp } from './_helpers.js';

const RUN = '2026-11-22-120000';
const AGORA = Date.parse('2026-11-22T12:10:00.000Z');
const SCRIPT = fileURLToPath(new URL('../templates/_opencrew/core/scripts/escritorio.mjs', import.meta.url));

test('U7F3C-09a: if the child exits before readiness, the next port can open', async () => {
  const tentadas = [];
  const resultado = await garantirServidor({
    raiz: '.', script: SCRIPT, inicial: 4747, projeto: 'p', versao: 'v', tentativas: 2,
    ocupada: async () => false,
    sondar: async (porta) => porta === tentadas[1] ? { projeto: 'p', versao: 'v' } : null,
    pronto: async () => true, esperar: async () => {}, ciclos: 2,
    spawn: (_node, args) => {
      const porta = Number(args.at(-1));
      tentadas.push(porta);
      const filho = new EventEmitter();
      filho.unref = () => {};
      queueMicrotask(() => {
        filho.emit('spawn');
        if (porta === 4747) filho.emit('exit', 1);
      });
      return filho;
    },
  });
  assert.equal(resultado.porta, 4748);
  assert.deepEqual(tentadas, [4747, 4748]);
});

test('U7F3C-09a: preparing an automatic daemon skips a manual server and a reserved port', async () => {
  const tentadas = [];
  const resultado = await garantirServidor({
    raiz: '.', script: SCRIPT, inicial: 4747, projeto: 'p', versao: 'v', preparar: true,
    sondar: async (porta) => porta === 4747 ? { projeto: 'p', versao: 'v', modo: 'manual' } : null,
    pronto: async () => true, ocupada: async () => false, esperar: async () => {},
    testarBind: async (porta) => { tentadas.push(porta); return porta === 4749; },
  });
  assert.deepEqual([resultado.tipo, resultado.porta], ['daemon', 4749]);
  assert.deepEqual(tentadas, [4748, 4749]);
});

async function esperarPagina(porta, processo) {
  const limite = Date.now() + 5000;
  while (Date.now() < limite) {
    if (processo.exitCode !== null) throw new Error(`servidor terminou com ${processo.exitCode}`);
    let resposta;
    try {
      resposta = await fetch(`http://127.0.0.1:${porta}/`, { signal: AbortSignal.timeout(200) });
      await resposta.arrayBuffer();
    } catch { resposta = null; }
    if (resposta?.status === 200) return;
    await new Promise((resolver) => setTimeout(resolver, 50));
  }
  throw new Error('servidor não respondeu em 5 s');
}

async function encerrarProcesso(processo) {
  if (processo.exitCode !== null || processo.signalCode !== null) return;
  // `subir()` unrefs the detached daemon. Re-ref it so Node keeps the test alive for its exit event.
  processo.ref();
  const finalizado = once(processo, 'exit');
  processo.kill('SIGKILL');
  await finalizado;
}

test('U7F3C-08d: a checkpoint with no event for 21 minutes displays its saved state and a stale signal', () => {
  const estado = {
    crew: 'teste', status: 'checkpoint', updatedAt: '2026-11-22T11:49:00.000Z',
    step: { current: 2, total: 4, label: 'Revisão' },
    agents: [{ id: 'a', name: 'Ana', icon: '', status: 'checkpoint', label: '' }],
  };
  const modelo = montarModelo(estado, { agoraMs: AGORA });
  assert.deepEqual([modelo.execucao, modelo.parada, modelo.agentes[0].acao], ['checkpoint', 'Última atualização há 21 min', 'sem-sinal']);
  assert.equal(estado.status, 'checkpoint');
});

async function preparar(t, status = 'aberta', comEstado = true) {
  const raiz = await mkTmp('escritorio-ciclo');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'), { recursive: true });
  const pasta = path.join(raiz, 'crews', 'teste', 'output', RUN);
  await fs.mkdir(pasta, { recursive: true });
  await fs.writeFile(path.join(pasta, 'execucao.json'), JSON.stringify({
    crew: 'teste', run: RUN, status, iniciadaEm: '2026-11-22T12:00:00.000Z',
    fechadaEm: status === 'aberta' ? undefined : '2026-11-22T12:09:00.000Z',
    passosPrevistos: 4, passos: [{ n: 2, em: '2026-11-22T12:08:00.000Z' }], marcos: [], saida: '',
  }));
  if (comEstado) await fs.writeFile(path.join(pasta, 'estado-escritorio.json'), JSON.stringify({
    crew: 'teste', runId: RUN, status: 'running', step: { current: 2, total: 4, label: 'Revisão' },
    agents: [{ id: 'a', name: 'Ana', icon: '', status: 'working', label: '' }], updatedAt: '2026-11-22T12:08:00.000Z',
  }));
  return raiz;
}

test('U7F3C-08a: exact run never falls back and a closed registry wins without visual state', async (t) => {
  const raiz = await preparar(t, 'publicada', false);
  const exato = await lerEstadoDaConsulta(raiz, new URLSearchParams(`crew=teste&run_id=${RUN}`));
  assert.deepEqual([exato[0].estado.runId, exato[0].estado.status, exato[0].estado.updatedAt], [RUN, 'completed', '2026-11-22T12:09:00.000Z']);
  assert.deepEqual(await lerEstadoDaConsulta(raiz, new URLSearchParams('crew=teste&run_id=ausente')), []);
});

test('U7F3C-08a: an open registry supplies a waiting state without copying another visual state', async (t) => {
  const raiz = await preparar(t, 'aberta', false);
  const exato = await lerEstadoDaConsulta(raiz, new URLSearchParams(`crew=teste&run_id=${RUN}`));
  assert.deepEqual([exato[0].estado.runId, exato[0].estado.step.current, exato[0].estado.step.label], [RUN, 2, 'Aguardando atualização desta execução']);
});

test('U7F3C-08a: rejected and aborted records override stale working agents', async (t) => {
  const raiz = await preparar(t, 'abortada', true);
  const exato = await lerEstadoDaConsulta(raiz, new URLSearchParams(`crew=teste&run_id=${RUN}`));
  assert.deepEqual([exato[0].estado.status, exato[0].estado.agents[0].status], ['failed', 'failed']);
});

test('U7F3C-09b: old history leaves the full idle period and malformed entries do not stop reading', async (t) => {
  const raiz = await preparar(t, 'publicada', false);
  const arquivo = path.join(raiz, 'crews', 'teste', 'output', RUN, 'execucao.json');
  const registro = JSON.parse(await fs.readFile(arquivo, 'utf8'));
  await fs.writeFile(arquivo, JSON.stringify({ ...registro, passos: [null], marcos: {} }));
  const fim = AGORA - 600_000;
  const [atividade] = await lerAtividade(raiz);
  assert.equal(atividade.status, 'publicada');
  assert.equal(prazoDeEncerramento([{ status: 'publicada', fechadaEm: fim }], AGORA, AGORA), AGORA + 120_000);
  const [exato] = await lerEstadoDaConsulta(raiz, new URLSearchParams({ crew: 'teste', run_id: RUN }));
  assert.equal(exato.estado.status, 'completed');
});

test('U7F3C-09d: ending one session leaves a second run alive and a stale notification cannot end a new session', async (t) => {
  const raiz = await preparar(t);
  const outro = `${RUN}-2`;
  const dir = path.join(raiz, 'crews', 'teste', 'output');
  await fs.cp(path.join(dir, RUN), path.join(dir, outro), { recursive: true });
  const visual = path.join(dir, outro, 'estado-escritorio.json');
  await fs.writeFile(visual, JSON.stringify({ runId: outro, agents: [] }));
  const rodar = async (run, evento, sessao) => {
    const linhas = [];
    await estado(['teste', evento, '--run', run, '--sessao', sessao], {
      cwd: raiz, agora: () => new Date(AGORA).toISOString(), escrever: (s) => linhas.push(s),
    });
    return linhas.at(-1);
  };
  assert.equal(await rodar(RUN, 'iniciar', 'sessao-1'), 'ESTADO:OK');
  assert.equal(await rodar(outro, 'iniciar', 'sessao-2'), 'ESTADO:OK');
  assert.equal(await rodar(RUN, 'desvincular', 'sessao-1'), 'ESTADO:OK');
  const regs = await lerAtividade(raiz);
  assert.deepEqual(regs.map((r) => r.status).sort(), ['aberta', 'desvinculada']);
  assert.equal(prazoDeEncerramento(regs, AGORA, AGORA), null);
  const [visto] = await lerEstadoDaConsulta(raiz, new URLSearchParams({ crew: 'teste', run_id: RUN }));
  assert.equal(visto.estado.semVinculo, true);
  assert.equal(visto.estado.sessao, undefined);
  assert.equal(await rodar(RUN, 'iniciar', 'sessao-3'), 'ESTADO:OK');
  assert.match(await rodar(RUN, 'desvincular', 'sessao-1'), /^ESTADO:IGNORADO/);
  const registro = JSON.parse(await fs.readFile(path.join(dir, RUN, 'execucao.json'), 'utf8'));
  assert.equal(registro.status, 'aberta');
});

test('U7F3C-09e: disabling the Office protects new runs on a still-listening automatic server', async (t) => {
  const raiz = await preparar(t, 'aberta', false);
  const memoria = path.join(raiz, '_opencrew', '_memory');
  await fs.mkdir(memoria);
  await fs.writeFile(path.join(memoria, 'preferences.md'), 'Dashboard: off\n');
  assert.deepEqual(await lerAtividade(raiz), []);
  const servidor = criarServidor({ raiz, pasta: raiz, arquivos: [], modo: 'automatico' });
  await abrir(servidor, 0);
  t.after(() => new Promise((resolver) => { servidor.close(resolver); servidor.closeAllConnections?.(); }));
  const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}/estado`);
  assert.deepEqual((await resposta.json()).crews, []);
  assert.equal((await lerEstadoDaConsulta(raiz, new URLSearchParams({ crew: 'teste' }))).length, 1, 'manual history includes the record');
});

test('U7F3C-09e: a corrupt visual file stays intact and the run record supplies a waiting page', async (t) => {
  const raiz = await preparar(t);
  const arquivo = path.join(raiz, 'crews', 'teste', 'output', RUN, 'estado-escritorio.json');
  const quebrado = '{"agents":';
  await fs.writeFile(arquivo, quebrado);
  const linhas = [];
  await estado(['teste', 'iniciar', '--run', RUN], { cwd: raiz, escrever: (s) => linhas.push(s) });
  assert.match(linhas.at(-1), /^ESTADO:PARCIAL/);
  assert.equal(await fs.readFile(arquivo, 'utf8'), quebrado);
  const [visto] = await lerEstadoDaConsulta(raiz, new URLSearchParams({ crew: 'teste', run_id: RUN }));
  assert.equal(visto.estado.step.label, 'Aguardando atualização desta execução');
});

test('U7F3C-10e: a blocked run read returns 503 and never authorizes automatic shutdown', async (t) => {
  const raiz = await preparar(t);
  const registro = path.resolve(raiz, 'crews', 'teste', 'output', RUN, 'execucao.json');
  const lerOriginal = fs.readFile;
  fs.readFile = async (arquivo, ...args) => {
    if (path.resolve(String(arquivo)) === registro) throw Object.assign(new Error('blocked'), { code: 'EACCES' });
    return lerOriginal.call(fs, arquivo, ...args);
  };
  const servidor = criarServidor({ raiz, pasta: raiz, arquivos: [], modo: 'automatico' });
  await abrir(servidor, 0);
  const vigia = criarVigia({ raiz, servidor, agora: () => AGORA, agendar: () => 1, cancelar() {} });
  t.after(() => {
    fs.readFile = lerOriginal;
    vigia.parar();
    return new Promise((resolver) => { servidor.closeAllConnections?.(); servidor.close(resolver); });
  });

  const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}/estado?crew=teste&run_id=${RUN}`);
  assert.equal(resposta.status, 503);
  assert.equal(await vigia.verificar(), false);
  assert.equal(servidor.listening, true);
});

test('U7F3C-08c/08d: auto server deadline includes final view and two-hour run expiry', () => {
  assert.equal(prazoDeEncerramento([], AGORA, AGORA), AGORA + 120_000);
  assert.equal(prazoDeEncerramento([{ status: 'aprovada', fechadaEm: AGORA }], AGORA, AGORA - 1_000), AGORA + 120_000);
  assert.equal(prazoDeEncerramento([{ status: 'aberta', atividadeEm: AGORA - 1000 }], AGORA, AGORA), null);
  const stale = AGORA - 2 * 60 * 60 * 1000;
  assert.equal(prazoDeEncerramento([{ status: 'aberta', atividadeEm: stale }], AGORA, AGORA), AGORA + 120_000);
  assert.equal(prazoDeEncerramento([{ status: 'aberta', atividadeEm: null }], AGORA + 2 * 60 * 60 * 1000 - 1, AGORA), null);
  assert.equal(prazoDeEncerramento([{ status: 'aberta', atividadeEm: null }], AGORA + 2 * 60 * 60 * 1000, AGORA), AGORA + 2 * 60 * 60 * 1000 + 120_000);
});

test('U7F3C-08e: an occupied port is rechecked and a compatible competing server is reused', async () => {
  let sondagens = 0;
  const achado = await procurarAutomatico({
    inicial: 4747, projeto: 'local', versao: '1.22.0', tentativas: 1,
    sondar: async () => (++sondagens > 1 ? { projeto: 'local', versao: '1.22.0' } : null),
    ocupada: async () => true, esperar: async () => {},
    tentarAbrir: async () => assert.fail('should reuse the server that won the race'),
  });
  assert.equal(achado.tipo, 'ja-aberto');
});

test('U7F3C-08c: automatic server releases its real HTTP port after the idle deadline', async (t) => {
  const raiz = await preparar(t, 'publicada', false);
  const reserva = net.createServer();
  await new Promise((resolve, reject) => reserva.once('error', reject).listen(0, '127.0.0.1', resolve));
  const porta = reserva.address().port;
  await new Promise((resolve) => reserva.close(resolve));
  let agora = Date.now();
  let tick;
  const resultado = await main(['--servidor', '--automatico-servidor', '--porta', String(porta)], {
    cwd: raiz, vigia: { agora: () => agora, agendar: (callback) => { tick = callback; return 1; }, cancelar() {}, ler: async () => [] },
  });
  const servidor = resultado.servidor;
  t.after(() => new Promise((resolve) => { servidor.closeAllConnections?.(); servidor.close(resolve); }));
  const pagina = await fetch(`http://127.0.0.1:${porta}/`);
  assert.equal(pagina.status, 200);
  const fechado = new Promise((resolve) => servidor.once('close', resolve));
  agora += 120_001;
  await tick();
  await fechado;
  await assert.rejects(fetch(`http://127.0.0.1:${porta}/`));
  const reaberto = await new Promise((resolve, reject) => {
    const teste = http.createServer();
    teste.once('error', reject).listen(porta, '127.0.0.1', () => teste.close(() => resolve(true)));
  });
  assert.equal(reaberto, true);
});

test('U7F3C-08c: a termination signal closes the automatic server and releases its port', async (t) => {
  const raiz = await preparar(t, 'publicada', false);
  const reserva = net.createServer();
  await new Promise((resolve, reject) => reserva.once('error', reject).listen(0, '127.0.0.1', resolve));
  const porta = reserva.address().port;
  await new Promise((resolve) => reserva.close(resolve));
  const resultado = await main(['--servidor', '--automatico-servidor', '--porta', String(porta)], {
    cwd: raiz, vigia: { agendar: () => 1, cancelar() {}, ler: async () => [] },
  });
  const servidor = resultado.servidor;
  t.after(() => new Promise((resolve) => { servidor.closeAllConnections?.(); servidor.close(resolve); }));
  const fechado = new Promise((resolve) => servidor.once('close', resolve));
  process.emit('SIGTERM');
  await fechado;
  const reaberto = await new Promise((resolve, reject) => {
    const teste = http.createServer();
    teste.once('error', reject).listen(porta, '127.0.0.1', () => teste.close(() => resolve(true)));
  });
  assert.equal(reaberto, true);
});

test('U7F3C-08c: after a force-killed server, the next automatic launch reopens the exact run', async (t) => {
  const raiz = await preparar(t, 'publicada', false);
  const reserva = net.createServer();
  await new Promise((resolve, reject) => reserva.once('error', reject).listen(0, '127.0.0.1', resolve));
  const porta = reserva.address().port;
  await new Promise((resolve) => reserva.close(resolve));
  let antigo;
  let novo;
  try {
    antigo = spawn(process.execPath, [SCRIPT, '--servidor', '--porta', String(porta)], {
      cwd: raiz, stdio: 'ignore', windowsHide: true,
    });
    await esperarPagina(porta, antigo);
    await encerrarProcesso(antigo);
    await assert.rejects(fetch(`http://127.0.0.1:${porta}/`, { signal: AbortSignal.timeout(200) }));

    const resultado = await main(['--automatico', '--porta', String(porta), '--crew', 'teste', '--run', RUN], {
      cwd: raiz, escrever() {}, auto: { spawn: (...args) => (novo = spawn(...args)) },
    });
    assert.equal(resultado.code, 0);
    assert.equal(resultado.porta, porta);
    assert.match(resultado.url, new RegExp(`run_id=${RUN}$`));
    await esperarPagina(porta, novo);
  } finally {
    await Promise.all([antigo, novo].filter(Boolean).map(encerrarProcesso));
  }
});
