// specs/fase-u1-revisor-com-dentes.md — U1-01: the automatic checker measures what the
// reviewer used to "estimate". Fixture U1-01a reproduces the real defects of Projeto A
// (synthetic text, same measurements).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verificar, main } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { mkTmp } from './_helpers.js';

const BP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/best-practices');

/** A fake installed project: best-practices copied from the payload + one crew. */
async function projeto({ memorias, bestPractices } = {}) {
  const raiz = await mkTmp('verif');
  const bp = path.join(raiz, '_opencrew', 'core', 'best-practices');
  await fs.mkdir(bp, { recursive: true });
  for (const f of ['blog-post.md', 'blog-seo.md', 'instagram-feed.md', 'linkedin-post.md', 'twitter-post.md']) {
    await fs.copyFile(path.join(BP_SRC, f), path.join(bp, f));
  }
  for (const [nome, conteudo] of Object.entries(bestPractices ?? {})) {
    await fs.writeFile(path.join(bp, nome), conteudo);
  }
  await fs.mkdir(path.join(raiz, 'crews', 'teste', '_memory'), { recursive: true });
  await fs.mkdir(path.join(raiz, 'crews', 'teste', 'output'), { recursive: true });
  if (memorias) await fs.writeFile(path.join(raiz, 'crews', 'teste', '_memory', 'memories.md'), memorias);
  return raiz;
}

async function arquivo(raiz, nome, conteudo) {
  const rel = `crews/teste/output/${nome}`;
  await fs.writeFile(path.join(raiz, rel), conteudo);
  return rel;
}

const texto = (n, base = 'Cobertura fotográfica corporativa em eventos e feiras de negócios. ') =>
  base.repeat(Math.ceil(n / base.length)).slice(0, n);

const itens = (r) => r.arquivos.flatMap((a) => a.itens);
const bloqueios = (r) => itens(r).filter((i) => i.nivel === 'bloqueio');
const alertas = (r) => itens(r).filter((i) => i.nivel === 'alerta');

function blog({ titulo, meta, corpo = 'Texto do artigo, sem nada de errado.' }) {
  return `---\ntitle: "${titulo}"\nmeta_description: "${meta}"\n---\n\n# ${titulo}\n\n${corpo}\n`;
}

test('U1-01a: the real Projeto A post is BLOCKED with every measured value', async () => {
  const raiz = await projeto();
  const post = await arquivo(raiz, 'post-blog.md', blog({
    titulo: texto(125),
    meta: texto(218),
    corpo: 'Fale com [a equipe](https://wa.me/5584999999999).\n\nEra 2017 quando investimos R$ 15 mil em estrutura própria.',
  }));
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [post], formato: 'blog-post' });

  assert.equal(r.status, 'BLOQUEADA');
  const b = bloqueios(r);
  const titulo = b.find((i) => /título/i.test(i.item));
  assert.deepEqual([titulo.medido, titulo.limite], [125, 70]);
  const meta = b.find((i) => /meta/i.test(i.item));
  assert.deepEqual([meta.medido, meta.limite], [218, 160]);
  // Real-world finding: the detail must be the clean URL, not markdown residue.
  assert.ok(b.some((i) => /placeholder/i.test(i.item) && i.detalhe === 'https://wa.me/5584999999999'));
  assert.ok(alertas(r).some((i) => /afirmação/i.test(i.item) && /investimos R\$ 15 mil/.test(i.detalhe)));
});

test('U1-01b: a correct post passes', async () => {
  const raiz = await projeto();
  const post = await arquivo(raiz, 'ok.md', blog({ titulo: texto(55), meta: texto(150) }));
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [post], formato: 'blog-post' });
  assert.equal(r.status, 'OK');
  assert.deepEqual(bloqueios(r), []);
});

test('U1-01c: missing SEO links are ALERTS, not blocks', async () => {
  const raiz = await projeto();
  const post = await arquivo(raiz, 'seo.md', blog({ titulo: texto(55), meta: texto(150) }));
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [post], formato: 'blog-seo' });
  assert.equal(r.status, 'OK');
  const internos = alertas(r).find((i) => /links internos/i.test(i.item));
  const externos = alertas(r).find((i) => /links externos/i.test(i.item));
  assert.deepEqual([internos.medido, internos.limite], [0, 3]);
  assert.deepEqual([externos.medido, externos.limite], [0, 2]);
});

test('U1-01d: Instagram caption over 2200 chars and over the hashtag limit are blocked', async () => {
  const raiz = await projeto();
  const tags = Array.from({ length: 31 }, (_, i) => `#tag${i}`).join(' ');
  const legenda = `${texto(2300)}\n\n${tags}`;
  const md = await arquivo(raiz, 'legendas.md', `# Legendas\n\n## LEGENDA INSTAGRAM\n\n${legenda}\n\n---\n`);
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  assert.equal(r.status, 'BLOQUEADA');
  const chars = bloqueios(r).find((i) => /instagram/i.test(i.item) && /caracteres/i.test(i.item));
  assert.ok(chars.medido > 2200 && chars.limite === 2200);
  const hashtags = bloqueios(r).find((i) => /instagram/i.test(i.item) && /hashtags/i.test(i.item));
  assert.deepEqual([hashtags.medido, hashtags.limite], [31, 30]);
});

test('U1-01e: a LinkedIn post over 3000 chars is blocked', async () => {
  const raiz = await projeto();
  const md = await arquivo(raiz, 'linkedin.md', `## POST LINKEDIN\n\n${texto(3100)}\n`);
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  const li = bloqueios(r).find((i) => /linkedin/i.test(i.item));
  assert.deepEqual([li.medido, li.limite], [3100, 3000]);
});

