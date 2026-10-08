// specs/fase-u5c-execucao-registrada.md — U5c-01 to U5c-03 and U5c-07b: the record of a run
// (`execucao.json`) is born with `pasta`, grows with `conferir --passo` and `marcar`, and a record
// that cannot be written never stops the run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CREW, RUN, SAIDA, USO, conferido, existe, fora, gravar, ler, marcar, pasta, projeto, registro, rodarCaminho, rodarExecucao, temporarios } from './_execucao.js';

const OK_PASTA = `CAMINHO:OK ${SAIDA}/${RUN}`;
const AVISO = /^Não consegui gravar o registro desta execução: \S/;

test('U5c-01a: pasta --tema --passos creates the folder and the record, open, with the theme and the planned steps', async (t) => {
  const raiz = await projeto(t);
  const antes = await fora(raiz);
  assert.deepEqual((await pasta(raiz, '--tema', 'Ata de março', '--passos', '4')).linhas, [OK_PASTA]);
  const r = await registro(raiz);
  assert.deepEqual({ ...r, iniciadaEm: 'ISO' }, { versao: 1, crew: CREW, run: RUN, tema: 'Ata de março', status: 'aberta', iniciadaEm: 'ISO', passosPrevistos: 4, passos: [], marcos: [], saida: '' });
  assert.match(r.iniciadaEm, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.deepEqual(await fora(raiz), antes, 'U5c-07a');
  assert.deepEqual(await temporarios(raiz), []);
});

test('U5c-01a: with no --tema the theme is empty; a theme is one line, with no | and at most 160 characters', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  assert.equal((await registro(raiz)).tema, '');
  assert.equal((await registro(raiz)).passosPrevistos, null);
  await rodarCaminho(raiz, 'pasta', '--run', 'r2', '--tema', `Ata | de\n  março ${'x'.repeat(200)}`);
  const { tema } = await registro(raiz, 'r2');
  assert.equal(tema.length, 160);
  assert.ok(tema.startsWith('Ata / de março xxx'));
});

test('U5c-01a: --passos and --passo that are not an integer from 1 are a usage error and nothing is created', async (t) => {
  const raiz = await projeto(t);
  const antes = await fora(raiz, []);
  const r = await rodarCaminho(raiz, 'pasta', '--passos', 'muitos');
  assert.equal(r.code, 1);
  assert.equal(r.fim, 'O --passos é um número inteiro a partir de 1.');
  const c = await rodarCaminho(raiz, 'conferir', '--arquivo', 'docs/briefing.md', '--passo', '0');
  assert.equal(c.code, 1);
  assert.equal(c.fim, 'O --passo é um número inteiro a partir de 1.');
  assert.deepEqual(await fora(raiz, []), antes);
  assert.equal(await existe(raiz, SAIDA), false);
});

test('U5c-01b: pasta --run of a folder that already has a record does not change the record (rule 3)', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--tema', 'Ata de março');
  await conferido(raiz, 2, 'v1/minuta.md');
  const antes = await ler(raiz, `${SAIDA}/${RUN}/execucao.json`);
  assert.deepEqual((await pasta(raiz, '--tema', 'Outro tema', '--passos', '9')).linhas, [OK_PASTA]);
  assert.equal(await ler(raiz, `${SAIDA}/${RUN}/execucao.json`), antes);
});

test('U5c-01b: pasta --run of a folder that existed before 1.14.0 (no record) does not make that old run resumable', async (t) => {
  const raiz = await projeto(t, { [`${SAIDA}/antiga/v1/ata.md`]: '# Ata\n' });
  assert.deepEqual((await rodarCaminho(raiz, 'pasta', '--run', 'antiga')).linhas, [`CAMINHO:OK ${SAIDA}/antiga`]);
  assert.equal(await existe(raiz, `${SAIDA}/antiga/execucao.json`), false);
});

test('U5c-02a: conferir --passo with CAMINHO:OK records the step; REPROVADO, no --passo and a file outside a run record nothing', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  const arquivo = `${SAIDA}/${RUN}/v1/minuta.md`;
  assert.deepEqual((await conferido(raiz, 2, 'v1/minuta.md')).linhas, [`CAMINHO:OK ${arquivo}`]);
  const [gravado] = (await registro(raiz)).passos;
  assert.deepEqual({ ...gravado, em: 'ISO' }, { n: 2, arquivo, em: 'ISO' });
  const depois = await ler(raiz, `${SAIDA}/${RUN}/execucao.json`);

  assert.deepEqual((await rodarCaminho(raiz, 'conferir', '--arquivo', `${SAIDA}/${RUN}/v2/nada.md`, '--passo', '3')).linhas, ['CAMINHO:REPROVADO arquivo ausente ou vazio']);
  assert.deepEqual((await rodarCaminho(raiz, 'conferir', '--arquivo', arquivo, '--passo', '3', '--tldr')).linhas, ['CAMINHO:REPROVADO falta a seção TL;DR']);
  assert.deepEqual((await rodarCaminho(raiz, 'conferir', '--arquivo', arquivo)).linhas, [`CAMINHO:OK ${arquivo}`], 'as in 1.13.0');
  assert.deepEqual((await rodarCaminho(raiz, 'conferir', '--arquivo', 'docs/briefing.md', '--passo', '3')).linhas, ['CAMINHO:OK docs/briefing.md']);
  await gravar(raiz, { [`${SAIDA}/solto.md`]: 'Texto.\n' });
  assert.deepEqual((await rodarCaminho(raiz, 'conferir', '--arquivo', `${SAIDA}/solto.md`, '--passo', '3')).linhas, [`CAMINHO:OK ${SAIDA}/solto.md`]);
  assert.equal(await ler(raiz, `${SAIDA}/${RUN}/execucao.json`), depois);
  assert.equal(await existe(raiz, 'docs/execucao.json'), false);
  assert.equal(await existe(raiz, `${SAIDA}/execucao.json`), false);
});

