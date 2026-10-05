// specs/fase-r1-reparos-1-6-1.md — R1-02 (placeholders and non-text files), R1-03 (forbidden
// terms are whole words; preferred terms are not forbidden) and R1-04 (the local overlay adds
// to the core limits). Synthetic, neutral text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { formatarRelatorio, main } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { projetoFalso as projeto, medir, um, CREW, SAIDA, texto, tags, itens, bloqueios, par } from './_helpers.js';

const comProibicao = (linha, conteudo) => um(conteudo, null, { memorias: `# Memória\n\n## Proibições Explícitas\n\n${linha}\n` });
const placeholders = (r) => itens(r).filter((i) => i.item === 'Placeholder').map((i) => i.detalhe);
const proibidos = (r) => bloqueios(r).filter((i) => /proibido/i.test(i.item)).map((i) => i.detalhe);
const NOTA_VARIAVEL = 'Variável de personalização {{…}}: confira se a sua ferramenta de envio troca pelo dado real.';
const NOTA_PREFERIDOS = 'Termos lidos como preferidos (não bloqueiam): "acessível"';

test('R1-02a: hexadecimal colours are not placeholders', async () => {
  const r = await um('Paleta: fundo #666666, texto #111 e sombra #000000ff. Degradê #666666/#000000.\n');
  assert.deepEqual(placeholders(r), []);
});

test('R1-02b: in an HTML file only the visible text is checked, not the colours in <style>', async () => {
  const head = '<style>.t{color:#666666;background:#000000}.t::before{content:"[Cliente X]"}</style><script>const n = "{{name}}";</script>';
  const html = `<html><head>${head}</head><body><h1 title="[Nome]">Olá, [Nome]</h1></body></html>`;
  const r = await medir([['slide.html', html]]);
  assert.deepEqual(bloqueios(r).map((i) => [i.item, i.detalhe]), [['Placeholder', '[Nome]']]);
});

test('R1-02b: a tag whose name only starts with "script" or "style" does not hide the rest of the file', async () => {
  const r = await medir([['slide.html', '<script-x>a</script-x><style-guia>b</style-guia><p>Olá, [Nome]</p>']]);
  assert.deepEqual(placeholders(r), ['[Nome]']);
});

