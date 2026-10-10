// specs/fase-u6b-dados-e-custo.md §12 — what the independent review of the code reproduced, one test each:
// a shortcut as the crew, as output/ or as _investigations/ is never followed; a record that exists and cannot
// be read keeps the run; only the four final statuses are closed; a half-deleted run is said so; the budget
// does not lose a call to a parallel one; the report and the preferences do not read what they should not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { main as custo } from '../templates/_opencrew/core/scripts/custo.mjs';
import { lerPreferencia } from '../templates/_opencrew/core/scripts/preferencias.mjs';
import { main as relato } from '../templates/_opencrew/core/scripts/relato.mjs';
import { AGORA, CREW, SAIDA, arvore, execucao, existe, gravar, idDoDia, projeto, rodar } from './_limpeza.js';

/** A folder outside the project with three closed runs that have a copy, to be the target of a shortcut. */
async function alvoFora(t, raiz) {
  const fora = path.join(path.dirname(raiz), `opencrew-alvo-${path.basename(raiz)}`);
  t.after(() => fs.rm(fora, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(fora, 'output'), { recursive: true });
  for (let d = 1; d <= 3; d++) {
    const run = idDoDia(d);
    await gravar(fora, { [`output/${run}/execucao.json`]: JSON.stringify({ versao: 1, status: 'aprovada', iniciadaEm: `${run.slice(0, 10)}T10:00:00.000Z`, passos: [], marcos: [] }), [`output/${run}/copia.json`]: '{}', [`output/${run}/v1/a.md`]: 'Do usuário.\n' });
  }
  const velho = new Date(AGORA.getTime() - 60 * 24 * 3600 * 1000);
  await gravar(fora, { 'audio.wav': 'w'.repeat(512) });
  await fs.utimes(path.join(fora, 'audio.wav'), velho, velho);
  return fora;
}

test('U6b-02c: the crew folder is a junction to a folder outside — the command stops, nothing outside is read or deleted', async (t) => {
  const raiz = await projeto(t);
  const fora = await alvoFora(t, raiz);
  await fs.symlink(fora, path.join(raiz, 'crews', 'externa'), 'junction');
  const antes = await arvore(fora);
  for (const argv of [['--manter', '1'], ['--manter', '1', '--apagar', `${idDoDia(1)},${idDoDia(2)}`]]) {
    const linhas = [];
    const { main } = await import('../templates/_opencrew/core/scripts/limpeza.mjs');
    const code = await main(['externa', ...argv], { cwd: raiz, escrever: (s) => linhas.push(s), agora: () => AGORA });
    assert.equal(code, 1);
    assert.equal(linhas.at(-1), 'A pasta da crew é um atalho para outro lugar: a limpeza não segue atalho e não mexe nele.');
  }
  assert.deepEqual(await arvore(fora), antes);
});

test('U6b-02c: output/ is a junction — the command stops and the target is intact', async (t) => {
  const raiz = await projeto(t);
  const fora = await alvoFora(t, raiz);
  await fs.symlink(path.join(fora, 'output'), path.join(raiz, SAIDA), 'junction');
  const antes = await arvore(fora);
  const r = await rodar(raiz, '--manter', '1', '--apagar', idDoDia(1));
  assert.deepEqual([r.code, r.fim], [1, 'A pasta output/ é um atalho para outro lugar: a limpeza não segue atalho e não mexe nele.']);
  assert.deepEqual(await arvore(fora), antes);
});

test('U6b-02c: _investigations/ is a junction — the audio outside is neither listed nor deleted', async (t) => {
  const raiz = await projeto(t);
  const fora = await alvoFora(t, raiz);
  await fs.symlink(fora, path.join(raiz, 'crews', CREW, '_investigations'), 'junction');
  const r = await rodar(raiz, '--apagar', '', '--audio');
  assert.deepEqual([r.code, r.fim], [1, 'A pasta _investigations/ é um atalho para outro lugar: a limpeza não segue atalho e não mexe nele.']);
  assert.equal(await fs.readFile(path.join(fora, 'audio.wav'), 'utf8'), 'w'.repeat(512));
});

test('U6b-02b: an execucao.json that exists and cannot be read keeps the run — cut in half, empty, or a folder — even with a copy', async (t) => {
  const raiz = await projeto(t);
  for (let d = 1; d <= 3; d++) await execucao(raiz, idDoDia(d));
  await fs.writeFile(path.join(raiz, SAIDA, idDoDia(1), 'execucao.json'), '{ "versao": 1, "status": "aber');
  await fs.writeFile(path.join(raiz, SAIDA, idDoDia(2), 'execucao.json'), '');
  await fs.rm(path.join(raiz, SAIDA, idDoDia(3), 'execucao.json'));
  await fs.mkdir(path.join(raiz, SAIDA, idDoDia(3), 'execucao.json'));
  const antes = await arvore(raiz);
  const lista = await rodar(raiz, '--manter', '1');
  assert.equal(lista.fim, 'LIMPEZA:NADA', lista.texto);
  for (let d = 1; d <= 3; d++) assert.ok(lista.linhas.includes(`- ${idDoDia(d)}: o registro da execução não pôde ser lido (arquivo em uso ou danificado)`), lista.texto);
  const r = await rodar(raiz, '--manter', '1', '--apagar', idDoDia(1));
  assert.deepEqual([r.code, r.fim], [1, 'LIMPEZA:RECUSADA']);
  assert.deepEqual(await arvore(raiz), antes);
});

test('U6b-02b: only aprovada, rejeitada, abortada and publicada are closed — "ABERTA", "", a number or a missing status stay', async (t) => {
  const raiz = await projeto(t);
  const situacoes = { 1: 'ABERTA', 2: '', 3: 5, 4: undefined, 5: 'aprovada', 6: 'rejeitada', 7: 'abortada', 8: 'publicada', 9: 'aprovada' };
  for (const [d, status] of Object.entries(situacoes)) {
    await execucao(raiz, idDoDia(Number(d)));
    await fs.writeFile(path.join(raiz, SAIDA, idDoDia(Number(d)), 'execucao.json'), JSON.stringify({ versao: 1, status, iniciadaEm: `2026-09-0${d}T10:00:00.000Z`, passos: [], marcos: [] }));
  }
  const r = await rodar(raiz, '--manter', '1');
  const candidatas = r.linhas.filter((l) => l.startsWith('- ') && l.includes(' · ')).map((l) => l.slice(2).split(' · ')[0]);
  assert.deepEqual(candidatas, [5, 6, 7, 8].map(idDoDia));
  for (const d of [1, 2, 3, 4]) assert.ok(r.linhas.includes(`- ${idDoDia(d)}: a situação gravada no registro não é de uma execução fechada`), `${d}: ${r.texto}`);
});

// A folder the process cannot empty is only reliable on POSIX (Windows removes read-only files).
const naoRoot = process.platform !== 'win32' && process.getuid?.() !== 0;
test('U6b-05b: a run that could not be fully deleted is reported as partial, with exit code 1 and LIMPEZA:PARCIAL', { skip: !naoRoot && 'needs POSIX and a user that is not root' }, async (t) => {
  const raiz = await projeto(t);
  for (let d = 1; d <= 3; d++) await execucao(raiz, idDoDia(d));
  const trancada = path.join(raiz, SAIDA, idDoDia(1), 'v1', 'trancada');
  await gravar(raiz, { [`${SAIDA}/${idDoDia(1)}/v1/trancada/x.txt`]: 'x' });
  await fs.chmod(trancada, 0o555);
  try {
    const r = await rodar(raiz, '--manter', '1', '--apagar', `${idDoDia(1)},${idDoDia(2)}`);
    assert.equal(r.code, 1, r.texto);
    assert.match(r.linhas[0], new RegExp(`^Apaguei só parte de ${idDoDia(1)}: \\S+\\. Feche o programa que usa a pasta e rode a limpeza de novo\\.$`));
    assert.equal(r.linhas[1], `Apaguei: ${idDoDia(2)} (1,2 KB)`);
    assert.match(r.fim, /^LIMPEZA:PARCIAL 1 /);
  } finally {
    // Destranca antes de o `projeto` apagar a pasta temporária (os `t.after` rodam na ordem em que foram registrados).
    await fs.chmod(trancada, 0o755);
  }
});

// ── custo.mjs ────────────────────────────────────────────────────────────────────────────────

test('U6b-06b: twelve registrar calls at the same time lose none — twelve calls and the full total', async (t) => {
  const raiz = await projeto(t, { [`${SAIDA}/2026-10-09-100000/v1/a.md`]: 'x\n' });
  const chamar = () => custo([CREW, 'registrar', '--run', '2026-10-09-100000', '--modo', 'production', '--itens', '1'], { cwd: raiz, escrever: () => {}, agora: () => AGORA });
  assert.deepEqual(await Promise.all(Array.from({ length: 12 }, chamar)), Array(12).fill(0));
  const c = JSON.parse(await fs.readFile(path.join(raiz, SAIDA, '2026-10-09-100000', 'custo.json'), 'utf8'));
  assert.deepEqual([c.chamadas.length, c.total], [12, 120]);
  assert.equal(await existe(raiz, `${SAIDA}/2026-10-09-100000/.custo.lock`), false, 'the lock is gone');
  assert.ok(!(await arvore(raiz)).some((l) => /\.tmp/.test(l)));
});

test('U6b-06c: --run that is a junction to a folder outside is "Execução não encontrada" and nothing is written outside', async (t) => {
  const raiz = await projeto(t);
  const fora = await alvoFora(t, raiz);
  await fs.mkdir(path.join(raiz, SAIDA), { recursive: true });
  await fs.symlink(fora, path.join(raiz, SAIDA, '2026-10-09-100000'), 'junction');
  const linhas = [];
  const code = await custo([CREW, 'registrar', '--run', '2026-10-09-100000', '--modo', 'test', '--itens', '1'], { cwd: raiz, escrever: (s) => linhas.push(s) });
  assert.deepEqual([code, linhas.at(-1)], [1, 'Execução não encontrada: 2026-10-09-100000']);
  assert.equal(await fs.access(path.join(fora, 'custo.json')).then(() => true, () => false), false);
});

// ── preferencias.mjs and relato.mjs ──────────────────────────────────────────────────────────

test('U6b-04a: a Budget or Retencao inside an HTML comment or a code fence is an example, not the setting', async (t) => {
  const raiz = await projeto(t, { '_opencrew/_memory/preferences.md': '# Preferences\n\n<!--\n- **Budget:** R$ 999,00\n-->\n\n```\nBudget: 888\n```\n\n~~~\nRetencao: 77\n~~~\n\n- **Budget:** R$ 5,00\n- **Retencao:** 4\n' });
  assert.equal(lerPreferencia(raiz, ['Budget']), 'R$ 5,00');
  assert.equal(lerPreferencia(raiz, ['Retencao']), '4');
  const semCampo = await projeto(t, { '_opencrew/_memory/preferences.md': '<!-- Budget: 1 -->\n' });
  assert.equal(lerPreferencia(semCampo, ['Budget']), null);
});

test('U6b-08b: the report prints only values from closed lists — a hand-edited status, event, result or version line never reaches it', async (t) => {
  const raiz = await projeto(t, {
    '_opencrew/.opencrew-version': '1.17.0\nSEGREDO-DO-CLIENTE\n',
    [`${SAIDA}/2026-10-09-100000-5551234567/execucao.json`]: JSON.stringify({ status: 'Fulano pagou 5000', passos: [], marcos: [{ passo: 1, evento: 'Acme', resultado: 'ok' }, { passo: 2, evento: 'checkpoint', resultado: 'corrigido' }], iniciadaEm: '2026-10-09T10:00:00.000Z' }),
  });
  const linhas = [];
  await relato([], { cwd: raiz, escrever: (s) => linhas.push(s) });
  const texto = linhas.join('\n');
  for (const segredo of ['SEGREDO', 'Fulano', 'Acme', '5551234567', '5000']) assert.ok(!texto.includes(segredo), `leaked: ${segredo}`);
  assert.ok(linhas.includes('- Versão do OpenCrew: desconhecida') && linhas.includes('- Situação: desconhecida') && linhas.includes('- Execução: (nome próprio, omitido)'), texto);
  assert.ok(linhas.includes('- Respostas registradas: checkpoint corrigido 1'), texto);
});

test('U6b-01a: with one run kept the texts are in the singular', async (t) => {
  const raiz = await projeto(t);
  await execucao(raiz, idDoDia(1));
  const r = await rodar(raiz, '--manter', '1');
  assert.equal(r.linhas[0], 'Limpeza da crew atas — fica a execução fechada mais recente');
  assert.equal(r.linhas.at(-2), 'Não há execução para limpar na crew atas: a mais recente fica e o resto está aberto ou sem cópia.');
});
