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

// specs/fase-u3b-documento-word.md, rules 11, 13 and 14: the Word document ships inside the payload.
test('U3b-07a: the tarball ships documento.mjs, every module of scripts/documento/, entrega/documentos.mjs, the model, the prompt and the guide', () => {
  const core = 'templates/_opencrew/core';
  const modulos = readdirSync(path.join(root, core, 'scripts', 'documento')).map((nome) => `${core}/scripts/documento/${nome}`);
  assert.ok(modulos.length >= 15, 'scripts/documento/ lost modules');
  const novos = [
    `${core}/scripts/documento.mjs`, ...modulos, `${core}/scripts/entrega/documentos.mjs`,
    `${core}/modelos/documento-oficial.md`, `${core}/prompts/documento.prompt.md`, `${core}/best-practices/documento-oficial.md`,
  ];
  for (const must of novos) assert.ok(files.includes(must), `missing from tarball: ${must}`);
});

test('U3b-07a: the model of the profile cites no name, CNPJ, site nor path of the maintainer', () => {
  const modelo = readFileSync(path.join(root, 'templates', '_opencrew', 'core', 'modelos', 'documento-oficial.md'), 'utf8');
  assert.doesNotMatch(modelo, /alberth|palhares|klinsmann|aksp|poty/i);
  for (const [cnpj] of modelo.matchAll(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g)) assert.equal(cnpj, '00.000.000/0001-00');
  for (const [site] of modelo.matchAll(/(?:www\.|@|https?:\/\/)[\w.-]+/g)) assert.match(site, /exemplo\.org$/, `not a fictitious address: ${site}`);
  assert.doesNotMatch(modelo, /[A-Za-z]:\\|\/Users\/|\/home\/|60-69/, 'a local path');
  // The content keys ship empty: the user's letterhead is the user's.
  for (const chave of ['logotipo', 'cabecalho_1', 'cabecalho_2', 'cabecalho_3', 'rodape']) assert.match(modelo, new RegExp(`^${chave}:[ \\t]*\\r?$`, 'm'));
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
