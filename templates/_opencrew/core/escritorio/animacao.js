// O que anima (regra 28 da E1 e regras 2 a 7 da E3): a passagem de bastão, a comemoração e as
// falas nascem da diferença entre duas leituras da mesma crew, nunca de um status gravado.
// `transicao` anota no modelo a hora em que cada uma começou; `quadro` (em quadro.js) desenha pelo
// tempo decorrido desde então.
// Puro: sem DOM, sem relógio, sem rede. A hora entra por parâmetro.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 28, e fase-e3-conversa-e-entrega.md, §2 e regras 3
// e 5 a 7 (repositório do OpenCrew).
import { falasDaLeitura } from './modelo-falas.js';

/** A entrega: a ida até a frente da mesa de quem recebe, com o papel; a conversa; e a volta. */
export const IDA_MS = 3000;
export const CONVERSA_MS = 4000;
export const VOLTA_MS = 3000;
export const ENTREGA_MS = IDA_MS + CONVERSA_MS + VOLTA_MS;
/** Na conversa, primeiro fala quem entrega; depois, até o fim dela, responde quem recebe. */
export const FALA_MS = 2500;
export const RESPOSTA_MS = CONVERSA_MS - FALA_MS;
/** Quanto dura a comemoração de uma execução concluída. */
export const COMEMORACAO_MS = 4000;
/** Quem digita troca de pose a cada 0,3 s; quem anda, a cada 0,15 s. */
export const DIGITAR_MS = 300;
export const ANDAR_MS = 150;

/** Nada em curso: é o que vale na primeira leitura de cada crew. */
export const SEM_ANIMACAO = Object.freeze({ entrega: null, comemoracao: null });
const SEM_FALAS = Object.freeze([]);

/** As duas leituras têm estado e são da mesma crew (ou as duas são da demonstração). */
function mesmaCrew(anterior, atual) {
  if (!anterior || !atual || anterior.semEstado || atual.semEstado) return false;
  return Boolean(anterior.demo) === Boolean(atual.demo) && anterior.crew === atual.crew;
}

/** A entrega da passagem de bastão de uma leitura, começando em `agoraMs`. */
const entregaDe = ({ deId, paraId }, agoraMs) => ({ deId, paraId, inicioMs: agoraMs });

/** A passagem de bastão cuja data a leitura anterior não trazia; senão (ou sem data), `null`. */
function entregaNova(anterior, atual, agoraMs) {
  const { passagem } = atual;
  if (!passagem || passagem.completedAt === (anterior.passagem?.completedAt ?? '')) return null;
  return entregaDe(passagem, agoraMs);
}

/** Começa quando a execução passa a `completed`, segue enquanto ela continuar assim. */
function comemoracaoDe(anterior, atual, agoraMs) {
  if (atual.execucao !== 'completed') return null;
  return anterior.execucao === 'completed' ? (anterior.animacao?.comemoracao ?? null) : { inicioMs: agoraMs };
}

/**
 * Compara duas leituras e devolve a atual com o que está animando. A página chama a cada leitura
 * (cada consulta ao servidor, cada passo da demonstração), e não só quando vai pintar: assim a
 * entrega que acontece com a aba oculta já aparece terminada na volta.
 * @param {object|null} anterior o que esta função devolveu na leitura anterior; `null` na primeira
 * @param {object} atual o modelo da leitura atual (de `montarPagina` ou `montarModelo`)
 * @param {number} agoraMs a hora desta leitura, em milissegundos, no mesmo relógio de `quadro`
 * @returns {object} `atual` mais `animacao` (`{ entrega, comemoracao }`) e `falas` · `entrega`:
 *   `{ deId, paraId, inicioMs }` desde que `passagem.completedAt` mudou entre duas leituras da
 *   mesma crew, ou `null`; uma passagem nova substitui a que está em curso (quem andava aparece
 *   sentado), e qualquer outra mudança de estado a deixa como está · `comemoracao`:
 *   `{ inicioMs }` desde que a execução passou a `completed`, ou `null` · `falas`: as falas
 *   fixas que ainda valem, `[{ id, texto, inicioMs }]` (ver `falasDaLeitura`) · na primeira
 *   leitura de uma crew (abrir, trocar de crew, sair da demonstração, voltar de "sem estado"),
 *   nada anima e ninguém fala · `animacao` só guarda quando cada coisa começou, e a entrega fica
 *   anotada depois de terminar: quem diz o que ainda se move num instante é `quadro`
 */
export function transicao(anterior, atual, agoraMs) {
  if (!mesmaCrew(anterior, atual)) return { ...atual, animacao: SEM_ANIMACAO, falas: SEM_FALAS };
  const emCurso = anterior.animacao?.entrega ?? null;
  return {
    ...atual,
    animacao: {
      entrega: entregaNova(anterior, atual, agoraMs) ?? emCurso,
      comemoracao: comemoracaoDe(anterior, atual, agoraMs),
    },
    falas: falasDaLeitura(anterior, atual, agoraMs),
  };
}

/**
 * "Rever entrega" (regra 7 da E3): a entrega da última passagem de bastão roda de novo, do início.
 * @param {object|null} leitura o que `transicao` devolveu
 * @param {number} agoraMs a hora do pedido, no mesmo relógio de `quadro`
 * @returns {object|null} a leitura com a entrega começando agora (a que estava em curso recomeça);
 *   sem passagem de bastão, a própria leitura, sem mudança
 */
export function rever(leitura, agoraMs) {
  if (!leitura?.passagem) return leitura;
  const animacao = { ...(leitura.animacao ?? SEM_ANIMACAO), entrega: entregaDe(leitura.passagem, agoraMs) };
  return { ...leitura, animacao };
}
