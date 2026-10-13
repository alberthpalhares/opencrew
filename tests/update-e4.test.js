// specs/fase-e4-robustez-do-escritorio.md — E4-01d: `update` says so when the office of this
// project is open, started by the version that was installed before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { officeLine } from '../src/lib/escritorio.js';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

const LINHA = (porta) => `O escritório está aberto em http://127.0.0.1:${porta}. Feche e rode /opencrew dashboard de novo para ver a versão nova.`;
const fechar = (servidor) => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); });

/** A service that answers `/estado` as an office would, on a free port. */
async function escritorio(t, resposta) {
  const servidor = http.createServer((_req, res) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(resposta)));
  t.after(() => fechar(servidor));
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  return servidor.address().port;
}

async function workspace(t) {
  const dir = await mkTmp('update-e4');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.19.0\n');
  return dir;
}

test('E4-01d: the line of the open office — only for an office of this project started by another version', async (t) => {
  const dir = await mkTmp('update-e4-linha');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  const [antigo, deHoje, deOutro] = [
    await escritorio(t, { projeto: projetoDe(dir), crews: [] }),
    await escritorio(t, { projeto: projetoDe(dir), versao: '1.19.1', crews: [] }),
    await escritorio(t, { projeto: 'abcdef012345', crews: [] }),
  ];
  assert.equal(await officeLine(dir, '1.19.1', { first: antigo, count: 1 }), LINHA(antigo));
  assert.equal(await officeLine(dir, '1.19.1', { first: deHoje, count: 1 }), null, 'already of the new version');
  assert.equal(await officeLine(dir, '1.19.1', { first: deOutro, count: 1 }), null, 'the office of another project');
  const inicio = performance.now();
  assert.equal(await officeLine(dir, '1.19.1', { first: 1, count: 10 }), null, 'nobody answers');
  assert.ok(performance.now() - inicio < 2000, 'the search adds less than 2 s');
});

test('E4-01d: update with the office open says it in the summary; --check and no office say nothing', async (t) => {
  const dir = await workspace(t);
  const porta = await escritorio(t, { projeto: projetoDe(dir), crews: [] });
  const rodar = (opts) => captureOutput(() => withCwd(dir, () => update(opts)));
  assert.ok(!(await rodar({ check: true, officePorts: { first: porta, count: 1 } })).includes('O escritório está aberto'), '--check');
  process.exitCode = 0; // `--check` with an update available leaves 1 for the shell; it is not a failure of this test
  assert.ok(!(await rodar({ officePorts: { first: 1, count: 1 } })).includes('O escritório está aberto'), 'no office');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.19.0\n');
  assert.ok((await rodar({ officePorts: { first: porta, count: 1 } })).includes(LINHA(porta)));
});
