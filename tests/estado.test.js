// specs/fase-e1-escritorio-ao-vivo.md — E1-01: the six state events, on the pure core.
// `proximoEstado(estado, evento)` reads no clock and no disk: the time comes in `evento.agora`
// and the cast in `evento.elenco` (read from the text of `crew-party.csv` by `elencoDoCsv`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximoEstado } from '../templates/_opencrew/core/scripts/estado/nucleo.mjs';
import { elencoDoCsv } from '../templates/_opencrew/core/scripts/estado/elenco.mjs';

const CABECALHO = 'id,displayName,title,icon,path,execution';
const CSV = [
  CABECALHO,
  'a,"Ana Apura","Pesquisadora, de tendências",🔎,./agents/a.agent.md,subagent',
  'b,"Beto ""Bala"" Borda",Redator,✍️,./agents/b.agent.md,inline',
  'c,Caio Confere,Revisor,✅,./agents/c.agent.md,inline',
  '',
].join('\r\n');
const [T0, T1, T2, T3] = [0, 1, 2, 3].map((minuto) => `2026-10-05T12:0${minuto}:00.000Z`);

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    Object.values(valor).forEach(congelar);
  }
  return valor;
}

/** Applies one event. State and event are frozen first: a core that changes its input throws. */
const aplicar = (estado, tipo, opcoes = {}, agora = T1) => proximoEstado(congelar(estado), congelar({ tipo, agora, ...opcoes }));
const iniciado = () => aplicar(null, 'iniciar', { crew: 'teste', elenco: elencoDoCsv(CSV), passos: 5 }, T0);
const aTrabalha = () => aplicar(iniciado(), 'passo', { n: 1, agente: 'a', rotulo: 'Pesquisar' }, T1);
const status = (estado) => Object.fromEntries(estado.agents.map((a) => [a.id, a.status]));
const rotulos = (estado) => Object.fromEntries(estado.agents.map((a) => [a.id, a.label]));

test('E1-01a: iniciar --passos 5 — the 3 agents idle in file order, step 0 of 5, no handoff, running', () => {
  assert.deepEqual(iniciado(), {
    crew: 'teste',
    status: 'running',
    step: { current: 0, total: 5, label: '' },
    agents: [
      { id: 'a', name: 'Ana Apura', icon: '🔎', status: 'idle', label: '' },
      { id: 'b', name: 'Beto "Bala" Borda', icon: '✍️', status: 'idle', label: '' },
      { id: 'c', name: 'Caio Confere', icon: '✅', status: 'idle', label: '' },
    ],
    handoff: null,
    startedAt: T0,
    updatedAt: T0,
  });
});

test('E1-01a: iniciar replaces the state that was there; without --passos the total is empty', () => {
  const terminado = aplicar(aplicar(aTrabalha(), 'passo', { n: 2, agente: 'b' }, T2), 'concluir', {}, T2);
  const novo = aplicar(terminado, 'iniciar', { crew: 'teste', elenco: elencoDoCsv(CSV) }, T3);
  assert.deepEqual(novo, { ...iniciado(), step: { current: 0, total: null, label: '' }, startedAt: T3, updatedAt: T3 });
});

test('E1-01a: crew-party.csv — quoted fields, a comma inside, columns found by name, rows without id left out', () => {
  const comBom = `\uFEFF${CABECALHO}\n x , "Xis, o Primeiro" ,"Um ""título""",🧪,./agents/x.agent.md,inline\n\n,"Sem Id",T,🙂,p,inline\nx,"Repetido",T,🙂,p,inline\ny,,Só o título,,p,inline`;
  assert.deepEqual(elencoDoCsv(comBom), [{ id: 'x', name: 'Xis, o Primeiro', icon: '🧪' }, { id: 'y', name: 'y', icon: '' }]);
  const outraOrdem = 'icon,title,displayName,id\n🔎,"Pesquisadora","Ana\nApura",a\n';
  assert.deepEqual(elencoDoCsv(outraOrdem), [{ id: 'a', name: 'Ana\nApura', icon: '🔎' }]);
  for (const vazio of ['', `${CABECALHO}\n`, 'nome,cargo\nAna,Redatora\n', '"aspas que não fecham']) assert.deepEqual(elencoDoCsv(vazio), []);
});

