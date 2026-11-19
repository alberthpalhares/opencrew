// specs/fase-u7-f3c-escritorio-auto-open.md — U7F3C-02a to 02d and 03b.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { alguemEscuta, procurarAutomatico } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
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
  let opcoesSpawn;
  let desanexado = false;
  const linhas = [];
  const spawn = (exe, args, opcoes) => {
    const processo = new EventEmitter();
    processo.unref = () => { desanexado = true; };
    opcoesSpawn = { exe, args, opcoes };
    queueMicrotask(() => { iniciado = true; processo.emit('spawn'); });
    return processo;
  };
  const sondar = async () => iniciado ? { projeto: projetoDe(p.raiz), versao: '' } : null;
  const resultado = await main(['--automatico', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz,
    interfaces: {},
    escrever: (linha) => linhas.push(linha),
    auto: { sondar, pronto: async () => true, ocupada: async () => false, spawn, esperar: async () => {} },
  });
  const url = `http://127.0.0.1:4747/?crew=teste&run_id=${RUN}`;
  assert.deepEqual([resultado.code, resultado.url, linhas], [0, url, [`ESCRITORIO:URL ${url}`]]);
  assert.equal(desanexado, true);
  assert.equal(opcoesSpawn.exe, process.execPath);
  assert.deepEqual(opcoesSpawn.args.slice(-3), ['--servidor', '--porta', '4747']);
  assert.deepEqual(opcoesSpawn.opcoes, {
    cwd: p.raiz, detached: true, stdio: 'ignore', windowsHide: true, shell: false,
  });
});

test('U7F3C-06a/07b: --preparar confirms or returns a daemon, which keeps serving after startup returns; port conflict is reported', async (t) => {
  const p = await projeto(t);
  const url = `http://127.0.0.1:4748/?crew=teste&run_id=${RUN}`;
  const preparaLivre = [];
  const resDaemon = await main(['--automatico', '--preparar', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz,
    interfaces: {},
    escrever: (linha) => preparaLivre.push(linha),
    auto: { sondar: async () => null, ocupada: async (porta) => porta === 4747 },
  });
  assert.deepEqual([resDaemon.code, resDaemon.url, preparaLivre], [0, url, [`ESCRITORIO:DAEMON 4748 ${url}`]]);

  const preparaVivo = [];
  const resVivo = await main(['--automatico', '--preparar', '--porta', '4747', '--crew', 'teste', '--run', RUN], {
    cwd: p.raiz,
    interfaces: {},
    escrever: (linha) => preparaVivo.push(linha),
    auto: { sondar: async (porta) => (porta === 4748 ? { projeto: projetoDe(p.raiz), versao: '' } : null), pronto: async () => true, ocupada: async () => false },
  });
  assert.deepEqual([resVivo.code, resVivo.url, preparaVivo], [0, url, [`ESCRITORIO:URL ${url}`]]);

  const cmds = [];
  const spawn = (exe, args, opcoes) => {
    cmds.push([exe, args, opcoes]);
    const processo = new EventEmitter();
    processo.unref = () => {};
    queueMicrotask(() => processo.emit('spawn'));
    return processo;
  };
  assert.equal(await abrirNoSistema(url, { spawn, plataforma: 'win32', ambiente: {} }), true);
  assert.equal(cmds[0][0], 'powershell.exe');
  assert.equal(cmds[0][1].at(-1), url);
  assert.equal(cmds[0][2].shell, false);

  const reserva = net.createServer();
  await new Promise((resolve, reject) => reserva.once('error', reject).listen(0, '127.0.0.1', resolve));
  const porta = reserva.address().port;
  await new Promise((resolve) => reserva.close(resolve));
  const servidor = await main(['--servidor', '--porta', String(porta)], { cwd: p.raiz });
  const srv = servidor.servidor;
  assert.equal(servidor.code, 0);
  assert.ok(srv.keepAliveTimeout >= 65000 && srv.headersTimeout > srv.keepAliveTimeout, 'keepAlive prevents 5s WebView polling resets');
  t.after(() => new Promise((ok) => { srv.closeAllConnections?.(); srv.close(() => ok()); }));
  const conflito = [];
  const resConflito = await main(['--servidor', '--porta', String(porta)], {
    cwd: p.raiz, escrever: (linha) => conflito.push(linha),
  });
  assert.deepEqual([resConflito.code, conflito], [1, [`ESCRITORIO:PORTA_OCUPADA ${porta}`]]);
  const estadoReal = await fetch(`http://127.0.0.1:${porta}/estado?crew=teste&run_id=${RUN}`).then((r) => r.json());
  const paginaReal = await fetch(`http://127.0.0.1:${porta}/`).then(async (r) => [r.status, await r.text()]);
  assert.equal(paginaReal[0], 200);
  assert.ok(paginaReal[1].includes('<'));
  assert.equal(estadoReal.projeto, projetoDe(p.raiz));
  assert.equal(estadoReal.versao, '');
  assert.equal(estadoReal.crews?.[0]?.estado?.runId, RUN);
  const ask = (rota) => new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: porta, path: rota, agent: false }, (r) => {
      let b = '';
      r.on('data', (d) => { b += d; }).on('end', () => res({ status: r.statusCode, headers: r.headers, body: b }));
    }).on('error', rej);
  });
  assert.equal((await ask('/favicon.ico')).status, 204);
  for (const r of ['/escritorio', '/dashboard', '/escritorio?crew=teste']) {
    const resp = await ask(r);
    assert.equal(resp.status, 200, r);
    assert.match(resp.body, /Escritório/);
  }

  const ipv6 = net.createServer();
  const ouvindo = await new Promise((r) => { ipv6.once('error', () => r(false)); ipv6.listen(0, '::1', () => r(true)); });
  if (ouvindo) {
    t.after(() => new Promise((ok) => ipv6.close(() => ok())));
    assert.equal(await alguemEscuta(ipv6.address().port, 300), true);
  }
});

