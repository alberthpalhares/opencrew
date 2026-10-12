// O corpo do boneco, do ombro ao sapato (linhas 9 a 15), um por molde, e o que cada pose muda nele.
// O feminino tem decote, vestido e pernas à mostra; o masculino, camisa, calça e sapato largo. Os
// dois têm os braços nas mesmas colunas, e por isso o braço levantado e o papel servem aos dois.
// Cada camada diz em que linha começa (`de`); nela, o ponto deixa ver o que está por baixo.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16, e fase-e2-personagens-do-escritorio.md, regra 1
// (repositório do OpenCrew).
import { TINTAS, matriz } from './sprites.js';

const camada = (de, linhas) => Object.freeze({ de, ...matriz(TINTAS, linhas) });

/** O corpo parado de cada molde. */
export const CORPOS = Object.freeze({
  feminino: camada(9, [
    '..oocccsscccoo..',
    '..oCccccccccCo..',
    '..osCccccccCso..',
    '...occcccccco...',
    '...oCCCCCCCCo...',
    '...ooosoosooo...',
    '....obboobbo....',
  ]),
  masculino: camada(9, [
    '..ooccccccccoo..',
    '..oCccccccccCo..',
    '..osccccccccso..',
    '...oCCCCCCCCo...',
    '....oppppppo....',
    '....oppoopPo....',
    '...obbboobbbo...',
  ]),
});

/**
 * As poses que trocam linhas inteiras do corpo: o número da linha (no boneco de 16) e o texto
 * novo. `digitar` mexe as mãos e `andar`, as pernas; cada uma tem dois quadros.
 */
export const TROCAS = Object.freeze({
  feminino: Object.freeze({
    'digitar-a': { 11: '..oCCccccccCso..', 12: '...osscccccco...' },
    'digitar-b': { 11: '..osCccccccCCo..', 12: '...occccccsso...' },
    'andar-a': { 14: '...ooosoobboo...', 15: '....obbo.oo.....' },
    'andar-b': { 14: '...oobboosooo...', 15: '.....oo.obbo....' },
  }),
  masculino: Object.freeze({
    'digitar-a': { 11: '..oCccccccccso..', 12: '...ossCCCCCCo...' },
    'digitar-b': { 11: '..osccccccccCo..', 12: '...oCCCCCCsso...' },
    'andar-a': { 14: '....oppoobbo....', 15: '...obbbo.oo.....' },
    'andar-b': { 14: '....obboopPo....', 15: '.....oo.obbbo...' },
  }),
});

/**
 * O braço direito levantado (o de quem espera; os dois, espelhados, são a festa): sobe pelas
 * colunas 13 a 15, ao lado da cabeça, e tira a mão de baixo. Na coluna 13 só põe contorno.
 */
export const BRACO = camada(0, [
  '..............o.',
  '.............oso',
  '.............oso',
  '.............oso',
  '.............oCo',
  '.............oCo',
  '.............oCo',
  '.............oCo',
  '.............oCo',
  '............cCCo',
  '............c.o.',
  '............C...',
]);

/** O papel na mão direita de quem entrega: soma-se às pernas de quem anda. */
export const PAPEL = camada(8, [
  '.............oo.',
  '.............wwo',
  '.............wgo',
  '.............wwo',
  '............oooo',
]);
