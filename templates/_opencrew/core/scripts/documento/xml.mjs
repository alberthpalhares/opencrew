// Tijolos do XML do Word: texto seguro (escape e caracteres proibidos), medidas, e as propriedades
// de parágrafo e de letra com os filhos sempre na ordem que o formato exige.
// Spec: fase-u3b-documento-word.md, regras 3 (g) e 4 (repositório do OpenCrew).

export const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const DECLARACAO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
/** Um nível de recuo: 0,75 cm. */
export const RECUO = 425;

/** Centímetros → twips (1/20 de ponto). */
export const twips = (cm) => Math.round(cm * 566.93);
/** Pontos → meios-pontos (a unidade do tamanho de letra). */
export const meios = (pt) => Math.round(pt * 2);

const ehAlta = (c) => c >= 0xd800 && c <= 0xdbff;
const ehBaixa = (c) => c >= 0xdc00 && c <= 0xdfff;
/** Caractere que o XML 1.0 não aceita (as metades de par substituto são vistas à parte). */
const proibido = (c) => (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0xfffe || c === 0xffff || ehAlta(c) || ehBaixa(c);

/**
 * Tira o que não pode estar num XML 1.0: controles (menos tabulação e quebras de linha), U+FFFE,
 * U+FFFF e metade solta de par substituto.
 * @returns {{ texto: string, removidos: number }}
 */
export function limpar(texto) {
  let saida = '';
  let removidos = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    if (ehAlta(c) && ehBaixa(texto.charCodeAt(i + 1))) saida += texto[i] + texto[++i];
    else if (proibido(c)) removidos++;
    else saida += texto[i];
  }
  return { texto: saida, removidos };
}

/** Texto para dentro do XML, em conteúdo ou em atributo. */
export const esc = (texto) => limpar(String(texto)).texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attrs = (o) => Object.entries(o).map(([nome, valor]) => ` w:${nome}="${valor}"`).join('');

/** Uma borda simples: `borda('top', { sz: 4, cor: 'CCCCCC' })`. `sz` em oitavos de ponto. */
export const borda = (lado, { sz = 4, cor, espaco = 0 }) => `<w:${lado} w:val="single" w:sz="${sz}" w:space="${espaco}" w:color="${cor}"/>`;

/**
 * Propriedades do parágrafo, na ordem do formato: estilo, keepNext, quebra de página antes, lista,
 * bordas, tabulações, espaço, recuo, alinhamento e nível de tópico.
 * `espaco`: `{ before, after, line, lineRule }` · `recuo`: `{ left, right, hanging }` (twips).
 */
export function pPr(o = {}) {
  const partes = [
    o.estilo && `<w:pStyle w:val="${o.estilo}"/>`,
    o.keepNext && '<w:keepNext/>',
    o.quebra && '<w:pageBreakBefore/>',
    o.lista != null && `<w:numPr><w:ilvl w:val="${o.lista}"/><w:numId w:val="1"/></w:numPr>`,
    o.bordas && `<w:pBdr>${o.bordas}</w:pBdr>`,
    o.tabs && `<w:tabs>${o.tabs}</w:tabs>`,
    o.espaco && `<w:spacing${attrs(o.espaco)}/>`,
    o.recuo && `<w:ind${attrs(o.recuo)}/>`,
    o.jc && `<w:jc w:val="${o.jc}"/>`,
    o.topico != null && `<w:outlineLvl w:val="${o.topico}"/>`,
  ].filter(Boolean);
  return partes.length ? `<w:pPr>${partes.join('')}</w:pPr>` : '';
}

/** Propriedades da letra, na ordem do formato. `sz` em pontos; `fonte` já validada. */
export function rPr(o = {}) {
  const partes = [
    o.fonte && `<w:rFonts w:ascii="${esc(o.fonte)}" w:hAnsi="${esc(o.fonte)}" w:cs="${esc(o.fonte)}"/>`,
    o.b && '<w:b/>',
    o.i && '<w:i/>',
    o.caps && '<w:caps/>',
    o.cor && `<w:color w:val="${o.cor}"/>`,
    o.sz && `<w:sz w:val="${meios(o.sz)}"/><w:szCs w:val="${meios(o.sz)}"/>`,
    o.idioma && `<w:lang w:val="${o.idioma}"/>`,
  ].filter(Boolean);
  return partes.length ? `<w:rPr>${partes.join('')}</w:rPr>` : '';
}

/** O texto de um trecho: `w:t` (sempre com `xml:space="preserve"`) e `w:tab` em cada tabulação. */
const conteudo = (texto) => texto.split('\t').map((parte) => (parte ? `<w:t xml:space="preserve">${esc(parte)}</w:t>` : '')).join('<w:tab/>');

/** Um trecho de texto com a sua letra. Texto vazio não gera trecho. */
export const trecho = (texto, letra = {}) => (texto ? `<w:r>${rPr(letra)}${conteudo(texto)}</w:r>` : '');

/**
 * Um parágrafo a partir dos pedaços lidos da linha (`[{ texto, b, i }]`).
 * @param {object} props o que `pPr` recebe
 * @param {object} [letra] letra comum a todos os pedaços (soma com o negrito e o itálico de cada um)
 */
export function paragrafo(props, pedacos = [], letra = {}) {
  const trechos = pedacos.map((p) => trecho(p.texto, { ...letra, b: letra.b || p.b, i: letra.i || p.i })).join('');
  return `<w:p>${pPr(props)}${trechos}</w:p>`;
}
