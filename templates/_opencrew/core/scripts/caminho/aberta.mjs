// A crew já tem uma execução aberta e recente? O painel do escritório (`state.json`) é um só por
// crew: uma segunda execução, aberta por outra conversa, escreve por cima do que a primeira mostra.
// Antes de abrir outra, `caminho.mjs pasta` devolve o que está aqui, e o usuário decide. Só lê.
// Spec: fase-e4-robustez-do-escritorio.md, regra 8 (repositório do OpenCrew).
import { PEDIDO } from '../execucao/registro.mjs';
import { registrosDe } from '../execucao/retomar.mjs';

/** Execução parada há mais tempo que isto não barra uma nova (ela continua no `/opencrew retomar`). */
const JANELA_MS = 2 * 60 * 60 * 1000;

/** A última atividade de uma execução: o mais recente entre o início, os passos conferidos e os marcos. */
function ultimaAtividade(registro) {
  const horas = [registro.iniciadaEm, ...registro.passos.map((p) => p.em), ...registro.marcos.map((m) => m.em)];
  return Math.max(-Infinity, ...horas.map((hora) => Date.parse(hora)).filter(Number.isFinite));
}

/**
 * A execução aberta da crew com atividade mais recente, se foi dentro da janela. Pedido avulso não conta.
 * @param {string} raiz pasta do projeto · @param {string} crew · @param {Date} agora
 * @returns {Promise<{ run: string, tema: string, minutos: number }|null>}
 */
export async function abertaRecente(raiz, crew, agora) {
  const abertas = (await registrosDe(raiz, crew)).filter((r) => r.status === 'aberta' && r.tipo !== PEDIDO);
  const [ultima] = abertas.map((r) => ({ run: r.run, tema: r.tema, em: ultimaAtividade(r) })).sort((a, b) => b.em - a.em);
  const parada = ultima ? agora.getTime() - ultima.em : Infinity;
  return parada < JANELA_MS ? { run: ultima.run, tema: ultima.tema, minutos: Math.max(0, Math.round(parada / 60_000)) } : null;
}

/** O que `pasta` responde no lugar de criar a execução: a instrução para a IA e, por último, a linha que o runner lê. */
export const linhasDaAberta = (crew, { run, tema, minutos }) => [
  `A crew ${crew} já tem uma execução aberta: ${run}${tema ? ` (${tema})` : ''}, com atividade há ${minutos} min.`,
  'O painel do escritório é um só por crew: duas execuções ao mesmo tempo se misturam nele.',
  `Pergunte ao usuário: continuar aquela (/opencrew retomar ${crew}) ou abrir outra (repita este comando com --nova).`,
  `CAMINHO:ABERTA ${run}`,
];
