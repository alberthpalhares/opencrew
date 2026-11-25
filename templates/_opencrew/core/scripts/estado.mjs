#!/usr/bin/env node
// Estado do Escritório: com --run grava em output/<run_id>/estado-escritorio.json; sem ele mantém
// o state.json legado da crew. Quem grava é este script, um comando por evento — a IA não monta o JSON.
// Uso (na pasta do projeto): node _opencrew/core/scripts/estado.mjs <crew> <evento> [opções]
//   iniciar    [--passos N]
//   passo      [--n K] [--agente <id>] [--rotulo "<texto>"] [--mensagem "<texto>"]
//   checkpoint [--n K] [--agente <id>] [--rotulo "<texto>"]
//   pular      --agente <id>
//   concluir
//   falhar     [--motivo "<texto>"]
// <crew> é o nome da pasta em `crews/`. Só grava quando o Dashboard não está explicitamente off em
// `_opencrew/_memory/preferences.md`.
// Última linha da saída (o runner lê esta linha): ESTADO:OK, ESTADO:OK — estado recriado,
// ESTADO:OK — agente do passo <K>: <id> (o `--agente` não era o do passo: valeu o do passo) ou
// ESTADO:IGNORADO — <motivo>. Código de saída: 0 sempre que a linha ESTADO: sai · 1 = erro de uso
// (crew ou evento faltando, evento fora da lista, pasta sem `_opencrew/`, crew inexistente ou
// fora de `crews/`); com código 1 não há linha ESTADO: e nada é escrito.
// Spec: fase-e1-escritorio-ao-vivo.md e fase-e4-robustez-do-escritorio.md, regras 12 e 13
// (repositório do OpenCrew).
import { existsSync, lstatSync, statSync } from 'node:fs';
import path from 'node:path';
import { MSG, dentroDoProjeto, ehPrincipal, realDentroDe } from './comum.mjs';
import { RUN } from './caminho/argumentos.mjs';
import { USO, lerArgs, limparTexto } from './estado/argumentos.mjs';
import { EVENTOS } from './estado/nucleo.mjs';
import { MOTIVO, decidir } from './estado/decisao.mjs';
import { lerElenco } from './estado/elenco.mjs';
import { lerEstado, gravarEstado } from './estado/arquivo.mjs';
import { escritorioLigado } from './estado/preferencia.mjs';
import { agenteDoPasso } from './estado/passo-agente.mjs';
import { comTrava } from './trava.mjs';

const OK = 'ESTADO:OK';
const RECRIADO = 'ESTADO:OK — estado recriado';
const DO_PASSO = (n, agente) => `ESTADO:OK — agente do passo ${n}: ${agente ?? 'nenhum'}`;
const COM_PASSO = ['passo', 'checkpoint'];
const ARQUIVO_RUN = 'estado-escritorio.json';
/** A resposta é sempre uma linha só, mesmo que o motivo traga um id ou um erro com quebra. */
const ignorado = (motivo) => `ESTADO:IGNORADO — ${motivo}`.replace(/\s*[\r\n]+\s*/g, ' ');

const LISTA = [...EVENTOS, 'desvincular'].join(', ');
const SESSAO = /^[A-Za-z0-9_-]{8,128}$/;

