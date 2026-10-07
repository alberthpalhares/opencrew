// Comparação entre o que a entrega copiaria agora e a cópia que já está no destino: é ela que
// decide se nada muda, se só há arquivos a acrescentar ou se a entrega vai para outra pasta.
// Com o retrato do que foi copiado (`copia.json`, ver `retrato.mjs`), a comparação é com ele: o que o
// usuário fez na cópia depois não conta. Sem retrato, é com os arquivos da pasta.
// Este módulo só lê. Spec: fase-u3a2-entrega-no-projeto.md, regra 14 (repositório do OpenCrew).
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Em texto, CRLF e LF são o mesmo conteúdo (o editor ou a sincronização trocam); o resto, byte a byte.
const DE_TEXTO = new Set(['.txt', '.md', '.html', '.htm', '.csv', '.json']);
export const emLf = (texto) => texto.replace(/\r\n/g, '\n');

/** Os bytes que um arquivo da entrega tem: os gerados (o Word), o texto gerado, ou os do arquivo de origem. */
export const bytesDe = async (a) => a.bytes ?? (a.texto != null ? Buffer.from(a.texto, 'utf8') : fs.readFile(a.de));

const ehTexto = (nome) => DE_TEXTO.has(path.extname(nome).toLowerCase());
const mesmoConteudo = (nome, a, b) => a.equals(b) || (ehTexto(nome) && emLf(a.toString('utf8')) === emLf(b.toString('utf8')));

/** Os arquivos sob uma pasta, com o prefixo dado e `/`; pasta que não existe: nenhum. */
async function listar(pasta, prefixo) {
  const entradas = await fs.readdir(pasta, { withFileTypes: true }).catch(() => []);
  const achados = [];
  for (const e of entradas) {
    if (e.isDirectory()) achados.push(...(await listar(path.join(pasta, e.name), `${prefixo}${e.name}/`)));
    else achados.push(`${prefixo}${e.name}`);
  }
  return achados;
}

const REENTREGA = '-reentrega-';

/** 1 para `<run>`, N para `<run>-reentrega-N` (N ≥ 2), 0 para qualquer outro nome. */
function numeroDe(nome, run) {
  if (nome === run) return 1;
  const n = nome.startsWith(`${run}${REENTREGA}`) ? nome.slice(run.length + REENTREGA.length) : '';
  return /^[1-9]\d*$/.test(n) && Number(n) >= 2 ? Number(n) : 0;
}

/**
 * As pastas desta execução no destino, da mais antiga para a mais nova: `<run>` é a 1 e
 * `<run>-reentrega-N` é a N. Só pastas: arquivo com um desses nomes não conta.
 * @returns {Promise<{ n: number, nome: string }[]>}
 */
export async function pastasDaExecucao(destino, run) {
  const entradas = await fs.readdir(destino, { withFileTypes: true }).catch(() => []);
  const pastas = entradas.filter((e) => e.isDirectory()).map((e) => ({ n: numeroDe(e.name, run), nome: e.name }));
  return pastas.filter((p) => p.n).sort((a, b) => a.n - b.n);
}

const hashDe = (nome, bytes) => createHash('sha1').update(ehTexto(nome) ? emLf(bytes.toString('utf8')) : bytes).digest('hex');

/** O retrato de uma lista de arquivos da entrega: `{ 'pasta/nome': hash }` (em texto, sem contar CRLF/LF). */
export async function retratoDe(arquivos) {
  const retrato = {};
  for (const a of arquivos) retrato[`${a.pasta}/${a.nome}`] = hashDe(a.nome, await bytesDe(a));
  return retrato;
}

/**
 * A mesma pergunta de `oQueFalta`, respondida pelo retrato do que foi copiado para a pasta. O que
 * o usuário editou, apagou ou acrescentou na cópia não é diferença. Arquivo novo cujo lugar já
 * está ocupado só conta como copiado quando o conteúdo é o mesmo; senão, é diferença.
 */
async function contraORetrato(pasta, esperados, canais, ignorar, retrato) {
  const saiu = (rel) => canais.has(rel.split('/')[0]) && !ignorar.has(rel) && !esperados.has(rel);
  if (Object.keys(retrato).some(saiu)) return null;
  const faltam = [];
  for (const [rel, a] of esperados) {
    const bytes = await bytesDe(a);
    if (Object.hasOwn(retrato, rel)) {
      if (retrato[rel] !== hashDe(rel, bytes)) return null;
      continue;
    }
    const noDisco = await fs.readFile(path.join(pasta, rel)).catch(() => null);
    if (noDisco == null) faltam.push(a);
    else if (!mesmoConteudo(rel, noDisco, bytes)) return null;
  }
  return faltam;
}

/**
 * Compara os arquivos que seriam copiados agora com uma pasta de cópia. Só as pastas de canal que
 * seriam copiadas agora são olhadas: a raiz da cópia e as outras pastas ficam de fora.
 * @param {string} pasta a cópia, absoluta · @param {object[]} arquivos `{ pasta, nome, texto | de }`
 * @param {Set<string>} ignorar `pasta/nome` do que a entrega tem mas não copia agora
 * @param {object|null} [retrato] o retrato do que foi copiado para esta pasta; null = comparar com os arquivos
 * @returns {Promise<null | object[]>} null = diferente (arquivo que mudou, saiu ou está a mais);
 *   senão, os arquivos que faltam na cópia (nenhum = igual)
 */
export async function oQueFalta(pasta, arquivos, ignorar, retrato = null) {
  const esperados = new Map(arquivos.map((a) => [`${a.pasta}/${a.nome}`, a]));
  if (retrato) return contraORetrato(pasta, esperados, new Set(arquivos.map((a) => a.pasta)), ignorar, retrato);
  const faltam = new Map(esperados);
  for (const canal of new Set(arquivos.map((a) => a.pasta))) {
    for (const rel of await listar(path.join(pasta, canal), `${canal}/`)) {
      if (ignorar.has(rel)) continue;
      const a = esperados.get(rel);
      if (!a || !mesmoConteudo(rel, await fs.readFile(path.join(pasta, rel)), await bytesDe(a))) return null;
      faltam.delete(rel);
    }
  }
  return [...faltam.values()];
}