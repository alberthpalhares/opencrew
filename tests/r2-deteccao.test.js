// specs/fase-r2-update-e-envio-seguros.md — R2-01a..R2-01c (rules 1 and 2): an IDE is installed
// when a FILE proves it — a bridge path that is OpenCrew's alone, or the marker / the generated
// title inside an instruction file shared with the user. A user file that only cites the word
// "OpenCrew" proves nothing: it stays as it is and no bridge is born. The ids, labels, paths
// and old texts are written out here on purpose (spec §13), not imported from src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { detectInstalledIdes } from '../src/lib/deteccao.js';
import { exists } from '../src/lib/fsx.js';
import { IDES } from '../src/lib/ides.js';
import { workspace, cli, COMANDOS, ler, gravar, crlf, MARCAS } from './_r2-pontes.js';

const ROTULOS = {
  'claude-code': 'Claude Code', codex: 'Codex (OpenAI)', cursor: 'Cursor', copilot: 'VS Code + Copilot',
  opencode: 'OpenCode', antigravity: 'Antigravity (Gemini)', gemini: 'Gemini CLI', qwen: 'Qwen Code', trae: 'Trae',
};
const DO_USUARIO = ['CLAUDE.md', 'GEMINI.md', 'QWEN.md', '.github/copilot-instructions.md'];
const SO_CITA = '# Notas do projeto\n\nJá testei o OpenCrew em outro repositório; aqui uso só o Cursor.\n';
const SKILL_DIVIDIDA = '.agents/skills/opencrew/SKILL.md';
const PONTE_ANTIGA = '---\nname: opencrew\n---\n\nRead `AGENTS.md` (ponte antiga)\n';
// Body of every bridge with a title up to 1.2.2 (`git show v1.2.2:src/lib/ides.js`).
const CORPO_122 = 'Read `AGENTS.md` at the project root and adopt the opencrew system role.\n'
  + 'Follow all initialization, command routing, and workflow instructions defined there.\n\n'
  + 'If invoked with arguments (e.g. `/opencrew create ...`, `/opencrew run ...`),\n'
  + 'route to the matching action from the Command Routing table in AGENTS.md.\n'
  + 'If invoked without arguments, show the Main Menu.\n';
const ATE_122 = {
  copilot: ['.github/copilot-instructions.md', '# opencrew — Copilot Instructions'],
  gemini: ['GEMINI.md', '# opencrew — Gemini CLI'],
  qwen: ['QWEN.md', '# opencrew — Qwen Code'],
};

const detectadas = async (dir) => (await detectInstalledIdes(dir)).map((ide) => ide.id);

// Every bridge path of every IDE that exists in `dir`.
async function pontes(dir) {
  const achadas = [];
  for (const p of new Set(IDES.flatMap((ide) => ide.files.map((f) => f.path)))) {
    if (await exists(path.join(dir, p))) achadas.push(p);
  }
  return achadas.sort();
}

// The output names the IDE `id` and no other. The tests first make one bridge of that IDE
// outdated (PONTE_ANTIGA): with something to rewrite, the summary has to say whose it is.
function soCita(out, id) {
  assert.ok(out.includes(ROTULOS[id]), `${ROTULOS[id]} must be in the output:\n${out}`);
  for (const [outra, rotulo] of Object.entries(ROTULOS)) {
    if (outra !== id) assert.ok(!out.includes(rotulo), `${rotulo} must not be cited:\n${out}`);
  }
}

for (const arquivo of DO_USUARIO) {
  for (const [comando, argv] of Object.entries(COMANDOS)) {
    test(`R2-01a: a ${arquivo} of the user that only cites "OpenCrew" is left alone by ${comando} (Cursor only)`, async () => {
      const dir = await workspace(['cursor']);
      await gravar(dir, arquivo, SO_CITA);
      await gravar(dir, '.cursor/rules/opencrew.mdc', PONTE_ANTIGA);
      const antes = await pontes(dir);

      const { out, code } = await cli(dir, ...argv);

      assert.equal(code, 0);
      assert.equal(await ler(dir, arquivo), SO_CITA, 'the user file must not change');
      assert.deepEqual(await pontes(dir), antes, 'no bridge is born');
      assert.deepEqual(await detectadas(dir), ['cursor']);
      soCita(out, 'cursor');
    });
  }
}

