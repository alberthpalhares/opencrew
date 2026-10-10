// Shared helpers of tests/limpeza*.test.js, custo.test.js and relato.test.js (not a test file itself).
// specs/fase-u6b-dados-e-custo.md: a fake installed project with one crew, `atas`, and run folders made
// to order. The clock is fixed so the age of the audio files is the same on every machine.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main as limpeza } from '../templates/_opencrew/core/scripts/limpeza.mjs';
import { mkTmp, snapshot } from './_helpers.js';

export const CREW = 'atas';
export const SAIDA = `crews/${CREW}/output`;
export const AGORA = new Date(2026, 9, 9, 12, 0, 0);

export async function gravar(raiz, arquivos) {
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
    await fs.writeFile(path.join(raiz, rel), conteudo);
  }
}

/** The fake project: `_opencrew/`, a crew with `crew.yaml` and a `runs.md`; gone when the test `t` ends. */
export async function projeto(t, extras = {}) {
  const raiz = await mkTmp('limpeza');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await gravar(raiz, {
    [`crews/${CREW}/crew.yaml`]: 'crew:\n  code: "atas"\n',
    [`crews/${CREW}/_memory/runs.md`]: '# Run History: atas\n\n| Data | Run ID | Tema | Output | Score | Resultado |\n|------|--------|------|--------|-------|-----------|\n',
    ...extras,
  });
  return raiz;
}

/**
 * One run folder: `execucao.json` with the status, `copia.json` when the delivery was copied, and a text of
 * `kb` kilobytes. `status: null` writes no record (a run from before 1.14.0).
 */
export async function execucao(raiz, run, { status = 'aprovada', copia = true, kb = 1 } = {}) {
  const arquivos = { [`${SAIDA}/${run}/v1/ata.md`]: 'x'.repeat(kb * 1024), [`${SAIDA}/${run}/entrega/LEIA-ME.md`]: '# Entrega\n' };
  if (copia) arquivos[`${SAIDA}/${run}/copia.json`] = '{}\n';
  if (status) arquivos[`${SAIDA}/${run}/execucao.json`] = JSON.stringify({ versao: 1, crew: CREW, run, tema: '', status, iniciadaEm: `${run.slice(0, 10)}T10:00:00.000Z`, passosPrevistos: null, passos: [], marcos: [], saida: '' });
  await gravar(raiz, arquivos);
}

/** The run id of the n-th day of September 2026 (1 to 28). */
export const idDoDia = (n) => `2026-09-${String(n).padStart(2, '0')}-100000`;

/** Runs the command line in `raiz`: exit code, lines and last line. */
export async function rodar(raiz, ...argv) {
  const linhas = [];
  const code = await limpeza([CREW, ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), agora: () => AGORA });
  return { code, linhas, fim: linhas.at(-1), texto: linhas.join('\n') };
}

export const existe = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);
export const arvore = async (raiz) => (await snapshot(raiz)).map((l) => l.split(path.sep).join('/'));
/** Every file of the project (`rel:sha1`, with `/`) except the ones under one of the folders `livres` (relative, with `/`). */
export async function foraDe(raiz, livres = []) {
  return (await arvore(raiz)).filter((l) => !livres.some((pasta) => l.startsWith(`${pasta}/`)));
}
