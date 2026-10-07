// As três marcações de documento: linha que começa por `:::` na primeira coluna. Título e
// subtítulo centralizados, quebra de página e bloco de assinaturas. O que não é uma delas fica
// como texto, igual ao que foi escrito, com aviso.
// Spec: fase-u3b-documento-word.md, regra 8 (repositório do OpenCrew).
import { lerLinha } from './linha.mjs';

const MARCACAO = /^:::\s*(\S*)\s*(.*)$/;
const CENTRO = { titulo: 'Titulo', subtitulo: 'Subtitulo' };

export const ehMarcacao = (linha) => linha.startsWith(':::');

/** Nome sem diferenciar maiúsculas e acentos: `Quebra-de-Página` → `quebra-de-pagina`. */
const normalizar = (nome) => nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** `Nome | Cargo` → `{ nome, cargo }`; sem barra, só o nome. Nada mais é interpretado. */
function pessoa(linha) {
  const barra = linha.indexOf('|');
  if (barra < 0) return { nome: linha.trim(), cargo: '' };
  return { nome: linha.slice(0, barra).trim(), cargo: linha.slice(barra + 1).trim() };
}

/** Bloco de assinaturas: vai até a linha `:::`. Sem ela, a linha de abertura fica como texto. */
function lerAssinaturas(linhas, i, estado) {
  const fim = linhas.findIndex((l, n) => n > i && l.trim() === ':::');
  if (fim < 0) {
    estado.avisos.semFim++;
    estado.texto(linhas[i]);
    return i + 1;
  }
  const pessoas = linhas.slice(i + 1, fim).filter((l) => l.trim()).map(pessoa);
  if (pessoas.length) estado.por({ tipo: 'assinaturas', pessoas });
  return fim + 1;
}

/**
 * Lê a marcação da linha `i` e devolve a linha em que o próximo bloco começa.
 * @param {string[]} linhas
 * @param {number} i
 * @param {object} estado o de `lerMarkdown`: `por`, `texto`, `quebrar` e `avisos`
 */
export function lerMarcacao(linhas, i, estado) {
  const [, nomeEscrito, resto] = MARCACAO.exec(linhas[i].trimEnd());
  const nome = normalizar(nomeEscrito);
  if (Object.hasOwn(CENTRO, nome) && resto) {
    estado.por({ tipo: 'centro', estilo: CENTRO[nome], pedacos: lerLinha(resto.trim(), estado.avisos) });
  } else if (nome === 'quebra-de-pagina' && !resto) {
    estado.quebrar();
  } else if (nome === 'assinaturas' && !resto) {
    return lerAssinaturas(linhas, i, estado);
  } else {
    estado.avisos.desconhecidas++;
    estado.texto(linhas[i]);
  }
  return i + 1;
}
