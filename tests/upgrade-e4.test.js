// AGENTS.md rule 14 for phase E4 (specs/fase-e4-robustez-do-escritorio.md, E4-upg): a 1.19.0
// workspace with its office still open gets, with one `update`, the warning that the office has to
// be opened again; the new command tells that old server apart; and a new server gives the whole
// page, with `aviso.js`. No file of the crew is touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA } from './_conserto.js';

// What E4 brings: none of it is in a 1.19.0 workspace.
const NOVOS = ['escritorio/aviso.js', 'scripts/estado/passo-agente.mjs', 'scripts/caminho/aberta.mjs'];
const fechar = (servidor) => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); });

async function workspace1190(t) {
  const dir = await mkTmp('upgrade-e4');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, novo), { force: true });
  await fs.writeFile(path.join(core, 'scripts', 'escritorio.mjs'), '// 1.19.0\nexport const ARQUIVOS = [];\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.19.0\n');
  for (const [arquivo, conteudo] of Object.entries(ANTIGA)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

/** The office of 1.19.0, still running: it answers `/estado` without the version. */
async function escritorio1190(t, dir) {
  const corpo = JSON.stringify({ projeto: projetoDe(dir), crews: [] });
  const servidor = http.createServer((_req, res) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(corpo));
  t.after(() => fechar(servidor));
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  return servidor.address().port;
}

async function doWorkspace(core, ...partes) {
  await fs.writeFile(path.join(core, partes[0], 'package.json'), '{ "type": "module" }\n');
  return import(`${pathToFileURL(path.join(core, ...partes)).href}?e4-upg`);
}

test('E4-upg: update from 1.19.0 with the office open — the summary says so, the new command tells the old server apart, and a new server gives the whole page', async (t) => {
  const { dir, core } = await workspace1190(t);
  const antigo = await escritorio1190(t, dir);
  const antes = await snapshot(path.join(dir, 'crews'));

  const saida = await captureOutput(() => withCwd(dir, () => update({ officePorts: { first: antigo, count: 1 } })));

  assert.ok(saida.includes(`O escritório está aberto em http://127.0.0.1:${antigo}. Feche e rode /opencrew dashboard de novo para ver a versão nova.`), saida);
  for (const novo of NOVOS) assert.equal(await exists(path.join(core, novo)), true, `missing after update: ${novo}`);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  // The command of the WORKSPACE, against the server that stayed open.
  const { main, ARQUIVOS } = await doWorkspace(core, 'scripts', 'escritorio.mjs');
  const linhas = [];
  const r = await main(['--porta', String(antigo)], { cwd: dir, escrever: (s) => linhas.push(s) });
  assert.deepEqual([r.code, linhas, r.servidor], [1, [`O escritório aberto em http://127.0.0.1:${antigo} é de uma versão anterior. Feche esse processo e rode o comando de novo.`], undefined]);

  // A new server of the WORKSPACE: every file of the page, and the version of the workspace.
  const pagina = (await fs.readdir(path.join(core, 'escritorio'))).filter((nome) => nome !== 'package.json').sort();
  assert.deepEqual([...ARQUIVOS].sort(), pagina);
  const { criarServidor } = await doWorkspace(core, 'scripts', 'escritorio', 'servidor.mjs');
  const servidor = criarServidor({ raiz: dir, pasta: path.join(core, 'escritorio'), arquivos: ARQUIVOS });
  t.after(() => fechar(servidor));
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  const pedir = (caminho) => fetch(`http://127.0.0.1:${servidor.address().port}${caminho}`);
  for (const nome of ARQUIVOS) assert.equal((await pedir(`/${nome}`)).status, 200, nome);
  assert.match(await (await pedir('/')).text(), /<script type="module" src="aviso\.js"><\/script>/);
  const instalada = (await fs.readFile(path.join(dir, '_opencrew', '.opencrew-version'), 'utf8')).trim();
  assert.equal((await (await pedir('/estado')).json()).versao, instalada);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes);
});
