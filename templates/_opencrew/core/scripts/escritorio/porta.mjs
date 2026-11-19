// A porta do escritório: abrir, perguntar quem está numa porta ocupada e procurar a que serve.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 15 (repositório do OpenCrew).
import http from 'node:http';
import net from 'node:net';

const LOCAL = '127.0.0.1';
const TODAS_INTERFACES = '0.0.0.0';
const ULTIMA_PORTA = 65535;
// Quem responde na porta pode ser qualquer serviço: a resposta não é guardada sem limite.
const TETO_DA_SONDA = 1_000_000;

const escutaHost = (host, porta, esperaMs) => new Promise((resolve) => {
  const conexao = net.connect({ host, port: porta });
  const fim = (escuta) => { conexao.destroy(); resolve(escuta); };
  conexao.setTimeout(esperaMs, () => fim(false));
  conexao.once('connect', () => fim(true)).once('error', () => fim(false));
});

/**
 * Alguém aceita conexão na porta (IPv4 127.0.0.1 ou IPv6 ::1)? No Windows, `listen` em um
 * endereço pode conviver com outro processo em `::1` e colidir em `localhost`. Porta livre
 * recusa na hora; sem resposta dentro da espera, conta como livre.
 */
export async function alguemEscuta(porta, esperaMs = 1000) {
  if (await escutaHost(LOCAL, porta, esperaMs)) return true;
  return escutaHost('::1', porta, Math.min(esperaMs, 200));
}

/**
 * Abre o servidor na porta, escutando em 0.0.0.0 (local + rede local/VPN).
 * @returns {Promise<boolean>} true se subiu; false se a porta não pôde ser aberta (ocupada, por
 *   quem quer que seja e em qualquer endereço, ou reservada pelo sistema). O mesmo servidor pode
 *   tentar outra porta em seguida.
 */
export async function abrir(servidor, porta) {
  if (porta !== 0 && await alguemEscuta(porta)) return false;
  return new Promise((resolve) => {
    const subiu = () => { servidor.off('error', falhou); resolve(true); };
    const falhou = () => { servidor.off('listening', subiu); resolve(false); };
    servidor.once('listening', subiu).once('error', falhou).listen(porta, TODAS_INTERFACES);
  });
}

/**
 * Quem respondeu no `/estado`: o `projeto` e a `versao` (null no escritório até a 1.19.0, que
 * não a informa); null quando a resposta não é a de um escritório.
 */
