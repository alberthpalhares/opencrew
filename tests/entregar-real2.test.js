// specs/fase-u3a2-entrega-no-projeto.md — the adjustments of the second real run ("ajuste da
// execução real", rules 14 and 18, §4 and §6): a ressalva lasts only while its pending item lasts,
// the copy is compared with what was copied (not with what the user did to it afterwards), a
// caption with no marker is the whole text, and the words of the reentrega and of the PDF section.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { texto } from './_helpers.js';
import { BLOG, COPIA, DEST, EXEC, LEGENDA, RUN, arvore, entregar, entregarEm, gravar, leiame, ler, lerDe, nomes, passos, projeto, secao } from './_entrega.js';

const legendaDe = (n) => `=== CAPTION ===\n${texto(n)}\n`;
const COM_TELEFONE = `=== CAPTION ===\n${texto(2278)} [PREENCHER: telefone]\n`;
const ITENS = ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post'];
const RESSALVAS = `${EXEC}/ressalvas.json`;
const RETRATO = `${EXEC}/copia.json`;
const DA_LEGENDA = { arquivo: `${EXEC}/v1/legenda.md`, item: 'Legenda Instagram — caracteres', trecho: '2300/2200' };
const gravado = (ressalvas) => `${JSON.stringify({ ressalvas }, null, 2)}\n`;
const REENTREGA = `${COPIA}-reentrega-2`;
const pastas = async (raiz) => (await fs.readdir(path.join(raiz, DEST))).sort();
const editar = (raiz, rel, conteudo) => fs.writeFile(path.join(raiz, rel), conteudo);

// ── 1. A ressalva lasts only while the pending item is there, with no gap (rule 18) ──────────

test('U3a (real-2): accepted, then solved, then back — the old ressalva does not accept it: ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': legendaDe(2300), 'v1/post.md': BLOG });
  assert.equal((await entregar(raiz, ITENS, '--aceitar-pendencias')).fim, 'ENTREGA:COM_RESSALVA');
  await gravar(raiz, { 'v1/legenda.md': LEGENDA });
  assert.equal((await entregar(raiz, ITENS)).fim, 'ENTREGA:OK');
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([]), 'the ressalva that matches nothing leaves the file');
  await gravar(raiz, { 'v1/legenda.md': legendaDe(2300) });
  const r = await entregar(raiz, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes('Instagram não está pronto: 1 pendência.'), r.saida);
  assert.ok(!(await leiame(raiz)).includes('Entregue com ressalva'));
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([]));
});

test('U3a (real-2): of two ressalvas, the one that was solved leaves ressalvas.json and the other stays', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': COM_TELEFONE, 'v1/post.md': BLOG });
  await entregar(raiz, ITENS, '--aceitar-pendencias');
  assert.equal(JSON.parse(await lerDe(raiz, RESSALVAS)).ressalvas.length, 2);
  await gravar(raiz, { 'v1/legenda.md': legendaDe(2300) });
  assert.equal((await entregar(raiz, ITENS)).fim, 'ENTREGA:COM_RESSALVA');
  assert.equal(await lerDe(raiz, RESSALVAS), gravado([DA_LEGENDA]));
  // The [PREENCHER] comes back: it is a new pending item.
  await gravar(raiz, { 'v1/legenda.md': COM_TELEFONE });
  const r = await entregar(raiz, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes('- Há pendência nova, que você ainda não aceitou: Falta informação sua.'), r.saida);
});

// ── 2. The copy is compared with what was copied, not with what is in the folder (rule 14) ───

const ARQUIVOS = { 'v1/legenda.md': LEGENDA, 'v1/post.md': BLOG };

test('U3a (real-2): the user edits a file of the copy — the next delivery, with no change, says "já está atualizada" and touches nothing', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  const retrato = JSON.parse(await lerDe(raiz, RETRATO));
  assert.deepEqual(Object.keys(retrato.copias), [COPIA]);
  assert.deepEqual(Object.keys(retrato.copias[COPIA]).sort(), ['blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt']);
  await editar(raiz, `${COPIA}/instagram/legenda.txt`, 'A minha versão da legenda.\n');
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
  assert.deepEqual(await pastas(raiz), [RUN]);
  assert.equal(await lerDe(raiz, `${COPIA}/instagram/legenda.txt`), 'A minha versão da legenda.\n');
});

