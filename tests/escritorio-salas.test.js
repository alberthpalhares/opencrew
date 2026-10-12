// specs/fase-e3-conversa-e-entrega.md — E3-06a, E3-08 (a to f) and E3-09 (a to c): the room of the
// office is as big as the cast (rules 9 and 13 to 19). Four rooms, each with its own logical screen,
// desks, gaps, route and furniture; the period of the day comes from the hour the page passes in.
// Everything here is the pure model plus the scene on a fake 2D context: no browser, no clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALTURA_LINHA, BONECO, LARGURA_AO_LADO, LARGURA_COLUNA, MEMORIA_INICIAL, SALAS, SEM_ANIMACAO, TOPO,
  consultar, disposicao, escala, escolher, montarAmbiente, montarModelo, montarPagina, moveisDe, periodoDe, ponteiros,
  quadro, rota, salaDe, transicao,
} from '../templates/_opencrew/core/escritorio/modelo.js';
import { CORES, noite } from '../templates/_opencrew/core/escritorio/sprites.js';
import { desenhoDe } from '../templates/_opencrew/core/escritorio/cena-sala.js';
import { pintarCena } from '../templates/_opencrew/core/escritorio/cena.js';
import { criarRotulos } from '../templates/_opencrew/core/escritorio/rotulos.js';

