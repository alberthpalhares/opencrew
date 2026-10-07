// specs/fase-u3b-documento-word.md — U3b-01 (rules 1 to 4): the package. Parts and their order,
// stored entries with an own CRC-32, the structural invariants, the same bytes for the same text,
// the page and the styles; and the proof that the readers of the tests bite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarDocx, lerPerfil } from '../templates/_opencrew/core/scripts/documento.mjs';
import { crc32 } from '../templates/_opencrew/core/scripts/documento/zip.mjs';
import { gerar, lerZip, lerXml, xmlDe, todos, filho, tem, val, png, PERFIL_COMPLETO } from './_documento.js';
import { conferirPacote, trocar } from './_documento-conferir.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(AQUI, '../templates/_opencrew/core/scripts');
const REFERENCIA = readFileSync(path.join(AQUI, 'fixtures/documento-referencia.md'), 'utf8');
const FIXAS = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels', 'word/styles.xml', 'word/settings.xml', 'word/numbering.xml'];
const DO_TIMBRE = ['word/header1.xml', 'word/_rels/header1.xml.rels', 'word/media/logo.png', 'word/footer1.xml'];
const TABELA = '| A | B |\n|---|---|\n| 1 | |\n';
const LIMITES = {
  'one line': 'Uma linha só.',
  'empty cell and table at the end': `Texto.\n\n${TABELA}`,
  'two tables in a row': `${TABELA}\n${TABELA}\nFim.`,
  'page break before a table': `Texto.\n\n::: quebra-de-pagina\n${TABELA}\nFim.`,
  'signatures at the end': 'Texto.\n\n::: assinaturas\nAna Lima | Presidente\nRui Sá\nBia Reis | Tesoureira\n:::\n',
};
const completo = () => ({ perfil: lerPerfil(PERFIL_COMPLETO).perfil, logotipo: png() });
const estilo = (entradas, id) => todos(xmlDe(entradas, 'word/styles.xml'), 'w:style').find((s) => s.attrs['w:styleId'] === id);
const espaco = (no) => todos(no, 'w:spacing')[0].attrs;

test('U3b-01a: with the full profile the zip has the 11 parts of rule 2, in that order', () => {
  const { nomes } = gerar(REFERENCIA, completo());
  assert.deepEqual(nomes, [...FIXAS, ...DO_TIMBRE]);
});

test('U3b-01a: without a profile it has the 7 fixed parts and the footer; never docProps/', () => {
  const { nomes } = gerar(REFERENCIA);
  assert.deepEqual(nomes, [...FIXAS, 'word/footer1.xml']);
  for (const lista of [nomes, gerar(REFERENCIA, completo()).nomes]) assert.deepEqual(lista.filter((n) => n.startsWith('docProps/')), []);
});

test('U3b-01b: every entry is stored, with the fixed date, and the CRC matches an independent implementation', () => {
  const { entradas } = gerar(REFERENCIA, completo()); // lerZip already compared each CRC, bit by bit
  assert.equal(entradas.length, 11);
  for (const e of entradas) assert.deepEqual([e.nome, e.metodo, e.data, e.hora], [e.nome, 0, 0x0021, 0]);
  assert.equal(crc32(Buffer.from('123456789')).toString(16), 'cbf43926');
});

