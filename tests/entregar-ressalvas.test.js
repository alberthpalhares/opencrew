// specs/fase-u3a2-entrega-no-projeto.md — "entregar assim mesmo" (rules 18 and 19): the accepted
// pending items are written down, the channel becomes "Pronto, com ressalva" and is copied.
// U3a-07c, 07d, 07e, 07j, 07h, 07i, 07m, 01b-f2 and 08h-f2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { texto } from './_helpers.js';
import { BLOG, COPIA, DEST, EXEC, LEGENDA, USO, arvore, entregar, entregarEm, gravar, leiame, lerDe, nomes, passos, projeto, secao, titulos } from './_entrega.js';

const legendaDe = (n) => `=== CAPTION ===\n${texto(n)}\n`;
// Still 2300 characters, now with a [PREENCHER] in the caption (the excerpt takes 21, the space 1).
const COM_TELEFONE = `=== CAPTION ===\n${texto(2278)} [PREENCHER: telefone]\n`;
const ITENS = ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post'];
const RESSALVAS = `${EXEC}/ressalvas.json`;
const DA_LEGENDA = { arquivo: `${EXEC}/v1/legenda.md`, item: 'Legenda Instagram — caracteres', trecho: '2300/2200' };
const DO_TELEFONE = { arquivo: `${EXEC}/v1/legenda.md`, item: 'Falta informação sua', trecho: 'telefone' };
const gravado = (ressalvas) => `${JSON.stringify({ ressalvas }, null, 2)}\n`;
const ha = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);
const LINHA = `Legenda Instagram — caracteres: 2300 (limite 2200) — origem: \`${EXEC}/v1/legenda.md\``;

/** U3a-07c: the 2300 caption and the clean blog, delivered with --aceitar-pendencias. */
async function aceita(t) {
  const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2300), 'v1/post.md': BLOG });
  return { raiz, r: await entregarEm(raiz, DEST, ITENS, '--aceitar-pendencias') };
}

test('U3a-07c: --aceitar-pendencias writes ressalvas.json, the channel is "Pronto, com ressalva" and is copied, ENTREGA:COM_RESSALVA', async (t) => {
  const { raiz, r } = await aceita(t);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:COM_RESSALVA']);
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([DA_LEGENDA]));
  assert.ok((await nomes(raiz, COPIA)).includes('instagram/legenda.txt'));
  assert.ok(r.linhas.includes('- Instagram: Pronto, com ressalva') && r.linhas.includes('- Blog: Pronto'), r.saida);
  assert.ok(!r.saida.includes('não está pronto'), r.saida);
  for (const md of [await leiame(raiz), await lerDe(raiz, `${COPIA}/LEIA-ME.md`)]) {
    assert.equal(titulos(md)[0], 'Antes de usar', 'the LEIA-ME opens with the accepted items');
    assert.equal(secao(md, 'Antes de usar'), `Entregue com ressalva:\n- ${LINHA}`);
    assert.match(secao(md, 'Instagram'), /^Situação: Pronto, com ressalva$/m);
    assert.ok(!secao(md, 'Instagram').includes('Pendências:'));
    assert.equal(passos(secao(md, 'Instagram'))[0], 'Antes de postar, confira as ressalvas em "Antes de usar".');
    assert.equal(passos(secao(md, 'Blog'))[0], 'Abra o editor do seu blog e crie um post novo.');
  }
});

test('U3a-07d: a new call without the option and with no change — ENTREGA:COM_RESSALVA and ressalvas.json byte for byte', async (t) => {
  const { raiz } = await aceita(t);
  const antes = await fs.stat(path.join(raiz, RESSALVAS));
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:COM_RESSALVA');
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([DA_LEGENDA]));
  assert.equal((await fs.stat(path.join(raiz, RESSALVAS))).mtimeMs, antes.mtimeMs, 'not written again');
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
});

test('U3a-07e: a new [PREENCHER] after the acceptance — ENTREGA:INCOMPLETA, the message, ressalvas.json unchanged (the old one still applies)', async (t) => {
  const { raiz } = await aceita(t);
  await gravar(raiz, { 'v1/legenda.md': COM_TELEFONE });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes('- Há pendência nova, que você ainda não aceitou: Falta informação sua.'), r.saida);
  assert.ok(r.linhas.includes('Instagram não está pronto: 1 pendência.'), 'only the new one is pending');
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([DA_LEGENDA]));
  const md = await leiame(raiz);
  assert.match(secao(md, 'Instagram'), /^Situação: Não está pronto$/m);
  assert.ok(secao(md, 'Antes de usar').startsWith(`Entregue com ressalva:\n- ${LINHA}\n\n- Instagram não está pronto: 1 pendência.`), secao(md, 'Antes de usar'));
});

test('U3a-07e: the measure changed (2300 → 2250) — it is a new pending item, ENTREGA:INCOMPLETA', async (t) => {
  const { raiz } = await aceita(t);
  await gravar(raiz, { 'v1/legenda.md': legendaDe(2250) });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes('- Há pendência nova, que você ainda não aceitou: Legenda Instagram — caracteres.'), r.saida);
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([]), 'the ressalva that matches no pending item leaves the file');
  assert.ok(!(await leiame(raiz)).includes('Entregue com ressalva'), 'the old acceptance no longer applies to anything');
});

