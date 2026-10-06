// O caminho de uma entrega (regra 28): do assento de quem entrega até a frente da mesa de quem
// recebe, calculado direto da grade, sem busca de caminho. O boneco sai pelo corredor de trás da
// própria mesa até o vão ao lado, anda pelo vão até o corredor da frente da mesa de destino e
// segue por ele. Só trechos horizontais e verticais, em pixel lógico e inteiro; nenhum encosta
// num tampo nem passa por cima de um colega sentado.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 28 (repositório do OpenCrew).
import { VAOS_X, mesaDe } from './modelo-mesas.js';

/**
 * Índice (em `VAOS_X`) do vão por onde a entrega passa: o vizinho da coluna de origem, do lado
 * do destino. Na mesma coluna, o da direita; na última coluna, o da esquerda.
 */
function vaoDe(origem, destino) {
  if (destino > origem) return origem;
  if (destino < origem) return origem - 1;
  return origem < VAOS_X.length ? origem : origem - 1;
}

/**
 * A rota entre duas mesas, pelo canto superior esquerdo do boneco.
 * @param {number} de índice da mesa de quem entrega (0 a 11)
 * @param {number} para índice da mesa de quem recebe (0 a 11)
 * @returns {{ x: number, y: number }[] | null} quatro pontos: o assento de quem entrega, a
 *   entrada do vão, a saída do vão e a frente da mesa de quem recebe; `null` se uma das mesas
 *   não existe
 */
export function rota(de, para) {
  const origem = mesaDe(de);
  const destino = mesaDe(para);
  if (!origem || !destino) return null;
  const x = VAOS_X[vaoDe(origem.coluna, destino.coluna)];
  return [{ ...origem.boneco }, { x, y: origem.boneco.y }, { x, y: destino.frente.y }, { ...destino.frente }];
}

const trechos = (pontos) => pontos.slice(1).map((fim, i) => [pontos[i], fim]);
const tamanho = ([a, b]) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);

/** Comprimento de uma rota, em pixels lógicos. */
export function comprimentoDaRota(pontos) {
  return trechos(pontos).reduce((soma, trecho) => soma + tamanho(trecho), 0);
}

/**
 * Onde está quem já andou uma fração da rota, em velocidade constante.
 * @param {{ x: number, y: number }[]} pontos a rota (ou ela invertida, para a volta)
 * @param {number} fracao de 0 (o primeiro ponto) a 1 (o último); fora disso vale o extremo
 * @returns {{ x: number, y: number, espelhado: boolean }} posição inteira · `espelhado`: o
 *   último trecho horizontal andado foi para a esquerda
 */
export function pontoDaRota(pontos, fracao) {
  let resta = Math.round(comprimentoDaRota(pontos) * Math.max(0, fracao));
  let espelhado = false;
  for (const [a, b] of trechos(pontos)) {
    if (a.x !== b.x) espelhado = b.x < a.x;
    if (resta <= tamanho([a, b])) {
      return { x: a.x + Math.sign(b.x - a.x) * resta, y: a.y + Math.sign(b.y - a.y) * resta, espelhado };
    }
    resta -= tamanho([a, b]);
  }
  return { ...pontos.at(-1), espelhado };
}
