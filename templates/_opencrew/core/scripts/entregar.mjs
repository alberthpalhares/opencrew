#!/usr/bin/env node
// Entrega de uma execução: separa os arquivos aprovados por canal, com texto pronto para colar e
// um LEIA-ME que diz o que fazer com cada arquivo.
// Uso (na pasta do projeto): node _opencrew/core/scripts/entregar.mjs --crew "crews/<crew>"
//   --run "<id>" --arquivo "<caminho=formato>[,<caminho=formato>…]" [--vai-publicar <canal>] [--ajuda]
//   --arquivo: a lista do verificador (o "=formato" é opcional); entra o que estiver nela e existir.
//   --vai-publicar: canal que a crew publica sozinha (pode repetir); o LEIA-ME avisa.
// Grava só em crews/<crew>/output/<run>/: a pasta `entrega/` (refeita do zero a cada chamada,
// montada em `entrega.tmp/`) e, ao lado, `verificacao-entrega.md`.
// Última linha da saída (o runner lê esta linha): ENTREGA:OK (nenhuma pendência) ou
// ENTREGA:INCOMPLETA (algum canal não está pronto, ou a gravação falhou).
// Código de saída: 0 sempre que a linha ENTREGA: sai, e em --ajuda · 1 = erro de uso ou erro que
// impediu a entrega inteira; com código 1 não há linha ENTREGA: e nada é escrito.
// Spec: fase-u3a1-pasta-de-entrega.md (repositório do OpenCrew).
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { MSG as COMUM, erroDeUso, ehPrincipal, relativoAoProjeto } from './comum.mjs';
import { formatarRelatorio, verificar } from './verificar.mjs';
import { USO, lerArgs, lerLista, limpar, runValido } from './entrega/argumentos.mjs';
import { CANAIS, OUTROS, canalDoFormato, ehCanal, ehDeServico } from './entrega/canais.mjs';
import { separar } from './entrega/separar.mjs';
import { nomear } from './entrega/nomes.mjs';
import { alertasDeTamanho, frasesDePendencia, naoConferido, pendenciasPorPasta } from './entrega/pendencias.mjs';
import { TEXTO, montarLeiame } from './entrega/leiame.mjs';
import { gravarEntrega } from './entrega/gravar.mjs';

const MSG = {
  desconhecida: (opcao) => `Opção desconhecida: ${limpar(opcao)}.`,
  semExecucao: (run, lista) => `Execução não encontrada: ${limpar(run)}. Execuções desta crew: ${lista.join(', ') || 'nenhuma'}.`,
  nenhumArquivo: 'Nenhum arquivo da lista foi encontrado.',
  deServico: (arquivo) => `${arquivo} é arquivo de serviço e não entra na entrega.`,
  semCanal: (canal) => `Canal não encontrado nesta entrega: ${limpar(canal)}.`,
  falhaDeEscrita: (arquivo) => `Não consegui gravar ${arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo.`,
};

