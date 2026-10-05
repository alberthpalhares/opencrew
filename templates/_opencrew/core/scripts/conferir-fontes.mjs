#!/usr/bin/env node
// Conferência de fontes do OpenCrew — no início do run, confere se os arquivos que a crew cita
// existem. Se foram movidos, sugere o novo caminho (relativo à raiz do projeto); se o nome mudou,
// lista o que existe na pasta esperada. Nunca apaga nada; só corrige com --corrigir (e .bak).
// Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]
// Rode a partir da pasta do projeto (a que tem `_opencrew/`); a crew fica dentro dela.
// Última linha da saída: FONTES:OK ou FONTES:PENDENTE (o runner lê esta linha).
// Código de saída: 0 = conferiu (OK ou PENDENTE) · 1 = erro de uso (opção faltando, pasta sem
// `_opencrew/`, crew fora do projeto ou inexistente), sem linha FONTES: e sem escrever nada.
// Specs: specs/fase-u2-crew-que-conhece-o-projeto.md e specs/fase-r1-reparos-1-6-1.md
// (repositório do OpenCrew). Módulos em conferir-fontes/: coleta, busca e relatório.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { erroDeUso, dentroDoProjeto, ehPrincipal } from './comum.mjs';
import { coletar, trocarCitacao } from './conferir-fontes/coleta.mjs';
import {
  LIMITE_DA_BUSCA, barra, ehAbsoluto, temBarraFinal, resolver, indexar, candidatosPorNome, nomesDaPastaEsperada,
} from './conferir-fontes/busca.mjs';
import { formatar, MSG } from './conferir-fontes/relatorio.mjs';

export { formatar };

/**
 * Caminho absoluto que existe dentro do projeto: o mesmo caminho, relativo à raiz. A própria raiz
 * não tem caminho relativo a sugerir.
 */
function sugestaoRelativa(raiz, ref, achado) {
  const relativo = dentroDoProjeto(raiz, achado) ? barra(path.relative(raiz, achado)) : '';
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
 * Confere os caminhos que a crew cita. `limite` é o máximo de itens do projeto vistos na busca
 * por nome; quando a busca para nele, `buscaParcial` é true.
 */
export async function conferir({ raiz, crew, limite = LIMITE_DA_BUSCA }) {
  let indice = null;
  const refs = [];
  for (const [ref, { arquivos, destino }] of await coletar(raiz, crew)) {
    const item = { ref, citadoEm: [...arquivos], estado: 'ok', sugestao: null, candidatos: [], pasta: [] };
    const achado = resolver(raiz, crew, ref, item.citadoEm);
    if (!achado) {
      indice ??= await indexar(raiz, limite);
      await procurar(item, { raiz, crew, indice, destino });
    } else if (ehAbsoluto(ref)) {
      item.estado = 'nao-portatil';
      item.sugestao = sugestaoRelativa(raiz, ref, achado);
    }
    refs.push(item);
  }
  const status = refs.some((i) => i.estado === 'faltando') ? 'PENDENTE' : 'OK';
  return { crew, raiz, refs, status, buscaParcial: Boolean(indice?.parcial), limite };
}

async function copiaDeSeguranca(arquivo) {
  const bak = existsSync(`${arquivo}.bak`) ? `${arquivo}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}` : `${arquivo}.bak`;
  await copyFile(arquivo, bak);
}

/**
 * Troca, nos arquivos da crew, cada caminho com sugestão única — só a citação que a coleta leu,
 * nunca um pedaço de outro texto. @returns quantos caminhos
 */
export async function corrigir({ resultado }) {
  const comSugestao = resultado.refs.filter((i) => i.sugestao && i.estado !== 'ok');
  const tocados = new Set();
  for (const item of comSugestao) {
    for (const arquivo of item.citadoEm) {
      const texto = await readFile(arquivo, 'utf8');
      if (!tocados.has(arquivo)) {
        await copiaDeSeguranca(arquivo);
        tocados.add(arquivo);
      }
      await writeFile(arquivo, trocarCitacao(texto, item, path.basename(arquivo) === 'crew.yaml'));
    }
  }
  return comSugestao.length;
}

/** --corrigir: troca o que tem sugestão única e diz quantas pendências ficam sem correção. */
async function corrigirEAvisar(r, escrever) {
  const n = await corrigir({ resultado: r });
  let atual = r;
  if (n) {
    escrever(MSG.corrigidos(n));
    atual = await conferir({ raiz: r.raiz, crew: r.crew });
    escrever(formatar(atual));
  }
  const semSugestao = atual.refs.filter((i) => i.estado === 'faltando' && !i.sugestao).length;
  if (semSugestao) escrever(MSG.semCorrecaoAutomatica(semSugestao));
  else if (!n) escrever(MSG.nadaACorrigir);
  return atual;
}

const USO = 'Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]';

function lerCrew(argv) {
  const i = argv.indexOf('--crew');
  const valor = i > -1 ? argv[i + 1] : null;
  return valor && !valor.startsWith('--') ? valor : null;
}

/** @returns {Promise<number>} 0 = conferiu (OK ou PENDENTE) · 1 = erro de uso */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = {}) {
  const crew = lerCrew(argv);
  const erro = erroDeUso({ raiz: cwd, faltando: crew ? [] : ['--crew'], crew });
  if (erro) {
    escrever(erro);
    if (!crew) escrever(USO);
    return 1;
  }
  let r = await conferir({ raiz: cwd, crew });
  escrever(formatar(r));
  if (argv.includes('--corrigir')) r = await corrigirEAvisar(r, escrever);
  escrever(`FONTES:${r.status}`);
  return 0;
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
