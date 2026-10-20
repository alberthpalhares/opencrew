// AGENTS.md rule 14 for phase R4 (specs/fase-r4-instagram-limites-2026.md, R4-upg): a 1.19.1
// workspace with the old Instagram limits (30 hashtags, 10 slides, 4:5 at 1080x1350, publisher
// with 2-10 images) gets the limits of 2026 with one `update`. No migration: all of it lives in
// `_opencrew/core/` and in the skill catalog, which `update` renews. Crew files stay as they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

const ANTIGOS = {
  '_opencrew/core/best-practices/instagram-feed.md': '---\nname: "Instagram Feed Post"\nconstraints:\n  hashtags_max: 30\n  carousel_max_slides: 10\n  image_ratio: "4:5 portrait"\n  image_resolution: "1080x1350px"\n---\n\n9. Use 5-15 relevant hashtags.\n',
  '_opencrew/core/best-practices/instagram-reels.md': '---\nname: "Instagram Reels"\nconstraints:\n  hashtags_max: 30\n---\n\n9. Use 5-15 relevant hashtags.\n',
  'skills/instagram-publisher/SKILL.md': '---\nname: instagram-publisher\n---\n\nSupports 2-10 images per post.\n',
  'skills/template-designer/base-templates/model-a.html': '<div style="width:1080px;height:1350px;"></div>\n',
};
const PASSO = 'Gerar 8 slides em 1080x1350, com 12 hashtags.\n';

async function workspace1191(t) {
  const dir = await mkTmp('upgrade-r4');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  for (const [arquivo, conteudo] of Object.entries(ANTIGOS)) await fs.writeFile(path.join(dir, arquivo), conteudo);
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.19.1\n');
  await fs.mkdir(path.join(dir, 'crews', 'minha-crew', 'steps'), { recursive: true });
  await fs.writeFile(path.join(dir, 'crews', 'minha-crew', 'steps', 'step-02-design.md'), PASSO);
  return dir;
}

test('R4-upg: one update brings 5 hashtags, 20 slides and 3:4 to a 1.19.1 workspace; the crew is untouched', async (t) => {
  const dir = await workspace1191(t);
  await captureOutput(() => withCwd(dir, () => update()));
  const ler = (rel) => fs.readFile(path.join(dir, rel), 'utf8');

  const feed = await ler('_opencrew/core/best-practices/instagram-feed.md');
  assert.match(feed, /^\s+hashtags_max: 5$/m);
  assert.match(feed, /^\s+carousel_max_slides: 20$/m);
  assert.match(feed, /^\s+image_resolution: "1080x1440px"$/m);
  assert.match(await ler('_opencrew/core/best-practices/instagram-reels.md'), /^\s+hashtags_max: 5$/m);
  assert.match(await ler('skills/instagram-publisher/SKILL.md'), /2-20/);
  assert.match(await ler('skills/template-designer/base-templates/model-a.html'), /height:1440px/);
  assert.equal(await ler('crews/minha-crew/steps/step-02-design.md'), PASSO);
});