test('R1-02c: a list with only foto.jpg and doc.docx exits 0 with one "não é texto (2)" line', async () => {
  const raiz = await projeto();
  await fs.writeFile(path.join(raiz, SAIDA, 'foto.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  await fs.writeFile(path.join(raiz, SAIDA, 'doc.docx'), 'PK conteúdo de documento');
  const linhas = [];
  const code = await main(['--crew', CREW, '--arquivo', `${SAIDA}/foto.jpg,${SAIDA}/doc.docx`], { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')) });
  assert.equal(code, 0);
  const naoTexto = linhas.filter((l) => l.includes('Não verificado — não é texto'));
  assert.equal(naoTexto.length, 1);
  assert.match(naoTexto[0], /⚪ Não verificado — não é texto \(2\): \S*foto\.jpg, \S*doc\.docx$/);
  assert.ok(!linhas.some((l) => l.includes('❌')));
  assert.equal(linhas.filter((l) => l.trim()).at(-1), 'VERIFICACAO:OK');
});

test('R1-02d: a roman numeral, a plain number and a CEP are not placeholders', async () => {
  const r = await um('O XXX Congresso Brasileiro reuniu 2000000 de visitantes. CEP 59000000.\n');
  assert.deepEqual(bloqueios(r), []);
});

for (const formato of ['whatsapp-broadcast', 'email-newsletter']) {
  test(`R1-02e: "{{name}}" in a declared ${formato} is an informative note, not a block`, async () => {
    const r = await um('Oi {{name}}! Uma novidade para você.\n', formato);
    assert.deepEqual(bloqueios(r), []);
    assert.ok(r.notas.includes(NOTA_VARIAVEL), r.notas.join(' | '));
  });
}

test('R1-02f: dados.json and a binary file of unknown extension are "não é texto"', async () => {
  const r = await medir([['dados.json', '{"a": 1}'], ['arquivo.xyz', Buffer.from([0x41, 0x00, 0x42, 0x00])]]);
  assert.deepEqual(r.naoTexto, [`${SAIDA}/dados.json`, `${SAIDA}/arquivo.xyz`]);
  assert.deepEqual(r.arquivos, []);
  assert.ok(formatarRelatorio(r).includes(`⚪ Não verificado — não é texto (2): ${SAIDA}/dados.json, ${SAIDA}/arquivo.xyz`));
  const porExtensao = await medir([['a.svg', '<svg/>'], ['b.css', 'p{}'], ['c.pdf', '%PDF']]);
  assert.equal(porExtensao.naoTexto.length, 3);
});

test('R1-02f: a .md, .txt, .html or .htm with a null byte and no UTF-16 mark is an alert, not "não é texto"', async () => {
  const semMarca = Buffer.from(`## Legenda\n\n${texto(2300)}\n`, 'utf16le');
  const r = await medir(['a.md', 'b.txt', 'c.html', 'd.htm'].map((nome) => [nome, semMarca, 'instagram-feed']));
  assert.deepEqual(r.naoTexto, []);
  assert.deepEqual(r.arquivos.map((a) => a.itens.map((i) => [i.item, i.nivel, i.detalhe])), Array(4).fill([['Não verificado', 'alerta', 'o arquivo não está em UTF-8']]));
  assert.ok(formatarRelatorio(r).includes('- ⚠️ Não verificado — o arquivo não está em UTF-8'));
  assert.deepEqual([r.alertas, r.naoMedidos, r.status], [4, 4, 'OK']);
});

test('R1-02g: ten images next to a correct post — 0 "não medidos" and a single line for the ten', async () => {
  const pngs = Array.from({ length: 10 }, (_, i) => [`slide-${i + 1}.png`, Buffer.from([0x89, 0x50, 0x4e, 0x47])]);
  const r = await medir([['post.md', `## Post\n\n${texto(500)}\n`, 'linkedin-post'], ...pngs]);
  const relatorio = formatarRelatorio(r);
  assert.equal(r.naoMedidos, 0);
  assert.ok(relatorio.includes('**Resumo: 0 bloqueios, 0 alertas, 0 não medidos**'));
  const linhas = relatorio.split('\n').filter((l) => l.includes('não é texto'));
  assert.equal(linhas.length, 1);
  pngs.forEach(([nome]) => assert.ok(linhas[0].includes(nome), nome));
  assert.ok(linhas[0].includes('não é texto (10)'));
});

test('R1-02h: repeated digits inside a link are still a placeholder', async () => {
  const r = await um('Fale pelo wa.me/5584999999999 agora.\n');
  assert.deepEqual(placeholders(r), ['wa.me/5584999999999']);
});

test('R1-02h: six equal digits count in a link, ten digits or more count anywhere, five never do', async () => {
  assert.deepEqual(placeholders(await um('Fale pelo wa.me/999999 agora.\n')), ['wa.me/999999']);
  assert.deepEqual(placeholders(await um('Ligue 84999999999 agora.\n')), ['84999999999']);
  assert.deepEqual(placeholders(await um('Fale pelo wa.me/5584999991234 agora.\n')), []);
});

test('R1-02i: "XXX" at the end of a line is a placeholder even if the next line starts in upper case', async () => {
  const r = await um('Ligue para XXX\nDepois confirme o horário.\n');
  assert.deepEqual(placeholders(r), ['XXX']);
});

test('R1-02j: "{{name}}" in a declared linkedin-post is a block', async () => {
  const r = await um('Oi {{name}}! Uma novidade para você.\n', 'linkedin-post');
  assert.deepEqual(placeholders(r), ['{{name}}']);
  assert.ok(!r.notas.includes(NOTA_VARIAVEL));
});

test('R1-02k: the href of an HTML link is checked, and so are src and alt', async () => {
  const html = '<p><a href="https://wa.me/5584999999999">Fale conosco</a><img src="https://example.com/a.png" alt="[Nome] sorrindo"></p>';
  const r = await medir([['pagina.html', html]]);
  assert.deepEqual(placeholders(r), ['https://wa.me/5584999999999', '[Nome]', 'example.com']);
});

test('R1-02l: an HTML file in a declared instagram-feed gets no "Não medido" line', async () => {
  const r = await medir([['slide-01.html', '<html><body><h1>Um slide correto</h1></body></html>', 'instagram-feed']]);
  const relatorio = formatarRelatorio(r);
  assert.ok(!relatorio.includes('Não medido'));
  assert.ok(relatorio.includes('⚪ Nada a apontar nas checagens gerais (limites não medidos)'));
  assert.equal(r.naoMedidos, 0);
});

test('R1-03a: the forbidden "IA" does not match inside "dia" or "trajetória"', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "IA"', 'No dia a dia, a trajetória da empresa mudou.\n')), []);
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "arte"', 'Faz parte do plano.\n')), []);
});

test('R1-03b: the term after "prefira" is preferred, not forbidden, and a note lists it', async () => {
  const r = await comProibicao('- Nunca usar "barato"; prefira "acessível"', 'Um plano acessível para todos.\n');
  assert.deepEqual(bloqueios(r), []);
  assert.ok(r.notas.includes(NOTA_PREFERIDOS), r.notas.join(' | '));
});

test('R1-03c: the forbidden "IA" matches "IA" and "IAs"', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "IA"', 'Hoje a IA resolve.\n')), ['IA']);
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "IA"', 'Hoje as IAs resolvem.\n')), ['IA']);
});

test('R1-03d: the forbidden acronym "IA" does not match the verb "ia"', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "IA"', 'Ontem eu ia comentar o assunto.\n')), []);
});

test('R1-03e: a term with a symbol is a whole word too — "#publi" is not "#publicidade"', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "#publi"', 'No final, use #publi no fim.\n')), ['#publi']);
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "#publi"', 'No final, marque #publicidade.\n')), []);
});

