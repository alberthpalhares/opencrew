// specs/fase-u5c-execucao-registrada.md — U5c-06: `retomar` finds the open run of a crew and says
// from which step it goes on; U5c-08a: the delivery uses the theme of the record in its title.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { RUN, SAIDA, conferido, fechar, fora, marcar, pasta, projeto, rodarCaminho, rodarExecucao } from './_execucao.js';
import * as entrega from './_entrega.js';

const retomar = (raiz, ...extras) => rodarExecucao(raiz, 'retomar', ...extras);

test('U5c-06a: an open run with two checked steps answers EXECUCAO:RETOMAR <run> 3 and lists theme, files and checkpoints; nothing is written', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz, '--tema', 'Ata de março', '--passos', '5');
  await marcar(raiz, 1, 'checkpoint', 'corrigido', '--nota', 'incluir o quórum');
  await conferido(raiz, 2, 'v1/minuta.md');
  const antes = await fora(raiz, []);
  const r = await retomar(raiz);
  assert.deepEqual(r.linhas, [
    `Execução: ${RUN}`,
    'Tema: Ata de março',
    'Passos conferidos:',
    `- passo 2: ${SAIDA}/${RUN}/v1/minuta.md`,
    'Checkpoints respondidos:',
    '- passo 1: corrigido — incluir o quórum',
    'Parou depois do passo 2.',
    `EXECUCAO:RETOMAR ${RUN} 3`,
  ]);
  assert.equal(r.code, 0);
  assert.deepEqual(await fora(raiz, []), antes);
});

test('U5c-06a: with every run closed — or none with a record — the answer is EXECUCAO:NADA', async (t) => {
  const raiz = await projeto(t, { [`${SAIDA}/antiga/v1/ata.md`]: '# Ata de antes da 1.14.0\n' });
  assert.deepEqual((await retomar(raiz)).linhas, ['EXECUCAO:NADA']);
  await pasta(raiz);
  await fechar(raiz, 'abortado');
  assert.deepEqual((await retomar(raiz)).linhas, ['EXECUCAO:NADA']);
});

test('U5c-06a: with two open runs it lists both, newest first, and uses the newest; --run picks the other', async (t) => {
  const raiz = await projeto(t);
  await rodarCaminho(raiz, 'pasta', '--run', 'r-velha', '--tema', 'Edital');
  await conferido(raiz, 2, 'v1/minuta.md', 'r-velha');
  await rodarCaminho(raiz, 'pasta', '--run', 'r-nova');
  const r = await retomar(raiz);
  assert.deepEqual(r.linhas.slice(0, 3), ['Execuções abertas (a mais recente primeiro):', '- r-nova — sem tema', '- r-velha — Edital']);
  assert.ok(r.linhas.includes('Passos conferidos: nenhum'));
  assert.equal(r.fim, 'EXECUCAO:RETOMAR r-nova 1');
  assert.equal((await retomar(raiz, '--run', 'r-velha')).fim, 'EXECUCAO:RETOMAR r-velha 3');
  const fechada = await retomar(raiz, '--run', 'fantasma');
  assert.deepEqual(fechada.linhas.slice(-2), ['A execução fantasma não está aberta.', 'EXECUCAO:NADA']);
});

test('U5c-06b: a step that is in the record but whose file is gone is the next step', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await conferido(raiz, 2, 'v1/minuta.md');
  await conferido(raiz, 3, 'v2/ata.md');
  await fs.rm(path.join(raiz, SAIDA, RUN, 'v1', 'minuta.md'));
  const r = await retomar(raiz);
  const i = r.linhas.indexOf('Já gravados, mas serão feitos de novo:');
  assert.deepEqual(r.linhas.slice(i - 1, i + 3), ['Passos conferidos: nenhum', 'Já gravados, mas serão feitos de novo:', `- passo 2: ${SAIDA}/${RUN}/v1/minuta.md (o arquivo não está mais lá)`, `- passo 3: ${SAIDA}/${RUN}/v2/ata.md`]);
  assert.equal(r.fim, `EXECUCAO:RETOMAR ${RUN} 2`);
});

