// Marked blocks (R2 rule 4). `deliverBlock` is the ONE writer of every `opencrew:start … end`
// block — IDE bridges, AGENTS.md, .gitignore, .env.example — for init, update and repair.
// The manifest records each block (`<file>#opencrew` → sha256 of the block, markers included,
// with LF), so a block the user edited is told apart from one that is just older: the whole
// file is copied to .opencrew-backup/ before a block that differs from its record (or has
// none) is rewritten. CRLF/LF is never a difference, and what is written follows the file.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exists } from './fsx.js';
import { deliverFile, backupFile, hashOf } from './manifest.js';

// The file is handled byte by byte (latin1 goes there and back unchanged): whatever its encoding,
// no byte of the user outside the block changes. `bytesOf` = UTF-8 text in that same form.
const bytesOf = (text) => Buffer.from(text, 'utf8').toString('latin1');
const BOM = bytesOf(String.fromCharCode(0xfeff));
const isUtf16 = (raw) => (raw[0] === 0xff && raw[1] === 0xfe) || (raw[0] === 0xfe && raw[1] === 0xff);

// Files of the user where the block goes at the END, between `#` comment markers.
const AT_END = new Set(['.gitignore', '.env.example']);
const ONLY_THE_BLOCK = '(só o bloco do OpenCrew foi regravado; o resto do arquivo não mudou)';

/** Key of a block in the manifest (`file` = path relative to the project root, with `/`). */
export const blockKey = (file) => `${file}#opencrew`;

const markersOf = (file) => (AT_END.has(file)
  ? ['# opencrew:start', '# opencrew:end']
  : ['<!-- opencrew:start -->', '<!-- opencrew:end -->']);

/**
 * Complete blocks of `text`, as [from, to) ranges. Innermost start only: an orphan start
 * marker (its end deleted by hand) never makes a block swallow the user lines after it.
 */
export function blockRanges(text, file) {
  const [start, end] = markersOf(file);
  const found = [];
  let pos = 0;
  for (let e = text.indexOf(end); e !== -1; e = text.indexOf(end, pos)) {
    const s = text.lastIndexOf(start, e - start.length);
    if (s >= pos && s + start.length <= e) found.push([s, e + end.length]);
    pos = e + end.length;
  }
  return found;
}

/** True when a marked block of `file` contains `needle`; text outside the blocks never counts. */
export async function blockHas(target, file, needle) {
  const dest = path.join(target, file);
  if (!(await exists(dest))) return false;
  const text = await fs.readFile(dest, 'utf8');
  return blockRanges(text, file).some(([from, to]) => text.slice(from, to).includes(needle));
}

function replaceRanges(text, ranges, block) {
  let out = '';
  let pos = 0;
  for (const [from, to] of ranges) {
    out += text.slice(pos, from) + block;
    pos = to;
  }
  return out + text.slice(pos);
}

/**
 * What delivering `marked` does to a file whose content is `text` (null = no file):
 * the action, the new content (none when kept) and the hash of each block found.
 */
function planBlock(file, text, marked) {
  if (text === null) return { action: 'created', text: `${bytesOf(marked)}\n`, hashes: [] };
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const block = bytesOf(marked).replace(/\n/g, eol);
  const ranges = blockRanges(text, file);
  if (!ranges.length) {
    // A marker left alone (its pair deleted by hand): the block still goes in whole, and the
    // file as it was is copied first (spec U3a-2, rule 30).
    const orphan = markersOf(file).some((marker) => text.includes(marker));
    const bom = text.startsWith(BOM) ? BOM : '';
    const added = AT_END.has(file)
      ? `${text.replace(/[ \t\r\n]+$/, '')}${eol}${eol}${block}${eol}`
      : `${bom}${block}${eol}${eol}${text.slice(bom.length).replace(/^[ \t\r\n]+/, '')}`;
    return { action: 'added', text: added, hashes: [], orphan };
  }
  const hashes = ranges.map(([from, to]) => hashOf(Buffer.from(text.slice(from, to), 'latin1').toString('utf8')));
  if (hashes.every((h) => h === hashOf(marked))) return { action: 'kept', hashes };
  return { action: 'updated', text: replaceRanges(text, ranges, block), hashes };
}

/**
 * Put `content` between the opencrew markers of `file` (path relative to the project root,
 * with `/`) and record the block in `ctx.files`.
 * - no file → `created`; file with no block → `added` at the top (at the end in .gitignore
 *   and .env.example), the user's content kept, no copy — unless a marker was left alone
 *   in it: then the whole file is copied first;
 * - block equal to the new one → `kept`, nothing written;
 * - otherwise → `updated`: only the block is rewritten, in the line ending of the file. The
 *   whole file is copied first unless the block is exactly what the manifest recorded.
 * @returns {Promise<{file:string, action:'created'|'added'|'updated'|'kept', copied:boolean, block:true}>}
 *   also pushed to `ctx.blocks`. `copied` = this call made the backup copy.
 */
export async function deliverBlock(ctx, file, content) {
  const [start, end] = markersOf(file);
  const marked = `${start}\n${content.replace(/\r\n/g, '\n').trimEnd()}\n${end}`;
  const dest = path.join(ctx.target, file);
  const raw = (await exists(dest)) ? await fs.readFile(dest) : null;
  const plan = planBlock(file, raw && raw.toString('latin1'), marked);
  const record = ctx.manifest?.files?.[blockKey(file)];
  const edited = plan.action === 'updated' && !plan.hashes.every((h) => h === record);
  // A UTF-16 file cannot take a UTF-8 block without damage: the whole file is copied first.
  const risky = raw && plan.text !== undefined && isUtf16(raw);
  const copied = (edited || risky || plan.orphan) && (await backupFile(ctx, file));
  if (plan.text !== undefined) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(plan.text, 'latin1'));
  }
  ctx.files[blockKey(file)] = hashOf(marked);
  const result = { file, action: plan.action, copied, block: true };
  ctx.blocks.push(result);
  return result;
}

/**
 * Write the bridge files of `ides`, each path once: a file with frontmatter is delivered whole
 * (replaced only when `overwrite`), the others by marked block.
 * @returns {Promise<Array<{ide:object, file:string, action:string, copied:boolean, block?:true, shared?:true}>>}
 *   one entry per file of each IDE, in order. `shared` = the path had already been written for
 *   an earlier IDE of the list (same action; count copies by `ctx.copied`, not by these entries).
 */
export async function deliverBridges(ctx, ides, { overwrite = true } = {}) {
  const byPath = new Map();
  const results = [];
  for (const ide of ides) {
    for (const f of ide.files) {
      if (byPath.has(f.path)) {
        results.push({ ide, ...byPath.get(f.path), shared: true });
        continue;
      }
      const result = f.content.startsWith('---')
        ? await deliverFile(ctx, path.join(ctx.target, f.path), f.content, { overwrite })
        : await deliverBlock(ctx, f.path, f.content);
      byPath.set(f.path, result);
      results.push({ ide, ...result });
    }
  }
  return results;
}

/**
 * Line of a list of backup copies: a file copied because of its block says that only the
 * block was rewritten. `shown` = how the caller prints the file (default: its path).
 */
export function copyLine(ctx, file, shown = file) {
  return ctx.blocks.some((b) => b.copied && b.file === file) ? `${shown} ${ONLY_THE_BLOCK}` : shown;
}