test('R1-03f: the forbidden "barato" matches the simple plural "baratos"', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "barato"', 'Planos baratos para todos.\n')), ['barato']);
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "flor"', 'Um buquê de flores.\n')), ['flor']);
  // Six capital letters are not an acronym: the comparison ignores case.
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "BARATO"', 'Um plano barato.\n')), ['BARATO']);
});

test('R1-03f: a term of two words matches across a line break, and never glued', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "por apenas"', 'Leve hoje por\napenas uma taxa.\n')), ['por apenas']);
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "por apenas"', 'O porapenas não existe.\n')), []);
});

test('R1 revisão: empty quotes or a loose quote before the term do not shift the pairs', async () => {
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar "" nem "barato"', 'Não é ruim nem bom. É barato.\n')), ['barato']);
  assert.deepEqual(proibidos(await comProibicao('- Nunca usar tela de 15" nem "polegadas"', 'Nem todas têm 15 polegadas.\n')), ['polegadas']);
});

test('R1 revisão: prohibitions in a numbered or "+" list, under a "### Proibições Explícitas" heading, are read', async () => {
  const memorias = '# Memória\n\n## Regras\n\n### 🚫 Proibições Explícitas\n\n1. Nunca usar "barato"\n+ Nunca usar "caro"\n\n### Outras notas\n\n- Nunca usar "plano"\n';
  assert.deepEqual(proibidos(await um('Um plano barato e caro.\n', null, { memorias })), ['barato', 'caro']);
});

const TROCAS = [' → usar', '; trocar por', '; preferir', '; use', '; utilize', '; utilizar', ' ->'].map((m) => `- Nunca usar "barato"${m} "acessível"`);
for (const linha of TROCAS) {
  test(`R1-03g: a swap marker makes the next term preferred — ${linha}`, async () => {
    const r = await comProibicao(linha, 'Um plano acessível para todos.\n');
    assert.deepEqual(bloqueios(r), []);
    assert.ok(r.notas.includes(NOTA_PREFERIDOS), r.notas.join(' | '));
  });
}

