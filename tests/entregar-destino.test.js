// specs/fase-u3a2-entrega-no-projeto.md — the destination of the copy (rules 13, 15 and 16):
// U3a-05c, 05d, 05h, 05i, 05j and 05k. The copy itself is in tests/entregar-copia.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main } from '../templates/_opencrew/core/scripts/entregar.mjs';
import { mkTmp } from './_helpers.js';
import { BLOG, COPIA, CREW, DEST, EXEC, LEGENDA, RUN, arvore, entregar, entregarEm, existe, fotos, lerDe, lista, nomes, projeto, rodar } from './_entrega.js';

const ARQUIVOS = { 'v1/legenda.md': LEGENDA, 'v1/post.md': BLOG };
const ITENS = ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post'];
const YAML = `${CREW}/crew.yaml`;
const RECUSADO = (valor) => `Não copiei: o destino precisa ser uma pasta dentro do projeto, fora de \`_opencrew/\`, \`crews/\`, \`skills/\`, \`.git/\` e \`node_modules/\`. Recebi: ${valor}.`;
const SEM_DESTINO = 'Cópia: nenhuma pasta escolhida para esta crew.';
const ha = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);
const comYaml = async (t, yaml) => {
  const raiz = await projeto(t, ARQUIVOS);
  await fs.writeFile(path.join(raiz, YAML), yaml);
  return raiz;
};

test('U3a-05c: a destination that does not exist is created, the copy is in <destino>/<run_id>/ and the summary says so', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:OK']);
  const [criei, copia, md] = [`Criei a pasta ${DEST}.`, `Cópia: ${COPIA}`, `LEIA-ME: ${EXEC}/entrega/LEIA-ME.md`].map((l) => r.linhas.indexOf(l));
  assert.ok(criei >= 0 && copia === criei + 1 && md === copia + 1, r.saida);
  assert.deepEqual(await nomes(raiz, COPIA), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt']);
  for (const rel of ['blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt']) assert.equal(await lerDe(raiz, `${COPIA}/${rel}`), await lerDe(raiz, `${EXEC}/entrega/${rel}`), rel);
  assert.ok(!r.saida.includes(raiz), 'no absolute path');
});

