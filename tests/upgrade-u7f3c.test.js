// AGENTS.md rule 14 and U7F3C-04a: update a 1.20.0 workspace and preserve its user's preferences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { templatesDir } from '../src/lib/paths.js';
import { ideById } from '../src/lib/ides.js';
import { workspace, entregueAntes, manifesto, gravarManifesto, carimboAntigo, rodar } from './_reconciliar.js';

const arquivo = (dir, rel) => path.join(dir, ...rel.split('/'));
const RUN = '2026-11-12-120000';
const CREW = 'id,displayName,title,icon,path,execution\na,Ana,Pesquisadora,🔎,./agents/a.agent.md,inline\n';
const PREFERENCIAS = '# Preferências\n\n- **Idioma:** Português\n- **Dashboard:** disabled\n- **Nota pessoal:** manter intacta\n';

test('U7F3C-upg: one update delivers the auto-open runtime and leaves Dashboard: disabled byte for byte', async (t) => {
  const dir = await workspace('upgrade-u7f3c');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  const pref = arquivo(dir, '_opencrew/_memory/preferences.md');
  await fs.writeFile(pref, PREFERENCIAS);
  const codexBridge = ideById('codex').files[0];
  await entregueAntes(dir, codexBridge.path, '# Codex bridge from 1.20.0\n');
  await entregueAntes(dir, '_opencrew/core/scripts/estado.mjs', '// runtime 1.20.0\n');
  await entregueAntes(dir, '_opencrew/core/scripts/escritorio.mjs', '// runtime 1.20.0\n');
  for (const rel of ['_opencrew/core/scripts/escritorio/automatico.mjs', '_opencrew/core/scripts/escritorio/navegador.mjs']) {
    await fs.rm(arquivo(dir, rel), { force: true });
    const m = await manifesto(dir);
    delete m.files[rel];
    await gravarManifesto(dir, m);
  }
  await fs.mkdir(arquivo(dir, `crews/minha-crew/output/${RUN}`), { recursive: true });
  await fs.writeFile(arquivo(dir, 'crews/minha-crew/crew-party.csv'), CREW);
  await carimboAntigo(dir, '1.20.0');

  const { code } = await rodar(dir);

  assert.equal(code, 0);
  assert.equal(await fs.readFile(pref, 'utf8'), PREFERENCIAS);
  assert.equal(await fs.readFile(arquivo(dir, codexBridge.path), 'utf8'), codexBridge.content);
  for (const rel of ['_opencrew/core/scripts/estado.mjs', '_opencrew/core/scripts/escritorio.mjs',
    '_opencrew/core/scripts/escritorio/automatico.mjs', '_opencrew/core/scripts/escritorio/navegador.mjs',
    '_opencrew/core/scripts/escritorio/porta.mjs']) {
    assert.equal(await fs.readFile(arquivo(dir, rel), 'utf8'), await fs.readFile(arquivo(templatesDir, rel), 'utf8'), rel);
  }

  const { main } = await import(pathToFileURL(arquivo(dir, '_opencrew/core/scripts/estado.mjs')).href);
  const linhas = [];
  assert.equal(await main(['minha-crew', 'iniciar', '--run', RUN, '--passos', '1'], {
    cwd: dir, escrever: (linha) => linhas.push(linha),
  }), 0);
  assert.deepEqual(linhas, ['ESTADO:OK']);
  assert.equal(JSON.parse(await fs.readFile(arquivo(dir, `crews/minha-crew/output/${RUN}/estado-escritorio.json`), 'utf8')).runId, RUN);
});
