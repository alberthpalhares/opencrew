// specs/fase-e1-escritorio-ao-vivo.md — E1-04: the office server (rules 13 to 15). Read-only and
// local-only, closed routes, /estado read again on every request, and the search for a port.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readdirSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { main, ARQUIVOS } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { criarServidor } from '../templates/_opencrew/core/scripts/escritorio/servidor.mjs';
import { abrir, sondar } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { idDoProjeto, projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp, snapshot } from './_helpers.js';

const CORE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core');
const PAGINA = { 'index.html': '<!doctype html><title>Escritório</title>\n', 'modelo.js': 'export const x = 1;\n', 'estilo.css': 'body { margin: 0 }\n' };
const SEGREDO = 'conteúdo-que-não-pode-sair';
const CABECALHOS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'" };
const ABERTO = (porta) => `Escritório aberto em http://127.0.0.1:${porta} — Ctrl+C para fechar`;
const SEM_PORTA = (a, b) => `Não foi possível abrir o escritório: as portas ${a} a ${b} estão ocupadas. Use --porta.`;
const FORA_DA_RAIZ = 'Rode este comando na pasta do projeto (a que contém _opencrew/).';
const HORA = (h) => `2026-10-05T${h}:00:00.000Z`;
const estado = (updatedAt, extra = {}) => JSON.stringify({ crew: 'c', status: 'running', agents: [{ id: 'a', name: 'Ana', status: 'working' }], updatedAt, ...extra });
const fechar = (servidor) => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); });

// A fake installed project: `_opencrew/`, the page folder, a secret wherever a careless join of the
// requested path would reach, and one `crews/<name>/state.json` per entry (raw text; null: no file).
async function projeto(t, crews = {}) {
  const raiz = await mkTmp('escritorio');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const pasta = path.join(raiz, '_opencrew', 'core', 'escritorio');
  await fs.mkdir(pasta, { recursive: true });
  for (const [nome, texto] of Object.entries(PAGINA)) await fs.writeFile(path.join(pasta, nome), texto);
  for (const alvo of [[pasta, 'segredo.txt'], [pasta, '..', 'segredo'], [pasta, '..', '..', 'package.json'], [raiz, 'package.json']]) await fs.writeFile(path.join(...alvo), SEGREDO);
  for (const [nome, texto] of Object.entries(crews)) {
    await fs.mkdir(path.join(raiz, 'crews', nome), { recursive: true });
    if (texto != null) await fs.writeFile(path.join(raiz, 'crews', nome, 'state.json'), texto);
  }
  return { raiz, pasta, arquivos: Object.keys(PAGINA) };
}

/** The server of a fake project, opened by the production code on a free port. */
async function subir(t, crews) {
  const p = await projeto(t, crews);
  const servidor = criarServidor(p);
  t.after(() => fechar(servidor));
  assert.equal(await abrir(servidor, 0), true);
  return { ...p, porta: servidor.address().port };
}

/** One raw request: the path goes as written (no URL clean-up); `Host` can be forged or left out. */
function pedir(porta, caminho, { metodo = 'GET', setHost = true, ...headers } = {}) {
  return new Promise((resolve, reject) => {
    const pedido = http.request({ host: '127.0.0.1', port: porta, path: caminho, method: metodo, agent: false, setHost, headers }, (res) => {
      let corpo = '';
      res.setEncoding('utf8').on('data', (parte) => { corpo += parte; }).on('end', () => resolve({ status: res.statusCode, headers: res.headers, corpo }));
    });
    pedido.on('error', reject).end();
  });
}

/** Runs the command line in `raiz`; the server it opens, if any, is closed when the test ends. */
async function rodar(t, raiz, argv = [], injetados = {}) {
  const linhas = [];
  const r = await main(argv, { cwd: raiz, escrever: (s) => linhas.push(s), ...injetados });
  if (r.servidor) t.after(() => fechar(r.servidor));
  return { ...r, linhas };
}