test('U3a (real-2): edited copy and a delivery that did change — -reentrega-2, and the edited file stays as the user left it', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  await editar(raiz, `${COPIA}/instagram/legenda.txt`, 'A minha versão da legenda.\n');
  await gravar(raiz, { 'v1/legenda.md': LEGENDA.replace('Legenda da semana.', 'Legenda nova.') });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.some((l) => l.startsWith(`Cópia: ${REENTREGA} — guardei aqui`)), r.saida);
  assert.equal(await lerDe(raiz, `${COPIA}/instagram/legenda.txt`), 'A minha versão da legenda.\n');
  assert.equal(await lerDe(raiz, `${REENTREGA}/instagram/legenda.txt`), 'Legenda nova.\n\n#horta #casa\n');
  assert.deepEqual(Object.keys(JSON.parse(await lerDe(raiz, RETRATO)).copias).sort(), [COPIA, REENTREGA]);
  // The new folder is edited too: still nothing to do.
  await editar(raiz, `${REENTREGA}/blog/seo.txt`, 'Título: o meu\n');
  assert.ok((await entregarEm(raiz, DEST, ITENS)).linhas.includes(`Cópia: ${REENTREGA} — já está atualizada.`));
});

test('U3a (real-2): a channel that got ready later still joins the edited copy, and the edited file is not written over', async (t) => {
  const raiz = await projeto(t, { ...ARQUIVOS, 'v1/legenda.md': legendaDe(2300) });
  await entregarEm(raiz, DEST, ITENS);
  await editar(raiz, `${COPIA}/blog/seo.txt`, 'Título: o meu\n');
  await gravar(raiz, { 'v1/legenda.md': LEGENDA });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — completei com 1 arquivo novo.`), r.saida);
  assert.equal(await lerDe(raiz, `${COPIA}/blog/seo.txt`), 'Título: o meu\n');
  assert.ok(Object.hasOwn(JSON.parse(await lerDe(raiz, RETRATO)).copias[COPIA], 'instagram/legenda.txt'));
});

test('U3a (real-2): with no copia.json (a copy made by the earlier code), or one that cannot be read, the files are compared, as before', async (t) => {
  for (const ruim of [null, '{ isto não é json', '{"copias": []}']) {
    const raiz = await projeto(t, ARQUIVOS);
    await entregarEm(raiz, DEST, ITENS);
    if (ruim == null) await fs.rm(path.join(raiz, RETRATO));
    else await editar(raiz, RETRATO, ruim);
    // Same files: nothing to do, and the picture is taken now.
    assert.ok((await entregarEm(raiz, DEST, ITENS)).linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), String(ruim));
    assert.ok(Object.hasOwn(JSON.parse(await lerDe(raiz, RETRATO)).copias, COPIA), String(ruim));
    if (ruim == null) await fs.rm(path.join(raiz, RETRATO));
    else await editar(raiz, RETRATO, ruim);
    await editar(raiz, `${COPIA}/instagram/legenda.txt`, 'A minha versão da legenda.\n');
    const r = await entregarEm(raiz, DEST, ITENS);
    assert.ok(r.linhas.some((l) => l.startsWith(`Cópia: ${REENTREGA} — guardei aqui`)), `${ruim}: ${r.saida}`);
    assert.equal(await lerDe(raiz, `${COPIA}/instagram/legenda.txt`), 'A minha versão da legenda.\n');
  }
});

test('U3a (real-2): copia.json in the --arquivo list does not go in, and the summary says it is a service file', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  const r = await entregarEm(raiz, DEST, [...ITENS, 'copia.json']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.ok(r.linhas.includes(`- ${RETRATO} é arquivo de serviço e não entra na entrega.`), r.saida);
  assert.ok(!(await arvore(raiz)).some((rel) => rel.includes('copia.json')));
  assert.ok(!(await nomes(raiz, COPIA)).some((rel) => rel.includes('copia.json')));
});

// ── 3. A caption with no marker is the whole text (§4) ───────────────────────────────────────

const SEM_MARCA = (arquivo) => `Não encontrei a legenda marcada em ${EXEC}/${arquivo}: usei o texto inteiro. Confira antes de colar.`;

test('U3a (real-2): an instagram-feed file that is only the text — instagram/legenda.txt, the warning, and the size alert applies', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': `Primeira linha da **legenda**.\r\n\r\n${texto(2300)}\r\n\r\n#horta #casa\r\n` });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/legenda.txt']);
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), `Primeira linha da legenda.\n\n${texto(2300)}\n\n#horta #casa\n`);
  const md = await leiame(raiz);
  assert.match(secao(md, 'Instagram'), /^Situação: Pronto$/m);
  assert.ok(secao(md, 'Instagram').includes(`Atenção:\n- ${SEM_MARCA('v1/legenda.md')}`), secao(md, 'Instagram'));
  assert.ok(r.linhas.includes(`- ${SEM_MARCA('v1/legenda.md')}`), r.saida);
  assert.match(secao(md, 'Antes de usar'), /^- ALERTA: `instagram\/legenda\.txt` tem 23\d\d caracteres; o limite é 2200\. Encurte antes de publicar\.$/m);
  assert.ok(passos(secao(md, 'Instagram')).some((p) => p.includes('`instagram/legenda.txt`')), 'the steps cite the text to paste');
});

