// Móveis da Ala de Copa e Lazer e adereços de mão dos bonecos: mesa de sinuca, rack com TV e
// console de vídeo game (mais telas animadas), pufes, bancada da copa, xícara, taco, controle e livro.
// Spec: fase-e5-lazer-e-convivencia.md (repositório do OpenCrew).
import { CORES, TINTAS, matriz } from './sprites.js';

const inteiras = (metades) => metades.map((metade) => metade + [...metade].reverse().join(''));

/** Mesa de sinuca 52×26: borda de madeira, 6 caçapas, feltro verde, bolas coloridas e tacos. */
export const SINUCA = matriz(
  {
    o: CORES.tinta, M: CORES.madeiraLuz, m: CORES.madeiraMedia, D: CORES.madeiraEscura,
    f: CORES.folha, F: CORES.folhaEscura, w: CORES.branco, r: CORES.vermelho,
    y: CORES.ambar, b: CORES.ceu, k: CORES.cinzaEscuro,
  },
  [
    '.oooooooooooooooooooooooooooooooooooooooooooooooooo.',
    'oMMooooooooooooooooooooooMMooooooooooooooooooooooMMo',
    'oMoMMMMMMMMMMMMMMMMMMMMMMooMMMMMMMMMMMMMMMMMMMMMMoMo',
    'ooMFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFMoo',
    'oMFFffffffffffffffffffffffffffffffffffffffffffffFFMo',
    'oMffffffffffffffffffffffffffffffffffffffffffffffffMo',
    'oMffffffffffffffffffffffffffffffffffrfffffffffffffMo',
    'oMfffffffffffffffffffffffffffffffffryfffffffffffffMo',
    'oMfffffffffffffffffffffffffffffffykbbfffffffffffffMo',
    'oMfffffffffwwffffffffffffffffffffffrybffffffffffffMo',
    'oMfffffffffwwfffffffffffffffffffffffryffffffffffffMo',
    'oMfffffffffffffffffffffffffffffffffffbffffffffffffMo',
    'oMffffffffffffffffffffffffffffffffffffffffffffffffMo',
    'oMffffffffffffffffffffffffffffffffffffffffffffffffMo',
    'oMffMMMMMMMMMMMMMMMMMMMMMooMMMMMMMMMMMMMMMMMMMMMffMo',
    'oMoMFFFFFFFFFFFFFFFFFFFFFooFFFFFFFFFFFFFFFFFFFFFMoMo',
    'oMMooooooooooooooooooooooMMooooooooooooooooooooooMMo',
    'ooommmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmooo',
    'ooommmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmooo',
    'oooooooooooooooooooooooooooooooooooooooooooooooooooo',
    '.oDDDo........................................oDDDo.',
    '.oD.Do........................................oD.Do.',
    '.oDDDo........................................oDDDo.',
    '.oDDDo........................................oDDDo.',
    '.ooooo........................................ooooo.',
    '....................................................',
  ],
);

/** Rack com TV grande e console de vídeo game (32×20; com tela desligada no fundo). */
export const VIDEOGAME = matriz(
  {
    o: CORES.tinta, k: CORES.cinzaEscuro, g: CORES.cinzaClaro, s: CORES.telaApagada,
    m: CORES.madeiraMedia, M: CORES.madeiraLuz, D: CORES.madeiraEscura, v: CORES.verde,
    r: CORES.vermelho,
  },
  inteiras([
    '..oooooooooooooo',
    '.okkkkkkkkkkkkkk',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.oksssssssssssss',
    '.okkkkkkkkkkkkkk',
    '..ooooookkoooooo',
    'oooooooooooooooo',
    'oMMMMMMMMMMMMMMo',
    'ommmookkkkkgooom',
    'ommmokkvggrkooom',
    'oDDDDDDDDDDDDDDo',
    'oooooooooooooooo',
    '.oDo............',
    '.ooo............',
  ]),
);

/** Posição da tela da TV dentro de `VIDEOGAME`. */
export const TV_EM = Object.freeze({ x: 3, y: 2 });

const PALETA_JOGO = Object.freeze({
  a: CORES.telaAcesa, c: CORES.ceu, C: CORES.ceuClaro, v: CORES.verde,
  y: CORES.ambar, r: CORES.vermelho, w: CORES.branco,
});

