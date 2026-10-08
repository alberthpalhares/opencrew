// specs/fase-u5b-runner-dividido.md — U5, slice 2: the Pipeline Runner is a core file plus seven
// parts read on demand. These tests guard the split itself: the parts exist and are small, every
// stub names its part and its condition, what must stay in the core stays, and the package and an
// `update` deliver the parts. The sentences of each moved block are guarded by the older
// runtime-contracts files, which read the runner with every part loaded (tests/_runner.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ONDE, PARTES, nucleo, parte } from './_runner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const linhas = (s) => s.replace(/\r\n/g, '\n').split('\n').length;
const ESPERADAS = ['contrato-de-saida.md', 'escritorio.md', 'fim-da-execucao.md', 'fontes-pendentes.md', 'memoria.md', 'selecao-de-agentes.md', 'tarefas-do-agente.md'];
// What makes the AI read each part (spec §4).
const CONDICAO = {
  'selecao-de-agentes.md': 'ONLY if `crew.yaml` declares an `agent_dependencies:` field',
  'memoria.md': 'whether `memories.md` has the `## Estilo de Escrita` section header',
  'escritorio.md': 'Only when the already-loaded `preferences.md` has `Dashboard: enabled`',
  'tarefas-do-agente.md': 'Only when the agent\'s `.agent.md` frontmatter contains a `tasks:` field',
  'contrato-de-saida.md': 'Only when the step\'s frontmatter declares an `output_contract:` field',
  'fontes-pendentes.md': 'Otherwise (`FONTES:PENDENTE`, or the script did not run)',
  'fim-da-execucao.md': '**Close the run**',
};

/** The stub of a part: from the line it starts with to the next blank line (a heading stub: its paragraph). */
function toco(comeco) {
  const todas = nucleo.split('\n');
  const i = todas.findIndex((l) => l.startsWith(comeco));
  assert.ok(i >= 0, `stub not found: ${comeco}`);
  const de = comeco.startsWith('#') ? i + 2 : i;
  let ate = de;
  while (ate < todas.length && todas[ate].trim()) ate++;
  return todas.slice(de, ate);
}

