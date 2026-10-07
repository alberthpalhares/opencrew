// specs/fase-u3a2-entrega-no-projeto.md, rules 30 and 31 — U3a-12g, 12h-f2, 12i-f2 and the guards
// 12f and 13c: what `update` does to an interrupted install and to the block of the .gitignore.
// The old files are written literally here, never by the current init.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { hashOf } from '../src/lib/manifest.js';
import { templatesDir } from '../src/lib/paths.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';

const COMENTARIO = '# gerenciado pelo OpenCrew: suas linhas ficam fora deste bloco';
const INTERROMPIDA = 'A instalação anterior não terminou. Rode `npx @aksp/opencrew init` para concluir.';
// The block of the .gitignore as 1.8.0 wrote it.
const BLOCO_180 = ['# opencrew:start', 'node_modules/', '.env', '*.log', 'crews/*/output/', 'crews/*/state.json',
  'crews/*/_investigations/', '_opencrew/_memory/company.md', '_opencrew/_memory/preferences.md',
  '_opencrew/_browser_profile/', '_opencrew/logs/', '.opencrew-backup/', '.claude/settings.local.json', '# opencrew:end'].join('\n');
const BLOCO = /# opencrew:start\n[\s\S]*?\n# opencrew:end/g;

async function rodar(dir, opts) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => update(opts)));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

async function pasta(t) {
  const dir = await mkTmp('upd-u3a2');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  return dir;
}

/** A 1.8.0 workspace with this .gitignore; `registrado` = the manifest knows the 1.8.0 block. */
async function workspace180(t, gitignore, { registrado = true } = {}) {
  const dir = await pasta(t);
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.writeFile(path.join(dir, '.gitignore'), gitignore);
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.8.0\n');
  const arquivo = path.join(dir, '_opencrew', 'manifest.json');
  const manifesto = JSON.parse(await fs.readFile(arquivo, 'utf8'));
  manifesto.version = '1.8.0';
  if (registrado) manifesto.files['.gitignore#opencrew'] = hashOf(BLOCO_180);
  else delete manifesto.files['.gitignore#opencrew'];
  await fs.writeFile(arquivo, `${JSON.stringify(manifesto, null, 2)}\n`);
  return dir;
}

const ler = (dir, ...p) => fs.readFile(path.join(dir, ...p), 'utf8');
/** Backup copies of `arquivo`, one per run that copied it. */
async function copias(dir, arquivo) {
  const raiz = path.join(dir, '.opencrew-backup');
  if (!(await exists(raiz))) return [];
  const datas = await fs.readdir(raiz);
  const achadas = [];
  for (const data of datas) if (await exists(path.join(raiz, data, arquivo))) achadas.push(path.join(raiz, data, arquivo));
  return achadas;
}

// ── U3a-12g An interrupted install is not updated (rule 31) ──────────────────────────────────

for (const [nome, opts] of [['update', {}], ['update --check', { check: true }]]) {
  test(`U3a-12g: ${nome} over _opencrew/core with no version stamp writes nothing, exits 1 and tells the user to run init`, async (t) => {
    const dir = await pasta(t);
    await fs.mkdir(path.join(dir, '_opencrew', 'core'), { recursive: true });
    await fs.writeFile(path.join(dir, '_opencrew', 'core', 'runner.pipeline.md'), '# Pipeline Runner (pela metade)\n');
    const antes = await snapshot(dir);

    const { out, code } = await rodar(dir, opts);

    assert.equal(code, 1, out);
    assert.ok(out.includes(INTERROMPIDA), out);
    assert.doesNotMatch(out, /unknown/i);
    assert.deepEqual(await snapshot(dir), antes, 'something was written');
    assert.equal(await exists(path.join(dir, '_opencrew', '.opencrew-version')), false, 'the workspace was stamped');
  });
}

test('U3a-12g: the init that follows concludes the install, and the update after it runs', async (t) => {
  const dir = await pasta(t);
  await fs.mkdir(path.join(dir, '_opencrew', 'core'), { recursive: true });
  await fs.writeFile(path.join(dir, '_opencrew', 'core', 'runner.pipeline.md'), '# Pipeline Runner (pela metade)\n');
  assert.equal((await rodar(dir)).code, 1);

  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  assert.equal(await exists(path.join(dir, '_opencrew', '.opencrew-version')), true, 'init did not stamp');
  assert.equal(await exists(path.join(dir, '_opencrew', 'core', 'scripts', 'entregar.mjs')), true);

  const { out, code } = await rodar(dir);
  assert.equal(code, 0, out);
  assert.match(out, /Updated to v/);
});

// ── U3a-12h-f2 The comment of the block (rule 30) ────────────────────────────────────────────

test('U3a-12h-f2: templates/gitignore starts with the comment of spec §6', async () => {
  const modelo = await fs.readFile(path.join(templatesDir, 'gitignore'), 'utf8');
  assert.equal(modelo.split(/\r?\n/)[0], COMENTARIO);
});