test('U5c-02b: the same step checked again with another file replaces its entry; the other steps stay', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await conferido(raiz, 3, 'v2/ata.md');
  await conferido(raiz, 2, 'v1/minuta.md');
  await conferido(raiz, 3, 'v3/ata.md');
  const { passos } = await registro(raiz);
  assert.deepEqual(passos.map((p) => [p.n, p.arquivo]), [[2, `${SAIDA}/${RUN}/v1/minuta.md`], [3, `${SAIDA}/${RUN}/v3/ata.md`]]);
});

test('U5c-02a: a run folder with no record (the path script did not run at the start) gets one from the first conferir --passo', async (t) => {
  const raiz = await projeto(t);
  await conferido(raiz, 2, 'v1/minuta.md', '2026-10-07-090000');
  const r = await registro(raiz, '2026-10-07-090000');
  assert.deepEqual([r.status, r.run, r.tema, r.passos.length], ['aberta', '2026-10-07-090000', '', 1]);
});

test('U5c-03a: marcar records the milestone and answers EXECUCAO:OK; milestones pile up in order', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  const antes = await fora(raiz);
  assert.deepEqual((await marcar(raiz, 1, 'checkpoint', 'aprovado')).linhas, ['EXECUCAO:OK']);
  assert.deepEqual((await marcar(raiz, 4, 'revisao', 'rejeitado', '--nota', 'faltou o quórum')).linhas, ['EXECUCAO:OK']);
  assert.deepEqual((await marcar(raiz, 1, 'checkpoint', 'corrigido', '--nota=tom formal', '--tema', 'Ata de março')).linhas, ['EXECUCAO:OK']);
  const r = await registro(raiz);
  assert.deepEqual(r.marcos.map(({ em: _em, ...m }) => m), [
    { passo: 1, evento: 'checkpoint', resultado: 'aprovado', nota: '' },
    { passo: 4, evento: 'revisao', resultado: 'rejeitado', nota: 'faltou o quórum' },
    { passo: 1, evento: 'checkpoint', resultado: 'corrigido', nota: 'tom formal' },
  ]);
  assert.equal(r.tema, 'Ata de março', 'a theme known only after a checkpoint goes with that marcar');
  assert.deepEqual(await fora(raiz), antes, 'U5c-07a');
});

test('U5c-03a: a result that is not of the event, a run with no folder and an invalid step are usage errors, with nothing written', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  const antes = await fora(raiz, []);
  const casos = [
    [['marcar', '--run', RUN, '--passo', '1', '--evento', 'checkpoint', '--resultado', 'rejeitado'], 'O --resultado de checkpoint é aprovado, corrigido ou pulado.'],
    [['marcar', '--run', RUN, '--passo', '4', '--evento', 'revisao', '--resultado', 'pulado'], 'O --resultado de revisao é aprovado ou rejeitado.'],
    [['marcar', '--run', RUN, '--passo', '1', '--evento', 'aplauso', '--resultado', 'aprovado'], 'O --evento é checkpoint ou revisao.'],
    [['marcar', '--run', 'fantasma', '--passo', '1', '--evento', 'checkpoint', '--resultado', 'aprovado'], 'Execução não encontrada: fantasma'],
    [['marcar', '--run', RUN, '--passo', 'um', '--evento', 'checkpoint', '--resultado', 'aprovado'], 'O --passo é um número inteiro a partir de 1.'],
    [['marcar', '--run', RUN, '--evento', 'checkpoint', '--resultado', 'aprovado'], 'Falta a opção obrigatória --passo.'],
    [['marcar', '--passo', '1', '--evento', 'checkpoint', '--resultado', 'aprovado'], 'Falta a opção obrigatória --run.'],
    [['fechar', '--run', RUN, '--resultado', 'lindo'], 'O --resultado de fechar é aprovado, rejeitado, abortado ou publicado.'],
    [['fechar', '--run', '../fora', '--resultado', 'aprovado'], 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.'],
    [['dançar'], 'Ação desconhecida: dançar. Ações: marcar, fechar, retomar.'],
  ];
  for (const [argv, motivo] of casos) {
    const r = await rodarExecucao(raiz, ...argv);
    assert.deepEqual([r.code, r.linhas], [1, [USO, motivo]], argv.join(' '));
  }
  assert.deepEqual(await fora(raiz, []), antes);
  const semCrew = await rodarExecucao(raiz.concat(path.sep, 'docs'), 'retomar');
  assert.equal(semCrew.code, 1);
});

