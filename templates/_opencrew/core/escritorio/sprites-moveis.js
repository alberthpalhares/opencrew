// Os móveis de chão do escritório, em matrizes de pixels: sofá, poltrona, mesa baixa, bebedouro,
// máquina de café, abajur de chão (apagado e aceso), a planta alta, os tapetes e o halo de luz do
// abajur. Quem diz onde cada um vai é `modelo-moveis.js`; quem pinta, `cena-sala.js`.
// Spec: fase-e3-conversa-e-entrega.md, §2B e regras 15 e 19 (repositório do OpenCrew).
import { CORES, matriz } from './sprites.js';

/** O sofá, a poltrona e a mesa baixa são simétricos: cada linha é escrita pela metade. */
const inteiras = (metades) => metades.map((metade) => metade + [...metade].reverse().join(''));

/** Sofá de dois lugares, de frente: encosto, braços, as duas almofadas e os pés. */
export const SOFA = matriz({ o: CORES.tinta, b: CORES.ceu, B: CORES.ceuClaro, k: CORES.cinzaEscuro, D: CORES.madeiraEscura }, inteiras([
  '..oooooooooooooooooo',
  '.oBBBBBBBBBBBBBBBBBB',
  '.obbbbbbbbbbbbbbbbbb',
  '.obbbbbbbbbbbbbbbbbb',
  '.obbbbbbbbbbbbbbbbbb',
  'ooobbbbbbbbbbbbbbbbb',
  'oBBobbbbbbbbbbbbbbbb',
  'obbobbbbbbbbbbbbbbbb',
  'obbooooooooooooooooo',
  'obboBBBBBBBBBBBBBBBo',
  'obbobbbbbbbbbbbbbbbo',
  'obbobbbbbbbbbbbbbbbo',
  'obbooooooooooooooooo',
  'obbkkkkkkkkkkkkkkkkk',
  'okkkkkkkkkkkkkkkkkkk',
  'oooooooooooooooooooo',
  '.oDo................',
  '.ooo................',
]));

/** Poltrona, de frente. */
export const POLTRONA = matriz({ o: CORES.tinta, y: CORES.ambar, Y: CORES.luz, m: CORES.madeiraMedia, D: CORES.madeiraEscura }, inteiras([
  '..ooooooo',
  '.oYYYYYYY',
  '.oyyyyyyy',
  '.oyyyyyyy',
  'oooyyyyyy',
  'oYYoyyyyy',
  'oyyoooooo',
  'oyyoYYYYY',
  'oyyoyyyyy',
  'oyyoyyyyy',
  'oyyoooooo',
  'oyymmmmmm',
  'ommmmmmmm',
  'ooooooooo',
  '.oDo.....',
  '.ooo.....',
]));

/** Mesa baixa, de centro, de madeira mais escura que a das mesas de trabalho. */
export const MESA_BAIXA = matriz({ o: CORES.tinta, t: CORES.madeiraLuz, T: CORES.madeiraMedia, F: CORES.madeiraEscura, D: CORES.madeiraEscura }, inteiras([
  '.ooooooooooo',
  'ottttttttttt',
  'oTTTTTTTTTTT',
  'oTTTTTTTTTTT',
  'oFFFFFFFFFFF',
  'oooooooooooo',
  '.oDo........',
  '.oDo........',
  '.oDo........',
  '.ooo........',
]));

/** Bebedouro: o galão de água sobre a base, com as duas torneiras. */
export const BEBEDOURO = matriz({ o: CORES.tinta, b: CORES.ceu, B: CORES.ceuClaro, w: CORES.branco, g: CORES.cinzaClaro, k: CORES.cinzaEscuro, r: CORES.vermelho }, [
  '...oooo...', '..oBBbbo..', '..oBbbbo..', '..oBbbbo..', '..oBbbbo..', '..obbbbo..', '...obbo...',
  '.oooooooo.', '.owwwwwgo.', '.owwwwwgo.', '.owrwbwgo.', '.owwwwwgo.', '.owkkkwgo.', '.owwwwwgo.',
  '.owwwwwgo.', '.owwwwwgo.', '.owwwwwgo.', '.owwwwwgo.', '.owwwwwgo.', '.oggggggo.', '.oooooooo.',
  '..o....o..',
]);

/** Máquina de café, com a xícara, sobre um balcão de duas portas. */
export const CAFE = matriz({
  o: CORES.tinta, k: CORES.cinzaEscuro, P: CORES.telaApagada, r: CORES.vermelho, g: CORES.cinzaClaro, w: CORES.branco,
  t: CORES.madeiraLuz, F: CORES.madeiraMedia, D: CORES.madeiraEscura,
}, [
  '..oooooooooooo..', '..okkkkkkkkkko..', '..okrkkkkgggko..', '..okkkkkkkkkko..', '..okPPPPPPPPko..', '..okPPPggPPPko..',
  '..okPPwwwwPPko..', '..okPPwwwwPPko..', '..okkkkkkkkkko..', 'oooooooooooooooo', 'otttttttttttttto', 'oFFFFFFFFFFFFFFo',
  'oooooooooooooooo', '.oDDDDDDoDDDDDo.', '.oDDDDDDoDDDDDo.', '.oDDDDFDoDFDDDo.', '.oDDDDDDoDDDDDo.', '.oDDDDDDoDDDDDo.',
  '.oDDDDDDoDDDDDo.', '.oDDDDDDoDDDDDo.', '.oooooooooooooo.', '.oo..........oo.',
]);

