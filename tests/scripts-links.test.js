// specs/fase-r2-update-e-envio-seguros.md — R2-05a to R2-05d (rules 23 and 24): a path is inside
// the project by its text OR by its real place (junction, link, Windows short name); what the user
// linked inside the project is still read; --corrigir never writes outside the real crew folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { conferir, main } from '../templates/_opencrew/core/scripts/conferir-fontes.mjs';
import { mkTmp, snapshot, projetoFalso, rodarMain, CREW, SAIDA } from './_helpers.js';

const POST = `${SAIDA}/post.md`;
const CITA_VELHO = 'Leia `Docs/Velho/regimento.md`.\n';
const NAO_CORRIGI = (arquivo) => `Não corrigi \`${arquivo}\`: é um link que aponta para fora da crew. O caminho citado nele continua como estava.`;
const CREW_LIGADA = (crew) => `Não corrigi nada: a pasta \`${crew}\` é um link que aponta para fora do projeto.`;

const juncao = (alvo, caminho) => fs.symlink(alvo, caminho, 'junction');
const ler = (raiz, rel) => fs.readFile(path.join(raiz, rel), 'utf8');
const existe = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);
const ultima = (linhas) => linhas.filter((l) => l.trim()).at(-1);

async function escrever(raiz, rel, conteudo = 'x') {
  const abs = path.join(raiz, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, conteudo);
}

/**
 * `base/projeto` (it has `_opencrew/` and the moved file `Docs/Novo/regimento.md`) next to
 * `base/fora`, a folder outside the project. `arquivos` maps a path relative to `base` to its content.
 */
async function projetoComVizinho(arquivos = {}) {
  const base = await mkTmp('links');
  const raiz = path.join(base, 'projeto');
  await escrever(raiz, '_opencrew/_memory/company.md');
  await escrever(raiz, 'Docs/Novo/regimento.md');
  for (const [rel, conteudo] of Object.entries(arquivos)) await escrever(base, rel, conteudo);
  return { base, raiz, fora: path.join(base, 'fora') };
}

/** Runs the source check command line inside `raiz`: exit code and printed lines. */
async function conferirPeloCli(raiz, args) {
  const linhas = [];
  const code = await main(args, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas };
}

/** The 8.3 short name of a folder; null where there is none (not Windows, or short names are off). */
function nomeCurto(pasta) {
  if (process.platform !== 'win32') return null;
  const comando = `"for %I in ("${pasta}") do @echo %~sI"`;
  const r = spawnSync('cmd', ['/d', '/s', '/c', comando], { encoding: 'utf8', windowsVerbatimArguments: true });
  const curto = (r.stdout ?? '').trim();
  return curto && curto.toLowerCase() !== pasta.toLowerCase() ? curto : null;
}

