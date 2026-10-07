// Contracts the runner prompt keeps after R1 (specs/fase-r1-reparos-1-6-1.md: R1-07, R1-09c),
// plus the step format of the build prompt (max_review_cycles, R1-07b).
// Like runtime-contracts.test.js, these guard the TEXT of the rules; whether a model obeys
// them is checked in sandbox/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkTmp } from './_helpers.js';

const tpl = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const runner = readFileSync(path.join(tpl, '_opencrew', 'core', 'runner.pipeline.md'), 'utf8');
const build = readFileSync(path.join(tpl, '_opencrew', 'core', 'prompts', 'build.prompt.md'), 'utf8');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const section = (start) => sectionOf(runner, start);
// The numbered items of a section, flattened: [intro, item, item, …].
const items = (start) => section(start).split(/\n(?=\d+[a-z]?\. )/).map(flat);
const between = (from, to) => flat(runner.slice(runner.indexOf(from), runner.indexOf(to)));

const init = items('## Initialization');
const sourceCheck = init.find((s) => /^\d+[a-z]?\. \*\*Source check\*\*/.test(s)) ?? '';
const loading = flat(section('### Agent Loading'));
const checkpoint = flat(section('#### If `type: checkpoint`'));
const memoryUpdate = between('### 2a. Update `memories.md`', '### 2b.');
const [, check = '', , cycles = '', limit = '', approval = ''] = items('### Review Loops');
const stepFormat = flat(sectionOf(build, '### Pipeline Step Format'));

// ── R1-07 Runner (rules 1, 11 and 18 to 21) ─────────────────────────────────────────

test('R1-07a: the checker gets caminho=formato items, with the format: of the step that wrote each file', () => {
  assert.match(check, /Each item is `caminho=formato`, with the `format:` of the step that generated that file/);
  // Since 1.9.0 the command ends with --relatorio (U3a-09g-f2, tests/runtime-contracts-u3a2.test.js).
  assert.match(check, /verificar\.mjs --crew "crews\/\{name\}" --arquivo "\{path1\}=\{format1\},\{path2\},…" --relatorio "[^"]+" ```/);
});

test('R1-07a: the runner no longer passes --formato', () => {
  assert.doesNotMatch(runner, /--formato/, 'the runner still mentions --formato');
});

test('R1-07a: a step with no format:, or with an export format, goes without =formato', () => {
  assert.match(check, /a step with no `format:`, with an export format \(`pdf`, `csv`, `formatted-post`\) or with one outside \S+ goes without `=formato`/);
});

// The checker only takes `=formato` in lowercase letters, digits and hyphens: anything else makes
// it read the whole item as a path, and the file comes out as "arquivo não encontrado".
test('R1-07a: a format: outside [a-z0-9-]+ goes without =formato', () => {
  assert.match(check, /or with one outside `\[a-z0-9-\]\+` goes without `=formato`/);
});

