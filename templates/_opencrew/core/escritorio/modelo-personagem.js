// A aparência de cada agente: o molde do boneco (feminino ou masculino), o corte de cabelo e as
// cores da camisa, da pele, do cabelo e dos olhos. A camisa vem da mesa; o molde, da coluna
// `personagem` da crew ou, sem ela, do `id`; o resto, sempre do `id` — o mesmo agente tem a mesma
// cara em qualquer mesa e em qualquer execução.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16, e fase-e2-personagens-do-escritorio.md, regras 3
// a 6 (repositório do OpenCrew).

/** Cor da camisa de cada mesa, na ordem das mesas: 12 cores, nenhuma repetida. */
export const CAMISAS = Object.freeze([
  '#d95763', '#5b6ee1', '#fbf236', '#37946e',
  '#df7126', '#76428a', '#5fcde4', '#d77bba',
  '#99e550', '#3f3f74', '#cbdbfc', '#8a6f30',
]);
/** Tons de pele, do mais claro ao mais escuro. */
export const PELES = Object.freeze(['#fde4d2', '#f4c9a4', '#e5ac7b', '#cf8e5a', '#b0713f', '#8b5431', '#663b23', '#432617']);
/** Preto, castanho-escuro, castanho, ruivo, loiro-escuro, loiro, grisalho, branco e azul de tintura. */
export const CABELOS = Object.freeze(['#15131c', '#3a2318', '#7b4a2b', '#b8452a', '#b98a45', '#efcf6a', '#8f96a3', '#f0ece2', '#3f7fe0']);
/** Castanho-escuro, castanho-claro, verde e azul. */
export const OLHOS = Object.freeze(['#2e1a10', '#a9682e', '#3f9a5c', '#3b86d8']);
export const MOLDES = Object.freeze(['feminino', 'masculino']);
/** Cada molde tem este número de cortes de cabelo (os desenhos estão em `sprites-rosto.js`). */
export const CORTES_POR_MOLDE = 5;

/**
 * A menor diferença de cor aceita entre a pele e o cabelo, e entre a pele e os olhos, na medida
 * de `diferenca`. Com 60, toda pele fica com pelo menos 7 dos 9 cabelos e 3 das 4 cores de olhos;
 * abaixo de 60 passaria o loiro na segunda pele (59), e acima de 69 a quinta pele ficaria com 6
 * cabelos. As duplas recusadas ficam entre 10 e 59.
 */
export const DIFERENCA_MINIMA = 60;

const canais = (cor) => [1, 3, 5].map((inicio) => parseInt(cor.slice(inicio, inicio + 2), 16));

/** A diferença entre duas cores `#rrggbb`: a distância em linha reta no cubo RGB, de 0 a 441,7. */
export function diferenca(a, b) {
  const [outra, esta] = [canais(a), canais(b)];
  return Math.hypot(...esta.map((canal, i) => canal - outra[i]));
}

/**
 * A cor de `lista` na posição `indice`, ou — se ela fica próxima demais da pele — a seguinte da
 * lista que não fica (depois da última vem a primeira). É assim que cabelo e olhos nunca somem
 * no rosto.
 */
export function corDistinta(lista, indice, pele) {
  for (let salto = 0; salto < lista.length; salto++) {
    const cor = lista[(indice + salto) % lista.length];
    if (diferenca(cor, pele) >= DIFERENCA_MINIMA) return cor;
  }
  return lista[indice];
}

const NOMES = Object.freeze({ feminino: 'feminino', f: 'feminino', masculino: 'masculino', m: 'masculino' });

/**
 * O molde que a coluna `personagem` pede: `feminino`/`f` ou `masculino`/`m`, sem diferenciar
 * maiúsculas, acentos e espaços nas pontas. Vazio, ausente ou qualquer outro valor: `null`.
 */
export function moldeDe(personagem) {
  if (typeof personagem !== 'string') return null;
  const chave = personagem.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return Object.hasOwn(NOMES, chave) ? NOMES[chave] : null;
}

/** Número fixo para cada texto (FNV-1a, 32 bits): o mesmo `id` dá sempre o mesmo. */
function semente(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Espalha a semente pelos 32 bits (a mistura final do MurmurHash3). Sem isto, `id` parecidos
 * (`agente-1`, `agente-2`…) dão sementes cujos trechos andam juntos: quem tem o mesmo cabelo sai
 * sempre com o mesmo molde.
 */
function misturar(h) {
  let m = h ^ (h >>> 16);
  m = Math.imul(m, 0x85ebca6b);
  m ^= m >>> 13;
  m = Math.imul(m, 0xc2b2ae35);
  return (m ^ (m >>> 16)) >>> 0;
}

/** Um trecho da semente: `bits` bits a partir do bit `de`. Trechos que não se cruzam não andam juntos. */
const trecho = (h, de, bits) => (h >>> de) & ((1 << bits) - 1);

/**
 * A semente de um texto, já espalhada: é dela que sai a aparência de cada agente (pelo `id`) e o
 * arranjo dos móveis da sala (pelo nome da crew). O mesmo texto dá sempre o mesmo número.
 */
export function sementeDe(texto) {
  return misturar(semente(String(texto)));
}

/**
 * A aparência do boneco. Cada escolha sai de um trecho diferente da semente do `id`, já
 * espalhada: molde, bit 4 · pele, bits 5 a 7 · corte, 8 a 11 · olhos, 12 e 13 · cabelo, 14 a 21.
 * @param {string} id
 * @param {number} indiceDaMesa posição no elenco; fora das 12 mesas, `camisa` é `null`
 * @param {unknown} [personagem] o que a crew declarou (ver `moldeDe`); sem valor válido, o molde vem do `id`
 * @returns {{ camisa: string|null, molde: string, corte: number, pele: string, cabelo: string, olhos: string }}
 *   cores em `#rrggbb`; `corte`: 0 a 4, na ordem dos cortes do molde
 */
export function aparencia(id, indiceDaMesa, personagem) {
  const h = misturar(semente(String(id)));
  const pele = PELES[trecho(h, 5, 3)];
  return {
    camisa: CAMISAS[indiceDaMesa] ?? null,
    molde: moldeDe(personagem) ?? MOLDES[trecho(h, 4, 1)],
    corte: trecho(h, 8, 4) % CORTES_POR_MOLDE,
    pele,
    cabelo: corDistinta(CABELOS, trecho(h, 14, 8) % CABELOS.length, pele),
    olhos: corDistinta(OLHOS, trecho(h, 12, 2), pele),
  };
}
