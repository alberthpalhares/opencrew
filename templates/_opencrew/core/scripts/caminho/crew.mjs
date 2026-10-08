// Onde fica a crew de um comando (`caminho.mjs`, `execucao.mjs`): uma pasta direta de `crews/`.
// Spec: fase-r3-runner-em-uso-real.md, §3 (repositório do OpenCrew).
import path from 'node:path';
import { MSG, dentroDoProjeto } from '../comum.mjs';
import { limpar } from './argumentos.mjs';
import { ehPasta } from './disco.mjs';

/**
 * @param {string} raiz a pasta do projeto · @param {string} escrito o nome da crew (`crews/<nome>` também vale)
 * @returns {{ erro: string } | { crew: string }} o erro de uso, ou o nome da pasta da crew
 */
export function acharCrew(raiz, escrito) {
  if (!ehPasta(path.join(raiz, '_opencrew'))) return { erro: MSG.semRaiz };
  const base = path.resolve(raiz, 'crews');
  const nome = escrito.replace(/^crews[\\/]+/, '');
  if (!dentroDoProjeto(base, nome)) return { erro: MSG.foraDoProjeto(limpar(escrito)) };
  const pasta = path.resolve(base, nome);
  if (path.dirname(pasta) !== base || !ehPasta(pasta)) return { erro: MSG.crewNaoEncontrada(limpar(escrito)) };
  return { crew: path.basename(pasta) };
}
