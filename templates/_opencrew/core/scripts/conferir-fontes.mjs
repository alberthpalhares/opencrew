#!/usr/bin/env node
// Conferência de fontes do OpenCrew — no início do run, confere se os arquivos que a crew cita
// existem. Se foram movidos, sugere o novo caminho (relativo à raiz do projeto); se o nome mudou,
// lista o que existe na pasta esperada. Nunca apaga nada; só corrige com --corrigir (e .bak).
// Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]
// Rode a partir da pasta do projeto (a que tem `_opencrew/`); a crew fica dentro dela.
// Última linha da saída: FONTES:OK ou FONTES:PENDENTE (o runner lê esta linha).
// Código de saída: 0 = conferiu (OK ou PENDENTE) · 1 = erro de uso (opção faltando, pasta sem
// `_opencrew/`, crew fora do projeto ou inexistente) ou arquivo da crew que não dá para ler
// ("Não consegui conferir: …"); com código 1 não há linha FONTES:.
// Caminho de rede e endereço de site citados não são testados (alerta "não conferi"); o script
// nunca acessa a rede, e o --corrigir nunca grava fora da pasta real da crew.
// Specs: specs/fase-u2-crew-que-conhece-o-projeto.md, specs/fase-r1-reparos-1-6-1.md e
// specs/fase-r2-update-e-envio-seguros.md, regras 23 a 26 (repositório do OpenCrew).
// Módulos em conferir-fontes/: coleta, busca e relatório.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { erroDeUso, dentroDoProjeto, relativoAoProjeto, realDentroDe, ehPrincipal } from './comum.mjs';
import { coletar, trocarCitacao } from './conferir-fontes/coleta.mjs';
import {
  LIMITE_DA_BUSCA, ehAbsoluto, ehRedeOuSite, temBarraFinal, resolver, indexar, candidatosPorNome, nomesDaPastaEsperada,
} from './conferir-fontes/busca.mjs';
import { formatar, MSG } from './conferir-fontes/relatorio.mjs';

export { formatar };

/**
 * Caminho absoluto que existe dentro do projeto: o mesmo caminho, relativo à raiz — pelo lugar
 * real, quando foi escrito por um link que leva ao projeto. A própria raiz não tem caminho
 * relativo a sugerir.
 */
function sugestaoRelativa(raiz, ref, achado) {
  const relativo = dentroDoProjeto(raiz, achado) ? relativoAoProjeto(raiz, achado) : '';
  return relativo ? relativo + (temBarraFinal(ref) ? '/' : '') : null;
}

/**
 * Caminho que não existe: candidatos com o mesmo nome ou, sem nenhum, o que há na pasta esperada.
 * Destino (só citado em linha `Writes to`) não ganha sugestão: com a troca, a crew gravaria por
 * cima do arquivo achado. O candidato é listado e a escolha fica com o usuário. Busca que parou
 * no limite também não sugere: o único candidato visto pode não ser o único que existe.
 */
async function procurar(item, { raiz, crew, indice, destino }) {
  item.estado = 'faltando';
  item.candidatos = candidatosPorNome(indice, item.ref);
  if (item.candidatos.length === 1 && !destino && !indice.parcial) item.sugestao = item.candidatos[0];
  if (!item.candidatos.length) item.pasta = await nomesDaPastaEsperada(raiz, crew, item.ref);
}

/**
 * Estado de uma citação. Caminho de rede ou endereço de site não é testado: vira o alerta
 * "não conferido" (regra 25). O resto é procurado no disco: o que falta é pendência, e o caminho
 * absoluto que existe, o alerta de não portátil. `ctx.indice` é montado só na primeira falta.
 */
async function classificar(item, destino, ctx) {
  const { raiz, crew } = ctx;
  if (ehRedeOuSite(ctx, item)) {
    item.estado = 'nao-conferido';
    return;
  }
  const achado = resolver(raiz, crew, item.ref, item.citadoEm);
  if (!achado) {
    ctx.indice ??= await indexar(raiz, ctx.limite);
    await procurar(item, { raiz, crew, indice: ctx.indice, destino });
  } else if (ehAbsoluto(item.ref)) {
    item.estado = 'nao-portatil';
    item.sugestao = sugestaoRelativa(raiz, item.ref, achado);
  }
}

/**
 * Confere os caminhos que a crew cita. `limite` é o máximo de itens do projeto vistos na busca
 * por nome; quando a busca para nele, `buscaParcial` é true. Estados: ok · faltando (pendência) ·
 * nao-portatil e nao-conferido (alertas; não mudam o status).
 */
export async function conferir({ raiz, crew, limite = LIMITE_DA_BUSCA }) {
  const ctx = { raiz, crew, limite, indice: null };
  const refs = [];
  for (const [ref, { arquivos, destino }] of await coletar(raiz, crew)) {
    const item = { ref, citadoEm: [...arquivos], estado: 'ok', sugestao: null, candidatos: [], pasta: [] };
    await classificar(item, destino, ctx);
    refs.push(item);
  }
  const status = refs.some((i) => i.estado === 'faltando') ? 'PENDENTE' : 'OK';
  return { crew, raiz, refs, status, buscaParcial: Boolean(ctx.indice?.parcial), limite };
}

