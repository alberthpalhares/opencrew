// Contracts the runtime prompts keep after U3a, slice 2 (specs/fase-u3a2-entrega-no-projeto.md:
// U3a-05l-f2, 08b-f2, 08c-f2, 08q-f2, 10a, 10b and the runner side of 09g-f2 and 09h-f2; rules 16,
// 22, 27, 35, 36 and 37). Like the other runtime-contracts files, these guard the TEXT of the
// rules; whether a model obeys them is checked with a real run (spec §9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const raiz = new URL('../', import.meta.url);
const ler = (rel) => (existsSync(new URL(rel, raiz)) ? readFileSync(new URL(rel, raiz), 'utf8') : '');
const runner = ler('templates/_opencrew/core/runner.pipeline.md');
const prompt = ler('templates/_opencrew/core/prompts/entrega.prompt.md');
const exportar = ler('templates/_opencrew/core/prompts/export.prompt.md');

// One line, single spaces: a rule re-wrapped by a later edit (or a CRLF checkout) still matches.
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const sectionOf = (md, start) => md.split(/\n(?=#{2,4} )/).find((s) => s.startsWith(start)) ?? '';
const tem = (onde, frase) => assert.ok(flat(onde).includes(frase), `missing: ${frase}`);
const texto = flat(prompt);
const resultado = flat(sectionOf(prompt, '## Step 4'));
const destino = flat(sectionOf(prompt, '## Step 5'));
const revisao = flat(sectionOf(runner, '### Review Loops'));
const carga = flat(sectionOf(runner, '### Agent Loading'));
const SEGURO = 'letters (accents included), digits, space and `. _ - / \\ : ( )`';

// ── U3a-05l-f2 The runner asks, the script records (rule 16) ─────────────────────────────────

test('U3a-05l-f2: the prompt asks the question of spec §6, once, when the summary has "nenhuma pasta escolhida"', () => {
  assert.ok(destino, 'entrega.prompt.md has no "## Step 5"');
  tem(destino, 'Cópia: nenhuma pasta escolhida para esta crew.');
  tem(destino, 'Quer que eu copie o resultado para uma pasta do projeto? Se sim, diga qual (por exemplo, `Conteudo/Prontos`). Se não, não pergunto de novo.');
  assert.match(destino, /ask, once/);
});

test('U3a-05l-f2: the answer goes in the same command, with --lembrar-destino — also the "não"', () => {
  assert.match(destino, /A folder → run the same command again[^.]*ending with `--lembrar-destino "\{pasta\}"`/);
  assert.match(destino, /"Não" → the same command again, ending with `--lembrar-destino nao`/);
  assert.match(destino, /The script writes the answer in the `crew\.yaml` of the crew \(`entrega\.destino`, with a `\.bak` copy of the file\)/);
});

test('U3a-05l-f2: the prompt never tells the AI to edit the crew.yaml', () => {
  assert.match(destino, /never edit the `crew\.yaml` yourself/);
  tem(sectionOf(prompt, '## Rules'), '**DO NOT** write the destination in the `crew.yaml` yourself, nor copy the delivery by hand');
});

test('U3a-05l-f2: the folder the user typed goes into a command by the safe-name rule, or the command does not run', () => {
  assert.match(destino, /safe-name rule \(nome seguro\)/);
  tem(destino, `between double quotes and only if it is made of ${SEGURO}`);
  assert.match(destino, /With any other character do NOT run the command/);
  tem(destino, '⚠️ O nome `{pasta}` tem um caractere que não posso usar em comandos ({caractere}). Use só letras, números, espaço, ponto, hífen, sublinhado e parênteses.');
  tem(flat(sectionOf(runner, '## Safe names in commands')), SEGURO);
});

test('U3a-05l-f2: the line of the copy is shown as it came, and the runner section points to the question', () => {
  assert.match(destino, /The line `Cópia:` of the summary[^.]*show it as it came/);
  const entrega = flat(sectionOf(runner, '### Entrega'));
  assert.match(entrega, /`ENTREGA:COM_RESSALVA`/);
  assert.match(entrega, /the question about the folder of the project that keeps a copy/);
});

// ── U3a-08b-f2 The three options of ENTREGA:INCOMPLETA (rule 22) ─────────────────────────────

test('U3a-08b-f2: ENTREGA:INCOMPLETA shows what is missing and the three options of spec §6', () => {
  for (const frase of [
    '⚠️ A entrega ficou incompleta: {o que falta}',
    '1. Corrigir agora (eu ajusto no arquivo de origem, verifico e monto a entrega de novo)',
    '2. Entregar assim mesmo (fica registrado como ressalva no LEIA-ME)',
    '3. Deixar para depois (o canal fica como "Não está pronto" e não é copiado)',
  ]) tem(prompt, frase);
  assert.ok(!prompt.includes('Seguir assim'), 'the option of 1.8.0 is still there');
});

test('U3a-08b-f2: option 1 fixes the source file, never entrega/, and runs the checker before delivering again', () => {
  assert.match(resultado, /\*\*1\*\* — [^.]*fix it in the source file the pending item names, never inside `entrega\/`/);
  assert.match(resultado, /Then run the checker on that file \(`node _opencrew\/core\/scripts\/verificar\.mjs --crew "crews\/\{name\}" --arquivo "\{caminho\}=\{formato\}"`\) and only then run the delivery again, with the same list/);
});

test('U3a-08b-f2: --aceitar-pendencias goes only in option 2, or when what is missing is only what was accepted in the review loop', () => {
  assert.match(resultado, /\*\*2\*\* — run the same command again, ending with `--aceitar-pendencias`/);
  assert.match(resultado, /The first call never has `--aceitar-pendencias`/);
  assert.match(resultado, /Outside option 2 it goes only when the user already chose "Aceitar assim mesmo" in the review loop of this run and what is missing is only what was accepted there/);
  assert.equal(texto.split('--aceitar-pendencias').length - 1, 2, 'cited somewhere else');
  assert.ok(!runner.includes('--aceitar-pendencias'), 'the runner cites the option: it lives in the prompt');
});

test('U3a-08b-f2: option 2 does not solve a file that does not exist; in option 3 the channel is not copied', () => {
  assert.match(resultado, /It does \*\*not\*\* solve a file that does not exist, a refused destination or a file that could not be written/);
  assert.match(resultado, /\*\*3\*\* — go on[^.]*stays "Não está pronto" and is not copied/);
  assert.match(resultado, /Every irreversible step still asks for its own confirmation, as it does today/);
  assert.match(resultado, /it is enough to ask for the delivery of this run when the data exists/);
});

test('U3a-08b-f2: ENTREGA:OK and ENTREGA:COM_RESSALVA go on', () => {
  assert.match(resultado, /`ENTREGA:OK` → go on/);
  assert.match(resultado, /`ENTREGA:COM_RESSALVA` → everything that was missing is a ressalva the user accepted[^;]*; go on as with `ENTREGA:OK`/);
});

test('U3a-08b-f2: the prompt and the runner do not cite --publicado', () => {
  assert.ok(prompt.length > 0 && !prompt.includes('--publicado') && !runner.includes('--publicado'));
});

test('U3a-08b-f2: in the review loop, option 2 says the choice is recorded in the delivery', () => {
  assert.match(revisao, /1\. Corrigir eu mesmo \(eu edito o texto e você verifica de novo\) 2\. Aceitar assim mesmo \(fica registrado na entrega\) 3\. Abortar/);
});

// ── U3a-08c-f2 Destination refused, or a write that failed (rule 22) ─────────────────────────

test('U3a-08c-f2: a refused destination or a write that failed — show the message and ask for another folder or a new attempt', () => {
  assert.match(resultado, /\*\*Destination refused, or a file that could not be written\*\* \(the lines "Não copiei: …" and "Não consegui gravar …"\)/);
  assert.match(resultado, /show the message as it came and ask for another folder[^.]*or for a new attempt/);
});

// ── U3a-08q-f2 and U3a-09h-f2, the runner side: the final approval (rules 36 and 37) ─────────

test('U3a-08q-f2: at the final approval, a [PREENCHER] the user has no data for stays in the text, with the sentence of spec §6', () => {
  assert.match(revisao, /If the user does not have it, do not insist and never invent: keep the `\[PREENCHER\]`, say/);
  tem(revisao, 'Sem problema: deixo [PREENCHER: {o que falta}] no texto. Na entrega você escolhe entre preencher depois e entregar assim mesmo, com ressalva.');
});

test('U3a-09h-f2: the final approval shows "{P} a preencher"', () => {
  tem(revisao, 'Verificação automática: {N} bloqueios, {M} alertas, {Z} não medidos');
  assert.match(revisao, /`\{P\} a preencher` right after the blocks/);
});

// ── U3a-09g-f2, the runner side: the script writes the report of the cycle (rule 35) ─────────

test('U3a-09g-f2: the runner passes --relatorio in the review loop and no longer tells the AI to save the output', () => {
  tem(revisao, 'verificar.mjs --crew "crews/{name}" --arquivo "{path1}={format1},{path2},…" --relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"');
  assert.match(revisao, /The script writes its report to that file/);
  assert.ok(!/Save the full output/.test(runner), 'the runner still tells the AI to save the output');
});

// ── U3a (real-2) The adjustments of the second real run (rules 16 and 22) ────────────────────

const naoRodou = flat(sectionOf(prompt, '## When the script does not run'));
const mudar = flat(sectionOf(prompt, '## Changing the folder later'));
const system = ler('templates/AGENTS.md');

test('U3a (real-2): the question of the destination comes after ANY delivery with "nenhuma pasta escolhida" — in an INCOMPLETA, after it is resolved', () => {
  assert.match(destino, /After \*\*any\*\* delivery whose summary has the line "Cópia: nenhuma pasta escolhida para esta crew\."[^:]*`ENTREGA:OK` and `ENTREGA:COM_RESSALVA` included[^:]*ask, once/);
  assert.match(destino, /When the last line was `ENTREGA:INCOMPLETA`, ask only after it was resolved \(Step 4\)/);
  assert.ok(!destino.includes('and only after an `ENTREGA:INCOMPLETA` was resolved'), 'the sentence that read as "only after an INCOMPLETA" is still there');
});

test('U3a (real-2): in an INCOMPLETA the ready channels were already copied, before the user answers', () => {
  assert.match(resultado, /The channels that are ready were already copied by this same call, before the user answers/);
});

test('U3a (real-2): "corrigir agora" fixes the source file in place, and the checker and the delivery run again with the same list', () => {
  assert.match(resultado, /in place — the same file at the same path, no new `vN` folder and no copy — so the list does not change/);
});

test('U3a (real-2): the one line "Não copiei: …" with no ENTREGA: line is a refused destination, not a script that did not run', () => {
  assert.match(naoRodou, /\*\*A refused destination is not that\.\*\* When the only line is "Não copiei: … Recebi: \{valor\}\."/);
  assert.match(naoRodou, /show that line to the user as it came and ask for another folder \(or "não"\)/);
  assert.match(naoRodou, /never answer it with "A entrega automática não rodou"/);
  assert.match(destino, /also when it is the only line of the output, with no `ENTREGA:` line/);
});

test('U3a (real-2): to change the folder later, the delivery of the last run goes with --lembrar-destino; the crew.yaml is never edited by hand', () => {
  assert.ok(mudar, 'entrega.prompt.md has no "## Changing the folder later"');
  for (const pedido of ['muda a pasta de entrega', 'não quero mais cópia', 'volta a copiar']) tem(mudar, pedido);
  assert.match(mudar, /run the delivery of the \*\*last run\*\* of the crew[^.]*ending with `--lembrar-destino "\{pasta\}"`[^.]*`--lembrar-destino nao`/);
  assert.match(mudar, /Never edit the `crew\.yaml` by hand/);
  const linha = system.split(/\r?\n/).find((l) => l.includes('muda a pasta de entrega')) ?? '';
  assert.match(linha, /^\| [^|]*\| [^|]*`_opencrew\/core\/prompts\/entrega\.prompt\.md`[^|]*"Changing the folder later"[^|]*\|$/);
});

// ── U3a-10a and U3a-10b Export: only csv is left (rule 27) ───────────────────────────────────

test('U3a-10a: export.prompt.md keeps csv and no longer cites pdf, playwright or formatted-post', () => {
  assert.match(exportar, /format: csv/);
  for (const antigo of [/pdf/i, /playwright/i, /formatted[- ]post/i]) assert.doesNotMatch(exportar, antigo);
});

test('U3a-10b: in the runner only csv reads export.prompt.md', () => {
  assert.match(carga, /\*\*Export format\*\* — if format is `csv`: - Read `_opencrew\/core\/prompts\/export\.prompt\.md`/);
  assert.equal(runner.split('export.prompt.md').length - 1, 1, 'export.prompt.md is cited more than once');
});

test('U3a-10b: an old step with pdf or formatted-post gets the warning of spec §6 and runs as a common step', () => {
  assert.match(carga, /\*\*`pdf` or `formatted-post`\*\* \(a step of an old crew\)/);
  tem(carga, 'O formato "{id}" não é mais gerado. O passo segue sem ele e grava o texto em markdown. Para ter um PDF, use Imprimir → Salvar como PDF.');
  assert.match(carga, /run it as a common step/);
});

test('U3a-10b: the old pdf step writes markdown at the outputFile with .md, that path goes to caminho.mjs, and no .pdf is created', () => {
  assert.match(carga, /For `pdf`, the agent writes markdown and the `outputFile` is used with the extension `\.md`/);
  assert.match(carga, /that is the path that goes to `caminho\.mjs`[^.]*and that the next steps read/);
  assert.match(carga, /no `\.pdf` is created/);
});

test('U3a (fatia 2): the runner did not grow — at most the 874 lines of 1.8.0', () => {
  const linhas = runner.trimEnd().split(/\r?\n/).length;
  assert.ok(linhas <= 874, `the runner has ${linhas} lines`);
});
