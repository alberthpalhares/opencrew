// specs/fase-e1-escritorio-ao-vivo.md — E1-05 (f to j): what moves in the office page (rules 16
// and 28), imported straight into Node — the transition between two readings, the route between
// two desks, the frame of each instant and the whole-number scale of the canvas. The clock is
// always a parameter: nothing here waits, and no timer is left open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LARGURA, ALTURA, BONECO, MESAS, VAOS_X, montarModelo, montarPagina, MEMORIA_INICIAL, consultar, ROTEIRO,
  escala, rota, comprimentoDaRota, pontoDaRota, transicao, quadro, SEM_ANIMACAO, POSES, PULO,
  IDA_MS, VOLTA_MS, COMEMORACAO_MS, DIGITAR_MS, ANDAR_MS,
} from '../templates/_opencrew/core/escritorio/modelo.js';

// A multiple of every animation period: the phases of the clock start at zero.
const T0 = Date.parse('2026-10-05T12:00:00.000Z');
const ENTREGA_MS = IDA_MS + VOLTA_MS;
const iso = (ms) => new Date(T0 + ms).toISOString();
const elenco = (n) => Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Agente ${i + 1}`, icon: '🙂', status: 'idle', label: '' }));
/** `n` statuses, idle but for the given positions (1-based): quem(12, { 6: 'working' }). */
const quem = (n, postos = {}) => Array.from({ length: n }, (_, i) => postos[i + 1] ?? 'idle');

/** A running state of at least three agents; `agentes` sets the statuses by position. */
function estado({ agentes = [], ...extra } = {}) {
  const agents = elenco(Math.max(3, agentes.length)).map((a, i) => ({ ...a, status: agentes[i] ?? 'idle' }));
  return { crew: 'minha-crew', status: 'running', step: { current: 2, total: 5, label: 'Escrever' }, agents, handoff: null, updatedAt: iso(0), ...extra };
}
/** The handoff from the agent in position `de` to the one in `para` (1-based), dated `ms` after T0. */
const passagem = (de, para, ms = 0) => ({ from: `a${de}`, to: `a${para}`, message: '', completedAt: iso(ms) });
const ler = (bruto, opcoes) => montarModelo(bruto, { agoraMs: T0, ...opcoes });
/** Readings in a row, each `[state, ms after T0, options]`: the model after the last transition. */
const seguir = (...leituras) => leituras.reduce((anterior, [bruto, ms = 0, opcoes]) => transicao(anterior, ler(bruto, opcoes), T0 + ms), null);
const em = (m, ms) => quadro(m, T0 + ms);
const acoes = (m, ms) => em(m, ms).map((b) => b.acao);
const onde = (b) => ({ x: b.x, y: b.y });
const congelar = (v) => {
  if (v && typeof v === 'object') Object.values(v).forEach(congelar);
  return Object.freeze(v);
};

const cruzam = (a, b) => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;
const trechos = (pontos) => pontos.slice(1).map((fim, i) => [pontos[i], fim]);
/** Everything a figure covers while it walks one stretch. */
const varrido = ([a, b]) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), largura: Math.abs(a.x - b.x) + BONECO, altura: Math.abs(a.y - b.y) + BONECO });
const naTela = (r) => r.x >= 0 && r.y >= 0 && r.x + r.largura <= LARGURA && r.y + r.altura <= ALTURA;
const entre = (v, a, b) => v >= Math.min(a, b) && v <= Math.max(a, b);
const naRota = (pontos, p) => trechos(pontos).some(([a, b]) => entre(p.x, a.x, b.x) && entre(p.y, a.y, b.y));
const passos = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

test('E1-05f: a different handoff.completedAt sends who delivered to the desk of who receives for 4 s, whatever is read meanwhile; then done', () => {
  const antes = [estado({ agentes: ['working'] })];
  const entregue = estado({ agentes: ['done', 'working'], handoff: passagem(1, 2) });
  const m = seguir(antes, [entregue, 500]);
  assert.deepEqual(m.animacao, { entrega: { deId: 'a1', paraId: 'a2', inicioMs: T0 + 500 }, comemoracao: null });
  assert.deepEqual([m.crew, m.agentes.map((a) => a.acao)], ['minha-crew', ['done', 'working', 'idle']], 'the reading itself comes back whole');
  for (const ms of [500, 1500, 2500, 4499]) {
    assert.deepEqual(em(m, ms).map((b) => [b.acao, b.destino]), [['entregando', 1], ['working', null], ['idle', null]], `${ms} ms`);
  }
  assert.deepEqual(acoes(m, 4500), ['done', 'working', 'idle']);
  // A third reading with another step, in the middle: the walk goes on from where it was.
  const outroPasso = { ...entregue, step: { current: 3, total: 5, label: 'Revisar' }, updatedAt: iso(1500) };
  const terceira = seguir(antes, [entregue, 500], [outroPasso, 1500]);
  assert.deepEqual(terceira.animacao, m.animacao);
  assert.deepEqual([em(terceira, 2000)[0], acoes(terceira, 4499), acoes(terceira, 4500)], [em(m, 2000)[0], ['entregando', 'working', 'idle'], ['done', 'working', 'idle']]);
  // Not even a status written meanwhile interrupts it: the walk comes from the transition.
  const deNovo = seguir(antes, [entregue, 500], [estado({ agentes: ['working', 'done'], handoff: entregue.handoff }), 1500]);
  assert.deepEqual([acoes(deNovo, 4499), acoes(deNovo, 4500)], [['entregando', 'done', 'idle'], ['working', 'done', 'idle']]);
  assert.deepEqual(seguir([entregue], [entregue, 1000]).animacao, SEM_ANIMACAO, 'the same completedAt in both readings: nothing');
  // The date is what tells one handoff from the other: the same pair again walks again.
  const repetida = seguir(antes, [entregue, 500], [{ ...entregue, handoff: passagem(1, 2, 6000) }, 6000]);
  assert.deepEqual(repetida.animacao.entrega, { deId: 'a1', paraId: 'a2', inicioMs: T0 + 6000 });
  assert.deepEqual(seguir(antes, [{ ...entregue, handoff: { from: 'a1', to: 'a2' } }, 500]).animacao, SEM_ANIMACAO, 'a handoff without a date cannot be told as new');
});

test('E1-05f: a new handoff in the middle replaces the one under way', () => {
  const primeira = estado({ agentes: ['done', 'working'], handoff: passagem(1, 2) });
  const segunda = estado({ agentes: ['done', 'done', 'working'], handoff: passagem(2, 3, 1500) });
  const m = seguir([estado({ agentes: ['working'] })], [primeira], [segunda, 1500]);
  assert.deepEqual(m.animacao.entrega, { deId: 'a2', paraId: 'a3', inicioMs: T0 + 1500 });
  assert.deepEqual(em(m, 1500).map((b) => [b.acao, b.destino, b.sentado]), [['done', null, true], ['entregando', 2, false], ['working', null, true]]);
  assert.deepEqual(onde(em(m, 1500)[0]), MESAS[0].boneco, 'who was walking is back in the seat');
  assert.deepEqual([acoes(m, 1500 + ENTREGA_MS - 1), acoes(m, 1500 + ENTREGA_MS)], [['done', 'entregando', 'working'], ['done', 'done', 'working']]);
});

test('E1-05f: with 14 agents the handoffs from the 12th to the 13th and from the 13th to the 14th give no walk and no error', () => {
  const com14 = (handoff) => seguir([estado({ agentes: quem(14) })], [estado({ agentes: quem(14), handoff })]);
  for (const [de, para] of [[12, 13], [13, 14], [13, 1], [1, 99], [99, 1]]) {
    const m = com14(passagem(de, para));
    for (const ms of [0, 1000, IDA_MS, ENTREGA_MS - 1, ENTREGA_MS]) {
      const bonecos = em(m, ms);
      assert.equal(bonecos.length, 12, 'only who has a desk is drawn');
      assert.ok(bonecos.every((b) => b.acao === 'idle' && b.sentado && passos(b, b.mesa.boneco) === 0), `${de} → ${para}, ${ms} ms`);
    }
  }
  assert.deepEqual(em(com14(passagem(11, 12)), 1000).filter((b) => !b.sentado).map((b) => [b.indice, b.acao, b.destino]), [[10, 'entregando', 11]], 'both with a desk: it walks');
});

const pronta = (extra) => estado({ status: 'completed', agentes: ['done', 'done', 'skipped'], handoff: passagem(1, 2), ...extra });
/** Nothing is playing in this model of a completed crew: everyone seated, as the file says. */
function quieto(m, caso) {
  assert.deepEqual(m.animacao, SEM_ANIMACAO, caso);
  for (const ms of [0, 1000, 5000]) assert.deepEqual(em(m, ms).map((b) => [b.acao, b.sentado]), [['done', true], ['done', true], ['skipped', true]], caso);
}

test('E1-05g: the first reading of a crew — opening, switching crews, leaving the demo — plays nothing, even with a handoff and completed', () => {
  quieto(seguir([pronta()]), 'opening or reloading');
  const alfa = estado({ crew: 'alfa', agentes: ['working'] });
  quieto(seguir([alfa], [pronta({ crew: 'beta' }), 1000]), 'switching to another crew');
  quieto(seguir([alfa], [pronta({ crew: 'beta' }), 1000], [pronta({ crew: 'alfa', handoff: passagem(2, 1, 900) }), 2000]), 'and back to the first');
  // Leaving the demo, even to a crew with the name of the demo's.
  const naDemo = transicao(null, montarPagina(MEMORIA_INICIAL, { agoraMs: T0 }), T0);
  const real = montarPagina(consultar(MEMORIA_INICIAL, { crews: [{ crew: ROTEIRO.crew, estado: pronta() }] }), { agoraMs: T0 });
  assert.deepEqual([naDemo.modo, naDemo.animacao, real.modo, real.crew], ['demo', SEM_ANIMACAO, 'real', ROTEIRO.crew]);
  quieto(transicao(naDemo, real, T0 + 1000), 'leaving the demo');
  // A reading without state ends what was playing, and the next one is a first reading too —
  // even when the file brings no crew name; and nothing here throws.
  const andando = seguir([estado({ crew: '', agentes: ['working'] })], [pronta({ crew: '' })]);
  const semEstado = transicao(andando, ler(null), T0 + 1000);
  assert.deepEqual([acoes(andando, 100), semEstado.animacao, quadro(semEstado, T0)], [['entregando', 'comemorando', 'skipped'], SEM_ANIMACAO, []]);
  assert.deepEqual([quadro(null, T0), quadro(ler(pronta()), T0).length, transicao(null, null, T0)], [[], 3, { animacao: SEM_ANIMACAO }]);
  quieto(transicao(semEstado, ler(pronta({ crew: '', handoff: passagem(2, 1, 900) })), T0 + 2000), 'after a reading without state');
});

test('E1-05g: an execution that becomes completed is celebrated for 4 s; completed in both readings is not', () => {
  const antes = estado({ agentes: ['done', 'working', 'skipped'], handoff: passagem(1, 2) });
  const m = seguir([antes], [pronta(), 1000]);
  assert.deepEqual(m.animacao, { entrega: null, comemoracao: { inicioMs: T0 + 1000 } });
  for (const ms of [1000, 2500, 1000 + COMEMORACAO_MS - 1]) assert.deepEqual(acoes(m, ms), ['comemorando', 'comemorando', 'skipped'], `${ms} ms`);
  assert.deepEqual([acoes(m, 999), acoes(m, 1000 + COMEMORACAO_MS), COMEMORACAO_MS], [['done', 'done', 'skipped'], ['done', 'done', 'skipped'], 4000], 'and back to done');
  // Everyone at a desk celebrates, whatever an old file says of them — but who was skipped.
  assert.deepEqual(acoes(seguir([antes], [pronta({ agentes: ['idle', 'failed', 'skipped'] }), 1000]), 1000), ['comemorando', 'comemorando', 'skipped']);
  // Who celebrates stays at the desk: arm up and a hop, then down, in whole pixels.
  const [alto, baixo] = [em(m, 1000)[0], em(m, 1000 + DIGITAR_MS)[0]];
  assert.deepEqual([alto.pose, onde(alto), baixo.pose, onde(baixo)], ['mao', { x: MESAS[0].boneco.x, y: MESAS[0].boneco.y - PULO }, 'parado', MESAS[0].boneco]);
  assert.ok(Number.isInteger(PULO) && PULO > 0 && alto.sentado && !alto.papel && alto.destino === null);
  // Another reading in the middle neither restarts nor stops it; a new run does stop it.
  assert.deepEqual(seguir([antes], [pronta(), 1000], [pronta({ updatedAt: iso(3000) }), 3000]).animacao, m.animacao);
  assert.deepEqual(seguir([antes], [pronta(), 1000], [estado(), 2000]).animacao, SEM_ANIMACAO);
  assert.deepEqual(seguir([pronta()], [pronta(), 1000]).animacao, SEM_ANIMACAO, 'completed in both readings');
  for (const status of ['checkpoint', 'failed']) assert.deepEqual(seguir([{ ...antes, status }], [pronta(), 1000]).animacao.comemoracao, { inicioMs: T0 + 1000 }, status);
  // The last delivery, still under way, ends first; then who delivered joins the others.
  const juntos = seguir([estado({ agentes: ['working'] })], [antes], [pronta(), 1000]);
  assert.deepEqual([acoes(juntos, 2000), acoes(juntos, ENTREGA_MS)], [['entregando', 'comemorando', 'skipped'], ['comemorando', 'comemorando', 'skipped']]);
});

test('E1-05g: the demo goes the same way — its handoff walks and its end is celebrated', () => {
  const inicio = (i) => ROTEIRO.cenas.slice(0, i).reduce((soma, cena) => soma + cena.ms, 0);
  const naDemo = (ms) => montarPagina(MEMORIA_INICIAL, { agoraMs: T0, decorridoDemoMs: ms });
  const ate = (cena) => [inicio(cena) - 1, inicio(cena)].reduce((anterior, ms) => transicao(anterior, naDemo(ms), T0 + ms), null);
  const [bastao, fim] = [ROTEIRO.cenas.findIndex((c) => c.passagem), ROTEIRO.cenas.findIndex((c) => c.status === 'completed')];
  const [de, para] = ROTEIRO.cenas[bastao].passagem;
  assert.deepEqual(ate(bastao).animacao, { entrega: { deId: de, paraId: para, inicioMs: T0 + inicio(bastao) }, comemoracao: null });
  assert.deepEqual(quadro(ate(bastao), T0 + inicio(bastao) + 1000).map((b) => b.acao), ['entregando', 'working', 'idle', 'idle', 'skipped']);
  assert.deepEqual(quadro(ate(fim), T0 + inicio(fim) + 1000).map((b) => b.acao), ['comemorando', 'comemorando', 'comemorando', 'comemorando', 'skipped']);
  assert.ok(ROTEIRO.cenas[bastao].ms >= ENTREGA_MS && ROTEIRO.cenas[fim].ms >= COMEMORACAO_MS, 'each scene lasts as long as what it plays');
});

test('E1-05h: who is working changes pose every 0.3 s; the same instant gives the same frame, called 1 or 100 times', () => {
  const m = congelar(seguir([estado({ agentes: ['working', 'idle', 'checkpoint', 'done', 'skipped', 'failed'] })]));
  const pose = (ms) => em(m, ms)[0].pose;
  assert.notEqual(pose(0), pose(DIGITAR_MS));
  assert.equal(pose(0), pose(100));
  assert.deepEqual([0, 100, 299, 300, 599, 600].map(pose), ['digitar-a', 'digitar-a', 'digitar-a', 'digitar-b', 'digitar-b', 'digitar-a']);
  assert.deepEqual([DIGITAR_MS, ANDAR_MS], [300, 150]);
  assert.deepEqual(em(m, 0).map((b) => [b.acao, b.pose]), [['working', 'digitar-a'], ['idle', 'parado'], ['checkpoint', 'mao'], ['done', 'parado'], ['skipped', 'parado'], ['failed', 'parado']]);
  const primeiro = em(m, 1234);
  for (let i = 0; i < 100; i++) assert.deepEqual(em(m, 1234), primeiro);
  // Everyone in the own seat, in whole pixels, with what the scene needs to paint.
  for (const b of primeiro) {
    const agente = m.agentes[b.indice];
    assert.deepEqual([b.id, b.mesa, b.aparencia, onde(b)], [agente.id, MESAS[b.indice], agente.aparencia, MESAS[b.indice].boneco]);
    assert.deepEqual([b.sentado, b.papel, b.espelhado, b.destino], [true, false, false, null]);
    assert.ok(POSES.includes(b.pose));
  }
});

test("E1-05h: a delivery from a to b — a's seat at the start, the front of b's desk at 2 s, seated again at 4 s and 10 minutes later", () => {
  const [de, para] = [MESAS[5], MESAS[11]];
  const m = congelar(seguir([estado({ agentes: quem(12, { 6: 'working' }) })], [estado({ agentes: quem(12, { 6: 'done', 12: 'working' }), handoff: passagem(6, 12) })]));
  const a = (ms) => em(m, ms)[de.indice];
  assert.deepEqual([onde(a(0)), onde(a(IDA_MS)), IDA_MS, VOLTA_MS], [de.boneco, para.frente, 2000, 2000]);
  const resumo = (b) => [b.acao, b.papel, b.sentado, b.destino];
  assert.deepEqual([a(0), a(IDA_MS - 1)].map(resumo), Array(2).fill(['entregando', true, false, 11]), 'with the paper on the way there');
  assert.deepEqual([a(IDA_MS), a(ENTREGA_MS - 1)].map(resumo), Array(2).fill(['entregando', false, false, 11]), 'without it on the way back');
  // The legs change every 0.15 s.
  for (const ms of [0, 500, 1700, 2600]) assert.notEqual(a(ms).pose, a(ms + ANDAR_MS).pose, `${ms} ms`);
  assert.deepEqual([0, 149, 150, 299, 300].map((ms) => a(ms).pose), ['andar-a', 'andar-a', 'andar-b', 'andar-b', 'andar-a']);
  // Whole pixels, always on the route, never jumping; mirrored by the side it walks to.
  const caminho = rota(de.indice, para.indice);
  let anterior = onde(a(0));
  for (let ms = 0; ms < ENTREGA_MS; ms += 10) {
    const p = onde(a(ms));
    assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y) && naRota(caminho, p) && passos(p, anterior) <= 2, `${ms} ms: ${JSON.stringify(p)}`);
    assert.ok(POSES.includes(a(ms).pose));
    anterior = p;
  }
  assert.deepEqual([a(100).espelhado, a(ENTREGA_MS - 100).espelhado, passos(a(ENTREGA_MS - 1), de.boneco) <= 1], [false, true, true]);
  for (const ms of [ENTREGA_MS, ENTREGA_MS + 600000, -1]) {
    assert.deepEqual([onde(a(ms)), a(ms).acao, a(ms).pose, a(ms).sentado, a(ms).papel, a(ms).destino], [de.boneco, 'done', 'parado', true, false, null], `${ms} ms`);
  }
  assert.ok(em(m, 1000).every((b) => b.indice === de.indice || (b.sentado && passos(b, b.mesa.boneco) === 0)), 'nobody else leaves the seat');
  assert.equal(em(m, 1000)[para.indice].pose, 'digitar-b', 'who receives is already typing');
});

test('E1-05h: with reduce motion the pose is fixed and the position is the final one — no walk, no celebration, no blinking', () => {
  const leituras = (opcoes) => [[estado({ agentes: ['working', 'checkpoint'] }), 0, opcoes], [estado({ agentes: ['done', 'working', 'checkpoint'], handoff: passagem(1, 2) }), 0, opcoes]];
  const parado = seguir(...leituras({ reduzirMovimento: true }));
  const fixo = [['done', 'parado', MESAS[0].boneco, true, 'apagado'], ['working', 'digitar-a', MESAS[1].boneco, true, 'aceso'], ['checkpoint', 'mao', MESAS[2].boneco, true, 'ambar']];
  for (const ms of [0, 150, 300, 500, 1000, 2000, 3999, 4000]) {
    assert.deepEqual(em(parado, ms).map((b) => [b.acao, b.pose, onde(b), b.sentado, b.monitor]), fixo, `${ms} ms`);
    assert.ok(em(parado, ms).every((b) => b.monitorFase === 0 && !b.papel));
  }
  assert.deepEqual(acoes(seguir(...leituras()), 1000), ['entregando', 'working', 'checkpoint'], 'the same readings, with motion: it walks');
  const fim = (opcoes) => seguir([estado({ agentes: ['done', 'working'], handoff: passagem(1, 2) }), 0, opcoes], [pronta(), 0, opcoes]);
  assert.deepEqual([acoes(fim({ reduzirMovimento: true }), 1000), acoes(fim(), 1000)], [['done', 'done', 'skipped'], ['comemorando', 'comemorando', 'skipped']]);
});

test('E1-05h: the monitors go by the clock too — amber blinks once a second, the lit one runs its lines, the others stay', () => {
  const m = seguir([estado({ agentes: ['working', 'checkpoint', 'failed', 'idle'] })]);
  const monitores = (ms) => em(m, ms).map((b) => [b.monitor, b.monitorFase]);
  const fixos = [['vermelho', 0], ['apagado', 0]];
  assert.deepEqual(monitores(0), [['aceso', 0], ['ambar', 0], ...fixos]);
  assert.deepEqual(monitores(250), [['aceso', 1], ['ambar', 1], ...fixos]);
  assert.deepEqual(monitores(499), monitores(250));
  assert.deepEqual(monitores(500), [['aceso', 2], ['apagado', 2], ...fixos]);
  assert.deepEqual(monitores(999), [['aceso', 3], ['apagado', 3], ...fixos]);
  assert.deepEqual(monitores(1000), monitores(0));
});

test('E1-05i: for every pair of desks the route has only horizontal and vertical stretches, through the gaps, inside 320×180, across no desk, and ends in front of who receives', () => {
  const corredores = MESAS.flatMap((m) => [m.boneco.y, m.frente.y]);
  for (const de of MESAS) {
    for (const para of MESAS) {
      const par = `${de.indice + 1} → ${para.indice + 1}`;
      const pontos = rota(de.indice, para.indice);
      assert.deepEqual([pontos[0], pontos.at(-1)], [de.boneco, para.frente], par);
      assert.ok(pontos.flatMap(Object.values).every(Number.isInteger), `${par}: whole pixels`);
      for (const trecho of trechos(pontos)) {
        const [a, b] = trecho;
        assert.ok((a.x === b.x) !== (a.y === b.y), `${par}: one direction at a time`);
        assert.ok(a.x === b.x ? VAOS_X.includes(a.x) : corredores.includes(a.y), `${par}: through the gaps`);
        assert.ok(naTela(varrido(trecho)), `${par}: inside the screen`);
        assert.ok(MESAS.every((m) => !cruzam(m.retangulo, varrido(trecho))), `${par}: across no desk`);
        assert.ok(MESAS.every((m) => m === de || !cruzam({ ...m.boneco, largura: BONECO, altura: BONECO }, varrido(trecho))), `${par}: across no seated colleague`);
      }
      // Pixel by pixel, at a constant speed, from one end to the other.
      const total = comprimentoDaRota(pontos);
      const andados = Array.from({ length: total + 1 }, (_, k) => pontoDaRota(pontos, k / total));
      assert.deepEqual([onde(andados[0]), onde(andados.at(-1))], [de.boneco, para.frente], par);
      assert.ok(andados.every((p, k) => naRota(pontos, p) && (k === 0 || passos(p, andados[k - 1]) === 1)), `${par}: no jump`);
    }
  }
  assert.deepEqual([rota(0, 12), rota(12, 0), rota(-1, 0), rota(0, 'x'), rota(1.5, 0)], Array(5).fill(null), 'no desk, no route');
  // Mirrored when the last sideways stretch went left; beyond the ends, the ends.
  const [ida, volta] = [rota(0, 1), [...rota(0, 1)].reverse()];
  assert.deepEqual([0.1, 0.5, 0.9].map((f) => [pontoDaRota(ida, f).espelhado, pontoDaRota(volta, f).espelhado]), Array(3).fill([false, true]));
  assert.deepEqual([pontoDaRota(ida, -1), pontoDaRota(ida, 7)].map(onde), [MESAS[0].boneco, MESAS[1].frente]);
});

test('E1-05j: the scale is the largest whole number that fits in device pixels, and the canvas size in CSS follows it', () => {
  for (const [dpr, n] of [[1, 3], [1.25, 3], [1.5, 4], [2, 6]]) {
    assert.deepEqual(escala(1000, 600, dpr), { n, largura: (320 * n) / dpr, altura: (180 * n) / dpr }, `dpr ${dpr}`);
  }
  assert.deepEqual(escala(200, 100, 1), { n: 1, largura: 320, altura: 180 }, 'not even 1 fits: 1, and the page scrolls');
  // Both sides limit it, and one pixel short does not fit.
  assert.deepEqual([escala(1000, 359, 1).n, escala(639, 600, 1).n, escala(640, 360, 1).n, escala(959, 540, 1).n, escala(960, 539, 1).n], [1, 1, 2, 2, 2]);
  // A canvas of the size given back fits again, whatever the pixel ratio (1.7 × 5 misses by a hair).
  for (const dpr of [0.67, 0.9, 1.1, 1.4, 1.7, 1.75, 2.625, 3]) {
    for (let n = 1; n <= 12; n++) assert.equal(escala((320 * n) / dpr, (180 * n) / dpr, dpr).n, n, `dpr ${dpr}, scale ${n}`);
  }
  // Rubbish in: scale 1, or pixel ratio 1; never an error.
  for (const ruim of [[0, 0, 1], [Number.NaN, 600, 1], [-5, 600, 2], [Infinity, Infinity, 1], [undefined, undefined, undefined]]) assert.equal(escala(...ruim).n, 1, String(ruim));
  assert.deepEqual([0, -1, undefined, Number.NaN, Infinity].map((dpr) => escala(1000, 600, dpr)), Array(5).fill({ n: 3, largura: 960, altura: 540 }));
});
