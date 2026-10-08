// Leitura e gravação de `crews/<crew>/state.json`: inteira ou nenhuma.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 3 e 6 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';

/** O Windows recusa a troca de nome com um destes códigos enquanto outro processo lê o arquivo. */
const RECUSAS = ['EPERM', 'EBUSY', 'EACCES'];
/** Depois da primeira tentativa: até 3 repetições, uma a cada 100 ms (cerca de 300 ms ao todo). */
const REPETICOES = 3;
const INTERVALO_MS = 100;

const pausa = (ms) => new Promise((seguir) => { setTimeout(seguir, ms); });

/** O estado gravado, ou `null` quando o arquivo falta ou está ilegível (pela metade, sem `agents` em lista). */
export async function lerEstado(arquivo) {
  try {
    const estado = JSON.parse((await fs.readFile(arquivo, 'utf8')).replace(/^\uFEFF/, ''));
    return Array.isArray(estado?.agents) ? estado : null;
  } catch {
    return null;
  }
}

async function trocarNome(de, para, { renomear = fs.rename, esperar = pausa }) {
  for (let repeticao = 0; ; repeticao++) {
    try {
      return await renomear(de, para);
    } catch (erro) {
      if (!RECUSAS.includes(erro?.code) || repeticao === REPETICOES) throw erro;
      await esperar(INTERVALO_MS);
    }
  }
}

/**
 * Grava o texto num temporário da mesma pasta (`<arquivo>.<pid>.tmp`) e troca o nome: quem lê vê
 * o arquivo antigo ou o novo, nunca um pela metade. Quando desiste, o arquivo fica como estava, o
 * temporário é apagado e o erro sobe.
 * @param {{ renomear?: Function, esperar?: Function }} [deps] SÓ PARA TESTE: a troca de nome
 *   (`(de, para) => Promise`) e a espera entre as tentativas (`(ms) => Promise`)
 */
export async function gravarTexto(arquivo, texto, deps = {}) {
  const temporario = `${arquivo}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporario, texto);
    await trocarNome(temporario, arquivo, deps);
  } catch (erro) {
    await fs.rm(temporario, { force: true }).catch(() => {});
    throw erro;
  }
}

/**
 * Grava o `state.json`, inteiro ou nada (ver `gravarTexto`).
 * @param {string} arquivo caminho do `state.json`
 * @param {object} estado
 * @returns {Promise<boolean>} `false` quando desistiu
 */
export async function gravarEstado(arquivo, estado, deps = {}) {
  return gravarTexto(arquivo, `${JSON.stringify(estado, null, 2)}\n`, deps).then(() => true, () => false);
}
