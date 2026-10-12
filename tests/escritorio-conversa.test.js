// specs/fase-e3-conversa-e-entrega.md — E3-01 to E3-05 and E3-07: the delivery one can watch
// (rules 1 to 8 and 10). Ten seconds — three walking there, four talking, three walking back —
// with a speech balloon for who delivers and one for who receives, fixed lines when a status
// changes, a button to watch the last delivery again, and the demo that goes through it all.
// The pure model in Node, plus the labels and the panel on a fake DOM. The clock is a parameter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BONECO, CONVERSA_MS, DURACAO_DEMO_MS, ENTREGA_MS, FALAS, FALA_MS, IDA_MS, LIMITE_DA_FALA, MEMORIA_INICIAL, RESPOSTA_MS, ROTEIRO, SALAS, VOLTA_MS,
  caixaDaFala, consultar, cortarFala, montarModelo, montarPagina, quadro, rever, transicao,
} from '../templates/_opencrew/core/escritorio/modelo.js';
import { criarPainel } from '../templates/_opencrew/core/escritorio/painel.js';
import { criarRotulos } from '../templates/_opencrew/core/escritorio/rotulos.js';

const HTML = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio/index.html'), 'utf8').replace(/\r\n/g, '\n');
// A multiple of every animation period: the phases of the clock start at zero.
const T0 = Date.parse('2026-10-05T12:00:00.000Z');
const iso = (ms) => new Date(T0 + ms).toISOString();
const MENSAGEM = 'Pauta aprovada, com três fontes.';

