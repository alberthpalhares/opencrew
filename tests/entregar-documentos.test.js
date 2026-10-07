// specs/fase-u3b-documento-word.md — U3b-05 (decision 9 and rule 12, "Na entrega"; §6): the Word
// document inside the delivery. An item whose format has the platform `documento` becomes
// `entrega/documentos/<name>.docx`, the same bytes the command writes; a conversion error is a
// pending item of `documentos`; without such an item nothing changes. Every run goes through
// `rodar`, which proves U3a-14b: outside the run folder (and the destination) the project is the same.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gerarDocx, main as documento } from '../templates/_opencrew/core/scripts/documento.mjs';
import { DICAS, PERFIL_COMPLETO, png } from './_documento.js';
import { BLOG, COPIA, CREW, DEST, EXEC, RUN, arvore, bytes, entregar, entregarEm, lerDe, leiame, lista, passos, projeto, rodar, secao, titulos } from './_entrega.js';

const PERFIL = '_opencrew/_memory/documento-oficial.md';
const FORMATO = { core: { 'documento-oficial.md': '---\nplatform: "documento"\n---\n\nComo escrever um documento oficial.\n' } };
const ATA = '::: titulo ATA DA REUNIÃO\n\n# I. Abertura\nTexto da ata, com 12 presentes.\n';
const ABRA = (arquivo) => `Abra \`documentos/${arquivo}\` no Word e confira: cabeçalho, páginas, tabelas e assinaturas.`;
const NAO_EDITE = 'Não edite o Word dentro desta pasta: ela é refeita a cada entrega. Para mexer, copie o arquivo para outra pasta do projeto.';
const NO_WORD = '- Como o documento abre no Word.';
const SEM_PERFIL = 'Sem papel timbrado: este projeto não tem perfil de documento oficial. Para criar o seu: node _opencrew/core/scripts/documento.mjs --criar-perfil';
const origem = (rel) => `${EXEC}/${rel}`;

/** Writes files of the project that are not in the run folder (the profile, the logo). */
async function noProjeto(raiz, arquivos) {
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
    await fs.writeFile(path.join(raiz, rel), conteudo);
  }
}
const comPerfil = (raiz) => noProjeto(raiz, { [PERFIL]: PERFIL_COMPLETO, 'Ativos/Marca/logo.png': png() });

/** The `.docx` the command writes for a text of the run folder (called after the delivery). */
async function doComando(raiz, rel) {
  const code = await documento([origem(rel), '--saida', 'conferencia'], { cwd: raiz, escrever: () => {} });
  assert.equal(code, 0);
  return fs.readFile(path.join(raiz, 'conferencia', `${path.basename(rel, path.extname(rel))}.docx`));
}

test('U3b-05b: ata.md=documento-oficial with the full profile — documentos/ata.docx, the same bytes of the command, ENTREGA:OK', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA, 'v1/video.md': 'Roteiro do vídeo.\n', 'v1/proposta.md': 'Proposta comercial.\n' }, FORMATO);
  await comPerfil(raiz);
  const r = await entregar(raiz, ['v1/ata.md=documento-oficial', 'v1/video.md=youtube-script', 'v1/proposta.md']);
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:OK'], r.saida);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'documentos/ata.docx', 'outros/proposta.md', 'youtube/video.md'], 'the .md is not in outros/ and is not copied');
  const word = await bytes(raiz, 'documentos/ata.docx');
  assert.ok(word.equals(await doComando(raiz, 'v1/ata.md')), 'byte by byte the Word of the command');
  assert.ok(!word.equals(gerarDocx({ texto: ATA }).bytes) && word.includes('word/media/logo.png'), 'the profile of the project was used');
  assert.ok(r.linhas.includes('- Documentos: Pronto'), r.saida);
});

