// `--lembrar-destino`: grava `entrega.destino` no `crew.yaml`, sem mexer em nenhuma outra linha, e
// deixa ao lado a cópia do arquivo anterior (`crew.yaml.bak`; se já existe, `.bak-<data-hora>`).
// É o único arquivo fora da execução e do destino que a entrega escreve.
// Spec: fase-u3a2-entrega-no-projeto.md, regra 16 (repositório do OpenCrew).
import { constants, existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { blocoDaEntrega, destinoDoTexto, validarDestino } from './destino.mjs';

const FIM = /\r?\n$/;
const fimDe = (linha) => linha.match(FIM)?.[0] ?? '';
const recuoDe = (linha) => linha.match(/^[ \t]*/)[0];

/** O que já está gravado é o mesmo destino? (`Não` e `nao` são o mesmo "não"; `a\b` e `a/b`, a mesma pasta) */
function jaGravado(raiz, texto, destino) {
  const escrito = destinoDoTexto(texto);
  if (escrito == null) return false;
  const atual = validarDestino(raiz, escrito);
  return atual.tipo === destino.tipo && atual.rel === destino.rel;
}

/** Troca a linha de `destino:` (e a lista que vinha embaixo dela, se havia) pela linha nova. */
function trocar(linhas, bloco, linhaNova, eol) {
  const i = bloco.destino;
  let fim = i + 1;
  while (fim < bloco.fim && linhas[fim].trim() && recuoDe(linhas[fim]).length > bloco.recuo.length) fim += 1;
  linhas.splice(i, fim - i, `${linhaNova}${fimDe(linhas[i]) || eol}`);
}

/** O texto do `crew.yaml` com `entrega.destino: valor`; as outras linhas ficam como estavam, byte a byte. */
export function comDestino(texto, valor) {
  const eol = texto.includes('\r\n') ? '\r\n' : '\n';
  const linhas = texto.split(/(?<=\n)/);
  const bloco = blocoDaEntrega(linhas);
  const escrito = valor === 'nao' ? 'nao' : JSON.stringify(valor);
  if (bloco && bloco.destino >= 0) trocar(linhas, bloco, `${bloco.recuo}destino: ${escrito}`, eol);
  else if (bloco) {
    if (!fimDe(linhas[bloco.inicio])) linhas[bloco.inicio] += eol;
    linhas.splice(bloco.inicio + 1, 0, `${bloco.recuo}destino: ${escrito}${eol}`);
  } else {
    if (linhas.length && !fimDe(linhas.at(-1))) linhas.push(eol);
    linhas.push(`entrega:${eol}`, `  destino: ${escrito}${eol}`);
  }
  return linhas.join('');
}

const nomeDaCopia = (arquivo) => (existsSync(`${arquivo}.bak`) ? `${arquivo}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}` : `${arquivo}.bak`);

/**
 * Grava o destino no `crew.yaml`. Valor igual ao gravado: nada é regravado (nem cópia nova).
 * @param {string} raiz pasta do projeto · @param {string} crew pasta da crew, absoluta
 * @param {object} destino o que `validarDestino` devolveu: `nao` ou `pasta`
 * @returns {Promise<string|null>} null quando está gravado; senão, o arquivo que não foi gravado
 */
export async function lembrarDestino(raiz, crew, destino) {
  const arquivo = path.join(crew, 'crew.yaml');
  try {
    const antes = await fs.readFile(arquivo, 'utf8');
    if (jaGravado(raiz, antes, destino)) return null;
    await fs.copyFile(arquivo, nomeDaCopia(arquivo), constants.COPYFILE_EXCL);
    await fs.writeFile(arquivo, comDestino(antes, destino.tipo === 'nao' ? 'nao' : destino.rel), 'utf8');
    return null;
  } catch {
    return arquivo;
  }
}