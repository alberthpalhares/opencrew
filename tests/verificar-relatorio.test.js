// specs/fase-u3a2-entrega-no-projeto.md — U3a-09g-f2 (--relatorio: the script writes the report of
// the cycle, rule 35) and U3a-09h-f2 ([PREENCHER] is shown as "A preencher", rule 36). What blocks
// and the final status do not change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { formatarRelatorio, main, verificar } from '../templates/_opencrew/core/scripts/verificar.mjs';
import { projetoFalso, snapshot, CREW, SAIDA } from './_helpers.js';
import { entregar, leiame, projeto, secao } from './_entrega.js';

const RUN = 'r1';
const POST = '---\ntitle: "Como cuidar da horta"\n---\n\nNós atendemos 300 clientes neste ano.\n';
const SO_PREENCHER = 'Ligue: [PREENCHER: telefone]\n';
const INVALIDO = (valor) => `O relatório só pode ser gravado em crews/<crew>/output/, com nome verificacao-….md. Recebi: ${valor}.`;

async function workspace(t, saidas = { 'post.md': POST }) {
  const raiz = await projetoFalso();
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.writeFile(path.join(raiz, CREW, 'crew.yaml'), 'name: teste\n');
  await fs.mkdir(path.join(raiz, SAIDA, RUN), { recursive: true });
  for (const [nome, conteudo] of Object.entries(saidas)) await fs.writeFile(path.join(raiz, SAIDA, RUN, nome), conteudo);
  return raiz;
}

/** Runs the command line: the exit code and exactly what the script printed. */
async function rodar(raiz, ...extras) {
  let impresso = '';
  const code = await main(['--crew', CREW, '--arquivo', `${SAIDA}/${RUN}/post.md`, ...extras], { cwd: raiz, escrever: (s) => { impresso += `${s}\n`; } });
  return { code, impresso };
}

test('U3a-09g-f2: --relatorio writes, byte for byte, what the script printed, with code 0', async (t) => {
  const raiz = await workspace(t);
  const alvo = `${SAIDA}/${RUN}/verificacao-ciclo-1.md`;
  const r = await rodar(raiz, '--relatorio', alvo);
  assert.equal(r.code, 0);
  assert.match(r.impresso, /\nVERIFICACAO:OK\n$/);
  assert.equal(await fs.readFile(path.join(raiz, alvo), 'utf8'), r.impresso);
  // A second cycle overwrites its own report: the file is the script's.
  await fs.writeFile(path.join(raiz, SAIDA, RUN, 'post.md'), SO_PREENCHER);
  const segundo = await rodar(raiz, '--relatorio', alvo);
  assert.equal(await fs.readFile(path.join(raiz, alvo), 'utf8'), segundo.impresso);
  assert.match(segundo.impresso, /VERIFICACAO:AGUARDANDO_USUARIO\n$/);
});

test('U3a-09g-f2: a --relatorio outside crews/<crew>/output/, or not named verificacao-*.md — code 1, the message, nothing written', async (t) => {
  const raiz = await workspace(t);
  const antes = await snapshot(raiz);
  const fora = [
    '../fora.md', `${CREW}/crew.yaml`, `${SAIDA}/${RUN}/post.md`, `${CREW}/verificacao-ciclo-1.md`,
    `${SAIDA}/nao-existe/verificacao-ciclo-1.md`, 'crews/outra/output/verificacao-ciclo-1.md', '',
  ];
  for (const valor of fora) {
    const r = await rodar(raiz, '--relatorio', valor);
    assert.deepEqual([r.code, r.impresso], [1, `${INVALIDO(valor)}\n`], valor);
    assert.deepEqual(await snapshot(raiz), antes, valor);
  }
  assert.ok(!(await fs.access(path.join(raiz, '..', 'fora.md')).then(() => true, () => false)));
});

test('U3a-09g-f2: when the report cannot be written it still comes out on the screen, after the warning, with code 0', async (t) => {
  const raiz = await workspace(t);
  const alvo = `${SAIDA}/${RUN}/verificacao-ciclo-1.md`;
  await fs.mkdir(path.join(raiz, alvo)); // a folder with the name of the report: the write fails
  const r = await rodar(raiz, '--relatorio', alvo);
  assert.equal(r.code, 0);
  const linhas = r.impresso.split('\n');
  assert.equal(linhas[0], `⚠️ Não consegui gravar o relatório em ${alvo}.`);
  assert.equal(linhas[1], '## Verificação automática');
  assert.equal(linhas.at(-2), 'VERIFICACAO:OK');
});

