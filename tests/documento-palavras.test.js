// specs/fase-u3b-documento-word.md — U3b-10 (rule 5): the same words and the same numbers, in the
// same order. The words read from word/document.xml equal the words of the markdown, taken by an
// extractor that does not import the generator; and the whole fictitious minutes, end to end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerPerfil } from '../templates/_opencrew/core/scripts/documento.mjs';
import { gerar, lerZip, xmlDe, filhos, filho, todos, textoDe, tem, val, png, projeto, rodar, PERFIL_COMPLETO } from './_documento.js';
import { conferirPacote, palavrasDoDocx, palavrasDoMarkdown, trocar } from './_documento-conferir.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REFERENCIA = readFileSync(path.join(AQUI, 'fixtures/documento-referencia.md'), 'utf8').replace(/\r\n/g, '\n'); // the checkout may bring CRLF
const ATA = readFileSync(path.join(AQUI, 'fixtures/ata-exemplo.md'), 'utf8').replace(/\r\n/g, '\n'); // the checkout may bring CRLF
const PERFIL = '_opencrew/_memory/documento-oficial.md';
const LOGO = png(200, 80);
const completo = () => ({ perfil: lerPerfil(PERFIL_COMPLETO).perfil, logotipo: LOGO });
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const corpoDe = (entradas) => filhos(filho(xmlDe(entradas, 'word/document.xml'), 'w:body'));
const comEstilo = (blocos, estilo) => blocos.filter((b) => b.nome === 'w:p' && val(b, 'w:pStyle') === estilo).map(textoDe);
const ehAssinatura = (tabela) => !tem(tabela, 'w:tblBorders');

for (const [nome, texto] of [['the reference', REFERENCIA], ['the fictitious minutes', ATA]]) {
  test(`U3b-10a: ${nome} — the words read from the Word are the words of the markdown, in the same order`, () => {
    const doMarkdown = palavrasDoMarkdown(texto);
    assert.ok(doMarkdown.length > 100, 'the extractor read the text');
    for (const opcoes of [completo(), {}]) assert.deepEqual(palavrasDoDocx(gerar(texto, opcoes).entradas), doMarkdown);
    assert.deepEqual(palavrasDoDocx(gerar(texto.replace(/\n/g, '\r\n')).entradas), doMarkdown);
  });
}

test('U3b-10a: the reference warns about its image and its unknown marker, and nothing else', () => {
  assert.deepEqual(gerar(REFERENCIA).avisos, ['1 imagem não incluída: o Word não leva imagem no texto.', '1 linha com marcação desconhecida (`:::`) ficou como texto.']);
  assert.ok(!palavrasDoMarkdown(REFERENCIA).includes('continuação'), 'the frontmatter is out');
});

test('U3b-10a: the minutes have 3 data tables, 1 signature table, 1 break and no warning', () => {
  const { entradas, avisos } = gerar(ATA, completo());
  const blocos = corpoDe(entradas);
  const tabelas = blocos.filter((b) => b.nome === 'w:tbl');
  assert.deepEqual(avisos, []);
  assert.deepEqual([tabelas.filter((tb) => !ehAssinatura(tb)).length, tabelas.filter(ehAssinatura).length], [3, 1]);
  assert.equal(blocos.filter((b) => tem(b, 'w:pageBreakBefore')).length, 1);
  assert.deepEqual(conferirPacote(entradas), []);
});

test('U3b-10b: the comparison refuses a Word where 2026 became 2025', () => {
  const { entradas } = gerar(ATA, completo());
  const trocado = trocar(entradas, 'word/document.xml', (x) => x.replace('março de 2026, às 19h30', 'março de 2025, às 19h30'));
  assert.notDeepEqual(palavrasDoDocx(trocado), palavrasDoMarkdown(ATA));
  assert.equal(palavrasDoDocx(trocado).length, palavrasDoMarkdown(ATA).length, 'one word changed, none was lost');
});

test('U3b-10b: the comparison refuses a Word with two paragraphs in the other order', () => {
  const { entradas } = gerar(ATA, completo());
  const par = /(<w:p>(?:(?!<w:p>).)*?§ 1º(?:(?!<w:p>).)*?<\/w:p>)(<w:p>(?:(?!<w:p>).)*?§ 2º(?:(?!<w:p>).)*?<\/w:p>)/;
  const invertido = trocar(entradas, 'word/document.xml', (x) => x.replace(par, '$2$1'));
  assert.notDeepEqual(invertido.map((e) => e.bytes.length ? Buffer.from(e.bytes).toString('latin1') : ''), entradas.map((e) => Buffer.from(e.bytes).toString('latin1')), 'the test changed the document');
  assert.deepEqual(conferirPacote(invertido), [], 'the package is still sound: only the order changed');
  assert.notDeepEqual(palavrasDoDocx(invertido), palavrasDoMarkdown(ATA));
  assert.deepEqual([...palavrasDoDocx(invertido)].sort(), [...palavrasDoMarkdown(ATA)].sort(), 'the same words, in another order');
});

