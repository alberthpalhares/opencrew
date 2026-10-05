// Checagens gerais do verificador automático — valem para qualquer arquivo de texto:
// placeholders, [PREENCHER], termos proibidos e afirmações a confirmar.
// Specs: fase-u1-revisor-com-dentes.md §5 e fase-r1-reparos-1-6-1.md, regras 8 e 10.
// As expressões regulares daqui rodam sobre texto do usuário: nenhuma tem repetição sem teto
// que possa recomeçar em cada posição do texto.
import { semFrontmatter, semDiacritico } from './leitura.mjs';

const segmentador = new Intl.Segmenter('pt', { granularity: 'grapheme' });

/** Bloqueio que só o usuário resolve ([PREENCHER: …]). */
export const FALTA_INFO = 'Falta informação sua';
/** Itens das linhas "Não medido — …" e "Não verificado — …" (nível: alerta ou nenhum). */
export const NAO_MEDIDO = 'Não medido';
export const NAO_VERIFICADO = 'Não verificado';

/** Caracteres visíveis: sem marcadores de negrito/itálico; emoji conta 1; quebra de linha conta. */
export function contar(texto) {
  const limpo = String(texto).replace(/\*\*|__/g, '').replace(/\*([^*\n]+)\*/g, '$1').trim();
  return [...segmentador.segment(limpo)].length;
}

export const item = (nome, medido, limite, nivel, detalhe = '') => ({ item: nome, medido, limite, nivel, detalhe });

const TRECHO = /[^\s()[\]<>"']+/g; // trecho sem espaço: um link, um número, uma palavra
const REPETIDO = /(\d)\1{5,}/; // 6 ou mais dígitos iguais seguidos
const COR_HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})(?![0-9a-z])/gi;
const EM_LINK = /http|wa\.me|tel:|\//i;
const VARIAVEL = /\{\{[^{}\n]{1,100}\}\}/g;
const EXPRESSOES = [
  /\[(?:empresa|cliente|nome|feira|evento|produto|cidade|link|url|telefone|e-?mail|data)\b[^\]]{0,200}\](?!\()/giu,
  /lorem ipsum/gi,
  /\bX{3,}\b(?![ \t]+\p{Lu})/gu, // "XXX Congresso" é numeral romano, não placeholder
];
const DOMINIOS = /\b(?:example\.com|seusite\.com(?:\.br)?|suaempresa\.com(?:\.br)?)\b/gi;

function semPontuacaoFinal(s) {
  let fim = s.length;
  while (fim > 0 && '.,;:!?'.includes(s[fim - 1])) fim--;
  return s.slice(0, fim);
}

/**
 * Dígitos repetidos só contam em link ou telefone: trecho com `http`, `wa.me`, `tel:` ou `/`,
 * ou sequência de 10 dígitos ou mais. Cor hexadecimal nunca conta.
 */
function digitosRepetidos(texto) {
  const achados = [];
  for (const [trecho] of texto.matchAll(TRECHO)) {
    const semCor = trecho.replace(COR_HEX, '');
    if (!REPETIDO.test(semCor)) continue;
    const telefone = (semCor.match(/\d{10,}/g) ?? []).some((seq) => REPETIDO.test(seq));
    if (telefone || EM_LINK.test(semCor)) achados.push(trecho);
  }
  return achados;
}

/** O texto tem `{{variável}}` de personalização? */
export const temVariavel = (texto) => texto.search(VARIAVEL) >= 0;

/** O detalhe de um achado nunca cresce com o arquivo: acima do teto, é cortado com reticências. */
const cortar = (s, teto) => (s.length > teto ? `${s.slice(0, teto).trimEnd()}…` : s);

function placeholders(texto, variavelBloqueia) {
  const expressoes = [...EXPRESSOES, ...(variavelBloqueia ? [VARIAVEL] : []), DOMINIOS];
  const achados = [...digitosRepetidos(texto), ...expressoes.flatMap((rx) => [...texto.matchAll(rx)].map((m) => m[0]))];
  return achados.map((achado) => item('Placeholder', null, null, 'bloqueio', cortar(semPontuacaoFinal(achado), 160)));
}

