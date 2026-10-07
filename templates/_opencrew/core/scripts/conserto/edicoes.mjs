// As edições do conserto, como funções de texto: cada uma muda só a linha que o item pede e
// devolve o resto igual, byte a byte (fim de linha, BOM, comentários e ordem das chaves).
// Spec: fase-u4a-conserto-de-crews.md, regras 3 e 4 (repositório do OpenCrew).

import { lerFrontmatter, semBom } from '../verificar/leitura.mjs';

const BOM = String.fromCharCode(0xfeff);
const emLinhas = (texto) => texto.split(/(?<=\n)/);
const fimDe = (linha) => linha.match(/\r?\n$/)?.[0] ?? '';
const eolDe = (texto) => (texto.includes('\r\n') ? '\r\n' : '\n');
const ehCerca = (linha) => /^\uFEFF?---\s*$/.test(linha);

const semAspas = (v) => v.replace(/\r?\n$/, '').replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2');

/** A linha da chave tem o valor nela mesma? ("não" quando ele continua nas linhas de baixo) */
function valorNaLinha(linhas, i, fim) {
  const valor = semAspas(linhas[i].slice(linhas[i].indexOf(':') + 1));
  const continua = i + 1 < fim && /^(?:\s+\S|-\s)/.test(linhas[i + 1]);
  return valor !== '' && !/^[>|][+-]?$/.test(valor) && !continua;
}

/**
 * O frontmatter do arquivo com `chave: valor`. A linha da chave é trocada no lugar; se não existe,
 * entra depois da linha `depoisDe:` ou, na falta dela, no fim do frontmatter. Valor que já é o
 * pedido (com aspas ou comentário): o texto volta igual.
 * @returns {string|null} null quando o arquivo não tem frontmatter, ou quando o valor da chave
 *   ocupa mais de uma linha (o script não reescreve um bloco)
 */
export function comChave(texto, chave, valor, depoisDe) {
  const linhas = emLinhas(texto);
  const fim = linhas.findIndex((l, i) => i > 0 && ehCerca(l));
  if (!linhas.length || !ehCerca(linhas[0]) || fim < 0 || !lerFrontmatter(semBom(texto))) return null;
  const eol = fimDe(linhas[0]) || eolDe(texto);
  const acha = (nome) => linhas.findIndex((l, i) => i > 0 && i < fim && new RegExp(`^${nome}\\s*:`).test(l));
  const nova = `${chave}: ${valor}${eol}`;
  const atual = acha(chave);
  if (atual < 0) linhas.splice(depoisDe && acha(depoisDe) >= 0 ? acha(depoisDe) + 1 : fim, 0, nova);
  else if (!valorNaLinha(linhas, atual, fim)) return null;
  else if (semAspas(linhas[atual].slice(linhas[atual].indexOf(':') + 1)) === semAspas(valor)) return texto;
  else linhas[atual] = nova;
  return linhas.join('');
}

