// O que cada agente mostra: a ação do boneco e o monitor (tabela da regra 18), o balão, a
// aparência (que `modelo-personagem.js` calcula) e a linha dele na lista ao lado do desenho.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 18, 21 e 24 (repositório do OpenCrew).
import { mesaDe } from './modelo-mesas.js';
import { aparencia } from './modelo-personagem.js';
import { STATUS_TEXTO, TEXTOS } from './modelo-textos.js';

// Monitor de cada ação (regra 18). `animado`: linhas correndo (aceso) ou piscando 1 vez por
// segundo (âmbar); o vermelho é fixo. `sem-sinal` é o desenho de `idle` com um "?" em cima.
const MONITOR = Object.freeze({
  idle: { cor: 'apagado' },
  working: { cor: 'aceso', animado: true },
  checkpoint: { cor: 'ambar', animado: true },
  done: { cor: 'apagado' },
  skipped: { cor: 'apagado' },
  failed: { cor: 'vermelho' },
  'sem-sinal': { cor: 'apagado' },
});

/** A ação é o status, menos para quem trabalha numa execução em checkpoint ou sem sinal. */
function acaoDe(status, contexto) {
  if (status !== 'working') return status;
  if (contexto.execucao === 'checkpoint') return 'idle';
  return contexto.semSinal ? 'sem-sinal' : 'working';
}

function balaoDe(acao, contexto) {
  if (acao === 'working') return contexto.balaoDoPasso;
  return acao === 'checkpoint' ? TEXTOS.aguardando : null;
}

/**
 * Um agente como a página o mostra.
 * @param {object} agente item de `agents` do estado normalizado (`personagem`, se a crew declarou)
 * @param {number} indice posição no elenco
 * @param {object} contexto `{ execucao, balaoDoPasso, semSinal, reduzirMovimento }`, em que
 *   `semSinal` é o texto "Sem sinal há …" ou `null`
 * @returns {object} `{ id, indice, nome, icone, status, statusTexto, label, acao, monitor,
 *   monitorAnimado, balao, mesa, aparencia }` · `status`: o do arquivo · `acao`: o que o boneco
 *   faz (`idle`, `working`, `checkpoint`, `done`, `skipped`, `failed` ou `sem-sinal`) ·
 *   `monitor`: `apagado`, `aceso`, `ambar` ou `vermelho` · `balao`: texto ou `null` · `mesa`:
 *   a de `MESAS`, ou `null` do 13º em diante
 */
export function verAgente(agente, indice, contexto) {
  const acao = acaoDe(agente.status, contexto);
  const { cor, animado = false } = MONITOR[acao];
  return {
    id: agente.id,
    indice,
    nome: agente.name,
    icone: agente.icon,
    status: agente.status,
    statusTexto: acao === 'sem-sinal' ? contexto.semSinal : STATUS_TEXTO[agente.status],
    label: agente.label,
    acao,
    monitor: cor,
    monitorAnimado: animado && !contexto.reduzirMovimento,
    balao: balaoDe(acao, contexto),
    mesa: mesaDe(indice),
    aparencia: aparencia(agente.id, indice, agente.personagem),
  };
}
