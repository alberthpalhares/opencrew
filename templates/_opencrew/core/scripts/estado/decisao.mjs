// O que fazer com um evento: aplicar, montar o estado de novo antes, ou ignorar. Puro, como o
// núcleo: recebe o estado lido (ou `null`) e o evento, não toca em disco.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 5 e §6 (repositório do OpenCrew).
import { proximoEstado } from './nucleo.mjs';

/** Os motivos de `ESTADO:IGNORADO` (o texto depois do travessão). */
export const MOTIVO = {
  desligado: 'escritório desligado (ligue com /opencrew dashboard)',
  semElenco: 'crew-party.csv ausente ou sem agentes',
  agenteDesconhecido: (id, ids) => `agente "${id}" não está no elenco da crew. Ids válidos: ${ids.join(', ')}`,
  pularSemAgente: (ids) => `o evento pular precisa de --agente. Ids válidos: ${ids.join(', ')}`,
  semEstado: 'sem estado desta execução',
  naoGravou: 'não foi possível gravar o estado',
  inesperado: (erro) => `erro inesperado: ${erro?.message ?? erro}`,
};

const USAM_AGENTE = ['passo', 'checkpoint', 'pular'];
/** Eventos que montam o estado quando ele falta; os outros são ignorados sem ele. */
const MONTAM = ['iniciar', 'passo', 'checkpoint'];
const ENCERRADA = ['completed', 'failed'];

function motivoParaIgnorar(anterior, { tipo, agente, elenco }) {
  const ids = elenco.map((a) => a.id);
  if (!ids.length) return MOTIVO.semElenco;
  const pedeAgente = USAM_AGENTE.includes(tipo);
  if (pedeAgente && agente && !ids.includes(agente)) return MOTIVO.agenteDesconhecido(agente, ids);
  if (tipo === 'pular' && !agente) return MOTIVO.pularSemAgente(ids);
  return anterior || MONTAM.includes(tipo) ? null : MOTIVO.semEstado;
}

/**
 * `passo` e `checkpoint` montam o estado de novo quando ele falta ou está ilegível, quando o
 * `passo --n 1` chega sobre uma execução encerrada, e quando o agente do evento está no elenco
 * mas não no estado gravado (elenco editado sem um `iniciar` depois).
 */
function pedeRecriar(anterior, { tipo, n, agente }) {
  if (tipo !== 'passo' && tipo !== 'checkpoint') return false;
  if (!anterior) return true;
  if (tipo === 'passo' && n === 1 && ENCERRADA.includes(anterior.status)) return true;
  return Boolean(agente) && !anterior.agents.some((a) => a?.id === agente);
}

/**
 * @param {object|null} anterior o estado lido do `state.json`; `null` se falta ou está ilegível
 * @param {object} evento o evento do núcleo, sempre com `crew`, `elenco` e `agora`
 * @returns {{ ignorado: string } | { estado: object, recriado: boolean }} o motivo para não
 *   mexer em nada, ou o estado a gravar (`recriado`: foi montado de novo, como no `iniciar`,
 *   herdando só o `step.total`)
 */
export function decidir(anterior, evento) {
  const motivo = motivoParaIgnorar(anterior, evento);
  if (motivo) return { ignorado: motivo };
  const recriado = pedeRecriar(anterior, evento);
  const base = recriado ? proximoEstado(null, { ...evento, tipo: 'iniciar', passos: anterior?.step?.total }) : anterior;
  return { estado: proximoEstado(base, evento), recriado };
}
