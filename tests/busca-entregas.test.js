import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { mkTmp } from './_helpers.js';
import { buscar } from '../templates/_opencrew/core/scripts/buscar.mjs';

test('EO-09 e EO-10: busca temas e arquivos antigos sem acentos e aplica filtros', async (t) => {
  const raiz = await mkTmp('busca-entregas');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  for (const crew of ['a', 'b']) {
    const pasta = path.join(raiz, 'crews', crew, 'output', '2026-01-01-120000');
    await fs.mkdir(path.join(pasta, 'v1'), { recursive: true });
    await fs.writeFile(path.join(raiz, 'crews', crew, 'crew.yaml'), 'name: teste\n');
    await fs.writeFile(path.join(pasta, 'v1', 'Relatório.md'), 'texto');
  }
  const achados = await buscar(raiz, { termo: 'relatorio', crew: 'a' });
  assert.equal(achados.length, 1);
  assert.equal(achados[0].crew, 'a');
  assert.equal(achados[0].situacao, 'aprovação não registrada');
  assert.match(achados[0].arquivos[0], /v1\/Relatório\.md$/);
});
