// Os desenhos do escritório são matrizes de pixels escritas como texto: uma string por linha, uma
// letra por pixel e uma paleta (letra → cor). Nenhuma imagem entra no pacote.
// Este módulo traz as cores fixas de toda a cena, o molde do boneco de 16×16 com as trocas de
// linha de cada pose, e a conta que transforma uma matriz nos retângulos que a cena preenche.
// Os irmãos `sprites-sala.js` e `sprites-mesa.js` trazem a sala e os móveis.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16 (repositório do OpenCrew).

/** As cores fixas da cena. A camisa, o cabelo e a pele de cada boneco vêm do modelo. */
export const CORES = Object.freeze({
  tinta: '#1a1c2c',
  branco: '#f4f4ee',
  cinzaClaro: '#c3c8d4',
  cinzaEscuro: '#4a5266',
  pisoClaro: '#9aa5b8',
  pisoEscuro: '#8d98ad',
  junta: '#808ba1',
  parede: '#ead9b5',
  paredeSombra: '#d6c196',
  madeiraLuz: '#dba76a',
  madeira: '#c58a52',
  madeiraMedia: '#a0683f',
  madeiraEscura: '#6f4630',
  ceu: '#7ec4e0',
  ceuClaro: '#bfe6f0',
  folha: '#4c9a52',
  folhaEscura: '#2f6b40',
  telaApagada: '#232838',
  telaAcesa: '#123f4a',
  verde: '#5fd47a',
  ambar: '#f4a73b',
  vermelho: '#e0564c',
});

/**
 * Uma matriz de pixels: `linhas` do mesmo tamanho e a `paleta` com a cor de cada letra. O ponto
 * é sempre o pixel vazio.
 */
export function matriz(paleta, linhas) {
  return Object.freeze({ paleta: Object.freeze({ '.': null, ...paleta }), linhas: Object.freeze(linhas) });
}

/**
 * O molde do boneco: 16×16, de frente, parado. Na paleta, `cabelo`, `pele`, `camisa` e as duas
 * sombras são fendas que `coresDoBoneco` troca pelas cores de cada agente.
 */
export const MOLDE = matriz({
  o: CORES.tinta, h: 'cabelo', s: 'pele', S: 'pele-sombra', c: 'camisa', C: 'camisa-sombra',
  p: CORES.cinzaEscuro, P: CORES.telaApagada, b: CORES.madeiraEscura, w: CORES.branco, g: CORES.cinzaClaro,
}, [
  '....oooooooo....',
  '...ohhhhhhhho...',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhsssssshho..',
  '..ohsssssssSho..',
  '..ossossssosSo..',
  '..osssssssssSo..',
  '...oSSSSSSSSo...',
  '..oCccccccccCo..',
  '..oCccccccccCo..',
  '..osccccccccso..',
  '...oCCCCCCCCo...',
  '....oppppppo....',
  '....oppoopPo....',
  '...obbboobbbo...',
]);

/**
 * As poses são o molde com linhas trocadas: cada troca diz o número da linha e o texto novo.
 * `digitar` e `andar` têm dois quadros; `mao` é o braço levantado de quem espera; `festa`, os
 * dois braços para cima de quem comemora; `papel` é o braço com o papel, que se soma às pernas
 * de quem anda.
 */
export const TROCAS = Object.freeze({
  'digitar-a': { 11: '..oCccccccccso..', 12: '...ossCCCCCCo...' },
  'digitar-b': { 11: '..osccccccccCo..', 12: '...oCCCCCCsso...' },
  'andar-a': { 14: '....oppoobbo....', 15: '...obbbo.oo.....' },
  'andar-b': { 14: '....obboopPo....', 15: '.....oo.obbbo...' },
  mao: {
    0: '....oooooooo.oo.',
    1: '...ohhhhhhhhosso',
    2: '..ohhhhhhhhhhoso',
    3: '..ohhhhhhhhhhoso',
    4: '..ohhsssssshhoCo',
    5: '..ohsssssssShoCo',
    6: '..ossossssosSoCo',
    7: '..osssssssssSoCo',
    8: '...oSSSSSSSSoCCo',
    9: '..oCcccccccccCo.',
    11: '..osccccccccCo..',
  },
  festa: {
    0: '.oo.oooooooo.oo.',
    1: 'ossohhhhhhhhosso',
    2: 'osohhhhhhhhhhoso',
    3: 'osohhhhhhhhhhoso',
    4: 'oCohhsssssshhoCo',
    5: 'oCohsssssssShoCo',
    6: 'oCossossssosSoCo',
    7: 'oCosssssssssSoCo',
    8: 'oCCoSSSSSSSSoCCo',
    9: '.oCccccccccccCo.',
    11: '..oCccccccccCo..',
  },
  papel: {
    8: '...oSSSSSSSSooo.',
    9: '..oCccccccccCwwo',
    10: '..oCccccccccCwgo',
    11: '..osccccccccswwo',
    12: '...oCCCCCCCCoooo',
  },
});