test('U3a-09g-f2: without --relatorio nothing is written, and the usage line names the option', async (t) => {
  const raiz = await workspace(t);
  const antes = await snapshot(raiz);
  assert.equal((await rodar(raiz)).code, 0);
  assert.deepEqual(await snapshot(raiz), antes);
  const semCrew = [];
  await main(['--arquivo', 'x.md'], { cwd: raiz, escrever: (s) => semCrew.push(s) });
  assert.match(semCrew[1], /^Uso: .*\[--relatorio "<caminho>"\]/);
});

test('U3a-09h-f2: a text whose only problem is [PREENCHER] — "A preencher", counted apart, same status and same blocking', async (t) => {
  const raiz = await workspace(t, { 'post.md': SO_PREENCHER });
  const r = await verificar({ raiz, crew: CREW, arquivos: [`${SAIDA}/${RUN}/post.md`] });
  assert.deepEqual([r.aPreencher, r.bloqueios, r.status], [1, 1, 'AGUARDANDO_USUARIO'], 'bloqueios and status as before');
  assert.equal(r.arquivos[0].itens[0].nivel, 'bloqueio', 'the item still blocks');
  const linhas = formatarRelatorio(r).split('\n');
  assert.ok(linhas.includes('- ✏️ A preencher — Falta informação sua: "telefone"'), linhas.join(' | '));
  assert.ok(linhas.includes('**Resumo: 0 bloqueios, 1 a preencher, 0 alertas, 0 não medidos**'), linhas.join(' | '));
  assert.equal(linhas.at(-1), 'VERIFICACAO:AGUARDANDO_USUARIO');
  assert.ok(!formatarRelatorio(r).includes('Bloqueio'));
});

test('U3a-09h-f2: a real block beside a [PREENCHER] — each one counted in its place, VERIFICACAO:BLOQUEADA', async (t) => {
  const raiz = await workspace(t, { 'post.md': `Fale com [Nome] hoje.\n${SO_PREENCHER}Outro: [PREENCHER: e-mail]\n` });
  const r = await verificar({ raiz, crew: CREW, arquivos: [`${SAIDA}/${RUN}/post.md`] });
  assert.deepEqual([r.aPreencher, r.bloqueios, r.status], [2, 3, 'BLOQUEADA']);
  const relatorio = formatarRelatorio(r);
  assert.ok(relatorio.includes('**Resumo: 1 bloqueio, 2 a preencher, 0 alertas, 0 não medidos**'), relatorio);
  assert.ok(relatorio.includes('- ❌ Bloqueio — Placeholder: "[Nome]"'), relatorio);
});

test('U3a-09h-f2: a text with no [PREENCHER] gets the report of 1.8.0, byte for byte', async (t) => {
  const raiz = await workspace(t);
  const r = await verificar({ raiz, crew: CREW, arquivos: [`${SAIDA}/${RUN}/post.md`] });
  assert.equal(r.aPreencher, 0);
  assert.equal(formatarRelatorio(r), [
    '## Verificação automática', '', `### ${SAIDA}/${RUN}/post.md`, '',
    '| Item | Medido | Limite | Resultado |', '|---|---|---|---|', '| Título (SEO) — caracteres | 20 | ≤ 70 | ✅ OK |', '',
    '- ⚠️ Alerta — Afirmação a confirmar: "Nós atendemos 300 clientes neste ano."', '',
    '**Notas:**', '- Sem proibições registradas (a crew não tem memories.md).', '',
    '**Resumo: 0 bloqueios, 1 alerta, 0 não medidos**', '', 'VERIFICACAO:OK',
  ].join('\n'));
});

test('U3a-09h-f2: in the delivery a [PREENCHER] still leaves the channel not ready', async (t) => {
  const raiz = await projeto(t, { 'v1/post.md': SO_PREENCHER });
  const r = await entregar(raiz, ['v1/post.md=linkedin-post']);
  assert.equal(r.fim, 'ENTREGA:INCOMPLETA');
  assert.match(secao(await leiame(raiz), 'LinkedIn'), /^Situação: Não está pronto$/m);
});
