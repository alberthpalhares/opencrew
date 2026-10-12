// specs/fase-e2-personagens-do-escritorio.md — §5, the visual check: `?folha=1` paints every cut of
// the two moulds on the 8 skins, and the poses of one voluminous cut of each, for the owner to
// approve by eye. The gate cannot see the drawing; it proves the sheet is complete, uses no network
// and no data of the user, and writes its labels as text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABELOS, DIFERENCA_MINIMA, MOLDES, OLHOS, PELES, diferenca } from '../templates/_opencrew/core/escritorio/modelo.js';
import { NOMES_DOS_CORTES } from '../templates/_opencrew/core/escritorio/sprites-rosto.js';
import { linhasDoBoneco } from '../templates/_opencrew/core/escritorio/sprites-boneco.js';
import { abrirFolha, planoDaFolha } from '../templates/_opencrew/core/escritorio/folha.js';
import { iniciar } from '../templates/_opencrew/core/escritorio/app.js';
import { ARQUIVOS } from '../templates/_opencrew/core/scripts/escritorio.mjs';

function elemento(tag) {
  const pintados = [];
  return {
    tag, textContent: '', className: '', hidden: false, width: 0, height: 0, children: [], pintados, style: {},
    append(...novos) { this.children.push(...novos); },
    setAttribute(nome, valor) { this[nome] = valor; },
    getContext: () => ({ set fillStyle(cor) { this.cor = cor; }, fillRect(...args) { pintados.push([this.cor, ...args]); } }),
  };
}
/** A fake window: it has no `fetch`, no timer and no animation frame — the sheet may not ask for them. */
function janela(search) {
  const ids = new Map(['abertura', 'pagina'].map((id) => [id, Object.assign(elemento('p'), { hidden: id === 'pagina' })]));
  const body = elemento('body');
  const documento = { title: '', body, getElementById: (id) => ids.get(id) ?? null, createElement: (tag) => elemento(tag) };
  return { document: documento, location: { search }, body, ids };
}
const todos = (el) => [el, ...el.children.flatMap(todos)];

test('E2 (sheet): the plan has every cut of the two moulds on the 8 skins, and the poses of a voluminous cut of each', () => {
  const plano = planoDaFolha();
  assert.deepEqual(plano.map((secao) => secao.linhas.length), [6, 6], 'two moulds: five cuts and one line of poses');
  const bonecos = plano.flatMap((secao) => secao.linhas.flatMap((linha) => linha.bonecos));
  for (const [i, molde] of MOLDES.entries()) {
    const cortes = plano[i].linhas.slice(0, 5);
    assert.match(plano[i].titulo, new RegExp(molde, 'i'));
    assert.deepEqual(cortes.map((linha) => linha.rotulo.toLowerCase()), NOMES_DOS_CORTES[molde].map((n) => n.toLowerCase()));
    for (const [corte, linha] of cortes.entries()) {
      assert.deepEqual(linha.bonecos.map((b) => [b.opcoes.molde, b.opcoes.corte, b.pose, b.aparencia.pele]), PELES.map((pele) => [molde, corte, 'parado', pele]));
    }
    const poses = plano[i].linhas[5].bonecos;
    assert.ok(poses.every((b) => b.opcoes.molde === molde && b.opcoes.corte === poses[0].opcoes.corte));
    const visto = (b) => `${b.pose}${b.opcoes.papel ? '+papel' : ''}${b.opcoes.festa ? '+festa' : ''}${b.opcoes.espelhado ? '+espelhado' : ''}`;
    for (const pose of ['parado', 'digitar-a', 'digitar-b', 'andar-a', 'andar-b', 'mao', 'mao+festa', 'andar-a+papel', 'andar-b+espelhado']) {
      assert.ok(poses.map(visto).includes(pose), `${molde}: ${pose} missing in ${poses.map(visto)}`);
    }
    // Voluminous: the cut of the pose line reaches the widest columns the head may use.
    assert.ok(linhasDoBoneco('parado', poses[0].opcoes).slice(0, 7).filter((l) => l[2] === 'o' && l[13] === 'o').length >= 3, molde);
  }
  for (const b of bonecos) {
    const a = b.aparencia;
    assert.ok(PELES.includes(a.pele) && CABELOS.includes(a.cabelo) && OLHOS.includes(a.olhos) && /^#[0-9a-f]{6}$/.test(a.camisa), JSON.stringify(a));
    assert.ok(diferenca(a.cabelo, a.pele) >= DIFERENCA_MINIMA && diferenca(a.olhos, a.pele) >= DIFERENCA_MINIMA, JSON.stringify(a));
    assert.equal(linhasDoBoneco(b.pose, b.opcoes).length, 16);
  }
  assert.deepEqual([new Set(bonecos.map((b) => b.aparencia.cabelo)).size, new Set(bonecos.map((b) => b.aparencia.olhos)).size], [9, 4], 'every hair and eye colour is on the sheet');
  assert.deepEqual(planoDaFolha(), plano, 'the same sheet every time: no clock, no draw');
});

test('E2 (sheet): ?folha=1 paints the sheet in place of the office — labels as text, no network, no timer', () => {
  const j = janela('?folha=1');
  iniciar(j);
  const [folha] = j.body.children;
  assert.equal(j.body.children.length, 1);
  assert.deepEqual([j.ids.get('abertura').hidden, j.ids.get('pagina').hidden], [true, true]);
  const partes = todos(folha);
  const telas = partes.filter((el) => el.tag === 'canvas');
  const plano = planoDaFolha();
  assert.equal(telas.length, plano.flatMap((secao) => secao.linhas).length, 'one canvas for each line of the plan');
  for (const tela of telas) {
    assert.ok(tela.width > 0 && tela.height > 0 && tela.pintados.length > 0 && typeof tela['aria-label'] === 'string');
    assert.ok(tela.pintados.every(([cor, x, y, l, a]) => /^#[0-9a-f]{6}$/.test(cor) && x >= 0 && y >= 0 && x + l <= tela.width && y + a <= tela.height), 'whole rectangles, inside the canvas');
  }
  const textos = partes.map((el) => el.textContent).filter(Boolean);
  for (const esperado of ['Feminino', 'Masculino', ...Object.values(NOMES_DOS_CORTES).flat()]) {
    assert.ok(textos.some((t) => t.toLowerCase().includes(esperado.toLowerCase())), `label missing: ${esperado}`);
  }
  assert.ok(textos.some((t) => /confer[êe]ncia/i.test(t)) && textos.every((t) => !/[<>]/.test(t)));
  // Called on its own it paints the same thing.
  const outra = janela('');
  abrirFolha(outra);
  assert.equal(todos(outra.body.children[0]).filter((el) => el.tag === 'canvas').length, telas.length);
});

test('E2 (sheet): the new modules of the page are on the closed list the server answers from', () => {
  for (const nome of ['folha.js', 'sprites-rosto.js', 'sprites-corpo.js', 'sprites-boneco.js', 'modelo-personagem.js']) assert.ok(ARQUIVOS.includes(nome), nome);
});
