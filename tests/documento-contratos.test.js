// specs/fase-u3b-documento-word.md — U3b-06a, U3b-06d and U3b-07b (rules 13 and 14, §6): the guide
// of the format, the route and the prompt of `/opencrew documento`, and what AGENTS.md and the
// README say about the Word document. Like the runtime-contracts files, these guard the TEXT;
// whether a model obeys the prompt is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gerarDocx } from '../templates/_opencrew/core/scripts/documento.mjs';
import { lerZip, xmlDe, todos, tem as temNo } from './_documento.js';

const raiz = new URL('../', import.meta.url);
const CORE = 'templates/_opencrew/core';
const ler = (rel) => (existsSync(new URL(rel, raiz)) ? readFileSync(new URL(rel, raiz), 'utf8') : '');
// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const linhasDe = (rel) => ler(rel).trimEnd().split(/\r?\n/).length;

const guia = ler(`${CORE}/best-practices/documento-oficial.md`);
const catalogo = ler(`${CORE}/best-practices/_catalog.yaml`);
const design = ler(`${CORE}/prompts/design.prompt.md`);
const system = ler('templates/AGENTS.md');
const prompt = ler(`${CORE}/prompts/documento.prompt.md`);
const regras = ler('AGENTS.md');
const readme = ler('README.md');
const COMANDO = 'node _opencrew/core/scripts/documento.mjs';

// ── U3b-06a The guide of the format (rule 14) ────────────────────────────────────────────────

test('U3b-06a: documento-oficial.md exists, is in the catalog, has platform "documento" and no constraints', () => {
  assert.ok(guia, 'best-practices/documento-oficial.md does not exist');
  const frontmatter = guia.split(/^---\r?$/m)[1] ?? '';
  assert.match(frontmatter, /^platform: "documento"\r?$/m);
  assert.doesNotMatch(guia, /^constraints:/m, 'the format promises no size limit');
  assert.match(catalogo, /- id: documento-oficial\r?\n(?: {4}.*\r?\n)*? {4}file: documento-oficial\.md/);
});

test('U3b-06a: the catalog lists every guide of the folder, and they are 23', () => {
  const pasta = readdirSync(new URL(`${CORE}/best-practices/`, raiz)).filter((f) => f.endsWith('.md')).sort();
  const noCatalogo = [...catalogo.matchAll(/^ {4}file: (\S+)\r?$/gm)].map((m) => m[1]).sort();
  assert.equal(pasta.length, 23);
  assert.deepEqual(noCatalogo, pasta);
});

test('U3b-06a: the guide teaches the points of rule 14', () => {
  const regrasDoGuia = flat(guia);
  assert.match(regrasDoGuia, /One paragraph per line/i);
  assert.match(regrasDoGuia, /`::: titulo`[^.]*`::: subtitulo`[^.]*(first|beginning|top)/i);
  assert.match(regrasDoGuia, /`#`, `##` and `###`[^.]*sections/);
  assert.match(regrasDoGuia, /number[^.]*(by hand|yourself)/i, 'the number of a section or item is written by the author');
  assert.match(regrasDoGuia, /simple table/i);
  assert.match(regrasDoGuia, /`::: quebra-de-pagina`[^.]*before[^.]*(annex|anexo)/i);
  assert.match(regrasDoGuia, /`::: assinaturas`[^.]*end/i);
  for (const fora of [/no image/i, /HTML/, /`=== … ===`/, /notes section/i]) assert.match(regrasDoGuia, fora);
});

test('U3b-06a: the example of the guide uses the three markings and converts with no warning', () => {
  const exemplo = guia.match(/```markdown\r?\n([\s\S]*?)\r?\n```/)?.[1];
  assert.ok(exemplo, 'the guide has no ```markdown example');
  for (const marca of [/^::: titulo \S/m, /^::: subtitulo \S/m, /^::: quebra-de-pagina$/m, /^::: assinaturas$/m, /^:::$/m]) assert.match(exemplo, marca);
  const { bytes, avisos, vazio } = gerarDocx({ texto: exemplo });
  assert.deepEqual([avisos, Boolean(vazio)], [[], false]);
  const documento = xmlDe(lerZip(bytes), 'word/document.xml');
  const estilos = todos(documento, 'w:pStyle').map((e) => e.attrs['w:val']);
  for (const estilo of ['Titulo', 'Subtitulo', 'Heading1']) assert.ok(estilos.includes(estilo), `the example has no ${estilo}`);
  assert.ok(temNo(documento, 'w:pageBreakBefore'), 'the example has no page break');
  assert.ok(todos(documento, 'w:tbl').length >= 2, 'the example has a table and the signatures');
});

