// AGENTS.md rule 14 for U4, slice 1 (specs/fase-u4a-conserto-de-crews.md: U4a-upg-a, U4a-04a and
// U4a-04b): a 1.10.0 workspace with an old crew gets the repair with one `update`, the crew is
// not touched, and the delivered script — run from the workspace, not from templates/ — reads it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { REPAIR_HINT } from '../src/lib/resumo.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA, CREW } from './_conserto.js';

// What 1.11.0 brings: none of it is in a 1.10.0 workspace.
const NOVOS = [['scripts', 'conserto.mjs'], ['scripts', 'conserto'], ['formato-da-crew.md']];

async function workspace1100(t, arquivos = ANTIGA) {
  const dir = await mkTmp('upgrade-u4a');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo), { recursive: true, force: true });
  await fs.writeFile(path.join(core, 'prompts', 'repair.prompt.md'), '# Repair — Fix Crew Agent Names / Manifest (1.10.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.10.0\n');
  for (const [arquivo, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

const atualizar = (dir) => captureOutput(() => withCwd(dir, () => update()));

test('U4a-upg-a: update from 1.10.0 delivers the repair script, the format file and the new prompt; the crew is untouched and the delivered script reads it', async (t) => {
  const { dir, core } = await workspace1100(t);
  const antes = await snapshot(path.join(dir, 'crews'));

  await atualizar(dir);

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.match(await fs.readFile(path.join(core, 'prompts', 'repair.prompt.md'), 'utf8'), /conserto\.mjs --crew/);
  assert.match(await fs.readFile(path.join(core, 'system.md'), 'utf8'), /architect\.agent\.yaml/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  const { main } = await import(`${pathToFileURL(path.join(core, 'scripts', 'conserto.mjs')).href}?u4a-upg`);
  const linhas = [];
  const code = main(['--crew', CREW], { cwd: dir, escrever: (s) => linhas.push(s) });
  assert.equal(code, 0);
  assert.equal(linhas.at(-1), 'CONSERTO:PENDENTE');
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'the diagnosis wrote under crews/');
});

test('U4a-04b: with a crew the update summary ends with the repair hint; with only the template folders it does not', async (t) => {
  const comCrew = await workspace1100(t);
  assert.ok((await atualizar(comCrew.dir)).includes(REPAIR_HINT));
  assert.equal(REPAIR_HINT, 'Para levar as melhorias novas às crews que você já tem, peça na sua IDE: /opencrew repair');

  const semCrew = await workspace1100(t, {});
  assert.equal(await exists(path.join(semCrew.dir, 'crews', 'blog-semanal', 'discovery.template.yaml')), true);
  assert.ok(!(await atualizar(semCrew.dir)).includes(REPAIR_HINT));
});

test('U4a-04a: init with --ide and --yes (or --all) installs only the listed IDE; --yes alone installs all', async (t) => {
  for (const extra of [{ yes: true }, { all: true }]) {
    const dir = await mkTmp('init-u4a');
    t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
    await captureOutput(() => withCwd(dir, () => init({ ide: ['codex'], ...extra })));
    assert.equal(await exists(path.join(dir, '.agents', 'skills', 'opencrew', 'SKILL.md')), true, 'the Codex bridge');
    for (const outro of ['CLAUDE.md', 'GEMINI.md', 'QWEN.md', '.cursor', '.claude', '.github']) {
      assert.equal(await exists(path.join(dir, outro)), false, `${outro} with ${JSON.stringify(extra)}`);
    }
  }
  const todas = await mkTmp('init-u4a');
  t.after(() => fs.rm(todas, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(todas, () => init({ yes: true })));
  for (const ponte of ['CLAUDE.md', 'GEMINI.md', 'QWEN.md']) assert.equal(await exists(path.join(todas, ponte)), true, ponte);
});
