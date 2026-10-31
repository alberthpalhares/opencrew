#!/usr/bin/env node
// Publishing by OIDC (npm "trusted publisher", spec U7-F2, rule 2): npm only authenticates that way
// with npm >= 11.5.1 and Node >= 22.14.0. publish.yml runs this before `npm publish` so a runner
// that is too old fails here, with a clear line, and not halfway through the publish.
// Run: node scripts/check-publish-env.js
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MIN = { node: '22.14.0', npm: '11.5.1' };

const parts = (v) => String(v).replace(/^v/, '').split('.').map((n) => Number.parseInt(n, 10) || 0);

/** All three parts are compared (11.0.0 to 11.5.0 must not pass for 11.5.1). */
export function atLeast(version, min) {
  const [a, b] = [parts(version), parts(min)];
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return true;
}

/** One line per tool that is too old. */
export function problems({ node, npm }) {
  return [['Node', node, MIN.node], ['npm', npm, MIN.npm]]
    .filter(([, version, min]) => !atLeast(version, min))
    .map(([name, version, min]) => `${name} ${version} é mais antigo que ${min}: o publicador de confiança do npm exige ${name} ${min} ou mais novo.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const npm = execFileSync('npm', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
  const found = problems({ node: process.versions.node, npm });
  for (const line of found) console.error(line);
  if (found.length) process.exit(1);
  console.log(`Ambiente de publicação ok: Node ${process.versions.node}, npm ${npm}.`);
}
