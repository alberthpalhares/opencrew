// specs/fase-e2-personagens-do-escritorio.md — E2-01 to E2-03, E2-04b and E2-06a: the two moulds,
// the five haircuts of each, the palettes of skin, hair and eyes, where each choice comes from and
// the demo cast. Pure modules of the page, imported straight into Node; the drawing itself is
// checked by eye on the sheet (`?folha=1`, tests/escritorio-folha.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BONECO, CABELOS, CAMISAS, CORTES_POR_MOLDE, DIFERENCA_MINIMA, MOLDES, OLHOS, PELES, POSES,
  aparencia, corDistinta, diferenca, estadoDaDemo, moldeDe, montarModelo, normalizar, quadro,
} from '../templates/_opencrew/core/escritorio/modelo.js';
import { TINTAS } from '../templates/_opencrew/core/escritorio/sprites.js';
import { CORTES, NOMES_DOS_CORTES } from '../templates/_opencrew/core/escritorio/sprites-rosto.js';
import { coresDoBoneco, linhasDoBoneco } from '../templates/_opencrew/core/escritorio/sprites-boneco.js';
import { pintarCena } from '../templates/_opencrew/core/escritorio/cena.js';

const AGORA = Date.parse('2026-10-12T12:00:00.000Z');
const INDICES = Array.from({ length: CORTES_POR_MOLDE }, (_, i) => i);
const PERSONAGENS = MOLDES.flatMap((molde) => INDICES.map((corte) => ({ molde, corte })));
const nome = ({ molde, corte }) => `${molde}/${NOMES_DOS_CORTES[molde][corte]}`;
const LIGADO = [false, true];
/** How many pixels differ between two drawings of the same size. */
const diferentes = (a, b) => a.join('').split('').filter((letra, i) => letra !== b.join('')[i]).length;
const contar = (linhas, letra) => linhas.join('').split(letra).length - 1;
const rgb = (cor) => [1, 3, 5].map((i) => parseInt(cor.slice(i, i + 2), 16));
/** Relative luminance (sRGB), 0 to 1. */
function luminancia(cor) {
  const [r, g, b] = rgb(cor).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('E2-01a: two moulds, five cuts each — every drawing is 16 lines of 16 letters of the palette, in every pose, with paper, party and mirrored', () => {
  assert.deepEqual([[...MOLDES], Object.keys(CORTES).sort(), CORTES_POR_MOLDE], [['feminino', 'masculino'], ['feminino', 'masculino'], 5]);
  for (const molde of MOLDES) {
    assert.deepEqual([CORTES[molde].length, NOMES_DOS_CORTES[molde].length, new Set(NOMES_DOS_CORTES[molde]).size], [5, 5, 5], molde);
  }
  const letras = new Set(['.', ...Object.keys(TINTAS)]);
  let vistos = 0;
  for (const p of PERSONAGENS) for (const pose of POSES) for (const papel of LIGADO) for (const festa of LIGADO) for (const espelhado of LIGADO) {
    const linhas = linhasDoBoneco(pose, { ...p, papel, festa, espelhado });
    const caso = `${nome(p)} ${pose} ${JSON.stringify({ papel, festa, espelhado })}`;
    assert.ok(linhas.length === BONECO && linhas.every((l) => l.length === BONECO && [...l].every((c) => letras.has(c))), `${caso}\n${linhas.join('\n')}`);
    assert.equal(linhasDoBoneco(pose, { ...p, papel, festa, espelhado }), linhas, 'the same pose gives the same list (the scene caches by it)');
    if (espelhado) assert.deepEqual(linhas, linhasDoBoneco(pose, { ...p, papel, festa }).map((l) => [...l].reverse().join('')), caso);
    vistos += 1;
  }
  assert.equal(vistos, 2 * 5 * POSES.length * 8);
  // Rule 2: the cut lives in the middle columns — the raised arms and the paper never need its place.
  for (const p of PERSONAGENS) for (const linha of CORTES[p.molde][p.corte].linhas) {
    assert.match(linha, /^\.\.[.o].{10}[.o]\.\.$/, `${nome(p)}: ${linha}`);
  }
  // An unknown mould, cut or pose never breaks the drawing.
  assert.deepEqual(linhasDoBoneco('parado', { molde: 'outro', corte: 99 }), linhasDoBoneco('parado'));
  assert.deepEqual(linhasDoBoneco('nao-existe', { molde: 'feminino', corte: 1 }), linhasDoBoneco('parado', { molde: 'feminino', corte: 1 }));
});

test('E2-01b: two cuts of the same mould are different drawings and different outlines; the feminine mould differs from the masculine one', () => {
  const parado = (p) => linhasDoBoneco('parado', p);
  const contorno = (p) => parado(p).map((l) => l.replace(/[^.]/g, '#'));
  for (const molde of MOLDES) for (const a of INDICES) for (const b of INDICES.filter((i) => i > a)) {
    const [x, y] = [{ molde, corte: a }, { molde, corte: b }];
    assert.ok(diferentes(parado(x), parado(y)) >= 10, `${nome(x)} × ${nome(y)}: ${diferentes(parado(x), parado(y))} pixels`);
    assert.ok(diferentes(contorno(x), contorno(y)) >= 2, `${nome(x)} × ${nome(y)}: the same outline`);
  }
  for (const corte of INDICES) {
    const [f, m] = MOLDES.map((molde) => parado({ molde, corte }));
    assert.ok(diferentes(f.slice(9), m.slice(9)) >= 10, `cut ${corte}: the trunk and the clothes tell the moulds apart`);
  }
  // Every face has skin and one pixel for each eye, on the same line.
  for (const p of PERSONAGENS) {
    assert.deepEqual([contar(parado(p), 'e'), parado(p).filter((l) => l.includes('e')).length], [2, 1], nome(p));
    // Even the bald one keeps some hair, at the sides.
    assert.ok(contar(parado(p), 's') >= 20 && contar(parado(p), 'h') + contar(parado(p), 'H') >= 4, nome(p));
  }
});

test('E2-01c: with the hand up and at the party the cut is all there, and so is the arm', () => {
  for (const p of PERSONAGENS) {
    const cabelo = (linhas) => contar(linhas, 'h') + contar(linhas, 'H');
    const parado = linhasDoBoneco('parado', p);
    for (const [caso, linhas, colunas] of [
      ['mao', linhasDoBoneco('mao', p), [14]],
      ['mao espelhado', linhasDoBoneco('mao', { ...p, espelhado: true }), [1]],
      ['festa', linhasDoBoneco('mao', { ...p, festa: true }), [1, 14]],
      ['festa com papel', linhasDoBoneco('andar-a', { ...p, festa: true, papel: true }), [1]],
    ]) {
      const direito = caso.includes('espelhado') ? linhas.map((l) => [...l].reverse().join('')) : linhas;
      CORTES[p.molde][p.corte].linhas.forEach((linha, y) => [...linha].forEach((letra, x) => {
        if (letra !== '.') assert.equal(direito[y][x], letra, `${nome(p)} ${caso}: pixel ${x},${y} of the cut`);
      }));
      assert.equal(cabelo(linhas), cabelo(parado), `${nome(p)} ${caso}: hair pixels`);
      for (const x of colunas) assert.deepEqual([1, 2, 3, 5, 8].map((y) => linhas[y][x]), ['s', 's', 's', 'C', 'C'], `${nome(p)} ${caso}: the arm on column ${x}`);
    }
    const papel = linhasDoBoneco('andar-a', { ...p, papel: true });
    assert.ok(contar(papel, 'w') >= 5 && cabelo(papel) === cabelo(parado), `${nome(p)}: the paper, and the hair still there`);
    assert.deepEqual(papel.slice(13), linhasDoBoneco('andar-a', p).slice(13), 'the paper adds to the legs of who walks');
  }
});

test('E2-02a: 8 skins from light to dark, 9 hairs and 4 eyes; after the swap no pair is closer than the minimum, with at least 3 eyes and 7 hairs for each skin', () => {
  assert.deepEqual(PELES, ['#fde4d2', '#f4c9a4', '#e5ac7b', '#cf8e5a', '#b0713f', '#8b5431', '#663b23', '#432617']);
  assert.deepEqual(CABELOS, ['#15131c', '#3a2318', '#7b4a2b', '#b8452a', '#b98a45', '#efcf6a', '#8f96a3', '#f0ece2', '#3f7fe0']);
  assert.deepEqual(OLHOS, ['#2e1a10', '#a9682e', '#3f9a5c', '#3b86d8']);
  const luz = PELES.map(luminancia);
  assert.deepEqual([...luz].sort((a, b) => b - a), luz, 'from the lightest to the darkest');
  assert.ok(luz[0] >= 4 * luz.at(-1), `${luz[0]} × ${luz.at(-1)}`);
  assert.ok(Number.isFinite(DIFERENCA_MINIMA) && DIFERENCA_MINIMA > 0);
  assert.deepEqual([diferenca('#000000', '#000000'), diferenca('#ff0000', '#000000'), diferenca('#030400', '#000000')], [0, 255, 5]);
  for (const [nomeDaLista, lista, minimo] of [['olhos', OLHOS, 3], ['cabelos', CABELOS, 7]]) {
    for (const [p, pele] of PELES.entries()) {
      const finais = lista.map((_, i) => corDistinta(lista, i, pele));
      for (const cor of finais) assert.ok(lista.includes(cor) && diferenca(cor, pele) >= DIFERENCA_MINIMA, `${nomeDaLista}: ${cor} on skin ${p + 1}`);
      assert.ok(new Set(finais).size >= minimo, `${nomeDaLista}: skin ${p + 1} is left with ${new Set(finais).size}`);
      // A colour that is far enough is never swapped; one that is too close gives way to the next of the list.
      lista.forEach((cor, i) => {
        if (diferenca(cor, pele) >= DIFERENCA_MINIMA) assert.equal(finais[i], cor);
        else assert.equal(finais[i], finais[(i + 1) % lista.length], `${nomeDaLista} ${i} on skin ${p + 1}`);
      });
    }
  }
  // The four pairs the spec names (rules 3 and 4).
  assert.equal(corDistinta(OLHOS, 0, PELES[7]), OLHOS[1], 'dark-brown eyes on skin 8');
  assert.equal(corDistinta(OLHOS, 1, PELES[4]), OLHOS[2], 'light-brown eyes on skin 5');
  assert.equal(corDistinta(CABELOS, 2, PELES[5]), CABELOS[3 + 1], 'brown hair on skin 6 (the red one is too close as well)');
  assert.equal(corDistinta(CABELOS, 5, PELES[1]), CABELOS[6], 'blond hair on skin 2');
});

test('E2-03a: the same id always gives the same mould, cut, skin, hair and eyes; another desk only changes the shirt', () => {
  for (const id of ['rita-redacao', 'a1', 'x', '']) {
    const { camisa, ...corpo } = aparencia(id, 0);
    assert.deepEqual(aparencia(id, 0), { camisa, ...corpo });
    assert.deepEqual(Object.keys(corpo).sort(), ['cabelo', 'corte', 'molde', 'olhos', 'pele']);
    for (const mesa of [1, 5, 11]) assert.deepEqual(aparencia(id, mesa), { camisa: CAMISAS[mesa], ...corpo });
    assert.deepEqual(aparencia(id, 12), { camisa: null, ...corpo });
    assert.ok(MOLDES.includes(corpo.molde) && INDICES.includes(corpo.corte) && PELES.includes(corpo.pele) && CABELOS.includes(corpo.cabelo) && OLHOS.includes(corpo.olhos), id);
    assert.ok(Math.min(diferenca(corpo.cabelo, corpo.pele), diferenca(corpo.olhos, corpo.pele)) >= DIFERENCA_MINIMA, id);
    const paleta = coresDoBoneco({ camisa, ...corpo });
    assert.deepEqual([paleta.h, paleta.s, paleta.e, paleta.c], [corpo.cabelo, corpo.pele, corpo.olhos, camisa]);
    assert.deepEqual(Object.keys(paleta).sort(), ['.', ...Object.keys(TINTAS)].sort());
    assert.ok(Object.entries(paleta).every(([letra, cor]) => (letra === '.' ? cor === null : /^#[0-9a-f]{6}$/.test(cor))), JSON.stringify(paleta));
  }
});

test('E2-03b: 200 ids show every mould, cut, skin, hair and eye colour, and no two choices walk together', () => {
  const todos = Array.from({ length: 200 }, (_, i) => aparencia(`agente-${i + 1}`, 0));
  const vistos = (campo, lista = todos) => new Set(lista.map((a) => a[campo]));
  assert.deepEqual([vistos('molde').size, vistos('pele').size, vistos('cabelo').size, vistos('olhos').size], [2, 8, 9, 4]);
  assert.equal(new Set(todos.map((a) => `${a.molde}:${a.corte}`)).size, 10, 'the 5 cuts of each mould');
  const campos = ['molde', 'corte', 'pele', 'olhos', 'cabelo'];
  for (const a of campos) for (const b of campos.filter((c) => c !== a)) for (const valor of vistos(a)) {
    const juntos = vistos(b, todos.filter((x) => x[a] === valor)).size;
    assert.ok(juntos >= Math.min(3, vistos(b).size), `${a}=${valor} only shows up with ${juntos} of ${b}`);
  }
});

test('E2-03c: the personagem column decides the mould, whatever the id; empty, absent or another value leaves it to the id', () => {
  const ids = Array.from({ length: 40 }, (_, i) => `agente-${i + 1}`);
  for (const [valores, molde] of [[['feminino', 'Feminino', 'FEMININO', 'F', 'f', ' feminino ', 'Féminino'], 'feminino'], [['masculino', 'Masculino', 'M', 'm', 'másculino'], 'masculino']]) {
    for (const valor of valores) {
      assert.equal(moldeDe(valor), molde, valor);
      for (const id of ids) {
        assert.deepEqual(aparencia(id, 3, valor), { ...aparencia(id, 3), molde }, `${id} ${valor}: only the mould changes`);
      }
    }
  }
  for (const valor of ['', '   ', undefined, null, 'outro', 'fem', 'x', 42, {}, ['f'], true]) {
    assert.equal(moldeDe(valor), null, String(valor));
    for (const id of ids) assert.deepEqual(aparencia(id, 3, valor), aparencia(id, 3), `${id} ${String(valor)}`);
  }
});

/** A fake 2D context that only counts what the scene fills. */
function pintar(bonecos) {
  const cores = [];
  const ctx = { globalAlpha: 1, set fillStyle(cor) { this.cor = cor; }, fillRect() { cores.push(this.cor); } };
  pintarCena(ctx, bonecos);
  assert.ok(cores.length > 0 && cores.every((cor) => /^#[0-9a-f]{6}$/.test(cor)), 'every colour is #rrggbb');
  return cores;
}

test('E2-04b: a state.json without personagem, or with a strange value in it, is drawn without error', () => {
  const agente = (id, extra) => ({ id, name: id, icon: '', status: 'working', label: '', ...extra });
  const antigo = { crew: 'x', status: 'running', step: { current: 1, total: 2, label: '' }, agents: [agente('a'), agente('b')], handoff: null, updatedAt: new Date(AGORA).toISOString() };
  assert.deepEqual(normalizar(antigo).agents.map((a) => Object.keys(a)), Array(2).fill(['id', 'name', 'icon', 'status', 'label']), 'an old state is read as before');
  const estranhos = [42, {}, [], 'outro', '', null, true];
  const novo = { ...antigo, agents: [agente('a', { personagem: 'feminino' }), agente('b', { personagem: 'M' }), ...estranhos.map((personagem, i) => agente(`e${i}`, { personagem }))] };
  for (const estado of [antigo, novo]) {
    const modelo = montarModelo(estado, { agoraMs: AGORA });
    for (const pose of [0, 300]) assert.ok(pintar(quadro(modelo, AGORA + pose)).length > 0);
    for (const a of modelo.agentes) assert.deepEqual(a.aparencia, aparencia(a.id, a.indice, estado.agents[a.indice].personagem), a.id);
  }
  const moldes = montarModelo(novo, { agoraMs: AGORA }).agentes.map((a) => a.aparencia.molde);
  assert.deepEqual(moldes.slice(0, 2), ['feminino', 'masculino']);
  assert.deepEqual(moldes.slice(2), estranhos.map((_, i) => aparencia(`e${i}`, 0).molde), 'a strange value leaves the mould to the id');
});

test('E2-06a: the five figures of the demo have the mould of their names, and no two look the same', () => {
  const estado = estadoDaDemo(0);
  assert.deepEqual(estado.agents.map((a) => [a.name.split(' ')[0], a.personagem]), [['Pedro', 'masculino'], ['Rita', 'feminino'], ['Davi', 'masculino'], ['Renata', 'feminino'], ['Sara', 'feminino']]);
  const bonecos = montarModelo(estado, { agoraMs: AGORA, demo: true }).agentes.map((a) => a.aparencia);
  assert.deepEqual(bonecos.map((a) => a.molde), estado.agents.map((a) => a.personagem));
  const distintos = (campos) => new Set(bonecos.map((a) => campos.map((c) => a[c]).join('|'))).size;
  assert.deepEqual([distintos(['molde', 'corte']), distintos(['pele']), distintos(['camisa'])], [5, 5, 5], 'five cuts, five skins, five shirts');
  assert.ok(distintos(['cabelo']) >= 3 && distintos(['olhos']) >= 2, 'and more than one colour of hair and of eyes');
  assert.ok(pintar(quadro(montarModelo(estado, { agoraMs: AGORA, demo: true }), AGORA)).length > 0);
});
