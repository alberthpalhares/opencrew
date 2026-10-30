// AGENTS.md rule 14 for phase R5 (specs/fase-r5-criacao-de-crew.md, R5-upg): a 1.19.2 workspace
// whose Design prompt sizes the team by complexity gets the tier-based prompt with one `update`.
// No migration: the prompts live in `_opencrew/core/`, which `update` renews. Crew files stay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { mkTmp, withCwd, captureOutput } from './_helpers.js';

const DESIGN = '_opencrew/core/prompts/design.prompt.md';
const ANTIGO = '## Phase D: Role Proposal\n- **Suggest based on crew complexity**: 2-3 / 3-4 / 4-6 roles\n';
const CREW = 'name: "Minha crew"\ntier: standard\n';

test('R5-upg: one update brings the tier-based Design prompt to a 1.19.2 workspace; the crew is untouched', async (t) => {
  const dir = await mkTmp('upgrade-r5');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await captureOutput(() => withCwd(dir, () => init({ ide: ['claude-code'] })));
  await fs.writeFile(path.join(dir, DESIGN), ANTIGO);
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.19.2\n');
  await fs.mkdir(path.join(dir, 'crews', 'minha-crew'), { recursive: true });
  await fs.writeFile(path.join(dir, 'crews', 'minha-crew', 'crew.yaml'), CREW);

  await captureOutput(() => withCwd(dir, () => update()));

  const design = await fs.readFile(path.join(dir, DESIGN), 'utf8');
  assert.match(design, /Agent count\*\* row of the Tier Impact table/);
  assert.match(design, /Pipeline — \{M\} passos/);
  assert.doesNotMatch(design, /Suggest based on crew complexity/);
  assert.equal(await fs.readFile(path.join(dir, 'crews', 'minha-crew', 'crew.yaml'), 'utf8'), CREW);
});
