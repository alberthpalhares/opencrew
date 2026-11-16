// Leitura da visão geral por crew e do estado isolado por execução. Os scripts de estado são os
// únicos escritores; arquivos fora da árvore real do projeto e links simbólicos são ignorados.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';

const MARCA_DE_ORDEM = 0xfeff;
const RUN = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;

function crewSegura(crew) {
  return typeof crew === 'string' && crew.length > 0 && crew !== '.' && crew !== '..' && !/[\\/]/.test(crew);
}

const TRANSITORIO = new Set(['EBUSY', 'EPERM', 'EACCES']);
const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function lerArquivo(raiz, base, arquivo) {
  if (!realDentroDe(raiz, arquivo) || !realDentroDe(base, arquivo)) return null;
  for (let i = 0; i < 3; i++) {
    try {
      const info = await fs.lstat(arquivo);
      if (!info.isFile() || info.isSymbolicLink()) return null;
      const texto = await fs.readFile(arquivo, 'utf8');
      const estado = JSON.parse(texto.charCodeAt(0) === MARCA_DE_ORDEM ? texto.slice(1) : texto);
      return Array.isArray(estado?.agents) ? estado : null;
    } catch (erro) {
      if (!TRANSITORIO.has(erro?.code) || i === 2) return null;
      await pausa(25);
    }
  }
  return null;
}

/** O estado de uma execução, somente quando o run e seus pais reais ficam dentro de output/. */
export async function lerExecucao(raiz, crew, run) {
  if (!crewSegura(crew) || !RUN.test(run ?? '')) return null;
  const pastaCrew = path.resolve(raiz, 'crews', crew);
  const saida = path.join(pastaCrew, 'output');
  const execucao = path.join(saida, run);
  try {
    const info = await fs.lstat(execucao);
    if (!info.isDirectory() || info.isSymbolicLink() || !realDentroDe(raiz, execucao) || !realDentroDe(saida, execucao)) return null;
  } catch {
    return null;
  }
  const estado = await lerArquivo(raiz, execucao, path.join(execucao, 'estado-escritorio.json'));
  return estado?.runId === run ? { crew, estado } : null;
}

function atualizadaEm({ estado }) {
  return Date.parse(estado.updatedAt) || 0;
}

/** A visão geral escolhe a execução mais recentemente atualizada, mantendo compatibilidade com state.json. */
async function lerCrew(raiz, crew) {
  if (!crewSegura(crew)) return null;
  const pastaCrew = path.resolve(raiz, 'crews', crew);
  const legado = await lerArquivo(raiz, pastaCrew, path.join(pastaCrew, 'state.json'));
  const saida = path.join(pastaCrew, 'output');
  const nomes = await fs.readdir(saida).catch(() => []);
  const execucoes = await Promise.all(nomes.filter((run) => RUN.test(run)).map((run) => lerExecucao(raiz, crew, run)));
  const estados = [...(legado ? [{ crew, estado: legado }] : []), ...execucoes.filter(Boolean)];
  return estados.sort((a, b) => atualizadaEm(b) - atualizadaEm(a))[0] ?? null;
}

/** A crew com atualização mais recente primeiro; sem estados legíveis, lista vazia. */
export async function lerCrews(raiz) {
  const entradas = await fs.readdir(path.join(raiz, 'crews'), { withFileTypes: true }).catch(() => []);
  const lidas = await Promise.all(entradas.filter((e) => e.isDirectory()).map((e) => lerCrew(raiz, e.name)));
  return lidas.filter(Boolean).sort((a, b) => atualizadaEm(b) - atualizadaEm(a));
}

function limparRun(run) {
  if (typeof run !== 'string' || run.includes('..') || /[\\/]/.test(run)) return null;
  const limpo = run.replace(/[.,;:!?\])>]+$/, '');
  return RUN.test(limpo) ? limpo : null;
}

/** Resolve a visão geral ou a execução da query da URL; query com travessia nunca lê pastas. */
export async function lerEstadoDaConsulta(raiz, consulta) {
  const crew = consulta.get('crew');
  const run = consulta.get('run_id');
  if (crew === null && run === null) return lerCrews(raiz);
  if (!crewSegura(crew)) return [];
  if (run === null) {
    const atual = await lerCrew(raiz, crew);
    return atual ? [atual] : [];
  }
  const runLimpo = limparRun(run);
  if (!runLimpo) return [];
  const estado = (await lerExecucao(raiz, crew, runLimpo)) ?? (await lerCrew(raiz, crew));
  return estado ? [estado] : [];
}
