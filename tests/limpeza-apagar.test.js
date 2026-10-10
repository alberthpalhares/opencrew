// specs/fase-u6b-dados-e-custo.md — U6b-02 and U6b-05a: --apagar removes only the run folders it was asked
// for (and the old audio with --audio); anything it does not recognise is refused with nothing deleted;
// a shortcut (link or junction) is never followed; runs.md, crew.yaml, the open runs and the copies stay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AGORA, CREW, SAIDA, arvore, execucao, existe, foraDe, gravar, idDoDia, projeto, rodar } from './_limpeza.js';

const USO = 'Uso: node _opencrew/core/scripts/limpeza.mjs <crew> [--listar] [--manter N] [--apagar "<run>[,<run>…]" [--sem-entrega "<run>[,<run>…]"] [--audio]]';
const RUNS = `crews/${CREW}/_memory/runs.md`;

async function comQuatorze(t, extras) {
  const raiz = await projeto(t, extras);
  for (let d = 1; d <= 14; d++) await execucao(raiz, idDoDia(d), { kb: 3 });
  return raiz;
}

test('U6b-02a: --apagar removes only the folders asked for; runs.md, crew.yaml and the sister runs do not change', async (t) => {
  const raiz = await comQuatorze(t);
  const antes = await foraDe(raiz, [`${SAIDA}/${idDoDia(1)}`, `${SAIDA}/${idDoDia(2)}`]);
  const r = await rodar(raiz, '--apagar', `${idDoDia(1)},${idDoDia(2)}`);
  assert.equal(r.code, 0, r.texto);
  assert.match(r.linhas[0], new RegExp(`^Apaguei: ${idDoDia(1)} \\(3,\\d KB\\)$`));
  assert.match(r.linhas[1], new RegExp(`^Apaguei: ${idDoDia(2)} \\(3,\\d KB\\)$`));
  assert.match(r.fim, /^LIMPEZA:APAGADO 2 6,\d KB$/);
  assert.equal(await existe(raiz, `${SAIDA}/${idDoDia(1)}`), false);
  assert.equal(await existe(raiz, `${SAIDA}/${idDoDia(2)}`), false);
  assert.equal(await existe(raiz, `${SAIDA}/${idDoDia(3)}/v1/ata.md`), true);
  assert.deepEqual(await foraDe(raiz, [`${SAIDA}/${idDoDia(1)}`, `${SAIDA}/${idDoDia(2)}`]), antes, 'U6b-05a: nothing else changed');
});

test('U6b-02a: the same command twice — the second is refused (the run is no longer in the list) and changes nothing', async (t) => {
  const raiz = await comQuatorze(t);
  await rodar(raiz, '--apagar', idDoDia(1));
  const antes = await arvore(raiz);
  const r = await rodar(raiz, '--apagar', idDoDia(1));
  assert.deepEqual([r.code, r.fim], [1, 'LIMPEZA:RECUSADA']);
  assert.deepEqual(await arvore(raiz), antes);
});

test('U6b-02b: a run that is not in the list of now — recent, open, with no copy, missing — refuses everything and deletes nothing', async (t) => {
  const raiz = await comQuatorze(t);
  await execucao(raiz, idDoDia(20), { status: 'aberta' });
  await execucao(raiz, '2026-08-05-100000', { copia: false });
  const antes = await arvore(raiz);
  for (const lista of [`${idDoDia(1)},${idDoDia(14)}`, `${idDoDia(1)},${idDoDia(20)}`, `${idDoDia(1)},2026-08-05-100000`, `${idDoDia(1)},2026-01-01-000000`]) {
    const r = await rodar(raiz, '--apagar', lista);
    assert.deepEqual([r.code, r.fim], [1, 'LIMPEZA:RECUSADA'], lista);
    assert.match(r.linhas[0], /^A execução \S+ não pode ser apagada agora: \S/);
  }
  assert.deepEqual(await arvore(raiz), antes, 'nothing was deleted, not even the valid id of the list');
});

