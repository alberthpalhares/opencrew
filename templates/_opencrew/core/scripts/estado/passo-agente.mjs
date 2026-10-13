// De quem é o passo: o agente que o arquivo do passo nomeia em `agent:`. O runner passa o agente
// em `--agente`; quando ele vem trocado (o de outro passo), o escritório mostraria a pessoa errada
// trabalhando. Aqui o passo K da execução é achado na crew, e o agente dele é o que vale.
// Só lê. Na dúvida, não corrige: devolve `null` e vale o que o runner passou.
// Spec: fase-e4-robustez-do-escritorio.md, regras 12 e 13 (repositório do OpenCrew).
import path from 'node:path';
import { idDoAgente, lerCrew } from '../conserto/crew.mjs';

/** Os passos da crew, na ordem; `[]` quando ela não pôde ser lida. */
function passosDaCrew(raiz, crew) {
  try {
    return lerCrew(raiz, path.join('crews', crew)).passos;
  } catch {
    return [];
  }
}

/**
 * O agente do passo `n` da execução em curso. `n` conta só os passos que rodam: os de agente
 * pulado (`skipped` no estado) ficam de fora. Só responde quando os passos que sobram são
 * exatamente `step.total` — é o que garante que `n` aponta para o passo certo.
 * @param {object} o
 * @param {string} o.raiz pasta do projeto · @param {string} o.crew nome da crew
 * @param {object|null} o.estado o `state.json` lido · @param {number|null} o.n o `--n` do evento
 * @param {string[]} o.ids os ids do elenco
 * @returns {{ agente: string|null }|null} o agente do passo (`null`: passo sem `agent:`), ou
 *   `null` quando não dá para saber (sem `n`, sem total, contagem que não bate, agente do passo
 *   fora do elenco)
 */
export function agenteDoPasso({ raiz, crew, estado, n, ids }) {
  const total = estado?.step?.total;
  if (!n || !total || !Array.isArray(estado.agents)) return null;
  const pulados = new Set(estado.agents.filter((a) => a?.status === 'skipped').map((a) => a.id));
  const rodam = passosDaCrew(raiz, crew).filter((passo) => !pulados.has(idDoAgente(passo)));
  if (rodam.length !== total || !rodam[n - 1]) return null;
  const agente = idDoAgente(rodam[n - 1]) || null;
  return agente && !ids.includes(agente) ? null : { agente };
}