/** A running state; `agentes` sets the statuses by position (at least three agents). */
function estado({ agentes = [], n = Math.max(3, agentes.length), ...extra } = {}) {
  const agents = Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Agente ${i + 1}`, icon: '🙂', status: agentes[i] ?? 'idle', label: '' }));
  return { crew: 'minha-crew', status: 'running', step: { current: 2, total: 5, label: 'Escrever o texto' }, agents, handoff: null, updatedAt: iso(0), ...extra };
}
const passagem = (de, para, message = MENSAGEM, ms = 0) => ({ from: `a${de}`, to: `a${para}`, message, completedAt: iso(ms) });
const ler = (bruto, opcoes) => montarModelo(bruto, { agoraMs: T0, ...opcoes });
/** Readings in a row, each `[state, ms after T0, options]`: the model after the last transition. */
const seguir = (...leituras) => leituras.reduce((anterior, [bruto, ms = 0, opcoes]) => transicao(anterior, ler(bruto, opcoes), T0 + ms), null);
const em = (m, ms) => quadro(m, T0 + ms);
const falas = (m, ms) => em(m, ms).map((b) => b.fala);
const onde = (b) => ({ x: b.x, y: b.y });
const ANTES = [estado({ agentes: ['working'] })];
const ENTREGUE = estado({ agentes: ['done', 'working'], handoff: passagem(1, 2) });
/** A delivery from the first agent to the second, new at T0. */
const entrega = (opcoes) => seguir([ANTES[0], 0, opcoes], [ENTREGUE, 0, opcoes]);

/** A fake element with only what the page may use: text, children, style and listeners. */
function elemento(tag = 'div') {
  return {
    tag, className: '', textContent: '', hidden: false, dataset: {}, children: [], ouvintes: {},
    style: { setProperty(nome, valor) { this[nome] = valor; } },
    append(...novos) { this.children.push(...novos); },
    replaceChildren(...novos) { this.children = novos; },
    remove() { this.removido = true; },
    setAttribute(nome, valor) { this[nome] = valor; },
    addEventListener(tipo, fn) { this.ouvintes[tipo] = fn; },
  };
}
const todos = (el) => [el, ...el.children.flatMap(todos)];
const daClasse = (el, classe) => todos(el).filter((f) => f.className.split(' ').includes(classe));
/** The labels of a model on a fake layer, already told of the frame of that instant. */
function rotulosEm(modelo, ms) {
  const camada = elemento();
  const rotulos = criarRotulos(camada, { createElement: elemento });
  rotulos.atualizar(modelo.agentes, modelo.ambiente.sala);
  rotulos.acompanhar(em(modelo, ms));
  return { camada, rotulos };
}
const numero = (porcento) => parseFloat(porcento);

test('E3-01a: a new handoff — 0 to 3 s who delivers walks with the paper; 3 to 7 s stands in front of the desk of who receives; 7 to 10 s walks back without it; at 10 s is seated', () => {
  assert.deepEqual([IDA_MS, CONVERSA_MS, VOLTA_MS, ENTREGA_MS], [3000, 4000, 3000, 10000]);
  const m = entrega();
  const { mesas } = m.ambiente.sala;
  const a = (ms) => em(m, ms)[0];
  for (const ms of [0, 1500, 2999]) assert.deepEqual([a(ms).acao, a(ms).papel, a(ms).sentado, a(ms).pose.startsWith('andar')], ['entregando', true, false, true], `${ms} ms: on the way`);
  assert.deepEqual([onde(a(0)), a(1500).x > mesas[0].boneco.x], [mesas[0].boneco, true]);
  for (const ms of [3000, 4000, 5499, 5500, 6999]) {
    assert.deepEqual([onde(a(ms)), a(ms).acao, a(ms).pose, a(ms).sentado, a(ms).destino], [mesas[1].frente, 'entregando', 'parado', false, 1], `${ms} ms: standing in front of the desk`);
  }
  assert.deepEqual([a(3000).papel, a(5499).papel, a(5500).papel], [true, true, false], 'the paper changes hands when who receives answers');
  for (const ms of [7000, 8500, 9999]) assert.deepEqual([a(ms).acao, a(ms).papel, a(ms).sentado, a(ms).pose.startsWith('andar')], ['entregando', false, false, true], `${ms} ms: on the way back`);
  assert.ok(a(8500).espelhado && !a(1500).espelhado, 'facing where it walks to');
  for (const ms of [10000, 10001, 600000]) assert.deepEqual([onde(a(ms)), a(ms).acao, a(ms).sentado, a(ms).papel], [mesas[0].boneco, 'done', true, false], `${ms} ms: seated`);
  assert.ok([0, 3000, 5500, 8000].every((ms) => em(m, ms)[1].pose.startsWith('digitar')), 'who received is typing all along');
});

test('E3-01b: in the conversation, 3 to 5.5 s is the line of who delivers, with the message; 5.5 to 7 s is the answer of who receives, "Deixa comigo."; outside it there is no delivery speech', () => {
  assert.deepEqual([FALA_MS, RESPOSTA_MS, FALA_MS + RESPOSTA_MS, FALAS.resposta], [2500, 1500, CONVERSA_MS, 'Deixa comigo.']);
  // The receiver is idle here, so that the only lines are those of the delivery.
  const m = seguir(ANTES, [estado({ agentes: ['done'], handoff: passagem(1, 2) })]);
  for (const ms of [0, 1500, 2999, 7000, 8500, 10000, 60000]) assert.deepEqual(falas(m, ms), [null, null, null], `${ms} ms`);
  for (const ms of [3000, 4000, 5499]) assert.deepEqual(falas(m, ms), [MENSAGEM, null, null], `${ms} ms`);
  for (const ms of [5500, 6000, 6999]) assert.deepEqual(falas(m, ms), [null, 'Deixa comigo.', null], `${ms} ms`);
});

test('E3-01c: no message — "Pronto, é com você."; a message of 200 characters — up to 60 in the balloon, ending in "…", whole in the panel; a message with <b> shows as text', () => {
  assert.deepEqual([FALAS.entrega, LIMITE_DA_FALA], ['Pronto, é com você.', 60]);
  for (const vazia of ['', '   ']) assert.equal(falas(seguir(ANTES, [estado({ agentes: ['done'], handoff: passagem(1, 2, vazia) })]), 4000)[0], 'Pronto, é com você.');
  const longa = Array.from({ length: 40 }, (_, i) => `pal${i % 10}`).join(' ');
  assert.equal(longa.length, 199);
  const m = seguir(ANTES, [estado({ agentes: ['done'], handoff: passagem(1, 2, `${longa}!`) })]);
  const [fala] = falas(m, 4000);
  assert.ok([...fala].length <= 60 && fala.endsWith('…'), fala);
  assert.ok(`${longa}!`.startsWith(fala.slice(0, -1)) && /pal\d$/.test(fala.slice(0, -1)), `no word cut in half: ${fala}`);
  assert.equal(m.passagem.mensagem, `${longa}!`, 'the model keeps the whole text for the panel');
  // One long word cannot be kept whole: it is cut at 59 characters; a short text is not touched.
  assert.deepEqual([cortarFala('x'.repeat(200)), cortarFala('x'.repeat(60)), cortarFala('  oi  '), cortarFala(null)], [`${'x'.repeat(59)}…`, 'x'.repeat(60), 'oi', '']);
  assert.equal([...cortarFala('😀'.repeat(80))].length, 60, 'characters, not code units');
  // Text, never markup: the balloon and the panel write it with textContent.
  const marcada = seguir(ANTES, [estado({ agentes: ['done'], handoff: passagem(1, 2, '<b>Pronto</b> & feito') })]);
  const { camada } = rotulosEm(marcada, 4000);
  assert.deepEqual(daClasse(camada, 'fala-texto').map((el) => el.textContent), ['<b>Pronto</b> & feito']);
  const doc = documento();
  criarPainel(doc, () => {}).atualizar({ ...montarPagina(consultar(MEMORIA_INICIAL, { crews: [{ crew: 'c', estado: estado({ handoff: passagem(1, 2, `${longa}!`) }) }] }), { agoraMs: T0 }) });
  assert.ok(doc.getElementById('passagem').textContent.endsWith(`${longa}!`), 'the panel has the whole message');
  for (const fonte of ['rotulos.js', 'painel.js']) assert.doesNotMatch(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio', fonte), 'utf8'), /innerHTML|insertAdjacentHTML/, fonte);
});

test('E3-01d: the first reading of a crew that already has a handoff — nobody walks and nobody speaks', () => {
  const m = seguir([ENTREGUE]);
  assert.deepEqual(m.falas, []);
  for (const ms of [0, 1000, 3000, 4000, 5500, 6000, 9000, 20000]) {
    assert.ok(em(m, ms).every((b) => b.sentado && b.fala === null && !b.semBalao), `${ms} ms`);
    assert.deepEqual(daClasse(rotulosEm(m, ms).camada, 'fala'), []);
  }
});

test('E3-01e: a new handoff 2 s into another — only the figure of the new one walks, from the start', () => {
  const segunda = estado({ agentes: ['done', 'done', 'working'], handoff: passagem(2, 3, 'Texto pronto.', 2000) });
  const m = seguir(ANTES, [ENTREGUE], [segunda, 2000]);
  const { mesas } = m.ambiente.sala;
  assert.deepEqual(em(m, 2000).map((b) => [b.acao, b.sentado, onde(b)]), [['done', true, mesas[0].boneco], ['entregando', false, mesas[1].boneco], ['working', true, mesas[2].boneco]]);
  assert.deepEqual([falas(m, 4000), falas(m, 6000), falas(m, 8000)], [[null, null, 'Escrever o texto'], [null, 'Texto pronto.', null], [null, null, 'Deixa comigo.']], 'and the conversation is the one of the new handoff');
  for (let ms = 2000; ms < 2000 + ENTREGA_MS; ms += 250) assert.equal(em(m, ms).filter((b) => !b.sentado).length, 1, `${ms} ms: never two figures walking`);
  assert.ok(em(m, 2000 + ENTREGA_MS).every((b) => b.sentado));
});

test('E3-02a: an agent that goes from idle to working says the label of the step for 3 s, then the status balloon is back; completed — "Pronto!"; failed — "Deu problema." on the agent that failed', () => {
  assert.deepEqual([FALAS.pronto, FALAS.problema], ['Pronto!', 'Deu problema.']);
  const comecou = seguir([estado()], [estado({ agentes: ['idle', 'working'] }), 1000]);
  assert.deepEqual(comecou.falas, [{ id: 'a2', texto: 'Escrever o texto', inicioMs: T0 + 1000 }]);
  for (const ms of [1000, 2500, 3999]) assert.deepEqual(falas(comecou, ms), [null, 'Escrever o texto', null], `${ms} ms`);
  assert.deepEqual([falas(comecou, 999), falas(comecou, 4000)], [[null, null, null], [null, null, null]]);
  assert.equal(comecou.agentes[1].balao, 'Escrever o texto', 'the status balloon is still in the model');
  // On the page: while the line is on, the status balloon gives way; then it is back.
  const { camada, rotulos } = rotulosEm(comecou, 2000);
  const balao = () => daClasse(camada, 'balao')[0].style.opacity;
  assert.deepEqual([daClasse(camada, 'fala-texto').map((el) => el.textContent), balao()], [['Escrever o texto'], '0']);
  rotulos.acompanhar(em(comecou, 4000));
  assert.deepEqual([daClasse(camada, 'fala').filter((el) => !el.removido), balao()], [[], '']);
  // Another reading in the middle neither repeats the line nor cuts it; after 3 s it is dropped.
  const depois = seguir([estado()], [estado({ agentes: ['idle', 'working'] }), 1000], [estado({ agentes: ['idle', 'working'], updatedAt: iso(2000) }), 2000]);
  assert.deepEqual([depois.falas, falas(depois, 3999), falas(depois, 4000)], [comecou.falas, [null, 'Escrever o texto', null], [null, null, null]]);
  assert.deepEqual(seguir([estado()], [estado({ agentes: ['idle', 'working'] }), 1000], [estado({ agentes: ['idle', 'working'] }), 5000]).falas, []);
  const pronta = seguir([estado({ agentes: ['done', 'working'] })], [estado({ status: 'completed', agentes: ['done', 'done'] }), 1000]);
  assert.deepEqual([falas(pronta, 1000), falas(pronta, 3999), falas(pronta, 4000)], [[null, 'Pronto!', null], [null, 'Pronto!', null], [null, null, null]]);
  const falhou = seguir([estado({ agentes: ['done', 'working'] })], [estado({ status: 'failed', agentes: ['done', 'failed'], motivo: 'Sem acesso.' }), 1000]);
  assert.deepEqual([falas(falhou, 1000), falas(falhou, 3999), falas(falhou, 4000)], [[null, 'Deu problema.', null], [null, 'Deu problema.', null], [null, null, null]]);
  // A checkpoint is not a line: the status balloon "Aguardando você" stays while it lasts.
  const espera = seguir([estado({ agentes: ['working'] })], [estado({ status: 'checkpoint', agentes: ['checkpoint'] }), 1000]);
  assert.deepEqual([espera.falas, falas(espera, 1500), espera.agentes[0].balao], [[], [null, null, null], 'Aguardando você']);
  // An agent without a desk (the 13th on) has no figure to speak.
  const treze = seguir([estado({ n: 14 })], [estado({ n: 14, agentes: [...Array(12).fill('idle'), 'working'] }), 1000]);
  assert.deepEqual(treze.falas, []);
});

test('E3-02b: while the conversation lasts, the status balloon of the two involved does not show', () => {
  const m = entrega();
  const calados = (ms) => em(m, ms).map((b) => b.semBalao);
  assert.deepEqual([calados(2999), calados(3000), calados(5500), calados(6999), calados(7000)], [[false, false, false], [true, true, false], [true, true, false], [true, true, false], [false, false, false]]);
  assert.equal(m.agentes[1].balao, 'Escrever o texto', 'who receives is working: it has a status balloon');
  const { camada, rotulos } = rotulosEm(m, 4000);
  const balao = () => daClasse(camada, 'balao').map((el) => el.style.opacity);
  assert.deepEqual(balao(), ['0']);
  rotulos.acompanhar(em(m, 6000));
  assert.deepEqual([balao(), daClasse(camada, 'fala-texto').filter((el) => !el.removido).map((el) => el.textContent)], [['0'], ['Deixa comigo.']]);
  rotulos.acompanhar(em(m, 7000));
  assert.deepEqual(balao(), ['']);
});

test('E3-03a: a balloon at the first and at the last desk of the row is whole inside the scene, and its tail points at the figure', () => {
  for (const sala of Object.values(SALAS)) {
    const n = sala.mesas.length;
    const ultima = sala.colunasDeMesa;
    for (const [de, para] of [[2, 1], [ultima - 1, ultima], [n, 1], [1, n]]) {
      const antes = estado({ n, agentes: Array.from({ length: n }, (_, i) => (i === de - 1 ? 'working' : 'idle')) });
      const depois = estado({ n, agentes: Array.from({ length: n }, (_, i) => (i === para - 1 ? 'working' : 'idle')), handoff: passagem(de, para, 'x'.repeat(200)) });
      for (const reduzirMovimento of [false, true]) {
        const m = seguir([antes, 0, { reduzirMovimento }], [depois, 0, { reduzirMovimento }]);
        for (const ms of [1000, 4000, 6000]) {
          const falando = em(m, ms).filter((b) => b.fala !== null);
          assert.equal(falando.length, 1, `${sala.nome} ${de} → ${para}, ${ms} ms`);
          const [b] = falando;
          const caso = `${sala.nome} ${de} → ${para}, ${ms} ms${reduzirMovimento ? ', reduced motion' : ''}`;
          const { x, teto, baixo } = caixaDaFala(b, sala);
          assert.deepEqual([x, baixo <= b.y, teto >= 0, baixo - teto >= 12], [b.x + BONECO / 2, true, true, true], caso);
          assert.ok(sala.mesas.every((mesa) => mesa.nome.y >= baixo || mesa.nome.y + 6 <= teto), `${caso}: over the name of a desk`);
          const { camada } = rotulosEm(m, ms);
          const [fala] = daClasse(camada, 'fala');
          const [topo, altura] = [numero(fala.style.top), numero(fala.style.height)];
          assert.ok(topo >= 0 && altura > 0 && topo + altura <= 100, `${caso}: between the top and the bottom of the scene`);
          assert.ok(Math.abs((topo * sala.altura) / 100 - teto) < 0.01 && Math.abs(((topo + altura) * sala.altura) / 100 - baixo) < 0.01, caso);
          // The balloon sits between two springs in the proportion of the figure's x: whatever its
          // width, it stays inside the scene and over the figure.
          const [antesDela, texto, depoisDela] = daClasse(fala, 'fala-linha')[0].children;
          const [a, d] = [Number(antesDela.style.flexGrow), Number(depoisDela.style.flexGrow)];
          assert.deepEqual([a, d, texto.className], [x, sala.largura - x, 'fala-texto'], caso);
          for (const largura of [10, 60, 110, sala.largura]) {
            const esquerda = ((sala.largura - largura) * a) / (a + d);
            assert.ok(esquerda >= 0 && esquerda + largura <= sala.largura + 1e-9 && esquerda <= x && esquerda + largura >= x, `${caso}: a balloon ${largura} wide`);
          }
          assert.ok(Math.abs((numero(daClasse(fala, 'fala-rabicho')[0].style.left) * sala.largura) / 100 - x) < 0.01, `${caso}: the tail points at the figure`);
        }
      }
    }
  }
  assert.match(HTML, /\.fala \{[^}]*overflow: hidden/);
  assert.match(HTML, /\.fala-texto \{[^}]*min-height: 0/);
  assert.match(HTML, /\.fala-rabicho/);
});

/** A fake document with the ids of the real index.html, their tag, `hidden` and static text. */
function documento() {
  const tags = [...HTML.matchAll(/<([a-z0-9]+)\b([^>]*\bid="([^"]+)"[^>]*)>([^<]*)/g)];
  const porId = new Map(tags.map(([, tag, atributos, id, texto]) => [id, Object.assign(elemento(tag), { atributos, hidden: /\shidden\b/.test(atributos), textContent: texto.trim() })]));
  return { title: '', getElementById: (id) => porId.get(id) ?? null, createElement: elemento };
}

test('E3-04a: "Rever entrega" on a handoff already over plays the delivery again from the start (click, Enter or space); without a handoff there is no button', () => {
  // A native button: the browser turns Enter and space into the same click.
  assert.match(HTML, /<button type="button" class="rever" id="rever" aria-describedby="passagem" hidden>Rever entrega<\/button>/);
  assert.match(HTML, /\.rever:focus-visible \{[^}]*outline:/);
  const doc = documento();
  let pedidos = 0;
  const painel = criarPainel(doc, () => {}, () => { pedidos += 1; });
  const botao = doc.getElementById('rever');
  const mostrar = (bruto) => painel.atualizar(montarPagina(consultar(MEMORIA_INICIAL, { crews: [{ crew: 'c', estado: bruto }] }), { agoraMs: T0 }));
  mostrar(estado());
  assert.deepEqual([botao.hidden, doc.getElementById('passagem').hidden], [true, true], 'no handoff: no button');
  mostrar(ENTREGUE);
  assert.deepEqual([botao.tag, botao.hidden, botao.textContent, doc.getElementById('passagem').textContent], ['button', false, 'Rever entrega', `Última passagem de bastão: Agente 1 → Agente 2 — ${MENSAGEM}`]);
  botao.ouvintes.click();
  assert.equal(pedidos, 1);
  // What the click asks of the model: the delivery of that handoff, from the start.
  const terminada = entrega();
  assert.ok(em(terminada, 60000).every((b) => b.sentado && b.fala === null));
  const denovo = rever(terminada, T0 + 60000);
  assert.deepEqual(denovo.animacao.entrega, { deId: 'a1', paraId: 'a2', inicioMs: T0 + 60000 });
  assert.deepEqual([em(denovo, 60000)[0].acao, onde(em(denovo, 60000)[0]), falas(denovo, 64000)[0], falas(denovo, 66000)[1], em(denovo, 70000)[0].sentado], ['entregando', terminada.ambiente.sala.mesas[0].boneco, MENSAGEM, 'Deixa comigo.', true]);
  // First reading (nothing ever played): it plays; under way: it starts over; no handoff: nothing.
  const aberta = rever(seguir([ENTREGUE]), T0 + 500);
  assert.deepEqual([aberta.animacao.entrega, em(aberta, 2000)[0].acao], [{ deId: 'a1', paraId: 'a2', inicioMs: T0 + 500 }, 'entregando']);
  assert.deepEqual(onde(em(rever(entrega(), T0 + 2000), 2000)[0]), terminada.ambiente.sala.mesas[0].boneco, 'a click in the middle starts it over');
  const semPassagem = seguir([estado()]);
  assert.equal(rever(semPassagem, T0), semPassagem);
  assert.equal(rever(null, T0), null);
  assert.deepEqual([denovo.animacao.comemoracao, denovo.falas, denovo.agentes], [terminada.animacao.comemoracao, terminada.falas, terminada.agentes], 'nothing else changes');
});

test('E3-05a: with "reduce motion" everybody stays seated, and the two lines show at the times of the conversation', () => {
  const m = seguir([ANTES[0], 0, { reduzirMovimento: true }], [estado({ agentes: ['done'], handoff: passagem(1, 2) }), 0, { reduzirMovimento: true }]);
  const { mesas } = m.ambiente.sala;
  for (let ms = 0; ms <= ENTREGA_MS + 500; ms += 250) {
    assert.deepEqual(em(m, ms).map((b) => [b.sentado, onde(b), b.papel]), mesas.map((mesa) => [true, mesa.boneco, false]), `${ms} ms: seated`);
    const esperado = ms >= IDA_MS && ms < IDA_MS + FALA_MS ? [MENSAGEM, null, null] : ms >= IDA_MS + FALA_MS && ms < IDA_MS + CONVERSA_MS ? [null, 'Deixa comigo.', null] : [null, null, null];
    assert.deepEqual(falas(m, ms), esperado, `${ms} ms`);
  }
  const { camada } = rotulosEm(m, 4000);
  assert.deepEqual(daClasse(camada, 'fala-texto').map((el) => el.textContent), [MENSAGEM], 'the balloon is over who delivers, seated');
  assert.deepEqual(caixaDaFala(em(m, 4000)[0], m.ambiente.sala).x, mesas[0].boneco.x + BONECO / 2);
  assert.deepEqual(falas(rever(m, T0 + 60000), 64000), [MENSAGEM, null, null], 'and watching again works the same way');
});

test('E3-07a: in the demo every scene with a handoff lasts at least 10 s, and the script goes through the three deliveries with line and answer, a failure with "Deu problema." and the end with "Pronto!"', () => {
  const comPassagem = ROTEIRO.cenas.filter((cena) => cena.passagem);
  assert.equal(comPassagem.length, 3);
  assert.ok(comPassagem.every((cena) => cena.ms >= ENTREGA_MS), 'the whole delivery fits in the scene');
  assert.ok(ROTEIRO.cenas.find((c) => c.status === 'failed').ms >= 3000 && ROTEIRO.cenas.find((c) => c.status === 'completed').ms >= 3000);
  const ditas = [];
  let [leitura, andando] = [null, 0];
  for (let ms = 0; ms < DURACAO_DEMO_MS; ms += 100) {
    if (ms % 200 === 0) leitura = transicao(leitura, montarPagina(MEMORIA_INICIAL, { agoraMs: T0 + ms, decorridoDemoMs: ms }), T0 + ms);
    const bonecos = quadro(leitura, T0 + ms);
    andando = Math.max(andando, bonecos.filter((b) => !b.sentado).length);
    for (const b of bonecos) if (b.fala !== null && ditas.at(-1) !== `${b.id}: ${b.fala}`) ditas.push(`${b.id}: ${b.fala}`);
  }
  const [a, b, c] = comPassagem.map((cena) => cena.passagem);
  for (const [de, para, mensagem] of [a, b, c]) {
    const [fala, resposta] = [ditas.indexOf(`${de}: ${mensagem}`), ditas.indexOf(`${para}: Deixa comigo.`)];
    assert.ok(fala >= 0 && resposta > fala, `${de} → ${para}: line, then answer, in ${ditas.join(' | ')}`);
    assert.ok([...mensagem].length <= 60, 'the demo message fits in the balloon');
  }
  assert.ok(ditas.includes('design: Deu problema.') && ditas.includes('revisao: Pronto!'), ditas.join(' | '));
  assert.ok(ditas.includes('pesquisa: Pesquisar o tema'), 'who starts working says the label of the step');
  assert.equal(andando, 1, 'never two figures walking');
});
