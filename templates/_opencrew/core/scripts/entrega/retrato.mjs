// O retrato da cópia: o que o script copiou para cada pasta de cópia (caminho → hash), guardado em
// `crews/<crew>/output/<run>/copia.json`. É com ele que a entrega seguinte é comparada: assim, o
// que o usuário editar na cópia nunca vira "a entrega mudou". Arquivo de serviço do script.
// Spec: fase-u3a2-entrega-no-projeto.md, regra 14 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const ARQUIVO = 'copia.json';

const ehObjeto = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const ehRetrato = (v) => ehObjeto(v) && Object.values(v).every((hash) => typeof hash === 'string');

/**
 * Os retratos desta execução, por pasta de cópia (relativa ao projeto, com `/`). Arquivo que não
 * existe (cópia feita por versão anterior) ou que não é o JSON esperado: nenhum retrato — a
 * comparação volta a ser com os arquivos da pasta.
 * @returns {Promise<Record<string, Record<string, string>>>}
 */
export async function lerRetratos(execucao) {
  try {
    const copias = JSON.parse(await fs.readFile(path.join(execucao, ARQUIVO), 'utf8'))?.copias;
    return ehObjeto(copias) && Object.values(copias).every(ehRetrato) ? copias : {};
  } catch {
    return {};
  }
}

/**
 * Regrava `copia.json` com os retratos dados; com o mesmo conteúdo, nada é gravado.
 * @returns {Promise<string|null>} null quando está gravado; senão, o arquivo que não foi gravado
 */
export async function gravarRetratos(execucao, copias) {
  const arquivo = path.join(execucao, ARQUIVO);
  const texto = `${JSON.stringify({ copias }, null, 2)}\n`;
  try {
    const atual = await fs.readFile(arquivo, 'utf8').catch(() => null);
    if (atual !== texto) await fs.writeFile(arquivo, texto, 'utf8');
    return null;
  } catch {
    return arquivo;
  }
}
