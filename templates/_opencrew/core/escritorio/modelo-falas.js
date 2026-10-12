// As falas fixas (regra 3 da E3) e o lugar do balão de fala na cena (regra 4). Uma fala fixa
// nasce quando o status de um agente muda entre duas leituras: quem começa a trabalhar diz o
// rótulo do passo; quando a execução é concluída, quem trabalhava diz "Pronto!"; quem falha diz
// "Deu problema.". Cada uma dura 3 s. O checkpoint não é fala: continua o balão de status.
// A fala da entrega e a resposta de quem recebe saem do tempo da entrega, em `quadro.js`.
// Puro: sem DOM, sem relógio, sem rede. A hora entra por parâmetro.
// Spec: fase-e3-conversa-e-entrega.md, regras 3 a 5 (repositório do OpenCrew).
import { BONECO } from './modelo-mesas.js';
import { FALAS, cortarFala } from './modelo-textos.js';

/** Quanto dura uma fala fixa. */
export const FALA_FIXA_MS = 3000;
/** Folga entre o balão de fala e a cabeça de quem fala, em pixels lógicos. */
const FOLGA = 2;
/** Altura, em pixels lógicos, que o nome ocupa sob a mesa: o balão de fala não entra nela. */
const FAIXA_DO_NOME = 6;

/** Quem diz "Pronto!": quem trabalhava na leitura anterior; senão, o último que concluiu. */
function quemConcluiu(anterior, atual) {
  const trabalhavam = new Set(anterior.agentes.filter((a) => a.status === 'working').map((a) => a.id));
  const comMesa = atual.agentes.filter((a) => a.mesa);
  return comMesa.findLast((a) => trabalhavam.has(a.id)) ?? comMesa.findLast((a) => a.status === 'done') ?? null;
}

/** As falas que esta leitura dispara: `[id, texto]` de cada uma. */
function disparadas(anterior, atual) {
  const antes = new Map(anterior.agentes.map((a) => [a.id, a.status]));
  const novas = [];
  for (const agente of atual.agentes.filter((a) => a.mesa && antes.has(a.id))) {
    const mudou = antes.get(agente.id) !== agente.status;
    if (mudou && agente.acao === 'working' && agente.balao) novas.push([agente.id, cortarFala(agente.balao)]);
    if (mudou && agente.status === 'failed') novas.push([agente.id, FALAS.problema]);
  }
  const concluiu = atual.execucao === 'completed' && anterior.execucao !== 'completed' ? quemConcluiu(anterior, atual) : null;
  return concluiu ? [...novas.filter(([id]) => id !== concluiu.id), [concluiu.id, FALAS.pronto]] : novas;
}

/**
 * As falas fixas que valem depois de uma leitura.
 * @param {object} anterior a leitura anterior da mesma crew (com as `falas` dela)
 * @param {object} atual o modelo da leitura atual
 * @param {number} agoraMs a hora desta leitura
 * @returns {{ id: string, texto: string, inicioMs: number }[]} as que esta leitura dispara, mais
 *   as anteriores que ainda não completaram `FALA_FIXA_MS` (a fala nova de um agente substitui a
 *   antiga dele) · só fala quem tem mesa
 */
export function falasDaLeitura(anterior, atual, agoraMs) {
  const novas = disparadas(anterior, atual).map(([id, texto]) => ({ id, texto, inicioMs: agoraMs }));
  const calados = new Set(novas.map((fala) => fala.id));
  const emCurso = (anterior.falas ?? []).filter((fala) => agoraMs - fala.inicioMs < FALA_FIXA_MS && !calados.has(fala.id));
  return [...emCurso, ...novas];
}

/** O texto da fala fixa de um agente num instante, ou `null`. */
export function falaFixa(falas, id, agoraMs) {
  const fala = (falas ?? []).find((f) => f.id === id && agoraMs >= f.inicioMs && agoraMs - f.inicioMs < FALA_FIXA_MS);
  return fala ? fala.texto : null;
}

/**
 * Onde cabe o balão de fala de um boneco (regra 4): sobre a cabeça dele, sem sair da cena e sem
 * entrar na faixa do nome de mesa nenhuma.
 * @param {{ x: number, y: number, sentado?: boolean, mesa?: object }} boneco um boneco de `quadro`
 * @param {object} sala a sala em uso (uma de `SALAS`)
 * @returns {{ x: number, teto: number, baixo: number }} em pixels lógicos: `x`, o meio do boneco,
 *   para onde o rabicho aponta · `baixo`, a borda de baixo do balão, logo acima da cabeça ·
 *   `teto`, até onde ele pode subir (o fim da faixa de nomes mais próxima acima dele, ou o alto
 *   da cena). Na horizontal a página o mantém dentro da cena, sempre por cima de `x`
 */
export function caixaDaFala(boneco, sala) {
  // Quem comemora pula: o balão fica na altura do assento, sem pular junto.
  const y = boneco.sentado && boneco.mesa ? boneco.mesa.boneco.y : boneco.y;
  const baixo = y - FOLGA;
  const nomes = sala.mesas.map((mesa) => mesa.nome.y + FAIXA_DO_NOME).filter((fim) => fim <= baixo);
  return { x: boneco.x + BONECO / 2, teto: Math.max(0, ...nomes), baixo };
}
