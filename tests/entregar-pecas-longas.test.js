// specs/fase-u3a1-pasta-de-entrega.md — U3a-03, the long pieces: blog (seo.txt and artigo.md),
// e-mail, WhatsApp, scripts and articles copied with their name, and what has no piece at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXEC, arvore, bytes, entregar, leiame, ler, projeto, secao } from './_entrega.js';

async function um(t, conteudo, formato, nome = 'saida.md') {
  const raiz = await projeto(t, { [`v1/${nome}`]: conteudo });
  const r = await entregar(raiz, [`v1/${nome}${formato ? `=${formato}` : ''}`]);
  return { raiz, r };
}

test('U3a-03g: a blog with frontmatter — artigo.md has no frontmatter nor HTML comment; seo.txt has three lines', async (t) => {
  const blog = '---\ntitle: "Guia da horta em casa"\nmeta_description: "Aprenda a começar a sua horta."\npalavra_chave: horta em casa\n---\n\n<!-- revisar o\nsegundo parágrafo -->\n## Comece pelo solo\n\nTexto do **artigo**, com [link](https://exemplo.org).\n';
  const { raiz, r } = await um(t, blog, 'blog-post');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(await ler(raiz, 'blog/artigo.md'), '## Comece pelo solo\n\nTexto do **artigo**, com [link](https://exemplo.org).\n');
  assert.equal(await ler(raiz, 'blog/seo.txt'), 'Título: Guia da horta em casa\nMeta description: Aprenda a começar a sua horta.\nPalavra-chave: horta em casa\n');
});

test('U3a-03g: the slug and the "keyword" key of the frontmatter become lines of seo.txt', async (t) => {
  const { raiz } = await um(t, '---\ntitle: "Guia da horta"\nkeyword: "horta"\nslug: guia-da-horta\n---\n\nTexto do artigo.\n', 'blog-seo');
  assert.equal(await ler(raiz, 'blog/seo.txt'), 'Título: Guia da horta\nPalavra-chave: horta\nSlug: guia-da-horta\n');
});

const BLOG_EM_ROTULOS = [
  '=== TARGET KEYWORD ===\nPrimary: horta em casa | Secondary: horta em apartamento\nSearch intent: informacional',
  '=== TITLE TAG ===\nGuia da horta em casa',
  '=== META DESCRIPTION ===\nAprenda a começar a sua horta.',
  '=== BODY ===\n## Comece pelo solo\n\nTexto do artigo.',
  '=== SEO CHECKLIST ===\n- [ ] Conferir densidade da palavra',
].join('\n\n');

test('U3a-03h: a labelled blog — seo.txt with the primary keyword only; artigo.md is the body alone', async (t) => {
  const { raiz, r } = await um(t, `${BLOG_EM_ROTULOS}\n`, 'blog-seo');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(await ler(raiz, 'blog/seo.txt'), 'Título: Guia da horta em casa\nMeta description: Aprenda a começar a sua horta.\nPalavra-chave: horta em casa\n');
  const artigo = await ler(raiz, 'blog/artigo.md');
  assert.equal(artigo, '## Comece pelo solo\n\nTexto do artigo.\n');
  assert.doesNotMatch(artigo, /===|densidade|Guia da horta|Aprenda|Primary:|Search intent:/);
});

const EMAIL = '=== SUBJECT LINE ===\nSua **horta** começa hoje\n\n=== PREVIEW TEXT ===\nTrês passos simples\n\n=== BODY ===\nOlá!\n\nCorpo do **e-mail**.\n\n=== EMAIL NOTES ===\nEnviar na terça.\n';

test('U3a-03i: an e-mail gives assunto.txt, previa.txt and corpo.md, this one without the notes', async (t) => {
  const { raiz, r } = await um(t, EMAIL, 'email-newsletter');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'email/assunto.txt', 'email/corpo.md', 'email/previa.txt']);
  assert.equal(await ler(raiz, 'email/assunto.txt'), 'Sua horta começa hoje\n');
  assert.equal(await ler(raiz, 'email/previa.txt'), 'Três passos simples\n');
  assert.equal(await ler(raiz, 'email/corpo.md'), 'Olá!\n\nCorpo do **e-mail**.\n');
});

test('U3a-03i: three e-mails, each opened by a subject, are numbered and listed with the block title', async (t) => {
  const tres = [1, 2, 3].map((n) => `## E-mail ${n} — dia ${n}\n\n=== SUBJECT LINE ===\nAssunto ${n}\n\n=== BODY ===\nCorpo ${n}.\n`).join('\n');
  const { raiz } = await um(t, tres, 'email-sales');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', ...[1, 2, 3].flatMap((n) => [`email/assunto-${n}.txt`, `email/corpo-${n}.md`])].sort());
  assert.equal(await ler(raiz, 'email/assunto-3.txt'), 'Assunto 3\n');
  assert.equal(await ler(raiz, 'email/corpo-2.md'), 'Corpo 2.\n');
  const linha = secao(await leiame(raiz), 'E-mail').split('\n').find((l) => l.includes('`email/corpo-2.md`'));
  assert.ok(linha.includes('E-mail 2 — dia 2'), linha);
});

