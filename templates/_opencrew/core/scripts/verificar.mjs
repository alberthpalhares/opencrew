#!/usr/bin/env node
// Verificador automático do OpenCrew — mede o texto ANTES do revisor.
// Uso: node _opencrew/core/scripts/verificar.mjs --crew crews/<nome> --arquivo <a.md>[,<b.md>] [--formato blog-post|blog-seo]
// Os limites vêm do frontmatter `constraints:` dos best-practices (fonte única).
// Última linha da saída: VERIFICACAO:OK ou VERIFICACAO:BLOQUEADA (o runner lê esta linha).
// Spec: specs/fase-u1-revisor-com-dentes.md (repositório do OpenCrew).
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { lerLimites, lerSecoes, lerProibicoes, lerDominioDoSite } from './verificar/leitura.mjs';
import { regrasBlog, regrasCanais, regrasGerais, FALTA_INFO } from './verificar/regras.mjs';

const FORMATOS_DE_CANAL = ['instagram-feed', 'linkedin-post', 'twitter-post'];

export async function verificar({ raiz, crew, arquivos, formato = 'blog-post' }) {
  const notas = [];
  const limites = {};
  for (const id of [formato, ...FORMATOS_DE_CANAL]) {
    limites[id] = await lerLimites(raiz, id);
    if (!limites[id]) notas.push(`Formato "${id}" não encontrado em _opencrew/core/best-practices/ — sem limites para ele.`);
  }
  const proibicoes = await lerProibicoes(raiz, crew);
  if (!proibicoes.existe) notas.push('Sem proibições registradas (a crew não tem memories.md).');
  if (proibicoes.semAspas) {
    const n = proibicoes.semAspas;
    notas.push(`${n} ${n === 1 ? 'proibição' : 'proibições'} sem termo entre aspas ${n === 1 ? 'não é verificada' : 'não são verificadas'} automaticamente — escreva o termo entre aspas na memória para virar trava.`);
  }
  const dominio = await lerDominioDoSite(raiz);

  const resultado = [];
  for (const rel of arquivos) {
    const texto = await readFile(path.join(raiz, rel), 'utf8');
    const itens = [
      ...regrasBlog(texto, limites[formato], dominio),
      ...regrasCanais(lerSecoes(texto), limites),
      ...regrasGerais(texto, proibicoes.termos),
    ];
    resultado.push({ arquivo: rel, itens });
  }
  const todos = resultado.flatMap((a) => a.itens);
  const bloqueios = todos.filter((i) => i.nivel === 'bloqueio');
  const alertas = todos.filter((i) => i.nivel === 'alerta').length;
  // [PREENCHER] só o usuário resolve: não força REJECT (o redator não tem o dado), mas a
  // aprovação final não fecha sem ele.
  const reais = bloqueios.filter((i) => i.item !== FALTA_INFO).length;
  const status = reais ? 'BLOQUEADA' : bloqueios.length ? 'AGUARDANDO_USUARIO' : 'OK';
  return { arquivos: resultado, notas, bloqueios: bloqueios.length, alertas, status };
}

const ROTULO = { bloqueio: '❌ Bloqueio', alerta: '⚠️ Alerta', ok: '✅ OK' };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function formatarRelatorio(r) {
  const linhas = ['## Verificação automática', ''];
  for (const a of r.arquivos) {
    linhas.push(`### ${a.arquivo}`, '');
    const medidos = a.itens.filter((i) => i.medido != null);
    if (medidos.length) {
      linhas.push('| Item | Medido | Limite | Resultado |', '|---|---|---|---|');
      for (const i of medidos) {
        const op = i.nivel === 'alerta' || /links/i.test(i.item) ? '≥' : '≤';
        linhas.push(`| ${i.item} | ${i.medido} | ${op} ${i.limite} | ${ROTULO[i.nivel]} |`);
      }
      linhas.push('');
    }
    for (const i of a.itens.filter((x) => x.medido == null)) {
      linhas.push(`- ${ROTULO[i.nivel]} — ${i.item}: "${i.detalhe}"`);
    }
    if (!a.itens.length) linhas.push('- ✅ Nada a apontar.');
    linhas.push('');
  }
  if (r.notas.length) linhas.push('**Notas:**', ...r.notas.map((n) => `- ${n}`), '');
  linhas.push(`**Resumo: ${plural(r.bloqueios, 'bloqueio', 'bloqueios')}, ${plural(r.alertas, 'alerta', 'alertas')}**`, '');
  linhas.push(`VERIFICACAO:${r.status}`);
  return linhas.join('\n');
}

function lerArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const m = argv[i].match(/^--(crew|arquivo|formato)$/);
    if (m && i + 1 < argv.length) args[m[1]] = argv[++i];
  }
  return args;
}

const USO = 'Uso: node _opencrew/core/scripts/verificar.mjs --crew crews/<nome> --arquivo <a.md>[,<b.md>] [--formato blog-post|blog-seo]';

/** @returns {Promise<number>} 0 = verificou (OK ou BLOQUEADA) · 1 = erro de uso */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = {}) {
  const args = lerArgs(argv);
  if (!args.crew || !args.arquivo) {
    escrever(USO);
    return 1;
  }
  const arquivos = args.arquivo.split(',').map((s) => s.trim()).filter(Boolean);
  for (const rel of [args.crew, ...arquivos]) {
    const abs = path.resolve(cwd, rel);
    if (path.relative(cwd, abs).startsWith('..') || path.isAbsolute(path.relative(cwd, abs))) {
      escrever(`Caminho fora do projeto: ${rel}`);
      return 1;
    }
  }
  const faltando = arquivos.find((rel) => !existsSync(path.join(cwd, rel)));
  if (faltando) {
    escrever(`Arquivo não encontrado: ${faltando}`);
    return 1;
  }
  const r = await verificar({ raiz: cwd, crew: args.crew, arquivos, formato: args.formato || 'blog-post' });
  escrever(formatarRelatorio(r));
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
