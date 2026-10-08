// Contracts the runtime prompts keep after U4, slice 1 (specs/fase-u4a-conserto-de-crews.md:
// U4a-03a to 03j; rules 10 to 20). Like the other runtime-contracts files, these guard the TEXT
// of the rules; whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { mkTmp } from './_helpers.js';
import { main } from '../templates/_opencrew/core/scripts/conserto.mjs';

const raiz = new URL('../', import.meta.url);
const ler = (rel) => (existsSync(new URL(rel, raiz)) ? readFileSync(new URL(rel, raiz), 'utf8') : '');
const CORE = 'templates/_opencrew/core';
const runner = ler(`${CORE}/runner.pipeline.md`);
const repair = ler(`${CORE}/prompts/repair.prompt.md`);
const discovery = ler(`${CORE}/prompts/discovery.prompt.md`);
const design = ler(`${CORE}/prompts/design.prompt.md`);
const build = ler(`${CORE}/prompts/build.prompt.md`);
const architect = ler(`${CORE}/architect.agent.yaml`);
const formato = ler(`${CORE}/formato-da-crew.md`);
const system = ler('templates/AGENTS.md');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const linhas = (s) => s.split(/\r?\n/).length;
const FORMATO = '_opencrew/core/formato-da-crew.md';

test('U4a-03a: the repair prompt diagnoses first, asks before every --aplicar and diagnoses again at the end', () => {
  tem(repair, 'node _opencrew/core/scripts/conserto.mjs --crew "crews/{code}"');
  tem(repair, 'node _opencrew/core/scripts/conserto.mjs --crew "crews/{code}" --aplicar "{item}"');
  tem(repair, 'wait for the answer, and only then run the command');
  tem(repair, 'Run the diagnosis of Step 2 once more');
  for (const status of ['CONSERTO:OK', 'CONSERTO:PENDENTE', 'CONSERTO:APLICADO', 'CONSERTO:ERRO']) tem(repair, status);
});

test('U4a-03a: the repair prompt never lets the model write inside crews/', () => {
  tem(repair, '**You never write inside `crews/` yourself.**');
  tem(repair, '**DO NOT** create, edit or delete any file under `crews/` with your own tools');
  assert.doesNotMatch(repair, /Use the Write tool/);
});

test('U4a-03a: every finding of the script has its line in the prompt, with the question of spec §6', () => {
  for (const codigo of ['manifesto', 'nome-de-agente', 'formato', 'fontes', 'proibicao', 'irreversivel', 'sem-revisao', 'sem-aprovacao-final', 'publica-antes', 'passo-faltando']) {
    assert.ok(repair.includes(`| \`${codigo}\` |`), `no row for ${codigo}`);
  }
  tem(repair, 'Olhei a crew {nome}. Encontrei {n} ponto(s) para consertar. Vou mostrar um por vez; nada é gravado sem o seu sim, e cada arquivo alterado ganha uma cópia `.bak`.');
  // The sentence about the blog post was wrong and left in U5-1 (tests/runtime-contracts-u5a.test.js, U5a-03a).
  tem(repair, 'Minha proposta: {passo → formato}. Posso gravar assim?');
  tem(repair, 'Quais arquivos ou pastas ela precisa conhecer? (Pode responder \'nenhum\'.)');
  tem(repair, 'Qual trecho exato devo barrar?');
  tem(repair, 'Pronto: {k} conserto(s) gravado(s). Cópias do que mudou: {lista de .bak}. Ficou pendente: {lista ou \'nada\'}.');
  tem(repair, 'gets `documento-oficial`');
  tem(repair, 'node _opencrew/core/scripts/conferir-fontes.mjs --crew "crews/{code}"');
});

// From the real run (spec §10): what a literal follower could not do from the prompt alone.
test('U4a-03a: the repair prompt names --corrigir, hides the script codes from the user and takes the name before the manifest', () => {
  tem(repair, 'ask: "Posso corrigir estes caminhos nos arquivos da crew?" After a yes, run the same command ending with `--corrigir`');
  tem(repair, 'do not show the codes between brackets, the `--aplicar` lines or the `CONSERTO:` status line');
  assert.ok(repair.indexOf('| `nome-de-agente` |') < repair.indexOf('| `manifesto` |'), 'nome-de-agente must come before manifesto');
  tem(repair, '`{k}` is the number of points the user said yes to and the script wrote');
});

test('U4a-03d: the document answers have a field in discovery.yaml, and a second piece keeps its format', () => {
  tem(discovery, '# For document crews: documents: "{answer from Step 3}" signer: "{who signs}" recipients: "{who receives}" word_file: "{yes | no}" letterhead: "{yes | no | not sure — only when word_file is yes}"');
  tem(discovery, 'When the crew also produces a short piece for a channel (a WhatsApp notice, an e-mail to the members), add that format id to the list');
  tem(discovery, 'target_formats: # content and document crews; empty list for others');
});

