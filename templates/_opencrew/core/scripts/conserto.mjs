#!/usr/bin/env node
// Conserto de uma crew que já existe: mostra o que falta para as melhorias do runtime valerem nela
// e, com --aplicar, grava um item por vez. Quem grava em `crews/` é este script, não a IA.
// Uso (na pasta do projeto):
//   node _opencrew/core/scripts/conserto.mjs --crew "crews/<crew>"                      só lê
//   node _opencrew/core/scripts/conserto.mjs --crew "crews/<crew>" --aplicar "<item>"   grava
// Itens de --aplicar: manifesto · nome:<agente>=<Nome Sobrenome> · formato:<passo>=<formato> ·
//   fonte:<caminho>=<para que> · proibicao:<n>=<trecho> · proibicao:<n>=revisao-humana ·
//   irreversivel:<passo> · historico:<execução>=<tema> (ver --ajuda).
// Só grava `crew.yaml`, `crew-party.csv`, `agents/*.agent.md`, `pipeline/steps/*.md`,
// `_memory/memories.md` e `_memory/runs.md` da crew, e a cópia `<arquivo>.bak` de cada um (a
// cópia que já existe não é sobrescrita). Nunca apaga.
// Última linha da saída: CONSERTO:OK (nada a consertar) · CONSERTO:PENDENTE (há achados) ·
// CONSERTO:APLICADO (tudo o que foi pedido está gravado) · CONSERTO:ERRO (nada foi gravado).
// Código de saída: 0, menos com CONSERTO:ERRO (1).
// Specs: fase-u4a-conserto-de-crews.md e fase-u5c-execucao-registrada.md, regras 12 e 13
// (repositório do OpenCrew).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ehPrincipal, erroDeUso } from './comum.mjs';
import { diagnosticar } from './conserto/achados.mjs';
import { planejar } from './conserto/aplicar.mjs';
import { AJUDA, lerArgs, lerItem, limpar } from './conserto/argumentos.mjs';
import { lerCrew } from './conserto/crew.mjs';
import { gravar } from './conserto/gravar.mjs';
import { notasDoHistorico } from './conserto/historico.mjs';

const MSG = {
  estranho: (arg) => `Argumento desconhecido: ${limpar(arg)}. Veja as opções com --ajuda.`,
  semYaml: (crew) => `A pasta ${limpar(crew)} não tem \`crew.yaml\`: não é uma crew.`,
  itemDesconhecido: (item) => `Item desconhecido em --aplicar: ${limpar(item)}. Veja os itens com --ajuda.`,
  emDia: (nome) => `A crew "${nome}" está em dia: não há o que consertar.`,
  titulo: (nome, n) => `Conserto da crew "${nome}" — ${n} ${n === 1 ? 'achado' : 'achados'}`,
  jaEstava: (item) => `Já estava assim: ${item}`,
  falha: (motivo) => `Não consegui consertar: ${String(motivo).replace(/\s+/g, ' ').trim()}`,
};

/** O que está errado na chamada, antes de ler a crew; ou null. */
function erroDaChamada(raiz, args) {
  if (args.estranho !== undefined) return MSG.estranho(args.estranho);
  const deUso = erroDeUso({ raiz, faltando: args.crew ? [] : ['--crew'], crew: args.crew });
  if (deUso) return deUso;
  if (!existsSync(path.resolve(raiz, args.crew, 'crew.yaml'))) return MSG.semYaml(args.crew);
  const desconhecido = args.itens.find((i) => !lerItem(i));
  return desconhecido === undefined ? null : MSG.itemDesconhecido(desconhecido);
}

/** As linhas do diagnóstico: um bloco por achado e a linha de situação. */
function relatorio(crew) {
  const achados = diagnosticar(crew);
  if (!achados.length) return [MSG.emDia(crew.nome), ...notasDoHistorico(crew), 'CONSERTO:OK'];
  const blocos = achados.flatMap(({ codigo, linhas: [titulo, ...resto] }) => ['', `[${codigo}] ${titulo}`, ...resto.map((l) => `  ${l}`)]);
  return [MSG.titulo(crew.nome, achados.length), ...blocos, '', ...notasDoHistorico(crew), 'CONSERTO:PENDENTE'];
}

/** As linhas de um `--aplicar`: o que foi gravado, as cópias e a linha de situação. */
function aplicar(raiz, crew, itens) {
  const plano = planejar(crew, itens.map(lerItem));
  if (plano.erro) return [plano.erro, 'CONSERTO:ERRO'];
  return [...gravar(raiz, plano.mudancas), ...plano.iguais.map(MSG.jaEstava), 'CONSERTO:APLICADO'];
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto) e `escrever`
 * @returns {number} 0 = a crew foi lida (e, com --aplicar, gravada) · 1 = CONSERTO:ERRO
 */
export function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = deps;
  const args = lerArgs(argv);
  if (args.ajuda) return AJUDA.forEach((l) => escrever(l)) ?? 0;
  let linhas;
  try {
    const erro = erroDaChamada(cwd, args);
    const crew = erro ? null : lerCrew(cwd, args.crew);
    linhas = erro ? [erro, 'CONSERTO:ERRO'] : args.itens.length ? aplicar(cwd, crew, args.itens) : relatorio(crew);
  } catch (falha) {
    linhas = [MSG.falha(falha?.message ?? falha), 'CONSERTO:ERRO'];
  }
  linhas.forEach((l) => escrever(l));
  return linhas.at(-1) === 'CONSERTO:ERRO' ? 1 : 0;
}

if (ehPrincipal(import.meta.url)) process.exitCode = main(process.argv.slice(2));