/** Holds a port with `servidor`, leaving room for the nine ports after it. */
async function segurar(t, servidor) {
  const conexoes = new Set();
  servidor.on('connection', (c) => conexoes.add(c.on('error', () => {})));
  t.after(() => { for (const c of conexoes) c.destroy(); return new Promise((ok) => servidor.close(() => ok())); });
  do {
    if (servidor.listening) await new Promise((ok) => servidor.close(ok));
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  } while (servidor.address().port > 65000);
  return servidor.address().port;
}

/** A port that was free a moment ago. */
async function portaLivre(t) {
  const servidor = net.createServer();
  const porta = await segurar(t, servidor);
  return new Promise((ok) => servidor.close(() => ok(String(porta))));
}

test('E1-04a: /estado brings the project id and every crew, the latest update first, and writes nothing', async (t) => {
  const nova = estado(HORA(11), { desk: 2 });
  const { raiz, porta } = await subir(t, { antiga: estado(HORA(10)), nova });
  const antes = await snapshot(raiz);
  const r = await pedir(porta, '/estado');
  assert.deepEqual([r.status, r.headers['content-type']], [200, 'application/json; charset=utf-8']);
  const { projeto: id, crews, ...resto } = JSON.parse(r.corpo);
  assert.deepEqual(resto, {});
  assert.match(id, /^[0-9a-f]{12}$/);
  assert.equal(id, projetoDe(raiz));
  assert.ok(!r.corpo.includes(path.basename(raiz)), 'the path of the project is not exposed');
  assert.deepEqual(crews.map((c) => c.crew), ['nova', 'antiga']);
  assert.deepEqual(crews[0].estado, JSON.parse(nova));
  assert.deepEqual(await snapshot(raiz), antes);
  // Rule 15: the files are read again on every request.
  await fs.writeFile(path.join(raiz, 'crews', 'antiga', 'state.json'), estado(HORA(12)));
  assert.deepEqual(JSON.parse((await pedir(porta, '/estado')).corpo).crews.map((c) => c.crew), ['antiga', 'nova']);
});

test('E1-04b: a state file cut in half, or without a list of agents, leaves only that crew out — never an error', async (t) => {
  const [inteiro, comMarca] = [estado(HORA(10)), String.fromCharCode(0xfeff) + estado(HORA(11))]; // a byte-order mark is still readable
  const ruins = { cortado: inteiro.slice(0, 40), vazio: '', nulo: 'null', lista: '[]', 'sem-agentes': '{"status":"running"}', 'agentes-texto': '{"agents":"a"}', 'sem-arquivo': null };
  const { raiz, porta } = await subir(t, { ...ruins, valida: inteiro, 'com-marca': comMarca });
  await fs.mkdir(path.join(raiz, 'crews', 'pasta', 'state.json'), { recursive: true }); // a folder where the file should be
  await fs.writeFile(path.join(raiz, 'crews', 'solto.txt'), 'x');
  const r = await pedir(porta, '/estado');
  const esperado = [{ crew: 'com-marca', estado: JSON.parse(estado(HORA(11))) }, { crew: 'valida', estado: JSON.parse(inteiro) }];
  assert.deepEqual([r.status, JSON.parse(r.corpo).crews], [200, esperado]);
});

test('E1-04b: no crew with a state, or no crews/ folder at all — "crews": []', async (t) => {
  for (const crews of [{ 'sem-arquivo': null }, {}]) {
    const { raiz, porta } = await subir(t, crews);
    const r = await pedir(porta, '/estado');
    assert.deepEqual([r.status, JSON.parse(r.corpo)], [200, { projeto: projetoDe(raiz), crews: [] }]);
  }
});

test('E1-04c: / and /?demo give the page; /modelo.js gives the module as JavaScript', async (t) => {
  const { porta } = await subir(t);
  for (const [caminho, arquivo, tipo] of [
    ['/', 'index.html', 'text/html'], ['/?demo', 'index.html', 'text/html'], ['/index.html', 'index.html', 'text/html'],
    ['/modelo.js', 'modelo.js', 'text/javascript'], ['/modelo.js?v=2', 'modelo.js', 'text/javascript'], ['/estilo.css', 'estilo.css', 'text/css'],
  ]) {
    const r = await pedir(porta, caminho);
    assert.deepEqual([r.status, r.headers['content-type'], r.corpo], [200, `${tipo}; charset=utf-8`, PAGINA[arquivo]], caminho);
  }
});

