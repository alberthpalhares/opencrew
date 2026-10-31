// AGENTS.md rule 14 for phase U7-F1 (specs/fase-u7-f1-higiene-e-seguranca.md, U7F1-upg): a 1.19.3
// workspace gets the safer image-creator, the pinned skill installer, the system doc without the
// undefined /opencrew reset and the Escritório server with the new headers with one `update`.
// The CLI changes (init, update, fsx) arrive with the new package itself. The crews stay as they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

const ANTIGOS = {
  'skills/image-creator/SKILL.md': '---\nname: image-creator\n---\n\npython -m http.server 8765 --directory "OUT" &\nhttp://localhost:8765/slide-01.html\n',
  '_opencrew/core/skills.engine.md': 'fetch https://raw.githubusercontent.com/alberthpalhares/opencrew/main/templates/skills\nrun: `pip install {packages}`\n',
  '_opencrew/core/system.md': '| `/opencrew reset` | Confirm and reset all configuration |\n',
  '_opencrew/core/scripts/escritorio/servidor.mjs': "const CABECALHOS = { 'Content-Security-Policy': \"default-src 'self'\" };\n",
};
const CREW = 'name: "Minha crew"\ntier: standard\n';

test('U7F1-upg: one update brings the safer skill, installer, system doc and Escritório headers to a 1.19.3 workspace; the crew is untouched', async (t) => {
  const dir = await mkTmp('upgrade-u7f1');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  for (const [arquivo, conteudo] of Object.entries(ANTIGOS)) await fs.writeFile(path.join(dir, arquivo), conteudo);
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.19.3\n');
  await fs.mkdir(path.join(dir, 'crews', 'minha-crew'), { recursive: true });
  await fs.writeFile(path.join(dir, 'crews', 'minha-crew', 'crew.yaml'), CREW);

  await captureOutput(() => withCwd(dir, () => update()));
  const ler = (rel) => fs.readFile(path.join(dir, rel), 'utf8');

  assert.match(await ler('skills/image-creator/SKILL.md'), /http\.server 8765 --bind 127\.0\.0\.1/);
  assert.doesNotMatch(await ler('skills/image-creator/SKILL.md'), /localhost:8765/);
  const engine = await ler('_opencrew/core/skills.engine.md');
  assert.doesNotMatch(engine, /opencrew\/main\//);
  assert.match(engine, /ask for confirmation before running/);
  assert.doesNotMatch(await ler('_opencrew/core/system.md'), /\/opencrew reset/);
  assert.match(await ler('_opencrew/core/scripts/escritorio/servidor.mjs'), /frame-ancestors 'none'/);
  assert.equal(await ler('crews/minha-crew/crew.yaml'), CREW);
});