test('U3b-05b: the LEIA-ME has "## Documentos" between YouTube and "Outros arquivos", with the source, the steps of §6 and the Word line', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA, 'v1/video.md': 'Roteiro do vídeo.\n', 'v1/proposta.md': 'Proposta comercial.\n' }, FORMATO);
  await comPerfil(raiz);
  await entregar(raiz, ['v1/proposta.md', 'v1/ata.md=documento-oficial', 'v1/video.md=youtube-script']);
  const md = await leiame(raiz);
  assert.deepEqual(titulos(md).slice(0, 3), ['YouTube', 'Documentos', 'Outros arquivos']);
  const doc = secao(md, 'Documentos');
  assert.match(doc, /^Situação: Pronto$/m);
  assert.ok(doc.includes(`- \`documentos/ata.docx\` — origem: \`${origem('v1/ata.md')}\``), doc);
  assert.deepEqual(passos(doc), [ABRA('ata.docx'), NAO_EDITE, ...DICAS]);
  assert.doesNotMatch(doc, /Atenção:/);
  assert.equal(secao(md, 'O que não foi conferido').split('\n').at(-1), NO_WORD);
});

test('U3b-05b: a .txt without a profile gives the Word with the defaults; an image in the text is a warning in "Atenção:" and the end does not change', async (t) => {
  const minuta = `${ATA}![foto da reunião](foto.png)\n`;
  const raiz = await projeto(t, { 'v1/Minuta Final.txt': minuta }, FORMATO);
  const r = await entregar(raiz, ['v1/Minuta Final.txt=documento-oficial']);
  assert.equal(r.fim, 'ENTREGA:OK', r.saida);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'documentos/Minuta Final.docx']);
  assert.ok((await bytes(raiz, 'documentos/Minuta Final.docx')).equals(gerarDocx({ texto: minuta }).bytes));
  const aviso = `${origem('v1/Minuta Final.txt')}: 1 imagem não incluída: o Word não leva imagem no texto.`;
  const md = await leiame(raiz);
  const doc = secao(md, 'Documentos');
  assert.doesNotMatch(md, /## Para ter um PDF/, 'the PDF tip of a .md is not for the Word');
  assert.ok(doc.includes(`Atenção:\n- ${aviso}`), doc);
  assert.match(doc, /^Situação: Pronto$/m);
  assert.ok(r.linhas.includes(`- ${aviso}`), r.saida);
  assert.ok(doc.includes(`- ${SEM_PERFIL}`) && r.linhas.includes(`- ${SEM_PERFIL}`), 'without a profile the delivery says the Word has no letterhead');
});

test('U3b-05b: a pending item in documentos opens the steps with "Antes de usar", not "Antes de postar"', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': `[PREENCHER: hora do encerramento]\n` }, FORMATO);
  await comPerfil(raiz);
  const r = await entregar(raiz, ['v1/ata.md=documento-oficial']);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA', r.saida);
  const [primeiro] = passos(secao(await leiame(raiz), 'Documentos'));
  assert.match(primeiro, /^Antes de usar, resolva o que está em Pendências\./);
  assert.doesNotMatch(r.saida, /Sem papel timbrado/);
});

test('U3b-05b: a .pdf with this format is in documentos/ as it came, with the warning; two texts with the same name do not overwrite', async (t) => {
  const pdf = Buffer.from('%PDF-1.7\n\u00e9\u0000fim', 'latin1');
  const raiz = await projeto(t, { 'v1/contrato.pdf': pdf, 'v1/ata.md': ATA, 'v1/ata.txt': 'Outra ata.\n' }, FORMATO);
  const r = await entregar(raiz, ['v1/contrato.pdf=documento-oficial', 'v1/ata.md=documento-oficial', 'v1/ata.txt=documento-oficial']);
  assert.equal(r.fim, 'ENTREGA:OK', r.saida);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'documentos/2-ata.docx', 'documentos/ata.docx', 'documentos/contrato.pdf']);
  assert.ok((await bytes(raiz, 'documentos/contrato.pdf')).equals(pdf));
  assert.ok((await bytes(raiz, 'documentos/2-ata.docx')).equals(gerarDocx({ texto: 'Outra ata.\n' }).bytes));
  const doc = secao(await leiame(raiz), 'Documentos');
  const aviso = `${origem('v1/contrato.pdf')}: só converto .md ou .txt em Word. Copiei o arquivo como está.`;
  assert.ok(doc.includes(`- ${aviso}`) && r.linhas.includes(`- ${aviso}`), doc);
  assert.deepEqual(passos(doc), [ABRA('ata.docx'), ABRA('2-ata.docx'), NAO_EDITE, ...DICAS]);
});

