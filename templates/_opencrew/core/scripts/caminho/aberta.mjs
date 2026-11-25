// Antes de abrir outra execução, avisa se a crew tem um vínculo recente com uma sessão.
// Um registro sozinho continua retomável e não impede que uma nova sessão comece.
// Spec: fase-e4-robustez-do-escritorio.md, regra 8 (repositório do OpenCrew).
import path from 'node:path';
import { PEDIDO } from '../execucao/registro.mjs';
import { registrosDe } from '../execucao/retomar.mjs';
import { lerJsonDentro } from '../escritorio/leitura.mjs';
import { SEM_EVENTO_MS, ultimaAtividade } from '../escritorio/vigia.mjs';

async function atividadeComVinculo(raiz, crew, registro) {
  const pasta = path.join(raiz, 'crews', crew, 'output', registro.run);
  const visual = await lerJsonDentro(raiz, pasta, path.join(pasta, 'estado-escritorio.json'));
  if (visual?.runId !== registro.run || !visual.sessao || visual.desvinculadoEm) return null;
  const em = ultimaAtividade(registro, visual);
  return em === null ? null : { run: registro.run, tema: registro.tema, em };
}

/**
 * A execução aberta da crew com atividade mais recente, se foi dentro da janela. Pedido avulso não conta.
 * @param {string} raiz pasta do projeto · @param {string} crew · @param {Date} agora
 * @returns {Promise<{ run: string, tema: string, minutos: number }|null>}
 */
export async function abertaRecente(raiz, crew, agora) {
  const abertas = (await registrosDe(raiz, crew)).filter((r) => r.status === 'aberta' && r.tipo !== PEDIDO);
  const vinculadas = await Promise.all(abertas.map((registro) => atividadeComVinculo(raiz, crew, registro)));
  const [ultima] = vinculadas.filter(Boolean).sort((a, b) => b.em - a.em);
  const parada = ultima ? agora.getTime() - ultima.em : Infinity;
  return parada < SEM_EVENTO_MS ? { run: ultima.run, tema: ultima.tema, minutos: Math.max(0, Math.round(parada / 60_000)) } : null;
}

/** O que `pasta` responde no lugar de criar a execução: a instrução para a IA e, por último, a linha que o runner lê. */
export const linhasDaAberta = (crew, { run, tema, minutos }) => [
  `A crew ${crew} já tem uma execução aberta: ${run}${tema ? ` (${tema})` : ''}, com atividade há ${minutos} min.`,
  'Essa execução ainda tem um vínculo recente com uma sessão.',
  `Pergunte ao usuário: continuar aquela (/opencrew retomar ${crew}) ou abrir outra (repita este comando com --nova).`,
  `CAMINHO:ABERTA ${run}`,
];
