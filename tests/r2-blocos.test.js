// specs/fase-r2-update-e-envio-seguros.md — R2-01h..R2-01l (rules 4 to 7): one function
// writes every marked block (bridges, AGENTS.md, .gitignore, .env.example) in init, update and
// repair, records it in the manifest, and copies the whole file before rewriting a block that
// differs from its record (or has none). The markers and the record format are written out here.
// R2-01l: the repair only runs with the package at the version of the workspace.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { run } from '../src/cli.js';
import { init } from '../src/commands/init.js';
import { update } from '../src/commands/update.js';
import { exists } from '../src/lib/fsx.js';
import { newDelivery, backupFile } from '../src/lib/manifest.js';
import { mkTmp, withCwd, snapshot, captureOutput } from './_helpers.js';

const MD = ['<!-- opencrew:start -->', '<!-- opencrew:end -->'];
const HASH = ['# opencrew:start', '# opencrew:end'];
const NOTAS = '\n# Minhas notas\nnão mexa aqui\n';
const SO_O_BLOCO = '(só o bloco do OpenCrew foi regravado; o resto do arquivo não mudou)';
const TITULO_STATUS = '## STATUS.md (gestão de sessão)';
// The block 1.4.2 → 1.6.2 wrote in .gitignore (`git show v1.6.2:templates/gitignore`).
const GITIGNORE_162 = `${HASH[0]}\nnode_modules/\n.env\n*.log\ncrews/*/output/\ncrews/*/state.json\n`
  + 'crews/*/_investigations/\n_opencrew/_memory/company.md\n_opencrew/_memory/preferences.md\n'
  + `_opencrew/_browser_profile/\n_opencrew/logs/\n.claude/settings.local.json\n${HASH[1]}\n`;

const crlf = (texto) => texto.replace(/\r?\n/g, '\r\n');
const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');
const ler = (dir, arquivo) => fs.readFile(path.join(dir, arquivo), 'utf8');
const gravar = (dir, arquivo, texto) => fs.writeFile(path.join(dir, arquivo), texto);

async function workspace(ides = ['claude-code']) {
  const dir = await mkTmp('blocos');
  await withCwd(dir, () => init({ ide: ides }));
  return dir;
}

async function rodar(dir, comando) {
  process.exitCode = 0;
  const out = await captureOutput(() => withCwd(dir, comando));
  const code = process.exitCode ?? 0;
  process.exitCode = 0;
  return { out, code };
}
const rodarUpdate = (dir) => rodar(dir, () => update());

// The block as the manifest records it: from the start marker to the end marker, with LF.
function bloco(texto, [inicio, fim]) {
  const lf = texto.replace(/\r\n/g, '\n');
  return lf.slice(lf.indexOf(inicio), lf.indexOf(fim) + fim.length);
}
const comLinhaDentro = (texto, [, fim], linha) => texto.replace(fim, `${linha}\n${fim}`);

// Every backup copy as `<date>/<path>`, sorted; `semData` drops the date folder.
async function copias(dir) {
  const raiz = path.join(dir, '.opencrew-backup');
  const achadas = [];
  async function walk(pasta) {
    for (const e of await fs.readdir(pasta, { withFileTypes: true })) {
      const p = path.join(pasta, e.name);
      if (e.isDirectory()) await walk(p);
      else achadas.push(path.relative(raiz, p).split(path.sep).join('/'));
    }
  }
  if (await exists(raiz)) await walk(raiz);
  return achadas.sort();
}
const semData = (lista) => lista.map((p) => p.slice(p.indexOf('/') + 1));
const lerCopia = (dir, copia) => ler(dir, path.join('.opencrew-backup', copia));

const MANIFESTO = path.join('_opencrew', 'manifest.json');
const registro = async (dir) => JSON.parse(await ler(dir, MANIFESTO)).files;
async function mudarRegistro(dir, mudar) {
  const dados = JSON.parse(await ler(dir, MANIFESTO));
  mudar(dados.files);
  await gravar(dir, MANIFESTO, JSON.stringify(dados, null, 2) + '\n');
}