test('U3b-06a: the example of the guide carries nothing of the maintainer (AGENTS.md rule 2)', () => {
  assert.doesNotMatch(guia, /alberth|palhares|klinsmann|aksp|poty/i);
  for (const [cnpj] of guia.matchAll(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)) assert.equal(cnpj, '00.000.000/0001-00');
});

test('U3b-06a: design.prompt.md gives format: documento-oficial to the step whose result is a document to print, sign or file', () => {
  assert.match(flat(design), /document to print, sign or file[^.]*`format: documento-oficial`/);
});

// ── U3b-06d The route and the prompt (rule 13, texts of §6) ──────────────────────────────────

test('U3b-06d: the command table routes /opencrew documento to the prompt, and the menu has the option', () => {
  const linha = sectionOf(system, '## Command Routing').split(/\r?\n/).find((l) => l.startsWith('| `/opencrew documento <arquivo>` |'));
  assert.ok(linha, 'the command table has no line for /opencrew documento <arquivo>');
  assert.match(linha, /\| [^|]*`_opencrew\/core\/prompts\/documento\.prompt\.md`[^|]*\|$/);
  const menu = flat(sectionOf(system, '## Main Menu'));
  assert.match(menu, /\*\*More options:\*\* [^*]*Documento Word/);
  assert.equal(menu.match(/\*\*More options:\*\* ([^*]*?)(?= "Documento Word"| \*\*|$)/)[1].split(' · ').length, 4, 'at most 4 options per question');
  assert.match(menu, /"Documento Word"[^.]*`_opencrew\/core\/prompts\/documento\.prompt\.md`/);
});

test('U3b-06d: the prompt exists, cites the script and stays within 400 lines', () => {
  assert.ok(prompt, 'prompts/documento.prompt.md does not exist');
  tem(prompt, `\`${COMANDO} "{arquivo}"\``);
  assert.ok(existsSync(new URL(`${CORE}/scripts/documento.mjs`, raiz)));
  assert.ok(linhasDe(`${CORE}/prompts/documento.prompt.md`) <= 400);
});

test('U3b-06d (a): with no file, the prompt asks which one', () => {
  const passo = flat(sectionOf(prompt, '## Step 1'));
  assert.match(passo, /With no file[^.]*ask/);
  tem(passo, 'Qual arquivo de texto (.md ou .txt) você quer em Word?');
});

test('U3b-06d (b): with no profile, the prompt asks about the letterhead; "sim" creates and fills the profile, "não" goes on without it', () => {
  const passo = flat(sectionOf(prompt, '## Step 2'));
  tem(passo, '`_opencrew/_memory/documento-oficial.md`');
  tem(passo, 'Este projeto ainda não tem papel timbrado configurado. Quer configurar agora (logotipo, cabeçalho e rodapé)? (sim / não)');
  tem(passo, `\`${COMANDO} --criar-perfil\``);
  for (const chave of ['logotipo', 'cabecalho_1', 'cabecalho_2', 'cabecalho_3', 'rodape']) tem(passo, `\`${chave}\``);
  assert.match(passo, /\*\*"Não"\*\*[^.]*without (a|the) profile/);
  assert.match(passo, /never invent/i);
});

test('U3b-06d (c): the prompt runs the command with the path between double quotes and shows the report as it came', () => {
  const passo = flat(sectionOf(prompt, '## Step 3'));
  tem(passo, `\`${COMANDO} "{arquivo}"\``);
  assert.match(passo, /between double quotes/);
  assert.match(passo, /safe-name rule \(nome seguro\)/);
  assert.match(passo, /Show it to the user as it came, without the `DOCUMENTO:OK` line/);
  tem(passo, '`DOCUMENTO:OK`');
});

