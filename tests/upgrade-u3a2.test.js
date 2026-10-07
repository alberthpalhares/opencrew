// AGENTS.md rule 14 for U3a, slice 2 (specs/fase-u3a2-entrega-no-projeto.md, U3a-upg-e-f2): a
// 1.8.0 workspace, written literally, with a run and its entrega/, gets the copy to a folder of
// the project with one `update` — the delivered script is run from the workspace, not from
// templates/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot } from './_helpers.js';

const RUN = '2026-10-01-090000';
const SAIDA = `crews/x/output/${RUN}`;
const CREW_YAML = 'name: "x"\ndescription: "Conteúdo da semana"\n';
const POST = '# Semana 14\n\n## LinkedIn — Post\n\nTrês lições da horta para o trabalho em equipe.\n';
// The user's own data, written by hand below: path → content.
const DADOS = {
  'crews/x/crew.yaml': CREW_YAML,
  'crews/x/pipeline/steps/01-linkedin.md': '---\nagent: redator\nformat: linkedin-post\noutputFile: crews/x/output/linkedin.md\n---\n\nEscreva.\n',
  'crews/x/_memory/memories.md': '# Crew Memory: x\n\n## Estilo de Escrita\n\n- Frases curtas\n',
  [`${SAIDA}/v1/linkedin.md`]: POST,
  // The delivery 1.8.0 left in the run.
  [`${SAIDA}/entrega/LEIA-ME.md`]: '# Entrega — x\n\n## LinkedIn\n\nSituação: Pronto\n',
  [`${SAIDA}/entrega/linkedin/post.txt`]: 'Três lições da horta para o trabalho em equipe.\n',
};
// What 1.9.0 brings: none of it is in a 1.8.0 workspace.
const NOVOS = [
  ...['comparar', 'copia', 'destino', 'guardar', 'lembrar', 'ressalvas', 'resumo'].map((m) => ['scripts', 'entrega', `${m}.mjs`]),
  ['scripts', 'verificar', 'entradas.mjs'], ['scripts', 'verificar', 'gravacao.mjs'],
];

async function workspace180(t) {
  const dir = await mkTmp('upgrade-u3a2');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo), { force: true });
  await fs.writeFile(path.join(core, 'scripts', 'entregar.mjs'), '// entregar.mjs (1.8.0)\nexport async function main() { return 1; }\n');
  await fs.writeFile(path.join(core, 'runner.pipeline.md'), '# Pipeline Runner (1.8.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.8.0\n');
  for (const [arquivo, conteudo] of Object.entries(DADOS)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

/** Every file of the crew outside `output/`, with its hash — but for the crew.yaml and its copy. */
async function restoDaCrew(dir) {
  const linhas = (await snapshot(path.join(dir, 'crews', 'x'))).map((l) => l.split(path.sep).join('/'));
  return linhas.filter((l) => !l.startsWith('output/') && !l.startsWith('crew.yaml'));
}

test('U3a-upg-e-f2: update from a 1.8.0 workspace delivers the modules of the copy, and the user data stays byte for byte', async (t) => {
  const { dir, core } = await workspace180(t);
  const antes = await snapshot(path.join(dir, 'crews'));

  await withCwd(dir, () => update());

  for (const novo of NOVOS) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.match(await fs.readFile(path.join(core, 'prompts', 'entrega.prompt.md'), 'utf8'), /--lembrar-destino/);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes);
});

test('U3a-upg-e-f2: after update, the installed script with --lembrar-destino Prontos copies the delivery to Prontos/<run_id>/ and records the destination, with the .bak', async (t) => {
  const { dir, core } = await workspace180(t);
  await withCwd(dir, () => update());
  const antes = await restoDaCrew(dir);

  // Imported from the WORKSPACE, not from templates/: proves every module arrived together.
  const entregue = pathToFileURL(path.join(core, 'scripts', 'entregar.mjs')).href;
  const { main } = await import(`${entregue}?u3a2-upg`);
  const linhas = [];
  const argv = ['--crew', 'crews/x', '--run', RUN, '--arquivo', `${SAIDA}/v1/linkedin.md=linkedin-post`, '--lembrar-destino', 'Prontos'];
  const code = await main(argv, { cwd: dir, escrever: (s) => linhas.push(...String(s).split('\n')) });

  assert.equal(code, 0, linhas.join('\n'));
  assert.equal(linhas.at(-1), 'ENTREGA:OK', linhas.join('\n'));
  const naCopia = (rel) => fs.readFile(path.join(dir, 'Prontos', RUN, rel), 'utf8');
  assert.equal(await naCopia('linkedin/post.txt'), 'Três lições da horta para o trabalho em equipe.\n');
  assert.match(await naCopia('LEIA-ME.md'), /^## LinkedIn$/m);
  assert.ok(linhas.includes(`Cópia: Prontos/${RUN}`), linhas.join('\n'));
  const crewYaml = await fs.readFile(path.join(dir, 'crews', 'x', 'crew.yaml'), 'utf8');
  assert.ok(crewYaml.startsWith(CREW_YAML), 'a line of the crew.yaml changed');
  assert.match(crewYaml, /^entrega:\n {2}destino: "Prontos"$/m);
  assert.equal(await fs.readFile(path.join(dir, 'crews', 'x', 'crew.yaml.bak'), 'utf8'), CREW_YAML);
  assert.deepEqual(await restoDaCrew(dir), antes, 'another file of the crew, outside output/, changed');
  assert.equal(await fs.readFile(path.join(dir, SAIDA, 'v1', 'linkedin.md'), 'utf8'), POST);
});
