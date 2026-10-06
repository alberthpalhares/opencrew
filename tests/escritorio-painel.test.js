// specs/fase-e1-escritorio-ao-vivo.md — rule 18: on a checkpoint the figure of who was working
// waits, but the list of agents does not change. The line of the list follows the status of the
// agent (mark and `data-acao`); only "sem sinal" replaces it. Runs `painel.js` on a minimal fake DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEMORIA_INICIAL, consultar, montarPagina } from '../templates/_opencrew/core/escritorio/modelo.js';
import { criarPainel } from '../templates/_opencrew/core/escritorio/painel.js';

const AGORA = Date.parse('2026-10-05T12:00:00.000Z');
const haMin = (min) => new Date(AGORA - min * 60000).toISOString();

/** A fake element with only what the panel uses: text, children, style and listeners. */
function elemento() {
  const filhos = [];
  return {
    textContent: '', hidden: false, className: '', value: '', dataset: {}, children: filhos,
    style: { setProperty() {} },
    append(...novos) { filhos.push(...novos); },
    replaceChildren(...novos) { filhos.splice(0, filhos.length, ...novos); },
    setAttribute() {},
    addEventListener() {},
  };
}
/** A fake document: every id asked for exists. */
function documento() {
  const porId = new Map();
  const doId = (id) => porId.get(id) ?? porId.set(id, elemento()).get(id);
  return { title: '', getElementById: doId, createElement: () => elemento() };
}
/** The first element of that class inside `el`. */
const achar = (el, classe) => el.children.reduce((achado, f) => achado ?? (f.className === classe ? f : achar(f, classe)), null);

/** The lines of the list for a crew in that state: [data-acao, mark, status text] of each agent. */
function linhas(status, agentes, updatedAt = haMin(0)) {
  const agents = agentes.map((s, i) => ({ id: `a${i + 1}`, name: `Agente ${i + 1}`, icon: '🙂', status: s, label: '' }));
  const estado = { crew: 'minha-crew', status, step: { current: 2, total: 5, label: 'Aprovar' }, agents, handoff: null, updatedAt };
  const doc = documento();
  const memoria = consultar(MEMORIA_INICIAL, { projeto: 'abc123abc123', crews: [{ crew: estado.crew, estado }] });
  criarPainel(doc, () => {}).atualizar(montarPagina(memoria, { agoraMs: AGORA }));
  return doc.getElementById('lista').children.map((li) => [li.dataset.acao, achar(li, 'sinal').textContent, achar(li, 'texto').textContent]);
}

test('E1 (review): on a checkpoint the line of the agent that was working keeps the working mark (rule 18: the list does not change)', () => {
  assert.deepEqual(linhas('checkpoint', ['working', 'done', 'idle']), [
    ['working', '▶', 'Trabalhando'],
    ['done', '✓', 'Concluído'],
    ['idle', '○', 'Em espera'],
  ]);
});

test('E1 (review): the line of the list follows the status while the run goes on; only "sem sinal" replaces the mark', () => {
  assert.deepEqual(linhas('running', ['working', 'skipped', 'idle'])[0], ['working', '▶', 'Trabalhando']);
  assert.deepEqual(linhas('running', ['working', 'done', 'idle'], haMin(21)), [
    ['sem-sinal', '?', 'Sem sinal há 21 min'],
    ['done', '✓', 'Concluído'],
    ['idle', '○', 'Em espera'],
  ]);
});
