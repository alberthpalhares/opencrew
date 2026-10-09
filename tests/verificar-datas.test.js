// specs/fase-u6a-polimento-do-uso-real.md — U6a-01: a date written with its weekday has to agree. The
// alert never blocks, never judges a past date, and reads only "weekday + date" written in full.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { verificar } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { alertasDeDatas } from '../templates/_opencrew/core/scripts/verificar/datas.mjs';
import { projetoFalso, SAIDA, CREW, rodarMain } from './_helpers.js';

const HOJE = new Date(2026, 9, 9); // sexta-feira, 9 de outubro de 2026
const detalhes = (texto, hoje = HOJE) => alertasDeDatas(texto, hoje).map((i) => i.detalhe);
const DOMINGO_20 = '‘20 de setembro, sábado’: 20 de setembro de 2026 cai num domingo. Confira a data.';

test('U6a-01a: "20 de setembro, sábado" with the clock in 2026 is an alert; the inverse order and "(sábado)" give the same alert', () => {
  assert.deepEqual(detalhes('A festa é em 20 de setembro, sábado, na praça.'), [DOMINGO_20]);
  assert.deepEqual(detalhes('Sábado, 20 de setembro'), ['‘Sábado, 20 de setembro’: 20 de setembro de 2026 cai num domingo. Confira a data.']);
  assert.deepEqual(detalhes('Encontro dia 20 de setembro (sábado) às 16h.'), ['‘20 de setembro (sábado)’: 20 de setembro de 2026 cai num domingo. Confira a data.']);
  assert.deepEqual(detalhes('sábado 20 de set.'), ['‘sábado 20 de set.’: 20 de setembro de 2026 cai num domingo. Confira a data.'], 'month abbreviation');
});

test('U6a-01b: the year written wins over the clock; a date that matches its weekday gives nothing; "-feira" is optional', () => {
  assert.deepEqual(detalhes('sábado, 11 de outubro de 2026', new Date(2030, 0, 1)), ['‘sábado, 11 de outubro de 2026’: 11 de outubro de 2026 cai num domingo. Confira a data.']);
  assert.deepEqual(detalhes('domingo, 11 de outubro'), []);
  assert.deepEqual(detalhes('sexta-feira, 9 de outubro de 2026'), []);
  assert.deepEqual(detalhes('sexta, 9 de outubro de 2026'), []);
  assert.deepEqual(detalhes('quinta-feira, 8 de outubro'), []);
  assert.deepEqual(detalhes('terça, 8 de outubro'), ['‘terça, 8 de outubro’: 8 de outubro de 2026 cai numa quinta-feira. Confira a data.']);
});

test('U6a-01c: an impossible date is an alert; a weekday far from the date, or none at all, gives nothing; one weekday does not serve two dates', () => {
  assert.deepEqual(detalhes('30 de fevereiro, quinta'), ['‘30 de fevereiro, quinta’: 30 de fevereiro de 2026 não existe. Confira a data.']);
  assert.deepEqual(detalhes('A reunião é no sábado. O prazo vence em 20 de setembro.'), []);
  assert.deepEqual(detalhes('Prazo: 20 de setembro de 2026.'), []);
  assert.deepEqual(detalhes('5 de maio, quarta, 6 de maio'), [], 'quarta belongs to 6 de maio, which is a Wednesday in 2026');
  assert.deepEqual(detalhes('Uma ata de sábado, 1 de março de 2025 (passado) bate: 1 de março de 2025 foi sábado.'), []);
});

