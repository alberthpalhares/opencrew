// AGENTS.md rule 14 and U7F3C-08f: update preserves per-run data and refreshes lifecycle support.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { templatesDir } from '../src/lib/paths.js';
import { ideById } from '../src/lib/ides.js';
import { workspace, entregueAntes, carimboAntigo, rodar } from './_reconciliar.js';

const RUN = '2026-11-22-120000';
const versoes = ['1.21.2', '1.19.5'];
const arquivo = (raiz, relativo) => path.join(raiz, ...relativo.split('/'));

test('U7F3C-08f EO-19: update installs auto lifecycle and organized deliveries while preserving legacy runs', async (t) => {
  const bridge = ideById('codex').files[0];
  for (const versao of versoes) {
    const raiz = await workspace(`upgrade-office-${versao}`);
    t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
    const legado = `crews/minha-crew/output/${RUN}/v1/artigo.md`;
    await fs.mkdir(path.dirname(arquivo(raiz, legado)), { recursive: true });
    await fs.writeFile(arquivo(raiz, legado), '# Texto anterior ao upgrade\n');
    await fs.mkdir(arquivo(raiz, '_opencrew/_memory'), { recursive: true });
    const preferencias = '- **Dashboard:** off\n- **Nota pessoal:** manter\n';
    const registro = JSON.stringify({ crew: 'minha-crew', run: RUN, status: 'aberta', passos: [] });
    const estado = JSON.stringify({ crew: 'minha-crew', runId: RUN, status: 'running', agents: [] });
    await fs.writeFile(arquivo(raiz, '_opencrew/_memory/preferences.md'), preferencias);
    await fs.writeFile(arquivo(raiz, `crews/minha-crew/output/${RUN}/execucao.json`), registro);
    await fs.writeFile(arquivo(raiz, `crews/minha-crew/output/${RUN}/estado-escritorio.json`), estado);
    await entregueAntes(raiz, bridge.path, '# Codex bridge from an older release\n');
    await carimboAntigo(raiz, versao);

    const { code } = await rodar(raiz);

    assert.equal(code, 0, versao);
    assert.equal(await fs.readFile(arquivo(raiz, '_opencrew/core/scripts/escritorio/vigia.mjs'), 'utf8'), await fs.readFile(arquivo(templatesDir, '_opencrew/core/scripts/escritorio/vigia.mjs'), 'utf8'));
    assert.match(await fs.readFile(arquivo(raiz, bridge.path), 'utf8'), /--automatico-servidor/);
    assert.equal(await fs.readFile(arquivo(raiz, '_opencrew/_memory/preferences.md'), 'utf8'), preferencias);
    assert.equal(await fs.readFile(arquivo(raiz, `crews/minha-crew/output/${RUN}/execucao.json`), 'utf8'), registro);
    assert.equal(await fs.readFile(arquivo(raiz, `crews/minha-crew/output/${RUN}/estado-escritorio.json`), 'utf8'), estado);
    assert.equal(await fs.readFile(arquivo(raiz, legado), 'utf8'), '# Texto anterior ao upgrade\n');
    for (const novo of ['buscar.mjs', 'caminho/revisao.mjs', 'entrega/final.mjs']) {
      const relativa = `_opencrew/core/scripts/${novo}`;
      assert.equal(await fs.readFile(arquivo(raiz, relativa), 'utf8'), await fs.readFile(arquivo(templatesDir, relativa), 'utf8'));
    }
  }
});
