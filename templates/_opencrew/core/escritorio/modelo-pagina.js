// Qual crew está na tela: a memória das consultas ao servidor (o último estado bom de cada
// crew), a escolha do usuário e a hora de mostrar a demonstração. Cada função devolve uma
// memória nova; a página guarda a mais recente e pergunta de novo a cada consulta.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 20, 22 e 23 (repositório do OpenCrew).
import { estadoDaDemo } from './demo.js';
import { normalizar } from './modelo-estado.js';
import { TEXTOS } from './modelo-textos.js';
import { montarModelo } from './modelo-visao.js';

/** Crew que some de uma resposta válida continua por este número de consultas; na seguinte, sai. */
export const CONSULTAS_DE_ESPERA = 3;

/**
 * A memória antes da primeira consulta: `crews` é `[{ crew, estado, atualizadoMs, faltas }]`, a
 * de atualização mais recente primeiro (`estado` é o bruto, como veio); `escolhida` é o nome da
 * crew que o usuário escolheu, ou `null`; `falhas` conta as consultas seguidas que falharam.
 */
export const MEMORIA_INICIAL = Object.freeze({ crews: Object.freeze([]), escolhida: null, falhas: 0 });

/** As crews de uma resposta de `/estado`, só as de estado legível; `null` se a resposta é inválida. */
function lerResposta(resposta) {
  if (resposta === null || typeof resposta !== 'object' || !Array.isArray(resposta.crews)) return null;
  const lidas = [];
  for (const item of resposta.crews) {
    const lido = normalizar(item?.estado);
    const nome = typeof item?.crew === 'string' ? item.crew : '';
    if (lido && nome) lidas.push({ crew: nome, estado: item.estado, atualizadoMs: lido.updatedAtMs ?? 0, faltas: 0 });
  }
  return lidas;
}

/**
 * Junta uma consulta à memória (regra 20).
 * @param {object} memoria a memória anterior
 * @param {unknown} resposta o JSON de `/estado`; `null` (ou qualquer coisa inválida) quando a
 *   consulta falhou: aí tudo fica como estava e `falhas` sobe
 * @returns {object} a memória nova; a crew ausente continua, com o último estado bom, por
 *   `CONSULTAS_DE_ESPERA` respostas válidas seguidas, e a escolha do usuário cai quando a crew sai
 */
export function consultar(memoria, resposta) {
  const vindas = lerResposta(resposta);
  if (!vindas) return { ...memoria, falhas: memoria.falhas + 1 };
  const presentes = new Set(vindas.map((c) => c.crew));
  const ausentes = memoria.crews
    .filter((c) => !presentes.has(c.crew) && c.faltas < CONSULTAS_DE_ESPERA)
    .map((c) => ({ ...c, faltas: c.faltas + 1 }));
  const crews = [...vindas, ...ausentes].sort((a, b) => b.atualizadoMs - a.atualizadoMs);
  const escolhida = crews.some((c) => c.crew === memoria.escolhida) ? memoria.escolhida : null;
  return { crews, escolhida, falhas: 0 };
}

/** O usuário escolheu uma crew no seletor (regra 22); nome que não está na memória é ignorado. */
export function escolher(memoria, crew) {
  return memoria.crews.some((c) => c.crew === crew) ? { ...memoria, escolhida: crew } : memoria;
}

/**
 * O que vai para a tela (regras 22 e 23).
 * @param {object} memoria
 * @param {{ demo?: boolean }} [opcoes] `demo`: o endereço tem `?demo`
 * @returns {{ modo: 'demo'|'real', crew: string|null, estado: object|null, crews: string[], frase: string|null }}
 *   `real`: a crew escolhida pelo usuário ou, sem escolha, a de atualização mais recente, com o
 *   estado bruto dela; `crews` são os nomes para o seletor · `demo`: sem nenhuma crew, ou com
 *   `?demo` (aí sem seletor); `frase` é a da §6 para cada caso
 */
export function emExibicao(memoria, { demo = false } = {}) {
  const semCrew = { modo: 'demo', crew: null, estado: null };
  if (demo) return { ...semCrew, crews: [], frase: TEXTOS.demoForcada };
  const crews = memoria.crews.map((c) => c.crew);
  if (!crews.length) return { ...semCrew, crews, frase: TEXTOS.demonstracao };
  const atual = memoria.crews.find((c) => c.crew === memoria.escolhida) ?? memoria.crews[0];
  return { modo: 'real', crew: atual.crew, estado: atual.estado, crews, frase: null };
}

/**
 * A página inteira num instante: escolhe a crew (ou a demonstração) e monta o modelo dela.
 * @param {object} memoria
 * @param {object} [opcoes]
 * @param {number} [opcoes.agoraMs] a hora atual, em milissegundos
 * @param {boolean} [opcoes.reduzirMovimento] o sistema pede menos movimento
 * @param {boolean} [opcoes.demo] o endereço tem `?demo`
 * @param {number} [opcoes.decorridoDemoMs] tempo desde que a demonstração entrou na tela
 * @returns {object} o modelo de `montarModelo`, mais `modo` (`demo` ou `real`), `crews` (nomes
 *   para o seletor), `frase` (a da demonstração, ou `null`) e `aviso` (o "sem conexão" da §6,
 *   ou `null`)
 */
export function montarPagina(memoria, opcoes = {}) {
  const { agoraMs, reduzirMovimento = false, decorridoDemoMs = 0 } = opcoes;
  const { modo, crew, estado, crews, frase } = emExibicao(memoria, opcoes);
  const demo = modo === 'demo';
  const semConexao = memoria.falhas > 0;
  const modelo = montarModelo(demo ? estadoDaDemo(decorridoDemoMs) : estado, { agoraMs, reduzirMovimento, demo, semConexao, crew });
  return { ...modelo, modo, crews, frase, aviso: semConexao ? TEXTOS.semServidor : null };
}
