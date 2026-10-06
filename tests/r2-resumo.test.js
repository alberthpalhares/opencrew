// specs/fase-r2-update-e-envio-seguros.md — R2-03a to R2-03e (rules 13 to 15): the summary of
// `update` only states what each step did, in PT-BR, with the texts of §6; a crew template that
// was deleted comes back and is listed; `init` in an installed workspace no longer tells the
// user to delete `_opencrew/`. The texts are written here, not imported from src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exists } from '../src/lib/fsx.js';
import { snapshot } from './_helpers.js';
import { workspace as comPontes } from './_r2-pontes.js';
import { workspace, cli, ler, gravar, copias, semData, mudarRegistro, SKILL } from './_r2-mcp.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FINAL = 'Não foram alterados: as crews que você criou, `_opencrew/_memory/`, `_opencrew/best-practices.local/` e `.env`.';
const EM_DIA = 'Pontes das IDEs já estavam em dia.';
const NENHUMA = 'Nenhuma ponte de IDE encontrada: nada a atualizar. Para criar a ponte de uma IDE: `npx @aksp/opencrew@latest init --repair-bridges --ide=<id>`.';
const REINSTALAR = 'Para atualizar, rode `npx @aksp/opencrew@latest update`. Não apague `_opencrew/` para reinstalar: a pasta guarda a sua memória (`_opencrew/_memory/`) e as suas best-practices (`_opencrew/best-practices.local/`).';
const AGENTS = { topo: 'AGENTS.md: bloco do OpenCrew acrescentado no topo; o seu texto foi mantido.', novo: 'AGENTS.md: bloco do OpenCrew atualizado.' };
const GITIGNORE = {
  criado: '`.gitignore` criado com o bloco do OpenCrew.',
  fim: '`.gitignore`: bloco do OpenCrew acrescentado no fim; as suas linhas foram mantidas.',
  novo: '`.gitignore`: bloco do OpenCrew atualizado.',
};
const MODELO = 'crews/newsletter-mensal/discovery.template.yaml';
const PONTE = '.claude/skills/opencrew/SKILL.md';
const EM_INGLES = ['Bridges refreshed', 'No IDE bridges found', 'AGENTS.md refreshed', 'left untouched'];

const tem = (out, frase) => assert.ok(out.includes(frase), `faltou "${frase}" em:\n${out}`);
const naoTem = (out, frase) => assert.ok(!out.includes(frase), `sobrou "${frase}" em:\n${out}`);
const linhasCom = (out, palavra) => out.split('\n').filter((l) => l.includes(palavra));

// ── R2-03a The deleted crew template comes back, and the output says so (rule 14) ────────────

test('R2-03a: modelo de crew apagado volta, a saída lista o caminho e a frase final é a da §6', async () => {
  const dir = await workspace();
  await gravar(dir, 'crews/minha-crew/crew.yaml', 'name: "minha"\n');
  await fs.rm(path.join(dir, MODELO));
  const { out, code } = await cli(dir, 'update');
  assert.equal(code, 0);
  assert.equal(await exists(path.join(dir, MODELO)), true);
  tem(out, `1 arquivo(s) que faltava(m) em \`crews/\` foram entregues de novo: ${MODELO}.`);
  tem(out, FINAL);
  for (const frase of EM_INGLES) naoTem(out, frase);
  assert.equal(await ler(dir, 'crews/minha-crew/crew.yaml'), 'name: "minha"\n');
});

test('R2-03a: dois modelos apagados saem na mesma linha; sem nada apagado, nenhuma linha de crews/', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, 'crews', 'newsletter-mensal'), { recursive: true });
  await fs.rm(path.join(dir, 'crews', 'blog-semanal'), { recursive: true });
  const { out } = await cli(dir, 'update');
  tem(out, `2 arquivo(s) que faltava(m) em \`crews/\` foram entregues de novo: crews/blog-semanal/discovery.template.yaml, ${MODELO}.`);
  const segundo = await cli(dir, 'update');
  naoTem(segundo.out, 'que faltava(m)');
  tem(segundo.out, FINAL);
});

