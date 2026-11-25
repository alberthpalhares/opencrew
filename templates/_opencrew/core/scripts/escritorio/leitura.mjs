// Leitura da visão geral por crew e do estado isolado por execução. Os scripts de estado são os
// únicos escritores; arquivos fora da árvore real do projeto e links simbólicos são ignorados.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { RUN } from '../caminho/argumentos.mjs';
import { conferido, STATUS } from '../execucao/registro.mjs';

const MARCA_DE_ORDEM = 0xfeff;
const STATUS_VALIDOS = ['aberta', ...Object.values(STATUS)];

function crewSegura(crew) {
  return typeof crew === 'string' && crew.length > 0 && crew !== '.' && crew !== '..' && !/[\\/]/.test(crew);
}

const TRANSITORIO = new Set(['EBUSY', 'EPERM', 'EACCES']);
const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

export async function lerJsonDentro(raiz, base, arquivo) {
  if (!realDentroDe(raiz, arquivo) || !realDentroDe(base, arquivo)) return null;
  for (let i = 0; i < 3; i++) {
    try {
      const info = await fs.lstat(arquivo);
      if (!info.isFile() || info.isSymbolicLink()) return null;
      const texto = await fs.readFile(arquivo, 'utf8');
      return JSON.parse(texto.charCodeAt(0) === MARCA_DE_ORDEM ? texto.slice(1) : texto);
    } catch (erro) {
      if (erro?.code === 'ENOENT' || erro instanceof SyntaxError) return null;
      if (!TRANSITORIO.has(erro?.code) || i === 2) throw erro;
      await pausa(25);
    }
  }
  return null;
}

async function lerArquivo(raiz, base, arquivo) {
  const estado = await lerJsonDentro(raiz, base, arquivo);
  return Array.isArray(estado?.agents) ? estado : null;
}

export async function dadosDoRun(raiz, pasta, run) {
  const [visual, bruto] = await Promise.all([
    lerArquivo(raiz, pasta, path.join(pasta, 'estado-escritorio.json')),
    lerJsonDentro(raiz, pasta, path.join(pasta, 'execucao.json')),
  ]);
  let registro;
  try {
    registro = conferido(bruto);
  } catch {
    registro = null;
  }
  const valido = registro && STATUS_VALIDOS.includes(registro.status);
  return { visual: visual?.runId === run ? visual : null, registro: valido ? registro : null };
}

function estadoRegistrado(crew, run, visual, registro) {
  const statusFechado = { aprovada: 'completed', publicada: 'completed', rejeitada: 'failed', abortada: 'failed' }[registro.status];
  const fechado = statusFechado !== undefined;
  const atual = visual ?? {};
  const status = fechado ? statusFechado : atual.status === 'checkpoint' ? 'checkpoint' : 'running';
  const agents = (atual.agents ?? []).filter(Boolean).map((agente) => {
    if (fechado && status === 'completed' && agente.status !== 'skipped') return { ...agente, status: 'done' };
    if (fechado && status === 'failed' && ['working', 'checkpoint'].includes(agente.status)) return { ...agente, status: 'failed' };
    if (!fechado && status !== 'checkpoint' && ['failed', 'checkpoint'].includes(agente.status)) return { ...agente, status: 'idle' };
    return agente;
  });
  const passo = registro.passos.reduce((maior, item) => Math.max(maior, item.n), 0);
  const atualizado = (fechado ? registro.fechadaEm : null) ?? atual.updatedAt ?? registro.iniciadaEm ?? null;
  const rotulo = fechado ? '' : 'Aguardando atualização desta execução';
  return {
    ...atual,
    step: atual.step ?? { current: passo, total: registro.passosPrevistos ?? null, label: rotulo },
    handoff: atual.handoff,
    crew,
    runId: run,
    status,
    agents,
    updatedAt: atualizado,
    ...(fechado && registro.status === 'abortada' ? { motivo: registro.saida || 'Execução abortada' } : {}),
    ...(fechado && registro.status === 'rejeitada' ? { motivo: registro.saida || 'Execução rejeitada' } : {}),
  };
}

/** O estado de uma execução, somente quando o run e seus pais reais ficam dentro de output/. */
export async function lerExecucao(raiz, crew, run, { soVisual = false } = {}) {
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
  const { visual, registro } = await dadosDoRun(raiz, execucao, run);
  if (!visual && (soVisual || !registro)) return null;
  const estado = registro ? estadoRegistrado(crew, run, visual, registro) : visual;
  const publico = { ...estado };
  delete publico.sessao;
  delete publico.desvinculadoEm;
  if (estado.desvinculadoEm && ['checkpoint', 'running'].includes(estado.status)) publico.semVinculo = true;
  return { crew, estado: publico };
}

function atualizadaEm({ estado }) {
  return typeof estado.updatedAt === 'string' ? Date.parse(estado.updatedAt) || 0 : 0;
}

/** A visão geral escolhe a execução mais recentemente atualizada, mantendo compatibilidade com state.json. */
async function lerCrew(raiz, crew, opcoes) {
  if (!crewSegura(crew)) return null;
  const pastaCrew = path.resolve(raiz, 'crews', crew);
  const legado = await lerArquivo(raiz, pastaCrew, path.join(pastaCrew, 'state.json'));
  const saida = path.join(pastaCrew, 'output');
  const nomes = await fs.readdir(saida).catch(() => []);
  const execucoes = await Promise.all(nomes.filter((run) => RUN.test(run)).map(async (run) => {
    try { return await lerExecucao(raiz, crew, run, opcoes); } catch { return null; }
  }));
  const estados = [...(legado ? [{ crew, estado: legado }] : []), ...execucoes.filter(Boolean)];
  return estados.sort((a, b) => atualizadaEm(b) - atualizadaEm(a))[0] ?? null;
}

/** A crew com atualização mais recente primeiro; sem estados legíveis, lista vazia. */
export async function lerCrews(raiz, opcoes) {
  const entradas = await fs.readdir(path.join(raiz, 'crews'), { withFileTypes: true }).catch(() => []);
  const lidas = await Promise.all(entradas.filter((e) => e.isDirectory()).map((e) => lerCrew(raiz, e.name, opcoes)));
  return lidas.filter(Boolean).sort((a, b) => atualizadaEm(b) - atualizadaEm(a));
}

function limparRun(run) {
  if (typeof run !== 'string' || /[\\/]/.test(run)) return null;
  const limpo = run.replace(/[,;:!?\])>]+$/, '');
  return RUN.test(limpo) ? limpo : null;
}

/** Resolve a visão geral ou a execução da query da URL; query com travessia nunca lê pastas. */
export async function lerEstadoDaConsulta(raiz, consulta, opcoes) {
  const crew = consulta.get('crew');
  const run = consulta.get('run_id');
  if (crew === null && run === null) return lerCrews(raiz, opcoes);
  if (!crewSegura(crew)) return [];
  if (run === null) {
    const atual = await lerCrew(raiz, crew, opcoes);
    return atual ? [atual] : [];
  }
  const runLimpo = limparRun(run);
  if (!runLimpo) return [];
  const estado = await lerExecucao(raiz, crew, runLimpo, opcoes);
  return estado ? [estado] : [];
}