/**
 * `[PREENCHER: …]`, de qualquer tamanho, numa passada só: cada abertura vai até o primeiro `]`;
 * a que cai dentro do pedido anterior é pulada; sem `]` adiante, a busca para.
 */
function pedidosAoUsuario(texto) {
  const pedidos = [];
  let fecha = -1;
  for (const m of texto.matchAll(/\[PREENCHER:?/giu)) {
    if (m.index < fecha) continue;
    fecha = texto.indexOf(']', m.index);
    if (fecha < 0) break;
    const dentro = texto.slice(m.index + m[0].length, fecha).trim();
    pedidos.push(item(FALTA_INFO, null, null, 'bloqueio', cortar(dentro, 300) || texto.slice(m.index, fecha + 1)));
  }
  return pedidos;
}

const ESPECIAIS = /[.*+?^${}()|[\]\\]/g;
const BORDA = '[\\p{L}\\p{N}]';

/**
 * Termo proibido é palavra inteira, com plural simples (`s`, `es`), sem diferenciar maiúsculas e
 * acentos. Sigla (até 5 letras, todas maiúsculas) compara diferenciando maiúsculas. Entre as
 * palavras do termo vale qualquer espaço: quebra de linha, dois espaços, espaço não separável.
 */
function casaTermo(termo, exato, minusculo) {
  const alvo = semDiacritico(termo.trim());
  if (!alvo) return false;
  const sigla = /^\p{Lu}{1,5}$/u.test(alvo);
  const padrao = (sigla ? alvo : alvo.toLowerCase()).replace(ESPECIAIS, '\\$&').replace(/\s+/g, '\\s+');
  const rx = new RegExp(`(?<!${BORDA})${padrao}(?:[sS]|[eE][sS])?(?!${BORDA})`, 'u');
  return rx.test(sigla ? exato : minusculo);
}

function termosProibidos(texto, proibidos) {
  const exato = semDiacritico(texto);
  const minusculo = exato.toLowerCase();
  return proibidos
    .filter((termo) => casaTermo(termo, exato, minusculo))
    .map((termo) => item('Termo proibido (memória da crew)', null, null, 'bloqueio', termo));
}

const PRIMEIRA_PESSOA = /(?<!\p{L})(eu|nós|nosso|nossa|nossos|nossas|investimos|atendemos|fizemos|ajudamos|fundamos|começamos|criamos|entregamos|nossa equipe)(?!\p{L})/iu;
// `(?<!\d)`: só o começo de cada número é tentado.
const DADO_CONCRETO = /R\$\s?\d|US\$\s?\d|(?<!\d)\d+(?:[.,]\d+)?\s?%|(?<!\d)\d+\s+(?:clientes|empresas|eventos|anos|projetos|pessoas)/iu;

// Ano só conta como dado concreto se for passado: "Congresso 2026" (ano atual/futuro) é nome de
// evento, não afirmação sobre a história da empresa (achado no uso real).
function temDadoConcreto(frase) {
  if (DADO_CONCRETO.test(frase)) return true;
  const atual = new Date().getFullYear();
  return [...frase.matchAll(/(?<!\d)((?:19|20)\d{2})(?!\d)/g)].some((m) => Number(m[1]) < atual);
}

const citar = (frase) => cortar(frase.replace(/\*\*|__/g, '').replace(/\*([^*\n]+)\*/g, '$1').trim(), 160);

function afirmacoes(corpo) {
  return corpo
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((frase) => PRIMEIRA_PESSOA.test(frase) && temDadoConcreto(frase))
    .map((frase) => item('Afirmação a confirmar', null, null, 'alerta', citar(frase)));
}

/**
 * Checagens que valem para qualquer texto.
 * @param {string} texto
 * @param {string[]} proibidos termos proibidos da memória da crew
 * @param {{ variavelBloqueia?: boolean }} [opcoes] false em e-mail e WhatsApp: `{{variável}}`
 *   vira nota informativa (quem chama escreve a nota)
 */
export function regrasGerais(texto, proibidos, { variavelBloqueia = true } = {}) {
  return [
    ...placeholders(texto, variavelBloqueia),
    ...pedidosAoUsuario(texto),
    ...termosProibidos(texto, proibidos),
    ...afirmacoes(semFrontmatter(texto)),
  ];
}
