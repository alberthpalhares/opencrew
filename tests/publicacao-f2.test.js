// specs/fase-u7-f2-publicacao-e-ci-seguros.md — F2 of the U7 roadmap: publishing by OIDC (no stored
// token), a rehearsal that catches an already-published version, and a CI with the least
// permission, no install scripts, Actions that no longer run on Node 20, and Node 24 in the matrix.
// The workflows are read as text, like tests/release-gate.test.js: no YAML parser, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atLeast, problems } from '../scripts/check-publish-env.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => fs.readFile(path.join(raiz, rel), 'utf8');
const ci = () => ler('.github/workflows/ci.yml');
const publish = () => ler('.github/workflows/publish.yml');

// The steps of the job that publishes (six-space dash, as in the two workflows), comments included.
const passos = (yaml) => yaml.split(/^ {6}- /m).slice(1);
const indice = (yaml, regex) => passos(yaml).findIndex((p) => regex.test(p));
const semComentarios = (yaml) => yaml.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#.*$/, '')).join('\n');

test('U7F2-01a: the real publish step has no stored token, keeps provenance, and the job can ask for an OIDC token', async () => {
  const yaml = semComentarios(await publish());
  assert.doesNotMatch(yaml, /NODE_AUTH_TOKEN|secrets\.NPM_TOKEN/);
  assert.match(yaml, /run: npm publish --provenance --access public/);
  assert.match(yaml, /id-token: write/);
  assert.match(await publish(), /trusted publisher/i, 'the header says how the publish authenticates');
  assert.doesNotMatch(await publish(), /Requires an NPM_TOKEN/);
});

test('U7F2-02a: the job installs npm 11 and checks Node and npm before the first npm publish', async () => {
  const yaml = await publish();
  const instala = indice(yaml, /npm install -g npm@11/);
  const confere = indice(yaml, /node scripts\/check-publish-env\.js/);
  const publica = indice(yaml, /run: npm publish/);
  assert.ok(instala >= 0 && confere > instala && publica > confere, `ordem: instala ${instala}, confere ${confere}, publica ${publica}`);
});

test('U7F2-02b: the version comparison looks at all three parts', () => {
  for (const [versao, minimo, esperado] of [
    ['11.5.0', '11.5.1', false], ['11.5.1', '11.5.1', true], ['11.10.0', '11.5.1', true], ['10.9.2', '11.5.1', false],
    ['22.13.9', '22.14.0', false], ['22.14.0', '22.14.0', true], ['v24.1.0', '22.14.0', true],
  ]) assert.equal(atLeast(versao, minimo), esperado, `${versao} >= ${minimo}`);
  assert.deepEqual(problems({ node: '22.14.0', npm: '11.5.1' }), []);
  assert.equal(problems({ node: '22.13.0', npm: '10.9.2' }).length, 2);
  assert.match(problems({ node: '22.14.0', npm: '11.5.0' })[0], /npm 11\.5\.0 é mais antigo que 11\.5\.1/);
});

test('U7F2-03a: every run checks that the version is not yet on npm, before the first npm publish; tag x version stays tag-only', async () => {
  const yaml = await publish();
  const passo = passos(yaml)[indice(yaml, /npm view "@aksp\/opencrew@\$PKG_VERSION" version/)];
  assert.ok(passo, 'existe o passo que consulta o npm');
  assert.doesNotMatch(passo, /^ {8}if:/m, 'sem condição: roda na tag e no disparo manual');
  assert.match(passo, /E404/, 'só o 404 conta como "ainda não publicada"; falha de rede não passa em silêncio');
  assert.ok(indice(yaml, /npm view "@aksp/) < indice(yaml, /run: npm publish/));
  const tag = passos(yaml)[indice(yaml, /GITHUB_REF_NAME/)];
  assert.match(tag, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
});

test('U7F2-04a: ci.yml asks only for contents: read, and both workflows install without install scripts', async () => {
  const c = semComentarios(await ci());
  assert.match(c, /^permissions:\n {2}contents: read$/m);
  assert.match(c, /run: npm ci --ignore-scripts/);
  assert.match(semComentarios(await publish()), /run: npm ci --ignore-scripts/);
  assert.doesNotMatch(c, /run: npm ci$/m);
});

test('U7F2-05a: no Action runs on Node 20 (@v4), and every external Action is pinned by commit SHA with its version in a comment', async () => {
  for (const arquivo of ['ci.yml', 'publish.yml']) {
    const texto = await ler(`.github/workflows/${arquivo}`);
    assert.doesNotMatch(texto, /uses: actions\/\w[\w-]*@v4/, arquivo);
    const usos = texto.split(/\r?\n/).filter((l) => /^\s*- uses: /.test(l) && !/uses: \.\//.test(l));
    assert.ok(usos.length >= 2, arquivo);
    for (const linha of usos) assert.match(linha, /uses: [\w-]+\/[\w-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/, `${arquivo}: ${linha.trim()}`);
  }
});

test('U7F2-05b: dependabot keeps the pinned Actions up to date, weekly', async () => {
  const d = await ler('.github/dependabot.yml');
  assert.match(d, /package-ecosystem: "?github-actions"?/);
  assert.match(d, /directory: "?\/"?/);
  assert.match(d, /interval: "?weekly"?/);
});

test('U7F2-06a: the matrix has Node 24, and the docs say so', async () => {
  const c = semComentarios(await ci());
  const lista = c.match(/node-version: \[([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
  const piso = JSON.parse(await ler('package.json')).engines.node.replace(/^>=/, '');
  assert.deepEqual(lista, [piso, '22', '24']);
  assert.match(await ler('CONTRIBUTING.md'), /Node 20\.17\/22\/24/);
  assert.match(await ler('CONTRIBUTING.md'), /Node 20\.17, 22 and 24/);
  assert.match(await ler('AGENTS.md'), /Node 20\.17\/22\/24/);
});

test('U7F2-07a: CONTRIBUTING does not tell the maintainer to create an NPM_TOKEN secret', async () => {
  const t = await ler('CONTRIBUTING.md');
  assert.doesNotMatch(t, /Set the `NPM_TOKEN` secret/);
  assert.match(t, /Trusted Publisher/);
});