/** O arquivo com `# titulo` na primeira linha de título de nível 1 depois do frontmatter; sem ela, o texto igual. */
export function comTitulo(texto, titulo) {
  const linhas = emLinhas(texto);
  const fim = ehCerca(linhas[0] ?? '') ? linhas.findIndex((l, i) => i > 0 && ehCerca(l)) : -1;
  const i = linhas.findIndex((l, n) => n > fim && /^# /.test(l));
  if (i >= 0) linhas[i] = `# ${titulo}${fimDe(linhas[i])}`;
  return linhas.join('');
}

/** Valor de YAML: como está quando é simples; entre aspas quando tem `: `, `#` ou aspas. */
const escrito = (valor) => (/^[^\s"'#[\]{}&*!|>%@`-][^"#\r\n]*$/u.test(valor) && !/:\s|\s$/.test(valor) ? valor : JSON.stringify(valor));
const normal = (c) => c.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/\/+$/, '');
const mesmoCaminho = (a, b) => normal(a) === normal(b);
const CAMINHO = /^[ \t]*(?:-[ \t]*)?caminho:[ \t]*(.*)$/;

/** Onde começa e acaba a lista de `fontes:` (a linha da chave e a última linha do bloco), ou null. */
function blocoDeFontes(linhas) {
  const inicio = linhas.findIndex((l) => /^fontes\s*:/.test(l.replace(BOM, '')));
  if (inicio < 0) return null;
  let fim = inicio;
  for (let i = inicio + 1; i < linhas.length && (!linhas[i].trim() || /^(?:\s|-\s)/.test(linhas[i])); i++) {
    if (linhas[i].trim()) fim = i;
  }
  return { inicio, fim };
}

/**
 * O `crew.yaml` com mais uma fonte, no formato que o Build grava. Fonte que já está: texto igual.
 * @returns {string|null} null quando `fontes:` está escrita numa linha só (`fontes: [{…}]`): o
 *   script não reescreve essa forma
 */
export function comFonte(texto, caminho, paraQue) {
  const eol = eolDe(texto);
  const linhas = emLinhas(texto);
  const bloco = blocoDeFontes(linhas);
  const naLinha = bloco ? semAspas(linhas[bloco.inicio].slice(linhas[bloco.inicio].indexOf(':') + 1)) : '';
  if (naLinha && naLinha !== '[]') return null;
  const daLista = bloco ? linhas.slice(bloco.inicio + 1, bloco.fim + 1).map((l) => l.replace(/\r?\n$/, '')) : [];
  if (daLista.some((l) => CAMINHO.test(l) && mesmoCaminho(semAspas(l.match(CAMINHO)[1]), caminho))) return texto;
  const recuo = daLista.find((l) => /^\s*-\s/.test(l))?.match(/^\s*/)[0] ?? '  ';
  const item = [`${recuo}- caminho: ${escrito(caminho)}${eol}`, `${recuo}  para_que: ${escrito(paraQue)}${eol}`];
  if (!bloco) return `${texto}${texto && !fimDe(texto) ? eol : ''}${texto.trim() ? eol : ''}fontes:${eol}${item.join('')}`;
  if (naLinha === '[]') linhas[bloco.inicio] = `fontes:${fimDe(linhas[bloco.inicio]) || eol}`;
  if (!fimDe(linhas[bloco.fim])) linhas[bloco.fim] += eol;
  linhas.splice(bloco.fim + 1, 0, ...item);
  return linhas.join('');
}

/** A linha `indice` com `sufixo` no fim, antes do fim de linha. */
export function comSufixo(texto, indice, sufixo) {
  const linhas = emLinhas(texto);
  const fim = fimDe(linhas[indice]);
  linhas[indice] = `${linhas[indice].slice(0, linhas[indice].length - fim.length).trimEnd()}${sufixo}${fim}`;
  return linhas.join('');
}

/** Os campos de uma linha de CSV: aspas duplas protegem vírgula e espaço; `""` é uma aspa. */
function campos(linha) {
  const saida = [];
  const rx = /(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g;
  for (const m of linha.matchAll(rx)) saida.push(m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2].trim());
  return saida;
}

/** O manifesto lido: as colunas e uma linha por agente (`{ coluna: valor }`). */
export function lerCsv(texto) {
  const linhas = (texto ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  const colunas = linhas.length ? campos(linhas[0]) : [];
  return { colunas, linhas: linhas.slice(1).map((l) => Object.fromEntries(campos(l).map((v, i) => [colunas[i] ?? `c${i}`, v]))) };
}

export const COLUNAS = ['id', 'displayName', 'title', 'icon', 'path', 'execution'];
const campo = (v) => (/[\s,"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * O manifesto refeito a partir dos agentes: as 6 colunas, na ordem do manifesto antigo (agente novo
 * vai para o fim); `execution` vem do agente, depois do manifesto antigo, depois `inline`.
 */
export function montarCsv(agentes, antigo) {
  const velho = lerCsv(antigo);
  const ordem = (a) => { const i = velho.linhas.findIndex((l) => l.id === a.id); return i < 0 ? Infinity : i; };
  const emOrdem = [...agentes].sort((a, b) => ordem(a) - ordem(b));
  const eol = antigo ? eolDe(antigo) : '\n';
  const linha = (a) => {
    const antes = velho.linhas.find((l) => l.id === a.id) ?? {};
    const d = a.dados;
    return [a.id, d.name ?? '', d.title ?? antes.title ?? '', d.icon ?? antes.icon ?? '', `./agents/${a.id}.agent.md`, d.execution ?? antes.execution ?? 'inline'].map((v) => campo(String(v))).join(',');
  };
  return [COLUNAS.join(','), ...emOrdem.map(linha), ''].join(eol);
}
