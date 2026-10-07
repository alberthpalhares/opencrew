// specs/fase-u3b-documento-word.md — U3b-02 (rules 4 to 7): the text. One paragraph per line, the
// closed markdown → Word table, numbers written by the author kept as text, safe characters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerar, corpo, paragrafos, xmlDe, filhos, filho, todos, textoDe, tem, val } from './_documento.js';

const estilo = (p) => val(p, 'w:pStyle') ?? null;
const textos = (md) => paragrafos(md).map(textoDe);
/** The runs of a paragraph: `[text, bold, italic]`. */
const pedacos = (p) => todos(p, 'w:r').map((r) => [textoDe(r), tem(r, 'w:b'), tem(r, 'w:i')]);
const nivel = (p) => val(p, 'w:ilvl') ?? null;
const recuo = (p) => todos(filho(p, 'w:pPr') ?? { filhos: [] }, 'w:ind')[0]?.attrs['w:left'] ?? null;
const tabelas = (md) => corpo(md).filter((b) => b.nome === 'w:tbl');
const linhasDe = (tabela) => filhos(tabela).filter((f) => f.nome === 'w:tr');
const celulas = (linha) => filhos(linha).filter((f) => f.nome === 'w:tc');

test('U3b-02a: #, ## and ### are Heading1 to Heading3; #### is a common paragraph in bold', () => {
  const [h1, h2, h3, h4, comum] = paragrafos('# Um\n## Dois\n### Três\n#### Quatro\nComum');
  assert.deepEqual([h1, h2, h3, h4, comum].map(estilo), ['Heading1', 'Heading2', 'Heading3', null, null]);
  assert.deepEqual([h1, h2, h3].map(textoDe), ['Um', 'Dois', 'Três']);
  assert.deepEqual(pedacos(h4), [['Quatro', true, false]]);
  assert.deepEqual(pedacos(comum), [['Comum', false, false]]);
});

test('U3b-02a: a title keeps the letters as written (upper case is formatting)', () => {
  assert.equal(textoDe(paragrafos('# I. Abertura')[0]), 'I. Abertura');
  assert.equal(textoDe(paragrafos('#SemEspaço')[0]), '#SemEspaço');
});

test('U3b-02b: numbers written by the author stay as text, in order, without numPr', () => {
  const ps = paragrafos('1. um\n2. dois\n\nUm parágrafo.\n\n3. três');
  assert.deepEqual(ps.map(textoDe), ['1. um', '2. dois', 'Um parágrafo.', '3. três']);
  assert.ok(ps.every((p) => !tem(p, 'w:numPr') && recuo(p) === null));
  assert.deepEqual(textos('6.1. Texto\n§ 1º Texto'), ['6.1. Texto', '§ 1º Texto']);
});

test('U3b-02b: one paragraph per line; an empty line makes no paragraph', () => {
  assert.deepEqual(textos('Linha um.\nLinha dois.\n\n\n\nLinha três.\n'), ['Linha um.', 'Linha dois.', 'Linha três.']);
});

test('U3b-02c: - and * are list items of level 0, without the sign; indented, level 1', () => {
  const [a, b, sub, alinea] = paragrafos('- item um\n* item dois\n  - sub\n  a) alínea');
  assert.deepEqual([a, b, sub].map((p) => [textoDe(p), nivel(p), val(p, 'w:numId')]), [['item um', '0', '1'], ['item dois', '0', '1'], ['sub', '1', '1']]);
  assert.deepEqual([textoDe(alinea), tem(alinea, 'w:numPr'), recuo(alinea)], ['a) alínea', false, '425']);
  assert.equal(nivel(paragrafos('\t- com tabulação')[0]), '1');
});

test('U3b-02c: numbering.xml defines the list in use, with the bullet and 0,75 cm per level', () => {
  const numeracao = xmlDe(gerar('- item').entradas, 'word/numbering.xml');
  const niveis = todos(numeracao, 'w:lvl');
  assert.deepEqual(niveis.map((l) => [l.attrs['w:ilvl'], val(l, 'w:numFmt'), val(l, 'w:lvlText'), val(l, 'w:ind', 'w:left')]), [['0', 'bullet', '•', '425'], ['1', 'bullet', '•', '850']]);
  assert.equal(todos(numeracao, 'w:num')[0].attrs['w:numId'], '1');
});

