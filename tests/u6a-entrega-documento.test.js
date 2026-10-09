// specs/fase-u6a-polimento-do-uso-real.md — U6a-02a (the "Outros arquivos" line of the delivery summary)
// and U6a-04a (an empty document profile is said to be empty). Every run goes through the helpers that
// prove the project is the same outside the run folder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gerarDocx } from '../templates/_opencrew/core/scripts/documento.mjs';
import { PERFIL_COMPLETO, png, projeto as projetoDoc, rodar as rodarDoc } from './_documento.js';
import { BLOG, entregar, projeto, bytes } from './_entrega.js';

const PERFIL = '_opencrew/_memory/documento-oficial.md';
const FORMATO = { core: { 'documento-oficial.md': '---\nplatform: "documento"\n---\n\nComo escrever um documento oficial.\n' } };
const VAZIO = 'Perfil de documento encontrado, mas sem logotipo nem cabeçalho: o documento sai sem papel timbrado.';
const ATA = '::: titulo ATA\n\n# I. Abertura\nTexto da ata.\n';
const PERFIL_SO_COM_MARGENS = 'margem_esquerda_cm: 3\nfonte: Arial\nnumero_pagina: sim\n';

test('U6a-02a: a delivery with only a text with no channel shows "- Outros arquivos: Pronto"; with a channel and no pending item it does not', async (t) => {
  const soTexto = await projeto(t, { 'v1/minuta.md': '# Proposta\n\nTexto.\n' });
  const r = await entregar(soTexto, ['v1/minuta.md=texto-livre']);
  assert.equal(r.fim, 'ENTREGA:OK', r.saida);
  assert.deepEqual(r.linhas.slice(1, 3), ['Pasta: crews/teste/output/2026-03-03-143022/entrega', '- Outros arquivos: Pronto']);

  const comCanal = await projeto(t, { 'v1/post.md': BLOG, 'v1/minuta.md': '# Proposta\n\nTexto.\n' });
  const c = await entregar(comCanal, ['v1/post.md=blog-post', 'v1/minuta.md=texto-livre']);
  assert.ok(c.linhas.includes('- Blog: Pronto'), c.saida);
  assert.ok(!c.linhas.some((l) => l.startsWith('- Outros arquivos')), c.saida);
});

test('U6a-02a: a text with no channel that has a pending item shows "- Outros arquivos: Não está pronto", even next to a channel', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': BLOG, 'v1/minuta.md': 'Proposta para [PREENCHER: o cliente].\n' });
  const r = await entregar(raiz, ['v1/post.md=blog-post', 'v1/minuta.md=texto-livre']);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA', r.saida);
  assert.ok(r.linhas.includes('- Outros arquivos: Não está pronto'), r.saida);
});

test('U6a-04a: an empty profile is warned about by the command and by the delivery, with the same Word as before; a logo or one header line removes the warning', async (t) => {
  const vazio = await projetoDoc(t, { 'Atas/ata.md': ATA, [PERFIL]: PERFIL_SO_COM_MARGENS });
  const r = await rodarDoc(vazio, ['Atas/ata.md'], ['Atas/ata.docx']);
  assert.ok(r.linhas.includes(`- ${VAZIO}`), r.linhas.join('\n'));
  assert.equal(r.linhas.at(-1), 'DOCUMENTO:OK');
  const perfil = (await import('../templates/_opencrew/core/scripts/documento.mjs')).lerPerfil(PERFIL_SO_COM_MARGENS).perfil;
  assert.ok((await fs.readFile(path.join(vazio, 'Atas/ata.docx'))).equals(gerarDocx({ texto: ATA, perfil }).bytes), 'the Word is the same as before the warning');

  const comCabecalho = await projetoDoc(t, { 'Atas/ata.md': ATA, [PERFIL]: `${PERFIL_SO_COM_MARGENS}cabecalho_1: Associação Exemplo\n` });
  assert.ok(!(await rodarDoc(comCabecalho, ['Atas/ata.md'], ['Atas/ata.docx'])).linhas.includes(`- ${VAZIO}`));
  const comLogo = await projetoDoc(t, { 'Atas/ata.md': ATA, [PERFIL]: PERFIL_COMPLETO, 'Ativos/Marca/logo.png': png() });
  assert.ok(!(await rodarDoc(comLogo, ['Atas/ata.md'], ['Atas/ata.docx'])).linhas.includes(`- ${VAZIO}`));

  const entrega = await projeto(t, { 'v1/ata.md': ATA }, FORMATO);
  await fs.mkdir(path.join(entrega, '_opencrew/_memory'), { recursive: true });
  await fs.writeFile(path.join(entrega, PERFIL), PERFIL_SO_COM_MARGENS);
  const e = await entregar(entrega, ['v1/ata.md=documento-oficial']);
  assert.ok(e.linhas.includes(`- ${VAZIO}`), e.saida);
  assert.ok(!e.saida.includes('Sem papel timbrado'));
  assert.ok((await bytes(entrega, 'documentos/ata.docx')).equals(gerarDocx({ texto: ATA, perfil }).bytes));
});