test('R1 revisão: the crew folder goes between quotes in the two script commands', () => {
  assert.match(sourceCheck, /conferir-fontes\.mjs --crew "crews\/\{name\}" ```/);
  assert.match(check, /verificar\.mjs --crew "crews\/\{name\}" --arquivo "/);
});

test('R1-07b: a cycle is one pass of the reviewer; max_review_cycles lives next to on_reject and defaults to 3', () => {
  assert.match(cycles, /a \*\*cycle\*\* is one pass of the reviewer/);
  assert.match(cycles, /`max_review_cycles`, an integer from 1 declared where the step declares `on_reject` \(the step frontmatter or its `pipeline\.yaml` entry\)/);
  assert.match(cycles, /absent or invalid: 3\./);
});

// The build records the tier's limit (design.prompt.md: "On-reject loops | 1 max | 2 max | 3 max").
test('R1-07b: the build writes max_review_cycles next to on_reject, by crew tier (1, 2, 3); without it the runner still uses 3', () => {
  assert.match(stepFormat, /max_review_cycles: \{N\} # ONLY for the review step: write it next to its `on_reject`\./);
  assert.match(stepFormat, /By crew tier \(`crew\.tier` in design\.yaml\): Express 1, Standard 2, Full 3\./);
  assert.match(cycles, /absent or invalid: 3\./);
});

test('R1-07b: at the limit the run stops; without VERIFICACAO:BLOQUEADA the user sees the reviewer feedback and the three options', () => {
  assert.match(limit, /If the last allowed pass also rejects, stop/);
  assert.match(limit, /\{if VERIFICACAO:BLOQUEADA\} ⚠️ A revisão ainda encontra bloqueios depois de \{N\} ciclos: \{lista de bloqueios do relatório\}/);
  assert.match(limit, /\{any other status\} A revisão não aprovou o texto depois de \{N\} ciclos\. Motivo: \{parecer resumido\} 1\. Corrigir eu mesmo/);
  assert.match(limit, /1\. Corrigir eu mesmo[^`]*2\. Aceitar assim mesmo[^`]*3\. Abortar/);
});

// With AGUARDANDO_USUARIO the only blocks are [PREENCHER]: "blocks remain" picked the wrong message.
test('R1-07b: at the limit the status of the last report picks the message, as in item 2', () => {
  assert.match(limit, /the status of the last report picks the message, as in item 2 — `VERIFICACAO:BLOQUEADA`: the blocks; any other status: the reviewer's feedback/);
  assert.match(limit, /also with `VERIFICACAO:AGUARDANDO_USUARIO` \(its only blocks are `\[PREENCHER: …\]`\)\. Same three options:/);
  assert.doesNotMatch(limit, /blocks remain|no block\b/);
});

// R1 took "fica registrado" out because nothing recorded the choice. Since 1.9.0 the delivery
// does (the ressalva — specs/fase-u3a2-entrega-no-projeto.md, rule 22), and the option says where.
test('R1-07b: "Aceitar assim mesmo" only says the choice is recorded where it is — in the delivery', () => {
  assert.match(limit, /2\. Aceitar assim mesmo \(fica registrado na entrega\) 3\. Abortar/);
  assert.equal(runner.split('fica registrado').length - 1, 1, '"fica registrado" appears somewhere else in the runner');
});

const REGRAS_DO_REVISOR = [
  '--- REGRAS DO REVISOR ---',
  '- Copie os valores medidos do relatório; nunca estime contagens.',
  '- Bloqueio no relatório é REJECT, seja qual for a nota — menos [PREENCHER], que o usuário resolve na aprovação final.',
  '- Alerta não resolvido nem justificado limita a nota a 7/10.',
  '- O checklist só marca o que o relatório confirma; item "não medido" ou "não verificado" é dito assim, nunca como aprovado.',
];

test('R1-07c: the reviewer block is injected in every step with on_reject', () => {
  assert.match(loading, /\*\*Reviewer rules \(always\)\*\* — for every step with `on_reject:`, inject at the same point: ``` --- REGRAS DO REVISOR ---/);
});

test('R1-07c: the block carries the four lines of rule 19, with the [PREENCHER] exception', () => {
  const at = loading.indexOf(REGRAS_DO_REVISOR[0]);
  assert.ok(at > -1, 'the runner has no "--- REGRAS DO REVISOR ---" block');
  assert.equal(loading.slice(at, loading.indexOf('```', at)).trim(), REGRAS_DO_REVISOR.join(' '));
});

test('R1-07d: a checker that did not run is announced and the run goes on', () => {
  assert.match(check, /If the checker did not run \(no Node, an error, or no `VERIFICACAO:` status line\), tell the user, continue with the normal review/);
  assert.match(check, /: "⚠️ A verificação automática não rodou: \{motivo\}"/);
});

