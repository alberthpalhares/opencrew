// AGENTS.md rule 14 for phase E6 (specs/fase-e6-escritorio-celular-rede.md, E6-upg):
// a 1.21.0 workspace receives rede.mjs, updated office scripts and prompts via `update`,
// preserving crews/ and _memory/, and emits mobile/tablet network URLs in --automatico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { templatesDir } from '../src/lib/paths.js';
import { workspace, entregueAntes, manifesto, gravarManifesto, carimboAntigo, rodar } from './_reconciliar.js';

const arquivo = (dir, rel) => path.join(dir, ...rel.split('/'));
const RUN = '2026-11-16-080000';
const PREFERENCIAS = '# Preferências\n\n- **Idioma:** Português\n- **Nota pessoal:** manter intacta\n';
const CREW = 'id,displayName,title,icon,path,execution\na,Ana,Pesquisadora,🔎,./agents/a.agent.md,inline\n';

test('E6-upg: update delivers rede.mjs and updated office scripts/prompts while preserving user data', async (t) => {
  const dir = await workspace('upgrade-e6');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  const pref = arquivo(dir, '_opencrew/_memory/preferences.md');
  await fs.writeFile(pref, PREFERENCIAS);
  await fs.mkdir(arquivo(dir, 'crews/minha-crew'), { recursive: true });
  await fs.writeFile(arquivo(dir, 'crews/minha-crew/crew-party.csv'), CREW);

  for (const rel of [
    '_opencrew/core/scripts/escritorio.mjs',
    '_opencrew/core/scripts/escritorio/servidor.mjs',
    '_opencrew/core/scripts/escritorio/porta.mjs',
    '_opencrew/core/scripts/escritorio/automatico.mjs',
    '_opencrew/core/runner/escritorio.md',
  ]) {
    await entregueAntes(dir, rel, '// runtime 1.21.0\n');
  }
  await fs.rm(arquivo(dir, '_opencrew/core/scripts/escritorio/rede.mjs'), { force: true });
  const m = await manifesto(dir);
  delete m.files['_opencrew/core/scripts/escritorio/rede.mjs'];
  await gravarManifesto(dir, m);
  await carimboAntigo(dir, '1.21.0');

  const { code } = await rodar(dir);
  assert.equal(code, 0);
  assert.equal(await fs.readFile(pref, 'utf8'), PREFERENCIAS);
  assert.equal(await fs.readFile(arquivo(dir, 'crews/minha-crew/crew-party.csv'), 'utf8'), CREW);

  for (const rel of [
    '_opencrew/core/scripts/escritorio/rede.mjs',
    '_opencrew/core/scripts/escritorio/servidor.mjs',
    '_opencrew/core/scripts/escritorio/porta.mjs',
    '_opencrew/core/scripts/escritorio/automatico.mjs',
    '_opencrew/core/scripts/escritorio.mjs',
    '_opencrew/core/runner/escritorio.md',
  ]) {
    assert.equal(await fs.readFile(arquivo(dir, rel), 'utf8'), await fs.readFile(arquivo(templatesDir, rel), 'utf8'), rel);
  }

  const { main } = await import(`${pathToFileURL(arquivo(dir, '_opencrew/core/scripts/escritorio.mjs')).href}?e6-upg`);
  const { projetoDe, versaoDe } = await import(`${pathToFileURL(arquivo(dir, '_opencrew/core/scripts/escritorio/projeto.mjs')).href}?e6-upg`);
  let iniciado = false;
  const spawn = () => {
    const p = new EventEmitter();
    p.unref = () => {};
    queueMicrotask(() => { iniciado = true; p.emit('spawn'); });
    return p;
  };
  const linhas = [];
  const r = await main(['--automatico', '--porta', '4747', '--crew', 'minha-crew', '--run', RUN], {
    cwd: dir,
    interfaces: { 'Wi-Fi': [{ family: 'IPv4', address: '192.168.10.25', internal: false }] },
    escrever: (l) => linhas.push(l),
    auto: { sondar: async () => iniciado ? { projeto: projetoDe(dir), versao: versaoDe(dir) } : null, pronto: async () => true, ocupada: async () => false, spawn, esperar: async () => {} },
  });
  assert.equal(r.code, 0);
  assert.deepEqual(linhas, [
    `ESCRITORIO:URL http://127.0.0.1:4747/?crew=minha-crew&run_id=${RUN}`,
    `ESCRITORIO:URL_REDE http://192.168.10.25:4747/?crew=minha-crew&run_id=${RUN}`,
  ]);
});
