// AGENTS.md rule 14 — every runtime change reaches people who already use OpenCrew, via
// `update`. This simulates a pre-1.5 workspace (no checker, old format names, leaked
// CLAUDE.md section) and checks that one `update` delivers everything without touching data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { packageJsonPath } from '../src/lib/paths.js';
import { verificar } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { mkTmp, withCwd } from './_helpers.js';

const OLD_INSTAGRAM = '---\nname: "Instagram Feed Post"\nconstraints:\n  max_hashtags: 30\n  carousel_max_slides: 20\n  image_resolution: "1080x1440px"\n---\n';
const LEAKED_CLAUDE = '<!-- opencrew:start -->\n# opencrew — Project Instructions\n\n## STATUS.md (gestão de sessão)\n<!-- opencrew:end -->\n';

async function workspace141() {
  const dir = await mkTmp('upgrade');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const core = path.join(dir, '_opencrew', 'core');
  await fs.rm(path.join(core, 'scripts'), { recursive: true, force: true });
  await fs.writeFile(path.join(core, 'best-practices', 'instagram-feed.md'), OLD_INSTAGRAM);
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# Pipeline Runner (1.4.1)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.4.1\n');
  await fs.writeFile(path.join(dir, 'CLAUDE.md'), LEAKED_CLAUDE);
  // User data that must survive.
  await fs.mkdir(path.join(dir, 'crews', 'minha-crew', '_memory'), { recursive: true });
  await fs.mkdir(path.join(dir, 'crews', 'minha-crew', 'output'), { recursive: true });
  await fs.writeFile(path.join(dir, 'crews', 'minha-crew', '_memory', 'memories.md'), '## Proibições Explícitas\n\n- Nunca usar "preço baixo"\n');
  await fs.writeFile(path.join(dir, '_opencrew', '_memory', 'company.md'), '# Acme — dados reais');
  return dir;
}

test('U1-upg: update from a pre-1.5 workspace delivers the checker, the review lock and 4:5', async () => {
  const dir = await workspace141();
  await withCwd(dir, () => update());

  const core = path.join(dir, '_opencrew', 'core');
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  assert.equal((await fs.readFile(path.join(dir, '_opencrew', '.opencrew-version'), 'utf8')).trim(), pkg.version);
  assert.equal(await exists(path.join(core, 'scripts', 'verificar.mjs')), true);
  assert.equal(await exists(path.join(core, 'scripts', 'verificar', 'regras.mjs')), true);
  assert.match(await fs.readFile(path.join(core, 'runner.pipeline.md'), 'utf8'), /VERIFICACAO:BLOQUEADA/);
  const ig = await fs.readFile(path.join(core, 'best-practices', 'instagram-feed.md'), 'utf8');
  assert.match(ig, /hashtags_max: 30/);
  assert.match(ig, /1080x1350/);
  assert.doesNotMatch(await fs.readFile(path.join(dir, 'CLAUDE.md'), 'utf8'), /STATUS\.md/);
});

test('U1-upg: after update, the delivered checker works on the old crew memory; user data intact', async () => {
  const dir = await workspace141();
  await withCwd(dir, () => update());

  assert.equal(await fs.readFile(path.join(dir, '_opencrew', '_memory', 'company.md'), 'utf8'), '# Acme — dados reais');
  await fs.writeFile(path.join(dir, 'crews', 'minha-crew', 'output', 'post.md'), 'Promoção com preço baixo.\n');
  const r = await verificar({ raiz: dir, crew: 'crews/minha-crew', arquivos: ['crews/minha-crew/output/post.md'] });
  assert.equal(r.status, 'BLOQUEADA');
});

// ── 1.5.0 → 1.6.0 (U2): manifest, base agents, sources checker, refreshed bridges ──────