test('U3b-02d: **b** is bold, *i* is italic, ***x*** is both, with __ and _ too', () => {
  assert.deepEqual(pedacos(paragrafos('a **b** c')[0]), [['a ', false, false], ['b', true, false], [' c', false, false]]);
  assert.deepEqual(pedacos(paragrafos('*i*')[0]), [['i', false, true]]);
  assert.deepEqual(pedacos(paragrafos('***x*** __n__ _m_')[0]), [['x', true, true], [' ', false, false], ['n', true, false], [' ', false, false], ['m', false, true]]);
  assert.deepEqual(pedacos(paragrafos('**negrito com *itálico* dentro**.')[0]), [['negrito com ', true, false], ['itálico', true, true], [' dentro', true, false], ['.', false, false]]);
});

test('U3b-02d: names with _, products with * and e-mails stay as written, without italic', () => {
  for (const igual of ['nome_do_arquivo', '2 * 3 * 4', 'ana_maria@exemplo.org', 'https://exemplo.org/_a_/b_c_d', 'a * b* c', 'sem**par', 'arquivo_final_ pronto', '5*3* fim', 'a_b_']) {
    assert.deepEqual(pedacos(paragrafos(igual)[0]), [[igual, false, false]]);
  }
  assert.deepEqual(pedacos(paragrafos('\\*x\\* e \\_y\\_')[0]), [['*x* e _y_', false, false]]);
});

test('U3b-02e: [texto](url) becomes "texto (url)", as text, with no external relationship', () => {
  const md = 'Leia o [edital](https://exemplo.org/?a=1&b=2). [https://exemplo.org](https://exemplo.org)';
  const { entradas, avisos } = gerar(md);
  assert.deepEqual(textos(md), ['Leia o edital (https://exemplo.org/?a=1&b=2). https://exemplo.org']);
  assert.deepEqual(avisos, []);
  for (const e of entradas) assert.doesNotMatch(Buffer.from(e.bytes).toString('utf8'), /TargetMode|hyperlink/, e.nome);
});

test('U3b-02e: an image stays as text, with a warning that says how many', () => {
  const md = 'Antes.\n![logo](logo.png)\nDepois ![a](b.png) e ![c](d.png).';
  assert.deepEqual(textos(md), ['Antes.', '![logo](logo.png)', 'Depois ![a](b.png) e ![c](d.png).']);
  assert.deepEqual(gerar(md).avisos, ['3 imagens não incluídas: o Word não leva imagem no texto.']);
  assert.deepEqual(gerar('![logo](logo.png)').avisos, ['1 imagem não incluída: o Word não leva imagem no texto.']);
});

test('U3b-02h: a table has the first row in bold over F0F0F0, CCCCCC borders, cantSplit and equal columns', () => {
  const md = '| Item | Valor | Obs |\n|---|---:|:--|\n| **Taxa** | R$ 10 | mensal |\n| Multa | R$ 2 |\n| a \\| b | | *fim* |\n';
  const [tabela] = tabelas(md);
  const linhas = linhasDe(tabela);
  assert.deepEqual(linhas.map((l) => celulas(l).map(textoDe)), [['Item', 'Valor', 'Obs'], ['Taxa', 'R$ 10', 'mensal'], ['Multa', 'R$ 2', ''], ['a | b', '', 'fim']]);
  assert.ok(linhas.every((l) => tem(filho(l, 'w:trPr'), 'w:cantSplit')));
  assert.ok(celulas(linhas[0]).every((c) => val(c, 'w:shd', 'w:fill') === 'F0F0F0' && todos(c, 'w:r').every((r) => tem(r, 'w:b'))));
  assert.ok(linhas.slice(1).every((l) => celulas(l).every((c) => !tem(c, 'w:shd'))));
  assert.deepEqual(pedacos(celulas(linhas[1])[0]), [['Taxa', true, false]]);
  assert.deepEqual(pedacos(celulas(linhas[3])[2]), [['fim', false, true]]);
  const bordas = filhos(todos(tabela, 'w:tblBorders')[0]);
  assert.deepEqual(bordas.map((b) => [b.nome, b.attrs['w:val'], b.attrs['w:color']]), ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((l) => [`w:${l}`, 'single', 'CCCCCC']));
  const colunas = todos(tabela, 'w:gridCol').map((g) => Number(g.attrs['w:w']));
  assert.deepEqual(colunas, [3023, 3023, 3023]);
  assert.equal(val(tabela, 'w:tblW', 'w:w'), '9069');
  assert.ok(celulas(linhas[2]).every((c) => val(c, 'w:tcW', 'w:w') === '3023' && val(c, 'w:jc') === 'left' && val(c, 'w:spacing', 'w:after') === '0'));
});

