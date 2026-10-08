// Contracts the runtime prompts keep after U5, slice 1 (specs/fase-u5a-polimento-do-uso.md:
// U5a-03, 09, 10c, 11, 12, 14, 15 and 16). Like the other runtime-contracts files, these guard
// the TEXT of the rules; whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { ANTIGA, CREW, PASSO, aplicar, ler as lerDoProjeto, projeto, rodar } from './_conserto.js';

const raiz = new URL('../', import.meta.url);
const ler = (rel) => (existsSync(new URL(rel, raiz)) ? readFileSync(new URL(rel, raiz), 'utf8') : '');
const CORE = 'templates/_opencrew/core';
const runner = ler(`${CORE}/runner.pipeline.md`);
const repair = ler(`${CORE}/prompts/repair.prompt.md`);
const discovery = ler(`${CORE}/prompts/discovery.prompt.md`);
const design = ler(`${CORE}/prompts/design.prompt.md`);
const build = ler(`${CORE}/prompts/build.prompt.md`);
const documento = ler(`${CORE}/prompts/documento.prompt.md`);
const formato = ler(`${CORE}/formato-da-crew.md`);
const system = ler('templates/AGENTS.md');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const linhas = (s) => s.split(/\r?\n/).length;
const BLOG = /post de blog|as a blog post/i;

// ── U5a-03 The wrong sentence of 1.11.0 is gone ──────────────────────────────────────────────

test('U5a-03a: the formato finding and the repair prompt no longer say "post de blog"; texto-livre closes the finding', async (t) => {
  const dir = await projeto(t, ANTIGA);
  const antes = await rodar(dir);
  assert.doesNotMatch(antes.texto, BLOG);
  assert.match(antes.texto, /Sem o formato, o redator não recebe o guia desse tipo de texto, e o verificador procura no arquivo peças de rede \(legenda, post, título de blog\)\./);
  assert.doesNotMatch(repair, BLOG);
  tem(repair, 'sem isso, o redator não recebe o guia do tipo de texto e o verificador procura no arquivo peças de rede. Minha proposta: {passo → formato}. Posso gravar assim?');
  tem(repair, 'gets `texto-livre`');
  // From the real run: a proposta or a minuta may be either — the prompt asks instead of guessing.
  tem(repair, '"O texto do passo {n} precisa virar um arquivo Word para imprimir ou assinar?" — sim: `documento-oficial`; não: `texto-livre`');
  tem(repair, 'When the user refuses your proposal and says what the text is, propose once more with the right format.');

  const r = await aplicar(dir, 'formato:1=texto-livre', 'formato:2=texto-livre');
  assert.equal(r.fim, 'CONSERTO:APLICADO', r.texto);
  assert.match(await lerDoProjeto(dir, PASSO('step-01-minuta.md')), /^format: texto-livre$/m);
  assert.ok(!(await rodar(dir)).codigos.includes('formato'));
  assert.equal(CREW, 'crews/atas');
});

test('U5a-03b: README, the 1.11.0 changelog entry and the format file do not say a text with no format is measured as a blog post', () => {
  const changelog = ler('CHANGELOG.md');
  const de1110 = changelog.slice(changelog.indexOf('## [1.11.0]'), changelog.indexOf('## [1.10.0]'));
  assert.ok(de1110.length > 100, 'could not find the 1.11.0 entry');
  for (const [nome, texto] of [['README.md', ler('README.md')], ['CHANGELOG 1.11.0', de1110], ['formato-da-crew.md', formato]]) {
    assert.doesNotMatch(texto, /mede (tudo|cada um|o texto|esse texto) como post de blog|media como post de blog|measures the text as a blog post/, nome);
  }
  tem(formato, 'without it the writer does not get the guide of that kind of text and the checker looks in the file for pieces of a network (caption, post, blog title)');
  tem(formato, 'is `texto-livre`');
});

// ── U5a-09 The Word document prompt ──────────────────────────────────────────────────────────

