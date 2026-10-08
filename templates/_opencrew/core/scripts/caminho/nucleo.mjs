// Núcleo do `caminho.mjs`: as regras de caminho de uma execução, em funções puras. Não toca em
// disco nem em processo (quem lê pastas e arquivos é `disco.mjs`).
// Spec: fase-r3-runner-em-uso-real.md, regras 2 a 5 (repositório do OpenCrew).

export const ACOES = ['pasta', 'saida', 'entrada', 'conferir'];

/** Os motivos de `CAMINHO:REPROVADO`, na ordem em que são conferidos (§6 da spec). */
export const MOTIVO = {
  ausente: 'arquivo ausente ou vazio',
  secoes: (achadas, minimo) => `${achadas} seções, mínimo ${minimo}`,
  tldr: 'falta a seção TL;DR',
};

/** Caminho como o script o compara e devolve: com `/`, sem `./` na frente e sem barra dobrada. */
export const normalizar = (caminho) => String(caminho).replace(/\\/g, '/').replace(/^(?:\.\/+)+/, '').replace(/\/{2,}/g, '/');

/**
 * Regra 2 — o caminho da execução. Caminho declarado que começa por `crews/<crew>/output/` ganha
 * `<run>/` logo depois de `output/`.
 * @returns {{ grupo: string, nome: string } | null} o grupo (a pasta do arquivo, já com o run) e
 *   o nome do arquivo; `null` quando o caminho não é de `output/` (volta como veio)
 */
export function naExecucao(declarado, crew, run) {
  const saida = `crews/${crew}/output/`;
  const caminho = normalizar(declarado);
  if (!caminho.startsWith(saida)) return null;
  const partes = caminho.slice(saida.length).split('/');
  const nome = partes.pop();
  return { grupo: [`${saida}${run}`, ...partes].join('/'), nome };
}

const dois = (n) => String(n).padStart(2, '0');

/**
 * O nome de uma execução nova: `AAAA-MM-DD-HHmmss` na hora local; se já existe pasta com esse
 * nome, `-2`, `-3`… (spec fase-u5a-polimento-do-uso.md, decisão 2).
 * @param {Date} agora · @param {string[]} existentes as pastas que já estão em `output/`
 */
export function novoRun(agora, existentes) {
  const base = `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}-${dois(agora.getHours())}${dois(agora.getMinutes())}${dois(agora.getSeconds())}`;
  const usados = new Set(existentes);
  for (let n = 1; ; n++) {
    const nome = n === 1 ? base : `${base}-${n}`;
    if (!usados.has(nome)) return nome;
  }
}

/** O número de uma pasta de versão (`v` + número), ou `null` para qualquer outro nome. */
function numero(nome) {
  const [, digitos] = /^v(\d{1,9})$/.exec(nome) ?? [];
  return digitos === undefined ? null : Number(digitos);
}

/** As pastas de versão, da mais nova para a mais antiga, em ordem numérica (`v10` antes de `v9`). */
export function daMaisNova(nomes) {
  return nomes.filter((nome) => numero(nome) !== null).sort((a, b) => numero(b) - numero(a));
}

/** Regra 3 — a versão em que o passo grava: a maior `vN` do grupo mais 1; sem nenhuma, `v1`. */
export function proximaVersao(nomes) {
  const [maior] = daMaisNova(nomes);
  return `v${maior ? numero(maior) + 1 : 1}`;
}

/**
 * Regra 5 — o que falta no texto de um arquivo gravado, pelo primeiro motivo da §6.
 * @param {string} texto o conteúdo do arquivo (que já existe e não está vazio)
 * @param {{ secoes?: number|null, tldr?: boolean }} pedido
 * @returns {string|null} o motivo, ou `null` quando o arquivo passa
 */
export function motivoDeReprovacao(texto, { secoes = null, tldr = false } = {}) {
  const linhas = (texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto).split(/\r?\n/);
  const achadas = linhas.filter((linha) => linha.startsWith('## ')).length;
  if (secoes !== null && achadas < secoes) return MOTIVO.secoes(achadas, secoes);
  if (tldr && !linhas.some((linha) => linha.startsWith('## TL;DR'))) return MOTIVO.tldr;
  return null;
}
