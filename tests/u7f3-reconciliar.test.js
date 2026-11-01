// specs/fase-u7-f3-update-que-reconcilia.md — rules 2 to 6: an unedited file of agents/ and config/
// gets the improvement; a skill the user uninstalled stays uninstalled; init and update without the
// version stamp (but with the manifest) carry on as an update; the writers do not write through a
// link; `update --check` says what would go and writes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { templatesDir } from '../src/lib/paths.js';
import { snapshot, withCwd, captureOutput } from './_helpers.js';
import { workspace, manifesto, gravarManifesto, carimboAntigo, entregueAntes, rodar, pastaDeCopia, criarLink, lerOuNada, hashOf, MANIFESTO, CARIMBO } from './_reconciliar.js';

const aqui = (dir, chave) => path.join(dir, ...chave.split('/'));
const doPacote = (...p) => fs.readFile(path.join(templatesDir, ...p), 'utf8');
const AGENTE = '_opencrew/agents/copywriter.agent.md';
const versaoDoPacote = async () => JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

test('U7F3-02a: an unedited agent gets the new text, without a copy, and stays in the manifest with the new hash', async () => {
  const dir = await workspace();
  await entregueAntes(dir, AGENTE, 'texto de uma versão anterior\n');
  await carimboAntigo(dir);
  await rodar(dir);
  const novo = await doPacote('_opencrew', 'agents', 'copywriter.agent.md');
  assert.equal(await lerOuNada(aqui(dir, AGENTE)), novo);
  assert.equal((await manifesto(dir)).files[AGENTE], hashOf(novo));
  assert.equal(await pastaDeCopia(dir), null);
});

test('U7F3-02b: an edited agent stays, and its manifest entry stays too', async () => {
  const dir = await workspace();
  await entregueAntes(dir, AGENTE, 'edição do usuário\n', { registrar: 'o que o OpenCrew entregou\n' });
  await carimboAntigo(dir);
  await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, AGENTE)), 'edição do usuário\n');
  assert.equal((await manifesto(dir)).files[AGENTE], hashOf('o que o OpenCrew entregou\n'));
});

test('U7F3-02c: a crew template is never renewed, edited or not', async () => {
  const dir = await workspace();
  const modelo = 'crews/blog-semanal/discovery.template.yaml';
  await entregueAntes(dir, modelo, 'modelo de uma versão anterior\n');
  await carimboAntigo(dir);
  await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, modelo)), 'modelo de uma versão anterior\n');
});

test('U7F3-02d: a file with no manifest entry stays as it is and is never registered, update after update', async () => {
  const dir = await workspace();
  await entregueAntes(dir, AGENTE, 'texto do usuário num workspace antigo\n', { registrar: null });
  await carimboAntigo(dir);
  for (let i = 0; i < 2; i++) {
    await rodar(dir);
    assert.equal(await lerOuNada(aqui(dir, AGENTE)), 'texto do usuário num workspace antigo\n', `update ${i + 1}`);
    assert.equal(AGENTE in (await manifesto(dir)).files, false, `update ${i + 1}`);
    await carimboAntigo(dir);
  }
});

test('U7F3-03a: an uninstalled skill does not come back, keeps its manifest entries, and the summary says so, update after update', async () => {
  const dir = await workspace();
  await fs.rm(aqui(dir, 'skills/canva'), { recursive: true });
  await carimboAntigo(dir);
  for (let i = 0; i < 2; i++) {
    const { out } = await rodar(dir);
    await assert.rejects(() => fs.stat(aqui(dir, 'skills/canva')), `update ${i + 1}`);
    assert.match(out, /Skill desinstalada, não recriei: canva/, `update ${i + 1}`);
    assert.ok(Object.keys((await manifesto(dir)).files).some((k) => k.startsWith('skills/canva/')), `update ${i + 1}`);
    await carimboAntigo(dir);
  }
});

