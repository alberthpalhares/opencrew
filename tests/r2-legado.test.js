// specs/fase-r2-update-e-envio-seguros.md — R2-01e..R2-01g (rule 3): up to 1.2.2 the five
// bridges with no frontmatter were written as WHOLE files, telling the AI to adopt the OpenCrew
// role always. `update` and `init --repair-bridges` take that old text out of what is outside
// the marked block — only when it is exactly what was generated, and with a copy of the whole
// file; an edited one is left alone and reported. The old texts are written out here on
// purpose (spec §13): they are what `git show v1.2.2:src/lib/ides.js` generates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { workspace, cli, COMANDOS, ler, gravar, crlf, copias, semData, lerCopia } from './_r2-pontes.js';

const CORPO = 'Read `AGENTS.md` at the project root and adopt the opencrew system role.\n'
  + 'Follow all initialization, command routing, and workflow instructions defined there.\n\n'
  + 'If invoked with arguments (e.g. `/opencrew create ...`, `/opencrew run ...`),\n'
  + 'route to the matching action from the Command Routing table in AGENTS.md.\n'
  + 'If invoked without arguments, show the Main Menu.\n';
const LEGADO = {
  'CLAUDE.md': '# opencrew — Project Instructions\n\n'
    + 'This project uses **opencrew**, a multi-agent orchestration framework.\n'
    + 'The full system definition lives in `AGENTS.md` — read it and adopt that role.\n\n'
    + 'Type `/opencrew` to open the main menu.\n\n'
    + '## Notes for Claude Code\n\n'
    + '- All checkpoint questions use `AskUserQuestion`.\n'
    + '- opencrew ships its own Playwright MCP (`.mcp.json`); disable the native Playwright plugin.\n'
    + "- Do not manually edit files under `_opencrew/core/` unless you know what you're doing.\n",
  'GEMINI.md': `# opencrew — Gemini CLI\n\n${CORPO}`,
  'QWEN.md': `# opencrew — Qwen Code\n\n${CORPO}`,
  '.github/copilot-instructions.md': `# opencrew — Copilot Instructions\n\n${CORPO}`,
  '.trae/rules/opencrew.md': `# opencrew — Trae\n\n${CORPO}`,
};
const TAMANHOS = { 'CLAUDE.md': 484, 'GEMINI.md': 386, 'QWEN.md': 385, '.github/copilot-instructions.md': 396, '.trae/rules/opencrew.md': 380 };
const ARQUIVOS = Object.keys(LEGADO).sort();
const IDES_DAS_5 = ['claude-code', 'gemini', 'qwen', 'copilot', 'trae'];
const ANTES = '# Regras da equipe\n\nUse TypeScript.\n';
const DEPOIS = '## Mais regras\n\nNunca use `any`.\n';

const removi = (arquivo, copia) => `${arquivo}: removi o texto antigo do OpenCrew (instalações até a 1.2.2), que mandava adotar o papel do OpenCrew sempre. O bloco novo ficou no lugar e o resto do arquivo não mudou. Cópia em .opencrew-backup/${copia}.`;
const aviso = (arquivo) => `${arquivo} ainda tem um texto antigo do OpenCrew, alterado depois da instalação, que manda adotar o papel do OpenCrew sempre. Não mexi nele. Para o OpenCrew só agir quando chamado, apague à mão o trecho que começa em \`# opencrew — …\` fora do bloco \`opencrew:start\` / \`opencrew:end\`.`;
const MEXEU = /removi o texto antigo|ainda tem um texto antigo/;

// The five files of `dir`, path → content. Right after `workspace()` they are a new install.
const lerAs5 = async (dir) => Object.fromEntries(await Promise.all(ARQUIVOS.map(async (a) => [a, await ler(dir, a)])));
async function gravarAs5(dir, montar) {
  for (const arquivo of ARQUIVOS) await gravar(dir, arquivo, montar(arquivo));
  return lerAs5(dir);
}

test('R2-01e: the old texts written here have the size of what 1.2.2 generated', () => {
  assert.deepEqual(Object.fromEntries(ARQUIVOS.map((a) => [a, LEGADO[a].length])), Object.fromEntries(ARQUIVOS.map((a) => [a, TAMANHOS[a]])));
});

