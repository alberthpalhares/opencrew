// Contracts the runtime prompts keep after U3a, slice 1 (specs/fase-u3a1-pasta-de-entrega.md:
// U3a-01e-f1, 08a to 08d, the runner side of 08h and 08n, and 14a; rules 2, 21, 22, 24 and 33).
// Like the other runtime-contracts files, these guard the TEXT of the rules; whether a model obeys
// them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runnerCompleto } from './_runner.js';

const raiz = new URL('../', import.meta.url);
const ler = (rel) => (existsSync(new URL(rel, raiz)) ? readFileSync(new URL(rel, raiz), 'utf8') : '');
// Since U5-2 the runner is a core file plus parts read on demand: these contracts read it with every part loaded (tests/_runner.js).
const runner = runnerCompleto;
const prompt = ler('templates/_opencrew/core/prompts/entrega.prompt.md');
const system = ler('templates/AGENTS.md');
const regras = ler('AGENTS.md');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const entrega = sectionOf(runner, '### Entrega');
const fim = sectionOf(runner, '### After Pipeline Completion');
const texto = flat(prompt);
const COMANDO = 'node _opencrew/core/scripts/entregar.mjs --crew "crews/{name}" --run "{run_id}" --arquivo "{lista}"';
const comandos = (md) => [...md.matchAll(/node _opencrew\/core\/scripts\/entregar\.mjs[^`\n|]*/g)].map((m) => m[0].trim());

// ── U3a-08a The runner calls the delivery script, at the right moment (rule 21) ──────────────

test('U3a-08a: the runner has the section "### Entrega", with at most 15 lines, and it points to the prompt, which exists', () => {
  assert.ok(entrega, 'the runner has no "### Entrega" section');
  const linhas = entrega.trimEnd().split(/\r?\n/);
  assert.ok(linhas.length <= 15, `the section has ${linhas.length} lines`);
  tem(entrega, '`_opencrew/core/prompts/entrega.prompt.md`');
  assert.ok(prompt, 'prompts/entrega.prompt.md does not exist');
});

test('U3a-08a: the command has --crew, --run and --arquivo between double quotes, by the safe-name rule', () => {
  assert.ok(entrega.includes(`\`${COMANDO}\``), `the command is not in the section: ${COMANDO}`);
  tem(entrega, 'safe-name rule (nome seguro)');
  const todos = [...comandos(runner), ...comandos(prompt)];
  assert.ok(todos.length >= 2, 'the command is written in the runner and in the prompt');
  for (const comando of todos) {
    assert.match(comando, /^node _opencrew\/core\/scripts\/entregar\.mjs --crew "crews\/\{name\}" --run "\{run_id\}" --arquivo "\{lista\}"( --vai-publicar \{canal\})?$/, comando);
  }
});

test('U3a-08a: the moment — after the final approval, right before the first step that publishes or sends; with none, after the last step', () => {
  tem(entrega, 'after the final approval, immediately before the first step that publishes or sends (`side_effects: irreversible`, in the step or in the agent\'s skill)');
  tem(entrega, 'with no such step, after the last step');
  assert.match(flat(entrega), /irreversible step comes before the final approval[^.]*the delivery runs at the end/);
  tem(flat(sectionOf(runner, '### For each pipeline step:')), '**Entrega** — before the first step that publishes or sends');
});

test('U3a-08a: the delivery always comes before the end of the Escritório', () => {
  tem(entrega, 'Always before the end-of-run command of the Escritório');
  const [naEntrega, noConcluir] = [fim.indexOf('**Entrega**'), fim.indexOf('`concluir`')];
  assert.ok(naEntrega > -1 && noConcluir > -1, 'After Pipeline Completion lost the delivery or the Escritório reminder');
  assert.ok(naEntrega < noConcluir, 'the delivery comes after `concluir`');
});

test('U3a-08a: no delivery for a run that was rejected, aborted or has no approved file', () => {
  assert.match(flat(entrega), /\*\*Never\*\* for a run that was rejected, aborted before the final approval or left with no approved file/);
});

test('U3a-08a: a crew with no final approval gets the same moments and the warning', () => {
  assert.match(flat(entrega), /no final approval checkpoint[^.]*same moments/);
  tem(entrega, '`Esta crew não tem aprovação final: confira os arquivos antes de usar.`');
});

