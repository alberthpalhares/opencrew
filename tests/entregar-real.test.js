// specs/fase-u3a1-pasta-de-entrega.md — the adjustments of the real run ("ajuste da execução
// real", §4 and §6): what a non-technical reader of the LEIA-ME needed and did not find there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLOG, EXEC, LEGENDA, entregar, existe, leiame, ler, png, projeto, passos, secao } from './_entrega.js';

const ANTES = 'Antes de postar, resolva o que está em Pendências. Corrija no arquivo de origem e peça para montar a entrega de novo: o que você mudar nesta pasta se perde.';
// Since 1.9.0 (specs/fase-u3a2-entrega-no-projeto.md, §6) the warning names the source file.
const FORA = (blocos, origem) => `Ficou fora do texto para colar: ${blocos}. Veja no arquivo de origem, \`${EXEC}/${origem}\`.`;
const vezes = (texto, trecho) => texto.split(trecho).length - 1;

test('U3a (real): a channel that is not ready opens its steps with "resolve the pending items first"; a ready one does not', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': 'Ligue para nós: [PREENCHER: telefone]\n', 'v1/blog.md': BLOG });
  const r = await entregar(raiz, ['v1/post.md=linkedin-post', 'v1/blog.md=blog-post']);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  const md = await leiame(raiz);
  const linkedin = secao(md, 'LinkedIn');
  assert.deepEqual(passos(linkedin), [ANTES, 'No computador, abra linkedin.com e comece uma publicação.', 'Abra `linkedin/post.txt`, copie tudo e cole.', 'Confira e publique.']);
  assert.deepEqual([...linkedin.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1])), [1, 2, 3, 4], 'numbered again, in sequence');
  assert.equal(vezes(md, ANTES), 1, 'only in the channel that is not ready');
  assert.equal(passos(secao(md, 'Blog'))[0], 'Abra o editor do seu blog e crie um post novo.');
});

const SEO = (campos) => `Abra \`blog/seo.txt\` e copie cada linha para o campo de mesmo nome (${campos}).`;

test('U3a (real): the blog step cites only the fields that are in the seo.txt of that delivery', async (t) => {
  const raiz = await projeto(t, { 'v1/blog.md': BLOG });
  await entregar(raiz, ['v1/blog.md=blog-post']);
  assert.equal(await ler(raiz, 'blog/seo.txt'), 'Título: Como cuidar da horta\nMeta description: Guia simples para começar uma horta em casa.\n');
  assert.equal(passos(secao(await leiame(raiz), 'Blog'))[1], SEO('título, meta description'));
});

test('U3a (real): a seo.txt with the four fields — the step cites the four', async (t) => {
  const completo = BLOG.replace('---\n\n', 'keyword: "horta em casa"\nslug: "como-cuidar-da-horta"\n---\n\n');
  const raiz = await projeto(t, { 'v1/blog.md': completo });
  await entregar(raiz, ['v1/blog.md=blog-post']);
  assert.equal((await ler(raiz, 'blog/seo.txt')).split('\n').length, 5, 'four lines and the final line break');
  assert.equal(passos(secao(await leiame(raiz), 'Blog'))[1], SEO('título, meta description, palavra-chave, slug'));
});

const NOTAS = `${BLOG}\n=== POST NOTES ===\nInserir o link da loja no segundo parágrafo.\nImagem depois da introdução.\n`;
const CARROSSEL = '=== FORMAT ===\nCarrossel de 2 slides\n\n=== SLIDES ===\nSlide 1: Capa do carrossel\nSlide 2: Dica do dia\n\n=== CAPTION ===\nLegenda da semana.\n\n=== HASHTAGS ===\n#horta #casa\n';

