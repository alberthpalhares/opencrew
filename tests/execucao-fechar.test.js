// specs/fase-u5c-execucao-registrada.md — U5c-04, U5c-05 and U5c-07a: `fechar` closes the record
// and writes the row of `runs.md` (one definition of score, counted by the script), lists the
// corrections of the last runs, and touches nothing else in the project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CABECALHO, RUN, RUNS, SAIDA, conferido, existe, fechar, fora, gravar, ler, marcar, pasta, projeto, registro, rodarCaminho, rodarExecucao, temporarios } from './_execucao.js';

const LINHA = `| 2026-10-07 | ${RUN} | Ata de março | Ata e comunicado | 2/3 | Aprovado |`;

/** A run with three answered checkpoints: two approved, one corrected (and one skipped, which does not count). */
async function execucaoCompleta(raiz) {
  await pasta(raiz, '--tema', 'Ata de março', '--passos', '5');
  await marcar(raiz, 1, 'checkpoint', 'aprovado');
  await conferido(raiz, 2, 'v1/minuta.md');
  await marcar(raiz, 2, 'checkpoint', 'pulado');
  await marcar(raiz, 3, 'checkpoint', 'corrigido', '--nota', 'trocar o local da assembleia');
  await marcar(raiz, 4, 'revisao', 'aprovado');
  await marcar(raiz, 5, 'checkpoint', 'aprovado');
}

test('U5c-04a: fechar writes the row right below the header, closes the record and answers EXECUCAO:FECHADA aprovado 2/3', async (t) => {
  const raiz = await projeto(t, { [RUNS]: `${CABECALHO}| 2026-10-01 | 2026-10-01-090000 | Edital | Edital | 1/1 | Aprovado |\n` });
  await execucaoCompleta(raiz);
  const antes = await fora(raiz, ['/execucao.json', '/runs.md']);
  const r = await fechar(raiz, 'aprovado', '--saida', 'Ata e comunicado');
  assert.equal(r.code, 0);
  assert.equal(r.fim, 'EXECUCAO:FECHADA aprovado 2/3');
  assert.ok(r.linhas.includes(LINHA), 'the row written is printed');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}${LINHA}\n| 2026-10-01 | 2026-10-01-090000 | Edital | Edital | 1/1 | Aprovado |\n`);
  const reg = await registro(raiz);
  assert.deepEqual([reg.status, reg.saida], ['aprovada', 'Ata e comunicado']);
  assert.match(reg.fechadaEm, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(Object.keys(reg), ['versao', 'crew', 'run', 'tema', 'status', 'iniciadaEm', 'fechadaEm', 'passosPrevistos', 'passos', 'marcos', 'saida']);
  assert.deepEqual(await fora(raiz, ['/execucao.json', '/runs.md']), antes, 'U5c-07a');
  assert.deepEqual(await temporarios(raiz), []);
});

test('U5c-04b: with no runs.md the file is born with the header', async (t) => {
  const raiz = await projeto(t);
  await execucaoCompleta(raiz);
  await fechar(raiz, 'aprovado', '--saida', 'Ata e comunicado');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}${LINHA}\n`);
});

test('U5c-04b: in a runs.md with CRLF, a comment on top and other rows, only the new row changes — byte for byte', async (t) => {
  const topo = '<!-- anotações da diretoria -->\r\n# Run History: Atas\r\n\r\nTexto solto do usuário.\r\n\r\n| Data | Run ID | Tema | Output | Score | Resultado |\r\n|------|--------|------|--------|-------|-----------|\r\n';
  const resto = '| 2026-10-01 | 2026-10-01-090000 | Edital  | Edital | 8,2 | Aprovado |\r\n| 2026-09-12 | antiga |  x | y | 1/1 | Publicado |\r\n\r\nRodapé sem quebra no fim.';
  const raiz = await projeto(t, { [RUNS]: topo + resto });
  await execucaoCompleta(raiz);
  await fechar(raiz, 'publicado', '--saida', 'Ata e comunicado');
  assert.equal(await ler(raiz, RUNS), `${topo}${LINHA.replace('Aprovado', 'Publicado')}\r\n${resto}`);
});

test('U5c-04b: a runs.md with no table gets the table at the end; what was there stays', async (t) => {
  const raiz = await projeto(t, { [RUNS]: '# Histórico\n\nAinda sem execuções.' });
  await execucaoCompleta(raiz);
  await fechar(raiz, 'aprovado', '--saida', 'Ata e comunicado');
  const tabela = CABECALHO.slice(CABECALHO.indexOf('| Data'));
  assert.equal(await ler(raiz, RUNS), `# Histórico\n\nAinda sem execuções.\n\n${tabela}${LINHA}\n`);
});

