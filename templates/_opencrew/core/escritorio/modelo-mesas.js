// Geometria do escritório: quatro salas, do tamanho do elenco, cada uma com a sua tela lógica, as
// suas mesas (pela ordem do elenco) e os seus vãos de passagem. A célula da grade é sempre 80×54 e
// o boneco, 16×16. Tudo em pixel lógico e inteiro; a página aplica em porcentagem da tela da sala.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 17 e 19, e fase-e3-conversa-e-entrega.md, §2B e
// regras 13, 14 e 17 (repositório do OpenCrew).

/** Lado do molde do boneco. */
export const BONECO = 16;
/** Largura de uma coluna da grade: é também a largura do nome e do balão de status na página. */
export const LARGURA_COLUNA = 80;
export const ALTURA_LINHA = 54;
/** Altura da parede, no alto da sala; a primeira linha de mesas começa logo abaixo. */
export const TOPO = 18;
/** Tamanho do tampo de toda mesa. */
export const MESA = Object.freeze({ largura: 44, altura: 11 });
/** Do 13º agente em diante não há mesa: ele aparece só na lista. */
export const MAX_MESAS = 12;

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

function criarMesa(indice, colunasDeMesa) {
  const coluna = indice % colunasDeMesa;
  const linha = Math.floor(indice / colunasDeMesa);
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

function criarSala({ nome, titulo, colunas, linhas, colunasDeMesa, lugares }) {
  return {
    nome,
    titulo,
    largura: colunas * LARGURA_COLUNA,
    altura: TOPO + linhas * ALTURA_LINHA,
    colunas,
    linhas,
    colunasDeMesa,
    mesas: Array.from({ length: lugares }, (_, i) => criarMesa(i, colunasDeMesa)),
    vaosX: Array.from({ length: colunasDeMesa - 1 }, (_, i) => (i + 1) * LARGURA_COLUNA - BONECO / 2),
  };
}

// §2B. Na sala Completa as mesas ocupam as 4 primeiras colunas; a quinta é a área comum.
const PLANTAS = [
  { nome: 'pequena', titulo: 'Pequena', colunas: 3, linhas: 2, colunasDeMesa: 3, lugares: 3 },
  { nome: 'media', titulo: 'Média', colunas: 4, linhas: 2, colunasDeMesa: 4, lugares: 6 },
  { nome: 'grande', titulo: 'Grande', colunas: 4, linhas: 3, colunasDeMesa: 4, lugares: 9 },
  { nome: 'completa', titulo: 'Completa', colunas: 5, linhas: 3, colunasDeMesa: 4, lugares: MAX_MESAS },
];

/**
 * As quatro salas, pelo nome (`pequena`, `media`, `grande`, `completa`). Cada uma:
 * - `nome`, `titulo` (por extenso), `largura` × `altura` (a tela lógica), `colunas` × `linhas`
 *   (células de 80×54) e `colunasDeMesa` (quantas colunas têm mesa);
 * - `mesas`: todos os lugares da sala, na ordem do elenco (da esquerda para a direita, de cima
 *   para baixo). Cada mesa: `indice`, `coluna`, `linha`; `retangulo` `{ x, y, largura, altura }`,
 *   o tampo, que nenhuma caminhada atravessa; `boneco` `{ x, y }`, o canto superior esquerdo do
 *   boneco sentado, atrás do tampo; `frente`, o do boneco em pé na frente da mesa; `nome`, o meio
 *   da borda de cima do nome, sob a mesa; `balao`, o meio da borda de baixo do balão de status;
 * - `vaosX`: o x do canto esquerdo de um boneco que anda pelo meio de cada vão vertical, entre
 *   duas colunas de mesas. Os vãos horizontais de cada linha ficam atrás das mesas (o `boneco.y`,
 *   por onde quem está sentado sai) e na frente delas (o `frente.y`).
 * Tudo imutável.
 */
export const SALAS = congelar(Object.fromEntries(PLANTAS.map((planta) => [planta.nome, criarSala(planta)])));

/**
 * A sala de um elenco de `total` agentes (contam todos, inclusive os pulados): 1 a 3, Pequena;
 * 4 a 6, Média; 7 a 9, Grande; 10 em diante, Completa. Sem elenco (ou valor inválido), a Pequena.
 */
export function salaDe(total) {
  const n = Number.isFinite(total) ? total : 0;
  return Object.values(SALAS).find((sala) => n <= sala.mesas.length) ?? SALAS.completa;
}
