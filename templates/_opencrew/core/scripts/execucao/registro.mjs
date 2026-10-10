// O registro de uma execução: `crews/<crew>/output/<run>/execucao.json`. Só os scripts o gravam
// (`caminho.mjs` e `execucao.mjs`); a gravação é inteira ou nenhuma, e um registro ilegível vale
// como ausente.
// Spec: fase-u5c-execucao-registrada.md, §4 e regras 1 a 5 e 8 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gravarTexto } from '../estado/arquivo.mjs';

export const ARQUIVO = 'execucao.json';
/** O `tipo` do registro de um pedido avulso à crew (spec fase-u5d-modo-equipe.md); execução de pipeline não tem o campo. */
export const PEDIDO = 'pedido';
/** O `--resultado` do `fechar` → o `status` do registro. */
export const STATUS = { aprovado: 'aprovada', rejeitado: 'rejeitada', abortado: 'abortada', publicado: 'publicada' };

const RECUSA = { EACCES: 'a pasta está protegida contra gravação', EPERM: 'a pasta está protegida ou o arquivo está em uso', EBUSY: 'o arquivo está em uso por outro programa', EISDIR: 'há uma pasta no lugar do arquivo', ENOSPC: 'o disco está cheio', EROFS: 'o disco é só de leitura' };
/** O motivo de uma falha de gravação, em PT-BR. */
export const motivoDe = (erro) => RECUSA[erro?.code] ?? `erro ${erro?.code ?? String(erro?.message ?? erro).replace(/\s+/g, ' ').trim()}`;
export const AVISO = (motivo) => `Não consegui gravar o registro desta execução: ${motivo}`;

/** Uma linha só, cortada por caractere inteiro (um emoji não fica pela metade). */
const umaLinha = (texto, maximo) => Array.from(String(texto ?? '').replace(/\s+/g, ' ').trim()).slice(0, maximo).join('').trim();
/** Tema e descrição da saída: uma linha, sem `|` (é coluna do `runs.md`), até 160 caracteres. */
export const limparTema = (texto) => umaLinha(String(texto ?? '').replace(/\|/g, '/'), 160);
/** A correção pedida ou o motivo da rejeição: uma linha, até 300 caracteres. */
export const limparNota = (texto) => umaLinha(texto, 300);

const lista = (valor) => (Array.isArray(valor) ? valor.filter((i) => i && typeof i === 'object') : []);
const inteiro = (valor) => Number.isInteger(valor) && valor > 0;

/** O que veio do disco é dado: cada campo que vai para a tela vira uma linha, e passo sem número sai. */
export function conferido(lido) {
  if (!lido || typeof lido !== 'object' || Array.isArray(lido)) return null;
  const passos = lista(lido.passos).filter((p) => inteiro(p.n)).map((p) => ({ ...p, arquivo: umaLinha(p.arquivo, 500), em: umaLinha(p.em, 40) }));
  const marcos = lista(lido.marcos).filter((m) => inteiro(m.passo)).map((m) => ({ ...m, evento: umaLinha(m.evento, 20), resultado: umaLinha(m.resultado, 20), nota: limparNota(m.nota), em: umaLinha(m.em, 40) }));
  const doPedido = Object.fromEntries(['agente', 'formato'].filter((c) => lido[c] !== undefined).map((c) => [c, umaLinha(lido[c], 80)]));
  return { ...lido, ...doPedido, tema: limparTema(lido.tema), saida: limparTema(lido.saida), status: umaLinha(lido.status, 20), passos, marcos };
}

/**
 * O registro gravado, para quem vai regravá-lo: `null` quando falta ou está ilegível (cortado, sem
 * ser um objeto); qualquer outra falha de leitura (arquivo em uso, sem permissão) sobe — um
 * registro que existe e não pôde ser lido não é trocado por um vazio.
 */
