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
  'planta-alta': [11, 19],
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

function pequena({ lado, assento, padrao, parede }) {
  const cx = lado ? 150 : 90;
  const [estante, relogio] = parede ? [160, 80] : [80, 160];
  const lugares = assento ? [peca('poltrona', cx - 34, 80), peca('poltrona', cx + 16, 80)] : [peca('sofa', cx - 20, 78)];
  return [
    ...janelas([0, 1, 2]), pendurado('relogio', relogio), encostado('estante', estante),
    encostado('planta', lado ? 12 : 228), pendurado('quadro', lado ? 228 : 12),
    tapete(padrao, cx - 48, 82, 96, 40), ...lugares, peca('mesa-baixa', cx - 12, 104),
    peca('abajur', lado ? cx + 38 : cx - 47, 74), peca('planta-alta', lado ? 24 : 205, 100),
  ];
}

function media({ lado, assento, padrao, parede }) {
  const cx = lado ? 272 : 208;
  const [estante, planta] = parede ? [240, 80] : [80, 240];
  return [
    ...janelas([0, 1, 2, 3]), pendurado('relogio', 160), encostado('estante', estante), encostado('planta', planta),
    tapete(padrao, cx - 32, 86, 64, 36), peca('poltrona', assento ? cx + 2 : cx - 20, 80),
    peca('abajur', assento ? cx - 14 : cx + 5, 76), peca('bebedouro', lado ? 172 : 304, 78),
    peca('planta-alta', lado ? 206 : 262, 102),
  ];
}

function grande({ lado, assento, padrao, parede }) {
  const cx = lado ? 244 : 160;
  const lousa = parede ? 2 : 1;
  const reuniao = assento
    ? [peca('sofa', cx - 20, 134), peca('mesa-baixa', cx - 12, 158)]
    : [peca('poltrona', cx - 42, 146), peca('poltrona', cx + 24, 146), peca('mesa-baixa', cx - 12, 152)];
  return [
    ...janelas([0, 1, 2, 3].filter((coluna) => coluna !== lousa)), pendurado('quadro-branco', meio(lousa)), pendurado('relogio', 160),
    encostado('estante', 80), encostado('estante', 240), encostado('planta', lado ? 308 : 12),
    tapete(padrao, cx - 52, 132, 104, 44), ...reuniao, peca('bebedouro', lado ? 94 : 302, 130),
    peca('planta-alta', lado ? 140 : 262, 154),
  ];
}

function completa({ lado, assento, padrao }) {
  const [cafe, abajur] = lado ? [384, 332] : [334, 384];
  const lugares = assento
    ? [peca('poltrona', 351, 50), peca('mesa-baixa', 348, 76), peca('sofa', 340, 98)]
    : [peca('sofa', 340, 50), peca('mesa-baixa', 348, 78), peca('poltrona', 351, 100)];
  return [
    ...janelas([0, 1, 2, 3]), pendurado('relogio', 160), encostado('planta', 80), encostado('planta', 240),
    encostado('estante', 358), peca('cafe', cafe - 8, 8), peca('abajur', abajur - 4, 8),
    tapete(padrao, 328, 44, 64, 96), ...lugares, peca('planta-alta', lado ? 380 : 330, 154),
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