test('U6b-02b: "*", "all", "todos", empty, a path with .. and an id out of the format are usage errors', async (t) => {
  const raiz = await comQuatorze(t);
  const antes = await arvore(raiz);
  const casos = [
    [['--apagar', '*'], 'Não existe "apagar tudo": escreva os run_id um a um.'],
    [['--apagar', 'all'], 'Não existe "apagar tudo": escreva os run_id um a um.'],
    [['--apagar', 'todos'], 'Não existe "apagar tudo": escreva os run_id um a um.'],
    [['--apagar', ''], 'Falta dizer o que apagar: escreva os run_id em --apagar.'],
    [['--apagar', '../fora'], 'O run_id só aceita letras, dígitos, ponto, sublinhado e hífen: ../fora.'],
    [['--apagar', 'a/b'], 'O run_id só aceita letras, dígitos, ponto, sublinhado e hífen: a/b.'],
    [['--apagar', idDoDia(1), '--listar'], 'Use --listar ou --apagar, não os dois.'],
    [['--sem-entrega', idDoDia(1)], 'Falta a opção obrigatória --apagar.'],
    [['--apagar', idDoDia(1), '--sem-entrega', idDoDia(2)], `O --sem-entrega só vale para quem está em --apagar: ${idDoDia(2)}.`],
    [['--audio'], 'O --audio só vale junto com --apagar.'],
  ];
  for (const [argv, motivo] of casos) {
    const r = await rodar(raiz, ...argv);
    assert.deepEqual([r.code, r.linhas], [1, [USO, motivo]], argv.join(' '));
  }
  assert.deepEqual(await arvore(raiz), antes);
});

test('U6b-02b: --apagar of a run with no copy needs --sem-entrega for that run; with it, the run goes', async (t) => {
  const raiz = await projeto(t);
  await execucao(raiz, idDoDia(1), { copia: false });
  for (let d = 2; d <= 3; d++) await execucao(raiz, idDoDia(d));
  const recusa = await rodar(raiz, '--manter', '2', '--apagar', idDoDia(1));
  assert.deepEqual([recusa.code, recusa.fim], [1, 'LIMPEZA:RECUSADA']);
  const ok = await rodar(raiz, '--manter', '2', '--apagar', idDoDia(1), '--sem-entrega', idDoDia(1));
  assert.equal(ok.fim, 'LIMPEZA:APAGADO 1 1,2 KB', ok.texto);
  assert.equal(await existe(raiz, `${SAIDA}/${idDoDia(1)}`), false);
  assert.equal(await existe(raiz, `${SAIDA}/${idDoDia(2)}/copia.json`), true);
});

test('U6b-02c: a link or junction inside output/ that leads outside — the target is never deleted and the link is not a candidate', async (t) => {
  const raiz = await comQuatorze(t);
  const fora = path.join(raiz, '..', `opencrew-fora-${path.basename(raiz)}`);
  await fs.mkdir(path.join(fora, 'v1'), { recursive: true });
  await fs.writeFile(path.join(fora, 'v1', 'importante.md'), 'Não apagar.\n');
  t.after(() => fs.rm(fora, { recursive: true, force: true, maxRetries: 3 }));
  await fs.symlink(fora, path.join(raiz, SAIDA, '2026-08-01-100000'), 'junction');
  const lista = await rodar(raiz);
  assert.ok(!lista.texto.includes('2026-08-01-100000'), 'the link is neither a candidate nor listed');
  const r = await rodar(raiz, '--apagar', '2026-08-01-100000');
  assert.deepEqual([r.code, r.fim], [1, 'LIMPEZA:RECUSADA']);
  assert.equal(await fs.readFile(path.join(fora, 'v1', 'importante.md'), 'utf8'), 'Não apagar.\n');
});

