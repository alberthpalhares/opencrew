// specs/fase-e4-robustez-do-escritorio.md — E4-02 and E4-04: when the page does not open, it says
// which file is missing (`aviso.js`), and every import of the page points to a file the server gives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARQUIVOS } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { TEXTOS } from '../templates/_opencrew/core/escritorio/modelo.js';
import { faltando, vigiar } from '../templates/_opencrew/core/escritorio/aviso.js';

const PASTA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio');
const FONTES = Object.fromEntries(readdirSync(PASTA).sort().map((nome) => [nome, readFileSync(path.join(PASTA, nome), 'utf8').replace(/\r\n/g, '\n')]));
const HTML = FONTES['index.html'];
const ABRINDO = 'Abrindo o escritório… Se esta mensagem não sumir, feche o escritório e rode /opencrew dashboard de novo. Confira também se abriu pelo endereço que o comando mostrou, e não pelo arquivo.';
const FALTOU = (nomes) => `O escritório não carregou: faltou ${nomes}. Feche o escritório e rode /opencrew dashboard de novo.`;

/** A server that gives the real files of the page, except the ones in `sem`; it keeps what was asked. */
function servidor(sem = []) {
  const pedidos = [];
  const fetch = async (nome) => {
    pedidos.push(nome);
    return sem.includes(nome) || !(nome in FONTES) ? { status: 404, text: async () => 'Não encontrado' } : { status: 200, text: async () => FONTES[nome] };
  };
  return { fetch, pedidos };
}

/** A fake window with the opening sentence on the screen; `disparar` runs what was scheduled. */
function janela(fetch, { hidden = false } = {}) {
  const abertura = { hidden, textContent: ABRINDO };
  const marcados = [];
  const w = { document: { getElementById: (id) => (id === 'abertura' ? abertura : null) }, fetch, setTimeout: (fn, ms) => marcados.push([fn, ms]) };
  return { w, abertura, marcados, disparar: () => marcados[0][0]() };
}

test('E4-02a: the opening sentence of §3 is in the static HTML, visible without JavaScript, and is TEXTOS.abrindo', () => {
  assert.equal(TEXTOS.abrindo, ABRINDO);
  const estatico = HTML.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  assert.ok(estatico.includes(`<p class="abertura" id="abertura">${ABRINDO}</p>`));
});

test('E4-02b: the opening still on the screen after 4 s and a module that answers 404 — the sentence names it; two, in alphabetical order; each file asked once', async () => {
  for (const [sem, nomes] of [[['quadro.js'], 'quadro.js'], [['rota.js', 'cena.js'], 'cena.js, rota.js'], [['app.js'], 'app.js']]) {
    const { fetch, pedidos } = servidor(sem);
    const { w, abertura, marcados, disparar } = janela(fetch);
    vigiar(w);
    assert.deepEqual([marcados.map(([, ms]) => ms), abertura.textContent], [[4000], ABRINDO], 'nothing happens before the 4 s');
    await disparar();
    assert.equal(abertura.textContent, FALTOU(nomes));
    assert.equal(new Set(pedidos).size, pedidos.length, `asked twice: ${pedidos}`);
  }
});

test('E4-02c: the opening already hidden after 4 s — nothing is asked; every file answering 200 — the text stays', async () => {
  const escondida = janela(servidor().fetch, { hidden: true });
  const { fetch, pedidos } = servidor();
  Object.assign(escondida.w, { fetch });
  vigiar(escondida.w);
  await escondida.disparar();
  assert.deepEqual([pedidos, escondida.abertura.textContent], [[], ABRINDO]);

  const inteira = janela(fetch);
  vigiar(inteira.w);
  await inteira.disparar();
  assert.equal(inteira.abertura.textContent, ABRINDO);
  // The walk reaches every module of the page: all the files but the HTML and `aviso.js` itself.
  assert.deepEqual([...pedidos].sort(), ARQUIVOS.filter((nome) => !['index.html', 'aviso.js'].includes(nome)).sort());
  assert.deepEqual(await faltando(async () => { throw new TypeError('fora do ar'); }), ['app.js'], 'no answer counts as missing');
});

test('E4-02d: the page loads aviso.js and then app.js, both by src; aviso.js imports nothing and writes no HTML', () => {
  assert.deepEqual(HTML.match(/<script\b[^>]*>/gi), ['<script type="module" src="aviso.js">', '<script type="module" src="app.js">']);
  assert.doesNotMatch(FONTES['aviso.js'].replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), /\bimport\b|innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  assert.ok(ARQUIVOS.includes('aviso.js'));
});

test('E4-04a: every import of a file of the page points to a name of the closed list of the server', () => {
  for (const [nome, fonte] of Object.entries(FONTES).filter(([n]) => n.endsWith('.js'))) {
    const semComentario = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const citados = [...semComentario.matchAll(/\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(([, alvo]) => alvo);
    for (const alvo of citados) {
      assert.match(alvo, /^\.\/[\w.-]+\.js$/, `${nome} imports ${alvo}: the page only imports files beside it, written as './name.js'`);
      assert.ok(ARQUIVOS.includes(alvo.slice(2)), `${nome} imports ${alvo}, which the server does not give`);
    }
  }
});