test('U3a-05c: a destination that already exists is not announced as created', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await fs.mkdir(path.join(raiz, DEST), { recursive: true });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA}`) && !r.saida.includes('Criei a pasta'), r.saida);
});

test('U3a-05d: two runs with the same destination — two subfolders, no file of one in the other', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  const outra = '2026-03-04-090000';
  await fs.mkdir(path.join(raiz, CREW, 'output', outra, 'v1'), { recursive: true });
  await fs.writeFile(path.join(raiz, CREW, 'output', outra, 'v1', 'zap.md'), 'Oi! Temos novidade.\n');
  await entregarEm(raiz, DEST, ITENS);
  const argv = ['--crew', CREW, '--run', outra, '--arquivo', `${CREW}/output/${outra}/v1/zap.md=whatsapp-broadcast`, '--destino', DEST];
  const r = await rodar(raiz, argv, [`${DEST}/`, `${CREW}/output/${outra}/`]);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await nomes(raiz, COPIA), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt']);
  assert.deepEqual(await nomes(raiz, `${DEST}/${outra}`), ['LEIA-ME.md', 'whatsapp/mensagem.txt']);
});

test('U3a-05h: a destination outside the rule is refused — no copy, the message, ENTREGA:INCOMPLETA, and entrega/ is there', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await fs.writeFile(path.join(raiz, 'arquivo.txt'), 'meu');
  const recusados = [
    'C:/x', '/x', '\\x', '../fora', '.', '_opencrew/x', 'crews/x', 'Crews/x', 'skills/x', '.git/x', 'node_modules/x', 'Node_Modules',
    'arquivo.txt', 'arquivo.txt/x', '[a, b]', '',
  ];
  for (const valor of recusados) {
    const r = await entregar(raiz, ITENS, '--destino', valor); // `entregar`: nothing outside the run folder may change
    assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA'], valor);
    assert.ok(r.linhas.includes(RECUSADO(valor)), `${valor}: ${r.saida}`);
    assert.ok(!r.saida.includes('Cópia:'), valor);
    assert.ok(await existe(raiz, 'instagram/legenda.txt'), valor);
  }
  assert.ok(!(await ha(raiz, '../fora')) && !(await ha(raiz, '../x')));
});

test('U3a-05h: a shortcut inside the project that leads outside it, or into a reserved folder, is refused by its real place', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  const fora = await mkTmp('fora');
  t.after(() => fs.rm(fora, { recursive: true, force: true, maxRetries: 3 }));
  await fs.symlink(fora, path.join(raiz, 'atalho'), 'junction');
  await fs.symlink(path.join(raiz, '_opencrew'), path.join(raiz, 'elo-do-runtime'), 'junction');
  const runtime = await fotos(raiz, '_opencrew');
  for (const valor of ['atalho', 'atalho/x', 'elo-do-runtime/x']) {
    // Called straight: the snapshot of `rodar` does not walk through a folder link.
    const linhas = [];
    const code = await main(['--crew', CREW, '--run', RUN, '--arquivo', lista(ITENS), '--destino', valor], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
    assert.deepEqual([code, linhas.at(-1)], [0, 'ENTREGA:INCOMPLETA'], valor);
    assert.ok(linhas.includes(RECUSADO(valor)), `${valor}: ${linhas.join(' | ')}`);
  }
  assert.deepEqual(await fs.readdir(fora), [], 'nothing written through the link');
  assert.deepEqual(await fotos(raiz, '_opencrew'), runtime);
});

test('U3a-05i: entrega.destino of crew.yaml — quotes and a comment at the end of the line are read', async (t) => {
  const raiz = await comYaml(t, 'name: teste\nentrega:\n  destino: "Conteúdo Pronto/Semana"   # onde guardo\nidioma: pt\n');
  const r = await rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(ITENS)], ['Conteúdo Pronto/']);
  assert.ok(r.linhas.includes(`Cópia: Conteúdo Pronto/Semana/${RUN}`), r.saida);
  assert.ok(await ha(raiz, `Conteúdo Pronto/Semana/${RUN}/instagram/legenda.txt`));
  // Single quotes, and no quotes with a comment.
  for (const linha of ["destino: 'Conteúdo Pronto/Semana'", 'destino: Conteúdo Pronto/Semana # onde guardo']) {
    await fs.writeFile(path.join(raiz, YAML), `name: teste\nentrega:\n  ${linha}\n`);
    const de_novo = await rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(ITENS)], ['Conteúdo Pronto/']);
    assert.ok(de_novo.linhas.includes(`Cópia: Conteúdo Pronto/Semana/${RUN} — já está atualizada.`), de_novo.saida);
  }
});

test('U3a-05i: destino: nao (or Não) — no copy, no "Cópia:" line and no folder with that name', async (t) => {
  for (const valor of ['nao', 'Não', '"NO"']) {
    const raiz = await comYaml(t, `name: teste\nentrega:\n  destino: ${valor}\n`);
    const r = await entregar(raiz, ITENS);
    assert.equal(r.fim, 'ENTREGA:OK', valor);
    assert.ok(!r.saida.includes('Cópia'), r.saida);
    assert.deepEqual((await fs.readdir(raiz)).sort(), ['_opencrew', 'crews']);
  }
});

test('U3a-05i: --destino wins over crew.yaml; a list is a refused destination; no `entrega:` — "nenhuma pasta escolhida"', async (t) => {
  const raiz = await comYaml(t, 'name: teste\nentrega:\n  destino: Guardados\n');
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA}`) && !(await ha(raiz, 'Guardados')), r.saida);
  for (const [yaml, recebi] of [['  destino:\n    - a\n    - b\n', '- a'], ['  destino: [a, b]\n', '[a, b]']]) {
    await fs.writeFile(path.join(raiz, YAML), `name: teste\nentrega:\n${yaml}`);
    const comLista = await entregar(raiz, ITENS);
    assert.equal(comLista.fim, 'ENTREGA:INCOMPLETA');
    assert.ok(comLista.linhas.includes(RECUSADO(recebi)), comLista.saida);
  }
  // `destino:` of another block is not the one of `entrega:`.
  await fs.writeFile(path.join(raiz, YAML), 'name: teste\noutra:\n  destino: Errado\n');
  const sem = await entregar(raiz, ITENS);
  assert.deepEqual([sem.fim, sem.linhas.includes(SEM_DESTINO)], ['ENTREGA:OK', true], sem.saida);
  assert.equal(sem.linhas.indexOf(SEM_DESTINO), sem.linhas.length - 3, 'right before the LEIA-ME line');
});

