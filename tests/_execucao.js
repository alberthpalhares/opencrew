// Shared helpers of tests/execucao*.test.js (not a test file itself — no .test.js suffix).
// specs/fase-u5c-execucao-registrada.md: a fake installed project with one crew, `atas`, whose
// pipeline has a checkpoint (1), two writing steps (2, 3), a review that goes back to 2 (4) and
// the final approval (5). The clock is injected: each command runs one second after the last.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main as caminho } from '../templates/_opencrew/core/scripts/caminho.mjs';
import { main as execucao } from '../templates/_opencrew/core/scripts/execucao.mjs';
import { mkTmp, snapshot } from './_helpers.js';

export const CREW = 'atas';
export const RUN = '2026-10-07-143022';
export const SAIDA = `crews/${CREW}/output`;
export const RUNS = `crews/${CREW}/_memory/runs.md`;
export const CABECALHO = '# Run History: atas\n\n| Data | Run ID | Tema | Output | Score | Resultado |\n|------|--------|------|--------|-------|-----------|\n';
export const USO = 'Uso: node _opencrew/core/scripts/execucao.mjs <crew> <marcar|fechar|retomar> [opções]';

const passo = (linhas) => `---\n${linhas.join('\n')}\n---\n\n# Passo\n`;
const BASE = {
  [`crews/${CREW}/crew.yaml`]: 'crew:\n  code: "atas"\n  name: "Atas"\n',
  [`crews/${CREW}/pipeline/pipeline.yaml`]: 'steps:\n  - step: 1\n    file: "step-01-tema.md"\n  - step: 2\n    file: "step-02-minuta.md"\n  - step: 3\n    file: "step-03-ata.md"\n  - step: 4\n    file: "step-04-revisar.md"\n  - step: 5\n    file: "step-05-aprovar.md"\n',
  [`crews/${CREW}/pipeline/steps/step-01-tema.md`]: passo(['type: checkpoint']),
  [`crews/${CREW}/pipeline/steps/step-02-minuta.md`]: passo(['execution: inline', `outputFile: ${SAIDA}/minuta.md`]),
  [`crews/${CREW}/pipeline/steps/step-03-ata.md`]: passo(['execution: inline', `outputFile: ${SAIDA}/ata.md`]),
  [`crews/${CREW}/pipeline/steps/step-04-revisar.md`]: passo(['execution: inline', `outputFile: ${SAIDA}/revisao.md`, 'on_reject: 2']),
  [`crews/${CREW}/pipeline/steps/step-05-aprovar.md`]: passo(['type: checkpoint']),
  [`crews/${CREW}/_memory/memories.md`]: '# Crew Memory: Atas\n',
  'docs/briefing.md': 'Briefing.\n',
};

export async function gravar(raiz, arquivos) {
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
    await fs.writeFile(path.join(raiz, rel), conteudo);
  }
}

/** The fake project (plus `extras`: `path: content`); goes away when the test `t` ends. */
export async function projeto(t, extras = {}) {
  const raiz = await mkTmp('execucao');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'));
  await gravar(raiz, { ...BASE, ...extras });
  return raiz;
}

let segundos = 0;
/** A clock that advances one second per reading, from 2026-10-07 14:30:22 local time. */
export const relogio = () => new Date(2026, 9, 7, 14, 30, 22 + segundos++);

async function rodar(main, raiz, argv) {
  const linhas = [];
  const code = await main([CREW, ...argv], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), agora: relogio });
  return { code, linhas, fim: linhas.at(-1), texto: linhas.join('\n') };
}
export const rodarCaminho = (raiz, ...argv) => rodar(caminho, raiz, argv);
export const rodarExecucao = (raiz, ...argv) => rodar(execucao, raiz, argv);

export const pasta = (raiz, ...opcoes) => rodarCaminho(raiz, 'pasta', '--run', RUN, ...opcoes);
/** Writes the file of a step (under the run folder) and checks it with `--passo`. */
export async function conferido(raiz, n, rel, run = RUN) {
  await gravar(raiz, { [`${SAIDA}/${run}/${rel}`]: '# Texto\n\nConteúdo.\n' });
  return rodarCaminho(raiz, 'conferir', '--arquivo', `${SAIDA}/${run}/${rel}`, '--passo', String(n));
}
export const marcar = (raiz, n, evento, resultado, ...extras) => rodarExecucao(raiz, 'marcar', '--run', RUN, '--passo', String(n), '--evento', evento, '--resultado', resultado, ...extras);
export const fechar = (raiz, resultado, ...extras) => rodarExecucao(raiz, 'fechar', '--run', RUN, '--resultado', resultado, ...extras);

export const ler = (raiz, rel) => fs.readFile(path.join(raiz, rel), 'utf8');
export const registro = async (raiz, run = RUN) => JSON.parse(await ler(raiz, `${SAIDA}/${run}/execucao.json`));
export const existe = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);

/** Every file of the project (`rel:sha1`, with `/`) except the ones whose path ends with one of `livres`. */
export async function fora(raiz, livres = ['/execucao.json']) {
  const fotos = (await snapshot(raiz)).map((l) => l.split(path.sep).join('/'));
  return fotos.filter((l) => !livres.some((fim) => l.slice(0, l.lastIndexOf(':')).endsWith(fim)));
}
/** The names of temporary files left anywhere in the project. */
export const temporarios = async (raiz) => (await snapshot(raiz)).filter((l) => /\.tmp:/.test(l));
