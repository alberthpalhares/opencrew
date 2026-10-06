// Núcleo puro do estado da execução: (estado, evento) → estado novo. Não lê relógio nem disco:
// a hora chega em `evento.agora` e o elenco em `evento.elenco`. O estado recebido nunca é alterado.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 1 e 2 e §4 (repositório do OpenCrew).

/** Agente que ainda não entregou. `delivering` só existe em arquivo da 1.6.x. */
const ATIVOS = ['working', 'checkpoint', 'delivering'];
/** Quem o `falhar` derruba. */
const EM_CURSO = ['working', 'checkpoint'];

const texto = (v) => (typeof v === 'string' ? v : '');
const aPartirDe = (minimo, v) => (Number.isInteger(v) && v >= minimo ? v : null);

function agenteNormal(a) {
  return { id: texto(a?.id), name: texto(a?.name), icon: texto(a?.icon), status: texto(a?.status) || 'idle', label: texto(a?.label) };
}

/** O estado lido, no formato de hoje: agentes sem `desk` e com `label`, `step` completo. */
function normalizar(e) {
  const { step, handoff } = e;
  return {
    ...e,
    crew: texto(e.crew),
    status: texto(e.status),
    step: { current: aPartirDe(0, step?.current) ?? 0, total: aPartirDe(1, step?.total), label: texto(step?.label) },
    agents: (Array.isArray(e.agents) ? e.agents : []).map(agenteNormal),
    handoff: handoff && typeof handoff === 'object' ? handoff : null,
    startedAt: e.startedAt ?? null,
  };
}

/** Só os campos da §4, na ordem dela; o que é de um status só não sobrevive a ele. */
function fechar(e, agora) {
  return {
    crew: e.crew,
    status: e.status,
    step: e.step,
    agents: e.agents,
    handoff: e.handoff,
    ...(e.status === 'failed' ? { motivo: texto(e.motivo) } : {}),
    startedAt: e.startedAt,
    updatedAt: agora,
    ...(e.status === 'completed' ? { completedAt: e.completedAt } : {}),
    ...(e.status === 'failed' ? { failedAt: e.failedAt } : {}),
  };
}

const trocar = (agents, quem, status) => agents.map((a) => (quem(a) ? { ...a, status } : a));

/** `--n` grava `step.current`; `--rotulo` grava `step.label` (sem ele: vazio). */
const comPasso = (step, { n, rotulo }) => ({ ...step, current: aPartirDe(1, n) ?? step.current, label: texto(rotulo) });

function iniciar(_anterior, { crew, elenco, passos, agora }) {
  return {
    crew: texto(crew),
    status: 'running',
    step: { current: 0, total: aPartirDe(1, passos), label: '' },
    agents: elenco.map((a) => agenteNormal({ ...a, status: 'idle', label: '' })),
    handoff: null,
    startedAt: agora,
  };
}

function passo(estado, evento) {
  const base = { ...estado, status: 'running', step: comPasso(estado.step, evento) };
  const alvo = evento.agente ? estado.agents.find((a) => a.id === evento.agente) : null;
  if (!alvo) return base;
  const outros = estado.agents.filter((a) => a !== alvo && ATIVOS.includes(a.status));
  const agents = estado.agents.map((a) => {
    if (a === alvo) return { ...a, status: 'working', label: texto(evento.rotulo) };
    return outros.includes(a) ? { ...a, status: 'done' } : a;
  });
  const bastao = { from: outros[0]?.id, to: alvo.id, message: texto(evento.mensagem), completedAt: evento.agora };
  return { ...base, agents, handoff: outros.length ? bastao : estado.handoff };
}

function checkpoint(estado, evento) {
  const agents = evento.agente ? trocar(estado.agents, (a) => a.id === evento.agente, 'checkpoint') : estado.agents;
  return { ...estado, status: 'checkpoint', step: comPasso(estado.step, evento), agents };
}

function pular(estado, { agente }) {
  return { ...estado, agents: agente ? trocar(estado.agents, (a) => a.id === agente, 'skipped') : estado.agents };
}

function concluir(estado, { agora }) {
  return { ...estado, status: 'completed', completedAt: agora, agents: trocar(estado.agents, (a) => a.status !== 'skipped', 'done') };
}

function falhar(estado, { motivo, agora }) {
  const agents = trocar(estado.agents, (a) => EM_CURSO.includes(a.status), 'failed');
  return { ...estado, status: 'failed', failedAt: agora, motivo: texto(motivo), agents };
}

const TRANSICOES = { iniciar, passo, checkpoint, pular, concluir, falhar };

/** Os seis eventos da regra 2, na ordem em que o runner os usa. */
export const EVENTOS = Object.keys(TRANSICOES);

/**
 * O estado depois do evento.
 * @param {object|null} estado o estado atual, como está no `state.json` (da 1.6.x também); o
 *   `iniciar` não o lê
 * @param {object} evento `{ tipo, agora, … }` · `tipo`: um dos `EVENTOS` · `agora`: a hora, em ISO
 *   · no `iniciar`: `crew`, `elenco` (`[{ id, name, icon }]`) e `passos` · nos outros, conforme o
 *   evento: `n`, `agente`, `rotulo`, `mensagem`, `motivo`. Agente que não está no estado vale como
 *   evento sem agente.
 * @returns {object} o estado novo, no formato da §4 da spec (`step.total` vazio é `null`)
 */
export function proximoEstado(estado, evento) {
  if (!Object.hasOwn(TRANSICOES, evento.tipo)) throw new Error(`Evento desconhecido: ${evento.tipo}`);
  const atual = evento.tipo === 'iniciar' ? null : normalizar(estado);
  return fechar(TRANSICOES[evento.tipo](atual, evento), evento.agora);
}