/** The same output file, checked from each name of the root with the absolute path by the other. */
async function verificarPelosDoisNomes(raiz, outroNome) {
  for (const [cwd, arquivo] of [[raiz, path.join(outroNome, POST)], [outroNome, path.join(raiz, POST)]]) {
    const { code, linhas } = await rodarMain(cwd, ['--crew', CREW, '--arquivo', arquivo]);
    assert.equal(code, 0, linhas.join(' | '));
    assert.ok(linhas.includes(`### ${POST}`), linhas.join(' | '));
    assert.equal(linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
  }
}

test('R2-05a: an absolute --arquivo written through a junction to the root, and the reverse, is checked under its relative name', async () => {
  const raiz = await projetoFalso({ saidas: { 'post.md': 'Ligue para [Telefone].\n' } });
  const elo = `${raiz}-elo`;
  await juncao(raiz, elo);
  await verificarPelosDoisNomes(raiz, elo);
  // The crew by the other name too: its memory is read from the same place.
  const pelaCrew = await rodarMain(raiz, ['--crew', path.join(elo, CREW), '--arquivo', POST]);
  assert.deepEqual([pelaCrew.code, pelaCrew.linhas.at(-1)], [0, 'VERIFICACAO:BLOQUEADA']);
  await fs.unlink(elo); // only the link goes away, not the project behind it
});

test('R2-05a: on Windows, the same with the 8.3 short name of the project folder', async (t) => {
  const raiz = await projetoFalso({ saidas: { 'post.md': 'Ligue para [Telefone].\n' } });
  const curto = nomeCurto(raiz);
  if (!curto) return t.skip('no 8.3 short name here (not Windows, or short names are off on this volume)');
  await verificarPelosDoisNomes(raiz, curto);
});

test('R2-05a: ../fora.md is still refused, also from a terminal opened in the junction', async () => {
  const raiz = await projetoFalso({ saidas: { 'post.md': 'Um texto simples.\n' } });
  const elo = `${raiz}-elo`;
  await juncao(raiz, elo);
  for (const cwd of [raiz, elo]) {
    const { code, linhas } = await rodarMain(cwd, ['--crew', CREW, '--arquivo', `${POST},../fora.md`]);
    assert.deepEqual([code, linhas], [1, ['Caminho fora do projeto: ../fora.md']]);
  }
  await fs.unlink(elo);
});

test('R2-05b: a file reached through a junction the user made inside the crew output is still checked', async () => {
  const raiz = await projetoFalso();
  const fora = await mkTmp('links-fora');
  await fs.writeFile(path.join(fora, 'segredo.md'), 'Ligue para [Telefone].\n');
  await juncao(fora, path.join(raiz, SAIDA, 'elo'));
  for (const arquivo of [`${SAIDA}/elo/segredo.md`, path.join(raiz, SAIDA, 'elo', 'segredo.md')]) {
    const { code, linhas } = await rodarMain(raiz, ['--crew', CREW, '--arquivo', arquivo]);
    assert.equal(code, 0, linhas.join(' | '));
    assert.ok(linhas.includes(`### ${SAIDA}/elo/segredo.md`), 'named by the path the user wrote, not by where the link leads');
    assert.ok(linhas.some((l) => l.includes('❌ Bloqueio — Placeholder')), linhas.join(' | '));
    assert.equal(linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
  }
});

test('R2-05b: a file of the project cited through the junction of the root gets the relative path suggested, and --corrigir writes it', async () => {
  const { base, raiz } = await projetoComVizinho({ 'projeto/crews/c/crew.yaml': 'name: "c"\n' });
  const elo = path.join(base, 'projeto-elo');
  await juncao(raiz, elo);
  const citado = `${elo.split(path.sep).join('/')}/Docs/Novo/regimento.md`;
  const passo = 'crews/c/pipeline/steps/step-01.md';
  await escrever(raiz, passo, `- \`${citado}\`\n`);

  const r = await conferir({ raiz, crew: 'crews/c' });
  const item = r.refs.find((x) => x.ref === citado);
  assert.equal(item.estado, 'nao-portatil');
  assert.equal(item.sugestao, 'Docs/Novo/regimento.md', 'relative to the real root, never ../projeto-elo/…');

  const { linhas } = await conferirPeloCli(raiz, ['--crew', 'crews/c', '--corrigir']);
  assert.equal(await ler(raiz, passo), '- `Docs/Novo/regimento.md`\n');
  assert.equal(await ler(raiz, `${passo}.bak`), `- \`${citado}\`\n`);
  assert.equal(ultima(linhas), 'FONTES:OK');
});

test('R2-05b: with the crew given through the junction of the root, the report cites the files by their relative names', async () => {
  const { base, raiz } = await projetoComVizinho({
    'projeto/crews/c/crew.yaml': 'name: "c"\n',
    'projeto/crews/c/pipeline/steps/step-01.md': '- `Docs/sumiu.md`\n',
  });
  const elo = path.join(base, 'projeto-elo');
  await juncao(raiz, elo);
  const { code, linhas } = await conferirPeloCli(raiz, ['--crew', path.join(elo, 'crews', 'c')]);
  assert.equal(code, 0, linhas.join(' | '));
  assert.ok(linhas.some((l) => l.includes('(citado em crews/c/pipeline/steps/step-01.md)')), linhas.join(' | '));
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R2-05c: --corrigir on a crew that is a junction to outside the project leaves the outside folder identical', async () => {
  const { raiz, fora } = await projetoComVizinho({
    'fora/crew/crew.yaml': 'name: "c"\n',
    'fora/crew/pipeline/steps/step-01.md': CITA_VELHO,
  });
  await fs.mkdir(path.join(raiz, 'crews'));
  await juncao(path.join(fora, 'crew'), path.join(raiz, 'crews', 'elo-crew'));
  const antes = await snapshot(fora);

  const { code, linhas } = await conferirPeloCli(raiz, ['--crew', 'crews/elo-crew', '--corrigir']);
  assert.equal(code, 0);
  assert.deepEqual(await snapshot(fora), antes, 'no file changed and no .bak was born outside the project');
  assert.ok(linhas.some((l) => l.includes('Novo caminho sugerido: `Docs/Novo/regimento.md`')), 'the crew is still read through the link');
  assert.ok(linhas.includes(CREW_LIGADA('crews/elo-crew')), linhas.join(' | '));
  assert.ok(!linhas.some((l) => /corrigido|Nada a corrigir/.test(l)), 'it does not claim a fix, nor that there was nothing to fix');
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R2-05d: --corrigir skips what a link takes outside the crew, fixes the plain agent with a .bak and counts only what it wrote', async () => {
  const { raiz, fora } = await projetoComVizinho({
    'projeto/crews/c/crew.yaml': 'name: "c"\n',
    'projeto/crews/c/agents/comum.agent.md': CITA_VELHO,
    'projeto/Docs/Novo/tabela.csv': 'x',
    'fora/steps/step-01.md': '- `Docs/Velho/regimento.md`\n- `Docs/Velho/tabela.csv`\n',
    'fora/ligado.agent.md': CITA_VELHO,
  });
  await fs.mkdir(path.join(raiz, 'crews/c/pipeline'));
  await juncao(path.join(fora, 'steps'), path.join(raiz, 'crews/c/pipeline/steps'));
  // A file link needs a privilege on Windows: the case is covered only where the system allows it.
  const comLinkDeArquivo = await fs.symlink(path.join(fora, 'ligado.agent.md'), path.join(raiz, 'crews/c/agents/ligado.agent.md'), 'file')
    .then(() => true, (erro) => { if (erro.code !== 'EPERM') throw erro; return false; });
  const antes = await snapshot(fora);

  const { linhas } = await conferirPeloCli(raiz, ['--crew', 'crews/c', '--corrigir']);
  assert.deepEqual(await snapshot(fora), antes, 'nothing written outside the crew, through any link');
  assert.equal(await ler(raiz, 'crews/c/agents/comum.agent.md'), 'Leia `Docs/Novo/regimento.md`.\n');
  assert.equal(await ler(raiz, 'crews/c/agents/comum.agent.md.bak'), CITA_VELHO);
  assert.equal(await existe(raiz, 'crews/c/agents/ligado.agent.md.bak'), false, 'no .bak for a file that was not written');

  const pulados = ['crews/c/pipeline/steps/step-01.md', ...(comLinkDeArquivo ? ['crews/c/agents/ligado.agent.md'] : [])];
  assert.deepEqual(linhas.filter((l) => l.startsWith('Não corrigi')).sort(), pulados.map(NAO_CORRIGI).sort(), 'one line for each skipped file');
  // Two paths had a suggestion; only one was written somewhere.
  // Since U5-1 each changed file is named, with its copy (specs/fase-u5a-polimento-do-uso.md, rule 5).
  assert.deepEqual(linhas.filter((l) => l.startsWith('Corrigi: ')), ['Corrigi: crews/c/agents/comum.agent.md (cópia: comum.agent.md.bak)']);
  assert.ok(!linhas.includes('Nada a corrigir.'));
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R2-05d: the .bak is not written outside either — a file of the crew reached through a folder linked to outside is skipped', async (t) => {
  const { raiz, fora } = await projetoComVizinho({
    'projeto/crews/c/crew.yaml': 'name: "c"\n',
    'projeto/crews/c/reais/step-01.md': CITA_VELHO,
  });
  await fs.mkdir(path.join(fora, 'steps'), { recursive: true });
  const criou = await fs.symlink(path.join(raiz, 'crews/c/reais/step-01.md'), path.join(fora, 'steps/step-01.md'), 'file')
    .then(() => true, (erro) => { if (erro.code !== 'EPERM') throw erro; return false; });
  if (!criou) return t.skip('this system does not let the test create a file link');
  await fs.mkdir(path.join(raiz, 'crews/c/pipeline'));
  await juncao(path.join(fora, 'steps'), path.join(raiz, 'crews/c/pipeline/steps'));

  const { linhas } = await conferirPeloCli(raiz, ['--crew', 'crews/c', '--corrigir']);
  assert.deepEqual(await fs.readdir(path.join(fora, 'steps')), ['step-01.md'], 'no .bak was born outside the crew');
  assert.equal(await ler(raiz, 'crews/c/reais/step-01.md'), CITA_VELHO);
  assert.ok(linhas.includes(NAO_CORRIGI('crews/c/pipeline/steps/step-01.md')), linhas.join(' | '));
  assert.equal(ultima(linhas), 'FONTES:PENDENTE');
});

test('R2-05d: a link inside the crew that leads to another file of the same crew is still fixed', async () => {
  const { raiz } = await projetoComVizinho({
    'projeto/crews/c/crew.yaml': 'name: "c"\n',
    'projeto/crews/c/compartilhado/passos/step-01.md': CITA_VELHO,
  });
  await fs.mkdir(path.join(raiz, 'crews/c/pipeline'));
  await juncao(path.join(raiz, 'crews/c/compartilhado/passos'), path.join(raiz, 'crews/c/pipeline/steps'));
  const { linhas } = await conferirPeloCli(raiz, ['--crew', 'crews/c', '--corrigir']);
  assert.equal(await ler(raiz, 'crews/c/compartilhado/passos/step-01.md'), 'Leia `Docs/Novo/regimento.md`.\n');
  assert.ok(!linhas.some((l) => l.startsWith('Não corrigi')), linhas.join(' | '));
  assert.equal(ultima(linhas), 'FONTES:OK');
});