test('U3a (real): a block that does not reach the text to paste is named in "Atenção:", once for each file', async (t) => {
  const raiz = await projeto(t, { 'v1/blog.md': NOTAS, 'v1/legenda.md': CARROSSEL, 'v1/slide-01.png': png(1) });
  const r = await entregar(raiz, ['v1/blog.md=blog-post', 'v1/legenda.md=instagram-feed', 'v1/slide-01.png=instagram-feed']);
  assert.equal(r.fim, 'ENTREGA:OK', 'a warning, not a pending item');
  const md = await leiame(raiz);
  assert.match(secao(md, 'Blog'), new RegExp(`^Atenção:\\n- ${FORA('POST NOTES', 'v1/blog.md').replace(/\./g, '\\.')}$`, 'm'));
  assert.match(secao(md, 'Instagram'), new RegExp(`^Atenção:\\n- ${FORA('FORMAT, SLIDES', 'v1/legenda.md').replace(/\./g, '\\.')}$`, 'm'));
  assert.equal(vezes(md, 'Ficou fora do texto para colar'), 2, 'one warning for each file');
  // What is delivered does not change: the notes stay out of the article, the caption is the caption.
  assert.ok(!(await ler(raiz, 'blog/artigo.md')).includes('Inserir o link'));
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), 'Legenda da semana.\n\n#horta #casa\n');
  assert.ok(!(await existe(raiz, 'instagram/legenda.md')));
  // On the screen the warning names the source file.
  assert.ok(r.linhas.includes(`- ${EXEC}/v1/blog.md: ficou fora do texto para colar: POST NOTES. Veja no arquivo de origem.`), r.saida);
  assert.ok(r.linhas.includes(`- ${EXEC}/v1/legenda.md: ficou fora do texto para colar: FORMAT, SLIDES. Veja no arquivo de origem.`), r.saida);
});

test('U3a (real): no warning when every block went in, nor when the source file was delivered whole', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA, 'v1/blog.md': BLOG, 'v2/legenda.md': CARROSSEL });
  await entregar(raiz, ['v1/legenda.md=instagram-feed', 'v1/blog.md=blog-post']);
  assert.ok(!(await leiame(raiz)).includes('Ficou fora'));
  // Caption and slides with no image in the list (U3a-03s): the whole file is in the delivery.
  const r = await entregar(raiz, ['v2/legenda.md=instagram-feed']);
  assert.ok(await existe(raiz, 'instagram/legenda.md'));
  assert.ok(!(await leiame(raiz)).includes('Ficou fora') && !r.saida.includes('ficou fora'), r.saida);
});

test('U3a (real): a script (roteiro) that loses its notes block says so', async (t) => {
  const raiz = await projeto(t, { 'v1/artigo.md': '=== SECTION 1: Por que mudar ===\nPorque o mercado mudou.\n\n=== ARTICLE NOTES ===\nRevisar os números.\n' });
  await entregar(raiz, ['v1/artigo.md=linkedin-article']);
  assert.ok(!(await ler(raiz, 'linkedin/artigo.md')).includes('Revisar'));
  assert.ok(secao(await leiame(raiz), 'LinkedIn').includes(`- ${FORA('ARTICLE NOTES', 'v1/artigo.md')}`));
});

const SEM_CANAL = ' — sem canal de publicação; está aqui para você usar como quiser.';

test('U3a (real): a file with no channel is explained once, on its own line, in plain words', async (t) => {
  const raiz = await projeto(t, { 'v1/proposta.md': 'Proposta comercial.\n' });
  const r = await entregar(raiz, ['v1/proposta.md']);
  assert.equal(r.fim, 'ENTREGA:OK');
  const md = await leiame(raiz);
  assert.equal(secao(md, 'Outros arquivos'), `- \`outros/proposta.md\` — origem: \`${EXEC}/v1/proposta.md\`${SEM_CANAL}`);
  assert.ok(!md.includes('não tem canal conhecido') && !md.includes('Atenção:'), 'not repeated in "Atenção:"');
  assert.ok(r.linhas.includes(`- ${EXEC}/v1/proposta.md não tem canal conhecido. Está em \`outros/\`.`), 'the screen summary still says it');
});

test('U3a (real): "Para ter um PDF" says which file to open and where', async (t) => {
  const raiz = await projeto(t, { 'v1/blog.md': BLOG });
  await entregar(raiz, ['v1/blog.md=blog-post']);
  assert.equal(secao(await leiame(raiz), 'Para ter um PDF'), 'Abra o arquivo que você quer (por exemplo, o artigo do blog) no navegador ou no editor de texto e use Imprimir → Salvar como PDF.');
});
