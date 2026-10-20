// specs/fase-r4-instagram-limites-2026.md — the Instagram limits of 2026 (official sources,
// 2026-10-20): carousels up to 20 items, 3:4 at 1080 wide (app; the API still documents
// 4:5 to 1.91:1) and up to 5 hashtags. Contracts on the payload text plus the checker and the
// publisher measuring the new numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { main as publicar } from '../templates/skills/instagram-publisher/scripts/publish.js';
import { um, tags, texto, bloqueios, itens, par } from './_helpers.js';

const tpl = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const read = (rel) => readFileSync(path.join(tpl, rel), 'utf8');
const BP = '_opencrew/core/best-practices/';
const constraints = (md) => md.split(/^---$/m)[1];

test('R4-01a: instagram-feed carries 5 hashtags, 20 slides and 3:4 at 1080x1440', () => {
  const ig = read(`${BP}instagram-feed.md`);
  const fm = constraints(ig);
  assert.match(fm, /^\s+hashtags_max: 5$/m);
  assert.match(fm, /^\s+carousel_max_slides: 20$/m);
  assert.match(fm, /^\s+image_resolution: "1080x1440px"$/m);
  assert.match(fm, /^\s+image_ratio: "[^"]*3:4[^"]*"$/m);
  assert.doesNotMatch(ig, /5-15|30 hashtags|all 30/);
  assert.doesNotMatch(fm, /1080x1350/);
  // The API caveat: publishing through the Graph API still needs 4:5 (1080x1350).
  assert.match(ig, /API[^\n]*4:5[^\n]*1080x1350|API[^\n]*1080x1350[^\n]*4:5/);
});

test('R4-01b: 6 hashtags on an instagram-feed are blocked 6/5; 5 pass', async () => {
  const com = async (n) => um(`=== CAPTION ===\n${texto(300)}\n\n=== HASHTAGS ===\n${tags(n)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(await com(6)).map(par), [[6, 5]]);
  assert.deepEqual(bloqueios(await com(5)), []);
});

test('R4-01c: a 20-slide carousel passes; 21 slides are blocked 21/20', async () => {
  const carrossel = (n) => `=== SLIDES ===\n${Array.from({ length: n }, (_, i) => `Slide ${i + 1}:\n  Headline: frase do slide`).join('\n\n')}\n`;
  const vinte = await um(carrossel(20), 'instagram-feed');
  assert.deepEqual(bloqueios(vinte), []);
  assert.deepEqual(itens(vinte).filter((i) => /slides/.test(i.item)).map(par), [[20, 20]]);
  assert.deepEqual(bloqueios(await um(carrossel(21), 'instagram-feed')).map(par), [[21, 20]]);
});

test('R4-02a: instagram-reels carries 5 hashtags', () => {
  const reels = read(`${BP}instagram-reels.md`);
  assert.match(constraints(reels), /^\s+hashtags_max: 5$/m);
  assert.doesNotMatch(reels, /5-15/);
});

test('R4-03a: the publisher takes 2 to 20 images and warns that the API needs 4:5', async () => {
  const caminhos = (n) => Array.from({ length: n }, (_, i) => `crews/x/output/slide-${i + 1}.jpg`).join(',');
  const rodar = (n) => publicar(['node', 'publish.js', '--images', caminhos(n), '--dry-run'], { env: {}, cwd: tpl });
  await assert.rejects(rodar(21), /2–20 images \(got 21\)/);
  await assert.rejects(rodar(20), (e) => !/2–20 images/.test(e.message));
  const skill = read('skills/instagram-publisher/SKILL.md');
  assert.doesNotMatch(skill, /2-10|2 a 10/);
  assert.match(skill, /2-20/);
  assert.match(skill, /4:5[^\n]*1\.91:1/);
});

test('R4-04a: Instagram carousel presets are 1080x1440, none still 1080x1350', () => {
  const presets = {
    'skills/template-designer/SKILL.md': /Instagram Carousel: `width: 1080px; height: 1440px`/,
    'skills/template-designer/base-templates/model-a.html': /height:1440px/,
    'skills/template-designer/base-templates/model-b.html': /height:1440px/,
    'skills/template-designer/base-templates/model-c.html': /height:1440px/,
    'skills/image-creator/SKILL.md': /Instagram Carousel: 1080 x 1440/,
    'skills/image-fetcher/SKILL.md': /Instagram carousel: 1080x1440/,
    [`${BP}image-design.md`]: /Viewport\*\*: 1080 x 1440 \(3:4 portrait\)/,
  };
  for (const [rel, esperado] of Object.entries(presets)) {
    const md = read(rel);
    assert.match(md, esperado, `${rel} has no 1080x1440 carousel preset`);
    assert.doesNotMatch(md, /1080\s*x\s*1350|height:\s*1350px/i, `${rel} still uses 1080x1350`);
  }
});
