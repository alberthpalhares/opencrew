#!/usr/bin/env node
// Orçamento de uma execução: estima o custo da próxima chamada paga (imagens) contra o `Budget:` das
// preferências e registra o que realmente saiu. Só as imagens têm preço conhecido; Apify e Resend não.
// Uso (na pasta do projeto): node _opencrew/core/scripts/custo.mjs <crew> estimar|registrar --run <id> --modo test|production --itens N
// Só grava `crews/<crew>/output/<run>/custo.json` (e só no `registrar`). `estimar` apenas lê.
// Última linha da saída: CUSTO:OK · CUSTO:ACIMA <sobra> (quantas imagens ainda cabem) · CUSTO:REGISTRADO R$ <total>.
// Código de saída: 0 sempre que a linha CUSTO: sai · 1 = erro de uso (sem linha CUSTO:).
// Spec: fase-u6b-dados-e-custo.md, regras 8 a 11 (repositório do OpenCrew).
import path from 'node:path';
import { MSG, ehPrincipal } from './comum.mjs';
import { RUN, limpar } from './caminho/argumentos.mjs';
import { acharCrew } from './caminho/crew.mjs';
import { ehPasta } from './caminho/disco.mjs';
import { ehAtalho } from './limpeza/disco.mjs';
import { lerPreferencia } from './preferencias.mjs';
import { PRECO_POR_ITEM, lerReais, reais } from './custo/dinheiro.mjs';
import { lerCusto, registrarChamada } from './custo/registro.mjs';

export const USO = 'Uso: node _opencrew/core/scripts/custo.mjs <crew> estimar|registrar --run <id> --modo test|production --itens N';
const OPCAO = /^--(run|modo|itens)(?:=(.*))?$/s;

function lerArgs(argv) {
  const soltos = [];
  const opcoes = {};
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(OPCAO) ?? [];
    if (!nome) soltos.push(argv[i]);
    else opcoes[nome] = colado ?? (i + 1 < argv.length ? argv[++i] : '');
  }
  return { crew: soltos[0], acao: soltos[1], ...opcoes };
}

function erroDeArgumentos({ crew, acao, run, modo, itens }) {
  if (!crew) return 'Falta o nome da crew.';
  if (!['estimar', 'registrar'].includes(acao)) return `Falta a ação: estimar ou registrar.${acao ? ` Recebi: ${limpar(acao)}.` : ''}`;
  if (!run) return MSG.faltaOpcao('--run');
  if (!RUN.test(run)) return 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.';
  if (!Object.hasOwn(PRECO_POR_ITEM, modo ?? '')) return modo ? 'O --modo é test ou production.' : MSG.faltaOpcao('--modo');
  if (!/^[1-9]\d{0,2}$/.test(itens ?? '')) return itens ? 'O --itens é um número inteiro de 1 a 999.' : MSG.faltaOpcao('--itens');
  return null;
}

/** O `Budget:` em centavos, ou `null` (sem limite); `invalido` quando está escrito e não é um valor. */
function orcamentoDe(raiz) {
  const escrito = lerPreferencia(raiz, ['Budget']);
  const centavos = lerReais(escrito);
  return { centavos, invalido: escrito !== null && centavos === null ? escrito : null };
}

async function estimar({ raiz, pasta, args }) {
  const preco = PRECO_POR_ITEM[args.modo];
  const estimativa = preco * Number(args.itens);
  const { total: gasto } = await lerCusto(pasta);
  const { centavos: orcamento, invalido } = orcamentoDe(raiz);
  const sobra = orcamento === null ? null : Math.max(0, Math.floor((orcamento - gasto) / preco));
  return [
    ...(invalido ? [`O Budget das preferências não é um valor (${limpar(invalido)}): tratei como sem limite.`] : []),
    `Estimativa desta chamada: ${reais(estimativa)}`,
    `Já gasto nesta execução: ${reais(gasto)}`,
    `Orçamento: ${orcamento === null ? 'sem limite' : reais(orcamento)}`,
    orcamento !== null && gasto + estimativa > orcamento ? `CUSTO:ACIMA ${sobra}` : 'CUSTO:OK',
  ];
}

async function registrar({ pasta, args, agora }) {
  const total = await registrarChamada(pasta, { modo: args.modo, itens: Number(args.itens), centavos: PRECO_POR_ITEM[args.modo] * Number(args.itens), em: agora.toISOString() });
  return [`CUSTO:REGISTRADO ${reais(total)}`];
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto), `escrever` e `agora` (o relógio)
 * @returns {Promise<number>} 0 = a linha `CUSTO:` saiu · 1 = erro de uso
 */
export async function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`), agora = () => new Date() } = deps;
  const args = lerArgs(argv);
  const doUso = erroDeArgumentos(args);
  const achada = doUso ? { erro: doUso } : acharCrew(cwd, args.crew);
  const pasta = achada.crew ? path.join(cwd, 'crews', achada.crew, 'output', args.run) : null;
  const erro = achada.erro ?? (ehPasta(pasta) && !ehAtalho(pasta) ? null : `Execução não encontrada: ${limpar(args.run)}`);
  if (erro) {
    escrever(USO);
    escrever(erro);
    return 1;
  }
  try {
    const linhas = args.acao === 'estimar' ? await estimar({ raiz: cwd, pasta, args }) : await registrar({ pasta, args, agora: agora() });
    linhas.forEach((l) => escrever(l));
    return 0;
  } catch (falha) {
    const motivo = { EEXIST: 'outra gravação do custo está em andamento; tente de novo', EBUSY: 'o arquivo está em uso por outro programa', EPERM: 'o arquivo está em uso ou protegido', EACCES: 'sem permissão para ler ou gravar na pasta' }[falha?.code];
    escrever(`Não consegui registrar o custo: ${motivo ?? limpar(falha?.code ?? falha?.message ?? falha)}`);
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