test('U1-01f: a quoted term in Proibições Explícitas blocks, ignoring case and accents', async () => {
  const memorias = '# Memória\n\n## Proibições Explícitas\n\n- Nunca usar o nome "Associação Cultural X"\n- Evitar jargão jurídico\n';
  const raiz = await projeto({ memorias });
  const md = await arquivo(raiz, 'comunicado.md', 'Convite da associacao cultural x para a assembleia.\n');
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  assert.equal(r.status, 'BLOQUEADA');
  assert.ok(bloqueios(r).some((i) => /proibido/i.test(i.item) && /Associação Cultural X/.test(i.detalhe)));
  assert.ok(r.notas.some((n) => /1 proibição sem termo entre aspas/.test(n)));
});

test('U1-01g: [PREENCHER: …] blocks with "falta informação sua"', async () => {
  const raiz = await projeto();
  const md = await arquivo(raiz, 'caso.md', 'Resultado: [PREENCHER: case real de cliente].\n');
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  assert.ok(bloqueios(r).some((i) => /falta informação sua/i.test(i.item) && /case real de cliente/.test(i.detalhe)));
});

test('U1-01l: when the only blocks are [PREENCHER], the status waits for the user (no REJECT loop)', async () => {
  const raiz = await projeto();
  const md = await arquivo(raiz, 'so-preencher.md', 'Depoimento: [PREENCHER: frase real de um cliente].\n');
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  assert.equal(r.status, 'AGUARDANDO_USUARIO');
  const comPlaceholder = await arquivo(raiz, 'misto.md', '[PREENCHER: dado] e ligue para [Telefone].\n');
  const r2 = await verificar({ raiz, crew: 'crews/teste', arquivos: [comPlaceholder] });
  assert.equal(r2.status, 'BLOQUEADA', 'a real block still wins');
});

test('U1-01h: a markdown link is not a placeholder; [Empresa X] is', async () => {
  const raiz = await projeto();
  const md = await arquivo(raiz, 'links.md', 'Veja [Empresa parceira](https://exemplo.org) e o caso da [Empresa X].\n');
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  const ph = bloqueios(r).filter((i) => /placeholder/i.test(i.item));
  assert.equal(ph.length, 1);
  assert.match(ph[0].detalhe, /\[Empresa X\]/);
});

test('U1-01i: limits come from the format best-practice (constraints:)', async () => {
  const custom = '---\nname: "Blog"\nconstraints:\n  title_max_chars: 200\n  meta_description_chars: 300\n---\n';
  const raiz = await projeto({ bestPractices: { 'blog-post.md': custom } });
  const post = await arquivo(raiz, 'post.md', blog({ titulo: texto(125), meta: texto(218) }));
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [post], formato: 'blog-post' });
  assert.equal(r.status, 'OK');
});

async function rodarMain(argv, cwd) {
  const linhas = [];
  const code = await main(argv, { cwd, escrever: (s) => linhas.push(...String(s).split('\n')) });
  return { code, linhas: linhas.filter((l) => l.trim() !== '') };
}

test('U1-01j: a missing file is a usage error (exit 1) in PT-BR', async () => {
  const raiz = await projeto();
  const { code, linhas } = await rodarMain(['--crew', 'crews/teste', '--arquivo', 'crews/teste/output/nao-existe.md'], raiz);
  assert.equal(code, 1);
  assert.ok(linhas.some((l) => /Arquivo não encontrado: crews\/teste\/output\/nao-existe\.md/.test(l)));
});

test('U1-01k: several files — one block makes the final line BLOQUEADA', async () => {
  const raiz = await projeto();
  const ok = await arquivo(raiz, 'ok.md', blog({ titulo: texto(55), meta: texto(150) }));
  const ruim = await arquivo(raiz, 'ruim.md', 'Ligue para [Telefone].\n');
  const { code, linhas } = await rodarMain(['--crew', 'crews/teste', '--arquivo', `${ok},${ruim}`], raiz);
  assert.equal(code, 0);
  assert.equal(linhas.at(-1), 'VERIFICACAO:BLOQUEADA');
  assert.ok(linhas.some((l) => /Verificação automática/.test(l)), 'report is in PT-BR');
});

test('U1-01m: a current/future year is an event name, not a claim; long sentences are cut cleanly', async () => {
  const raiz = await projeto();
  const ano = new Date().getFullYear();
  const longa = `Nós atendemos **mais de 300 empresas** ${'em eventos corporativos de todo o Nordeste '.repeat(6)}desde 2010.`;
  const md = await arquivo(raiz, 'anos.md', `Eu cubro o Congresso ${ano} e o Congresso ${ano + 1} para expositores.\n\n${longa}\n`);
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [md] });
  const a = alertas(r);
  assert.equal(a.length, 1, 'only the past/quantified claim is an alert');
  assert.doesNotMatch(a[0].detalhe, /\*\*/, 'no markdown markers in the quoted sentence');
  assert.ok(a[0].detalhe.endsWith('…') && a[0].detalhe.length <= 161, 'cut with an ellipsis');
});
test('U2-04d: the checker reads limits from _opencrew/best-practices.local/ before core', async () => {
  const raiz = await projeto();
  const local = path.join(raiz, '_opencrew', 'best-practices.local');
  await fs.mkdir(local, { recursive: true });
  await fs.writeFile(path.join(local, 'blog-post.md'), '---\nconstraints:\n  title_max_chars: 200\n  meta_description_chars: 300\n---\n');
  const post = await arquivo(raiz, 'local.md', blog({ titulo: texto(125), meta: texto(218) }));
  const r = await verificar({ raiz, crew: 'crews/teste', arquivos: [post], formato: 'blog-post' });
  assert.equal(r.status, 'OK', 'the user overlay wins over the core limits');
});
