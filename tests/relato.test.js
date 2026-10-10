// specs/fase-u6b-dados-e-custo.md — U6b-08: the usage report. It carries the version, Node, system, IDE and
// the state of the last run — and nothing of the client: no theme, note, output description, path or name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { main as relato } from '../templates/_opencrew/core/scripts/relato.mjs';
import { CREW, SAIDA, arvore, gravar, projeto } from './_limpeza.js';

const USO = 'Uso: node _opencrew/core/scripts/relato.mjs [--crew <crew>] [--ide <nome>]';
const SEGREDOS = ['Ata do cliente Fulano', 'Rua das Acácias 123', 'segredo-do-agente', 'Contrato Acme Ltda'];

async function rodar(raiz, ...argv) {
  const linhas = [];
  const code = await relato(argv, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas, texto: linhas.join('\n'), fim: linhas.at(-1) };
}

function registro(run, extra = {}) {
  return JSON.stringify({
    versao: 1, crew: CREW, run, tema: SEGREDOS[0], tipo: extra.tipo, status: 'aprovada', iniciadaEm: extra.iniciadaEm ?? '2026-10-09T10:00:00.000Z', fechadaEm: '2026-10-09T10:30:00.000Z', passosPrevistos: 5,
    passos: [{ n: 2, arquivo: `${SAIDA}/${run}/v1/${SEGREDOS[3]}.md`, em: 'x' }, { n: 4, arquivo: `${SAIDA}/${run}/v2/${SEGREDOS[2]}.md`, em: 'x' }],
    marcos: [{ passo: 1, evento: 'checkpoint', resultado: 'pulado', nota: '', em: 'x' }, { passo: 3, evento: 'checkpoint', resultado: 'corrigido', nota: SEGREDOS[1], em: 'x' }, { passo: 4, evento: 'revisao', resultado: 'aprovado', nota: '', em: 'x' }, { passo: 5, evento: 'checkpoint', resultado: 'corrigido', nota: SEGREDOS[1], em: 'x' }],
    saida: SEGREDOS[3],
  });
}

test('U6b-08a: the report has version, Node, system, IDE and the fields of the last run, and ends with RELATO:OK; it writes nothing', async (t) => {
  const raiz = await projeto(t, { '_opencrew/.opencrew-version': '1.17.0\n', [`${SAIDA}/2026-10-09-100000/execucao.json`]: registro('2026-10-09-100000') });
  const antes = await arvore(raiz);
  const r = await rodar(raiz, '--ide', 'claude-code');
  assert.equal(r.code, 0, r.texto);
  assert.deepEqual(r.linhas, [
    '## Relato de uso do OpenCrew',
    '- Versão do OpenCrew: 1.17.0',
    `- Node: ${process.version}`,
    `- Sistema: ${os.platform()} ${os.arch()}`,
    '- IDE: claude-code',
    '',
    '### Última execução',
    '- Execução: 2026-10-09-100000',
    '- Tipo: pipeline',
    '- Situação: aprovada',
    '- Passos previstos: 5',
    '- Último passo conferido: 4',
    '- Respostas registradas: checkpoint pulado 1, checkpoint corrigido 2, revisao aprovado 1',
    'RELATO:OK',
  ]);
  assert.deepEqual(await arvore(raiz), antes);
});

test('U6b-08a: with no run the report says so; with no IDE it says "não informado"; a pedido is told apart; the newest run of the project wins', async (t) => {
  const vazio = await projeto(t);
  const r = await rodar(vazio);
  assert.ok(r.linhas.includes('- Nenhuma execução registrada.') && r.linhas.includes('- IDE: não informado') && r.linhas.includes('- Versão do OpenCrew: desconhecida'), r.texto);
  const raiz = await projeto(t, {
    [`${SAIDA}/2026-10-01-100000/execucao.json`]: registro('2026-10-01-100000', { iniciadaEm: '2026-10-01T10:00:00.000Z' }),
    [`${SAIDA}/2026-10-08-100000/execucao.json`]: registro('2026-10-08-100000', { tipo: 'pedido', iniciadaEm: '2026-10-08T10:00:00.000Z' }),
  });
  const cheio = await rodar(raiz, '--crew', CREW);
  assert.ok(cheio.linhas.includes('- Execução: 2026-10-08-100000') && cheio.linhas.includes('- Tipo: pedido avulso'), cheio.texto);
});

test('U6b-08b: nothing of the client reaches the report — theme, note, output, file names, agent names, crew name and the absolute path', async (t) => {
  const raiz = await projeto(t, { [`${SAIDA}/2026-10-09-100000/execucao.json`]: registro('2026-10-09-100000'), [`${SAIDA}/assembleia-acme/execucao.json`]: registro('assembleia-acme', { iniciadaEm: '2026-10-09T11:00:00.000Z' }) });
  const r = await rodar(raiz, '--ide', 'codex');
  for (const segredo of [...SEGREDOS, CREW, raiz, raiz.split('\\').join('/'), 'assembleia-acme', 'crews/']) assert.ok(!r.texto.includes(segredo), `leaked: ${segredo}`);
  assert.ok(r.linhas.includes('- Execução: (nome próprio, omitido)'), 'a run named by the user may be client content');
});

test('U6b-08b: a record with strange fields or a crew with a broken folder still gives a report', async (t) => {
  const raiz = await projeto(t, { [`${SAIDA}/2026-10-09-100000/execucao.json`]: JSON.stringify({ status: 'aberta', passos: [{ n: 'x' }, 'lixo'], marcos: [{}, { evento: 'a\nb', resultado: 'c' }], passosPrevistos: 'muitos' }) });
  const r = await rodar(raiz);
  assert.equal(r.code, 0, r.texto);
  assert.ok(r.linhas.includes('- Passos previstos: não informado') && r.linhas.includes('- Último passo conferido: nenhum'), r.texto);
  assert.ok(!r.texto.includes('lixo'));
  assert.equal(r.fim, 'RELATO:OK');
});

test('U6b-08a: usage errors — an IDE name with a path or a space, an unknown crew, an unknown argument, a folder with no _opencrew/', async (t) => {
  const raiz = await projeto(t);
  const casos = [
    [['--ide', 'meu ide'], 'O --ide é um nome curto: letras, dígitos e hífen, até 30 caracteres.'],
    [['--ide', '../x'], 'O --ide é um nome curto: letras, dígitos e hífen, até 30 caracteres.'],
    [['--crew', 'fantasma'], 'Crew não encontrada: fantasma'],
    [['solto'], 'Argumento desconhecido: solto.'],
  ];
  for (const [argv, motivo] of casos) {
    const r = await rodar(raiz, ...argv);
    assert.deepEqual([r.code, r.linhas], [1, [USO, motivo]], argv.join(' '));
  }
  const linhas = [];
  assert.equal(await relato([], { cwd: os.tmpdir(), escrever: (s) => linhas.push(s) }), 1);
  assert.equal(linhas.at(-1), 'Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.');
  await gravar(raiz, {});
});
