// Contracts the runtime prompts keep after U5, slice 4 (specs/fase-u5d-modo-equipe.md: U5d-04 to
// U5d-07 and U5d-upg-a). Like the other runtime-contracts files, these guard the TEXT of the
// rules; whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';
import { ANTIGA, CREW } from './_conserto.js';
import { PARTES, nucleo, parte } from './_runner.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const linhas = (s) => s.split('\n').length;
const CORE = 'templates/_opencrew/core';
const pedido = ler(`${CORE}/prompts/pedido.prompt.md`);
const system = ler('templates/AGENTS.md');
const correcao = parte('correcao-no-checkpoint.md');

test('U5d-04a: pedido.prompt.md has every command of a pedido, the texts of the spec and the two prohibitions, in at most 160 lines', () => {
  for (const comando of [
    'node _opencrew/core/scripts/caminho.mjs "{name}" pasta --pedido --tema "{tema}" --agente {id} --formato {formato}',
    'node _opencrew/core/scripts/caminho.mjs "{name}" saida --run "{run_id}" --arquivo "crews/{name}/output/{arquivo}.md"',
    'node _opencrew/core/scripts/caminho.mjs "{name}" conferir --arquivo "{path}" --passo 1',
    'node _opencrew/core/scripts/verificar.mjs --crew "crews/{name}" --arquivo "{path}={formato}" --relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"',
    'node _opencrew/core/scripts/execucao.mjs "{name}" marcar --run "{run_id}" --passo 2 --evento revisao',
    'node _opencrew/core/scripts/execucao.mjs "{name}" fechar --run "{run_id}" --resultado aprovado --saida "{saída}"',
    'node _opencrew/core/scripts/execucao.mjs "{name}" fechar --run "{run_id}" --resultado abortado',
  ]) tem(pedido, comando);
  for (const texto of [
    '"O que você quer pedir à crew {nome}?"',
    '"Quem faz: {Nome} ({função}). Vai sair: {arquivo}, como {formato}. Posso começar?"',
    '"Nenhum agente da crew {nome} faz esse tipo de trabalho. Dá para acrescentar um com /opencrew edit {nome}, ou criar outra crew."',
    '"Um pedido não publica nem envia; para isso use o pipeline da crew."',
    '"Aprova como está, quer um ajuste ou cancela?"',
    '"Pedido entregue: {pasta da entrega}. Ficou no histórico da crew {nome}."',
  ]) tem(pedido, texto);
  tem(pedido, 'never read, write or describe `execucao.json` yourself, and never write `runs.md`');
  tem(pedido, 'Never use a skill with `side_effects: irreversible` in a pedido.');
  tem(pedido, 'Never improvise an agent that is not in the crew.');
  // From the real run (spec §12): what the first text left to guess.
  tem(pedido, '"Safe names in commands (nome seguro)", "Output Path Transformation" (what `saida` and `conferir` answer) and "Run record (registro da execução)"');
  tem(pedido, '**1** = the work; **2** = the review, only in a crew that has a reviewer; the approval = **3** with a reviewer, **2** without one.');
  tem(pedido, '(`--nota` only on a rejection: its reason in a few words — never the score)');
  tem(pedido, 'The new version goes through **Step 6 again**');
  tem(pedido, 'after data for a `[PREENCHER]` only, the checker alone');
  tem(pedido, 'The script printed `Agente:` and `Formato:`: they are the agent and the format of this pedido — use them, do not choose again');
  tem(pedido, 'at most `max_review_cycles` **rejections**');
  tem(correcao, 'the checker again on it (the `verificar.mjs` command of "Review Loops", the next `verificacao-ciclo-{N}.md`)');
  tem(parte('fim-da-execucao.md'), 'A line marked `(pedido)` is a request outside the pipeline');
  tem(pedido, '`aprovado` when no adjustment was asked; `corrigido` when any was, adding `--nota "{nota}"`');
  tem(pedido, '"Pedido cancelado. Nada foi entregue; os arquivos ficaram em {pasta do pedido}."');
  tem(pedido, '"Esse texto vai ser impresso ou assinado (sai em Word), vai para algum canal (qual?), ou é só o texto?"');
  tem(pedido, 'If the text still has `[PREENCHER: …]`, ask for each missing piece now');
  tem(pedido, 'read `_opencrew/core/prompts/entrega.prompt.md` and follow it for this run');
  tem(pedido, 'read `_opencrew/core/runner/correcao-no-checkpoint.md` and follow it');
  assert.ok(linhas(pedido) <= 160, `pedido.prompt.md has ${linhas(pedido)} lines`);
});

test('U5d-04b: system.md routes /opencrew pedir, the request in plain words and the Word document asked in plain words', () => {
  tem(system, '| `/opencrew pedir <name> "<task>"`, or a request in plain words to one crew ("peça à crew X…", "pede para a equipe X…") | Load `_opencrew/core/prompts/pedido.prompt.md`');
  tem(system, '| Request in plain words to turn a file into Word ("transforma {arquivo} em Word", "gera o .docx de {arquivo}") | Load `_opencrew/core/prompts/documento.prompt.md`');
  tem(system, '**Primary menu:** Create a new crew · Run an existing crew · My crews · More options');
});

test('U5d-04c: retomar.md sends an open pedido to pedido.prompt.md, which says how to go on from each step', () => {
  tem(parte('retomar.md'), 'A line `Tipo: pedido` after `Tema:` → the open run is a request outside the pipeline: after the yes of item 3, read `_opencrew/core/prompts/pedido.prompt.md`');
  tem(pedido, '## Resuming a request');
  tem(pedido, 'do **not** run `pasta`');
});