const ABAJUR_LINHAS = Object.freeze([
  '..ooooo..', '.oSsssso.', '.oSsssso.', 'oSsssssso', 'oSsssssso', 'ooooooooo',
  ...Array(13).fill('....o....'),
  '..ooooo..', '.okkkkko.', '.ooooooo.',
]);

/** Abajur de chão: a cúpula, a haste e a base. De dia fica apagado; à noite, aceso. */
export const ABAJUR = matriz({ o: CORES.tinta, s: CORES.cinzaClaro, S: CORES.branco, k: CORES.cinzaEscuro }, ABAJUR_LINHAS);
export const ABAJUR_ACESO = matriz({ o: CORES.tinta, s: CORES.luz, S: CORES.branco, k: CORES.cinzaEscuro }, ABAJUR_LINHAS);

/** A segunda planta: folhas compridas, num vaso branco. */
export const PLANTA_ALTA = matriz({ o: CORES.tinta, g: CORES.folha, G: CORES.folhaEscura, w: CORES.branco, c: CORES.cinzaClaro }, [
  '....o......', '...ogo..o..', '...ogo.ogo.', '.o.oGo.ogo.', 'ogoogo.oGo.', 'ogoogoogGo.', 'oGoogoogo..',
  'oGoogGogo..', 'ogoogGoGo..', '.ogogGogo..', '.ogoggogo..', '..oggggo...', '.ooooooooo.', '.owwwwwwco.',
  '.owwwwwwco.', '..owwwwco..', '..owwwwco..', '..owwwwco..', '..oooooo...',
]);

const PALETAS_DE_TAPETE = Object.freeze([
  { f: CORES.madeiraEscura, b: CORES.vermelho, c: CORES.ambar, a: CORES.vermelho, d: CORES.madeiraLuz },
  { f: CORES.tinta, b: CORES.telaAcesa, c: CORES.ambar, a: CORES.folhaEscura, d: CORES.folha },
]);
// O miolo de cada padrão: losangos no primeiro, xadrez no segundo.
const MIOLOS = Object.freeze([
  (x, y) => ((x + y) % 8 < 2 || (x - y + 800) % 8 < 2 ? 'd' : 'a'),
  (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 'd' : 'a'),
]);
const TAPETES = new Map();

function pontoDoTapete(padrao, x, y, largura, altura) {
  const margem = Math.min(x, y, largura - 1 - x, altura - 1 - y);
  const canto = (x === 0 || x === largura - 1) && (y === 0 || y === altura - 1);
  if (margem === 0) return canto ? '.' : 'f';
  if (margem === 3) return 'c';
  return margem < 3 ? 'b' : MIOLOS[padrao](x, y);
}

/**
 * Um tapete do tamanho pedido, em matriz de pixels: a orla, a barra, o filete e o miolo.
 * @param {number} padrao 0 (vermelho, de losangos) ou 1 (verde, xadrez); outro valor vale como 0
 * @param {number} largura em pixels lógicos
 * @param {number} altura em pixels lógicos
 */
export function tapete(padrao, largura, altura) {
  const qual = padrao === 1 ? 1 : 0;
  const chave = `${qual}|${largura}|${altura}`;
  if (!TAPETES.has(chave)) {
    const linha = (y) => Array.from({ length: largura }, (_, x) => pontoDoTapete(qual, x, y, largura, altura)).join('');
    TAPETES.set(chave, matriz(PALETAS_DE_TAPETE[qual], Array.from({ length: altura }, (_, y) => linha(y))));
  }
  return TAPETES.get(chave);
}

const HALOS = new Map();

/** A luz do abajur aceso: uma elipse cheia, de `largura` × `altura`, que a cena pinta translúcida. */
export function halo(largura, altura) {
  const chave = `${largura}|${altura}`;
  if (!HALOS.has(chave)) {
    const fora = (x, y) => ((2 * x + 1 - largura) / largura) ** 2 + ((2 * y + 1 - altura) / altura) ** 2 > 1;
    const linha = (y) => Array.from({ length: largura }, (_, x) => (fora(x, y) ? '.' : 'l')).join('');
    HALOS.set(chave, matriz({ l: CORES.luz }, Array.from({ length: altura }, (_, y) => linha(y))));
  }
  return HALOS.get(chave);
}
