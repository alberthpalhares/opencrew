// specs/fase-u3a1-pasta-de-entrega.md — U3a-01 (what goes in), U3a-02 (channel), U3a-06a to 06d
// (the script's contract) and U3a-14b (it only writes inside the run folder).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { snapshot, texto } from './_helpers.js';
import { BLOG, CREW, EXEC, LEGENDA, RUN, USO, arvore, bytes, entregar, existe, leiame, ler, png, projeto, rodar, secao } from './_entrega.js';

const SERVICO = (rel) => `${EXEC}/${rel} é arquivo de serviço e não entra na entrega.`;
const SO_O_BLOG = ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt'];

test('U3a-01a: only what is in the list goes in — nothing from v1 or v3', async (t) => {
  const raiz = await projeto(t, { 'v1/pesquisa.md': 'Pesquisa com o termo XPTO.\n', 'v2/post.md': BLOG, 'v3/revisao.md': 'Parecer com o termo ZYXW.\n' });
  const r = await entregar(raiz, ['v2/post.md=blog-post']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), SO_O_BLOG);
  assert.equal(await ler(raiz, 'blog/artigo.md'), '## Comece pelo solo\n\nTexto do artigo.\n');
  for (const rel of SO_O_BLOG) assert.doesNotMatch(await ler(raiz, rel), /XPTO|ZYXW|pesquisa\.md|revisao\.md/);
});

test('U3a-01b: service files never go in, even when listed, and the summary says so for each', async (t) => {
  const servico = ['verificacao-ciclo-1.md', 'publicado.json', 'caption.txt', 'export/temp.html', 'entrega/instagram/legenda.txt'];
  const raiz = await projeto(t, { 'v2/post.md': BLOG, ...Object.fromEntries(servico.map((rel) => [rel, 'Legenda de serviço.\n'])) });
  const r = await entregar(raiz, [...servico.map((rel) => `${rel}=instagram-feed`), 'v2/post.md=blog-post']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), SO_O_BLOG);
  for (const rel of servico) assert.ok(r.linhas.some((l) => l.includes(SERVICO(rel))), rel);
  assert.doesNotMatch(await leiame(raiz), /## Instagram/);
});

test('U3a-01b: a caption.txt inside a version folder is a step output and goes in', async (t) => {
  const raiz = await projeto(t, { 'v2/caption.txt': 'Legenda do passo.\n' });
  const r = await entregar(raiz, ['v2/caption.txt=instagram-feed']);
  assert.equal(r.code, 0);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/caption.txt']);
  assert.ok(!r.saida.includes('arquivo de serviço'));
});

test('U3a-01c: a missing item and a folder leave their channels not ready; the existing one is delivered', async (t) => {
  const raiz = await projeto(t, { 'v2/post.md': BLOG });
  await fs.mkdir(path.join(raiz, EXEC, 'v2', 'tweets'));
  const r = await entregar(raiz, ['v2/post.md=blog-post', 'v2/linkedin.md=linkedin-post', 'v2/tweets=twitter-post']);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA']);
  assert.deepEqual(await arvore(raiz), SO_O_BLOG);
  const md = await leiame(raiz);
  assert.match(secao(md, 'Blog'), /^Situação: Pronto$/m);
  for (const canal of ['LinkedIn', 'X/Twitter']) assert.match(secao(md, canal), /^Situação: Não está pronto$/m);
  assert.ok(r.saida.includes('LinkedIn não está pronto: 1 pendência.'));
  assert.ok(secao(md, 'Antes de usar').includes(`Não encontrei ${EXEC}/v2/linkedin.md.`));
  assert.ok(secao(md, 'Antes de usar').includes(`Não encontrei ${EXEC}/v2/tweets.`));
});

