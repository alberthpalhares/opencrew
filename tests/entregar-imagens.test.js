// specs/fase-u3a1-pasta-de-entrega.md — U3a-04 (images and editable HTML) and U3a-05 (the
// entrega/ folder is rebuilt from scratch, deterministic, and never left half done).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { snapshot } from './_helpers.js';
import { BLOG, EXEC, LEGENDA, arvore, bytes, entregar, existe, leiame, png, projeto, secao } from './_entrega.js';

const nome = (n) => `slide-${String(n).padStart(2, '0')}.png`;
const imagens = (numeros, pasta = 'slides/v1') => Object.fromEntries(numeros.map((n) => [`${pasta}/${nome(n)}`, png(n)]));
const itens = (numeros, pasta = 'slides/v1') => numeros.map((n) => `${pasta}/${nome(n)}=instagram-feed`);
const OITO = [1, 2, 3, 4, 5, 6, 7, 8];

test('U3a-04a: eight PNG slides land in instagram/ with the same name and the same bytes', async (t) => {
  const raiz = await projeto(t, imagens(OITO));
  const r = await entregar(raiz, itens(OITO));
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', ...OITO.map((n) => `instagram/${nome(n)}`)]);
  for (const n of OITO) assert.deepEqual(await bytes(raiz, `instagram/${nome(n)}`), png(n));
  assert.doesNotMatch(`${r.saida}\n${await leiame(raiz)}`, /JPEG/i);
  const instagram = secao(await leiame(raiz), 'Instagram');
  for (const n of OITO) assert.ok(instagram.includes(`\`instagram/${nome(n)}\``) && instagram.includes(`${EXEC}/slides/v1/${nome(n)}`));
});

test('U3a-04b: one image alone is fine — no pending, no alert', async (t) => {
  const raiz = await projeto(t, imagens([1]));
  const r = await entregar(raiz, itens([1]));
  assert.equal(r.fim, 'ENTREGA:OK');
  const md = await leiame(raiz);
  assert.doesNotMatch(md, /Antes de usar|ALERTA/);
  assert.match(secao(md, 'Instagram'), /^Situação: Pronto$/m);
});

test('U3a-04b: slides 1, 2 and 4 — nothing is renumbered, slide 3 is a gap', async (t) => {
  const raiz = await projeto(t, imagens([1, 2, 4]));
  await entregar(raiz, itens([1, 2, 4]));
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/slide-01.png', 'instagram/slide-02.png', 'instagram/slide-04.png']);
});

test('U3a-04h: an HTML with an image of the same name goes to editaveis/, with no "Não encontrei"', async (t) => {
  const html = '<html><body><h1>Dica do dia</h1></body></html>\r\n';
  const raiz = await projeto(t, { 'slides/v1/slide-01.html': html, ...imagens([1]) });
  const r = await entregar(raiz, ['slides/v1/slide-01.html=instagram-feed', ...itens([1])]);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'editaveis/slide-01.html', 'instagram/slide-01.png']);
  assert.deepEqual(await bytes(raiz, 'editaveis/slide-01.html'), Buffer.from(html));
  const md = await leiame(raiz);
  assert.ok(!md.includes('Não encontrei') && !r.saida.includes('Não encontrei'));
  assert.ok(secao(md, 'Editáveis').includes('`editaveis/slide-01.html`') && secao(md, 'Editáveis').includes(`${EXEC}/slides/v1/slide-01.html`));
});

test('U3a-04h: an HTML with no image of the same name and no format goes to outros/', async (t) => {
  const raiz = await projeto(t, { 'v1/relatorio.html': '<p>Relatório da semana.</p>\n', ...imagens([1]) });
  await entregar(raiz, ['v1/relatorio.html', ...itens([1])]);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/slide-01.png', 'outros/relatorio.html']);
});

