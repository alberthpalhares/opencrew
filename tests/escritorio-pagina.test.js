// specs/fase-e1-escritorio-ao-vivo.md — E1-06: the office page as files (rules 16, 18 to 20, 22 to
// 25 and the visible half of 28). Contracts over the sources of `escritorio/`, plus the page
// modules run in Node on a fake 2D context and on a fake DOM built from the ids of the real
// index.html. No server, no browser, and every timer is a fake the test fires by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALTURA, BONECO, CAMISAS, LARGURA, LARGURA_COLUNA, MEMORIA_INICIAL, MESAS, POSES, TEXTOS, TOPO,
  consultar, montarModelo, montarPagina, quadro, transicao,
} from '../templates/_opencrew/core/escritorio/modelo.js';
import { CORES, MOLDE, TROCAS, linhasDoBoneco } from '../templates/_opencrew/core/escritorio/sprites.js';
import { PAREDE } from '../templates/_opencrew/core/escritorio/sprites-sala.js';
import { animar, pintarCena } from '../templates/_opencrew/core/escritorio/cena.js';
import { criarPainel } from '../templates/_opencrew/core/escritorio/painel.js';
import { criarRotulos } from '../templates/_opencrew/core/escritorio/rotulos.js';
import { iniciar } from '../templates/_opencrew/core/escritorio/app.js';

const PASTA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio');
const FONTES = Object.fromEntries(readdirSync(PASTA).sort().map((nome) => [nome, readFileSync(path.join(PASTA, nome), 'utf8')]));
const HTML = FONTES['index.html'];
// A multiple of every animation period: the phases of the clock start at zero.
const AGORA = Date.parse('2026-10-05T12:00:00.000Z');
const haMin = (min) => new Date(AGORA - min * 60000).toISOString();
const SLOTS = ['cabelo', 'pele', 'pele-sombra', 'camisa', 'camisa-sombra'];
const ABRINDO = 'Abrindo o escritório… Se esta mensagem não sumir, abra pelo endereço que o comando /opencrew dashboard mostrou, e não pelo arquivo.';
const SEM_SERVIDOR = 'Sem conexão com o escritório. Tentando de novo… Para reabrir, rode /opencrew dashboard.';
const DEMONSTRACAO = 'Demonstração — nenhuma execução ainda. Rode uma crew e ela aparece aqui.';
const DEMO_FORCADA = 'Demonstração. Tire ?demo do endereço para ver a sua crew.';

