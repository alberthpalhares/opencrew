// Demonstração do escritório (regra 23): um roteiro fixo e uma função pura que devolve o estado
// de cada instante, no formato do `state.json`. O roteiro passa por todos os status de agente,
// por um checkpoint, por três passagens de bastão, por uma falha e pela execução concluída, e
// recomeça. A página o desenha pelo mesmo caminho de uma execução de verdade.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 18 e 23 (repositório do OpenCrew).

const ELENCO = [
  { id: 'pesquisa', name: 'Pedro Pesquisa', icon: '🔎' },
  { id: 'redacao', name: 'Rita Redação', icon: '✍️' },
  { id: 'design', name: 'Davi Design', icon: '🎨' },
  { id: 'revisao', name: 'Renata Revisão', icon: '🧐' },
  { id: 'social', name: 'Sara Social', icon: '📣' },
];

const [I, W, C, D, S, F] = ['idle', 'working', 'checkpoint', 'done', 'skipped', 'failed'];

// Cada cena: duração, status da execução, passo (`n` e `rotulo`) e o status de cada agente, na
// ordem do elenco. `passagem` ([de, para, mensagem]) marca a cena em que o bastão troca de mão.
const CENAS = [
  { ms: 3000, status: 'running', n: 0, rotulo: '', agentes: [I, I, I, I, S] },
  { ms: 6000, status: 'running', n: 1, rotulo: 'Pesquisar o tema', agentes: [W, I, I, I, S] },
  { ms: 5000, status: 'checkpoint', n: 1, rotulo: 'Aprovar a pauta', agentes: [C, I, I, I, S] },
  { ms: 7000, status: 'running', n: 2, rotulo: 'Escrever o texto', agentes: [D, W, I, I, S], passagem: ['pesquisa', 'redacao', 'Pauta aprovada, com três fontes.'] },
  { ms: 7000, status: 'running', n: 3, rotulo: 'Criar a imagem', agentes: [D, D, W, I, S], passagem: ['redacao', 'design', 'Texto pronto, com título e chamada.'] },
  { ms: 5000, status: 'failed', n: 3, rotulo: 'Criar a imagem', agentes: [D, D, F, I, S], motivo: 'Sem acesso ao banco de imagens.' },
  { ms: 6000, status: 'running', n: 3, rotulo: 'Criar a imagem', agentes: [D, D, W, I, S] },
  { ms: 7000, status: 'running', n: 4, rotulo: 'Revisar tudo', agentes: [D, D, D, W, S], passagem: ['design', 'revisao', 'Imagem pronta, no formato do post.'] },
  { ms: 8000, status: 'completed', n: 4, rotulo: 'Revisar tudo', agentes: [D, D, D, D, S] },
];

/** O roteiro, como dado: o elenco e as cenas, na ordem. */
export const ROTEIRO = Object.freeze({ crew: 'crew-de-exemplo', total: 4, agentes: ELENCO, cenas: CENAS });

const INICIOS = CENAS.map((_, i) => CENAS.slice(0, i).reduce((soma, cena) => soma + cena.ms, 0));
/** Duração de uma volta do roteiro. */
export const DURACAO_DEMO_MS = INICIOS.at(-1) + CENAS.at(-1).ms;
// Data fixa das passagens: só precisa mudar de uma passagem para a outra.
const BASE = Date.UTC(2026, 0, 5, 9);

/** Índice da cena em que cai o instante; o roteiro recomeça ao chegar ao fim. */
function cenaEm(decorridoMs) {
  const t = Number.isFinite(decorridoMs) && decorridoMs > 0 ? decorridoMs % DURACAO_DEMO_MS : 0;
  return INICIOS.findLastIndex((inicio) => inicio <= t);
}

/** O `label` do agente: o rótulo do último passo em que ele trabalhou, até a cena `ate`. */
function rotuloDe(agente, ate) {
  const feitas = CENAS.slice(0, ate + 1).filter((cena) => cena.agentes[agente] === W);
  return feitas.length ? feitas.at(-1).rotulo : '';
}

/** A última passagem de bastão até a cena `ate`, no formato do `handoff`. */
function passagemAte(ate) {
  const cena = CENAS.slice(0, ate + 1).findLastIndex((c) => c.passagem);
  if (cena < 0) return null;
  const [from, to, message] = CENAS[cena].passagem;
  return { from, to, message, completedAt: new Date(BASE + INICIOS[cena]).toISOString() };
}

/**
 * O estado da demonstração num instante. Mesmo instante, mesmo estado; depois de
 * `DURACAO_DEMO_MS` o roteiro recomeça. Vem sem `updatedAt`: a demonstração nunca fica "sem sinal".
 * @param {number} decorridoMs tempo desde que a demonstração começou (inválido vale como 0)
 * @returns {object} um estado no formato do `state.json`
 */
export function estadoDaDemo(decorridoMs) {
  const indice = cenaEm(decorridoMs);
  const cena = CENAS[indice];
  return {
    crew: ROTEIRO.crew,
    status: cena.status,
    step: { current: cena.n, total: ROTEIRO.total, label: cena.rotulo },
    agents: ELENCO.map((agente, i) => ({ ...agente, status: cena.agentes[i], label: rotuloDe(i, indice) })),
    handoff: passagemAte(indice),
    ...(cena.motivo ? { motivo: cena.motivo } : {}),
    updatedAt: null,
  };
}
