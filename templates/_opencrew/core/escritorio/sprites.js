// Os desenhos do escritório são matrizes de pixels escritas como texto: uma string por linha, uma
// letra por pixel e uma paleta (letra → cor). Nenhuma imagem entra no pacote.
// Este módulo traz as cores fixas de toda a cena, a paleta do boneco e a conta que transforma uma
// matriz nos retângulos que a cena preenche. Os irmãos trazem os desenhos: `sprites-sala.js`,
// `sprites-mesa.js`, `sprites-parede.js` e `sprites-moveis.js`, a sala e os móveis;
// `sprites-rosto.js` e `sprites-corpo.js`, as peças do boneco, que `sprites-boneco.js` monta.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16, fase-e2-personagens-do-escritorio.md e
// fase-e3-conversa-e-entrega.md, regra 19 (repositório do OpenCrew).

/** As cores fixas da cena. A camisa, o cabelo, a pele e os olhos de cada boneco vêm do modelo. */
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
  luz: '#ffe9a8',
});

/**
 * A paleta de todas as peças do boneco. `cabelo`, `pele`, `olhos`, `camisa` e as três sombras são
 * fendas que `coresDoBoneco` troca pelas cores de cada agente; o resto é cor fixa da cena.
 * `o` contorno · `h`/`H` cabelo e a sombra dele · `s`/`S` pele · `e` olho · `c`/`C` camisa ·
 * `p`/`P` calça · `b` sapato · `w`/`g` papel.
 */
export const TINTAS = Object.freeze({
  o: CORES.tinta, h: 'cabelo', H: 'cabelo-sombra', s: 'pele', S: 'pele-sombra', e: 'olhos', c: 'camisa', C: 'camisa-sombra',
  p: CORES.cinzaEscuro, P: CORES.telaApagada, b: CORES.madeiraEscura, w: CORES.branco, g: CORES.cinzaClaro,
});

/**
 * Uma matriz de pixels: `linhas` do mesmo tamanho e a `paleta` com a cor de cada letra. O ponto
 * é sempre o pixel vazio.
 */
export function matriz(paleta, linhas) {
  return Object.freeze({ paleta: Object.freeze({ '.': null, ...paleta }), linhas: Object.freeze(linhas) });
}

/** A cor um quarto mais escura: a sombra que dá volume à pele, ao cabelo e à camisa. */
export function sombra(cor) {
  const canal = (inicio) => Math.round(parseInt(cor.slice(inicio, inicio + 2), 16) * 0.75).toString(16).padStart(2, '0');
  return `#${canal(1)}${canal(3)}${canal(5)}`;
}

const NOITES = new Map();

/**
 * A mesma cor numa sala à noite (regra 19 da E3): mais escura e puxada para o azul. A conta é
 * fixa — a mesma cor dá sempre a mesma — e feita uma vez por cor.
 */
export function noite(cor) {
  if (!NOITES.has(cor)) {
    const canal = (inicio, fator) => Math.round(parseInt(cor.slice(inicio, inicio + 2), 16) * fator).toString(16).padStart(2, '0');
    NOITES.set(cor, `#${canal(1, 0.62)}${canal(3, 0.66)}${canal(5, 0.84)}`);
  }
  return NOITES.get(cor);
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
