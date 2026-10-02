// AGENTS.md rules 2 and 5: the published tarball is what the README promises, and it
// never carries secrets, logs or maintainer-local files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function packedFiles() {
  // shell:true so Windows resolves npm.cmd; the arguments are fixed literals.
  const res = spawnSync('npm pack --dry-run --json --ignore-scripts', { cwd: root, shell: true, encoding: 'utf8' });
  assert.equal(res.status, 0, `npm pack failed: ${res.stderr}`);
  const [pkg] = JSON.parse(res.stdout.slice(res.stdout.indexOf('[')));
  return pkg.files.map((f) => f.path.split(path.sep).join('/'));
}

const files = packedFiles();

test('tarball never ships secrets, logs, session or sandbox files', () => {
  const forbidden = [/(^|\/)\.env$/, /\.log$/, /(^|\/)STATUS\.md$/i, /^sandbox\//, /node_modules\//, /^docs\//, /^specs\//];
  for (const f of files) {
    for (const rx of forbidden) assert.doesNotMatch(f, rx, `forbidden file in tarball: ${f}`);
  }
});

test('tarball ships the CLI entry point and the runtime payload', () => {
  for (const must of ['bin/opencrew.js', 'src/cli.js', 'templates/AGENTS.md', 'templates/_opencrew/core/runner.pipeline.md', 'templates/skills/catalog.json']) {
    assert.ok(files.includes(must), `missing from tarball: ${must}`);
  }
});

// Files the README tree says land in the user's project, and where each comes from.
const GENERATED = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']); // written by src/lib/ides.js + init
const SOURCE = { '.gitignore': 'templates/gitignore' };

test('every top-level entry of the README "Estrutura de pastas gerada" tree is shipped', () => {
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  const start = readme.indexOf('## Estrutura de pastas gerada');
  assert.ok(start > -1, 'README lost the "Estrutura de pastas gerada" section');
  const block = readme.slice(start).split('```')[1];
  const entries = [...block.matchAll(/^[├└]── (\S+)/gm)].map((m) => m[1].replace(/\/$/, ''));
  assert.ok(entries.length >= 5, 'could not parse the README tree');
  for (const name of entries) {
    if (GENERATED.has(name)) continue;
    const src = SOURCE[name] ?? `templates/${name}`;
    assert.ok(
      files.some((f) => f === src || f.startsWith(src + '/')),
      `README promises "${name}" in the user's project, but ${src} is not in the tarball`
    );
  }
});
