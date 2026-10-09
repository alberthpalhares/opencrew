// Shared test helpers (not a test file itself — no .test.js suffix).
import { promises as fs, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verificar, main } from '../templates/_opencrew/core/scripts/verificar.mjs';

// Every folder made by `mkTmp` goes away when the test process ends (spec fase-u6a-polimento-do-uso-real.md,
// rule 12): before that, each `npm run verify` left more than a thousand folders in the temp directory.
const criadas = new Set();
process.once('exit', () => {
  // Limpeza que não consegue (pasta em uso no Windows) não pode reprovar um arquivo de teste que passou.
  for (const pasta of criadas) {
    try {
      rmSync(pasta, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    } catch { /* fica para o sistema */ }
  }
});

export async function mkTmp(prefix) {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), `opencrew-${prefix}-`));
  criadas.add(pasta);
  return pasta;
}

export async function withCwd(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(prev);
  }
}

// Every file under `dir` with its sha1 — compare two snapshots to prove nothing changed.
export async function snapshot(dir) {
  const out = [];
  async function walk(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else out.push(`${path.relative(dir, p)}:${createHash('sha1').update(await fs.readFile(p)).digest('hex')}`);
    }
  }
  await walk(dir);
  return out.sort();
}

// Run fn while capturing console.log/console.error output.
export async function captureOutput(fn) {
  const lines = [];
  const { log, error } = console;
  console.log = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.log = log;
    console.error = error;
  }
  return lines.join('\n');
}

export function exitPromptError() {
  const e = new Error('User force closed the prompt with SIGINT');
  e.name = 'ExitPromptError';
  return e;
}

// ── Automatic checker (tests/verificar-*.test.js) ──────────────────────────────────────────
const BP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/best-practices');
export const CREW = 'crews/teste';
export const SAIDA = `${CREW}/output`;

/**
 * A fake installed project: every payload best-practice (+ `core`/`local` overrides; null removes
 * the file), one crew with its memory (`memorias`) and the given output files (`saidas`).
 * `instalado: false` leaves `_opencrew/` out.
 */
export async function projetoFalso({ memorias, core = {}, local = {}, saidas = {}, instalado = true } = {}) {
  const raiz = await mkTmp('verif');
  const pastas = { core: path.join(raiz, '_opencrew', 'core', 'best-practices'), local: path.join(raiz, '_opencrew', 'best-practices.local') };
  const novas = [...(instalado ? Object.values(pastas) : []), path.join(raiz, SAIDA), path.join(raiz, CREW, '_memory')];
  for (const p of novas) await fs.mkdir(p, { recursive: true });
  for (const f of instalado ? await fs.readdir(BP) : []) await fs.copyFile(path.join(BP, f), path.join(pastas.core, f));
  for (const [onde, arquivos] of [['core', core], ['local', local]]) {
    for (const [nome, conteudo] of Object.entries(arquivos)) {
      if (conteudo == null) await fs.rm(path.join(pastas[onde], nome));
      else await fs.writeFile(path.join(pastas[onde], nome), conteudo);
    }
  }
  if (memorias) await fs.writeFile(path.join(raiz, CREW, '_memory', 'memories.md'), memorias);
  for (const [nome, conteudo] of Object.entries(saidas)) await fs.writeFile(path.join(raiz, SAIDA, nome), conteudo);
  return raiz;
}

/** Writes each [name, content, declared format?] to the crew output and runs the checker. */
export async function medir(saidas, opcoes) {
  const raiz = await projetoFalso(opcoes);
  const arquivos = [];
  for (const [nome, conteudo, formato] of saidas) {
    await fs.writeFile(path.join(raiz, SAIDA, nome), conteudo);
    arquivos.push(formato ? { arquivo: `${SAIDA}/${nome}`, formato } : `${SAIDA}/${nome}`);
  }
  return verificar({ raiz, crew: CREW, arquivos });
}

/** One checked file, `saida.md`, with its declared format (or none). */
export const um = (conteudo, formato, opcoes) => medir([['saida.md', conteudo, formato]], opcoes);

/** Runs the checker's command line in `raiz`; returns the exit code and the non-blank lines. */
export async function rodarMain(raiz, argv) {
  const linhas = [];
  const code = await main(argv, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas: linhas.filter((l) => l.trim() !== '') };
}

const BASE = 'Texto de exemplo sem dado concreto. ';
/** Exactly n characters, no blank line, no leading or trailing space. */
export const texto = (n) => `${BASE.repeat(Math.ceil(n / BASE.length)).slice(0, n - 1)}a`;
export const tags = (n) => Array.from({ length: n }, (_, i) => `#tag${i}`).join(' ');

export const itens = (r) => r.arquivos.flatMap((a) => a.itens);
export const bloqueios = (r) => itens(r).filter((i) => i.nivel === 'bloqueio');
export const caracteres = (r) => itens(r).filter((i) => /caracteres/.test(i.item));
export const naoMedidos = (r) => itens(r).filter((i) => i.item === 'Não medido');
export const doCanal = (r, canal) => itens(r).filter((i) => i.item.toLowerCase().includes(canal));
export const par = (i) => [i.medido, i.limite];