test('E1-01b: passo — the agent works with its label; the next passo closes it and hands the baton over', () => {
  const um = aTrabalha();
  assert.deepEqual([status(um), rotulos(um)], [{ a: 'working', b: 'idle', c: 'idle' }, { a: 'Pesquisar', b: '', c: '' }]);
  assert.deepEqual([um.status, um.handoff, um.startedAt, um.updatedAt], ['running', null, T0, T1]);
  assert.deepEqual(um.step, { current: 1, total: 5, label: 'Pesquisar' });
  const dois = aplicar(um, 'passo', { n: 2, agente: 'b', rotulo: 'Escrever' }, T2);
  assert.deepEqual([status(dois), rotulos(dois)], [{ a: 'done', b: 'working', c: 'idle' }, { a: 'Pesquisar', b: 'Escrever', c: '' }]);
  assert.deepEqual(dois.handoff, { from: 'a', to: 'b', message: '', completedAt: T2 });
  assert.deepEqual(dois.step, { current: 2, total: 5, label: 'Escrever' });
});

test('E1-01b (rule 2): passo without --rotulo — the label of that agent is empty, like the label of the step', () => {
  const semRotulo = aplicar(aTrabalha(), 'passo', { n: 2, agente: 'a' }, T2);
  assert.deepEqual([status(semRotulo), rotulos(semRotulo), semRotulo.step], [{ a: 'working', b: 'idle', c: 'idle' }, { a: '', b: '', c: '' }, { current: 2, total: 5, label: '' }]);
});

test('E1-01c: --mensagem goes into the handoff, from an agent that was working or at a checkpoint', () => {
  const deWorking = aplicar(aTrabalha(), 'passo', { n: 2, agente: 'b', mensagem: 'x' }, T2);
  assert.deepEqual(deWorking.handoff, { from: 'a', to: 'b', message: 'x', completedAt: T2 });
  const noCheckpoint = aplicar(aTrabalha(), 'checkpoint', { agente: 'a' });
  assert.equal(status(noCheckpoint).a, 'checkpoint');
  const deCheckpoint = aplicar(noCheckpoint, 'passo', { n: 2, agente: 'b', mensagem: 'x' }, T2);
  assert.deepEqual(deCheckpoint.handoff, { from: 'a', to: 'b', message: 'x', completedAt: T2 });
  assert.deepEqual(status(deCheckpoint), { a: 'done', b: 'working', c: 'idle' });
});

test('E1-01c: the same agent again, no --agente, or nobody active — the handoff stays as it is', () => {
  const comBastao = aplicar(aTrabalha(), 'passo', { n: 2, agente: 'b', mensagem: 'x' }, T2);
  const deNovo = aplicar(comBastao, 'passo', { n: 3, agente: 'b', mensagem: 'y' }, T3);
  assert.deepEqual([deNovo.handoff, status(deNovo)], [comBastao.handoff, status(comBastao)]);
  const semAgente = aplicar(comBastao, 'passo', { n: 3, rotulo: 'Publicar', mensagem: 'y' }, T3);
  assert.deepEqual([semAgente.handoff, semAgente.agents], [comBastao.handoff, comBastao.agents]);
  assert.deepEqual([semAgente.status, semAgente.step, semAgente.updatedAt], ['running', { current: 3, total: 5, label: 'Publicar' }, T3]);
  const ninguemAtivo = aplicar(comBastao, 'concluir', {}, T2);
  assert.deepEqual(aplicar(ninguemAtivo, 'passo', { n: 2, agente: 'c', mensagem: 'y' }, T3).handoff, comBastao.handoff);
  assert.equal(aplicar(iniciado(), 'passo', { agente: 'b', mensagem: 'y' }).handoff, null);
});

