// AGENTS.md rule 14 for U3a, slice 1 (specs/fase-u3a1-pasta-de-entrega.md, U3a-upg-a): a 1.6.0
// workspace, written literally, gets the delivery with one `update`, and the delivered script
// (run from the workspace, not from templates/) delivers a run of an old crew.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot } from './_helpers.js';

const RUN = '2026-09-20-101500';
const SAIDA = `crews/x/output/${RUN}`;
const passo = (formato, arquivo) => `---\nagent: redator\nformat: ${formato}\noutputFile: crews/x/output/${arquivo}\n---\n\nEscreva.\n`;
const LEGENDA = '=== CAPTION ===\nA horta da semana ficou pronta.\n\n=== HASHTAGS ===\n#horta #casa\n';
const POST = '# Semana 12\n\n## LinkedIn — Post\n\nTrês lições da horta para o trabalho em equipe.\n';
// The user's own data, written by hand below: path → content.
const DADOS = {
  'crews/x/crew.yaml': 'name: "x"\n',
  'crews/x/pipeline/steps/01-pesquisar.md': '---\nagent: pesquisador\noutputFile: crews/x/output/pesquisa.md\n---\n',
  'crews/x/pipeline/steps/02-legenda.md': passo('instagram-feed', 'legenda.md'),
  'crews/x/pipeline/steps/03-linkedin.md': passo('linkedin-post', 'linkedin.md'),
  'crews/x/_memory/memories.md': '# Crew Memory: x\n\n## Estilo de Escrita\n\n- Frases curtas\n',
  // A run of 1.6.0: one version folder per step, v1 to v3.
  [`${SAIDA}/v1/pesquisa.md`]: '## Fontes\n\n- achado\n',
  [`${SAIDA}/v2/legenda.md`]: LEGENDA,
  [`${SAIDA}/v3/linkedin.md`]: POST,
  '_opencrew/_memory/company.md': '# Acme — dados reais',
};
const NOVOS = [['scripts', 'entregar.mjs'], ['scripts', 'entrega'], ['prompts', 'entrega.prompt.md']];

/** A 1.6.0 workspace: no delivery script, no delivery prompt, the old runner, one crew with a run. */
async function workspace160(t) {
  const dir = await mkTmp('upgrade-u3a');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo), { recursive: true, force: true });
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# Pipeline Runner (1.6.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.6.0\n');
  for (const [arquivo, conteudo] of Object.entries(DADOS)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

/** Every file of the crew outside `output/`, with its hash. */
const foraDaSaida = async (dir) => (await snapshot(path.join(dir, 'crews', 'x'))).filter((l) => !l.split(path.sep).join('/').startsWith('output/'));

test('U3a-upg-a: update from a 1.6.0 workspace delivers entregar.mjs, its modules and the prompt; the user data stays byte for byte', async (t) => {
  const { dir, core } = await workspace160(t);
  const antes = await snapshot(path.join(dir, 'crews'));

  await withCwd(dir, () => update());

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  const runner = await fs.readFile(path.join(core, 'runner.pipeline.md'), 'utf8');
  assert.match(runner, /^### Entrega\s*$/m);
  assert.match(runner, /scripts\/entregar\.mjs --crew "crews\/\{name\}"/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes);
  for (const [arquivo, conteudo] of Object.entries(DADOS)) assert.equal(await fs.readFile(path.join(dir, arquivo), 'utf8'), conteudo, arquivo);
});

test('U3a-upg-a: after update, the installed script delivers the old run — instagram/legenda.txt and linkedin/post.txt — and changes nothing of the crew outside output/', async (t) => {
  const { dir, core } = await workspace160(t);
  await withCwd(dir, () => update());
  const antes = await foraDaSaida(dir);

  // Imported from the WORKSPACE, not from templates/: proves every module arrived together.
  const entregue = pathToFileURL(path.join(core, 'scripts', 'entregar.mjs')).href;
  const { main } = await import(`${entregue}?u3a-upg`);
  const linhas = [];
  const lista = `${SAIDA}/v2/legenda.md=instagram-feed,${SAIDA}/v3/linkedin.md=linkedin-post`;
  const code = await main(['--crew', 'crews/x', '--run', RUN, '--arquivo', lista], { cwd: dir, escrever: (s) => linhas.push(...String(s).split('\n')) });

  assert.equal(code, 0, linhas.join('\n'));
  assert.equal(linhas.at(-1), 'ENTREGA:OK', linhas.join('\n'));
  const naEntrega = (rel) => fs.readFile(path.join(dir, SAIDA, 'entrega', rel), 'utf8');
  assert.equal(await naEntrega('instagram/legenda.txt'), 'A horta da semana ficou pronta.\n\n#horta #casa\n');
  assert.equal(await naEntrega('linkedin/post.txt'), 'Três lições da horta para o trabalho em equipe.\n');
  assert.match(await naEntrega('LEIA-ME.md'), /^## Instagram$[\s\S]*^## LinkedIn$/m);
  assert.deepEqual(await foraDaSaida(dir), antes, 'the delivery only writes inside output/');
  for (const origem of ['v1/pesquisa.md', 'v2/legenda.md', 'v3/linkedin.md']) {
    assert.equal(await fs.readFile(path.join(dir, SAIDA, origem), 'utf8'), DADOS[`${SAIDA}/${origem}`], `the source changed: ${origem}`);
  }
});