/** A running state, step 2 of 5 "Escrever"; `agentes` sets the statuses by position (at least 3 agents). */
function estado({ agentes = [], n = Math.max(3, agentes.length), ...extra } = {}) {
  const agents = Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Agente ${i + 1}`, icon: '🙂', status: agentes[i] ?? 'idle', label: '' }));
  return { crew: 'minha-crew', status: 'running', step: { current: 2, total: 5, label: 'Escrever' }, agents, handoff: null, updatedAt: haMin(0), ...extra };
}
const ler = (bruto, opcoes) => montarModelo(bruto, { agoraMs: AGORA, ...opcoes });
const resposta = (...estados) => ({ projeto: 'abc123abc123', crews: estados.map((e) => ({ crew: e.crew, estado: e })) });
const passagem = (de, para) => ({ from: de, to: para, message: 'Pauta pronta.', completedAt: haMin(0) });

/** A fake 2D context: every call is kept with the fill colour and the alpha of that moment. */
function contexto() {
  const chamadas = [];
  const postos = new Set();
  const ctx = new Proxy({ globalAlpha: 1 }, {
    get: (alvo, nome) => (nome in alvo ? alvo[nome] : (...args) => { chamadas.push({ nome, args, cor: alvo.fillStyle, alfa: alvo.globalAlpha }); }),
    set: (alvo, nome, valor) => { postos.add(nome); alvo[nome] = valor; return true; },
  });
  return { ctx, chamadas, postos };
}

/** A fake element with only what the page may use: text, children, style and listeners — no HTML strings. */
function elemento(id = '') {
  const filhos = [];
  const pintura = contexto();
  return {
    id, textContent: '', hidden: false, className: '', value: '', dataset: {}, width: 300, height: 150, clientWidth: 960, clientHeight: 540,
    children: filhos, ouvintes: {}, pintura,
    style: { setProperty(nome, valor) { this[nome] = valor; } },
    append(...novos) { filhos.push(...novos); },
    replaceChildren(...novos) { filhos.splice(0, filhos.length, ...novos); },
    setAttribute(nome, valor) { this[nome] = valor; },
    addEventListener(tipo, fn) { this.ouvintes[tipo] = fn; },
    getContext: () => pintura.ctx,
  };
}
/** A fake document with the ids of the real index.html, their `hidden` and static text: an id the page lacks comes back null. */
function documento() {
  const tags = [...HTML.matchAll(/(<[a-z0-9]+\b[^>]*\bid="([^"]+)"[^>]*>)([^<]*)/g)];
  const porId = new Map(tags.map(([, tag, id, texto]) => [id, Object.assign(elemento(id), { hidden: /\shidden\b/.test(tag), textContent: texto.trim() })]));
  return { title: '', hidden: false, ouvintes: {}, getElementById: (id) => porId.get(id) ?? null, createElement: () => elemento(), addEventListener(tipo, fn) { this.ouvintes[tipo] = fn; } };
}
const textoDe = (el) => [el.textContent, ...el.children.map(textoDe)].join(' ').replace(/\s+/g, ' ').trim();
/** What a reader sees in the element of that id: its text, or null while it is hidden. */
const naTela = (doc) => (id) => (doc.getElementById(id).hidden ? null : textoDe(doc.getElementById(id)));

const dentro = ({ args: [x, y, l, a] }) => [x, y, l, a].every(Number.isInteger) && x >= 0 && y >= 0 && l > 0 && a > 0 && x + l <= LARGURA && y + a <= ALTURA;
/** Paints one frame on a fresh fake context and checks what every frame owes: only whole rectangles, inside the screen. */
function pintar(bonecos) {
  const { ctx, chamadas, postos } = contexto();
  pintarCena(ctx, bonecos);
  assert.deepEqual([...new Set(chamadas.map((c) => c.nome))], ['fillRect'], 'the scene only fills rectangles');
  assert.deepEqual([...postos].filter((p) => !['fillStyle', 'globalAlpha'].includes(p)), []);
  assert.ok(chamadas.every(dentro), 'whole pixels, inside 320×180');
  assert.ok(chamadas.every((c) => /^#[0-9a-f]{6}$/.test(c.cor)), 'every colour is #rrggbb');
  assert.equal(ctx.globalAlpha, 1, 'the alpha of the skipped figure does not leak');
  return chamadas;
}
/** One frame of a three-desk room in which the first agent has that status. */
const sala = (status, opcoes = {}, ms = 0) => pintar(quadro(ler(estado({ agentes: [status], ...opcoes.estado }), opcoes), AGORA + ms));
const tem = (chamadas, cor) => chamadas.some((c) => c.cor === cor);
const chave = (c) => JSON.stringify([c.args, c.cor, c.alfa]);
/** What frame `a` paints that frame `b` does not. */
const aMais = (a, b, deB = new Set(b.map(chave))) => a.filter((c) => !deB.has(chave(c)));
const acimaDaCabeca = (c) => c.args[1] + c.args[3] <= MESAS[0].boneco.y && c.args[0] >= MESAS[0].boneco.x && c.args[0] + c.args[2] <= MESAS[0].boneco.x + BONECO;

/** Every `{ paleta, linhas }` an export holds, whatever the nesting. */
function matrizes(nome, valor) {
  if (!valor || typeof valor !== 'object') return [];
  if (Array.isArray(valor.linhas)) return [[nome, valor]];
  return Object.entries(valor).flatMap(([parte, dentroDela]) => matrizes(`${nome}.${parte}`, dentroDela));
}

test('E1-06a: no file of the page writes HTML or text on the canvas; every <script> has src and no tag has an on…= attribute', () => {
  const proibido = /innerHTML|outerHTML|insertAdjacentHTML|document\.write|fillText|strokeText|createContextualFragment|DOMParser|srcdoc|\beval\(|new Function/;
  for (const [nome, fonte] of Object.entries(FONTES)) assert.doesNotMatch(fonte, proibido, nome);
  assert.deepEqual(HTML.match(/<script\b[^>]*>/gi), ['<script type="module" src="app.js">'], 'one script, loaded by src');
  assert.match(HTML, /<script type="module" src="app\.js"><\/script>/, 'and nothing written inside it');
  for (const tag of HTML.match(/<[a-z][^>]*>/gi)) assert.doesNotMatch(tag, /\son[a-z]+\s*=/i, tag);
});

test('E1-06b: no outside address and no embedded image; every pixel matrix is rectangular and uses only its own palette', async () => {
  for (const [nome, fonte] of Object.entries(FONTES)) assert.doesNotMatch(fonte, /https?:\/\/|data:image|@import|url\(/i, nome);
  assert.doesNotMatch(HTML, /<(link|img|iframe|object|embed|base|audio|video)\b/i);
  const cores = Object.values(CORES);
  assert.ok(cores.length <= 24 && cores.every((cor) => /^#[0-9a-f]{6}$/.test(cor)), 'a short palette of #rrggbb colours');
  const nomes = Object.keys(FONTES).filter((nome) => /^sprites.*\.js$/.test(nome));
  const modulos = await Promise.all(nomes.map((nome) => import(`../templates/_opencrew/core/escritorio/${nome}`)));
  const todas = modulos.flatMap((m) => Object.entries(m)).flatMap(([nome, valor]) => matrizes(nome, valor));
  assert.ok(nomes.length >= 2 && todas.length >= 14, `${todas.length} matrices in ${nomes}`);
  for (const [nome, { paleta, linhas }] of todas) {
    assert.ok(linhas.length > 0 && linhas[0].length > 0 && linhas.every((l) => typeof l === 'string' && l.length === linhas[0].length), `${nome}: lines of the same size`);
    for (const letra of new Set(linhas.join(''))) assert.ok(Object.hasOwn(paleta, letra), `${nome}: "${letra}" is not in its palette`);
    for (const cor of Object.values(paleta)) assert.ok(cor === null || cores.includes(cor) || SLOTS.includes(cor), `${nome}: ${cor} is not a colour of the palette`);
  }
  // Rule 16: one 16×16 mould, and each pose is the mould with some lines swapped.
  assert.deepEqual([MOLDE.linhas.length, MOLDE.linhas[0].length, PAREDE.linhas.length], [BONECO, BONECO, TOPO]);
  assert.deepEqual(Object.keys(TROCAS).sort(), [...POSES.filter((pose) => pose !== 'parado'), 'festa', 'papel'].sort());
  assert.deepEqual(linhasDoBoneco('parado'), MOLDE.linhas);
  for (const [pose, trocas] of Object.entries(TROCAS)) {
    for (const texto of Object.values(trocas)) assert.ok(texto.length === BONECO && [...texto].every((l) => Object.hasOwn(MOLDE.paleta, l)), `${pose}: ${texto}`);
    const linhas = linhasDoBoneco(POSES.includes(pose) ? pose : 'parado', { papel: pose === 'papel', festa: pose === 'festa' });
    assert.deepEqual(linhas.flatMap((l, i) => (l === MOLDE.linhas[i] ? [] : [String(i)])), Object.keys(trocas), `${pose} is the mould with swapped lines`);
  }
  const comPapel = linhasDoBoneco('andar-a', { papel: true });
  assert.deepEqual(comPapel.slice(13), linhasDoBoneco('andar-a').slice(13), 'the arm with the paper adds to the legs of who walks');
  assert.notDeepEqual(comPapel.slice(8, 13), MOLDE.linhas.slice(8, 13));
  assert.deepEqual(linhasDoBoneco('andar-b', { espelhado: true }), linhasDoBoneco('andar-b').map((l) => [...l].reverse().join('')));
});

test('E1-06c: the page has the list of agents and the page texts of §6, in PT-BR with accents, written as text', () => {
  assert.match(HTML, /<html lang="pt-BR">/);
  assert.match(HTML, /<meta charset="utf-8">/);
  assert.match(HTML, /<ul\b[^>]*\bid="lista"/);
  assert.deepEqual([TEXTOS.semServidor, TEXTOS.demonstracao, TEXTOS.demoForcada], [SEM_SERVIDOR, DEMONSTRACAO, DEMO_FORCADA]);
  const doc = documento();
  const painel = criarPainel(doc, () => {});
  const ver = (memoria, opcoes) => { painel.atualizar(montarPagina(memoria, { agoraMs: AGORA, ...opcoes })); return naTela(doc); };
  let t = ver(consultar(MEMORIA_INICIAL, resposta()));
  assert.deepEqual([t('frase'), t('etiqueta'), t('aviso'), doc.title], [DEMONSTRACAO, 'Demonstração', null, 'Escritório']);
  t = ver(consultar(MEMORIA_INICIAL, resposta(estado())), { demo: true });
  assert.equal(t('frase'), DEMO_FORCADA);

  const crew = estado({ n: 14, agentes: ['done', 'working'], handoff: passagem('a1', 'a2'), updatedAt: haMin(21) });
  Object.assign(crew.agents[0], { name: '<b>Zé</b>', label: 'Pesquisar' });
  crew.agents[1].label = 'Escrever o texto';
  const memoria = consultar(MEMORIA_INICIAL, resposta(crew));
  assert.equal(ver(consultar(memoria, null))('aviso'), SEM_SERVIDOR);
  t = ver(memoria);
  assert.deepEqual([t('aviso'), t('frase'), t('etiqueta')], [null, null, null]);
  assert.deepEqual([t('crew'), t('passo'), t('parada'), doc.title], ['minha-crew', 'Passo 2 de 5 — Escrever', 'Última atualização há 21 min', '2/5 Escrever — minha-crew']);
  const itens = doc.getElementById('lista').children.map(textoDe);
  assert.equal(itens.length, 14, 'every agent is in the list, with or without a desk');
  assert.match(itens[0], /<b>Zé<\/b>.*Concluído.*Pesquisar/);
  assert.match(itens[1], /Agente 2.*Sem sinal há 21 min.*Escrever o texto/);
  assert.match(itens[13], /Agente 14.*Em espera/);
  assert.match(t('passagem'), /<b>Zé<\/b>.*Agente 2.*Pauta pronta\./);

  t = ver(consultar(MEMORIA_INICIAL, resposta(estado({ status: 'checkpoint', step: { current: 1, total: 5, label: 'Aprovar a pauta' } }))));
  assert.deepEqual([t('faixa'), t('motivo')], ['Aguardando você: Aprovar a pauta', null]);
  t = ver(consultar(MEMORIA_INICIAL, resposta(estado({ status: 'failed', agentes: ['failed'], motivo: 'Sem acesso ao banco.' }))));
  assert.deepEqual([t('faixa'), doc.getElementById('lista').children.length], [null, 3]);
  assert.match(t('motivo'), /Sem acesso ao banco\./);
});

test('E1-06d: the opening sentence of §6 is in the static HTML of index.html, outside <script>, and starts visible', () => {
  assert.equal(TEXTOS.abrindo, ABRINDO);
  const estatico = HTML.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  assert.ok(estatico.includes(`>${ABRINDO}</p>`), 'the sentence, letter by letter, as the text of a paragraph');
  const doc = documento();
  assert.deepEqual([doc.getElementById('abertura').hidden, doc.getElementById('pagina').hidden], [false, true], 'without JavaScript only the sentence shows');
});

test('E1-06 (rules 16, 18, 28): sprites and scene draw every status, a delivery and a celebration on a fake 2D context', () => {
  const parada = sala('idle');
  for (const cor of [CORES.verde, CORES.ambar, CORES.vermelho]) assert.ok(!tem(parada, cor), `an idle room has no ${cor}`);
  assert.ok(!tem(pintar([]), CORES.madeira) && tem(parada, CORES.madeira), 'a desk only where there is an agent');
  assert.ok(parada.filter((c) => c.cor === CORES.madeira).every((c) => c.args[0] < 3 * LARGURA_COLUNA));
  assert.ok(tem(sala('working'), CORES.verde) && aMais(sala('working'), sala('working', {}, 250)).some((c) => c.cor === CORES.verde), 'lit monitor, lines running');
  assert.deepEqual([0, 500].map((ms) => tem(sala('checkpoint', { estado: { status: 'checkpoint' } }, ms), CORES.ambar)), [true, false], 'amber, blinking once a second');
  assert.ok(tem(sala('checkpoint', { estado: { status: 'checkpoint' }, reduzirMovimento: true }, 500), CORES.ambar), 'amber stays on with reduced motion');
  // done, failed and "no signal" are the idle drawing plus a sign over the head (and the red monitor).
  for (const [status, cor, opcoes] of [['done', CORES.verde], ['failed', CORES.vermelho], ['working', CORES.branco, { estado: { updatedAt: haMin(21) } }]]) {
    const sinal = aMais(sala(status, opcoes), parada).filter(acimaDaCabeca);
    assert.ok(sinal.length > 0 && tem(sinal, cor), `${status}: a sign of its own over the head`);
    assert.deepEqual(aMais(sala(status, opcoes), parada).filter((c) => !acimaDaCabeca(c) && c.cor !== CORES.vermelho && c.cor !== CORES.tinta), [], status);
  }
  const pulado = pintar(quadro(ler(estado({ agentes: ['idle', 'idle', 'skipped'] })), AGORA)).filter((c) => c.alfa < 1);
  assert.ok(pulado.length > 0 && pulado.every((c) => c.args[0] >= MESAS[2].boneco.x && c.args[0] + c.args[2] <= MESAS[2].boneco.x + BONECO), 'only the skipped figure is half transparent');
  // Depth: who sits is painted before the own desk; who delivers stands in front of the other desk.
  const [camisa, mesa] = [(f) => f.findIndex((c) => c.cor === CAMISAS[0]), (f) => f.map((c) => c.cor).lastIndexOf(CORES.madeira)];
  assert.ok(camisa(sala('working')) < sala('working').findIndex((c) => c.cor === CORES.madeira));
  const antes = transicao(null, ler(estado({ agentes: ['working'] })), AGORA);
  const entrega = transicao(antes, ler(estado({ agentes: ['done', 'idle', 'working'], handoff: passagem('a1', 'a3') })), AGORA);
  const vistos = new Set();
  for (let ms = 0; ms <= 4200; ms += 50) {
    const bonecos = quadro(entrega, AGORA + ms);
    pintar(bonecos);
    vistos.add(`${bonecos[0].pose}${bonecos[0].papel ? ' com papel' : ''}${bonecos[0].espelhado ? ' espelhado' : ''}`);
  }
  for (const visto of ['andar-a com papel', 'andar-b com papel', 'andar-a espelhado', 'andar-b espelhado', 'parado']) assert.ok(vistos.has(visto), visto);
  const naFrente = pintar(quadro(entrega, AGORA + 1990));
  assert.ok(camisa(naFrente) > mesa(naFrente));
  assert.deepEqual([parada, naFrente].map((f) => f.filter((c) => c.cor === CORES.junta && c.args[2] === 8).length), [0, 1], 'a shadow on the floor only under who stands');
  const festa = transicao(entrega, ler(estado({ status: 'completed', agentes: ['done', 'done', 'done'] })), AGORA + 5000);
  const bracos = [5000, 5300].map((ms) => pintar(quadro(festa, AGORA + ms)).filter((c) => c.cor === CORES.tinta && c.args[0] === MESAS[0].boneco.x).length);
  assert.deepEqual(bracos, [1, 0], 'who celebrates raises both arms, then lowers them');
  pintar(quadro(ler(estado({ agentes: Array(14).fill('working') })), AGORA));
});

test('E1-06 (rule 16): the loop paints at a whole-number scale, without smoothing, and only when the frame changes', () => {
  const pedidos = [];
  const janela = { requestAnimationFrame: (fn) => pedidos.push(fn) };
  const tela = Object.assign(elemento('tela'), { width: LARGURA * 3, height: ALTURA * 3 });
  let [bonecos, pintados] = [null, 0];
  animar(janela, tela, () => bonecos, () => { pintados += 1; });
  const rodar = () => { assert.equal(pedidos.length, 1, 'one frame asked at a time'); pedidos.shift()(0); return pintados; };
  assert.equal(rodar(), 0, 'nothing to paint before the first reading');
  bonecos = quadro(ler(estado({ agentes: ['working'] })), AGORA);
  assert.deepEqual([rodar(), rodar()], [1, 1], 'the same frame is not painted twice');
  const { chamadas, ctx } = tela.pintura;
  assert.deepEqual(chamadas[0], { nome: 'setTransform', args: [3, 0, 0, 3, 0, 0], cor: undefined, alfa: 1 });
  assert.deepEqual([[...new Set(chamadas.map((c) => c.nome))], ctx.imageSmoothingEnabled], [['setTransform', 'fillRect'], false]);
  tela.width = LARGURA * 2;
  assert.equal(rodar(), 2, 'a new canvas size paints again');
  bonecos = quadro(ler(estado({ agentes: ['working'] })), AGORA + 300);
  assert.equal(rodar(), 3, 'so does a new pose');
  bonecos = { map() { throw new Error('quadro quebrado'); } };
  assert.throws(() => pedidos.shift()(0), /quadro quebrado/);
  assert.equal(pedidos.length, 1, 'a broken frame does not stop the loop');
});

test('E1-06 (rule 19): name and balloon are text over the canvas, placed in percent of 320×180, one column wide', () => {
  assert.match(HTML, /<div class="rotulos" id="rotulos" aria-hidden="true">/);
  assert.match(HTML, /\.rotulos span \{[^}]*text-overflow: ellipsis/);
  assert.match(HTML, /image-rendering: pixelated/);
  const doc = documento();
  const camada = doc.getElementById('rotulos');
  const rotulos = criarRotulos(camada, doc);
  const modelo = ler(estado({ agentes: Array(14).fill('working'), step: { current: 2, total: 5, label: '<i>Escrever</i>' } }));
  rotulos.atualizar(modelo.agentes);
  const [nomes, baloes] = ['nome', 'balao'].map((classe) => camada.children.filter((el) => el.className.split(' ').includes(classe)));
  assert.deepEqual([nomes.length, baloes.length, camada.children.length], [12, 12, 24], 'only who has a desk');
  const logico = (porcento, total) => Math.round((parseFloat(porcento) * total) / 100 * 1000) / 1000;
  MESAS.forEach((m, i) => {
    assert.deepEqual([textoDe(nomes[i]), textoDe(baloes[i])], [`Agente ${i + 1}`, '<i>Escrever</i>']);
    assert.deepEqual([logico(nomes[i].style.left, LARGURA), logico(nomes[i].style.top, ALTURA), nomes[i].style.width], [m.nome.x - LARGURA_COLUNA / 2, m.nome.y, '25%']);
    assert.deepEqual([logico(baloes[i].style.left, LARGURA), ALTURA - logico(baloes[i].style.bottom, ALTURA), baloes[i].style.width], [m.balao.x - LARGURA_COLUNA / 2, m.balao.y, '25%']);
  });
  // The name of the desk a delivery stops at gives way while the figure stands on it.
  const antes = transicao(null, ler(estado({ agentes: ['working'] })), AGORA);
  const entrega = transicao(antes, ler(estado({ agentes: ['done', 'idle', 'working'], handoff: passagem('a1', 'a3') })), AGORA);
  rotulos.atualizar(entrega.agentes);
  const apagados = (ms) => { rotulos.acompanhar(quadro(entrega, AGORA + ms)); return camada.children.filter((el) => el.style.opacity).map(textoDe); };
  assert.deepEqual([apagados(0), apagados(1990), apagados(4100)], [[], ['Agente 3'], []]);
});

test('E1-06 (rules 20, 22, 23): the page asks /estado every second, goes on without a server and hides the opening sentence only after the first drawing', async () => {
  const [alfa, beta] = [estado({ crew: 'alfa' }), estado({ crew: 'beta', updatedAt: haMin(5) })];
  function abrir(busca, respostas) {
    const [doc, pedidos, quadros, intervalos] = [documento(), [], [], []];
    const fetch = async (endereco) => { pedidos.push(endereco); const r = respostas.shift(); if (!r) throw new TypeError('fora do ar'); return { ok: true, json: async () => r }; };
    iniciar({ document: doc, location: { search: busca }, devicePixelRatio: 1, matchMedia: () => ({ matches: false }), fetch, setInterval: (fn, ms) => intervalos.push([fn, ms]), setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: (fn) => quadros.push(fn), addEventListener() {} });
    return { doc, t: naTela(doc), pedidos, quadros, intervalos, consultar: () => intervalos[0][0]() };
  }
  const { doc, t, pedidos, quadros, intervalos, consultar: denovo } = abrir('', [null, resposta(alfa, beta), resposta(alfa, beta)]);
  assert.deepEqual([t('abertura'), t('pagina')], [ABRINDO, null], 'before the first answer only the static sentence shows');
  await new Promise((ok) => setImmediate(ok));
  assert.deepEqual([t('aviso'), t('frase'), t('abertura'), t('pagina')], [SEM_SERVIDOR, DEMONSTRACAO, ABRINDO, ''], 'no server: the page shows, with the demo, the warning and still the sentence');
  quadros.shift()(0);
  assert.deepEqual([t('abertura'), doc.getElementById('tela').width, doc.getElementById('sala').style.width], [null, LARGURA * 3, '960px']);
  assert.deepEqual(intervalos.map(([, ms]) => ms), [1000]);
  await denovo();
  assert.deepEqual([t('aviso'), t('frase'), t('crew'), doc.getElementById('seletor').children.map((o) => o.value)], [null, null, 'alfa', ['alfa', 'beta']]);
  Object.assign(doc.getElementById('seletor'), { value: 'beta' }).ouvintes.change();
  assert.equal(t('crew'), 'beta');
  await denovo();
  assert.equal(t('crew'), 'beta', 'the choice of the user holds while the other crew is updated');
  await denovo();
  assert.deepEqual([t('aviso'), t('crew')], [SEM_SERVIDOR, 'beta'], 'server gone: the last good state stays, with the warning');
  doc.ouvintes.visibilitychange();
  assert.deepEqual([pedidos.length, [...new Set(pedidos)]], [5, ['estado']], 'back to the tab: asks at once, always the same address');

  const forcada = abrir('?demo', [resposta(alfa)]);
  await new Promise((ok) => setImmediate(ok));
  assert.deepEqual([forcada.t('frase'), forcada.t('etiqueta'), forcada.t('seletor-caixa')], [DEMO_FORCADA, 'Demonstração', null]);
});
