// As partes fixas do documento: estilos (`word/styles.xml`), a lista com marcador
// (`word/numbering.xml`) e os ajustes (`word/settings.xml`). Do perfil só entram a fonte e o
// tamanho do corpo; os outros tamanhos e as cores são os do documento oficial de referência.
// Spec: fase-u3b-documento-word.md, §4 (repositório do OpenCrew).
import { DECLARACAO, NS_W, RECUO, pPr, rPr } from './xml.mjs';

const IDIOMA = 'pt-BR';
const CINZA = '333333';
/** Entrelinha 1,15 (276/240), automática, e 5 pt depois de cada parágrafo. */
const DO_CORPO = { espaco: { after: 100, line: 276, lineRule: 'auto' }, jc: 'both' };

/** Os estilos além do `Normal`: `[id, nome, parágrafo, letra]`. Espaços em vigésimos de ponto. */
const ESTILOS = [
  ['Titulo', 'Título do documento', { espaco: { before: 160, after: 80 }, jc: 'center' }, { b: true, sz: 14 }],
  ['Subtitulo', 'Subtítulo do documento', { espaco: { before: 0, after: 320 }, jc: 'center' }, { i: true, cor: CINZA, sz: 10 }],
  ['Heading1', 'heading 1', { keepNext: true, espaco: { before: 280, after: 80 }, jc: 'left', topico: 0 }, { b: true, caps: true, sz: 12 }],
  ['Heading2', 'heading 2', { keepNext: true, espaco: { before: 200, after: 60 }, jc: 'left', topico: 1 }, { b: true, sz: 11 }],
  ['Heading3', 'heading 3', { keepNext: true, espaco: { before: 160, after: 40 }, jc: 'left', topico: 2 }, { b: true, i: true, cor: CINZA, sz: 10.5 }],
];

const estilo = ([id, nome, paragrafo, letra]) =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nome}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>${pPr(paragrafo)}${rPr(letra)}</w:style>`;

/** @param {{ fonte: string, tamanho_corpo_pt: number }} perfil */
export function montarEstilos(perfil) {
  const letra = { fonte: perfil.fonte, sz: perfil.tamanho_corpo_pt, idioma: IDIOMA };
  const padroes = `<w:docDefaults><w:rPrDefault>${rPr(letra)}</w:rPrDefault><w:pPrDefault/></w:docDefaults>`;
  const normal = `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>${pPr(DO_CORPO)}${rPr(letra)}</w:style>`;
  return `${DECLARACAO}<w:styles xmlns:w="${NS_W}">${padroes}${normal}${ESTILOS.map(estilo).join('')}</w:styles>`;
}

/** Um nível da lista: marcador `•`, recuo de 0,75 cm por nível. */
const nivel = (n) =>
  `<w:lvl w:ilvl="${n}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>${pPr({ recuo: { left: RECUO * (n + 1), hanging: 283 } })}</w:lvl>`;

/** A lista com marcador, de dois níveis; é o `numId` 1 de todo item de lista. */
export const montarNumeracao = () =>
  `${DECLARACAO}<w:numbering xmlns:w="${NS_W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${nivel(0)}${nivel(1)}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;

/** Modo de compatibilidade 15: o Word não abre o arquivo em "Modo de Compatibilidade". */
export const montarAjustes = () =>
  `${DECLARACAO}<w:settings xmlns:w="${NS_W}"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