test('U6b-02c: a link INSIDE a run that is deleted — the link goes, the target outside stays', async (t) => {
  const raiz = await comQuatorze(t);
  const fora = path.join(raiz, '..', `opencrew-fora2-${path.basename(raiz)}`);
  await fs.mkdir(fora, { recursive: true });
  await fs.writeFile(path.join(fora, 'dado.md'), 'Do usuário.\n');
  t.after(() => fs.rm(fora, { recursive: true, force: true, maxRetries: 3 }));
  await fs.symlink(fora, path.join(raiz, SAIDA, idDoDia(1), 'atalho'), 'junction');
  const r = await rodar(raiz, '--apagar', idDoDia(1));
  assert.equal(r.code, 0, r.texto);
  assert.equal(await existe(raiz, `${SAIDA}/${idDoDia(1)}`), false);
  assert.equal(await fs.readFile(path.join(fora, 'dado.md'), 'utf8'), 'Do usuário.\n', 'the target of the link is intact');
});

test('U6b-03a: --apagar … --audio deletes the old audio and keeps the transcript and the recent audio; the audio can be deleted with no run', async (t) => {
  const raiz = await comQuatorze(t);
  const dir = `crews/${CREW}/_investigations/perfil`;
  await gravar(raiz, { [`${dir}/audio.wav`]: 'w'.repeat(2048), [`${dir}/raw-content.md`]: '# Texto\n', [`${dir}/novo.wav`]: 'w'.repeat(10) });
  const velho = new Date(AGORA.getTime() - 40 * 24 * 3600 * 1000);
  await fs.utimes(path.join(raiz, dir, 'audio.wav'), velho, velho);
  const sem = await rodar(raiz, '--apagar', idDoDia(1));
  assert.equal(await existe(raiz, `${dir}/audio.wav`), true, 'without --audio the audio stays');
  assert.ok(!sem.texto.includes('Apaguei o áudio'));
  const so = await rodar(raiz, '--apagar', '', '--audio');
  assert.deepEqual([so.code, so.linhas.slice(-2)], [0, ['Apaguei o áudio de 1 arquivo (2,0 KB)', 'LIMPEZA:APAGADO 0 2,0 KB']], so.texto);
  assert.equal(await existe(raiz, `${dir}/audio.wav`), false);
  assert.equal(await existe(raiz, `${dir}/raw-content.md`), true);
  assert.equal(await existe(raiz, `${dir}/novo.wav`), true);
});

test('U6b-05a: after a whole sequence — list, refusals, deletion — runs.md is byte for byte the same, no .tmp is left and only the asked folders are gone', async (t) => {
  const raiz = await comQuatorze(t, { [RUNS]: '# Run History: atas\r\n\r\n| Data | Run ID |\r\n|---|---|\r\n| 2026-09-01 | x |\r\n' });
  const runs = await fs.readFile(path.join(raiz, RUNS));
  await rodar(raiz);
  await rodar(raiz, '--apagar', idDoDia(14));
  await rodar(raiz, '--apagar', `${idDoDia(1)},${idDoDia(3)}`);
  assert.ok((await fs.readFile(path.join(raiz, RUNS))).equals(runs));
  const todos = await arvore(raiz);
  assert.ok(!todos.some((l) => /\.tmp/.test(l)));
  assert.deepEqual([1, 3].map((d) => todos.some((l) => l.includes(idDoDia(d)))), [false, false]);
  assert.ok(todos.some((l) => l.includes(idDoDia(2))) && todos.some((l) => l.includes(idDoDia(14))));
});

test('U6b-02b: each refusal says why — open, among the newest, no copy, or no such folder', async (t) => {
  const raiz = await comQuatorze(t);
  await execucao(raiz, idDoDia(20), { status: 'aberta' });
  await execucao(raiz, '2026-08-05-100000', { copia: false });
  const motivo = async (id) => (await rodar(raiz, '--apagar', id)).linhas[0];
  assert.equal(await motivo(idDoDia(20)), `A execução ${idDoDia(20)} não pode ser apagada agora: aberta: pode ser retomada com /opencrew retomar.`);
  assert.equal(await motivo(idDoDia(14)), `A execução ${idDoDia(14)} não pode ser apagada agora: entre as 10 mais recentes.`);
  assert.equal(await motivo('2026-08-05-100000'), 'A execução 2026-08-05-100000 não pode ser apagada agora: a entrega não foi copiada para o projeto.');
  assert.equal(await motivo('2026-01-01-000000'), 'A execução 2026-01-01-000000 não pode ser apagada agora: não há pasta de execução com esse nome em output/.');
});
