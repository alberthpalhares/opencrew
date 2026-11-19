// specs/fase-u7-f3c-escritorio-auto-open.md — U7F3C-01b and 05a.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ideById } from '../src/lib/ides.js';
import { templatesDir } from '../src/lib/paths.js';
import { runnerCompleto } from './_runner.js';
import { ligadoNoTexto } from '../templates/_opencrew/core/scripts/estado/preferencia.mjs';

const ler = (rel) => fs.readFile(path.join(templatesDir, rel), 'utf8');
const achatar = (texto) => texto.replace(/\s+/g, ' ').trim();

test('U7F3C-01a: missing and legacy preferences stay on; only Dashboard: off disables', () => {
  for (const texto of ['', '- **Dashboard:** disabled\n', 'Dashboard: enabled\n', 'Dashboard: enabledx\n']) {
    assert.equal(ligadoNoTexto(texto), true, texto);
  }
  assert.equal(ligadoNoTexto('- **Dashboard:** off\n'), false);
  assert.equal(ligadoNoTexto('Dashboard: OFF\n'), false);
});

test('U7F3C-01b: /opencrew dashboard off only changes the preference line', async () => {
  const agents = await ler('AGENTS.md');
  const dashboard = agents.slice(agents.indexOf('## Dashboard (Optional)'));
  assert.match(dashboard, /`\/opencrew dashboard off`[\s\S]*?Dashboard:\*\* off/);
  assert.match(dashboard, /only that line/);
  assert.match(dashboard, /stop no process, delete no file/);
});