test('U3b-06d (d): a different Word already there — the prompt asks before --substituir', () => {
  const passo = flat(sectionOf(prompt, '## Step 4'));
  tem(passo, 'Já existe {arquivo}, diferente do que eu ia gravar. Para trocar, rode de novo com --substituir.');
  assert.match(passo, /The first call never has `--substituir`/);
  assert.match(passo, /ask[^.]*before/i);
  assert.match(passo, /\(sim \/ não\)/);
});

test('U3b-06d (e): when the command fails, the prompt shows the message and never generates the document by another means', () => {
  const passo = flat(sectionOf(prompt, '## Step 5'));
  tem(passo, '⚠️ A conversão para Word não rodou: {motivo}. O texto continua em {arquivo}.');
  assert.match(passo, /never (build|generate|write) the (document|`\.docx`) by (any other|another) means/i);
  tem(sectionOf(prompt, '## Rules'), '**DO NOT** generate the `.docx` by any other means');
});

test('U3b-06d: the prompt carries the two tips of the report as the way to a PDF, and promises no PDF of its own', () => {
  tem(prompt, 'Arquivo → Salvar como → PDF');
  assert.doesNotMatch(prompt, /LibreOffice|Google Docs|pandoc/i);
});

// ── U3b-07b AGENTS.md, README, sizes ─────────────────────────────────────────────────────────

test('U3b-07b: AGENTS.md cites documento.mjs in rule 15 and "abrir o .docx no Word" in what rule 7 does not cover', () => {
  const regra = (n) => flat(regras.split(/\n(?=### )/).find((s) => s.startsWith(`### ${n}. `)) ?? '');
  assert.match(regra(15), /`documento\.mjs`[^.]*grava o `\.docx` pedido e o perfil que faltava/);
  assert.match(regra(7), /\*\*Não cobre:\*\*.*abrir o `\.docx` no Word/);
  const linha = (n) => regras.split(/\r?\n/).find((l) => l.startsWith(`| ${n} `)) ?? '';
  assert.match(linha(14), /`tests\/upgrade-u3b\.test\.js`/);
  assert.match(linha(15), /`tests\/entregar-documentos\.test\.js`|`entregar-documentos`/);
  assert.match(linha(15), /`tests\/documento\*\.test\.js`/);
});

test('U3b-07b: the README describes the Word document and the profile, and the command', () => {
  const secao = flat(sectionOf(readme, '## Documento Word'));
  assert.ok(secao, 'README has no "## Documento Word" section');
  tem(secao, '`/opencrew documento');
  tem(secao, '`_opencrew/_memory/documento-oficial.md`');
  assert.match(secao, /papel timbrado/);
  assert.match(secao, /`::: assinaturas`/);
  assert.match(readme, /^\| `\/opencrew documento <arquivo>` \|/m, 'the command table of the README has the command');
  tem(readme, '23 guias de melhores práticas');
});

test('U3b-07b: the README does not promise LibreOffice nor Google Docs', () => {
  for (const frase of flat(readme).split(/(?<=[.:;]) /).filter((f) => /LibreOffice|Google Docs/i.test(f))) {
    assert.match(frase, /não (foi|foram) conferid/i, `the README promises another editor: ${frase}`);
  }
});

test('U3b-07b: no new module passes 200 lines, and runner.pipeline.md gained no line', () => {
  const scripts = `${CORE}/scripts`;
  const modulos = readdirSync(new URL(`${scripts}/documento/`, raiz)).map((nome) => `${scripts}/documento/${nome}`);
  assert.ok(modulos.length >= 15, 'could not list scripts/documento/');
  const extra = existsSync(new URL(`${scripts}/entrega/documentos.mjs`, raiz)) ? [`${scripts}/entrega/documentos.mjs`] : [];
  for (const modulo of [`${scripts}/documento.mjs`, ...modulos, ...extra]) {
    assert.ok(linhasDe(modulo) <= 200, `${modulo} has ${linhasDe(modulo)} lines`);
  }
  const runner = ler(`${CORE}/runner.pipeline.md`);
  assert.ok(linhasDe(`${CORE}/runner.pipeline.md`) <= 874, 'the runner grew');
  assert.doesNotMatch(runner, /documento\.mjs|documento-oficial|documento\.prompt\.md/);
});
