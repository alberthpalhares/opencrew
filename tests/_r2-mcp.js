// Shared by tests/r2-mcp.test.js and tests/r2-manifesto.test.js (not a test file itself).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { run } from '../src/cli.js';
import { init } from '../src/commands/init.js';
import { exists } from '../src/lib/fsx.js';
import { packageJsonPath } from '../src/lib/paths.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

export const MANIFESTO = '_opencrew/manifest.json';
export const CARIMBO = '_opencrew/.opencrew-version';
export const SKILL = 'skills/resend/SKILL.md';

export const lf = (texto) => texto.replace(/\r\n/g, '\n');
export const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');
export const ler = (dir, arquivo) => fs.readFile(path.join(dir, arquivo), 'utf8');
export const versaoDoPacote = async () => JSON.parse(await fs.readFile(packageJsonPath, 'utf8')).version;

export async function gravar(dir, arquivo, texto) {
  await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
  await fs.writeFile(path.join(dir, arquivo), texto);
}

/** A workspace installed by this package, with the Claude Code bridges. */
export async function workspace() {
  const dir = await mkTmp('r2b');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  return dir;
}

/** Runs the real CLI (argument parser and error report included) in `dir`. */
export async function cli(dir, ...argv) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => run(argv)));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

/** Every backup copy as `<date>/<path>`, sorted. */
export async function copias(dir) {
  const raiz = path.join(dir, '.opencrew-backup');
  const achadas = [];
  async function walk(pasta) {
    for (const e of await fs.readdir(pasta, { withFileTypes: true })) {
      const p = path.join(pasta, e.name);
      if (e.isDirectory()) await walk(p);
      else achadas.push(path.relative(raiz, p).split(path.sep).join('/'));
    }
  }
  if (await exists(raiz)) await walk(raiz);
  return achadas.sort();
}
export const dataDe = (copia) => copia.slice(0, copia.indexOf('/'));
export const semData = (copia) => copia.slice(copia.indexOf('/') + 1);
export const lerCopia = (dir, copia) => ler(dir, path.join('.opencrew-backup', copia));

/** What the manifest records: path → sha256. */
export const registro = async (dir) => JSON.parse(await ler(dir, MANIFESTO)).files;
export async function mudarRegistro(dir, mudar) {
  const dados = JSON.parse(await ler(dir, MANIFESTO));
  mudar(dados.files);
  await gravar(dir, MANIFESTO, JSON.stringify(dados, null, 2) + '\n');
}
