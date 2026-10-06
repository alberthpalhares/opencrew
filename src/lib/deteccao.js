// Which IDEs are installed in a project (spec R2, rules 1 and 2) — shared by `update` and
// `init --repair-bridges`. An IDE is proved by a FILE, never by the word "opencrew" somewhere:
//   (a) a bridge file that only this IDE writes, on a path that has "opencrew" in it: it exists;
//   (b) an instruction file the IDE shares with the user (no "opencrew" in the path): it has
//       the start marker of the block, or the line of the title OpenCrew generates in it.
// An IDE with no file of its own (today, the Codex) counts only when its file is there and no
// detected IDE writes the same path. A user file that only cites the word proves nothing.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists } from './fsx.js';
import { IDES } from './ides.js';

const START = '<!-- opencrew:start -->';

/**
 * The instruction files shared with the user and the title generated in each since 1.0.0.
 * Fixed here on purpose, never read from today's bridge content: a title changed in ides.js
 * must not hide the installs made by the versions that wrote the old one (up to 1.2.2 the
 * file had no marker — the title is all there is). Pinned by R2-01d in tests/ides.test.js.
 */
export const USER_FILE_TITLES = Object.freeze({
  'CLAUDE.md': '# opencrew — Project Instructions',
  '.github/copilot-instructions.md': '# opencrew — Copilot Instructions',
  'GEMINI.md': '# opencrew — Gemini CLI',
  'QWEN.md': '# opencrew — Qwen Code',
});

const BOM = String.fromCharCode(0xfeff);

/** A line of a file as OpenCrew compares it: no BOM in front, no CR at the end. */
export function plainLine(raw) {
  const line = raw.startsWith(BOM) ? raw.slice(1) : raw;
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

const writersOf = (file) => IDES.filter((ide) => ide.files.some((f) => f.path === file));
const ownFiles = (ide) => ide.files.filter((f) => writersOf(f.path).length === 1);

/** True when the bridge file `file` (path relative to the root, with `/`) proves its IDE. */
async function proves(target, file) {
  const dest = path.join(target, file);
  if (!(await exists(dest))) return false;
  if (file.includes('opencrew')) return true;
  const text = await fs.readFile(dest, 'utf8');
  return text.includes(START) || text.split('\n').map(plainLine).includes(USER_FILE_TITLES[file]);
}

async function provesAny(target, files) {
  for (const f of files) if (await proves(target, f.path)) return true;
  return false;
}

/**
 * IDEs installed in `target`, in the order of `IDES`.
 * @param {string} target project root
 * @returns {Promise<Array<object>>} entries of `IDES`
 */
export async function detectInstalledIdes(target) {
  const byOwnFile = [];
  for (const ide of IDES) if (await provesAny(target, ownFiles(ide))) byOwnFile.push(ide);
  // Rule 2: a path that a detected IDE writes proves nothing about an IDE with no own file.
  const free = (f) => !writersOf(f.path).some((ide) => byOwnFile.includes(ide));
  const found = [];
  for (const ide of IDES) {
    const alone = !ownFiles(ide).length && (await provesAny(target, ide.files.filter(free)));
    if (alone || byOwnFile.includes(ide)) found.push(ide);
  }
  return found;
}
