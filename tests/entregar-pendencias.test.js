// specs/fase-u3a1-pasta-de-entrega.md — U3a-07 (pending items and what was not checked), the
// script side of U3a-08h and U3a-08n (--vai-publicar) and U3a-09c-f1 (the size alert, rule 34).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { formatarRelatorio, verificar } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { texto } from './_helpers.js';
import { BLOG, CREW, EXEC, LEGENDA, arvore, entregar, leiame, ler, projeto, secao } from './_entrega.js';

const legendaDe = (n, hashtags = '') => `=== CAPTION ===\n${texto(n)}\n${hashtags ? `\n=== HASHTAGS ===\n${hashtags}\n` : ''}`;
/** Hashtags, separated by spaces, adding up to exactly n characters (n ≥ 14, at most 30 tags). */
function hashtagsDe(n) {
  const cheias = Math.floor((n - 2) / 11);
  const resto = n - cheias * 11 - 1;
  return [...Array.from({ length: cheias }, (_, i) => `#tag${String(i).padStart(6, '0')}`), `#${'z'.repeat(resto)}`].join(' ');
}

test('U3a-07a: a 2300-character caption and a clean blog — instagram is not ready, blog is, ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2300), 'v1/post.md': BLOG });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post']);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA']);
  const md = await leiame(raiz);
  assert.match(secao(md, 'Instagram'), /^Situação: Não está pronto$/m);
  assert.match(secao(md, 'Blog'), /^Situação: Pronto$/m);
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), `${texto(2300)}\n`);
  const antes = secao(md, 'Antes de usar');
  assert.ok(antes.includes('Instagram não está pronto: 1 pendência.'));
  assert.match(antes, /Legenda Instagram — caracteres: 2300 \(limite 2200\)/);
  assert.ok(antes.includes(`${EXEC}/v1/legenda.md`));
  assert.ok(!antes.includes('ALERTA'), 'the checker already pointed at this piece: no size alert for it');
  assert.ok(r.linhas.includes('Instagram não está pronto: 1 pendência.'));
  assert.match(secao(md, 'Instagram'), /^1\. Antes de postar, resolva o que está em Pendências\./m, 'a channel that is not ready: first, the pending items');
  assert.match(secao(md, 'Instagram'), /^2\. No computador, abra instagram\.com/m, 'the steps stay in a channel that is not ready');
  assert.ok(secao(md, 'Instagram').includes('Legenda Instagram — caracteres: 2300 (limite 2200)'));
});

test('U3a-07a: two pending items in one channel agree in number', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': `${legendaDe(2300)}\nFale com [Nome] hoje.\n` });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed']);
  assert.ok(r.linhas.includes('Instagram não está pronto: 2 pendências.'), r.saida);
});

test('U3a-07b: a [PREENCHER] in the LinkedIn post — the channel is not ready and "Antes de usar" shows it', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': 'Leia o artigo completo: [PREENCHER: link do artigo]\n' });
  const r = await entregar(raiz, ['v1/post.md=linkedin-post']);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  const md = await leiame(raiz);
  assert.match(secao(md, 'LinkedIn'), /^Situação: Não está pronto$/m);
  const linha = secao(md, 'Antes de usar').split('\n').find((l) => l.includes('link do artigo'));
  assert.ok(linha?.includes(`${EXEC}/v1/post.md`), secao(md, 'Antes de usar'));
  assert.ok((await arvore(raiz)).includes('linkedin/post.txt'), 'the files are generated anyway');
});

test('U3a-07f: an alert and a "não medido" item go to "O que não foi conferido" and do not change the end', async (t) => {
  const blog = BLOG.replace('Texto do artigo.', 'Nós atendemos 300 clientes neste ano.');
  const raiz = await projeto(t, { 'v1/post.md': blog, 'v1/video.md': 'Roteiro do vídeo.\n', 'v1/slide.png': Buffer.from([1]) });
  const r = await entregar(raiz, ['v1/post.md=blog-post', 'v1/video.md=youtube-script', 'v1/slide.png=instagram-feed']);
  assert.equal(r.fim, 'ENTREGA:OK');
  const md = await leiame(raiz);
  const conferido = secao(md, 'O que não foi conferido');
  assert.ok(conferido.includes('Afirmação a confirmar: "Nós atendemos 300 clientes neste ano."') && conferido.includes(`${EXEC}/v1/post.md`));
  assert.ok(conferido.includes('Não medido — o verificador ainda não mede os limites do formato youtube-script') && conferido.includes(`${EXEC}/v1/video.md`));
  assert.ok(conferido.includes(`Não verificado — não é texto: ${EXEC}/v1/slide.png`));
  assert.deepEqual(conferido.split('\n').slice(-3), ['- Links e fatos citados no texto.', '- Texto dentro das imagens.', '- Aparência final em cada rede.']);
  assert.doesNotMatch(md, /Antes de usar/);
});

