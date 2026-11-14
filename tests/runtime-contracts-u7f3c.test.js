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
  assert.match(office, /app's native Browser/);
  assert.match(office, /add `--externo`/);
  assert.match(runner, /The Escritório never stops the run/);
});

test('U7F3C-05a: a pedido opens after confirmation and reports the chosen worker and reviewer', async () => {
  const pedido = await ler('_opencrew/core/prompts/pedido.prompt.md');
  const afterYes = pedido.indexOf('After the yes');
  const officeStart = pedido.indexOf('estado.mjs', afterYes);
  const officeOpen = pedido.indexOf('escritorio.mjs --automatico', officeStart);
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
  assert.match(codex, /Codex App built-in Browser/);
  assert.match(antigravity, /Antigravity's integrated browser agent/);
  assert.match(achatar(cli), /In a CLI harness, add `--externo` to open the system browser/);
});
