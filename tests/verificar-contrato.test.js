// specs/fase-r1-reparos-1-6-1.md — R1-05: the checker's contract (root and crew are checked,
// it verifies what it can, exit codes) and a guard against slow regular expressions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verificar, formatarRelatorio } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { contar, grafemas } from '../templates/_opencrew/core/scripts/verificar/regras.mjs';
import { projetoFalso, rodarMain, CREW, SAIDA, texto } from './_helpers.js';

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/scripts');

/** A fake installed project (payload best-practices + one crew) with the given output files. */
const projeto = (saidas = {}, opcoes = {}) => projetoFalso({ saidas, ...opcoes });

/** Runs the command line in `raiz`; `arquivos` are names inside the crew output folder. */
function rodar(raiz, arquivos, { crew = CREW, extra = [] } = {}) {
  const lista = arquivos?.map((a) => (path.isAbsolute(a) || a.startsWith('..') ? a : `${SAIDA}/${a}`)).join(',');
  return rodarMain(raiz, [...(crew ? ['--crew', crew] : []), ...(lista ? ['--arquivo', lista] : []), ...extra]);
}

const semStatus = (linhas) => !linhas.some((l) => l.includes('VERIFICACAO:'));
const DOIS_BLOQUEIOS = 'Ligue para [Telefone] ou escreva para [Email].\n';
const MEMORIA = '## Proibições Explícitas\n\n- Nunca usar "barato"\n';
const USO = /^Uso: .*--crew .*--arquivo .*caminho=formato/;