test('U3b-05b: only a .pdf — no step and no Word line; the folder and the warning are there', async (t) => {
  const raiz = await projeto(t, { 'v1/contrato.pdf': '%PDF' }, FORMATO);
  const r = await entregar(raiz, ['v1/contrato.pdf=documento-oficial']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'documentos/contrato.pdf']);
  const md = await leiame(raiz);
  assert.match(secao(md, 'Documentos'), /^Situação: Pronto$/m);
  assert.deepEqual(passos(secao(md, 'Documentos')), []);
  assert.ok(!md.includes(NO_WORD));
});

test('U3b-05b: the copy to the project takes documentos/ along, and a second delivery finds it up to date', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA }, FORMATO);
  await comPerfil(raiz);
  const r = await entregarEm(raiz, DEST, ['v1/ata.md=documento-oficial']);
  assert.equal(r.fim, 'ENTREGA:OK', r.saida);
  assert.ok((await fs.readFile(path.join(raiz, COPIA, 'documentos/ata.docx'))).equals(await bytes(raiz, 'documentos/ata.docx')));
  const daCopia = secao(await lerDe(raiz, `${COPIA}/LEIA-ME.md`), 'Documentos');
  assert.deepEqual(passos(daCopia), [ABRA('ata.docx'), ...DICAS], 'the copy is not rebuilt: the step about this folder stays out');
  const de_novo = await rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(['v1/ata.md=documento-oficial']), '--destino', DEST], [`${DEST}/`]);
  assert.ok(de_novo.linhas.includes(`Cópia: ${COPIA} — já está atualizada.`), de_novo.saida);
});

const naoGerei = (rel, motivo) => `Não consegui gerar o Word de ${origem(rel)}: ${motivo}.`;

/** `documentos` is not ready with that message, the blog is delivered and the end is INCOMPLETA. */
async function conferirIncompleta(raiz, r, mensagem) {
  assert.deepEqual([r.code, r.fim], [0, 'ENTREGA:INCOMPLETA'], r.saida);
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt'], 'the other channels are delivered; no Word');
  const md = await leiame(raiz);
  assert.match(secao(md, 'Blog'), /^Situação: Pronto$/m);
  assert.match(secao(md, 'Documentos'), /^Situação: Não está pronto$/m);
  assert.ok(secao(md, 'Documentos').includes(`Pendências:\n- ${mensagem}`), secao(md, 'Documentos'));
  assert.ok(secao(md, 'Antes de usar').includes(`Documentos não está pronto: 1 pendência.\n  - ${mensagem}`), secao(md, 'Antes de usar'));
  assert.ok(r.linhas.includes('- Documentos: Não está pronto') && r.linhas.includes(`- ${mensagem}`), r.saida);
  assert.ok(!md.includes(NO_WORD));
}

const ITENS = ['v1/ata.md=documento-oficial', 'v1/post.md=blog-post'];

test('U3b-05j: an invalid profile — documentos is not ready, the message names the file, the blog is delivered, ENTREGA:INCOMPLETA', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA, 'v1/post.md': BLOG }, FORMATO);
  await noProjeto(raiz, { [PERFIL]: 'cabecalho_1: Associação Exemplo\nchave_estranha: x\n' });
  await conferirIncompleta(raiz, await entregar(raiz, ITENS), naoGerei('v1/ata.md', 'Perfil, linha 2: não conheço a chave chave_estranha'));
});

