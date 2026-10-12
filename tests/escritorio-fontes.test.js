// specs/fase-e1-escritorio-ao-vivo.md — E1-06a and E1-06d: contracts over the sources of the office
// page (rules 24 and 25), read as text. No file writes HTML or text on the canvas, and the opening
// sentence is in the static HTML. Moved here from tests/escritorio-pagina.test.js in phase E3, to
// keep that file within its size; the tests are the same.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTOS } from '../templates/_opencrew/core/escritorio/modelo.js';

const PASTA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates/_opencrew/core/escritorio');
// A Windows checkout hands the payload over with CRLF: the contracts read it with LF.
const FONTES = Object.fromEntries(readdirSync(PASTA).sort().map((nome) => [nome, readFileSync(path.join(PASTA, nome), 'utf8').replace(/\r\n/g, '\n')]));
const HTML = FONTES['index.html'];
const ABRINDO = 'Abrindo o escritório… Se esta mensagem não sumir, abra pelo endereço que o comando /opencrew dashboard mostrou, e não pelo arquivo.';

test('E1-06a: no file of the page writes HTML or text on the canvas; every <script> has src and no tag has an on…= attribute', () => {
  const proibido = /innerHTML|outerHTML|insertAdjacentHTML|document\.write|fillText|strokeText|createContextualFragment|DOMParser|srcdoc|\beval\(|new Function/;
  for (const [nome, fonte] of Object.entries(FONTES)) assert.doesNotMatch(fonte, proibido, nome);
  assert.deepEqual(HTML.match(/<script\b[^>]*>/gi), ['<script type="module" src="app.js">'], 'one script, loaded by src');
  assert.match(HTML, /<script type="module" src="app\.js"><\/script>/, 'and nothing written inside it');
  for (const tag of HTML.match(/<[a-z][^>]*>/gi)) assert.doesNotMatch(tag, /\son[a-z]+\s*=/i, tag);
});

test('E1-06d: the opening sentence of §6 is in the static HTML of index.html, outside <script>, and starts visible', () => {
  assert.equal(TEXTOS.abrindo, ABRINDO);
  const estatico = HTML.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  assert.ok(estatico.includes(`>${ABRINDO}</p>`), 'the sentence, letter by letter, as the text of a paragraph');
  const tag = (id) => estatico.match(new RegExp(`<[a-z0-9]+\\b[^>]*\\bid="${id}"[^>]*>`))[0];
  assert.deepEqual([/\shidden\b/.test(tag('abertura')), /\shidden\b/.test(tag('pagina'))], [false, true], 'without JavaScript only the sentence shows');
});
