// specs/fase-u6b-dados-e-custo.md — U6b-01 (who enters the cleanup and who stays), U6b-03 (old audio) and
// U6b-04 (how many stay). The listing writes nothing: the tree of the project is the same before and after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AGORA, CREW, SAIDA, arvore, execucao, gravar, idDoDia, projeto, rodar } from './_limpeza.js';

const USO = 'Uso: node _opencrew/core/scripts/limpeza.mjs <crew> [--listar] [--manter N] [--apagar "<run>[,<run>…]" [--sem-entrega "<run>[,<run>…]"] [--audio]]';
const candidatas = (r) => r.linhas.filter((l) => l.startsWith('- ') && l.includes(' · ')).map((l) => l.slice(2).split(' · ')[0]);
const ficam = (r) => Object.fromEntries(r.linhas.filter((l) => l.startsWith('- ') && !l.includes(' · ')).map((l) => [l.slice(2, l.indexOf(': ')), l.slice(l.indexOf(': ') + 2)]));

test('U6b-01a: 14 closed runs with a copy — the 4 oldest are listed, the 10 newest stay, size and LIMPEZA:LISTA; nothing is written', async (t) => {
  const raiz = await projeto(t);
  for (let d = 1; d <= 14; d++) await execucao(raiz, idDoDia(d), { kb: 2 });
  const antes = await arvore(raiz);
  const r = await rodar(raiz);
  assert.equal(r.code, 0, r.texto);
  assert.deepEqual(candidatas(r), [1, 2, 3, 4].map(idDoDia), 'the oldest first');
  assert.equal(Object.keys(ficam(r)).length, 10);
  assert.ok(Object.values(ficam(r)).every((m) => m === 'entre as 10 mais recentes'));
  assert.match(r.linhas[0], /^Limpeza da crew atas — ficam as 10 execuções fechadas mais recentes$/);
  assert.ok(r.linhas.includes(`- ${idDoDia(1)} · 2026-09-01 · 2,0 KB · aprovada · entrega copiada: sim`) || r.linhas.some((l) => l.startsWith(`- ${idDoDia(1)} · 2026-09-01 · `)), r.texto);
  assert.match(r.fim, /^LIMPEZA:LISTA 4 \d/);
  assert.deepEqual(await arvore(raiz), antes, 'U6b-05a');
});

test('U6b-01b: an open run, a run with no copy and a folder that is not a run stay, each with its reason; --sem-entrega brings the run with no copy in', async (t) => {
  const raiz = await projeto(t);
  for (let d = 1; d <= 3; d++) await execucao(raiz, idDoDia(d));
  await execucao(raiz, idDoDia(20), { status: 'aberta', copia: false });
  await execucao(raiz, idDoDia(21), { copia: false });
  await gravar(raiz, { [`${SAIDA}/anotacoes/n.md`]: 'Notas.\n' });
  const r = await rodar(raiz, '--manter', '1');
  assert.deepEqual(candidatas(r), [1, 2, 3].map(idDoDia), r.texto);
  const motivos = ficam(r);
  assert.equal(motivos[idDoDia(20)], 'aberta: pode ser retomada com /opencrew retomar');
  assert.equal(motivos.anotacoes, 'não é uma pasta de execução');
  assert.equal(motivos[idDoDia(21)], 'é a execução fechada mais recente');
  const velha = await projeto(t);
  await execucao(velha, idDoDia(1), { copia: false });
  await execucao(velha, idDoDia(2));
  assert.equal(ficam(await rodar(velha, '--manter', '1'))[idDoDia(1)], 'a entrega não foi copiada para o projeto');
  assert.deepEqual(candidatas(await rodar(velha, '--manter', '1')), [], 'without --sem-entrega the run with no copy is not a candidate');
});

