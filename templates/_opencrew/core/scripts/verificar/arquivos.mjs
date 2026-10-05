// O que é cada item da lista do verificador: texto, não-texto, pasta, ausente ou texto que não
// está em UTF-8 (o UTF-16 com a marca de início é lido).
// Só texto é verificado; em HTML, o texto visível e os links (fase-r1-reparos-1-6-1.md, regra 9).
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { semBom } from './leitura.mjs';
import { textoDeHtml } from './html.mjs';

const NAO_TEXTO = new Set(
  '.png .jpg .jpeg .gif .webp .bmp .ico .svg .pdf .doc .docx .xls .xlsx .ods .pptx .mp3 .wav .ogg .mp4 .mov .webm .zip .css .js .json'.split(' '),
);
const HTML = new Set(['.html', '.htm']);
const COM_PECAS = new Set(['.md', '.txt']);

async function tipoNoDisco(caminho) {
  try {
    return (await stat(caminho)).isDirectory() ? 'pasta' : 'arquivo';
  } catch (erro) {
    if (erro.code === 'ENOENT' || erro.code === 'ENOTDIR') return 'ausente';
    throw erro;
  }
}

/** Texto de um arquivo que começa pela marca de UTF-16 (FF FE ou FE FF); sem a marca, null. */
function deUtf16(bytes) {
  const [a, b] = bytes;
  if (!(a === 0xff && b === 0xfe) && !(a === 0xfe && b === 0xff)) return null;
  const pares = bytes.subarray(0, bytes.length - (bytes.length % 2));
  return (a === 0xfe ? pares.swap16() : pares).toString('utf16le');
}

/**
 * Lê um item da lista.
 * @returns {Promise<{ tipo: 'ausente'|'pasta'|'nao-texto'|'nao-utf8'|'texto', texto?: string, comPecas?: boolean }>}
 *   `comPecas`: a procura de peças só vale para `.md` e `.txt` · `nao-utf8`: `.md`, `.txt`,
 *   `.html` ou `.htm` com byte nulo e sem a marca de UTF-16
 */
export async function lerItem(caminho) {
  const tipo = await tipoNoDisco(caminho);
  if (tipo !== 'arquivo') return { tipo };
  const ext = path.extname(caminho).toLowerCase();
  if (NAO_TEXTO.has(ext)) return { tipo: 'nao-texto' };
  const bytes = await readFile(caminho);
  const deTexto = COM_PECAS.has(ext) || HTML.has(ext);
  const utf16 = deTexto ? deUtf16(bytes) : null;
  // Byte nulo é conteúdo binário; em arquivo de texto, é outra codificação.
  if (utf16 == null && bytes.includes(0)) return { tipo: deTexto ? 'nao-utf8' : 'nao-texto' };
  const texto = semBom(utf16 ?? bytes.toString('utf8'));
  return { tipo: 'texto', texto: HTML.has(ext) ? textoDeHtml(texto) : texto, comPecas: COM_PECAS.has(ext) };
}
