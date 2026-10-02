// Leitura para o verificador automático: frontmatter, limites dos formatos (constraints:),
// seções de um texto e proibições da memória da crew. Node puro, sem dependências.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

function valorYaml(bruto) {
  const v = bruto.trim();
  const aspas = v.match(/^"(.*)"$/) ?? v.match(/^'(.*)'$/);
  if (aspas) return aspas[1].replace(/\\"/g, '"');
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

/** Frontmatter YAML simples: `chave: valor` e um nível de bloco (ex.: `constraints:`). */
export function lerFrontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const dados = {};
  let bloco = null;
  for (const linha of m[1].split(/\r?\n/)) {
    const topo = linha.match(/^([\w-]+):\s*(.*)$/);
    if (topo) {
      const [, chave, valor] = topo;
      bloco = valor.trim() === '' ? chave : null;
      dados[chave] = bloco ? {} : valorYaml(valor);
      continue;
    }
    const filho = linha.match(/^\s+([\w-]+):\s*(.*)$/);
    if (filho && bloco) dados[bloco][filho[1]] = valorYaml(filho[2]);
  }
  return dados;
}

/** Corpo do texto sem o frontmatter. */
export function semFrontmatter(texto) {
  return texto.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/** Limites do formato: `constraints:` de `_opencrew/core/best-practices/<id>.md`. */
export async function lerLimites(raiz, formatoId) {
  const arquivo = path.join(raiz, '_opencrew', 'core', 'best-practices', `${formatoId}.md`);
  if (!existsSync(arquivo)) return null;
  return lerFrontmatter(await readFile(arquivo, 'utf8'))?.constraints ?? {};
}

/**
 * Seções por cabeçalho markdown. O corpo vai até o próximo cabeçalho de nível igual ou
 * maior, ou até uma linha `---` (separador).
 */
export function lerSecoes(texto) {
  const linhas = semFrontmatter(texto).split(/\r?\n/);
  const secoes = [];
  linhas.forEach((linha, i) => {
    const h = linha.match(/^(#{1,6})\s+(.*)$/);
    if (!h) return;
    const nivel = h[1].length;
    const corpo = [];
    for (const seguinte of linhas.slice(i + 1)) {
      const h2 = seguinte.match(/^(#{1,6})\s/);
      if ((h2 && h2[1].length <= nivel) || /^---\s*$/.test(seguinte)) break;
      corpo.push(seguinte);
    }
    secoes.push({ titulo: h[2].trim(), nivel, corpo: corpo.join('\n').trim() });
  });
  return secoes;
}

const semAcento = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export { semAcento };

const ASPAS = /"([^"]+)"|“([^”]+)”|‘([^’]+)’|`([^`]+)`|(?<![\p{L}])'([^']+)'(?![\p{L}])/gu;

/**
 * Termos proibidos: o que estiver entre aspas nos itens de `## Proibições Explícitas`
 * do `memories.md` da crew. Itens sem aspas são contados, mas não verificados.
 */
export async function lerProibicoes(raiz, crew) {
  const arquivo = path.join(raiz, crew, '_memory', 'memories.md');
  if (!existsSync(arquivo)) return { existe: false, termos: [], semAspas: 0 };
  const secao = lerSecoes(await readFile(arquivo, 'utf8'))
    .find((s) => s.nivel === 2 && semAcento(s.titulo).startsWith('proibicoes explicitas'));
  const termos = [];
  let semAspas = 0;
  for (const linha of (secao?.corpo ?? '').split('\n').filter((l) => /^\s*[-*]\s+/.test(l))) {
    const achados = [...linha.matchAll(ASPAS)].map((m) => m.slice(1).find(Boolean));
    if (achados.length) termos.push(...achados);
    else semAspas += 1;
  }
  return { existe: true, termos, semAspas };
}

/** Domínio do site da empresa (para separar links internos de externos), se houver. */
export async function lerDominioDoSite(raiz) {
  const arquivo = path.join(raiz, '_opencrew', '_memory', 'company.md');
  if (!existsSync(arquivo)) return null;
  const m = (await readFile(arquivo, 'utf8')).match(/(?:site|website)[^\n]*?https?:\/\/([^\s/)>\]]+)/i);
  return m ? m[1].replace(/^www\./, '').toLowerCase() : null;
}