test('U7F3C-05a: run and resume open their own Office after the run state starts', () => {
  const runner = achatar(runnerCompleto);
  const office = achatar(runnerCompleto.split('## Escritório')[1].split('## Execution Rules')[0]);
  assert.match(office, /Start of `run` or confirmed `retomar`/);
  assert.match(office, /--run "\{run_id\}"/);
  assert.match(office, /escritorio\.mjs --automatico --crew "\{name\}" --run "\{run_id\}"/);
  assert.match(office, /HTTP 200[\s\S]*exact `run_id`/);
  assert.match(office, /app's visible native Browser/);
  assert.match(office, /add `--externo`/i);
  assert.match(runner, /The Escritório never stops the run/);
});

test('U7F3C-05a: a pedido opens after confirmation and reports the chosen worker and reviewer', async () => {
  const pedido = await ler('_opencrew/core/prompts/pedido.prompt.md');
  const afterYes = pedido.indexOf('After the yes');
  const officeStart = pedido.indexOf('estado.mjs', afterYes);
  const officeOpen = pedido.indexOf('_opencrew/core/runner/escritorio.md', officeStart);
  assert.ok(afterYes >= 0 && officeStart > afterYes && officeOpen > officeStart);
  assert.match(pedido, /iniciar --run "\{run_id\}" --pedido --agente \{worker_id\}/);
  assert.match(pedido, /passo --run "\{run_id\}" --pedido --n 2 --agente \{reviewer_id\}/);
  assert.match(pedido, /checkpoint --run "\{run_id\}" --pedido --n \{3 or 2\}/);
  assert.match(pedido, /pedido agents are not inferred from pipeline steps/);
});

test('U7F3C-05a: app bridges select native Browser and CLI bridges select the system browser', () => {
  const claude = ideById('claude-code').files.map((f) => f.content).join('\n');
  const codex = ideById('codex').files.map((f) => f.content).join('\n');
  const antigravity = ideById('antigravity').files.map((f) => f.content).join('\n');
  const cli = ideById('gemini').files.map((f) => f.content).join('\n');
  assert.match(claude, /Claude Code Desktop[\s\S]*native Browser pane/);
  assert.match(codex, /Codex App integrated Browser/);
  assert.match(antigravity, /Antigravity's integrated browser agent/);
  assert.match(cli ? achatar(cli) : '', /In a CLI harness, add `--externo`/);
});

test('U7F3C-06b: runner initialization points directly to opening the Browser, sandbox/daemon rules are explicit, and Antigravity bridge has no subagent contradiction', async () => {
  const pipeline = await ler('_opencrew/core/runner.pipeline.md');
  const step6 = pipeline.split(/\r?\n/).find((l) => l.startsWith('6. **Escritório**')) ?? '';
  assert.match(step6, /open its live URL automatically in the Browser/);
  const office = achatar(await ler('_opencrew/core/runner/escritorio.md'));
  assert.match(office, /--preparar/);
  assert.match(office, /ESCRITORIO:DAEMON/);
  assert.match(office, /--servidor --porta/);
  const pedido = achatar(await ler('_opencrew/core/prompts/pedido.prompt.md'));
  assert.match(pedido, /shared server launch, exact-run confirmation, Browser and fallback flow/);
  const antigravity = achatar(ideById('antigravity').files.map((f) => f.content).join('\n'));
  assert.match(antigravity, /--automatico --preparar/);
  assert.match(antigravity, /IsDaemon: true/);
  assert.match(antigravity, /Run \*\*crew pipeline steps\*\* inline and sequentially/);
  assert.doesNotMatch(antigravity, /This environment does not support background\/parallel subagents\./);
});

test('U7F3C-06c: Antigravity bridge forces execution: subagent crew steps inline and standalone node script calls', () => {
  const antigravity = achatar(ideById('antigravity').files.map((f) => f.content).join('\n'));
  assert.match(antigravity, /execution: subagent[\s\S]*inline/i);
  assert.match(antigravity, /standalone `node` command/i);
  assert.match(antigravity, /never chain script commands with `&&` or `;`/i);
});

test('U7F3C-07c: Codex bridge opens the confirmed Office URL in a visible integrated browser', () => {
  const codex = ideById('codex').files.map((f) => f.content).join('\n');
  assert.match(codex, /After the Office command returns a confirmed `ESCRITORIO:URL`/);
  assert.match(codex, /visible tab with the integrated Browser tool/);
  assert.match(codex, /verify that the Office page loaded/);
  assert.match(codex, /host policy blocks navigation/);
  assert.match(codex, /--automatico --preparar/);
  assert.match(codex, /--automatico --confirmar --porta/);
  assert.match(codex, /If startup or confirmation reports `ESCRITORIO:PORTA_OCUPADA`, repeat preparation and startup once/);
  const antigravity = ideById('antigravity').files.map((f) => f.content).join('\n');
  assert.match(antigravity, /--automatico --confirmar --porta/);
  assert.match(antigravity, /Open only the confirmed `ESCRITORIO:URL`/);
});

test('U7F3C-07d: Dashboard off prevents Office state updates and browser startup', async () => {
  const office = achatar(await ler('_opencrew/core/runner/escritorio.md'));
  const pedido = achatar(await ler('_opencrew/core/prompts/pedido.prompt.md'));
  const runner = achatar(runnerCompleto);
  assert.equal(ligadoNoTexto('- **Dashboard:** off\n'), false);
  assert.match(office, /only `Dashboard: off` disables it/);
  assert.match(office, /Start of `run` or confirmed `retomar`/);
  assert.match(pedido, /shared server launch, exact-run confirmation, Browser and fallback flow/);
  assert.match(runner, /read `_opencrew\/core\/runner\/escritorio\.md` completely once/i);
  assert.match(office, /If it says `escritório desligado`, make no more Office calls/);
});

test('E6-03a: runner, pedido, AGENTS and IDE bridges instruct showing mobile/tablet network URLs in chat', async () => {
  const office = achatar(runnerCompleto.split('## Escritório')[1].split('## Execution Rules')[0]);
  const pedido = achatar(await ler('_opencrew/core/prompts/pedido.prompt.md'));
  const agents = achatar(await ler('AGENTS.md'));
  const bridge = achatar(ideById('claude-code').files.map((f) => f.content).join('\n'));
  for (const [nome, texto] of [['runner/escritorio.md', office], ['pedido.prompt.md', pedido], ['templates/AGENTS.md', agents], ['src/lib/ides.js', bridge]]) {
    assert.match(texto, /ESCRITORIO:URL_REDE/, nome);
    assert.match(texto, /ESCRITORIO:URL_VPN/, nome);
  }
});
