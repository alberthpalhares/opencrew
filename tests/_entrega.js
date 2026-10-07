// Shared helpers of tests/entregar*.test.js (not a test file itself — no .test.js suffix).
// specs/fase-u3a1-pasta-de-entrega.md. Every run through `rodar` also proves U3a-14b: outside the
// run folder the project is the same before and after, and no `.tmp` folder is left behind.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { main } from '../templates/_opencrew/core/scripts/entregar.mjs';
import { projetoFalso, snapshot, CREW } from './_helpers.js';

export { CREW };
export const RUN = '2026-03-03-143022';
export const EXEC = `${CREW}/output/${RUN}`;
export const USO = 'Uso: node _opencrew/core/scripts/entregar.mjs --crew "crews/<crew>" --run "<id>" --arquivo "<caminho=formato>[,<caminho=formato>…]" [--vai-publicar <canal>] [--ajuda]';

export const BLOG = '---\ntitle: "Como cuidar da horta"\nmeta_description: "Guia simples para começar uma horta em casa."\n---\n\n## Comece pelo solo\n\nTexto do artigo.\n';
export const LEGENDA = '=== CAPTION ===\nLegenda da semana.\n\n=== HASHTAGS ===\n#horta #casa\n';
/** Not a real picture: the script never opens an image, it only copies the bytes. */
export const png = (n) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, n, 255 - n]);

/** Writes `{ 'v1/post.md': content }` under the run folder. */
export async function gravar(raiz, arquivos) {
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const alvo = path.join(raiz, EXEC, rel);
    await fs.mkdir(path.dirname(alvo), { recursive: true });
    await fs.writeFile(alvo, conteudo);
  }
}

/** A fake installed project with the crew, its `crew.yaml` and the run folder; gone when `t` ends. */
export async function projeto(t, arquivos = {}, opcoes) {
  const raiz = await projetoFalso(opcoes);
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.writeFile(path.join(raiz, CREW, 'crew.yaml'), 'name: teste\n');
  await fs.mkdir(path.join(raiz, EXEC), { recursive: true });
  await gravar(raiz, arquivos);
  return raiz;
}

const naExecucao = (linha) => linha.split(path.sep).join('/').startsWith(`${EXEC}/`);
const foraDaExecucao = async (raiz) => (await snapshot(raiz)).filter((linha) => !naExecucao(linha));

async function pastasTmp(dir) {
  const achadas = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (e.name.endsWith('.tmp')) achadas.push(e.name);
    achadas.push(...(await pastasTmp(path.join(dir, e.name))));
  }
  return achadas;
}

/** Runs the command line in `raiz`: exit code, lines, whole output and last line. */
export async function rodar(raiz, argv) {
  const antes = await foraDaExecucao(raiz);
  const linhas = [];
  const code = await main(argv, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  assert.deepEqual(await foraDaExecucao(raiz), antes, 'U3a-14b: nothing changes outside the run folder');
  assert.deepEqual(await pastasTmp(raiz), [], 'U3a-14b: no .tmp folder is left');
  return { code, linhas, saida: linhas.join('\n'), fim: linhas.at(-1) };
}

/** `['v1/post.md=blog-post']` (relative to the run folder) → the `--arquivo` list. */
export const lista = (itens) => itens.map((i) => `${EXEC}/${i}`).join(',');
export const entregar = (raiz, itens, ...extras) => rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(itens), ...extras]);

const naEntrega = (raiz, rel = '') => path.join(raiz, EXEC, 'entrega', rel);
export const ler = (raiz, rel) => fs.readFile(naEntrega(raiz, rel), 'utf8');
export const bytes = (raiz, rel) => fs.readFile(naEntrega(raiz, rel));
export const leiame = (raiz) => ler(raiz, 'LEIA-ME.md');
export const existe = (raiz, rel) => fs.access(naEntrega(raiz, rel)).then(() => true, () => false);

/** Every file of the delivery, relative to it and with `/`, sorted. */
export async function arvore(raiz) {
  if (!(await existe(raiz, ''))) return null;
  return (await snapshot(naEntrega(raiz))).map((linha) => linha.slice(0, linha.lastIndexOf(':')).split(path.sep).join('/')).sort();
}

/** The text of a `## title` section of the LEIA-ME ('' when it is not there). */
export function secao(md, titulo) {
  const partes = md.split(/^## /m).slice(1);
  const achada = partes.find((p) => p.split('\n')[0] === titulo);
  return achada ? achada.slice(titulo.length).trim() : '';
}
export const titulos = (md) => [...md.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
export const passos = (texto) => [...texto.matchAll(/^\d+\. (.*)$/gm)].map((m) => m[1]);
