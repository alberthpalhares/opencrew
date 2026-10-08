// AGENTS.md rule 14 for U5, slice 3 (specs/fase-u5c-execucao-registrada.md, U5c-upg-a): a 1.13.0
// workspace with a crew that has a history and old run folders gets the run record with one
// `update`; nothing under crews/ changes, and the delivered scripts — run from the workspace — work.
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

// What 1.14.0 brings: none of it is in a 1.13.0 workspace.
const NOVOS = [['scripts', 'execucao.mjs'], ['scripts', 'execucao'], ['scripts', 'caminho', 'crew.mjs'], ['scripts', 'conserto', 'historico.mjs'], ['runner', 'retomar.md']];
const RUNS = '# Run History: Atas\n\n| Data | Run ID | Tema | Output | Score | Resultado |\n|------|--------|------|--------|-------|-----------|\n| 2026-10-01 | 2026-10-01-090000 | Edital | Edital | 8,2 | Aprovado |\n';
const DADOS = {
  ...ANTIGA,
  [`${CREW}/_memory/runs.md`]: RUNS,
  [`${CREW}/output/2026-10-01-090000/v1/edital.md`]: '# Edital\n',
  [`${CREW}/output/2026-09-12-revisao/v1/regimento.md`]: '# Regimento\n',
};

async function workspace1130(t) {
  const dir = await mkTmp('upgrade-u5c');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo), { recursive: true, force: true });
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# opencrew Pipeline Runner (1.13.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.13.0\n');
  for (const [arquivo, conteudo] of Object.entries(DADOS)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

async function rodar(core, script, dir, argv) {
  const { main } = await import(`${pathToFileURL(path.join(core, 'scripts', script)).href}?u5c-upg`);
  const linhas = [];
  const code = await main(argv, { cwd: dir, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas, fim: linhas.at(-1) };
}

test('U5c-upg-a: update from 1.13.0 delivers execucao.mjs and runner/retomar.md; crews/ is untouched; an old run is not resumable', async (t) => {
  const { dir, core } = await workspace1130(t);
  const antes = await snapshot(path.join(dir, 'crews'));

  await captureOutput(() => withCwd(dir, () => update()));

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.match(await fs.readFile(path.join(core, 'runner.pipeline.md'), 'utf8'), /execucao\.mjs "\{name\}" fechar/);
  assert.match(await fs.readFile(path.join(core, 'system.md'), 'utf8'), /\/opencrew retomar <name>/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  // Imported from the WORKSPACE, not from templates/: proves every module arrived together.
  assert.deepEqual((await rodar(core, 'execucao.mjs', dir, ['atas', 'retomar'])).linhas, ['EXECUCAO:NADA']);
  const diagnostico = await rodar(core, 'conserto.mjs', dir, ['--crew', CREW]);
  assert.ok(diagnostico.linhas.includes('[historico] 1 execução sem linha no histórico.'), diagnostico.linhas.join('\n'));
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'reading the history changes nothing');
});

test('U5c-upg-a: after the update a new run of the old crew is recorded, closed into the old runs.md and leaves the old rows as they were', async (t) => {
  const { dir, core } = await workspace1130(t);
  await captureOutput(() => withCwd(dir, () => update()));

  const pasta = await rodar(core, 'caminho.mjs', dir, ['atas', 'pasta', '--run', '2026-10-08-101500', '--tema', 'Ata de outubro']);
  assert.equal(pasta.fim, `CAMINHO:OK ${CREW}/output/2026-10-08-101500`);
  await rodar(core, 'execucao.mjs', dir, ['atas', 'marcar', '--run', '2026-10-08-101500', '--passo', '4', '--evento', 'checkpoint', '--resultado', 'aprovado']);
  assert.equal((await rodar(core, 'execucao.mjs', dir, ['atas', 'retomar'])).fim, 'EXECUCAO:RETOMAR 2026-10-08-101500 5');
  const fecho = await rodar(core, 'execucao.mjs', dir, ['atas', 'fechar', '--run', '2026-10-08-101500', '--resultado', 'aprovado', '--saida', 'Ata']);
  assert.equal(fecho.fim, 'EXECUCAO:FECHADA aprovado 1/1');
  const [topo, resto] = [RUNS.slice(0, RUNS.indexOf('| 2026-10-01')), RUNS.slice(RUNS.indexOf('| 2026-10-01'))];
  assert.equal(await fs.readFile(path.join(dir, CREW, '_memory', 'runs.md'), 'utf8'), `${topo}| 2026-10-08 | 2026-10-08-101500 | Ata de outubro | Ata | 1/1 | Aprovado |\n${resto}`);
});