test('R1-07d: the final approval repeats the checker warning', () => {
  assert.match(check, /and repeat it at the final approval: "⚠️ A verificação automática não rodou/);
  assert.match(approval, /repeat every "não rodou" warning of this run \([^)]*checker/);
});

test('R1-07e: the final approval shows how many items were not measured or not verified, and lists them', () => {
  assert.match(approval, /`Verificação automática: \{N\} bloqueios, \{M\} alertas, \{Z\} não medidos`/);
  assert.match(approval, /the \{Z\} items not measured or not verified \(the `Não medido` and `Não verificado` lines under each file/);
  assert.match(approval, /as `\{arquivo\} — \{motivo\}`/);
});

// {Z} leaves out the files that are not text (spec §4): listing them would show "0 não medidos"
// followed by one line per image.
test('R1-07e: the list is the set {Z} counts: the "não é texto" line of Notas stays out of it', () => {
  assert.match(approval, /lines under each file, not the "não é texto" line of \*\*Notas\*\*\), one per line/);
});

// The notes (overlay without limits, preferred terms, {{variável}}) were only in the saved report.
test('R1 revisão: the final approval also shows the lines of **Notas:**, as they are written', () => {
  assert.match(approval, /as `\{arquivo\} — \{motivo\}`, then the lines under `\*\*Notas:\*\*` in that report, as they are written, and repeat every "não rodou" warning/);
});

const FORMA_CANONICA = /`## Proibições Explícitas`[^.]*canonical form[^.]*`- Nunca usar "termo"`[^.]*`- Nunca usar "termo" → usar "outro"`/;

test('R1-07f: a ban is written in the canonical form at the checkpoint', () => {
  assert.match(checkpoint, FORMA_CANONICA);
});

test('R1-07f: a ban is written in the canonical form in the end-of-run memory update', () => {
  assert.match(memoryUpdate, FORMA_CANONICA);
});

test('R1-07g: the reviewer feedback goes to the writer on every rejection, with or without a block', () => {
  assert.match(cycles, /On every rejection, with or without a block, send the reviewer's feedback to the writer/);
});

test('R1-07h: a source check that did not run is announced and the run goes on', () => {
  assert.match(sourceCheck, /If the script did not run \(no Node, an error, or no `FONTES:` status line\)/);
  assert.match(sourceCheck, /tell the user "⚠️ A conferência de fontes não rodou: \{motivo\}" and continue/);
});

test('R1-07h: the final approval repeats the source-check warning', () => {
  assert.match(sourceCheck, /não rodou: \{motivo\}" and continue; the final approval repeats the warning/);
  assert.match(approval, /repeat every "não rodou" warning of this run \([^)]*source check/);
});

test('R1-07i: the source check runs before the sources are loaded', () => {
  const order = init.map((s) => s.match(/^\d+[a-z]?\. \*\*(Source check|Project sources)/)?.[1]).filter(Boolean);
  assert.deepEqual(order, ['Source check', 'Project sources']);
  assert.match(sourceCheck, /\*\*Source check\*\* — before loading the project sources/);
});

// At 1c nothing was loaded from `fontes:` yet: what --corrigir may have changed is read again
// (crew.yaml, agent files), and 1d is where the sources are read, already from the new paths.
test('R1-07i: after --corrigir the changed crew files are read again and 1d loads the sources from the corrected paths', () => {
  assert.match(sourceCheck, /run the same command with `--corrigir`, show the new result and re-read `crew\.yaml` and any agent file already loaded \(it may have changed them\); 1d then loads the sources from the corrected paths/);
  assert.doesNotMatch(sourceCheck, /re-read[^.;]*\bthe sources\b/, '1c asks to re-read sources that 1d has not loaded yet');
});

// --corrigir only changes what has a single suggestion: offering "Corrigir" again would loop.
test('R1 revisão: a source check still pending after --corrigir asks again, with options 2 and 3 only', () => {
  assert.match(sourceCheck, /from the corrected paths\. If the new result still ends in `FONTES:PENDENTE`, ask again with options 2 and 3 only\./);
});

// ── R1-09c The whole payload, not only the five files U1-05b lists ──────────────────

const RX_1440 = /1080\s*[x×]\s*1440/i;
const SKIPPED = path.join('skills', 'opencrew-skill-creator') + path.sep;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

// Files under `root` (outside opencrew-skill-creator) that still mention 1080 x 1440.
function mentions1440(root) {
  return walk(root)
    .map((file) => path.relative(root, file))
    .filter((rel) => !rel.startsWith(SKIPPED) && RX_1440.test(readFileSync(path.join(root, rel), 'utf8')))
    .map((rel) => rel.split(path.sep).join('/'))
    .sort();
}

test('R1-09c: no file in templates/ (outside opencrew-skill-creator) mentions 1080 x 1440', () => {
  assert.deepEqual(mentions1440(tpl), []);
});

test('R1-09c: the scan catches each spelling in any folder and skips opencrew-skill-creator', async () => {
  const dir = await mkTmp('r1-09c');
  const plant = (rel, text) => {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text);
  };
  try {
    plant('skills/a/SKILL.md', 'viewport: 1080x1440');
    plant('skills/b/base.html', '<p>1080 × 1440</p>');
    plant('_opencrew/core/c.yaml', 'size: 1080 X 1440');
    plant('skills/d/ok.md', 'viewport: 1080x1350');
    plant('skills/opencrew-skill-creator/e.md', '1080x1440');
    assert.deepEqual(mentions1440(dir), ['_opencrew/core/c.yaml', 'skills/a/SKILL.md', 'skills/b/base.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
