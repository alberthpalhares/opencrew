// specs/fase-u2-crew-que-conhece-o-projeto.md — U2-05..U2-09: `update` delivers everything to
// people who already use OpenCrew, keeps a copy of what they edited, and coexists with other
// agent systems in the same project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { templatesDir } from '../src/lib/paths.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';

async function rodarUpdate(dir) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, () => update()));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}

async function workspace(ides = ['claude-code']) {
  const dir = await mkTmp('upd2');
  await withCwd(dir, () => init({ ide: ides }));
  return dir;
}

async function backups(dir) {
  const raiz = path.join(dir, '.opencrew-backup');
  if (!(await exists(raiz))) return [];
  const out = [];
  async function walk(d) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else out.push(path.relative(raiz, p).split(path.sep).join('/'));
    }
  }
  await walk(raiz);
  return out;
}

test('U2-05a: update delivers the base agents to a workspace without them, never overwriting an edited one', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, '_opencrew', 'agents'), { recursive: true });
  await rodarUpdate(dir);
  assert.equal(await exists(path.join(dir, '_opencrew', 'agents', 'researcher.agent.md')), true);

  const editado = path.join(dir, '_opencrew', 'agents', 'copywriter.agent.md');
  await fs.writeFile(editado, 'meu copywriter');
  await rodarUpdate(dir);
  assert.equal(await fs.readFile(editado, 'utf8'), 'meu copywriter');
});

test('U2-06a: an edited catalog skill is copied to .opencrew-backup before being replaced', async () => {
  const dir = await workspace();
  assert.equal(await exists(path.join(dir, '_opencrew', 'manifest.json')), true, 'init writes the manifest');
  const skill = path.join(dir, 'skills', 'resend', 'SKILL.md');
  await fs.writeFile(skill, 'minha versão do skill');

  const { out } = await rodarUpdate(dir);
  const copias = await backups(dir);
  const copia = copias.find((p) => p.endsWith('skills/resend/SKILL.md'));
  assert.ok(copia, `backup missing: ${copias.join(', ')}`);
  assert.equal(await fs.readFile(path.join(dir, '.opencrew-backup', copia), 'utf8'), 'minha versão do skill');
  assert.equal(await fs.readFile(skill, 'utf8'), await fs.readFile(path.join(templatesDir, 'skills', 'resend', 'SKILL.md'), 'utf8'));
  assert.match(out, /skills\/resend\/SKILL\.md/);
  assert.equal(copias.length, 1, 'only the edited file is copied');
});

test('U2-06b: without a manifest (≤1.5.0), files equal to the package are not copied', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, '_opencrew', 'manifest.json'));
  await rodarUpdate(dir);
  assert.deepEqual(await backups(dir), []);
  assert.equal(await exists(path.join(dir, '_opencrew', 'manifest.json')), true, 'update writes the manifest');
});

test('U2-06c: a package older than the installed version refuses to update and writes nothing', async () => {
  const dir = await workspace();
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '9.0.0\n');
  const antes = await snapshot(dir);
  const { out, code } = await rodarUpdate(dir);
  assert.equal(code, 1);
  assert.match(out, /9\.0\.0/);
  assert.match(out, /npx @aksp\/opencrew@latest update/);
  assert.deepEqual(await snapshot(dir), antes);
});

test('U2-07b: update refreshes the bridges of installed IDEs only', async () => {
  const dir = await workspace(['claude-code']);
  const skill = path.join(dir, '.claude', 'skills', 'opencrew', 'SKILL.md');
  await fs.writeFile(skill, '---\nname: opencrew\n---\n\nRead `AGENTS.md` (ponte antiga)\n');
  await rodarUpdate(dir);
  assert.match(await fs.readFile(skill, 'utf8'), /_opencrew\/core\/system\.md/);
  for (const outra of ['GEMINI.md', 'QWEN.md', '.cursor', '.agents', '.agent', '.trae', '.github']) {
    assert.equal(await exists(path.join(dir, outra)), false, `${outra} must not be created`);
  }
});

test('U2-08b: another system\'s instructions in AGENTS.md stay byte for byte', async () => {
  const dir = await workspace();
  const agents = path.join(dir, 'AGENTS.md');
  const outroSistema = '\n# Córtex — Agente Sócio\n\nVocê é o sócio estratégico. Regras do outro sistema.\n';
  await fs.writeFile(agents, (await fs.readFile(agents, 'utf8')) + outroSistema);
  await rodarUpdate(dir);
  const depois = await fs.readFile(agents, 'utf8');
  assert.ok(depois.endsWith(outroSistema));
  assert.match(depois, /<!-- opencrew:start -->[\s\S]*_opencrew\/core\/system\.md[\s\S]*<!-- opencrew:end -->/);
});

test('U2-09a: .mcp.json merge — playwright gets the output dir, other servers stay intact', async () => {
  const dir = await workspace();
  const outro = { command: 'node', args: ['meu-servidor.js'], env: { X: '1' } };
  await fs.writeFile(path.join(dir, '.mcp.json'), JSON.stringify({
    mcpServers: {
      outro,
      playwright: { command: 'npx', args: ['@playwright/mcp@0.0.78', '--config', '_opencrew/config/playwright.config.json'] },
    },
  }, null, 2));
  await rodarUpdate(dir);
  const mcp = JSON.parse(await fs.readFile(path.join(dir, '.mcp.json'), 'utf8'));
  assert.deepEqual(mcp.mcpServers.outro, outro);
  const args = mcp.mcpServers.playwright.args;
  assert.equal(args[args.indexOf('--output-dir') + 1], '_opencrew/logs/playwright');
  assert.equal(args.filter((a) => a === '--output-dir').length, 1);
});

test('U2-09b: a legacy opensquad bridge triggers a warning and is not deleted', async () => {
  const dir = await workspace();
  const legado = path.join(dir, '.gemini', 'skills', 'opensquad', 'SKILL.md');
  await fs.mkdir(path.dirname(legado), { recursive: true });
  await fs.writeFile(legado, 'Read `_opensquad/core/system.md`\n');
  const { out } = await rodarUpdate(dir);
  assert.match(out, /\.gemini\/skills\/opensquad\/SKILL\.md/);
  assert.equal(await exists(legado), true);
});

test('U2-06d: a file that differs only in line endings (CRLF) is not treated as edited', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, '_opencrew', 'manifest.json'));
  const skill = path.join(dir, 'skills', 'resend', 'SKILL.md');
  await fs.writeFile(skill, (await fs.readFile(skill, 'utf8')).replace(/\r?\n/g, '\r\n'));
  const { out } = await rodarUpdate(dir);
  assert.deepEqual(await backups(dir), []);
  assert.doesNotMatch(out, /que você tinha editado/);
});

test('U2-06e: without a manifest, the summary says "diferentes do pacote", not "você editou"', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, '_opencrew', 'manifest.json'));
  await fs.writeFile(path.join(dir, 'skills', 'resend', 'SKILL.md'), 'versão diferente');
  const { out } = await rodarUpdate(dir);
  assert.match(out, /diferentes do pacote novo/);
  assert.doesNotMatch(out, /que você tinha editado/);
});
