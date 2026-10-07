// Proibições da memória da crew: os itens de `## Proibições Explícitas` do `memories.md`.
// Numa linha, vale como proibido o termo entre aspas até o primeiro marcador de troca; o que vem
// depois do marcador é termo preferido. Spec: fase-r1-reparos-1-6-1.md, regra 11.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { lerTexto, semAcento } from './leitura.mjs';

// Entre aspas retas o termo não começa nem acaba por espaço ou aspa: `""` e a polegada de `15"`
// não abrem um par, e o termo de verdade, mais adiante na linha, continua sendo lido.
const ASPAS = /"([^\s"](?:[^"]{0,198}[^\s"])?)"|“([^”]{1,200})”|‘([^’]{1,200})’|`([^`]{1,200})`|(?<![\p{L}])'([^']{1,200})'(?![\p{L}])/gu;
const MARCADORES = new Set(['prefira', 'preferir', 'use', 'usar', 'utilize', 'utilizar', '→', '->']);
const NEGACOES = new Set('nao nunca nem jamais sem evite evitar proibido proibida proibidos proibidas vetado vetada parar pare deixar deixe'.split(' '));
// Com estas expressões a linha está escrita ao contrário: todos os termos continuam proibidos.
const SEM_TROCA = /(?<![\p{L}\p{N}])(?:em vez de|ao inves de|no lugar de)(?![\p{L}\p{N}])/u;
// Começo de um item de lista: `-`, `*`, `+` ou numerado.
const MARCA_DE_ITEM = /^\s*(?:[-*+]|\d{1,3}[.)])\s+/;

/** Fichas da linha, na ordem: termos entre aspas, e palavras e setas de fora das aspas. */
function fichas(linha) {
  const saida = [];
  let pos = 0;
  const deFora = (ate) => {
    for (const m of linha.slice(pos, ate).matchAll(/[\p{L}\p{N}]+|→|->/gu)) {
      saida.push({ palavra: semAcento(m[0]), fim: pos + m.index + m[0].length });
    }
  };
  for (const m of linha.matchAll(ASPAS)) {
    deFora(m.index);
    saida.push({ termo: m.slice(1).find(Boolean), inicio: m.index });
    pos = m.index + m[0].length;
  }
  deFora(linha.length);
  return saida;
}

/** `por` só é marcador logo antes de um termo entre aspas. */
function ehMarcador(f, i, linha) {
  const { palavra, fim } = f[i];
  if (MARCADORES.has(palavra)) return true;
  const depois = f[i + 1];
  return palavra === 'por' && depois?.termo != null && linha.slice(fim, depois.inicio).trim() === '';
}

/** Há negação entre as 3 palavras antes do marcador? A procura para no termo entre aspas anterior. */
function negado(f, i) {
  for (let n = 1; n <= 3 && f[i - n]?.palavra; n++) {
    if (NEGACOES.has(f[i - n].palavra)) return true;
  }
  return false;
}

/** Posição do primeiro marcador de troca que vale: depois do primeiro termo e sem negação antes. */
function primeiroMarcador(f, linha) {
  const primeiroTermo = f.findIndex((x) => x.termo != null);
  const deFora = f.filter((x) => x.palavra).map((x) => x.palavra).join(' ');
  if (primeiroTermo < 0 || SEM_TROCA.test(deFora)) return -1;
  return f.findIndex((x, i) => i > primeiroTermo && x.palavra && ehMarcador(f, i, linha) && !negado(f, i));
}

/** Termos proibidos e termos preferidos de uma linha de proibição. */
export function lerLinha(linha) {
  const f = fichas(linha);
  const corte = primeiroMarcador(f, linha);
  const termos = (de, ate) => f.slice(de, ate).filter((x) => x.termo != null).map((x) => x.termo);
  return corte < 0 ? { proibidos: termos(0), preferidos: [] } : { proibidos: termos(0, corte), preferidos: termos(corte) };
}

/**
 * Itens de lista (`-`, `*`, `+` ou numerada) da seção "Proibições Explícitas" — cabeçalho de
 * nível 2 a 4, com ou sem símbolo antes do texto —, até o próximo cabeçalho do mesmo nível ou
 * acima, ou até uma linha `---`.
 */
function itensDaSecao(texto) {
  const linhas = texto.split(/\r?\n/);
  const titulos = linhas.map((l) => l.match(/^(#{2,4})\s+(.*)$/s));
  const inicio = titulos.findIndex((t) => t && semAcento(t[2]).replace(/^[^\p{L}\p{N}]+/u, '').startsWith('proibicoes explicitas'));
  if (inicio < 0) return [];
  const acima = new RegExp(`^#{1,${titulos[inicio][1].length}}\\s`);
  const fim = linhas.findIndex((l, i) => i > inicio && (acima.test(l) || l.trim() === '---'));
  const daSecao = linhas.map((texto, indice) => ({ texto, indice })).slice(inicio + 1, fim < 0 ? linhas.length : fim);
  return daSecao.filter((l) => MARCA_DE_ITEM.test(l.texto));
}

/**
 * Item que o usuário deixou para o revisor: termina em "(revisão humana)" ou começa por "Sem trava
 * automática". Não é trava de texto nem pendência. Spec: fase-u4a-conserto-de-crews.md, regra 8.
 */
export function ehRevisaoHumana(linha) {
  const item = semAcento(linha.replace(MARCA_DE_ITEM, '')).trim();
  return item.endsWith('(revisao humana)') || item.startsWith('sem trava automatica');
}

/**
 * Os itens da seção de proibições, numerados a partir de 1 na ordem do arquivo.
 * @returns {Array<{ n: number, indice: number, texto: string, pendente: boolean }>} `indice`: a
 *   linha no arquivo · `texto`: o item sem a marca de lista · `pendente`: sem termo entre aspas e
 *   sem a marca de revisão humana
 */
export function itensDeProibicao(texto) {
  return itensDaSecao(texto).map((l, i) => {
    const { proibidos, preferidos } = lerLinha(l.texto);
    const pendente = !proibidos.length && !preferidos.length && !ehRevisaoHumana(l.texto);
    return { n: i + 1, indice: l.indice, texto: l.texto.replace(MARCA_DE_ITEM, '').trim(), pendente };
  });
}

/**
 * Proibições da crew. Itens sem aspas são contados, mas não verificados.
 * @returns {Promise<{ existe: boolean, termos: string[], preferidos: string[], semAspas: number }>}
 */
export async function lerProibicoes(raiz, crew) {
  // `resolve`, não `join`: a crew pode vir em caminho absoluto de dentro do projeto.
  const arquivo = path.resolve(raiz, crew, '_memory', 'memories.md');
  const r = { existe: existsSync(arquivo), termos: [], preferidos: [], semAspas: 0 };
  if (!r.existe) return r;
  for (const { texto: linha } of itensDaSecao(await lerTexto(arquivo))) {
    const { proibidos, preferidos } = lerLinha(linha);
    if (!proibidos.length && !preferidos.length && !ehRevisaoHumana(linha)) r.semAspas += 1;
    r.termos.push(...proibidos);
    r.preferidos.push(...preferidos);
  }
  const proibido = new Set(r.termos.map(semAcento));
  r.preferidos = r.preferidos.filter((t) => !proibido.has(semAcento(t)));
  return r;
}
