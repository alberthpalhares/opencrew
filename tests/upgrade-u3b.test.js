// AGENTS.md rule 14 for U3b (specs/fase-u3b-documento-word.md, U3b-upg): a 1.8.0 workspace,
// written literally, with a crew, a text and an edited `_opencrew/_memory/`, gets the Word
// document with one `update` — the delivered script is run from the workspace, not from templates/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { mkTmp, withCwd, snapshot } from './_helpers.js';

const ATA = '::: titulo ATA DA REUNIÃO\n\n# I. Abertura\nAos 3 dias de março de 2026, reuniram-se os associados.\n\n::: assinaturas\nAna Lima | Presidente\n:::\n';
const PERFIL = '_opencrew/_memory/documento-oficial.md';
// The user's own data, written by hand below: path → content.
const DADOS = {
  'crews/x/crew.yaml': 'name: "x"\ndescription: "Atas da associação"\n',
  'crews/x/pipeline/steps/01-ata.md': '---\nagent: redator\noutputFile: crews/x/output/ata.md\n---\n\nEscreva a ata.\n',
  'crews/x/_memory/memories.md': '# Crew Memory: x\n\n## Estilo de Escrita\n\n- Frases curtas\n',
  'Atas/ata.md': ATA,
  '_opencrew/_memory/company.md': '# Associação Exemplo de Moradores — dados reais\n',
  '_opencrew/_memory/preferences.md': '# Preferences\n\n- **Language:** Português (Brasil)\n- **Dashboard:** disabled\n',
};
// What 1.10.0 brings: none of it is in a 1.8.0 workspace.
const NOVOS = [
  ['scripts', 'documento.mjs'], ['scripts', 'documento'], ['scripts', 'entrega', 'documentos.mjs'],
  ['modelos'], ['prompts', 'documento.prompt.md'], ['best-practices', 'documento-oficial.md'],
];
const CHEGAM = NOVOS.filter((novo) => novo.join('/') !== 'scripts/entrega/documentos.mjs');

async function workspace180(t) {
  const dir = await mkTmp('upgrade-u3b');
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }));
  await withCwd(dir, () => init({ ide: ['claude-code'] }));
  const core = path.join(dir, '_opencrew', 'core');
  for (const novo of NOVOS) await fs.rm(path.join(core, ...novo), { recursive: true, force: true });
  const catalogo = path.join(core, 'best-practices', '_catalog.yaml');
  const antigo = (await fs.readFile(catalogo, 'utf8')).replace(/\r?\n {2}- id: documento-oficial\r?\n(?: {4}.*\r?\n)+/, '\n');
  assert.doesNotMatch(antigo, /documento-oficial/, 'could not write the 1.8.0 catalog');
  await fs.writeFile(catalogo, antigo);
  await fs.writeFile(path.join(core, 'system.md'), '# opencrew Instructions (1.8.0)\n');
  await fs.writeFile(path.join(dir, '_opencrew', '.opencrew-version'), '1.8.0\n');
  for (const [arquivo, conteudo] of Object.entries(DADOS)) {
    await fs.mkdir(path.dirname(path.join(dir, arquivo)), { recursive: true });
    await fs.writeFile(path.join(dir, arquivo), conteudo);
  }
  return { dir, core };
}

/** The script delivered to the WORKSPACE, not the one in templates/: proves the modules arrived together. */
async function rodarEntregue(core, dir, argv) {
  const entregue = pathToFileURL(path.join(core, 'scripts', 'documento.mjs')).href;
  const { main } = await import(`${entregue}?u3b-upg`);
  const linhas = [];
  const code = await main(argv, { cwd: dir, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas };
}

const memoria = async (dir) => (await snapshot(path.join(dir, '_opencrew', '_memory'))).filter((l) => !l.startsWith('documento-oficial.md:'));

test('U3b-upg: update from a 1.8.0 workspace delivers the generator, the model, the prompt and the guide; the catalog has the new format', async (t) => {
  const { dir, core } = await workspace180(t);
  const antes = { crews: await snapshot(path.join(dir, 'crews')), memoria: await snapshot(path.join(dir, '_opencrew', '_memory')) };

  await withCwd(dir, () => update());

  for (const novo of CHEGAM) assert.equal(await exists(path.join(core, ...novo)), true, `missing after update: ${novo.join('/')}`);
  assert.match(await fs.readFile(path.join(core, 'best-practices', '_catalog.yaml'), 'utf8'), /- id: documento-oficial/);
  assert.match(await fs.readFile(path.join(core, 'system.md'), 'utf8'), /^\| `\/opencrew documento <arquivo>` \|/m);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes.crews, 'a file of the crew changed');
  assert.deepEqual(await snapshot(path.join(dir, '_opencrew', '_memory')), antes.memoria, 'a file of _memory/ changed');
  assert.equal(await exists(path.join(dir, PERFIL)), false, 'the profile is created on demand, never by update');
});

test('U3b-upg: after update, the installed script turns the .md of the project into a .docx, and nothing of the crew nor of _memory/ changes', async (t) => {
  const { dir, core } = await workspace180(t);
  await withCwd(dir, () => update());
  const antes = { crews: await snapshot(path.join(dir, 'crews')), memoria: await snapshot(path.join(dir, '_opencrew', '_memory')) };

  const { code, linhas } = await rodarEntregue(core, dir, ['Atas/ata.md']);

  assert.equal(code, 0, linhas.join('\n'));
  assert.deepEqual([linhas[0], linhas.at(-1)], ['Documento gerado: Atas/ata.docx', 'DOCUMENTO:OK'], linhas.join('\n'));
  assert.ok(linhas.some((l) => l.startsWith('Perfil: nenhum')), linhas.join('\n'));
  const docx = await fs.readFile(path.join(dir, 'Atas', 'ata.docx'));
  assert.equal(docx.subarray(0, 4).toString('latin1'), 'PK\u0003\u0004', 'the .docx is a zip');
  assert.equal(await fs.readFile(path.join(dir, 'Atas', 'ata.md'), 'utf8'), ATA);
  assert.deepEqual(await snapshot(path.join(dir, 'crews')), antes.crews);
  assert.deepEqual(await snapshot(path.join(dir, '_opencrew', '_memory')), antes.memoria);
});

test('U3b-upg: after update, --criar-perfil creates the profile from the model, and the rest of _memory/ stays byte for byte', async (t) => {
  const { dir, core } = await workspace180(t);
  await withCwd(dir, () => update());
  const antes = await memoria(dir);

  const { code, linhas } = await rodarEntregue(core, dir, ['--criar-perfil']);

  assert.deepEqual([code, linhas.at(-1)], [0, 'PERFIL:CRIADO'], linhas.join('\n'));
  const modelo = await fs.readFile(path.join(core, 'modelos', 'documento-oficial.md'));
  assert.ok((await fs.readFile(path.join(dir, PERFIL))).equals(modelo), 'the profile is the model, byte for byte');
  assert.deepEqual(await memoria(dir), antes);
  const comPerfil = await rodarEntregue(core, dir, ['Atas/ata.md']);
  assert.deepEqual([comPerfil.code, comPerfil.linhas.at(-1)], [0, 'DOCUMENTO:OK'], comPerfil.linhas.join('\n'));
  assert.ok(comPerfil.linhas.includes(`Perfil: ${PERFIL}`), comPerfil.linhas.join('\n'));
});