test('U5b-01a: the seven parts exist, each starts with a # title and has at most 120 lines', () => {
  assert.deepEqual(PARTES, ESPERADAS);
  for (const nome of PARTES) {
    const texto = parte(nome);
    assert.match(texto, /^# \S/, `${nome} must start with a level-1 title`);
    assert.ok(texto.includes('> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`).'), `${nome} must say it is a part of the runner`);
    assert.ok(linhas(texto) <= 120, `${nome} has ${linhas(texto)} lines`);
  }
});

test('U5b-01b: the core has at most 560 lines; core plus parts, at most 930', () => {
  const total = linhas(nucleo) + PARTES.reduce((soma, nome) => soma + linhas(parte(nome)), 0);
  assert.ok(linhas(nucleo) <= 560, `runner.pipeline.md has ${linhas(nucleo)} lines`);
  assert.ok(total <= 930, `core + parts have ${total} lines`);
});

test('U5b-02a: every part has a stub in the core that names its path, says "completely" and has at most 8 lines', () => {
  assert.deepEqual(ONDE.map(([, nome]) => nome).sort(), ESPERADAS);
  for (const [comeco, nome] of ONDE) {
    const bloco = toco(comeco);
    const texto = flat(bloco.join('\n'));
    assert.ok(bloco.length <= 8, `the stub of ${nome} has ${bloco.length} lines`);
    assert.ok(texto.includes(`\`_opencrew/core/runner/${nome}\``), `the stub of ${nome} does not name its path`);
    assert.match(texto, /read\s+`_opencrew\/core\/runner\/[a-z-]+\.md` completely/, `the stub of ${nome} must say "read … completely"`);
    assert.ok(existsSync(path.join(root, 'templates', '_opencrew', 'core', 'runner', nome)));
  }
  for (const citado of flat(nucleo).matchAll(/_opencrew\/core\/runner\/([a-z-]+\.md)/g)) assert.ok(ESPERADAS.includes(citado[1]), `the core cites a part that does not exist: ${citado[1]}`);
});

test('U5b-02b: each stub carries the exact condition that makes the AI read the part', () => {
  for (const [comeco, nome] of ONDE) {
    assert.ok(flat(toco(comeco).join('\n')).includes(CONDICAO[nome]), `the stub of ${nome} lost its condition: ${CONDICAO[nome]}`);
  }
  const texto = flat(nucleo);
  assert.ok(texto.includes('If the field is absent, read nothing: run ALL agents, with no selection step.'));
  assert.ok(texto.includes('With the Dashboard off, read nothing and run none of its commands.'));
  assert.ok(texto.includes('Never skip it, and never write the memory or the history from what you remember of it.'));
});

test('U5b-03b: the safe-name rule and Output Path Transformation stay headings of the core, the first before any command', () => {
  assert.match(nucleo, /^## Safe names in commands \(nome seguro\)$/m);
  assert.match(nucleo, /^### Output Path Transformation$/m);
  assert.ok(nucleo.indexOf('## Safe names in commands (nome seguro)') < nucleo.indexOf('node _opencrew/core/scripts/'), 'the safe-name rule must come before the first command');
});

test('U5b-03c: estado.mjs is not in the core; its six commands are in the part; the stub forbids touching state.json', () => {
  assert.ok(!nucleo.includes('estado.mjs'), 'the core still names estado.mjs');
  const escritorio = parte('escritorio.md');
  for (const evento of ['iniciar', 'pular', 'passo', 'checkpoint', 'concluir', 'falhar']) {
    assert.ok(escritorio.includes(`node _opencrew/core/scripts/estado.mjs "{name}" ${evento}`), `no command for ${evento} in the part`);
  }
  assert.ok(flat(nucleo).includes('never read, write or describe `crews/{name}/state.json` yourself, and a failure there never stops the run'));
});

test('U5b-03d: the commands written in the core are the ones of the other four scripts', () => {
  const scripts = [...new Set([...nucleo.matchAll(/node _opencrew\/core\/scripts\/([a-z-]+\.mjs)/g)].map((m) => m[1]))].sort();
  assert.deepEqual(scripts, ['caminho.mjs', 'conferir-fontes.mjs', 'entregar.mjs', 'verificar.mjs']);
  for (const acao of ['pasta', 'entrada', 'saida', 'conferir']) assert.ok(nucleo.includes(`caminho.mjs "{name}" ${acao}`), `no caminho.mjs ${acao} in the core`);
});

test('U5b-03e: the "Step Execution Order (Summary)" recap is gone', () => {
  assert.ok(!nucleo.includes('Step Execution Order'));
  for (const nome of PARTES) assert.ok(!parte(nome).includes('Step Execution Order'), nome);
});

test('U5b-03a: what the end of the run needs is in its part, in order', () => {
  const fim = parte('fim-da-execucao.md');
  const ordem = ['### 2a. Update `memories.md`', '### 2b. Prepend to `runs.md`', '### 2c. Post-Run Reflection', '3. Present completion summary:', 'What would you like to do?'];
  let ultimo = -1;
  for (const marco of ordem) {
    const i = fim.indexOf(marco);
    assert.ok(i > ultimo, `"${marco}" is missing or out of order in fim-da-execucao.md`);
    ultimo = i;
  }
});

test('U5b-04a: the entry point no longer repeats the agent selection; it follows the runner', () => {
  const system = ler('templates/AGENTS.md');
  assert.ok(flat(system).includes('**Pre-Execution Agent Selection** — the runner says when it applies (only when `crew.yaml` declares `agent_dependencies:`) and which of its parts to read'));
  assert.doesNotMatch(system, /decision matrix/);
});

test('U5b-04b: the final menu the delivery prompt cites is still in the runner — in its end-of-run part', () => {
  const entrega = ler('templates/_opencrew/core/prompts/entrega.prompt.md');
  assert.ok(entrega.includes('(the final menu of the runner)'));
  assert.ok(parte('fim-da-execucao.md').includes('Edit this content'));
});

test('U5b-05a: the tarball ships the seven parts of the runner', () => {
  const res = spawnSync('npm pack --dry-run --json --ignore-scripts', { cwd: root, shell: true, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  const arquivos = JSON.parse(res.stdout)[0].files.map((f) => f.path);
  for (const nome of ESPERADAS) assert.ok(arquivos.includes(`templates/_opencrew/core/runner/${nome}`), `missing from tarball: ${nome}`);
});

test('U5b-upg-a: update from 1.12.0 (whole runner, no runner/ folder) delivers the new core and the seven parts; crews and memory untouched', async (t) => {
  const dir = await mkTmp('upgrade-u5b');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  await fs.rm(path.join(core, 'runner'), { recursive: true, force: true });
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# opencrew Pipeline Runner (1.12.0, whole)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.12.0\n');
  await fs.mkdir(path.join(dir, 'crews', 'x'), { recursive: true });
  await fs.writeFile(path.join(dir, 'crews', 'x', 'crew.yaml'), 'name: "x"\n');
  await fs.writeFile(path.join(dir, '_opencrew', '_memory', 'company.md'), '# Empresa Exemplo\n');
  const antes = { crews: await snapshot(path.join(dir, 'crews')), memoria: await snapshot(path.join(dir, '_opencrew', '_memory')) };

  await captureOutput(() => withCwd(dir, () => update()));

  for (const nome of ESPERADAS) assert.equal(await exists(path.join(core, 'runner', nome)), true, `missing after update: runner/${nome}`);
  const instalado = await fs.readFile(path.join(core, 'runner.pipeline.md'), 'utf8');
  assert.ok(instalado.includes('_opencrew/core/runner/fim-da-execucao.md'), 'the installed runner is not the new core');
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes.crews);
  assert.deepEqual(await snapshot(path.join(dir, '_opencrew', '_memory')), antes.memoria);
});

// From the real run (spec §10): what the split left behind, fixed.
test('U5b-02b: the core still names the five memory sections, the inline branch points to the tasks, and no part says "this section"', () => {
  const texto = flat(nucleo);
  for (const titulo of ['## Estilo de Escrita', '## Design Visual', '## Estrutura de Conteúdo', '## Proibições Explícitas', '## Técnico (específico do crew)']) {
    assert.ok(flat(toco('1b. **Memory format**').join('\n')).includes(`\`${titulo}\``), `the stub of the memory lost the section ${titulo}`);
  }
  assert.ok(texto.includes('an agent with `tasks:` runs them as `Task-Based Agent Execution` says'));
  for (const nome of PARTES) assert.doesNotMatch(parte(nome), /this section/i, `${nome} still says "this section"`);
  assert.ok(parte('fim-da-execucao.md').includes('items 2 and 3 below are the items 2 and 3 of that list'));
  assert.ok(parte('tarefas-do-agente.md').includes('`crews/{crew-name}/agents/{agent-id}/tasks/{task}.md`'));
  assert.ok(ler('templates/_opencrew/core/formato-da-crew.md').includes('agents/{agent-id}/tasks/'));
});