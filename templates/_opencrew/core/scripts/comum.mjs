// Validações e mensagens de erro de uso comuns aos scripts do runtime (verificar,
// conferir-fontes…). Node puro, sem dependências.
// Spec: specs/fase-r1-reparos-1-6-1.md, regra 13 (repositório do OpenCrew).
import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MSG = {
  faltaOpcao: (opcao) => `Falta a opção obrigatória ${opcao}.`,
  semRaiz: 'Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.',
  foraDoProjeto: (caminho) => `Caminho fora do projeto: ${caminho}`,
  crewNaoEncontrada: (crew) => `Crew não encontrada: ${crew}`,
};

/** O caminho (relativo à raiz ou absoluto) fica dentro da raiz do projeto? */
export function dentroDoProjeto(raiz, caminho) {
  const rel = path.relative(raiz, path.resolve(raiz, caminho));
  return !(rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel));
}

/**
 * O script foi chamado direto (`node …/script.mjs`)? Compara os caminhos reais: com o projeto
 * aberto por uma junção ou um link de pasta, o Node resolve o link em `import.meta.url` e não em
 * `process.argv[1]`, e a comparação dos textos daria falso — o script sairia sem imprimir nada.
 */
export function ehPrincipal(metaUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}

const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * Erro de uso, na ordem da regra 13: opção obrigatória faltando → pasta atual sem `_opencrew/`
 * → crew ou caminho fora do projeto (antes de testar se existe) → crew inexistente.
 * @returns {string|null} a mensagem em PT-BR, ou null quando está tudo certo
 */
export function erroDeUso({ raiz, faltando = [], crew, caminhos = [] }) {
  if (faltando.length) return MSG.faltaOpcao(faltando[0]);
  if (!ehPasta(path.join(raiz, '_opencrew'))) return MSG.semRaiz;
  const fora = [crew, ...caminhos].find((c) => !dentroDoProjeto(raiz, c));
  if (fora) return MSG.foraDoProjeto(fora);
  if (!ehPasta(path.resolve(raiz, crew))) return MSG.crewNaoEncontrada(crew);
  return null;
}
