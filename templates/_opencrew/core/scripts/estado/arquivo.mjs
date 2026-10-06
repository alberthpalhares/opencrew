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
 * Grava o estado num temporário da mesma pasta (`state.json.<pid>.tmp`) e troca o nome: quem lê
 * vê o arquivo antigo ou o novo, nunca um pela metade.
 * @param {string} arquivo caminho do `state.json`
 * @param {object} estado
 * @param {{ renomear?: Function, esperar?: Function }} [deps] SÓ PARA TESTE: a troca de nome
 *   (`(de, para) => Promise`) e a espera entre as tentativas (`(ms) => Promise`)
 * @returns {Promise<boolean>} `false` quando desistiu: o arquivo fica como estava e o temporário é apagado
 */
export async function gravarEstado(arquivo, estado, deps = {}) {
  const temporario = `${arquivo}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporario, `${JSON.stringify(estado, null, 2)}\n`);
    await trocarNome(temporario, arquivo, deps);
    return true;
  } catch {
    await fs.rm(temporario, { force: true }).catch(() => {});
    return false;
  }
}
