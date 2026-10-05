// specs/fase-r1-reparos-1-6-1.md — R1-01n to R1-01z and R1-10a to R1-10g: which row of the
// format table applies to each file, and what the report says when nothing was measured.
// Synthetic, neutral text; the numbers are the ones in the scenarios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarRelatorio } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { um, texto, tags, itens, bloqueios, caracteres, naoMedidos, doCanal, par } from './_helpers.js';

test('R1-01n: a blog-seo whose title is only a "# …" heading says "Não medido"; links are counted', async () => {
  const r = await um(`# ${texto(125)}\n\nVeja [o guia](https://exemplo.org/guia).\n`, 'blog-seo');
  const relatorio = formatarRelatorio(r);
  assert.ok(relatorio.includes('⚠️ Não medido — não encontrei o título neste arquivo (formato blog-seo)'));
  assert.deepEqual(itens(r).filter((i) => /^Links/.test(i.item)).map(par), [[0, 3], [1, 2]]);
  assert.equal(r.naoMedidos, 1);
  assert.match(relatorio, /\*\*Resumo: 0 bloqueios, 3 alertas, 1 não medido\*\*/);
  assert.ok(!relatorio.includes('Nada a apontar'));
});

test('R1-01o: no declared format and no finding — "limites não medidos", never a ✅', async () => {
  const r = await um('Um texto simples, sem nada de errado.\n');
  const relatorio = formatarRelatorio(r);
  assert.ok(relatorio.includes('⚪ Nada a apontar nas checagens gerais (formato não informado: limites não medidos)'));
  assert.ok(!relatorio.includes('✅'));
  assert.equal(r.naoMedidos, 0);
  assert.ok(relatorio.includes('**Resumo: 0 bloqueios, 0 alertas, 0 não medidos**'));
});

const SEM_PECA = {
  '"## Legenda" without the channel word': `## Legenda\n\n${texto(2300)}\n`,
  '"## Post" without the channel word': `## Post\n\n${texto(3100)}\n`,
  'a LinkedIn carousel heading': `## Carrossel LinkedIn\n\n${texto(3500)}\n`,
  'BODY and CTA labels without a HOOK': `=== GREETING ===\nOi!\n\n=== BODY ===\n${texto(3500)}\n\n=== CTA ===\n${texto(100)}\n`,
};
for (const [caso, conteudo] of Object.entries(SEM_PECA)) {
  test(`R1-01o: without a declared format nothing is measured in ${caso}`, async () => {
    assert.deepEqual(itens(await um(conteudo)), []);
  });
}

test('R1-01p: a whole "=== TWEET ===" section is one tweet, even with two paragraphs', async () => {
  const r = await um(`=== TWEET ===\n${texto(149)}\n\n${texto(149)}\n`, 'twitter-post');
  assert.deepEqual(bloqueios(r).map(par), [[300, 280]]);
});

test('R1-01p: under a heading each paragraph is a tweet, and a tweet within the limit gives no line', async () => {
  const r = await um(`## Tweets\n\n${texto(200)}\n\n${texto(200)}\n`, 'twitter-post');
  assert.deepEqual(itens(r), []);
  assert.ok(formatarRelatorio(r).includes('✅ Nada a apontar.'));
});

test('R1-01q: a frontmatter title in a declared linkedin-post is not a blog title', async () => {
  const r = await um(`---\ntitle: "${texto(125)}"\n---\n\n## Post\n\n${texto(500)}\n`, 'linkedin-post');
  assert.deepEqual(itens(r).filter((i) => /título|meta description/i.test(i.item)), []);
  assert.deepEqual(caracteres(r).map(par), [[500, 3000]]);
});

test('R1-01r: three "## Legenda N" under "# Legendas para Instagram" are three measurements', async () => {
  const legendas = [1, 2, 3].map((n) => `## Legenda ${n}\n\n${texto(975)}\n`).join('\n');
  const r = await um(`# Legendas para Instagram\n\n${legendas}`);
  assert.deepEqual(caracteres(r).map(par), [[975, 2200], [975, 2200], [975, 2200]]);
  assert.deepEqual(bloqueios(r), []);
});

