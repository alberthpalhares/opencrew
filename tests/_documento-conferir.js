// Shared helpers of tests/documento*.test.js (not a test file itself — no .test.js suffix).
// specs/fase-u3b-documento-word.md, rule 3: the invariants (a) to (g) of a generated package, and
// the two word extractors of U3b-10 (from the .docx and from the markdown). Nothing here imports
// the generator.
import path from 'node:path';
import { lerXml, filhos, filho, todos, textoDe } from './_documento.js';

const W = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const TIPO = {
  'word/document.xml': [`${W}.document.main+xml`, `${REL}/officeDocument`],
  'word/styles.xml': [`${W}.styles+xml`, `${REL}/styles`],
  'word/settings.xml': [`${W}.settings+xml`, `${REL}/settings`],
  'word/numbering.xml': [`${W}.numbering+xml`, `${REL}/numbering`],
  'word/header1.xml': [`${W}.header+xml`, `${REL}/header`],
  'word/footer1.xml': [`${W}.footer+xml`, `${REL}/footer`],
  'word/media/logo.png': [null, `${REL}/image`],
};
const POR_EXTENSAO = { rels: 'application/vnd.openxmlformats-package.relationships+xml', xml: 'application/xml', png: 'image/png' };
const BORDAS = ['w:top', 'w:left', 'w:bottom', 'w:right', 'w:insideH', 'w:insideV'];
/** Rule 3 (g): the children each element may have, in the order of the format. */
const ORDEM = {
  'w:sectPr': ['w:headerReference', 'w:footerReference', 'w:pgSz', 'w:pgMar'],
  'w:pPr': ['w:pStyle', 'w:keepNext', 'w:pageBreakBefore', 'w:numPr', 'w:pBdr', 'w:tabs', 'w:spacing', 'w:ind', 'w:jc', 'w:outlineLvl'],
  'w:rPr': ['w:rFonts', 'w:b', 'w:i', 'w:caps', 'w:color', 'w:sz', 'w:szCs', 'w:lang'],
  'w:tbl': ['w:tblPr', 'w:tblGrid', 'w:tr'],
  'w:tblPr': ['w:tblW', 'w:jc', 'w:tblBorders', 'w:tblLayout', 'w:tblCellMar'],
  'w:trPr': ['w:cantSplit'],
  'w:tcPr': ['w:tcW', 'w:gridSpan', 'w:tcBorders', 'w:shd', 'w:vAlign'],
  'w:pBdr': BORDAS, 'w:tblBorders': BORDAS, 'w:tcBorders': BORDAS,
  'w:tblCellMar': ['w:top', 'w:left', 'w:bottom', 'w:right'],
  'w:styles': ['w:docDefaults', 'w:style'],
  'w:numbering': ['w:abstractNum', 'w:num'],
};

const relsDe = (nome) => path.posix.join(path.posix.dirname(nome), '_rels', `${path.posix.basename(nome)}.rels`);
const ehXml = (nome) => /\.(xml|rels)$/.test(nome);
const arvore = (no) => [no, ...filhos(no).flatMap(arvore)];

/** (f) Every XML part is UTF-8 and well formed. Returns the parsed parts by name. */
function lerPartes(entradas, problemas) {
  const partes = {};
  for (const e of entradas.filter((x) => ehXml(x.nome))) {
    try {
      partes[e.nome] = lerXml(new TextDecoder('utf-8', { fatal: true }).decode(e.bytes));
    } catch (erro) {
      problemas.push(`(f) ${e.nome}: ${erro.message}`);
    }
  }
  return partes;
}

/** (a) Every part has a content type: by extension, and by part for the six parts of Word. */
function tipos(entradas, partes, problemas) {
  const raiz = partes['[Content_Types].xml'];
  const padrao = Object.fromEntries(todos(raiz, 'Default').map((d) => [d.attrs.Extension, d.attrs.ContentType]));
  const proprio = Object.fromEntries(todos(raiz, 'Override').map((o) => [o.attrs.PartName, o.attrs.ContentType]));
  for (const { nome } of entradas.filter((e) => e.nome !== '[Content_Types].xml')) {
    const extensao = nome.split('.').pop();
    const esperado = TIPO[nome]?.[0];
    if (esperado ? proprio[`/${nome}`] !== esperado : padrao[extensao] !== POR_EXTENSAO[extensao] || !padrao[extensao]) problemas.push(`(a) ${nome}: no content type`);
  }
  for (const parte of Object.keys(proprio)) if (!entradas.some((e) => `/${e.nome}` === parte)) problemas.push(`(a) ${parte}: content type of a part that is not there`);
}

