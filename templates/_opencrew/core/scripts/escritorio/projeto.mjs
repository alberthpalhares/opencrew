// Identidade do projeto para o escritório: diz se o servidor que responde numa porta é o deste
// projeto, sem expor o caminho da pasta.
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

/**
 * 12 caracteres hexadecimais do SHA-256 do caminho real da raiz. No Windows o caminho vai para
 * minúsculas antes: lá `D:\Projeto` e `d:\projeto` são a mesma pasta. Função pura.
 */
export function idDoProjeto(caminhoReal, plataforma = process.platform) {
  const texto = plataforma === 'win32' ? caminhoReal.toLowerCase() : caminhoReal;
  return createHash('sha256').update(texto).digest('hex').slice(0, 12);
}

/**
 * Caminho real: o mesmo projeto aberto por um link de pasta dá o mesmo resultado. Onde o sistema
 * não resolve (alguns discos virtuais), vale o caminho absoluto.
 */
function caminhoReal(raiz) {
  try {
    return realpathSync.native(raiz);
  } catch {
    return path.resolve(raiz);
  }
}

/** O id do projeto que mora em `raiz`. */
export const projetoDe = (raiz) => idDoProjeto(caminhoReal(raiz));

/**
 * A versão do OpenCrew instalada em `raiz`: o texto de `_opencrew/.opencrew-version`. Sem o
 * arquivo, `""`. O servidor a lê uma vez, ao subir: é por ela que se reconhece o escritório que
 * ficou aberto de antes de um `update` (spec fase-e4-robustez-do-escritorio.md, regras 1 e 2).
 */
export function versaoDe(raiz) {
  try {
    return readFileSync(path.join(raiz, '_opencrew', '.opencrew-version'), 'utf8').trim();
  } catch {
    return '';
  }
}
