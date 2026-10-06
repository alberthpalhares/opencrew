// O modelo de uma leitura: do estado bruto de uma crew ao que a página desenha e escreve.
// A hora atual e o "reduzir movimento" entram por parâmetro; nada aqui lê relógio.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 18, 21, 24 e 29 (repositório do OpenCrew).
import { normalizar } from './modelo-estado.js';
import { verAgente } from './modelo-agentes.js';
import { textoFaixa, textoParada, textoPasso, textoSemSinal, titulo } from './modelo-textos.js';

const MINUTO = 60000;
/** Execução `running` sem atualização há mais que isto: a página diz há quanto tempo. */
export const PARADA_MS = 2 * MINUTO;
/** Há mais que isto: quem trabalhava recebe a ação `sem-sinal`. */
export const SEM_SINAL_MS = 20 * MINUTO;

/**
 * Regra 21. Só vale para execução `running`, fora da demonstração e com `updatedAt` válido.
 * Nada é regravado: são textos e uma ação derivados da idade, refeitos a cada leitura.
 */
function sinais(estado, { agoraMs, demo }) {
  const vale = !demo && estado.status === 'running' && estado.updatedAtMs !== null && Number.isFinite(agoraMs);
  const idade = vale ? agoraMs - estado.updatedAtMs : 0;
  const minutos = Math.floor(idade / MINUTO);
  return {
    parada: idade > PARADA_MS ? textoParada(minutos) : null,
    semSinal: idade > SEM_SINAL_MS ? textoSemSinal(minutos) : null,
  };
}

/** A última passagem de bastão, com o nome de quem entregou e de quem recebeu. */
function verPassagem({ handoff, agents }) {
  if (!handoff) return null;
  const nome = (id) => agents.find((a) => a.id === id)?.name ?? id;
  return {
    de: nome(handoff.from),
    para: nome(handoff.to),
    mensagem: handoff.message,
    deId: handoff.from,
    paraId: handoff.to,
    completedAt: handoff.completedAt,
  };
}

const SEM_ESTADO = Object.freeze({ semEstado: true, crew: '', execucao: null, passo: null, faixa: null, parada: null, passagem: null, motivo: null });

function verEstado(estado, { parada, semSinal }, reduzirMovimento) {
  const { current, total, label } = estado.step;
  const contagem = textoPasso(current, total);
  const contexto = { execucao: estado.status, semSinal, reduzirMovimento, balaoDoPasso: label || contagem };
  return {
    semEstado: false,
    crew: estado.crew,
    execucao: estado.status,
    passo: { atual: current, total, rotulo: label, contagem },
    faixa: estado.status === 'checkpoint' ? textoFaixa(label) : null,
    parada,
    agentes: estado.agents.map((agente, i) => verAgente(agente, i, contexto)),
    passagem: verPassagem(estado),
    motivo: estado.status === 'failed' && estado.motivo ? estado.motivo : null,
  };
}

/**
 * O que a página mostra de uma crew. Nunca lança erro e não altera o objeto recebido.
 * @param {unknown} bruto o estado como veio do servidor (ou da demonstração)
 * @param {object} [opcoes]
 * @param {number} [opcoes.agoraMs] a hora atual, em milissegundos; sem ela não há "sem sinal"
 * @param {boolean} [opcoes.reduzirMovimento] o sistema pede menos movimento
 * @param {boolean} [opcoes.demo] o estado é o da demonstração
 * @param {boolean} [opcoes.semConexao] a última consulta ao servidor falhou
 * @param {string} [opcoes.crew] o nome com que o servidor lista a crew; vale mais que o do estado
 * @returns {object} `{ semEstado, demo, semConexao, reduzirMovimento, titulo, crew, execucao,
 *   passo, faixa, parada, agentes, passagem, motivo }` · `semEstado`: a entrada não era um
 *   estado (aí `agentes` é vazio e o resto, `null`) · `execucao`: `running`, `checkpoint`,
 *   `completed` ou `failed` · `passo`: `{ atual, total, rotulo, contagem }` · `faixa`: o texto do
 *   checkpoint ou `null` · `parada`: "Última atualização há …" ou `null` · `agentes`: todos, na
 *   ordem do elenco (ver `verAgente`); é a lista ao lado do desenho, e quem tem `mesa` é
 *   desenhado · `passagem`: `{ de, para, mensagem, deId, paraId, completedAt }` ou `null` ·
 *   `motivo`: só em execução `failed`
 */
export function montarModelo(bruto, opcoes = {}) {
  const { reduzirMovimento = false, demo = false, semConexao = false } = opcoes;
  const base = { demo, semConexao, reduzirMovimento };
  const lido = normalizar(bruto);
  if (!lido) return { ...SEM_ESTADO, ...base, agentes: [], titulo: titulo(null) };
  const estado = { ...lido, crew: opcoes.crew || lido.crew };
  return {
    ...verEstado(estado, sinais(estado, opcoes), reduzirMovimento),
    ...base,
    titulo: titulo(estado, { demo, semConexao }),
  };
}
