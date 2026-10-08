// AGENTS.md rule 14 for U5, slice 1 (specs/fase-u5a-polimento-do-uso.md, U5a-upg-a): a 1.11.0
// workspace with a crew whose steps have no format gets the `texto-livre` guide with one `update`,
// the crew is not touched, and the delivered repair script — run from the workspace — writes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA, CREW, PASSO } from './_conserto.js';

async function workspace1110(t) {
  const dir = await mkTmp('upgrade-u5a');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  await fs.rm(path.join(core, 'best-practices', 'texto-livre.md'));
  await fs.rm(path.join(core, 'scripts', 'verificar', 'documento.mjs'));
  const catalogo = path.join(core, 'best-practices', '_catalog.yaml');
  const antigo = (await fs.readFile(catalogo, 'utf8')).replace(/\r?\n {2}- id: texto-livre\r?\n(?: {4}.*\r?\n)+/, '\n');
  assert.doesNotMatch(antigo, /texto-livre/, 'could not write the 1.11.0 catalog');
  await fs.writeFile(catalogo, antigo);
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.11.0\n');
  for (const [arquivo, conteudo] of Object.entries(ANTIGA)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

test('U5a-upg-a: update from 1.11.0 delivers texto-livre and the checker module; the crew is untouched; the delivered repair writes the new format', async (t) => {
  const { dir, core } = await workspace1110(t);
  const antes = await snapshot(path.join(dir, 'crews'));

  await captureOutput(() => withCwd(dir, () => update()));

  assert.equal(await exists(path.join(core, 'best-practices', 'texto-livre.md')), true);
  assert.equal(await exists(path.join(core, 'scripts', 'verificar', 'documento.mjs')), true);
  assert.match(await fs.readFile(path.join(core, 'best-practices', '_catalog.yaml'), 'utf8'), /- id: texto-livre/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  const { main } = await import(`${pathToFileURL(path.join(core, 'scripts', 'conserto.mjs')).href}?u5a-upg`);
  const linhas = [];
  const code = main(['--crew', CREW, '--aplicar', 'formato:1=texto-livre'], { cwd: dir, escrever: (s) => linhas.push(s) });
  assert.equal(linhas.at(-1), 'CONSERTO:APLICADO', linhas.join('\n'));
  assert.equal(code, 0);
  assert.match(await fs.readFile(path.join(dir, PASSO('step-01-minuta.md')), 'utf8'), /^format: texto-livre$/m);

  const verificar = await import(`${pathToFileURL(path.join(core, 'scripts', 'verificar.mjs')).href}?u5a-upg`);
  await fs.mkdir(path.join(dir, CREW, 'output'), { recursive: true });
  await fs.writeFile(path.join(dir, CREW, 'output', 'minuta.md'), '# Minuta\n\nTexto.\n');
  const saida = [];
  await verificar.main(['--crew', CREW, '--arquivo', `${CREW}/output/minuta.md=texto-livre`], { cwd: dir, escrever: (s) => saida.push(...String(s).split('\n')) });
  assert.equal(saida.filter((l) => l.trim()).at(-1), 'VERIFICACAO:OK', saida.join('\n'));
});
