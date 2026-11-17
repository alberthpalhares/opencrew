// Regra 14 (AGENTS.md) para a fase E5 (specs/fase-e5-lazer-e-convivencia.md, E5-upg):
// um workspace anterior sem os módulos de copa, lazer e diálogos recebe todos via `update`,
// preservando o state.json do usuário e desenhando o escritório expandido sem erro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

const BASE = '_opencrew/core/escritorio';
const NOVOS = ['sprites-lazer.js', 'modelo-lazer.js', 'modelo-dialogos.js'];
const ESTADO_ANTIGO = JSON.stringify({
  crew: 'equipe-antiga',
  status: 'running',
  step: { current: 1, total: 2, label: 'Escrever' },
  agents: [
    { id: 'a1', name: 'A1', status: 'working', label: 'Escrevendo' },
    { id: 'a2', name: 'A2', status: 'idle', label: 'Aguardando' },
  ],
}, null, 2);

test('E5-upg: update entrega módulos de lazer e preserva e desenha state.json existente', async (t) => {
  const dir = await mkTmp('upgrade-e5');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));

  for (const nome of NOVOS) {
    await fs.rm(path.join(dir, BASE, nome), { force: true });
  }
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.21.0\n');
  const estadoPath = path.join(dir, 'crews', 'equipe-antiga', 'state.json');
  await fs.mkdir(path.dirname(estadoPath), { recursive: true });
  await fs.writeFile(estadoPath, ESTADO_ANTIGO);

  await captureOutput(() => withCwd(dir, () => update()));

  for (const nome of NOVOS) {
    await fs.access(path.join(dir, BASE, nome));
  }
  assert.equal(await fs.readFile(estadoPath, 'utf8'), ESTADO_ANTIGO);

  // Node 20.17 precisa de "type": "module" num pacote temporário para importar arquivos `.js` em ESM.
  await fs.writeFile(path.join(dir, BASE, 'package.json'), '{"type":"module"}\n');
  const modelo = await import(pathToFileURL(path.join(dir, BASE, 'modelo.js')).href);
  const base = modelo.montarModelo(JSON.parse(ESTADO_ANTIGO), { agoraMs: 1000, crew: 'equipe-antiga' });
  const trans = modelo.transicao(base, base, 5000);
  const bonecos = modelo.quadro(trans, 9000);
  assert.equal(trans.ambiente.sala.nome, 'pequena');
  assert.equal(trans.ambiente.sala.largura, 320);
  assert.equal(trans.ambiente.sala.altura, 240);
  assert.ok(trans.ambiente.moveis.some((m) => m.tipo === 'sinuca'));
  assert.ok(trans.ambiente.moveis.some((m) => m.tipo === 'videogame'));
  assert.ok(bonecos.some((b) => b.lazer));
});
