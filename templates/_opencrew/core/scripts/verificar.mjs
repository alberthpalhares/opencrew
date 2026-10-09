#!/usr/bin/env node
// Verificador automático do OpenCrew — mede o texto ANTES do revisor.
// Uso: node _opencrew/core/scripts/verificar.mjs --crew crews/<nome> --arquivo "<caminho=formato>[,<caminho=formato>…]" [--formato blog-post|blog-seo] [--relatorio "<caminho>"]
//   caminho=formato: o formato declarado de cada arquivo (o `format:` do passo que o gerou); o
//   "=formato" é opcional. --formato só escolhe os limites de blog do item sem "=formato" que tem
//   título no frontmatter. --relatorio grava no arquivo dado (crews/<crew>/output/…/verificacao-*.md)
//   exatamente o que o script imprime.
// Os limites vêm do frontmatter `constraints:` dos best-practices (fonte única).
// Última linha da saída (o runner lê esta linha): VERIFICACAO:OK, VERIFICACAO:BLOQUEADA ou
// VERIFICACAO:AGUARDANDO_USUARIO (os únicos bloqueios são [PREENCHER], que só o usuário resolve).
// Código de saída: 0 = verificou (ao menos um caminho da lista existe) · 1 = erro de uso (opção
// obrigatória faltando, pasta sem `_opencrew/`, crew inexistente, crew ou caminho fora do
// projeto, nenhum caminho da lista existe) ou erro que impediu a verificação inteira; com
// código 1 não há linha VERIFICACAO:.
// Specs: fase-u1-revisor-com-dentes.md, fase-r1-reparos-1-6-1.md, fase-r2-update-e-envio-seguros.md
// (regra 23: "dentro do projeto" pelo texto ou pelo lugar real) e fase-u3a2-entrega-no-projeto.md
// (regras 35 e 36), e fase-u6a-polimento-do-uso-real.md (regra 1: o alerta de data), no repositório do OpenCrew.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { erroDeUso, ehPrincipal, relativoAoProjeto } from './comum.mjs';
import { USO, lerArgs, lerItemDaLista } from './verificar/argumentos.mjs';
import { lerItem } from './verificar/arquivos.mjs';
import { nomeNoRelatorio, normalizar, semRepetidas } from './verificar/entradas.mjs';
import { lerLimites, lerDominioDoSite, semFrontmatter } from './verificar/leitura.mjs';
import { lerProibicoes } from './verificar/proibicoes.mjs';
import { lerPecas } from './verificar/pecas.mjs';
import { medirPecas } from './verificar/medicao.mjs';
import { alertasDeDatas } from './verificar/datas.mjs';
import { FORMATO_DE_DOCUMENTO, alertasDeDocumento } from './verificar/documento.mjs';
import { regrasGerais, temVariavel, item, FALTA_INFO, NAO_MEDIDO, NAO_VERIFICADO } from './verificar/regras.mjs';
import { formatarRelatorio } from './verificar/relatorio.mjs';
import { MSG as GRAVACAO, caminhoDoRelatorio, gravarRelatorio } from './verificar/gravacao.mjs';

export { formatarRelatorio };

const NAO_LIDO = { ausente: 'arquivo não encontrado', pasta: 'é uma pasta', 'nao-utf8': 'o arquivo não está em UTF-8' };
const NOTA_VARIAVEL = 'Variável de personalização {{…}}: confira se a sua ferramenta de envio troca pelo dado real.';
const SEM_PROBLEMA = '✅ Nada a apontar.';
const SO_GERAIS = (formato) => `⚪ Nada a apontar nas checagens gerais (${formato ? '' : 'formato não informado: '}limites não medidos)`;
const naoVerificado = (motivo) => item(NAO_VERIFICADO, null, null, 'alerta', motivo);
const plural = (n, um, varios) => (n === 1 ? um : varios);

/** O que vale para a execução inteira: notas, proibições, site e os limites já lidos. */
async function prepararContexto(raiz, crew, formatoDeBlog, hoje) {
  const notas = new Set();
  const proibicoes = await lerProibicoes(raiz, crew);
  if (!proibicoes.existe) notas.add('Sem proibições registradas (a crew não tem memories.md).');
  const n = proibicoes.semAspas;
  if (n) notas.add(`${n} ${plural(n, 'proibição', 'proibições')} sem termo entre aspas ${plural(n, 'não é verificada', 'não são verificadas')} automaticamente — escreva o termo entre aspas na memória para virar trava.`);
  if (proibicoes.preferidos.length) notas.add(`Termos lidos como preferidos (não bloqueiam): ${proibicoes.preferidos.map((t) => `"${t}"`).join(', ')}`);
  return { raiz, formatoDeBlog, hoje, notas, proibidos: proibicoes.termos, dominio: await lerDominioDoSite(raiz), limites: {} };
}