test('U4a-03e: the agent template of the Build and the crew block of design.yaml follow the format file', () => {
  tem(build, 'id: "{agent-id}" # the file name without `.agent.md`');
  assert.doesNotMatch(build, /id: "crews\/\{code\}\/agents/);
  tem(design, 'description: "{one-line description}" icon: "{emoji}" tier: "express" | "standard" | "full"');
});

test('U4a-03b: a folder without crew.yaml is not a crew — entry point, Architect and repair (rule 12)', () => {
  tem(system, 'List all crews in `crews/` (a folder without `crew.yaml` is not a crew)');
  tem(repair, 'A folder under `crews/` without a `crew.yaml` is not a crew');
  assert.equal(flat(architect).split('crew.yaml is not a crew').length - 1, 3, 'list, edit and delete');
  tem(formato, 'A folder under `crews/` without a `crew.yaml` is not a crew');
});

test('U4a-03c: the entry point names the Architect file; the Architect names each phase prompt and no SKILL.md orchestrator (rule 13)', () => {
  tem(system, 'Load the Architect (`_opencrew/core/architect.agent.yaml`) → Create Crew flow');
  const fases = ['discovery.prompt.md', 'sherlock-shared.md', 'design.prompt.md', 'build.prompt.md'];
  for (const fase of fases) {
    tem(architect, `\`_opencrew/core/prompts/${fase}\``);
    assert.ok(existsSync(new URL(`${CORE}/prompts/${fase}`, raiz)), `${fase} does not exist`);
  }
  assert.doesNotMatch(architect, /SKILL\.md (entry point|orchestrator)/);
  tem(architect, 'Never skip a phase and never write crew files before the Build.');
});

test('U4a-03d: the discovery has the document domain, its questions, no investigation and documento-oficial (rule 14)', () => {
  assert.match(discovery, /^\| `document` \| minutes \(ata\), official letter \(ofício\), contract, proposal/m);
  tem(discovery, '**If domain = `document`:** 1. Which documents should the crew produce?');
  tem(discovery, '2. Who signs each document, and who receives it?');
  tem(discovery, '3. Must the text become a Word file, to print, sign or file?'); // since U5-1 the letterhead is asked only on a "yes"
  tem(discovery, 'ask which files of the project rule the text');
  tem(discovery, '**If domain = `document`, skip this step entirely** (set `investigation.enabled: false`)');
  tem(discovery, 'If domain = `document`, do not ask: save `target_formats: ["documento-oficial"]` when the text must become a Word file');
  tem(discovery, 'domain: "{document | content | research | automation | analysis | mixed}"');
  assert.doesNotMatch(discovery, /Investigation is always offered/);
});

test('U4a-03e: the format file exists, the four prompts point to it, and it defines every field of rule 15', () => {
  assert.ok(formato, 'formato-da-crew.md is missing');
  for (const [nome, texto] of [['build', build], ['design', design], ['runner', runner], ['repair', repair], ['architect', architect]]) {
    assert.ok(texto.includes(FORMATO), `${nome} does not cite ${FORMATO}`);
  }
  tem(formato, 'tier: "standard" # express | standard | full');
  tem(formato, '| `crew.tier` | Build, from `design.yaml → crew.tier` | Runner (run header) |');
  tem(formato, 'on_reject: 2 # the number of the step the pipeline goes back to on a rejection');
  tem(formato, 'the Runner uses the value of the review step when the step declares one, then this one, then 3');
  tem(formato, 'the agent `id` is the file name without `.agent.md`');
  tem(formato, '`fast` or `powerful`, only on `subagent` steps. Express: `fast`.');
  tem(formato, 'is written when at least one agent can be left out of a run without breaking another');
  tem(formato, 'In the Express tier the review step is done by the writer agent itself');
});

test('U4a-03e: the Build no longer repeats the fragments and no longer says OPTIONAL and ALWAYS at once', () => {
  tem(build, '**Read `_opencrew/core/formato-da-crew.md` before writing any file.**');
  assert.doesNotMatch(build, /ALWAYS emit it/);
  assert.doesNotMatch(build, /matches the id field in their \.agent\.md frontmatter/);
  tem(build, 'the `crew:` block (`code`, `name`, `description`, `icon` and `tier`, all from `design.yaml`)');
  tem(build, 'on_reject: {N} # ONLY for the review step: the number of the step the pipeline goes back to');
});

/** The yaml blocks of the format file, in order: crew.yaml, pipeline.yaml and the three steps. */
const blocos = [...formato.matchAll(/```yaml\r?\n([\s\S]*?)```/g)].map((m) => m[1].replace(/\r\n/g, '\n'));

test('U4a-03e: the example crew of the format file passes the diagnosis with CONSERTO:OK', async (t) => {
  const [crewYaml, pipelineYaml, criacao, revisao, checkpoint] = blocos;
  const dir = await mkTmp('formato');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  const crew = 'crews/atas-do-conselho';
  const agente = (nome) => `---\nname: "${nome}"\ntitle: "Função"\nicon: "📝"\n---\n\n# ${nome}\n`;
  const arquivos = {
    '_opencrew/.opencrew-version': 'x\n',
    'Regras/estatuto.md': '# Estatuto\n',
    [`${crew}/crew.yaml`]: crewYaml,
    [`${crew}/pipeline/pipeline.yaml`]: pipelineYaml,
    [`${crew}/pipeline/steps/step-01-checkpoint-pauta.md`]: `${checkpoint}\n# Pauta\n`,
    [`${crew}/pipeline/steps/step-02-redigir-ata.md`]: `${criacao}\n# Redigir\n`,
    [`${crew}/pipeline/steps/step-03-revisar.md`]: `${revisao}\n# Revisar\n`,
    [`${crew}/pipeline/steps/step-04-checkpoint-final.md`]: '---\ntype: checkpoint\n---\n\n# Final\n',
    [`${crew}/agents/rita-redacao.agent.md`]: agente('Rita Redação'),
    [`${crew}/agents/vito-veredito.agent.md`]: agente('Vito Veredito'),
    [`${crew}/crew-party.csv`]: 'id,displayName,title,icon,path,execution\nrita-redacao,"Rita Redação",Redatora,📝,./agents/rita-redacao.agent.md,inline\nvito-veredito,"Vito Veredito",Revisor,🔍,./agents/vito-veredito.agent.md,inline\n',
  };
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await fs.writeFile(path.join(dir, rel), conteudo);
  }
  const saida = [];
  const code = main(['--crew', crew], { cwd: dir, escrever: (s) => saida.push(s) });
  assert.equal(saida.at(-1), 'CONSERTO:OK', saida.join('\n'));
  assert.equal(code, 0);
});

