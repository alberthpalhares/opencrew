// specs/fase-u3a1-pasta-de-entrega.md — U3a-06e and U3a-06f: the LEIA-ME of a delivery (fixed
// titles, situation of each channel, the steps of the "Passos por canal" table, word for word).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOG, EXEC, LEGENDA, RUN, entregar, existe, leiame, png, projeto, passos, secao, titulos } from './_entrega.js';

const MARKDOWN = 'Este texto está em markdown: se o seu editor não aceitar, ajuste títulos, negrito e links depois de colar.';
const SOBRE = 'Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde. Para guardar, copie a pasta para outro lugar do projeto.';
const CARROSSEL = { 'v2/post.md': BLOG, 'v2/legenda.md': LEGENDA, 'slides/v1/slide-01.png': png(1), 'slides/v1/slide-02.png': png(2) };
const ITENS = ['v2/post.md=blog-post', 'v2/legenda.md=instagram-feed', 'slides/v1/slide-01.png=instagram-feed', 'slides/v1/slide-02.png=instagram-feed'];

test('U3a-06e: the LEIA-ME has the fixed titles, in order, only for what is there, and every cited file exists', async (t) => {
  const raiz = await projeto(t, CARROSSEL);
  await entregar(raiz, ITENS);
  const md = await leiame(raiz);
  assert.equal(md.split('\n')[0], `# Entrega — teste — ${RUN}`);
  assert.deepEqual(titulos(md), ['Instagram', 'Blog', 'O que não foi conferido', 'Para ter um PDF', 'Sobre esta pasta']);
  for (const canal of ['Instagram', 'Blog']) assert.match(secao(md, canal), /^Situação: (Pronto|Não está pronto)$/m);
  const citados = [...md.matchAll(/`((?:instagram|blog|outros|editaveis)\/[^`]+)`/g)].map((m) => m[1]);
  assert.ok(citados.includes('instagram/legenda.txt') && citados.includes('instagram/slide-02.png') && citados.includes('blog/artigo.md'));
  for (const rel of citados) assert.ok(await existe(raiz, rel), rel);
  assert.ok(secao(md, 'Blog').includes(MARKDOWN));
  assert.equal(secao(md, 'Para ter um PDF'), 'Abra o arquivo que você quer no navegador ou no editor de texto e use Imprimir → Salvar como PDF.');
  assert.equal(secao(md, 'Sobre esta pasta'), SOBRE);
  assert.ok(!md.includes(raiz) && !/[A-Za-z]:[\\/]/.test(md) && !md.includes('\\'), 'no absolute path');
  assert.ok(secao(md, 'Blog').includes(`${EXEC}/v2/post.md`), 'the source file, relative to the project');
  assert.doesNotMatch(md, /\d{2}:\d{2}/, 'no time of day');
});

test('U3a-06e: an Instagram with no images has no step about images', async (t) => {
  const raiz = await projeto(t, CARROSSEL);
  await entregar(raiz, ['v2/legenda.md=instagram-feed']);
  const instagram = secao(await leiame(raiz), 'Instagram');
  assert.doesNotMatch(instagram, /imagens|slide-0/);
  assert.equal(passos(instagram).length, 3);
});

test('U3a-06e: a delivery with images only has no "Para ter um PDF"', async (t) => {
  const raiz = await projeto(t, CARROSSEL);
  await entregar(raiz, ITENS.slice(2));
  assert.deepEqual(titulos(await leiame(raiz)), ['Instagram', 'O que não foi conferido', 'Sobre esta pasta']);
});

const UM_DE_CADA = {
  'v1/legenda.md': [LEGENDA, 'instagram-feed'],
  'v1/slide-01.png': [png(1), 'instagram-feed'],
  'v1/reel.md': ['Cena 1: abertura.\n', 'instagram-reels'],
  'v1/post.md': ['## Post LinkedIn\n\nTexto do post.\n\n## Primeiro comentário\n\nO link está aqui.\n', 'linkedin-post'],
  'v1/capa.png': [png(2), 'linkedin-post'],
  'v1/artigo-longo.md': ['Texto do artigo do LinkedIn.\n', 'linkedin-article'],
  'v1/blog.md': [BLOG, 'blog-post'],
  'v1/email.md': ['=== SUBJECT LINE ===\nSua horta começa hoje\n\n=== PREVIEW TEXT ===\nTrês passos simples\n\n=== BODY ===\nCorpo do e-mail.\n', 'email-newsletter'],
  'v1/zap.md': ['Oi! Temos novidade.\n', 'whatsapp-broadcast'],
  'v1/tweet.md': ['Um tweet só.\n', 'twitter-post'],
  'v1/thread.md': ['TWEET 1/2\nPrimeiro.\n\nTWEET 2/2\nSegundo.\n', 'twitter-thread'],
  'v1/foto.png': [png(3), 'twitter-post'],
  'v1/video.md': ['Roteiro do vídeo.\n', 'youtube-script'],
};
// The "Passos por canal" table of the spec (§4), for the files above.
const PASSOS = {
  Instagram: [
    'No computador, abra instagram.com e comece uma publicação nova. Pelo celular, mande os arquivos para ele antes.',
    'Escolha as imagens na ordem dos nomes dos arquivos.',
    'Abra `instagram/legenda.txt`, copie tudo e cole no campo da legenda. As hashtags já estão no fim.',
    'Confira a prévia e publique.',
    '`instagram/reel.md` é para ler e produzir (gravar ou montar os slides): não é texto para colar.',
  ],
  LinkedIn: [
    'No computador, abra linkedin.com e comece uma publicação.',
    'Abra `linkedin/post.txt`, copie tudo e cole.',
    'Anexe as imagens na ordem dos nomes dos arquivos.',
    'Confira e publique.',
    'Depois de publicar, abra `linkedin/post-comentario.txt`, copie e cole como primeiro comentário.',
    'Para o artigo, escolha escrever um artigo no LinkedIn e cole o texto de `linkedin/artigo-longo.md`, seção por seção.',
  ],
  Blog: [
    'Abra o editor do seu blog e crie um post novo.',
    'Abra `blog/seo.txt` e copie cada linha para o campo de mesmo nome (título, meta description).',
    'Abra `blog/artigo.md`, copie tudo e cole no corpo do post.',
    MARKDOWN,
    'Confira a prévia e publique.',
  ],
  'E-mail': [
    'Abra a sua ferramenta de e-mail e crie uma mensagem nova.',
    'Copie o texto de `email/assunto.txt` para o campo do assunto.',
    'Copie o texto de `email/previa.txt` para o campo de prévia (a linha que aparece ao lado do assunto).',
    'Abra `email/corpo.md`, copie tudo e cole no corpo.',
    MARKDOWN,
    'Envie um teste para você antes de enviar para a lista.',
  ],
  WhatsApp: [
    'No computador, abra o WhatsApp Web ou o aplicativo. Pelo celular, mande o arquivo para ele antes.',
    'Abra `whatsapp/mensagem.txt`, copie tudo e cole na conversa ou na lista de transmissão.',
    'Se o texto tiver `{{…}}`, troque pelo dado real, ou confira se a sua ferramenta de envio faz a troca.',
    'Envie primeiro para você, para ver como ficou.',
  ],
  'X/Twitter': [
    'No computador, abra x.com e comece uma publicação.',
    'Para a sequência, cole `twitter/tweet-1.txt`, acrescente outra publicação e cole o arquivo seguinte, na ordem dos números.',
    'Anexe as imagens.',
    'Confira e publique.',
  ],
  YouTube: ['`youtube/video.md` é o roteiro para gravar: não é texto para colar.'],
};

test('U3a-06f: each channel section brings the steps of the table, word for word, numbered in sequence', async (t) => {
  const raiz = await projeto(t, Object.fromEntries(Object.entries(UM_DE_CADA).map(([rel, [conteudo]]) => [rel, conteudo])));
  const r = await entregar(raiz, Object.entries(UM_DE_CADA).map(([rel, [, formato]]) => `${rel}=${formato}`));
  assert.equal(r.fim, 'ENTREGA:OK');
  const md = await leiame(raiz);
  assert.deepEqual(titulos(md).slice(0, 7), Object.keys(PASSOS));
  for (const [canal, esperados] of Object.entries(PASSOS)) {
    const texto = secao(md, canal);
    assert.deepEqual(passos(texto), esperados, canal);
    assert.deepEqual([...texto.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1])), esperados.map((_, i) => i + 1), canal);
  }
});

test('U3a-06f: a step only shows when the file it cites exists — one tweet, a blog with no SEO line, an e-mail with no preview', async (t) => {
  const raiz = await projeto(t, { 'v1/tweet.md': 'Um tweet só.\n', 'v1/blog.md': '## Comece pelo solo\n\nTexto do artigo.\n', 'v1/email.md': '=== SUBJECT LINE ===\nAssunto\n\n=== BODY ===\nCorpo.\n' });
  await entregar(raiz, ['v1/tweet.md=twitter-post', 'v1/blog.md=blog-post', 'v1/email.md=email-sales']);
  const md = await leiame(raiz);
  assert.deepEqual(passos(secao(md, 'X/Twitter')), [PASSOS['X/Twitter'][0], 'Abra `twitter/tweet.txt`, copie tudo e cole.', 'Confira e publique.']);
  assert.deepEqual(passos(secao(md, 'Blog')), PASSOS.Blog.filter((p) => !p.includes('seo.txt')));
  assert.deepEqual(passos(secao(md, 'E-mail')), PASSOS['E-mail'].filter((p) => !p.includes('previa.txt')));
});

test('U3a-06f: with several pieces the step cites the numbered files', async (t) => {
  const posts = [1, 2].map((n) => `## Post LinkedIn ${n}\n\nTexto do post ${n}.\n`).join('\n');
  const raiz = await projeto(t, { 'v1/posts.md': posts });
  await entregar(raiz, ['v1/posts.md=linkedin-post']);
  assert.deepEqual(passos(secao(await leiame(raiz), 'LinkedIn'))[1], 'Abra `linkedin/post-1.txt`, `linkedin/post-2.txt`, copie tudo e cole.');
});
