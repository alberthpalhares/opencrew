// O que anima (regra 28): a passagem de bastão e a comemoração nascem da diferença entre duas
// leituras da mesma crew, nunca de um status gravado. `transicao` anota no modelo a hora em que
// cada uma começou; `quadro` (em quadro.js) desenha pelo tempo decorrido desde então.
// Puro: sem DOM, sem relógio, sem rede. A hora entra por parâmetro.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 28 (repositório do OpenCrew).

/** A entrega: ida até a frente da mesa de quem recebe, com o papel, e volta até sentar. */
export const IDA_MS = 2000;
export const VOLTA_MS = 2000;
/** Quanto dura a comemoração de uma execução concluída. */
export const COMEMORACAO_MS = 4000;
/** Quem digita troca de pose a cada 0,3 s; quem anda, a cada 0,15 s. */
export const DIGITAR_MS = 300;
export const ANDAR_MS = 150;

/** Nada em curso: é o que vale na primeira leitura de cada crew. */
export const SEM_ANIMACAO = Object.freeze({ entrega: null, comemoracao: null });

/** As duas leituras têm estado e são da mesma crew (ou as duas são da demonstração). */
function mesmaCrew(anterior, atual) {
  if (!anterior || !atual || anterior.semEstado || atual.semEstado) return false;
  return Boolean(anterior.demo) === Boolean(atual.demo) && anterior.crew === atual.crew;
}

/** A passagem de bastão cuja data a leitura anterior não trazia; senão (ou sem data), `null`. */
function entregaNova(anterior, atual, agoraMs) {
  const { passagem } = atual;
  if (!passagem || passagem.completedAt === (anterior.passagem?.completedAt ?? '')) return null;
  return { deId: passagem.deId, paraId: passagem.paraId, inicioMs: agoraMs };
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
 * @returns {object} `atual` mais `animacao`: `{ entrega, comemoracao }` · `entrega`:
 *   `{ deId, paraId, inicioMs }` desde que `passagem.completedAt` mudou entre duas leituras da
 *   mesma crew, ou `null`; uma passagem nova substitui a que está em curso, e qualquer outra
 *   mudança de estado a deixa como está · `comemoracao`: `{ inicioMs }` desde que a execução
 *   passou a `completed`, ou `null` · na primeira leitura de uma crew (abrir, trocar de crew,
 *   sair da demonstração, voltar de "sem estado"), as duas são `null` · `animacao` só guarda
 *   quando cada uma começou, e a entrega fica anotada depois de terminar: quem diz o que ainda
 *   se move num instante é `quadro`
 */
export function transicao(anterior, atual, agoraMs) {
  if (!mesmaCrew(anterior, atual)) return { ...atual, animacao: SEM_ANIMACAO };
  const emCurso = anterior.animacao?.entrega ?? null;
  return {
    ...atual,
    animacao: {
      entrega: entregaNova(anterior, atual, agoraMs) ?? emCurso,
      comemoracao: comemoracaoDe(anterior, atual, agoraMs),
    },
  };
}