async function copiaDeSeguranca(arquivo) {
  const bak = existsSync(`${arquivo}.bak`) ? `${arquivo}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}` : `${arquivo}.bak`;
  await copyFile(arquivo, bak);
}

/** Regrava a citação num arquivo; a cópia .bak é feita uma vez por arquivo. */
async function regravar(arquivo, item, tocados) {
  const texto = await readFile(arquivo, 'utf8');
  if (!tocados.has(arquivo)) {
    await copiaDeSeguranca(arquivo);
    tocados.add(arquivo);
  }
  await writeFile(arquivo, trocarCitacao(texto, item, path.basename(arquivo) === 'crew.yaml'));
}

/**
 * Guarda de escrita do --corrigir (regra 24): só se grava em arquivo cujo lugar real fica dentro
 * da pasta real da crew, e só se ela fica dentro do projeto. A pasta do arquivo passa pela mesma
 * prova: é nela que a cópia .bak é gravada. Link físico não é reconhecido.
 * @returns {((arquivo: string) => boolean)|null} null: a crew inteira é um link para fora do projeto
 */
function guardaDeEscrita(raiz, crew) {
  const pasta = path.resolve(raiz, crew);
  if (!realDentroDe(raiz, pasta)) return null;
  return (arquivo) => [arquivo, path.dirname(arquivo)].every((lugar) => realDentroDe(pasta, lugar));
}

/**
 * Troca, nos arquivos da crew, cada caminho com sugestão única — só a citação que a coleta leu,
 * nunca um pedaço de outro texto. O que a guarda de escrita barra não muda: `avisar` recebe uma
 * linha por arquivo pulado, ou uma só quando a crew inteira é um link para fora do projeto.
 * @returns quantos caminhos foram gravados, em ao menos um arquivo
 */
export async function corrigir({ resultado, avisar = () => {} }) {
  const { raiz, crew } = resultado;
  const comSugestao = resultado.refs.filter((i) => i.sugestao && i.estado !== 'ok');
  const podeGravar = comSugestao.length ? guardaDeEscrita(raiz, crew) : null;
  if (!podeGravar) {
    if (comSugestao.length) avisar(MSG.crewLigadaParaFora(crew));
    return 0;
  }
  const tocados = new Set();
  const pulados = new Set();
  let gravados = 0;
  for (const item of comSugestao) {
    const dentro = item.citadoEm.filter((arquivo) => podeGravar(arquivo));
    for (const arquivo of item.citadoEm) if (!dentro.includes(arquivo)) pulados.add(arquivo);
    for (const arquivo of dentro) await regravar(arquivo, item, tocados);
    if (dentro.length) gravados += 1;
  }
  for (const arquivo of pulados) avisar(MSG.linkParaFora(relativoAoProjeto(raiz, arquivo)));
  return gravados;
}

/** --corrigir: troca o que tem sugestão única, diz o que pulou e quantas pendências ficam sem correção. */
async function corrigirEAvisar(r, escrever) {
  const pulados = [];
  const n = await corrigir({ resultado: r, avisar: (linha) => pulados.push(linha) });
  let atual = r;
  if (n) {
    escrever(MSG.corrigidos(n));
    atual = await conferir({ raiz: r.raiz, crew: r.crew });
    escrever(formatar(atual));
  }
  for (const linha of pulados) escrever(linha);
  const semSugestao = atual.refs.filter((i) => i.estado === 'faltando' && !i.sugestao).length;
  if (semSugestao) escrever(MSG.semCorrecaoAutomatica(semSugestao));
  else if (!n && !pulados.length) escrever(MSG.nadaACorrigir);
  return atual;
}

const USO = 'Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]';

function lerCrew(argv) {
  const i = argv.indexOf('--crew');
  const valor = i > -1 ? argv[i + 1] : null;
  return valor && !valor.startsWith('--') ? valor : null;
}

/** @returns {Promise<number>} 0 = conferiu (OK ou PENDENTE) · 1 = erro de uso, ou arquivo da crew que não dá para ler */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = {}) {
  const crew = lerCrew(argv);
  const erro = erroDeUso({ raiz: cwd, faltando: crew ? [] : ['--crew'], crew });
  if (erro) {
    escrever(erro);
    if (!crew) escrever(USO);
    return 1;
  }
  try {
    let r = await conferir({ raiz: cwd, crew });
    escrever(formatar(r));
    if (argv.includes('--corrigir')) r = await corrigirEAvisar(r, escrever);
    escrever(`FONTES:${r.status}`);
    return 0;
  } catch (erroDeLeitura) {
    // Link quebrado, pasta com nome de arquivo, arquivo sem permissão: uma linha, sem linha FONTES:.
    escrever(MSG.naoConferi(erroDeLeitura.message));
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
