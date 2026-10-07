// specs/fase-u3b-documento-word.md — U3b-08 (rules 10 and 11): the profile of official document.
// It is born from the model and never overwritten; it gives the letterhead (logo and three lines),
// the footer with "Página X de Y", the margins and the font; an invalid profile writes nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerPerfil } from '../templates/_opencrew/core/scripts/documento.mjs';
import { gerar, xmlDe, porNome, filhos, filho, todos, textoDe, tem, val, png, projeto, rodar, existe, PERFIL_COMPLETO } from './_documento.js';
import { conferirPacote } from './_documento-conferir.js';

const MODELO = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/modelos/documento-oficial.md'), 'utf8');
const PERFIL = '_opencrew/_memory/documento-oficial.md';
const CHAVES = ['logotipo', 'logotipo_largura_cm', 'cabecalho_1', 'cabecalho_2', 'cabecalho_3', 'rodape', 'numero_pagina', 'margem_esquerda_cm', 'margem_direita_cm', 'margem_superior_cm', 'margem_inferior_cm', 'fonte', 'tamanho_corpo_pt'];
const LOGO = png(200, 80);
const com = (perfil, logotipo) => gerar('Texto.', { perfil: lerPerfil(perfil).perfil, logotipo });
const secao = (entradas) => todos(xmlDe(entradas, 'word/document.xml'), 'w:sectPr')[0];
/** What a run carries, in order: the text, `w:tab`, the field marks and `{INSTRUCTION}`. */
const conteudo = (p) => todos(p, 'w:r').flatMap((r) => filhos(r).filter((f) => f.nome !== 'w:rPr').map((f) => (f.nome === 'w:t' ? f.filhos.join('') : f.nome === 'w:instrText' ? `{${f.filhos.join('').trim()}}` : f.attrs['w:fldCharType'] ?? f.nome)));

test('U3b-08a: --criar-perfil writes the profile equal to the model; PERFIL:CRIADO', async (t) => {
  const raiz = await projeto(t, { 'Atas/ata.md': 'Texto.\n' });
  const r = await rodar(raiz, ['--criar-perfil'], [PERFIL]);
  assert.deepEqual([r.code, r.fim], [0, 'PERFIL:CRIADO']);
  assert.equal(r.linhas[0], `Criei ${PERFIL}. Abra, preencha o logotipo, o cabeçalho e o rodapé, e gere o documento de novo.`);
  assert.equal(await fs.readFile(path.join(raiz, PERFIL), 'utf8'), MODELO);
});

test('U3b-08a: run again over an edited profile, it stays the same, byte by byte; PERFIL:JA-EXISTE', async (t) => {
  const editado = `${MODELO}\ncabecalho_1: Associação Exemplo\n`;
  const raiz = await projeto(t, { [PERFIL]: editado });
  const r = await rodar(raiz, ['--criar-perfil']);
  assert.deepEqual([r.code, r.linhas], [0, [`${PERFIL} já existe. Não mexi nele.`, 'PERFIL:JA-EXISTE']]);
  assert.equal(await fs.readFile(path.join(raiz, PERFIL), 'utf8'), editado);
});

test('U3b-08a: the model has every key, one comment line for each, is a valid profile and makes no header', () => {
  const lido = lerPerfil(MODELO);
  assert.equal(lido.erro, null);
  assert.deepEqual(Object.keys(lido.linhas), CHAVES);
  for (const chave of CHAVES) assert.match(MODELO, new RegExp(`^# [^\\n]+\\n${chave}:`, 'm'), chave);
  for (const vazia of ['logotipo', 'cabecalho_1', 'cabecalho_2', 'cabecalho_3', 'rodape']) assert.equal(lido.perfil[vazia], '', vazia);
  const { nomes } = gerar('Texto.', { perfil: lido.perfil });
  assert.deepEqual(nomes.filter((n) => /header|footer|media/.test(n)), ['word/footer1.xml']);
  assert.doesNotMatch(MODELO, /alberth|palhares|aksp|[A-Za-z]:\\|(?!00\.000\.000)\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|https?:/i, 'no maintainer data in the model');
});

test('U3b-08b: the header is a 2-column table with a black bottom border and the logo of the user', () => {
  const { entradas } = com(PERFIL_COMPLETO, LOGO);
  const cabecalho = xmlDe(entradas, 'word/header1.xml');
  const [tabela, ...outras] = todos(cabecalho, 'w:tbl');
  assert.deepEqual([outras.length, todos(tabela, 'w:gridCol').length, todos(tabela, 'w:tc').length], [0, 2, 2]);
  assert.deepEqual(filhos(todos(tabela, 'w:tblBorders')[0]).map((b) => [b.nome, b.attrs['w:val'], b.attrs['w:sz'], b.attrs['w:color']]), [['w:bottom', 'single', '8', '000000']]);
  const embed = todos(todos(cabecalho, 'w:drawing')[0], 'a:blip')[0].attrs['r:embed'];
  const relacao = todos(xmlDe(entradas, 'word/_rels/header1.xml.rels'), 'Relationship').find((r) => r.attrs.Id === embed);
  assert.deepEqual([relacao.attrs.Target, relacao.attrs.Type.split('/').pop()], ['media/logo.png', 'image']);
  assert.ok(porNome(entradas)['word/media/logo.png'].equals(LOGO), 'the logo keeps the bytes of the file');
  assert.deepEqual(todos(cabecalho, 'wp:extent')[0].attrs, { cx: '900000', cy: '360000' });
  assert.deepEqual(todos(cabecalho, 'a:ext')[0].attrs, { cx: '900000', cy: '360000' });
  assert.equal(val(secao(entradas), 'w:headerReference', 'w:type'), 'default');
});