test('E1-04c: run as a process in an installed project, the script finds the page folder next to it', async (t) => {
  const { raiz } = await projeto(t);
  const destino = path.join(raiz, '_opencrew', 'core', 'scripts');
  await fs.mkdir(path.join(destino, 'escritorio'), { recursive: true });
  const modulos = (await fs.readdir(path.join(CORE, 'scripts', 'escritorio'))).map((m) => `escritorio/${m}`);
  for (const f of ['comum.mjs', 'escritorio.mjs', ...modulos]) await fs.copyFile(path.join(CORE, 'scripts', f), path.join(destino, f));
  const filho = spawn(process.execPath, ['_opencrew/core/scripts/escritorio.mjs', '--porta', await portaLivre(t)], { cwd: raiz });
  const saiu = new Promise((ok) => filho.once('exit', ok));
  try {
    const saida = await new Promise((ok) => {
      let texto = '';
      filho.stdout.setEncoding('utf8').on('data', (parte) => { texto += parte; if (texto.includes('\n')) ok(texto); });
      saiu.then(() => ok(texto));
    });
    const porta = Number(saida.match(/^Escritório aberto em http:\/\/127\.0\.0\.1:(\d+) — Ctrl\+C para fechar\r?\n$/)?.[1]);
    assert.ok(porta, `first line: ${JSON.stringify(saida)}`);
    assert.equal((await pedir(porta, '/')).corpo, PAGINA['index.html']);
  } finally {
    filho.kill();
    await saiu;
  }
});

test('E1-04d: a path that is not on the list is 404, wherever it points; a method other than GET is 405', async (t) => {
  const { porta } = await subir(t, { x: estado(HORA(10)) });
  for (const caminho of ['/../../package.json', '/%2e%2e/segredo', '/crews/x/state.json', '/../../../package.json', '/segredo.txt', '/index.html/', '/estado/', '//estado']) {
    const r = await pedir(porta, caminho);
    assert.equal(r.status, 404, caminho);
    assert.ok(!r.corpo.includes(SEGREDO) && !r.corpo.includes('agents'), caminho);
  }
  for (const [metodo, caminho] of [['POST', '/estado'], ['PUT', '/index.html'], ['DELETE', '/'], ['OPTIONS', '/estado'], ['HEAD', '/']]) {
    const r = await pedir(porta, caminho, { metodo });
    assert.deepEqual([r.status, r.headers.allow, r.corpo.includes('agents')], [405, 'GET', false], metodo);
  }
});

test('E1-04e: another Host gets 421 with the real address and no echo of what came; the server listens on 127.0.0.1 only', async (t) => {
  const { raiz } = await projeto(t);
  const { servidor, porta } = await rodar(t, raiz, ['--porta', await portaLivre(t)]);
  assert.equal(servidor.address().address, '127.0.0.1');
  const recusa = [421, 'text/plain; charset=utf-8', `Abra por http://127.0.0.1:${porta}`];
  for (const Host of ['exemplo.com', `exemplo.com:${porta}`, `localhost.exemplo.com:${porta}`, '127.0.0.1', `127.0.0.1:${porta + 1}`, 'localhost']) {
    for (const metodo of ['GET', 'POST']) {
      const r = await pedir(porta, '/estado', { Host, metodo });
      assert.deepEqual([r.status, r.headers['content-type'], r.corpo], recusa, `${metodo} ${Host}`);
      assert.ok(!JSON.stringify(r.headers).includes('exemplo'), Host);
    }
  }
  for (const Host of [`127.0.0.1:${porta}`, `localhost:${porta}`]) assert.equal((await pedir(porta, '/estado', { Host })).status, 200, Host);
});

