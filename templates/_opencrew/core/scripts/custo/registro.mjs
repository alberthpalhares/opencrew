// O `custo.json` de uma execução: as chamadas pagas e o total, em centavos. Só o `custo.mjs` grava, de uma
// vez (temporário + troca de nome). Ilegível vale como vazio. Duas chamadas ao mesmo tempo (lotes de imagem
// em paralelo) passam pela trava `.custo.lock`, apagada no fim: nenhuma perde a outra.
// Spec: fase-u6b-dados-e-custo.md, §4 e regra 10 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gravarTexto } from '../estado/arquivo.mjs';

export const ARQUIVO = 'custo.json';
const TRAVA = '.custo.lock';
const ESPERA_MS = 25;
const TRAVA_VELHA_MS = 4_000;
const TENTATIVAS = Math.ceil((TRAVA_VELHA_MS * 2) / ESPERA_MS);
const pausa = (ms) => new Promise((seguir) => { setTimeout(seguir, ms); });

/** O que já foi gasto na execução: `{ chamadas: [...], total }` (centavos). */
export async function lerCusto(pasta) {
  try {
    const texto = await fs.readFile(path.join(pasta, ARQUIVO), 'utf8');
    const lido = JSON.parse(texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto);
    const chamadas = Array.isArray(lido?.chamadas) ? lido.chamadas.filter((c) => Number.isInteger(c?.centavos) && c.centavos >= 0) : [];
    return { chamadas, total: chamadas.reduce((soma, c) => soma + c.centavos, 0) };
  } catch (erro) {
    // Arquivo que falta ou está cortado vale como vazio; arquivo em uso ou sem permissão sobe: não se regrava por cima.
    if (erro?.code === 'ENOENT' || erro instanceof SyntaxError) return { chamadas: [], total: 0 };
    throw erro;
  }
}

/** Roda `fazer` com a trava da pasta (arquivo criado só se não existe); trava de mais de 4 s é de processo que morreu. */
async function comTrava(pasta, fazer) {
  const trava = path.join(pasta, TRAVA);
  for (let tentativa = 0; ; tentativa++) {
    try {
      await (await fs.open(trava, 'wx')).close();
      break;
    } catch (erro) {
      if (erro?.code !== 'EEXIST' || tentativa >= TENTATIVAS) throw erro;
      const velha = await fs.stat(trava).then((info) => Date.now() - info.mtimeMs > TRAVA_VELHA_MS, () => false);
      if (velha) await fs.rm(trava, { force: true });
      else await pausa(ESPERA_MS);
    }
  }
  try {
    return await fazer();
  } finally {
    await fs.rm(trava, { force: true });
  }
}

/** Acrescenta uma chamada e grava. @returns {Promise<number>} o total depois dela, em centavos */
export function registrarChamada(pasta, { modo, itens, centavos, em }) {
  return comTrava(pasta, async () => {
    const { chamadas } = await lerCusto(pasta);
    const todas = [...chamadas, { modo, itens, centavos, em }];
    const total = todas.reduce((soma, c) => soma + c.centavos, 0);
    await gravarTexto(path.join(pasta, ARQUIVO), `${JSON.stringify({ versao: 1, chamadas: todas, total }, null, 2)}\n`);
    return total;
  });
}
