// Identidade do projeto para o escritório: diz se o servidor que responde numa porta é o deste
// projeto, sem expor o caminho da pasta.
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
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
