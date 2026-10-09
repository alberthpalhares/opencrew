// Contracts the runtime prompts keep after U6, slice 1 (specs/fase-u6a-polimento-do-uso-real.md:
// U6a-03 to U6a-07 and U6a-upg-a). Like the other runtime-contracts files, these guard the TEXT of the
// rules; whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA } from './_conserto.js';
import { PARTES, nucleo, parte } from './_runner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tem = (onde, frase) => assert.ok(flat(onde).includes(flat(frase)), `missing: ${frase}`);
const linhas = (s) => s.split('\n').length;
const CORE = 'templates/_opencrew/core';
const entrega = ler(`${CORE}/prompts/entrega.prompt.md`);
const pedido = ler(`${CORE}/prompts/pedido.prompt.md`);

test('U6a-03a: "Corrigir agora" opens a new version, through the item 3 of the correction part, and the list gets the new path', () => {
  tem(entrega, 'fix the file the pending item names, never inside `entrega/`, as a **new version**: read `_opencrew/core/runner/correcao-no-checkpoint.md` and follow its item 3');
  tem(entrega, 'with the list that has the **new** path in place of the old one');
  assert.doesNotMatch(entrega, /and in place — the same file|no new `vN` folder/);
});

test('U6a-03b: the verdicts of a pedido go to revisao/vN, and with the real path script the text keeps v1, v2… alone', async (t) => {
  tem(pedido, '`crews/{name}/output/revisao/revisao.md` through `saida` and `conferir --passo 2` (verdicts in `revisao/v1`, `revisao/v2`…; the text keeps `v1`, `v2`… alone)');
  const raiz = await mkTmp('u6a-revisao');
  t.after(() => fs.rm(raiz, { recursive: true, force: true }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await fs.mkdir(path.join(raiz, 'crews', 'x'), { recursive: true });
  const { main } = await import('../templates/_opencrew/core/scripts/caminho.mjs');
  const rodar = async (...argv) => { const l = []; await main(['x', ...argv], { cwd: raiz, escrever: (s) => l.push(s) }); return l.at(-1); };
  const RUN = '2026-10-09-101010';
  await rodar('pasta', '--run', RUN, '--pedido');
  const sequencia = [];
  for (const arquivo of ['oficio', 'revisao/revisao', 'oficio', 'revisao/revisao', 'oficio']) sequencia.push(await rodar('saida', '--run', RUN, '--arquivo', `crews/x/output/${arquivo}.md`));
  const base = `CAMINHO:OK crews/x/output/${RUN}`;
  assert.deepEqual(sequencia, [`${base}/v1/oficio.md`, `${base}/revisao/v1/revisao.md`, `${base}/v2/oficio.md`, `${base}/revisao/v2/revisao.md`, `${base}/v3/oficio.md`]);
});

test('U6a-05a: the fixed texts the user sees are PT-BR in the end of the run, the repair, the agent selection and the output contract', () => {
  const fim = parte('fim-da-execucao.md');
  for (const frase of ['✅ Execução concluída!', '📁 Entrega: crews/{name}/output/{run_id}/entrega/ — comece pelo LEIA-ME.md', 'O que você quer fazer?', '● Rodar de novo (outro tema)', '○ Editar este conteúdo', '○ Voltar ao menu']) tem(fim, frase);
  for (const ingles of ['Pipeline complete', 'What would you like to do?', 'Run again (new topic)', 'Back to menu']) assert.ok(!fim.includes(ingles), `still in English: ${ingles}`);
  tem(ler(`${CORE}/prompts/repair.prompt.md`), 'Then: `Para rodar: /opencrew run {code}`.');
  assert.ok(!ler(`${CORE}/prompts/repair.prompt.md`).includes('Run it:'));
  const selecao = parte('selecao-de-agentes.md');
  for (const frase of ['Quais agentes devem trabalhar nesta tarefa?', 'Seleção sugerida:', 'Responda com os números dos agentes que você quer INCLUIR', 'Responda "todos" para rodar todos', 'normalmente depende do resultado de {required_agent}', 'Incluir {required_agent} de novo (recomendado)', 'Seguir sem ele — eu mesmo forneço o dado', 'Deixar {dependent} de fora também']) tem(selecao, frase);
  for (const ingles of ['Which agents should', 'Suggested selection', 'normally depends on', 'Keep going without it']) assert.ok(!selecao.includes(ingles), `still in English: ${ingles}`);
  const contrato = parte('contrato-de-saida.md');
  for (const frase of ['A saída de {Agent Name} está incompleta: {motivo}', 'Aceitar assim mesmo e seguir', 'Refazer o passo (executar o agente de novo)', 'Abortar a execução']) tem(contrato, frase);
  tem(nucleo, 'After "Editar este conteúdo" changes an approved file');
  tem(entrega, 'After "Editar este conteúdo" (the final menu of the runner)');
});

test('U6a-06a: the Agent Loading list is 1 to 6 in order; a partial answer is asked once; the reviewer has a scale and reads review.md; the core stays within its limits', () => {
  const lista = nucleo.slice(nucleo.indexOf('### Agent Loading'), nucleo.indexOf('### Context Compression'));
  const numeros = [...lista.matchAll(/^(\d)\. \*?\*?[A-Z]/gm)].map((m) => Number(m[1]));
  assert.deepEqual(numeros, [1, 2, 3, 4, 5, 6], 'the items of "Agent Loading"');
  assert.match(lista, /^4\. \*\*Inject format context\*\*/m);
  assert.match(lista, /^5\. \*\*Inject skill context \(Two-Tier\)\*\*/m);
  assert.match(lista, /^6\. \*\*Inject crew memory rules\*\*/m);
  tem(nucleo, '**Partial answer**: if the answer covers only part of what was asked, ask **once** for what is missing, saying what it is; if the user does not have it, go on with what there is and note what was left out in the checkpoint file.');
  tem(nucleo, 'The reviewer reads `_opencrew/core/best-practices/review.md` before judging, and its verdict is `APROVADO` or `REPROVADO` with a "nota X/10" (0 to 10).');
  const total = linhas(nucleo) + PARTES.reduce((soma, nome) => soma + linhas(parte(nome)), 0);
  assert.ok(linhas(nucleo) <= 560 && total <= 1030, `core ${linhas(nucleo)}, core + parts ${total}`);
});

test('U6a-06c: from the second real run — the date alert is asked about, "Corrigir agora" saves its report and does not repeat the review, and the verdict labels map to those of the runner', () => {
  tem(nucleo, 'For each `Datas` alert, ask which is right, the weekday or the date, before approving.');
  tem(pedido, 'For each `Datas` alert in the report, ask which is right, the weekday or the date, and fix it as an adjustment.');
  tem(entrega, 'saving the report as the next `verificacao-ciclo-{N}.md` of the run');
  tem(entrega, '--relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"');
  tem(entrega, 'The reviewer does not run again and the `marcar` of the approval is not repeated.');
  tem(ler(`${CORE}/best-practices/review.md`), 'APPROVE and CONDITIONAL APPROVE are `APROVADO` (for the conditional one, list the minor revisions); REJECT is `REPROVADO`.');
  assert.ok(linhas(nucleo) <= 560, `runner.pipeline.md has ${linhas(nucleo)} lines`);
});

test('U6a-06b: retomar.md gives the header of a resumed run and the rule of the agent selection', () => {
  const retomar = parte('retomar.md');
  tem(retomar, 'The header of step 5 says `Retomando do passo {N} de {total}`');
  tem(retomar, 'when `crew.yaml` declares `agent_dependencies:`, ask it again and say once `A escolha de agentes da execução anterior não foi guardada; escolha de novo.`');
});

test('U6a-07a: a folder made by mkTmp is gone when the test process ends', () => {
  const script = `import { mkTmp } from ${JSON.stringify(pathToFileURL(path.join(root, 'tests', '_helpers.js')).href)}; const d = await mkTmp('u6a-sonda'); await (await import('node:fs/promises')).writeFile(d + '/x.txt', 'x'); console.log(d);`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const pasta = r.stdout.trim();
  assert.ok(pasta.startsWith(path.join(os.tmpdir(), 'opencrew-u6a-sonda-')), pasta);
  assert.equal(existsSync(pasta), false, 'the probe folder is still there');
});

test('U6a-upg-a: update from 1.15.0 delivers the date alert and the PT-BR end of the run; crews/ is untouched', async (t) => {
  const dir = await mkTmp('upgrade-u6a');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  await fs.rm(path.join(core, 'scripts', 'verificar', 'datas.mjs'));
  await fs.writeFile(path.join(core, 'runner', 'fim-da-execucao.md'), '# End of the run (1.15.0)\nWhat would you like to do?\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.15.0\n');
  for (const [arquivo, conteudo] of Object.entries({ ...ANTIGA, 'crews/atas/output/a.md': 'Sábado, 20 de setembro, às 16h.\n' })) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  const antes = await snapshot(path.join(dir, 'crews'));

  await captureOutput(() => withCwd(dir, () => update()));

  assert.match(await fs.readFile(path.join(core, 'runner', 'fim-da-execucao.md'), 'utf8'), /O que você quer fazer\?/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');
  const { main } = await import(`${pathToFileURL(path.join(core, 'scripts', 'verificar.mjs')).href}?u6a-upg`);
  const saida = [];
  await main(['--crew', 'crews/atas', '--arquivo', 'crews/atas/output/a.md=texto-livre'], { cwd: dir, escrever: (s) => saida.push(...String(s).split('\n')), agora: () => new Date(2026, 9, 9) });
  assert.ok(saida.some((l) => l.includes('20 de setembro de 2026 cai num domingo')), saida.join('\n'));
});
