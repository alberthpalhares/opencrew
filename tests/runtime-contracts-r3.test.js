// Contracts the runtime prompts keep after R3 (specs/fase-r3-runner-em-uso-real.md: R3-04a to
// R3-04d, rules 7 to 13). Like the other runtime-contracts files, these guard the TEXT of the
// rules; whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runnerCompleto } from './_runner.js';

const read = (rel) => readFileSync(new URL(`../templates/${rel}`, import.meta.url), 'utf8');
// Since U5-2 the runner is a core file plus parts read on demand: these contracts read it with every part loaded (tests/_runner.js).
const runner = runnerCompleto;
const discovery = read('_opencrew/core/prompts/discovery.prompt.md');
const architect = read('_opencrew/core/architect.agent.yaml');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const texto = flat(runner);
const SCRIPT = 'node _opencrew/core/scripts/caminho.mjs';
// Every command of the path script, wherever it is written (a table cell, a line, a block).
const comandos = [...runner.matchAll(/node _opencrew\/core\/scripts\/caminho\.mjs[^`\n|]*/g)].map((m) => m[0].trim());
const COMANDO = {
  pasta: `${SCRIPT} "{name}" pasta --tema "{tema}" --passos {N}`, // since U5-1 the script creates the run_id (no --run); since U5-3 it opens the run record
  entrada: `${SCRIPT} "{name}" entrada --run "{run_id}" --arquivo "{inputFile}"`,
  saida: `${SCRIPT} "{name}" saida --run "{run_id}" --arquivo "{outputFile}"`,
  conferir: `${SCRIPT} "{name}" conferir --arquivo "{path}" --passo {step}`, // since U5-3 the checked file goes to the run record
};
const paths = sectionOf(runner, '### Output Path Transformation');

// ── R3-04a The path script replaces the bash commands (rule 7) ──────────────────────

test('R3-04a: the runner cites scripts/caminho.mjs with the four actions', () => {
  for (const [acao, comando] of Object.entries(COMANDO)) {
    assert.ok(comandos.includes(comando), `no command for "${acao}": ${comando}\nfound: ${comandos.join('\n')}`);
  }
  assert.match(flat(paths), /read the last line \(`CAMINHO:OK \{path\}`, `CAMINHO:FALTA \{path\}` or `CAMINHO:REPROVADO \{motivo\}`\)/);
});

for (const antigo of ['ls -1', 'sort -V', 'test -s', 'test -f', 'grep -q', 'grep -c', 'mkdir -p', '[ -f', 'xargs', 'tail -1', 'VALIDATION:']) {
  test(`R3-04a: the runner no longer has "${antigo}"`, () => {
    assert.ok(!runner.includes(antigo), `still in the runner: ${antigo}`);
  });
}

test('R3-04a: the only command blocks left are the three other scripts', () => {
  const blocos = [...runner.matchAll(/```bash\r?\n([\s\S]*?)```/g)].flatMap((m) => m[1].split(/\r?\n/)).map((l) => l.trim()).filter(Boolean);
  assert.deepEqual(blocos.map((l) => l.match(/^node _opencrew\/core\/scripts\/([\w-]+\.mjs) /)?.[1]), ['conferir-fontes.mjs', 'verificar.mjs']);
  assert.match(runner, /node _opencrew\/core\/scripts\/estado\.mjs "\{name\}" iniciar/);
});

test('R3-04a: the memory format and runs.md are checked by reading the file, with no command', () => {
  const init = flat(sectionOf(runner, '## Initialization'));
  assert.match(init, /\*\*Memory format migration\*\* — After loading `memories\.md`, check whether it uses the new format: it does when it has the `## Estilo de Escrita` section header \(read the file with the read tool — no command\)/);
  assert.match(init, /Check if `crews\/\{name\}\/_memory\/runs\.md` exists \(read tool — no command\)/);
  assert.doesNotMatch(runner, /NEW_FORMAT|OLD_FORMAT|EXISTS|MISSING|HAS_TLDR|SECTIONS:|TLDR:PASS/);
});

test('R3-04a: the output check, the section count and the TL;DR are one conferir call', () => {
  const saida = flat(sectionOf(runner, '### Post-Step Output Validation'));
  assert.match(saida, /run the `conferir` command[^.]*for EACH output file/);
  assert.match(saida, /Use ONLY the `conferir` command/);
  const contrato = flat(sectionOf(runner, '### Output Contract Validation'));
  assert.match(contrato, /add `--secoes \{min_sections\}` to the same `conferir` command/);
  assert.match(contrato, /add `--tldr` to the same `conferir` command/);
  assert.match(contrato, /`CAMINHO:REPROVADO \{motivo\}`/);
});

test('R3-04a: the examples no longer suggest that everything lives in v1', () => {
  const exemplo = flat(paths);
  assert.match(exemplo, /the researcher writes `…\/v1\/pesquisa\.md`, the writer writes `…\/v2\/post\.md` and reads `…\/v1\/pesquisa\.md`/);
  assert.match(exemplo, /Never assume `v1`/);
  assert.doesNotMatch(runner.replace(paths, ''), /\/v1\//, 'a path example outside the path section still says v1');
});

// ── R3-04b Safe names in the new commands (rule 11) ─────────────────────────────────

test('R3-04b: in every caminho.mjs command the crew name and the paths go between double quotes', () => {
  assert.ok(comandos.length >= 4, `expected at least the four commands, got ${comandos.length}`);
  for (const comando of comandos) {
    assert.match(comando, /^node _opencrew\/core\/scripts\/caminho\.mjs "\{name\}" (pasta|saida|entrada|conferir)( --run "\{run_id\}")?( --arquivo "\{[^"{}]+\}")?( --tema "\{tema\}" --passos \{N\}| --passo \{step\})?$/, comando);
  }
  assert.match(flat(paths), /safe-name rule \(nome seguro\)/);
});

// ── R3-04c The input comes from the script; the script that does not run (rules 8 and 10) ──

test('R3-04c: the input of a step comes from the entrada action', () => {
  assert.match(texto, /\*\*Pre-Step Input Validation\*\* — MANDATORY\. If the step's frontmatter declares an `inputFile`, the input comes from the `entrada` action/);
  assert.match(texto, /`CAMINHO:OK \{path\}` → that path is the step's input/);
});

test('R3-04c: a missing input keeps the question — skip the step or abort', () => {
  const pergunta = ['⚠️ Input for {Agent Name} not found: {path}', 'The previous step may have failed to produce output.', '1. Skip step and continue', '2. Abort pipeline'].join(' ');
  assert.match(texto, /`CAMINHO:FALTA \{path\}` → do NOT execute the step\. Present to user: ```/);
  assert.ok(texto.includes(pergunta), 'the "Input … not found" question is missing or changed');
});

test('R3-04c: a script that does not run — one line to the user, the written rule, "não verificado" at the end', () => {
  const FRASE = 'Não consegui rodar a conferência de caminhos; sigo pela regra escrita e marco os arquivos como não verificados.';
  assert.ok(flat(paths).includes(`\`${FRASE}\``), 'the sentence of spec §6 is missing or changed');
  assert.match(flat(paths), /no Node, an error, or no `CAMINHO:` line/);
  assert.match(flat(paths), /`\{arquivo\} — não verificado: a conferência de caminhos não rodou`/);
  const aprovacao = flat(sectionOf(runner, '### Review Loops'));
  assert.match(aprovacao, /every file the path script did not check/);
});

test('R3-04c: the path rule stays written in prose, for when the script does not run', () => {
  const regra = flat(paths);
  assert.match(regra, /starts with `crews\/\{name\}\/output\/` gets `\{run_id\}\/` right after `output\/`/);
  assert.match(regra, /highest `vN`[^.]*plus 1/);
  assert.match(regra, /`v10` comes after `v9`/);
  assert.match(regra, /from the highest `vN` down[^.]*then the group itself, with no version folder/);
  assert.match(regra, /once per group/);
});

// ── R3-04d Discovery and the folders (rules 12 and 13) ──────────────────────────────

test('R3-04d: discovery.prompt.md lists the crews with the folder-listing tool, not with ls', () => {
  assert.doesNotMatch(discovery, /ls crews\//);
  assert.doesNotMatch(discovery, /2>\/dev\/null/);
  assert.match(flat(discovery), /list the existing folders of `crews\/` with the IDE's folder-listing tool \(no shell command\)/);
});

test('R3-04d: neither the runner nor the Architect tells anyone to create a folder by command', () => {
  assert.doesNotMatch(runner, /mkdir|New-Item/);
  assert.doesNotMatch(texto, /Create the folder using Bash/);
  assert.match(texto, /\*\*Initialize run folder\*\*[\s\S]*Run the `pasta` command[\s\S]*Never create a folder by command yourself/);
  const mkdir = architect.split(/\r?\n/).filter((l) => /mkdir/i.test(l));
  assert.equal(mkdir.length, 1, 'the Architect mentions mkdir in one rule');
  assert.match(mkdir[0], /Never create directories by command/);
  assert.match(mkdir[0], /the folders of a run are created by the runner \(`_opencrew\/core\/scripts\/caminho\.mjs`\)/);
});
