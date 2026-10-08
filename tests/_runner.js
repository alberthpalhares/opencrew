// Shared by the runtime-contracts tests (not a test file itself — no .test.js suffix).
// Since U5, slice 2 (specs/fase-u5b-runner-dividido.md) the Pipeline Runner is a core file plus
// parts read on demand (`_opencrew/core/runner/*.md`). The tests written before the split guard
// sentences by section heading; `runnerCompleto` gives them the runner as it reads with every part
// loaded: each part put back right after the stub that points to it, at the old indentation.
import { readFileSync, readdirSync } from 'node:fs';

const CORE = new URL('../templates/_opencrew/core/', import.meta.url);
const ler = (rel) => readFileSync(new URL(rel, CORE), 'utf8').replace(/\r\n/g, '\n');

/** The core file, as shipped. */
export const nucleo = ler('runner.pipeline.md');
/** The names of the parts, sorted. */
export const PARTES = readdirSync(new URL('runner/', CORE)).filter((f) => f.endsWith('.md')).sort();
/** The text of one part (`escritorio.md`). */
export const parte = (nome) => ler(`runner/${nome}`);

// [the line the stub starts with, the part, the indentation the block had inside the runner]
const TOCOS = [
  ['**Resuming**', 'retomar.md', 0],
  ['1b. **Memory format**', 'memoria.md', 3],
  ['    If the last line is `FONTES:OK`', 'fontes-pendentes.md', 4],
  ['4b. **Pre-Execution Agent Selection**', 'selecao-de-agentes.md', 4],
  ['## Escritório (optional live view)', 'escritorio.md', 0],
  ['### Task-Based Agent Execution', 'tarefas-do-agente.md', 0],
  ['### Output Contract Validation', 'contrato-de-saida.md', 0],
  ['**Correction at a checkpoint**', 'correcao-no-checkpoint.md', 0],
  ['2. **Close the run**', 'fim-da-execucao.md', 3],
];

/** The body of a part: without its title and the "Part of the Pipeline Runner" note. */
function corpo(nome, recuo) {
  const linhas = parte(nome).split('\n');
  const inicio = linhas.findIndex((l, i) => i > 0 && l.trim() && !l.startsWith('> Part of the Pipeline Runner'));
  return linhas.slice(inicio).map((l) => (l.trim() ? ' '.repeat(recuo) + l : l)).join('\n').trimEnd();
}

function compor() {
  const linhas = nucleo.split('\n');
  for (const [comeco, nome, recuo] of TOCOS) {
    const i = linhas.findIndex((l) => l.startsWith(comeco));
    if (i < 0) throw new Error(`stub not found in the runner: ${comeco}`);
    // A heading stub: the paragraph comes after the heading and a blank line.
    let fim = comeco.startsWith('#') ? i + 2 : i;
    while (fim < linhas.length && linhas[fim].trim()) fim++;
    linhas.splice(fim, 0, '', ...corpo(nome, recuo).split('\n'));
  }
  return linhas.join('\n');
}

/** The runner with every part loaded, in the layout it had before the split. */
export const runnerCompleto = compor();
/** Where each stub is: `[line it starts with, part file]`. */
export const ONDE = TOCOS.map(([comeco, nome]) => [comeco, nome]);