test('U4a-03f: the runner reads max_review_cycles from the step, then from crew.yaml, then 3 (decision 3)', () => {
  tem(runner, 'the one declared where the step declares `on_reject` (the step frontmatter or its `pipeline.yaml` entry); without it, the one in `crew.yaml`; absent or invalid in both: 3.');
  tem(runner, '`crew.tier` in `crew.yaml` (older crews: `tier` loose at the top level)');
  assert.doesNotMatch(runner, /all steps use `model_tier: fast` by default/);
});

test('U4a-03g: design — Express has a review step done by the writer; the Build does the merge (rule 17)', () => {
  tem(design, '| Reviewer | The writer does the review step (no reviewer agent) | 1 dedicated reviewer | Reviewer + cross-review |');
  tem(design, '**Every crew needs a review step**');
  tem(design, 'The step still exists (with `on_reject`), so the automatic checker runs before it.');
  tem(design, 'The Build phase does the merge (base first, local overrides on top) and writes a complete file; the Pipeline Runner never merges.');
  assert.doesNotMatch(design, /The runner merges/);
  assert.doesNotMatch(design, /Writer self-reviews/);
  assert.doesNotMatch(design, /\| All `fast` \|/);
});

test('U4a-03g: Build Gate 2c accepts two irreversible steps in a row (rule 16)', () => {
  tem(build, 'The IMMEDIATELY preceding step is a `type: checkpoint` (Final Approval) that itself comes after the Review, or another irreversible step');
});

test('U4a-03h: a checkpoint with outputFile has the research format and the general one (rule 18)', () => {
  tem(runner, 'For the checkpoint that precedes the researcher, use this format:');
  tem(runner, '# Research Focus');
  tem(runner, 'For any other checkpoint: `# {the checkpoint\'s title}`, the user\'s answer as given (the option chosen and every comment), and `**Date:** {the date of this run, YYYY-MM-DD}`.');
  tem(build, 'For a **checkpoint whose answer the next step needs**');
});

test('U4a-03i: no line of the entry point ends in an open backtick; the onboarding exception is whole (rule 19)', () => {
  for (const [i, linha] of system.split(/\r?\n/).entries()) {
    assert.equal((linha.match(/`/g) ?? []).length % 2, 0, `templates/AGENTS.md:${i + 1} has an odd number of backticks`);
  }
  tem(system, '(except for `/opencrew documento` and the request to deliver a run that already ended: neither uses the company context)');
});

test('U4a-03j: runner, build and design did not grow (rule 20)', () => {
  assert.ok(linhas(runner) <= 875, `runner.pipeline.md has ${linhas(runner)} lines`);
  assert.ok(linhas(build) <= 673, `build.prompt.md has ${linhas(build)} lines`);
  assert.ok(linhas(design) <= 703, `design.prompt.md has ${linhas(design)} lines`);
  assert.ok(linhas(formato) <= 400, `formato-da-crew.md has ${linhas(formato)} lines`);
});
