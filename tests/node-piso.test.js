// Fase R2 (specs/fase-r2-update-e-envio-seguros.md, regras 27 e 28) — o piso do Node que o pacote
// promete é o que as dependências aceitam, e abaixo dele (ou sem a lista de IDEs) nada é escrito.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../src/cli.js';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { pickIdes } from '../src/lib/prompts.js';
import { mkTmp, withCwd, snapshot, captureOutput, exitPromptError } from './_helpers.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel) => fs.readFile(path.join(raiz, rel), 'utf8');
const lerJson = async (rel) => JSON.parse(await ler(rel));
const pisoDeclarado = async () => (await lerJson('package.json')).engines.node.replace(/^>=/, '');

// ── Avaliador de faixa do npm, só o que aparece em `engines.node` ──────────────────────────
const partes = (v) => v.split('.').map((n) => Number(n) || 0).concat(0, 0).slice(0, 3);
function compara(a, b) {
  const [x, y] = [partes(a), partes(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/** Um comparador: ">=20.17.0", "^22.13.0", "~1.2", "20.0.0" ou "*". */
function aceitaUm(versao, comparador) {
  if (comparador === '*' || comparador === '') return true;
  const m = comparador.match(/^(>=|<=|>|<|\^|~|=)?v?(\d+(?:\.\d+){0,2})$/);
  assert.ok(m, `comparador que este teste não sabe ler: "${comparador}"`);
  const [, op, v] = m;
  const d = compara(versao, v);
  const [maior, menor] = partes(v);
  if (op === '^') return d >= 0 && compara(versao, `${maior + 1}.0.0`) < 0;
  if (op === '~') return d >= 0 && compara(versao, `${maior}.${menor + 1}.0`) < 0;
  return { '>=': d >= 0, '>': d > 0, '<=': d <= 0, '<': d < 0 }[op] ?? d === 0;
}

/** `||` é OU; espaço é E (">= 12" é um comparador só). */
const aceita = (versao, faixa) => faixa.split('||').some((alternativa) =>
  alternativa.trim().replace(/([<>=^~])\s+/g, '$1').split(/\s+/).every((c) => aceitaUm(versao, c)));

test('R2-06a: engines.node tem o formato >=X.Y.Z e toda dependência de produção aceita esse piso', async () => {
  const lock = await lerJson('package-lock.json');
  const faixa = (await lerJson('package.json')).engines.node;
  assert.match(faixa, /^>=\d+\.\d+\.\d+$/);
  assert.equal(lock.packages[''].engines.node, faixa, 'o lock espelha o engines.node do package.json');

  const piso = faixa.slice(2);
  const recusam = Object.entries(lock.packages)
    .filter(([nome, p]) => nome !== '' && !p.dev && p.engines?.node && !aceita(piso, p.engines.node))
    .map(([nome, p]) => `${nome} (${p.engines.node})`);
  assert.deepEqual(recusam, [], `dependências de produção que recusam o Node ${piso}`);
  assert.equal((await ler('.nvmrc')).trim(), piso, 'a .nvmrc aponta para o mesmo piso');
});

test('R2-06a (README): os pré-requisitos citam o mesmo piso do engines.node', async () => {
  const piso = await pisoDeclarado();
  const curto = piso.split('.').slice(0, 2).join('.');
  const citadas = [...(await ler('README.md')).matchAll(/Node(?:\.js)?[^\d\n]{0,12}(\d+(?:\.\d+){0,2})/g)].map((m) => m[1]);
  assert.ok(citadas.length > 0, 'o README diz qual Node é preciso');
  for (const v of citadas) assert.ok(v === piso || v === curto, `o README cita o Node ${v}; o piso é o ${piso}`);
});

// ── A checagem no CLI ──────────────────────────────────────────────────────────────────────
const SEGUNDA = 'Instale a versão LTS em https://nodejs.org/ e rode o comando de novo. Nada foi alterado nesta pasta.';
const primeira = (piso, atual) => `O OpenCrew precisa do Node.js ${piso} ou mais novo. Esta máquina está com o v${atual}.`;
const COMANDOS = [['update'], ['init', '--yes'], ['help'], ['--version']];

async function rodar(dir, argv, deps) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => run(argv, deps)));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

/** Os comandos de verdade, anotando cada chamada: prova "nenhum comando chamado" e "pasta intacta". */
function espiados() {
  const chamados = [];
  const espiar = (nome, comando) => (opts) => { chamados.push(nome); return comando(opts); };
  return { chamados, commands: { init: espiar('init', init), update: espiar('update', update) } };
}

for (const argv of COMANDOS) {
  test(`R2-06b: no Node 20.16.0, "${argv.join(' ')}" para com a mensagem do piso e não chama comando`, async () => {
    const dir = await mkTmp('piso');
    await fs.writeFile(path.join(dir, 'meu.txt'), 'arquivo do usuário\n');
    const antes = await snapshot(dir);
    const { chamados, commands } = espiados();
    const { out, code } = await rodar(dir, argv, { commands, nodeVersion: '20.16.0' });
    assert.equal(code, 1);
    assert.ok(out.includes(primeira(await pisoDeclarado(), '20.16.0')), out);
    assert.ok(out.includes(SEGUNDA), out);
    assert.doesNotMatch(out, /Usage|requires Node\.js|^\d+\.\d+\.\d+$/m, 'nem ajuda, nem versão, nem a frase antiga em inglês');
    assert.deepEqual(chamados, []);
    assert.deepEqual(await snapshot(dir), antes);
  });
}

test('R2-06b: a mensagem do piso cita 20.17.0 (o texto da spec)', async () => {
  const { out } = await rodar(await mkTmp('piso'), ['help'], { nodeVersion: '18.20.4' });
  assert.ok(out.includes(primeira('20.17.0', '18.20.4')), out);
});

test('R2-06b: no Node 20.17.0 os mesmos comandos rodam', async () => {
  for (const argv of COMANDOS) {
    const chamados = [];
    const commands = { init: async () => chamados.push('init'), update: async () => chamados.push('update') };
    const { out, code } = await rodar(await mkTmp('piso'), argv, { commands, nodeVersion: '20.17.0' });
    assert.equal(code, 0, argv.join(' '));
    assert.doesNotMatch(out, /precisa do Node\.js/);
    if (argv[0] === 'help') assert.match(out, /Usage/);
    else if (argv[0] === '--version') assert.match(out, /^\d+\.\d+\.\d+$/m);
    else assert.deepEqual(chamados, [argv[0]]);
  }
});

test('R2-06b: o piso separa pelo número, não pelo texto (20.9 < 20.17; 22 e 24 passam)', async () => {
  for (const [nodeVersion, esperado] of [['20.9.0', 1], ['20.16.99', 1], ['19.9.9', 1], ['20.17.1', 0], ['22.0.0', 0], ['24.14.0', 0]]) {
    const { code } = await rodar(await mkTmp('piso'), ['--version'], { nodeVersion });
    assert.equal(code, esperado, `Node ${nodeVersion}`);
  }
});

// ── A lista de IDEs do `init` ──────────────────────────────────────────────────────────────
async function comTerminal(fn) {
  const fluxos = [process.stdin, process.stdout];
  const antes = fluxos.map((f) => f.isTTY);
  for (const f of fluxos) f.isTTY = true;
  try {
    return await fn();
  } finally {
    fluxos.forEach((f, i) => { f.isTTY = antes[i]; });
  }
}

/** `init` sem opção, num terminal interativo, com a lista de IDEs carregada por `load`. */
async function initInterativo(load) {
  const dir = await mkTmp('lista');
  const commands = { init: (opts) => init(opts, { pickIdes: () => pickIdes({}, { load }) }) };
  const { out, code } = await comTerminal(() => rodar(dir, ['init'], { commands }));
  return { out, code, criados: await fs.readdir(dir) };
}

const LIMITE = { timeout: 20_000 }; // sem a guarda, a lista de verdade abriria e o teste ficaria esperando

test('R2-06c: lista de IDEs que não carrega → mensagem com --ide e --all, código 1, pasta intacta', LIMITE, async () => {
  const { out, code, criados } = await initInterativo(async () => {
    throw new SyntaxError("The requested module 'node:util' does not provide an export named 'styleText'");
  });
  assert.equal(code, 1);
  assert.ok(out.includes(`Não consegui abrir a lista de IDEs neste Node (v${process.versions.node}).`), out);
  assert.ok(out.includes('Atualize o Node em https://nodejs.org/ ou escolha as IDEs no próprio comando: '
    + 'npx @aksp/opencrew init --ide=claude-code (ou --all para todas). Nada foi alterado nesta pasta.'), out);
  assert.doesNotMatch(out, /styleText|Run .*help.* for usage/, 'sem o erro técnico e sem a linha de ajuda em inglês');
  assert.deepEqual(criados, []);
});

test('R2-06c: Ctrl+C na lista de IDEs continua saindo com 130', LIMITE, async () => {
  const lista = async () => { throw exitPromptError(); };
  const { out, code, criados } = await initInterativo(async () => ({ default: lista, Separator: class {} }));
  assert.equal(code, 130);
  assert.match(out, /Cancelled — nothing was written\./);
  assert.doesNotMatch(out, /Não consegui abrir a lista/);
  assert.deepEqual(criados, []);
});

test('R2-06c: lista que carrega devolve as IDEs escolhidas', LIMITE, async () => {
  const lista = async ({ choices }) => choices.filter((c) => c.value === 'cursor').map((c) => c.value);
  const ids = await comTerminal(() => pickIdes({}, { load: async () => ({ default: lista, Separator: class {} }) }));
  assert.deepEqual(ids, ['cursor']);
});
