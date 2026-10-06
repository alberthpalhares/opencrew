// specs/fase-r2-update-e-envio-seguros.md — R2-05e to R2-05g (rules 25 and 26): a network path
// or a site address cited by the crew is never tested (no disk call, no network) and becomes a
// "não conferido" alert; an error reading a crew file is one PT-BR line, exit 1, no FONTES: line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import { conferir, main } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { mkTmp, projetoFalso, rodarMain, CREW, SAIDA } from './_helpers.js';

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/scripts');
const PASSO = 'crews/c/pipeline/steps/step-01.md';
const AGENTE = 'crews/c/agents/redator.agent.md';
const REDE = ['\\\\servidor\\pasta\\arq.md', '//servidor/pasta/arq.md'];
const SITES = ['exemplo.com/blog/', 'www.exemplo.com/a.html', 'ftp://exemplo.com/a.csv', 'mailto:a@exemplo.com/x.md'];
const DUAS_BARRAS = /^[\\/]{2}/;
const COM_DOIS_CAMINHOS = /^(copyFile|rename|link|symlink|cp)(Sync)?$/;
const ALERTA = (citacao, onde) => `- ⚠️ \`${citacao}\` é um caminho de rede ou um endereço de site: não conferi se existe (a conferência não acessa a rede). (citado em ${onde})`;