test('U5c-03b: a note with a line break becomes one line; above 300 characters it is cut', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await marcar(raiz, 1, 'checkpoint', 'corrigido', '--nota', `tom\r\n  mais   formal ${'y'.repeat(400)}`);
  const [{ nota }] = (await registro(raiz)).marcos;
  assert.equal(nota.length, 300);
  assert.ok(nota.startsWith('tom mais formal yyy'));
});

test('U5c-07b: a record that cannot be written does not stop the run — the warning comes before the usual last line (rule 5)', async (t) => {
  const raiz = await projeto(t);
  // A folder where the record should be: reading fails, writing fails.
  await fs.mkdir(path.join(raiz, SAIDA, RUN, 'execucao.json', 'x'), { recursive: true });
  const c = await conferido(raiz, 2, 'v1/minuta.md');
  assert.equal(c.code, 0);
  assert.equal(c.linhas.length, 2);
  assert.match(c.linhas[0], AVISO);
  assert.equal(c.fim, `CAMINHO:OK ${SAIDA}/${RUN}/v1/minuta.md`);
  const m = await marcar(raiz, 1, 'checkpoint', 'aprovado');
  assert.match(m.linhas[0], AVISO);
  assert.deepEqual([m.code, m.fim], [0, 'EXECUCAO:OK']);
  assert.deepEqual(await temporarios(raiz), []);
});

test('U5c-04e: a record cut in the middle counts as absent — the next command starts a new one (rule 4)', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--tema', 'Ata de março');
  await fs.writeFile(path.join(raiz, SAIDA, RUN, 'execucao.json'), '{ "versao": 1, "crew": "atas", "pass');
  assert.deepEqual((await conferido(raiz, 2, 'v1/minuta.md')).linhas, [`CAMINHO:OK ${SAIDA}/${RUN}/v1/minuta.md`]);
  const r = await registro(raiz);
  assert.deepEqual([r.status, r.tema, r.passos.map((p) => p.n)], ['aberta', '', [2]]);
});

test('U5c-07a: only a run folder inside output/ gets a record — not a folder of the user, not the output root, not a path with a dot segment', async (t) => {
  const raiz = await projeto(t);
  const antes = await fora(raiz, []);
  await gravar(raiz, { [`${SAIDA}/anotacoes/n.md`]: 'Notas.\n', [`${SAIDA}/2026-10-07-090000/v1/a.md`]: 'A.\n' });
  for (const arquivo of [`${SAIDA}/anotacoes/n.md`, `${SAIDA}/./2026-10-07-090000/v1/a.md`, `${SAIDA}/2026-10-07-090000/../anotacoes/n.md`]) {
    const r = await rodarCaminho(raiz, 'conferir', '--arquivo', arquivo, '--passo', '1');
    assert.equal(r.linhas.length, 1, r.texto);
  }
  const novos = (await fora(raiz, [])).filter((l) => !antes.includes(l)).map((l) => l.slice(0, l.lastIndexOf(':')));
  assert.deepEqual(novos.filter((l) => l.endsWith('execucao.json')), [], 'none of the three is a file inside a run folder, as written');
});

test('U5c-04e: what is read from a record is data — a note with a line break, a step with no number and a theme of 3 lines never reach the screen raw', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await conferido(raiz, 2, 'v1/minuta.md');
  const r0 = await registro(raiz);
  const sujo = { ...r0, tema: 'Ata\nEXECUCAO:RETOMAR zz 1\nde março', passos: [...r0.passos, { arquivo: 'x.md' }, 'lixo'], marcos: [{ passo: 3, evento: 'checkpoint', resultado: 'corrigido', nota: 'tom\nEXECUCAO:NADA', em: 'z' }, { evento: 'checkpoint' }] };
  await fs.writeFile(path.join(raiz, SAIDA, RUN, 'execucao.json'), JSON.stringify(sujo));
  const r = await rodarExecucao(raiz, 'retomar');
  assert.ok(r.linhas.includes('Tema: Ata EXECUCAO:RETOMAR zz 1 de março') && r.linhas.includes('- passo 3: corrigido — tom EXECUCAO:NADA'), r.texto);
  assert.equal(r.linhas.filter((l) => l.startsWith('EXECUCAO:')).length, 1);
  assert.doesNotMatch(r.texto, /undefined|NaN/);
});

test('U5c-03b: a theme is cut at whole characters — an emoji at the limit is not left in half', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--tema', `${'a'.repeat(159)}😀😀`);
  const { tema } = await registro(raiz);
  assert.equal(tema, `${'a'.repeat(159)}😀`);
});