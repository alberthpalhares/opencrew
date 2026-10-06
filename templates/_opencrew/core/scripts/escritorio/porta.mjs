// A porta do escritório: abrir, perguntar quem está numa porta ocupada e procurar a que serve.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 15 (repositório do OpenCrew).
import http from 'node:http';
import net from 'node:net';

const LOCAL = '127.0.0.1';
const ULTIMA_PORTA = 65535;
// Quem responde na porta pode ser qualquer serviço: a resposta não é guardada sem limite.
const TETO_DA_SONDA = 1_000_000;

/**
 * Alguém aceita conexão em 127.0.0.1:porta? No Windows, o `listen` em 127.0.0.1 abre por cima de
 * quem escuta a mesma porta em 0.0.0.0 ou `::` e toma o tráfego local dele: só a conexão mostra
 * que a porta tem dono. Porta livre recusa na hora; sem resposta dentro da espera, conta como livre.
 */
function alguemEscuta(porta, esperaMs = 1000) {
  return new Promise((resolve) => {
    const conexao = net.connect({ host: LOCAL, port: porta });
    const fim = (escuta) => { conexao.destroy(); resolve(escuta); };
    conexao.setTimeout(esperaMs, () => fim(false));
    conexao.once('connect', () => fim(true)).once('error', () => fim(false));
  });
}

/**
 * Abre o servidor na porta, preso em 127.0.0.1.
 * @returns {Promise<boolean>} true se subiu; false se a porta não pôde ser aberta (ocupada, por
 *   quem quer que seja e em qualquer endereço, ou reservada pelo sistema). O mesmo servidor pode
 *   tentar outra porta em seguida.
 */
export async function abrir(servidor, porta) {
  if (porta !== 0 && await alguemEscuta(porta)) return false;
  return new Promise((resolve) => {
    const subiu = () => { servidor.off('error', falhou); resolve(true); };
    const falhou = () => { servidor.off('listening', subiu); resolve(false); };
    servidor.once('listening', subiu).once('error', falhou).listen(porta, LOCAL);
  });
}

/** O `projeto` de uma resposta do `/estado`, ou null quando a resposta não é a de um escritório. */
function projetoDaResposta(corpo) {
  try {
    const { projeto } = JSON.parse(corpo) ?? {};
    return typeof projeto === 'string' ? projeto : null;
  } catch {
    return null;
  }
}

/** Junta o corpo da resposta e o entrega inteiro; cortada no meio ou acima do teto, entrega null. */
function juntar(res, entregar) {
  let corpo = '';
  res.setEncoding('utf8');
  res.on('data', (parte) => {
    corpo += parte;
    if (corpo.length > TETO_DA_SONDA) entregar(null);
  });
  res.on('end', () => entregar(corpo));
  res.on('error', () => entregar(null));
}

/**
 * Pergunta quem está na porta: `GET /estado`, com espera de até 1 s.
 * @returns {Promise<string|null>} o `projeto` do escritório que respondeu; null para qualquer
 *   outra resposta (outro serviço, erro, resposta grande demais) ou nenhuma dentro da espera
 */
export function sondar(porta, esperaMs = 1000) {
  return new Promise((resolve) => {
    const pedido = http.get({ host: LOCAL, port: porta, path: '/estado', agent: false }, (res) => juntar(res, fim));
    const relogio = setTimeout(() => fim(null), esperaMs);
    pedido.on('error', () => fim(null));
    function fim(corpo) {
      clearTimeout(relogio);
      pedido.destroy();
      resolve(corpo === null ? null : projetoDaResposta(corpo));
    }
  });
}

/**
 * Procura a porta do escritório, de `inicial` em diante, em até `tentativas` portas. Porta que
 * não abre é sondada: se quem responde é o escritório deste projeto, não sobe outro.
 * @param {object} o
 * @param {number} o.inicial primeira porta
 * @param {string} o.projeto id deste projeto
 * @param {(porta: number) => Promise<boolean>} o.abrir tenta abrir o servidor na porta
 * @param {(porta: number) => Promise<string|null>} o.sondar o `projeto` de quem está na porta
 * @returns {Promise<{ tipo: 'aberto'|'ja-aberto'|'sem-porta', porta?: number, ultima: number }>}
 *   `ultima` é a última porta do intervalo (a que entra na mensagem "sem porta")
 */
export async function procurar({ inicial, projeto, abrir: tentar, sondar: perguntar, tentativas = 10 }) {
  const ultima = Math.min(inicial + tentativas - 1, ULTIMA_PORTA);
  for (let porta = inicial; porta <= ultima; porta++) {
    if (await tentar(porta)) return { tipo: 'aberto', porta, ultima };
    if ((await perguntar(porta)) === projeto) return { tipo: 'ja-aberto', porta, ultima };
  }
  return { tipo: 'sem-porta', ultima };
}
