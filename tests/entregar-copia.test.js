// specs/fase-u3a2-entrega-no-projeto.md — the copy to a folder of the project (rules 14 and 15):
// one folder for each run, nothing overwritten, only what is ready. U3a-05e, 05f, 05g-f2, 05m,
// 05o, 05p-f2, 04n-f2 and 07a-f2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { copiar } from '../templates/_opencrew/core/scripts/entrega/copia.mjs';
import { texto } from './_helpers.js';
import { BLOG, COPIA, DEST, EXEC, LEGENDA, RUN, entregarEm, fotos, gravar, lerDe, nomes, png, projeto, secao } from './_entrega.js';

const ARQUIVOS = { 'v1/legenda.md': LEGENDA, 'v1/post.md': BLOG };
const ITENS = ['v1/legenda.md=instagram-feed', 'v1/post.md=blog-post'];
const LONGA = `=== CAPTION ===\n${texto(2300)}\n`;
const REENTREGA = `${COPIA}-reentrega-2`;
const AVISO = (pasta) => `Há uma entrega mais nova desta execução em \`${pasta}\`.`;
const pastas = async (raiz) => (await fs.readdir(path.join(raiz, DEST))).sort();
const semLeiame = (linhas) => linhas.filter((l) => !l.startsWith('LEIA-ME.md:'));
const ha = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);

test('U3a-05e: the same run delivered again with no change — no folder, no file of the destination changes, "já está atualizada"', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  const antes = await fotos(raiz, DEST);
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
  assert.deepEqual(await fotos(raiz, DEST), antes);
  assert.deepEqual(await pastas(raiz), [RUN]);
});

test('U3a-05e: CRLF in place of LF in a .txt (and in the LEIA-ME) of the destination is not a change', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  for (const rel of ['instagram/legenda.txt', 'LEIA-ME.md']) {
    const alvo = path.join(raiz, COPIA, rel);
    await fs.writeFile(alvo, (await fs.readFile(alvo, 'utf8')).replace(/\n/g, '\r\n'));
  }
  const antes = await fotos(raiz, DEST);
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
  assert.deepEqual(await fotos(raiz, DEST), antes);
  assert.deepEqual(await pastas(raiz), [RUN]);
});

test('U3a-05f: the caption changed — the whole delivery goes to <run_id>-reentrega-2 and the old folder only gets the warning, once', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  const antes = await fotos(raiz, COPIA);
  const leiameAntes = await lerDe(raiz, `${COPIA}/LEIA-ME.md`);
  await gravar(raiz, { 'v1/legenda.md': LEGENDA.replace('Legenda da semana.', 'Legenda nova.') });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.ok(r.linhas.includes(`Cópia: ${REENTREGA} — guardei aqui porque a entrega mudou. Os arquivos da anterior ficaram como estavam; só o LEIA-ME dela ganhou um aviso.`), r.saida);
  assert.deepEqual(await nomes(raiz, REENTREGA), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt']);
  assert.equal(await lerDe(raiz, `${REENTREGA}/instagram/legenda.txt`), 'Legenda nova.\n\n#horta #casa\n');
  assert.ok(!(await lerDe(raiz, `${REENTREGA}/LEIA-ME.md`)).includes('Há uma entrega mais nova'));
  assert.deepEqual(semLeiame(await fotos(raiz, COPIA)), semLeiame(antes), 'in the old folder only the LEIA-ME changes');
  assert.equal(await lerDe(raiz, `${COPIA}/LEIA-ME.md`), `${AVISO(REENTREGA)}\n\n${leiameAntes}`);
  assert.ok((await lerDe(raiz, `${EXEC}/entrega/LEIA-ME.md`)).includes(`A cópia para guardar está em \`${REENTREGA}\`.`));
  // One more call, the same: nothing changes and the warning is not repeated.
  const tudo = await fotos(raiz, DEST);
  const igual = await entregarEm(raiz, DEST, ITENS);
  assert.ok(igual.linhas.includes(`Cópia: ${REENTREGA} — já está atualizada.`), igual.saida);
  assert.deepEqual(await fotos(raiz, DEST), tudo);
});

test('U3a-05f: a third version goes to -reentrega-3 and both older folders point to it', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  for (const n of [2, 3]) {
    await gravar(raiz, { 'v1/legenda.md': LEGENDA.replace('Legenda da semana.', `Legenda ${n}.`) });
    await entregarEm(raiz, DEST, ITENS);
  }
  assert.deepEqual(await pastas(raiz), [RUN, `${RUN}-reentrega-2`, `${RUN}-reentrega-3`]);
  for (const velha of [COPIA, REENTREGA]) {
    const linhas = (await lerDe(raiz, `${velha}/LEIA-ME.md`)).split('\n');
    assert.deepEqual([linhas[0], linhas[1], linhas[2].startsWith('# Entrega')], [AVISO(`${COPIA}-reentrega-3`), '', true], velha);
  }
});