/** Quatro quadros animados na TV do vídeo game enquanto há gente jogando. */
export const TELAS_DE_JOGO = Object.freeze([
  ['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'a..y....................aa', 'a.yyy.......ww......r...aa', 'a..y.......wwww....rrr..aa', 'a.......................aa', 'a....ccc................aa', 'a....ccc......y.........aa', 'avvvvvvvvvvvvvvvvvvvvvvvva'],
  ['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'a..y.........ww.........aa', 'a.yyy.......wwww...r....aa', 'a..y..............rrr...aa', 'a.......................aa', 'a.......ccc.............aa', 'a.......ccc...y.........aa', 'avvvvvvvvvvvvvvvvvvvvvvvva'],
  ['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'a..y.............ww.....aa', 'a.yyy...........wwwwr...aa', 'a..y...............rrr..aa', 'a..........ccc..........aa', 'a..........ccc..........aa', 'a.............y.........aa', 'avvvvvvvvvvvvvvvvvvvvvvvva'],
  ['aaaaaaaaaaaaaaaaaaaaaaaaaa', 'a..y.....ww.............aa', 'a.yyy...wwww.......r....aa', 'a..y..............rrr...aa', 'a......ccc..............aa', 'a......ccc....y.........aa', 'a.............C.........aa', 'avvvvvvvvvvvvvvvvvvvvvvvva'],
].map((linhas) => matriz(PALETA_JOGO, linhas)));

/** Pufe macio 14×10 em frente ao vídeo game. */
export const PUFE = matriz(
  { o: CORES.tinta, r: CORES.vermelho, y: CORES.ambar, D: CORES.madeiraEscura },
  inteiras([
    '..ooooo',
    '.orrrrr',
    'oryyyyy',
    'orrrrrr',
    'orrrrrr',
    'orrrrrr',
    'orrrrrr',
    '.oDDDDD',
    '..ooooo',
    '.......',
  ]),
);

/** Aparador / bancada da copa 28×18 com bule, xícaras e pote. */
export const BANCADA_COPA = matriz(
  {
    o: CORES.tinta, M: CORES.madeiraLuz, m: CORES.madeiraMedia, D: CORES.madeiraEscura,
    w: CORES.branco, g: CORES.cinzaClaro, k: CORES.cinzaEscuro, r: CORES.vermelho,
    b: CORES.ceu,
  },
  inteiras([
    '..............',
    '..ooo...oo....',
    '.okko..owbo...',
    '.okgko.owwo...',
    '.ooooo.oooo...',
    'oooooooooooooo',
    'oMMMMMMMMMMMMM',
    'oMMMMMMMMMMMMM',
    'ommmmmmmmmmmmm',
    'oooooooooooooo',
    'oDDDDDoDDDDDDo',
    'oD.g.DoD.g.D.o',
    'oDDDDDoDDDDDDo',
    'oDDDDDDDDDDDDD',
    'oooooooooooooo',
    '.oDo..........',
    '.ooo..........',
    '..............',
  ]),
);

const PALETA_ADERECO = Object.freeze({ '.': null, ...TINTAS });

/** Caneca de café na mão do boneco. */
export const XICARA = Object.freeze({
  de: 9,
  paleta: PALETA_ADERECO,
  linhas: Object.freeze([
    '............ooo.',
    '...........owbwo',
    '...........owwwo',
    '...........owwgo',
    '...........oooo.',
  ]),
});

/** Taco de sinuca segurado na diagonal pelo boneco. */
export const TACO = Object.freeze({
  de: 5,
  paleta: PALETA_ADERECO,
  linhas: Object.freeze([
    '..............w.',
    '..............o.',
    '.............bo.',
    '.............bo.',
    '............obo.',
    '............ob..',
    '............oo..',
    '...........ob...',
    '...........bo...',
    '..........oo....',
  ]),
});

/** Controle (gamepad) segurado pelo boneco na estação de vídeo game. */
export const CONTROLE = Object.freeze({
  de: 9,
  paleta: PALETA_ADERECO,
  linhas: Object.freeze([
    '...........oooo.',
    '..........oPgPwo',
    '..........oPPPPo',
    '..........oPoPo.',
    '...........o.o..',
  ]),
});

/** Livro aberto nas mãos do boneco sentado no lounge. */
export const LIVRO = Object.freeze({
  de: 10,
  paleta: PALETA_ADERECO,
  linhas: Object.freeze([
    '....oooooooo....',
    '...bowwgwgwob...',
    '...bowwgwgwob...',
    '...bowwwgwwob...',
    '....oooooooo....',
  ]),
});

export const ADERECOS = Object.freeze({ xicara: XICARA, taco: TACO, controle: CONTROLE, livro: LIVRO });
