// O que o `/estado` do escritório devolve: o estado de cada crew, lido do disco a cada pedido.
// Só lê; quem grava `crews/<crew>/state.json` é o `estado.mjs`.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MARCA_DE_ORDEM = 0xfeff; // alguns editores e terminais gravam essa marca no início do arquivo

/** O estado de uma crew, ou null: arquivo ausente, pela metade, inválido ou sem `agents` em lista. */
async function lerCrew(raiz, crew) {
  try {
    const texto = await fs.readFile(path.join(raiz, 'crews', crew, 'state.json'), 'utf8');
    const estado = JSON.parse(texto.charCodeAt(0) === MARCA_DE_ORDEM ? texto.slice(1) : texto);
    return Array.isArray(estado?.agents) ? { crew, estado } : null;
  } catch {
    return null;
  }
}

/** `updatedAt` em milissegundos; ausente ou ilegível vale 0 (a crew vai para o fim). */
const atualizadaEm = ({ estado }) => Date.parse(estado.updatedAt) || 0;

/**
 * As crews de `crews/` que têm estado legível, a de `updatedAt` mais recente primeiro. Os nomes
 * vêm da pasta, nunca do pedido. Sem a pasta `crews/`, ou sem nenhum estado: lista vazia.
 * @returns {Promise<Array<{ crew: string, estado: object }>>}
 */
export async function lerCrews(raiz) {
  const nomes = await fs.readdir(path.join(raiz, 'crews')).catch(() => []);
  const lidas = await Promise.all(nomes.sort().map((nome) => lerCrew(raiz, nome)));
  return lidas.filter(Boolean).sort((a, b) => atualizadaEm(b) - atualizadaEm(a));
}