test('U5c-06a: a rejected review sends the run back to the step of on_reject; an approved one, forward', async (t) => {
  const raiz = await projeto(t);
  await pasta(raiz);
  await conferido(raiz, 2, 'v1/minuta.md');
  await conferido(raiz, 3, 'v2/ata.md');
  await conferido(raiz, 4, 'v3/revisao.md');
  await marcar(raiz, 4, 'revisao', 'rejeitado', '--nota', 'faltou o quórum');
  const rejeitada = await retomar(raiz);
  assert.ok(rejeitada.linhas.includes('Revisões:') && rejeitada.linhas.includes('- passo 4: rejeitado — faltou o quórum'));
  assert.equal(rejeitada.fim, `EXECUCAO:RETOMAR ${RUN} 2`);
  assert.ok(rejeitada.linhas.includes('Passos conferidos: nenhum'), 'what will be redone is not listed as ready');
  await fs.rename(path.join(raiz, 'crews/atas/pipeline'), path.join(raiz, 'crews/atas/pipeline-fora'));
  const semCrew = await retomar(raiz);
  assert.ok(semCrew.linhas.includes('Não consegui ler na crew para qual passo a revisão do passo 4 volta: recomeço do passo 2. Confira antes de continuar.'), semCrew.texto);
  assert.equal(semCrew.fim, `EXECUCAO:RETOMAR ${RUN} 2`, 'the first written step before the review, never the review itself');
  await fs.rename(path.join(raiz, 'crews/atas/pipeline-fora'), path.join(raiz, 'crews/atas/pipeline'));
  await conferido(raiz, 2, 'v4/minuta.md');
  assert.equal((await retomar(raiz)).fim, `EXECUCAO:RETOMAR ${RUN} 3`, 'the rewrite of step 2 is the last thing done');
  await conferido(raiz, 3, 'v5/ata.md');
  await conferido(raiz, 4, 'v6/revisao.md');
  await marcar(raiz, 4, 'revisao', 'aprovado');
  assert.equal((await retomar(raiz)).fim, `EXECUCAO:RETOMAR ${RUN} 5`);
  await marcar(raiz, 5, 'checkpoint', 'aprovado');
  const fim = await retomar(raiz);
  assert.ok(fim.linhas.includes('Todos os passos já foram feitos: falta só encerrar a execução.'));
  assert.equal(fim.fim, `EXECUCAO:RETOMAR ${RUN} 6`);
});

test('U5c-08a: the LEIA-ME of a run whose record has a theme opens with "Entrega — {crew} — {tema} ({run})"; with no record, the title of before', async (t) => {
  const raiz = await entrega.projeto(t, { 'v1/minuta.md': '# Proposta\n\nTexto.\n' });
  await entrega.entregar(raiz, ['v1/minuta.md=texto-livre']);
  assert.equal((await entrega.leiame(raiz)).split('\n')[0], `# Entrega — teste — ${entrega.RUN}`);
  await fs.writeFile(path.join(raiz, entrega.EXEC, 'execucao.json'), JSON.stringify({ versao: 1, crew: 'teste', run: entrega.RUN, tema: 'Proposta da horta', status: 'aberta', passos: [], marcos: [] }));
  await entrega.entregar(raiz, ['v1/minuta.md=texto-livre']);
  assert.equal((await entrega.leiame(raiz)).split('\n')[0], `# Entrega — teste — Proposta da horta (${entrega.RUN})`);
  await entrega.entregarEm(raiz, entrega.DEST, ['v1/minuta.md=texto-livre']);
  assert.equal((await entrega.lerDe(raiz, `${entrega.COPIA}/LEIA-ME.md`)).split('\n')[0], `# Entrega — teste — Proposta da horta (${entrega.RUN})`, 'the copy too');
  await fs.writeFile(path.join(raiz, entrega.EXEC, 'execucao.json'), '{ "versao": 1, "tema": "Propos');
  await entrega.entregar(raiz, ['v1/minuta.md=texto-livre']);
  assert.equal((await entrega.leiame(raiz)).split('\n')[0], `# Entrega — teste — ${entrega.RUN}`, 'an unreadable record counts as none');
});
