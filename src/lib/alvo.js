// Where `init` is about to write: the home folder and the root of a disk are never the project
// (spec U7-F1, rule 6), and a workspace in a folder above is said, not forbidden — one workspace
// per client inside another folder can be on purpose.
import os from 'node:os';
import path from 'node:path';
import { exists } from './fsx.js';

export const TARGET_PROTECTED = 'Esta é a sua pasta pessoal (ou a raiz do disco). Entre na pasta do projeto e rode de novo.';
export const workspaceAboveLine = (dir) => `Há um workspace do OpenCrew em ${dir}, acima desta pasta. Se você queria usá-lo, rode o comando na raiz dele.`;

// Windows names ignore case; the other systems do not.
const fold = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));

/** Is `target` the home folder or the root of a disk? (`home` is injectable for the tests.) */
export function isProtectedTarget(target, home = os.homedir()) {
  const abs = path.resolve(target);
  return path.parse(abs).root === abs || fold(abs) === fold(home);
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