test('E1-01c: two active agents — the handoff comes from the first in cast order and both end done', () => {
  const bTrabalha = aplicar(aTrabalha(), 'passo', { n: 2, agente: 'b' }, T2);
  const doisAtivos = aplicar(bTrabalha, 'checkpoint', { agente: 'a' }, T2);
  assert.deepEqual(status(doisAtivos), { a: 'checkpoint', b: 'working', c: 'idle' });
  const fim = aplicar(doisAtivos, 'passo', { n: 3, agente: 'c' }, T3);
  assert.deepEqual(fim.handoff, { from: 'a', to: 'c', message: '', completedAt: T3 });
  assert.deepEqual(status(fim), { a: 'done', b: 'done', c: 'working' });
});

test('E1-01c: passo without --agente brings an execution at a checkpoint back to running', () => {
  const parado = aplicar(aTrabalha(), 'checkpoint', { n: 2, rotulo: 'Aprovar pauta' });
  assert.equal(parado.status, 'checkpoint');
  const retomado = aplicar(parado, 'passo', { n: 3 }, T3);
  assert.deepEqual([retomado.status, retomado.agents, retomado.step], ['running', parado.agents, { current: 3, total: 5, label: '' }]);
});

test('E1-01d: checkpoint — execution and agent wait; no agent label and no handoff changes', () => {
  const antes = aplicar(aTrabalha(), 'passo', { n: 2, agente: 'b', rotulo: 'Escrever', mensagem: 'x' }, T2);
  const comAgente = aplicar(antes, 'checkpoint', { n: 3, agente: 'b', rotulo: 'Aprovar pauta' }, T3);
  assert.deepEqual([comAgente.status, status(comAgente)], ['checkpoint', { a: 'done', b: 'checkpoint', c: 'idle' }]);
  assert.deepEqual([rotulos(comAgente), comAgente.handoff], [rotulos(antes), antes.handoff]);
  assert.deepEqual(comAgente.step, { current: 3, total: 5, label: 'Aprovar pauta' });
  const semAgente = aplicar(antes, 'checkpoint', { rotulo: 'Aprovar pauta' }, T3);
  assert.deepEqual([semAgente.status, semAgente.agents, semAgente.handoff], ['checkpoint', antes.agents, antes.handoff]);
  assert.deepEqual([semAgente.step, semAgente.updatedAt], [{ current: 2, total: 5, label: 'Aprovar pauta' }, T3]);
  assert.equal(aplicar(antes, 'checkpoint', {}, T3).step.label, '', 'without --rotulo the step label is empty');
});

test('E1-01e: pular, then concluir — the skipped agent stays skipped, the others are done, execution completed', () => {
  const pulado = aplicar(iniciado(), 'pular', { agente: 'c' }, T1);
  assert.deepEqual([status(pulado), pulado.status, pulado.step], [{ a: 'idle', b: 'idle', c: 'skipped' }, 'running', { current: 0, total: 5, label: '' }]);
  const fim = aplicar(aplicar(pulado, 'passo', { n: 1, agente: 'a' }, T2), 'concluir', {}, T3);
  assert.deepEqual(status(fim), { a: 'done', b: 'done', c: 'skipped' });
  assert.deepEqual([fim.status, fim.completedAt, fim.updatedAt, fim.startedAt], ['completed', T3, T3, T0]);
});

test('E1-01f: falhar — the agent that was working (or at a checkpoint) and the execution fail, with the reason', () => {
  const falhou = aplicar(aTrabalha(), 'falhar', { motivo: 'sem acesso' }, T2);
  assert.deepEqual(status(falhou), { a: 'failed', b: 'idle', c: 'idle' });
  assert.deepEqual([falhou.status, falhou.failedAt, falhou.motivo, falhou.updatedAt], ['failed', T2, 'sem acesso', T2]);
  const noCheckpoint = aplicar(aplicar(aTrabalha(), 'checkpoint', { agente: 'a' }), 'falhar', {}, T2);
  assert.deepEqual([status(noCheckpoint), noCheckpoint.motivo], [{ a: 'failed', b: 'idle', c: 'idle' }, '']);
});

