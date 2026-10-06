// specs/fase-e1-escritorio-ao-vivo.md — E1-05 (a to e, k to m): the pure model of the office
// page (rules 17 to 24 and 29), imported straight into Node — desks, what each status shows,
// the list, "no signal", the tab title, which crew is on screen and the scripted demo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LARGURA, ALTURA, BONECO, LARGURA_COLUNA, MESAS, VAOS_X, mesas, CAMISAS, aparencia, TEXTOS, normalizar,
  montarModelo, MEMORIA_INICIAL, consultar, escolher, emExibicao, montarPagina, ROTEIRO,
  DURACAO_DEMO_MS, estadoDaDemo,
} from '../templates/_opencrew/core/escritorio/modelo.js';

const PASTA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio');
const AGORA = Date.parse('2026-10-05T12:00:00.000Z');
const haMin = (min) => new Date(AGORA - min * 60000).toISOString();
const elenco = (n) => Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Agente ${i + 1}`, icon: '🙂', status: 'idle', label: '' }));

/** A 1.7 state: running, step 2 of 5 "Escrever", three idle agents; `agentes` sets statuses by position. */
function estado({ agentes = [], ...extra } = {}) {
  const agents = elenco(Math.max(3, agentes.length)).map((a, i) => ({ ...a, status: agentes[i] ?? 'idle' }));
  return { crew: 'minha-crew', status: 'running', step: { current: 2, total: 5, label: 'Escrever' }, agents, handoff: null, updatedAt: haMin(0), ...extra };
}
const ver = (bruto, opcoes) => montarModelo(bruto, { agoraMs: AGORA, ...opcoes });
const desenho = (a) => [a.acao, a.monitor, a.balao];
const passo = (label, total) => ({ step: { current: 2, total, label } });
const congelar = (v) => {
  if (v && typeof v === 'object') Object.values(v).forEach(congelar);
  return Object.freeze(v);
};
/** A valid `/estado` answer; each crew is [name, minutes since its update, extra fields]. */
const resposta = (...crews) => ({ projeto: 'abc123abc123', crews: crews.map(([crew, min, extra]) => ({ crew, estado: estado({ crew, updatedAt: haMin(min), ...extra }) })) });
const naTelaAgora = (m, opcoes) => {
  const { modo, crew } = emExibicao(m, opcoes);
  return [modo, crew];
};

const caixa = (p) => ({ ...p, largura: BONECO, altura: BONECO });
const cruzam = (a, b) => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;
const naTela = (r) => r.x >= 0 && r.y >= 0 && r.x + (r.largura ?? 1) <= LARGURA && r.y + (r.altura ?? 1) <= ALTURA;
/** The rectangle one pixel bigger on every side: not crossing it means a gap of at least 1 px. */
const comFolga = (r) => ({ x: r.x - 1, y: r.y - 1, largura: r.largura + 2, altura: r.altura + 2 });
const livre = (faixa) => MESAS.every((m) => !cruzam(comFolga(m.retangulo), faixa));
const pecas = (m) => [m.retangulo, caixa(m.boneco), caixa(m.frente)];
const inteiros = (m) => [m.retangulo, m.boneco, m.frente, m.nome, m.balao].flatMap(Object.values).every(Number.isInteger);

test('E1-05a: 1, 4, 5 and 12 agents — a 4-column grid inside 320×180, nothing overlapping, anchors in the own column', () => {
  assert.deepEqual([LARGURA, ALTURA, BONECO, MESAS.length, mesas(14).length], [320, 180, 16, 12, 12]);
  for (const n of [1, 4, 5, 12]) {
    const lista = ver(estado({ agents: elenco(n) })).agentes.map((a) => a.mesa);
    assert.deepEqual(lista, mesas(n));
    lista.forEach((m, i) => {
      const onde = `desk ${i + 1} of ${n}`;
      assert.deepEqual([m.indice, m.coluna, m.linha], [i, i % 4, Math.floor(i / 4)], onde);
      assert.ok([...pecas(m), m.nome, m.balao].every(naTela) && inteiros(m), `${onde}: inside the screen, whole pixels`);
      for (const p of [m.nome, m.balao, m.boneco, m.frente]) assert.equal(Math.floor(p.x / LARGURA_COLUNA), m.coluna, `${onde}: own column`);
      const [tampo, sentado, emPe] = pecas(m);
      assert.ok(!cruzam(comFolga(tampo), sentado) && !cruzam(comFolga(tampo), emPe) && !cruzam(sentado, emPe), `${onde}: seat, desk and front apart`);
      for (const outra of lista.slice(i + 1)) {
        assert.ok(!pecas(m).some((a) => pecas(outra).some((b) => cruzam(comFolga(a), b))), `${onde} overlaps desk ${outra.indice + 1}`);
      }
    });
  }
});

test('E1-05a: the gaps between the desks fit a walking figure — behind and in front of every row, and between the columns', () => {
  assert.deepEqual(VAOS_X.map((x) => (x + BONECO / 2) / LARGURA_COLUNA), [1, 2, 3], 'one gap in the middle of each pair of columns');
  for (const x of VAOS_X) assert.ok(livre({ x, y: 0, largura: BONECO, altura: ALTURA }), `column gap at x ${x}`);
  for (const m of MESAS.filter((mesa) => mesa.coluna === 0)) {
    for (const y of [m.boneco.y, m.frente.y]) assert.ok(livre({ x: 0, y, largura: LARGURA, altura: BONECO }), `row ${m.linha + 1}, y ${y}`);
  }
});

test('E1-05a: with 14 agents the last two have no desk and are still in the list', () => {
  const agentes = ver(estado({ agents: elenco(14) })).agentes;
  assert.deepEqual(agentes.map((a) => a.mesa !== null), [...Array(12).fill(true), false, false]);
  assert.deepEqual(agentes.slice(12).map((a) => [a.nome, a.statusTexto]), [['Agente 13', 'Em espera'], ['Agente 14', 'Em espera']]);
});

test('E1-05b: each status of the rule 18 table becomes its figure and its monitor; unknown is idle, delivering is done', () => {
  const todos = ['idle', 'working', 'checkpoint', 'done', 'skipped', 'failed', 'delivering', 'dormindo'];
  const m = ver(estado({ agentes: todos }));
  assert.deepEqual(m.agentes.map(desenho), [
    ['idle', 'apagado', null],
    ['working', 'aceso', 'Escrever'],
    ['checkpoint', 'ambar', 'Aguardando você'],
    ['done', 'apagado', null],
    ['skipped', 'apagado', null],
    ['failed', 'vermelho', null],
    ['done', 'apagado', null],
    ['idle', 'apagado', null],
  ]);
  assert.deepEqual(m.agentes.map((a) => a.statusTexto), ['Em espera', 'Trabalhando', 'Aguardando você', 'Concluído', 'Pulado', 'Falhou', 'Concluído', 'Em espera']);
  assert.deepEqual(m.agentes.filter((a) => a.monitorAnimado).map((a) => a.acao), ['working', 'checkpoint']);
  assert.equal(m.faixa, null);
  // Rule 24, reduce motion: same figures and colours, but no monitor blinks or scrolls.
  const parado = ver(estado({ agentes: todos }), { reduzirMovimento: true });
  assert.deepEqual(parado.agentes.map(desenho), m.agentes.map(desenho));
  assert.ok(parado.reduzirMovimento && parado.agentes.every((a) => !a.monitorAnimado));
});

test('E1-05b: working without a label says "Passo K de N"; an execution in checkpoint has the strip and no label balloon', () => {
  assert.equal(ver(estado({ agentes: ['working'], ...passo('', 5) })).agentes[0].balao, 'Passo 2 de 5');
  const pausa = ver(estado({ status: 'checkpoint', agentes: ['working', 'checkpoint', 'done'], ...passo('Aprovar pauta', 5) }));
  assert.equal(pausa.faixa, 'Aguardando você: Aprovar pauta');
  assert.deepEqual(pausa.agentes.map(desenho), [['idle', 'apagado', null], ['checkpoint', 'ambar', 'Aguardando você'], ['done', 'apagado', null]]);
  // Only the drawing changes: the list still tells what the file says.
  assert.deepEqual(pausa.agentes.map((a) => [a.status, a.statusTexto]), [['working', 'Trabalhando'], ['checkpoint', 'Aguardando você'], ['done', 'Concluído']]);
  assert.equal(ver(estado({ status: 'checkpoint', ...passo('', 5) })).faixa, 'Aguardando você');
});

const ANTIGO = {
  crew: 'antiga', status: 'idle', step: { current: 0, total: 3, label: '' }, handoff: null, startedAt: null, updatedAt: haMin(0),
  agents: [
    { id: 'researcher', name: 'Pedro Pesquisa', icon: '🔎', status: 'delivering', desk: { col: 1, row: 1 } },
    { id: 'writer', name: 'Rita Redação', icon: '✍️', status: 'idle', desk: { col: 2, row: 1 } },
  ],
};

test('E1-05c: a 1.6.x state (desk, execution idle, no label) is accepted and the list shows only the status', () => {
  const antigo = ver(ANTIGO);
  assert.deepEqual([antigo.semEstado, antigo.crew, antigo.execucao, antigo.passagem, antigo.motivo], [false, 'antiga', 'running', null, null]);
  assert.deepEqual(antigo.agentes.map((a) => [a.icone, a.nome, a.statusTexto, a.label]), [['🔎', 'Pedro Pesquisa', 'Concluído', ''], ['✍️', 'Rita Redação', 'Em espera', '']]);
  assert.deepEqual(antigo.agentes.map((a) => a.mesa.indice), [0, 1], 'the desk comes from the cast order, not from `desk`');
});

test('E1-05c: the list gives the label, "Passo K" without a total, the last handoff by name and the reason of a failure', () => {
  const agents = elenco(3).map((a, i) => ({ ...a, label: ['Pesquisar', 'Escrever', ''][i] }));
  const handoff = { from: 'a1', to: 'a2', message: 'Pauta com <b>três</b> fontes.', completedAt: haMin(1) };
  const m = ver(estado({ agents, handoff, ...passo('Escrever', '') }));
  assert.deepEqual(m.agentes.map((a) => a.label), ['Pesquisar', 'Escrever', '']);
  assert.deepEqual(m.passo, { atual: 2, total: null, rotulo: 'Escrever', contagem: 'Passo 2' });
  assert.equal(ver(estado({ agentes: ['working'], ...passo('', null) })).agentes[0].balao, 'Passo 2');
  assert.deepEqual(m.passagem, { de: 'Agente 1', para: 'Agente 2', mensagem: 'Pauta com <b>três</b> fontes.', deId: 'a1', paraId: 'a2', completedAt: haMin(1) });
  assert.equal(ver(estado({ handoff: { from: 'sumiu', to: 'a2' } })).passagem.de, 'sumiu', 'an id out of the cast is shown as it is');
  assert.equal(m.motivo, null);
  assert.equal(ver(estado({ status: 'failed', motivo: 'sem acesso' })).motivo, 'sem acesso');
  assert.equal(ver(estado({ status: 'running', motivo: 'sem acesso' })).motivo, null, 'the reason only shows in a failed execution');
});

test('E1-05d: the same cast always looks the same and no shirt repeats up to 12 agents', () => {
  const doze = (status = 'idle') => ver(estado({ agents: elenco(12).map((a) => ({ ...a, status })) })).agentes.map((a) => a.aparencia);
  assert.deepEqual(doze(), doze());
  assert.deepEqual(doze('failed'), doze(), 'the status never changes the colours of the figure (rule 18)');
  assert.equal(new Set(doze().map((a) => a.camisa)).size, 12);
  assert.equal(new Set(CAMISAS).size, 12);
  // The shirt comes from the desk; hair and skin from the id, wherever the agent sits.
  const { camisa, ...corpo } = aparencia('a1', 0);
  assert.deepEqual(aparencia('a1', 7), { camisa: CAMISAS[7], ...corpo });
  assert.equal(camisa, CAMISAS[0]);
  assert.ok(doze().every((a) => [a.camisa, a.cabelo, a.pele].every((cor) => /^#[0-9a-f]{6}$/.test(cor))));
});

test('E1-05d: no signal — after 20 minutes only who was working changes pose, and the object received is untouched', () => {
  const parado = (min, extra) => ver(congelar(estado({ agentes: ['done', 'working', 'idle'], updatedAt: haMin(min), ...extra })));
  const resumo = (m) => [m.parada, m.agentes[1].acao, m.agentes[1].statusTexto];
  for (const min of [-5, 0, 2]) assert.deepEqual(resumo(parado(min)), [null, 'working', 'Trabalhando'], `${min} min`);
  assert.deepEqual(resumo(parado(3)), ['Última atualização há 3 min', 'working', 'Trabalhando']);
  assert.deepEqual(resumo(parado(19)), ['Última atualização há 19 min', 'working', 'Trabalhando']);
  assert.deepEqual(resumo(parado(20)), ['Última atualização há 20 min', 'working', 'Trabalhando']);
  const aos21 = parado(21);
  assert.deepEqual(resumo(aos21), ['Última atualização há 21 min', 'sem-sinal', 'Sem sinal há 21 min']);
  assert.deepEqual(aos21.agentes.map(desenho), [['done', 'apagado', null], ['sem-sinal', 'apagado', null], ['idle', 'apagado', null]]);
  assert.equal(aos21.agentes[1].status, 'working', 'step, agent and status of the file stay as they are');
  assert.deepEqual(resumo(parado(59)), ['Última atualização há 59 min', 'sem-sinal', 'Sem sinal há 59 min']);
  assert.deepEqual(resumo(parado(90)), ['Última atualização há 1 h', 'sem-sinal', 'Sem sinal há 1 h']);
  assert.deepEqual([60, 119, 120].map((min) => parado(min).parada), ['Última atualização há 1 h', 'Última atualização há 1 h', 'Última atualização há 2 h']);
  for (const extra of [{ status: 'checkpoint' }, { status: 'completed' }, { status: 'failed' }, { updatedAt: undefined }, { updatedAt: 'ontem' }]) {
    const m = parado(300, extra);
    assert.ok(m.parada === null && m.agentes.every((a) => a.acao !== 'sem-sinal'), JSON.stringify(extra));
  }
  assert.deepEqual(resumo(ver(estado({ agentes: ['done', 'working'], updatedAt: haMin(300) }), { demo: true })), [null, 'working', 'Trabalhando']);
});

test('E1-05e: an input that is not an object, has no agents or whose agents is not a list is "no state", without throwing', () => {
  for (const ruim of [null, undefined, 7, 'texto', [], {}, { agents: 'a' }, { agents: null }, { agents: { 0: {} } }]) {
    const m = ver(ruim);
    assert.deepEqual([m.semEstado, m.agentes, m.titulo, m.execucao, normalizar(ruim)], [true, [], 'Escritório', null, null]);
  }
  // Rubbish inside a valid state is read as text or left out, never thrown.
  const torto = ver({ agents: [null, 'x', { id: 7 }, {}], step: 'dois', handoff: 'a', status: 42, updatedAt: {} });
  assert.deepEqual(torto.agentes.map((a) => [a.id, a.nome, a.acao]), [['7', '7', 'idle'], ['agente-2', 'agente-2', 'idle']]);
  assert.deepEqual([torto.semEstado, torto.execucao, torto.passo.contagem, torto.passagem, torto.parada], [false, 'running', 'Passo 0', null, null]);
});

test('E1-05k: the tab title — checkpoint, completed, failed, running with and without label and total (rule 29)', () => {
  const titulo = (extra, opcoes) => ver(estado(extra), opcoes).titulo;
  assert.equal(titulo({ status: 'checkpoint' }), '(!) Aguardando você — minha-crew');
  assert.equal(titulo({ status: 'completed' }), '✓ Concluída — minha-crew');
  assert.equal(titulo({ status: 'failed' }), '✗ Falhou — minha-crew');
  assert.equal(titulo(passo('Escrever', 5)), '2/5 Escrever — minha-crew');
  assert.equal(titulo(passo('', 5)), 'Passo 2 de 5 — minha-crew');
  assert.equal(titulo(passo('Escrever', null)), '2 Escrever — minha-crew');
  assert.equal(titulo(passo('', null)), 'Passo 2 — minha-crew');
  // It follows the crew on screen (rule 22): the name the server lists is the one shown.
  assert.equal(titulo({ status: 'completed' }, { crew: 'outra' }), '✓ Concluída — outra');
});

test('E1-05k: demo, "no state" and no connection give the title "Escritório"', () => {
  assert.equal(ver(estado(), { demo: true }).titulo, 'Escritório');
  assert.equal(ver(estado(), { semConexao: true }).titulo, 'Escritório');
  assert.equal(ver(undefined).titulo, 'Escritório');
  assert.equal(montarPagina(MEMORIA_INICIAL, { agoraMs: AGORA }).titulo, 'Escritório');
  const semServidor = montarPagina(consultar(consultar(MEMORIA_INICIAL, resposta(['alfa', 1])), null), { agoraMs: AGORA });
  assert.deepEqual([semServidor.titulo, semServidor.crew, semServidor.aviso], ['Escritório', 'alfa', TEXTOS.semServidor]);
});

test('E1-05l: a crew missing from 1, 2 and 3 answers keeps its last good state; at the 4th it leaves and the demo comes in', () => {
  const boa = resposta(['alfa', 1, { status: 'checkpoint' }]);
  let m = consultar(MEMORIA_INICIAL, boa);
  for (const n of [1, 2, 3]) {
    m = consultar(m, resposta());
    assert.deepEqual(naTelaAgora(m), ['real', 'alfa'], `answer ${n} without the crew`);
    assert.deepEqual(emExibicao(m).estado, boa.crews[0].estado);
  }
  const volta = [boa, resposta(), resposta(), resposta()].reduce((memoria, r) => consultar(memoria, r), m);
  assert.deepEqual(naTelaAgora(volta), ['real', 'alfa'], 'back before the 4th: it stays, and the count of absences starts again');
  m = consultar(m, resposta());
  assert.deepEqual([...naTelaAgora(m), emExibicao(m).frase], ['demo', null, TEXTOS.demonstracao]);
  assert.deepEqual(naTelaAgora(consultar(MEMORIA_INICIAL, resposta())), ['demo', null], 'no good state before: no waiting');
});

test('E1-05l: a failed or invalid answer keeps the last good state and does not count as an absence', () => {
  let m = consultar(MEMORIA_INICIAL, resposta(['alfa', 1]));
  const ruins = [null, undefined, 'x', {}, { crews: 'x' }, { crews: null }];
  for (const ruim of [...ruins, ...ruins]) m = consultar(m, ruim);
  assert.deepEqual([...naTelaAgora(m), m.falhas], ['real', 'alfa', 12]);
  // A crew whose state came broken counts as missing from that answer, nothing more.
  m = consultar(m, { crews: [{ crew: 'alfa', estado: { agents: 'x' } }, { estado: estado() }, null] });
  assert.deepEqual([...naTelaAgora(m), m.falhas, emExibicao(m).crews], ['real', 'alfa', 0, ['alfa']]);
});

test('E1-05m: the demo script has every agent status of rule 18, a handoff and the completed execution', () => {
  const inicios = ROTEIRO.cenas.map((_, i) => ROTEIRO.cenas.slice(0, i).reduce((soma, c) => soma + c.ms, 0));
  const estados = inicios.map(estadoDaDemo);
  assert.equal(DURACAO_DEMO_MS, inicios.at(-1) + ROTEIRO.cenas.at(-1).ms);
  assert.deepEqual([...new Set(estados.flatMap((e) => e.agents.map((a) => a.status)))].sort(), ['checkpoint', 'done', 'failed', 'idle', 'skipped', 'working']);
  assert.deepEqual([...new Set(estados.map((e) => e.status))].sort(), ['checkpoint', 'completed', 'failed', 'running']);
  const passagens = new Set(estados.filter((e) => e.handoff).map((e) => e.handoff.completedAt));
  assert.ok(passagens.size >= 1 && [...passagens].every((iso) => new Date(iso).toISOString() === iso), 'a handoff, dated');
  assert.equal(estados[0].handoff, null);
  // Pure and looping: the same instant gives the same state; every state is one the page reads.
  for (const t of [0, 1, 7300, DURACAO_DEMO_MS - 1]) assert.deepEqual(estadoDaDemo(t + 3 * DURACAO_DEMO_MS), estadoDaDemo(t));
  assert.deepEqual(estadoDaDemo(-5), estadoDaDemo(Number.NaN));
  for (const e of estados) assert.equal(ver(e, { demo: true, agoraMs: AGORA * 2 }).agentes.length, ROTEIRO.agentes.length);
});

test('E1-05m: a recorded execution wins over the demo; with ?demo the demo runs and does not switch', () => {
  const vazia = montarPagina(MEMORIA_INICIAL, { agoraMs: AGORA });
  assert.deepEqual([vazia.modo, vazia.demo, vazia.frase, vazia.crews, vazia.aviso], ['demo', true, TEXTOS.demonstracao, [], null]);
  assert.deepEqual(vazia.agentes.map((a) => a.nome), ROTEIRO.agentes.map((a) => a.name));
  const m = consultar(MEMORIA_INICIAL, resposta(['alfa', 30, { agentes: ['working'] }]));
  const real = montarPagina(m, { agoraMs: AGORA });
  assert.deepEqual([real.modo, real.demo, real.crew, real.frase, real.agentes[0].acao], ['real', false, 'alfa', null, 'sem-sinal']);
  const forcada = montarPagina(consultar(m, resposta(['alfa', 0])), { agoraMs: AGORA, demo: true, decorridoDemoMs: DURACAO_DEMO_MS - 1 });
  assert.deepEqual([forcada.modo, forcada.frase, forcada.titulo, forcada.crews], ['demo', TEXTOS.demoForcada, 'Escritório', []]);
  assert.deepEqual([forcada.execucao, forcada.crew, forcada.parada], ['completed', ROTEIRO.crew, null]);
});

test('E1-05m: two crews — the most recent shows; the user\'s choice stays until it leaves, then the most recent again', () => {
  let m = consultar(MEMORIA_INICIAL, resposta(['alfa', 5], ['beta', 1]));
  assert.deepEqual([...naTelaAgora(m), emExibicao(m).crews], ['real', 'beta', ['beta', 'alfa']]);
  m = consultar(m, resposta(['beta', 9], ['alfa', 5]));
  assert.deepEqual([...naTelaAgora(m), emExibicao(m).crews], ['real', 'alfa', ['alfa', 'beta']], 'sorted here, whatever the order received');
  m = consultar(escolher(m, 'beta'), resposta(['alfa', 0], ['beta', 9, { crew: 'nome-no-arquivo' }]));
  assert.deepEqual([...naTelaAgora(m), montarPagina(m, { agoraMs: AGORA }).titulo], ['real', 'beta', '2/5 Escrever — beta'], 'the choice holds when the other crew is updated, and the tab title follows it');
  assert.deepEqual(naTelaAgora(escolher(m, 'fantasma')), ['real', 'beta'], 'a crew that is not there cannot be chosen');
  for (let i = 0; i < 3; i++) m = consultar(m, resposta(['alfa', 0]));
  assert.deepEqual(naTelaAgora(m), ['real', 'beta']);
  m = consultar(m, resposta(['alfa', 0]));
  assert.deepEqual([...naTelaAgora(m), emExibicao(m).crews, m.escolhida], ['real', 'alfa', ['alfa'], null]);
});

test('E1-05 (§6 and purity): the page texts letter by letter; no model module touches the DOM, the clock or the network', async () => {
  assert.deepEqual({ ...TEXTOS }, {
    nome: 'Escritório',
    aguardando: 'Aguardando você',
    abrindo: 'Abrindo o escritório… Se esta mensagem não sumir, abra pelo endereço que o comando /opencrew dashboard mostrou, e não pelo arquivo.',
    semServidor: 'Sem conexão com o escritório. Tentando de novo… Para reabrir, rode /opencrew dashboard.',
    demonstracao: 'Demonstração — nenhuma execução ainda. Rode uma crew e ela aparece aqui.',
    demoForcada: 'Demonstração. Tire ?demo do endereço para ver a sua crew.',
  });
  const vistos = new Set();
  const proibido = /\b(document|window|navigator|location|localStorage|fetch|setTimeout|setInterval|requestAnimationFrame|performance|process)\b|Date\.now|new Date\(\s*\)|Math\.random/;
  async function conferir(nome) {
    if (vistos.has(nome)) return;
    vistos.add(nome);
    const fonte = await fs.readFile(path.join(PASTA, nome), 'utf8');
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(codigo, proibido, nome);
    for (const [, irmao] of codigo.matchAll(/from '\.\/([\w-]+\.js)'/g)) await conferir(irmao);
  }
  await conferir('modelo.js');
  const irmaos =[...(await fs.readFile(path.join(PASTA, 'modelo.js'), 'utf8')).matchAll(/^export \* from '\.\/([\w-]+\.js)';/gm)].map(([, nome]) => nome);
  const [fachada, ...partes] = await Promise.all(['modelo.js', ...irmaos].map((nome) => import(`../templates/_opencrew/core/escritorio/${nome}`)));
  assert.deepEqual(Object.keys(fachada).sort(), partes.flatMap(Object.keys).sort(), 'modelo.js is only the facade: it exports what its siblings do (a name exported by two of them drops out in silence)');
});