test('U3b-01b: neither documento.mjs nor a module of scripts/documento/ imports node:zlib or a network module', () => {
  const modulos = ['documento.mjs', ...readdirSync(path.join(SCRIPTS, 'documento')).map((m) => `documento/${m}`)];
  assert.ok(modulos.length > 8, 'could not list the modules');
  for (const m of modulos) {
    const fonte = readFileSync(path.join(SCRIPTS, m), 'utf8');
    assert.doesNotMatch(fonte, /['"](node:)?(zlib|net|http|https|http2|dns|dgram|tls|child_process)['"]|\bfetch\(/, m);
  }
});

for (const [caso, texto] of Object.entries({ 'the reference': REFERENCIA, ...LIMITES })) {
  test(`U3b-01c: ${caso} — the invariants (a) to (g) hold in every part, with and without the profile`, () => {
    for (const opcoes of [{}, completo(), { perfil: lerPerfil('cabecalho_1: Só uma linha\nnumero_pagina: nao\n').perfil }]) {
      assert.deepEqual(conferirPacote(gerar(texto, opcoes).entradas), []);
    }
  });
}

test('U3b-01d: the same text twice, and with CRLF, LF and a BOM, gives the same bytes', () => {
  const base = gerarDocx({ texto: REFERENCIA, ...completo() }).bytes;
  const lf = REFERENCIA.replace(/\r\n/g, '\n');
  for (const texto of [REFERENCIA, lf, lf.replace(/\n/g, '\r\n'), `${String.fromCharCode(0xfeff)}${lf}`]) {
    assert.ok(base.equals(gerarDocx({ texto, ...completo() }).bytes));
  }
  assert.ok(!base.equals(gerarDocx({ texto: `${lf}\nMais uma linha.`, ...completo() }).bytes), 'another text, other bytes');
});

test('U3b-01e: without a profile the section is A4 with the default margins, header and footer at 680', () => {
  const secao = todos(xmlDe(gerar('Texto.').entradas, 'word/document.xml'), 'w:sectPr')[0];
  assert.deepEqual(filho(secao, 'w:pgSz').attrs, { 'w:w': '11906', 'w:h': '16838' });
  const m = filho(secao, 'w:pgMar').attrs;
  assert.deepEqual([m['w:left'], m['w:right'], m['w:top'], m['w:bottom'], m['w:header'], m['w:footer']], ['1701', '1134', '1417', '1417', '680', '680']);
});

test('U3b-01e: Normal is Arial 11, justified, line 276 and 100 after; titles have the sizes of §4', () => {
  const { entradas } = gerar('Texto.');
  const normal = estilo(entradas, 'Normal');
  assert.deepEqual([val(normal, 'w:rFonts', 'w:ascii'), val(normal, 'w:sz'), val(normal, 'w:jc'), val(normal, 'w:lang')], ['Arial', '22', 'both', 'pt-BR']);
  assert.deepEqual([espaco(normal)['w:line'], espaco(normal)['w:lineRule'], espaco(normal)['w:after']], ['276', 'auto', '100']);
  const medidas = (id) => { const s = estilo(entradas, id); return [val(s, 'w:sz'), espaco(s)['w:before'] ?? '0', espaco(s)['w:after'], tem(s, 'w:b'), tem(s, 'w:i'), tem(s, 'w:keepNext'), val(s, 'w:jc')]; };
  assert.deepEqual(medidas('Titulo'), ['28', '160', '80', true, false, false, 'center']);
  assert.deepEqual(medidas('Subtitulo'), ['20', '0', '320', false, true, false, 'center']);
  assert.deepEqual(medidas('Heading1'), ['24', '280', '80', true, false, true, 'left']);
  assert.deepEqual(medidas('Heading2'), ['22', '200', '60', true, false, true, 'left']);
  assert.deepEqual(medidas('Heading3'), ['21', '160', '40', true, true, true, 'left']);
  assert.deepEqual(['Heading1', 'Heading2', 'Heading3'].map((id) => [val(estilo(entradas, id), 'w:name'), tem(estilo(entradas, id), 'w:caps')]), [['heading 1', true], ['heading 2', false], ['heading 3', false]]);
  assert.deepEqual(['Subtitulo', 'Heading3'].map((id) => val(estilo(entradas, id), 'w:color')), ['333333', '333333']);
});

test('U3b-01e: settings.xml declares compatibility mode 15', () => {
  const ajuste = todos(xmlDe(gerar('Texto.').entradas, 'word/settings.xml'), 'w:compatSetting')[0].attrs;
  assert.deepEqual([ajuste['w:name'], ajuste['w:val']], ['compatibilityMode', '15']);
});

test('U3b-01g: the zip reader refuses a changed CRC and a changed byte', () => {
  const { bytes } = gerar('Texto.');
  assert.doesNotThrow(() => lerZip(bytes));
  const crcTrocado = Buffer.from(bytes);
  crcTrocado[crcTrocado.indexOf('PK\x01\x02', 0, 'latin1') + 16] ^= 0xff;
  assert.throws(() => lerZip(crcTrocado), /zip:/);
  const byteTrocado = Buffer.from(bytes);
  byteTrocado[byteTrocado.indexOf('<w:body>') + 3] ^= 0x01;
  assert.throws(() => lerZip(byteTrocado), /CRC does not match/);
});

test('U3b-01g: the XML reader refuses an open tag, U+000C and a loose &', () => {
  assert.doesNotThrow(() => lerXml('<a xmlns:w="x"><w:b w:c="1"/>t &amp; u</a>'));
  assert.throws(() => lerXml('<a><b></a>'), /xml:/);
  assert.throws(() => lerXml('<a><b>'), /never closed/);
  assert.throws(() => lerXml(`<a>${String.fromCharCode(0x0c)}</a>`), /forbidden character/);
  assert.throws(() => lerXml('<a>b & c</a>'), /loose &/);
  assert.throws(() => lerXml('<a><w:b/></a>'), /not declared/);
  assert.throws(() => lerXml('<a b="1" b="2"/>'), /twice/);
  assert.throws(() => lerXml('<a/><b/>'), /more than one root/);
});

const TEXTO_H = '# Título\n\n- item\n\n| A |\n|---|\n| 1 |\n\nFim.';
const QUEBRAS = [
  ['a cell without a paragraph', 'word/document.xml', (x) => x.replace(/(<w:tc>.*?)<w:p>.*?<\/w:p><\/w:tc>/, '$1</w:tc>'), /\(d\).*cell/],
  ['a table without tblGrid', 'word/document.xml', (x) => x.replace(/<w:tblGrid>.*?<\/w:tblGrid>/, ''), /\(d\).*tblGrid/],
  ['r:embed without a relationship', 'word/header1.xml', (x) => x.replace(/r:embed="[^"]+"/, 'r:embed="rId99"'), /\(b\).*rId99/],
  ['a part without a content type', '[Content_Types].xml', (x) => x.replace(/<Override PartName="\/word\/styles.xml"[^>]*\/>/, ''), /\(a\) word\/styles.xml/],
  ['a part no relationship points to', 'word/_rels/document.xml.rels', (x) => x.replace(/<Relationship [^>]*numbering[^>]*\/>/, ''), /\(b\) word\/numbering.xml/],
  ['a style in use and not defined', 'word/document.xml', (x) => x.replace('w:val="Heading1"', 'w:val="Sumiu"'), /\(c\).*Sumiu/],
  ['a numId in use and not defined', 'word/document.xml', (x) => x.replace('<w:numId w:val="1"/>', '<w:numId w:val="7"/>'), /\(c\).*numId 7/],
  ['w:t without xml:space', 'word/document.xml', (x) => x.replace('<w:t xml:space="preserve">', '<w:t>'), /\(e\)/],
  ['w:jc before w:spacing', 'word/styles.xml', (x) => x.replace(/(<w:spacing [^>]*\/>)(<w:jc [^>]*\/>)/, '$2$1'), /\(g\).*out of order/],
  ['w:sectPr before the last block', 'word/document.xml', (x) => x.replace(/(<w:p>(?:(?!<w:p>).)*<\/w:p>)(<w:sectPr>.*<\/w:sectPr>)/, '$2$1'), /\(g\).*sectPr/],
  ['a malformed part', 'word/settings.xml', (x) => x.replace('</w:settings>', ''), /\(f\) word\/settings.xml/],
];
for (const [caso, parte, quebrar, esperado] of QUEBRAS) {
  test(`U3b-01h: the package check refuses ${caso}`, () => {
    const { entradas } = gerar(TEXTO_H, completo());
    assert.deepEqual(conferirPacote(entradas), []);
    const quebrado = trocar(entradas, parte, quebrar);
    assert.notDeepEqual(quebrado.map((e) => e.bytes.toString('latin1')), entradas.map((e) => Buffer.from(e.bytes).toString('latin1')), 'the test changed the part');
    assert.match(conferirPacote(quebrado).join('\n'), esperado);
  });
}