test('U3a-03i: subject and preview written as headings are found too', async (t) => {
  const { raiz } = await um(t, '## Assunto\n\nSua horta começa hoje\n\n## Prévia\n\nTrês passos simples\n\n## Corpo\n\nOlá!\n\n### Primeiro passo\n\nRegue.\n', 'email-newsletter');
  assert.equal(await ler(raiz, 'email/assunto.txt'), 'Sua horta começa hoje\n');
  assert.equal(await ler(raiz, 'email/previa.txt'), 'Três passos simples\n');
  assert.equal(await ler(raiz, 'email/corpo.md'), 'Olá!\n\n### Primeiro passo\n\nRegue.\n');
});

test('U3a-03p: an email-sales with a subject and the body in OPENER, no preview — two files, no warning', async (t) => {
  const { raiz, r } = await um(t, '=== SUBJECT LINE ===\nUma pergunta rápida\n\n=== OPENER ===\nOi, Ana.\n\n=== CTA ===\nPodemos conversar?\n', 'email-sales');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'email/assunto.txt', 'email/corpo.md']);
  assert.equal(await ler(raiz, 'email/corpo.md'), 'Oi, Ana.\n\nPodemos conversar?\n');
  assert.ok(!r.saida.includes('Não encontrei') && !(await leiame(raiz)).includes('Não encontrei'));
});

test('U3a-03j: in WhatsApp **bold** becomes *bold*; *x*, _x_ and {{name}} stay', async (t) => {
  const { raiz, r } = await um(t, '**oferta** só *hoje* e _amanhã_, {{name}}!\n', 'whatsapp-broadcast');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(await ler(raiz, 'whatsapp/mensagem.txt'), '*oferta* só *hoje* e _amanhã_, {{name}}!\n');
});

test('U3a-03j: a labelled WhatsApp message — the four texts, in order, a blank line between them', async (t) => {
  const rotulos = '=== GREETING ===\nOi, {{name}}!\n=== BODY ===\nTemos novidade na loja.\nVenha ver.\n\n=== CTA ===\nResponda SIM.\n\n=== SIGNATURE ===\nEquipe Horta\n\n=== BROADCAST NOTES ===\nEnviar às 10h.\n';
  const { raiz } = await um(t, rotulos, 'whatsapp-broadcast');
  assert.equal(await ler(raiz, 'whatsapp/mensagem.txt'), 'Oi, {{name}}!\n\nTemos novidade na loja.\nVenha ver.\n\nResponda SIM.\n\nEquipe Horta\n');
});

test('U3a-03k: a reels script keeps its name and its label lines, without the note', async (t) => {
  const roteiro = '---\ntema: horta\n---\n=== REEL SCRIPT ===\nCena 1: **abertura**.\n\n=== CAPTION ===\nLegenda do reel.\n\n=== AUDIO NOTE ===\nMúsica calma.\n';
  const { raiz } = await um(t, roteiro, 'instagram-reels', 'roteiro.md');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/roteiro.md']);
  assert.equal(await ler(raiz, 'instagram/roteiro.md'), '=== REEL SCRIPT ===\nCena 1: **abertura**.\n\n=== CAPTION ===\nLegenda do reel.\n');
});

test('U3a-03k: a linkedin-article keeps the text of its section labels', async (t) => {
  const { raiz } = await um(t, '=== SECTION 1: Por que mudar ===\nPorque o mercado mudou.\n\n=== ARTICLE NOTES ===\nRevisar.\n', 'linkedin-article', 'artigo.md');
  assert.equal(await ler(raiz, 'linkedin/artigo.md'), '=== SECTION 1: Por que mudar ===\nPorque o mercado mudou.\n');
});

test('U3a-03n: a .csv with no format is copied to outros/, byte for byte', async (t) => {
  const csv = Buffer.from(`${String.fromCharCode(0xfeff)}nome;valor\r\nhorta;10\r\n`);
  const { raiz, r } = await um(t, csv, null, 'dados.csv');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'outros/dados.csv']);
  assert.deepEqual(await bytes(raiz, 'outros/dados.csv'), csv);
});

test('U3a-03q: two scripts with the same name, from different folders — the second gets the 2- prefix', async (t) => {
  const raiz = await projeto(t, { 'reels/v1/roteiro.md': 'Roteiro do reel.\n', 'stories/v1/roteiro.md': 'Roteiro dos stories.\n' });
  const r = await entregar(raiz, ['reels/v1/roteiro.md=instagram-reels', 'stories/v1/roteiro.md=instagram-stories']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/2-roteiro.md', 'instagram/roteiro.md']);
  assert.equal(await ler(raiz, 'instagram/2-roteiro.md'), 'Roteiro dos stories.\n');
  const linhas = secao(await leiame(raiz), 'Instagram').split('\n');
  assert.ok(linhas.find((l) => l.includes('`instagram/roteiro.md`')).includes(`${EXEC}/reels/v1/roteiro.md`));
  assert.ok(linhas.find((l) => l.includes('`instagram/2-roteiro.md`')).includes(`${EXEC}/stories/v1/roteiro.md`));
  assert.ok(r.saida.includes(`${EXEC}/stories/v1/roteiro.md tem o mesmo nome de outro e foi guardado como 2-roteiro.md.`));
});

test('U3a-03q: a copied file never lands on a generated one — a script called legenda.txt gets the prefix', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': '=== CAPTION ===\nLegenda da semana.\n', 'reels/v1/legenda.txt': 'Roteiro do reel.\n' });
  await entregar(raiz, ['reels/v1/legenda.txt=instagram-reels', 'v1/post.md=instagram-feed']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/2-legenda.txt', 'instagram/legenda.txt']);
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), 'Legenda da semana.\n');
});