const virar = (linha) => [...linha].reverse().join('');
const POSTAS = new Map();

/**
 * As 16 linhas do boneco numa pose. A mesma pose devolve sempre a mesma lista.
 * @param {string} pose uma das poses de `quadro` (`parado` é o molde)
 * @param {{ papel?: boolean, festa?: boolean, espelhado?: boolean }} [o] `papel`: leva o papel ·
 *   `festa`: os dois braços para cima, no lugar da pose · `espelhado`: virado para a esquerda
 */
export function linhasDoBoneco(pose, { papel = false, festa = false, espelhado = false } = {}) {
  const chave = `${pose}|${papel}|${festa}|${espelhado}`;
  if (!POSTAS.has(chave)) {
    const trocas = { ...(festa ? TROCAS.festa : TROCAS[pose]), ...(papel ? TROCAS.papel : null) };
    const linhas = MOLDE.linhas.map((linha, i) => trocas[i] ?? linha);
    POSTAS.set(chave, espelhado ? linhas.map(virar) : linhas);
  }
  return POSTAS.get(chave);
}

/** A cor um quarto mais escura: a sombra que dá volume à pele e à camisa. */
export function sombra(cor) {
  const canal = (inicio) => Math.round(parseInt(cor.slice(inicio, inicio + 2), 16) * 0.75).toString(16).padStart(2, '0');
  return `#${canal(1)}${canal(3)}${canal(5)}`;
}

const PALETAS = new Map();

/** A paleta do molde com as cores de um agente (`{ camisa, cabelo, pele }`, em `#rrggbb`). */
export function coresDoBoneco({ camisa, cabelo, pele }) {
  const chave = `${camisa}|${cabelo}|${pele}`;
  if (!PALETAS.has(chave)) {
    const fendas = { cabelo, pele, 'pele-sombra': sombra(pele), camisa, 'camisa-sombra': sombra(camisa) };
    PALETAS.set(chave, Object.fromEntries(Object.entries(MOLDE.paleta).map(([letra, cor]) => [letra, fendas[cor] ?? cor])));
  }
  return PALETAS.get(chave);
}

/** Os trechos de uma linha: `[x, largura, letra]` de cada sequência da mesma letra, sem os vazios. */
function trechos(linha) {
  return [...linha.matchAll(/([^.])\1*/g)].map((achado) => [achado.index, achado[0].length, achado[1]]);
}

const guardar = (lista, item) => {
  lista.push(item);
  return item;
};

/** Trechos iguais em linhas seguidas viram um retângulo só: a cena preenche menos vezes. */
function juntar(linhas) {
  const todos = [];
  let acima = new Map();
  linhas.forEach((linha, y) => {
    const nesta = new Map();
    for (const [x, largura, letra] of trechos(linha)) {
      const chave = `${x}:${largura}:${letra}`;
      const retangulo = acima.get(chave) ?? guardar(todos, [x, y, largura, 0, letra]);
      retangulo[3] += 1;
      nesta.set(chave, retangulo);
    }
    acima = nesta;
  });
  return todos;
}

const RETANGULOS = new WeakMap();

/**
 * Os retângulos que desenham uma matriz: `[x, y, largura, altura, letra]`, a partir do canto
 * superior esquerdo dela. A conta é feita uma vez por lista de linhas.
 */
export function retangulos(linhas) {
  if (!RETANGULOS.has(linhas)) RETANGULOS.set(linhas, juntar(linhas));
  return RETANGULOS.get(linhas);
}