test('U3b-08b: the three lines are in order: 12 pt bold, 10 pt and 10 pt in 666666', () => {
  const [, direita] = todos(xmlDe(com(PERFIL_COMPLETO, LOGO).entradas, 'word/header1.xml'), 'w:tc');
  const linhas = filhos(direita).filter((f) => f.nome === 'w:p');
  assert.deepEqual(linhas.map(textoDe), ['ASSOCIAÇÃO EXEMPLO DE MORADORES', 'CNPJ 00.000.000/0001-00 · Fundada em 1990', 'www.exemplo.org · contato@exemplo.org']);
  assert.deepEqual(linhas.map((p) => [val(p, 'w:sz'), tem(p, 'w:b'), val(p, 'w:color') ?? null]), [['24', true, null], ['20', false, null], ['20', false, '666666']]);
});

test('U3b-08b: without a logo, one column only, no word/media/ and no header1.xml.rels', () => {
  const semLogo = PERFIL_COMPLETO.replace(/^logotipo: .*$/m, 'logotipo:');
  for (const { entradas, nomes } of [com(semLogo), com(PERFIL_COMPLETO)]) { // the path alone, without the bytes, is no logo
    assert.deepEqual(nomes.filter((n) => /media|header1\.xml\.rels/.test(n)), []);
    const cabecalho = xmlDe(entradas, 'word/header1.xml');
    assert.deepEqual([todos(cabecalho, 'w:gridCol').length, todos(cabecalho, 'w:tc').length, tem(cabecalho, 'w:drawing')], [1, 1, false]);
    assert.deepEqual(conferirPacote(entradas), []);
  }
});

test('U3b-08b: a profile with margins only has no header1.xml', () => {
  const { entradas, nomes } = com('margem_esquerda_cm: 2\nmargem_direita_cm: 2\n');
  assert.ok(!nomes.includes('word/header1.xml') && !tem(secao(entradas), 'w:headerReference'));
  assert.ok(nomes.includes('word/footer1.xml') && tem(secao(entradas), 'w:footerReference'));
});

test('U3b-08c: the footer has the text in italic 666666, an AAAAAA top border and "Página PAGE de NUMPAGES" after a tab', () => {
  const { entradas } = com(PERFIL_COMPLETO, LOGO);
  const [p, ...outros] = todos(xmlDe(entradas, 'word/footer1.xml'), 'w:p');
  assert.equal(outros.length, 0);
  assert.deepEqual(conteudo(p), ['Associação Exemplo de Moradores — documento oficial', 'w:tab', 'Página ', 'begin', '{PAGE}', 'separate', '1', 'end', ' de ', 'begin', '{NUMPAGES}', 'separate', '1', 'end']);
  const [texto, ...resto] = todos(p, 'w:r');
  assert.deepEqual([tem(texto, 'w:i'), val(texto, 'w:color'), val(texto, 'w:sz')], [true, '666666', '17']);
  assert.ok(resto.every((r) => val(r, 'w:sz') === '17' && !tem(r, 'w:i')));
  assert.deepEqual(filhos(todos(p, 'w:pBdr')[0]).map((b) => [b.nome, b.attrs['w:val'], b.attrs['w:color']]), [['w:top', 'single', 'AAAAAA']]);
  assert.deepEqual(todos(filho(p, 'w:pPr'), 'w:tab')[0].attrs, { 'w:val': 'right', 'w:pos': '9071' });
  assert.deepEqual(conteudo(todos(xmlDe(com('rodape: Só o texto\nnumero_pagina: não\n').entradas, 'word/footer1.xml'), 'w:p')[0]), ['Só o texto']);
});

test('U3b-08c: numero_pagina: nao and an empty footer make no footer1.xml and no reference in the section', () => {
  const { entradas, nomes } = com('numero_pagina: nao\nrodape:\n');
  assert.deepEqual(nomes.filter((n) => /footer|header/.test(n)), []);
  assert.ok(!tem(secao(entradas), 'w:footerReference'));
  assert.deepEqual(conferirPacote(entradas), []);
});

