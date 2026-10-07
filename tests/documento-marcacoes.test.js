// specs/fase-u3b-documento-word.md — U3b-09 (rule 8): the three document markers (`:::`): centred
// title and subtitle, page break and signature block; and what is not a marker stays as text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerar, corpo, paragrafos, filhos, filho, todos, textoDe, tem, val } from './_documento.js';

const estilo = (p) => val(p, 'w:pStyle') ?? null;
const quebras = (md) => corpo(md).filter((b) => tem(b, 'w:pageBreakBefore')).length;
const linhasDe = (tabela) => filhos(tabela).filter((f) => f.nome === 'w:tr');
const celulas = (linha) => filhos(linha).filter((f) => f.nome === 'w:tc');
const ps = (celula) => filhos(celula).filter((f) => f.nome === 'w:p');
const DESCONHECIDA = (n) => (n === 1 ? '1 linha com marcação desconhecida (`:::`) ficou como texto.' : `${n} linhas com marcação desconhecida (\`:::\`) ficaram como texto.`);
const SEM_FIM = 'Bloco de assinaturas sem a linha `:::` no fim: ficou como texto.';
const assinar = (...linhas) => `Texto.\n\n::: assinaturas\n${linhas.join('\n')}\n:::\n`;

test('U3b-09a: ::: titulo and ::: subtítulo are two centred paragraphs in the styles Titulo and Subtitulo', () => {
  const [titulo, sub, resto] = paragrafos('::: titulo ATA DA ASSEMBLEIA\n::: subtítulo Realizada em 3 de março\nTexto.');
  assert.deepEqual([estilo(titulo), textoDe(titulo)], ['Titulo', 'ATA DA ASSEMBLEIA']);
  assert.deepEqual([estilo(sub), textoDe(sub)], ['Subtitulo', 'Realizada em 3 de março']);
  assert.equal(estilo(resto), null);
});

test('U3b-09a: the marker name ignores case and accents, works anywhere and takes bold and italic', () => {
  const blocos = paragrafos('Texto.\n::: TÍTULO Anexo **I**\n:::subtitulo _Lista_\n::: Titulo Outro');
  assert.deepEqual(blocos.map(estilo), [null, 'Titulo', 'Subtitulo', 'Titulo']);
  assert.deepEqual(blocos.map(textoDe), ['Texto.', 'Anexo I', 'Lista', 'Outro']);
  assert.ok(tem(todos(blocos[1], 'w:r')[1], 'w:b') && tem(todos(blocos[2], 'w:r')[0], 'w:i'));
  assert.deepEqual(gerar('::: titulo A').avisos, []);
});

test('U3b-09b: ::: quebra-de-pagina puts pageBreakBefore on the next paragraph', () => {
  const [antes, depois] = paragrafos('Antes.\n\n::: quebra-de-pagina\n\nDepois.');
  assert.deepEqual([tem(antes, 'w:pageBreakBefore'), tem(depois, 'w:pageBreakBefore'), textoDe(depois)], [false, true, 'Depois.']);
  const [, titulo] = paragrafos('Antes.\n::: quebra-de-pagina\n# Anexo');
  assert.deepEqual([estilo(titulo), tem(titulo, 'w:pageBreakBefore')], ['Heading1', true]);
});

test('U3b-09b: before a table (and before signatures) the break goes on an empty paragraph of its own', () => {
  for (const bloco of ['| A |\n|---|\n| 1 |', '::: assinaturas\nAna Lima\n:::']) {
    const [antes, vazio, tabela] = corpo(`Antes.\n::: quebra-de-pagina\n${bloco}\n`);
    assert.deepEqual([antes.nome, vazio.nome, tabela.nome], ['w:p', 'w:p', 'w:tbl']);
    assert.deepEqual([textoDe(vazio), tem(vazio, 'w:pageBreakBefore'), tem(tabela, 'w:pageBreakBefore')], ['', true, false]);
  }
});

test('U3b-09b: at the start, at the end and repeated, the marker makes one break only', () => {
  const md = '::: quebra-de-pagina\nUm.\n::: quebra-de-pagina\n::: Quebra-de-Página\n\nDois.\n::: quebra-de-pagina\n';
  assert.equal(quebras(md), 1);
  assert.deepEqual(paragrafos(md).map((p) => [textoDe(p), tem(p, 'w:pageBreakBefore')]), [['Um.', false], ['Dois.', true]]);
  assert.deepEqual(gerar(md).avisos, []);
  for (const e of gerar(md).entradas) assert.doesNotMatch(Buffer.from(e.bytes).toString('utf8'), /<w:br\b/);
});