test('U5d-05a: the correction at a checkpoint lives in its part, with the procedure; the core has only the stub and stays within its limits', () => {
  tem(nucleo, '**Correction at a checkpoint** — only when the answer asks for a change (tone, audience, a term, a fact, a format, another version of a file) or gives the data of a `[PREENCHER]`: read `_opencrew/core/runner/correcao-no-checkpoint.md` completely and follow it before the `marcar` of that checkpoint.');
  for (const saiu of ['Correction → memory, right away', 'Correction vs. company profile', 'Isso vale para todas as crews?']) assert.ok(!nucleo.includes(saiu), `still in the core: ${saiu}`);
  tem(correcao, '**Correction → memory, right away**: if the answer corrects something (tone, audience, a term, a fact, a format), write it to `crews/{name}/_memory/memories.md` in the matching section **before the next step** (antes do próximo passo)');
  tem(correcao, '`- Nunca usar "termo" → usar "outro"`');
  tem(correcao, '"Isso vale para todas as crews? Atualizo o perfil da empresa?" — change `company.md` only after a yes.');
  tem(correcao, '**The file is rewritten by the agent that wrote it**');
  tem(correcao, 'A change that only concerns **this** text (add a paragraph, a date, a fact of this occasion) is not a preference: it goes into the file (item 3), never to the memory.');
  tem(correcao, 'it opens a new `vN`; never edit the old file in place');
  tem(correcao, '`conferir` with `--passo` of **that** step');
  tem(correcao, '**Show the checkpoint again**, with the path of the new file');
  tem(correcao, '**Record the checkpoint once**, when the user finally accepts: `marcar` with `--resultado corrigido` if there was any correction');
  tem(correcao, '**Data for a `[PREENCHER]`**');
  tem(correcao, 'it is **not** a correction: nothing goes to the memory, and the checkpoint is recorded as `aprovado`');
  tem(correcao, 'An irreversible step (`side_effects: irreversible`) is never taken again here');
  const total = linhas(nucleo) + PARTES.reduce((soma, nome) => soma + linhas(parte(nome)), 0);
  assert.ok(linhas(nucleo) <= 560, `runner.pipeline.md has ${linhas(nucleo)} lines`);
  assert.ok(linhas(correcao) <= 120 && total <= 1020, `core + parts have ${total} lines`);
});

test('U5d-06c: the repair prompt takes "nenhum" as an answer and records it with the script', () => {
  const linha = ler(`${CORE}/prompts/repair.prompt.md`).split('\n').find((l) => l.startsWith('| `fontes` |')) ?? '';
  tem(linha, 'With "nenhum": "Certo: a crew fica registrada como sem arquivos do projeto para ler. Posso gravar?"');
  tem(linha, 'for "nenhum", after the yes, `--aplicar "fonte:nenhuma"`');
});

test('U5d-07a: the closing — no idea is left allocated to U5, CONTRIBUTING says how to resume the project, the roadmap lists the four slices as published', () => {
  const ideias = ler('IDEIAS.md');
  const abertas = ideias.split('\n').filter((l) => /^- \*\*Alocação:\*\*/.test(l) && /→ U5(?! fatia [1-4] \(1\.1[2-5]\.0\))/.test(l));
  assert.deepEqual(abertas, [], 'every idea has a final destination');
  const contributing = ler('CONTRIBUTING.md');
  assert.match(contributing, /^## Como retomar o projeto$/m);
  for (const item of ['specs/', 'npm run verify', 'IDEIAS.md', 'fase-u5-roteiro.md']) assert.ok(contributing.slice(contributing.indexOf('## Como retomar o projeto')).includes(item), `the section does not mention ${item}`);
  const roteiro = ler('specs/fase-u5-roteiro.md');
  for (const versao of ['1.12.0', '1.13.0', '1.14.0', '1.15.0']) assert.match(roteiro, new RegExp(`${versao.replace(/\./g, '\\.')}[^\\n]*publicada`), `the roadmap does not say ${versao} was published`);
  assert.doesNotMatch(roteiro, /\(a escrever\)/);
});

test('U5d-upg-a: update from 1.14.0 delivers pedido.prompt.md and the correction part; crews/ is untouched; the delivered path script opens a pedido', async (t) => {
  const dir = await mkTmp('upgrade-u5d');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const core = path.join(dir, '_opencrew', 'core');
  const NOVOS = [['prompts', 'pedido.prompt.md'], ['runner', 'correcao-no-checkpoint.md']];
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo));
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# opencrew Pipeline Runner (1.14.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.14.0\n');
  for (const [arquivo, conteudo] of Object.entries(ANTIGA)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  const antes = await snapshot(path.join(dir, 'crews'));

  await captureOutput(() => withCwd(dir, () => update()));

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.match(await fs.readFile(path.join(core, 'system.md'), 'utf8'), /\/opencrew pedir <name>/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes, 'update changed a file under crews/');

  const { main } = await import(`${pathToFileURL(path.join(core, 'scripts', 'caminho.mjs')).href}?u5d-upg`);
  const saida = [];
  await main(['atas', 'pasta', '--run', 'p1', '--pedido', '--tema', 'Ofício'], { cwd: dir, escrever: (s) => saida.push(s) });
  assert.deepEqual(saida, [`CAMINHO:OK ${CREW}/output/p1`]);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, CREW, 'output', 'p1', 'execucao.json'), 'utf8')).tipo, 'pedido');
});
