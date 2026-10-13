#!/usr/bin/env node
// Estado da execução de uma crew, para o escritório ao vivo: grava `crews/<crew>/state.json`,
// e só ele. Quem grava é este script, um comando por evento — a IA não monta o JSON.
// Uso (na pasta do projeto): node _opencrew/core/scripts/estado.mjs <crew> <evento> [opções]
//   iniciar    [--passos N]
//   passo      [--n K] [--agente <id>] [--rotulo "<texto>"] [--mensagem "<texto>"]
//   checkpoint [--n K] [--agente <id>] [--rotulo "<texto>"]
//   pular      --agente <id>
//   concluir
//   falhar     [--motivo "<texto>"]
// <crew> é o nome da pasta em `crews/`. Só grava com `Dashboard: enabled` em
// `_opencrew/_memory/preferences.md`.
// Última linha da saída (o runner lê esta linha): ESTADO:OK, ESTADO:OK — estado recriado,
// ESTADO:OK — agente do passo <K>: <id> (o `--agente` não era o do passo: valeu o do passo) ou
// ESTADO:IGNORADO — <motivo>. Código de saída: 0 sempre que a linha ESTADO: sai · 1 = erro de uso
// (crew ou evento faltando, evento fora da lista, pasta sem `_opencrew/`, crew inexistente ou
// fora de `crews/`); com código 1 não há linha ESTADO: e nada é escrito.
// Spec: fase-e1-escritorio-ao-vivo.md e fase-e4-robustez-do-escritorio.md, regras 12 e 13
// (repositório do OpenCrew).
import { statSync } from 'node:fs';
import path from 'node:path';
import { MSG, dentroDoProjeto, ehPrincipal } from './comum.mjs';
import { USO, lerArgs, limparTexto } from './estado/argumentos.mjs';
import { EVENTOS } from './estado/nucleo.mjs';
import { MOTIVO, decidir } from './estado/decisao.mjs';
import { lerElenco } from './estado/elenco.mjs';
import { lerEstado, gravarEstado } from './estado/arquivo.mjs';
import { escritorioLigado } from './estado/preferencia.mjs';
import { agenteDoPasso } from './estado/passo-agente.mjs';

const OK = 'ESTADO:OK';
const RECRIADO = 'ESTADO:OK — estado recriado';
const DO_PASSO = (n, agente) => `ESTADO:OK — agente do passo ${n}: ${agente ?? 'nenhum'}`;
const COM_PASSO = ['passo', 'checkpoint'];
/** A resposta é sempre uma linha só, mesmo que o motivo traga um id ou um erro com quebra. */
const ignorado = (motivo) => `ESTADO:IGNORADO — ${motivo}`.replace(/\s*[\r\n]+\s*/g, ' ');

const LISTA = EVENTOS.join(', ');

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
function localizar(raiz, { crew, evento }) {
  if (!crew) return { erro: 'Falta o nome da crew.' };
  if (!evento) return { erro: `Falta o evento. Eventos: ${LISTA}.` };
  if (!EVENTOS.includes(evento)) return { erro: `Evento desconhecido: ${limparTexto(evento)}. Eventos: ${LISTA}.` };
  if (!ehPasta(path.join(raiz, '_opencrew'))) return { erro: MSG.semRaiz };
  const base = path.resolve(raiz, 'crews');
  const nome = crew.replace(/^crews[\\/]+/, '');
  if (!dentroDoProjeto(base, nome)) return { erro: MSG.foraDoProjeto(limparTexto(crew)) };
  const pasta = path.resolve(base, nome);
  if (path.dirname(pasta) !== base || !ehPasta(pasta)) return { erro: MSG.crewNaoEncontrada(limparTexto(crew)) };
  return { pasta, crew: path.basename(pasta) };
}

/** Confere a preferência, lê o elenco e o estado, decide e grava. Devolve a linha `ESTADO:`. */
async function responder({ raiz, pasta, crew }, args, deps) {
  if (!(await escritorioLigado(raiz))) return ignorado(MOTIVO.desligado);
  const agora = (deps.agora ?? (() => new Date().toISOString()))();
  const elenco = await lerElenco(pasta);
  const arquivo = path.join(pasta, 'state.json');
  const estado = await lerEstado(arquivo);
  const pedido = args.opcoes.agente ?? null;
  // O agente é o do passo; o `--agente` só vale quando não dá para saber qual é o passo.
  const doPasso = COM_PASSO.includes(args.evento) ? agenteDoPasso({ raiz, crew, estado, n: args.opcoes.n, ids: elenco.map((a) => a.id) }) : null;
  const agente = doPasso ? doPasso.agente : pedido;
  const decisao = decidir(estado, { tipo: args.evento, ...args.opcoes, agente, crew, elenco, agora });
  if (decisao.ignorado) return ignorado(decisao.ignorado);
  if (!(await gravarEstado(arquivo, decisao.estado, deps))) return ignorado(MOTIVO.naoGravou);
  if (agente !== pedido) return DO_PASSO(args.opcoes.n, agente);
  return decisao.recriado ? RECRIADO : OK;
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
  escrever(await responder({ raiz: cwd, ...local }, args, deps).catch((erro) => ignorado(MOTIVO.inesperado(erro))));
  return 0;
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