test('U3a-04k: two sets with the same slide name — the files of the second folder get the 2- prefix', async (t) => {
  const raiz = await projeto(t, { ...imagens([1], 'a/v1'), ...imagens([1], 'b/v1'), 'b/v1/capa.png': png(9) });
  const r = await entregar(raiz, [...itens([1], 'a/v1'), ...itens([1], 'b/v1'), 'b/v1/capa.png=instagram-feed']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/2-capa.png', 'instagram/2-slide-01.png', 'instagram/slide-01.png']);
  assert.deepEqual(await bytes(raiz, 'instagram/2-capa.png'), png(9));
  assert.ok(r.saida.includes(`${EXEC}/b/v1/slide-01.png tem o mesmo nome de outro e foi guardado como 2-slide-01.png.`));
  const linhas = secao(await leiame(raiz), 'Instagram').split('\n');
  assert.ok(linhas.find((l) => l.includes('`instagram/2-capa.png`')).includes(`${EXEC}/b/v1/capa.png`));
});

test('U3a-04k: a third folder with the same name gets 3-', async (t) => {
  const raiz = await projeto(t, { ...imagens([1], 'a/v1'), ...imagens([1], 'b/v1'), ...imagens([1], 'c/v1') });
  await entregar(raiz, [...itens([1], 'a/v1'), ...itens([1], 'b/v1'), ...itens([1], 'c/v1')]);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/2-slide-01.png', 'instagram/3-slide-01.png', 'instagram/slide-01.png']);
});

const foraDaEntrega = async (raiz) => (await snapshot(path.join(raiz, EXEC))).filter((l) => !/^(entrega[\\/]|verificacao-entrega\.md:)/.test(l));

test('U3a-05a: a second delivery of the same run with six images leaves six — and deletes nothing else', async (t) => {
  const raiz = await projeto(t, { ...imagens(OITO), 'v1/post.md': BLOG });
  await entregar(raiz, [...itens(OITO), 'v1/post.md=blog-post']);
  await fs.writeFile(path.join(raiz, EXEC, 'entrega', 'instagram', 'minha-nota.txt'), 'editado à mão\n');
  const antes = await foraDaEntrega(raiz);
  const r = await entregar(raiz, itens([1, 2, 3, 4, 5, 6]));
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', ...[1, 2, 3, 4, 5, 6].map((n) => `instagram/${nome(n)}`)]);
  assert.deepEqual(await foraDaEntrega(raiz), antes);
  assert.equal(antes.length, 9);
});

test('U3a-05b: the same inputs twice give the same bytes, and the LEIA-ME has no time', async (t) => {
  const raiz = await projeto(t, { ...imagens([1, 2]), 'v1/post.md': BLOG, 'v1/legenda.md': LEGENDA });
  const lista = [...itens([1, 2]), 'v1/post.md=blog-post', 'v1/legenda.md=instagram-feed'];
  const um = await entregar(raiz, lista);
  const primeira = await snapshot(path.join(raiz, EXEC));
  const dois = await entregar(raiz, lista);
  assert.deepEqual(await snapshot(path.join(raiz, EXEC)), primeira);
  assert.deepEqual(dois.linhas, um.linhas);
  assert.doesNotMatch(await leiame(raiz), /\d{1,2}:\d{2}|\d{1,2}h\d{2}/);
});

test('U3a-05n: when entrega.tmp cannot be created the previous delivery stays whole — ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, { ...imagens([1, 2]), 'v1/post.md': BLOG });
  await entregar(raiz, itens([1, 2]));
  await fs.writeFile(path.join(raiz, EXEC, 'entrega.tmp'), 'um arquivo do usuário\n');
  const antes = await snapshot(path.join(raiz, EXEC));
  const r = await entregar(raiz, ['v1/post.md=blog-post']);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA']);
  assert.deepEqual(await snapshot(path.join(raiz, EXEC)), antes);
  assert.ok(r.linhas.includes(`Não consegui gravar ${EXEC}/entrega.tmp. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo.`), r.saida);
  assert.equal(await existe(raiz, 'blog'), false);
});

test('U3a-05n: a folder entrega.tmp left by an interrupted run is the script\'s own — it is replaced', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': BLOG, 'entrega.tmp/instagram/resto.txt': 'resto\n' });
  const r = await entregar(raiz, ['v1/post.md=blog-post']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt']);
  assert.deepEqual((await fs.readdir(path.join(raiz, EXEC))).sort(), ['entrega', 'v1', 'verificacao-entrega.md']);
});

test('U3a-05n: a file called entrega, put there by the user, is never replaced — ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': BLOG, entrega: 'um arquivo do usuário\n' });
  const antes = await snapshot(path.join(raiz, EXEC));
  const r = await entregar(raiz, ['v1/post.md=blog-post']);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA']);
  assert.ok(r.linhas[0].startsWith(`Não consegui gravar ${EXEC}/entrega.`), r.saida);
  assert.deepEqual(await snapshot(path.join(raiz, EXEC)), antes);
});
