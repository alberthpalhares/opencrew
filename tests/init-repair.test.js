// specs/fase-r1-reparos-1-6-1.md — R1-08 (rule 22): `init --repair-bridges` rewrites only the
// bridges of the IDEs already installed (same detection as `update`), unless --ide or --all
// says otherwise, and its summary lists every backup copy it made.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { run } from '../src/cli.js';
import { init } from '../src/commands/init.js';
import { exists, readFile } from '../src/lib/fsx.js';
import { IDES, ideById, allIdeIds } from '../src/lib/ides.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';

const SKILL = '.claude/skills/opencrew/SKILL.md';
const SKILL_DO_PACOTE = ideById('claude-code').files.find((f) => f.path === SKILL).content;
const PONTE_ANTIGA = '---\nname: opencrew\n---\n\nRead `AGENTS.md` (ponte antiga)\n';

async function workspace(ides = ['claude-code']) {
  const dir = await mkTmp('repair');
  await withCwd(dir, () => init({ ide: ides }));
  return dir;
}

// Runs the real CLI, argument parser included: `init --repair-bridges <flags>`.
async function reparar(dir, ...flags) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => run(['init', '--repair-bridges', ...flags])));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

// Bridge files found in `dir` that belong to IDEs outside `ids` (a path shared with one of
// `ids` counts as theirs).
async function pontesDeOutrasIdes(dir, ...ids) {
  const delas = new Set(ids.flatMap((id) => ideById(id).files.map((f) => f.path)));
  const outras = new Set(IDES.flatMap((ide) => ide.files.map((f) => f.path)).filter((p) => !delas.has(p)));
  const achadas = [];
  for (const p of outras) if (await exists(path.join(dir, p))) achadas.push(p);
  return achadas;
}

// Paths (with `/`) that are new, gone or have new content between two `snapshot()`s.
function mudancas(antes, depois) {
  const porCaminho = (linhas) => new Map(linhas.map((l) => {
    const corte = l.lastIndexOf(':');
    return [l.slice(0, corte).split(path.sep).join('/'), l.slice(corte + 1)];
  }));
  const [a, d] = [porCaminho(antes), porCaminho(depois)];
  return {
    novos: [...d.keys()].filter((k) => !a.has(k)),
    sumidos: [...a.keys()].filter((k) => !d.has(k)),
    alterados: [...d.keys()].filter((k) => a.has(k) && a.get(k) !== d.get(k)),
  };
}

// What `update` compares against: path → sha256 of what OpenCrew delivered.
const registro = async (dir) => JSON.parse(await readFile(path.join(dir, '_opencrew', 'manifest.json'))).files;
const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

test('R1-08a: with only Claude Code installed, repair rewrites its bridge and no other IDE gets a file', async () => {
  const dir = await workspace();
  await fs.writeFile(path.join(dir, SKILL), PONTE_ANTIGA);
  const antes = await snapshot(dir);

  const { out, code } = await reparar(dir);

  assert.equal(code, 0);
  assert.equal(await readFile(path.join(dir, SKILL)), SKILL_DO_PACOTE);
  assert.deepEqual(await pontesDeOutrasIdes(dir, 'claude-code'), []);
  // AGENTS.md rule 3: in the whole folder only the bridge changes, and only its copy is new.
  const [data] = await fs.readdir(path.join(dir, '.opencrew-backup'));
  assert.deepEqual(mudancas(antes, await snapshot(dir)), {
    novos: [`.opencrew-backup/${data}/${SKILL}`], sumidos: [], alterados: [SKILL],
  });
  assert.ok(out.includes('Claude Code → '), out);
  for (const ide of IDES.filter((i) => i.id !== 'claude-code')) {
    assert.ok(!out.includes(`${ide.label} → `), `${ide.label} must not be in the summary`);
  }
});

test('R1-08b: an edited bridge is copied first, and the summary lists the copy inside .opencrew-backup/<date>/', async () => {
  const dir = await workspace();
  const editada = `${SKILL_DO_PACOTE}\nMinha regra extra.\n`;
  await fs.writeFile(path.join(dir, SKILL), editada);

  const { out, code } = await reparar(dir);

  assert.equal(code, 0);
  const datas = await fs.readdir(path.join(dir, '.opencrew-backup'));
  assert.equal(datas.length, 1);
  const copia = `.opencrew-backup/${datas[0]}/${SKILL}`;
  assert.equal(await readFile(path.join(dir, copia)), editada, 'the copy holds the user version');
  assert.ok(out.includes(copia), `the summary must list ${copia}:\n${out}`);
  assert.match(out, /1 cópia\(s\) de segurança/);
  assert.equal(await readFile(path.join(dir, SKILL)), SKILL_DO_PACOTE);
});

