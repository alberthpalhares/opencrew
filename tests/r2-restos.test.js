// specs/fase-r2-update-e-envio-seguros.md — R2-03f to R2-03h (rule 16): what an old OpenSquad
// install left behind is only reported, never deleted nor changed. The warning comes back at
// every `update`, tells a bridge of the OpenSquad (by its name) from a file that only cites
// `_opensquad/` (it may be the user's), and covers seven exact paths. It does not come out in
// `update --check`, nor when `_opensquad` exists at the project root.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot } from './_helpers.js';
import { workspace, cli, gravar, copias } from './_r2-mcp.js';

const CABECALHO = (n) => `${n} resto(s) de uma instalação antiga do OpenSquad (a pasta \`_opensquad/\` não existe neste projeto). Nada foi apagado:`;
const PONTE = (caminho) => `${caminho} — ponte do OpenSquad; o OpenCrew não usa este arquivo.`;
const CITA = (caminho) => `${caminho} — cita \`_opensquad/\`; confira antes de apagar, pode ser um arquivo seu.`;
const FIM = 'Se você não usa mais o OpenSquad, pode apagar as pontes listadas. Este aviso volta a cada `update` enquanto os arquivos existirem.';
const PLAYWRIGHT = (caminho) => `O servidor \`playwright\` do \`.mcp.json\` aponta para \`${caminho}\`, que não existe neste projeto (resto do OpenSquad). Não alterei o arquivo.`;

const SETE = [
  '.cursor/rules/opensquad.mdc',
  '.cursor/commands/opensquad.md',
  '.opencode/commands/opensquad.md',
  '.qwen/skills/opensquad/SKILL.md',
  '.trae/rules/opensquad.md',
  '.github/prompts/opensquad.prompt.md',
  '.agents/skills/opensquad/SKILL.md',
];
const DA_PONTE = '.gemini/skills/opensquad/SKILL.md';
const DO_USUARIO = '.claude/skills/minha/SKILL.md';
const CONFIG = '_opensquad/config/playwright.config.json';

const tem = (out, frase) => assert.ok(out.includes(frase), `faltou "${frase}" em:\n${out}`);
const naoTem = (out, frase) => assert.ok(!out.includes(frase), `sobrou "${frase}" em:\n${out}`);
const mcp = (args) => `${JSON.stringify({ mcpServers: { playwright: { command: 'npx', args } } }, null, 2)}\n`;
// What the user has, without what `update` itself rewrites (manifest, stamp).
const semRegistro = async (dir) => (await snapshot(dir)).filter((l) => !l.startsWith(`_opencrew${path.sep}`));

async function comRestos() {
  const dir = await workspace();
  await gravar(dir, DA_PONTE, 'Read `_opensquad/core/system.md`\n');
  await gravar(dir, DO_USUARIO, 'Nota minha: migrei de `_opensquad/` para o OpenCrew.\n');
  return dir;
}

// ── R2-03f The text: total, bridge × file that only cites, final line ────────────────────────

test('R2-03f: dois update: cabeçalho com o total, "ponte do OpenSquad", "confira antes de apagar" e a linha final; nada muda', async () => {
  const dir = await comRestos();
  const antes = await semRegistro(dir);
  for (const vez of [1, 2]) {
    const { out, code } = await cli(dir, 'update');
    assert.equal(code, 0, `update ${vez}`);
    tem(out, CABECALHO(2));
    tem(out, PONTE(DA_PONTE));
    tem(out, CITA(DO_USUARIO));
    tem(out, FIM);
    for (const falso of ['com segurança', 'Ponte antiga encontrada', 'aponta para _opensquad/', PONTE(DO_USUARIO)]) naoTem(out, falso);
  }
  assert.deepEqual(await semRegistro(dir), antes);
  assert.deepEqual(await copias(dir), []);
});

test('R2-03f: sem restos, nenhuma linha do aviso', async () => {
  const dir = await workspace();
  const { out } = await cli(dir, 'update');
  for (const frase of ['resto(s)', 'OpenSquad', FIM]) naoTem(out, frase);
});

// ── R2-03g The seven exact paths; silence with `_opensquad/` and in --check ───────────────────

for (const caminho of SETE) {
  test(`R2-03g: ${caminho} entra no aviso, pelo caminho exato, e não muda`, async () => {
    const dir = await workspace();
    await gravar(dir, caminho, 'ponte que não cita a pasta antiga\n');
    const { out } = await cli(dir, 'update');
    tem(out, CABECALHO(1));
    tem(out, PONTE(caminho));
    tem(out, FIM);
    assert.equal(await fs.readFile(path.join(dir, caminho), 'utf8'), 'ponte que não cita a pasta antiga\n');
  });
}

test('R2-03g: os sete juntos, um deles citando _opensquad/: sete linhas, nenhuma repetida', async () => {
  const dir = await workspace();
  for (const caminho of SETE) await gravar(dir, caminho, 'Read `_opensquad/core/system.md`\n');
  const { out } = await cli(dir, 'update');
  tem(out, CABECALHO(7));
  for (const caminho of SETE) assert.equal(out.split(PONTE(caminho)).length - 1, 1, caminho);
});

test('R2-03g: com _opensquad/ na raiz, nenhum aviso', async () => {
  const dir = await comRestos();
  for (const caminho of SETE) await gravar(dir, caminho, 'ponte\n');
  await gravar(dir, '.mcp.json', mcp(['@playwright/mcp@latest', '--config', CONFIG]));
  await fs.mkdir(path.join(dir, '_opensquad'));
  const { out, code } = await cli(dir, 'update');
  assert.equal(code, 0);
  for (const frase of ['resto(s)', 'ponte do OpenSquad', 'confira antes de apagar', FIM, 'resto do OpenSquad']) naoTem(out, frase);
});

test('R2-03g: update --check não mostra o aviso e não escreve nada', async () => {
  const dir = await comRestos();
  await gravar(dir, '.mcp.json', mcp(['@playwright/mcp@latest', '--config', CONFIG]));
  const antes = await snapshot(dir);
  const { out } = await cli(dir, 'update', '--check');
  for (const frase of ['resto(s)', 'OpenSquad', DA_PONTE]) naoTem(out, frase);
  assert.deepEqual(await snapshot(dir), antes);
});

// ── R2-03h The Playwright server that still points to `_opensquad/` ──────────────────────────

for (const args of [['@playwright/mcp@latest', '--config', CONFIG], ['@playwright/mcp@latest', `--config=${CONFIG}`]]) {
  test(`R2-03h: playwright com ${args.slice(1).join(' ')}, inexistente: sai o aviso e o arquivo não muda`, async () => {
    const dir = await workspace();
    await gravar(dir, '.mcp.json', mcp(args));
    for (const vez of [1, 2]) {
      const { out, code } = await cli(dir, 'update');
      assert.equal(code, 0, `update ${vez}`);
      tem(out, PLAYWRIGHT(CONFIG));
      naoTem(out, 'resto(s) de uma instalação');
    }
    assert.equal(await fs.readFile(path.join(dir, '.mcp.json'), 'utf8'), mcp(args));
    assert.deepEqual(await copias(dir), []);
  });
}

test('R2-03h: playwright do OpenCrew, ou de outro sistema, não ganha a linha', async () => {
  const dir = await workspace();
  const padrao = await cli(dir, 'update');
  naoTem(padrao.out, 'resto do OpenSquad');
  await gravar(dir, '.mcp.json', mcp(['@playwright/mcp@latest', '--config', 'outra/pasta/config.json']));
  const outro = await cli(dir, 'update');
  naoTem(outro.out, 'resto do OpenSquad');
});
