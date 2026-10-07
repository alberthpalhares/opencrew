// Gravação do documento Word: montado na memória, gravado num temporário ao lado do destino e
// renomeado. Em falha não fica arquivo pela metade nem temporário. Um Word diferente que já está
// lá só é trocado quando o usuário autoriza; um igual não é tocado. Nada é apagado.
// Spec: fase-u3b-documento-word.md, regra 12 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** O que já está no destino: os bytes do arquivo, `null` (nada) ou `false` (não é um arquivo legível). */
async function atual(destino, disco) {
  try {
    return await disco.readFile(destino);
  } catch (erro) {
    return erro.code === 'ENOENT' ? null : false;
  }
}

/** Grava pelo temporário; se algo falha, o temporário (que é deste script) sai e o destino fica como estava. */
async function trocar(destino, bytes, disco) {
  const temporario = `${destino}.opencrew-tmp`;
  try {
    await disco.mkdir(path.dirname(destino), { recursive: true });
    await disco.writeFile(temporario, bytes);
    await disco.rename(temporario, destino);
    return true;
  } catch {
    await fs.rm(temporario, { force: true }).catch(() => {});
    return false;
  }
}

/**
 * @param {string} destino caminho absoluto do `.docx`
 * @param {Buffer} bytes
 * @param {{ substituir?: boolean, disco?: object }} [opcoes] `disco`: as funções de `fs.promises`
 * @returns {Promise<'gravado'|'igual'|'diferente'|'falha'>} `igual`: já existe com os mesmos bytes,
 *   nada foi gravado · `diferente`: já existe outro e `substituir` não veio, nada foi gravado
 */
export async function gravarDocx(destino, bytes, { substituir = false, disco = fs } = {}) {
  const existente = await atual(destino, disco);
  if (existente === false) return 'falha';
  if (existente?.equals(bytes)) return 'igual';
  if (existente && !substituir) return 'diferente';
  return (await trocar(destino, bytes, disco)) ? 'gravado' : 'falha';
}