/** Limites dos formatos pedidos, lidos uma vez por execução; cada aviso vira nota. */
async function limitesDe(ctx, formatos) {
  for (const id of formatos) {
    if (id in ctx.limites) continue;
    const { limites, nota } = await lerLimites(ctx.raiz, id);
    ctx.limites[id] = limites;
    if (nota) ctx.notas.add(nota);
  }
  return ctx.limites;
}

/** Procura e mede as peças de um `.md` ou `.txt` (regras 3 a 6). */
async function medir(texto, formato, ctx) {
  const pecas = lerPecas(texto, formato, { formatoDeBlog: ctx.formatoDeBlog });
  const formatos = new Set([...(formato ? [formato] : []), ...pecas.map((p) => p.formato)]);
  const limites = await limitesDe(ctx, formatos);
  return medirPecas({ pecas, corpo: semFrontmatter(texto), formato, limites, dominio: ctx.dominio });
}

/** Linha que fecha o arquivo sem bloqueio, alerta nem "Não medido"; null quando há o que apontar. */
function fechoDe(itens, medidas, formato) {
  const temProblema = itens.some((i) => i.nivel === 'bloqueio' || i.nivel === 'alerta' || i.item === NAO_MEDIDO);
  if (temProblema) return null;
  return medidas ? SEM_PROBLEMA : SO_GERAIS(formato);
}

/** @returns {Promise<object|null>} o resultado do arquivo, ou null quando ele não é texto */
async function verificarArquivo({ arquivo, formato }, ctx, regraDeTeste) {
  const lido = await lerItem(path.resolve(ctx.raiz, arquivo));
  if (lido.tipo === 'nao-texto') return null;
  if (lido.tipo !== 'texto') return { itens: [naoVerificado(NAO_LIDO[lido.tipo])], fecho: null };
  const { itens: medidos, medidas } = lido.comPecas ? await medir(lido.texto, formato, ctx) : { itens: [], medidas: 0 };
  // Sem procura de peças (.html, .csv…) o formato declarado ainda é lido, pelas notas dele.
  if (formato && !lido.comPecas) await limitesDe(ctx, [formato]);
  const envio = /^(email|whatsapp)-/.test(formato ?? '');
  if (envio && temVariavel(lido.texto)) ctx.notas.add(NOTA_VARIAVEL);
  const gerais = regrasGerais(lido.texto, ctx.proibidos, { variavelBloqueia: !envio });
  const doWord = formato === FORMATO_DE_DOCUMENTO && lido.comPecas ? alertasDeDocumento(lido.texto) : [];
  const doDia = lido.comPecas ? alertasDeDatas(lido.texto, ctx.hoje) : [];
  const extras = [...doWord, ...doDia, ...(regraDeTeste ? (await regraDeTeste({ arquivo, formato, texto: lido.texto })) ?? [] : [])];
  const naoMedido = (i) => i.item === NAO_MEDIDO;
  const itens = [...medidos.filter((i) => !naoMedido(i)), ...gerais, ...extras, ...medidos.filter(naoMedido)];
  return { itens, fecho: fechoDe(itens, medidas, formato) };
}


function resumir(arquivos, naoTexto, notas) {
  const todos = arquivos.flatMap((a) => a.itens);
  const bloqueios = todos.filter((i) => i.nivel === 'bloqueio');
  // [PREENCHER] só o usuário resolve: não força REJECT (o redator não tem o dado), mas a
  // aprovação final não fecha sem ele.
  const reais = bloqueios.filter((i) => i.item !== FALTA_INFO).length;
  return {
    arquivos,
    naoTexto,
    notas: [...notas],
    bloqueios: bloqueios.length,
    aPreencher: bloqueios.length - reais,
    alertas: todos.filter((i) => i.nivel === 'alerta').length,
    naoMedidos: todos.filter((i) => i.item === NAO_MEDIDO || i.item === NAO_VERIFICADO).length,
    status: reais ? 'BLOQUEADA' : bloqueios.length ? 'AGUARDANDO_USUARIO' : 'OK',
  };
}