function ehPasta(caminho) {
  try {
    return statSync(caminho).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Onde fica a crew, ou o erro de uso. A crew é uma pasta direta de `crews/` (`crews/<nome>`
 * também vale): só assim o único arquivo escrito é `crews/<crew>/state.json`.
 * @returns {{ erro: string } | { pasta: string, crew: string }}
 */
function localizar(raiz, { crew, evento, opcoes }) {
  if (!crew) return { erro: 'Falta o nome da crew.' };
  if (!evento) return { erro: `Falta o evento. Eventos: ${LISTA}.` };
  if (!EVENTOS.includes(evento) && evento !== 'desvincular') return { erro: `Evento desconhecido: ${limparTexto(evento)}. Eventos: ${LISTA}.` };
  if ((opcoes.sessao !== undefined || evento === 'desvincular')
    && (!opcoes.run || !SESSAO.test(opcoes.sessao ?? '') || !['iniciar', 'desvincular'].includes(evento))) {
    return { erro: 'Informe --run e um identificador de --sessao válido em iniciar ou desvincular.' };
  }
  if (!ehPasta(path.join(raiz, '_opencrew'))) return { erro: MSG.semRaiz };
  const base = path.resolve(raiz, 'crews');
  const nome = crew.replace(/^crews[\\/]+/, '');
  if (!dentroDoProjeto(base, nome)) return { erro: MSG.foraDoProjeto(limparTexto(crew)) };
  const pasta = path.resolve(base, nome);
  if (path.dirname(pasta) !== base || !ehPasta(pasta)) return { erro: MSG.crewNaoEncontrada(limparTexto(crew)) };
  const crewNome = path.basename(pasta);
  if (opcoes.run === null) return { pasta, crew: crewNome, arquivo: path.join(pasta, 'state.json') };
  if (!RUN.test(opcoes.run)) return { erro: 'O --run precisa ser o run_id de uma execução.' };
  const saida = path.join(pasta, 'output');
  const execucao = path.join(saida, opcoes.run);
  if (!ehPasta(execucao) || !realDentroDe(raiz, execucao) || !realDentroDe(saida, execucao)) {
    return { erro: 'A pasta do run_id não existe ou fica fora da pasta de saída da crew.' };
  }
  const arquivo = path.join(execucao, ARQUIVO_RUN);
  try {
    if (existsSync(arquivo) && lstatSync(arquivo).isSymbolicLink()) return { erro: 'O estado do Escritório da execução é um link simbólico; não gravei.' };
  } catch {
    return { erro: 'Não consegui conferir o estado do Escritório da execução; não gravei.' };
  }
  return { pasta, crew: crewNome, arquivo, runId: opcoes.run };
}

async function desvincular(arquivo, estado, sessao, agora, deps) {
  if (estado?.sessao !== sessao) return ignorado('este run não pertence a esta sessão');
  if (estado.desvinculadoEm) return OK;
  return (await gravarEstado(arquivo, { ...estado, desvinculadoEm: agora }, deps)) ? OK : ignorado(MOTIVO.naoGravou);
}

/** Confere a preferência, lê o elenco e o estado, decide e grava. Devolve a linha `ESTADO:`. */
async function responder({ raiz, pasta, crew, arquivo, runId }, args, deps) {
  const agora = (deps.agora ?? (() => new Date().toISOString()))();
  const { evento, opcoes } = args;
  const estado = await lerEstado(arquivo);
  if (runId && estado && estado.runId !== runId) return ignorado('o arquivo existente não pertence a esta execução');
  if (evento === 'desvincular') return desvincular(arquivo, estado, opcoes.sessao, agora, deps);
  if (runId && existsSync(arquivo) && !estado) {
    const motivo = 'o estado existente da execução é inválido; não gravei';
    return evento === 'iniciar' ? `ESTADO:PARCIAL — ${motivo}` : ignorado(motivo);
  }
  if (runId && evento === 'iniciar' && estado) {
    const retomado = {
      ...estado,
      status: 'running',
      updatedAt: agora,
      agents: estado.agents.map((a) => ['checkpoint', 'failed'].includes(a?.status) ? { ...a, status: 'idle' } : a),
    };
    delete retomado.desvinculadoEm;
    if (opcoes.sessao) retomado.sessao = opcoes.sessao;
    else delete retomado.sessao;
    if (!(await gravarEstado(arquivo, retomado, deps))) return ignorado(MOTIVO.naoGravou);
    return OK; // A retomada renova o sinal sem apagar o passo salvo.
  }
  const elenco = await lerElenco(pasta);
  const pedido = args.opcoes.agente ?? null;
  // O agente é o do passo; o `--agente` só vale quando não dá para saber qual é o passo.
  const doPasso = COM_PASSO.includes(args.evento) && !args.opcoes.pedido ? agenteDoPasso({ raiz, crew, estado, n: args.opcoes.n, ids: elenco.map((a) => a.id) }) : null;
  const agente = doPasso ? doPasso.agente : pedido;
  const decisao = decidir(estado, { tipo: args.evento, ...args.opcoes, agente, crew, elenco, agora, runId, pedido: args.opcoes.pedido });
  if (decisao.ignorado) return ignorado(decisao.ignorado);
  const sessao = evento === 'iniciar' ? opcoes.sessao : estado?.sessao;
  const fim = estado?.desvinculadoEm;
  const novo = { ...decisao.estado, ...(sessao ? { sessao } : {}), ...(fim ? { desvinculadoEm: fim } : {}) };
  if (!(await gravarEstado(arquivo, novo, deps))) return ignorado(MOTIVO.naoGravou);
  if (agente !== pedido) return DO_PASSO(args.opcoes.n, agente);
  return decisao.recriado ? RECRIADO : OK;
}

async function responderSerializado(raiz, local, args, deps) {
  if (args.evento !== 'desvincular' && !(await escritorioLigado(raiz))) return ignorado(MOTIVO.desligado);
  const executar = () => responder({ raiz, ...local }, args, deps);
  return local.runId ? comTrava(local.arquivo, executar) : executar();
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto) e `escrever`; SÓ PARA TESTE: `agora` (a hora,
 *   em ISO), `renomear` e `esperar` (a troca de nome e a espera da gravação)
 * @returns {Promise<number>} 0 = a linha `ESTADO:` saiu · 1 = erro de uso (a linha de uso e o
 *   motivo, sem linha `ESTADO:`, nada escrito)
 */
export async function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = deps;
  const args = lerArgs(argv);
  const local = localizar(cwd, args);
  if (local.erro) {
    escrever(USO);
    escrever(local.erro);
    return 1;
  }
  // O escritório nunca para a execução: o que der errado daqui em diante vira ESTADO:IGNORADO.
  escrever(await responderSerializado(cwd, local, args, deps).catch((erro) => ignorado(MOTIVO.inesperado(erro))));
  return 0;
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
