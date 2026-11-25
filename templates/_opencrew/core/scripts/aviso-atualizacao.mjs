// Consulta opcional do npm; o cache fica no projeto e nunca controla a execução da crew.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ehPrincipal, realDentroDe } from './comum.mjs';
import { lerPreferencia } from './preferencias.mjs';

const PACOTE = '@aksp/opencrew';
const ENDPOINT = 'https://registry.npmjs.org/%40aksp%2Fopencrew/latest';
const DURACAO = 24 * 60 * 60 * 1000;
const ARQUIVO = path.join('_opencrew', 'logs', '.aviso-atualizacao.json');
const VERSAO = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const numero = (valor) => {
  const partes = VERSAO.exec(String(valor ?? '').trim());
  if (!partes) return null;
  const itens = partes.slice(1).map(Number);
  return itens.every(Number.isSafeInteger) ? itens : null;
};
const milissegundos = (agora) => Number((typeof agora === 'function' ? agora() : agora)?.valueOf?.() ?? Date.now());

function maior(nova, instalada) {
  for (let i = 0; i < 3; i++) if (nova[i] !== instalada[i]) return nova[i] > instalada[i];
  return false;
}

async function versaoInstalada(raiz) {
  const pasta = path.join(raiz, '_opencrew');
  try { return (await fs.readFile(path.join(pasta, '.opencrew-version'), 'utf8')).trim(); }
  catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
    return JSON.parse(await fs.readFile(path.join(pasta, 'manifest.json'), 'utf8')).version;
  }
}

function opcoes(raiz) {
  const pasta = path.join(raiz, '_opencrew');
  const arquivo = path.join(raiz, ARQUIVO);
  return { pasta, logs: path.dirname(arquivo), arquivo };
}

async function pastaSegura(raiz, pasta, criar = false) {
  const raizReal = path.resolve(raiz);
  const nucleo = path.join(raizReal, '_opencrew');
  const info = await fs.lstat(nucleo);
  if (!info.isDirectory() || info.isSymbolicLink() || !realDentroDe(raizReal, nucleo)) return false;
  if (criar) await fs.mkdir(pasta, { recursive: true });
  const atual = await fs.lstat(pasta).catch((erro) => (erro.code === 'ENOENT' ? null : Promise.reject(erro)));
  return Boolean(atual?.isDirectory() && !atual.isSymbolicLink() && realDentroDe(raizReal, pasta));
}

async function lerCache(raiz) {
  const { logs, arquivo } = opcoes(raiz);
  try {
    if (!(await pastaSegura(raiz, logs))) return null;
    const info = await fs.lstat(arquivo);
    if (!info.isFile() || info.isSymbolicLink() || !realDentroDe(raiz, arquivo)) return null;
    const dado = JSON.parse(await fs.readFile(arquivo, 'utf8'));
    if (!numero(dado.versao) || !Number.isFinite(dado.consultadoEm)) return null;
    return dado;
  } catch { return null; }
}

async function gravarCache(raiz, cache) {
  const { pasta, logs, arquivo } = opcoes(raiz);
  let temporario;
  try {
    if (!(await pastaSegura(raiz, logs, true))) return false;
    const info = await fs.lstat(arquivo).catch((erro) => (erro.code === 'ENOENT' ? null : Promise.reject(erro)));
    if (info && (!info.isFile() || info.isSymbolicLink())) return false;
    if (!realDentroDe(raiz, pasta) || !realDentroDe(raiz, logs) || !realDentroDe(raiz, arquivo)) return false;
    temporario = `${arquivo}.${process.pid}.${randomUUID()}.tmp`;
    await fs.writeFile(temporario, `${JSON.stringify(cache)}\n`, { flag: 'wx' });
    await fs.rename(temporario, arquivo);
    return true;
  } catch {
    if (temporario) await fs.rm(temporario, { force: true }).catch(() => {});
    return false;
  }
}

async function buscarVersao(fetchImpl, timeoutMs) {
  if (typeof fetchImpl !== 'function') return null;
  const abort = AbortSignal.timeout(Math.max(1, timeoutMs));
  const resposta = await fetchImpl(ENDPOINT, { signal: abort, redirect: 'error' });
  if (!resposta?.ok) return null;
  const pacote = await resposta.json();
  return pacote?.name === PACOTE && numero(pacote.version) ? pacote.version : null;
}

async function dentroDoPrazo(consultar, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(consultar),
      new Promise((resolver) => { timer = setTimeout(() => resolver(null), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}

function adiada(cache, agora) { return Number(cache?.adiadoAte) > agora; }
function fresca(cache, agora) { return agora - cache.consultadoEm >= 0 && agora - cache.consultadoEm < DURACAO; }
function montar(instalada, disponivel) {
  const atual = numero(instalada);
  const nova = numero(disponivel);
  return atual && nova && maior(nova, atual)
    ? { instalada: instalada.trim(), disponivel: disponivel.trim(), opcoes: ['Ver prévia', 'Atualizar', 'Lembrar amanhã'] }
    : null;
}

/** Retorna o aviso ou null; qualquer falha de rede/cache deixa o menu normal seguir. */
export async function consultarAviso(raiz, {
  consultar, fetchImpl = globalThis.fetch, agora = Date.now, timeoutMs = 1500,
} = {}) {
  try {
    if (lerPreferencia(raiz, ['Aviso de atualização', 'Aviso de atualizacao'])?.toLowerCase() === 'off') return null;
    const instalada = await versaoInstalada(raiz);
    if (!numero(instalada)) return null;
    const instante = milissegundos(agora);
    const salvo = await lerCache(raiz);
    if (adiada(salvo, instante)) return null;
    if (salvo && fresca(salvo, instante)) return montar(instalada, salvo.versao);
    const consultada = await dentroDoPrazo(async () => {
      if (consultar) return await consultar();
      return buscarVersao(fetchImpl, timeoutMs);
    }, timeoutMs);
    if (!numero(consultada)) return null;
    if (!(await gravarCache(raiz, { versao: consultada, consultadoEm: instante, adiadoAte: 0 }))) return null;
    return montar(instalada, consultada);
  } catch { return null; }
}

/** Silencia o aviso por 24 horas; a leitura e a escrita são limitadas ao cache do projeto. */
export async function adiarAviso(raiz, { agora = Date.now } = {}) {
  const instante = milissegundos(agora);
  const salvo = await lerCache(raiz);
  if (!salvo) return false;
  return gravarCache(raiz, { ...salvo, adiadoAte: instante + DURACAO });
}

export async function main(argv = process.argv.slice(2), { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = {}) {
  const [acao = 'verificar'] = argv;
  if (acao === 'adiar') {
    escrever(await adiarAviso(cwd) ? 'ATUALIZACAO:ADIADA' : 'ATUALIZACAO:SEM_CACHE');
    return 0;
  }
  if (acao !== 'verificar') { escrever('Uso: aviso-atualizacao.mjs [verificar|adiar]'); return 1; }
  const aviso = await consultarAviso(cwd);
  escrever(aviso ? `ATUALIZACAO:DISPONIVEL ${aviso.instalada} ${aviso.disponivel}` : 'ATUALIZACAO:NENHUMA');
  return 0;
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main();
