// Nome de cada arquivo da entrega: peças do mesmo tipo no mesmo canal são numeradas; cópia cujo
// nome já existe na pasta ganha o prefixo `2-`, `3-`. Nenhum arquivo é gravado por cima de outro.
// Spec: fase-u3a-entrega-por-canal.md, regras 7 e 8, citadas pela fatia 1 (repositório do OpenCrew).

export const MSG = {
  mesmoNome: (arquivo, novo) => `${arquivo} tem o mesmo nome de outro e foi guardado como ${novo}.`,
};

const chave = (pasta, nome) => `${pasta}/${nome.toLowerCase()}`;

/** Arquivos das unidades: `post.txt` quando há uma só no canal; `post-1.txt`, `post-1-comentario.txt`… com várias. */
function nomearUnidades(unidades) {
  const total = {};
  for (const u of unidades) total[`${u.pasta}|${u.tipo}`] = (total[`${u.pasta}|${u.tipo}`] ?? 0) + 1;
  const vez = {};
  return unidades.flatMap((u) => {
    const grupo = `${u.pasta}|${u.tipo}`;
    vez[grupo] = (vez[grupo] ?? 0) + 1;
    const numero = total[grupo] > 1 ? `-${vez[grupo]}` : '';
    return u.partes.map((parte) => ({
      pasta: u.pasta, nome: `${parte.nome}${numero}${parte.sufixo}.${parte.ext}`, tipo: parte.tipo, texto: parte.texto,
      origem: u.origem, formato: u.formato, titulo: numero ? u.titulo ?? null : null, numerado: Boolean(numero), ordem: u.ordem, total: u.total,
    }));
  });
}

/** Cópias agrupadas por pasta da entrega e, dentro dela, por pasta de origem, na ordem da lista. */
function grupos(copias) {
  const porChave = new Map();
  for (const c of copias) {
    const id = `${c.pasta}|${c.pastaDeOrigem}`;
    if (!porChave.has(id)) porChave.set(id, { pasta: c.pasta, copias: [] });
    // O mesmo arquivo listado duas vezes para a mesma pasta é uma cópia só.
    if (!porChave.get(id).copias.some((outra) => outra.nome === c.nome)) porChave.get(id).copias.push(c);
  }
  return [...porChave.values()];
}

/** O menor prefixo, a partir de `n-`, com que nenhum nome do grupo bate com um nome já usado. */
function prefixoLivre(grupo, usados, n) {
  while (grupo.copias.some((c) => usados.has(chave(grupo.pasta, `${n}-${c.nome}`)))) n += 1;
  return n;
}

/**
 * Cópias com o nome original. Quando um arquivo chegaria a uma pasta onde já há outro com esse
 * nome, todos os que vêm da mesma pasta de origem ganham o prefixo (`2-`; os da pasta seguinte,
 * `3-`). O aviso sai para cada arquivo cujo nome batia.
 */
function nomearCopias(copias, usados) {
  const arquivos = [];
  const avisos = [];
  const proximo = {};
  for (const grupo of grupos(copias)) {
    const bate = (c) => usados.has(chave(grupo.pasta, c.nome));
    const n = grupo.copias.some(bate) ? prefixoLivre(grupo, usados, proximo[grupo.pasta] ?? 2) : null;
    if (n) proximo[grupo.pasta] = n + 1;
    for (const c of grupo.copias) {
      const nome = n ? `${n}-${c.nome}` : c.nome;
      if (n && bate(c)) avisos.push({ pasta: c.pasta, texto: MSG.mesmoNome(c.origem, nome) });
      arquivos.push({ ...c, nome });
    }
    for (const a of arquivos.slice(-grupo.copias.length)) usados.add(chave(a.pasta, a.nome));
  }
  return { arquivos, avisos };
}

/**
 * @param {{ unidades: object[], copias: object[], avisos: object[] }} produtos o que `separar` devolve
 * @returns {{ arquivos: object[], avisos: object[] }} `arquivos`: `{ pasta, nome, tipo, origem,
 *   texto | de, … }`, na ordem da lista (as peças antes das cópias), sem dois com o mesmo caminho
 */
export function nomear({ unidades, copias, avisos }) {
  const gerados = nomearUnidades(unidades);
  const usados = new Set(gerados.map((a) => chave(a.pasta, a.nome)));
  const copiados = nomearCopias(copias, usados);
  return { arquivos: [...gerados, ...copiados.arquivos], avisos: [...avisos, ...copiados.avisos] };
}
