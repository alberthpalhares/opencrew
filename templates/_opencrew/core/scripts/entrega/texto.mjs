// Texto da entrega: o que sai do markdown num arquivo para colar, o que é bloco de serviço e as
// seções de rótulo de um corpo. As expressões rodam linha a linha, sobre texto do usuário.
// Spec: fase-u3a-entrega-por-canal.md, regra 6, citada pela fatia 1 (repositório do OpenCrew).
import { rotuloDe } from '../verificar/secoes.mjs';
import { semBom } from '../verificar/leitura.mjs';

/** Sem o BOM e com LF. */
export const emLf = (texto) => semBom(texto).replace(/\r\n?/g, '\n');

/** Texto em markdown que vai para um arquivo: aparado, com uma quebra de linha no fim. */
export function fecharMd(texto) {
  const aparado = texto.trim();
  return aparado ? `${aparado}\n` : '';
}

/** Texto para colar: sem espaço no fim das linhas, sem linhas em branco seguidas, aparado. */
export const fechar = (texto) => fecharMd(texto.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n'));

/** Sem os comentários HTML (`<!-- … -->`); o que não fecha fica como está. */
export function semComentarios(texto) {
  let saida = '';
  let i = 0;
  for (;;) {
    const abre = texto.indexOf('<!--', i);
    const fecha = abre < 0 ? -1 : texto.indexOf('-->', abre + 4);
    if (fecha < 0) return saida + texto.slice(i);
    saida += texto.slice(i, abre);
    i = fecha + 3;
  }
}

/** Rótulo de bloco de serviço: termina em `NOTES`, `NOTE` ou `CHECKLIST`, ou é `FORMAT`. */
export const ehServico = (rotulo) => rotulo === 'FORMAT' || /(?:^|\s)(?:NOTES?|CHECKLIST)$/.test(rotulo);

/**
 * Corpo sem os blocos de serviço: os comentários HTML e as seções de rótulo de serviço, cada uma
 * até o próximo rótulo. As outras linhas de rótulo ficam.
 */
export function semServico(corpo) {
  const linhas = [];
  let fora = false;
  for (const linha of semComentarios(corpo).split('\n')) {
    const rotulo = rotuloDe(linha);
    if (rotulo) fora = ehServico(rotulo);
    if (!fora) linhas.push(linha);
  }
  return linhas.join('\n');
}

/** As seções de rótulo de um corpo, na ordem: `[{ rotulo, texto }]`; antes do primeiro, `rotulo` null. */
export function secoesDeRotulo(corpo) {
  const secoes = [{ rotulo: null, linhas: [] }];
  for (const linha of corpo.split('\n')) {
    const rotulo = rotuloDe(linha);
    if (rotulo) secoes.push({ rotulo, linhas: [] });
    else secoes.at(-1).linhas.push(linha);
  }
  return secoes.map((s) => ({ rotulo: s.rotulo, texto: s.linhas.join('\n').trim() }));
}

// O que nunca perde marcador: URL, e-mail, @usuário e #hashtag. Fica guardado enquanto a linha é
// limpa e volta depois, igual.
const PROTEGIDO = /(?:https?:\/\/|www\.|wa\.me\/)[^\s*]+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+|(?<![\p{L}\p{N}_])[@#][\p{L}\p{N}_]+/gu;
const [ABRE, FECHA] = [String.fromCharCode(0xe000), String.fromCharCode(0xe001)];
const GUARDADO = new RegExp(`${ABRE}(\\d+)${FECHA}`, 'g');
const LINK = /\[([^\]\n]+)\]\(\s*([^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;
// O marcador só sai em par e colado ao texto que marca; nunca no meio de palavra.
const NEGRITO = /\*\*(?=[^\s*])([^\n]+?)(?<=[^\s*])\*\*/g;
const MARCADORES = [
  NEGRITO,
  /(?<![\p{L}\p{N}_])__(?=[^\s_])([^\n]+?)(?<=[^\s_])__(?![\p{L}\p{N}_])/gu,
  /(?<![\p{L}\p{N}*])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![\p{L}\p{N}*])/gu,
  /(?<![\p{L}\p{N}_])_(?=[^\s_])([^_\n]+?)(?<=[^\s_])_(?![\p{L}\p{N}_])/gu,
];

/** `[texto](url)` vira `texto: url` (ou só a URL); negrito e itálico saem. No WhatsApp, `**x**` vira `*x*`. */
function limparLinha(linha, whatsapp) {
  const guardados = [];
  const comLinks = linha.replace(LINK, (_, texto, url) => (texto.trim() === url ? url : `${texto}: ${url}`));
  const mascarada = comLinks.replace(PROTEGIDO, (achado) => `${ABRE}${guardados.push(achado) - 1}${FECHA}`);
  const limpa = whatsapp ? mascarada.replace(NEGRITO, '*$1*') : MARCADORES.reduce((t, rx) => t.replace(rx, '$1'), mascarada);
  return limpa.replace(GUARDADO, (_, n) => guardados[Number(n)]);
}

/**
 * Texto pronto para colar: as mesmas palavras, na mesma ordem, sem as linhas de rótulo, sem a
 * linha `---`, sem os `#` de título e sem a sintaxe de negrito, itálico e link. Marcador de lista
 * e citação ficam.
 * @param {string} texto
 * @param {{ whatsapp?: boolean }} [opcoes] no WhatsApp, `*x*` e `_x_` ficam e `**x**` vira `*x*`
 */
export function paraColar(texto, { whatsapp = false } = {}) {
  const linhas = emLf(texto).split('\n').filter((linha) => linha.trim() !== '---' && !rotuloDe(linha));
  return fechar(linhas.map((linha) => limparLinha(linha.replace(/^#{1,6}\s+/, ''), whatsapp)).join('\n'));
}
