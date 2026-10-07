// As tabelas do corpo: a tabela de dados (bordas finas, primeira linha em negrito sobre cinza,
// colunas iguais) e o bloco de assinaturas (sem bordas, duas por linha, a ímpar no centro).
// Nenhuma linha parte entre páginas. Toda célula termina em parágrafo.
// Spec: fase-u3b-documento-word.md, §4 e regra 3 (repositório do OpenCrew).
import { RECUO, borda, paragrafo, twips } from './xml.mjs';

const LADOS = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
const BORDAS = `<w:tblBorders>${LADOS.map((lado) => borda(lado, { cor: 'CCCCCC' })).join('')}</w:tblBorders>`;
const MARGENS = '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>';
export const SEM_MARGENS = '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>';
const FUNDO = '<w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/>';
const NA_CELULA = { espaco: { after: 0 }, jc: 'left' };
/** Espaço em branco para a assinatura à mão, acima da linha: 36 pt. */
const ANTES_DA_LINHA = 720;
const RECUO_DA_SOZINHA = twips(4);

/**
 * A moldura de uma tabela: propriedades, grade e linhas, nessa ordem.
 * @param {number[]} colunas largura de cada coluna, em twips
 * @param {{ bordas?: string, margens?: string }} partes o que vai em `tblPr`, além da largura e do leiaute fixo
 * @param {string[]} linhas o XML das células de cada linha
 */
export function tabela(colunas, { bordas = '', margens = '' }, linhas) {
  const largura = colunas.reduce((a, b) => a + b, 0);
  const grade = colunas.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  const corpo = linhas.map((l) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${l}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${largura}" w:type="dxa"/>${bordas}<w:tblLayout w:type="fixed"/>${margens}</w:tblPr><w:tblGrid>${grade}</w:tblGrid>${corpo}</w:tbl>`;
}

/** Uma célula: largura, o que mais vier em `tcPr` (na ordem do formato) e os parágrafos. */
export const celula = (largura, propriedades, paragrafos) => `<w:tc><w:tcPr><w:tcW w:w="${largura}" w:type="dxa"/>${propriedades}</w:tcPr>${paragrafos}</w:tc>`;

/** Tabela de dados, na largura da área de texto, com colunas iguais. */
export function tabelaDeDados(bloco, larguraDoTexto) {
  const coluna = Math.floor(larguraDoTexto / bloco.linhas[0].length);
  const linhas = bloco.linhas.map((linha, n) => linha.map((pedacos) => celula(coluna, n === 0 ? FUNDO : '', paragrafo(NA_CELULA, pedacos, { b: n === 0 }))).join(''));
  return tabela(bloco.linhas[0].map(() => coluna), { bordas: BORDAS, margens: MARGENS }, linhas);
}

/** Uma assinatura: a linha (borda de cima), o nome em negrito e caixa alta por formatação, e o cargo. */
function assinatura({ nome, cargo }, recuo) {
  const daLinha = { bordas: borda('top', { sz: 6, cor: '000000', espaco: 1 }), espaco: { before: ANTES_DA_LINHA, after: 0 }, recuo: { left: recuo, right: recuo }, jc: 'center' };
  const doNome = paragrafo(daLinha, [{ texto: nome }], { b: true, caps: true });
  return cargo ? `${doNome}${paragrafo({ espaco: { after: 0 }, jc: 'center' }, [{ texto: cargo }])}` : doNome;
}

/** Bloco de assinaturas: duas por linha, na ordem escrita; a que sobra ocupa a linha inteira. */
export function tabelaDeAssinaturas(bloco, larguraDoTexto) {
  const coluna = Math.floor(larguraDoTexto / 2);
  const linhas = [];
  for (let i = 0; i < bloco.pessoas.length; i += 2) {
    const par = bloco.pessoas.slice(i, i + 2);
    if (par.length === 2) linhas.push(par.map((p) => celula(coluna, '', assinatura(p, RECUO))).join(''));
    else linhas.push(celula(coluna * 2, '<w:gridSpan w:val="2"/>', assinatura(par[0], RECUO_DA_SOZINHA)));
  }
  return tabela([coluna, coluna], { margens: SEM_MARGENS }, linhas);
}