test('U3a-07g: verificacao-entrega.md is the checker report for the same items, in the delivery mode', async (t) => {
  const semFormato = `---\ntitle: "${texto(120)}"\n---\n\nProposta comercial.\n`;
  const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2300), 'v1/proposta.md': semFormato, 'v1/slide.png': Buffer.from([1]) });
  await entregar(raiz, ['v1/legenda.md=instagram-feed', 'v1/proposta.md', 'v1/slide.png=instagram-feed', 'v1/falta.md=linkedin-post']);
  const arquivos = [{ arquivo: `${EXEC}/v1/legenda.md`, formato: 'instagram-feed' }, `${EXEC}/v1/proposta.md`, { arquivo: `${EXEC}/v1/slide.png`, formato: 'instagram-feed' }, { arquivo: `${EXEC}/v1/falta.md`, formato: 'linkedin-post' }];
  const daEntrega = formatarRelatorio(await verificar({ raiz, crew: CREW, arquivos, semPadraoDeBlog: true }));
  const gravado = await fs.readFile(path.join(raiz, EXEC, 'verificacao-entrega.md'), 'utf8');
  assert.equal(gravado, `${daEntrega}\n`);
  assert.ok(gravado.includes('| Legenda Instagram — caracteres | 2300 | ≤ 2200 | ❌ Bloqueio |') && !gravado.includes('Título (SEO)'));
  // The same list in the checker, without the option, gives today's result: the title is measured.
  assert.ok(formatarRelatorio(await verificar({ raiz, crew: CREW, arquivos })).includes('| Título (SEO) — caracteres | 120 | ≤ 70 | ❌ Bloqueio |'));
});

test('U3a-08h: --vai-publicar with a channel that is not in this delivery — code 1, the message, nothing written', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA });
  for (const canal of ['outra-rede', 'linkedin']) {
    const r = await entregar(raiz, ['v1/legenda.md=instagram-feed'], '--vai-publicar', canal);
    assert.equal(r.code, 1);
    assert.deepEqual(r.linhas, [`Canal não encontrado nesta entrega: ${canal}.`]);
    assert.equal(await arvore(raiz), null);
  }
});

const FRASE = 'Esta crew publica este canal sozinha. Antes de postar à mão, confira se já saiu.';

test('U3a-08n: with --vai-publicar instagram the section of the channel opens with the warning', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA, 'v1/post.md': BLOG });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post'], '--vai-publicar', 'instagram');
  assert.equal(r.fim, 'ENTREGA:OK');
  const md = await leiame(raiz);
  assert.equal(secao(md, 'Instagram').split('\n')[0], FRASE);
  assert.ok(!secao(md, 'Blog').includes(FRASE));
});

test('U3a-08n: --vai-publicar can be repeated, and without it no section has the warning', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA, 'v1/post.md': BLOG });
  await entregar(raiz, ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post']);
  assert.ok(!(await leiame(raiz)).includes(FRASE));
  await entregar(raiz, ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post'], '--vai-publicar', 'instagram', '--vai-publicar=blog');
  const md = await leiame(raiz);
  assert.deepEqual([secao(md, 'Instagram').split('\n')[0], secao(md, 'Blog').split('\n')[0]], [FRASE, FRASE]);
});

const ALERTA = (arquivo, n, limite) => `ALERTA: \`${arquivo}\` tem ${n} caracteres; o limite é ${limite}. Encurte antes de publicar.`;

test('U3a-09c-f1: a 2100 caption whose hashtags take legenda.txt to 2260 — an ALERT, the channel is ready, ENTREGA:OK', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2100, hashtagsDe(158)) });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal((await ler(raiz, 'instagram/legenda.txt')).length, 2261, '2260 and the final line break');
  const md = await leiame(raiz);
  assert.ok(secao(md, 'Antes de usar').includes(ALERTA('instagram/legenda.txt', 2260, 2200)), secao(md, 'Antes de usar'));
  assert.match(secao(md, 'Instagram'), /^Situação: Pronto$/m);
});

test('U3a-09c-f1: a tweet.txt of 290 characters — the ALERT with 290 and 280', async (t) => {
  const raiz = await projeto(t, { 'v1/tweet.md': `=== TWEET ===\n${texto(270)}\n\n=== HASHTAGS ===\n#horta #casa #dica\n` });
  const r = await entregar(raiz, ['v1/tweet.md=twitter-post']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(await ler(raiz, 'twitter/tweet.txt'), `${texto(270)}\n\n#horta #casa #dica\n`);
  assert.ok(secao(await leiame(raiz), 'Antes de usar').includes(ALERTA('twitter/tweet.txt', 290, 280)));
});

test('U3a-09c-f1: a legenda.txt of exactly 2200 characters — no alert', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2100, hashtagsDe(98)) });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal((await ler(raiz, 'instagram/legenda.txt')).length, 2201);
  assert.doesNotMatch(await leiame(raiz), /ALERTA|Antes de usar/);
});

test('U3a-09c-f1: the comment of a post is not counted, and a long post of a thread is alerted by its own limit', async (t) => {
  const post = `## Post LinkedIn\n\n${texto(100)}\n\n## Primeiro comentário\n\n${texto(3100)}\n`;
  const raiz = await projeto(t, { 'v1/post.md': post, 'v1/thread.md': `TWEET 1/2\n${texto(300)}\n\nTWEET 2/2\nFim.\n` });
  const r = await entregar(raiz, ['v1/post.md=linkedin-post', 'v1/thread.md=twitter-thread']);
  assert.equal(r.fim, 'ENTREGA:OK');
  const antes = secao(await leiame(raiz), 'Antes de usar');
  assert.ok(antes.includes(ALERTA('twitter/tweet-1.txt', 300, 280)) && !antes.includes('linkedin/'), antes);
});