test('R1-01s: a note "- Slide 3: …" does not count as an eleventh slide', async () => {
  const slides = Array.from({ length: 10 }, (_, i) => `Slide ${i + 1} (Cena):\n  Headline: frase do slide`).join('\n\n');
  const r = await um(`# Carrossel\n\n${slides}\n\nNotas:\n- Slide 3: trocar a foto\n`, 'instagram-feed');
  assert.deepEqual(itens(r).filter((i) => /slides/.test(i.item)).map(par), [[10, 10]]);
  assert.deepEqual(bloqueios(r), []);
});

test('R1-01t: without a declared format, "=== CAPTION ===" is an Instagram caption', async () => {
  const r = await um(`=== CAPTION ===\n${texto(2300)}\n`);
  assert.deepEqual(bloqueios(r).map(par), [[2300, 2200]]);
});

test('R1-01u: two posts written with HOOK … CTA are two measurements, "post 1" and "post 2"', async () => {
  // 100 + blank line (2) + 1396 + blank line (2) + 100 = 1600
  const post = `=== HOOK ===\n${texto(100)}\n\n=== BODY ===\n${texto(1396)}\n\n=== CTA ===\n${texto(100)}\n\n`;
  const r = await um(post.repeat(2), 'linkedin-post');
  assert.deepEqual(caracteres(r).map(par), [[1600, 3000], [1600, 3000]]);
  assert.deepEqual(caracteres(r).map((i) => /post \d/.exec(i.item)?.[0]), ['post 1', 'post 2']);
  assert.deepEqual(bloqueios(r), []);
});