const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();
const tipoNoDisco = (p) => (!existsSync(p) ? 'ausente' : statSync(p).isDirectory() ? 'pasta' : 'arquivo');
const execucoes = (saida) => (ehPasta(saida) ? readdirSync(saida, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : []);

/** Erro de uso, na ordem da §6: `{ mensagem, comUso }`, ou null quando a chamada está certa. */
function erroDeChamada(raiz, args, pedidos) {
  if (args.desconhecida) return { mensagem: MSG.desconhecida(args.desconhecida), comUso: true };
  const faltando = [['--crew', args.crew], ['--run', args.run], ['--arquivo', pedidos.length]].filter(([, v]) => !v).map(([opcao]) => opcao);
  const comum = erroDeUso({ raiz, faltando, crew: args.crew, caminhos: pedidos.map((p) => p.arquivo) });
  if (comum) return { mensagem: comum, comUso: faltando.length > 0 };
  const crew = path.resolve(raiz, args.crew);
  if (!existsSync(path.join(crew, 'crew.yaml'))) return { mensagem: COMUM.crewNaoEncontrada(args.crew) };
  const saida = path.join(crew, 'output');
  if (!runValido(args.run) || !ehPasta(path.join(saida, args.run))) return { mensagem: MSG.semExecucao(args.run, execucoes(saida)) };
  return null;
}

/** Cada item da lista, uma vez: onde fica, se existe, se é de serviço e qual é o canal do formato. */
async function classificar(raiz, pedidos) {
  const itens = [];
  const vistos = new Set();
  for (const { arquivo, formato } of pedidos) {
    const abs = path.resolve(raiz, arquivo);
    if (vistos.has(`${abs}|${formato ?? ''}`)) continue;
    vistos.add(`${abs}|${formato ?? ''}`);
    const rel = relativoAoProjeto(raiz, arquivo);
    itens.push({ arquivo, formato, abs, rel, tipo: tipoNoDisco(abs), servico: ehDeServico(rel), canal: await canalDoFormato(raiz, formato) });
  }
  return itens;
}

/** Verifica na origem, separa por canal e monta tudo o que a entrega mostra; não escreve nada. */
async function montar(raiz, args, itens) {
  const arquivosDaLista = itens.map((i) => (i.formato ? { arquivo: i.arquivo, formato: i.formato } : i.arquivo));
  const verificacao = await verificar({ raiz, crew: args.crew, arquivos: arquivosDaLista, semPadraoDeBlog: true });
  const { arquivos, avisos } = nomear(await separar(itens));
  const pendencias = pendenciasPorPasta(raiz, itens, verificacao);
  const presentes = new Set([...arquivos.map((a) => a.pasta), ...pendencias.keys()]);
  const dados = {
    crew: path.basename(path.resolve(raiz, args.crew)), run: args.run, arquivos, avisos, pendencias,
    pastas: Object.keys(CANAIS).filter((c) => presentes.has(c)),
    alertas: await alertasDeTamanho(raiz, itens, arquivos, verificacao),
    naoConferido: naoConferido(raiz, itens, verificacao),
    vaiPublicar: args.vaiPublicar,
  };
  return { dados, leiame: montarLeiame(dados), relatorio: `${formatarRelatorio(verificacao)}\n` };
}

/** O resumo da tela: a pasta, a situação de cada canal, o que falta, os avisos e o LEIA-ME. */
function resumo(execucao, { crew, run, pastas, pendencias, avisos, alertas }, deServico) {
  const comPendencia = [...pastas, OUTROS].filter((p) => pendencias.has(p));
  const notas = [...alertas, ...deServico.map((i) => MSG.deServico(i.rel)), ...avisos.map((a) => a.tela ?? a.texto)];
  return [
    `Entrega da execução ${run} da crew ${crew}`,
    `Pasta: ${execucao}/entrega`,
    ...pastas.map((p) => `- ${CANAIS[p]}: ${pendencias.has(p) ? TEXTO.naoPronto : TEXTO.pronto}`),
    ...frasesDePendencia(comPendencia, pendencias).flatMap((frase, i) => [frase, ...pendencias.get(comPendencia[i]).map((l) => `- ${l}`)]),
    ...(notas.length ? ['Avisos:', ...notas.map((l) => `- ${l}`)] : []),
    `LEIA-ME: ${execucao}/entrega/LEIA-ME.md`,
  ];
}

async function entregar(raiz, args, itens, escrever) {
  const validos = itens.filter((i) => !i.servico);
  const execucao = relativoAoProjeto(raiz, path.join(args.crew, 'output', args.run));
  const { dados, leiame, relatorio } = await montar(raiz, args, validos);
  const falha = await gravarEntrega(path.resolve(raiz, execucao), dados.arquivos, { leiame, relatorio });
  if (falha) {
    escrever(MSG.falhaDeEscrita(relativoAoProjeto(raiz, falha)));
    escrever('ENTREGA:INCOMPLETA');
    return 0;
  }
  for (const linha of resumo(execucao, dados, itens.filter((i) => i.servico))) escrever(linha);
  escrever(dados.pendencias.size ? 'ENTREGA:INCOMPLETA' : 'ENTREGA:OK');
  return 0;
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto) e `escrever`
 * @returns {Promise<number>} 0 = a linha `ENTREGA:` saiu (ou `--ajuda`) · 1 = erro de uso, ou erro
 *   que impediu a entrega inteira (uma linha em PT-BR, sem linha `ENTREGA:`, nada escrito)
 */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = {}) {
  const args = lerArgs(argv);
  const sair = (...linhas) => linhas.forEach((l) => escrever(l)) ?? 1;
  if (args.ajuda) return sair(USO) && 0;
  const pedidos = lerLista(args.arquivos);
  const erro = erroDeChamada(cwd, args, pedidos);
  if (erro) return sair(erro.mensagem, ...(erro.comUso ? [USO] : []));
  try {
    const itens = await classificar(cwd, pedidos);
    const validos = itens.filter((i) => !i.servico);
    if (!validos.some((i) => i.tipo === 'arquivo')) return sair(MSG.nenhumArquivo);
    const canais = new Set(validos.map((i) => i.canal));
    const fora = args.vaiPublicar.find((canal) => !ehCanal(canal) || !canais.has(canal));
    if (fora !== undefined) return sair(MSG.semCanal(fora));
    return await entregar(cwd, args, itens, escrever);
  } catch (erroGeral) {
    return sair(`Não consegui montar a entrega: ${limpar(erroGeral?.message ?? erroGeral)}`);
  }
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