const ESTADOS = [
  ['a workspace up to 1.2.2 (5 whole bridges, no marker, no manifest)', 'update', async (dir) => {
    await fs.rm(path.join(dir, '_opencrew', 'manifest.json'));
    await gravar(dir, '_opencrew/.opencrew-version', '1.2.2\n');
    return gravarAs5(dir, (arquivo) => LEGADO[arquivo]);
  }],
  ['"block + old text", as the update of 1.6.0 to 1.6.2 left it', 'update', (dir, novo) => gravarAs5(dir, (a) => `${novo[a]}\n${LEGADO[a]}`)],
  ['"block + old text"', 'init --repair-bridges', (dir, novo) => gravarAs5(dir, (a) => `${novo[a]}\n${LEGADO[a]}`)],
];

for (const [estado, comando, preparar] of ESTADOS) {
  test(`R2-01e: ${estado} — ${comando} leaves each file equal to a new install, with a copy; the second run copies nothing`, async () => {
    const dir = await workspace(IDES_DAS_5);
    const novo = await lerAs5(dir);
    const antes = await preparar(dir, novo);

    const { out, code } = await cli(dir, ...COMANDOS[comando]);

    assert.equal(code, 0);
    const feitas = await copias(dir);
    assert.deepEqual(feitas.map(semData), ARQUIVOS, 'one copy of each of the five files, and of nothing else');
    for (const copia of feitas) {
      const arquivo = semData(copia);
      const depois = await ler(dir, arquivo);
      assert.equal(depois, novo[arquivo], `${arquivo}: equal to the file of a new install`);
      assert.doesNotMatch(depois, /adopt/);
      assert.equal(await lerCopia(dir, copia), antes[arquivo], `${copia}: the file as it was`);
      assert.ok(out.includes(removi(arquivo, copia)), `${arquivo}: sentence of the spec missing:\n${out}`);
      assert.ok(!out.includes(`${arquivo} (só o bloco`), `${arquivo}: more than the block changed`);
    }

    const segundo = await cli(dir, ...COMANDOS[comando]);
    assert.deepEqual(await copias(dir), feitas, 'the second run copies nothing');
    assert.doesNotMatch(segundo.out, MEXEU);
  });
}

// [case, file, the file before (new = the file of a new install), the file after]
const ENTRE_TEXTOS = [
  ['no block yet', 'GEMINI.md', (novo, legado) => `${ANTES}\n${legado}\n${DEPOIS}`, (novo) => `${novo}\n${ANTES}\n\n${DEPOIS}`],
  ['no block yet, in CRLF', '.github/copilot-instructions.md', (novo, legado) => crlf(`${ANTES}\n${legado}\n${DEPOIS}`), (novo) => crlf(`${novo}\n${ANTES}\n\n${DEPOIS}`)],
  ['under its block, in CRLF', 'CLAUDE.md', (novo, legado) => crlf(`${novo}\n${ANTES}\n${legado}\n${DEPOIS}`), (novo) => crlf(`${novo}\n${ANTES}\n\n${DEPOIS}`)],
  ['old text last, in CRLF: the file ends where the user text ends', 'QWEN.md', (novo, legado) => crlf(`${ANTES}\n${legado}`), (novo) => crlf(`${novo}\n${ANTES}`)],
];

for (const [caso, arquivo, montar, esperado] of ENTRE_TEXTOS) {
  test(`R2-01f: old text next to user text in ${arquivo} (${caso}) — update takes it out and the user text does not change`, async () => {
    const dir = await workspace(IDES_DAS_5);
    const novo = await ler(dir, arquivo);
    const original = montar(novo, LEGADO[arquivo]);
    await gravar(dir, arquivo, original);

    const { out } = await cli(dir, 'update');

    assert.equal(await ler(dir, arquivo), esperado(novo));
    const feitas = await copias(dir);
    assert.deepEqual(feitas.map(semData), [arquivo]);
    assert.equal(await lerCopia(dir, feitas[0]), original, 'the copy holds the whole file as it was');
    assert.ok(out.includes(removi(arquivo, feitas[0])), out);
  });
}