function quemRespondeu(corpo) {
  try {
    const { projeto, versao } = JSON.parse(corpo) ?? {};
    return typeof projeto === 'string' ? { projeto, versao: typeof versao === 'string' ? versao : null } : null;
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
 * @returns {Promise<{ projeto: string, versao: string|null }|null>} o escritório que respondeu;
 *   null para qualquer outra resposta (outro serviço, erro, resposta grande demais) ou nenhuma
 *   dentro da espera
 */
export function sondarEstado(porta, esperaMs = 1000, hostHeader = null) {
  return new Promise((resolve) => {
    const headers = hostHeader ? { Host: `${hostHeader}:${porta}` } : undefined;
    const pedido = http.get({ host: LOCAL, port: porta, path: '/estado', agent: false, headers }, (res) => juntar(res, fim));
    const relogio = setTimeout(() => fim(null), esperaMs);
    pedido.on('error', () => fim(null));
    function fim(corpo) {
      clearTimeout(relogio);
      pedido.destroy();
      resolve(corpo === null ? null : quemRespondeu(corpo));
    }
  });
}

/** Confirma a página e o estado exato da execução antes de divulgar sua URL. */
export async function sondarPronto(porta, projeto, versao, crew, run, esperaMs = 1000, solicitar = fetch) {
  const pagina = await resposta(porta, '/', esperaMs, solicitar);
  if (pagina?.status !== 200 || !/<(?:!doctype\s+html|html\b)/i.test(pagina.corpo)) return false;
  if ((crew === undefined) !== (run === undefined)) return false;
  const consulta = crew === undefined ? '' : `?${new URLSearchParams({ crew, run_id: run })}`;
  const estado = await resposta(porta, `/estado${consulta}`, esperaMs, solicitar);
  if (estado?.status !== 200) return false;
  try {
    const corpo = JSON.parse(estado.corpo);
    if (corpo.projeto !== projeto || corpo.versao !== versao) return false;
    return crew === undefined || corpo.crews?.some((item) => item.crew === crew && item.estado?.runId === run) === true;
  } catch {
    return false;
  }
}

async function resposta(porta, rota, esperaMs, solicitar) {
  try {
    const res = await solicitar(`http://${LOCAL}:${porta}${rota}`, { signal: AbortSignal.timeout(esperaMs) });
    return { status: res.status, corpo: await lerCorpoLimitado(res) };
  } catch {
    return null;
  }
}

async function lerCorpoLimitado(res) {
  if (!res.body?.getReader) {
    const corpo = await res.text();
    return corpo.length <= TETO_DA_SONDA ? corpo : '';
  }
  const leitor = res.body.getReader();
  const decodificador = new TextDecoder();
  let corpo = '';
  while (corpo.length <= TETO_DA_SONDA) {
    const { done, value } = await leitor.read();
    if (done) return corpo + decodificador.decode();
    corpo += decodificador.decode(value, { stream: true });
  }
  await leitor.cancel();
  return '';
}

/** Só o `projeto` de quem está na porta, ou null. */
export const sondar = (porta, esperaMs) => sondarEstado(porta, esperaMs).then((quem) => quem?.projeto ?? null);

/**
 * Procura a porta do escritório, de `inicial` em diante, em até `tentativas` portas. Porta que
 * não abre é sondada: se quem responde é o escritório deste projeto, não sobe outro — e, se ele
 * é de outra versão do OpenCrew, a procura para nele (`desatualizado`).
 * @param {object} o
 * @param {number} o.inicial primeira porta
 * @param {string} o.projeto id deste projeto
 * @param {string} o.versao versão do OpenCrew instalada neste projeto
 * @param {(porta: number) => Promise<boolean>} o.abrir tenta abrir o servidor na porta
 * @param {(porta: number) => Promise<{ projeto: string, versao: string|null }|null>} o.sondar quem está na porta
 * @returns {Promise<{ tipo: 'aberto'|'ja-aberto'|'desatualizado'|'sem-porta', porta?: number, ultima: number }>}
 *   `ultima` é a última porta do intervalo (a que entra na mensagem "sem porta")
 */
export async function procurar({ inicial, projeto, versao, abrir: tentar, sondar: perguntar, tentativas = 10 }) {
  const ultima = Math.min(inicial + tentativas - 1, ULTIMA_PORTA);
  for (let porta = inicial; porta <= ultima; porta++) {
    if (await tentar(porta)) return { tipo: 'aberto', porta, ultima };
    const quem = await perguntar(porta);
    if (quem?.projeto === projeto) return { tipo: quem.versao === versao ? 'ja-aberto' : 'desatualizado', porta, ultima };
  }
  return { tipo: 'sem-porta', ultima };
}

/**
 * Busca primeiro uma instância compatível em todo o intervalo; só depois tenta iniciar em portas
 * livres. Um serviço estranho ou um escritório antigo ocupa sua porta, mas nunca é encerrado.
 */
export async function procurarAutomatico({ inicial, projeto, versao, sondar: perguntar = sondarEstado, ocupada = alguemEscuta, tentarAbrir, confirmar = async () => true, confirmarExistente = async () => true, pararAposFalha = false, tentativas = 10 }) {
  const ultima = Math.min(inicial + tentativas - 1, ULTIMA_PORTA);
  for (let porta = inicial; porta <= ultima; porta++) {
    const quem = await perguntar(porta);
    if (quem?.projeto === projeto && quem.versao === versao && await confirmarExistente(porta)) return { tipo: 'ja-aberto', porta, ultima };
  }
  for (let porta = inicial; porta <= ultima; porta++) {
    if (await ocupada(porta)) continue;
    if (!(await tentarAbrir(porta))) continue;
    if (await confirmar(porta)) return { tipo: 'aberto', porta, ultima };
    if (pararAposFalha) return { tipo: 'nao-confirmado', porta, ultima };
  }
  return { tipo: 'sem-porta', ultima };
}
