#!/usr/bin/env node
// Relato de uso: um bloco de texto, pronto para colar numa issue, com o que ajuda o mantenedor e nada do
// cliente — versão, Node, sistema, IDE e o estado da última execução. Só lê; não envia nada.
// Uso (na pasta do projeto): node _opencrew/core/scripts/relato.mjs [--crew <crew>] [--ide <nome>]
// Nunca entra: tema, nota, descrição da saída, caminho, nome de crew ou de agente, texto de arquivo.
// Última linha da saída: RELATO:OK. Código de saída: 0 · 1 = erro de uso.
// Spec: fase-u6b-dados-e-custo.md, regras 14 e 15 (repositório do OpenCrew).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MSG, ehPrincipal } from './comum.mjs';
import { limpar } from './caminho/argumentos.mjs';
import { acharCrew } from './caminho/crew.mjs';
import { ehPasta, pastasDe } from './caminho/disco.mjs';
import { lerRegistro } from './execucao/registro.mjs';

export const USO = 'Uso: node _opencrew/core/scripts/relato.mjs [--crew <crew>] [--ide <nome>]';
const IDE = /^[A-Za-z0-9-]{1,30}$/;
const COM_DATA = /^\d{4}-\d{2}-\d{2}-\d{6}(?:-\d{1,2})?$/; // o id que o `caminho.mjs` cria: data, hora e, se repetiu, -2…
const VERSAO = /^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-[0-9A-Za-z.]{1,20})?$/;
const SITUACOES = new Set(['aberta', 'aprovada', 'rejeitada', 'abortada', 'publicada']);
const EVENTOS = new Set(['checkpoint', 'revisao']);
const RESULTADOS = new Set(['aprovado', 'corrigido', 'pulado', 'rejeitado']);

function lerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(/^--(crew|ide)(?:=(.*))?$/s) ?? [];
    if (nome) args[nome] = colado ?? (i + 1 < argv.length ? argv[++i] : '');
    else args.estranho ??= argv[i];
  }
  return args;
}

const versao = (raiz) => {
  try {
    const escrita = readFileSync(path.join(raiz, '_opencrew', '.opencrew-version'), 'utf8').trim();
    return VERSAO.test(escrita) ? escrita : 'desconhecida';
  } catch {
    return 'desconhecida';
  }
};

/** A execução mais recente (por `iniciadaEm`) das crews pedidas: `{ registro, run }` ou `null`. */
async function maisRecente(raiz, crews) {
  const achadas = [];
  for (const crew of crews) {
    const saida = path.join(raiz, 'crews', crew, 'output');
    for (const run of existsSync(saida) ? pastasDe(saida) : []) {
      const registro = await lerRegistro(path.join(saida, run));
      if (registro) achadas.push({ registro, run });
    }
  }
  return achadas.sort((a, b) => String(b.registro.iniciadaEm ?? '').localeCompare(String(a.registro.iniciadaEm ?? '')))[0] ?? null;
}

/** As linhas da execução: só números, situação e o id quando ele é só data e hora (nome dado pelo usuário pode ser do cliente). */
function linhasDaExecucao(achada) {
  if (!achada) return ['- Nenhuma execução registrada.'];
  const { registro, run } = achada;
  const contagem = {};
  for (const m of registro.marcos.filter((x) => EVENTOS.has(x.evento) && RESULTADOS.has(x.resultado))) contagem[`${m.evento} ${m.resultado}`] = (contagem[`${m.evento} ${m.resultado}`] ?? 0) + 1;
  const ultimo = registro.passos.reduce((maior, p) => Math.max(maior, p.n), 0);
  return [
    `- Execução: ${COM_DATA.test(run) ? run : '(nome próprio, omitido)'}`,
    `- Tipo: ${registro.tipo === 'pedido' ? 'pedido avulso' : 'pipeline'}`,
    `- Situação: ${SITUACOES.has(registro.status) ? registro.status : 'desconhecida'}`,
    `- Passos previstos: ${Number.isInteger(registro.passosPrevistos) ? registro.passosPrevistos : 'não informado'}`,
    `- Último passo conferido: ${ultimo || 'nenhum'}`,
    `- Respostas registradas: ${Object.entries(contagem).map(([chave, n]) => `${chave} ${n}`).join(', ') || 'nenhuma'}`,
  ];
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto) e `escrever`
 * @returns {Promise<number>} 0 = o relato saiu · 1 = erro de uso
 */
export async function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = deps;
  const args = lerArgs(argv);
  const achada = args.crew ? acharCrew(cwd, args.crew) : { crew: null };
  const erro = args.estranho ? `Argumento desconhecido: ${limpar(args.estranho)}.`
    : args.ide !== undefined && !IDE.test(args.ide) ? 'O --ide é um nome curto: letras, dígitos e hífen, até 30 caracteres.'
      : !ehPasta(path.join(cwd, '_opencrew')) ? MSG.semRaiz : achada.erro;
  if (erro) {
    escrever(USO);
    escrever(erro);
    return 1;
  }
  const crews = achada.crew ? [achada.crew] : existsSync(path.join(cwd, 'crews')) ? readdirSync(path.join(cwd, 'crews'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
  const ultima = await maisRecente(cwd, crews);
  [
    '## Relato de uso do OpenCrew',
    `- Versão do OpenCrew: ${versao(cwd)}`,
    `- Node: ${process.version}`,
    `- Sistema: ${os.platform()} ${os.arch()}`,
    `- IDE: ${args.ide || 'não informado'}`,
    '',
    '### Última execução',
    ...linhasDaExecucao(ultima),
    'RELATO:OK',
  ].forEach((l) => escrever(l));
  return 0;
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
