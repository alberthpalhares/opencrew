// Geometria do escritório: a tela lógica de 320×180 e as 12 mesas, em grade de 4 colunas, pela
// ordem do elenco. Tudo em pixel lógico e inteiro; a página aplica em porcentagem da tela.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 17 e 19 (repositório do OpenCrew).

export const LARGURA = 320;
export const ALTURA = 180;
/** Lado do molde do boneco. */
export const BONECO = 16;
export const COLUNAS = 4;
export const LINHAS = 3;
export const MAX_MESAS = COLUNAS * LINHAS;
/** Largura de uma coluna: é também a largura do nome e do balão na página. */
export const LARGURA_COLUNA = LARGURA / COLUNAS;
/** Altura da parede, no alto da sala; a primeira linha de mesas começa logo abaixo. */
export const TOPO = 18;
export const ALTURA_LINHA = (ALTURA - TOPO) / LINHAS;
/** Tamanho do tampo de toda mesa. */
export const MESA = Object.freeze({ largura: 44, altura: 11 });

// Cada célula (80×54), de cima para baixo: 7 px para o sinal sobre a cabeça, o boneco sentado
// (16), 1 px de folga, o tampo da mesa (11) e o corredor da frente (19), onde um boneco em pé
// cabe sem encostar em nada. Nenhum boneco, sentado ou andando pelos vãos, encosta num tampo.
const SINAL = 7;
const FOLGA_DO_ASSENTO = 1;
const FOLGA_DA_FRENTE = 2;

function congelar(valor) {
  for (const parte of Object.values(valor)) {
    if (parte && typeof parte === 'object') congelar(parte);
  }
  return Object.freeze(valor);
}

function criarMesa(indice) {
  const coluna = indice % COLUNAS;
  const linha = Math.floor(indice / COLUNAS);
  const centro = coluna * LARGURA_COLUNA + LARGURA_COLUNA / 2;
  const cabeca = TOPO + linha * ALTURA_LINHA + SINAL;
  const tampo = cabeca + BONECO + FOLGA_DO_ASSENTO;
  const chao = tampo + MESA.altura;
  return {
    indice,
    coluna,
    linha,
    retangulo: { x: centro - MESA.largura / 2, y: tampo, ...MESA },
    boneco: { x: centro - BONECO / 2, y: cabeca },
    frente: { x: centro - BONECO / 2, y: chao + FOLGA_DA_FRENTE },
    nome: { x: centro, y: chao + 1 },
    balao: { x: centro, y: cabeca - 1 },
  };
}

/**
 * As 12 mesas, na ordem do elenco (da esquerda para a direita, de cima para baixo). Cada uma:
 * - `indice`, `coluna`, `linha`;
 * - `retangulo` `{ x, y, largura, altura }`: o tampo, que nenhuma caminhada atravessa;
 * - `boneco` `{ x, y }`: canto superior esquerdo do boneco sentado, atrás do tampo;
 * - `frente` `{ x, y }`: canto superior esquerdo do boneco em pé na frente da mesa;
 * - `nome` `{ x, y }`: meio da borda de cima do nome, sob a mesa;
 * - `balao` `{ x, y }`: meio da borda de baixo do balão, sobre a cabeça.
 * A lista e as mesas são imutáveis.
 */
export const MESAS = congelar(Array.from({ length: MAX_MESAS }, (_, i) => criarMesa(i)));

/**
 * X do canto esquerdo de um boneco que anda pelo meio de cada vão vertical, entre duas colunas
 * de mesas. Os vãos horizontais de cada linha ficam atrás das mesas (o `boneco.y`, por onde quem
 * está sentado sai) e na frente delas (o `frente.y`).
 */
export const VAOS_X = Object.freeze([1, 2, 3].map((coluna) => coluna * LARGURA_COLUNA - BONECO / 2));

/** A mesa de quem ocupa a posição `indice` do elenco; `null` do 13º em diante. */
export function mesaDe(indice) {
  return MESAS[indice] ?? null;
}

/** As mesas de um elenco de `total` agentes: no máximo 12. */
export function mesas(total) {
  return MESAS.slice(0, Math.max(0, total));
}