test('U3a-12h-f2: update of a 1.8.0 workspace puts the comment in the block; the user lines before and after stay byte for byte, with no backup copy', async (t) => {
  const [antesDoBloco, depoisDoBloco] = ['dist/\n# minha regra\nrascunhos/\n\n', '\n\nminha-pasta/\n*.tmp\n'];
  const dir = await workspace180(t, `${antesDoBloco}${BLOCO_180}${depoisDoBloco}`);

  const { out, code } = await rodar(dir);

  assert.equal(code, 0, out);
  const depois = await ler(dir, '.gitignore');
  const blocos = depois.match(BLOCO);
  assert.equal(blocos.length, 1);
  assert.ok(blocos[0].startsWith(`# opencrew:start\n${COMENTARIO}\nnode_modules/\n`), blocos[0]);
  assert.equal(depois.slice(0, depois.indexOf('# opencrew:start')), antesDoBloco);
  assert.equal(depois.slice(depois.indexOf('# opencrew:end') + '# opencrew:end'.length), depoisDoBloco);
  assert.deepEqual(await copias(dir, '.gitignore'), [], 'the .gitignore was copied');
});

// ── U3a-12i-f2 An orphan marker (rule 30) ────────────────────────────────────────────────────

test('U3a-12i-f2: a start marker with no end — no line is lost, a complete block goes at the end, the previous file is copied and the summary lists it', async (t) => {
  const original = '# opencrew:start\nnode_modules/\n.env\n*.log\ndist/\nminha-pasta/\n';
  const dir = await workspace180(t, original, { registrado: false });

  const { out, code } = await rodar(dir);

  assert.equal(code, 0, out);
  const depois = await ler(dir, '.gitignore');
  assert.ok(depois.startsWith(original.trimEnd()), 'a line of the user changed or left');
  const bloco = depois.slice(depois.lastIndexOf('# opencrew:start'));
  assert.ok(bloco.startsWith(`# opencrew:start\n${COMENTARIO}\nnode_modules/\n`), 'no block at the end');
  assert.ok(bloco.endsWith('.claude/settings.local.json\n# opencrew:end\n'), 'the block at the end is not complete');
  assert.equal(depois.split('# opencrew:end').length - 1, 1);
  const [copia, ...outras] = await copias(dir, '.gitignore');
  assert.ok(copia && !outras.length, 'expected one copy in .opencrew-backup/<data>/');
  assert.equal(await fs.readFile(copia, 'utf8'), original);
  assert.match(out, /1 arquivo\(s\) foram copiados para \.opencrew-backup\/[^/]+\/ antes de serem substituídos/);
  assert.match(out, /^\s+\.gitignore /m, 'the summary does not list the copy');
});

test('U3a-12i-f2: the second update changes nothing and makes no other copy', async (t) => {
  const dir = await workspace180(t, '# opencrew:start\nnode_modules/\n.env\n*.log\ndist/\nminha-pasta/\n', { registrado: false });
  await rodar(dir);
  const antes = await ler(dir, '.gitignore');

  const { out, code } = await rodar(dir);

  assert.equal(code, 0, out);
  assert.equal(await ler(dir, '.gitignore'), antes);
  assert.equal((await copias(dir, '.gitignore')).length, 1);
});

test('U3a-12i-f2: an end marker with no start is an orphan too', async (t) => {
  const original = 'dist/\n.env\n# opencrew:end\nminha-pasta/\n';
  const dir = await workspace180(t, original, { registrado: false });
  await rodar(dir);
  const depois = await ler(dir, '.gitignore');
  assert.ok(depois.startsWith(original.trimEnd()));
  assert.equal(depois.match(BLOCO).length, 1);
  assert.equal(await fs.readFile((await copias(dir, '.gitignore'))[0], 'utf8'), original);
});

test('U3a-12i-f2: a complete block and, after it, a loose start marker — the complete block is renewed and no line is lost', async (t) => {
  const resto = '\n# opencrew:start\ndist/\nminha-pasta/\n';
  const dir = await workspace180(t, `build/\n\n${BLOCO_180}${resto}`);

  const { out, code } = await rodar(dir);

  assert.equal(code, 0, out);
  const depois = await ler(dir, '.gitignore');
  assert.ok(depois.startsWith(`build/\n\n# opencrew:start\n${COMENTARIO}\nnode_modules/\n`), depois);
  assert.ok(depois.endsWith(`# opencrew:end${resto}`), 'the lines after the block changed');
  assert.equal(depois.match(BLOCO).length, 1);
});

// ── Guards: they pass since R2 and stay as regression locks ──────────────────────────────────

for (const [caso, conteudo] of [['with a block', 'MINHA=1\n\n# opencrew:start\nCHAVE_ANTIGA=\n# opencrew:end\n'], ['with no block', 'MINHA=1\nOUTRA=2\n']]) {
  test(`U3a-12f: update does not change a .env.example ${caso}`, async (t) => {
    const dir = await workspace180(t, `${BLOCO_180}\n`);
    await fs.writeFile(path.join(dir, '.env.example'), conteudo);
    const { out, code } = await rodar(dir);
    assert.equal(code, 0, out);
    assert.equal(await ler(dir, '.env.example'), conteudo);
  });
}

test('U3a-13c: update leaves an edited preferences.md and a crews/x/state.json byte for byte', async (t) => {
  const dir = await workspace180(t, `${BLOCO_180}\n`);
  const dados = {
    '_opencrew/_memory/preferences.md': '# Preferências\n\n- **Dashboard:** enabled\n- Editado por mim\r\n',
    'crews/x/state.json': '{"status":"running","step":2}\n',
    'crews/x/crew.yaml': 'name: "x"\nentrega:\n  destino: "Prontos"\n',
  };
  for (const [arquivo, conteudo] of Object.entries(dados)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  const { out, code } = await rodar(dir);
  assert.equal(code, 0, out);
  for (const [arquivo, conteudo] of Object.entries(dados)) assert.equal(await ler(dir, arquivo), conteudo, arquivo);
});
