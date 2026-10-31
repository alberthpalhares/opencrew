// Where `init` is about to write: the home folder and the root of a disk are never the project
// (spec U7-F1, rule 6), and a workspace in a folder above is said, not forbidden — one workspace
// per client inside another folder can be on purpose.
import os from 'node:os';
import path from 'node:path';
import { realpathSync } from 'node:fs';
import { exists } from './fsx.js';

export const TARGET_PROTECTED = 'Esta é a sua pasta pessoal (ou a raiz do disco). Entre na pasta do projeto e rode de novo.';
export const workspaceAboveLine = (dir) => `Há um workspace do OpenCrew em ${dir}, acima desta pasta. Se você queria usá-lo, rode o comando na raiz dele.`;

// The real path when the folder exists (a link to the home folder is the home folder), and
// Windows names ignore case; the other systems do not.
function fold(p) {
  let abs = path.resolve(p);
  try {
    abs = realpathSync(abs);
  } catch { /* a folder that does not exist is compared as written */ }
  return process.platform === 'win32' ? abs.toLowerCase() : abs;
}

/**
 * Is `target` the home folder or the root of a disk? (`home` is injectable for the tests.) An
 * empty home (HOME= set but empty) is no home: path.resolve('') would be the current folder.
 */
export function isProtectedTarget(target, home = os.homedir()) {
  const abs = path.resolve(target);
  return path.parse(abs).root === abs || (Boolean(home) && fold(abs) === fold(home));
}

/** The nearest folder above `target` that holds an installed `_opencrew/core`, or null. */
export async function workspaceAbove(target) {
  let dir = path.dirname(path.resolve(target));
  for (;;) {
    if (await exists(path.join(dir, '_opencrew', 'core'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}
