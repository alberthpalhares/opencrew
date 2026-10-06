// specs/fase-e1-escritorio-ao-vivo.md — E1-07b and the documents of §9 (AGENTS.md rule 9: a
// document that lies is fixed in the same commit). The old dashboard app left the repository;
// what the documents say about it has to follow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { packageRoot } from '../src/lib/paths.js';

const ler = (nome) => readFileSync(path.join(packageRoot, nome), 'utf8');
const flat = (texto) => texto.replace(/\s+/g, ' ');

/** The text of one `## ` section of a markdown file, heading included, line breaks flattened. */
function secao(texto, titulo) {
  const partes = texto.split(/^(?=## )/m);
  return flat(partes.find((p) => p.startsWith(`## ${titulo}`)) ?? '');
}

const readme = ler('README.md');
const escritorio = secao(readme, 'Escritório');

test('E1-07b: the README explains how to open the Escritório, in a section of its own', () => {
  assert.notEqual(escritorio, '', 'README lost the "## Escritório" section');
  assert.match(escritorio, /`\/opencrew dashboard`/);
  assert.match(escritorio, /`\/opencrew dashboard off`/);
  assert.match(escritorio, /http:\/\/127\.0\.0\.1:4747/, 'the address the command shows');
});

test('E1-07b: the Escritório section says it is local, offline and unmeasured, costs one short command per step, and may lag', () => {
  assert.match(escritorio, /só neste computador/);
  assert.match(escritorio, /sem internet/);
  assert.match(escritorio, /sem medição/);
  assert.match(escritorio, /cada passo custa um comando curto a mais/);
  assert.match(escritorio, /mostra o que a IA avisa/);
  assert.match(escritorio, /pode atrasar/);
});

test('E1-07b: the README tree of installed folders shows escritorio/ and the scripts folder', () => {
  const arvore = readme.slice(readme.indexOf('## Estrutura de pastas gerada')).split('```')[1];
  assert.match(arvore, /^│ {3}│ {3}├── escritorio\/ /m);
  assert.match(arvore, /^│ {3}│ {3}├── scripts\/ /m);
});

test('E1-07b: the README no longer says the dashboard is not installed, nor cites the old app', () => {
  assert.doesNotMatch(readme, /dashboard\/index\.html|não é instalado|experimental/);
  const mencoes = readme.split(/\r?\n/).filter((l) => /dashboard/i.test(l) && !/\/opencrew dashboard/.test(l));
  assert.deepEqual(mencoes, [], 'every mention of "dashboard" left in the README is the command');
});

test('E1 §9: CHANGELOG has the Escritório entry, whatever its title and place, and it tells what changes for the user', () => {
  const entrada = ler('CHANGELOG.md').split(/^(?=## \[)/m).find((p) => p.includes('/opencrew dashboard')) ?? '';
  assert.notEqual(entrada, '', 'CHANGELOG lacks the Escritório entry');
  const texto = flat(entrada);
  assert.match(texto, /`\/opencrew dashboard`/);
  assert.match(texto, /`crews\/<crew>\/output\/<run>\/state\.json`/, 'the final state is no longer copied to the run folder');
  assert.match(texto, /npx @aksp\/opencrew@latest update/);
});

test('E1 §9: CONTRIBUTING, .npmignore and .gitignore no longer cite the dashboard/ folder', () => {
  for (const nome of ['CONTRIBUTING.md', '.npmignore', '.gitignore']) {
    assert.doesNotMatch(ler(nome), /dashboard/i, `${nome} still cites the dashboard`);
  }
  assert.match(ler('CONTRIBUTING.md'), /_opencrew\/core\/escritorio\//);
});

test('E1 §9: AGENTS.md rule 7 names the look of the Escritório in the browser as what verify does not cover', () => {
  const regra7 = flat(ler('AGENTS.md').split(/^(?=### )/m).find((p) => p.startsWith('### 7.')) ?? '');
  assert.match(regra7, /o publish real no npm, a aparência do escritório no navegador\./);
  assert.doesNotMatch(regra7, /dashboard/i);
});

test('E1 §9: GLOSSARIO.md has the four new terms; IDEIAS.md lost the dashboard entry', () => {
  const glossario = ler('GLOSSARIO.md');
  for (const termo of ['Escritório', 'Estado da execução', 'Evento de estado', 'Passagem de bastão']) {
    assert.match(glossario, new RegExp(`^\\| ${termo} \\| .+ \\| Runtime \\| .+ \\|$`, 'm'), `GLOSSARIO.md lacks "${termo}"`);
  }
  assert.doesNotMatch(ler('IDEIAS.md'), /Dashboard: publicar ou remover|dashboard\/index\.html/);
});
