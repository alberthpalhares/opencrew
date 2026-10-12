// O que fica encostado na parede do fundo, em matrizes de pixels: a estante de livros, o quadro
// e o quadro branco. Quem diz onde cada um vai é `modelo-moveis.js`; quem pinta, `cena-sala.js`.
// Spec: fase-e3-conversa-e-entrega.md, §2B e regra 15 (repositório do OpenCrew).
import { CORES, matriz } from './sprites.js';

// A estante tem 20 px de largura: a lateral de madeira de cada lado e 16 de prateleira.
const prateleira = (livros) => `om${livros}mo`;
const TABUA = 'ommmmmmmmmmmmmmmmmmo';

/** Estante de livros, de três prateleiras, encostada na parede: vai do alto da parede ao chão. */
export const ESTANTE = matriz({
  o: CORES.tinta, m: CORES.madeiraMedia, D: CORES.madeiraEscura, r: CORES.vermelho, g: CORES.verde, b: CORES.ceu,
  y: CORES.ambar, w: CORES.branco, k: CORES.cinzaEscuro, f: CORES.folha,
}, [
  'oooooooooooooooooooo',
  TABUA,
  prateleira('rDbbDDyDwrrDbDgD'),
  prateleira('rrbbgDyywrrDbbgy'),
  prateleira('rrbbgDyywrrDbbgy'),
  prateleira('rrbbgDyywrrDbbgy'),
  TABUA,
  prateleira('DgDDkkDrDDyDwwDb'),
  prateleira('ggbbkkDrryyDwwgb'),
  prateleira('ggbbkkDrryyDwwgb'),
  prateleira('ggbbkkDrryyDwwgb'),
  TABUA,
  prateleira('ywDDDDDbbDDfDfDD'),
  prateleira('ywwrrDDbbgDDfDDD'),
  prateleira('ywwrrDDbbgDkkkDD'),
  prateleira('ywwrrDDbbgDkkkDD'),
  TABUA,
  'oDDDDDDDDDDDDDDDDDDo',
  'oooooooooooooooooooo',
  'oo................oo',
]);

/** Quadro de parede: uma paisagem com sol, numa moldura de madeira. */
export const QUADRO = matriz({ o: CORES.tinta, D: CORES.madeiraEscura, b: CORES.ceu, y: CORES.ambar, w: CORES.branco, g: CORES.folha }, [
  'ooooooooooooo',
  'oDDDDDDDDDDDo',
  'oDbbbbbbbyyDo',
  'oDbbbbbbbyyDo',
  'oDbbwwbbbbbDo',
  'oDbbbbbgbbbDo',
  'oDggbbgggbbDo',
  'oDgggggggggDo',
  'oDDDDDDDDDDDo',
  'ooooooooooooo',
]);

const lousa = (escrito) => `og${escrito}go`;

/** Quadro branco, com anotações e um gráfico: fica no lugar de uma janela. */
export const QUADRO_BRANCO = matriz({ o: CORES.tinta, g: CORES.cinzaClaro, w: CORES.branco, r: CORES.vermelho, b: CORES.ceu, k: CORES.cinzaEscuro, v: CORES.verde }, [
  'oooooooooooooooooooooooooooo',
  'oggggggggggggggggggggggggggo',
  lousa('wwwwwwwwwwwwwwwwwwwwwwww'),
  lousa('wrrrrrrrwwwwwwwkwwwwwwww'),
  lousa('wwwwwwwwwwwwwwwkwwwwwvww'),
  lousa('wbbbbbbbbbbwwwwkwwwvwvww'),
  lousa('wwwwwwwwwwwwwwwkwvwvwvww'),
  lousa('wbbbbbbwwwwwwwwkkkkkkkkw'),
  lousa('wwwwwwwwwwwwwwwwwwwwwwww'),
  'oggggggggggggggggggggggggggo',
  'oooooooooooooooooooooooooooo',
  '.........okkkkkkkko.........',
]);
