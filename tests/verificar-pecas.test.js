// specs/fase-r1-reparos-1-6-1.md — R1-01a to R1-01m: the checker recognises what was written,
// in both ways the best-practices teach (markdown headings and `=== LABEL ===` lines).
// Synthetic, neutral text; the numbers are the ones in the scenarios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarRelatorio } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { lerPecas } from '../templates/_opencrew/core/scripts/verificar/pecas.mjs';
import { medir, um, texto, tags, itens, bloqueios, caracteres, naoMedidos, par } from './_helpers.js';

test('R1-01a: labelled Instagram caption of 2300 and 31 hashtags give two blocks', async () => {
  const r = await um(`=== CAPTION ===\n${texto(2300)}\n\n=== HASHTAGS ===\n${tags(31)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map(par), [[2300, 2200], [31, 30]]);
  assert.equal(r.status, 'BLOQUEADA');
});

const ESCRITAS = {
  '"Slide N (Cover):" lines': (n) => `Slide ${n} (Cena):\n  Headline: frase do slide`,
  '"## Slide N" headings': (n) => `## Slide ${n}\n\nFrase do slide.`,
  '"**Slide N**" in bold': (n) => `**Slide ${n}**\n\nFrase do slide.`,
  'slides separated by ---': (n) => `Slide ${n}\nFrase do slide.\n\n---`,
  '"- Slide N:" list items': (n) => `- Slide ${n}: frase do slide`,
  '"### 📌 Slide N" headings with an emoji': (n) => `### 📌 Slide ${n}\n\nFrase do slide.`,
  '"> **[Slide #N]**" with symbols before and a "#"': (n) => `> **[Slide #${n}]** frase do slide`,
  '"| Slide N |" table rows': (n) => `| Slide ${n} | Frase do slide |`,
};
const RECIPIENTES = { 'under "# Carrossel"': '# Carrossel\n\n', 'in "=== SLIDES ==="': '=== SLIDES ===\n' };

for (const [escrita, slide] of Object.entries(ESCRITAS)) {
  for (const [onde, abertura] of Object.entries(RECIPIENTES)) {
    test(`R1-01b: a 12-slide carousel is blocked 12/10 — ${escrita}, ${onde}`, async () => {
      const corpo = Array.from({ length: 12 }, (_, i) => slide(i + 1)).join('\n\n');
      const r = await um(`${abertura}${corpo}\n`, 'instagram-feed');
      assert.deepEqual(bloqueios(r).map(par), [[12, 10]]);
      assert.match(bloqueios(r)[0].item, /slides/);
    });
  }
}

// A "Slide N" heading is a slide, whatever comes after the number (piece or channel words too).
const TITULOS = { 2: ' — Legendas que vendem', 5: ' — O carrossel perfeito', 7: ' — Hashtags certas', 9: ' — Instagram não é LinkedIn' };
for (const [onde, abertura] of Object.entries(RECIPIENTES)) {
  for (const marca of ['', '📌 ']) {
    test(`R1-01b: a "## ${marca}Slide N" heading with a piece or channel word is still a slide — ${onde}`, async () => {
      const corpo = Array.from({ length: 12 }, (_, i) => `## ${marca}Slide ${i + 1}${TITULOS[i + 1] ?? ''}\n\nFrase do slide.`).join('\n\n');
      const r = await um(`${abertura}${corpo}\n`, 'instagram-feed');
      assert.deepEqual(itens(r).map((i) => [i.item, ...par(i)]), [['Carrossel Instagram — slides', 12, 10]]);
    });
  }
}

test('R1-01b: a heading with the singular "slide" is not a carousel — the count goes on under it', async () => {
  const slides = (de, ate) => Array.from({ length: ate - de + 1 }, (_, i) => `Slide ${de + i}: frase do slide`).join('\n\n');
  const r = await um(`# Carrossel\n\n${slides(1, 6)}\n\n## Nota sobre o slide 6\n\n${slides(7, 12)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(r).map(par), [[12, 10]]);
});

test('R1-01c: a blog without frontmatter is measured by its TITLE and META DESCRIPTION labels', async () => {
  const blog = `=== TITLE ===\n${texto(125)}\n\n=== META DESCRIPTION ===\n${texto(218)}\n\n=== BODY ===\nCorpo do artigo.\n`;
  const r = await um(blog, 'blog-post');
  assert.deepEqual(bloqueios(r).map(par), [[125, 70], [218, 160]]);
  assert.match(bloqueios(r)[0].item, /título/i);
  assert.match(bloqueios(r)[1].item, /meta/i);
});

test('R1-01d: HOOK + BODY + CTA joined (3100) and 6 hashtags give two LinkedIn blocks', async () => {
  // 100 + blank line (2) + 2896 + blank line (2) + 100 = 3100
  const post = `=== HOOK ===\n${texto(100)}\n\n=== BODY ===\n${texto(2896)}\n\n=== CTA ===\n${texto(100)}\n\n=== HASHTAGS ===\n${tags(6)}\n`;
  const r = await um(post, 'linkedin-post');
  assert.deepEqual(bloqueios(r).map(par), [[3100, 3000], [6, 5]]);
  // The piece reader is its own module (the delivery phase imports it): text + format in, pieces out.
  const pecas = lerPecas(post, 'linkedin-post');
  assert.deepEqual(pecas.map((p) => [p.tipo, p.formato, p.origem, p.ordem]), [['post', 'linkedin-post', 'rotulo', 1], ['hashtags', 'linkedin-post', 'rotulo', 1]]);
  assert.equal(pecas[0].texto, `${texto(100)}\n\n${texto(2896)}\n\n${texto(100)}`);
  assert.equal(pecas[1].texto, tags(6));
});

test('R1-01e: an instagram-feed file with no caption nor slide says "Não medido" as an alert', async () => {
  const r = await um('Um texto qualquer, sem peça reconhecível.\n', 'instagram-feed');
  const relatorio = formatarRelatorio(r);
  assert.ok(relatorio.includes('⚠️ Não medido — não encontrei legenda nem slides neste arquivo (formato instagram-feed)'));
  assert.ok(relatorio.includes('**Resumo: 0 bloqueios, 1 alerta, 1 não medido**'));
  assert.deepEqual([r.alertas, r.naoMedidos], [1, 1]);
  assert.ok(!relatorio.includes('Nada a apontar'));
  assert.equal(r.status, 'OK');
  assert.equal(relatorio.split('\n').at(-1), 'VERIFICACAO:OK');
});

test('R1-01e: the caption alone is a main piece; hashtags alone or a SLIDES label without "Slide N" are not', async () => {
  const soLegenda = await um(`## Legenda\n\n${texto(500)}\n`, 'instagram-feed');
  assert.deepEqual(naoMedidos(soLegenda), []);
  assert.ok(formatarRelatorio(soLegenda).includes('✅ Nada a apontar.'));
  const ALERTA = [['alerta', 'não encontrei legenda nem slides neste arquivo (formato instagram-feed)']];
  const soHashtags = await um(`=== HASHTAGS ===\n${tags(31)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(soHashtags).map(par), [[31, 30]]);
  assert.deepEqual(naoMedidos(soHashtags).map((i) => [i.nivel, i.detalhe]), ALERTA);
  const semSlide = await um('=== SLIDES ===\n1. Capa\n2. Problema\n', 'instagram-feed');
  assert.deepEqual(itens(semSlide).map((i) => [i.nivel, i.detalhe]), ALERTA);
});

test('R1-01f: in the same call each file is measured by its own declared format', async () => {
  const r = await medir([
    ['post.md', `---\ntitle: "${texto(65)}"\nmeta_description: "${texto(150)}"\n---\n\nCorpo do artigo.\n`, 'blog-seo'],
    ['legendas.md', `=== CAPTION ===\n${texto(2300)}\n`, 'instagram-feed'],
  ]);
  const doArquivo = (i) => r.arquivos[i].itens.filter((x) => x.nivel === 'bloqueio').map(par);
  assert.deepEqual(doArquivo(0), [[65, 60]]);
  assert.deepEqual(doArquivo(1), [[2300, 2200]]);
});

test('R1-01g: a parent heading does not add up its three LinkedIn posts — three measurements', async () => {
  const post = `## LinkedIn — Post\n\n${texto(1200)}\n\n`;
  const r = await um(`# LinkedIn — semana\n\n${post.repeat(3)}`);
  const posts = caracteres(r);
  assert.deepEqual(posts.map(par), [[1200, 3000], [1200, 3000], [1200, 3000]]);
  posts.forEach((p, i) => assert.ok(p.item.includes(`post ${i + 1}`) && p.item.includes('LinkedIn — Post'), p.item));
  assert.deepEqual(bloqueios(r), []);
  const lidas = lerPecas(`# LinkedIn — semana\n\n${post.repeat(3)}`).filter((p) => p.tipo === 'post');
  assert.deepEqual(lidas.map((p) => [p.origem, p.cabecalho, p.ordem, p.texto.length]), [1, 2, 3].map((n) => ['cabecalho', 'LinkedIn — Post', n, 1200]));
});

test('R1-01h: hashtags after a --- line still belong to the caption; the --- line is not counted', async () => {
  const [legenda, marcadas] = [texto(500), tags(31)];
  const r = await um(`## Legenda Instagram\n\n${legenda}\n\n---\n\n${marcadas}\n`);
  assert.deepEqual(bloqueios(r).map(par), [[31, 30]]);
  // The three dashes and their line break are gone: text + 3 line breaks + hashtags.
  assert.equal(caracteres(r)[0].medido, legenda.length + 3 + marcadas.length);
});

test('R1-01i: a file starting with a BOM still has its frontmatter title measured', async () => {
  const bom = String.fromCharCode(0xfeff);
  const r = await um(`${bom}---\ntitle: "${texto(125)}"\n---\n\nCorpo do artigo.\n`);
  assert.deepEqual(bloqueios(r).map(par), [[125, 70]]);
});

test('R1-01i: a file saved as UTF-16, with its mark, is decoded and measured like any other', async () => {
  const le = Buffer.from(`${String.fromCharCode(0xfeff)}## Legenda\n\n${texto(2300)}\n`, 'utf16le'); // starts with FF FE
  const be = Buffer.from(le).swap16(); // starts with FE FF
  for (const bytes of [le, be]) {
    const r = await um(bytes, 'instagram-feed');
    assert.deepEqual(bloqueios(r).map(par), [[2300, 2200]]);
    assert.deepEqual(r.naoTexto, []);
  }
});

test('R1-01i: the frontmatter keys "titulo" and "meta_descricao" are measured like the English ones', async () => {
  const r = await um(`---\ntitulo: "${texto(125)}"\nmeta_descricao: "${texto(218)}"\n---\n\nCorpo do artigo.\n`, 'blog-post');
  assert.deepEqual(bloqueios(r).map(par), [[125, 70], [218, 160]]);
});

for (const marca of ['>-', '|']) {
  test(`R1 revisão: a frontmatter value written as a YAML block ("${marca}") is measured whole`, async () => {
    const fm = `---\ntitle: "${texto(50)}"\nmeta_description: ${marca}\n  ${texto(109)}\n  ${texto(108)}\n---\n\nCorpo do artigo.\n`;
    assert.deepEqual(bloqueios(await um(fm, 'blog-post')).map(par), [[218, 160]]);
  });
}

test('R1 revisão: a frontmatter value in quotes that continues on the next line is measured whole', async () => {
  const r = await um(`---\ntitle: "${texto(62)}\n  ${texto(62)}"\nmeta_description: "${texto(150)}"\n---\n\nCorpo do artigo.\n`, 'blog-post');
  assert.deepEqual(caracteres(r).map(par), [[125, 70], [150, 160]]);
});

test('R1 revisão: a first line "---" used as a separator is not frontmatter — the text is still measured', async () => {
  // Not YAML: a line of prose (even after a "key: value" line), or no key at all (a list).
  for (const bloco of [`Tema: semana do cliente\n${texto(3100)}`, `- ${texto(1550)}\n- ${texto(1550)}`]) {
    const post = await um(`---\n${bloco}\n---\n\n${tags(3)}\n`, 'linkedin-post');
    assert.deepEqual(bloqueios(post).map((i) => [i.item, i.limite]), [['Post LinkedIn (arquivo inteiro) — caracteres', 3000]]);
  }
  const legenda = await um(`---\n=== CAPTION ===\n${texto(2300)}\n---\n=== HASHTAGS ===\n${tags(3)}\n`, 'instagram-feed');
  assert.deepEqual(bloqueios(legenda).map(par), [[2300, 2200]]);
});

test('R1-01j: a linkedin-post file with only the text is one post — "(arquivo inteiro)"', async () => {
  const r = await um(`${texto(3100)}\n`, 'linkedin-post');
  assert.deepEqual(bloqueios(r).map(par), [[3100, 3000]]);
  assert.ok(bloqueios(r)[0].item.includes('(arquivo inteiro)'));
});

test('R1-01j: a .txt file is searched for pieces like a .md', async () => {
  const r = await medir([['post.txt', `${texto(3100)}\n`, 'linkedin-post']]);
  assert.deepEqual(bloqueios(r).map((i) => [i.item, ...par(i)]), [['Post LinkedIn (arquivo inteiro) — caracteres', 3100, 3000]]);
});

test('R1-01j: a twitter-post file with only the text is one tweet — "(arquivo inteiro)"', async () => {
  const r = await um(`${texto(149)}\n\n${texto(149)}\n`, 'twitter-post');
  assert.deepEqual(bloqueios(r).map(par), [[300, 280]]);
  assert.ok(bloqueios(r)[0].item.includes('(arquivo inteiro)'));
});

test('R1-01k: a post is measured without the comment section inside it, which is measured apart', async () => {
  const md = `## LinkedIn — Post 1\n\n${texto(3100)}\n\n### Primeiro comentário do post\n\n${texto(200)}\n`;
  const r = await um(md, 'linkedin-post');
  assert.deepEqual(caracteres(r).map(par), [[3100, 3000], [200, 3000]]);
  assert.deepEqual(bloqueios(r).map(par), [[3100, 3000]]);
  assert.ok(caracteres(r)[1].item.includes('Primeiro comentário do post'));
});

test('R1-01l: declared instagram-reels — the "Legenda Instagram" section is still measured', async () => {
  const r = await um(`## Legenda Instagram\n\n${texto(2300)}\n`, 'instagram-reels');
  assert.deepEqual(bloqueios(r).map(par), [[2300, 2200]]);
  assert.deepEqual(naoMedidos(r), [], 'a piece was measured: no "ainda não mede" line');
});

test('R1-01l: declared twitter-thread — the "Thread Twitter" section is still measured', async () => {
  const r = await um(`## Thread Twitter\n\n${texto(400)}\n`, 'twitter-thread');
  assert.deepEqual(bloqueios(r).map(par), [[400, 280]]);
  assert.deepEqual(naoMedidos(r), []);
});

test('R1-01l: in a format outside the table a "=== LABEL ===" line is plain text — it does not end the heading section', async () => {
  const r = await um(`# Thread Twitter\n\n=== THREAD ===\n\n${texto(331)}\n`, 'twitter-thread');
  assert.deepEqual(bloqueios(r).map(par), [[331, 280]]);
  assert.deepEqual(naoMedidos(r), []);
});

const FM_BLOG = `---\ntitle: "${texto(55)}"\nmeta_description: "${texto(150)}"\n---\n\n`;

test('R1-01m: in a declared blog a heading is content — "Como postar no LinkedIn" is not a post', async () => {
  const r = await um(`${FM_BLOG}## Como postar no LinkedIn\n\n${texto(3500)}\n`, 'blog-seo');
  assert.deepEqual(itens(r).filter((i) => /linkedin/i.test(i.item)), []);
  assert.deepEqual(bloqueios(r), []);
  assert.deepEqual(caracteres(r).map(par), [[55, 60], [150, 160]]);
});

for (const formato of ['blog-seo', 'blog-post']) {
  test(`R1-01m: a section of another channel in a declared ${formato} is not measured, and the report says so`, async () => {
    const r = await um(`${FM_BLOG}## Legenda Instagram\n\n${texto(2300)}\n\n## Hashtags\n\n${tags(31)}\n\n## Conclusão\n\nFim.\n`, formato);
    const relatorio = formatarRelatorio(r);
    assert.deepEqual(bloqueios(r), []);
    assert.deepEqual(naoMedidos(r).map((i) => [i.nivel, i.detalhe]), [[null, 'seção de outro canal num arquivo de blog: Legenda Instagram']]);
    assert.ok(relatorio.includes('- ⚪ Não medido — seção de outro canal num arquivo de blog: Legenda Instagram'));
    assert.match(relatorio, /\*\*Resumo: 0 bloqueios, \d alertas?, 1 não medido\*\*/);
    assert.ok(!relatorio.includes('Nada a apontar'));
  });
}