const cita = (refs) => `# Passo\n\n${refs.map((r) => `- \`${r}\``).join('\n')}\n`;
const ref = (r, texto) => r.refs.find((x) => x.ref === texto);
const estados = (r) => r.refs.map((x) => [x.ref, x.estado]);
const ultima = (linhas) => linhas.filter((l) => l.trim()).at(-1);
const comDuasBarras = (vistos) => vistos.filter((c) => DUAS_BARRAS.test(c));

async function escrever(raiz, rel, conteudo = 'x') {
  const abs = path.join(raiz, rel);
  await fs.promises.mkdir(path.dirname(abs), { recursive: true });
  await fs.promises.writeFile(abs, conteudo);
}

/** A project (it has `_opencrew/`) with one crew; `arquivos` maps a relative path to its content. */
async function projeto(arquivos = {}) {
  const raiz = await mkTmp('rede');
  await fs.promises.mkdir(path.join(raiz, '_opencrew'));
  await escrever(raiz, 'crews/c/crew.yaml', 'name: "c"\n');
  for (const [rel, conteudo] of Object.entries(arquivos)) await escrever(raiz, rel, conteudo);
  return raiz;
}

/** Runs the source check command line inside `raiz`: exit code and printed lines. */
async function rodar(raiz, args) {
  const linhas = [];
  const code = await main(args, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas };
}

/**
 * The same function, recording every path it receives. A path that starts with two slashes is
 * answered "does not exist" without reaching the real function: the test never touches the network.
 */
function vigia(real, nome, daPromessa, vistos) {
  return function espia(...args) {
    const caminhos = args.slice(0, COM_DOIS_CAMINHOS.test(nome) ? 2 : 1).filter((a) => typeof a === 'string');
    vistos.push(...caminhos);
    const deRede = caminhos.find((c) => DUAS_BARRAS.test(c));
    if (!deRede) return real.apply(this, args);
    if (nome === 'existsSync') return false;
    const erro = Object.assign(new Error(`ENOENT: no such file or directory, '${deRede}'`), { code: 'ENOENT' });
    if (daPromessa) return Promise.reject(erro);
    throw erro;
  };
}

/** Runs `fn` with every function of node:fs (sync, callback and promises) under watch. */
async function comDiscoVigiado(fn) {
  const vistos = [];
  const desfazer = [];
  for (const dono of [fs, fs.promises]) {
    for (const nome of Object.keys(dono).filter((n) => /^[a-z]/.test(n) && typeof dono[n] === 'function')) {
      const real = dono[nome];
      dono[nome] = vigia(real, nome, dono === fs.promises, vistos);
      if (typeof real.native === 'function') dono[nome].native = vigia(real.native, nome, false, vistos);
      desfazer.push(() => { dono[nome] = real; });
    }
  }
  syncBuiltinESMExports(); // the scripts import the functions by name: refresh those bindings
  try {
    return { resultado: await fn(), vistos };
  } finally {
    for (const d of desfazer) d();
    syncBuiltinESMExports();
  }
}

test('R2-05e: a network path cited by the crew never reaches the disk and is a "não conferido" alert', async () => {
  const raiz = await projeto({ [PASSO]: cita(REDE), [AGENTE]: cita(REDE) });
  const { resultado: { code, linhas }, vistos } = await comDiscoVigiado(() => rodar(raiz, ['--crew', 'crews/c', '--corrigir']));
  assert.ok(vistos.some((c) => c.endsWith('crew.yaml')), 'the watch sees the disk calls of the script');
  assert.deepEqual(comDuasBarras(vistos), [], 'no disk call with a path that starts with two slashes');
  assert.equal(code, 0);
  for (const citacao of REDE) assert.ok(linhas.includes(ALERTA(citacao, `${PASSO}, ${AGENTE}`)), linhas.join('\n'));
  assert.ok(linhas.includes('**Resumo: 2 fontes — 0 ok, 0 pendentes, 2 alertas**'), linhas.join('\n'));
  // --corrigir does not touch the citation, nor counts it as a pending item without a fix.
  assert.ok(linhas.includes('Nada a corrigir.'), linhas.join('\n'));
  assert.equal(await fs.promises.readFile(path.join(raiz, PASSO), 'utf8'), cita(REDE));
  assert.equal(ultima(linhas), 'FONTES:OK');
});

test('R2-05e: with a real pending item next to the network paths, the status is PENDENTE', async () => {
  const raiz = await projeto({ [PASSO]: cita([...REDE, 'Docs/sumiu.md']) });
  const { resultado: { linhas }, vistos } = await comDiscoVigiado(() => rodar(raiz, ['--crew', 'crews/c']));
  assert.deepEqual(comDuasBarras(vistos), []);
  assert.ok(linhas.includes('**Resumo: 3 fontes — 0 ok, 1 pendentes, 2 alertas**'), linhas.join('\n'));
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R2-05e: the checker refuses a network --arquivo (and a network --crew) without touching the disk', async () => {
  const raiz = await projetoFalso({ saidas: { 'post.md': 'Um texto simples.\n' } });
  for (const deRede of ['\\\\servidor\\pasta\\post.md', '//servidor/pasta/post.md']) {
    const argv = ['--crew', CREW, '--arquivo', `${SAIDA}/post.md,${deRede}`];
    const { resultado, vistos } = await comDiscoVigiado(() => rodarMain(raiz, argv));
    assert.deepEqual([resultado.code, resultado.linhas], [1, [`Caminho fora do projeto: ${deRede}`]]);
    assert.ok(vistos.some((c) => c.endsWith('_opencrew')), 'the watch sees the disk calls of the script');
    assert.deepEqual(comDuasBarras(vistos), []);
  }
  const pelaCrew = await comDiscoVigiado(() => rodarMain(raiz, ['--crew', '//servidor/crews/c', '--arquivo', `${SAIDA}/post.md`]));
  assert.deepEqual(pelaCrew.resultado.linhas, ['Caminho fora do projeto: //servidor/crews/c']);
  assert.deepEqual(comDuasBarras(pelaCrew.vistos), []);
});

test('R2-05f: a site address between backticks is a "não conferido" alert, not a pending item', async () => {
  const raiz = await projeto({ [PASSO]: cita(SITES) });
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.deepEqual(estados(r), SITES.map((s) => [s, 'nao-conferido']));
  assert.equal(r.status, 'OK');
  const { linhas } = await rodar(raiz, ['--crew', 'crews/c']);
  for (const site of SITES) assert.ok(linhas.includes(ALERTA(site, PASSO)), linhas.join('\n'));
  assert.ok(linhas.includes('**Resumo: 4 fontes — 0 ok, 0 pendentes, 4 alertas**'), linhas.join('\n'));
  assert.equal(ultima(linhas), 'FONTES:OK');
});

test('R2-05f: with a folder called exemplo.com/ in the project, the first citation is a path', async () => {
  const raiz = await projeto({ [PASSO]: cita(SITES), 'exemplo.com/leia.md': 'x' });
  const semAPasta = await conferir({ raiz, crew: 'crews/c' });
  assert.equal(ref(semAPasta, 'exemplo.com/blog/').estado, 'faltando', 'a path that is not there is a pending item');
  assert.deepEqual(ref(semAPasta, 'exemplo.com/blog/').pasta, ['leia.md']);
  assert.equal(semAPasta.status, 'PENDENTE');

  await escrever(raiz, 'exemplo.com/blog/post.md');
  const r = await conferir({ raiz, crew: 'crews/c' });
  assert.deepEqual(estados(r), [['exemplo.com/blog/', 'ok'], ...SITES.slice(1).map((s) => [s, 'nao-conferido'])]);
  assert.equal(r.status, 'OK');
});

test('R2-05f: a name that only looks like an address is still checked on disk', async () => {
  // A hidden folder, a dot in a later segment, a dot before digits, a drive letter and ./ are paths.
  const caminhos = ['.config/modelo.md', 'Docs/site.com.br/pagina.md', 'Docs.2024/ata.md', 'C://opencrew-nao-existe/arq.md', './exemplo.com/blog/'];
  // In fontes: a file name alone has no folder before it, and http(s) stays as it was (no alert).
  const crewYaml = 'name: "c"\nfontes:\n  - caminho: briefing.md\n  - caminho: logo.png\n  - caminho: https://exemplo.com/guia\n';
  const raiz = await projeto({ 'crews/c/crew.yaml': crewYaml, 'crews/c/briefing.md': 'x', [PASSO]: cita(caminhos) });
  const r = await conferir({ raiz, crew: 'crews/c' });
  const dasFontes = [['briefing.md', 'ok'], ['logo.png', 'faltando'], ['https://exemplo.com/guia', 'faltando']];
  assert.deepEqual(estados(r), [...dasFontes, ...caminhos.map((c) => [c, 'faltando'])]);
  assert.equal(r.status, 'PENDENTE');
});

for (const [caso, criar] of [
  ['a broken link in agents/', (raiz, onde) => fs.promises.symlink(path.join(raiz, 'nao-existe'), path.join(onde, 'quebrado.md'), 'junction')],
  ['a folder junction called x.md', (raiz, onde) => fs.promises.symlink(path.join(raiz, 'Docs'), path.join(onde, 'x.md'), 'junction')],
]) {
  test(`R2-05g: ${caso} — "Não consegui conferir", exit 1, no FONTES: line and no stack trace`, async () => {
    const raiz = await projeto({ [PASSO]: '- `Docs/briefing.md`\n', 'Docs/briefing.md': 'x', [AGENTE]: '# Redator\n' });
    await criar(raiz, path.join(raiz, 'crews/c/agents'));
    for (const args of [['--crew', 'crews/c'], ['--crew', 'crews/c', '--corrigir']]) {
      const { code, linhas } = await rodar(raiz, args);
      assert.equal(code, 1);
      assert.equal(linhas.length, 1, linhas.join(' | '));
      assert.match(linhas[0], /^Não consegui conferir: \S/);
    }

    // As a process: nothing on stderr (an uncaught error would print its stack there).
    const destino = path.join(raiz, '_opencrew', 'core', 'scripts');
    await fs.promises.mkdir(path.join(destino, 'conferir-fontes'), { recursive: true });
    const modulos = (await fs.promises.readdir(path.join(SCRIPTS, 'conferir-fontes'))).map((m) => `conferir-fontes/${m}`);
    for (const f of ['comum.mjs', 'conferir-fontes.mjs', ...modulos]) await fs.promises.copyFile(path.join(SCRIPTS, f), path.join(destino, f));
    const p = spawnSync(process.execPath, ['_opencrew/core/scripts/conferir-fontes.mjs', '--crew', 'crews/c'], { cwd: raiz, encoding: 'utf8' });
    assert.equal(p.status, 1);
    assert.equal(p.stderr, '');
    assert.match(p.stdout, /^Não consegui conferir: [^\n]+\n$/);
    assert.doesNotMatch(p.stdout, /FONTES:|\n\s+at /);
  });
}