test('E1-01g: an agent that was done, with nobody active, goes back to working on a new passo', () => {
  const feito = aplicar(aTrabalha(), 'concluir', {}, T2);
  assert.deepEqual([status(feito), feito.handoff], [{ a: 'done', b: 'done', c: 'done' }, null]);
  const deVolta = aplicar(feito, 'passo', { n: 2, agente: 'a', rotulo: 'Revisar' }, T3);
  assert.deepEqual([status(deVolta), deVolta.handoff, deVolta.status], [{ a: 'working', b: 'done', c: 'done' }, null, 'running']);
  assert.ok(!('completedAt' in deVolta), 'an execution that runs again is no longer completed');
});

test('E1-01h: a 1.6.x file with an agent delivering — passo closes it as done and hands over from it', () => {
  const antigo = {
    crew: 'teste',
    status: 'running',
    step: { current: 1, total: 3, label: 'step-01-research' },
    agents: [
      { id: 'a', name: 'Ana Apura', icon: '🔎', status: 'delivering', desk: { col: 1, row: 1 } },
      { id: 'b', name: 'Beto Borda', icon: '✍️', status: 'idle', desk: { col: 2, row: 1 } },
    ],
    handoff: { from: 'a', to: 'b', message: 'Pauta pronta', completedAt: T0 },
    startedAt: T0,
    updatedAt: T0,
  };
  const novo = aplicar(antigo, 'passo', { n: 2, agente: 'b', rotulo: 'Escrever' }, T1);
  assert.deepEqual(novo.agents, [
    { id: 'a', name: 'Ana Apura', icon: '🔎', status: 'done', label: '' },
    { id: 'b', name: 'Beto Borda', icon: '✍️', status: 'working', label: 'Escrever' },
  ]);
  assert.deepEqual(novo.handoff, { from: 'a', to: 'b', message: '', completedAt: T1 });
  assert.deepEqual([novo.status, novo.step, novo.startedAt], ['running', { current: 2, total: 3, label: 'Escrever' }, T0]);
});

test('E1-01 (rule 1): every event renews updatedAt and returns a new state; the one received is not touched', () => {
  const eventos = [['passo', { n: 2, agente: 'b' }], ['checkpoint', { agente: 'a' }], ['pular', { agente: 'c' }], ['concluir', {}], ['falhar', { motivo: 'x' }]];
  for (const [tipo, opcoes] of eventos) {
    const antes = aTrabalha();
    const copia = structuredClone(antes);
    const depois = aplicar(antes, tipo, opcoes, T3);
    assert.equal(depois.updatedAt, T3, tipo);
    assert.notEqual(depois, antes, tipo);
    assert.deepEqual(antes, copia, tipo);
  }
  assert.throws(() => aplicar(aTrabalha(), 'handoff', { agente: 'b' }), /handoff/, 'there is no handoff event');
});

test('E1-01 (§4): fields that belong to one status only do not outlive it', () => {
  const falhou = aplicar(aTrabalha(), 'falhar', { motivo: 'sem acesso' }, T2);
  const retomado = aplicar(falhou, 'passo', { n: 2, agente: 'a' }, T3);
  assert.deepEqual(Object.keys(retomado), ['crew', 'status', 'step', 'agents', 'handoff', 'startedAt', 'updatedAt']);
  assert.deepEqual(Object.keys(falhou), ['crew', 'status', 'step', 'agents', 'handoff', 'motivo', 'startedAt', 'updatedAt', 'failedAt']);
  const concluido = aplicar(falhou, 'concluir', {}, T3);
  assert.deepEqual(Object.keys(concluido), ['crew', 'status', 'step', 'agents', 'handoff', 'startedAt', 'updatedAt', 'completedAt']);
});
