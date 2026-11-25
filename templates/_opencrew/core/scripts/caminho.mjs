#!/usr/bin/env node
// Caminho da execução de uma crew: diz onde cada passo grava, de onde lê e se o arquivo gravado
// está lá. Quem calcula é este script, igual em qualquer sistema — a IA não monta o caminho.
// Uso (na pasta do projeto): node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]
//   pasta    [--run <id> | --nova] [--tema "<texto>"] [--passos N | --pedido [--agente <id>] [--formato <id>]]
//                                             cria crews/<crew>/output/<id>/ e o registro da
//                                             execução; sem --run, o id é a data e a hora do
//                                             computador (AAAA-MM-DD-HHmmss); --pedido: a execução
//                                             é um pedido avulso à crew, sem pipeline. Sem --run:
//                                             se a crew tem execução vinculada a uma sessão, com atividade nas
//                                             últimas 2 horas, não cria nada e responde
//                                             CAMINHO:ABERTA <id>; --nova cria assim mesmo
//   saida    --run <id> --arquivo <declarado> onde o passo grava (abre a pasta de versão seguinte)
//   entrada  --run <id> --arquivo <declarado> a saída mais nova desse arquivo
//   conferir --arquivo <caminho já resolvido> [--passo N] [--secoes N] [--tldr]
//                                             com --passo, o arquivo aprovado entra no registro
// <crew> é o nome da pasta em `crews/`. <declarado> é o `inputFile` ou `outputFile` do passo.
// Em uma execução organizada, também grava índice, rascunhos próprios e revisões conferidas.
// Última linha da saída (o runner lê esta linha): CAMINHO:OK <caminho>, CAMINHO:FALTA <caminho>,
// CAMINHO:REPROVADO <motivo> ou CAMINHO:ABERTA <id> (as linhas antes dela dizem o que perguntar ao
// usuário); o caminho sai relativo à pasta do projeto, com `/`.
// Código de saída: 0 sempre que a linha CAMINHO: sai · 1 = erro de uso (ação ou opção faltando,
// pasta sem `_opencrew/`, crew inexistente ou fora do projeto); com código 1 não há linha
// CAMINHO: e nada é criado.
// Specs: fase-r3-runner-em-uso-real.md, fase-u5c-execucao-registrada.md, regras 1 a 5, e
// fase-e4-robustez-do-escritorio.md, regras 8 e 9 (repositório do OpenCrew).
import path from 'node:path';
import { ehPrincipal, realDentroDe } from './comum.mjs';
import { RUN, USO, lerArgs, limpar } from './caminho/argumentos.mjs';
import { pasta } from './caminho/pasta.mjs';
import { ARQUIVO, anotar, comPasso, lerRegistro } from './execucao/registro.mjs';
import { MOTIVO, daMaisNova, motivoDeReprovacao, naExecucao, normalizar, proximaVersao } from './caminho/nucleo.mjs';
import { criarPasta, lerTexto, pastasDe, temConteudo } from './caminho/disco.mjs';
import { reservarSaidas, consolidarRevisao } from './caminho/revisao.mjs';
import { lerAposConsolidacao } from './caminho/transacao.mjs';
import { comReservaProjeto } from './caminho/reserva.mjs';
import { localizar } from './caminho/validar.mjs';

const ok = (caminho) => `CAMINHO:OK ${caminho}`;
const falta = (caminho) => `CAMINHO:FALTA ${caminho}`;
const reprovado = (motivo) => `CAMINHO:REPROVADO ${motivo}`;

/** Regras 2 e 3: o caminho em que o passo grava; a pasta dele é criada. */
async function saida(raiz, crew, { run, arquivo, arquivos = [arquivo] }) {
  const local = naExecucao(arquivo, crew, run);
  const exec = `crews/${crew}/output/${run}`;
  const locais = arquivos.map((nome) => naExecucao(nome, crew, run));
  if (locais.some(Boolean) && (await lerRegistro(path.resolve(raiz, exec)))?.organizada) {
    return (await reservarSaidas(raiz, exec, arquivos.map(normalizar), locais)).map(ok);
  }
  if (arquivos.length > 1) {
    const grupos = new Map();
    const linhas = [];
    for (const nome of arquivos) {
      const item = naExecucao(nome, crew, run);
      if (!item) linhas.push(ok(normalizar(nome)));
      else if (grupos.has(item.grupo)) linhas.push(ok(`${grupos.get(item.grupo)}/${item.nome}`));
      else {
        const [linha] = await saida(raiz, crew, { run, arquivo: nome });
        grupos.set(item.grupo, path.posix.dirname(linha.slice('CAMINHO:OK '.length)));
        linhas.push(linha);
      }
    }
    return linhas;
  }
  if (!local) return [ok(normalizar(arquivo))];
  const pasta = `${local.grupo}/${proximaVersao(pastasDe(path.resolve(raiz, local.grupo)))}`;
  criarPasta(path.resolve(raiz, pasta));
  return [ok(`${pasta}/${local.nome}`)];
}