test('R1-05a: run in a folder without _opencrew/ — exit 1, the message and no status line', async () => {
  const raiz = await projeto({ 'post.md': 'Um texto simples.\n' }, { instalado: false });
  const { code, linhas } = await rodar(raiz, ['post.md']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.']);
  // Rule 13, the order: the missing `_opencrew/` comes before a path outside the project.
  assert.deepEqual((await rodar(raiz, ['../fora.md'])).linhas, linhas);
});

test('R1-05b: a crew that does not exist — exit 1, "Crew não encontrada" and no status line', async () => {
  const raiz = await projeto({ 'post.md': 'Um texto simples.\n' });
  const { code, linhas } = await rodar(raiz, ['post.md'], { crew: 'crews/nao-existe' });
  assert.equal(code, 1);
  assert.deepEqual(linhas, ['Crew não encontrada: crews/nao-existe']);
});

test('R1-05c: a missing file is an alert; the two blocks of the other file still appear', async () => {
  const raiz = await projeto({ 'ruim.md': DOIS_BLOQUEIOS });
  const { code, linhas } = await rodar(raiz, ['ruim.md', 'nao-existe.md']);
  assert.equal(code, 0);
  assert.equal(linhas.filter((l) => l.includes('❌ Bloqueio — Placeholder')).length, 2);
  const secao = linhas.indexOf(`### ${SAIDA}/nao-existe.md`);
  assert.equal(linhas[secao + 1], '- ⚠️ Não verificado — arquivo não encontrado');
  assert.ok(linhas.includes('**Resumo: 2 bloqueios, 1 alerta, 1 não medido**'));
  assert.equal(linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
});

test('R1-05d: only missing paths — exit 1 and one "Arquivo não encontrado" line for each', async () => {
  const { code, linhas } = await rodar(await projeto(), ['a.md', 'b.md']);
  assert.equal(code, 1);
  assert.deepEqual(linhas, [`Arquivo não encontrado: ${SAIDA}/a.md`, `Arquivo não encontrado: ${SAIDA}/b.md`]);
});

test('R1-05d: "=formato" only counts in lower case, digits and hyphen — otherwise the whole item is the path', async () => {
  const raiz = await projeto({ 'post.md': 'Um texto simples.\n' });
  const { code, linhas } = await rodar(raiz, ['post.md=Blog-Post']);
  assert.deepEqual([code, linhas], [1, [`Arquivo não encontrado: ${SAIDA}/post.md=Blog-Post`]]);
});

test('R1 revisão: --formato picks the blog limits of an item without "=formato" (§3)', async () => {
  const raiz = await projeto({ 'post.md': `---\ntitle: "${texto(65)}"\n---\n\nCorpo do artigo.\n` });
  const { linhas } = await rodar(raiz, ['post.md'], { extra: ['--formato', 'blog-seo'] });
  assert.ok(linhas.includes('| Título (SEO) — caracteres | 65 | ≤ 60 | ❌ Bloqueio |'), linhas.join(' | '));
});

test('R1 revisão: files given with a repeated --arquivo or as separate arguments are all checked; a repeated file counts once', async () => {
  const raiz = await projeto({ 'ok.md': 'Um texto simples.\n', 'ruim.md': DOIS_BLOQUEIOS });
  const [ok, ruim] = [`${SAIDA}/ok.md`, `${SAIDA}/ruim.md`];
  for (const argv of [['--arquivo', ruim, '--arquivo', ok], ['--arquivo', ok, ruim], ['--arquivo', `${ok},${ruim},${ruim}`, path.join(raiz, ruim)]]) {
    const { code, linhas } = await rodarMain(raiz, ['--crew', CREW, ...argv]);
    assert.equal(code, 0);
    assert.ok(linhas.includes('**Resumo: 2 bloqueios, 0 alertas, 0 não medidos**'), linhas.join(' | '));
    assert.equal(linhas.filter((l) => l.startsWith('### ')).length, 2, linhas.join(' | '));
  }
  const ausente = await rodarMain(raiz, ['--crew', CREW, '--arquivo', `${SAIDA}/x.md,${SAIDA}/x.md`]);
  assert.deepEqual(ausente.linhas, [`Arquivo não encontrado: ${SAIDA}/x.md`]);
});

test('R1 revisão: the script runs as a process, also when the project is opened through a folder link', async () => {
  const raiz = await projeto({ 'ruim.md': DOIS_BLOQUEIOS });
  const destino = path.join(raiz, '_opencrew', 'core', 'scripts');
  // Since U5-1 the checker reads a document with the converter's own reader: scripts/documento/ goes too.
  for (const pasta of ['verificar', 'documento']) await fs.mkdir(path.join(destino, pasta), { recursive: true });
  const modulos = (await Promise.all(['verificar', 'documento'].map(async (pasta) => (await fs.readdir(path.join(SCRIPTS, pasta))).map((m) => `${pasta}/${m}`)))).flat();
  for (const f of ['comum.mjs', 'verificar.mjs', ...modulos]) await fs.copyFile(path.join(SCRIPTS, f), path.join(destino, f));
  await fs.symlink(raiz, `${raiz}-elo`, 'junction');
  for (const cwd of [raiz, `${raiz}-elo`]) {
    const p = spawnSync(process.execPath, ['_opencrew/core/scripts/verificar.mjs', '--crew', CREW, '--arquivo', `${SAIDA}/ruim.md`], { cwd, encoding: 'utf8' });
    assert.equal(p.status, 0, p.stderr);
    assert.equal(p.stdout.trimEnd().split('\n').at(-1), 'VERIFICACAO:BLOQUEADA', `cwd: ${cwd}`);
  }
  await fs.unlink(`${raiz}-elo`); // only the link goes away, not the project behind it
});

test('R1 revisão: an error outside the list (unreadable crew memory) is one line in PT-BR, exit 1, no status line', async () => {
  const raiz = await projeto({ 'post.md': 'Um texto simples.\n' });
  await fs.mkdir(path.join(raiz, CREW, '_memory', 'memories.md'));
  const { code, linhas } = await rodar(raiz, ['post.md']);
  assert.equal(code, 1);
  assert.ok(linhas.length === 1 && linhas[0].startsWith('Não consegui verificar: '), linhas.join(' | '));
});

test('R1 revisão: no report line grows with the file — long details and headings are cut, a data: URI is not a link', async () => {
  const longo = 'a'.repeat(5000);
  const raiz = await projeto({
    'digitos.md': `Fale pelo https://wa.me/${'9'.repeat(5000)} agora.\n`,
    'cabecalhos.md': `## Legenda Instagram ${longo}\n\nUm texto.\n\n## Legenda Instagram ${longo}\n\nOutro texto.\n`,
    'imagem.html': `<p>Um slide.</p><img src="data:image/svg+xml,%3Csvg%20fill=%22%23000000%22%3E${longo}">`,
  });
  const r = await verificar({ raiz, crew: CREW, arquivos: ['digitos.md', 'cabecalhos.md', 'imagem.html'].map((n) => `${SAIDA}/${n}`) });
  assert.deepEqual(r.arquivos.map((a) => a.itens.filter((i) => i.nivel === 'bloqueio').length), [1, 0, 0]);
  assert.ok(Math.max(...formatarRelatorio(r).split('\n').map((l) => l.length)) < 400);
});

test('R1-05e: a malformed link does not break the checker and is left out of the link count', async () => {
  const blog = '---\ntitle: "Um título curto"\n---\n\nVeja [x](https://) e [o guia](https://exemplo.org/guia).\n';
  const raiz = await projeto({ 'post.md': blog });
  await fs.mkdir(path.join(raiz, '_opencrew', '_memory'), { recursive: true });
  await fs.writeFile(path.join(raiz, '_opencrew', '_memory', 'company.md'), '# Empresa\n\n- Site: https://www.minhaempresa.com.br\n');
  const r = await verificar({ raiz, crew: CREW, arquivos: [`${SAIDA}/post.md`], formato: 'blog-seo' });
  const links = r.arquivos[0].itens.filter((i) => /^Links/.test(i.item)).map((i) => [i.item, i.medido]);
  assert.deepEqual(links, [['Links internos', 0], ['Links externos', 1]]);
});

test('R1-05f: an absolute path inside the project is checked like the relative one', async () => {
  const raiz = await projeto({ 'ruim.md': DOIS_BLOQUEIOS });
  const relativo = await rodar(raiz, ['ruim.md']);
  const absoluto = await rodar(raiz, [path.join(raiz, SAIDA, 'ruim.md')]);
  assert.equal(absoluto.code, 0);
  assert.deepEqual(absoluto.linhas, relativo.linhas);
  assert.equal(absoluto.linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
});

test('R1-05l: a crew given as an absolute path inside the project still has its memory read', async () => {
  const raiz = await projeto({ 'post.md': 'Um plano barato.\n' }, { memorias: MEMORIA });
  const relativo = await rodar(raiz, ['post.md']);
  const absoluto = await rodar(raiz, ['post.md'], { crew: path.join(raiz, CREW) });
  assert.ok(relativo.linhas.includes('- ❌ Bloqueio — Termo proibido (memória da crew): "barato"'), relativo.linhas.join(' | '));
  assert.deepEqual(absoluto.linhas, relativo.linhas);
});

test('R1-05g: a declared format with no best-practice — note, general checks, exit 0', async () => {
  const raiz = await projeto({ 'post.md': 'Um texto simples.\n', 'ruim.md': DOIS_BLOQUEIOS });
  const { code, linhas } = await rodar(raiz, ['post.md=formato-inexistente', 'ruim.md=formato-inexistente']);
  assert.equal(code, 0);
  assert.ok(linhas.includes('- Formato "formato-inexistente" não encontrado em `_opencrew/best-practices.local/` nem em `_opencrew/core/best-practices/`.'));
  assert.equal(linhas[linhas.indexOf(`### ${SAIDA}/post.md`) + 1], '- ⚪ Nada a apontar nas checagens gerais (limites não medidos)');
  assert.equal(linhas.filter((l) => l.includes('❌ Bloqueio — Placeholder')).length, 2, 'general checks ran');
  // The note also comes for a file where pieces are not searched (.html, .csv…).
  const html = await rodar(await projeto({ 'pagina.html': '<p>Um texto simples.</p>' }), ['pagina.html=formato-inexistente']);
  assert.ok(html.linhas.includes('- Formato "formato-inexistente" não encontrado em `_opencrew/best-practices.local/` nem em `_opencrew/core/best-practices/`.'));
  assert.ok(html.linhas.includes('- ⚪ Nada a apontar nas checagens gerais (limites não medidos)'));
});

test('R1-05h: a rule that throws on one file becomes an alert; the other file is still blocked', async () => {
  const raiz = await projeto({ 'quebra.md': 'Um texto simples.\n', 'ruim.md': DOIS_BLOQUEIOS });
  const regraDeTeste = ({ arquivo }) => {
    if (arquivo.endsWith('quebra.md')) throw new Error('falha injetada');
    return [];
  };
  const r = await verificar({ raiz, crew: CREW, arquivos: [`${SAIDA}/quebra.md`, `${SAIDA}/ruim.md`], regraDeTeste });
  assert.deepEqual(r.arquivos[0].itens.map((i) => [i.item, i.nivel, i.detalhe]), [['Não verificado', 'alerta', 'erro ao verificar: falha injetada']]);
  assert.equal(r.arquivos[1].itens.filter((i) => i.nivel === 'bloqueio').length, 2);
  assert.equal(r.status, 'BLOQUEADA');
  assert.ok(formatarRelatorio(r).includes('- ⚠️ Não verificado — erro ao verificar: falha injetada'));
});

for (const [caso, arquivos, opcoes, fora] of [
  ['--arquivo ../fora.md', ['../fora.md'], {}, '../fora.md'],
  ['--crew ../outra', ['post.md'], { crew: '../outra' }, '../outra'],
]) {
  test(`R1-05i: ${caso} — exit 1, "Caminho fora do projeto" and no status line`, async () => {
    const raiz = await projeto({ 'post.md': 'Um texto simples.\n' });
    const { code, linhas } = await rodar(raiz, arquivos, opcoes);
    assert.equal(code, 1);
    assert.deepEqual(linhas, [`Caminho fora do projeto: ${fora}`]);
  });
}

test('R1-05j: a folder in the list is an alert; the file next to it is checked', async () => {
  const raiz = await projeto({ 'ruim.md': DOIS_BLOQUEIOS });
  await fs.mkdir(path.join(raiz, SAIDA, 'v1'));
  const { code, linhas } = await rodar(raiz, ['v1', 'ruim.md']);
  assert.equal(code, 0);
  assert.equal(linhas[linhas.indexOf(`### ${SAIDA}/v1`) + 1], '- ⚠️ Não verificado — é uma pasta');
  assert.equal(linhas.filter((l) => l.includes('❌ Bloqueio — Placeholder')).length, 2);
});

for (const [opcao, arquivos, opcoes] of [['--crew', ['post.md'], { crew: null }], ['--arquivo', null, {}]]) {
  test(`R1-05k: without ${opcao} — exit 1, "Falta a opção obrigatória" and the usage line`, async () => {
    const raiz = await projeto({ 'post.md': 'Um texto simples.\n' });
    const { code, linhas } = await rodar(raiz, arquivos, opcoes);
    assert.equal(code, 1);
    assert.equal(linhas[0], `Falta a opção obrigatória ${opcao}.`);
    assert.match(linhas[1], USO);
    assert.ok(linhas.length === 2 && semStatus(linhas), linhas.join(' | '));
  });
}

// No scenario ID: user text must never make a regular expression backtrack without end.
const N = 200_000;
const ESPACOS = ' '.repeat(N / 4);
const ENTRADAS = {
  'letters without a space': ['a'.repeat(N), 'linkedin-post', 'saida.md'],
  'digits after a first-person word': [`eu ${'9'.repeat(N - 3)}`, 'linkedin-post', 'saida.md'],
  'open brackets': ['[nome'.repeat(N / 5), 'linkedin-post', 'saida.md'],
  'open [PREENCHER': ['[PREENCHER'.repeat(N / 10), 'linkedin-post', 'saida.md'],
  'open braces': ['{{'.repeat(N / 2), 'linkedin-post', 'saida.md'],
  'open markdown links': ['[x]('.repeat(N / 4), 'blog-seo', 'saida.md'],
  'spaces in a heading, a label and a slide': [`# Carrossel${ESPACOS}x\n=== ${ESPACOS}x\n---${ESPACOS}x\nSlide${ESPACOS}1`, 'instagram-feed', 'saida.md'],
  'spaces and a lone CR in a heading': [`# ${' '.repeat(N)}\rx\ry`, 'instagram-feed', 'saida.md'],
  'spaces and a lone CR in the frontmatter': [`---\ntitle:${' '.repeat(N / 2)}x\ry\nconstraints:\n  a:${' '.repeat(N / 2)}x\ry\n---\n`, 'blog-post', 'saida.md'],
  'spaces in a frontmatter value': [`---\ntitle: a${' '.repeat(N)}b\n---\n`, 'blog-post', 'saida.md'],
  '[PREENCHER: with no end, then one "]"': [`${'[PREENCHER: '.repeat(Math.floor(N / 12))}]`, 'linkedin-post', 'saida.md'],
  'dots after a link': [`wa.me/999999${'.'.repeat(N - 13)}a`, 'twitter-post', 'saida.md'],
  'open HTML tags': ['<a href="'.repeat(Math.floor(N / 9)), null, 'saida.html'],
  'a code fence that never ends': [`${'`'.repeat(N / 2)}x\n${'~'.repeat(N / 2)} x y`, 'twitter-post', 'saida.md'],
  'symbols before "Slide" and spaces before "hashtags"': [`# Carrossel\n${'>'.repeat(N / 2)}Slide 1\n# **${' '.repeat(N / 2)}x`, 'instagram-feed', 'saida.md'],
};

for (const [nome, [conteudo, formato, arquivo]] of Object.entries(ENTRADAS)) {
  test(`perf: 200 thousand characters answer in under 2 seconds — ${nome}`, async () => {
    const raiz = await projeto({ [arquivo]: conteudo }, { memorias: MEMORIA });
    const item = formato ? { arquivo: `${SAIDA}/${arquivo}`, formato } : `${SAIDA}/${arquivo}`;
    const inicio = performance.now();
    const r = await verificar({ raiz, crew: CREW, arquivos: [item] });
    formatarRelatorio(r);
    assert.ok(performance.now() - inicio < 2000, `${Math.round(performance.now() - inicio)} ms`);
  });
}

// R1-05m: characters are counted in windows. Node 20 keeps a copy of the whole input in every
// segment: with the whole text at once, 200 thousand characters ran the process out of memory.
test('R1-05m: counting characters never hands the whole text to the segmenter', () => {
  const original = Intl.Segmenter.prototype.segment;
  let maior = 0;
  Intl.Segmenter.prototype.segment = function segment(entrada) {
    maior = Math.max(maior, entrada.length);
    return original.call(this, entrada);
  };
  try {
    assert.equal(contar('ação '.repeat(20_000)), 99_999); // the last space is trimmed
  } finally {
    Intl.Segmenter.prototype.segment = original;
  }
  assert.ok(maior <= 2048, `the segmenter got ${maior} characters at once`);
});

const PEDACOS = ['a', ' ', 'ç', 'e\u0301', '\r\n', '\n', '👍', '👍🏻', '👨‍👩‍👧‍👦', '🇧🇷', '1️⃣', '각',
  '\u1100\u1161\u11A8', 'क्ष', 'नि', `z${'\u0301'.repeat(20)}`, '\uD83D', '\uDC4D', '\u200D', '🏳️‍🌈'];

test('R1-05m: the count in windows equals the count of the whole text, whatever falls on a window edge', () => {
  const inteiro = new Intl.Segmenter('pt', { granularity: 'grapheme' });
  let semente = 7;
  const sorteio = (n) => (semente = (semente * 48271) % 2147483647) % n;
  for (let rodada = 0; rodada < 300; rodada++) {
    const amostra = Array.from({ length: 60 }, () => PEDACOS[sorteio(PEDACOS.length)]).join('');
    const esperado = [...inteiro.segment(amostra)].length;
    for (const janela of [1, 2, 3, 5, 8, 13, 27, 64]) assert.equal(grafemas(amostra, janela), esperado, JSON.stringify([janela, amostra]));
  }
});
