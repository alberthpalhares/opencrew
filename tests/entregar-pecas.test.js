// specs/fase-u3a1-pasta-de-entrega.md — U3a-03, the pieces of the social channels: caption,
// post, first comment and tweets, as text ready to paste (rules 4, 6, 7 and 8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texto, tags } from './_helpers.js';
import { EXEC, arvore, bytes, entregar, existe, leiame, ler, projeto, secao } from './_entrega.js';

const TEXTO_DA_LEGENDA = 'Legenda da semana.\nSegunda linha, com um emoji 🌱.';
const ESPERADA = `${TEXTO_DA_LEGENDA}\n\n#horta #casa\n`;
const EM_ROTULOS = `=== FORMAT ===\nCarrossel de 2 slides\n\n=== SLIDES ===\nSlide 1: Capa do carrossel\nSlide 2: Dica do dia\n\n=== CAPTION ===\n${TEXTO_DA_LEGENDA}\n\n=== HASHTAGS ===\n#horta #casa\n`;

/** One file, `v1/saida.md`, delivered with its declared format. */
async function um(t, conteudo, formato, nome = 'saida.md') {
  const raiz = await projeto(t, { [`v1/${nome}`]: conteudo });
  const r = await entregar(raiz, [`v1/${nome}=${formato}`]);
  return { raiz, r };
}

test('U3a-03a: labelled caption and hashtags become legenda.txt — caption, a blank line, the hashtags', async (t) => {
  const { raiz } = await um(t, EM_ROTULOS, 'instagram-feed');
  const legenda = await ler(raiz, 'instagram/legenda.txt');
  assert.equal(legenda, ESPERADA);
  assert.doesNotMatch(legenda, /===|Slide|Carrossel/);
  assert.equal(await existe(raiz, 'instagram/hashtags.txt'), false);
});

test('U3a-03b: the same caption under "## Legenda", hashtags at its end, gives the same bytes', async (t) => {
  const a = await um(t, EM_ROTULOS, 'instagram-feed');
  const b = await um(t, `## Legenda\n\n${TEXTO_DA_LEGENDA}\n\n#horta #casa\n`, 'instagram-feed');
  assert.deepEqual(await bytes(b.raiz, 'instagram/legenda.txt'), await bytes(a.raiz, 'instagram/legenda.txt'));
});

test('U3a-03v: "## Legenda" then "## Hashtags" — the hashtags go to the end, without the heading line', async (t) => {
  const { raiz } = await um(t, '## Legenda\n\nLegenda da semana.\n\n## Hashtags\n\n#a1 #b2 #c3 #d4 #e5\n', 'instagram-feed');
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), 'Legenda da semana.\n\n#a1 #b2 #c3 #d4 #e5\n');
});

test('U3a-03w: a level-1 title above "## Legenda" does not become a second legenda file', async (t) => {
  const h1 = `# Legenda — Dia das Mães\n\nRascunho aprovado em reunião.\n\n## Legenda\n\n${texto(500)}\n\n## Hashtags\n\n${tags(5)}\n`;
  const { raiz, r } = await um(t, h1, 'instagram-feed');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/legenda.txt']);
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), `${texto(500)}\n\n${tags(5)}\n`);
});

test('U3a-03c: bold, italic and a link leave the text; @user, #hashtag and the URL keep their underscores', async (t) => {
  const { raiz } = await um(t, '**Promoção** de _verão_ com @ana__lima, #meu_negocio e [o site](https://exemplo.org/a__b)\n', 'linkedin-post');
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Promoção de verão com @ana__lima, #meu_negocio e o site: https://exemplo.org/a__b\n');
});

test('U3a-03c: an e-mail address, a URL, a file name and a multiplication come out untouched', async (t) => {
  const linha = 'Fale com ana_maria_lima@exemplo.org, veja https://exemplo.org/?utm_source=a_b&utm_medium=c_d, abra relatorio_final_2026 e calcule 2 * 3 * 4';
  const { raiz } = await um(t, `${linha}\n`, 'linkedin-post');
  assert.equal(await ler(raiz, 'linkedin/post.txt'), `${linha}\n`);
});

test('U3a-03c: a marker only leaves in pairs glued to the text; __bold__ and *italic* leave too', async (t) => {
  const { raiz } = await um(t, 'Um __destaque__ e um *realce*; 5 * 2 e a_b ficam, e ** solto ** também.\n', 'linkedin-post');
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Um destaque e um realce; 5 * 2 e a_b ficam, e ** solto ** também.\n');
});

