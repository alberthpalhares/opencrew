// specs/fase-u5d-modo-equipe.md — U5d-01 to U5d-03 and U5d-06: a request to the crew outside the
// pipeline (pedido) is a run with a record of its own type; it is closed into the same history,
// resumed and delivered like any run. And the repair records "no project sources" as an answer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot } from './_helpers.js';
import { CABECALHO, RUN, RUNS, SAIDA, conferido, fechar, fora, ler, marcar, pasta, projeto, registro, rodarCaminho, rodarExecucao } from './_execucao.js';
import * as conserto from './_conserto.js';
import { main as entregar } from '../templates/_opencrew/core/scripts/entregar.mjs';
import { main as conferirFontes } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';

const USO_CAMINHO = 'Uso: node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]';

test('U5d-01a: pasta --pedido creates the folder and a record of type "pedido", with no planned steps; without --pedido the record has no such field', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual((await pasta(raiz, '--pedido', '--tema', 'Ofício para a prefeitura')).linhas, [`CAMINHO:OK ${SAIDA}/${RUN}`]);
  const r = await registro(raiz);
  assert.deepEqual(Object.keys(r), ['versao', 'crew', 'run', 'tema', 'tipo', 'status', 'iniciadaEm', 'passosPrevistos', 'passos', 'marcos', 'saida']);
  assert.deepEqual([r.tipo, r.tema, r.status, r.passosPrevistos], ['pedido', 'Ofício para a prefeitura', 'aberta', null]);
  await rodarCaminho(raiz, 'pasta', '--run', 'comum', '--tema', 'Ofício para a prefeitura', '--passos', '4');
  assert.deepEqual(Object.keys(await registro(raiz, 'comum')), ['versao', 'crew', 'run', 'tema', 'status', 'iniciadaEm', 'passosPrevistos', 'passos', 'marcos', 'saida'], 'as in 1.14.0');
});

test('U5d-01b: --pedido with --passos, and --pedido outside pasta, are usage errors with nothing written', async (t) => {
  const raiz = await projeto(t);
  const antes = await fora(raiz, []);
  const casos = [
    [['pasta', '--pedido', '--passos', '3'], 'Um pedido não tem pipeline: --pedido não vai com --passos.'],
    [['saida', '--run', 'r1', '--arquivo', `${SAIDA}/oficio.md`, '--pedido'], 'O --pedido só vale na ação pasta.'],
    [['conferir', '--arquivo', 'docs/briefing.md', '--pedido'], 'O --pedido só vale na ação pasta.'],
  ];
  for (const [argv, motivo] of casos) {
    const r = await rodarCaminho(raiz, ...argv);
    assert.deepEqual([r.code, r.linhas], [1, [USO_CAMINHO, motivo]], argv.join(' '));
  }
  assert.deepEqual(await fora(raiz, []), antes);
});