// 1.3.0 to 1.5.0 wrote the same text INSIDE the markers: that is the block, replaced as a block.
test('R2-01f: the old text inside the marked block is not "old text outside the block" — only the block rule acts', async () => {
  const dir = await workspace(IDES_DAS_5);
  const novo = await ler(dir, 'GEMINI.md');
  const [inicio, fim] = ['<!-- opencrew:start -->', '<!-- opencrew:end -->'];
  const original = `${inicio}\n${LEGADO['GEMINI.md']}${fim}\n\n${ANTES}`;
  await gravar(dir, 'GEMINI.md', original);

  const { out } = await cli(dir, 'update');

  assert.equal(await ler(dir, 'GEMINI.md'), `${novo}\n${ANTES}`);
  assert.doesNotMatch(out, MEXEU);
  assert.ok(out.includes('GEMINI.md (só o bloco do OpenCrew foi regravado; o resto do arquivo não mudou)'), out);
});

// One line of the generated text changed by the user: the last one got a sentence more.
const editado = (arquivo) => `${LEGADO[arquivo].trimEnd()} Sempre em português.\n`;

for (const [comando, argv] of Object.entries(COMANDOS)) {
  test(`R2-01g: old text with one line edited — ${comando} changes nothing and warns with the path of each file`, async () => {
    const dir = await workspace(IDES_DAS_5);
    const novo = await lerAs5(dir);
    const antes = await gravarAs5(dir, (a) => `${novo[a]}\n${editado(a)}`);

    const { out, code } = await cli(dir, ...argv);

    assert.equal(code, 0);
    assert.deepEqual(await lerAs5(dir), antes, 'neither the block (already the new one) nor the edited text changes');
    assert.deepEqual(await copias(dir), []);
    for (const arquivo of ARQUIVOS) assert.ok(out.includes(aviso(arquivo)), `${arquivo}: warning missing:\n${out}`);
    assert.doesNotMatch(out, /removi o texto antigo/);
  });
}

test('R2-01g: edited old text in a file with no block yet — update puts the block on top and leaves the rest as it was', async () => {
  const dir = await workspace(IDES_DAS_5);
  const novo = await lerAs5(dir);
  await gravarAs5(dir, editado);

  const { out } = await cli(dir, 'update');

  for (const arquivo of ARQUIVOS) {
    assert.equal(await ler(dir, arquivo), `${novo[arquivo]}\n${editado(arquivo)}`, `${arquivo}: outside the block nothing changes`);
    assert.ok(out.includes(aviso(arquivo)), `${arquivo}: warning missing:\n${out}`);
  }
  assert.deepEqual(await copias(dir), [], 'nothing of the user was replaced: no copy');
});

test('R2-01g: the title alone or the sentence with "adopt" alone is enough for the warning; user text without them gets none', async () => {
  const dir = await workspace(IDES_DAS_5);
  const novo = await lerAs5(dir);
  const [titulo, , frase] = LEGADO['GEMINI.md'].split('\n');
  const antes = {
    'GEMINI.md': `${novo['GEMINI.md']}\n${titulo}\n\nTexto meu no lugar do antigo.\n`,
    'QWEN.md': `${novo['QWEN.md']}\n## Minhas notas\n\n${frase}\n`,
    'CLAUDE.md': `${novo['CLAUDE.md']}\n## Minhas notas\n\nUso o OpenCrew só para as crews de conteúdo.\n`,
  };
  for (const [arquivo, texto] of Object.entries(antes)) await gravar(dir, arquivo, texto);

  const { out } = await cli(dir, 'update');

  for (const [arquivo, texto] of Object.entries(antes)) assert.equal(await ler(dir, arquivo), texto);
  assert.ok(out.includes(aviso('GEMINI.md')), out);
  assert.ok(out.includes(aviso('QWEN.md')), out);
  assert.ok(!out.includes('CLAUDE.md ainda tem'), out);
  assert.deepEqual(await copias(dir), []);
});