test('U3a-03d: a post and a blog in CRLF with BOM come out in UTF-8 without BOM, with LF, same words', async (t) => {
  const bom = String.fromCharCode(0xfeff);
  const post = `${bom}Primeira linha do post.\r\n\r\nSegunda linha, com acentuação.\r\n`;
  const blog = `${bom}---\r\ntitle: "Horta"\r\n---\r\n\r\nPrimeira linha do artigo.\r\n\r\nSegunda linha.\r\n`;
  const raiz = await projeto(t, { 'v1/post.md': post, 'v1/blog.md': blog });
  await entregar(raiz, ['v1/post.md=linkedin-post', 'v1/blog.md=blog-post']);
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Primeira linha do post.\n\nSegunda linha, com acentuação.\n');
  assert.equal(await ler(raiz, 'blog/artigo.md'), 'Primeira linha do artigo.\n\nSegunda linha.\n');
  for (const rel of ['linkedin/post.txt', 'blog/artigo.md', 'blog/seo.txt', 'LEIA-ME.md']) {
    const b = await bytes(raiz, rel);
    assert.notDeepEqual([...b.subarray(0, 3)], [0xef, 0xbb, 0xbf], `${rel}: no BOM`);
    assert.ok(!b.includes(0x0d), `${rel}: LF only`);
  }
});

const bloco = (n, tema) => `## Semana ${n} — ${tema}\n\n### Post LinkedIn\n\nTexto do post ${n}.\n\n### Primeiro comentário\n\nLink ${n}: https://exemplo.org/${n}\n`;

test('U3a-03e: three posts, each followed by a first comment, are numbered and listed with the block title', async (t) => {
  const { raiz, r } = await um(t, [bloco(1, 'Lançamento'), bloco(2, 'Bastidores'), bloco(3, 'Resultado')].join('\n'), 'linkedin-post');
  assert.equal(r.fim, 'ENTREGA:OK');
  const nomes = [1, 2, 3].flatMap((n) => [`linkedin/post-${n}-comentario.txt`, `linkedin/post-${n}.txt`]);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', ...nomes]);
  assert.equal(await ler(raiz, 'linkedin/post-2.txt'), 'Texto do post 2.\n');
  assert.equal(await ler(raiz, 'linkedin/post-2-comentario.txt'), 'Link 2: https://exemplo.org/2\n');
  const linhas = secao(await leiame(raiz), 'LinkedIn').split('\n');
  for (const [n, tema] of [[1, 'Lançamento'], [2, 'Bastidores'], [3, 'Resultado']]) {
    for (const nome of [`post-${n}.txt`, `post-${n}-comentario.txt`]) {
      assert.ok(linhas.find((l) => l.includes(`\`linkedin/${nome}\``))?.includes(`Semana ${n} — ${tema}`), nome);
    }
  }
});

test('U3a-03e: one post gives post.txt, with no number; the comment leaves the text of the post', async (t) => {
  const { raiz } = await um(t, '## Post LinkedIn\n\nTexto do post.\n\n### Primeiro comentário\n\nO link vai aqui.\n', 'linkedin-post');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'linkedin/post-comentario.txt', 'linkedin/post.txt']);
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Texto do post.\n');
  assert.equal(await ler(raiz, 'linkedin/post-comentario.txt'), 'O link vai aqui.\n');
});

test('U3a-03e: labelled post — HOOK, BODY and CTA joined, hashtags at the end, the comment apart', async (t) => {
  const rotulos = '=== HOOK ===\nAbertura.\n\n=== BODY ===\nMeio do **post**.\n\n=== CTA ===\nComente aqui.\n\n=== HASHTAGS ===\n#horta #casa\n\n## Comentário fixado\n\nO link vai aqui.\n';
  const { raiz } = await um(t, rotulos, 'linkedin-post');
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Abertura.\n\nMeio do post.\n\nComente aqui.\n\n#horta #casa\n');
  assert.equal(await ler(raiz, 'linkedin/post-comentario.txt'), 'O link vai aqui.\n');
});