test('U2-upg: update from a 1.5.0 workspace delivers U2 without touching user data', async () => {
  const dir = await mkTmp('upgrade150');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  await fs.rm(path.join(dir, '_opencrew', 'manifest.json'), { force: true });
  await fs.rm(path.join(dir, '_opencrew', 'agents'), { recursive: true });
  await fs.rm(path.join(dir, '_opencrew', 'core', 'scripts', 'conferir-fontes.mjs'), { force: true });
  await fs.writeFile(path.join(dir, '.claude', 'skills', 'opencrew', 'SKILL.md'), '---\nname: opencrew\n---\nRead `AGENTS.md` and adopt the opencrew system role.\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.5.0\n');
  await fs.writeFile(path.join(dir, '_opencrew', '_memory', 'company.md'), '# Acme — dados reais');

  await withCwd(dir, () => update());

  assert.equal(await exists(path.join(dir, '_opencrew', 'manifest.json')), true);
  assert.equal(await exists(path.join(dir, '_opencrew', 'agents', 'researcher.agent.md')), true);
  assert.equal(await exists(path.join(dir, '_opencrew', 'core', 'scripts', 'conferir-fontes.mjs')), true);
  assert.match(await fs.readFile(path.join(dir, '.claude', 'skills', 'opencrew', 'SKILL.md'), 'utf8'), /ONLY when the user types/);
  assert.equal(await fs.readFile(path.join(dir, '_opencrew', '_memory', 'company.md'), 'utf8'), '# Acme — dados reais');
});

// ── 1.6.0 → 1.6.1 (R1): the checker measures what the best-practices teach ────────────

const CHECKER_160 = '// 1.6.0 (simulado): não mede a escrita com rótulos\nexport const verificar = async () => ({ status: \'OK\' });\n';

test('R1-upg: update from a 1.6.0 workspace delivers the checker that measures labelled text', async () => {
  const dir = await mkTmp('upgrade160');
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const core = path.join(dir, '_opencrew', 'core');
  // 1.6.0: no shared module, no piece reader, no reviewer block in the runner.
  await fs.rm(path.join(core, 'scripts'), { recursive: true, force: true });
  await fs.mkdir(path.join(core, 'scripts'), { recursive: true });
  await fs.writeFile(path.join(core, 'scripts', 'verificar.mjs'), CHECKER_160);
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# Pipeline Runner (1.6.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.6.0\n');
  // User data: a local overlay with no limits, and a crew output written with labels.
  const overlay = path.join(dir, '_opencrew', 'best-practices.local', 'instagram-feed.md');
  const saida = path.join(dir, 'crews', 'minha-crew', 'output', 'legendas.md');
  await fs.mkdir(path.dirname(overlay), { recursive: true });
  await fs.mkdir(path.dirname(saida), { recursive: true });
  await fs.writeFile(overlay, '# Instagram — minhas notas\n\nPrefira tom direto.\n');
  await fs.writeFile(saida, `=== CAPTION ===\n${'a'.repeat(2300)}\n`);

  await withCwd(dir, () => update());

  // Imported from the WORKSPACE, not from templates/: proves every module arrived together.
  const entregue = pathToFileURL(path.join(core, 'scripts', 'verificar.mjs')).href;
  const { verificar: verificarEntregue } = await import(`${entregue}?r1-upg`);
  const arquivo = 'crews/minha-crew/output/legendas.md';
  const r = await verificarEntregue({ raiz: dir, crew: 'crews/minha-crew', arquivos: [{ arquivo, formato: 'instagram-feed' }] });
  assert.equal(r.status, 'BLOQUEADA');
  const legenda = r.arquivos[0].itens.find((i) => i.nivel === 'bloqueio');
  assert.deepEqual([legenda.medido, legenda.limite], [2300, 2200]);
  assert.ok(r.notas.some((n) => n.includes('best-practices.local/instagram-feed.md')), 'note about the overlay without limits');
  assert.match(await fs.readFile(path.join(core, 'runner.pipeline.md'), 'utf8'), /--- REGRAS DO REVISOR ---/);
  assert.equal(await fs.readFile(overlay, 'utf8'), '# Instagram — minhas notas\n\nPrefira tom direto.\n');
  assert.equal(await fs.readFile(saida, 'utf8'), `=== CAPTION ===\n${'a'.repeat(2300)}\n`);

  // The sources checker too: its shared module and its own folder arrived with it.
  const fontesEntregue = pathToFileURL(path.join(core, 'scripts', 'conferir-fontes.mjs')).href;
  const { conferir } = await import(`${fontesEntregue}?r1-upg`);
  assert.equal((await conferir({ raiz: dir, crew: 'crews/minha-crew' })).status, 'OK');
});