test('U5d-02a: a pedido closed as approved goes to the same history with "Pedido: " before the theme; a pipeline run with the same theme has no prefix', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--pedido', '--tema', 'Ofício para a prefeitura');
  await conferido(raiz, 1, 'v1/oficio.md');
  await marcar(raiz, 2, 'checkpoint', 'aprovado');
  const r = await fechar(raiz, 'aprovado', '--saida', 'Ofício');
  assert.equal(r.fim, 'EXECUCAO:FECHADA aprovado 1/1');
  const linha = `| 2026-10-07 | ${RUN} | Pedido: Ofício para a prefeitura | Ofício | 1/1 | Aprovado |`;
  assert.ok(r.linhas.includes(linha), r.texto);
  await rodarCaminho(raiz, 'pasta', '--run', 'comum', '--tema', 'Ofício para a prefeitura');
  await rodarExecucao(raiz, 'fechar', '--run', 'comum', '--resultado', 'aprovado');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}| 2026-10-07 | comum | Ofício para a prefeitura | — | — | Aprovado |\n${linha}\n`);
  assert.equal((await registro(raiz)).tema, 'Ofício para a prefeitura', 'the prefix is of the history, not of the record');
});

test('U5d-02b: a cancelled pedido is closed as Abortado, with the prefix; one with no theme says so', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--pedido', '--tema', 'Ofício para a prefeitura');
  assert.equal((await fechar(raiz, 'abortado')).fim, 'EXECUCAO:FECHADA abortado —');
  await rodarCaminho(raiz, 'pasta', '--run', 'mudo', '--pedido');
  await rodarExecucao(raiz, 'fechar', '--run', 'mudo', '--resultado', 'abortado');
  assert.equal(await ler(raiz, RUNS), `${CABECALHO}| 2026-10-07 | mudo | Pedido: sem tema | — | — | Abortado |\n| 2026-10-07 | ${RUN} | Pedido: Ofício para a prefeitura | — | — | Abortado |\n`);
});

test('U5d-03a: retomar on an open pedido says it is a pedido and goes on from its own steps — the pipeline of the crew is not read', async (t) => {
  const raiz = await projeto(t);
  await fs.rm(path.join(raiz, 'crews', 'atas', 'pipeline'), { recursive: true });
  await pasta(raiz, '--pedido', '--tema', 'Ofício para a prefeitura');
  assert.deepEqual((await rodarExecucao(raiz, 'retomar')).linhas, [`Execução: ${RUN}`, 'Tema: Ofício para a prefeitura', 'Tipo: pedido', 'Agente: (não registrado)', 'Formato: (não registrado)', 'Passos conferidos: nenhum', `EXECUCAO:RETOMAR ${RUN} 1`]);
  await conferido(raiz, 1, 'v1/oficio.md');
  const r = await rodarExecucao(raiz, 'retomar');
  assert.deepEqual(r.linhas.slice(1, 3), ['Tema: Ofício para a prefeitura', 'Tipo: pedido']);
  assert.equal(r.fim, `EXECUCAO:RETOMAR ${RUN} 2`);
  await conferido(raiz, 2, 'v2/revisao.md');
  await marcar(raiz, 2, 'revisao', 'rejeitado', '--nota', 'falta o número do processo');
  const rejeitado = await rodarExecucao(raiz, 'retomar');
  assert.equal(rejeitado.fim, `EXECUCAO:RETOMAR ${RUN} 1`, 'a rejected review sends the pedido back to its work step');
  assert.ok(!rejeitado.texto.includes('Não consegui ler na crew'));
  await conferido(raiz, 1, 'v3/oficio.md');
  await conferido(raiz, 2, 'v4/revisao.md');
  await marcar(raiz, 2, 'revisao', 'aprovado');
  const aprovado = await rodarExecucao(raiz, 'retomar');
  assert.equal(aprovado.fim, `EXECUCAO:RETOMAR ${RUN} 3`);
  assert.ok(!aprovado.texto.includes('Todos os passos já foram feitos'));
});

test('U5d-03b: entregar.mjs --run delivers a pedido like any run, with the theme in the title, and writes only inside its folder', async (t) => {
  const raiz = await projeto(t, { '_opencrew/core/best-practices/texto-livre.md': await fs.readFile(new URL('../templates/_opencrew/core/best-practices/texto-livre.md', import.meta.url), 'utf8') });
  await pasta(raiz, '--pedido', '--tema', 'Ofício para a prefeitura');
  await conferido(raiz, 1, 'v1/oficio.md');
  const antes = (await fora(raiz, [])).filter((l) => !l.startsWith(`${SAIDA}/${RUN}/`));
  const linhas = [];
  const code = await entregar(['--crew', 'crews/atas', '--run', RUN, '--arquivo', `${SAIDA}/${RUN}/v1/oficio.md=texto-livre`], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  assert.deepEqual([code, linhas.at(-1)], [0, 'ENTREGA:OK'], linhas.join('\n'));
  assert.equal((await ler(raiz, `${SAIDA}/${RUN}/entrega/LEIA-ME.md`)).split('\n')[0], `# Entrega — atas — Ofício para a prefeitura (${RUN})`);
  assert.deepEqual((await fora(raiz, [])).filter((l) => !l.startsWith(`${SAIDA}/${RUN}/`)), antes);
});

// ── U5d-06 Fontes: "nenhuma" is an answer ────────────────────────────────────────────────────

const YAML = `${conserto.CREW}/crew.yaml`;

