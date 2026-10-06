// Leitura do estado da execução (`crews/<crew>/state.json`) como ele chega do servidor: aceita o
// arquivo da 1.6.x e devolve sempre o mesmo formato, sem alterar o objeto recebido.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, §4 e regra 18 (repositório do OpenCrew).

/** Status de agente que a página conhece, na ordem da tabela da regra 18. */
export const STATUS_DE_AGENTE = Object.freeze(['idle', 'working', 'checkpoint', 'done', 'skipped', 'failed']);
export const STATUS_DE_EXECUCAO = Object.freeze(['running', 'checkpoint', 'completed', 'failed']);

const ehObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const inteiro = (valor, minimo) => (Number.isInteger(valor) && valor >= minimo ? valor : null);

function texto(valor) {
  if (typeof valor === 'string') return valor;
  return typeof valor === 'number' ? String(valor) : '';
}

/** `delivering` (arquivo antigo) vale como `done`; status desconhecido vale como `idle`. */
function statusDoAgente(valor) {
  if (valor === 'delivering') return 'done';
  return STATUS_DE_AGENTE.includes(valor) ? valor : 'idle';
}

function lerAgente(bruto, indice) {
  const id = texto(bruto.id) || `agente-${indice + 1}`;
  return {
    id,
    name: texto(bruto.name) || id,
    icon: texto(bruto.icon),
    status: statusDoAgente(bruto.status),
    label: texto(bruto.label),
  };
}

function lerPasso(bruto) {
  const passo = ehObjeto(bruto) ? bruto : {};
  return { current: inteiro(passo.current, 0) ?? 0, total: inteiro(passo.total, 1), label: texto(passo.label) };
}

function lerPassagem(bruto) {
  if (!ehObjeto(bruto) || !texto(bruto.from) || !texto(bruto.to)) return null;
  return { from: texto(bruto.from), to: texto(bruto.to), message: texto(bruto.message), completedAt: texto(bruto.completedAt) };
}

function lerData(valor) {
  const ms = typeof valor === 'string' ? Date.parse(valor) : Number.NaN;
  return Number.isFinite(ms) ? ms : null;
}

/**
 * O estado bruto, conferido campo a campo. Nunca lança erro.
 * @param {unknown} bruto o conteúdo de um `state.json`
 * @returns {object|null} `null` ("sem estado") quando a entrada não é objeto ou `agents` não é
 *   lista; senão `{ crew, status, step: { current, total, label }, agents: [{ id, name, icon,
 *   status, label }], handoff, motivo, updatedAtMs }` · `status`: execução `idle` (1.6.x) ou
 *   desconhecida vale como `running` · `step.total` e `updatedAtMs`: `null` quando vazios ou
 *   inválidos · `handoff`: `{ from, to, message, completedAt }` ou `null` · item de `agents`
 *   que não é objeto fica de fora
 */
export function normalizar(bruto) {
  if (!ehObjeto(bruto) || !Array.isArray(bruto.agents)) return null;
  return {
    crew: texto(bruto.crew),
    status: STATUS_DE_EXECUCAO.includes(bruto.status) ? bruto.status : 'running',
    step: lerPasso(bruto.step),
    agents: bruto.agents.filter(ehObjeto).map(lerAgente),
    handoff: lerPassagem(bruto.handoff),
    motivo: texto(bruto.motivo),
    updatedAtMs: lerData(bruto.updatedAt),
  };
}
