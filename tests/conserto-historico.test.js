// specs/fase-u5c-execucao-registrada.md — U5c-09: the repair points at run folders that have no row
// in `runs.md` and writes the row "Registrada depois" with the theme the user gives; a row with no
// folder and an empty folder are only pointed at. Nothing is ever deleted (rules 12 and 13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot } from './_helpers.js';
import { ATUAL, CREW, aplicar, existe, ler, projeto, rodar } from './_conserto.js';

const RUNS = `${CREW}/_memory/runs.md`;
const CABECALHO = '# Run History: Atas\n\n| Data | Run ID | Tema | Output | Score | Resultado |\n|------|--------|------|--------|-------|-----------|\n';
const NOVA = '| 2026-10-01 | 2026-10-01-090000 | Edital | Edital | 1/1 | Aprovado |\n';
const VELHA = '| 2026-08-30 | 2026-08-30-110000 | Balanço | Relatório | 8,2 | Aprovado |\n';
const HISTORICO = {
  [RUNS]: `${CABECALHO}${NOVA}${VELHA}`,
  [`${CREW}/output/2026-10-01-090000/v1/edital.md`]: '# Edital\n',
  [`${CREW}/output/2026-09-12-revisao/v1/regimento.md`]: '# Regimento\n',
  [`${CREW}/output/2026-09-12-revisao/entrega/LEIA-ME.md`]: '# Entrega\n',
  [`${CREW}/output/2026-09-12-revisao/notas.txt`]: 'Notas.\n',
  [`${CREW}/output/.gitkeep`]: '',
  [`${CREW}/output/rascunhos/solto.md`]: 'Pasta do usuário, sem nome de execução.\n',
};

async function comHistorico(t, extras = {}) {
  const raiz = await projeto(t, ATUAL, { ...HISTORICO, ...extras });
  await fs.mkdir(path.join(raiz, CREW, 'output', '2026-09-20-150000'));
  return raiz;
}

test('U5c-09a: a folder with no row, an empty folder and a row with no folder are one finding, each in its group; nothing is written', async (t) => {
  const raiz = await comHistorico(t);
  const antes = await snapshot(raiz);
  const r = await rodar(raiz);
  assert.deepEqual(r.codigos, ['historico']);
  const i = r.linhas.indexOf('[historico] 1 execução sem linha no histórico.');
  assert.ok(i > 0, r.texto);
  assert.deepEqual(r.linhas.slice(i + 1, -1), [
    '  2026-09-12-revisao: entrega/LEIA-ME.md, notas.txt, v1/regimento.md',
    '  1 execução abandonada (pasta vazia): 2026-09-20-150000',
    '  1 linha do histórico sem a pasta da execução: 2026-08-30-110000 (só aponto: nada é apagado)',
    '  Para registrar: --aplicar "historico:<execução>=<tema>"',
  ]);
  assert.equal(r.fim, 'CONSERTO:PENDENTE');
  assert.deepEqual(await snapshot(raiz), antes);
});

test('U5c-09a: with only an empty folder and a row with no folder the crew is in order — they are notes, not a finding', async (t) => {
  const raiz = await comHistorico(t, { [`${CREW}/output/2026-09-12-revisao/v1/regimento.md`]: null, [`${CREW}/output/2026-09-12-revisao/entrega/LEIA-ME.md`]: null, [`${CREW}/output/2026-09-12-revisao/notas.txt`]: null });
  const r = await rodar(raiz);
  assert.deepEqual(r.codigos, []);
  assert.deepEqual(r.linhas, [
    'A crew "atas" está em dia: não há o que consertar.',
    'Nota: 1 execução abandonada (pasta vazia): 2026-09-20-150000',
    'Nota: 1 linha do histórico sem a pasta da execução: 2026-08-30-110000 (só aponto: nada é apagado)',
    'CONSERTO:OK',
  ]);
});

