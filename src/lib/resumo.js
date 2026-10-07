// What `update` says (spec R2, rules 13 to 16; texts in §6). Each step of the command returns
// what it created, rewrote or kept, and the lines here are built ONLY from that: no line states
// something the step did not do, and a step that changed nothing gets no line. These sentences
// are in PT-BR; the rest of the CLI is not yet (→ U5).
import path from 'node:path';
import { copyLine } from './blocos.js';
import { legacyLines } from './legado.js';
import { mcpMessage } from './mcp.js';
import { UNREADABLE } from './manifest.js';
import { log, info, ok, warn } from './ui.js';

/** Last line of `update`: only what the code guarantees (a deleted crew template comes back). */
export const UNTOUCHED = 'Não foram alterados: as crews que você criou, `_opencrew/_memory/`, `_opencrew/best-practices.local/` e `.env`.';

/** `init` in a workspace that is already installed (rule 15). */
export const ALREADY_INSTALLED = 'Para atualizar, rode `npx @aksp/opencrew@latest update`. Não apague `_opencrew/` para reinstalar: a pasta guarda a sua memória (`_opencrew/_memory/`) e as suas best-practices (`_opencrew/best-practices.local/`).';

/** `update` over `_opencrew/core` with no version stamp (spec U3a-2, rule 31). */
export const INTERRUPTED = 'A instalação anterior não terminou. Rode `npx @aksp/opencrew init` para concluir.';

const NO_BRIDGES = 'Nenhuma ponte de IDE encontrada: nada a atualizar. Para criar a ponte de uma IDE: `npx @aksp/opencrew@latest init --repair-bridges --ide=<id>`.';
const LEAK_REMOVED = 'CLAUDE.md: removi a seção de STATUS.md que as versões 1.4.0 e 1.4.1 gravaram por engano.';
const FIRST_PROTECTED = 'Primeira atualização com proteção: sem registro anterior, guardamos tudo o que diferia. Daqui em diante, só o que você editar.';
// By action of `deliverBlock`; `kept` has no line.
const BLOCK = {
  'AGENTS.md': {
    created: 'AGENTS.md criado com o bloco do OpenCrew.',
    added: 'AGENTS.md: bloco do OpenCrew acrescentado no topo; o seu texto foi mantido.',
    updated: 'AGENTS.md: bloco do OpenCrew atualizado.',
  },
  '.gitignore': {
    created: '`.gitignore` criado com o bloco do OpenCrew.',
    added: '`.gitignore`: bloco do OpenCrew acrescentado no fim; as suas linhas foram mantidas.',
    updated: '`.gitignore`: bloco do OpenCrew atualizado.',
  },
};
const LEFTOVER = {
  header: (n) => `${n} resto(s) de uma instalação antiga do OpenSquad (a pasta \`_opensquad/\` não existe neste projeto). Nada foi apagado:`,
  bridge: (file) => `${file} — ponte do OpenSquad; o OpenCrew não usa este arquivo.`,
  cites: (file) => `${file} — cita \`_opensquad/\`; confira antes de apagar, pode ser um arquivo seu.`,
  end: 'Se você não usa mais o OpenSquad, pode apagar as pontes listadas. Este aviso volta a cada `update` enquanto os arquivos existirem.',
  config: (file) => `O servidor \`playwright\` do \`.mcp.json\` aponta para \`${file}\`, que não existe neste projeto (resto do OpenSquad). Não alterei o arquivo.`,
};
const MCP_REWRITTEN = new Set(['added', 'output-dir']); // actions of `updateMcp` that change the file
const MAX_COPIES = 15;

/** Print the lines a function of this module returned: `[printer, text]` each. */
export function say(lines) {
  for (const [print, text] of lines) print(text);
}

/** Rule 14: the files `update` wrote in `crews/` because they were missing (`results` of deliverTree). */
export function recreatedLines(results) {
  const files = results.filter((r) => r.action === 'created').map((r) => r.file);
  if (!files.length) return [];
  return [[info, `${files.length} arquivo(s) que faltava(m) em \`crews/\` foram entregues de novo: ${files.join(', ')}.`]];
}

