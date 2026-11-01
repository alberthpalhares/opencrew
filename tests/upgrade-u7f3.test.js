// AGENTS.md rule 14 for phase U7-F3 (specs/fase-u7-f3-update-que-reconcilia.md, U7F3-upg): a 1.19.5
// workspace with an orphan, an unedited base agent with old text, an uninstalled skill and an old
// stamp gets reconciled with one `update`. The user's crews stay as they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { templatesDir } from '../src/lib/paths.js';
import { workspace, manifesto, entregueAntes, carimboAntigo, rodar, pastaDeCopia, lerOuNada, hashOf } from './_reconciliar.js';

const aqui = (dir, chave) => path.join(dir, ...chave.split('/'));
const CREW = 'name: "Minha crew"\ntier: standard\n';

test('U7F3-upg: one update removes the orphan (with a copy), renews the base agent, keeps the skill uninstalled and leaves the crew alone', async () => {
  const dir = await workspace('upgrade-u7f3');
  await entregueAntes(dir, '_opencrew/core/prompts/obsoleto.md', 'prompt que saiu do pacote\n');
  await entregueAntes(dir, '_opencrew/agents/reviewer.agent.md', 'revisor de uma versão anterior\n');
  await fs.rm(aqui(dir, 'skills/canva'), { recursive: true });
  await fs.mkdir(aqui(dir, 'crews/minha-crew'), { recursive: true });
  await fs.writeFile(aqui(dir, 'crews/minha-crew/crew.yaml'), CREW);
  await carimboAntigo(dir, '1.19.5');

  const { code } = await rodar(dir);

  assert.equal(code, 0);
  assert.equal(await lerOuNada(aqui(dir, '_opencrew/core/prompts/obsoleto.md')), null);
  const copia = await pastaDeCopia(dir);
  assert.equal(await lerOuNada(path.join(copia, '_opencrew', 'core', 'prompts', 'obsoleto.md')), 'prompt que saiu do pacote\n');
  const novo = await fs.readFile(path.join(templatesDir, '_opencrew', 'agents', 'reviewer.agent.md'), 'utf8');
  assert.equal(await lerOuNada(aqui(dir, '_opencrew/agents/reviewer.agent.md')), novo);
  await assert.rejects(() => fs.stat(aqui(dir, 'skills/canva')));
  assert.equal(await lerOuNada(aqui(dir, 'crews/minha-crew/crew.yaml')), CREW);
  const m = await manifesto(dir);
  assert.equal(m.files['_opencrew/agents/reviewer.agent.md'], hashOf(novo));
  assert.equal('_opencrew/core/prompts/obsoleto.md' in m.files, false);
  assert.ok(Object.keys(m.files).some((k) => k.startsWith('skills/canva/')), 'the uninstalled skill stays known');
});
