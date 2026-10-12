// O caminho de uma entrega (regra 28 da E1): do assento de quem entrega até a frente da mesa de
// quem recebe, calculado direto da grade da sala, sem busca de caminho. O boneco sai pelo corredor
// de trás da própria mesa até o vão ao lado e anda pelo vão; o trecho comprido na horizontal é
// sempre pelo corredor da frente da linha de cima das duas mesas, que é a que está cheia. Assim
// nenhum trecho passa por célula sem mesa, que é onde ficam os móveis (regra 15 da E3). Só
// trechos horizontais e verticais, em pixel lógico e inteiro; nenhum encosta num tampo nem passa
// por cima de um colega sentado.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 28, e fase-e3-conversa-e-entrega.md, regras 14 e 15
// (repositório do OpenCrew).

/**
 * O x do vão vizinho da coluna `coluna`, do lado da coluna `outra`. Na mesma coluna, o da
 * direita; na última coluna, o da esquerda.
 */
function vaoDe({ vaosX }, coluna, outra) {
  if (outra > coluna) return vaosX[coluna];
  if (outra < coluna) return vaosX[coluna - 1];
  return vaosX[coluna < vaosX.length ? coluna : coluna - 1];
}

/**
 * A rota entre duas mesas de uma sala, pelo canto superior esquerdo do boneco.
 * @param {object} sala uma de `SALAS`
 * @param {number} de índice da mesa de quem entrega
 * @param {number} para índice da mesa de quem recebe
 * @returns {{ x: number, y: number }[] | null} os pontos da rota: o assento de quem entrega, a
 *   entrada do vão, a saída do vão e a frente da mesa de quem recebe; quando quem recebe está
 *   numa linha abaixo e em outro vão, mais dois pontos, pelo corredor da frente da linha de quem
 *   entrega · `null` se a sala ou uma das mesas não existe
 */
export function rota(sala, de, para) {
  const origem = sala?.mesas?.[de];
  const destino = sala?.mesas?.[para];
  if (!origem || !destino) return null;
  const saida = vaoDe(sala, origem.coluna, destino.coluna);
  const chegada = destino.linha > origem.linha ? vaoDe(sala, destino.coluna, origem.coluna) : saida;
  const inicio = [{ ...origem.boneco }, { x: saida, y: origem.boneco.y }];
  const fim = [{ x: chegada, y: destino.frente.y }, { ...destino.frente }];
  if (chegada === saida) return [...inicio, ...fim];
  return [...inicio, { x: saida, y: origem.frente.y }, { x: chegada, y: origem.frente.y }, ...fim];
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
