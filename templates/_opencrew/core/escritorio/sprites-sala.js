// A sala do escritório, em matrizes de pixels: a parede do fundo, o piso em ladrilho de dois tons
// e o que enfeita a parede (janela, relógio, planta). Quem diz onde cada desenho vai é `cena.js`.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16 (repositório do OpenCrew).
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

/** Janela de duas folhas: um reflexo no vidro da esquerda, uma nuvem no da direita. */
export const JANELA = matriz({ o: CORES.tinta, w: CORES.branco, b: CORES.ceu, B: CORES.ceuClaro }, [
  'oooooooooooooooooooooooo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owbbbbbBBbbwwbbbbbbbbbwo',
  'owbbbbBBbbbwwbbbbwwbbbwo',
  'owbbbBBbbbbwwbbwwwwwbbwo',
  'owbbBBbbbbbwwbbbbbbbbbwo',
  'owbBBbbbbbbwwbbbbbbbbbwo',
  'owbbbbbbbbbwwbbbbbbbbbwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'oooooooooooooooooooooooo',
]);

/** Relógio de parede, parado nas três horas: nada na sala se mexe sem um agente trabalhando. */
export const RELOGIO = matriz({ o: CORES.tinta, w: CORES.branco }, [
  '..ooooo..',
  '.owwwwwo.',
  'owwwowwwo',
  'owwwowwwo',
  'owwwooowo',
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