const blockLines = (results) => results
  .map((r) => BLOCK[r?.file]?.[r.action])
  .filter(Boolean)
  .map((text) => [ok, text]);

/** One line per case that happened: IDEs with a bridge rewritten, files created, or neither. */
function bridgeLines(ides, bridges, legacy = []) {
  if (!ides.length) return [[info, NO_BRIDGES]];
  const cleaned = new Set(legacy.filter((l) => l.action === 'removed').map((l) => l.file));
  const rewritten = bridges.filter((b) => b.action === 'updated' || b.action === 'added' || cleaned.has(b.file));
  const labels = [...new Set(rewritten.map((b) => b.ide.label))];
  const created = bridges.filter((b) => b.action === 'created' && !b.shared).map((b) => b.file);
  const lines = [];
  if (labels.length) lines.push([ok, `Pontes atualizadas: ${labels.join(', ')}.`]);
  if (created.length) lines.push([ok, `Pontes criadas: ${created.join(', ')}.`]);
  return lines.length ? lines : [[ok, 'Pontes das IDEs já estavam em dia.']];
}

function mcpLines(ctx, mcp) {
  const said = mcpMessage(ctx, mcp.action);
  return said ? [[said.warn ? warn : ok, said.text]] : [];
}

/** Rule 16. `mcp` = what this run did to .mcp.json: the line only says "não alterei" if so. */
function leftoverLines({ files, config }, mcp) {
  const lines = [];
  if (files.length) {
    lines.push([warn, LEFTOVER.header(files.length)]);
    for (const { file, bridge } of files) lines.push([log, `    ${(bridge ? LEFTOVER.bridge : LEFTOVER.cites)(file)}`]);
    lines.push([info, LEFTOVER.end]);
  }
  if (config && !MCP_REWRITTEN.has(mcp.action)) lines.push([warn, LEFTOVER.config(config)]);
  return lines;
}

/** The copies of this run. `unreadable` = the manifest existed and could not be used. */
function copyLines(ctx, unreadable) {
  const n = ctx.copied.length;
  if (!n) return [];
  const dir = path.relative(ctx.target, ctx.backupDir).split(path.sep).join('/');
  const header = ctx.manifest
    ? `${n} arquivo(s) foram copiados para ${dir}/ antes de serem substituídos (editados por você, ou sem registro de entrega):`
    : `${n} arquivo(s) diferentes do pacote novo foram copiados para ${dir}/ antes de serem substituídos:`;
  const lines = [[warn, header], ...ctx.copied.slice(0, MAX_COPIES).map((f) => [log, `    ${copyLine(ctx, f)}`])];
  if (n > MAX_COPIES) lines.push([log, `    … e mais ${n - MAX_COPIES}`]);
  if (unreadable) lines.push([info, UNREADABLE.summary]);
  else if (!ctx.manifest) lines.push([info, FIRST_PROTECTED]);
  return lines;
}

/**
 * The summary of an `update`, in the order the steps ran.
 * @param {object} ctx delivery context (src/lib/manifest.js)
 * @param {object} done what each step returned: `agents` and `gitignore` (deliverBlock; `agents`
 *   is null when a pre-1.3 AGENTS.md was migrated), `ides` (detected), `bridges` (deliverBridges),
 *   `leak` (the STATUS.md section left CLAUDE.md's block), `mcp` (updateMcp), `leftovers`
 *   (findLeftovers) and `unreadable` (manifest)
 * @returns {Array<[Function, string]>} lines for `say`
 */
export function updateSummary(ctx, done) {
  return [
    ...blockLines([done.agents, done.gitignore]),
    ...bridgeLines(done.ides, done.bridges, ctx.legacy),
    ...(done.leak ? [[ok, LEAK_REMOVED]] : []),
    ...legacyLines(ctx).map((line) => [warn, line]),
    ...mcpLines(ctx, done.mcp),
    ...leftoverLines(done.leftovers, done.mcp),
    ...copyLines(ctx, done.unreadable),
  ];
}
