// O cenário de cada sala (§2B e regras 15 e 16 da E3): onde ficam as janelas, o relógio e os
// móveis. Quais móveis opcionais entram e de que lado ficam sai do nome da crew, pela mesma semente
// dos personagens: a mesma crew, com o mesmo elenco, tem sempre a mesma sala.
// Móvel de chão só ocupa célula sem mesa (a linha de baixo na Pequena; as duas últimas colunas da
// linha de baixo na Média; as três últimas da linha de baixo na Grande; a quinta coluna na
// Completa) e fica fora dos vãos por onde a entrega passa. O que encosta na parede do fundo
// termina acima da primeira linha por onde um boneco anda.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e3-conversa-e-entrega.md, §2B e regras 15 e 16 (repositório do OpenCrew).
import { LARGURA_COLUNA } from './modelo-mesas.js';
import { sementeDe } from './modelo-personagem.js';

/** Largura e altura de cada desenho, em pixels lógicos (os desenhos estão em `sprites-*.js`). */
export const TAMANHOS = Object.freeze({
  janela: [24, 10], relogio: [9, 9], planta: [11, 16], estante: [20, 20], quadro: [13, 10], 'quadro-branco': [28, 12],
  abajur: [9, 22], sofa: [40, 18], poltrona: [18, 16], 'mesa-baixa': [24, 10], bebedouro: [10, 22], cafe: [16, 22],
  'planta-alta': [11, 19], sinuca: [52, 26], videogame: [32, 20], pufe: [14, 10], 'bancada-copa': [28, 18],
});
/** Onde termina, no chão, o que fica encostado na parede do fundo. */
const PE_DA_PAREDE = 24;
/** A que altura da parede fica o que é pendurado nela. */
const ALTURA_NA_PAREDE = Object.freeze({ janela: 3, relogio: 3, 'quadro-branco': 3, quadro: 4 });

const peca = (tipo, x, y, camada = 'chao') => ({ tipo, x, y, largura: TAMANHOS[tipo][0], altura: TAMANHOS[tipo][1], camada });
/** Pendurado na parede, com o meio em `centro`. */
const pendurado = (tipo, centro) => peca(tipo, centro - Math.floor(TAMANHOS[tipo][0] / 2), ALTURA_NA_PAREDE[tipo], 'parede');
/** Em pé, encostado na parede, com o meio em `centro`. */
const encostado = (tipo, centro) => peca(tipo, centro - Math.floor(TAMANHOS[tipo][0] / 2), PE_DA_PAREDE - TAMANHOS[tipo][1], 'parede');
const tapete = (padrao, x, y, largura, altura) => ({ tipo: 'tapete', padrao, x, y, largura, altura, camada: 'tapete' });
const meio = (coluna) => coluna * LARGURA_COLUNA + LARGURA_COLUNA / 2;
const janelas = (colunas) => colunas.map((coluna) => pendurado('janela', meio(coluna)));

function alaDeLazer(x0, larguraAla, { lado, padrao }) {
  const dx = larguraAla >= 160 ? 16 : 0;
  const extras = larguraAla >= 160 ? [encostado('planta', x0 + dx + 129)] : [];
  return [
    peca('cafe', x0 + dx + 18, 2, 'parede'),
    peca('bancada-copa', x0 + dx + 38, 6, 'parede'),
    peca('bebedouro', x0 + dx + 70, 2, 'parede'),
    peca('estante', x0 + dx + 84, 4, 'parede'),
    ...extras,
    peca('videogame', x0 + dx + 44, 56),
    peca('pufe', x0 + dx + 38, 92),
    peca('pufe', x0 + dx + 68, 92),
    peca('sinuca', x0 + dx + 36, 119),
    peca('planta-alta', x0 + dx + 107, 114),
    tapete(padrao, x0 + dx + 22, 168, 64, 54),
    peca('sofa', x0 + dx + 26, 170),
    peca('abajur', x0 + dx + (lado ? 68 : 16), 166),
    peca('poltrona', x0 + dx + 78, 200),
    peca('mesa-baixa', x0 + dx + 34, 210),
  ];
}

function pequena(o) {
  const relogio = o.parede ? 62 : 98;
  return [
    ...janelas([0, 1]), pendurado('relogio', relogio), encostado('estante', 80),
    encostado('planta', o.lado ? 12 : 148), pendurado('quadro', o.lado ? 148 : 12),
    ...alaDeLazer(2 * LARGURA_COLUNA, 160, o),
  ];
}

function media(o) {
  const relogio = o.parede ? 98 : 62;
  return [
    ...janelas([0, 1]), pendurado('relogio', relogio), encostado('estante', 80),
    encostado('planta', o.lado ? 148 : 12), pendurado('quadro', o.lado ? 12 : 148),
    ...alaDeLazer(2 * LARGURA_COLUNA, 160, o),
  ];
}

function grande(o) {
  const lousa = o.parede ? 2 : 1;
  return [
    ...janelas([0, 1, 2].filter((coluna) => coluna !== lousa)), pendurado('quadro-branco', meio(lousa)),
    pendurado('relogio', 60), encostado('estante', 80), encostado('estante', 160),
    encostado('planta', o.lado ? 228 : 12),
    ...alaDeLazer(3 * LARGURA_COLUNA, 120, o),
  ];
}

function completa(o) {
  return [
    ...janelas([0, 1, 2]), pendurado('relogio', 80), encostado('planta', 160),
    encostado('planta', o.lado ? 228 : 12),
    ...alaDeLazer(3 * LARGURA_COLUNA, 120, o),
  ];
}

const ARRANJOS = Object.freeze({ pequena, media, grande, completa });
const PRONTOS = new Map();

/** O que o nome da crew decide, um bit da semente para cada escolha. */
function escolhas(crew) {
  const v = sementeDe(crew ?? '');
  return { lado: v & 1, assento: (v >>> 1) & 1, padrao: (v >>> 2) & 1, parede: (v >>> 3) & 1 };
}

/** As escolhas que mudam o arranjo de uma sala, num número: duas crews com o mesmo têm a mesma sala. */
export function varianteDe(crew) {
  return sementeDe(crew ?? '') & 15;
}

/**
 * O cenário de uma sala para uma crew.
 * @param {object} sala uma de `SALAS`
 * @param {string} crew o nome da crew: é a semente do arranjo
 * @returns {object[]} cada peça: `{ tipo, x, y, largura, altura, camada }`, em pixel lógico
 *   inteiro, mais `padrao` (0 ou 1) nos tapetes · `tipo`: `janela`, `relogio`, `quadro`,
 *   `quadro-branco`, `estante`, `planta`, `tapete`, `sofa`, `poltrona`, `mesa-baixa`, `abajur`,
 *   `bebedouro`, `cafe` ou `planta-alta` · `camada`: `parede` (pendurado ou encostado na parede
 *   do fundo), `tapete` (no chão, pode ser pisado) ou `chao` (móvel que ninguém atravessa) ·
 *   a lista é imutável, e a mesma para a mesma sala e o mesmo nome
 */
export function moveisDe(sala, crew) {
  const chave = `${sala.nome}|${varianteDe(crew)}`;
  if (!PRONTOS.has(chave)) PRONTOS.set(chave, Object.freeze(ARRANJOS[sala.nome](escolhas(crew)).map(Object.freeze)));
  return PRONTOS.get(chave);
}
