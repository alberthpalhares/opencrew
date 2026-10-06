// The project's .mcp.json (R2 rules 8 to 11). The Playwright server OpenCrew ships is delivered
// ONCE, and the manifest records it (`.mcp.json` → sha256 of the text, like any delivered file):
// `init` records when it creates the file; `update` without the record creates the file or adds
// the server — whichever is missing — and records. With the record, `update` never creates the
// file nor puts the server back: removing it is the user's choice. Every rewrite copies the
// whole file to .opencrew-backup/ first and keeps its indentation and line ending. The pinned
// version is never changed, and a file out of the expected format is left as it is.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists } from './fsx.js';
import { backupFile, hashOf, isRecord } from './manifest.js';

/** Path of the file, relative to the project root: also its key in the manifest. */
export const MCP_FILE = '.mcp.json';

// The entry that is OpenCrew's own is the one that uses its Playwright config.
const CONFIG = '_opencrew/config/playwright.config.json';
const OUTPUT_DIR = ['--output-dir', '_opencrew/logs/playwright'];
const SKILLS = 'as skills image-creator e image-fetcher';

const hasOutputDir = (args) => args.some((a) => a === '--output-dir' || String(a).startsWith('--output-dir='));
const lacksOutputDir = (args) => Array.isArray(args) && args.some((a) => String(a).includes(CONFIG)) && !hasOutputDir(args);

/**
 * `init`: write the template when the project has no .mcp.json, and record the delivery. An
 * existing file is the user's: it stays as it is and nothing is recorded.
 * @returns {Promise<boolean>} true when the file was created
 */
export async function createMcp(ctx, template) {
  const dest = path.join(ctx.target, MCP_FILE);
  if (await exists(dest)) return false;
  await fs.writeFile(dest, template);
  ctx.files[MCP_FILE] = hashOf(template);
  return true;
}

/** Indentation of the first indented line of `text`; 2 spaces when no line is indented. */
function indentOf(text) {
  for (let nl = text.indexOf('\n'); nl !== -1; nl = text.indexOf('\n', nl + 1)) {
    let end = nl + 1;
    while (text[end] === ' ' || text[end] === '\t') end += 1;
    if (end > nl + 1 && end < text.length && text[end] !== '\r' && text[end] !== '\n') return text.slice(nl + 1, end);
  }
  return '  ';
}

const BOM = String.fromCharCode(0xfeff); // some editors on Windows save JSON with it

/** `data` as JSON in the indentation, line ending and final line break of `text`. */
function formatLike(text, data) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const json = (text.startsWith(BOM) ? BOM : '') + JSON.stringify(data, null, indentOf(text)).replace(/\n/g, eol);
  return text.endsWith('\n') ? json + eol : json;
}

/**
 * What `update` does to a .mcp.json whose content is `text`. `delivered` = the manifest has the
 * record. `data` (what to write) comes only with the two actions that change the file.
 */
function planMcp(text, template, delivered) {
  let data;
  try { data = JSON.parse(text.startsWith(BOM) ? text.slice(1) : text); } catch { return { action: 'not-json' }; }
  // An object with no `mcpServers` counts as one with no server; any other shape is left alone.
  const servers = isRecord(data) && data.mcpServers === undefined ? {} : data?.mcpServers;
  if (!isRecord(servers)) return { action: 'bad-format' };
  if (!Object.hasOwn(servers, 'playwright')) {
    if (delivered) return { action: 'no-server' };
    data.mcpServers = { ...servers, playwright: JSON.parse(template).mcpServers.playwright };
    return { action: 'added', data };
  }
  const args = servers.playwright?.args;
  if (!lacksOutputDir(args)) return { action: 'kept' };
  args.push(...OUTPUT_DIR);
  return { action: 'output-dir', data };
}

/**
 * `update`: deliver the Playwright server once and send the output of the OpenCrew entry to
 * _opencrew/logs/playwright/. The record always goes on to the next manifest (`ctx.files`).
 * - `created` / `added`: no record — the missing file was written, or the missing server added;
 * - `missing` / `no-server`: recorded before — not created, not put back;
 * - `output-dir`: the OpenCrew entry had neither `--output-dir` nor `--output-dir=…`;
 * - `not-json` / `bad-format`: the file is left alone, and no record is made (nothing was
 *   delivered: once the file is fixed, the server can still arrive);
 * - `kept`: nothing to do — without a record, this is what gets recorded.
 * @param {string} template text of templates/.mcp.json
 * @returns {Promise<{action:string, copied:boolean}>} `copied` = the file was copied before the rewrite
 */
export async function updateMcp(ctx, template) {
  const dest = path.join(ctx.target, MCP_FILE);
  const record = ctx.manifest?.files?.[MCP_FILE];
  if (record) ctx.files[MCP_FILE] = record;
  if (!(await exists(dest))) {
    if (!record) await createMcp(ctx, template);
    return { action: record ? 'missing' : 'created', copied: false };
  }
  const text = await fs.readFile(dest, 'utf8');
  const plan = planMcp(text, template, Boolean(record));
  if (!plan.data) {
    if (plan.action === 'kept' && !record) ctx.files[MCP_FILE] = hashOf(text); // nothing was missing
    return { action: plan.action, copied: false };
  }
  const copied = await backupFile(ctx, MCP_FILE);
  const rewritten = formatLike(text, plan.data);
  await fs.writeFile(dest, rewritten);
  ctx.files[MCP_FILE] = hashOf(rewritten);
  return { action: plan.action, copied };
}

// Spec R2 §6. `copy` = where the copy of the file is, for the two actions that rewrite it.
const MESSAGES = {
  created: () => `\`.mcp.json\` criado com o servidor Playwright do OpenCrew (${SKILLS} precisam dele). Se você apagou esse arquivo de propósito, pode apagar de novo: o \`update\` não recria mais.`,
  added: (copy) => `Servidor Playwright acrescentado ao \`.mcp.json\` ${copy}. Se você o removeu de propósito, pode remover de novo: o \`update\` não repõe mais.`,
  'output-dir': (copy) => `\`.mcp.json\`: a saída do Playwright agora vai para \`_opencrew/logs/playwright/\` ${copy}.`,
  missing: () => `O \`.mcp.json\` não existe e não foi recriado. Sem o servidor Playwright, ${SKILLS} não funcionam.`,
  'no-server': () => `O \`.mcp.json\` está sem o servidor Playwright do OpenCrew e ficou como está. Sem ele, ${SKILLS} não funcionam.`,
  'bad-format': () => 'O `.mcp.json` não tem o formato esperado (um objeto com `mcpServers`) e não foi alterado. Confira o arquivo.',
  'not-json': () => '.mcp.json não é um JSON válido — não alterado. Confira o arquivo.',
};
const DONE = new Set(['created', 'added', 'output-dir']);

/**
 * The line `update` prints for an action of `updateMcp`; null when there is nothing to say.
 * @returns {{text:string, warn:boolean}|null} `warn` = a warning, not something that was done
 */
export function mcpMessage(ctx, action) {
  if (!MESSAGES[action]) return null;
  const dir = path.relative(ctx.target, ctx.backupDir).split(path.sep).join('/');
  const text = MESSAGES[action](`(cópia do arquivo anterior em \`${dir}/${MCP_FILE}\`)`);
  return { text, warn: !DONE.has(action) };
}