test('U3b-08d: left margin 2,5, Calibri and 10.5 pt reach the section and the Normal style', () => {
  const { entradas } = com('margem_esquerda_cm: 2,5\nfonte: Calibri\ntamanho_corpo_pt: 10.5\n');
  assert.equal(val(secao(entradas), 'w:pgMar', 'w:left'), '1417');
  const normal = todos(xmlDe(entradas, 'word/styles.xml'), 'w:style').find((s) => s.attrs['w:styleId'] === 'Normal');
  assert.deepEqual([val(normal, 'w:rFonts', 'w:ascii'), val(normal, 'w:rFonts', 'w:hAnsi'), val(normal, 'w:sz')], ['Calibri', 'Calibri', '21']);
  assert.equal(todos(xmlDe(entradas, 'word/footer1.xml'), 'w:tab')[0].attrs['w:pos'], String(11906 - 1417 - 1134));
});

test('U3b-08d: free text lines, quotes, & and < in a value and an empty key make a valid profile', () => {
  const texto = '# Perfil da associação\nEste arquivo guarda o papel timbrado.\n\ncabecalho_1: "Exemplo & Filhos <matriz>"\ncabecalho_2:\nVeja em https://exemplo.org: tudo certo.\n';
  const lido = lerPerfil(texto);
  assert.deepEqual([lido.erro, lido.perfil.cabecalho_1, lido.perfil.cabecalho_2, lido.linhas.cabecalho_1], [null, 'Exemplo & Filhos <matriz>', '', 4]);
  const { entradas } = gerar('Texto.', { perfil: lido.perfil });
  assert.deepEqual(todos(xmlDe(entradas, 'word/header1.xml'), 'w:p').map(textoDe).filter(Boolean), ['Exemplo & Filhos <matriz>']);
  assert.deepEqual(conferirPacote(entradas), []);
});

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const grande = Buffer.concat([LOGO, Buffer.alloc(3 * 1024 * 1024)]);
const DO_LOGO = (arquivo) => `Perfil, linha 2: o logotipo precisa ser um arquivo PNG de até 2 MB, dentro do projeto. Recebi: ${arquivo}.`;
const INVALIDOS = [
  ['logotpo: x.png', 'Perfil, linha 2: não conheço a chave logotpo.'],
  ['margem_esquerda_cm: 12', 'Perfil, linha 2: margem_esquerda_cm precisa ser um número de 1 a 6. Recebi: 12.'],
  ['numero_pagina: talvez', 'Perfil, linha 2: numero_pagina precisa ser sim ou nao. Recebi: talvez.'],
  ['tamanho_corpo_pt: 10,3', 'Perfil, linha 2: tamanho_corpo_pt precisa ser um número de 8 a 14 (aceita meio ponto). Recebi: 10,3.'],
  ['fonte: Arial; DROP', 'Perfil, linha 2: fonte precisa ser um nome com até 40 letras, dígitos e espaços. Recebi: Arial; DROP.'],
  ['logotipo_largura_cm: largo', 'Perfil, linha 2: logotipo_largura_cm precisa ser um número de 1 a 6. Recebi: largo.'],
  ['logotipo: Ativos/sumiu.png', 'Perfil, linha 2: não encontrei o logotipo Ativos/sumiu.png.'],
  ['logotipo: ../fora.png', DO_LOGO('../fora.png')],
  ['logotipo: Ativos/foto.png', DO_LOGO('Ativos/foto.png')],
  ['logotipo: Ativos/grande.png', DO_LOGO('Ativos/grande.png')],
  ['logotipo: Ativos', DO_LOGO('Ativos')],
];
for (const [linha, mensagem] of INVALIDOS) {
  test(`U3b-08e: "${linha}" — exit 1, the message with the line number, and nothing written`, async (t) => {
    const raiz = await projeto(t, { [PERFIL]: `Perfil de teste\n${linha}\n`, 'Atas/ata.md': 'Texto.\n', 'Ativos/foto.png': jpeg, 'Ativos/grande.png': grande });
    const r = await rodar(raiz, ['Atas/ata.md']);
    assert.deepEqual([r.code, r.linhas], [1, [mensagem]]);
    assert.equal(await existe(raiz, 'Atas/ata.docx'), false);
    const semPerfil = await rodar(raiz, ['Atas/ata.md', '--sem-perfil'], ['Atas/ata.docx']);
    assert.deepEqual([semPerfil.code, semPerfil.fim], [0, 'DOCUMENTO:OK']);
  });
}

test('U3b-08e: the full profile, with the logo on disk, gives the letterhead through the command', async (t) => {
  const raiz = await projeto(t, { [PERFIL]: PERFIL_COMPLETO, 'Ativos/Marca/logo.png': LOGO, 'Atas/ata.md': 'Texto.\n' });
  const r = await rodar(raiz, ['Atas/ata.md'], ['Atas/ata.docx']);
  assert.deepEqual([r.code, r.fim, r.linhas[1]], [0, 'DOCUMENTO:OK', `Perfil: ${PERFIL}`]);
  const gravado = await fs.readFile(path.join(raiz, 'Atas/ata.docx'));
  assert.ok(gravado.equals(com(PERFIL_COMPLETO, LOGO).bytes), 'the command and gerarDocx give the same bytes');
});