const EMAIL = '=== SUBJECT LINE ===\nSua horta começa hoje\n\n=== BODY ===\nCorpo do e-mail.\n';
const DO_CORE = {
  'instagram-feed': ['instagram', LEGENDA], 'instagram-reels': ['instagram', 'Roteiro do reel.\n'], 'instagram-stories': ['instagram', 'Roteiro dos stories.\n'],
  'linkedin-post': ['linkedin', 'Texto do post.\n'], 'linkedin-article': ['linkedin', 'Texto do artigo.\n'],
  'blog-post': ['blog', BLOG], 'blog-seo': ['blog', BLOG], 'email-newsletter': ['email', EMAIL], 'email-sales': ['email', EMAIL],
  'whatsapp-broadcast': ['whatsapp', 'Oi! Temos novidade.\n'], 'twitter-post': ['twitter', 'Um tweet.\n'],
  'twitter-thread': ['twitter', 'TWEET 1/2\nPrimeiro.\n\nTWEET 2/2\nSegundo.\n'], 'youtube-script': ['youtube', 'Roteiro do vídeo.\n'], 'youtube-shorts': ['youtube', 'Roteiro do short.\n'],
};

test('U3a-02a: each of the 14 platform formats of the core lands in the folder of its platform', async (t) => {
  const formatos = Object.keys(DO_CORE);
  const raiz = await projeto(t, Object.fromEntries(formatos.map((f) => [`v1/de-${f}.md`, DO_CORE[f][1]])));
  const r = await entregar(raiz, formatos.map((f) => `v1/de-${f}.md=${f}`));
  assert.equal(r.fim, 'ENTREGA:OK');
  const pastas = new Set((await arvore(raiz)).filter((rel) => rel.includes('/')).map((rel) => rel.split('/')[0]));
  assert.deepEqual([...pastas].sort(), ['blog', 'email', 'instagram', 'linkedin', 'twitter', 'whatsapp', 'youtube']);
  const md = await leiame(raiz);
  const NOME = { instagram: 'Instagram', linkedin: 'LinkedIn', blog: 'Blog', email: 'E-mail', whatsapp: 'WhatsApp', twitter: 'X/Twitter', youtube: 'YouTube' };
  for (const f of formatos) assert.ok(secao(md, NOME[DO_CORE[f][0]]).includes(`${EXEC}/v1/de-${f}.md`), f);
});

test('U3a-02a: a format that only exists in best-practices.local, with platform "blog", goes to blog/ with its name', async (t) => {
  const raiz = await projeto(t, { 'v1/guia.md': 'Um guia da casa.\n' }, { local: { 'guia-da-casa.md': '---\nplatform: "blog"\n---\n\nComo escrever um guia.\n' } });
  const r = await entregar(raiz, ['v1/guia.md=guia-da-casa']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'blog/guia.md']);
});

test('U3a-02b: no format, an unknown format and an unknown platform all go to outros/ and to the LEIA-ME', async (t) => {
  const arquivos = { 'v1/proposta.md': 'Proposta comercial.\n', 'v1/minuta.md': 'Minuta do contrato.\n', 'v1/aviso.md': 'Aviso para outra rede.\n' };
  const raiz = await projeto(t, arquivos, { local: { 'rede-nova.md': '---\nplatform: "outra-rede"\n---\n' } });
  const r = await entregar(raiz, ['v1/proposta.md', 'v1/minuta.md=formato-que-nao-existe', 'v1/aviso.md=rede-nova']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'outros/aviso.md', 'outros/minuta.md', 'outros/proposta.md']);
  const outros = secao(await leiame(raiz), 'Outros arquivos');
  for (const nome of ['proposta', 'minuta', 'aviso']) {
    assert.ok(outros.includes(`\`outros/${nome}.md\``) && outros.includes(`${EXEC}/v1/${nome}.md`), nome);
    assert.deepEqual(await bytes(raiz, `outros/${nome}.md`), Buffer.from(arquivos[`v1/${nome}.md`]));
  }
  assert.ok(outros.includes(`\`${EXEC}/v1/aviso.md\` — sem canal de publicação; está aqui para você usar como quiser.`));
  assert.ok(r.linhas.includes(`- ${EXEC}/v1/aviso.md não tem canal conhecido. Está em \`outros/\`.`), 'the screen summary');
});

const COM_TITULO = `---\ntitle: "${texto(120)}"\n---\n\nTexto do post.\n`;

test('U3a-02c: a 120-character title in the frontmatter of a linkedin-post is not a title pending', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': COM_TITULO });
  const r = await entregar(raiz, ['v1/post.md=linkedin-post']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.equal(await ler(raiz, 'linkedin/post.txt'), 'Texto do post.\n');
  assert.doesNotMatch(await leiame(raiz), /Antes de usar|Título/);
});