test('R2-01h: a user line inside the block of CLAUDE.md (CRLF) and of AGENTS.md is copied before update rewrites the block', async () => {
  const dir = await workspace();
  const [claude, agents] = [await ler(dir, 'CLAUDE.md'), await ler(dir, 'AGENTS.md')];
  const editados = {
    'AGENTS.md': comLinhaDentro(agents, MD, 'Minha regra dentro do bloco.') + NOTAS,
    'CLAUDE.md': crlf(comLinhaDentro(claude, MD, 'Minha regra dentro do bloco.') + NOTAS),
  };
  for (const [arquivo, texto] of Object.entries(editados)) await gravar(dir, arquivo, texto);

  const { out, code } = await rodarUpdate(dir);

  assert.equal(code, 0);
  const feitas = await copias(dir);
  assert.deepEqual(semData(feitas), ['AGENTS.md', 'CLAUDE.md'], 'one copy of each file, and of nothing else');
  for (const copia of feitas) assert.equal(await lerCopia(dir, copia), editados[semData([copia])[0]], `${copia}: the file as it was`);
  assert.equal(await ler(dir, 'CLAUDE.md'), crlf(claude + NOTAS), 'new block, the rest intact, everything still in CRLF');
  assert.equal(await ler(dir, 'AGENTS.md'), agents + NOTAS);
  for (const arquivo of Object.keys(editados)) assert.ok(out.includes(`${arquivo} ${SO_O_BLOCO}`), out);

  const segundo = await rodarUpdate(dir);
  assert.deepEqual(await copias(dir), feitas, 'the second update copies nothing');
  assert.ok(!segundo.out.includes(SO_O_BLOCO), segundo.out);
});

// Two steps of one run may change the same file (block, then old text): the copy is the first.
test('R2-01h: within one run, a file is copied once — the copy holds the file as it was before the first change', async () => {
  const dir = await mkTmp('blocos');
  const ctx = newDelivery(dir, null);
  await gravar(dir, 'CLAUDE.md', 'como estava\n');
  assert.equal(await backupFile(ctx, 'CLAUDE.md'), true);
  await gravar(dir, 'CLAUDE.md', 'já alterado nesta execução\n');
  assert.equal(await backupFile(ctx, 'CLAUDE.md'), false);
  assert.deepEqual(ctx.copied, ['CLAUDE.md']);
  assert.equal(await lerCopia(dir, (await copias(dir))[0]), 'como estava\n');
});

test('R2-01i: with a 1.6.2 manifest (no block record), only the block that differs from the new one is copied and rewritten', async () => {
  const dir = await workspace();
  await mudarRegistro(dir, (files) => {
    for (const chave of Object.keys(files)) if (chave.endsWith('#opencrew')) delete files[chave];
  });
  const claude = crlf(await ler(dir, 'CLAUDE.md')); // differs from the new block in CRLF only
  const agents = await ler(dir, 'AGENTS.md'); // equal to the new block
  const gitignore = `dist/\n\n${GITIGNORE_162}`;
  await gravar(dir, 'CLAUDE.md', claude);
  await gravar(dir, '.gitignore', gitignore);

  await rodarUpdate(dir);

  assert.equal(await ler(dir, 'CLAUDE.md'), claude, 'CRLF is not a difference: not rewritten');
  assert.equal(await ler(dir, 'AGENTS.md'), agents);
  const feitas = await copias(dir);
  assert.deepEqual(semData(feitas), ['.gitignore'], 'no record: only the file whose block differs is copied');
  assert.equal(await lerCopia(dir, feitas[0]), gitignore);
  const depois = await ler(dir, '.gitignore');
  assert.ok(depois.startsWith('dist/\n\n'), 'user lines outside the block stay');
  assert.ok(bloco(depois, HASH).split('\n').includes('.opencrew-backup/'), 'the block is the new one');
  const reg = await registro(dir);
  assert.equal(reg['CLAUDE.md#opencrew'], sha256(bloco(claude, MD)), 'the update records the block it kept');
  assert.equal(reg['.gitignore#opencrew'], sha256(bloco(depois, HASH)));
});

test('R2-01i: a block equal to its record and different from the new one (previous version) is rewritten with no copy', async () => {
  const dir = await workspace();
  const claude = await ler(dir, 'CLAUDE.md');
  const anterior = `${MD[0]}\n# opencrew — texto de uma versão anterior\n${MD[1]}`;
  await gravar(dir, 'CLAUDE.md', crlf(`${anterior}\n${NOTAS}`));
  await mudarRegistro(dir, (files) => { files['CLAUDE.md#opencrew'] = sha256(anterior); });

  const { out } = await rodarUpdate(dir);

  assert.equal(await ler(dir, 'CLAUDE.md'), crlf(claude + NOTAS), 'new block, in the line ending of the file');
  assert.deepEqual(await copias(dir), [], 'delivered by OpenCrew and not edited: no copy');
  assert.ok(!out.includes(SO_O_BLOCO), out);
  assert.equal((await registro(dir))['CLAUDE.md#opencrew'], sha256(bloco(claude, MD)), 'the record follows the new block');
});

