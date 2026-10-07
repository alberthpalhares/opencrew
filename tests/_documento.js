// Shared helpers of tests/documento*.test.js (not a test file itself — no .test.js suffix).
// specs/fase-u3b-documento-word.md, §11: a zip reader, an independent CRC-32 and a strict XML
// reader that never import the generator; and small helpers to generate and open a document.
// The checks over the whole package (rule 3) and the word extractors live in _documento-conferir.js.
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { gerarDocx, main } from '../templates/_opencrew/core/scripts/documento.mjs';
import { mkTmp, snapshot } from './_helpers.js';

/** CRC-32 bit by bit (no table): the independent implementation the zip reader checks against. */
export function crcLento(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

const exigir = (ok, mensagem) => {
  if (!ok) throw new Error(`zip: ${mensagem}`);
};

/** One entry of the central directory, checked against its local header and its CRC. */
function lerEntrada(buf, p) {
  exigir(buf.readUInt32LE(p) === 0x02014b50, 'central directory signature');
  const e = { flags: buf.readUInt16LE(p + 8), metodo: buf.readUInt16LE(p + 10), hora: buf.readUInt16LE(p + 12), data: buf.readUInt16LE(p + 14), crc: buf.readUInt32LE(p + 16), tamanho: buf.readUInt32LE(p + 24), inicio: buf.readUInt32LE(p + 42) };
  const n = buf.readUInt16LE(p + 28);
  e.nome = buf.toString('utf8', p + 46, p + 46 + n);
  exigir(buf.readUInt32LE(p + 20) === e.tamanho, `${e.nome}: compressed size differs from the size`);
  exigir(buf.readUInt16LE(p + 30) === 0 && buf.readUInt16LE(p + 32) === 0, `${e.nome}: extra field or comment`);
  const l = e.inicio;
  exigir(buf.readUInt32LE(l) === 0x04034b50, `${e.nome}: local header signature`);
  const igual = [[8, 6], [10, 8], [12, 10], [14, 12]].every(([c, loc]) => buf.readUInt16LE(p + c) === buf.readUInt16LE(l + loc));
  exigir(igual && buf.readUInt32LE(l + 14) === e.crc && buf.readUInt32LE(l + 22) === e.tamanho, `${e.nome}: local header differs from the central directory`);
  exigir(buf.toString('utf8', l + 30, l + 30 + n) === e.nome && buf.readUInt16LE(l + 28) === 0, `${e.nome}: local name`);
  e.bytes = buf.subarray(l + 30 + n, l + 30 + n + e.tamanho);
  e.fim = l + 30 + n + e.tamanho;
  exigir(e.metodo === 0, `${e.nome}: compressed entry (method ${e.metodo})`);
  exigir(crcLento(e.bytes) === e.crc, `${e.nome}: CRC does not match`);
  return { entrada: e, proximo: p + 46 + n };
}

/** Reads a whole zip (stored entries only); throws on any inconsistency. */
export function lerZip(bytes) {
  const buf = Buffer.from(bytes);
  const fim = buf.length - 22;
  exigir(fim >= 0 && buf.readUInt32LE(fim) === 0x06054b50, 'end record');
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  exigir(p + buf.readUInt32LE(fim + 12) === fim && buf.readUInt16LE(fim + 8) === total, 'central directory position');
  const entradas = [];
  let esperado = 0;
  for (let i = 0; i < total; i++) {
    const { entrada, proximo } = lerEntrada(buf, p);
    exigir(entrada.inicio === esperado, `${entrada.nome}: gap before the entry`);
    esperado = entrada.fim;
    entradas.push(entrada);
    p = proximo;
  }
  exigir(p === fim && esperado === buf.readUInt32LE(fim + 16), 'bytes left between the parts');
  return entradas;
}

const proibido = (c) => c < 0x20 ? ![0x09, 0x0a, 0x0d].includes(c) : c === 0xfffe || c === 0xffff;
const ENTIDADE = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;
const ABRE = /<([A-Za-z_][\w.:-]*)((?:\s+[A-Za-z_][\w.:-]*="[^"<]*")*)\s*(\/?)>/y;
const FECHA = /<\/([A-Za-z_][\w.:-]*)\s*>/y;
const solta = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function atributos(texto, nome) {
  const attrs = {};
  for (const [, chave, valor] of texto.matchAll(/([A-Za-z_][\w.:-]*)="([^"]*)"/g)) {
    if (chave in attrs) throw new Error(`xml: attribute ${chave} twice in <${nome}>`);
    if (ENTIDADE.test(valor)) throw new Error(`xml: loose & in attribute ${chave} of <${nome}>`);
    attrs[chave] = solta(valor);
  }
  return attrs;
}

/** Every prefix used by the element (and its attributes) is declared on it or on an ancestor. */
function conferirPrefixos(no, pilha) {
  const declarados = new Set(['xml', 'xmlns', ...[...pilha, no].flatMap((n) => Object.keys(n.attrs).filter((a) => a.startsWith('xmlns:')).map((a) => a.slice(6)))]);
  for (const nome of [no.nome, ...Object.keys(no.attrs)]) {
    const prefixo = nome.includes(':') ? nome.split(':')[0] : null;
    if (prefixo && !declarados.has(prefixo)) throw new Error(`xml: prefix ${prefixo} of ${nome} is not declared`);
  }
}

function textoSolto(texto, pilha) {
  if (ENTIDADE.test(texto) || texto.includes('>')) throw new Error('xml: loose & or > in text');
  if (pilha.length) pilha.at(-1).filhos.push(solta(texto));
  else if (texto.trim()) throw new Error('xml: text outside the root element');
}

/**
 * Strict reader of the XML the generator writes: one root, every tag closed, attributes in double
 * quotes, no forbidden character, no loose `&`, `<` or `>`, every prefix declared.
 * @returns {{ nome: string, attrs: object, filhos: Array<object|string> }}
 */
export function lerXml(texto) {
  for (let i = 0; i < texto.length; i++) if (proibido(texto.charCodeAt(i))) throw new Error(`xml: forbidden character U+${texto.charCodeAt(i).toString(16)}`);
  let i = (/^<\?xml [^?]*\?>\s*/.exec(texto)?.[0] ?? '').length;
  const pilha = [];
  let raiz = null;
  while (i < texto.length) {
    if (texto[i] !== '<') {
      const fim = texto.indexOf('<', i) === -1 ? texto.length : texto.indexOf('<', i);
      textoSolto(texto.slice(i, fim), pilha);
      i = fim;
      continue;
    }
    ABRE.lastIndex = FECHA.lastIndex = i;
    const fecha = FECHA.exec(texto);
    const abre = fecha ? null : ABRE.exec(texto);
    if (fecha) {
      if (pilha.pop()?.nome !== fecha[1]) throw new Error(`xml: </${fecha[1]}> closes nothing`);
    } else if (abre) {
      if (raiz && !pilha.length) throw new Error('xml: more than one root element');
      const no = { nome: abre[1], attrs: atributos(abre[2], abre[1]), filhos: [] };
      conferirPrefixos(no, pilha);
      if (pilha.length) pilha.at(-1).filhos.push(no);
      raiz ??= no;
      if (!abre[3]) pilha.push(no);
    } else throw new Error(`xml: bad tag at ${i}: ${texto.slice(i, i + 40)}`);
    i += (fecha ?? abre)[0].length;
  }
  if (!raiz || pilha.length) throw new Error(`xml: ${raiz ? `<${pilha.at(-1).nome}> is never closed` : 'no root element'}`);
  return raiz;
}

export const filhos = (no) => no.filhos.filter((f) => typeof f !== 'string');
export const filho = (no, nome) => filhos(no).find((f) => f.nome === nome);
/** Every descendant with that name, in document order. */
export function todos(no, nome) {
  return filhos(no).flatMap((f) => [...(f.nome === nome ? [f] : []), ...todos(f, nome)]);
}
/** The text of a paragraph, run or cell: the `w:t`, in order, with a tab for each `w:tab`. */
export function textoDe(no) {
  return no.filhos.map((f) => (typeof f === 'string' ? '' : f.nome === 'w:t' ? f.filhos.join('') : f.nome === 'w:tab' && !('w:val' in f.attrs) ? '\t' : textoDe(f))).join('');
}
export const tem = (no, nome) => todos(no, nome).length > 0;
export const val = (no, nome, attr = 'w:val') => todos(no, nome)[0]?.attrs[attr];

/** The entries of a package by name: `{ 'word/document.xml': Buffer }`. */
export const porNome = (entradas) => Object.fromEntries(entradas.map((e) => [e.nome, Buffer.from(e.bytes)]));
export const xmlDe = (entradas, nome) => lerXml(porNome(entradas)[nome].toString('utf8'));

/** Generates the document in memory and reads it back with the zip reader. */
export function gerar(texto, opcoes = {}) {
  const { bytes, avisos } = gerarDocx({ texto, ...opcoes });
  const entradas = lerZip(bytes);
  return { bytes, avisos, entradas, nomes: entradas.map((e) => e.nome) };
}
/** The children of `w:body` of the generated document (paragraphs, tables and the section). */
export const corpo = (texto, opcoes) => filhos(filho(xmlDe(gerar(texto, opcoes).entradas, 'word/document.xml'), 'w:body'));
export const paragrafos = (texto, opcoes) => corpo(texto, opcoes).filter((b) => b.nome === 'w:p');

function bloco(tipo, dados) {
  const corpoDoBloco = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]);
  const cabeca = Buffer.alloc(4);
  cabeca.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crcLento(corpoDoBloco));
  return Buffer.concat([cabeca, corpoDoBloco, crc]);
}