test('U3a-02d: an item with no format and a 120-character title goes to outros/, with no pending', async (t) => {
  const raiz = await projeto(t, { 'v1/proposta.md': COM_TITULO });
  const r = await entregar(raiz, ['v1/proposta.md']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'outros/proposta.md']);
  assert.doesNotMatch(await leiame(raiz), /Antes de usar/);
});

test('U3a-02e: a local instagram-feed.md with no platform falls back to the platform of the core', async (t) => {
  const raiz = await projeto(t, { 'v1/legenda.md': LEGENDA }, { local: { 'instagram-feed.md': '---\nconstraints:\n  caption_max_chars: 2200\n---\n' } });
  await entregar(raiz, ['v1/legenda.md=instagram-feed']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'instagram/legenda.txt']);
});

const erroDeUso = (r, mensagem) => {
  assert.equal(r.code, 1);
  assert.ok(r.linhas.includes(mensagem), `${mensagem} ← ${r.saida}`);
  assert.ok(!r.linhas.some((l) => l.startsWith('ENTREGA:')), 'no ENTREGA: line');
};

test('U3a-06a: a folder with no _opencrew/ — code 1, a message in PT-BR, no ENTREGA: line, nothing written', async (t) => {
  const raiz = await projeto(t, { 'v2/post.md': BLOG }, { instalado: false });
  const antes = await snapshot(raiz);
  erroDeUso(await entregar(raiz, ['v2/post.md=blog-post']), 'Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.');
  assert.deepEqual(await snapshot(raiz), antes);
});

const CHAMADAS = {
  'an unknown option': [['--crew', CREW, '--run', RUN, '--arquivo', `${EXEC}/v2/post.md=blog-post`, '--destno', 'x'], 'Opção desconhecida: --destno.'],
  'no --arquivo': [['--crew', CREW, '--run', RUN], 'Falta a opção obrigatória --arquivo.'],
  'no --run': [['--crew', CREW, '--arquivo', `${EXEC}/v2/post.md=blog-post`], 'Falta a opção obrigatória --run.'],
  'no --crew': [['--run', RUN, '--arquivo', `${EXEC}/v2/post.md=blog-post`], 'Falta a opção obrigatória --crew.'],
};
for (const [caso, [argv, mensagem]] of Object.entries(CHAMADAS)) {
  test(`U3a-06b: ${caso} — code 1, the message and the usage line, nothing written`, async (t) => {
    const raiz = await projeto(t, { 'v2/post.md': BLOG });
    const r = await rodar(raiz, argv);
    erroDeUso(r, mensagem);
    assert.ok(r.linhas.includes(USO));
    assert.equal(await arvore(raiz), null);
  });
}

test('U3a-06b: --ajuda prints the usage line, exits 0 and writes nothing', async (t) => {
  const raiz = await projeto(t, { 'v2/post.md': BLOG });
  const r = await rodar(raiz, ['--ajuda']);
  assert.deepEqual([r.code, r.linhas], [0, [USO]]);
  assert.equal(await arvore(raiz), null);
});

const post = `${EXEC}/v2/post.md=blog-post`;
const ERRADAS = {
  'a crew that does not exist': [['--crew', 'crews/nao-existe', '--run', RUN, '--arquivo', post], 'Crew não encontrada: crews/nao-existe'],
  'a crew folder with no crew.yaml': [['--crew', '.', '--run', RUN, '--arquivo', post], 'Crew não encontrada: .'],
  'a crew outside the project': [['--crew', '../vizinho/crews/c', '--run', RUN, '--arquivo', post], 'Caminho fora do projeto: ../vizinho/crews/c'],
  'a file outside the project': [['--crew', CREW, '--run', RUN, '--arquivo', '../fora/x.md=blog-post'], 'Caminho fora do projeto: ../fora/x.md'],
  'a --run with ..': [['--crew', CREW, '--run', '../x', '--arquivo', post], `Execução não encontrada: ../x. Execuções desta crew: ${RUN}.`],
  'a --run that does not exist': [['--crew', CREW, '--run', 'nao-existe', '--arquivo', post], `Execução não encontrada: nao-existe. Execuções desta crew: ${RUN}.`],
  'a list with no existing file': [['--crew', CREW, '--run', RUN, '--arquivo', `${EXEC}/v2/nada.md=blog-post,${EXEC}/v9/outro.md`], 'Nenhum arquivo da lista foi encontrado.'],
};
for (const [caso, [argv, mensagem]] of Object.entries(ERRADAS)) {
  test(`U3a-06c: ${caso} — code 1, the message, nothing written`, async (t) => {
    const raiz = await projeto(t, { 'v2/post.md': BLOG });
    erroDeUso(await rodar(raiz, argv), mensagem);
    assert.equal(await arvore(raiz), null);
    assert.equal(await existe(raiz, '../verificacao-entrega.md'), false);
  });
}