test('U3b-05j: a profile whose logo is not there — the same, with the line of the profile', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA, 'v1/post.md': BLOG }, FORMATO);
  await noProjeto(raiz, { [PERFIL]: PERFIL_COMPLETO });
  await conferirIncompleta(raiz, await entregar(raiz, ITENS), naoGerei('v1/ata.md', 'Perfil, linha 1: não encontrei o logotipo Ativos/Marca/logo.png'));
});

test('U3b-05j: an error while converting (injected) — the same, and --aceitar-pendencias does not accept it', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA, 'v1/post.md': BLOG }, FORMATO);
  const gerarDocxQueFalha = () => { throw new Error('zip\nquebrado'); };
  for (const extras of [[], ['--aceitar-pendencias']]) {
    const r = await rodar(raiz, ['--crew', CREW, '--run', RUN, '--arquivo', lista(ITENS), ...extras], [], { gerarDocx: gerarDocxQueFalha });
    await conferirIncompleta(raiz, r, naoGerei('v1/ata.md', 'zip quebrado'));
  }
});

test('U3b-05j: a text with nothing to convert, or not in UTF-8 — the same, each with its reason', async (t) => {
  for (const [conteudo, motivo] of [['---\ntitulo: x\n---\n\n', 'o arquivo não tem texto para converter'], [Buffer.from('Ata da reunião', 'latin1'), 'o arquivo não está em UTF-8']]) {
    const raiz = await projeto(t, { 'v1/ata.md': conteudo, 'v1/post.md': BLOG }, FORMATO);
    await conferirIncompleta(raiz, await entregar(raiz, ITENS), naoGerei('v1/ata.md', motivo));
  }
});

test('U3b-05n: a delivery without a documento-oficial item — no documentos/, no change in the LEIA-ME, and the profile is not even read', async (t) => {
  const arquivos = { 'v1/post.md': BLOG, 'v1/ata.md': ATA };
  const raiz = await projeto(t, arquivos, FORMATO);
  const semPerfil = await entregar(raiz, ['v1/post.md=blog-post', 'v1/ata.md']);
  const antes = await leiame(raiz);
  assert.equal(semPerfil.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'blog/artigo.md', 'blog/seo.txt', 'outros/ata.md']);
  assert.deepEqual(titulos(antes), ['Blog', 'Outros arquivos', 'O que não foi conferido', 'Para ter um PDF', 'Sobre esta pasta']);
  assert.doesNotMatch(`${antes}\n${semPerfil.saida}`, /Documentos|Word|documentos\//);
  assert.deepEqual(secao(antes, 'O que não foi conferido').split('\n').slice(-3), ['- Links e fatos citados no texto.', '- Texto dentro das imagens.', '- Aparência final em cada rede.']);
  await noProjeto(raiz, { [PERFIL]: 'chave_estranha: x\n' });
  const comPerfilRuim = await entregar(raiz, ['v1/post.md=blog-post', 'v1/ata.md']);
  assert.equal(comPerfilRuim.fim, 'ENTREGA:OK');
  assert.equal(await leiame(raiz), antes);
});

test('U3b-05n: the folder comes from the platform — documento-oficial whose best-practice declares none goes to outros/, as before', async (t) => {
  const raiz = await projeto(t, { 'v1/ata.md': ATA }, { core: { 'documento-oficial.md': '---\nname: "Documento oficial"\n---\n\nGuia.\n' } });
  const r = await entregar(raiz, ['v1/ata.md=documento-oficial']);
  assert.equal(r.fim, 'ENTREGA:OK');
  assert.deepEqual(await arvore(raiz), ['LEIA-ME.md', 'outros/ata.md']);
});