test('U7F3C-06b: /estado falls back cleanly on truncated ?crew, trailing chat punctuation, or missing run file, while keeping traversal blocked', async (t) => {
  const p = await projeto(t);
  const semRun = await lerEstadoDaConsulta(p.raiz, new URLSearchParams('crew=teste'));
  assert.equal(semRun[0]?.estado.runId, `${RUN}-2`);
  const pontuado = await lerEstadoDaConsulta(p.raiz, new URLSearchParams(`crew=teste&run_id=${RUN}.`));
  assert.equal(pontuado[0]?.estado.runId, RUN);
  const ausente = await lerEstadoDaConsulta(p.raiz, new URLSearchParams('crew=teste&run_id=2026-11-12-999999'));
  assert.equal(ausente[0]?.estado.runId, `${RUN}-2`);
  assert.deepEqual(await lerEstadoDaConsulta(p.raiz, new URLSearchParams('crew=teste&run_id=..')), []);
  assert.deepEqual(await lerEstadoDaConsulta(p.raiz, new URLSearchParams('crew=..&run_id=1')), []);
});

test('E6-01b: automatic mode emits LAN and VPN URLs alongside the local URL', async (t) => {
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
    interfaces: {
      'Wi-Fi': [{ family: 'IPv4', address: '192.168.3.13', internal: false }],
      Tailscale: [{ family: 'IPv4', address: '100.88.12.34', internal: false }],
    },
    escrever: (linha) => linhas.push(linha),
    auto: { sondar, pronto: async () => true, ocupada: async () => false, spawn, esperar: async () => {} },
  });
  assert.equal(resultado.code, 0);
  assert.deepEqual(linhas, [
    `ESCRITORIO:URL http://127.0.0.1:4747/?crew=teste&run_id=${RUN}`,
    `ESCRITORIO:URL_REDE http://192.168.3.13:4747/?crew=teste&run_id=${RUN}`,
    `ESCRITORIO:URL_VPN http://100.88.12.34:4747/?crew=teste&run_id=${RUN}`,
  ]);
});