test('U7F3-03b: a skill folder without SKILL.md is restored; a new skill is created; an uninstalled skill the package dropped leaves the manifest', async () => {
  const dir = await workspace();
  await fs.rm(aqui(dir, 'skills/instagram-publisher/SKILL.md')); // a skill with more files than SKILL.md
  const m = await manifesto(dir);
  for (const k of Object.keys(m.files).filter((k) => k.startsWith('skills/blotato/'))) delete m.files[k];
  m.files['skills/fantasma/SKILL.md'] = hashOf('x\n');
  await fs.rm(aqui(dir, 'skills/blotato'), { recursive: true });
  await gravarManifesto(dir, m);
  await carimboAntigo(dir);
  const { out } = await rodar(dir);
  assert.ok(await lerOuNada(aqui(dir, 'skills/instagram-publisher/SKILL.md')), 'SKILL.md came back');
  assert.ok(await lerOuNada(aqui(dir, 'skills/blotato/SKILL.md')), 'a skill with no entry is new: created');
  assert.equal('skills/fantasma/SKILL.md' in (await manifesto(dir)).files, false);
  assert.doesNotMatch(out, /fantasma/);
});

test('U7F3-04a: init over a workspace without the stamp but with the manifest carries on as an update', async () => {
  const dir = await workspace();
  await fs.writeFile(aqui(dir, '_opencrew/core/runner.pipeline.md'), 'runner de uma versão antiga\n');
  await fs.rm(aqui(dir, CARIMBO));
  const out = await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  assert.match(out, /O carimbo da versão sumiu; refazendo como atualização/);
  assert.match(out, /init --repair-bridges --ide=/);
  assert.equal(await lerOuNada(aqui(dir, '_opencrew/core/runner.pipeline.md')), await doPacote('_opencrew', 'core', 'runner.pipeline.md'));
  assert.equal((await lerOuNada(aqui(dir, CARIMBO))).trim(), await versaoDoPacote());
});

test('U7F3-04b: update without the stamp uses the manifest version; a newer one refuses; without manifest or version it asks for init', async () => {
  const dir = await workspace();
  await fs.writeFile(aqui(dir, '_opencrew/core/runner.pipeline.md'), 'runner velho\n');
  await fs.rm(aqui(dir, CARIMBO));
  const ok = await rodar(dir);
  assert.equal(ok.code, 0);
  assert.equal(await lerOuNada(aqui(dir, '_opencrew/core/runner.pipeline.md')), await doPacote('_opencrew', 'core', 'runner.pipeline.md'));
  assert.equal((await lerOuNada(aqui(dir, CARIMBO))).trim(), await versaoDoPacote());
  assert.match(ok.out, /carimbo/i);

  const novo = await workspace();
  const m = await manifesto(novo);
  m.version = '99.0.0';
  await gravarManifesto(novo, m);
  await fs.rm(aqui(novo, CARIMBO));
  const recusa = await rodar(novo);
  assert.equal(recusa.code, 1);
  assert.match(recusa.out, /mais antigo/);

  for (const sem of ['sem-manifesto', 'sem-versao']) {
    const d = await workspace();
    await fs.rm(aqui(d, CARIMBO));
    if (sem === 'sem-manifesto') await fs.rm(aqui(d, MANIFESTO));
    else await gravarManifesto(d, { files: (await manifesto(d)).files });
    const r = await rodar(d);
    assert.equal(r.code, 1, sem);
    assert.match(r.out, /instalação anterior não terminou/, sem);
  }
});

