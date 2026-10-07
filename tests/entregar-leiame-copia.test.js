// specs/fase-u3a2-entrega-no-projeto.md — U3a-06e-f2: the "Atenção:" warning names the source file,
// and the two LEIA-ME (the one of entrega/ and the one of the copy) say what each folder is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { texto } from './_helpers.js';
import { BLOG, COPIA, DEST, EXEC, LEGENDA, RUN, entregar, entregarEm, leiame, lerDe, png, projeto, secao, titulos } from './_entrega.js';

const NOTAS = `${BLOG.replace('Como cuidar da horta', 'Como regar')}\n=== POST NOTES ===\nInserir o link da loja.\n`;
const SOBRE = 'Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde.';
const DA_COPIA = `Esta é a cópia da entrega da execução ${RUN}. Ela não é refeita: pode editar e guardar. Se a entrega mudar, a versão nova vai para outra pasta, ao lado desta.`;

test('U3a-06e-f2: a channel with two source files — the "Atenção:" warning names the one that lost a block', async (t) => {
  const raiz = await projeto(t, { 'v1/a.md': BLOG, 'v1/b.md': NOTAS });
  const r = await entregar(raiz, ['v1/a.md=blog-post', 'v1/b.md=blog-post']);
  assert.equal(r.fim, 'ENTREGA:OK');
  const blog = secao(await leiame(raiz), 'Blog');
  assert.match(blog, new RegExp(`^Atenção:\\n- Ficou fora do texto para colar: POST NOTES\\. Veja no arquivo de origem, \`${EXEC}/v1/b\\.md\`\\.$`, 'm'));
  assert.ok(!blog.includes(`origem, \`${EXEC}/v1/a.md\``));
  assert.ok(r.linhas.includes(`- ${EXEC}/v1/b.md: ficou fora do texto para colar: POST NOTES. Veja no arquivo de origem.`), 'the screen line is the one of 1.8.0');
});

const TUDO = { 'v1/legenda.md': LEGENDA, 'v1/slide-01.png': png(1), 'v1/slide-01.html': '<html></html>', 'v1/post.md': NOTAS, 'v1/proposta.md': 'Proposta comercial.\n' };
const ITENS = ['v1/legenda.md=instagram-feed', 'v1/slide-01.png=instagram-feed', 'v1/slide-01.html=instagram-feed', 'v1/post.md=blog-post', 'v1/proposta.md'];
const citados = (md) => [...md.matchAll(/`((?:instagram|linkedin|blog|outros|editaveis)\/[^`]+)`/g)].map((m) => m[1]);

test('U3a-06e-f2: with a destination, "Sobre esta pasta" of entrega/ cites the copy and the one of the copy says it is not rebuilt', async (t) => {
  const raiz = await projeto(t, TUDO);
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(secao(await leiame(raiz), 'Sobre esta pasta'), `${SOBRE} A cópia para guardar está em \`${COPIA}\`.`);
  const daCopia = await lerDe(raiz, `${COPIA}/LEIA-ME.md`);
  assert.equal(secao(daCopia, 'Sobre esta pasta'), DA_COPIA);
  assert.deepEqual(titulos(daCopia), titulos(await leiame(raiz)), 'the same sections, in the same order');
  assert.ok(citados(daCopia).includes('editaveis/slide-01.html') && citados(daCopia).includes('outros/proposta.md'));
  for (const rel of citados(daCopia)) await assert.doesNotReject(fs.access(path.join(raiz, COPIA, rel)), rel);
  assert.ok(!daCopia.includes(raiz) && !daCopia.includes('\\'), 'no absolute path');
});

test('U3a-06e-f2: every file the LEIA-ME of the copy cites exists in it — also with a channel left out and a size alert on it', async (t) => {
  // The caption is over the limit (not ready) and its hashtags make legenda.txt even longer.
  const longa = `=== CAPTION ===\n${texto(2300)}\n\n=== HASHTAGS ===\n#horta #casa\n`;
  const raiz = await projeto(t, { ...TUDO, 'v1/legenda.md': longa });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  const daCopia = await lerDe(raiz, `${COPIA}/LEIA-ME.md`);
  assert.deepEqual(citados(daCopia).sort(), ['blog/artigo.md', 'blog/artigo.md', 'blog/seo.txt', 'blog/seo.txt', 'outros/proposta.md']);
  for (const rel of citados(daCopia)) await assert.doesNotReject(fs.access(path.join(raiz, COPIA, rel)), rel);
  assert.ok(!titulos(daCopia).includes('Editáveis'));
});

test('U3a-06e-f2: without a copy, "Sobre esta pasta" keeps the text of 1.8.0', async (t) => {
  const raiz = await projeto(t, TUDO);
  await entregar(raiz, ITENS);
  assert.equal(secao(await leiame(raiz), 'Sobre esta pasta'), `${SOBRE} Para guardar, copie a pasta para outro lugar do projeto.`);
});