for (const [id, [arquivo, titulo]] of Object.entries(ATE_122)) {
  test(`R2-01b: a ${arquivo} written up to 1.2.2 (generated title, no marker), under user text and in CRLF, is detected and updated`, async () => {
    const dir = await workspace(['cursor']);
    const meu = '# Regras da equipe\n\nUse TypeScript.\n';
    await gravar(dir, arquivo, crlf(`${meu}\n${titulo}\n\n${CORPO_122}`));

    assert.deepEqual(await detectadas(dir), ['cursor', id]);
    const { out, code } = await cli(dir, 'update');

    assert.equal(code, 0);
    assert.ok(!out.includes('Codex'), out);
    const depois = await ler(dir, arquivo);
    assert.ok(depois.startsWith(crlf(`${MARCAS[0]}\n${titulo}\n`)), `the bridge block must be at the top:\n${depois}`);
    assert.match(depois.slice(0, depois.indexOf(MARCAS[1])), /_opencrew\/core\/system\.md/);
    assert.ok(depois.includes(crlf(meu)), 'the user text stays');
  });
}

test('R2-01b: a BOM in front of the generated title does not hide the bridge written up to 1.2.2', async () => {
  const dir = await workspace(['cursor']);
  const [arquivo, titulo] = ATE_122.qwen;
  await gravar(dir, arquivo, `${String.fromCharCode(0xfeff)}${titulo}\n\n${CORPO_122}`);

  assert.deepEqual(await detectadas(dir), ['cursor', 'qwen']);
});

test('R2-01c: the matrix below covers every IDE of src/lib/ides.js, with the label the summaries print', () => {
  assert.deepEqual(IDES.map((ide) => [ide.id, ide.label]), Object.entries(ROTULOS));
});

for (const id of Object.keys(ROTULOS)) {
  test(`R2-01c: after init --ide=${id}, the detection returns only ${id}`, async () => {
    const dir = await workspace([id]);
    assert.deepEqual(await detectadas(dir), [id]);
  });
}

test('R2-01c: the start marker alone proves the IDE, even with the generated title changed inside the block', async () => {
  const dir = await workspace(['cursor']);
  await gravar(dir, 'GEMINI.md', `# Minhas notas\n\n${MARCAS[0]}\n# Regras do OpenCrew, do meu jeito\n${MARCAS[1]}\n`);

  assert.deepEqual(await detectadas(dir), ['cursor', 'gemini']);
});

for (const id of ['gemini', 'qwen', 'antigravity']) {
  for (const [comando, argv] of Object.entries(COMANDOS)) {
    test(`R2-01c: with only ${id} installed, ${comando} does not cite the Codex`, async () => {
      const dir = await workspace([id]);
      const doPacote = await ler(dir, SKILL_DIVIDIDA); // the file the Codex would be cited for
      await gravar(dir, SKILL_DIVIDIDA, PONTE_ANTIGA);

      const { out, code } = await cli(dir, ...argv);

      assert.equal(code, 0);
      assert.equal(await ler(dir, SKILL_DIVIDIDA), doPacote, 'the shared skill is rewritten all the same');
      soCita(out, id);
    });
  }
}

// §12: with both installed the summary cites Gemini CLI only — and no file is left behind.
test('R2-01c: Codex next to Gemini CLI — the detection returns Gemini CLI, and update still refreshes the skill they share', async () => {
  const dir = await workspace(['codex', 'gemini']);
  const doPacote = await ler(dir, SKILL_DIVIDIDA);
  await gravar(dir, SKILL_DIVIDIDA, PONTE_ANTIGA);

  assert.deepEqual(await detectadas(dir), ['gemini']);
  const { out } = await cli(dir, 'update');

  assert.equal(await ler(dir, SKILL_DIVIDIDA), doPacote);
  soCita(out, 'gemini');
});

test('R2-01c: only the Codex installed — it is detected by the file that is its only bridge', async () => {
  const dir = await workspace(['codex']);
  await gravar(dir, SKILL_DIVIDIDA, PONTE_ANTIGA);

  const { out } = await cli(dir, 'update');

  soCita(out, 'codex');
});
