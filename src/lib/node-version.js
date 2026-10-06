// Node floor (spec R2, rule 27): the lowest Node the package accepts, read from the
// `engines.node` of package.json, and the decision to stop when the machine is below it.
// Lives outside cli.js so the rule can be tested without touching `process.versions`.

/** a < b, comparing major.minor.patch as numbers (no prerelease tags). */
function lt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na < nb;
  }
  return false; // equal
}

/**
 * Lowest version an engines.node range accepts: the first version of each `||` alternative,
 * then the smallest of them. Handles ">=20.17.0", "^20.5", ">=18.0.0 || >=20.0.0", "20.0.0".
 * @returns {string | null} null when the range names no version
 */
export function minNodeVersion(range) {
  let lowest = null;
  for (const part of String(range ?? '').split('||')) {
    const v = part.match(/\d+(?:\.\d+){0,2}/)?.[0];
    if (v && (!lowest || lt(v, lowest))) lowest = v;
  }
  return lowest;
}

/**
 * The two lines to show when `current` is below the floor of `range`; null when this Node
 * may run the CLI (also when the package declares no floor).
 * @returns {[string, string] | null}
 */
export function nodeBelowFloor(range, current = process.versions.node) {
  const floor = minNodeVersion(range);
  if (!floor || !lt(current, floor)) return null;
  return [
    `O OpenCrew precisa do Node.js ${floor} ou mais novo. Esta máquina está com o v${current}.`,
    'Instale a versão LTS em https://nodejs.org/ e rode o comando de novo. Nada foi alterado nesta pasta.',
  ];
}