for (const flags of [[], ['--yes']]) {
  test(`R1-08c: no bridge detected and no --ide stops with exit 1 and writes nothing (flags: ${flags.join(' ') || 'none'})`, async () => {
    const dir = await workspace();
    await fs.rm(path.join(dir, '.claude'), { recursive: true });
    await fs.rm(path.join(dir, 'CLAUDE.md'));
    const antes = await snapshot(dir);

    const { out, code } = await reparar(dir, ...flags);

    assert.equal(code, 1);
    const mensagem = `Não encontrei pontes de IDE aqui. Use \`--ide=<id>\` para escolher. Ids válidos: ${allIdeIds().join(', ')}.`;
    assert.ok(out.includes(mensagem), out);
    assert.deepEqual(await snapshot(dir), antes);
  });
}

test('R1-08d: --yes chooses no IDE in repair — only the installed Claude Code bridge is rewritten', async () => {
  const dir = await workspace();
  const claudeMd = path.join(dir, 'CLAUDE.md');
  await fs.writeFile(claudeMd, '<!-- opencrew:start -->\nbloco antigo\n<!-- opencrew:end -->\n\n# Minhas notas\n');

  const { out, code } = await reparar(dir, '--yes');

  assert.equal(code, 0);
  assert.deepEqual(await pontesDeOutrasIdes(dir, 'claude-code'), []);
  const depois = await readFile(claudeMd);
  assert.match(depois, /opencrew — Project Instructions/);
  assert.ok(depois.endsWith('# Minhas notas\n'), 'user text outside the block survives');
  assert.equal(await exists(path.join(dir, '.opencrew-backup')), false, 'no whole-file bridge was edited: no copy');
  assert.doesNotMatch(out, /cópia\(s\) de segurança/);
});

test('R1-08e: --all alone writes the bridges of the 9 IDEs', async () => {
  const dir = await workspace();

  const { out, code } = await reparar(dir, '--all');

  assert.equal(code, 0);
  assert.equal(IDES.length, 9);
  for (const ide of IDES) {
    for (const f of ide.files) assert.equal(await exists(path.join(dir, f.path)), true, `${ide.id}: ${f.path}`);
    assert.ok(out.includes(`${ide.label} → `), `${ide.label} missing from the summary`);
  }
});

// Rule 22: with --ide the requested list wins, whatever comes with it.
for (const junto of ['--yes', '--all']) {
  test(`R1-08f: --ide=cursor ${junto} writes only the Cursor bridge`, async () => {
    const dir = await workspace();
    await fs.writeFile(path.join(dir, SKILL), PONTE_ANTIGA); // would be restored if Claude Code were repaired
    const [cursor] = ideById('cursor').files;
    const antes = await registro(dir);

    const { code } = await reparar(dir, '--ide=cursor', junto);

    assert.equal(code, 0);
    assert.equal(await readFile(path.join(dir, cursor.path)), cursor.content);
    assert.deepEqual(await pontesDeOutrasIdes(dir, 'claude-code', 'cursor'), []);
    assert.equal(await readFile(path.join(dir, SKILL)), PONTE_ANTIGA, 'Claude Code was not asked for');
    // The manifest keeps every entry it had and gains the new bridge, with the package hash.
    assert.deepEqual(await registro(dir), { ...antes, [cursor.path]: sha256(cursor.content) });
  });
}

// Rule 22 lives in the CLI code: a cached older package (npx) would still write the 9 IDEs.
test('R1 revisão: on a complete workspace, plain init points to the update and repair commands with @latest', async () => {
  const dir = await workspace();

  const out = await captureOutput(() => withCwd(dir, () => run(['init'])));

  assert.ok(out.includes('npx @aksp/opencrew@latest update'), out);
  assert.ok(out.includes('npx @aksp/opencrew@latest init --repair-bridges'), out);
});

// The repair never installs: the full init would drop 100+ files into a folder that is not a
// workspace (a typo in `cd`, another project).
for (const flags of [[], ['--yes'], ['--all'], ['--ide=cursor']]) {
  test(`R1 revisão: in a folder with no workspace, repair stops with exit 1 and writes nothing (flags: ${flags.join(' ') || 'none'})`, async () => {
    const dir = await mkTmp('repair');
    await fs.writeFile(path.join(dir, 'AGENTS.md'), '# Regras do meu outro projeto\n');
    await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules/\n.env\n');
    const antes = await snapshot(dir);

    const { out, code } = await reparar(dir, ...flags);

    assert.equal(code, 1);
    const mensagem = 'Não encontrei um workspace do OpenCrew nesta pasta. O reparo não instala: para instalar, rode `npx @aksp/opencrew@latest init`.';
    assert.ok(out.includes(mensagem), out);
    assert.deepEqual(await snapshot(dir), antes);
  });
}

