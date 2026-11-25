import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { packageJsonPath, templatesDir } from '../src/lib/paths.js';
import { mkTmp, withCwd } from './_helpers.js';

test('AU-15: um update de 1.21.2 instala o aviso sem perder dados e guarda framework editado', async (t) => {
  const raiz = await mkTmp('upgrade-aviso-1-21-2');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(raiz, () => init({ ide: ['codex'] }));

  const memoria = path.join(raiz, '_opencrew', '_memory');
  const crew = path.join(raiz, 'crews', 'cliente', '_memory');
  const entrega = path.join(raiz, 'crews', 'cliente', 'output', 'entrega');
  await fs.mkdir(crew, { recursive: true });
  await fs.mkdir(entrega, { recursive: true });
  await fs.writeFile(path.join(memoria, 'company.md'), '# Empresa preservada\n');
  await fs.writeFile(path.join(memoria, 'preferences.md'), '- **Aviso de atualização:** off\n');
  await fs.writeFile(path.join(crew, 'memories.md'), '# Memória preservada\n');
  await fs.writeFile(path.join(entrega, 'texto.md'), 'Entrega preservada\n');
  await fs.writeFile(path.join(raiz, '.env'), 'API_KEY=preservada\n');

  const editado = path.join(raiz, '_opencrew', 'core', 'runner.pipeline.md');
  const original = await fs.readFile(editado, 'utf8');
  await fs.writeFile(editado, `${original}\n# Ajuste local do usuário\n`);
  const aviso = path.join(raiz, '_opencrew', 'core', 'scripts', 'aviso-atualizacao.mjs');
  await fs.rm(aviso);
  await fs.writeFile(path.join(raiz, '_opencrew', '.opencrew-version'), '1.21.2\n');
  const manifesto = path.join(raiz, '_opencrew', 'manifest.json');
  const recibo = JSON.parse(await fs.readFile(manifesto, 'utf8'));
  recibo.version = '1.21.2';
  await fs.writeFile(manifesto, `${JSON.stringify(recibo, null, 2)}\n`);

  await withCwd(raiz, () => update());

  const pacote = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  assert.equal((await fs.readFile(path.join(raiz, '_opencrew', '.opencrew-version'), 'utf8')).trim(), pacote.version);
  assert.equal(await fs.readFile(aviso, 'utf8'), await fs.readFile(path.join(templatesDir, '_opencrew', 'core', 'scripts', 'aviso-atualizacao.mjs'), 'utf8'));
  assert.equal(await fs.readFile(path.join(memoria, 'company.md'), 'utf8'), '# Empresa preservada\n');
  assert.equal(await fs.readFile(path.join(memoria, 'preferences.md'), 'utf8'), '- **Aviso de atualização:** off\n');
  assert.equal(await fs.readFile(path.join(crew, 'memories.md'), 'utf8'), '# Memória preservada\n');
  assert.equal(await fs.readFile(path.join(entrega, 'texto.md'), 'utf8'), 'Entrega preservada\n');
  assert.equal(await fs.readFile(path.join(raiz, '.env'), 'utf8'), 'API_KEY=preservada\n');
  const backup = path.join(raiz, '.opencrew-backup');
  const backups = await fs.readdir(backup);
  assert.ok(backups.length > 0);
  assert.equal(await fs.readFile(path.join(backup, backups[0], '_opencrew', 'core', 'runner.pipeline.md'), 'utf8'), `${original}\n# Ajuste local do usuário\n`);
});