test('U3a-05g-f2: a new call with --vai-publicar instagram and no other change — the LEIA-ME of the copy is written again, no folder is created', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  const antes = await fotos(raiz, COPIA);
  const r = await entregarEm(raiz, DEST, ITENS, '--vai-publicar', 'instagram');
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
  assert.deepEqual(await pastas(raiz), [RUN]);
  assert.deepEqual(semLeiame(await fotos(raiz, COPIA)), semLeiame(antes));
  assert.ok(secao(await lerDe(raiz, `${COPIA}/LEIA-ME.md`), 'Instagram').startsWith('Esta crew publica este canal sozinha.'));
});

test('U3a-05m: a file the user put in the root of the copy stays and changes nothing', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  await fs.writeFile(path.join(raiz, COPIA, 'anotacoes.txt'), 'minhas notas');
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
  assert.deepEqual(await pastas(raiz), [RUN]);
  assert.equal(await lerDe(raiz, `${COPIA}/anotacoes.txt`), 'minhas notas');
});

test('U3a-05m: one more file inside <destino>/<run_id>/instagram/ stays and changes nothing (the copy is compared with what was copied)', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  await fs.writeFile(path.join(raiz, COPIA, 'instagram', 'rascunho.txt'), 'meu rascunho');
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), r.saida);
  assert.deepEqual(await pastas(raiz), [RUN]);
  assert.equal(await lerDe(raiz, `${COPIA}/instagram/rascunho.txt`), 'meu rascunho');
});

test('U3a-05m: a copy with no copia.json (made by the earlier code) and one more file in instagram/ — -reentrega-2, and that file stays where it was', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  await fs.rm(path.join(raiz, EXEC, 'copia.json'));
  await fs.writeFile(path.join(raiz, COPIA, 'instagram', 'rascunho.txt'), 'meu rascunho');
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.ok(r.linhas.some((l) => l.startsWith(`Cópia: ${REENTREGA} — guardei aqui`)), r.saida);
  assert.equal(await lerDe(raiz, `${COPIA}/instagram/rascunho.txt`), 'meu rascunho');
  assert.deepEqual(await nomes(raiz, REENTREGA), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt']);
});

test('U3a-07a-f2: a 2300 caption, a clean blog and a destination — only blog/ is copied, and the LEIA-ME of the copy cites no file of instagram/', async (t) => {
  const raiz = await projeto(t, { ...ARQUIVOS, 'v1/legenda.md': LONGA });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes(`Cópia: ${COPIA}`), r.saida);
  assert.deepEqual(await nomes(raiz, COPIA), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt']);
  const daCopia = await lerDe(raiz, `${COPIA}/LEIA-ME.md`);
  assert.ok(!daCopia.includes('instagram/'), daCopia);
  assert.equal(secao(daCopia, 'Instagram'), `Situação: Não está pronto\n\nPendências:\n- Legenda Instagram — caracteres: 2300 (limite 2200) — origem: \`${EXEC}/v1/legenda.md\``);
  assert.match(secao(daCopia, 'Blog'), /^Situação: Pronto$/m);
  assert.ok(secao(daCopia, 'Blog').includes('`blog/artigo.md`'));
  assert.ok((await lerDe(raiz, `${EXEC}/entrega/LEIA-ME.md`)).includes('`instagram/legenda.txt`'), 'the LEIA-ME of entrega/ still cites it');
});

test('U3a-05o: the channel that got ready later joins the same folder — "completei", blog/ byte for byte, no -reentrega-', async (t) => {
  const raiz = await projeto(t, { ...ARQUIVOS, 'v1/legenda.md': LONGA });
  await entregarEm(raiz, DEST, ITENS);
  const blog = (await fotos(raiz, COPIA)).filter((l) => l.startsWith('blog/'));
  await gravar(raiz, { 'v1/legenda.md': LEGENDA });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — completei com 1 arquivo novo.`), r.saida);
  assert.deepEqual(await pastas(raiz), [RUN]);
  assert.equal(await lerDe(raiz, `${COPIA}/instagram/legenda.txt`), 'Legenda da semana.\n\n#horta #casa\n');
  assert.deepEqual((await fotos(raiz, COPIA)).filter((l) => l.startsWith('blog/')), blog);
  assert.ok(secao(await lerDe(raiz, `${COPIA}/LEIA-ME.md`), 'Instagram').includes('`instagram/legenda.txt`'));
});

test('U3a-05o: two files that join — the message agrees in number', async (t) => {
  const raiz = await projeto(t, { ...ARQUIVOS, 'v1/legenda.md': LONGA, 'v1/slide-01.png': png(1) });
  const itens = [...ITENS, 'v1/slide-01.png=instagram-feed'];
  await entregarEm(raiz, DEST, itens);
  await gravar(raiz, { 'v1/legenda.md': LEGENDA });
  const r = await entregarEm(raiz, DEST, itens);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — completei com 2 arquivos novos.`), r.saida);
});