const slides = (n) => Array.from({ length: n }, (_, i) => `slide-${String(i + 1).padStart(2, '0')}.png`);

test('U3a-06d: a blog and a carousel with no pending — the whole delivery, ENTREGA:OK, code 0', async (t) => {
  const imagens = slides(8);
  const raiz = await projeto(t, { 'v2/post.md': BLOG, 'v2/legenda.md': LEGENDA, ...Object.fromEntries(imagens.map((nome, i) => [`slides/v1/${nome}`, png(i)])) });
  const r = await entregar(raiz, ['v2/post.md=blog-post', 'v2/legenda.md=instagram-feed', ...imagens.map((nome) => `slides/v1/${nome}=instagram-feed`)]);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:OK']);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt', 'instagram/legenda.txt', ...imagens.map((nome) => `instagram/${nome}`)]);
  assert.equal(await ler(raiz, 'blog/seo.txt'), 'Título: Como cuidar da horta\nMeta description: Guia simples para começar uma horta em casa.\n');
  assert.equal(await existe(raiz, '../ressalvas.json'), false);
  assert.ok(r.saida.includes(`${EXEC}/entrega/LEIA-ME.md`) && r.saida.includes('Instagram: Pronto') && r.saida.includes('Blog: Pronto'));
  assert.ok(!r.saida.includes(raiz), 'no absolute path on screen');
});

test('U3a-14b: after a full delivery only the run folder has changed, and it holds entrega/ and the report', async (t) => {
  const raiz = await projeto(t, { 'v2/post.md': BLOG, 'v2/legenda.md': LEGENDA });
  const antes = await snapshot(path.join(raiz, EXEC));
  await entregar(raiz, ['v2/post.md=blog-post', 'v2/legenda.md=instagram-feed']); // `rodar` compares the rest of the project
  const novos = (await snapshot(path.join(raiz, EXEC))).filter((linha) => !antes.includes(linha)).map((l) => l.split(path.sep).join('/').split(':')[0]);
  assert.deepEqual(novos, ['entrega/LEIA-ME.md', 'entrega/blog/artigo.md', 'entrega/blog/seo.txt', 'entrega/instagram/legenda.txt', 'verificacao-entrega.md']);
  assert.deepEqual((await fs.readdir(path.join(raiz, EXEC))).sort(), ['entrega', 'v2', 'verificacao-entrega.md']);
});

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/scripts/entregar.mjs');

test('U3a-06d: run as a command from the project folder — the summary on stdout, ENTREGA:OK last, exit 0', async (t) => {
  const raiz = await projeto(t, { 'v2/post.md': BLOG });
  const comando = (...argv) => spawnSync(process.execPath, [SCRIPT, ...argv], { cwd: raiz, encoding: 'utf8' });
  const ok = comando('--crew', CREW, '--run', RUN, '--arquivo', `${EXEC}/v2/post.md=blog-post`);
  assert.deepEqual([ok.status, ok.stderr, ok.stdout.trimEnd().split('\n').at(-1)], [0, '', 'ENTREGA:OK']);
  assert.deepEqual(await arvore(raiz), SO_O_BLOG);
  const erro = comando('--crew', CREW, '--run', RUN);
  assert.deepEqual([erro.status, erro.stdout], [1, `Falta a opção obrigatória --arquivo.\n${USO}\n`]);
});
