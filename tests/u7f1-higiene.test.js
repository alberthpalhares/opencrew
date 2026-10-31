// specs/fase-u7-f1-higiene-e-seguranca.md — F1 of the U7 roadmap: small defects and risks that can
// reach people who already use OpenCrew. Contracts on the payload text, the CLI behaviours, and
// the old tests that had locked the behaviour being fixed (F1-04a/b, E1-04i, U4a-02b).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import * as fsx from '../src/lib/fsx.js';
import { isProtectedTarget, workspaceAbove } from '../src/lib/alvo.js';
import { mkTmp, withCwd, captureOutput, snapshot } from './_helpers.js';

const raiz = new URL('../', import.meta.url);
const ler = (rel) => (existsSync(new URL(rel, raiz)) ? readFileSync(new URL(rel, raiz), 'utf8') : '');
const flat = (s) => s.replace(/\s+/g, ' ').trim();

async function rodar(fn) {
  process.exitCode = 0;
  const out = await captureOutput(fn);
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

async function comPastaPessoal(dir, fn) {
  const antes = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = dir;
  process.env.USERPROFILE = dir;
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(antes)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

async function criarLink(alvo, link) {
  try {
    await fs.symlink(alvo, link);
    return true;
  } catch {
    return false; // Windows without permission to create links: the scenario is skipped
  }
}

test('U7F1-01a: the read-only-file test is skipped (with the reason) for root, not failed', () => {
  const t = ler('tests/conserto-bordas.test.js');
  assert.match(t, /process\.getuid\?\.\(\) !== 0/);
  assert.match(t, /U4a-02b[^\n]*skip: !naoRoot && 'needs POSIX and a user that is not root'/);
});

test('U7F1-02a: image-creator serves only on 127.0.0.1 and has a PowerShell variant', () => {
  const skill = ler('templates/skills/image-creator/SKILL.md');
  assert.match(skill, /http\.server 8765 --bind 127\.0\.0\.1/);
  assert.doesNotMatch(skill, /localhost:8765/);
  assert.match(skill, /Start-Process/);
  assert.match(skill, /Stop-Process/);
  // The stop commands must not kill the shell that runs them (its own command line holds the pattern).
  assert.match(skill, /\$_\.ProcessId -ne \$PID/);
  assert.match(skill, /pkill -f "\[p\]ython/);
});

test('U7F1-04a: a legacy AGENTS.md is copied to .opencrew-backup/, never to AGENTS.md.bak in the root', () => {
  const t = ler('src/commands/update.js');
  assert.doesNotMatch(t, /\.bak/);
  assert.match(t, /backupFile\(ctx, 'AGENTS\.md'\)/);
});

test('U7F1-05a: a symbolic link in place of a payload file is never written through', async (t) => {
  const dir = await mkTmp('u7f1-link');
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const fora = path.join(dir, 'fora-do-projeto.txt');
  await fs.writeFile(fora, 'conteúdo do usuário\n');
  const alvo = path.join(dir, '_opencrew', 'core', 'system.md');
  await fs.rm(alvo);
  if (!(await criarLink(fora, alvo))) return t.skip('cannot create symbolic links here');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.0.0\n');

  const { out } = await rodar(() => withCwd(dir, () => update()));

  assert.equal(await fs.readFile(fora, 'utf8'), 'conteúdo do usuário\n');
  assert.ok((await fs.lstat(alvo)).isSymbolicLink());
  assert.match(out, /link simbólico: não gravei/);
  assert.ok(out.includes('_opencrew/core/system.md'));
});

test('U7F1-05b: writeFileSafe does not write through a symbolic link either (dangling or not)', async (t) => {
  const dir = await mkTmp('u7f1-link2');
  const fora = path.join(dir, 'fora.txt');
  await fs.writeFile(fora, 'original\n');
  const link = path.join(dir, 'link.txt');
  if (!(await criarLink(fora, link))) return t.skip('cannot create symbolic links here');
  assert.equal(await fsx.writeFileSafe(link, 'novo\n'), false);
  assert.equal(await fs.readFile(fora, 'utf8'), 'original\n');
  const solto = path.join(dir, 'solto.txt');
  await criarLink(path.join(dir, 'nao-existe.txt'), solto);
  assert.equal(await fsx.writeFileSafe(solto, 'novo\n'), false);
  assert.equal(await fsx.exists(path.join(dir, 'nao-existe.txt')), false);
});

test('U7F1-06a: init in the home folder refuses before writing anything', async () => {
  const dir = await mkTmp('u7f1-home');
  await comPastaPessoal(dir, () => withCwd(dir, async () => {
    await assert.rejects(() => captureOutput(() => init({ ide: ['claude-code'] })), /pasta pessoal \(ou a raiz do disco\)/);
  }));
  assert.deepEqual(await fs.readdir(dir), []);
});

test('U7F1-06b: the filesystem root is a protected target; an ordinary folder and the home folder\'s children are not', async () => {
  const dir = await mkTmp('u7f1-raiz');
  const sistema = path.parse(dir).root;
  assert.equal(isProtectedTarget(sistema, dir), true);
  assert.equal(isProtectedTarget(dir, dir), true);
  assert.equal(isProtectedTarget(path.join(dir, 'projeto'), dir), false);
  assert.equal(isProtectedTarget(dir, path.join(dir, 'outra')), false);
  assert.equal(isProtectedTarget(dir, ''), false, 'HOME= set but empty is no home folder');
});

test('U7F1-06c: init inside a folder under a workspace warns where it is and carries on', async () => {
  const dir = await mkTmp('u7f1-aninhado');
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  const filha = path.join(dir, 'clientes', 'a');
  await fs.mkdir(filha, { recursive: true });
  assert.equal(await workspaceAbove(filha), dir);
  assert.equal(await workspaceAbove(dir), null);

  const out = await captureOutput(() => withCwd(filha, () => init({ ide: ['claude-code'] })));

  assert.ok(out.includes(dir), 'the warning names the workspace above');
  assert.match(out, /acima desta pasta/);
  assert.ok(await fsx.exists(path.join(filha, '_opencrew', 'core')), 'the init went on');
});

test('U7F1-07a: update without a workspace exits 1 (also with --check) and writes nothing', async () => {
  const dir = await mkTmp('u7f1-sem');
  const antes = await snapshot(dir);
  for (const opts of [{}, { check: true }]) {
    const { out, code } = await rodar(() => withCwd(dir, () => update(opts)));
    assert.match(out, /No opencrew workspace found here/);
    assert.equal(code, 1, JSON.stringify(opts));
  }
  assert.deepEqual(await snapshot(dir), antes);
});

test('U7F1-08a: no-unused-vars is an error, and the lint has no warning to hide', () => {
  assert.match(ler('eslint.config.js'), /"no-unused-vars": \["error"/);
});

test('U7F1-09a: fsx exports only what src/ uses, and @inquirer/confirm is gone from package.json and the lock', () => {
  assert.deepEqual(Object.keys(fsx).sort(), ['exists', 'isLink', 'readFile', 'readJson', 'writeFileSafe']);
  const pkg = JSON.parse(ler('package.json'));
  assert.equal(pkg.dependencies['@inquirer/confirm'], undefined);
  const lock = JSON.parse(ler('package-lock.json'));
  assert.equal(lock.packages[''].dependencies['@inquirer/confirm'], undefined);
  assert.equal(lock.packages['node_modules/@inquirer/confirm'], undefined);
  assert.doesNotMatch(ler('AGENTS.md'), /@inquirer\/confirm`, sem uso/);
});

test('U7F1-10a: skill install uses the installed catalog first, pins the tag, never main, and asks before installing packages', () => {
  const t = flat(ler('templates/_opencrew/core/skills.engine.md'));
  assert.match(t, /installed catalog in `skills\/` first/i);
  assert.match(t, /raw\.githubusercontent\.com\/alberthpalhares\/opencrew\/v\{installed version\}\/templates\/skills/);
  assert.doesNotMatch(t, /opencrew\/main\//);
  assert.match(t, /show the exact list of packages and ask for confirmation before running `npm install` or `pip install`/i);
});

test('U7F1-11a: /opencrew reset is not listed, and nothing in the payload cites it', () => {
  assert.doesNotMatch(ler('README.md'), /\/opencrew reset/);
  const base = new URL('templates/', raiz);
  const citam = readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && !/\.(png|jpe?g|gif|ico|woff2?)$/i.test(e.name))
    .map((e) => path.join(e.parentPath ?? e.path, e.name))
    .filter((f) => readFileSync(f, 'utf8').includes('/opencrew reset'));
  assert.deepEqual(citam, []);
});
