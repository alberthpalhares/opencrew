// O relatório do ciclo gravado pelo próprio verificador (`--relatorio`): só dentro de
// `crews/<crew>/output/`, com nome `verificacao-*.md`, em pasta que já existe. O script não cria
// pasta e não grava em nenhum outro lugar.
// Spec: fase-u3a2-entrega-no-projeto.md, §3 e regra 35 (repositório do OpenCrew).
import { existsSync, promises as fs, statSync } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';

const emUmaLinha = (valor) => String(valor).replace(/\s+/g, ' ').trim().slice(0, 200);

export const MSG = {
  invalido: (valor) => `O relatório só pode ser gravado em crews/<crew>/output/, com nome verificacao-….md. Recebi: ${emUmaLinha(valor)}.`,
  naoGravou: (caminho) => `⚠️ Não consegui gravar o relatório em ${caminho}.`,
};

const NOME = /^verificacao-.*\.md$/i;
const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * Onde o relatório pode ser gravado: o caminho absoluto, ou null quando o valor está fora da regra
 * (fora de `crews/<crew>/output/`, pelo texto ou pelo lugar real; outro nome; pasta que não existe).
 */
export function caminhoDoRelatorio(raiz, crew, valor) {
  if (!String(valor).trim()) return null;
  const saida = path.resolve(raiz, crew, 'output');
  const alvo = path.resolve(raiz, valor);
  const rel = path.relative(saida, alvo);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || !NOME.test(path.basename(alvo))) return null;
  const pasta = path.dirname(alvo);
  return ehPasta(pasta) && realDentroDe(saida, pasta) ? alvo : null;
}

/** Grava o que o script imprime (o relatório e a quebra de linha do fim). @returns {Promise<boolean>} gravou? */
export async function gravarRelatorio(alvo, relatorio) {
  try {
    await fs.writeFile(alvo, `${relatorio}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}