test('U6a-01d: the alert does not change the status (clean text stays OK, a block stays BLOQUEADA), and the same text twice counts once', async (t) => {
  const limpo = await projetoFalso({ saidas: { 'a.md': 'Convite.\n\nSábado, 20 de setembro, no salão.\n\nDe novo: sábado, 20 de setembro.\n' } });
  t.after(() => fs.rm(limpo, { recursive: true, force: true }));
  const r = await verificar({ raiz: limpo, crew: CREW, arquivos: [{ arquivo: `${SAIDA}/a.md`, formato: 'texto-livre' }], agora: () => new Date(2026, 9, 9) });
  assert.equal(r.status, 'OK');
  assert.equal(r.alertas, 1, 'two equal snippets, one alert');
  assert.equal(r.arquivos[0].itens.find((i) => i.item === 'Datas').nivel, 'alerta');
  const bloqueado = await projetoFalso({ saidas: { 'b.md': 'Sábado, 20 de setembro.\n\n[PREENCHER: local]\n' } });
  t.after(() => fs.rm(bloqueado, { recursive: true, force: true }));
  const b = await verificar({ raiz: bloqueado, crew: CREW, arquivos: [{ arquivo: `${SAIDA}/b.md`, formato: 'texto-livre' }], agora: () => new Date(2026, 9, 9) });
  assert.equal(b.status, 'AGUARDANDO_USUARIO');
  assert.equal(b.alertas, 1);
});

test('U6a-01d: the command line reports the alert with the clock of the computer and still ends with the status line', async (t) => {
  const raiz = await projetoFalso({ saidas: { 'a.md': 'Sábado, 20 de setembro de 2026.\n' } });
  t.after(() => fs.rm(raiz, { recursive: true, force: true }));
  const r = await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${SAIDA}/a.md=texto-livre`]);
  assert.ok(r.linhas.some((l) => l.includes('20 de setembro de 2026 cai num domingo')), r.linhas.join('\n'));
  assert.equal(r.linhas.at(-1), 'VERIFICACAO:OK');
});

test('U6a-01e: a list of "date, weekday" items — bullets, lines, one after the other — is correct and gives no alert', () => {
  assert.deepEqual(detalhes('- 4 de maio, segunda\n- 5 de maio, terça\n- 6 de maio, quarta'), []);
  assert.deepEqual(detalhes('4 de maio, segunda\n5 de maio, terça'), []);
  assert.deepEqual(detalhes('4 de maio, segunda, 5 de maio, terça'), []);
  assert.deepEqual(detalhes('segunda, 4 de maio; terça, 5 de maio'), []);
  assert.deepEqual(detalhes('- 4 de novembro, terça\n- 5 de novembro, quinta'), ['‘4 de novembro, terça’: 4 de novembro de 2026 cai numa quarta-feira. Confira a data.'], 'a wrong one in a list is still found');
});

test('U6a-01f: a range or a list of weekdays next to dates is not checked', () => {
  for (const texto of ['de 4 a 8 de maio, segunda a sexta', 'de segunda a sexta, 4 de maio a 8 de maio', 'sexta e sábado, 9 de outubro e 10 de outubro', 'sábado e domingo, 19 de setembro e 20 de setembro', 'terça ou quarta, 5 de maio']) assert.deepEqual(detalhes(texto), [], texto);
});

test('U6a-01g: a date with no year that already passed this year may be about next year; 29 de fevereiro uses the next leap year', () => {
  assert.deepEqual(detalhes('planejamento 2027: segunda, 4 de janeiro'), [], '4 Jan 2027 is a Monday');
  assert.deepEqual(detalhes('sexta, 1º de janeiro'), [], '1 Jan 2027 is a Friday');
  assert.deepEqual(detalhes('terça, 4 de janeiro'), ['‘terça, 4 de janeiro’: 4 de janeiro de 2026 cai num domingo. Confira a data.']);
  assert.deepEqual(detalhes('29 de fevereiro, terça'), [], '29 Feb 2028 is a Tuesday');
  assert.deepEqual(detalhes('quarta, 4 de novembro'), [], 'a date that still comes this year uses this year (4 Nov 2026 is a Wednesday)');
});

test('U6a-01h: the em dash works as a separator; a newline is a boundary; the cost grows in a straight line', () => {
  assert.deepEqual(detalhes('20 de setembro — sábado'), ['‘20 de setembro — sábado’: 20 de setembro de 2026 cai num domingo. Confira a data.']);
  assert.deepEqual(detalhes('20 de setembro\n\nSábado a gente descansa'), []);
  const grande = '5 de maio, terça\n'.repeat(60000);
  const inicio = Date.now();
  assert.deepEqual(detalhes(grande), []);
  assert.ok(Date.now() - inicio < 3000, `${Date.now() - inicio} ms for 1 MB`);
});