test('R2-01i: a file with no block gets it at the top (at the end in .gitignore), in its own line ending and with no copy', async () => {
  const dir = await workspace();
  const meuAgents = '# Regras do meu projeto\r\n\r\nSempre em TypeScript.\r\n';
  const meuGitignore = 'dist/\r\n*.tmp\r\n';
  const novos = { agents: bloco(await ler(dir, 'AGENTS.md'), MD), gitignore: bloco(await ler(dir, '.gitignore'), HASH) };
  await gravar(dir, 'AGENTS.md', meuAgents);
  await gravar(dir, '.gitignore', meuGitignore);

  await rodarUpdate(dir);

  assert.equal(await ler(dir, 'AGENTS.md'), crlf(`${novos.agents}\n\n`) + meuAgents);
  assert.equal(await ler(dir, '.gitignore'), meuGitignore + crlf(`\n${novos.gitignore}\n`));
  assert.deepEqual(await copias(dir), [], 'nothing of the user was replaced: no copy');
});

test('R2-01i: update gives the .gitignore block to a project that has no .gitignore', async () => {
  const dir = await workspace();
  const instalado = await ler(dir, '.gitignore');
  await fs.rm(path.join(dir, '.gitignore'));

  await rodarUpdate(dir);

  assert.equal(await ler(dir, '.gitignore'), instalado);
  assert.deepEqual(await copias(dir), []);
});

test('R2-01j: init in a new folder records every block in the manifest, and the .gitignore block ignores .opencrew-backup/', async () => {
  const dir = await workspace();
  const reg = await registro(dir);
  for (const [arquivo, marcas] of [['AGENTS.md', MD], ['CLAUDE.md', MD], ['.gitignore', HASH], ['.env.example', HASH]]) {
    assert.equal(reg[`${arquivo}#opencrew`], sha256(bloco(await ler(dir, arquivo), marcas)), `${arquivo}: block record`);
  }
  assert.ok(bloco(await ler(dir, '.gitignore'), HASH).split('\n').includes('.opencrew-backup/'));
});

test('R2-01j: with _opencrew/ deleted and a user line inside the .gitignore block, init copies the file before rewriting the block', async () => {
  const dir = await workspace();
  const instalado = await ler(dir, '.gitignore');
  const editado = `dist/\n\n${comLinhaDentro(instalado, HASH, 'minha-pasta/')}`;
  await gravar(dir, '.gitignore', editado);
  await fs.rm(path.join(dir, '_opencrew'), { recursive: true });

  const { out, code } = await rodar(dir, () => init({ ide: ['claude-code'] }));

  assert.equal(code, 0);
  const feitas = await copias(dir);
  assert.deepEqual(semData(feitas), ['.gitignore']);
  assert.equal(await lerCopia(dir, feitas[0]), editado, 'the copy holds the file as it was');
  assert.equal(await ler(dir, '.gitignore'), `dist/\n\n${instalado}`, 'new block, user lines outside it intact');
  assert.ok(out.includes(`.opencrew-backup/${feitas[0]}`), `init must say where the copy is:\n${out}`);
});

test('R2-01k: a user CLAUDE.md with the STATUS.md title outside any block is left alone by two updates (Cursor only)', async () => {
  const dir = await workspace(['cursor']);
  const meu = `# Meu projeto\n\n${TITULO_STATUS}\n\nComo eu organizo as minhas sessões.\n`;
  await gravar(dir, 'CLAUDE.md', meu);

  for (const vez of [1, 2]) {
    const { out, code } = await rodarUpdate(dir);
    assert.equal(code, 0);
    assert.equal(await ler(dir, 'CLAUDE.md'), meu, `update ${vez}: the file must not change`);
    assert.equal(await exists(path.join(dir, '.claude')), false, 'no Claude Code bridge is born');
    assert.doesNotMatch(out, /removi|removed/);
  }
  assert.deepEqual(await copias(dir), []);
});