test('U3b-02h: the longest row gives the number of columns; the others are completed', () => {
  const [tabela] = tabelas('| A | B |\n|---|---|\n| 1 | 2 | 3 |\n| 4 |\n');
  assert.deepEqual(linhasDe(tabela).map((l) => celulas(l).map(textoDe)), [['A', 'B', ''], ['1', '2', '3'], ['4', '', '']]);
  assert.equal(todos(tabela, 'w:gridCol').length, 3);
});

test('U3b-02h: lines with bars and no separator line stay as text', () => {
  assert.deepEqual(tabelas('a | b\nc | d\n'), []);
  assert.deepEqual(textos('a | b\nc | d\n'), ['a | b', 'c | d']);
  assert.deepEqual(textos('a | b\n---\nc'), ['a | b', '', 'c']);
});

test('U3b-02h: a --- line in the middle of the text is an empty paragraph with a bottom border, no break', () => {
  for (const regua of ['---', '***', '___']) {
    const [antes, linha, depois] = paragrafos(`Antes.\n\n${regua}\n\nDepois.`);
    assert.deepEqual([textoDe(antes), textoDe(linha), textoDe(depois)], ['Antes.', '', 'Depois.']);
    const borda = filhos(todos(linha, 'w:pBdr')[0]);
    assert.deepEqual(borda.map((b) => [b.nome, b.attrs['w:val'], b.attrs['w:color']]), [['w:bottom', 'single', 'AAAAAA']]);
    assert.ok(!tem(linha, 'w:pageBreakBefore') && !tem(linha, 'w:br'));
  }
});

test('U3b-02i: &, <, >, quotes, accents and emoji are read back from the Word as written', () => {
  const linha = 'A & B, 1 < 2 > 0, "aspas", \'apóstrofo\', ação, 🙂 &amp; ]]> <w:t>';
  assert.deepEqual(textos(linha), [linha]);
  assert.deepEqual(gerar(linha).avisos, []);
});

test('U3b-02i: U+000B and U+000C disappear and the warning counts 2; a lone surrogate too', () => {
  const md = `a${String.fromCharCode(0x0b)}b${String.fromCharCode(0x0c)}c`;
  assert.deepEqual(textos(md), ['abc']);
  assert.deepEqual(gerar(md).avisos, ['2 caracteres inválidos removidos.']);
  const solta = `x${String.fromCharCode(0xd83d)}y${String.fromCharCode(0xfffe)}`;
  assert.deepEqual(textos(solta), ['xy']);
  assert.deepEqual(gerar(`${solta}\n![i](i.png)`).avisos, ['1 imagem não incluída: o Word não leva imagem no texto.', '2 caracteres inválidos removidos.']);
  assert.deepEqual(gerar(`z${String.fromCharCode(0x01)}`).avisos, ['1 caractere inválido removido.']);
});

test('U3b-02i: a tab in the middle of the line is a w:tab', () => {
  const [p] = paragrafos('Coluna A\tColuna B');
  assert.equal(textoDe(p), 'Coluna A\tColuna B');
  assert.deepEqual(todos(p, 'w:r').flatMap((r) => filhos(r).map((f) => f.nome)), ['w:t', 'w:tab', 'w:t']);
});

test('U3b-02k: a frontmatter with a key and an indented continuation is not in the document', () => {
  const md = '---\ntitulo: Ata de março\nresumo: primeira linha\n  segunda linha\n\n---\n# Seção\nTexto.';
  assert.deepEqual(textos(md), ['Seção', 'Texto.']);
});

test('U3b-02k: a text that starts with ---, a # and a paragraph keeps both (it is a rule, not a frontmatter)', () => {
  const ps = paragrafos('---\n# Seção\nTexto.');
  assert.deepEqual(ps.map(textoDe), ['', 'Seção', 'Texto.']);
  assert.ok(tem(ps[0], 'w:pBdr'));
  assert.deepEqual(textos('---\n# Seção\nTexto.\n---\nFim.'), ['', 'Seção', 'Texto.', '', 'Fim.']);
});