test('U5c-04c: fechar twice for the same run replaces the row, it does not repeat it', async (t) => {
  const raiz = await projeto(t, { [RUNS]: `${CABECALHO}| 2026-10-01 | 2026-10-01-090000 | Edital | Edital | 1/1 | Aprovado |\n` });
  await execucaoCompleta(raiz);
  await fechar(raiz, 'aprovado', '--saida', 'Ata e comunicado');
  await rodarCaminho(raiz, 'pasta', '--run', 'r-nova', '--tema', 'Outra');
  await rodarExecucao(raiz, 'fechar', '--run', 'r-nova', '--resultado', 'abortado');
  const r = await fechar(raiz, 'publicado');
  assert.equal(r.fim, 'EXECUCAO:FECHADA publicado 2/3');
  const linhas = (await ler(raiz, RUNS)).split('\n').filter((l) => l.includes(RUN));
  assert.deepEqual(linhas, [LINHA.replace('Aprovado', 'Publicado')], 'the description given before stays when --saida does not come');
  assert.equal((await ler(raiz, RUNS)).split('\n').filter((l) => l.startsWith('| 2026') || l.startsWith('| r-')).length, 3);
  assert.equal((await registro(raiz)).status, 'publicada');
});

test('U5c-04d: fechar --resultado abortado on a run with no answered checkpoint writes — in the score and Abortado', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--tema', 'Ata de março');
  await conferido(raiz, 2, 'v1/minuta.md');
  await marcar(raiz, 2, 'checkpoint', 'pulado');
  const r = await fechar(raiz, 'abortado');
  assert.equal(r.fim, 'EXECUCAO:FECHADA abortado —');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}| 2026-10-07 | ${RUN} | Ata de março | — | — | Abortado |\n`);
  assert.equal((await registro(raiz)).status, 'abortada');
  const rejeitada = await fechar(raiz, 'rejeitado', '--tema', 'Ata | de abril', '--saida', 'Minuta\nrecusada');
  assert.equal(rejeitada.fim, 'EXECUCAO:FECHADA rejeitado —');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}| 2026-10-07 | ${RUN} | Ata / de abril | Minuta recusada | — | Rejeitado |\n`);
});