const HTML = readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio/index.html'), 'utf8').replace(/\r\n/g, '\n');
const AGORA = Date.parse('2026-10-05T12:00:00.000Z');
const TELAS = { pequena: [240, 126], media: [320, 126], grande: [320, 180], completa: [400, 180] };
const NOMES = Array.from({ length: 30 }, (_, i) => `crew-${i + 1}-${'abcdefghij'[i % 10]}`);
const elenco = (n, status = 'idle') => Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Agente ${i + 1}`, icon: '🙂', status, label: '' }));
const estado = (n, extra = {}) => ({ crew: 'minha-crew', status: 'running', step: { current: 2, total: 5, label: 'Escrever' }, agents: elenco(n), handoff: null, updatedAt: new Date(AGORA).toISOString(), ...extra });
const ver = (bruto, opcoes) => montarModelo(bruto, { agoraMs: AGORA, ...opcoes });

const caixa = (p) => ({ ...p, largura: BONECO, altura: BONECO });
const cruzam = (a, b) => a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;
const dentro = (sala) => (r) => [r.x, r.y, r.largura, r.altura].every(Number.isInteger) && r.x >= 0 && r.y >= 0 && r.x + r.largura <= sala.largura && r.y + r.altura <= sala.altura;
const pecas = (m) => [m.retangulo, caixa(m.boneco), caixa(m.frente)];
const trechos = (pontos) => pontos.slice(1).map((fim, i) => [pontos[i], fim]);
const varrido = ([a, b]) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), largura: Math.abs(a.x - b.x) + BONECO, altura: Math.abs(a.y - b.y) + BONECO });
/** The cell of the grid a desk stands in. */
const celula = (m) => ({ x: m.coluna * LARGURA_COLUNA, y: m.linha === 0 ? 0 : TOPO + m.linha * ALTURA_LINHA, largura: LARGURA_COLUNA, altura: ALTURA_LINHA + (m.linha === 0 ? TOPO : 0) });
const NA_PAREDE = ['janela', 'relogio', 'quadro', 'quadro-branco'];

/** A fake 2D context that keeps every rectangle with its colour and alpha. */
function pintar(bonecos, ambiente) {
  const chamadas = [];
  const ctx = { globalAlpha: 1, fillStyle: '', fillRect(...args) { chamadas.push({ args, cor: this.fillStyle, alfa: this.globalAlpha }); } };
  pintarCena(ctx, bonecos, ambiente);
  assert.ok(chamadas.every(({ args: [x, y, l, a], cor }) => /^#[0-9a-f]{6}$/.test(cor) && dentro(ambiente.sala)({ x, y, largura: l, altura: a })), 'whole rectangles of #rrggbb, inside the room');
  assert.equal(ctx.globalAlpha, 1);
  return chamadas;
}
const naArea = (r) => ({ args: [x, y, l, a] }) => x >= r.x && y >= r.y && x + l <= r.x + r.largura && y + a <= r.y + r.altura;

test('E3-08a: casts of 1, 3, 4, 6, 7, 9, 10, 12 and 14 get the small, medium, large and full rooms, each with its logical screen; every desk whole inside the room, none overlapping', () => {
  const casos = [[1, 'pequena'], [3, 'pequena'], [4, 'media'], [6, 'media'], [7, 'grande'], [9, 'grande'], [10, 'completa'], [12, 'completa'], [14, 'completa']];
  for (const [n, nome] of casos) {
    const m = ver(estado(n));
    const { sala } = m.ambiente;
    assert.deepEqual([sala.nome, sala.largura, sala.altura], [nome, ...TELAS[nome]], `${n} agents`);
    assert.equal(sala, salaDe(n));
    assert.deepEqual([sala.largura, sala.altura], [sala.colunas * LARGURA_COLUNA, TOPO + sala.linhas * ALTURA_LINHA], 'the cell is still 80×54');
    const mesas = m.agentes.map((a) => a.mesa);
    assert.deepEqual(mesas.map((mesa) => mesa !== null), Array.from({ length: n }, (_, i) => i < 12), `${n}: a desk for the first 12`);
    mesas.filter(Boolean).forEach((mesa, i, todas) => {
      assert.deepEqual([mesa.indice, mesa.coluna, mesa.linha], [i, i % sala.colunasDeMesa, Math.floor(i / sala.colunasDeMesa)], `${nome}: the order of the cast, left to right, top to bottom`);
      assert.ok(pecas(mesa).every(dentro(sala)), `${nome}: desk ${i + 1} inside the room`);
      for (const outra of todas.slice(i + 1)) assert.ok(!pecas(mesa).some((a) => pecas(outra).some((b) => cruzam(a, b))), `${nome}: desk ${i + 1} overlaps desk ${outra.indice + 1}`);
    });
  }
  assert.deepEqual(Object.values(SALAS).map((s) => [s.nome, s.mesas.length]), [['pequena', 3], ['media', 6], ['grande', 9], ['completa', 12]]);
  assert.deepEqual([salaDe(0).nome, salaDe(-1).nome, salaDe(undefined).nome, ver(null).ambiente.sala.nome], Array(4).fill('pequena'), 'no cast: the small room, never an error');
});

test('E3-08b: in every full room, for every pair of desks, the route stays inside the room and crosses no desk top and no piece of furniture; the stop in front of who receives is free', () => {
  for (const sala of Object.values(SALAS)) {
    for (const crew of NOMES.slice(0, 12)) {
      const solidos = moveisDe(sala, crew).filter((movel) => movel.camada !== 'tapete');
      for (const de of sala.mesas) {
        for (const para of sala.mesas) {
          const par = `${sala.nome} (${crew}) ${de.indice + 1} → ${para.indice + 1}`;
          const pontos = rota(sala, de.indice, para.indice);
          assert.deepEqual([pontos[0], pontos.at(-1)], [de.boneco, para.frente], par);
          for (const trecho of trechos(pontos)) {
            const [a, b] = trecho;
            assert.ok((a.x === b.x) !== (a.y === b.y), `${par}: one direction at a time`);
            assert.ok(dentro(sala)(varrido(trecho)), `${par}: inside the room`);
            assert.ok(sala.mesas.every((m) => !cruzam(m.retangulo, varrido(trecho))), `${par}: across no desk`);
            assert.ok(sala.mesas.every((m) => m === de || !cruzam(caixa(m.boneco), varrido(trecho))), `${par}: across no seated colleague`);
            for (const movel of solidos) assert.ok(!cruzam(movel, varrido(trecho)), `${par}: across the ${movel.tipo}`);
          }
        }
        const parada = caixa(de.frente);
        assert.ok([...solidos, ...sala.mesas.map((m) => m.retangulo)].every((r) => !cruzam(r, parada)), `${sala.nome}: the stop in front of desk ${de.indice + 1} is free`);
      }
    }
    assert.deepEqual([rota(sala, 0, sala.mesas.length), rota(sala, -1, 0), rota(sala, 0, 'x'), rota(null, 0, 0)], Array(4).fill(null), 'no desk, no route');
  }
});

test('E3-08c: no floor furniture in a cell with a desk; what hangs on the wall covers neither window nor clock; every piece whole inside the room; every matrix uses only its palette', () => {
  const tipos = new Set();
  for (const sala of Object.values(SALAS)) {
    for (const crew of NOMES) {
      const moveis = moveisDe(sala, crew);
      for (const movel of moveis) {
        const onde = `${sala.nome} (${crew}): ${movel.tipo}`;
        tipos.add(movel.tipo);
        assert.ok(dentro(sala)(movel) && movel.largura > 0 && movel.altura > 0, `${onde} whole inside the room`);
        assert.ok(['parede', 'tapete', 'chao'].includes(movel.camada), onde);
        if (movel.camada !== 'parede') assert.ok(sala.mesas.every((m) => !cruzam(celula(m), movel)), `${onde} in a cell with a desk`);
        else assert.ok(movel.y + movel.altura <= sala.mesas[0].boneco.y, `${onde} ends above the first walking line`);
        for (const periodo of ['dia', 'noite']) {
          const { paleta, linhas } = desenhoDe(movel, periodo);
          assert.deepEqual([linhas[0].length, linhas.length], [movel.largura, movel.altura], `${onde} (${periodo}): the drawing has the size the model says`);
          assert.ok(linhas.every((l) => l.length === movel.largura && [...l].every((letra) => Object.hasOwn(paleta, letra))), `${onde}: letters of its palette`);
          assert.ok(Object.values(paleta).every((cor) => cor === null || Object.values(CORES).includes(cor)), `${onde}: colours of the scene`);
        }
      }
      const fixos = moveis.filter((m) => NA_PAREDE.includes(m.tipo) || m.camada === 'parede');
      fixos.forEach((a, i) => fixos.slice(i + 1).forEach((b) => assert.ok(!cruzam(a, b), `${sala.nome} (${crew}): ${a.tipo} over ${b.tipo}`)));
      assert.ok(moveis.some((m) => m.tipo === 'janela') && moveis.filter((m) => m.tipo === 'relogio').length === 1, `${sala.nome}: windows and one clock`);
    }
  }
  for (const tipo of ['tapete', 'estante', 'abajur', 'sofa', 'poltrona', 'mesa-baixa', 'bebedouro', 'cafe', 'quadro-branco', 'quadro', 'planta', 'planta-alta']) assert.ok(tipos.has(tipo), `no room has a ${tipo}`);
  const padroes = new Set(Object.values(SALAS).flatMap((sala) => NOMES.flatMap((crew) => moveisDe(sala, crew).filter((m) => m.tipo === 'tapete').map((m) => m.padrao))));
  assert.equal(padroes.size, 2, 'two rug patterns');
  // What §2B lists for each room is there, whatever the name of the crew.
  const tem = (sala, crew) => moveisDe(SALAS[sala], crew).map((m) => m.tipo);
  for (const crew of NOMES) {
    for (const tipo of ['tapete', 'estante', 'abajur', 'planta']) assert.ok(tem('pequena', crew).includes(tipo), `pequena: ${tipo}`);
    assert.ok(tem('pequena', crew).some((t) => t === 'sofa' || t === 'poltrona'));
    for (const tipo of ['tapete', 'estante', 'abajur', 'planta', 'bebedouro']) assert.ok(tem('media', crew).includes(tipo), `media: ${tipo}`);
    for (const tipo of ['tapete', 'mesa-baixa', 'quadro-branco', 'bebedouro', 'planta']) assert.ok(tem('grande', crew).includes(tipo), `grande: ${tipo}`);
    assert.equal(tem('grande', crew).filter((t) => t === 'estante').length, 2);
    for (const tipo of ['sofa', 'tapete', 'estante', 'cafe', 'abajur']) assert.ok(tem('completa', crew).includes(tipo), `completa: ${tipo}`);
    assert.ok(moveisDe(SALAS.completa, crew).filter((m) => m.camada !== 'parede').every((m) => m.x >= 4 * LARGURA_COLUNA), 'completa: the fifth column is the common area');
  }
});

test('E3-08d: the same crew name and cast give the same furniture in the same places; 30 names give more than one arrangement in each room', () => {
  for (const sala of Object.values(SALAS)) {
    for (const crew of NOMES) assert.deepEqual(moveisDe(sala, crew), moveisDe(sala, crew));
    assert.ok(new Set(NOMES.map((crew) => JSON.stringify(moveisDe(sala, crew)))).size > 1, `${sala.nome}: always the same arrangement`);
  }
  const [a, b] = [ver(estado(5, { crew: 'alfa' })), ver(estado(5, { crew: 'alfa', status: 'completed' }))];
  assert.deepEqual(a.ambiente.moveis, b.ambiente.moveis, 'another reading of the same crew: the same room');
  assert.deepEqual(ver(estado(5), { crew: 'nome-da-lista' }).ambiente.moveis, moveisDe(SALAS.media, 'nome-da-lista'), 'the name the server lists the crew by is the seed');
  assert.deepEqual(montarAmbiente({ total: 5, crew: 'alfa' }).moveis, a.ambiente.moveis);
});

test('E3-08e: the small room in an area of 1000×600 is drawn at scale 4, the full one at 2; names and balloons sit over the right desks in the four rooms', () => {
  assert.deepEqual([escala(1000, 600, 1, SALAS.pequena), escala(1000, 600, 1, SALAS.completa)], [{ n: 4, largura: 960, altura: 504 }, { n: 2, largura: 800, altura: 360 }]);
  assert.deepEqual([escala(1000, 600, 1, SALAS.media).n, escala(1000, 600, 1, SALAS.grande).n, escala(1000, 600, 1.5, SALAS.pequena).n], [3, 3, 6]);
  const elemento = () => ({ className: '', textContent: '', children: [], style: {}, append(...n) { this.children.push(...n); }, replaceChildren(...n) { this.children = n; }, remove() {} });
  const logico = (porcento, total) => Math.round((parseFloat(porcento) * total) / 100 * 1000) / 1000;
  for (const n of [3, 6, 9, 12]) {
    const camada = elemento();
    const modelo = ver({ ...estado(n), agents: elenco(n, 'working') });
    const { sala } = modelo.ambiente;
    criarRotulos(camada, { createElement: elemento }).atualizar(modelo.agentes, sala);
    const [nomes, baloes] = ['nome', 'balao'].map((classe) => camada.children.filter((el) => el.className.split(' ').includes(classe)));
    assert.deepEqual([nomes.length, baloes.length], [n, n], sala.nome);
    sala.mesas.slice(0, n).forEach((m, i) => {
      const largura = `${(LARGURA_COLUNA / sala.largura) * 100}%`;
      assert.deepEqual([logico(nomes[i].style.left, sala.largura), logico(nomes[i].style.top, sala.altura), nomes[i].style.width], [m.nome.x - LARGURA_COLUNA / 2, m.nome.y, largura], `${sala.nome}: name ${i + 1}`);
      assert.deepEqual([logico(baloes[i].style.left, sala.largura), sala.altura - logico(baloes[i].style.bottom, sala.altura), baloes[i].style.width], [m.balao.x - LARGURA_COLUNA / 2, m.balao.y, largura], `${sala.nome}: balloon ${i + 1}`);
    });
  }
});

test('E3-08f: switching in the selector from a crew of 3 to a crew of 8 changes the room, with no delivery, no speech and no error', () => {
  const passagem = { from: 'a1', to: 'a2', message: 'Pauta pronta.', completedAt: new Date(AGORA).toISOString() };
  const resposta = { projeto: 'abc123abc123', crews: [{ crew: 'tres', estado: estado(3, { crew: 'tres' }) }, { crew: 'oito', estado: { ...estado(8, { crew: 'oito', handoff: passagem, updatedAt: new Date(AGORA - 60000).toISOString() }), agents: elenco(8, 'working') } }] };
  const memoria = consultar(MEMORIA_INICIAL, resposta);
  const ler = (m, anterior, ms) => transicao(anterior, montarPagina(m, { agoraMs: AGORA + ms }), AGORA + ms);
  const tres = ler(memoria, ler(memoria, null, 0), 1000);
  const oito = ler(escolher(memoria, 'oito'), tres, 2000);
  assert.deepEqual([tres.crew, tres.ambiente.sala.nome, oito.crew, oito.ambiente.sala.nome], ['tres', 'pequena', 'oito', 'grande']);
  assert.deepEqual([oito.animacao, oito.falas], [SEM_ANIMACAO, []]);
  for (const ms of [2000, 3500, 6000, 12000]) {
    const bonecos = quadro(oito, AGORA + ms);
    assert.ok(bonecos.length === 8 && bonecos.every((b) => b.sentado && b.fala === null && b.acao === 'working'), `${ms} ms`);
    pintar(bonecos, oito.ambiente);
  }
  assert.deepEqual(ler(memoria, oito, 3000).ambiente.sala.nome, 'pequena', 'and back');
});

test('E3-09a: 5h59, 6h, 9h59, 10h, 16h59, 17h, 18h59 and 19h are night, morning, morning, day, day, dusk, dusk and night; ?periodo= forces one, and an unknown value leaves the hour', () => {
  const horas = [[5, 59], [6, 0], [9, 59], [10, 0], [16, 59], [17, 0], [18, 59], [19, 0], [0, 0], [23, 59]];
  assert.deepEqual(horas.map(([h, min]) => periodoDe({ horas: h, minutos: min })), ['noite', 'manha', 'manha', 'dia', 'dia', 'entardecer', 'entardecer', 'noite', 'noite', 'noite']);
  const meioDia = { horas: 12, minutos: 0 };
  assert.deepEqual(['noite', 'manha', 'entardecer', 'dia', 'NOITE', ' Manhã '].map((forcado) => periodoDe(meioDia, forcado)), ['noite', 'manha', 'entardecer', 'dia', 'noite', 'manha']);
  assert.deepEqual(['madrugada', '', null, undefined, 7, {}].map((forcado) => periodoDe(meioDia, forcado)), Array(6).fill('dia'), 'unknown value: the hour decides');
  assert.deepEqual([periodoDe(null), periodoDe(undefined), periodoDe({ horas: 'x' }), periodoDe({})], Array(4).fill('dia'), 'no hour: day, never an error');
  assert.deepEqual([ver(estado(3), { hora: { horas: 21, minutos: 5 } }).ambiente.periodo, ver(estado(3), { hora: meioDia, periodo: 'noite' }).ambiente.periodo, ver(estado(3)).ambiente.periodo], ['noite', 'noite', 'dia']);
});

test('E3-09b: at night the windows show the night sky with a moon, the lamp is lit and floor and wall are painted darker; a lit monitor keeps its colour; by day nothing is darkened and the lamp is off', () => {
  const modelo = (periodo) => ver({ ...estado(3), agents: elenco(3, 'working') }, { periodo });
  const [dia, noiteM] = [modelo('dia'), modelo('noite')];
  const [deDia, deNoite] = [dia, noiteM].map((m) => pintar(quadro(m, AGORA), m.ambiente));
  const cores = (chamadas) => new Set(chamadas.map((c) => c.cor));
  const escuro = (cor) => noite(cor);
  for (const cor of [CORES.pisoClaro, CORES.pisoEscuro, CORES.parede]) {
    const soma = (hex) => [1, 3, 5].reduce((s, i) => s + parseInt(hex.slice(i, i + 2), 16), 0);
    assert.ok(soma(escuro(cor)) < soma(cor) && /^#[0-9a-f]{6}$/.test(escuro(cor)), `${cor} gets darker`);
    assert.ok(cores(deDia).has(cor) && !cores(deDia).has(escuro(cor)), `by day ${cor} is painted as it is`);
    assert.ok(cores(deNoite).has(escuro(cor)) && !cores(deNoite).has(cor), `at night ${cor} is painted darker`);
  }
  assert.equal(noite(CORES.parede), noite(CORES.parede), 'the same colour darkens the same way');
  // The screen of a lit monitor: the same rectangles in the same colours, day and night.
  const telas = dia.ambiente.sala.mesas.map((m) => ({ x: m.retangulo.x + 3, y: m.retangulo.y - 11, largura: 8, altura: 5 }));
  const tela = (chamadas) => chamadas.filter((c) => telas.some((area) => naArea(area)(c)) && (c.cor === CORES.verde || c.cor === CORES.telaAcesa)).map((c) => JSON.stringify([c.args, c.cor])).sort();
  assert.ok(tela(deDia).length >= 6, 'three lit monitors');
  assert.deepEqual(tela(deNoite), tela(deDia));
  const janela = noiteM.ambiente.moveis.find((m) => m.tipo === 'janela');
  const abajur = noiteM.ambiente.moveis.find((m) => m.tipo === 'abajur');
  const noCeu = (chamadas) => cores(chamadas.filter(naArea(janela)));
  assert.ok(noCeu(deNoite).has(CORES.telaApagada) && noCeu(deNoite).has(CORES.branco) && !noCeu(deNoite).has(CORES.ceu), 'night sky, with a moon');
  assert.ok(noCeu(deDia).has(CORES.ceu) && !noCeu(deDia).has(CORES.telaApagada), 'day sky');
  assert.ok(new Set(['manha', 'dia', 'entardecer', 'noite'].map((p) => JSON.stringify(desenhoDe(janela, p)))).size === 4, 'a sky for each period');
  const naLuz = (chamadas) => chamadas.filter(naArea(abajur)).some((c) => c.cor === CORES.luz && c.alfa === 1);
  assert.deepEqual([naLuz(deNoite), naLuz(deDia)], [true, false], 'the lamp is lit only at night');
  assert.deepEqual([deNoite.some((c) => c.alfa < 1 && c.cor === CORES.luz), deDia.some((c) => c.alfa < 1)], [true, false], 'a halo of light around it, only at night');
  for (const p of ['manha', 'entardecer']) assert.ok(!pintar(quadro(modelo(p), AGORA), modelo(p).ambiente).some((c) => c.alfa < 1 || c.cor === escuro(CORES.parede)), `${p}: nothing darkened`);
});

test('E3-09c: a reading at 18h59 and another at 19h change the period, with no delivery and no speech; the wall clock at 15h20 points to 3 and 4', () => {
  const ler = (anterior, hora, ms) => transicao(anterior, ver({ ...estado(3), agents: elenco(3, 'working') }, { hora }), AGORA + ms);
  const antes = ler(null, { horas: 18, minutos: 59 }, 0);
  const depois = ler(antes, { horas: 19, minutos: 0 }, 1000);
  assert.deepEqual([antes.ambiente.periodo, depois.ambiente.periodo], ['entardecer', 'noite']);
  assert.deepEqual([depois.animacao, depois.falas], [SEM_ANIMACAO, []]);
  assert.ok(quadro(depois, AGORA + 1500).every((b) => b.sentado && b.fala === null));
  assert.notEqual(antes.ambiente.chave, depois.ambiente.chave, 'the scene knows it has to paint again');
  assert.deepEqual([ponteiros({ horas: 15, minutos: 20 }), ponteiros({ horas: 0, minutos: 4 }), ponteiros({ horas: 23, minutos: 59 }), ponteiros(null)], [{ horas: 3, minutos: 4 }, { horas: 0, minutos: 0 }, { horas: 11, minutos: 11 }, { horas: 3, minutos: 0 }]);
  assert.deepEqual(ver(estado(3), { hora: { horas: 15, minutos: 20 } }).ambiente.relogio, { horas: 3, minutos: 4 });
  assert.notEqual(ver(estado(3), { hora: { horas: 15, minutos: 20 } }).ambiente.chave, ver(estado(3), { hora: { horas: 15, minutos: 25 } }).ambiente.chave);
  assert.equal(ver(estado(3), { hora: { horas: 15, minutos: 20 } }).ambiente.chave, ver(estado(3), { hora: { horas: 15, minutos: 24 } }).ambiente.chave, 'the hands move in steps of 5 minutes');
});

test('E3-06a: with 1000 px of useful width the panel goes below the drawing and the scale is 3; with 1400 px it stays beside it', () => {
  assert.equal(LARGURA_AO_LADO, 1100);
  const estreita = disposicao(1000);
  assert.equal(estreita.painel, 'abaixo');
  assert.equal(escala(estreita.desenho, Infinity, 1, SALAS.grande).n, 3);
  assert.equal(escala(disposicao(1024).desenho, Infinity, 1, SALAS.grande).n, 3, 'a window of 1024 px: scale 3');
  assert.deepEqual([disposicao(1400).painel, disposicao(1100).painel, disposicao(1099).painel], ['ao-lado', 'ao-lado', 'abaixo']);
  // The stylesheet does what the model says: the same threshold, and the margins the count assumes.
  const regra = HTML.match(new RegExp(`@media \\(max-width: ${LARGURA_AO_LADO - 1}px\\) \\{\\n([\\s\\S]*?)\\n  \\}`));
  assert.ok(regra, 'the page stacks the panel below this width');
  const [, pagina] = regra[1].match(/\.pagina \{[^}]*padding: (\d+)px;/);
  const [, moldura] = regra[1].match(/\.moldura \{[^}]*padding: (\d+)px;/);
  assert.equal(estreita.desenho, 1000 - 2 * Number(pagina) - 2 * Number(moldura));
  assert.match(regra[1], /\.area \{[^}]*aspect-ratio: var\(--proporcao/);
});