/** Regra 4: a versão mais nova que tem o arquivo; depois, o próprio grupo, sem pasta de versão. */
async function entrada(raiz, crew, { run, arquivo }) {
  const local = naExecucao(arquivo, crew, run);
  if (local) {
    const exec = `crews/${crew}/output/${run}`;
    const registro = await lerAposConsolidacao(path.resolve(raiz, exec));
    const nome = `${local.grupo}/${local.nome}`.slice(exec.length + 1);
    const revisao = registro?.revisoes?.[nome];
    if (registro?.organizada && revisao?.arquivo?.startsWith(`${exec}/`)) {
      const pasta = path.resolve(raiz, exec);
      const alvo = path.resolve(raiz, revisao.arquivo);
      return realDentroDe(pasta, alvo) && temConteudo(alvo) ? ok(revisao.arquivo) : falta(revisao.arquivo);
    }
  }
  const { grupo, nome } = local ?? { grupo: path.posix.dirname(normalizar(arquivo)), nome: path.posix.basename(normalizar(arquivo)) };
  const versoes = local ? daMaisNova(pastasDe(path.resolve(raiz, grupo))) : [];
  const candidatos = [...versoes.map((versao) => `${grupo}/${versao}/${nome}`), local ? `${grupo}/${nome}` : normalizar(arquivo)];
  const achado = candidatos.find((caminho) => temConteudo(path.resolve(raiz, caminho)));
  return achado ? ok(achado) : falta(candidatos.at(-1));
}

/** Regra 5: o arquivo gravado existe, não está vazio e tem o que o contrato do passo pede. */
function conferir(raiz, { arquivo, secoes, tldr }) {
  const caminho = normalizar(arquivo);
  const alvo = path.resolve(raiz, caminho);
  if (!temConteudo(alvo)) return reprovado(MOTIVO.ausente);
  const pedido = { secoes: secoes === undefined ? null : Number(secoes), tldr };
  const motivo = pedido.secoes !== null || tldr ? motivoDeReprovacao(lerTexto(alvo), pedido) : null;
  return motivo ? reprovado(motivo) : ok(caminho);
}

/**
 * A execução de um arquivo conferido: a pasta logo depois de `crews/<crew>/output/`, se ela é de
 * execução (tem registro, ou o nome começa por data) e fica mesmo dentro de `output/` — uma pasta
 * qualquer do usuário, ou um atalho que leva para fora, não ganha registro.
 */
function execucaoDe(raiz, caminho, crew) {
  const saida = `crews/${crew}/output/`;
  const [run, ...resto] = caminho.startsWith(saida) ? caminho.slice(saida.length).split('/') : [];
  if (!resto.length || !RUN.test(run) || resto.includes('..')) return null;
  const pasta = path.resolve(raiz, saida, run);
  const ehExecucao = /^\d{4}-\d{2}-\d{2}/.test(run) || temConteudo(path.join(pasta, ARQUIVO));
  return ehExecucao && realDentroDe(path.resolve(raiz, saida), pasta) ? run : null;
}

/** Regra 2 da U5c: o arquivo que passou na conferência entra no registro, como a saída do passo. */
async function conferirERegistrar(raiz, crew, args, em) {
  const arquivos = args.arquivos ?? [args.arquivo];
  const linhas = arquivos.map((arquivo, i) => conferir(raiz, i === 0 ? args : { arquivo }));
  const falha = linhas.find((item) => item.startsWith('CAMINHO:REPROVADO'));
  if (falha) return [falha];
  const confirmados = arquivos.map(normalizar);
  const base = `crews/${crew}/output/`;
  const rascunhos = confirmados.filter((p) => p.startsWith(base) && p.slice(base.length).split('/')[1] === 'rascunhos');
  const caminho = rascunhos[0] ?? confirmados[0];
  const run = caminho && args.passo ? execucaoDe(raiz, caminho, crew) : null;
  if (!run) return linhas;
  const pasta = path.resolve(raiz, 'crews', crew, 'output', run);
  if (rascunhos.length) {
    const lote = await consolidarRevisao(raiz, pasta, rascunhos, Number(args.passo), em);
    return confirmados.map((p) => ok(lote[rascunhos.indexOf(p)] ?? p));
  }
  return [await anotar(pasta, { crew, run, em }, (registro) => comPasso(registro, { n: Number(args.passo), arquivo: caminho, em })), ...linhas];
}

async function responder(raiz, crew, args, agora) {
  if (args.acao === 'saida') return saida(raiz, crew, args);
  if (args.acao === 'entrada') return [await entrada(raiz, crew, args)];
  if (args.acao === 'conferir') return conferirERegistrar(raiz, crew, args, agora.toISOString());
  return pasta(raiz, crew, args, agora);
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto), `escrever` e `agora` (o relógio, para o id da execução)
 * @returns {Promise<number>} 0 = a linha `CAMINHO:` saiu · 1 = erro de uso, ou falha ao ler ou
 *   criar pasta (a linha de uso e o motivo, ou só o erro; sem linha `CAMINHO:`)
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
    const linhas = args.acao === 'pasta'
      ? await novaExecucao(cwd, local.crew, args, agora)
      : await responder(cwd, local.crew, args, agora());
    linhas.filter(Boolean).forEach((linha) => escrever(linha));
    return 0;
  } catch (erro) {
    escrever(`Não consegui resolver o caminho: ${limpar(erro?.message ?? erro)}`);
    return 1;
  }
}

async function novaExecucao(raiz, crew, args, agora) {
  return comReservaProjeto(raiz, () => responder(raiz, crew, args, agora()));
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
