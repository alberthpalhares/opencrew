#!/usr/bin/env node
// Conferência de fontes do OpenCrew — no início do run, confere se os arquivos que a crew cita
// existem. Se foram movidos, sugere o novo caminho (relativo à raiz do projeto); se o nome mudou,
// lista o que existe na pasta esperada. Nunca apaga nada; só corrige com --corrigir (e .bak).
// Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]
// Última linha da saída: FONTES:OK ou FONTES:PENDENTE (o runner lê esta linha).
// Spec: specs/fase-u2-crew-que-conhece-o-projeto.md (repositório do OpenCrew).
import { readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const IGNORAR = new Set(['node_modules', 'output', '_opencrew', '_build']);
const LIMITE_ENTRADAS = 20000;

const barra = (p) => p.split(path.sep).join('/');
const ehAbsoluto = (p) => /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('/');

function pareceCaminho(t) {
  if (/[{}<>*$|]/.test(t) || /^https?:/i.test(t) || !/[\\/]/.test(t)) return false;
  return /\.[A-Za-z0-9]{1,5}$/.test(t) || /[\\/]$/.test(t);
}
const saidaDeRun = (t) => /(^|[\\/])(output|_build)[\\/]/.test(t);

/** Caminhos citados entre crases no crew.yaml e nos passos, mais as `fontes:` do crew.yaml. */
async function coletar(raiz, crew) {
  const refs = new Map();
  const add = (ref, arquivo) => {
    if (!refs.has(ref)) refs.set(ref, new Set());
    refs.get(ref).add(arquivo);
  };
  const crewYaml = path.join(raiz, crew, 'crew.yaml');
  const passos = path.join(raiz, crew, 'pipeline', 'steps');
  const arquivos = existsSync(crewYaml) ? [crewYaml] : [];
  if (existsSync(passos)) {
    for (const f of await readdir(passos)) if (f.endsWith('.md')) arquivos.push(path.join(passos, f));
  }
  for (const arquivo of arquivos) {
    const texto = await readFile(arquivo, 'utf8');
    for (const m of texto.matchAll(/`([^`\n]+)`/g)) {
      const t = m[1].trim();
      if (pareceCaminho(t) && !saidaDeRun(t)) add(t, arquivo);
    }
    if (arquivo === crewYaml) {
      for (const m of texto.matchAll(/^\s*-?\s*caminho:\s*["']?([^"'\n#]+?)["']?\s*$/gm)) add(m[1].trim(), arquivo);
    }
  }
  return refs;
}

function resolver(raiz, crew, ref) {
  if (ehAbsoluto(ref)) return existsSync(ref) ? path.resolve(ref) : null;
  for (const base of [path.join(raiz, crew), raiz]) {
    const p = path.resolve(base, ref);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Índice nome-do-arquivo → caminhos relativos, ignorando saídas, dependências e pastas ocultas. */
async function indexar(raiz) {
  const porNome = new Map();
  let n = 0;
  async function walk(dir) {
    let entradas;
    try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (++n > LIMITE_ENTRADAS) return;
      if (e.name.startsWith('.') || (e.isDirectory() && IGNORAR.has(e.name))) continue;
      const abs = path.join(dir, e.name);
      const chave = e.name.toLowerCase();
      if (!porNome.has(chave)) porNome.set(chave, []);
      porNome.get(chave).push(barra(path.relative(raiz, abs)) + (e.isDirectory() ? '/' : ''));
      if (e.isDirectory()) await walk(abs);
    }
  }
  await walk(raiz);
  return porNome;
}

export async function conferir({ raiz, crew }) {
  const refs = await coletar(raiz, crew);
  let indice = null;
  const lista = [];
  for (const [ref, citado] of refs) {
    const item = { ref, citadoEm: [...citado], estado: 'ok', sugestao: null, candidatos: [], pasta: [] };
    const achado = resolver(raiz, crew, ref);
    if (achado) {
      if (ehAbsoluto(ref)) {
        item.estado = 'nao-portatil';
        const rel = path.relative(raiz, achado);
        if (!rel.startsWith('..') && !path.isAbsolute(rel)) item.sugestao = barra(rel) + (/[\\/]$/.test(ref) ? '/' : '');
      }
    } else {
      item.estado = 'faltando';
      indice ??= await indexar(raiz);
      const nome = path.basename(ref.replace(/[\\/]+$/, '')).toLowerCase();
      item.candidatos = (indice.get(nome) ?? []).filter((c) => /[\\/]$/.test(ref) === c.endsWith('/'));
      if (item.candidatos.length === 1) item.sugestao = item.candidatos[0];
      if (!item.candidatos.length) {
        const pai = resolver(raiz, crew, path.dirname(ref.replace(/[\\/]+$/, '')));
        if (pai) {
          try { item.pasta = (await readdir(pai)).filter((f) => !f.startsWith('.')); } catch { /* não é pasta */ }
        }
      }
    }
    lista.push(item);
  }
  const status = lista.some((i) => i.estado === 'faltando') ? 'PENDENTE' : 'OK';
  return { crew, raiz, refs: lista, status };
}

async function copiaDeSeguranca(arquivo) {
  const bak = existsSync(`${arquivo}.bak`) ? `${arquivo}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}` : `${arquivo}.bak`;
  await copyFile(arquivo, bak);
}

/** Troca, nos arquivos da crew, cada caminho com sugestão única. @returns quantos caminhos */
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
      await writeFile(arquivo, texto.split(item.ref).join(item.sugestao));
    }
  }
  return comSugestao.length;
}

export function formatar(r) {
  const rel = (a) => barra(path.relative(r.raiz, a));
  const linhas = [`## Conferência de fontes — ${r.crew}`, ''];
  for (const i of r.refs.filter((x) => x.estado !== 'ok')) {
    const onde = `citado em ${i.citadoEm.map(rel).join(', ')}`;
    if (i.estado === 'nao-portatil') {
      linhas.push(`- ⚠️ \`${i.ref}\` é um caminho absoluto (não é portátil — quebra em outro computador).${i.sugestao ? ` Sugestão: \`${i.sugestao}\`` : ''} (${onde})`);
    } else if (i.sugestao) {
      linhas.push(`- ❌ Não encontrei \`${i.ref}\` (${onde}). Novo caminho sugerido: \`${i.sugestao}\``);
    } else if (i.candidatos.length) {
      linhas.push(`- ❌ Não encontrei \`${i.ref}\` (${onde}). Encontrei ${i.candidatos.length} candidatos: ${i.candidatos.map((c) => `\`${c}\``).join(', ')}`);
    } else if (i.pasta.length) {
      linhas.push(`- ❌ Não encontrei \`${i.ref}\` (${onde}). Na pasta esperada existem: ${i.pasta.join(', ')}`);
    } else {
      linhas.push(`- ❌ Não encontrei \`${i.ref}\` (${onde}) nem nada com esse nome no projeto.`);
    }
  }
  const ok = r.refs.filter((i) => i.estado === 'ok').length;
  const pend = r.refs.filter((i) => i.estado === 'faltando').length;
  const alertas = r.refs.filter((i) => i.estado === 'nao-portatil').length;
  linhas.push('', `**Resumo: ${r.refs.length} fontes — ${ok} ok, ${pend} pendentes, ${alertas} alertas**`, '');
  return linhas.join('\n');
}

/** @returns {Promise<number>} 0 = conferiu · 1 = erro de uso */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`) } = {}) {
  const i = argv.indexOf('--crew');
  const crew = i > -1 ? argv[i + 1] : null;
  if (!crew) {
    escrever('Uso: node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]');
    return 1;
  }
  if (!existsSync(path.join(cwd, crew))) {
    escrever(`Crew não encontrada: ${crew}`);
    return 1;
  }
  let r = await conferir({ raiz: cwd, crew });
  escrever(formatar(r));
  if (argv.includes('--corrigir')) {
    const n = await corrigir({ resultado: r });
    if (!n) escrever('Nada a corrigir.');
    else {
      escrever(`${n} ${n === 1 ? 'caminho corrigido' : 'caminhos corrigidos'} (cópia .bak ao lado de cada arquivo alterado).\n`);
      r = await conferir({ raiz: cwd, crew });
      escrever(formatar(r));
    }
  }
  escrever(`FONTES:${r.status}`);
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
