// AGENTS.md rule 14 for phase E2 (specs/fase-e2-personagens-do-escritorio.md, E2-upg): a 1.17.0
// workspace with a crew whose `crew-party.csv` has the 6 old columns gets the new characters with
// one `update`; the file of the crew is not touched, `estado.mjs iniciar` works and the new page —
// imported from the workspace — draws the figures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA, CREW } from './_conserto.js';

// What E2 brings to the page: none of it is in a 1.17.0 workspace.
const NOVOS = ['folha.js', 'sprites-rosto.js', 'sprites-corpo.js', 'sprites-boneco.js', 'modelo-personagem.js'];
const HORA = '2026-10-12T10:00:00.000Z';

async function workspace1170(t) {
  const dir = await mkTmp('upgrade-e2');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, 'escritorio', novo), { force: true });
  // The 1.17.0 cast reader knew nothing of the column, and the page drew one mould.
  await fs.writeFile(path.join(core, 'escritorio', 'sprites.js'), '// 1.17.0\nexport const MOLDE = null;\n');
  await fs.writeFile(path.join(core, 'scripts', 'estado', 'elenco.mjs'), '// 1.17.0\nexport const lerElenco = async () => [];\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.17.0\n');
  await fs.writeFile(path.join(dir, '_opencrew', '_memory', 'preferences.md'), '- **Dashboard:** enabled\n');
  for (const [arquivo, conteudo] of Object.entries(ANTIGA)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

const doWorkspace = (core, ...partes) => import(`${pathToFileURL(path.join(core, ...partes)).href}?e2-upg`);

test('E2-upg: update from 1.17.0 delivers the new characters; the 6-column crew-party.csv is untouched, iniciar works and the new page draws the figures', async (t) => {
  const { dir, core } = await workspace1170(t);
  const csv = path.join(dir, CREW, 'crew-party.csv');
  const antes = await snapshot(path.join(dir, 'crews'));
  assert.match(await fs.readFile(csv, 'utf8'), /^id,displayName,title,icon,path,execution\n/);

  await captureOutput(() => withCwd(dir, () => update()));

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, 'escritorio', novo)), true, `missing after update: ${novo}`);
  assert.match(await fs.readFile(path.join(core, 'prompts', 'build.prompt.md'), 'utf8'), /id,displayName,title,icon,path,execution,personagem/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  // Imported from the WORKSPACE, not from templates/: proves every module arrived together.
  const { main, ARQUIVOS } = await doWorkspace(core, 'scripts', 'escritorio.mjs');
  assert.deepEqual([...ARQUIVOS].sort(), (await fs.readdir(path.join(core, 'escritorio'))).sort(), 'the server answers for every file of the page, and only for them');
  assert.equal(typeof main, 'function');
  const { main: estado } = await doWorkspace(core, 'scripts', 'estado.mjs');
  const linhas = [];
  assert.equal(await estado(['atas', 'iniciar', '--passos', '3'], { cwd: dir, agora: () => HORA, escrever: (s) => linhas.push(s) }), 0);
  assert.deepEqual(linhas, ['ESTADO:OK']);
  const gravado = JSON.parse(await fs.readFile(path.join(dir, CREW, 'state.json'), 'utf8'));
  assert.deepEqual(gravado.agents, [
    { id: 'rita-redacao', name: 'Rita Redação', icon: '📝', status: 'idle', label: '' },
    { id: 'vito-veredito', name: 'Vito Veredito', icon: '📝', status: 'idle', label: '' },
  ], 'a crew without the column: the state has no personagem');
  assert.deepEqual((await snapshot(path.join(dir, 'crews'))).filter((l) => !l.startsWith(path.join('atas', 'state.json'))), antes, 'iniciar only writes state.json');

  const { montarModelo, quadro, MOLDES } = await doWorkspace(core, 'escritorio', 'modelo.js');
  const { pintarCena } = await doWorkspace(core, 'escritorio', 'cena.js');
  const bonecos = quadro(montarModelo(gravado, { agoraMs: Date.parse(HORA) }), Date.parse(HORA));
  assert.deepEqual(bonecos.map((b) => [b.id, MOLDES.includes(b.aparencia.molde), Number.isInteger(b.aparencia.corte)]), [['rita-redacao', true, true], ['vito-veredito', true, true]]);
  const cores = [];
  pintarCena({ globalAlpha: 1, set fillStyle(cor) { this.cor = cor; }, fillRect() { cores.push(this.cor); } }, bonecos);
  for (const b of bonecos) for (const parte of ['pele', 'cabelo', 'olhos', 'camisa']) assert.ok(cores.includes(b.aparencia[parte]), `${b.id}: ${parte} was not painted`);
});
