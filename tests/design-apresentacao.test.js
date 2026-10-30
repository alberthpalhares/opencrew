// specs/fase-r5-criacao-de-crew.md — crew creation: the team size follows the tier the user chose,
// and the team (people) is shown apart from the pipeline (steps). Like the other runtime-contracts
// files, these guard the TEXT of the prompts; whether a model obeys them is checked with a real
// run (spec §7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CORE = new URL('../templates/_opencrew/core/prompts/', import.meta.url);
const ler = (nome) => readFileSync(new URL(nome, CORE), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const design = ler('design.prompt.md');
const discovery = ler('discovery.prompt.md');
const build = ler('build.prompt.md');

// A phase is the text from its heading up to the next heading of the same level.
const fase = (titulo, ate) => {
  const i = design.indexOf(titulo);
  const f = design.indexOf(ate, i + titulo.length);
  assert.ok(i > -1 && f > i, `phase not found: ${titulo}`);
  return flat(design.slice(i, f));
};
const D = fase('## Phase D: Role Proposal', '## Phase E:');
const F = fase('## Phase F: Agent Design', '## Phase G:');
const G = fase('## Phase G: Pipeline Design', '## Phase H:');
const B5 = fase('## Phase B.5: Tier Selection', '## Phase C:');
const H = fase('## Phase H: Design Presentation', '## Phase H.5:');
const OUTPUT = fase('## Output: `_build/design.yaml`', '## Rules');

test('R5-01a: Phase D takes the number of people from the tier, not from the complexity', () => {
  assert.match(D, /number of people comes from the \*\*Agent count\*\* row of the Tier Impact table/);
  assert.match(D, /Express 2-3, Standard 3-5, Full 5-7/);
  assert.doesNotMatch(D, /Suggest based on crew complexity/);
});

test('R5-01b: a team outside the tier range makes the AI ask whether to keep the tier or change it', () => {
  assert.match(D, /outside the range[^.]*ask[^.]*keep the tier or change it/i);
  assert.match(D, /Mantém o tier ou muda\?/);
});

test('R5-02a: Phase D announces tier and range, and lists only people', () => {
  assert.match(D, /Você escolheu \{tier\} → \{min\} a \{max\} pessoas/);
  assert.match(D, /only people[^.]*no steps, no tasks, no skills/i);
});

test('R5-03a: Phase F adds no agent beyond Phase D; Phase G creates one creator per format only when the tier allows', () => {
  assert.match(F, /number of agents was closed in Phase D; Phase F adds no agent/);
  assert.match(F, /one creator can serve several formats/);
  assert.match(F, /`format:` belongs to the step, not to the agent/);
  assert.match(G, /ONE dedicated creator agent per target format when the tier's range allows/);
});

test('R5-04a: the Default Tier is marked, and the template summary shows tier and team together', () => {
  assert.match(B5, /\(padrão das suas preferências\)/);
  assert.ok(flat(discovery).includes('Tier: {tier} · Time: {N} pessoas'));
  assert.doesNotMatch(discovery, /Time sugerido: \{N\} agentes/);
});

test('R5-05a: Phase H has two blocks, in Portuguese, without the old English presentation or the tasks line', () => {
  assert.match(H, /👥 \*\*Time — \{N\} pessoas\*\*/);
  assert.match(H, /🔀 \*\*Pipeline — \{M\} passos\*\*/);
  assert.match(H, /Posso criar\?/);
  assert.doesNotMatch(H, /I'll create a crew/);
  assert.doesNotMatch(H, /Tasks:/);
});

test('R5-05b: Phase H labels steps by action, calls the checkpoint "você decide" and never lists the agent tasks', () => {
  assert.match(H, /label every step with an action, never with a person's name or a role/i);
  assert.match(H, /você decide/);
  assert.match(H, /never list an agent's tasks/i);
  assert.match(H, /same person can appear in several steps/i);
});

test('R5-06a: before writing design.yaml the AI checks N people and M steps against agents: and pipeline:', () => {
  assert.match(OUTPUT, /before writing[^.]*`agents:` has N entries and `pipeline:` has M/i);
});

test('R5-07a: the Build summary says people and steps, and build.prompt.md did not grow past 651 lines', () => {
  assert.ok(flat(build).includes('Crew "{name}" criada: {N} pessoas, {M} passos no pipeline!'));
  assert.ok(build.split(/\r?\n/).length <= 651, 'build.prompt.md has more than 651 lines');
});

test('R5-08a: design.prompt.md did not grow past 703 lines', () => {
  assert.ok(design.split(/\r?\n/).length <= 703, 'design.prompt.md has more than 703 lines');
});