// Installed up to 1.5.0 = no manifest. A bridges-only manifest made by the repair would make
// the next `update` call every older file "edited by you" and hide its first-run notice.
test('R1 revisão: without a manifest, repair creates none and the next update still gives the no-manifest summary', async () => {
  const dir = await workspace();
  const manifesto = path.join(dir, '_opencrew', 'manifest.json');
  await fs.rm(manifesto);
  await fs.writeFile(path.join(dir, SKILL), PONTE_ANTIGA);
  await fs.writeFile(path.join(dir, '_opencrew', 'core', 'runner.pipeline.md'), '# Pipeline Runner (1.5.0)\n');

  const { out, code } = await reparar(dir);

  assert.equal(code, 0);
  assert.equal(await readFile(path.join(dir, SKILL)), SKILL_DO_PACOTE);
  assert.match(out, /1 cópia\(s\) de segurança/, 'no manifest: the differing whole-file bridge is copied first');
  assert.equal(await exists(manifesto), false, 'the repair must not create a manifest');

  const depois = await captureOutput(() => withCwd(dir, () => run(['update'])));

  assert.match(depois, /1 arquivo\(s\) diferentes do pacote novo foram copiados/);
  assert.ok(depois.includes('Primeira atualização com proteção'), depois);
  assert.doesNotMatch(depois, /que você tinha editado/);
  assert.equal(await exists(manifesto), true, 'the update is what creates the manifest');
});

// ── Older tests, moved from tests/init.test.js (assertions tightened in the R1 review) ──

test('init --repair-bridges regenerates IDE bridge files in an existing workspace', async () => {
  const dir = await mkTmp('init');

  // First, create a workspace with the old (broken) workflow file.
  await withCwd(dir, () => init({ all: true }));

  // Simulate the bug: strip frontmatter from the antigravity workflow file.
  const workflowPath = path.join(dir, '.agent', 'workflows', 'opencrew.md');
  let workflow = await readFile(workflowPath);
  assert.ok(workflow.startsWith('---'), 'sanity: should have frontmatter after init');
  // Remove the frontmatter block.
  workflow = workflow.replace(/^---[\s\S]*?\n---\n/, '');
  await fs.writeFile(workflowPath, workflow);

  // Verify it's broken.
  const broken = await readFile(workflowPath);
  assert.ok(!broken.startsWith('---'), 'sanity: frontmatter should be removed');

  // Now repair.
  const antes = await snapshot(dir);
  await withCwd(dir, () => init({ 'repair-bridges': true }));

  // Verify it was fixed.
  const repaired = await readFile(workflowPath);
  assert.ok(repaired.startsWith('---'), 'repair-bridges should restore frontmatter');
  assert.match(repaired, /name:\s*opencrew/, 'repair-bridges should add name field');

  // Nothing else is touched: only the broken bridge changes, and only its copy is new.
  const [data] = await fs.readdir(path.join(dir, '.opencrew-backup'));
  assert.deepEqual(mudancas(antes, await snapshot(dir)), {
    novos: [`.opencrew-backup/${data}/.agent/workflows/opencrew.md`], sumidos: [], alterados: ['.agent/workflows/opencrew.md'],
  });
});

test('init --repair-bridges deduplicates shared paths', async () => {
  const dir = await mkTmp('init');
  await withCwd(dir, () => init({ all: true }));
  const SHARED = '.agents/skills/opencrew/SKILL.md';
  const donas = IDES.filter((ide) => ide.files.some((f) => f.path === SHARED));
  assert.ok(donas.length > 1, 'sanity: several IDEs use the same skill path');
  const doPacote = donas[0].files.find((f) => f.path === SHARED).content;
  const editada = `${doPacote}\nMinha regra extra.\n`;
  await fs.writeFile(path.join(dir, SHARED), editada);

  const { out, code } = await reparar(dir, '--all');

  // The shared skill is rewritten once: one backup copy, and the other IDEs only say so.
  assert.equal(code, 0);
  assert.equal(await readFile(path.join(dir, SHARED)), doPacote);
  const [data] = await fs.readdir(path.join(dir, '.opencrew-backup'));
  assert.equal(await readFile(path.join(dir, '.opencrew-backup', data, SHARED)), editada);
  assert.match(out, /1 cópia\(s\) de segurança/);
  assert.equal(out.split(`${SHARED} (shared path — written once)`).length - 1, donas.length - 1);
});