test('U3a-08a: the output of the script is the final summary, shown before a stop at an irreversible step', () => {
  assert.match(flat(entrega), /output of the script is the final summary of the run[^.]*if the run stops later, at an irreversible step, show it before stopping/);
  assert.match(fim, /entrega\//, 'the completion summary does not point to entrega/');
  assert.match(fim, /LEIA-ME\.md/, 'the completion summary does not point to the LEIA-ME');
});

for (const antigo of ['Output saved to', 'Run folder', 'Save final output']) {
  test(`U3a-08a: the runner no longer has "${antigo}"`, () => {
    assert.ok(runner.length > 0 && !runner.includes(antigo), `still in the runner: ${antigo}`);
  });
}

test('U3a-08a: the final menu is still there', () => {
  for (const opcao of ['Run again (new topic)', 'Edit this content', 'Back to menu']) tem(fim, opcao);
});

// ── U3a-01e-f1 Who builds the list, and with what (rule 2) ───────────────────────────────────

test('U3a-01e-f1: the list is built with the paths caminho.mjs saida returned the last time each step ran', () => {
  assert.match(texto, /every path the `saida` action of `caminho\.mjs` returned the \*\*last time\*\* the step ran/);
  assert.match(texto, /Never look for a `vN` folder by yourself/);
  tem(texto, 'each **creation or rendering step**');
});

test('U3a-01e-f1: the format of each item is the format of the step; a rendering step with none uses the one of the content it renders', () => {
  tem(texto, '`{caminho}={formato}`');
  assert.match(texto, /rendering step with no `format:` uses the `format:` of the content step it renders/);
});

test('U3a (real): the delivery list is not the checker list — the rendering step takes the format of its inputFile step, or the images land in outros/', () => {
  const lista = flat(sectionOf(prompt, '## Step 1'));
  assert.match(lista, /This list is \*\*not\*\* the list of the checker \(`verificar\.mjs`\)/);
  assert.match(lista, /here the rendering step \(images, HTML\) takes the format of the content step it renders — the step that wrote its `inputFile`/);
  assert.match(lista, /Without it the images land in `outros\/`/);
});

test('U3a (real): the prompt says the script also writes verificacao-entrega.md in the run folder', () => {
  assert.match(texto, /also writes `crews\/\{name\}\/output\/\{run_id\}\/verificacao-entrega\.md`[^.]*the report of the check made at delivery time/);
});

test('U3a-01e-f1: research, briefing, the reviewer\'s verdict, checkpoint answers and skipped steps stay out', () => {
  assert.match(texto, /\*\*Stay out:\*\* research, briefing, the reviewer's verdict, checkpoint answers and every skipped step/);
});

test('U3a-01e-f1: for a run that already ended, the paths come from caminho.mjs entrada and the user confirms the list', () => {
  const encerrada = flat(sectionOf(prompt, '## A run that already ended'));
  assert.ok(encerrada.includes('`node _opencrew/core/scripts/caminho.mjs "{name}" entrada --run "{run_id}" --arquivo "{outputFile}"`'), 'the entrada command is missing or changed');
  assert.match(encerrada, /show the list and wait for the "sim"/);
  tem(encerrada, 'Posso montar a entrega com esta lista? (sim / não)');
});

// ── U3a-08b ENTREGA:INCOMPLETA (rule 22) ─────────────────────────────────────────────────────
// Since 1.9.0 there are three options, and the prompt cites `--aceitar-pendencias` and `--destino`:
// the scenario became U3a-08b-f2, in tests/runtime-contracts-u3a2.test.js. What stays from 1.8.0:

test('U3a-08b: ENTREGA:INCOMPLETA still shows what is missing, and whoever goes on still confirms each irreversible step', () => {
  tem(prompt, '⚠️ A entrega ficou incompleta: {o que falta}');
  assert.match(texto, /Every irreversible step still asks for its own confirmation, as it does today/);
  assert.match(texto, /`ENTREGA:OK` → go on/);
});

// ── U3a-08c The script that does not run (rule 22; the R3 pattern: warn and go on) ───────────

test('U3a-08c: a script that did not run — the warning of spec §6, the list of approved files, and the run goes on', () => {
  const semScript = flat(sectionOf(prompt, '## When the script does not run'));
  assert.match(semScript, /no Node, an error, or no `ENTREGA:` line/);
  tem(semScript, '⚠️ A entrega automática não rodou: {motivo}');
  assert.match(semScript, /list the approved files[^.]*and go on with the run/);
  assert.match(semScript, /never build the folder by hand/);
});

// ── U3a-08d The delivery runs again after an edit ────────────────────────────────────────────

test('U3a-08d: after "Edit this content" the delivery runs again', () => {
  assert.match(flat(entrega), /After "Edit this content" changes an approved file, run it again/);
  assert.match(texto, /After "Edit this content"[^.]*run the delivery again/);
});

// ── U3a-08h and U3a-08n, the runner side: when --vai-publicar goes (rule 24) ─────────────────

test('U3a-08n: --vai-publicar goes once for each channel of the list that the crew publishes by itself', () => {
  const publica = flat(sectionOf(prompt, '## Step 2'));
  assert.match(publica, /`--vai-publicar \{canal\}` once for each channel of the list that has an irreversible step in the pipeline/);
  assert.match(publica, /The channel of a step is the `platform:` of its `format:`/);
  assert.match(publica, /with no `format:`, the one of the skill \(`instagram-publisher` → `instagram`\)/);
  assert.match(publica, /With neither, do not pass the option/);
  tem(publica, 'Esta crew publica este canal sozinha. Antes de postar à mão, confira se já saiu.');
});

test('U3a-08h: a channel that has no item in the list is never passed, because the script refuses it', () => {
  const publica = flat(sectionOf(prompt, '## Step 2'));
  assert.match(publica, /Only a channel that has an item in the list/);
  tem(publica, '`Canal não encontrado nesta entrega: {canal}.`');
  for (const canal of ['instagram', 'linkedin', 'blog', 'email', 'whatsapp', 'twitter', 'youtube', 'documentos']) tem(publica, `\`${canal}\``);
});

// ── U3a-14a Rule 15 and the language exception (rule 33) ─────────────────────────────────────

test('U3a-14a: AGENTS.md has rule 15, with the text of the spec, and its line in the Regra → Trava table', () => {
  const regra = flat(regras.split(/\n(?=### )/).find((s) => s.startsWith('### 15. ')) ?? '');
  assert.ok(regra, 'AGENTS.md has no rule 15');
  tem(regra, 'só escreve onde foi combinado: arquivos da crew (com `.bak`), o `state.json` da crew, a pasta de saída da crew (`crews/<crew>/output/`) e o destino declarado; nunca sobrescreve arquivo do usuário, e só apaga a própria pasta de entrega e os temporários que ele mesmo criou.');
  tem(regra, '**Trava:** `tests/entregar*.test.js` (U3a-14b)');
  const linha = regras.split(/\r?\n/).find((l) => l.startsWith('| 15 '));
  assert.ok(linha, 'the Regra → Trava table has no line for rule 15');
  assert.match(linha, /`tests\/entregar\*\.test\.js`.*\| Reprova \|$/);
  assert.ok(regras.indexOf('### 15. ') > regras.indexOf('### 14. '), 'stable IDs: rule 15 comes after rule 14');
});

test('U3a-14a: the system prompt has the language exception of the delivery', () => {
  const idioma = flat(sectionOf(system, '## Language Handling'));
  assert.match(idioma, /Exception: the delivery folder \(`entrega\/`\)[^.]*folder names, file names and the `LEIA-ME\.md`[^.]*fixed PT-BR/);
});

test('U3a-14a: the command table routes the delivery of a run that already ended to the prompt', () => {
  const linha = sectionOf(system, '## Command Routing').split(/\r?\n/).find((l) => l.includes('entrega.prompt.md'));
  assert.ok(linha, 'no line of the command table cites entrega.prompt.md');
  assert.match(linha, /^\| [^|]*deliver[^|]*run that already ended[^|]*\| [^|]*`_opencrew\/core\/prompts\/entrega\.prompt\.md`[^|]*\|$/);
});
