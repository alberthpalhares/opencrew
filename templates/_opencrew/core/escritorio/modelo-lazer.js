// Ala de Copa e Lazer (Fase E5): estacoes interativas (cafe, sofas, sinuca, videogame), postos,
// rotas ortogonais pelos corredores livres, pareamento e retorno ao computador.
// Puro: sem DOM, sem relogio, sem rede.
// Spec: fase-e5-lazer-e-convivencia.md (repositorio do OpenCrew).
import { BONECO, LARGURA_COLUNA } from './modelo-mesas.js';
import { sementeDe } from './modelo-personagem.js';
import { comprimentoDaRota, pontoDaRota } from './rota.js';

export const ESTACOES_DE_LAZER = Object.freeze(['cafe', 'sofas', 'sinuca', 'videogame']);
export const TURNO_LAZER_MS = 16000;
export const CAMINHADA_LAZER_MS = 2800;
export const RETORNO_MS = 2400;

const Y_SINUCA_CORREDOR = 103;
const LIVRE = new Set(['idle', 'done']);
const ADERECO_DA_ESTACAO = Object.freeze({ cafe: 'xicara', sofas: 'livro', sinuca: 'taco', videogame: 'controle' });

const fase = (ms, passo) => Math.floor(ms / passo) % 2;

const deslocamentoAla = (sala, x0) => (sala.largura - x0 >= 160 ? 16 : 0);

const limparPontos = (pontos) => pontos.filter((p, i) => i === 0 || p.x !== pontos[i - 1].x || p.y !== pontos[i - 1].y);

/** Os 8 postos de interacao (2 por estacao); no lounge, acomodados sobre sofa e poltrona. */
export function postosDeLazer(sala) {
  if (!sala) return [];
  const x0 = sala.colunasDeMesa * LARGURA_COLUNA;
  const dx = deslocamentoAla(sala, x0);
  return [
    { estacao: 'cafe', posto: 0, x: x0 + dx + 22, y: 27, espelhado: false, adereco: 'xicara' },
    { estacao: 'cafe', posto: 1, x: x0 + dx + 48, y: 27, espelhado: true, adereco: 'xicara' },
    { estacao: 'videogame', posto: 0, x: x0 + dx + 38, y: 76, espelhado: false, adereco: 'controle' },
    { estacao: 'videogame', posto: 1, x: x0 + dx + 66, y: 76, espelhado: true, adereco: 'controle' },
    { estacao: 'sinuca', posto: 0, x: x0 + dx + 18, y: 124, espelhado: false, adereco: 'taco' },
    { estacao: 'sinuca', posto: 1, x: x0 + dx + 90, y: 124, espelhado: true, adereco: 'taco' },
    { estacao: 'sofas', posto: 0, assento: 'sofa', x: x0 + dx + 38, y: 169, espelhado: false, adereco: 'livro' },
    { estacao: 'sofas', posto: 1, assento: 'poltrona', x: x0 + dx + 79, y: 199, espelhado: true, adereco: 'livro' },
  ];
}

function hubParaDestino(x0, destino) {
  if (destino.estacao === 'sinuca' && destino.posto === 1) {
    return [{ x: x0, y: Y_SINUCA_CORREDOR }, { x: destino.x, y: Y_SINUCA_CORREDOR }, { x: destino.x, y: destino.y }];
  }
  if (destino.estacao === 'sofas' && destino.posto >= 0) {
    const yEntrada = destino.posto === 0 ? 190 : 222;
    return [{ x: x0, y: yEntrada }, { x: destino.x, y: yEntrada }, { x: destino.x, y: destino.y }];
  }
  return [{ x: x0, y: destino.y }, { x: destino.x, y: destino.y }];
}

function mesaParaHub(sala, mesa) {
  const x0 = sala.colunasDeMesa * LARGURA_COLUNA;
  const vao = mesa.coluna < sala.vaosX.length ? sala.vaosX[mesa.coluna] : x0 - BONECO;
  return [{ ...mesa.boneco }, { x: vao, y: mesa.boneco.y }, { x: vao, y: mesa.frente.y }, { x: x0, y: mesa.frente.y }];
}

function estacaoParaHub(x0, origem) {
  if (origem.estacao === 'sinuca' && origem.posto === 1) {
    return [{ x: origem.x, y: origem.y }, { x: origem.x, y: Y_SINUCA_CORREDOR }, { x: x0, y: Y_SINUCA_CORREDOR }];
  }
  if (origem.estacao === 'sofas' && origem.posto >= 0) {
    const ySaida = origem.posto === 0 ? 190 : 222;
    return [{ x: origem.x, y: origem.y }, { x: origem.x, y: ySaida }, { x: x0, y: ySaida }];
  }
  return [{ x: origem.x, y: origem.y }, { x: x0, y: origem.y }];
}

function mesaDoPonto(sala, ponto) {
  return sala?.mesas?.find((m) => m.boneco.x === ponto.x && m.boneco.y === ponto.y) ?? null;
}

/**
 * Rota ortogonal em pixels inteiros ligando mesas e postos da Ala de Copa e Lazer, sem cruzar
 * tampos nem moveis solidos.
 */
