// O pacote do documento Word: junta as partes, os tipos de conteúdo e as relações, na ordem
// fixa, e fecha o zip. Não toca o disco: recebe o texto, o perfil já lido e o logotipo em bytes.
// Spec: fase-u3b-documento-word.md, regras 2 a 4 e 9 (repositório do OpenCrew).
import { larguraDoTexto, montarCorpo } from './corpo.mjs';
import { montarAjustes, montarEstilos, montarNumeracao } from './estilos.mjs';
import { lerMarkdown } from './markdown.mjs';
import { PADRAO } from './perfil.mjs';
import { lerPng } from './png.mjs';
import { montarCabecalho, montarRodape, temCabecalho, temRodape } from './timbre.mjs';
import { DECLARACAO, NS_R } from './xml.mjs';
import { zipar } from './zip.mjs';

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
const NS_PACOTE = 'http://schemas.openxmlformats.org/package/2006';
/** As partes de `word/` que têm tipo próprio e são alvo de uma relação do documento, na ordem do zip. */
const PARTES = [['styles', 'styles'], ['settings', 'settings'], ['numbering', 'numbering'], ['header1', 'header'], ['footer1', 'footer']];

const plural = (n, um, varios) => (n === 1 ? um : varios.replace('{n}', n));
/** Os avisos de conversão, na ordem da spec; cada um diz a quantidade. */
function avisosDe(c) {
  return [
    c.imagens && plural(c.imagens, '1 imagem não incluída: o Word não leva imagem no texto.', '{n} imagens não incluídas: o Word não leva imagem no texto.'),
    c.desconhecidas && plural(c.desconhecidas, '1 linha com marcação desconhecida (`:::`) ficou como texto.', '{n} linhas com marcação desconhecida (`:::`) ficaram como texto.'),
    c.semFim && plural(c.semFim, 'Bloco de assinaturas sem a linha `:::` no fim: ficou como texto.', '{n} blocos de assinaturas sem a linha `:::` no fim: ficaram como texto.'),
    c.invalidos && plural(c.invalidos, '1 caractere inválido removido.', '{n} caracteres inválidos removidos.'),
  ].filter(Boolean);
}

const relacao = (id, tipo, alvo) => `<Relationship Id="${id}" Type="${NS_R}/${tipo}" Target="${alvo}"/>`;
const relacoes = (lista) => `${DECLARACAO}<Relationships xmlns="${NS_PACOTE}/relationships">${lista.join('')}</Relationships>`;

function tiposDeConteudo(nomes) {
  const padroes = [['rels', 'application/vnd.openxmlformats-package.relationships+xml'], ['xml', 'application/xml'], ['png', 'image/png']];
  const proprios = [['document', 'document.main'], ...PARTES].filter(([nome]) => nomes.includes(nome));
  const porExtensao = padroes.map(([extensao, tipo]) => `<Default Extension="${extensao}" ContentType="${tipo}"/>`).join('');
  const porParte = proprios.map(([nome, tipo]) => `<Override PartName="/word/${nome}.xml" ContentType="${WORD}.${tipo}+xml"/>`).join('');
  return `${DECLARACAO}<Types xmlns="${NS_PACOTE}/content-types">${porExtensao}${porParte}</Types>`;
}

/** O que existe além das partes fixas, e o `rId` de cada parte ligada ao documento. */
function planejar(perfil, imagem) {
  const existe = { styles: true, settings: true, numbering: true, header1: temCabecalho(perfil, imagem), footer1: temRodape(perfil) };
  const ligadas = PARTES.filter(([nome]) => existe[nome]).map(([nome, tipo], i) => ({ nome, tipo, id: `rId${i + 1}` }));
  const idDe = (nome) => ligadas.find((l) => l.nome === nome)?.id;
  return { ligadas, referencias: { cabecalho: idDe('header1'), rodape: idDe('footer1') } };
}

/** As partes do zip, na ordem da regra 2. */
function montarPartes(blocos, perfil, logotipo) {
  const imagem = logotipo ? lerPng(logotipo) : null;
  const { ligadas, referencias } = planejar(perfil, imagem);
  const largura = larguraDoTexto(perfil);
  const partes = [
    ['[Content_Types].xml', tiposDeConteudo(['document', ...ligadas.map((l) => l.nome)])],
    ['_rels/.rels', relacoes([relacao('rId1', 'officeDocument', 'word/document.xml')])],
    ['word/document.xml', montarCorpo(blocos, perfil, referencias)],
    ['word/_rels/document.xml.rels', relacoes(ligadas.map((l) => relacao(l.id, l.tipo, `${l.nome}.xml`)))],
    ['word/styles.xml', montarEstilos(perfil)],
    ['word/settings.xml', montarAjustes()],
    ['word/numbering.xml', montarNumeracao()],
  ];
  if (referencias.cabecalho) partes.push(['word/header1.xml', montarCabecalho(perfil, largura, imagem, 'rId1')]);
  if (imagem) partes.push(['word/_rels/header1.xml.rels', relacoes([relacao('rId1', 'image', 'media/logo.png')])], ['word/media/logo.png', Buffer.from(logotipo)]);
  if (referencias.rodape) partes.push(['word/footer1.xml', montarRodape(perfil, largura)]);
  return partes.map(([nome, bytes]) => ({ nome, bytes }));
}

/**
 * Gera o documento Word na memória. O mesmo texto, o mesmo perfil e o mesmo logotipo dão os
 * mesmos bytes.
 * @param {object} entrada
 * @param {string} entrada.texto o markdown (CRLF ou LF, com ou sem BOM)
 * @param {object} [entrada.perfil] o perfil já lido (`lerPerfil`); sem ele, valem os padrões
 * @param {Uint8Array} [entrada.logotipo] os bytes do PNG do cabeçalho; sem eles, não há logotipo
 * @returns {{ bytes: Buffer, avisos: string[], vazio: boolean }} `vazio`: o texto não tem nada a
 *   converter (só frontmatter, ou só linhas vazias)
 */
export function gerarDocx({ texto, perfil, logotipo }) {
  const { blocos, avisos } = lerMarkdown(texto);
  const completo = { ...PADRAO, ...perfil };
  return { bytes: zipar(montarPartes(blocos, completo, logotipo)), avisos: avisosDe(avisos), vazio: blocos.length === 0 };
}