async function lerParaGravar(pasta) {
  try {
    const texto = await fs.readFile(path.join(pasta, ARQUIVO), 'utf8');
    return conferido(JSON.parse(texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto));
  } catch (erro) {
    if (erro?.code === 'ENOENT' || erro instanceof SyntaxError) return null;
    throw erro;
  }
}

/**
 * O registro gravado, para quem só lê: `null` quando falta, está ilegível ou não pôde ser lido.
 * @param {string} pasta a pasta da execução
 */
export const lerRegistro = (pasta) => lerParaGravar(pasta).catch(() => null);

/** Um registro novo, aberto. @param {{ crew, run, tema?, passos?, em }} base `em`: a hora, em ISO */
export function novoRegistro({ crew, run, tema = '', passos = null, tipo, agente, formato, em }) {
  return { versao: 1, crew, run, tema, tipo, agente, formato, status: 'aberta', iniciadaEm: em, passosPrevistos: passos, passos: [], marcos: [], saida: '' };
}

/** Os campos na ordem da spec (`tipo`, `agente` e `formato` só existem no pedido; `fechadaEm`, depois do fecho). */
function ordenado(r) {
  const { versao, crew, run, tema, tipo, agente, formato, status, iniciadaEm, fechadaEm, passosPrevistos, passos, marcos, saida, ...resto } = r;
  const so = (campos) => Object.fromEntries(Object.entries(campos).filter(([, valor]) => valor !== undefined));
  return { versao, crew, run, tema, ...so({ tipo, agente, formato }), status, iniciadaEm, ...so({ fechadaEm }), passosPrevistos, passos, marcos, saida, ...resto };
}

/** O passo conferido: troca a entrada do mesmo número (fica a última saída). */
export function comPasso(registro, { n, arquivo, em }) {
  const outros = registro.passos.filter((p) => p.n !== n);
  return { ...registro, passos: [...outros, { n, arquivo, em }].sort((a, b) => a.n - b.n) };
}

/** Os marcos só acumulam, na ordem em que chegam. */
export const comMarco = (registro, marco) => ({ ...registro, marcos: [...registro.marcos, marco] });

/** O tema, quando o comando trouxe um; senão, o que já estava. */
export const comTema = (registro, tema) => (limparTema(tema) ? { ...registro, tema: limparTema(tema) } : registro);

export function fechado(registro, { resultado, saida, em }) {
  return { ...registro, status: STATUS[resultado], fechadaEm: em, saida: limparTema(saida) || String(registro.saida ?? '') };
}

/** Regra 8: checkpoints aprovados sem correção ÷ checkpoints respondidos (os pulados não contam). */
export function score(registro) {
  const respostas = (registro?.marcos ?? []).filter((m) => m.evento === 'checkpoint').map((m) => m.resultado);
  const aprovados = respostas.filter((r) => r === 'aprovado').length;
  const total = aprovados + respostas.filter((r) => r === 'corrigido').length;
  return total ? `${aprovados}/${total}` : '—';
}

/** Grava o registro. @returns {Promise<string|null>} o aviso para o usuário, ou `null` */
export async function gravarRegistro(pasta, registro) {
  try {
    await gravarTexto(path.join(pasta, ARQUIVO), `${JSON.stringify(ordenado(registro), null, 2)}\n`);
    return null;
  } catch (erro) {
    return AVISO(motivoDe(erro));
  }
}

/**
 * Lê o registro (ou começa um, com `base`), aplica a mudança e grava.
 * @param {string} pasta a pasta da execução · @param {object} base ver `novoRegistro`
 * @param {(registro: object) => object} mudar
 * @returns {Promise<string|null>} o aviso de que não gravou, ou `null`
 */
export async function anotar(pasta, base, mudar) {
  try {
    return await gravarRegistro(pasta, mudar((await lerParaGravar(pasta)) ?? novoRegistro(base)));
  } catch (erro) {
    return AVISO(motivoDe(erro));
  }
}
