// specs/fase-e1-escritorio-ao-vivo.md — E1-04f (rule 15): a port another program holds on every
// address of the machine. On Windows `listen(port, '127.0.0.1')` opens over a service that listens
// on 0.0.0.0, and would take its local traffic; on Linux that listen already fails. Either way the
// office has to go to a later port and leave the other service alone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { abrir } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp } from './_helpers.js';

const ABERTO = (porta) => `Escritório aberto em http://127.0.0.1:${porta} — Ctrl+C para fechar`;
const fechar = (servidor) => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); });

/** Listens on every address (0.0.0.0), leaving room for the nine ports after it. */
async function escutarEmTodos(t, servidor) {
  t.after(() => fechar(servidor));
  do {
    if (servidor.listening) await new Promise((ok) => servidor.close(ok));
    await new Promise((ok) => servidor.listen(0, '0.0.0.0', ok));
  } while (servidor.address().port > 65000);
  return servidor.address().port;
}

/** The body of `GET caminho` on 127.0.0.1. */
function pedir(porta, caminho) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: porta, path: caminho, agent: false }, (res) => {
      let corpo = '';
      res.setEncoding('utf8').on('data', (parte) => { corpo += parte; }).on('end', () => resolve(corpo));
    }).on('error', reject);
  });
}

test('E1-04f: the port taken by a service that listens on 0.0.0.0 — the office opens on a later port and the service keeps its own', async (t) => {
  const raiz = await mkTmp('escritorio-porta');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  const ocupada = await escutarEmTodos(t, http.createServer((_req, res) => res.end('alheio')));
  assert.equal(await pedir(ocupada, '/'), 'alheio');

  const linhas = [];
  const r = await main(['--porta', String(ocupada)], { cwd: raiz, escrever: (s) => linhas.push(s), pasta: raiz, arquivos: [] });
  if (r.servidor) t.after(() => fechar(r.servidor));
  assert.ok(r.porta > ocupada && r.porta <= ocupada + 9, `port ${r.porta}, after ${ocupada}`);
  assert.deepEqual([r.code, linhas, r.servidor.address().port], [0, [ABERTO(r.porta)], r.porta]);
  assert.equal(JSON.parse(await pedir(r.porta, '/estado')).projeto, projetoDe(raiz));
  assert.equal(await pedir(ocupada, '/'), 'alheio', 'the other service still answers on 127.0.0.1');
});

test('E1-04f: abrir refuses a port where someone already accepts connections on 127.0.0.1, and still opens a free one', async (t) => {
  const ocupada = await escutarEmTodos(t, http.createServer((_req, res) => res.end('alheio')));
  const servidor = http.createServer();
  t.after(() => (servidor.listening ? fechar(servidor) : undefined));
  assert.equal(await abrir(servidor, ocupada), false);
  assert.equal(servidor.listening, false);
  assert.equal(await abrir(servidor, 0), true, 'the same server can try another port');
});