test('U3a-05p-f2: a new [PREENCHER] only in the Instagram file — no folder, instagram/ of the copy byte for byte, ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  await entregarEm(raiz, DEST, ITENS);
  const antes = semLeiame(await fotos(raiz, COPIA));
  await gravar(raiz, { 'v1/legenda.md': LEGENDA.replace('Legenda da semana.', 'Ligue: [PREENCHER: telefone]') });
  const r = await entregarEm(raiz, DEST, ITENS);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.deepEqual(await pastas(raiz), [RUN]);
  assert.deepEqual(semLeiame(await fotos(raiz, COPIA)), antes);
  assert.match(secao(await lerDe(raiz, `${COPIA}/LEIA-ME.md`), 'Instagram'), /^Situação: Não está pronto\n\nPendências:\n- Falta preencher "telefone"/);
});

test('U3a-05j: a write that fails in the middle leaves no partial folder, no temporary one and no empty destination (rule 15)', async (t) => {
  const raiz = await projeto(t, ARQUIVOS);
  const destino = { rel: DEST, abs: path.join(raiz, 'Conteudo', 'Prontos') };
  const [artigo, seo] = [{ pasta: 'blog', nome: 'artigo.md', texto: 'Texto.\n' }, { pasta: 'blog', nome: 'seo.txt', texto: 'Título: x\n' }];
  const some = { pasta: 'instagram', nome: 'slide.png', de: path.join(raiz, 'nao-existe.png') }; // cannot be copied
  const base = { destino, run: RUN, ignorar: new Set(), leiame: '# Entrega\n' };
  assert.deepEqual(await copiar({ ...base, arquivos: [artigo, some] }), { tipo: 'falha', arquivo: path.join(destino.abs, RUN, 'instagram', 'slide.png') });
  assert.ok(!(await ha(raiz, 'Conteudo')), 'the destination this call created is gone');
  // A temporary folder left by an interrupted call is the script's: it is rebuilt.
  await fs.mkdir(path.join(destino.abs, `${RUN}.tmp`, 'velho'), { recursive: true });
  assert.deepEqual(await copiar({ ...base, arquivos: [artigo] }), { tipo: 'nova', pasta: COPIA, criouDestino: false });
  assert.deepEqual(await nomes(raiz, DEST), [`${RUN}/LEIA-ME.md`, `${RUN}/blog/artigo.md`]);
  // When adding, what already went in stays, and the next call completes.
  assert.equal((await copiar({ ...base, arquivos: [artigo, seo, some] })).tipo, 'falha');
  assert.deepEqual(await nomes(raiz, DEST), [`${RUN}/LEIA-ME.md`, `${RUN}/blog/artigo.md`, `${RUN}/blog/seo.txt`]);
  assert.deepEqual(await copiar({ ...base, arquivos: [artigo, seo] }), { tipo: 'igual', pasta: COPIA, novos: 0 });
});

const CARROSSEL = { 'v1/slide-01.html': '<html><body>Capa</body></html>', 'v1/slide-01.png': png(1), 'v1/legenda.md': LONGA };
const DO_CARROSSEL = ['v1/slide-01.html=instagram-feed', 'v1/slide-01.png=instagram-feed', 'v1/legenda.md=instagram-feed'];

test('U3a-04n-f2: nothing is ready — no folder is created and the summary says why', async (t) => {
  const raiz = await projeto(t, CARROSSEL);
  const r = await entregarEm(raiz, DEST, DO_CARROSSEL);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.ok(r.linhas.includes('Cópia: nada foi copiado, porque nenhum canal está pronto.'), r.saida);
  assert.ok(!(await ha(raiz, 'Conteudo')));
});

test('U3a-04n-f2: the editable HTML of a channel that is not ready is not copied, nor cited in the LEIA-ME of the copy', async (t) => {
  const raiz = await projeto(t, { ...CARROSSEL, 'v1/post.md': BLOG });
  await entregarEm(raiz, DEST, [...DO_CARROSSEL, 'v1/post.md=blog-post']);
  assert.deepEqual(await nomes(raiz, COPIA), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt']);
  const daCopia = await lerDe(raiz, `${COPIA}/LEIA-ME.md`);
  assert.ok(!daCopia.includes('slide-01.html') && !daCopia.includes('## Editáveis'), daCopia);
  assert.ok((await lerDe(raiz, `${EXEC}/entrega/LEIA-ME.md`)).includes('`editaveis/slide-01.html`'));
  // The channel gets ready: its files and its editable join the same folder.
  await gravar(raiz, { 'v1/legenda.md': LEGENDA });
  const r = await entregarEm(raiz, DEST, [...DO_CARROSSEL, 'v1/post.md=blog-post']);
  assert.ok(r.linhas.includes(`Cópia: ${COPIA} — completei com 3 arquivos novos.`), r.saida);
  assert.ok((await nomes(raiz, COPIA)).includes('editaveis/slide-01.html'));
});