test('R1-01v: twelve "## Slide N" block the carousel; the "## Legenda" inside is measured apart', async () => {
  const slides = Array.from({ length: 12 }, (_, i) => `## Slide ${i + 1}\n\nFrase do slide.\n`).join('\n');
  const r = await um(`# Carrossel\n\n${slides}\n## Legenda\n\n${texto(500)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map(par), [[12, 10]]);
  assert.match(bloqueios(r)[0].item, /slides/);
  assert.deepEqual(caracteres(r).map(par), [[500, 2200]]);
});

test('R1-01v: a heading that is both carousel and caption opens one piece — slides if it has "Slide N" lines, else the caption', async () => {
  // Ten slides of 300 characters: read as a caption too, they would be over 2200.
  const slides = Array.from({ length: 10 }, (_, i) => `## Slide ${i + 1}\n\n${texto(300)}\n`).join('\n');
  const r = await um(`# Carrossel e legenda - tema\n\n${slides}\n## Legenda\n\n${texto(500)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r), []);
  const medidos = [['Carrossel Instagram — slides', 10, 10], ['Legenda Instagram — caracteres', 500, 2200], ['Legenda Instagram — hashtags', 0, 30]];
  assert.deepEqual(itens(r).map((i) => [i.item, ...par(i)]), medidos);
  const semSlide = await um(`# Carrossel e legenda\n\n${texto(2300)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(semSlide).map((i) => [i.item, ...par(i)]), [['Legenda Instagram — caracteres', 2300, 2200]]);
});

test('R1-01v: with no carousel piece, the "Slide N" headings of the file are the carousel — from two numbers on', async () => {
  const slides = Array.from({ length: 12 }, (_, i) => `## Slide ${i + 1}\n\nFrase do slide.\n`).join('\n');
  const r = await um(`${slides}\n## Legenda\n\n${texto(500)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map((i) => [i.item, ...par(i)]), [['Carrossel Instagram (arquivo inteiro) — slides', 12, 10]]);
  assert.deepEqual(caracteres(r).map(par), [[500, 2200]]);
  // One loose "## Slide 1" is not a carousel; and only a declared instagram-feed is read this way.
  const solto = await um('## Slide 1\n\nFrase do slide.\n', 'instagram-feed');
  assert.deepEqual(itens(solto).map((i) => [i.nivel, i.detalhe]), [['alerta', 'não encontrei legenda nem slides neste arquivo (formato instagram-feed)']]);
  assert.deepEqual(itens(await um(slides)), []);
});

test('R1-01w: in a declared instagram-feed, "## Legenda" needs no "Instagram"', async () => {
  const r = await um(`## Legenda\n\n${texto(2300)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map(par), [[2300, 2200]]);
});

test('R1-01w: a heading of the same level ends the section — the notes after the caption are not counted', async () => {
  const r = await um(`## Legenda\n\n${texto(2150)}\n\n## Notas do redator\n\n${texto(200)}\n`, 'instagram-feed');
  assert.deepEqual(caracteres(r).map(par), [[2150, 2200]]);
  assert.deepEqual(bloqueios(r), []);
});

test('R1-01c: a title written as a heading under "=== TITLE ===" is measured without the "# "', async () => {
  const r = await um(`=== TITLE ===\n# ${texto(69)}\n\n=== META DESCRIPTION ===\n${texto(150)}\n`, 'blog-post');
  assert.deepEqual(caracteres(r).map(par), [[69, 70], [150, 160]]);
});

test('R1-01d: INSIGHTS is part of the post, in the order written', async () => {
  // 100 + 2 + 1446 + 2 + 1448 + 2 + 100 = 3100
  const post = `=== HOOK ===\n${texto(100)}\n\n=== BODY ===\n${texto(1446)}\n\n=== INSIGHTS ===\n${texto(1448)}\n\n=== CTA ===\n${texto(100)}\n`;
  assert.deepEqual(bloqueios(await um(post, 'linkedin-post')).map(par), [[3100, 3000]]);
});

test('R1 revisão: the anchor of a URL and an HTML entity are not hashtags', async () => {
  const post = `=== HOOK ===\n${texto(100)}\n\n=== BODY ===\nVeja https://site.com.br/guia#passo-2 e o P&#38;D.\n\n=== HASHTAGS ===\n${tags(5)}\n`;
  const r = await um(post, 'linkedin-post');
  assert.deepEqual(itens(r).filter((i) => /hashtags/.test(i.item)).map(par), [[5, 5]]);
  assert.deepEqual(bloqueios(r), []);
});

test('R1 revisão: a markdown image is not a link; a linked image counts once, by the link', async () => {
  const imagens = '![a](img/a.png) ![b](img/b.png) ![c](img/c.png) ![d](https://cdn.exemplo.org/d.png) ![e](https://cdn.exemplo.org/e.png)';
  const blog = `---\ntitle: "${texto(50)}"\n---\n\n${imagens}\n\n[![selo](img/selo.png)](https://exemplo.org/selo)\n`;
  const r = await um(blog, 'blog-seo');
  assert.deepEqual(itens(r).filter((i) => /^Links/.test(i.item)).map((i) => [i.medido, i.nivel]), [[0, 'alerta'], [1, 'alerta']]);
});

test('R1 revisão: an anchor link ("[índice](#seção)") is neither an internal nor an external link', async () => {
  const blog = `---\ntitle: "${texto(50)}"\n---\n\n[Início](#inicio) · [Preços](#precos) · [Contato](#contato)\n`;
  const links = itens(await um(blog, 'blog-seo')).filter((i) => /^Links/.test(i.item));
  assert.deepEqual(links.map((i) => [i.item, i.medido, i.nivel]), [['Links internos', 0, 'alerta'], ['Links externos', 0, 'alerta']]);
});

test('R1 revisão: a line that is only a code fence is not text of the piece, like the "---" line', async () => {
  for (const [abre, fecha] of [['```', '```'], ['```text', '```'], ['~~~', '~~~']]) {
    const r = await um(`${abre}\n${texto(278)}\n${fecha}\n`, 'twitter-post');
    assert.deepEqual(itens(r).map((i) => [i.item, ...par(i), i.nivel]), [['Tweet (arquivo inteiro) — caracteres', 278, 280, 'ok']], abre);
  }
});

test('R1-01x: a blog-seo title written as "=== TITLE TAG ===" is measured', async () => {
  const blog = `=== TITLE TAG ===\n${texto(80)}\n\n=== META DESCRIPTION ===\n${texto(150)}\n\n=== BODY ===\nCorpo do artigo.\n`;
  const r = await um(blog, 'blog-seo');
  assert.deepEqual(bloqueios(r).map(par), [[80, 60]]);
});

test('R1-01y: a youtube-script with HOOK/BODY/CTA is not a LinkedIn post — "ainda não mede"', async () => {
  // 1000 + 2 + 3000 + 2 + 996 = 5000
  const roteiro = `=== HOOK ===\n${texto(1000)}\n\n=== BODY ===\n${texto(3000)}\n\n=== CTA ===\n${texto(996)}\n`;
  const r = await um(roteiro, 'youtube-script');
  assert.deepEqual(doCanal(r, 'linkedin'), []);
  assert.deepEqual(bloqueios(r), []);
  assert.deepEqual(naoMedidos(r).map((i) => [i.nivel, i.detalhe]), [[null, 'o verificador ainda não mede os limites do formato youtube-script']]);
  assert.ok(formatarRelatorio(r).includes('⚪ Não medido — o verificador ainda não mede os limites do formato youtube-script'));
});

test('R1-01z: a "## Post LinkedIn" section inside a declared instagram-feed is still measured', async () => {
  const r = await um(`## Legenda\n\n${texto(500)}\n\n## Post LinkedIn\n\n${texto(3100)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map(par), [[3100, 3000]]);
  assert.match(bloqueios(r)[0].item, /LinkedIn/);
});

test('R1-10a: the label is compared whole — "=== HOOK (0-30s) ===" is not a LinkedIn hook', async () => {
  const r = await um(`=== HOOK (0-30s) ===\n${texto(5000)}\n`);
  assert.deepEqual(doCanal(r, 'linkedin'), []);
  // Same text under the exact label IS a LinkedIn post: the difference is the label alone.
  const exato = await um(`=== HOOK ===\n${texto(5000)}\n`);
  assert.deepEqual(bloqueios(exato).map(par), [[5000, 3000]]);
});

test('R1-10b: a "## Hashtags" section adds to the caption before it', async () => {
  const r = await um(`## Legenda\n\n${texto(500)}\n\n## Hashtags\n\n${tags(31)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map(par), [[31, 30]]);
  assert.deepEqual(caracteres(r).map(par), [[500, 2200]]);
});

test('R1-10b: a "## Hashtags Instagram" section adds to the Instagram caption, not to the post opened last', async () => {
  const md = `## Legenda Instagram\n\n${texto(900)}\n\n## Post LinkedIn\n\n${texto(1200)}\n\n## Hashtags Instagram\n\n${tags(12)}\n`;
  const r = await um(md);
  const hashtags = itens(r).filter((i) => /hashtags/.test(i.item)).map((i) => [i.item, ...par(i)]);
  assert.deepEqual(hashtags, [['Legenda Instagram — hashtags', 12, 30], ['Post LinkedIn — hashtags', 0, 5]]);
  assert.deepEqual(bloqueios(r), []);
  // No caption to add to: with a declared format they are a piece of their own; without one, ignored.
  const semLegenda = `## Post LinkedIn\n\n${texto(1200)}\n\n## Hashtags Instagram\n\n${tags(12)}\n`;
  const contadas = async (formato) => itens(await um(semLegenda, formato)).filter((i) => /hashtags/.test(i.item)).map((i) => [i.item, ...par(i)]);
  assert.deepEqual(await contadas('linkedin-post'), [['Post LinkedIn — hashtags', 0, 5], ['Instagram — hashtags', 12, 30]]);
  assert.deepEqual(await contadas(), [['Post LinkedIn — hashtags', 0, 5]]);
});

test('R1-10b: a heading that starts with "hashtags" is only hashtags — they add to the caption or post opened last', async () => {
  const hashtags = (r) => itens(r).filter((i) => /hashtags/.test(i.item)).map((i) => [i.item, ...par(i), i.nivel]);
  for (const titulo of ['Hashtags da legenda', 'Hashtags do carrossel']) {
    const r = await um(`## Legenda\n\n${texto(300)}\n\n${tags(20)}\n\n## ${titulo}\n\n${tags(15)}\n`, 'instagram-feed');
    assert.deepEqual(hashtags(r), [['Legenda Instagram — hashtags', 35, 30, 'bloqueio']], titulo);
  }
  const post = await um(`## Post\n\n${texto(300)}\n\n${tags(4)}\n\n## Hashtags do post\n\n${tags(3)}\n`, 'linkedin-post');
  assert.deepEqual(hashtags(post), [['Post LinkedIn — hashtags', 7, 5, 'bloqueio']]);
  // "Legenda e hashtags" does not start with "hashtags": it is still a caption.
  const legenda = await um(`## Legenda e hashtags\n\n${texto(2300)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(legenda).map(par), [[2300, 2200]]);
  // With a channel word, they add to the piece of that channel — never to another channel's.
  const canais = `## Legenda Instagram\n\n${texto(300)}\n\n## Post LinkedIn\n\n${texto(300)}\n\n${tags(4)}\n\n## Tweet\n\n${texto(100)}\n\n`;
  assert.deepEqual(hashtags(await um(`${canais}## Hashtags do tweet\n\n${tags(3)}\n`)), [['Legenda Instagram — hashtags', 0, 30, 'ok'], ['Post LinkedIn — hashtags', 4, 5, 'ok']]);
  assert.deepEqual(hashtags(await um(`${canais}## Hashtags LinkedIn\n\n${tags(3)}\n`)), [['Legenda Instagram — hashtags', 0, 30, 'ok'], ['Post LinkedIn — hashtags', 7, 5, 'bloqueio']]);
});

test('R1-10c: a label line ends the heading section — the caption measures 500', async () => {
  const r = await um(`## Legenda\n\n${texto(500)}\n\n=== HASHTAGS ===\n${tags(31)}\n`, 'instagram-feed');
  assert.deepEqual(caracteres(r).map(par), [[500, 2200]]);
  assert.deepEqual(bloqueios(r).map(par), [[31, 30]]);
});

test('R1-10d: in a blog only the first "=== TITLE ===" counts', async () => {
  const blog = `=== TITLE ===\n${texto(60)}\n\n=== BODY ===\nCorpo do artigo.\n\n=== TITLE ===\n${texto(125)}\n`;
  const r = await um(blog, 'blog-post');
  assert.deepEqual(itens(r).filter((i) => /título/i.test(i.item)).map(par), [[60, 70]]);
  assert.deepEqual(bloqueios(r), []);
});

test('R1-10e: BODY and CTA without HOOK still open the first LinkedIn post', async () => {
  // 2998 + blank line (2) + 100 = 3100
  const r = await um(`=== BODY ===\n${texto(2998)}\n\n=== CTA ===\n${texto(100)}\n`, 'linkedin-post');
  assert.deepEqual(bloqueios(r).map(par), [[3100, 3000]]);
});

test('R1-10f: "## Proposta comercial" is not a post — "proposta" is not "post"', async () => {
  const r = await um(`## Proposta comercial\n\n${texto(300)}\n`, 'linkedin-post');
  assert.deepEqual(caracteres(r), []);
  assert.deepEqual(naoMedidos(r).map((i) => [i.nivel, i.detalhe]), [['alerta', 'não encontrei o post neste arquivo (formato linkedin-post)']]);
});

test('R1-10f: the words match whole on both sides — "Retweet" is not a tweet, "Postagem" is not a post', async () => {
  const tweet = await um(`## Retweet da semana\n\n${texto(400)}\n`, 'twitter-post');
  assert.deepEqual(itens(tweet).map((i) => [i.nivel, i.detalhe]), [['alerta', 'não encontrei o tweet neste arquivo (formato twitter-post)']]);
  const post = await um(`## Postagem\n\n${texto(3100)}\n`, 'linkedin-post');
  assert.deepEqual(itens(post).map((i) => [i.nivel, i.detalhe]), [['alerta', 'não encontrei o post neste arquivo (formato linkedin-post)']]);
});

test('R1-10g: a heading that is a piece ends the label section — the caption measures 500', async () => {
  const r = await um(`=== CAPTION ===\n${texto(500)}\n\n## Post LinkedIn\n\n${texto(3100)}\n`, 'instagram-feed');
  assert.deepEqual(caracteres(r).map(par), [[500, 2200], [3100, 3000]]);
  assert.deepEqual(bloqueios(r).map(par), [[3100, 3000]]);
});
