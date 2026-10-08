#!/usr/bin/env node
// Registro da execução de uma crew: os marcos (resposta de checkpoint, veredito da revisão), o
// fecho — que grava a linha do histórico (`runs.md`) — e de onde uma execução interrompida continua.
// Quem grava o registro e o histórico é este script (e o `caminho.mjs`), nunca a IA.
// Uso (na pasta do projeto): node _opencrew/core/scripts/execucao.mjs <crew> <ação> [opções]
//   marcar  --run <id> --passo N --evento checkpoint|revisao --resultado <r> [--nota "<texto>"] [--tema "<texto>"]
//           checkpoint: aprovado, corrigido ou pulado · revisao: aprovado ou rejeitado
//   fechar  --run <id> --resultado aprovado|rejeitado|abortado|publicado [--saida "<descrição>"] [--tema "<texto>"]
//   retomar [--run <id>]                      a execução aberta mais recente (ou a de --run)
// <crew> é o nome da pasta em `crews/`.
// Só grava `crews/<crew>/output/<id>/execucao.json` e, no `fechar`, uma linha de
// `crews/<crew>/_memory/runs.md` (posta ou trocada); `retomar` só lê. Nunca apaga.
// Última linha da saída (o runner lê esta linha): EXECUCAO:OK · EXECUCAO:FECHADA <resultado> <score>
// · EXECUCAO:RETOMAR <id> <próximo passo> · EXECUCAO:NADA (nenhuma execução aberta).
// Código de saída: 0 sempre que a linha EXECUCAO: sai — também quando o registro ou o histórico
// não pôde ser gravado (o aviso vem antes da linha) · 1 = erro de uso; nada é gravado.
// Spec: fase-u5c-execucao-registrada.md (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ehPrincipal, realDentroDe } from './comum.mjs';
import { limpar } from './caminho/argumentos.mjs';
import { acharCrew } from './caminho/crew.mjs';
import { ehPasta } from './caminho/disco.mjs';
import { gravarTexto } from './estado/arquivo.mjs';
import { USO, erroDeArgumentos, lerArgs } from './execucao/argumentos.mjs';
import { ROTULO, comLinha, dataDe, linhaDe } from './execucao/historico.mjs';
import { PEDIDO, anotar, comMarco, comTema, fechado, gravarRegistro, lerRegistro, limparNota, motivoDe, novoRegistro, score } from './execucao/registro.mjs';
import { correcoesRecentes, retomar } from './execucao/retomar.mjs';

const MSG = {
  semExecucao: (run) => `Execução não encontrada: ${limpar(run)}`,
  semRegistro: 'O registro desta execução não existia ou estava ilegível: a linha do histórico saiu só com o que este comando informou.',
  semHistorico: (motivo) => `Não consegui gravar o histórico desta execução: ${motivo}`,
  naoUtf8: 'o arquivo runs.md não está em UTF-8; salve-o em UTF-8 e feche a execução de novo',
  falha: (motivo) => `Não consegui registrar a execução: ${limpar(motivo)}`,
};

/** Onde fica a crew e, quando o comando cita uma execução, a pasta dela; ou o erro de uso. */
function localizar(raiz, args) {
  const erro = erroDeArgumentos(args);
  if (erro) return { erro };
  const achada = acharCrew(raiz, args.crew);
  if (achada.erro) return achada;
  const saida = path.resolve(raiz, 'crews', achada.crew, 'output');
  const pasta = path.join(saida, args.run ?? '');
  // A pasta tem de existir e ficar mesmo dentro de `output/` (um atalho que leva para fora não vale).
  const valida = ehPasta(pasta) && realDentroDe(saida, pasta);
  return args.acao !== 'retomar' && !valida ? { erro: MSG.semExecucao(args.run) } : { crew: achada.crew, pasta };
}

async function marcar({ pasta, base }, args) {
  const marco = { passo: Number(args.passo), evento: args.evento, resultado: args.resultado, nota: limparNota(args.nota), em: base.em };
  const aviso = await anotar(pasta, base, (registro) => comMarco(comTema(registro, args.tema), marco));
  return [aviso, 'EXECUCAO:OK'];
}

/** O texto do arquivo, com o BOM se houver; `undefined` quando os bytes não são UTF-8 (o arquivo não é regravado). */
function emUtf8(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/** Regra 7: a linha da execução no `runs.md` da crew. @returns {Promise<string|null>} o aviso, ou `null` */
async function gravarHistorico({ raiz, crew, base: { run } }, linha) {
  const arquivo = path.resolve(raiz, 'crews', crew, '_memory', 'runs.md');
  try {
    const bytes = await fs.readFile(arquivo).catch((erro) => (erro.code === 'ENOENT' ? null : Promise.reject(erro)));
    const atual = bytes === null ? null : emUtf8(bytes);
    if (atual === undefined) return MSG.semHistorico(MSG.naoUtf8);
    await fs.mkdir(path.dirname(arquivo), { recursive: true });
    await gravarTexto(arquivo, comLinha(atual, { crew, run, linha }));
    return null;
  } catch (erro) {
    return MSG.semHistorico(motivoDe(erro));
  }
}

/** Regra 8 da U5d: no histórico, o tema de um pedido começa por "Pedido: ". */
const temaNoHistorico = (registro) => (registro.tipo === PEDIDO ? `Pedido: ${registro.tema || 'sem tema'}` : registro.tema);

async function fechar(ctx, args) {
  const { raiz, crew, pasta, base, agora } = ctx;
  const lido = await lerRegistro(pasta);
  const registro = fechado(comTema(lido ?? novoRegistro(base), args.tema), { resultado: args.resultado, saida: args.saida, em: base.em });
  const avisos = [lido ? null : MSG.semRegistro, await gravarRegistro(pasta, registro)];
  const pontos = score(registro);
  const linha = linhaDe({ data: dataDe(base.run, agora), run: base.run, tema: temaNoHistorico(registro), saida: registro.saida, score: pontos, resultado: ROTULO[args.resultado] });
  const semHistorico = await gravarHistorico(ctx, linha);
  return [...avisos, semHistorico ?? linha, ...(await correcoesRecentes(raiz, crew)), `EXECUCAO:FECHADA ${args.resultado} ${pontos}`];
}

async function responder(raiz, crew, pasta, args, agora) {
  if (args.acao === 'retomar') return retomar(raiz, crew, args.run);
  const base = { crew, run: args.run, em: agora.toISOString() };
  const acao = args.acao === 'marcar' ? marcar : fechar;
  return (await acao({ raiz, crew, pasta, base, agora }, args)).filter(Boolean);
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto), `escrever` e `agora` (o relógio)
 * @returns {Promise<number>} 0 = a linha `EXECUCAO:` saiu · 1 = erro de uso ou falha de leitura
 *   (a linha de uso e o motivo, ou só o erro; sem linha `EXECUCAO:`)
 */
export async function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`), agora = () => new Date() } = deps;
  const args = lerArgs(argv);
  const local = localizar(cwd, args);
  if (local.erro) {
    escrever(USO);
    escrever(local.erro);
    return 1;
  }
  try {
    (await responder(cwd, local.crew, local.pasta, args, agora())).forEach((linha) => escrever(linha));
    return 0;
  } catch (erro) {
    escrever(MSG.falha(erro?.message ?? erro));
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