test('U5a-09a: the document prompt has the three fixed questions and goes back to the file question on the two messages', () => {
  tem(documento, '"Qual é o arquivo do logotipo? (PNG, dentro do projeto. Pode responder \'sem logotipo\'.)"');
  tem(documento, '"Quais são as linhas do cabeçalho? Até três: nome da entidade, CNPJ ou registro, endereço."');
  tem(documento, '"Quer um texto no rodapé, além de \'Página X de Y\'?"');
  tem(documento, '**"Não encontrei {arquivo}." or "Só converto texto…"**');
  tem(documento, 'Show the message and go back to the question of Step 1.');
});

// ── U5a-10c, 11 and 12 Runner ────────────────────────────────────────────────────────────────

test('U5a-10c: the runner takes the run_id from the script and never builds the time itself', () => {
  tem(runner, 'the script names the run — never build the date or the time yourself');
  tem(runner, '`node _opencrew/core/scripts/caminho.mjs "{name}" pasta` (no `--run`: the script creates the `run_id`)');
  tem(runner, 'The `run_id` is the last segment of that path');
  tem(runner, 'The date of this run, wherever one is asked below, is the first 10 characters of the `run_id`');
  assert.doesNotMatch(runner, /using the current timestamp/);
  assert.doesNotMatch(runner, /today's date/);
});

test('U5a-11a: after a veto fix the file goes through conferir again', () => {
  tem(runner, 'then run the `conferir` command on the rewritten file again (Post-Step Output Validation) before judging the veto once more');
});

test('U5a-12a: the runner names no tool of a single IDE', () => {
  for (const termo of ['Task tool', 'Read tool', 'Write tool', '.claude/settings.local.json', 'via Bash', 'Task prompt']) {
    assert.ok(!runner.includes(termo), `runner still says "${termo}"`);
  }
  tem(runner, 'Dispatch the step with your IDE\'s subagent mechanism (an IDE without one: run the step inline, in this conversation)');
});

// ── U5a-14 Creation prompts, one sentence each ───────────────────────────────────────────────

test('U5a-14a: the tier question is skipped only when discovery.yaml has the template field', () => {
  tem(design, 'If a template was used (`discovery.yaml` has the `template:` field, which the Discovery writes only in that case)');
  tem(discovery, 'template: "{template folder name}" # ONLY when a template was chosen in Step 0; omit the line otherwise');
  assert.doesNotMatch(design, /`tier` field is present and not null/);
});

test('U5a-14b: the design has a role and a guide for the document writer and for texto-livre', () => {
  tem(design, 'in a document crew, writes the minutes, the letter, the contract or the proposal');
  tem(design, 'for a text to print, sign or file: `documento-oficial.md`; for a text with no channel and no Word file (proposal, draft that becomes HTML or PDF, plan): `texto-livre.md`');
});

test('U5a-14c: extends when a base agent fits, from scratch only otherwise; no ls', () => {
  tem(design, 'Use `extends:` when the Shared Agent Registry Check found a base agent that fits; design from scratch only the agents with no base');
  assert.doesNotMatch(design, /`ls _opencrew\/agents\/`/);
  assert.doesNotMatch(design, /Design each agent from scratch, informed/);
});

test('U5a-14d: agent_dependencies also lists the agents whose outputs the step loads', () => {
  tem(build, 'list the agent(s) whose output it reads, via `inputFile` or in its "Context Loading" list.');
});

test('U5a-14e: the installed-skills check does not apply to the native ones', () => {
  tem(build, 'Skills listed in `crew.yaml` are installed in `skills/` (the native ones, `web_search` and `web_fetch`, need no folder)');
});

test('U5a-14f: the output example asks 15 lines or more in every place', () => {
  assert.doesNotMatch(build, /20\+ lines/);
  tem(build, 'Must be 15+ lines and demonstrate the expected quality, depth, and formatting.');
});

test('U5a-14g: the discovery no longer says both "reply with a number" and "do not say reply with a number"', () => {
  assert.doesNotMatch(discovery, /tell the user to reply with a number/);
  tem(discovery, 'Use numbered lists whenever options are available (the user knows what to do: never add "reply with a number")');
});

test('U5a-14h: a description that came with the command is confirmed, not asked again', () => {
  tem(discovery, 'except when the command already carried the description (`/opencrew create <description>`): then do not ask it again');
  tem(discovery, '"É isso? Quer acrescentar alguma coisa?"');
});

test('U5a-14i: the cap of Step 3 does not count the sources question', () => {
  tem(discovery, 'Ask at most 3 questions in this step, not counting the project sources question below, which is always asked.');
});

test('U5a-14j: the entry point shows the menu only when no command came with the message', () => {
  tem(system, 'Otherwise: when the message carried a command or a request, route it (Command Routing); display the MAIN MENU only when it carried none');
});

// ── U5a-15 and 16 Onboarding and size ────────────────────────────────────────────────────────

// From the real run (spec §10): what a literal follower could not do from the prompts alone.
test('U5a-14j: after the onboarding the command that came with the message is routed', () => {
  tem(system, '5. When the message that started this carried a command or a request, route it now (Command Routing); show the main menu only when it carried none');
});

test('U5a-14b: a document crew whose text must not become Word gets texto-livre, and the letterhead is asked only when it must', () => {
  tem(discovery, '3. Must the text become a Word file, to print, sign or file? (yes / no');
  tem(discovery, 'Only on a "yes", ask in the same message whether the organization has letterhead');
  tem(discovery, 'or `["texto-livre"]` when it must not.');
  tem(discovery, 'word_file: "{yes | no}"');
});

test('U5a-09a: no shipped prompt has a sentence cut at an open backtick (the delivery prompt had two since 1.10.0)', () => {
  const entrega = ler(`${CORE}/prompts/entrega.prompt.md`);
  tem(entrega, 'When the summary has a line that starts with "Sem papel timbrado:", the Word documents came out with no letterhead');
  tem(entrega, '**A Word document that was not generated** (the line "Não consegui gerar o Word de {arquivo}: …"): show the message as it came; this is never accepted with option 2.');
  for (const [nome, texto] of [['entrega', entrega], ['repair', repair], ['discovery', discovery], ['design', design], ['build', build], ['documento', documento], ['runner', runner], ['formato', formato], ['system', system]]) {
    let cerca = false;
    for (const [i, linha] of texto.split(/\r?\n/).entries()) {
      if (linha.trimStart().startsWith('```')) cerca = !cerca;
      else if (!cerca) assert.ok(!/(^|\s)`$/.test(linha.trimEnd()), `${nome}:${i + 1} ends in an open backtick`);
    }
  }
});

test('U5a-15a: the onboarding writes company.md under six fixed headings and removes the NOT CONFIGURED mark from both files', () => {
  for (const titulo of ['## Nome', '## O que faz', '## Público', '## Produtos e serviços', '## Tom de voz', '## Site e redes']) {
    assert.ok(system.includes(`\`${titulo}\``), `missing heading ${titulo}`);
  }
  tem(system, 'the site goes on its own line, `- Site: https://…`');
  tem(system, 'Then remove the line `<!-- NOT CONFIGURED -->` from `company.md` and from `preferences.md`');
});

test('U5a-16a: runner, build and design did not grow', () => {
  assert.ok(linhas(runner) <= 872, `runner.pipeline.md has ${linhas(runner)} lines`);
  assert.ok(linhas(build) <= 649, `build.prompt.md has ${linhas(build)} lines`);
  assert.ok(linhas(design) <= 703, `design.prompt.md has ${linhas(design)} lines`);
});

test('U5a-15a: a company.md written with the fixed headings still gives the site domain to the checker', async (t) => {
  const { lerDominioDoSite } = await import('../templates/_opencrew/core/scripts/verificar/leitura.mjs');
  const dir = await projeto(t, ANTIGA, { '_opencrew/_memory/company.md': '# Company Profile\n\n## Nome\nAssociação Exemplo\n\n## Site e redes\n- Site: https://www.exemplo.org.br\n- Instagram: @exemplo\n' });
  assert.equal(await lerDominioDoSite(dir), 'exemplo.org.br');
  await fs.access(path.join(dir, '_opencrew'));
});