/** A real PNG (a dark rectangle with a lighter band), so the sample opens in Word. */
export function png(largura = 200, altura = 80) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const linha = (y) => Buffer.concat([Buffer.from([0]), Buffer.alloc(largura * 3, y % 20 < 10 ? 0x2a : 0x6f)]);
  const dados = Buffer.concat(Array.from({ length: altura }, (_, y) => linha(y)));
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([assinatura, bloco('IHDR', ihdr), bloco('IDAT', deflateSync(dados)), bloco('IEND', Buffer.alloc(0))]);
}

/** A project (it has `_opencrew/`) with the given files (`{ 'Atas/ata.md': text or bytes }`); gone when `t` ends. */
export async function projeto(t, arquivos = {}, { instalado = true } = {}) {
  const raiz = await mkTmp('documento');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  if (instalado) await fs.mkdir(path.join(raiz, '_opencrew'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    await fs.mkdir(path.dirname(path.join(raiz, rel)), { recursive: true });
    await fs.writeFile(path.join(raiz, rel), conteudo);
  }
  return raiz;
}

const foto = async (raiz, livres) => (await snapshot(raiz)).map((l) => l.split(path.sep).join('/')).filter((l) => !livres.includes(l.slice(0, l.lastIndexOf(':'))));

/**
 * Runs the command line in `raiz`: exit code, lines, whole output and last line. Every run also
 * proves U3b-04j: outside `livres` (the output file, or the profile with --criar-perfil), the
 * project tree is the same before and after — no temporary file, nothing erased.
 */
export async function rodar(raiz, argv, livres = [], deps = {}) {
  const antes = await foto(raiz, livres);
  const linhas = [];
  const code = await main(argv, { cwd: raiz, escrever: (s) => linhas.push(...String(s).split('\n')), ...deps });
  assert.deepEqual(await foto(raiz, livres), antes, 'U3b-04j: nothing changes outside the output file');
  return { code, linhas, saida: linhas.join('\n'), fim: linhas.at(-1) };
}
export const existe = (raiz, rel) => fs.access(path.join(raiz, rel)).then(() => true, () => false);
export const USO = 'Uso: node _opencrew/core/scripts/documento.mjs "<arquivo.md>" [--saida <arquivo.docx|pasta>] [--perfil <arquivo>] [--sem-perfil] [--substituir] [--ajuda]\n     node _opencrew/core/scripts/documento.mjs --criar-perfil';
export const DICAS = ['Para ter um PDF: abra o documento no Word e use Arquivo → Salvar como → PDF.', 'O Word é uma cópia do texto. O que você mudar nele não volta sozinho: altere o texto e gere de novo.'];

/** The 13 keys of the example of §3 of the spec ("perfil completo"). */
export const PERFIL_COMPLETO = [
  'logotipo: Ativos/Marca/logo.png', 'logotipo_largura_cm: 2,5',
  'cabecalho_1: ASSOCIAÇÃO EXEMPLO DE MORADORES', 'cabecalho_2: CNPJ 00.000.000/0001-00 · Fundada em 1990',
  'cabecalho_3: www.exemplo.org · contato@exemplo.org', 'rodape: Associação Exemplo de Moradores — documento oficial',
  'numero_pagina: sim', 'margem_esquerda_cm: 3,0', 'margem_direita_cm: 2,0', 'margem_superior_cm: 2,5',
  'margem_inferior_cm: 2,5', 'fonte: Arial', 'tamanho_corpo_pt: 11', '',
].join('\n');