test('U5d-06a: --aplicar "fonte:nenhuma" writes fontes: [] with a .bak and the fontes finding is gone; a crew that has a source refuses it', async (t) => {
  const raiz = await conserto.projeto(t, conserto.ANTIGA);
  assert.ok((await conserto.rodar(raiz)).codigos.includes('fontes'));
  const antes = (await snapshot(raiz)).filter((l) => !l.includes('crew.yaml'));
  const r = await conserto.aplicar(raiz, 'fonte:nenhuma');
  assert.equal(r.fim, 'CONSERTO:APLICADO', r.texto);
  assert.equal(await conserto.ler(raiz, YAML), `${conserto.ANTIGA[YAML]}\nfontes: []\n`);
  assert.equal(await conserto.ler(raiz, `${YAML}.bak`), conserto.ANTIGA[YAML]);
  assert.ok(!(await conserto.rodar(raiz)).codigos.includes('fontes'));
  assert.deepEqual((await snapshot(raiz)).filter((l) => !l.includes('crew.yaml')), antes);
  assert.ok((await conserto.aplicar(raiz, 'fonte:nenhuma')).linhas.includes('Já estava assim: fonte:nenhuma'));

  const comFonte = await conserto.projeto(t);
  const foto = await snapshot(comFonte);
  const recusa = await conserto.aplicar(comFonte, 'fonte:nenhuma');
  assert.deepEqual([recusa.code, recusa.linhas], [1, ['A crew já tem fonte registrada: "fonte:nenhuma" não vale para ela.', 'CONSERTO:ERRO']]);
  assert.deepEqual(await snapshot(comFonte), foto);
});

