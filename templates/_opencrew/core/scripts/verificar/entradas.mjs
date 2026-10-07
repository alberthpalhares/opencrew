// As entradas da lista do verificador: cada item com o formato declarado, uma vez só, e o nome
// com que o arquivo aparece no relatório.
import path from 'node:path';
import { relativoAoProjeto } from '../comum.mjs';

/** Item da lista → `{ arquivo, formato }`; só o objeto traz formato declarado. */
export function normalizar(entrada) {
  if (typeof entrada === 'string') return { arquivo: entrada, formato: null };
  return { arquivo: entrada.arquivo, formato: entrada.formato || null };
}

/** O mesmo arquivo citado duas vezes, com o mesmo formato, é verificado (e contado) uma vez só. */
export function semRepetidas(raiz, entradas) {
  const vistas = new Set();
  return entradas.filter((e) => {
    const chave = `${path.resolve(raiz, e.arquivo)}|${e.formato ?? ''}`;
    return !vistas.has(chave) && vistas.add(chave);
  });
}

/** No relatório, o absoluto de dentro do projeto (também por link, junção ou nome curto) sai como o relativo. */
export function nomeNoRelatorio(raiz, arquivo) {
  const relativo = relativoAoProjeto(raiz, arquivo);
  const comoEscrito = !path.isAbsolute(arquivo) && path.resolve(raiz, relativo) === path.resolve(raiz, arquivo);
  return comoEscrito ? arquivo : relativo;
}