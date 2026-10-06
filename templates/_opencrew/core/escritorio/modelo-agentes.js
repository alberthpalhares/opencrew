// O que cada agente mostra: a ação do boneco e o monitor (tabela da regra 18), o balão, a
// aparência e a linha dele na lista ao lado do desenho.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 18, 21 e 24 (repositório do OpenCrew).
import { mesaDe } from './modelo-mesas.js';
import { STATUS_TEXTO, TEXTOS } from './modelo-textos.js';

/** Cor da camisa de cada mesa, na ordem das mesas: 12 cores, nenhuma repetida. */
export const CAMISAS = Object.freeze([
  '#d95763', '#5b6ee1', '#fbf236', '#37946e',
  '#df7126', '#76428a', '#5fcde4', '#d77bba',
  '#99e550', '#3f3f74', '#cbdbfc', '#8a6f30',
]);
export const CABELOS = Object.freeze(['#222034', '#45283c', '#b0432b', '#f2c94c', '#9aa0a8', '#e9e4d8']);
export const PELES = Object.freeze(['#f2d3b1', '#e0ac69', '#c68642', '#8d5524', '#6b4226']);

/** Número fixo para cada texto (FNV-1a, 32 bits): o mesmo `id` dá sempre o mesmo. */
function semente(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Cores do boneco, em `#rrggbb`: a camisa vem da posição da mesa; cabelo e pele vêm do `id`,
 * e por isso não mudam quando o agente troca de mesa.
 * @param {string} id
 * @param {number} indiceDaMesa posição no elenco; fora das 12 mesas, `camisa` é `null`
 */
export function aparencia(id, indiceDaMesa) {
  const h = semente(String(id));
  return {
    camisa: CAMISAS[indiceDaMesa] ?? null,
    cabelo: CABELOS[h % CABELOS.length],
    pele: PELES[(h >>> 8) % PELES.length],
  };
}

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
 * @param {object} agente item de `agents` do estado normalizado
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
    aparencia: aparencia(agente.id, indice),
  };
}