test('U7F3-05a: no writer writes through a symbolic link: AGENTS.md, .gitignore, .mcp.json, manifest.json, .opencrew-version', async (t) => {
  for (const arquivo of ['AGENTS.md', '.gitignore', '.mcp.json', '_opencrew/manifest.json', '_opencrew/.opencrew-version']) {
    const dir = await workspace();
    const fora = path.join(dir, 'do-usuario.txt');
    const conteudo = arquivo === '.mcp.json' ? '{ "mcpServers": {} }\n' : arquivo.endsWith('manifest.json') ? await fs.readFile(aqui(dir, arquivo), 'utf8') : arquivo.endsWith('version') ? '1.0.0\n' : 'linhas do usuário\n';
    await fs.writeFile(fora, conteudo);
    await fs.rm(aqui(dir, arquivo));
    if (!(await criarLink(fora, aqui(dir, arquivo)))) return t.skip('cannot create symbolic links here');
    if (arquivo !== '_opencrew/.opencrew-version') await carimboAntigo(dir);
    const { out } = await rodar(dir);
    assert.equal(await lerOuNada(fora), conteudo, arquivo);
    assert.ok((await fs.lstat(aqui(dir, arquivo))).isSymbolicLink(), arquivo);
    assert.match(out, /link simbólico: não gravei/, arquivo);
  }
});

test('U7F3-06a: update --check (and --dry-run) says what would go and which skills are uninstalled, and writes nothing', async () => {
  const dir = await workspace();
  await entregueAntes(dir, '_opencrew/core/prompts/obsoleto.md', 'x\n');
  await fs.rm(aqui(dir, 'skills/canva'), { recursive: true });
  await carimboAntigo(dir);
  const antes = await snapshot(dir);
  for (const opcoes of [{ check: true }, { 'dry-run': true, check: true }]) {
    const { out } = await rodar(dir, opcoes);
    assert.ok(out.includes('_opencrew/core/prompts/obsoleto.md'), JSON.stringify(opcoes));
    assert.match(out, /Skill desinstalada, não recriarei: canva/, JSON.stringify(opcoes));
    assert.deepEqual(await snapshot(dir), antes, JSON.stringify(opcoes));
  }
});

// ── Extra cases found by the independent review of the code (2026-11-01) ───────────────────────

test('U7F3-02e: an agent already equal to the package, with an older hash in the manifest, is not copied and gets the new hash', async () => {
  const dir = await workspace();
  const novo = await doPacote('_opencrew', 'agents', 'copywriter.agent.md');
  await entregueAntes(dir, AGENTE, novo, { registrar: 'hash de uma versão anterior\n' });
  await carimboAntigo(dir);
  await rodar(dir);
  assert.equal(await lerOuNada(aqui(dir, AGENTE)), novo);
  assert.equal((await manifesto(dir)).files[AGENTE], hashOf(novo));
  assert.equal(await pastaDeCopia(dir), null);
});

test('U7F3-04c: a manifest version that is not a version (junk) is no installed version: update asks for init', async () => {
  for (const lixo of ['abc', 1, {}, '1.5', true, '1.19.5-beta']) {
    const dir = await workspace();
    await fs.rm(aqui(dir, CARIMBO));
    await gravarManifesto(dir, { version: lixo, files: (await manifesto(dir)).files });
    const r = await rodar(dir);
    assert.equal(r.code, 1, JSON.stringify(lixo));
    assert.match(r.out, /instalação anterior não terminou/, JSON.stringify(lixo));
    assert.doesNotMatch(r.out, /\[object Object\]/, JSON.stringify(lixo));
  }
});

test('U7F3-05b: init does not write the manifest or the stamp through a dangling link, and says so', async (t) => {
  // On Windows a dangling link counts as an existing file, so a dangling STAMP cannot leave the workspace
  // "partial" there (init sees it complete and refuses): that case runs where it can arise.
  const alvos = process.platform === 'win32' ? [MANIFESTO] : [MANIFESTO, CARIMBO];
  for (const arquivo of alvos) {
    const dir = await workspace();
    await fs.rm(aqui(dir, MANIFESTO));
    await fs.rm(aqui(dir, CARIMBO));
    if (!(await criarLink(path.join(dir, 'alvo-do-link.txt'), aqui(dir, arquivo)))) return t.skip('cannot create symbolic links here');
    const out = await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
    assert.equal(await lerOuNada(path.join(dir, 'alvo-do-link.txt')), null, `${arquivo}: nothing was created on the other side of the link`);
    assert.match(out, /link simbólico: não gravei/, arquivo);
  }
});