test('U3a (real-2): a short caption with no marker has the warning and no alert', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': 'Legenda pronta para colar.\n' });
  const r = await entregar(raiz, ['v1/legenda.md=instagram-feed']);
  assert.equal(await ler(raiz, 'instagram/legenda.txt'), 'Legenda pronta para colar.\n');
  assert.ok(r.linhas.includes(`- ${SEM_MARCA('v1/legenda.md')}`) && !r.saida.includes('ALERTA'), r.saida);
});

test('U3a (real-2): an instagram-feed file with headings and no caption still goes whole, with the warning of 1.8.0', async (t) => {
  const inteiro = '# Ideias para a semana\n\nUm texto qualquer.\n';
  const raiz = await projeto(t, { 'v1/rascunho.md': inteiro });
  const r = await entregar(raiz, ['v1/rascunho.md=instagram-feed']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/rascunho.md']);
  assert.ok(r.linhas.includes(`- Não encontrei a legenda em ${EXEC}/v1/rascunho.md. Confira antes de colar.`), r.saida);
});

test('U3a (real-2): a twitter-post file that is only the text was already the tweet — twitter/tweet.txt, no warning', async (t) => {
  const raiz = await projeto(t, { 'v1/tweet.md': 'Um tweet **pronto** para colar.\n' });
  const r = await entregar(raiz, ['v1/tweet.md=twitter-post']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'twitter/tweet.txt']);
  assert.equal(await ler(raiz, 'twitter/tweet.txt'), 'Um tweet pronto para colar.\n');
  assert.ok(!r.saida.includes('Não encontrei'), r.saida);
});

// ── 6 and 7. The words of the reentrega and of "Para ter um PDF" (§6) ────────────────────────

test('U3a (real-2): the reentrega says that only the LEIA-ME of the old folder got a warning, and its own LEIA-ME says which reentrega it is', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  assert.equal((await lerDe(raiz, `${COPIA}/LEIA-ME.md`)).split('\n')[0], `# Entrega — teste — ${RUN}`);
  for (const n of [2, 3]) {
    await gravar(raiz, { 'v1/legenda.md': LEGENDA.replace('Legenda da semana.', `Legenda ${n}.`) });
    const r = await entregarEm(raiz, DEST, ITENS);
    const pasta = `${COPIA}-reentrega-${n}`;
    assert.ok(r.linhas.includes(`Cópia: ${pasta} — guardei aqui porque a entrega mudou. Os arquivos da anterior ficaram como estavam; só o LEIA-ME dela ganhou um aviso.`), r.saida);
    assert.equal((await lerDe(raiz, `${pasta}/LEIA-ME.md`)).split('\n')[0], `# Entrega — teste — ${RUN} (reentrega ${n})`);
  }
  // The LEIA-ME of entrega/ is not a reentrega folder; and the title survives a call with no change.
  assert.equal((await leiame(raiz)).split('\n')[0], `# Entrega — teste — ${RUN}`);
  await entregarEm(raiz, DEST, ITENS, '--vai-publicar', 'instagram');
  assert.equal((await lerDe(raiz, `${COPIA}-reentrega-3/LEIA-ME.md`)).split('\n')[0], `# Entrega — teste — ${RUN} (reentrega 3)`);
});

test('U3a (real-2): "Para ter um PDF" gives no example of a channel the crew may not have', async (t) => {
  const raiz = await projeto(t, { 'v1/roteiro.md': 'Roteiro do vídeo.\n' });
  await entregar(raiz, ['v1/roteiro.md=youtube-script']);
  const pdf = secao(await leiame(raiz), 'Para ter um PDF');
  assert.equal(pdf, 'Abra o arquivo que você quer no navegador ou no editor de texto e use Imprimir → Salvar como PDF.');
});