test('U3b-10a: end to end — the minutes, a profile with a PNG logo and the command give the whole package', async (t) => {
  const raiz = await projeto(t, { 'Atas/2026-03-14 Ata AGO.md': ATA, [PERFIL]: PERFIL_COMPLETO, 'Ativos/Marca/logo.png': LOGO });
  const r = await rodar(raiz, ['Atas/2026-03-14 Ata AGO.md'], ['Atas/2026-03-14 Ata AGO.docx']);
  assert.deepEqual([r.code, r.linhas.slice(0, 2), r.fim], [0, ['Documento gerado: Atas/2026-03-14 Ata AGO.docx', `Perfil: ${PERFIL}`], 'DOCUMENTO:OK']);
  assert.ok(!r.linhas.includes('Avisos:'));

  const entradas = lerZip(await fs.readFile(path.join(raiz, 'Atas/2026-03-14 Ata AGO.docx')));
  assert.deepEqual(entradas.map((e) => e.nome), ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels', 'word/styles.xml', 'word/settings.xml', 'word/numbering.xml', 'word/header1.xml', 'word/_rels/header1.xml.rels', 'word/media/logo.png', 'word/footer1.xml']);
  assert.deepEqual(conferirPacote(entradas), []);
  assert.deepEqual(palavrasDoDocx(entradas), palavrasDoMarkdown(ATA));

  const blocos = corpoDe(entradas);
  assert.deepEqual(comEstilo(blocos, 'Titulo'), ['ATA DA ASSEMBLEIA GERAL ORDINÁRIA', 'ANEXO I — LISTA DE PRESENÇA']);
  assert.equal(comEstilo(blocos, 'Subtitulo').length, 2);
  assert.deepEqual(comEstilo(blocos, 'Heading1').map((s) => s.split('.')[0]), ROMANOS);
  assert.deepEqual(comEstilo(blocos, 'Heading2').map((s) => s.slice(0, 4)), ['6.1.', '6.2.', '6.3.']);
  const listados = blocos.filter((b) => tem(b, 'w:numPr')).map(textoDe);
  assert.deepEqual(listados, ['Carla Nunes, titular;', 'Davi Prado, titular;', 'Elisa Mota, suplente.']);
  assert.ok(blocos.some((b) => textoDe(b) === '1. Prestação de contas do exercício de 2025;' && !tem(b, 'w:numPr')), 'the number written by the author is text');

  const tabelas = blocos.filter((b) => b.nome === 'w:tbl');
  assert.deepEqual(tabelas.map((tb) => [ehAssinatura(tb), todos(tb, 'w:gridCol').length, filhos(tb).filter((f) => f.nome === 'w:tr').length]), [[false, 3, 4], [false, 3, 3], [true, 2, 2], [false, 4, 5]]);
  assert.deepEqual(todos(tabelas[2], 'w:p').map(textoDe), ['Ana Lima', 'Presidente', 'Rui Sá', 'Secretário', 'Bia Reis', 'Tesoureira']);
  assert.equal(val(todos(tabelas[2], 'w:tc')[2], 'w:gridSpan'), '2');
  const anexo = blocos.find((b) => textoDe(b) === 'ANEXO I — LISTA DE PRESENÇA');
  assert.ok(tem(anexo, 'w:pageBreakBefore') && blocos.indexOf(anexo) > blocos.indexOf(tabelas[2]), 'the annex starts a new page, after the signatures');

  const cabecalho = xmlDe(entradas, 'word/header1.xml');
  const embed = todos(cabecalho, 'a:blip')[0].attrs['r:embed'];
  assert.ok(todos(xmlDe(entradas, 'word/_rels/header1.xml.rels'), 'Relationship').some((x) => x.attrs.Id === embed && x.attrs.Target === 'media/logo.png'));
  assert.ok(Buffer.from(entradas.find((e) => e.nome === 'word/media/logo.png').bytes).equals(LOGO));
  const instrucoes = todos(xmlDe(entradas, 'word/footer1.xml'), 'w:instrText').map((i) => i.filhos.join('').trim());
  assert.deepEqual(instrucoes, ['PAGE', 'NUMPAGES']);
  const secao = blocos.at(-1);
  assert.deepEqual([secao.nome, filhos(secao).map((f) => f.nome)], ['w:sectPr', ['w:headerReference', 'w:footerReference', 'w:pgSz', 'w:pgMar']]);
});