test('U5c-04e: with an unreadable record, fechar writes the row with no theme and — in the score, and says so (rule 4)', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--tema', 'Ata de março');
  await fs.writeFile(path.join(raiz, SAIDA, RUN, 'execucao.json'), '{ "versao": 1, "tema": "Ata de mar');
  const r = await fechar(raiz, 'aprovado', '--saida', 'Ata');
  assert.equal(r.linhas[0], 'O registro desta execução não existia ou estava ilegível: a linha do histórico saiu só com o que este comando informou.');
  assert.equal(r.fim, 'EXECUCAO:FECHADA aprovado —');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}| 2026-10-07 | ${RUN} | — | Ata | — | Aprovado |\n`);
  assert.equal((await registro(raiz)).status, 'aprovada', 'the record is written again, closed');
});

test('U5c-04e: a run named by the user (no date in the id) takes the date of the day it is closed', async (t) => {
  const raiz = await projeto(t);
  await rodarCaminho(raiz, 'pasta', '--run', 'assembleia', '--tema', 'Assembleia');
  await rodarExecucao(raiz, 'fechar', '--run', 'assembleia', '--resultado', 'aprovado');
  assert.match(await ler(raiz, RUNS), /\n\| 2026-10-07 \| assembleia \| Assembleia \| — \| — \| Aprovado \|\n$/);
});

test('U5c-07b: a runs.md that cannot be written is said, the record is closed and the last line still comes', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await fs.mkdir(path.join(raiz, RUNS, 'x'), { recursive: true }); // a folder where the file should be
  const r = await fechar(raiz, 'aprovado');
  assert.equal(r.code, 0);
  assert.ok(r.linhas.some((l) => /^Não consegui gravar o histórico desta execução: \S/.test(l)), r.texto);
  assert.equal(r.fim, 'EXECUCAO:FECHADA aprovado —');
  assert.equal((await registro(raiz)).status, 'aprovada');
  assert.deepEqual(await temporarios(raiz), []);
});

test('U5c-05a: fechar lists the notes of the corrections of the closed runs, newest first; open runs are left out', async (t) => {
  const raiz = await projeto(t);
  for (const [run, passo, nota] of [['r1', 3, 'tom informal demais'], ['r2', 3, 'tom informal de novo'], ['r3', 4, 'faltou o quórum']]) {
    await rodarCaminho(raiz, 'pasta', '--run', run);
    await rodarExecucao(raiz, 'marcar', '--run', run, '--passo', String(passo), '--evento', passo === 4 ? 'revisao' : 'checkpoint', '--resultado', passo === 4 ? 'rejeitado' : 'corrigido', '--nota', nota);
    if (run !== 'r3') await rodarExecucao(raiz, 'fechar', '--run', run, '--resultado', 'aprovado');
  }
  await rodarCaminho(raiz, 'pasta', '--run', 'aberta');
  await rodarExecucao(raiz, 'marcar', '--run', 'aberta', '--passo', '1', '--evento', 'checkpoint', '--resultado', 'corrigido', '--nota', 'não entra');
  const r = await rodarExecucao(raiz, 'fechar', '--run', 'r3', '--resultado', 'rejeitado');
  const i = r.linhas.indexOf('Correções das últimas execuções:');
  assert.ok(i > 0, r.texto);
  assert.deepEqual(r.linhas.slice(i + 1, -1), ['- r3 · passo 4 · faltou o quórum', '- r2 · passo 3 · tom informal de novo', '- r1 · passo 3 · tom informal demais']);
  assert.equal(r.fim, 'EXECUCAO:FECHADA rejeitado —');
});

test('U5c-05a: with no correction at all the section does not appear; only the 10 newest closed runs are read', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await marcar(raiz, 1, 'checkpoint', 'aprovado');
  const limpa = await fechar(raiz, 'aprovado');
  assert.ok(!limpa.texto.includes('Correções das últimas execuções'));
  for (let n = 1; n <= 11; n++) {
    await rodarCaminho(raiz, 'pasta', '--run', `c${n}`);
    await rodarExecucao(raiz, 'marcar', '--run', `c${n}`, '--passo', '1', '--evento', 'checkpoint', '--resultado', 'corrigido', '--nota', `nota ${n}`);
    await rodarExecucao(raiz, 'fechar', '--run', `c${n}`, '--resultado', 'aprovado');
  }
  const r = await fechar(raiz, 'aprovado');
  const notas = r.linhas.filter((l) => l.startsWith('- c'));
  assert.equal(notas.length, 9, 'the run closed now is one of the ten');
  assert.ok(!r.texto.includes('nota 1\n') && !r.texto.includes('· nota 2\n'));
});

test('U5c-07a: after a whole run — pasta, saida, conferir, marcar, fechar, retomar — only execucao.json and runs.md are new', async (t) => {
  const raiz = await projeto(t, { [`${SAIDA}/antiga/v1/ata.md`]: '# Ata\n' });
  await gravar(raiz, { [`${SAIDA}/${RUN}/v1/minuta.md`]: '# Minuta\n' });
  const antes = await fora(raiz, []);
  await pasta(raiz, '--tema', 'Ata de março', '--passos', '5');
  await rodarCaminho(raiz, 'saida', '--run', RUN, '--arquivo', `${SAIDA}/ata.md`);
  await rodarCaminho(raiz, 'entrada', '--run', RUN, '--arquivo', `${SAIDA}/minuta.md`);
  await rodarCaminho(raiz, 'conferir', '--arquivo', `${SAIDA}/${RUN}/v1/minuta.md`, '--passo', '2');
  await marcar(raiz, 1, 'checkpoint', 'aprovado');
  await rodarExecucao(raiz, 'retomar');
  await fechar(raiz, 'aprovado', '--saida', 'Ata');
  await rodarExecucao(raiz, 'retomar');
  const novos = (await fora(raiz, [])).filter((l) => !antes.includes(l)).map((l) => l.slice(0, l.lastIndexOf(':')));
  assert.deepEqual(novos, [`crews/atas/_memory/runs.md`, `${SAIDA}/${RUN}/execucao.json`]);
  assert.equal((await fora(raiz, [])).length, antes.length + 2, 'nothing was deleted');
  assert.equal(await existe(raiz, `${SAIDA}/antiga/execucao.json`), false);
});

test('U5c-04b: a runs.md that is not UTF-8 is left as it is, byte for byte, and the user is told; the record is closed', async (t) => {
  const raiz = await projeto(t);
  const ansi = Buffer.concat([Buffer.from(CABECALHO), Buffer.from('| 2026-09-01 | antiga | Revis'), Buffer.from([0xe3]), Buffer.from('o | x | 1/1 | Aprovado |\n')]);
  await fs.writeFile(path.join(raiz, RUNS), ansi);
  await pasta(raiz);
  const r = await fechar(raiz, 'aprovado');
  assert.ok(r.linhas.includes('Não consegui gravar o histórico desta execução: o arquivo runs.md não está em UTF-8; salve-o em UTF-8 e feche a execução de novo'), r.texto);
  assert.equal(r.fim, 'EXECUCAO:FECHADA aprovado —');
  assert.deepEqual(await fs.readFile(path.join(raiz, RUNS)), ansi);
  assert.equal((await registro(raiz)).status, 'aprovada');
});

test('U5c-04b: a BOM stays; a blank line inside the table does not hide the rows below it; "Run  ID" with two spaces is still the header', async (t) => {
  const bom = String.fromCharCode(0xfeff);
  const tabela = '| Data | Run  ID | Tema | Output | Score | Resultado |\n|---|---|---|---|---|---|\n| 2026-10-01 | a | x | y | 1/1 | Aprovado |\n\n';
  const outra = '| Coluna | Outra |\n|---|---|\n| 1 | 2 |\n\n';
  const raiz = await projeto(t, { [RUNS]: `${bom}${outra}${tabela}| 2026-09-01 | ${RUN} | velho | y | — | Abortado |\n` });
  await pasta(raiz, '--tema', 'Ata');
  await fechar(raiz, 'aprovado');
  assert.equal(await ler(raiz, RUNS), `${bom}${outra}${tabela}| 2026-10-07 | ${RUN} | Ata | — | — | Aprovado |\n`, 'the row below the blank line was replaced, not duplicated on top');
});