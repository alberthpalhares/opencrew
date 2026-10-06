// O quadro de um instante (regra 28): a pose e a posição inteira de cada boneco, e o monitor de
// cada mesa, calculados pelo tempo decorrido. Nada aqui conta quadros: o mesmo modelo no mesmo
// instante dá sempre o mesmo quadro, e o percurso cujo tempo já passou aparece terminado.
// Puro: sem DOM, sem relógio, sem rede. A hora entra por parâmetro.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 18, 24 e 28 (repositório do OpenCrew).
import { ANDAR_MS, COMEMORACAO_MS, DIGITAR_MS, IDA_MS, VOLTA_MS } from './animacao.js';
import { pontoDaRota, rota } from './rota.js';

/**
 * As poses que `quadro` devolve. Cada uma é o molde do boneco com linhas trocadas (regra 16):
 * `parado` é o molde; `digitar-a` e `digitar-b`, os braços no teclado; `mao`, o braço
 * levantado; `andar-a` e `andar-b`, as pernas. O braço com papel vem à parte (`papel`), somado
 * às pernas de quem anda.
 */
export const POSES = Object.freeze(['parado', 'digitar-a', 'digitar-b', 'mao', 'andar-a', 'andar-b']);
/** O monitor animado avança um passo a cada 250 ms: os 4 passos dão a volta em 1 segundo. */
export const MONITOR_MS = 250;
const PASSOS_DO_MONITOR = 4;
/** Quanto sobe, em pixels lógicos, quem comemora com o braço levantado. */
export const PULO = 2;

/** Em que passo de um ciclo de `total` cai o instante, quando o passo troca a cada `periodo`. */
function fase(ms, periodo, total = 2) {
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / periodo) % total : 0;
}

/** Tempo desde o início de uma animação; `null` se não há, não começou ou já terminou. */
function decorrido(marca, duracao, agoraMs) {
  const ms = marca ? agoraMs - marca.inicioMs : Number.NaN;
  return ms >= 0 && ms < duracao ? ms : null;
}

/** O âmbar pisca 1 vez por segundo (apaga na segunda metade); o aceso corre as linhas pelo passo. */
function monitorDe(agente, agoraMs) {
  const monitorFase = agente.monitorAnimado ? fase(agoraMs, MONITOR_MS, PASSOS_DO_MONITOR) : 0;
  const apagou = agente.monitor === 'ambar' && monitorFase >= PASSOS_DO_MONITOR / 2;
  return { monitor: apagou ? 'apagado' : agente.monitor, monitorFase };
}

function poseNaMesa(acao, agoraMs, semMovimento) {
  if (acao === 'checkpoint') return 'mao';
  if (acao !== 'working') return 'parado';
  return semMovimento || fase(agoraMs, DIGITAR_MS) === 0 ? 'digitar-a' : 'digitar-b';
}

/** O boneco sentado na própria mesa, como o status manda. */
function naMesa(agente, agoraMs, semMovimento) {
  const { id, indice, mesa, aparencia, acao } = agente;
  return {
    id, indice, mesa, aparencia, acao,
    pose: poseNaMesa(acao, agoraMs, semMovimento),
    papel: false,
    espelhado: false,
    sentado: true,
    x: mesa.boneco.x,
    y: mesa.boneco.y,
    destino: null,
    ...monitorDe(agente, agoraMs),
  };
}

/** Quem está no meio de uma entrega e o que muda no boneco dele; `null` se ninguém anda. */
function caminhada(entrega, agentes, agoraMs) {
  const ms = decorrido(entrega, IDA_MS + VOLTA_MS, agoraMs);
  if (ms === null) return null;
  const [de, para] = [entrega.deId, entrega.paraId].map((id) => agentes.find((a) => a?.id === id));
  if (!de?.mesa || !para?.mesa) return null;
  const ida = rota(de.mesa.indice, para.mesa.indice);
  const onde = ms <= IDA_MS ? pontoDaRota(ida, ms / IDA_MS) : pontoDaRota([...ida].reverse(), (ms - IDA_MS) / VOLTA_MS);
  const pose = fase(ms, ANDAR_MS) === 0 ? 'andar-a' : 'andar-b';
  return { indice: de.indice, boneco: { ...onde, acao: 'entregando', pose, papel: ms < IDA_MS, sentado: false, destino: para.mesa.indice } };
}

/** Comemora na própria mesa: braço levantado e um pulo, depois o molde, a cada 0,3 s. */
function comemorar(boneco, ms) {
  const noAlto = fase(ms, DIGITAR_MS) === 0;
  return { ...boneco, acao: 'comemorando', pose: noAlto ? 'mao' : 'parado', y: boneco.y - (noAlto ? PULO : 0) };
}

/**
 * O que a cena pinta num instante: um boneco por agente com mesa, na ordem do elenco.
 * @param {object} modelo o modelo de uma leitura; para haver entrega e comemoração, o que
 *   `transicao` devolveu
 * @param {number} agoraMs a hora, em milissegundos, no mesmo relógio passado a `transicao`
 * @returns {object[]} cada boneco: `{ id, indice, mesa, aparencia, acao, pose, papel, espelhado,
 *   sentado, x, y, destino, monitor, monitorFase }` · `acao`: a do modelo, ou `entregando`
 *   (durante os 4 s da entrega) ou `comemorando` (durante os 4 s da comemoração; quem foi pulado
 *   não comemora) · `pose`: uma de `POSES` · `papel`: leva o papel (só na ida) · `espelhado`:
 *   desenhar o molde virado para a esquerda · `sentado`: está na própria mesa · `x`, `y`: canto
 *   superior esquerdo do boneco, em pixel lógico inteiro · `destino`: índice da mesa de quem
 *   recebe, ou `null` · `monitor`: a cor a pintar agora (`apagado`, `aceso`, `ambar` ou
 *   `vermelho`) · `monitorFase`: 0 a 3, o passo das linhas do monitor aceso (0 se ele não anima)
 *   · com `modelo.reduzirMovimento`: pose fixa e todos sentados, sem entrega nem comemoração
 */
export function quadro(modelo, agoraMs) {
  const todos = Array.isArray(modelo?.agentes) ? modelo.agentes : [];
  const { entrega = null, comemoracao = null } = modelo?.animacao ?? {};
  const semMovimento = Boolean(modelo?.reduzirMovimento);
  const andando = semMovimento ? null : caminhada(entrega, todos, agoraMs);
  const festa = semMovimento ? null : decorrido(comemoracao, COMEMORACAO_MS, agoraMs);
  return todos.filter((agente) => agente?.mesa).map((agente) => {
    const boneco = naMesa(agente, agoraMs, semMovimento);
    if (andando?.indice === agente.indice) return { ...boneco, ...andando.boneco };
    return festa !== null && agente.acao !== 'skipped' ? comemorar(boneco, festa) : boneco;
  });
}