const MARCADOR_QUE_NAO_VALE = [
  ['- Nunca usar "barato" nem usar "promoção"', 'Uma promoção imperdível.\n', 'promoção'],
  ['- Nunca usar "barato"; também não usar "baratinho"', 'Um plano baratinho.\n', 'baratinho'],
  ['- Proibido "grátis" por exigência do jurídico, e também "gratuito"', 'Um plano gratuito.\n', 'gratuito'],
  ['- Nunca usar "barato" nem "por apenas"', 'Leve por apenas uma taxa.\n', 'por apenas'],
  ['- Proibido usar "gratuito"', 'Um plano gratuito.\n', 'gratuito'], // a marker before the first term is not a swap
  ...['nunca', 'jamais', 'sem', 'evite', 'evitar'].map((n) => [`- Nunca usar "barato"; ${n} usar "promoção"`, 'Uma promoção imperdível.\n', 'promoção']),
  ...['proibido', 'proibida', 'proibidos', 'proibidas', 'vetado', 'vetada', 'parar de', 'pare de', 'deixar de', 'deixe de']
    .map((n) => [`- Nunca usar "barato"; ${n} usar "promoção"`, 'Uma promoção imperdível.\n', 'promoção']),
];
for (const [linha, conteudo, termo] of MARCADOR_QUE_NAO_VALE) {
  test(`R1-03h: where the marker does not apply the term stays forbidden — ${linha}`, async () => {
    const r = await comProibicao(linha, conteudo);
    assert.deepEqual(proibidos(r), [termo]);
    assert.ok(!r.notas.some((n) => n.includes('preferidos')));
  });
}

const NEGACAO_LONGE = ['- Proibido usar "barato" e proibido usar "grátis"', '- Não pode usar "barato" nem pode usar "grátis"', '- Pare de usar "barato" e deixe logo de usar "grátis"'];
for (const linha of NEGACAO_LONGE) {
  test(`R1-03h: a negation among the three words before the marker cancels it — ${linha}`, async () => {
    const r = await comProibicao(linha, 'Um plano barato e grátis.\n');
    assert.deepEqual(proibidos(r), ['barato', 'grátis']);
    assert.ok(!r.notas.some((n) => n.includes('preferidos')));
  });
}

test('R1-03h: a negation four words before the marker, or before the previous term, does not cancel it', async () => {
  for (const linha of ['- Nunca usar "barato"; não é o tom, melhor usar "acessível"', '- Não usar "barato"; prefira "acessível"']) {
    const r = await comProibicao(linha, 'Um plano acessível e barato.\n');
    assert.deepEqual(proibidos(r), ['barato'], linha);
    assert.ok(r.notas.includes(NOTA_PREFERIDOS), linha);
  }
});

test('R1-03i: in a line written with "em vez de" both terms stay forbidden', async () => {
  const r = await comProibicao('- Usar "acessível" em vez de "barato"', 'Um plano acessível e barato.\n');
  assert.deepEqual(proibidos(r), ['acessível', 'barato']);
  for (const expressao of ['ao invés de', 'no lugar de']) {
    const outra = await comProibicao(`- Nunca usar "barato"; use "acessível" ${expressao} "caro"`, 'Um plano acessível, barato ou caro.\n');
    assert.deepEqual(proibidos(outra), ['barato', 'acessível', 'caro'], expressao);
  }
  // Same rule: in a line with "em vez de" every quoted term stays forbidden, marker or not.
  const comMarcador = await comProibicao('- Nunca usar "barato"; use "acessível" em vez de "caro"', 'Um plano acessível, barato ou caro.\n');
  assert.deepEqual(proibidos(comMarcador), ['barato', 'acessível', 'caro']);
});

test('R1-04a: a local overlay without constraints keeps the core limits and adds a note', async () => {
  const local = { 'instagram-feed.md': '# Instagram — minhas notas\n\nPrefira tom direto.\n' };
  const r = await um(`## Legenda\n\n${texto(300)}\n\n${tags(45)}\n`, 'instagram-feed', { local });
  assert.deepEqual(bloqueios(r).map(par), [[45, 30]]);
  assert.ok(r.notas.includes('O arquivo `_opencrew/best-practices.local/instagram-feed.md` não declara limites (`constraints:`); usei os do core.'), r.notas.join(' | '));
});

