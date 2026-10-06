// Old text of the bridges (spec R2, rule 3). Up to 1.2.2 the five bridges with no frontmatter
// were written as WHOLE files, telling the AI to adopt the OpenCrew role always. Since 1.3.0
// the bridge lives in a marked block, and a file that kept the old text outside the block
// keeps giving that order. `update` and `init --repair-bridges` take it out — only when it
// is exactly what was generated (CRLF tolerated), and after copying the whole file. An edited
// one (only the title or the "adopt" sentence is left) is never touched: it is reported.
// `src/lib/ides.js` wrote ONE text per file from v1.0.0 to v1.2.2; they are fixed below.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists } from './fsx.js';
import { backupFile } from './manifest.js';
import { blockRanges } from './blocos.js';
import { USER_FILE_TITLES, plainLine } from './deteccao.js';

const OLD_BRIDGE = `Read \`AGENTS.md\` at the project root and adopt the opencrew system role.
Follow all initialization, command routing, and workflow instructions defined there.

If invoked with arguments (e.g. \`/opencrew create ...\`, \`/opencrew run ...\`),
route to the matching action from the Command Routing table in AGENTS.md.
If invoked without arguments, show the Main Menu.`;

const OLD_CLAUDE_MD = `This project uses **opencrew**, a multi-agent orchestration framework.
The full system definition lives in \`AGENTS.md\` — read it and adopt that role.

Type \`/opencrew\` to open the main menu.

## Notes for Claude Code

- All checkpoint questions use \`AskUserQuestion\`.
- opencrew ships its own Playwright MCP (\`.mcp.json\`); disable the native Playwright plugin.
- Do not manually edit files under \`_opencrew/core/\` unless you know what you're doing.`;

const TITLES = { ...USER_FILE_TITLES, '.trae/rules/opencrew.md': '# opencrew — Trae' };

// path → the lines of the old text of that file: title, blank line, body.
const OLD_LINES = Object.fromEntries(Object.entries(TITLES).map(([file, title]) =>
  [file, [title, '', ...(file === 'CLAUDE.md' ? OLD_CLAUDE_MD : OLD_BRIDGE).split('\n')]]));

const REMOVED = (file, copy) => `${file}: removi o texto antigo do OpenCrew (instalações até a 1.2.2), que mandava adotar o papel do OpenCrew sempre. O bloco novo ficou no lugar e o resto do arquivo não mudou. Cópia em ${copy}.`;
const EDITED = (file) => `${file} ainda tem um texto antigo do OpenCrew, alterado depois da instalação, que manda adotar o papel do OpenCrew sempre. Não mexi nele. Para o OpenCrew só agir quando chamado, apague à mão o trecho que começa em \`# opencrew — …\` fora do bloco \`opencrew:start\` / \`opencrew:end\`.`;

/**
 * Lines of `text` — where each starts and ends (line break included), its content with no
 * BOM and no CR, and whether it is outside every marked block of `file`.
 */
function linesOf(text, file) {
  const blocks = blockRanges(text, file);
  const lines = [];
  let from = 0;
  for (const raw of text.split('\n')) {
    const to = Math.min(from + raw.length + 1, text.length);
    const outside = !blocks.some(([start, end]) => from < end && to > start);
    lines.push({ from, to, outside, text: plainLine(raw) });
    from = to;
  }
  return lines;
}

/** [from, to) of the first exact copy of the old text of `file` outside the blocks, or null. */
function findExact(text, file) {
  const old = OLD_LINES[file];
  const lines = linesOf(text, file);
  for (let i = 0; i + old.length <= lines.length; i++) {
    const run = lines.slice(i, i + old.length);
    if (run.every((line, k) => line.outside && line.text === old[k])) return [run[0].from, run.at(-1).to];
  }
  return null;
}

/** `text` up to its last character that is not a line break. */
function withoutEndBreaks(text) {
  let end = text.length;
  while (end > 0 && (text[end - 1] === '\n' || text[end - 1] === '\r')) end -= 1;
  return text.slice(0, end);
}

/**
 * `text` with every exact copy of the old text of `file` taken out; the rest stays byte for
 * byte. Old text that was the end of the file takes the blank lines above it along: the file
 * ends where the text before it ends (as a new install, when only the block is left).
 */
function strip(text, file) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let out = text;
  for (let cut = findExact(out, file); cut; cut = findExact(out, file)) {
    const [before, after] = [out.slice(0, cut[0]), out.slice(cut[1])];
    out = after.trim() ? before + after : `${withoutEndBreaks(before)}${eol}`;
  }
  return out;
}

/** True when the title or the "adopt" sentence of the old text of `file` is outside the blocks. */
function hasTraces(text, file) {
  const [title] = OLD_LINES[file];
  const adopt = OLD_LINES[file].find((line) => line.includes('adopt'));
  return linesOf(text, file).some((line) => line.outside && (line.text === title || line.text.includes(adopt)));
}

/**
 * Take the old text out of `file`, or just copy the file when `write` is false. A file in
 * which only traces of the old text are left is not touched: it goes to `ctx.legacy`.
 */
async function clean(ctx, file, write) {
  const dest = path.join(ctx.target, file);
  if (!(await exists(dest))) return;
  const text = await fs.readFile(dest, 'utf8');
  const stripped = strip(text, file);
  if (stripped !== text) await backupFile(ctx, file); // once per run: the file as it was
  if (!write) return;
  if (stripped !== text) {
    await fs.writeFile(dest, stripped);
    ctx.legacy.push({ file, action: 'removed' });
  }
  if (hasTraces(stripped, file)) ctx.legacy.push({ file, action: 'edited' });
}

/**
 * Run `write` — what delivers the bridges of `ides` (`deliverBridges`, ./blocos.js) — with
 * rule 3 around it. Before: a file with the exact old text outside its block is copied whole,
 * so the copy holds the file as it was and the block written next does not claim that copy as
 * "only the block was rewritten". After, with the new block in place: the old text leaves.
 * What happened to each file goes to `ctx.legacy` (`{file, action: 'removed' | 'edited'}`).
 * @param {object} ctx delivery context (`newDelivery`, ./manifest.js)
 * @param {Array<object>} ides entries of `IDES` whose bridges `write` delivers
 * @param {() => Promise<T>} write
 * @returns {Promise<T>} what `write` returned
 * @template T
 */
export async function withoutLegacy(ctx, ides, write) {
  const paths = new Set(ides.flatMap((ide) => ide.files.map((f) => f.path)));
  const files = [...paths].filter((file) => OLD_LINES[file]);
  for (const file of files) await clean(ctx, file, false);
  const result = await write();
  for (const file of files) await clean(ctx, file, true);
  return result;
}

/** One line to print per entry of `ctx.legacy` (spec R2, §6), with where the copy is. */
export function legacyLines(ctx) {
  const dir = path.relative(ctx.target, ctx.backupDir).split(path.sep).join('/');
  return ctx.legacy.map(({ file, action }) => (action === 'removed' ? REMOVED(file, `${dir}/${file}`) : EDITED(file)));
}
