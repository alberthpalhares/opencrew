// Vigia runs persistentes, mantém o servidor durante uma execução e fecha após o período ocioso.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { dadosDoRun } from './leitura.mjs';
import { escritorioLigado } from '../estado/preferencia.mjs';

export const OCIOSO_MS = 2 * 60 * 1000;
export const SEM_EVENTO_MS = 2 * 60 * 60 * 1000;
const dataMs = (valor) => {
  const ms = typeof valor === 'string' ? Date.parse(valor) : NaN;
  return Number.isFinite(ms) ? ms : null;
};

export function ultimaAtividade(registro, estado) {
  const datas = [registro.iniciadaEm, estado?.updatedAt, ...registro.passos.map((p) => p.em), ...registro.marcos.map((m) => m.em)]
    .map(dataMs).filter((data) => data !== null);
  return datas.length ? datas.reduce((maior, ms) => Math.max(maior, ms)) : null;
}

/** Lê registros sem escrever no workspace; erro de acesso impede desligamento por segurança. */
export async function lerAtividade(raiz) {
  const ligado = await escritorioLigado(raiz);
  const raizCrews = path.join(raiz, 'crews');
  if (!realDentroDe(raiz, raizCrews)) return [];
  const crews = await fs.readdir(raizCrews, { withFileTypes: true }).catch((erro) => {
    if (erro.code === 'ENOENT') return [];
    throw erro;
  });
  const runs = [];
  for (const crew of crews.filter((item) => item.isDirectory() && !item.isSymbolicLink())) {
    const pastaCrew = path.join(raizCrews, crew.name);
    const saida = path.join(pastaCrew, 'output');
    if (!realDentroDe(raiz, pastaCrew) || !realDentroDe(raiz, saida)) continue;
    const pastas = await fs.readdir(saida, { withFileTypes: true }).catch((erro) => {
      if (erro.code === 'ENOENT') return [];
      throw erro;
    });
    for (const run of pastas.filter((item) => item.isDirectory() && !item.isSymbolicLink())) {
      const pasta = path.join(saida, run.name);
      if (!realDentroDe(saida, pasta)) continue;
      const { visual, registro } = await dadosDoRun(raiz, pasta, run.name);
      if (!registro || (!ligado && !visual)) continue;
      const fim = registro.status === 'aberta' ? dataMs(visual?.desvinculadoEm) : dataMs(registro.fechadaEm);
      const desvinculada = registro.status === 'aberta' && fim !== null;
      runs.push({ status: desvinculada ? 'desvinculada' : registro.status, atividadeEm: ultimaAtividade(registro, visual), fechadaEm: fim });
    }
  }
  return runs;
}

/** Calcula quando encerrar; atividade sem data verificável expira a partir da inicialização. */
export function prazoDeEncerramento(runs, agora, iniciadoEm) {
  const abertos = runs.filter((run) => run.status === 'aberta');
  const prazosAbertos = abertos.map((run) => (run.atividadeEm ?? iniciadoEm) + SEM_EVENTO_MS);
  if (prazosAbertos.some((prazo) => agora < prazo)) return null;
  const prazos = prazosAbertos
    .concat(runs.filter((run) => run.status !== 'aberta').map((run) => run.fechadaEm).filter((data) => data !== null));
  const ultimoFim = prazos.reduce((ultimo, prazo) => Math.max(ultimo, prazo), iniciadoEm);
  return ultimoFim + OCIOSO_MS;
}

/** Observa arquivos de execução e fecha só o servidor que recebeu nesta chamada. */
export function criarVigia({ raiz, servidor, intervaloMs = 10_000, agora = Date.now, ler = lerAtividade, agendar = setInterval, cancelar = clearInterval }) {
  const iniciadoEm = agora();
  let ocupado = false;
  let encerrado = false;
  const timer = agendar(() => { void verificar(); }, intervaloMs);

  async function verificar() {
    if (ocupado || encerrado) return false;
    ocupado = true;
    try {
      const prazo = prazoDeEncerramento(await ler(raiz), agora(), iniciadoEm);
      if (prazo === null || agora() < prazo) return false;
      encerrado = true;
      cancelar(timer);
      servidor.close();
      servidor.closeAllConnections?.();
      return true;
    } catch {
      return false;
    } finally {
      ocupado = false;
    }
  }

  function parar() {
    if (encerrado) return;
    encerrado = true;
    cancelar(timer);
  }

  return { verificar, parar };
}