test('R2-01k: with Claude Code installed, the same title outside the block changes nothing and prints no "removi"', async () => {
  const dir = await workspace();
  const meu = `${await ler(dir, 'CLAUDE.md')}\n${TITULO_STATUS}\n\nMinha seção, fora do bloco.\n`;
  await gravar(dir, 'CLAUDE.md', meu);

  for (const vez of [1, 2]) {
    const { out } = await rodarUpdate(dir);
    assert.equal(await ler(dir, 'CLAUDE.md'), meu, `update ${vez}: the file must not change`);
    assert.doesNotMatch(out, /removi|removed/);
  }
  assert.deepEqual(await copias(dir), []);
});

test('R2-01k: inside the block, the section of 1.4.0/1.4.1 leaves with the sentence of the spec, said once', async () => {
  const dir = await workspace();
  const vazado = `${MD[0]}\n# opencrew — Project Instructions\n\n${TITULO_STATUS}\n\nThis project uses \`STATUS.md\`.\n${MD[1]}\n${NOTAS}`;
  await gravar(dir, 'CLAUDE.md', vazado);
  const frase = 'CLAUDE.md: removi a seção de STATUS.md que as versões 1.4.0 e 1.4.1 gravaram por engano.';

  const primeiro = await rodarUpdate(dir);

  assert.ok(primeiro.out.includes(frase), primeiro.out);
  const depois = await ler(dir, 'CLAUDE.md');
  assert.doesNotMatch(depois, /STATUS\.md/);
  assert.ok(depois.endsWith(NOTAS), 'user text outside the block survives');
  const feitas = await copias(dir);
  assert.deepEqual(semData(feitas), ['CLAUDE.md']);
  assert.equal(await lerCopia(dir, feitas[0]), vazado);

  const segundo = await rodarUpdate(dir);
  assert.doesNotMatch(segundo.out, /removi|removed/);
});

// Rule 6: the repair only rewrites with the package at the version stamped in the workspace.
const CARIMBO = path.join('_opencrew', '.opencrew-version');
const BLOCO_DE_OUTRA_VERSAO = `${MD[0]}\nbloco de outra versão\n${MD[1]}\n`; // the repair would rewrite it
const RODE_O_UPDATE = 'Nada foi alterado. Rode `npx @aksp/opencrew@latest update`: ele já atualiza as pontes. Para a ponte de uma IDE nova, repita este comando depois.';
const OUTRA_VERSAO = {
  '9.0.0': (pacote) => `Você tem a v9.0.0 instalada e este pacote é a v${pacote} (mais antigo). ${RODE_O_UPDATE}`,
  '1.0.0': (pacote) => `Este projeto está na v1.0.0 e este pacote é a v${pacote} (mais novo). O reparo não atualiza o projeto. ${RODE_O_UPDATE}`,
};
const reparar = (dir, ...opcoes) => rodar(dir, () => run(['init', '--repair-bridges', ...opcoes]));

for (const [carimbo, mensagem] of Object.entries(OUTRA_VERSAO)) {
  for (const opcoes of [[], ['--yes'], ['--all'], ['--ide=cursor']]) {
    test(`R2-01l: with the stamp at ${carimbo}, repair stops with exit 1 and writes nothing (options: ${opcoes.join(' ') || 'none'})`, async () => {
      const dir = await workspace();
      const pacote = (await ler(dir, CARIMBO)).trim();
      await gravar(dir, CARIMBO, `${carimbo}\n`);
      await gravar(dir, 'CLAUDE.md', BLOCO_DE_OUTRA_VERSAO);
      const antes = await snapshot(dir);

      const { out, code } = await reparar(dir, ...opcoes);

      assert.equal(code, 1);
      assert.deepEqual(await snapshot(dir), antes, 'the folder must stay identical');
      assert.ok(out.includes(mensagem(pacote)), out);
      assert.doesNotMatch(out, /Run npx/);
    });
  }
}

test('R2-01l: a workspace with no stamp is still repaired', async () => {
  const dir = await workspace();
  await fs.rm(path.join(dir, CARIMBO));
  await gravar(dir, 'CLAUDE.md', BLOCO_DE_OUTRA_VERSAO);

  const { code } = await reparar(dir);

  assert.equal(code, 0);
  assert.match(await ler(dir, 'CLAUDE.md'), /opencrew — Project Instructions/);
});
