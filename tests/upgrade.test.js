// AGENTS.md rule 14 — every runtime change reaches people who already use OpenCrew, via
// `update`. This simulates a pre-1.5 workspace (no checker, old format names, leaked
// CLAUDE.md section) and checks that one `update` delivers everything without touching data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
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
