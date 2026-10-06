// specs/fase-r2-update-e-envio-seguros.md — R2-02g, R2-02h (rule 12): a manifest that exists
// but cannot be used (not JSON, or `files` is not an object with at least one entry) is told
// apart from a missing one. `update` warns, copies whatever differs, rewrites the record and
// goes on to the end; `init --repair-bridges` copies what differs, leaves the record as it is
// and points to `update`. A missing manifest behaves as before. No technical error in English.
// The messages of spec §6 are written out here, not imported from src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { templatesDir } from '../src/lib/paths.js';
import { snapshot } from './_helpers.js';
import {
  workspace, cli, ler, gravar, copias, semData, lerCopia, registro, sha256, lf, versaoDoPacote,
  MANIFESTO, CARIMBO, SKILL,
} from './_r2-mcp.js';

const AVISO = 'O registro de arquivos (`_opencrew/manifest.json`) está ilegível. Vou tratar esta atualização como a de um projeto sem registro: todo arquivo diferente do pacote novo é copiado para `.opencrew-backup/` antes de ser substituído. O registro é refeito no fim.';
const RESUMO = 'O registro estava ilegível: guardamos tudo o que diferia do pacote novo. Daqui em diante, só o que você editar.';
const REPARO = 'O registro de arquivos (`_opencrew/manifest.json`) está ilegível; o reparo não o refaz. Rode `npx @aksp/opencrew@latest update` para refazer.';
const PRIMEIRA = 'Primeira atualização com proteção';
const MINHA_SKILL = 'minha versão da skill';

const ILEGIVEIS = {
  'text that is not JSON (git conflict markers)': '<<<<<<< HEAD\n{"version":"1.6.2","files":{}}\n=======\n{"version":"1.6.1","files":{}}\n>>>>>>> outra\n',
  'a file cut in the middle': '{\n  "version": "1.6.2",\n  "files": {\n    "AGENTS.md#opencrew": "ab',
  '`files: null`': '{"version":"1.6.2","files":null}',
  '`files: []`': '{"version":"1.6.2","files":[]}',
  '`files: {}`': '{"version":"1.6.2","files":{}}',
  '`files` as a list': '{"version":"1.6.2","files":["skills/resend/SKILL.md"]}',
  'no `files`': '{"version":"1.6.2"}',
};

const PONTE = '.claude/skills/opencrew/SKILL.md';
const PONTE_ANTIGA = '---\nname: opencrew\n---\n\nRead `AGENTS.md` (ponte antiga)\n';
const skillDoPacote = () => fs.readFile(path.join(templatesDir, SKILL), 'utf8');

for (const [caso, manifesto] of Object.entries(ILEGIVEIS)) {
  test(`R2-02g: manifest with ${caso} and an edited skill — update warns, copies the skill, rewrites the record and goes on to the end`, async () => {
    const dir = await workspace();
    await gravar(dir, MANIFESTO, manifesto);
    await gravar(dir, SKILL, MINHA_SKILL);
    await gravar(dir, CARIMBO, '1.0.0\n');

    const { out, code } = await cli(dir, 'update');

    assert.equal(code, 0);
    assert.ok(out.includes(AVISO), out);
    assert.ok(out.indexOf(AVISO) < out.lastIndexOf(SKILL), 'the warning comes before the list of what was replaced');
    const feitas = await copias(dir);
    assert.deepEqual(feitas.map(semData), [SKILL], 'copied as in a project with no record: what differs, and only that');
    assert.equal(await lerCopia(dir, feitas[0]), MINHA_SKILL);
    assert.equal(await ler(dir, SKILL), await skillDoPacote());
    assert.ok(out.includes(RESUMO), out);
    for (const falso of ['Cannot read properties', PRIMEIRA, 'que você tinha editado']) {
      assert.ok(!out.includes(falso), `"${falso}" must not be said:\n${out}`);
    }
    const refeito = await registro(dir); // valid JSON again
    assert.equal(refeito[SKILL], sha256(lf(await skillDoPacote())));
    assert.equal(typeof refeito['AGENTS.md#opencrew'], 'string');
    assert.equal((await ler(dir, CARIMBO)).trim(), await versaoDoPacote());
  });
}

test('R2-02g: unreadable manifest and nothing that differs — the warning comes, nothing is copied and the record is rewritten', async () => {
  const dir = await workspace();
  await gravar(dir, MANIFESTO, ILEGIVEIS['`files: null`']);

  const { out, code } = await cli(dir, 'update');

  assert.equal(code, 0);
  assert.ok(out.includes(AVISO), out);
  assert.deepEqual(await copias(dir), []);
  assert.ok(!out.includes(RESUMO), 'no copy, no sentence about what was kept');
  assert.equal(typeof (await registro(dir))[SKILL], 'string');

  const segundo = await cli(dir, 'update');
  assert.ok(!segundo.out.includes('ilegível'), 'the record is readable again');
});

test('R2-02g: with the manifest missing, the first-protected-update sentence stays and nothing says "ilegível"', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, MANIFESTO));
  await gravar(dir, SKILL, MINHA_SKILL);

  const { out, code } = await cli(dir, 'update');

  assert.equal(code, 0);
  assert.ok(out.includes(PRIMEIRA), out);
  assert.ok(!out.includes('ilegível'), out);
  assert.deepEqual((await copias(dir)).map(semData), [SKILL]);
});

for (const caso of ['`files: null`', 'text that is not JSON (git conflict markers)']) {
  test(`R2-02h: repair with ${caso} and a bridge that differs — exit 0, the bridge is copied, the line points to update`, async () => {
    const dir = await workspace();
    const doPacote = await ler(dir, PONTE);
    await gravar(dir, MANIFESTO, ILEGIVEIS[caso]);
    await gravar(dir, PONTE, PONTE_ANTIGA);

    const { out, code } = await cli(dir, 'init', '--repair-bridges');

    assert.equal(code, 0);
    assert.ok(!out.includes('Cannot read properties'), out);
    assert.equal(await ler(dir, PONTE), doPacote);
    const feitas = await copias(dir);
    assert.deepEqual(feitas.map(semData), [PONTE]);
    assert.equal(await lerCopia(dir, feitas[0]), PONTE_ANTIGA);
    assert.ok(out.includes(REPARO), out);
    assert.equal(await ler(dir, MANIFESTO), ILEGIVEIS[caso], 'the repair does not rewrite the record');
  });
}

test('R2-02h: repair with `files: null` and every bridge equal to the package — the manifest is not rewritten', async () => {
  const dir = await workspace();
  await gravar(dir, MANIFESTO, ILEGIVEIS['`files: null`']);
  const antes = await snapshot(dir);

  const { out, code } = await cli(dir, 'init', '--repair-bridges');

  assert.equal(code, 0);
  assert.deepEqual(await snapshot(dir), antes, 'nothing changes: not the manifest, not the bridges');
  assert.ok(out.includes(REPARO), out);
});

for (const [caso, preparar] of [['missing', (dir) => fs.rm(path.join(dir, MANIFESTO))], ['valid', () => {}]]) {
  test(`R2-02h: repair with the manifest ${caso} says nothing about an unreadable record`, async () => {
    const dir = await workspace();
    await preparar(dir);
    await gravar(dir, PONTE, PONTE_ANTIGA);

    const { out, code } = await cli(dir, 'init', '--repair-bridges');

    assert.equal(code, 0);
    assert.ok(!out.includes('ilegível'), out);
    assert.deepEqual((await copias(dir)).map(semData), [PONTE]);
  });
}
