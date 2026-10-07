// O papel timbrado: cabeçalho (`word/header1.xml`: logotipo e até três linhas, com uma linha
// preta embaixo) e rodapé (`word/footer1.xml`: o texto do perfil e "Página X de Y").
// Spec: fase-u3b-documento-word.md, §4 e regra 2 (repositório do OpenCrew).
import { SEM_MARGENS, celula, tabela } from './tabelas.mjs';
import { DECLARACAO, NS_R, NS_W, borda, pPr, paragrafo, rPr, trecho, twips } from './xml.mjs';

const NS_WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
/** Unidades do desenho (EMU) por centímetro. */
const EMU_POR_CM = 360000;
/** Folga entre o logotipo e as linhas do cabeçalho: 0,4 cm. */
const FOLGA = twips(0.4);
const SEM_ESPACO = { espaco: { after: 0 }, jc: 'left' };
const LINHAS = [['cabecalho_1', { b: true, sz: 12 }], ['cabecalho_2', { sz: 10 }], ['cabecalho_3', { cor: '666666', sz: 10 }]];
const DO_RODAPE = { sz: 8.5 };

/** O cabeçalho existe quando há logotipo ou alguma das três linhas. */
export const temCabecalho = (perfil, logotipo) => Boolean(logotipo) || LINHAS.some(([chave]) => perfil[chave]);
/** O rodapé existe quando há texto de rodapé ou número de página. */
export const temRodape = (perfil) => Boolean(perfil.rodape) || perfil.numero_pagina;

/** A imagem, na largura do perfil e na altura proporcional. `rId`: a relação com `media/logo.png`. */
function desenho(perfil, logotipo, rId) {
  const cx = Math.round(perfil.logotipo_largura_cm * EMU_POR_CM);
  const cy = Math.round((cx * logotipo.altura) / logotipo.largura);
  const figura = `<pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`;
  const moldura = `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Logotipo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">${moldura}<a:graphic><a:graphicData uri="${NS_PIC}">${figura}</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

/**
 * @param {object} perfil o perfil completo
 * @param {number} largura a largura da área de texto, em twips
 * @param {{ largura: number, altura: number }|null} logotipo as medidas do PNG, em pontos da imagem
 * @param {string} rId a relação da imagem, em `word/_rels/header1.xml.rels`
 */
export function montarCabecalho(perfil, largura, logotipo, rId) {
  const linhas = LINHAS.filter(([chave]) => perfil[chave]).map(([chave, letra]) => paragrafo(SEM_ESPACO, [{ texto: perfil[chave] }], letra));
  const texto = linhas.join('') || paragrafo(SEM_ESPACO);
  const daImagem = logotipo ? twips(perfil.logotipo_largura_cm) + FOLGA : 0;
  const centro = '<w:vAlign w:val="center"/>';
  const imagem = logotipo ? celula(daImagem, centro, `<w:p>${pPr(SEM_ESPACO)}${desenho(perfil, logotipo, rId)}</w:p>`) : '';
  const colunas = logotipo ? [daImagem, largura - daImagem] : [largura];
  const bordas = `<w:tblBorders>${borda('bottom', { sz: 8, cor: '000000' })}</w:tblBorders>`;
  const quadro = tabela(colunas, { bordas, margens: SEM_MARGENS }, [`${imagem}${celula(colunas.at(-1), centro, texto)}`]);
  const espacos = `xmlns:w="${NS_W}" xmlns:r="${NS_R}" xmlns:wp="${NS_WP}" xmlns:a="${NS_A}" xmlns:pic="${NS_PIC}"`;
  return `${DECLARACAO}<w:hdr ${espacos}>${quadro}${paragrafo(SEM_ESPACO)}</w:hdr>`;
}

/** Um campo do Word (`PAGE`, `NUMPAGES`), com "1" como valor até o Word calcular. */
function campo(instrucao) {
  const marca = (tipo) => `<w:r>${rPr(DO_RODAPE)}<w:fldChar w:fldCharType="${tipo}"/></w:r>`;
  const comando = `<w:r>${rPr(DO_RODAPE)}<w:instrText xml:space="preserve"> ${instrucao} </w:instrText></w:r>`;
  return `${marca('begin')}${comando}${marca('separate')}${trecho('1', DO_RODAPE)}${marca('end')}`;
}

/** @param {object} perfil o perfil completo · @param {number} largura a da área de texto, em twips */
export function montarRodape(perfil, largura) {
  const props = { bordas: borda('top', { cor: 'AAAAAA', espaco: 4 }), tabs: `<w:tab w:val="right" w:pos="${largura}"/>`, espaco: { after: 0 }, jc: 'left' };
  const texto = trecho(perfil.rodape, { ...DO_RODAPE, i: true, cor: '666666' });
  const pagina = perfil.numero_pagina ? `${trecho('\tPágina ', DO_RODAPE)}${campo('PAGE')}${trecho(' de ', DO_RODAPE)}${campo('NUMPAGES')}` : '';
  return `${DECLARACAO}<w:ftr xmlns:w="${NS_W}"><w:p>${pPr(props)}${texto}${pagina}</w:p></w:ftr>`;
}
