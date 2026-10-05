// Leitura para o verificador automático: texto sem a marca de início de arquivo (BOM),
// frontmatter, limites dos formatos (constraints:) e domínio do site. Node puro, sem dependências.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** Tira a marca invisível de início de arquivo (BOM), se houver. */
export const semBom = (texto) => (texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto);

/** Lê um arquivo de texto em UTF-8, sem o BOM. */
export async function lerTexto(arquivo) {
  return semBom(await readFile(arquivo, 'utf8'));
}

/** Sem acentos, mantendo maiúsculas e minúsculas. */
export const semDiacritico = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** Sem acentos e em minúsculas: a forma em que cabeçalhos e termos são comparados. */
export const semAcento = (s) => semDiacritico(s).toLowerCase();

// As expressões que leem o resto de uma linha levam a flag `s`: com ela o `(.*)$` nunca falha e
// não há retrocesso, mesmo com um `\r` solto no meio de milhares de espaços.
const ENTRE_ASPAS = [/^"((?:[^"\\]|\\.)*)"(?:\s+#.*)?$/s, /^'((?:[^']|'')*)'(?:\s+#.*)?$/s, /^"(.*)"$/s, /^'(.*)'$/s];

/** Valor de uma linha: sem as aspas; fora delas, sem o comentário do fim (` # …`) e número vira número. */
function valorYaml(bruto) {
  const v = bruto.trim();
  for (const rx of ENTRE_ASPAS) {
    const aspas = v.match(rx);
    if (aspas) return aspas[1].replace(/\\"/g, '"');
  }
  const semComentario = v.replace(/\s#.*$/s, '').trimEnd();
  return /^-?\d+(\.\d+)?$/.test(semComentario) ? Number(semComentario) : semComentario;
}

const quantas = (texto, aspa) => texto.replace(/\\./g, '').split(aspa).length - 1;

/**
 * Valor que continua nas linhas de baixo: bloco `>` ou `|` (as linhas recuadas) ou aspas ainda
 * abertas (até a linha que as fecha). Devolve o valor e a última linha usada, ou null.
 */
function valorLongo(v, linhas, i) {
  if (/^[>|][+-]?$/.test(v)) {
    let fim = i + 1;
    while (fim < linhas.length && (linhas[fim].trim() === '' || /^\s/.test(linhas[fim]))) fim++;
    const partes = linhas.slice(i + 1, fim).map((l) => l.trim());
    return { valor: partes.join(v[0] === '>' ? ' ' : '\n').trim(), ultima: fim - 1 };
  }
  const aspa = v[0];
  const aberta = (aspa === '"' || aspa === "'") && !(v.length > 1 && v.endsWith(aspa)) && quantas(v, aspa) % 2 === 1;
  const fecha = aberta ? linhas.findIndex((l, n) => n > i && quantas(l, aspa) % 2 === 1) : -1;
  if (fecha < 0) return null;
  return { valor: valorYaml([v, ...linhas.slice(i + 1, fecha + 1).map((l) => l.trim())].join(' ')), ultima: fecha };
}

const CHAVE = /^([\p{L}\p{N}_-]+)\s*:\s*(.*)$/su;
const FILHO = /^\s+([\w-]+)\s*:\s*(.*)$/s;
// Linha que cabe num frontmatter: recuada, comentário, item de lista ou `chave: valor`.
const DE_YAML = /^(?:\s|#|-(?:\s|$)|[\p{L}\p{N}_-]+\s*:|[^\s:#-][^:]{0,60}:(?:\s|$))/u;

/** `chave: valor` e um nível de bloco (ex.: `constraints:`); null quando alguma linha não é YAML. */
function lerYaml(linhas) {
  const dados = {};
  let bloco = null;
  let chaves = 0;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i] !== '' && !DE_YAML.test(linhas[i])) return null;
    const topo = linhas[i].match(CHAVE);
    const filho = topo ? null : linhas[i].match(FILHO);
    if (filho && bloco) dados[bloco][filho[1]] = valorYaml(filho[2]);
    if (!topo) continue;
    chaves += 1;
    const longo = valorLongo(topo[2].trim(), linhas, i);
    bloco = !longo && topo[2].trim() === '' ? topo[1] : null;
    dados[topo[1]] = bloco ? {} : longo ? longo.valor : valorYaml(topo[2]);
    if (longo) i = longo.ultima;
  }
  return chaves ? dados : null;
}

/**
 * O frontmatter do começo do arquivo: `{ dados, fim }`, ou null. Um bloco entre duas linhas `---`
 * só é frontmatter se parece YAML (ao menos uma chave e nenhuma linha de prosa); senão o `---` é
 * um separador e o texto fica inteiro.
 */
function acharFrontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const dados = m && lerYaml(m[1].split(/\r?\n/));
  return dados ? { dados, fim: m[0].length } : null;
}

