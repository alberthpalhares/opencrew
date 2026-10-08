// Contracts the runtime prompts keep after U5, slice 3 (specs/fase-u5c-execucao-registrada.md:
// U5c-10a to U5c-10d). Like the other runtime-contracts files, these guard the TEXT of the rules;
// whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nucleo, parte } from './_runner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const linhas = (s) => s.split('\n').length;
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const EXECUCAO = 'node _opencrew/core/scripts/execucao.mjs "{name}"';
const registro = sectionOf(nucleo, '### Run record (registro da execução)');
const fim = parte('fim-da-execucao.md');
const retomar = parte('retomar.md');

test('U5c-10a: pasta carries the theme and the number of steps, and conferir the step — no extra command per step', () => {
  tem(nucleo, '`node _opencrew/core/scripts/caminho.mjs "{name}" pasta --tema "{tema}" --passos {N}` (no `--run`: the script creates the `run_id`)');
  tem(nucleo, '`node _opencrew/core/scripts/caminho.mjs "{name}" conferir --arquivo "{path}" --passo {step}`');
  tem(nucleo, 'It creates the folder of this run and its record');
  const comandos = [...nucleo.matchAll(/node _opencrew\/core\/scripts\/execucao\.mjs[^`\n|]*/g)].map((m) => m[0].trim());
  assert.deepEqual(comandos, [
    `${EXECUCAO} marcar --run "{run_id}" --passo {step} --evento checkpoint --resultado {resultado} --nota "{nota}"`,
    `${EXECUCAO} marcar --run "{run_id}" --passo {step} --evento revisao --resultado {resultado} --nota "{nota}"`,
    `${EXECUCAO} fechar --run "{run_id}" --resultado {resultado} --saida "{saída}"`,
  ], 'the three moments, and only them');
});

test('U5c-10a: marcar is asked at the checkpoint and at the review; fechar at the end and at every abort', () => {
  tem(sectionOf(nucleo, '#### If `type: checkpoint`'), 'Record the answer with the `marcar` command (`--evento checkpoint`, see "Run record") — last thing of the checkpoint, after the memory and the `outputFile` below are written');
  tem(sectionOf(nucleo, '### Review Loops'), 'After each verdict — once the review file passed `conferir` — run `marcar` (`--evento revisao`, see "Run record").');
  tem(sectionOf(nucleo, '### After Pipeline Completion'), 'close the run with the `fechar` command (the script writes the line of `runs.md`)');
  tem(sectionOf(nucleo, '## Error Handling'), 'When the run is aborted (by the user, by an error, or rejected at the last review cycle): run `fechar` with `abortado` or `rejeitado` (see "Run record")');
  tem(sectionOf(nucleo, '## Error Handling'), 'A run that just stopped (the conversation ended) stays open: `/opencrew retomar` finds it.');
});

test('U5c-10a: the values of each result are said, text goes clean to the command line, and only the scripts write', () => {
  tem(registro, 'checkpoint → `aprovado` (the user judged something the crew produced and accepted it as it is), `corrigido` (the answer asked for any change) or `pulado` (no judgement: the checkpoint only collected an answer — a topic, a choice — or was skipped)');
  tem(registro, 'revisao → `aprovado` or `rejeitado`');
  tem(registro, 'fechar → `aprovado`, `publicado` (an irreversible step published or sent), `rejeitado` (the review rejected at the last cycle and the user aborted) or `abortado`');
  tem(registro, 'when only a checkpoint reveals it, start with no `--tema` and add `--tema "{tema}"` to that checkpoint\'s `marcar`');
  tem(registro, 'one line between double quotes, only letters (accents included), digits, spaces and `. , : ; - ( ) / ?`; drop every other sign, and omit the option when no text is left');
  tem(registro, 'never read, write or describe `execucao.json` yourself, and never write `runs.md`');
  tem(registro, 'never stops the run: tell the user once and go on');
  tem(registro, '`{N}`: how many steps will run, checkpoints included.');
  assert.ok(!nucleo.includes('This state does NOT persist to disk'), 'the state now persists');
  assert.ok(linhas(nucleo) <= 560, `runner.pipeline.md has ${linhas(nucleo)} lines`);
});

test('U5c-10b: 2b runs fechar and never writes the row by hand; the score has one definition', () => {
  const b = fim.slice(fim.indexOf('### 2b.'), fim.indexOf('### 2c.'));
  tem(b, 'Never write `crews/{name}/_memory/runs.md` yourself. Close the run with the `fechar` command of the runner ("Run record")');
  tem(b, '`Data | Run ID | Tema | Output | Score | Resultado`');
  tem(b, 'the checkpoints the user approved without corrections ÷ the checkpoints the user answered (approved + corrected; a skipped one does not count), e.g. `2/3`; `—` when none was answered. Never compute it yourself.');
  tem(b, 'Do not write the row by hand.');
  assert.doesNotMatch(fim, /\{approved\}\/\{total/, 'the two old definitions of the score are gone');
  assert.doesNotMatch(fim, /Prepend one new row|create it first with/);
});

test('U5c-10b: 2c reads the list of the script, not the memory; ## Regras de Ouro has one name, also in the memory templates', () => {
  const c = fim.slice(fim.indexOf('### 2c.'), fim.indexOf('3. Present completion summary:'));
  tem(c, 'use the list the `fechar` command printed under `Correções das últimas execuções:`');
  tem(c, 'Do not search `memories.md` for past runs: by rule it keeps no run data.');
  tem(c, 'If the SAME pattern appears in **3 or more runs** (including this one)');
  const titulos = [nucleo, fim, parte('memoria.md'), ler('templates/_opencrew/core/prompts/build.prompt.md')].flatMap((t) => [...t.matchAll(/^\s*## Regras de Ouro.*$/gm)].map((m) => m[0].trim()));
  assert.ok(titulos.length >= 3, 'the header is in the end-of-run part and in the two memory templates');
  assert.deepEqual([...new Set(titulos)], ['## Regras de Ouro']);
  assert.doesNotMatch(fim, /promovidas após/);
  assert.ok(linhas(fim) <= 120, `fim-da-execucao.md has ${linhas(fim)} lines`);
});

test('U5c-10c: runner/retomar.md exists with its stub in the core, the route is in system.md and the question is the one of the spec', () => {
  tem(nucleo, '**Resuming** — only on `/opencrew retomar {name}`: before any step below, read `_opencrew/core/runner/retomar.md` completely and follow it — it asks the user first, then says when to do this Initialization, with no step 5b');
  tem(ler('templates/AGENTS.md'), '| `/opencrew retomar <name>` | Load Pipeline Runner → resume the run of that crew that stopped in the middle (`_opencrew/core/runner/retomar.md`) |');
  tem(retomar, '`A execução {run} ({tema}) parou depois do passo {k}. Já estão prontos: {lista}. Continuo do passo {N}?`');
  tem(retomar, '`Não há execução interrompida da crew {nome}.`');
  tem(retomar, `${EXECUCAO} retomar`);
  tem(retomar, '**except step 5b**: do not run `pasta`');
  tem(retomar, 'Only now, after the yes (nothing of the runner\'s Initialization runs before the question)');
  tem(retomar, 'next `verificacao-ciclo-{N}.md` is the number of verdicts there plus 1');
  assert.ok(nucleo.indexOf('**Resuming**') < nucleo.indexOf('1c. **Source check**'), 'the stub comes before the first command of the Initialization');
  tem(retomar, 'Step `{N}` is done whole, even when a file of it is already there');
  tem(retomar, 'never read `execucao.json` yourself');
  tem(retomar, '`Retomei pelo que está gravado. O que foi combinado só na conversa anterior não veio junto.`');
  assert.ok(linhas(retomar) <= 120);
});

test('U5c-10d: the repair prompt has the historico finding with its question, and deletes nothing', () => {
  const repair = ler('templates/_opencrew/core/prompts/repair.prompt.md');
  const linha = repair.split('\n').find((l) => l.startsWith('| `historico` |')) ?? '';
  tem(linha, '"A pasta {run} tem arquivos de uma execução que não está no histórico: {arquivos}. Qual foi o tema dela? (Se não lembrar, responda \'não sei\'.)"');
  tem(linha, '`--aplicar "historico:{run}={tema}"`');
  tem(linha, 'nothing is deleted');
  tem(repair, 'A line starting with `Nota:` (with any status) is information, not a finding');
});

test('U5c-upg-a: the tarball ships execucao.mjs, its modules and runner/retomar.md', () => {
  const res = spawnSync('npm pack --dry-run --json --ignore-scripts', { cwd: root, shell: true, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const arquivos = JSON.parse(res.stdout)[0].files.map((f) => f.path);
  const CORE = 'templates/_opencrew/core';
  for (const rel of ['scripts/execucao.mjs', 'scripts/execucao/registro.mjs', 'scripts/execucao/historico.mjs', 'scripts/execucao/retomar.mjs', 'scripts/execucao/argumentos.mjs', 'scripts/caminho/crew.mjs', 'scripts/conserto/historico.mjs', 'runner/retomar.md']) {
    assert.ok(arquivos.includes(`${CORE}/${rel}`), `missing from tarball: ${rel}`);
  }
});