test('U3b-09c: two people are a borderless table of one row and 2 columns, with cantSplit', () => {
  const md = assinar('Ana Lima | Presidente', 'Rui Sá | Secretário');
  const [tabela] = corpo(md).filter((b) => b.nome === 'w:tbl');
  const [linha, ...outras] = linhasDe(tabela);
  assert.deepEqual([outras.length, celulas(linha).length, todos(tabela, 'w:gridCol').length], [0, 2, 2]);
  assert.ok(!tem(tabela, 'w:tblBorders') && !tem(tabela, 'w:tcBorders') && tem(filho(linha, 'w:trPr'), 'w:cantSplit'));
  for (const celula of celulas(linha)) {
    const [nome, cargo] = ps(celula);
    assert.deepEqual(filhos(todos(nome, 'w:pBdr')[0]).map((b) => [b.nome, b.attrs['w:val']]), [['w:top', 'single']]);
    assert.ok(todos(nome, 'w:r').every((r) => tem(r, 'w:caps') && tem(r, 'w:b')));
    assert.deepEqual([val(nome, 'w:jc'), val(cargo, 'w:jc'), tem(cargo, 'w:pBdr'), tem(cargo, 'w:caps')], ['center', 'center', false, false]);
    assert.deepEqual([val(nome, 'w:spacing', 'w:before'), val(nome, 'w:ind', 'w:left'), val(nome, 'w:ind', 'w:right')], ['720', '425', '425']);
  }
  assert.deepEqual(todos(tabela, 'w:p').map(textoDe), ['Ana Lima', 'Presidente', 'Rui Sá', 'Secretário']);
  assert.deepEqual(gerar(md).avisos, []);
});

test('U3b-09c: with three people the third takes the whole second row (gridSpan 2), in the centre', () => {
  const [tabela] = corpo(assinar('Ana Lima | Presidente', 'Rui Sá | Secretário', '', 'Bia Reis | Tesoureira')).filter((b) => b.nome === 'w:tbl');
  const [primeira, segunda] = linhasDe(tabela);
  assert.deepEqual([celulas(primeira).length, celulas(segunda).length], [2, 1]);
  const [sozinha] = celulas(segunda);
  assert.deepEqual([val(sozinha, 'w:gridSpan'), val(sozinha, 'w:ind', 'w:left'), val(sozinha, 'w:ind', 'w:right')], ['2', '2268', '2268']);
  assert.deepEqual(ps(sozinha).map(textoDe), ['Bia Reis', 'Tesoureira']);
  assert.ok(tem(filho(segunda, 'w:trPr'), 'w:cantSplit'));
  assert.equal(val(sozinha, 'w:tcW', 'w:w'), String(2 * Number(val(celulas(primeira)[0], 'w:tcW', 'w:w'))));
});

test('U3b-09c: a line without a bar is a cell with the name only', () => {
  const [tabela] = corpo(assinar('Ana Lima', 'Rui Sá | Secretário | Suplente')).filter((b) => b.nome === 'w:tbl');
  const [a, b] = celulas(linhasDe(tabela)[0]);
  assert.deepEqual(ps(a).map(textoDe), ['Ana Lima']);
  assert.deepEqual(ps(b).map(textoDe), ['Rui Sá', 'Secretário | Suplente']);
});

test('U3b-09d: an unknown marker stays as text, with a warning', () => {
  const md = '::: nota Texto da nota\nComum.\n:::\n::: titulo\n::: quebra-de-pagina já';
  assert.deepEqual(paragrafos(md).map((p) => [textoDe(p), estilo(p)]), [['::: nota Texto da nota', null], ['Comum.', null], [':::', null], ['::: titulo', null], ['::: quebra-de-pagina já', null]]);
  assert.deepEqual(gerar(md).avisos, [DESCONHECIDA(4)]);
  assert.deepEqual(gerar('::: nota Texto').avisos, [DESCONHECIDA(1)]);
});

test('U3b-09d: a signature block without the closing ::: stays as text, with its own warning', () => {
  const md = 'Texto.\n::: assinaturas\nAna Lima | Presidente\nRui Sá | Secretário\n';
  assert.deepEqual(corpo(md).filter((b) => b.nome === 'w:tbl'), []);
  assert.deepEqual(paragrafos(md).map(textoDe), ['Texto.', '::: assinaturas', 'Ana Lima | Presidente', 'Rui Sá | Secretário']);
  assert.deepEqual(gerar(md).avisos, [SEM_FIM]);
});

test('U3b-09d: ::: in the middle of a line is common text, without a warning', () => {
  const md = 'Nota ::: titulo\n  ::: titulo recuado';
  assert.deepEqual(paragrafos(md).map((p) => [textoDe(p), estilo(p)]), [['Nota ::: titulo', null], ['::: titulo recuado', null]]);
  assert.deepEqual(gerar(md).avisos, []);
});

test('U3b-09d: inside the signature block nothing else is read: **x** is the name **x**', () => {
  const md = assinar('**x** | _cargo_', '# Rui | ![a](b.png)');
  const [tabela] = corpo(md).filter((b) => b.nome === 'w:tbl');
  assert.deepEqual(todos(tabela, 'w:p').map(textoDe), ['**x**', '_cargo_', '# Rui', '![a](b.png)']);
  assert.deepEqual(gerar(md).avisos, []);
});
