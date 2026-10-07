// O que o `caminho.mjs` faz no disco: lê nomes de pastas, confere se um arquivo tem conteúdo, lê
// um arquivo e cria pastas. Nunca cria, altera nem apaga arquivo.
// Spec: fase-r3-runner-em-uso-real.md, regra 6 (repositório do OpenCrew).
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';

/** Os nomes das pastas que ficam direto em `pasta`; pasta que não existe não tem nenhuma. */
export function pastasDe(pasta) {
  try {
    return readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export function ehPasta(caminho) {
  try {
    return statSync(caminho).isDirectory();
  } catch {
    return false;
  }
}

/** É um arquivo, existe e não está vazio? */
export function temConteudo(arquivo) {
  try {
    const info = statSync(arquivo);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

export const lerTexto = (arquivo) => readFileSync(arquivo, 'utf8');

/** Cria a pasta com as pastas-mãe; pasta que já existe não é erro. */
export const criarPasta = (pasta) => { mkdirSync(pasta, { recursive: true }); };