test('R2-03a (README): onde diz que crews/ nunca é tocado, traz a ressalva "que você criou"', async () => {
  const readme = await fs.readFile(path.join(RAIZ, 'README.md'), 'utf8');
  const linhas = readme.split('\n').filter((l) => l.includes('`crews/`') && /nunca|never|untouched|intact/i.test(l));
  for (const linha of linhas) assert.match(linha, /que você criou/, linha);
  const tabela = readme.slice(readme.indexOf('O que NUNCA é tocado'));
  assert.match(tabela.split('\n').find((l) => l.includes('`crews/`')) ?? '', /que você criou/);
});

// ── R2-03b Bridges: one line per case that happened (rule 13) ────────────────────────────────

test('R2-03b: arquivo de ponte faltando sai em "Pontes criadas", com o caminho', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, PONTE));
  const { out } = await cli(dir, 'update');
  tem(out, `Pontes criadas: ${PONTE}.`);
  naoTem(out, 'Pontes atualizadas');
  naoTem(out, EM_DIA);
  assert.equal(await exists(path.join(dir, PONTE)), true);
});

test('R2-03b: nada a regravar diz "já estavam em dia"; ponte antiga diz "Pontes atualizadas"', async () => {
  const dir = await workspace();
  const emDia = await cli(dir, 'update');
  tem(emDia.out, EM_DIA);
  for (const frase of ['Pontes atualizadas', 'Pontes criadas', ...EM_INGLES]) naoTem(emDia.out, frase);
  await gravar(dir, PONTE, '---\nname: opencrew\n---\n\nponte antiga\n');
  const antiga = await cli(dir, 'update');
  tem(antiga.out, 'Pontes atualizadas: Claude Code.');
  naoTem(antiga.out, EM_DIA);
  naoTem(antiga.out, 'Pontes criadas');
});

test('R2-03b: uma IDE atualizada e outra em dia: só a atualizada é citada', async () => {
  const dir = await comPontes(['claude-code', 'cursor']);
  await gravar(dir, '.cursor/rules/opencrew.mdc', '---\nalwaysApply: true\n---\n\nponte antiga\n');
  const { out } = await cli(dir, 'update');
  tem(out, 'Pontes atualizadas: Cursor.');
  naoTem(out, 'Claude Code');
  naoTem(out, EM_DIA);
});

test('R2-03b: nenhuma ponte: código 0, nada criado e a mensagem com o comando do reparo', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, 'CLAUDE.md'));
  await fs.rm(path.join(dir, '.claude'), { recursive: true });
  const { out, code } = await cli(dir, 'update');
  assert.equal(code, 0);
  tem(out, NENHUMA);
  for (const frase of ['Pontes atualizadas', 'Pontes criadas', EM_DIA, ...EM_INGLES]) naoTem(out, frase);
  assert.equal(await exists(path.join(dir, 'CLAUDE.md')), false);
  assert.equal(await exists(path.join(dir, '.claude')), false);
});

// ── R2-03c The header of the list of copies, with a manifest ─────────────────────────────────

test('R2-03c: arquivo diferente do pacote e sem entrada no manifesto: o resumo não diz "que você tinha editado"', async () => {
  const dir = await workspace();
  await gravar(dir, SKILL, 'versão que o manifesto não conhece\n');
  await mudarRegistro(dir, (files) => { delete files[SKILL]; });
  const { out } = await cli(dir, 'update');
  assert.deepEqual((await copias(dir)).map(semData), [SKILL]);
  naoTem(out, 'que você tinha editado');
  assert.match(out, /1 arquivo\(s\) foram copiados para \.opencrew-backup\/[^/\s]+\/ antes de serem substituídos \(editados por você, ou sem registro de entrega\):/);
  naoTem(out, 'Primeira atualização');
});

