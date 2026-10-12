// A sala do escritório, em matrizes de pixels: a parede do fundo, o piso em ladrilho de dois tons
// e o que enfeita a parede (a janela de cada período do dia, o relógio, a planta). Quem diz onde
// cada desenho vai é `modelo-moveis.js`; quem pinta, `cena-sala.js`.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16, e fase-e3-conversa-e-entrega.md, regra 19
// (repositório do OpenCrew).
import { CORES, matriz } from './sprites.js';

/**
 * A parede, numa faixa de 8 px que se repete de lado a lado: sanca de madeira, papel de parede
 * listrado e lambri. A altura é a da parede no modelo (`TOPO`).
 */
export const PAREDE = matriz({ m: CORES.madeiraMedia, d: CORES.madeiraEscura, p: CORES.parede, P: CORES.paredeSombra, h: CORES.madeiraLuz }, [
  'mmmmmmmm',
  'dddddddd',
  'PPPPPPPP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'pppppppP',
  'hhhhhhhh',
  'mmmmmmmm',
  'mmmmmmmm',
  'dddddddd',
]);

const LADRILHO_LINHAS = Object.freeze([
  'jjjjjjjjjjjjjjjj',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
  'jaaaaaaaaaaaaaaa',
]);

/** O ladrilho do piso, com a junta em cima e à esquerda; o claro e o escuro se alternam em xadrez. */
export const LADRILHO = matriz({ j: CORES.junta, a: CORES.pisoClaro }, LADRILHO_LINHAS);
export const LADRILHO_ESCURO = matriz({ j: CORES.junta, a: CORES.pisoEscuro }, LADRILHO_LINHAS);

// O caixilho da janela é o mesmo o dia inteiro; o que muda é o céu das duas folhas (9×6 cada).
const folha = (esquerda, i, direita) => `ow${esquerda[i]}ww${direita[i]}wo`;
const janela = (paleta, esquerda, direita) => matriz({ o: CORES.tinta, w: CORES.branco, ...paleta }, [
  'oooooooooooooooooooooooo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  ...esquerda.map((_, i) => folha(esquerda, i, direita)),
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'oooooooooooooooooooooooo',
]);
const REFLEXO = ['bbbbbBBbb', 'bbbbBBbbb', 'bbbBBbbbb', 'bbBBbbbbb', 'bBBbbbbbb', 'bbbbbbbbb'];

/**
 * A janela de duas folhas, com o céu de cada período (regra 19 da E3): de manhã, claro, com o sol
 * baixo; de dia, azul, com uma nuvem; ao entardecer, alaranjado; à noite, escuro, com lua e estrelas.
 */
export const JANELAS = Object.freeze({
  manha: janela({ b: CORES.ceuClaro, B: CORES.branco, y: CORES.luz, Y: CORES.ambar }, REFLEXO, [
    'bbbbbbbbb', 'bbBBBbbbb', 'bbbbbbbbb', 'bbbbbyybb', 'bbbbyYYyb', 'bbbyYYYYy',
  ]),
  dia: janela({ b: CORES.ceu, B: CORES.ceuClaro }, REFLEXO, [
    'bbbbbbbbb', 'bbbbwwbbb', 'bbwwwwwbb', 'bbbbbbbbb', 'bbbbbbbbb', 'bbbbbbbbb',
  ]),
  entardecer: janela({ b: CORES.ambar, B: CORES.luz, r: CORES.vermelho, y: CORES.luz }, [
    'bbbbbBBbb', 'bbbbBBbbb', 'bbbBBbbbb', 'bbBBbbbbb', 'rrrrrrrrr', 'rrrrrrrrr',
  ], [
    'bbbbbbbbb', 'bbyyyybbb', 'bbbbbbbbb', 'bbbbbyybb', 'rrrryyyyr', 'rrrrrrrrr',
  ]),
  noite: janela({ b: CORES.telaApagada, s: CORES.cinzaClaro }, [
    'bbsbbbbbb', 'bbbbbbbsb', 'bbbbbbbbb', 'bsbbbbbbb', 'bbbbbsbbb', 'bbbbbbbbb',
  ], [
    'bbbbwwbbb', 'bbbwwbbbb', 'bbbwwbbbs', 'bbbbwwbbb', 'bsbbbbbbb', 'bbbbbbbbb',
  ]),
});

/**
 * O mostrador do relógio de parede. Os ponteiros não estão no desenho: a cena os pinta por cima,
 * na hora de quem olha (regra 19 da E3).
 */
export const RELOGIO = matriz({ o: CORES.tinta, w: CORES.branco }, [
  '..ooooo..',
  '.owwwwwo.',
  'owwwwwwwo',
  'owwwwwwwo',
  'owwwwwwwo',
  'owwwwwwwo',
  'owwwwwwwo',
  '.owwwwwo.',
  '..ooooo..',
]);

/** Planta em vaso de barro, para o chão junto à parede. */
export const PLANTA = matriz({ o: CORES.tinta, g: CORES.folha, G: CORES.folhaEscura, t: CORES.madeiraEscura, v: CORES.madeiraMedia, V: CORES.madeiraEscura }, [
  '...ooooo...',
  '..oggggGo..',
  '.oggGggggo.',
  'oggggggGggo',
  'ogGggggggGo',
  'oggggGggggo',
  '.ogGgggGgo.',
  '..oggggGo..',
  '...oGGGo...',
  '....oto....',
  '..ooooooo..',
  '..ovvvvvo..',
  '..ovvvvVo..',
  '...ovvVo...',
  '...ovvVo...',
  '...ooooo...',
]);