/** Frontmatter YAML simples: `chave: valor` e um nível de bloco (ex.: `constraints:`). */
export const lerFrontmatter = (texto) => acharFrontmatter(texto)?.dados ?? null;

/** Corpo do texto sem o frontmatter. */
export function semFrontmatter(texto) {
  const fm = acharFrontmatter(texto);
  return fm ? texto.slice(fm.fim) : texto;
}

const PASTA_LOCAL = '`_opencrew/best-practices.local/`';
const PASTA_CORE = '`_opencrew/core/best-practices/`';
const NOTA = {
  semFormato: (id) => `Formato "${id}" não encontrado em ${PASTA_LOCAL} nem em ${PASTA_CORE}.`,
  overlaySemLimites: (id) => `O arquivo \`_opencrew/best-practices.local/${id}.md\` não declara limites (\`constraints:\`); usei os do core.`,
  limiteInvalido: (id, escritos) => `O arquivo \`_opencrew/best-practices.local/${id}.md\` tem um limite que não é número inteiro (${escritos}); usei o do core.`,
};
// Limites que o verificador mede: no overlay local só valem com número inteiro a partir de 0.
const MEDIDOS = new Set('title_max_chars meta_description_chars min_internal_links min_external_links caption_max_chars hashtags_max carousel_max_slides post_max_chars tweet_max_chars'.split(' '));

/** Limite escrito entre aspas (`hashtags_max: "5"`) vale como número. */
const comoNumero = ([chave, v]) => [chave, typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v];

/** `constraints:` de um best-practice; `declarados` é null quando o arquivo não os declara. */
async function constraintsDe(raiz, pasta, formatoId) {
  const arquivo = path.join(raiz, '_opencrew', ...pasta, `${formatoId}.md`);
  if (!existsSync(arquivo)) return { existe: false, declarados: null };
  const texto = await lerTexto(arquivo);
  const c = lerFrontmatter(texto)?.constraints;
  return { existe: true, texto, declarados: c && typeof c === 'object' ? Object.fromEntries(Object.entries(c).map(comoNumero)) : null };
}

/** O valor de `chave:` como está escrito no arquivo, sem o comentário do fim da linha. */
function comoEscrito(texto, chave) {
  const linha = texto.split(/\r?\n/).map((l) => l.match(FILHO)).find((m) => m?.[1] === chave);
  return linha ? linha[2].replace(/\s#.*$/s, '').trim() : '';
}

/**
 * Limites do overlay local que cobrem os do core. O limite medido que não é número inteiro a
 * partir de 0 ("2.200", "dois mil") fica de fora e é devolvido em `invalidos`, como foi escrito.
 */
function limitesDoOverlay({ declarados, texto }) {
  const invalido = ([chave, v]) => MEDIDOS.has(chave) && !(Number.isInteger(v) && v >= 0);
  const pares = Object.entries(declarados ?? {});
  return {
    validos: Object.fromEntries(pares.filter((p) => !invalido(p))),
    invalidos: pares.filter(invalido).map(([chave]) => `\`${chave}: ${comoEscrito(texto, chave)}\``),
  };
}

/**
 * Limites do formato: os `constraints:` do core com as chaves que o arquivo do usuário
 * (`_opencrew/best-practices.local/<id>.md`, nunca tocado pelo update) declarar por cima; o
 * limite medido que lá não é número inteiro não cobre o do core e vira nota.
 * @returns {Promise<{ limites: object|null, nota: string|null }>} `limites` null = formato não
 *   encontrado; `nota` = aviso para a seção "Notas" do relatório
 */
export async function lerLimites(raiz, formatoId) {
  const id = String(formatoId);
  if (!/^[a-z0-9-]+$/.test(id)) return { limites: null, nota: NOTA.semFormato(id) };
  const core = await constraintsDe(raiz, ['core', 'best-practices'], id);
  const local = await constraintsDe(raiz, ['best-practices.local'], id);
  if (!core.existe && !local.existe) return { limites: null, nota: NOTA.semFormato(id) };
  const semLimites = local.existe && !local.declarados && core.existe;
  const { validos, invalidos } = limitesDoOverlay(local);
  const nota = semLimites ? NOTA.overlaySemLimites(id) : invalidos.length ? NOTA.limiteInvalido(id, invalidos.join('; ')) : null;
  return { limites: { ...core.declarados, ...validos }, nota };
}

/** Domínio do site da empresa (para separar links internos de externos), se houver. */
export async function lerDominioDoSite(raiz) {
  const arquivo = path.join(raiz, '_opencrew', '_memory', 'company.md');
  if (!existsSync(arquivo)) return null;
  for (const linha of (await lerTexto(arquivo)).split('\n')) {
    const palavra = linha.search(/site|website/i);
    const m = palavra < 0 ? null : linha.slice(palavra).match(/https?:\/\/([^\s/)>\]]+)/i);
    if (m) return m[1].replace(/^www\./, '').toLowerCase();
  }
  return null;
}