/**
 * Verifica os arquivos de saída de uma crew.
 * @param {object} o
 * @param {string} o.raiz pasta do projeto (a que tem `_opencrew/`)
 * @param {string} o.crew pasta da crew, dentro do projeto
 * @param {Array<string|{ arquivo: string, formato?: string }>} o.arquivos caminho (sem formato
 *   declarado) ou `{ arquivo, formato }` (formato declarado)
 * @param {string} [o.formato] limites de blog do item sem formato declarado que tem título no frontmatter
 * @param {boolean} [o.semPadraoDeBlog] só a entrega passa true: no item sem formato declarado, o
 *   título do frontmatter não é medido como blog (fase-u3a1-pasta-de-entrega.md, regra 17)
 * @param {Function} [o.agora] SÓ PARA TESTE: o relógio; o ano e o dia dele valem para a data escrita sem ano
 * @param {Function} [o.regraDeTeste] SÓ PARA TESTE: regra extra, chamada com `{ arquivo, formato,
 *   texto }` em cada arquivo de texto; serve para simular uma regra que lança erro
 * @returns {Promise<object>} `{ arquivos, naoTexto, notas, bloqueios, aPreencher, alertas, naoMedidos,
 *   status }` · `aPreencher`: quantos dos `bloqueios` são [PREENCHER]
 *   · `arquivos`: `[{ arquivo, formato, itens, fecho }]`, só os de texto; cada item é
 *   `{ item, medido, limite, nivel, detalhe }`, com `nivel` bloqueio, alerta, ok ou null (linha
 *   "Não medido" sem nível); para a mesma entrada, arquivo + item + detalhe não mudam
 *   · `naoTexto`: caminhos que não são texto · `naoMedidos`: linhas "Não medido"/"Não verificado"
 *   · `status`: OK, BLOQUEADA ou AGUARDANDO_USUARIO
 */
export async function verificar({ raiz, crew, arquivos, formato = 'blog-post', semPadraoDeBlog = false, regraDeTeste, agora = () => new Date() }) {
  const entradas = semRepetidas(raiz, arquivos.map(normalizar));
  const erro = erroDeUso({ raiz, crew, caminhos: entradas.map((e) => e.arquivo) });
  if (erro) throw new Error(erro);
  const ctx = await prepararContexto(raiz, crew, semPadraoDeBlog ? null : formato, agora());
  const resultado = [];
  const naoTexto = [];
  for (const entrada of entradas) {
    const arquivo = nomeNoRelatorio(raiz, entrada.arquivo);
    const r = await verificarArquivo(entrada, ctx, regraDeTeste)
      .catch((e) => ({ itens: [naoVerificado(`erro ao verificar: ${e.message}`)], fecho: null }));
    if (r) resultado.push({ arquivo, formato: entrada.formato, ...r });
    else naoTexto.push(arquivo);
  }
  return resumir(resultado, naoTexto, ctx.notas);
}

/**
 * @returns {Promise<number>} 0 = verificou (ao menos um caminho da lista existe) · 1 = erro de uso,
 *   ou erro que impediu a verificação inteira (uma linha em PT-BR, sem linha de status)
 */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`), agora } = {}) {
  const args = lerArgs(argv);
  const arquivos = args.arquivos.join(',').split(',').map((s) => s.trim()).filter(Boolean).map(lerItemDaLista);
  const caminhos = arquivos.map((a) => a.arquivo ?? a);
  const faltando = [...(args.crew ? [] : ['--crew']), ...(arquivos.length ? [] : ['--arquivo'])];
  const erro = erroDeUso({ raiz: cwd, faltando, crew: args.crew, caminhos });
  if (erro) {
    escrever(erro);
    if (faltando.length) escrever(USO);
    return 1;
  }
  const alvo = args.relatorio == null ? null : caminhoDoRelatorio(cwd, args.crew, args.relatorio);
  if (args.relatorio != null && !alvo) return escrever(GRAVACAO.invalido(args.relatorio)) ?? 1;
  if (!caminhos.some((c) => existsSync(path.resolve(cwd, c)))) {
    for (const c of new Set(caminhos)) escrever(`Arquivo não encontrado: ${c}`);
    return 1;
  }
  try {
    const relatorio = formatarRelatorio(await verificar({ raiz: cwd, crew: args.crew, arquivos, formato: args.formato || 'blog-post', agora }));
    // O relatório sai na tela mesmo quando o arquivo não pôde ser gravado.
    if (alvo && !(await gravarRelatorio(alvo, relatorio))) escrever(GRAVACAO.naoGravou(relativoAoProjeto(cwd, alvo)));
    escrever(relatorio);
    return 0;
  } catch (erroGeral) {
    // Fora da lista de arquivos (memória da crew ou `company.md` ilegível): nada foi verificado.
    escrever(`Não consegui verificar: ${erroGeral.message}`);
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