/** The relationships of a part: `{ rId1: { tipo, alvo } }`, with the target as a package name. */
function relacoes(partes, nome) {
  const raiz = partes[nome === '' ? '_rels/.rels' : relsDe(nome)];
  if (!raiz) return {};
  const base = nome === '' ? '' : path.posix.dirname(nome);
  const lista = todos(raiz, 'Relationship').map((r) => [r.attrs.Id, { tipo: r.attrs.Type, alvo: path.posix.join(base, r.attrs.Target), externa: 'TargetMode' in r.attrs }]);
  if (new Set(lista.map(([id]) => id)).size !== lista.length) lista.push(['', { repetido: true }]);
  return Object.fromEntries(lista);
}

/** (b) The root points to the document; every part of word/ is a target; every r:id has a relationship. */
function ligacoes(entradas, partes, problemas) {
  const alvos = new Map();
  for (const dono of ['', ...entradas.map((e) => e.nome).filter((n) => ehXml(n) && !n.includes('_rels/'))]) {
    const rels = relacoes(partes, dono);
    for (const [id, r] of Object.entries(rels)) {
      if (r.repetido || r.externa) problemas.push(`(b) ${dono || 'package'}: ${r.externa ? 'external relationship' : 'relationship Id twice'}`);
      else if (!entradas.some((e) => e.nome === r.alvo)) problemas.push(`(b) ${dono || 'package'}: ${id} points to ${r.alvo}, which is not there`);
      else alvos.set(r.alvo, r.tipo);
    }
    const usados = dono && partes[dono] ? arvore(partes[dono]).flatMap((n) => [n.attrs['r:id'], n.attrs['r:embed']]).filter(Boolean) : [];
    for (const id of usados) if (!rels[id]) problemas.push(`(b) ${dono}: ${id} has no relationship`);
  }
  for (const { nome } of entradas.filter((e) => e.nome.startsWith('word/') && !e.nome.includes('_rels/'))) {
    if (alvos.get(nome) !== TIPO[nome]?.[1]) problemas.push(`(b) ${nome}: no relationship of its type points to it`);
  }
}

/** (c) Every style and every numId in use is defined. */
function definicoes(partes, problemas) {
  const estilos = new Set(todos(partes['word/styles.xml'] ?? { filhos: [] }, 'w:style').map((s) => s.attrs['w:styleId']));
  const listas = new Set(filhos(partes['word/numbering.xml'] ?? { filhos: [] }).filter((n) => n.nome === 'w:num').map((n) => n.attrs['w:numId']));
  for (const [nome, raiz] of Object.entries(partes).filter(([n]) => /^word\/(document|header1|footer1)\.xml$/.test(n))) {
    for (const s of todos(raiz, 'w:pStyle')) if (!estilos.has(s.attrs['w:val'])) problemas.push(`(c) ${nome}: style ${s.attrs['w:val']} is not defined`);
    for (const n of todos(raiz, 'w:numId')) if (!listas.has(n.attrs['w:val'])) problemas.push(`(c) ${nome}: numId ${n.attrs['w:val']} is not defined`);
  }
}

/** (d), (e) and (g), element by element. */
function estrutura(nome, raiz, problemas) {
  for (const no of arvore(raiz)) {
    const nomes = filhos(no).map((f) => f.nome);
    if (no.nome === 'w:tc' && nomes.at(-1) !== 'w:p') problemas.push(`(d) ${nome}: a cell does not end in a paragraph`);
    if (no.nome === 'w:tbl' && !nomes.includes('w:tblGrid')) problemas.push(`(d) ${nome}: a table without w:tblGrid`);
    nomes.forEach((n, i) => {
      if (n === 'w:tbl' && nomes[i + 1] !== 'w:p') problemas.push(`(d) ${nome}: a table is not followed by a paragraph`);
    });
    if (no.nome === 'w:t' && no.attrs['xml:space'] !== 'preserve') problemas.push(`(e) ${nome}: w:t without xml:space="preserve"`);
    if (no.nome === 'w:body' && (nomes.at(-1) !== 'w:sectPr' || nomes.filter((n) => n === 'w:sectPr').length !== 1)) problemas.push(`(g) ${nome}: w:sectPr is not the last child of w:body`);
    const ordem = ORDEM[no.nome];
    if (!ordem) continue;
    const lugares = nomes.map((n) => ordem.indexOf(n));
    if (lugares.includes(-1)) problemas.push(`(g) ${nome}: <${no.nome}> has a child the order table does not list: ${nomes[lugares.indexOf(-1)]}`);
    else if (lugares.some((l, i) => i > 0 && l < lugares[i - 1])) problemas.push(`(g) ${nome}: children of <${no.nome}> out of order: ${nomes.join(', ')}`);
  }
}