const responde = (status, corpo) => () => http.createServer((_req, res) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(corpo));
const OCUPANTES = {
  'a service that answers 401': responde(401, '{"erro":"sem acesso"}'),
  'a service that answers JSON without "projeto"': responde(200, '{"crews":[]}'),
  'a service that never answers': () => net.createServer((conexao) => conexao.resume()),
  'a service that hangs up halfway': () => http.createServer((_req, res) => res.write('{"projeto":', () => res.destroy())),
  'the office of another project': async (t) => criarServidor(await projeto(t)),
};

for (const [nome, criar] of Object.entries(OCUPANTES)) {
  test(`E1-04f: the port taken by ${nome} — the office opens on a later port and says which`, async (t) => {
    const { raiz } = await projeto(t);
    const ocupada = await segurar(t, await criar(t));
    const inicio = performance.now();
    const r = await rodar(t, raiz, ['--porta', String(ocupada)]);
    assert.ok(performance.now() - inicio < 5000, 'a port that does not answer is given up after about 1 s');
    assert.ok(r.porta > ocupada && r.porta <= ocupada + 9, `port ${r.porta}, after ${ocupada}`);
    assert.deepEqual([r.code, r.linhas, r.servidor.address().port], [0, [ABERTO(r.porta)], r.porta]);
    assert.equal(JSON.parse((await pedir(r.porta, '/estado')).corpo).projeto, projetoDe(raiz));
  });
}

test('E1-04f: an answer too big to be an office is dropped by its size, before the wait runs out', async (t) => {
  const grande = http.createServer((_req, res) => res.write('x'.repeat(4_000_000))); // 4 MB, and it never ends
  const inicio = performance.now();
  assert.equal(await sondar(await segurar(t, grande), 4000), null);
  assert.ok(performance.now() - inicio < 3000, `${Math.round(performance.now() - inicio)} ms`);
});

test('E1-04f: ten ports taken — exit 1 and the message with the first and the last port tried', async (t) => {
  const { raiz } = await projeto(t);
  const tentadas = [];
  const ocupadas = { abrir: async (_servidor, porta) => { tentadas.push(porta); return false; }, sondar: async () => null };
  const r = await rodar(t, raiz, ['--porta', '5000'], ocupadas);
  assert.deepEqual([r.code, r.linhas, r.servidor], [1, [SEM_PORTA(5000, 5009)], undefined]);
  assert.deepEqual(tentadas, [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009]);
  assert.deepEqual((await rodar(t, raiz, [], ocupadas)).linhas, [SEM_PORTA(4747, 4756)]);
  assert.deepEqual((await rodar(t, raiz, ['--porta', '65530'], ocupadas)).linhas, [SEM_PORTA(65530, 65535)]);
  // Only the first one taken: the very next port, and the line shows it.
  const seguinte = await rodar(t, raiz, ['--porta', '5000'], { ...ocupadas, abrir: async (_servidor, porta) => porta !== 5000 });
  assert.deepEqual([seguinte.code, seguinte.porta, seguinte.linhas], [0, 5001, [ABERTO(5001)]]);
});

test('E1-04g: outside the project root — exit 1 and the message, as a function and as a process', async (t) => {
  const fora = await mkTmp('escritorio-fora');
  t.after(() => fs.rm(fora, { recursive: true, force: true, maxRetries: 3 }));
  const r = await rodar(t, fora);
  assert.deepEqual([r.code, r.linhas, r.servidor], [1, [FORA_DA_RAIZ], undefined]);
  const p = spawnSync(process.execPath, [path.join(CORE, 'scripts', 'escritorio.mjs')], { cwd: fora, encoding: 'utf8' });
  assert.deepEqual([p.status, p.stdout.trim()], [1, FORA_DA_RAIZ], p.stderr);
});