test('R2-03c: arquivo editado pelo usuário, com entrada no manifesto: o mesmo cabeçalho', async () => {
  const dir = await workspace();
  await gravar(dir, SKILL, 'editado por mim\n');
  const { out } = await cli(dir, 'update');
  tem(out, 'antes de serem substituídos (editados por você, ou sem registro de entrega):');
  naoTem(out, 'que você tinha editado');
});

// ── R2-03d AGENTS.md and .gitignore: a line only when something changed ──────────────────────

test('R2-03d: AGENTS.md e .gitignore do usuário, sem marcador: bloco acrescentado e texto mantido', async () => {
  const dir = await workspace();
  await gravar(dir, 'AGENTS.md', '# Meu projeto\n\nRegras minhas.\n');
  await gravar(dir, '.gitignore', 'dist/\nminha-pasta/\n');
  const { out } = await cli(dir, 'update');
  tem(out, AGENTS.topo);
  tem(out, GITIGNORE.fim);
  assert.match(await ler(dir, 'AGENTS.md'), /^<!-- opencrew:start -->[\s\S]*<!-- opencrew:end -->\n\n# Meu projeto\n\nRegras minhas\.\n$/);
  assert.match(await ler(dir, '.gitignore'), /^dist\/\nminha-pasta\/\n\n# opencrew:start\n[\s\S]*\.opencrew-backup\/[\s\S]*# opencrew:end\n$/);
  assert.deepEqual(await copias(dir), [], 'a block added to a file with no block needs no copy');
});

test('R2-03d: bloco já igual: nenhuma linha de AGENTS.md nem de .gitignore', async () => {
  const dir = await workspace();
  const antes = await snapshot(dir);
  const { out } = await cli(dir, 'update');
  assert.deepEqual(linhasCom(out, 'AGENTS.md'), []);
  assert.deepEqual(linhasCom(out, '.gitignore'), []);
  assert.deepEqual((await snapshot(dir)).filter((l) => /^(AGENTS\.md|\.gitignore):/.test(l)), antes.filter((l) => /^(AGENTS\.md|\.gitignore):/.test(l)));
});

test('R2-03d: bloco diferente diz "atualizado"; .gitignore ausente diz "criado"', async () => {
  const dir = await workspace();
  await gravar(dir, 'AGENTS.md', (await ler(dir, 'AGENTS.md')).replace('<!-- opencrew:end -->', 'linha minha\n<!-- opencrew:end -->'));
  await gravar(dir, '.gitignore', (await ler(dir, '.gitignore')).replace('.opencrew-backup/\n', ''));
  const mudou = await cli(dir, 'update');
  tem(mudou.out, AGENTS.novo);
  tem(mudou.out, GITIGNORE.novo);
  for (const frase of [AGENTS.topo, GITIGNORE.fim, GITIGNORE.criado]) naoTem(mudou.out, frase);
  await fs.rm(path.join(dir, '.gitignore'));
  const criou = await cli(dir, 'update');
  tem(criou.out, GITIGNORE.criado);
  assert.deepEqual(linhasCom(criou.out, 'AGENTS.md'), []);
});

// ── R2-03e `init` in a workspace that is already installed (rule 15) ─────────────────────────

test('R2-03e: init em workspace instalado aponta para o update e não manda apagar _opencrew/', async () => {
  const dir = await workspace();
  const antes = await snapshot(dir);
  const { out, code } = await cli(dir, 'init', '--ide=claude-code');
  assert.equal(code, 0);
  tem(out, REINSTALAR);
  tem(out, 'npx @aksp/opencrew@latest init --repair-bridges');
  for (const frase of ['delete _opencrew', 'reinstall from scratch', 'then run init again']) naoTem(out, frase);
  assert.deepEqual(await snapshot(dir), antes);
});