/**
 * The invariants of rule 3 over the entries of a package (`[{ nome, bytes }]`).
 * @returns {string[]} one line per problem; [] when the package is sound
 */
export function conferirPacote(entradas) {
  const problemas = [];
  const partes = lerPartes(entradas, problemas);
  if (!partes['[Content_Types].xml']) return [...problemas, '(a) [Content_Types].xml is missing'];
  if (entradas[0].nome !== '[Content_Types].xml') problemas.push('(a) [Content_Types].xml is not the first entry');
  tipos(entradas, partes, problemas);
  ligacoes(entradas, partes, problemas);
  if (relacoes(partes, '').rId1?.alvo !== 'word/document.xml') problemas.push('(b) _rels/.rels does not point to word/document.xml');
  definicoes(partes, problemas);
  for (const [nome, raiz] of Object.entries(partes)) estrutura(nome, raiz, problemas);
  return problemas;
}

/** The same package with one part rewritten (to prove that the checks bite). */
export const trocar = (entradas, nome, fn) => entradas.map((e) => (e.nome === nome ? { ...e, bytes: Buffer.from(fn(Buffer.from(e.bytes).toString('utf8'))) } : e));

/** U3b-10: the words of `word/document.xml` — the `w:t`, in order, a space at the end of each paragraph. */
export function palavrasDoDocx(entradas) {
  const documento = lerXml(Buffer.from(entradas.find((e) => e.nome === 'word/document.xml').bytes).toString('utf8'));
  return todos(filho(documento, 'w:body'), 'w:p').map((p) => `${textoDe(p)} `).join('').split(/\s+/).filter(Boolean);
}

const ENFASE = /(?<![\p{L}\p{N}*_\\])(\*\*\*|___|\*\*|__|\*|_)(?=\S)(.+?)(?<=\S)\1(?![\p{L}\p{N}*_])/gu;
const REGUA = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const SEPARADORA = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const TITULO = /^:::\s*(t[ií]tulo|subt[ií]tulo)\s+(?=\S)/i;
const SOZINHA = /^:::\s*(quebra-de-p[aá]gina|assinaturas)\s*$/i;

function semFrontmatter(linhas) {
  if (linhas[0] !== '---') return linhas;
  const fim = linhas.indexOf('---', 1);
  const meio = fim > 0 ? linhas.slice(1, fim).filter((l) => l.trim()) : [];
  return fim > 0 && meio.every((l) => /^[\w-]+:(\s|$)/.test(l) || /^\s+\S/.test(l)) ? linhas.slice(fim + 1) : linhas;
}

/** The text of one markdown line, without the signs the generator turns into formatting. */
function semSinais(linha) {
  let t = linha.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*]\s+/, '');
  t = t.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (tudo, imagem, texto, url) => (imagem ? tudo : texto === url ? url : `${texto} (${url})`));
  for (let i = 0; i < 3; i++) t = t.replace(ENFASE, '$2');
  return t.replace(/\\([*_])/g, '$1');
}

/**
 * U3b-10: the words of the markdown, by an extractor that does not import the generator. It drops
 * the frontmatter, title, list, bold and italic signs, table bars and separator lines, rules and
 * the names of the `:::` markers, and turns `[t](u)` into `t (u)`.
 */
export function palavrasDoMarkdown(markdown) {
  const semBom = markdown.charCodeAt(0) === 0xfeff ? markdown.slice(1) : markdown;
  const linhas = semFrontmatter(semBom.replace(/\r\n?/g, '\n').split('\n'));
  const saida = [];
  let assinando = false;
  let naTabela = false;
  linhas.forEach((linha, i) => {
    naTabela = linha.includes('|') && (naTabela || SEPARADORA.test(linhas[i + 1] ?? '') && (linhas[i + 1] ?? '').includes('|'));
    if (assinando) {
      assinando = linha.trim() !== ':::';
      saida.push(assinando ? linha.replace(/\|/g, ' ') : '');
    } else if (SOZINHA.test(linha)) assinando = /assinaturas/i.test(linha);
    else if (TITULO.test(linha)) saida.push(semSinais(linha.replace(TITULO, '')));
    else if (REGUA.test(linha) || (naTabela && SEPARADORA.test(linha))) saida.push('');
    else saida.push(semSinais(naTabela ? linha.split('\\|').map((parte) => parte.replace(/\|/g, ' ')).join('|') : linha));
  });
  return saida.join(' ').split(/\s+/).filter(Boolean);
}
