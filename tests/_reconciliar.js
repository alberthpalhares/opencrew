// Helpers of the U7-F3 tests (specs/fase-u7-f3-update-que-reconcilia.md): a real workspace made by
// `init`, the manifest read and written back, and `update` run with its exit code and output.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { hashOf } from '../src/lib/manifest.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

export { hashOf };
export const MANIFESTO = path.join('_opencrew', 'manifest.json');
export const CARIMBO = path.join('_opencrew', '.opencrew-version');
export const lerOuNada = (p) => fs.readFile(p, 'utf8').catch(() => null);

/** A workspace made by `init` (Claude Code bridge only). */
export async function workspace(prefixo = 'u7f3') {
  const dir = await mkTmp(prefixo);
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  return dir;
}

export const manifesto = async (dir) => JSON.parse(await fs.readFile(path.join(dir, MANIFESTO), 'utf8'));
export const gravarManifesto = (dir, m) => fs.writeFile(path.join(dir, MANIFESTO), JSON.stringify(m, null, 2) + '\n');
export const carimboAntigo = (dir, v = '1.0.0') => fs.writeFile(path.join(dir, CARIMBO), `${v}\n`);

/** Put a file in the project and record it in the manifest as if an older version had delivered it. */
export async function entregueAntes(dir, chave, conteudo, { registrar = conteudo } = {}) {
  const arquivo = path.join(dir, ...chave.split('/'));
  await fs.mkdir(path.dirname(arquivo), { recursive: true });
  await fs.writeFile(arquivo, conteudo);
  const m = await manifesto(dir);
  if (registrar === null) delete m.files[chave];
  else m.files[chave] = hashOf(registrar);
  await gravarManifesto(dir, m);
}

/** `update` with the exit code and what it printed; the exit code goes back to 0. */
export async function rodar(dir, opcoes = {}) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => update(opcoes)));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

/** The folder of copies of this project, when `update` made one. */
export async function pastaDeCopia(dir) {
  const raiz = path.join(dir, '.opencrew-backup');
  const nomes = await fs.readdir(raiz).catch(() => []);
  return nomes.length ? path.join(raiz, nomes.sort().at(-1)) : null;
}

export async function criarLink(alvo, link, tipo) {
  try {
    await fs.symlink(alvo, link, tipo);
    return true;
  } catch {
    return false; // Windows without permission to create links: the scenario is skipped
  }
}