test('U6b-01c: a run from before 1.14.0 (no record) enters only with a dated name and more than N newer ones', async (t) => {
  const raiz = await projeto(t);
  await execucao(raiz, idDoDia(1), { status: null });
  await execucao(raiz, idDoDia(2), { status: null });
  await execucao(raiz, idDoDia(3));
  await gravar(raiz, { [`${SAIDA}/rascunhos/a.md`]: 'x\n', [`${SAIDA}/nomeada/execucao.json`]: JSON.stringify({ versao: 1, status: 'aprovada', iniciadaEm: '2026-09-02T09:00:00.000Z', passos: [], marcos: [] }), [`${SAIDA}/nomeada/copia.json`]: '{}' });
  const r = await rodar(raiz, '--manter', '2');
  assert.deepEqual(candidatas(r), [idDoDia(1), 'nomeada'], r.texto);
  assert.equal(ficam(r).rascunhos, 'não é uma pasta de execução');
});

test('U6b-03a: audio older than 30 days under _investigations/ is listed (the transcript stays); recent audio stays', async (t) => {
  const raiz = await projeto(t);
  const velho = new Date(AGORA.getTime() - 40 * 24 * 3600 * 1000);
  await gravar(raiz, { [`crews/${CREW}/_investigations/perfil/audio.wav`]: 'w'.repeat(4096), [`crews/${CREW}/_investigations/perfil/raw-content.md`]: '# Texto\n', [`crews/${CREW}/_investigations/perfil/novo.wav`]: 'w'.repeat(1024) });
  await fs.utimes(path.join(raiz, `crews/${CREW}/_investigations/perfil/audio.wav`), velho, velho);
  const r = await rodar(raiz);
  assert.ok(r.linhas.includes('Áudio com mais de 30 dias em _investigations/: 1 arquivo, 4,0 KB (use --audio junto com --apagar)'), r.texto);
  assert.equal(r.fim, 'LIMPEZA:LISTA 0 0 B', 'the size of the last line is of the runs only; the audio has its own line');
});

test('U6b-04a: Retencao in preferences.md changes the default, --manter wins over it, and a number out of 1–99 is a usage error', async (t) => {
  const raiz = await projeto(t, { '_opencrew/_memory/preferences.md': '# Preferences\n\n- **Retencao:** 3\n' });
  for (let d = 1; d <= 6; d++) await execucao(raiz, idDoDia(d));
  assert.deepEqual(candidatas(await rodar(raiz)), [1, 2, 3].map(idDoDia), 'Retencao: 3');
  assert.deepEqual(candidatas(await rodar(raiz, '--manter', '5')), [idDoDia(1)], '--manter 5');
  for (const ruim of ['0', '100', 'dez', '-1']) {
    const r = await rodar(raiz, '--manter', ruim);
    assert.deepEqual([r.code, r.linhas], [1, [USO, 'O --manter é um número inteiro de 1 a 99.']], ruim);
  }
});

test('U6b-04a: nothing to clean says so and ends with LIMPEZA:NADA; a crew with no output folder too', async (t) => {
  const raiz = await projeto(t);
  assert.deepEqual((await rodar(raiz)).linhas.slice(-2), ['Não há execução para limpar na crew atas: as 10 mais recentes ficam e o resto está aberto ou sem cópia.', 'LIMPEZA:NADA']);
  await execucao(raiz, idDoDia(1));
  assert.equal((await rodar(raiz)).fim, 'LIMPEZA:NADA');
});

test('U6b-04a: a crew that does not exist, and a folder with no _opencrew/, are usage errors', async (t) => {
  const raiz = await projeto(t);
  const sem = await rodar(raiz, '--listar');
  assert.equal(sem.code, 0);
  const linhas = [];
  const { main } = await import('../templates/_opencrew/core/scripts/limpeza.mjs');
  assert.equal(await main(['fantasma'], { cwd: raiz, escrever: (s) => linhas.push(s) }), 1);
  assert.deepEqual(linhas, [USO, 'Crew não encontrada: fantasma']);
  assert.equal(await main([CREW, '--apagar'], { cwd: raiz, escrever: (s) => linhas.push(s) }), 1);
  assert.equal(linhas.at(-1), 'Falta dizer o que apagar: escreva os run_id em --apagar.');
});
