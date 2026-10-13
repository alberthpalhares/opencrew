// specs/fase-e4-robustez-do-escritorio.md — E4-01: the office says which version of OpenCrew
// started it, and the command tells an office of an earlier version from the one that is up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { criarServidor } from '../templates/_opencrew/core/scripts/escritorio/servidor.mjs';
import { abrir } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp } from './_helpers.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JA_ABERTO = (porta) => `O escritório já está aberto em http://127.0.0.1:${porta}`;
const ANTERIOR = (porta) => `O escritório aberto em http://127.0.0.1:${porta} é de uma versão anterior. Feche esse processo e rode o comando de novo.`;
const fechar = (servidor) => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); });
const carimbar = (raiz, versao) => fs.writeFile(path.join(raiz, '_opencrew', '.opencrew-version'), `${versao}\n`);

/** A fake installed project; `versao` null leaves it without the version stamp. */
async function projeto(t, versao = '1.19.1') {
  const raiz = await mkTmp('escritorio-versao');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const pasta = path.join(raiz, '_opencrew', 'core', 'escritorio');
  await fs.mkdir(pasta, { recursive: true });
  await fs.writeFile(path.join(pasta, 'index.html'), '<!doctype html><title>Escritório</title>\n');
  if (versao !== null) await carimbar(raiz, versao);
  return { raiz, pasta, arquivos: ['index.html'] };
}

/** Holds a free port with `servidor` until the test ends. */
async function segurar(t, servidor) {
  t.after(() => fechar(servidor));
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  return servidor.address().port;
}

async function rodar(t, raiz, porta) {
  const linhas = [];
  const r = await main(['--porta', String(porta)], { cwd: raiz, escrever: (s) => linhas.push(s) });
  if (r.servidor) t.after(() => fechar(r.servidor));
  return [r.code, linhas, r.servidor];
}

test('E4-01a: /estado brings projeto, versao (the stamp of the project when the server started) and crews', async (t) => {
  for (const [versao, esperada] of [['1.19.1', '1.19.1'], [null, '']]) {
    const p = await projeto(t, versao);
    const servidor = criarServidor(p);
    t.after(() => fechar(servidor));
    assert.equal(await abrir(servidor, 0), true);
    const ler = async () => (await fetch(`http://127.0.0.1:${servidor.address().port}/estado`)).json();
    assert.deepEqual(await ler(), { projeto: projetoDe(p.raiz), versao: esperada, crews: [] });
    await carimbar(p.raiz, '9.9.9'); // an `update` under a server that is running: it keeps the version it started with
    assert.equal((await ler()).versao, esperada);
  }
});

test('E4-01b: the office of this project, of the same version, on the port — exit 0 and "já aberto"', async (t) => {
  for (const versao of ['1.19.1', null]) {
    const p = await projeto(t, versao);
    const porta = await segurar(t, criarServidor(p));
    assert.deepEqual(await rodar(t, p.raiz, porta), [0, [JA_ABERTO(porta)], undefined]);
  }
});

test('E4-01c: the office of this project started by another version — exit 1, the line, and no new server', async (t) => {
  const p = await projeto(t, '1.19.1');
  const porta = await segurar(t, criarServidor(p));
  await carimbar(p.raiz, '1.20.0');
  assert.deepEqual(await rodar(t, p.raiz, porta), [1, [ANTERIOR(porta)], undefined]);
  // The search stops at that port: the next one is never tried.
  const tentadas = [];
  const abrir = async (_servidor, tentada) => { tentadas.push(tentada); return false; };
  const sondar = async () => ({ projeto: projetoDe(p.raiz), versao: '1.19.1' });
  const r = await main(['--porta', '5000'], { cwd: p.raiz, escrever() {}, abrir, sondar });
  assert.deepEqual([r.code, r.porta, tentadas], [1, 5000, [5000]]);
});

test('E4-01c: an office up to 1.19.0 answers without "versao" — it is of an earlier version', async (t) => {
  const p = await projeto(t, '1.19.1');
  const corpo = JSON.stringify({ projeto: projetoDe(p.raiz), crews: [] });
  const porta = await segurar(t, http.createServer((_req, res) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(corpo)));
  assert.deepEqual(await rodar(t, p.raiz, porta), [1, [ANTERIOR(porta)], undefined]);
});

test('E4-01e: /opencrew dashboard says what to do with the line of the earlier version', () => {
  const sistema = readFileSync(path.join(RAIZ, 'templates', 'AGENTS.md'), 'utf8').replace(/\s+/g, ' ');
  assert.match(sistema, /é de uma versão anterior/);
  assert.match(sistema, /stop the background process you started[^.]*run the command again/);
  assert.match(sistema, /If you did not start it, show the line to the user/);
});
