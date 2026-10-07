#!/usr/bin/env node
// Caminho da execução de uma crew: diz onde cada passo grava, de onde lê e se o arquivo gravado
// está lá. Quem calcula é este script, igual em qualquer sistema — a IA não monta o caminho.
// Uso (na pasta do projeto): node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]
//   pasta    --run <id>                       cria crews/<crew>/output/<id>/
//   saida    --run <id> --arquivo <declarado> onde o passo grava (abre a pasta de versão seguinte)
//   entrada  --run <id> --arquivo <declarado> a saída mais nova desse arquivo
//   conferir --arquivo <caminho já resolvido> [--secoes N] [--tldr]
// <crew> é o nome da pasta em `crews/`. <declarado> é o `inputFile` ou `outputFile` do passo.
// Só cria pastas, e só dentro de crews/<crew>/output/<id>/; nunca cria, altera nem apaga arquivo.
// Última linha da saída (o runner lê esta linha): CAMINHO:OK <caminho>, CAMINHO:FALTA <caminho>
// ou CAMINHO:REPROVADO <motivo>; o caminho sai relativo à pasta do projeto, com `/`.
// Código de saída: 0 sempre que a linha CAMINHO: sai · 1 = erro de uso (ação ou opção faltando,
// pasta sem `_opencrew/`, crew inexistente ou fora do projeto); com código 1 não há linha
// CAMINHO: e nada é criado.
// Spec: fase-r3-runner-em-uso-real.md (repositório do OpenCrew).
import path from 'node:path';
import { MSG, dentroDoProjeto, ehPrincipal, realDentroDe } from './comum.mjs';
import { USO, erroDeArgumentos, lerArgs, limpar } from './caminho/argumentos.mjs';
import { MOTIVO, daMaisNova, motivoDeReprovacao, naExecucao, normalizar, proximaVersao } from './caminho/nucleo.mjs';
import { criarPasta, ehPasta, lerTexto, pastasDe, temConteudo } from './caminho/disco.mjs';

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
  const local = acao === 'conferir' ? null : naExecucao(arquivo, crew, run);
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
  if (!ehPasta(path.join(raiz, '_opencrew'))) return { erro: MSG.semRaiz };
  const base = path.resolve(raiz, 'crews');
  const nome = args.crew.replace(/^crews[\\/]+/, '');
  if (!dentroDoProjeto(base, nome)) return { erro: MSG.foraDoProjeto(limpar(args.crew)) };
  const pasta = path.resolve(base, nome);
  if (path.dirname(pasta) !== base || !ehPasta(pasta)) return { erro: MSG.crewNaoEncontrada(limpar(args.crew)) };
  const crew = path.basename(pasta);
  const doArquivo = args.arquivo ? erroDoArquivo(raiz, crew, args) : null;
  return doArquivo ? { erro: doArquivo } : { crew };
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

function responder(raiz, crew, args) {
  if (args.acao === 'saida') return saida(raiz, crew, args);
  if (args.acao === 'entrada') return entrada(raiz, crew, args);
  if (args.acao === 'conferir') return conferir(raiz, args);
  const pasta = `crews/${crew}/output/${args.run}`;
  criarPasta(path.resolve(raiz, pasta));
  return ok(pasta);
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto) e `escrever`
 * @returns {number} 0 = a linha `CAMINHO:` saiu · 1 = erro de uso, ou falha ao ler ou criar pasta
 *   (a linha de uso e o motivo, ou só o erro; sem linha `CAMINHO:`)
 */
export function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = deps;
  const args = lerArgs(argv);
  const local = localizar(cwd, args);
  if (local.erro) {
    escrever(USO);
    escrever(local.erro);
    return 1;
  }
  try {
    escrever(responder(cwd, local.crew, args));
    return 0;
  } catch (erro) {
    escrever(`Não consegui resolver o caminho: ${limpar(erro?.message ?? erro)}`);
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) process.exitCode = main(process.argv.slice(2));