test('U5c-09a: an open run with a record is said to be resumable; a crew with no output folder has no finding', async (t) => {
  const aberta = JSON.stringify({ versao: 1, crew: 'atas', run: '2026-10-05-080000', tema: 'Ata', status: 'aberta', passos: [], marcos: [] });
  const raiz = await comHistorico(t, {
    [`${CREW}/output/2026-10-05-080000/execucao.json`]: aberta, [`${CREW}/output/2026-10-05-080000/tema.md`]: 'Ata\n',
    [`${CREW}/output/nomeada/execucao.json`]: aberta.replace('aberta', 'aprovada'), [`${CREW}/output/nomeada/v1/ata.md`]: 'Ata\n',
    [`${CREW}/output/2026-10-06-070000/execucao.json`]: aberta, [`${CREW}/output/2026-10-06-070000/execucao.json.123.tmp`]: '{',
  });
  const r = await rodar(raiz);
  assert.ok(r.linhas.includes('[historico] 3 execuções sem linha no histórico.'), r.texto);
  assert.ok(r.linhas.includes('  2026-10-05-080000: tema.md (interrompida: /opencrew retomar atas continua de onde parou)'));
  assert.ok(r.linhas.includes('  nomeada: v1/ata.md'), 'a folder with a record is a run, whatever its name');
  assert.ok(r.linhas.includes('  2 execuções abandonadas (pasta vazia): 2026-09-20-150000, 2026-10-06-070000'), 'a folder with only the record is abandoned, not a run with files');
  assert.equal((await rodar(await projeto(t))).fim, 'CONSERTO:OK');
});

test('U5c-09b: --aplicar historico writes the row "Registrada depois" at the position of its date, with runs.md.bak', async (t) => {
  const raiz = await comHistorico(t);
  const antes = (await snapshot(raiz)).filter((l) => !l.includes('runs.md'));
  const r = await aplicar(raiz, 'historico:2026-09-12-revisao=Revisão do regimento');
  assert.equal(r.fim, 'CONSERTO:APLICADO', r.texto);
  assert.ok(r.linhas.includes(`Gravei: ${RUNS}`) && r.linhas.includes(`Cópia: ${RUNS}.bak`));
  const linha = '| 2026-09-12 | 2026-09-12-revisao | Revisão do regimento | — | — | Registrada depois |\n';
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}${NOVA}${linha}${VELHA}`);
  assert.equal(await ler(raiz, `${RUNS}.bak`), `${CABECALHO}${NOVA}${VELHA}`);
  assert.deepEqual((await snapshot(raiz)).filter((l) => !l.includes('runs.md')), antes, 'U4a-02j: only runs.md and its copy');
  assert.equal(await existe(raiz, `${CREW}/output/2026-09-12-revisao/execucao.json`), false, 'no record is invented');
  assert.deepEqual((await rodar(raiz)).codigos, []);
});

test('U5c-09b: the oldest run goes to the end of the table; a crew with no runs.md gets one, with no .bak', async (t) => {
  const raiz = await comHistorico(t, { [`${CREW}/output/2026-01-05-070000/v1/a.md`]: 'A.\n' });
  await aplicar(raiz, 'historico:2026-01-05-070000=Posse | da diretoria');
  assert.ok((await ler(raiz, RUNS)).endsWith(`${VELHA}| 2026-01-05 | 2026-01-05-070000 | Posse / da diretoria | — | — | Registrada depois |\n`));

  const semArquivo = await comHistorico(t, { [RUNS]: null });
  const r = await aplicar(semArquivo, 'historico:2026-09-12-revisao=Revisão do regimento', 'historico:2026-09-20-150000=Abandonada');
  assert.equal(r.fim, 'CONSERTO:APLICADO', r.texto);
  assert.equal(await ler(semArquivo, RUNS), '# Run History: atas\n\n| Data | Run ID | Tema | Output | Score | Resultado |\n|------|--------|------|--------|-------|-----------|\n| 2026-09-20 | 2026-09-20-150000 | Abandonada | — | — | Registrada depois |\n| 2026-09-12 | 2026-09-12-revisao | Revisão do regimento | — | — | Registrada depois |\n');
  assert.equal(await existe(semArquivo, `${RUNS}.bak`), false);
});

test('U5c-09b: a folder that does not exist, a run that already has a row and an item with no theme are refused, with nothing written', async (t) => {
  const raiz = await comHistorico(t);
  const antes = await snapshot(raiz);
  const casos = [
    ['historico:2026-07-01-fantasma=Tema', 'Pasta de execução não encontrada em --aplicar "historico:2026-07-01-fantasma=Tema".'],
    ['historico:../../Regras=Tema', 'Pasta de execução não encontrada em --aplicar "historico:../../Regras=Tema".'],
    ['historico:2026-10-01-090000=Edital', 'A execução 2026-10-01-090000 já tem linha no histórico.'],
    ['historico:2026-09-12-revisao', 'Sobra ou falta valor em --aplicar "historico:2026-09-12-revisao". Veja os itens com --ajuda.'],
  ];
  for (const [item, motivo] of casos) {
    const r = await aplicar(raiz, item);
    assert.deepEqual([r.code, r.linhas], [1, [motivo, 'CONSERTO:ERRO']], item);
  }
  assert.deepEqual(await snapshot(raiz), antes);
});