export function rotaDeLazer(sala, origem, destino) {
  if (!sala || !origem || !destino) return null;
  const x0 = sala.colunasDeMesa * LARGURA_COLUNA;
  const mesaO = mesaDoPonto(sala, origem);
  const mesaD = mesaDoPonto(sala, destino);
  const ida = mesaO ? mesaParaHub(sala, mesaO) : estacaoParaHub(x0, origem);
  const volta = mesaD ? [...mesaParaHub(sala, mesaD)].reverse() : hubParaDestino(x0, destino);
  const limpa = limparPontos([...ida, ...volta]);
  return limpa.length >= 2 ? limpa : [limpa[0], { ...destino }];
}

const ehLivre = (agente, emEntrega) => Boolean(agente?.mesa) && LIVRE.has(agente.status) && emEntrega?.de !== agente;

/** Aloca cada agente livre a um posto de estacao no `turno`, formando duplas sempre que possivel. */
export function alocarEstacoes(agentes, sala, crew, turno, emEntrega = null) {
  const mapa = new Map();
  const livres = agentes.filter((a) => ehLivre(a, emEntrega));
  if (!sala || livres.length === 0) return mapa;
  const postos = postosDeLazer(sala);
  const base = sementeDe(crew ?? '') % ESTACOES_DE_LAZER.length;
  const x0 = sala.colunasDeMesa * LARGURA_COLUNA;
  const dx = deslocamentoAla(sala, x0);
  livres.forEach((agente, idx) => {
    const estacao = ESTACOES_DE_LAZER[(base + Math.floor(idx / 2) + turno) % ESTACOES_DE_LAZER.length];
    const basePosto = postos.find((p) => p.estacao === estacao && p.posto === idx % 2);
    const escolha = idx < 8 ? basePosto : { ...basePosto, x: x0 + dx + 20 + ((idx - 8) * 20), y: 148, posto: -1 };
    mapa.set(agente.id, { ...escolha, parId: livres[idx % 2 === 0 ? idx + 1 : idx - 1]?.id ?? null });
  });
  return mapa;
}

function poseNaEstacao(posto, msNoPosto) {
  if (posto.estacao === 'videogame') return fase(msNoPosto, 450) === 0 ? 'parado' : 'mao';
  return 'parado';
}

function retornoAtivo(modelo, agente, agoraMs) {
  const reg = modelo?.lazer?.retornos?.find((r) => r.id === agente.id);
  if (!reg) return null;
  const ms = agoraMs - reg.inicioMs;
  return ms >= 0 && ms < RETORNO_MS ? { ...reg, ms } : null;
}

/** Estado de movimento/lazer de todos os agentes no instante `agoraMs`. */
export function posicoesDeLazer(modelo, agoraMs, { emEntrega = null, comemorando = false, andarMs = 150 } = {}) {
  const res = new Map();
  const sala = modelo?.ambiente?.sala;
  const desde = modelo?.lazer?.desdeMs;
  if (!sala || !Number.isFinite(desde) || modelo?.reduzirMovimento) return res;

  const agentes = Array.isArray(modelo?.agentes) ? modelo.agentes : [];
  for (const agente of agentes) {
    const ret = retornoAtivo(modelo, agente, agoraMs);
    if (ret && agente.status === 'working') {
      const pontos = rotaDeLazer(sala, ret.origem, agente.mesa.boneco);
      const pos = pontos && comprimentoDaRota(pontos) > 0 ? pontoDaRota(pontos, ret.ms / RETORNO_MS) : agente.mesa.boneco;
      res.set(agente.id, {
        ...pos,
        pose: fase(ret.ms, andarMs) === 0 ? 'andar-a' : 'andar-b',
        sentado: false,
        adereco: null,
        lazer: null,
        voltando: true,
      });
    }
  }

  if (comemorando) return res;
  const decorrido = Math.max(0, agoraMs - desde);
  const turno = Math.floor(decorrido / TURNO_LAZER_MS);
  const msNoTurno = decorrido % TURNO_LAZER_MS;
  const atuais = alocarEstacoes(agentes, sala, modelo.crew, turno, emEntrega);
  const anteriores = turno > 0 ? alocarEstacoes(agentes, sala, modelo.crew, turno - 1, emEntrega) : null;

  for (const [id, posto] of atuais) {
    const agente = agentes.find((a) => a.id === id);
    if (!agente || res.has(id)) continue;
    const origem = anteriores?.get(id) ?? agente.mesa.boneco;
    const pontos = rotaDeLazer(sala, origem, posto);
    const caminhando = msNoTurno < CAMINHADA_LAZER_MS && pontos && comprimentoDaRota(pontos) > 0;
    if (caminhando) {
      const pos = pontoDaRota(pontos, msNoTurno / CAMINHADA_LAZER_MS);
      res.set(id, {
        ...pos,
        pose: fase(msNoTurno, andarMs) === 0 ? 'andar-a' : 'andar-b',
        sentado: false,
        adereco: null,
        lazer: posto.estacao,
        posto,
        caminhando: true,
      });
    } else {
      res.set(id, {
        x: posto.x,
        y: posto.y,
        espelhado: posto.espelhado,
        pose: poseNaEstacao(posto, Math.max(0, msNoTurno - CAMINHADA_LAZER_MS)),
        sentado: false,
        emAssento: Boolean(posto.assento),
        adereco: posto.estacao === 'sofas' && posto.posto === 1 && turno % 2 === 0
          ? null
          : (posto.adereco ?? ADERECO_DA_ESTACAO[posto.estacao] ?? null),
        lazer: posto.estacao,
        posto,
        caminhando: false,
      });
    }
  }
  return res;
}