test('U3a-05j: a file named <run_id> in the destination — no partial folder, the file untouched, the message, ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await fs.mkdir(path.join(raiz, DEST), { recursive: true });
  await fs.writeFile(path.join(raiz, COPIA), 'arquivo do usuário');
  const r = await entregar(raiz, ITENS, '--destino', DEST); // the destination must stay as it was
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA']);
  assert.ok(r.linhas.includes(`Não consegui gravar ${COPIA}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo.`), r.saida);
  assert.equal(await lerDe(raiz, COPIA), 'arquivo do usuário');
  assert.deepEqual(await fs.readdir(path.join(raiz, DEST)), [RUN]);
  const md = await lerDe(raiz, `${EXEC}/entrega/LEIA-ME.md`);
  assert.ok(md.includes('Para guardar, copie a pasta para outro lugar do projeto.') && !md.includes(DEST), 'entrega/ is valid and cites no copy');
});

const LEMBRAR = (raiz, valor, livres = [`${DEST}/`]) => rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(ITENS), '--lembrar-destino', valor], [...livres, YAML]);

test('U3a-05k: --lembrar-destino writes entrega.destino, keeps the other lines, leaves crew.yaml.bak and already copies', async (t) => {
  const antes = 'name: teste\ndescricao: "Crew de teste"  # comentário\n';
  const raiz = await comYaml(t, antes);
  const r = await LEMBRAR(raiz, DEST);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(await lerDe(raiz, YAML), `${antes}entrega:\n  destino: "${DEST}"\n`);
  assert.equal(await lerDe(raiz, `${YAML}.bak`), antes);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA}`) && (await ha(raiz, `${COPIA}/blog/artigo.md`)), r.saida);
  // The same call again: nothing is written again (no second .bak), and the next call needs no option.
  const fotoDaCrew = async () => (await fotos(raiz, CREW)).filter((l) => !l.startsWith('output/'));
  const gravado = await fotoDaCrew();
  await LEMBRAR(raiz, DEST);
  assert.deepEqual(await fotoDaCrew(), gravado);
  const semOpcao = await rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(ITENS)], [`${DEST}/`]);
  assert.ok(semOpcao.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), semOpcao.saida);
});

test('U3a-05k: a crew.yaml.bak that was already there stays, and the new copy is crew.yaml.bak-<data-hora>', async (t) => {
  const antes = 'name: teste\r\nentrega:\r\n  outra: 1\r\n  destino: nao # ainda não\r\nidioma: pt\r\n';
  const raiz = await comYaml(t, antes);
  await fs.writeFile(path.join(raiz, `${YAML}.bak`), 'cópia antiga');
  await LEMBRAR(raiz, 'Conteudo\\Prontos/');
  assert.equal(await lerDe(raiz, YAML), `name: teste\r\nentrega:\r\n  outra: 1\r\n  destino: "${DEST}"\r\nidioma: pt\r\n`, 'the line is replaced in place; CRLF kept');
  assert.equal(await lerDe(raiz, `${YAML}.bak`), 'cópia antiga');
  const datadas = (await fs.readdir(path.join(raiz, CREW))).filter((n) => /^crew\.yaml\.bak-\d{4}-\d{2}-\d{2}T/.test(n));
  assert.equal(datadas.length, 1);
  assert.equal(await lerDe(raiz, `${CREW}/${datadas[0]}`), antes);
});

test('U3a-05k: --lembrar-destino nao writes `destino: nao` (also for "não" and "no"), and there is no copy', async (t) => {
  for (const valor of ['nao', 'Não', 'no']) {
    const raiz = await comYaml(t, 'name: teste\nentrega:\n  formato: curto\n');
    const r = await LEMBRAR(raiz, valor, []);
    assert.equal(r.fim, 'ENTREGA:OK');
    assert.equal(await lerDe(raiz, YAML), 'name: teste\nentrega:\n  destino: nao\n  formato: curto\n', valor);
    assert.ok(!r.saida.includes('Cópia'), r.saida);
  }
});

test('U3a-05k: --lembrar-destino with a refused destination — code 1, crew.yaml intact, nothing written', async (t) => {
  const raiz = await comYaml(t, 'name: teste\n');
  for (const valor of ['../fora', 'crews/x', '']) {
    const r = await entregar(raiz, ITENS, '--lembrar-destino', valor);
    assert.deepEqual([r.code, r.linhas], [1, [RECUSADO(valor)]], valor);
    assert.equal(await arvore(raiz), null);
  }
  assert.equal(await lerDe(raiz, YAML), 'name: teste\n');
  // A usage error after it is still code 1 with crew.yaml intact.
  const r = await entregar(raiz, ITENS, '--lembrar-destino', DEST, '--vai-publicar', 'youtube');
  assert.deepEqual([r.code, await lerDe(raiz, YAML)], [1, 'name: teste\n']);
});
