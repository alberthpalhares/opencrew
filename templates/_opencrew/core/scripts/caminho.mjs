#!/usr/bin/env node
// Caminho da execução de uma crew: diz onde cada passo grava, de onde lê e se o arquivo gravado
// está lá. Quem calcula é este script, igual em qualquer sistema — a IA não monta o caminho.
// Uso (na pasta do projeto): node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]
//   pasta    [--run <id>] [--tema "<texto>"] [--passos N]
//                                             cria crews/<crew>/output/<id>/ e o registro da
//                                             execução; sem --run, o id é a data e a hora do
//                                             computador (AAAA-MM-DD-HHmmss)
//   saida    --run <id> --arquivo <declarado> onde o passo grava (abre a pasta de versão seguinte)
//   entrada  --run <id> --arquivo <declarado> a saída mais nova desse arquivo
//   conferir --arquivo <caminho já resolvido> [--passo N] [--secoes N] [--tldr]
//                                             com --passo, o arquivo aprovado entra no registro
// <crew> é o nome da pasta em `crews/`. <declarado> é o `inputFile` ou `outputFile` do passo.
// Só cria pastas, e só dentro de crews/<crew>/output/<id>/. O único arquivo que grava é o registro
// da execução (`crews/<crew>/output/<id>/execucao.json`); nunca altera nem apaga outro arquivo.
// Registro que não pôde ser gravado não muda a linha CAMINHO: — o aviso sai antes dela.
// Última linha da saída (o runner lê esta linha): CAMINHO:OK <caminho>, CAMINHO:FALTA <caminho>
// ou CAMINHO:REPROVADO <motivo>; o caminho sai relativo à pasta do projeto, com `/`.
// Código de saída: 0 sempre que a linha CAMINHO: sai · 1 = erro de uso (ação ou opção faltando,
// pasta sem `_opencrew/`, crew inexistente ou fora do projeto); com código 1 não há linha
// CAMINHO: e nada é criado.
// Specs: fase-r3-runner-em-uso-real.md e fase-u5c-execucao-registrada.md, regras 1 a 5
// (repositório do OpenCrew).
import path from 'node:path';
import { MSG, dentroDoProjeto, ehPrincipal, realDentroDe } from './comum.mjs';
import { RUN, USO, erroDeArgumentos, lerArgs, limpar } from './caminho/argumentos.mjs';
import { acharCrew } from './caminho/crew.mjs';
import { ARQUIVO, anotar, comPasso, limparTema } from './execucao/registro.mjs';
import { MOTIVO, daMaisNova, motivoDeReprovacao, naExecucao, normalizar, novoRun, proximaVersao } from './caminho/nucleo.mjs';
import { criarPasta, lerTexto, pastasDe, temConteudo } from './caminho/disco.mjs';

const ok = (caminho) => `CAMINHO:OK ${caminho}`;
const falta = (caminho) => `CAMINHO:FALTA ${caminho}`;
const reprovado = (motivo) => `CAMINHO:REPROVADO ${motivo}`;

/**
 * O arquivo declarado cabe na execução? Dentro de `output/`, depois de ganhar o run, ele tem de
 * continuar dentro da pasta da execução — pelo texto e pelo lugar real.
 * @returns {string|null} o erro de uso, ou `null`
 */
function erroDoArquivo(raiz, crew, { acao, run, arquivo }) {
  if (!dentroDoProjeto(raiz, arquivo)) return MSG.foraDoProjeto(limpar(arquivo));
  // `pasta` não usa arquivo, e `conferir` recebe o caminho já resolvido: nenhum dos dois o põe na execução.
  const local = acao === 'conferir' || acao === 'pasta' ? null : naExecucao(arquivo, crew, run);
  if (!local) return null;
  if (!local.nome) return `Falta o nome do arquivo em --arquivo: ${limpar(arquivo)}`;
  const execucao = path.resolve(raiz, 'crews', crew, 'output', run);
  const partes = normalizar(arquivo).split('/');
  const sai = partes.includes('..') || partes.includes('.') || !realDentroDe(execucao, path.resolve(raiz, local.grupo));
  return sai ? `Caminho fora da pasta da execução: ${limpar(arquivo)}` : null;
}

/**
 * Onde fica a crew, ou o erro de uso. A crew é uma pasta direta de `crews/` (`crews/<nome>`
 * também vale).
 * @returns {{ erro: string } | { crew: string }}
 */
function localizar(raiz, args) {
  const erro = erroDeArgumentos(args);
  if (erro) return { erro };
  const achada = acharCrew(raiz, args.crew);
  if (achada.erro) return achada;
  const doArquivo = args.arquivo ? erroDoArquivo(raiz, achada.crew, args) : null;
  return doArquivo ? { erro: doArquivo } : achada;
}

/** Regras 2 e 3: o caminho em que o passo grava; a pasta dele é criada. */
function saida(raiz, crew, { run, arquivo }) {
  const local = naExecucao(arquivo, crew, run);
  if (!local) return ok(normalizar(arquivo));
  const pasta = `${local.grupo}/${proximaVersao(pastasDe(path.resolve(raiz, local.grupo)))}`;
  criarPasta(path.resolve(raiz, pasta));
  return ok(`${pasta}/${local.nome}`);
}

/** Regra 4: a versão mais nova que tem o arquivo; depois, o próprio grupo, sem pasta de versão. */
function entrada(raiz, crew, { run, arquivo }) {
  const local = naExecucao(arquivo, crew, run);
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
  const linha = conferir(raiz, args);
  const [, caminho] = /^CAMINHO:OK (.*)$/.exec(linha) ?? [];
  const run = caminho && args.passo ? execucaoDe(raiz, caminho, crew) : null;
  if (!run) return [linha];
  const pasta = path.resolve(raiz, 'crews', crew, 'output', run);
  return [await anotar(pasta, { crew, run, em }, (registro) => comPasso(registro, { n: Number(args.passo), arquivo: caminho, em })), linha];
}

/** A pasta da execução; a que nasce agora ganha o registro (regras 1 e 3 da U5c: a que já existia fica como está). */
async function pasta(raiz, crew, args, agora) {
  const run = args.run || novoRun(agora, pastasDe(path.resolve(raiz, 'crews', crew, 'output')));
  const rel = `crews/${crew}/output/${run}`;
  const nova = criarPasta(path.resolve(raiz, rel));
  const base = { crew, run, tema: limparTema(args.tema), passos: args.passos ? Number(args.passos) : null, em: agora.toISOString() };
  return [nova ? await anotar(path.resolve(raiz, rel), base, (registro) => registro) : null, ok(rel)];
}

async function responder(raiz, crew, args, agora) {
  if (args.acao === 'saida') return [saida(raiz, crew, args)];
  if (args.acao === 'entrada') return [entrada(raiz, crew, args)];
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
    (await responder(cwd, local.crew, args, agora())).filter(Boolean).forEach((linha) => escrever(linha));
    return 0;
  } catch (erro) {
    escrever(`Não consegui resolver o caminho: ${limpar(erro?.message ?? erro)}`);
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