const THREAD = `=== THREAD ===\n${[1, 2, 3, 4, 5].map((n) => `TWEET ${n}/5${n === 1 ? ' (Hook):' : ':'}\nTexto do tweet ${n}.\nSegunda linha do ${n}.`).join('\n\n')}\n\n=== THREAD NOTES ===\nPublicar às 9h.\n`;

test('U3a-03f: a thread of five "TWEET n/5" blocks gives five files, without the block line and the notes', async (t) => {
  const { raiz, r } = await um(t, THREAD, 'twitter-thread');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', ...[1, 2, 3, 4, 5].map((n) => `twitter/tweet-${n}.txt`)]);
  for (const n of [1, 2, 3, 4, 5]) assert.equal(await ler(raiz, `twitter/tweet-${n}.txt`), `Texto do tweet ${n}.\nSegunda linha do ${n}.\n`);
});

test('U3a-03f: a thread with no "TWEET n/N" block is read like a twitter-post; the hashtags go to the first tweet', async (t) => {
  const { raiz } = await um(t, '## Thread Twitter\n\nPrimeiro tweet.\n\nSegundo tweet.\n\n## Hashtags\n\n#horta\n', 'twitter-thread');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'twitter/tweet-1.txt', 'twitter/tweet-2.txt']);
  assert.equal(await ler(raiz, 'twitter/tweet-1.txt'), 'Primeiro tweet.\n\n#horta\n');
  assert.equal(await ler(raiz, 'twitter/tweet-2.txt'), 'Segundo tweet.\n');
});

test('U3a-03l: an instagram-feed file with no caption (headings, none of them a caption) goes whole to instagram/, and the LEIA-ME says so', async (t) => {
  const inteiro = '# Rascunho\r\n\r\nUm texto qualquer, **sem** peça reconhecível.\r\n';
  const { raiz, r } = await um(t, inteiro, 'instagram-feed', 'rascunho.md');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await bytes(raiz, 'instagram/rascunho.md'), Buffer.from(inteiro));
  const aviso = `Não encontrei a legenda em ${EXEC}/v1/rascunho.md. Confira antes de colar.`;
  assert.ok(secao(await leiame(raiz), 'Instagram').includes(aviso));
  assert.ok(r.saida.includes(aviso));
});

test('U3a-03m-f1: a section of another channel is not split — there is a warning, with the source file', async (t) => {
  const { raiz, r } = await um(t, '## Legenda Instagram\n\nLegenda da semana.\n\n## Post LinkedIn\n\nTexto do post.\n', 'instagram-feed', 'misto.md');
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), 'Legenda da semana.\n');
  assert.equal(await existe(raiz, 'linkedin'), false);
  const aviso = `${EXEC}/v1/misto.md tem uma seção de outro canal (Post LinkedIn) que não foi separada. Ela continua no arquivo de origem.`;
  assert.ok(secao(await leiame(raiz), 'Instagram').includes(aviso));
  assert.ok(r.saida.includes(aviso));
  assert.doesNotMatch(await leiame(raiz), /## LinkedIn/);
});

test('U3a-03t: a heading loses its #, the --- line leaves, the list item stays, a bare link shows once', async (t) => {
  const post = '## Post LinkedIn\n\nAbertura do post.\n\n### Três passos\n\n---\n\n- primeiro passo\n> uma citação\n\n[https://exemplo.org](https://exemplo.org)\n';
  const { raiz } = await um(t, post, 'linkedin-post');
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Abertura do post.\n\nTrês passos\n\n- primeiro passo\n> uma citação\n\nhttps://exemplo.org\n');
});

test('U3a-03s: caption and slides with no image in the list — legenda.txt and the source file, whole', async (t) => {
  const { raiz, r } = await um(t, EM_ROTULOS, 'instagram-feed', 'carrossel.md');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/carrossel.md', 'instagram/legenda.txt']);
  assert.deepEqual(await bytes(raiz, 'instagram/carrossel.md'), Buffer.from(EM_ROTULOS));
  assert.ok(!r.saida.includes('Não encontrei'));
});

test('U3a-03s: the same list with an image of the format — the source file is not in instagram/', async (t) => {
  const raiz = await projeto(t, { 'v1/carrossel.md': EM_ROTULOS, 'v1/slide-01.png': Buffer.from([1, 2, 3]) });
  await entregar(raiz, ['v1/carrossel.md=instagram-feed', 'v1/slide-01.png=instagram-feed']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/legenda.txt', 'instagram/slide-01.png']);
});
