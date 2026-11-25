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
  iniciarRun: `${SCRIPT} iniciar --run "{run_id}" --passos {N}`,
  iniciarPedido: `${SCRIPT} iniciar --run "{run_id}" --pedido --agente {worker_id} --passos {N}`,
  pular: `${SCRIPT} pular --run "{run_id}" --agente {id}`,
  passoPipeline: `${SCRIPT} {passo or checkpoint} --run "{run_id}" --n {K} --agente {id} --rotulo "{label}" --mensagem "{message}"`,
  passoPedido: `${SCRIPT} passo --run "{run_id}" --pedido --n {K} --agente {worker_or_reviewer_id} --rotulo "{label}"`,
};
const EVENTOS = ['iniciar', 'pular', 'passo', 'checkpoint'];

// The "moment → command" table: [moment, command] of every row that runs the script.
const tabela = linhas(escritorio)
  .filter((l) => l.startsWith('|') && l.includes('estado.mjs'))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));

// ── E1-03a The runner calls the script; it does not write the state (rules 9 and 10) ──

test('U7F3C-05a: the Office table starts pipeline, resume and pedido with their exact run_id', () => {
  assert.ok(escritorio, 'the runner has no "## Escritório" section');
  assert.deepEqual(tabela.map(([, comando]) => comando), Object.values(COMANDOS).map((c) => `\`${c}\``));
});

test('U7F3C-05a: each run type has an opening moment after its existing confirmation', () => {
  assert.match(tabela[0][0], /^Start of `run` or confirmed `retomar`/);
  assert.match(tabela[1][0], /^Start of `pedir`, after the user's confirmation/);
  assert.match(tabela[2][0], /^Right after `iniciar`, once per deselected agent/);
  assert.match(tabela[3][0], /^Before each pipeline step or checkpoint/);
  assert.match(texto, /End of the run.*execucao\.mjs.*fechar/);
  assert.match(texto, /Run aborted.*execucao\.mjs fechar/);
});

test('U7F3C-01a: every command is on by default and Dashboard: off disables the Escritório', () => {
  tem(texto, 'Unless the already-loaded `preferences.md` has `Dashboard: off`');
  tem(texto, 'The legacy value `Dashboard: disabled` is on');
  tem(texto, 'With the explicit `off`, read nothing and run none of its commands');
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
  assert.ok(escritorio.includes('estado-escritorio.json'), 'per-run state must be described');
  tem(flat(nucleo), 'never read, write or describe `crews/{name}/state.json`');
  tem(texto, 'The script is the only writer. Never read, write or describe');
  tem(texto, '`crews/{name}/output/{run_id}/estado-escritorio.json`');
});

test('E1-03a: there is no handoff event', () => {
  assert.doesNotMatch(escritorio, /handoff/i);
  assert.doesNotMatch(runner, /`handoff`|"handoff"|no handoff\b/);
});

test('U7F3C-03c: pedido events use the selected agent and never infer from the pipeline step number', () => {
  tem(texto, 'pass `--pedido` on every pedido event');
  tem(texto, 'never infer it from pipeline step numbers');
  tem(texto, '`{id}`: the step\'s `agent:` value (the same text as the agent\'s `id` column in `crew-party.csv`) for `run`/`retomar`; a pedido uses the selected worker or reviewer id from that file');
});

test('E1-03a: a pipeline handoff keeps its optional transfer message', () => {
  tem(texto, '--mensagem "{message}"');
  tem(texto, '`{message}` says what the previous agent delivered');
});

// What a real run showed a literal AI gets wrong (2026-10-06): the total without the checkpoints,
// --agente on a step that has no agent, --mensagem on the very first passo.
test('E1 (review): --passos counts the checkpoints, a step or checkpoint without agent drops --agente, the first passo has no --mensagem', () => {
  assert.match(texto, /\{N\}.*step count/);
  tem(texto, '`{K}` is the current step');
  tem(texto, 'used only when the agent changed');
});

test('E1-03a: the runner carries the character list of rule 10', () => {
  tem(texto, 'one-line user-language text');
  tem(texto, 'letters (including accents), digits, spaces and `. , : ; - ( ) / ?`');
  tem(texto, 'drop quotes, `$`, backticks, `\\`, `%`, `!` and emoji');
  tem(texto, 'Omit empty text options.');
});

test('E1-03a: after iniciar the runner shows the "Runner, início" line of §6, once', () => {
  tem(texto, 'After the first `ESTADO:OK`, ensure the server and obtain the targeted URL');
  tem(texto, 'Show the URL as a clickable link in chat');
});

test('E1 (review): the commands run one at a time, each waiting for the ESTADO: line of the one before, never in parallel', () => {
  tem(texto, 'One event at a time');
  tem(texto, 'wait for each `ESTADO:` line before the next');
  tem(flat(fora), 'run `iniciar`, then one `pular` per deselected agent, one after the other (see "Escritório" below)');
});

// ── E1-03b The Escritório never stops the run (rule 11) ─────────────────────────────

test('E1-03b: a command that fails does not stop the run: no repeat, no question, one warning per run (§6)', () => {
  tem(texto, '**The Escritório never stops the run.**');
  tem(texto, 'Do not repeat a failed command or `ESTADO:IGNORADO`');
  tem(texto, 'then continue');
});

test('E1-03b: "escritório desligado" gives no warning and ends the calls for that run', () => {
  tem(texto, 'If it says `escritório desligado`, make no more Office calls for that run.');
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

test('U7F3C-02a: manual dashboard route starts or reuses the confirmed server and opens its address', () => {
  tem(painel, 'Start `node _opencrew/core/scripts/escritorio.mjs --automatico --historico` from the project root');
  tem(painel, 'opens the persistent manual history server and prints its confirmed URLs');
  tem(painel, 'open it in the harness Browser when available');
});

test('U7F3C-02c: an old server stays available while the current version uses another port', () => {
  tem(painel, 'An older server stays available on its port while the current version uses another one');
});

test('U7F3C-01b: /opencrew dashboard off writes off and touches nothing else', () => {
  tem(painel, '**`/opencrew dashboard off`** — write `- **Dashboard:** off` the same way (only that line) and touch nothing else');
});
