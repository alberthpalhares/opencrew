// Validações e mensagens de erro de uso comuns aos scripts do runtime (verificar,
// conferir-fontes…). Node puro, sem dependências.
// Specs: specs/fase-r1-reparos-1-6-1.md, regra 13, e specs/fase-r2-update-e-envio-seguros.md,
// regra 23 (repositório do OpenCrew).
import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MSG = {
  faltaOpcao: (opcao) => `Falta a opção obrigatória ${opcao}.`,
  semRaiz: 'Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto.',
  foraDoProjeto: (caminho) => `Caminho fora do projeto: ${caminho}`,
  crewNaoEncontrada: (crew) => `Crew não encontrada: ${crew}`,
};

/** Caminho de rede: começa por duas barras (`\\` ou `//`), em qualquer sistema. Nunca vai ao disco. */
export const ehDeRede = (caminho) => /^[\\/]{2}/.test(caminho);

/** Pelo texto: `alvo` é a `pasta` ou fica dentro dela? */
function contem(pasta, alvo) {
  const rel = path.relative(pasta, alvo);
  return !(rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel));
}

/**
 * Lugar real de um caminho: link, junção e nome curto resolvidos. O trecho que ainda não existe é
 * juntado, como foi escrito, à pasta mais funda que existe. Caminho de rede não é consultado: vale
 * o texto.
 */
export function lugarReal(caminho) {
  const abs = path.resolve(caminho);
  if (ehDeRede(caminho) || ehDeRede(abs)) return abs;
  try {
    return realpathSync.native(abs);
  } catch {
    const pai = path.dirname(abs);
    return pai === abs ? abs : path.join(lugarReal(pai), path.basename(abs));
  }
}

/** Pelo lugar real: `caminho` é a `pasta` ou fica dentro dela? */
export const realDentroDe = (pasta, caminho) => contem(lugarReal(pasta), lugarReal(caminho));

/**
 * O caminho (relativo à raiz ou absoluto) fica dentro do projeto? Sim quando o texto ou o lugar
 * real diz "dentro"; não, só quando os dois dizem "fora" (regra 23). Raiz e caminho são resolvidos
 * pela mesma função, e o lugar real só é consultado quando o texto diz "fora". Caminho de rede só
 * vale pelo texto, com o projeto também na rede: o disco não é tocado, em nenhum sistema.
 */
export function dentroDoProjeto(raiz, caminho) {
  const alvo = path.resolve(raiz, caminho);
  if (ehDeRede(caminho)) return ehDeRede(raiz) && contem(raiz, alvo);
  return contem(raiz, alvo) || realDentroDe(raiz, alvo);
}

/**
 * Caminho de dentro do projeto, relativo à raiz e com `/`: pelo texto quando o texto já fica
 * dentro; senão, pelo lugar real (link, junção ou nome curto que leva ao projeto).
 */
export function relativoAoProjeto(raiz, caminho) {
  const alvo = path.resolve(raiz, caminho);
  const [de, para] = contem(raiz, alvo) ? [raiz, alvo] : [lugarReal(raiz), lugarReal(alvo)];
  return path.relative(de, para).split(path.sep).join('/');
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