test('U5d-06b: a source registered after "nenhuma" replaces the empty list; the source check of a crew with fontes: [] answers FONTES:OK', async (t) => {
  const raiz = await conserto.projeto(t, conserto.ANTIGA);
  await conserto.aplicar(raiz, 'fonte:nenhuma');
  const linhas = [];
  const code = await conferirFontes(['--crew', conserto.CREW], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  assert.deepEqual([code, linhas.filter((l) => l.trim()).at(-1)], [0, 'FONTES:OK'], linhas.join('\n'));
  const r = await conserto.aplicar(raiz, 'fonte:Regras/estatuto.md=regras que mandam no texto');
  assert.equal(r.fim, 'CONSERTO:APLICADO', r.texto);
  const yaml = await conserto.ler(raiz, YAML);
  assert.match(yaml, /\nfontes:\n {2}- caminho: Regras\/estatuto\.md\n {4}para_que: regras que mandam no texto\n$/);
  assert.doesNotMatch(yaml, /\[\]/);
});

test('U5d-06a: "fonte:nenhuma" never breaks the YAML — a list written another way is refused, a comment and a BOM on the fontes line are kept', async (t) => {
  const bom = String.fromCharCode(0xfeff);
  const caso = async (yaml) => {
    const raiz = await conserto.projeto(t, conserto.ANTIGA, { [YAML]: yaml });
    const r = await conserto.aplicar(raiz, 'fonte:nenhuma');
    return { r, depois: await conserto.ler(raiz, YAML), achado: (await conserto.rodar(raiz)).codigos.includes('fontes') };
  };
  for (const lista of ['  - docs/brief.md\n', '  - { caminho: docs/b.md, para_que: x }\n', '  - "caminho": docs/b.md\n']) {
    const yaml = `name: a\nfontes:\n${lista}max_review_cycles: 2\n`;
    const { r, depois } = await caso(yaml);
    assert.equal(r.fim, 'CONSERTO:ERRO', lista);
    assert.equal(depois, yaml);
  }
  const comComentario = await caso('name: a\r\nfontes:   # nenhuma por ora\r\n  # a definir\r\nmax_review_cycles: 2\r\n');
  assert.equal(comComentario.depois, 'name: a\r\nfontes: []   # nenhuma por ora\r\n  # a definir\r\nmax_review_cycles: 2\r\n');
  assert.equal(comComentario.achado, false);
  const jaVazia = await caso('fontes: [] # nada\nname: a\n');
  assert.ok(jaVazia.r.linhas.includes('Já estava assim: fonte:nenhuma') && !jaVazia.achado);
  const comBom = await caso(`${bom}fontes:\nname: a\n`);
  assert.equal(comBom.depois, `${bom}fontes: []\nname: a\n`);
  assert.equal(comBom.achado, false);
  const outraLista = await caso('entrega:\n  - caminho: out/x\nfontes:\nname: a\n');
  assert.equal(outraLista.depois, 'entrega:\n  - caminho: out/x\nfontes: []\nname: a\n', 'a caminho: of another list is not a source');
});

test('U5d-02a: a pedido registered later by the repair keeps the "Pedido: " prefix, and on the same date the newer run stays on top', async (t) => {
  const pedidoAberto = JSON.stringify({ versao: 1, crew: 'atas', run: '2026-10-08-101811', tema: 'Convite', tipo: 'pedido', status: 'aberta', passos: [], marcos: [] });
  const antiga = '| 2026-10-08 | 2026-10-08-101548 | Pedido: Ofício | Ofício | 0/1 | Aprovado |\n';
  const raiz = await conserto.projeto(t, conserto.ATUAL, {
    [`${conserto.CREW}/_memory/runs.md`]: `${CABECALHO}| 2026-10-08 | 2026-10-08-101737 | Pedido: Aviso | — | — | Abortado |\n${antiga}`,
    [`${conserto.CREW}/output/2026-10-08-101811/execucao.json`]: pedidoAberto,
    [`${conserto.CREW}/output/2026-10-08-101811/v1/convite.md`]: 'Convite.\n',
    [`${conserto.CREW}/output/2026-10-08-101600/v1/ata.md`]: 'Execução de antes da 1.14.0, sem registro.\n',
  });
  const r = await conserto.aplicar(raiz, 'historico:2026-10-08-101811=Convite para a festa da primavera', 'historico:2026-10-08-101600=Ata');
  assert.equal(r.fim, 'CONSERTO:APLICADO', r.texto);
  assert.equal(await conserto.ler(raiz, `${conserto.CREW}/_memory/runs.md`), `${CABECALHO}| 2026-10-08 | 2026-10-08-101811 | Pedido: Convite para a festa da primavera | — | — | Registrada depois |\n| 2026-10-08 | 2026-10-08-101737 | Pedido: Aviso | — | — | Abortado |\n| 2026-10-08 | 2026-10-08-101600 | Ata | — | — | Registrada depois |\n${antiga}`);
});

test('U5d-03a: the record of a pedido keeps who does it and the format, and retomar says both; outside a pedido the two options are a usage error', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--pedido', '--tema', 'Convite', '--agente', 'rita-redacao', '--formato', 'documento-oficial');
  const r = await registro(raiz);
  assert.deepEqual(Object.keys(r).slice(3, 8), ['tema', 'tipo', 'agente', 'formato', 'status']);
  assert.deepEqual([r.agente, r.formato], ['rita-redacao', 'documento-oficial']);
  assert.deepEqual((await rodarExecucao(raiz, 'retomar')).linhas.slice(2, 5), ['Tipo: pedido', 'Agente: rita-redacao', 'Formato: documento-oficial']);
  for (const [argv, motivo] of [
    [['pasta', '--run', 'r2', '--formato', 'texto-livre'], 'O --agente e o --formato só valem com --pedido.'],
    [['pasta', '--run', 'r2', '--pedido', '--formato', 'Texto Livre'], 'O --formato é o id de um formato (letras minúsculas, dígitos e hífen).'],
    [['pasta', '--run', 'r2', '--pedido', '--agente', '../x'], 'O --agente é o id do agente na crew (letras, dígitos, ponto, sublinhado e hífen).'],
  ]) assert.deepEqual((await rodarCaminho(raiz, ...argv)).linhas, [USO_CAMINHO, motivo]);
});

test('U5d-02a: in the list of corrections a pedido is marked, so its step numbers are not read as the steps of the pipeline', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--pedido', '--tema', 'Ofício');
  await marcar(raiz, 2, 'checkpoint', 'corrigido', '--nota', 'mais curto');
  await fechar(raiz, 'aprovado');
  await rodarCaminho(raiz, 'pasta', '--run', 'comum');
  await rodarExecucao(raiz, 'marcar', '--run', 'comum', '--passo', '3', '--evento', 'checkpoint', '--resultado', 'corrigido', '--nota', 'tom formal');
  const r = await rodarExecucao(raiz, 'fechar', '--run', 'comum', '--resultado', 'aprovado');
  assert.deepEqual(r.linhas.slice(-3, -1), ['- comum · passo 3 · tom formal', `- ${RUN} (pedido) · passo 2 · mais curto`]);
});