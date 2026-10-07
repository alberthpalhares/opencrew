// AGENTS.md rule 14 for R3 (specs/fase-r3-runner-em-uso-real.md, R3-upg): a 1.7.0 workspace gets
// the path script with one `update`, and a run written by the old rules is still readable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot } from './_helpers.js';

const RUN = '2026-10-05-093000';
// The user's own data, written by hand below: path → content.
const DADOS = {
  'crews/x/crew.yaml': 'name: "x"\n',
  'crews/x/pipeline/steps/02-escrever.md': '---\ninputFile: crews/x/output/pesquisa.md\noutputFile: crews/x/output/post.md\n---\n',
  'crews/x/_memory/memories.md': '# Crew Memory: x\n\n## Estilo de Escrita\n\n- Frases curtas\n',
  'crews/x/_memory/runs.md': `# Run History: x\n\n| Data | Run ID | Tema | Output | Score | Resultado |\n|------|--------|------|--------|-------|-----------|\n| 2026-10-05 | ${RUN} | Tema | Post | 1/1 | Aprovado |\n`,
  // A run of 1.7.0: the research in v1, the post in v2 (each step opened a version folder).
  [`crews/x/output/${RUN}/v1/pesquisa.md`]: '## Fontes\n\n## TL;DR\n- achado\n',
  [`crews/x/output/${RUN}/v2/post.md`]: '# Post\n\nTexto.\n',
  '_opencrew/_memory/company.md': '# Acme — dados reais',
  '_opencrew/_memory/preferences.md': '# opencrew Preferences\n\n- **User Name:** Ana\n',
};
const NOVOS = [['scripts', 'caminho.mjs'], ['scripts', 'caminho', 'nucleo.mjs'], ['scripts', 'caminho', 'disco.mjs'], ['scripts', 'caminho', 'argumentos.mjs']];

/** A 1.7.0 workspace: no path script, the old runner, one crew with a finished run. */
async function workspace170(t) {
  const dir = await mkTmp('upgrade170');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const core = path.join(dir, '_opencrew', 'core');
  await fs.rm(path.join(core, 'scripts', 'caminho.mjs'), { force: true });
  await fs.rm(path.join(core, 'scripts', 'caminho'), { recursive: true, force: true });
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# Pipeline Runner (1.7.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.7.0\n');
  for (const [arquivo, conteudo] of Object.entries(DADOS)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

test('R3-upg-a: update from a 1.7.0 workspace delivers scripts/caminho.mjs; the crews and the memory stay byte for byte', async (t) => {
  const { dir, core } = await workspace170(t);
  const antes = { crews: await snapshot(path.join(dir, 'crews')), memoria: await snapshot(path.join(dir, '_opencrew', '_memory')) };

  await withCwd(dir, () => update());

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.match(await fs.readFile(path.join(core, 'runner.pipeline.md'), 'utf8'), /scripts\/caminho\.mjs "\{name\}" entrada/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes.crews);
  assert.deepEqual(await snapshot(path.join(dir, '_opencrew', '_memory')), antes.memoria);
  for (const [arquivo, conteudo] of Object.entries(DADOS)) assert.equal(await fs.readFile(path.join(dir, arquivo), 'utf8'), conteudo, arquivo);
});

test('R3-upg-b: after update, the installed script finds the input pesquisa.md of the old run in v1', async (t) => {
  const { dir, core } = await workspace170(t);
  await withCwd(dir, () => update());

  // Imported from the WORKSPACE, not from templates/: proves every module arrived together.
  const entregue = pathToFileURL(path.join(core, 'scripts', 'caminho.mjs')).href;
  const { main } = await import(`${entregue}?r3-upg`);
  const rodar = (...argv) => {
    const linhas = [];
    return { code: main(['x', ...argv], { cwd: dir, escrever: (s) => linhas.push(s) }), linhas };
  };
  const antes = await snapshot(path.join(dir, 'crews'));

  assert.deepEqual(rodar('entrada', '--run', RUN, '--arquivo', 'crews/x/output/pesquisa.md'), { code: 0, linhas: [`CAMINHO:OK crews/x/output/${RUN}/v1/pesquisa.md`] });
  assert.deepEqual(rodar('entrada', '--run', RUN, '--arquivo', 'crews/x/output/post.md'), { code: 0, linhas: [`CAMINHO:OK crews/x/output/${RUN}/v2/post.md`] });
  assert.deepEqual(rodar('conferir', '--arquivo', `crews/x/output/${RUN}/v1/pesquisa.md`, '--secoes', '2', '--tldr'), { code: 0, linhas: [`CAMINHO:OK crews/x/output/${RUN}/v1/pesquisa.md`] });
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'reading an old run changes nothing');
});
