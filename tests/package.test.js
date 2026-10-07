// AGENTS.md rules 2 and 5: the published tarball is what the README promises, and it
// never carries secrets, logs or maintainer-local files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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
  for (const must of ['bin/opencrew.js', 'src/cli.js', 'templates/AGENTS.md', 'templates/_opencrew/core/runner.pipeline.md', 'templates/skills/catalog.json', 'templates/_opencrew/core/scripts/verificar.mjs', 'templates/_opencrew/core/scripts/caminho.mjs', 'templates/_opencrew/core/scripts/caminho/nucleo.mjs']) {
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

// specs/fase-u3a1-pasta-de-entrega.md, rule 33: the delivery ships inside the payload.
test('U3a-14c: the tarball ships entregar.mjs, every module of scripts/entrega/ and prompts/entrega.prompt.md', () => {
  const core = 'templates/_opencrew/core';
  const modulos = readdirSync(path.join(root, core, 'scripts', 'entrega')).map((nome) => `${core}/scripts/entrega/${nome}`);
  assert.ok(modulos.length > 0, 'scripts/entrega/ is empty');
  for (const must of [`${core}/scripts/entregar.mjs`, ...modulos, `${core}/prompts/entrega.prompt.md`]) {
    assert.ok(files.includes(must), `missing from tarball: ${must}`);
  }
});

// specs/fase-u3a2-entrega-no-projeto.md, rule 33: the copy to the project ships inside the payload.
test('U3a-14c-f2: the tarball ships the new modules of scripts/entrega/ and of scripts/verificar/', () => {
  const scripts = 'templates/_opencrew/core/scripts';
  const novos = [
    ...['comparar', 'copia', 'destino', 'guardar', 'lembrar', 'ressalvas', 'resumo'].map((m) => `${scripts}/entrega/${m}.mjs`),
    `${scripts}/verificar/entradas.mjs`, `${scripts}/verificar/gravacao.mjs`,
  ];
  for (const must of novos) assert.ok(files.includes(must), `missing from tarball: ${must}`);
});

test('U3a-14c-f2: no module of scripts/ has more than 200 lines', () => {
  const pasta = path.join(root, 'templates', '_opencrew', 'core', 'scripts');
  const modulos = readdirSync(pasta, { recursive: true }).map(String).filter((nome) => nome.endsWith('.mjs'));
  assert.ok(modulos.length > 20, 'could not list scripts/');
  for (const nome of modulos) {
    const linhas = readFileSync(path.join(pasta, nome), 'utf8').trimEnd().split(/\r?\n/).length;
    assert.ok(linhas <= 200, `${nome} has ${linhas} lines`);
  }
});
// specs/fase-e1-escritorio-ao-vivo.md, rules 26 and 27: the Escritório ships inside the payload.
test('E1-07a: the tarball ships estado.mjs, escritorio.mjs and every file of escritorio/, and no dashboard/', () => {
  const core = 'templates/_opencrew/core';
  const pagina = readdirSync(path.join(root, core, 'escritorio')).map((nome) => `${core}/escritorio/${nome}`);
  assert.ok(pagina.includes(`${core}/escritorio/index.html`), 'the page folder lost index.html');
  for (const must of [`${core}/scripts/estado.mjs`, `${core}/scripts/escritorio.mjs`, ...pagina]) {
    assert.ok(files.includes(must), `missing from tarball: ${must}`);
  }
  assert.deepEqual(files.filter((f) => /(^|\/)dashboard\//.test(f)), [], 'the old dashboard app is gone');
  assert.equal(readdirSync(root).includes('dashboard'), false, 'dashboard/ left the repository root');
});