test('E1-04h: run again with the office of this project on the port — exit 0, "já aberto", no second server', async (t) => {
  const { raiz } = await projeto(t);
  const primeiro = await rodar(t, raiz, ['--porta', await portaLivre(t)]);
  assert.deepEqual([primeiro.code, primeiro.linhas], [0, [ABERTO(primeiro.porta)]]);
  await fs.symlink(raiz, `${raiz}-elo`, 'junction'); // the same project, reached through a folder link
  t.after(() => fs.unlink(`${raiz}-elo`));
  for (const cwd of [raiz, `${raiz}-elo`]) {
    const deNovo = await rodar(t, cwd, ['--porta', String(primeiro.porta)]);
    const esperado = [0, [`O escritório já está aberto em http://127.0.0.1:${primeiro.porta}`], undefined];
    assert.deepEqual([deNovo.code, deNovo.linhas, deNovo.servidor], esperado, cwd);
  }
});

test('E1-04i: every answer carries the three security headers and none carries Access-Control-*', async (t) => {
  const { porta } = await subir(t, { x: estado(HORA(10)) });
  const pedidos = [
    ['/', {}, 200], ['/estado', {}, 200], ['/modelo.js', {}, 200], ['/nao-existe', {}, 404],
    ['/', { Host: 'exemplo.com' }, 421], ['/estado', { setHost: false }, 421], ['/estado', { metodo: 'POST' }, 405], ['/estado', { metodo: 'OPTIONS' }, 405],
  ];
  for (const [caminho, opcoes, status] of pedidos) {
    const r = await pedir(porta, caminho, { Origin: 'http://exemplo.com', ...opcoes });
    const caso = `${status} ${caminho} ${JSON.stringify(opcoes)}`;
    assert.equal(r.status, status, caso);
    for (const [nome, valor] of Object.entries(CABECALHOS)) assert.equal(r.headers[nome], valor, `${nome} — ${caso}`);
    assert.deepEqual(Object.keys(r.headers).filter((h) => h.startsWith('access-control-')), [], caso);
  }
});

test('E1-04j: the fixed list of the server is the content of the page folder, name by name', () => {
  assert.deepEqual([...ARQUIVOS].sort(), readdirSync(path.join(CORE, 'escritorio')).sort());
});

test('E1-04k: the project id is 12 hex characters, the same for the same root and, on Windows, whatever the case', () => {
  const [windows, linux] = ['D:\\Projetos\\Minha Crew', '/home/ana/projeto'];
  assert.match(idDoProjeto(windows, 'win32'), /^[0-9a-f]{12}$/);
  assert.equal(idDoProjeto(linux, 'linux'), createHash('sha256').update(linux).digest('hex').slice(0, 12));
  assert.equal(idDoProjeto(windows, 'win32'), idDoProjeto(windows, 'win32'));
  assert.equal(idDoProjeto('d:\\projetos\\MINHA CREW', 'win32'), idDoProjeto(windows, 'win32'));
  assert.notEqual(idDoProjeto('D:\\Projetos\\Outra Crew', 'win32'), idDoProjeto(windows, 'win32'));
  assert.notEqual(idDoProjeto('/home/ana/Projeto', 'linux'), idDoProjeto(linux, 'linux'), 'outside Windows the case is part of the path');
});

test('E1 §3: --porta outside 1024 to 65535, or not a whole number — exit 1, the reason and the usage line', async (t) => {
  const { raiz } = await projeto(t);
  const INVALIDA = 'Porta inválida: use --porta com um número de 1024 a 65535.';
  for (const argv of [['--porta', '80'], ['--porta', '1023'], ['--porta', '65536'], ['--porta', 'abc'], ['--porta', '47.5'], ['--porta=-1'], ['--porta='], ['--porta']]) {
    const r = await rodar(t, raiz, argv, { abrir: async () => true });
    assert.deepEqual([r.code, r.linhas.length, r.linhas[0], r.servidor], [1, 2, INVALIDA, undefined], argv.join(' '));
    assert.match(r.linhas[1], /^Uso: node _opencrew\/core\/scripts\/escritorio\.mjs \[--porta /);
  }
  for (const [argv, porta] of [[['--porta', '1024'], 1024], [['--porta=65535'], 65535], [[], 4747]]) {
    assert.deepEqual((await rodar(t, raiz, argv, { abrir: async () => true })).linhas, [ABERTO(porta)], argv.join(' '));
  }
});
