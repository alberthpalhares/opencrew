// Shared by tests/r2-deteccao.test.js and tests/r2-legado.test.js (not a test file itself).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { run } from '../src/cli.js';
import { init } from '../src/commands/init.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

export const MARCAS = ['<!-- opencrew:start -->', '<!-- opencrew:end -->'];
export const crlf = (texto) => texto.replace(/\r?\n/g, '\r\n');
export const ler = (dir, arquivo) => fs.readFile(path.join(dir, arquivo), 'utf8');

export async function gravar(dir, arquivo, texto) {
  await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
  await fs.writeFile(path.join(dir, arquivo), texto);
}

/** A workspace installed by this package, with the bridges of the IDEs `ides`. */
export async function workspace(ides) {
  const dir = await mkTmp('pontes');
  await withCwd(dir, () => init({ ide: ides }));
  return dir;
}

/** Runs the real CLI (argument parser included) in `dir`: the output and the exit code. */
export async function cli(dir, ...argv) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => run(argv)));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

// The two commands that rewrite bridges in a project that already has OpenCrew.
export const COMANDOS = { update: ['update'], 'init --repair-bridges': ['init', '--repair-bridges'] };

/** Every backup copy as `<date>/<path>`, sorted; `semData` drops the date folder. */
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
export const semData = (copia) => copia.slice(copia.indexOf('/') + 1);
export const lerCopia = (dir, copia) => ler(dir, path.join('.opencrew-backup', copia));
