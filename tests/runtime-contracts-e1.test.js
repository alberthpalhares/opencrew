// Contracts the runtime prompts keep after E1 (specs/fase-e1-escritorio-ao-vivo.md: E1-03a,
// E1-03b and E1-03d — rules 9 to 12 and the runner texts of §6). E1-03c lives in docs.test.js.
// Like runtime-contracts.test.js, these guard the TEXT of the rules; whether a model obeys
// them is checked in sandbox/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nucleo, runnerCompleto } from './_runner.js';

const tpl = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const ler = (...partes) => readFileSync(path.join(tpl, ...partes), 'utf8');
// Since U5-2 the runner is a core file plus parts read on demand: these contracts read it with every part loaded (tests/_runner.js).
const runner = runnerCompleto;

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const linhas = (s) => s.split(/\r?\n/);
const secoesDe = (md) => md.split(/\n(?=#{2,4} )/);
const secoes = secoesDe(runner);
const escritorio = secoes.find((s) => s.startsWith('## Escritório')) ?? '';
const fora = secoes.filter((s) => s !== escritorio).join('\n');
const texto = flat(escritorio);
const tem = (onde, frase) => assert.ok(onde.includes(frase), `missing: ${frase}`);

const SCRIPT = 'node _opencrew/core/scripts/estado.mjs "{name}"';
const COMANDOS = {
  iniciar: `${SCRIPT} iniciar --passos {N}`,
  pular: `${SCRIPT} pular --agente {id}`,
  passo: `${SCRIPT} passo --n {K} --agente {id} --rotulo "{rótulo}" --mensagem "{frase}"`,
  checkpoint: `${SCRIPT} checkpoint --n {K} --agente {id} --rotulo "{rótulo}"`,
  concluir: `${SCRIPT} concluir`,
  falhar: `${SCRIPT} falhar --motivo "{motivo}"`,
};
const EVENTOS = Object.keys(COMANDOS);

// The "moment → command" table: [moment, command] of every row that runs the script.
const tabela = linhas(escritorio)
  .filter((l) => l.startsWith('|') && l.includes('estado.mjs'))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const momento = Object.fromEntries(tabela.map(([m, c]) => [c.match(/" (\w+)/)?.[1], m]));

// ── E1-03a The runner calls the script; it does not write the state (rules 9 and 10) ──

test('E1-03a: one section has the moment → command table: the six events, one exact one-line command each', () => {
  assert.ok(escritorio, 'the runner has no "## Escritório" section');
  assert.deepEqual(tabela.map(([, comando]) => comando), Object.values(COMANDOS).map((c) => `\`${c}\``));
});

test('E1-03a: the six moments are the ones of rule 10', () => {
  assert.deepEqual(Object.keys(momento), EVENTOS);
  assert.match(momento.iniciar, /^Start of the run/);
  assert.match(momento.pular, /^Right after `iniciar`, once per deselected agent/);
  assert.match(momento.passo, /^Before each step/);
  assert.match(momento.checkpoint, /^Before asking the question of a checkpoint/);
  assert.match(momento.concluir, /^End of the run/);
  assert.match(momento.falhar, /^Run aborted/);
});

test('E1-03a: every command depends on Dashboard: enabled, in the two forms preferences.md may have', () => {
  tem(texto, 'only when the already-loaded `preferences.md` has `Dashboard: enabled`');
  tem(texto, '`- **Dashboard:** enabled`');
  tem(texto, 'plain `Dashboard: enabled`');
  tem(texto, 'otherwise run none of these commands');
});

test('E1-03a: outside the section the script is never called; the old points keep a one-line conditional reminder', () => {
  assert.doesNotMatch(fora, /estado\.mjs/, 'a command outside the Escritório section');
  assert.doesNotMatch(fora, /dashboard_enabled|Dashboard Handoff|Post-Completion Cleanup|Update dashboard/);
  const lembretes = linhas(fora).filter((l) => /`(iniciar|pular|passo|concluir|falhar)`/.test(l));
  const citados = lembretes.flatMap((l) => [...l.matchAll(/`(\w+)`/g)].map((m) => m[1])).filter((e) => EVENTOS.includes(e));
  assert.deepEqual([...new Set(citados)].sort(), [...EVENTOS].sort(), 'each event has its reminder where it happens');
  for (const l of lembretes) {
    assert.match(l, /if (it|the Escritório) is on/, `reminder without the condition: ${l}`);
    assert.match(l, /\(see "Escritório" (above|below)\)/, `reminder that does not point to the section: ${l}`);
  }
});

test('E1-03a: the runner does not describe the JSON', () => {
  assert.doesNotMatch(runner, /"(crew|status|step|agents|handoff|desk|startedAt|updatedAt|completedAt)"\s*:/);
  assert.doesNotMatch(runner, /\b(delivering|desk)\b/);
});

test('E1-03a: the runner does not tell the AI to write, read or copy state.json', () => {
  assert.doesNotMatch(fora, /state\.json/, 'state.json is mentioned outside the Escritório section');
  // Since U5-2: once in the stub that stays in the core and once in the part, both times to forbid it.
  assert.equal(escritorio.split('state.json').length - 1, 2, 'state.json is named in the stub and in the part, to forbid it');
  tem(flat(nucleo), 'never read, write or describe `crews/{name}/state.json` yourself');
  tem(texto, 'The script is the only writer: never read, write or describe `crews/{name}/state.json` yourself.');
});

test('E1-03a: there is no handoff event', () => {
  assert.doesNotMatch(escritorio, /handoff/i);
  assert.doesNotMatch(runner, /`handoff`|"handoff"|no handoff\b/);
});

test('E1-03a: --agente is the id column of crew-party.csv and --passos counts the steps that will run', () => {
  tem(texto, "`{id}`: the agent's `id` column in `crew-party.csv`");
  tem(texto, 'with no `agent:` goes without `--agente`');
  tem(texto, '`{N}`: how many steps will run');
  tem(texto, "`{K}`: the step's position among them, from 1");
});

test('E1-03a: when the agent changes, passo carries one sentence on what the previous agent delivered', () => {
  tem(texto, '`--mensagem` goes only when the agent changed since the last `passo`');
  tem(texto, 'one sentence on what the previous agent delivered');
  tem(texto, 'never look at the next step');
});

// What a real run showed a literal AI gets wrong (2026-10-06): the total without the checkpoints,
// --agente on a step that has no agent, --mensagem on the very first passo.
test('E1 (review): --passos counts the checkpoints, a step or checkpoint without agent drops --agente, the first passo has no --mensagem', () => {
  tem(texto, "`{N}`: how many steps will run, checkpoints included (a deselected agent's steps do not count)");
  tem(texto, 'a step or checkpoint with no `agent:` goes without `--agente` (the table shows the full form)');
  tem(texto, 'since the last `passo` (so never on the first one): one sentence');
});

test('E1-03a: the runner carries the character list of rule 10', () => {
  tem(texto, '`--rotulo`, `--mensagem` and `--motivo` go between double quotes, on one line, starting with a letter or a digit');
  tem(texto, 'with only letters (accents included), digits, spaces and `. , : ; - ( ) / ?`');
  tem(texto, 'Drop every other sign (quotes of any kind, `$`, backtick, `\\`, `%`, `!`, emoji).');
  tem(texto, 'If no text is left, omit the option.');
});

test('E1-03a: after iniciar the runner shows the "Runner, início" line of §6, once', () => {
  tem(texto, 'show the user once: `Escritório ligado. Se a página não estiver aberta, rode em outro terminal: node _opencrew/core/scripts/escritorio.mjs`');
});

test('E1 (review): the commands run one at a time, each waiting for the ESTADO: line of the one before, never in parallel', () => {
  tem(texto, 'Run these commands one at a time, waiting for the `ESTADO:` line of each before the next — never in parallel or in the background (each one reads and rewrites the same file).');
  tem(flat(fora), 'run `iniciar`, then one `pular` per deselected agent, one after the other (see "Escritório" below)');
});

// ── E1-03b The Escritório never stops the run (rule 11) ─────────────────────────────

test('E1-03b: a command that fails does not stop the run: no repeat, no question, one warning per run (§6)', () => {
  tem(texto, '**The Escritório never stops the run.**');
  tem(texto, 'A command that fails, does not run or answers `ESTADO:IGNORADO`: go on, do not repeat that event, ask nothing, and tell the user once per run');
  tem(texto, '`O escritório não foi atualizado nesta execução; o trabalho segue normalmente.`');
});

test('E1-03b: "escritório desligado" gives no warning and ends the calls for that run', () => {
  tem(texto, 'With the reason "escritório desligado", say nothing and stop calling the script for the rest of this run.');
});

// ── E1-03d The other prompts leave the state to the script ──────────────────────────

test('E1-03d: build.prompt.md and repair.prompt.md do not tell the AI to write state.json', () => {
  for (const nome of ['build.prompt.md', 'repair.prompt.md']) {
    assert.doesNotMatch(ler('_opencrew', 'core', 'prompts', nome), /state\.json/, `${nome} still mentions state.json`);
  }
});

// ── Rule 12 — the route in the system prompt (E1-03c itself is in docs.test.js) ─────

const painel = flat(secoesDe(ler('AGENTS.md')).find((s) => s.startsWith('## Dashboard (Optional)')) ?? '');

test('E1 regra 12: /opencrew dashboard changes only the Dashboard line of preferences.md, or adds it at the end', () => {
  tem(painel, 'Write `- **Dashboard:** enabled` in `_opencrew/_memory/preferences.md`, changing only that line');
  tem(painel, 'if the file has no `Dashboard` line, add it at the end');
});

test('E1 regra 12: it starts the server in the background, shows the address and says the next run appears there', () => {
  tem(painel, 'Start `node _opencrew/core/scripts/escritorio.mjs` in the background');
  tem(painel, 'Show the address and tell the user that the next crew run appears there');
});

test('E1 regra 12: an IDE without background processes hands the command over; repeating the route is safe', () => {
  tem(painel, 'cannot keep a process running in the background');
  tem(painel, 'to run in another terminal');
  tem(painel, 'again is safe');
  tem(painel, 'the same address');
});

test('E1 regra 12: /opencrew dashboard off writes disabled and touches nothing else', () => {
  tem(painel, '**`/opencrew dashboard off`** — write `- **Dashboard:** disabled` the same way (only that line) and touch nothing else');
});