const OVERLAYS = {
  'a plain number': '---\nconstraints:\n  hashtags_max: 5\n---\n',
  'a YAML comment after the number': '---\nconstraints:\n  hashtags_max: 5   # era 30\n---\n',
  'the number in quotes': '---\nconstraints:\n  hashtags_max: "5"\n---\n',
  'a BOM at the start of the file': '﻿---\nconstraints:\n  hashtags_max: 5\n---\n',
};
for (const [caso, overlay] of Object.entries(OVERLAYS)) {
  test(`R1-04b: an overlay key goes on top of the core limits, the other limits remain — ${caso}`, async () => {
    const local = { 'instagram-feed.md': overlay };
    const r = await um(`=== CAPTION ===\n${texto(2300)}\n\n=== HASHTAGS ===\n${tags(6)}\n`, 'instagram-feed', { local });
    assert.deepEqual(bloqueios(r).map(par), [[2300, 2200], [6, 5]]);
  });
}

for (const valor of ['2.200', 'dois mil', '"2.200"   # era 2200']) {
  test(`R1-04b: an overlay limit that is not a whole number does not replace the core one, and a note says so — ${valor}`, async () => {
    const local = { 'instagram-feed.md': `---\nconstraints:\n  caption_max_chars: ${valor}\n  hashtags_max: 5\n---\n` };
    const r = await um(`=== CAPTION ===\n${texto(2300)}\n\n=== HASHTAGS ===\n${tags(6)}\n`, 'instagram-feed', { local });
    assert.deepEqual(bloqueios(r).map(par), [[2300, 2200], [6, 5]]);
    const nota = `O arquivo \`_opencrew/best-practices.local/instagram-feed.md\` tem um limite que não é número inteiro (\`caption_max_chars: ${valor.split('   #')[0]}\`); usei o do core.`;
    assert.ok(r.notas.includes(nota), r.notas.join(' | '));
  });
}

test('R1-04c: a title found in a format without title_max_chars is "Não medido", with no level', async () => {
  const core = { 'blog-post.md': '---\nname: "Blog"\nconstraints:\n  meta_description_chars: 160\n---\n' };
  const r = await um(`---\ntitle: "${texto(125)}"\n---\n\nCorpo do artigo.\n`, 'blog-post', { core });
  const naoMedido = itens(r).filter((i) => i.item === 'Não medido');
  assert.deepEqual(naoMedido.map((i) => [i.nivel, i.detalhe]), [[null, 'título: sem limite definido no formato blog-post']]);
  assert.ok(formatarRelatorio(r).includes('⚪ Não medido — título: sem limite definido no formato blog-post'));
  assert.ok(formatarRelatorio(r).includes('**Resumo: 0 bloqueios, 0 alertas, 1 não medido**'));
  assert.ok(!formatarRelatorio(r).includes('Nada a apontar'));
});

test('R1-04d: a table format that only exists in the local overlay uses the overlay limits', async () => {
  const opcoes = { core: { 'instagram-feed.md': null }, local: { 'instagram-feed.md': '---\nconstraints:\n  hashtags_max: 5\n---\n' } };
  const r = await um(`## Legenda\n\n${texto(300)}\n\n${tags(6)}\n`, 'instagram-feed', opcoes);
  assert.deepEqual(bloqueios(r).map(par), [[6, 5]]);
  assert.ok(!r.notas.some((n) => n.includes('não encontrado')), r.notas.join(' | '));
});

test('R1-04e: a blog-post within its limits has no line about links and gets "Nada a apontar."', async () => {
  const r = await um(`---\ntitle: "${texto(55)}"\nmeta_description: "${texto(150)}"\n---\n\nCorpo do artigo.\n`, 'blog-post');
  assert.deepEqual(itens(r).filter((i) => /links/i.test(i.item)), []);
  assert.equal(r.naoMedidos, 0);
  assert.ok(formatarRelatorio(r).includes('✅ Nada a apontar.'));
});