test('U3a-07j: after the new [PREENCHER], --aceitar-pendencias again — both in ressalvas.json, ENTREGA:COM_RESSALVA', async (t) => {
  const { raiz } = await aceita(t);
  await gravar(raiz, { 'v1/legenda.md': COM_TELEFONE });
  await entregarEm(raiz, DEST, ITENS);
  const r = await entregarEm(raiz, DEST, ITENS, '--aceitar-pendencias');
  assert.equal(r.fim, 'ENTREGA:COM_RESSALVA');
  assert.deepEqual(JSON.parse(await lerDe(raiz, RESSALVAS)).ressalvas, [DA_LEGENDA, DO_TELEFONE]);
  const antes = secao(await leiame(raiz), 'Antes de usar');
  assert.ok(antes.includes(`- Falta preencher "telefone" — origem: \`${EXEC}/v1/legenda.md\` — está em \`instagram/legenda.txt\``), antes);
});

test('U3a-07h: an item of the list that does not exist is never accepted — ENTREGA:INCOMPLETA and no ressalva cites it', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': BLOG });
  const r = await entregar(raiz, ['v1/post.md=blog-post', 'v1/falta.md=linkedin-post'], '--aceitar-pendencias');
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes(`- Não encontrei ${EXEC}/v1/falta.md.`), r.saida);
  assert.ok(!(await ha(raiz, RESSALVAS)));
});

test('U3a-07h: a delivery with nothing pending, with the option — ENTREGA:OK and no ressalvas.json', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA, 'v1/post.md': BLOG });
  const r = await entregar(raiz, ITENS, '--aceitar-pendencias');
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.ok(!(await ha(raiz, RESSALVAS)));
});

test('U3a-07i: a ressalvas.json that cannot be read counts as empty, and the summary says so', async (t) => {
  for (const ruim of ['{ isto não é json', '{"ressalvas": "texto"}', '[]']) {
    const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2300), 'ressalvas.json': ruim });
    const r = await entregar(raiz, ['v1/legenda.md=instagram-feed']);
    assert.equal(r.fim, 'ENTREGA:INCOMPLETA', ruim);
    assert.ok(r.linhas.includes(`- Não consegui ler ${RESSALVAS}. Segui sem ele.`), r.saida);
    assert.equal(await lerDe(raiz, RESSALVAS), ruim, 'left as it was');
  }
});

test('U3a-07m: a [PREENCHER] accepted in a LinkedIn post — "Antes de usar" shows the excerpt and linkedin/post.txt, and the steps open with the warning', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': 'Leia o artigo completo: [PREENCHER: link do artigo]\n' });
  const r = await entregar(raiz, ['v1/post.md=linkedin-post'], '--aceitar-pendencias');
  assert.equal(r.fim, 'ENTREGA:COM_RESSALVA');
  const md = await leiame(raiz);
  assert.equal(secao(md, 'Antes de usar'), `Entregue com ressalva:\n- Falta preencher "link do artigo" — origem: \`${EXEC}/v1/post.md\` — está em \`linkedin/post.txt\``);
  assert.deepEqual(passos(secao(md, 'LinkedIn')), ['Antes de postar, confira as ressalvas em "Antes de usar".', 'No computador, abra linkedin.com e comece uma publicação.', 'Abra `linkedin/post.txt`, copie tudo e cole.', 'Confira e publique.']);
  assert.ok((await lerDe(raiz, `${EXEC}/entrega/linkedin/post.txt`)).includes('[PREENCHER: link do artigo]'));
});

test('U3a-01b-f2: ressalvas.json in the --arquivo list does not go in, and the summary says it is a service file', async (t) => {
  const { raiz } = await aceita(t);
  const r = await entregarEm(raiz, DEST, [...ITENS, 'ressalvas.json']);
  assert.equal(r.fim, 'ENTREGA:COM_RESSALVA');
  assert.ok(r.linhas.includes(`- ${RESSALVAS} é arquivo de serviço e não entra na entrega.`), r.saida);
  assert.ok(!(await arvore(raiz)).some((rel) => rel.includes('ressalvas.json')));
});

test('U3a-08h-f2: --ajuda lists the three new options; --publicado is not an option of this version', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA });
  const ajuda = await entregar(raiz, [], '--ajuda');
  assert.deepEqual([ajuda.code, ajuda.linhas], [0, [USO]]);
  for (const opcao of ['[--destino "<pasta>"]', '[--lembrar-destino "<pasta>"|nao]', '[--aceitar-pendencias]']) assert.ok(USO.includes(opcao), opcao);
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed'], '--publicado', 'instagram');
  assert.deepEqual([r.code, r.linhas], [1, ['Opção desconhecida: --publicado.', USO]]);
  assert.equal(await arvore(raiz), null);
});
