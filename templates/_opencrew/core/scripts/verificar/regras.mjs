// Regras do verificador automático (specs/fase-u1-revisor-com-dentes.md §5).
// Máximos bloqueiam (fácil de corrigir: encurtar); mínimos alertam (podem depender do usuário).
import { lerFrontmatter, semFrontmatter, semAcento } from './leitura.mjs';

const segmentador = new Intl.Segmenter('pt', { granularity: 'grapheme' });

/** Bloqueio que só o usuário resolve ([PREENCHER: …]). */
export const FALTA_INFO = 'Falta informação sua';

/** Caracteres visíveis: sem marcadores de negrito/itálico; emoji conta 1. */
export function contar(texto) {
  const limpo = String(texto).replace(/\*\*|__/g, '').replace(/\*([^*\n]+)\*/g, '$1').trim();
  return [...segmentador.segment(limpo)].length;
}

const contarHashtags = (texto) => (texto.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

const item = (nome, medido, limite, nivel, detalhe = '') => ({ item: nome, medido, limite, nivel, detalhe });

function maximo(nome, medido, limite) {
  if (typeof limite !== 'number') return null;
  return item(nome, medido, limite, medido > limite ? 'bloqueio' : 'ok');
}

function minimo(nome, medido, limite) {
  if (typeof limite !== 'number') return null;
  return item(nome, medido, limite, medido < limite ? 'alerta' : 'ok');
}

const NAO_CONTA = /^(mailto:|tel:|https?:\/\/(wa\.me|api\.whatsapp\.com)\/)/i;

function contarLinks(corpo, dominio) {
  const urls = [...corpo.matchAll(/\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)].map((m) => m[1]).filter((u) => !NAO_CONTA.test(u));
  const interno = (u) => !/^https?:\/\//i.test(u) || (dominio && new URL(u).hostname.replace(/^www\./, '') === dominio);
  return { internos: urls.filter(interno).length, externos: urls.filter((u) => !interno(u)).length };
}

/** Blog: frontmatter com título → título, meta description e links. */
export function regrasBlog(texto, limites, dominio) {
  const fm = lerFrontmatter(texto);
  const titulo = fm?.title ?? fm?.titulo;
  if (titulo == null || !limites) return [];
  const meta = fm.meta_description ?? fm.meta_descricao;
  const { internos, externos } = contarLinks(semFrontmatter(texto), dominio);
  return [
    maximo('Título (SEO) — caracteres', contar(titulo), limites.title_max_chars),
    meta != null ? maximo('Meta description — caracteres', contar(meta), limites.meta_description_chars) : null,
    minimo('Links internos', internos, limites.min_internal_links),
    minimo('Links externos', externos, limites.min_external_links),
  ].filter(Boolean);
}

/** Seções por canal (cabeçalhos "Legenda Instagram", "Post LinkedIn", "Tweet"…). */
export function regrasCanais(secoes, limitesPorFormato) {
  const itens = [];
  for (const s of secoes) {
    const t = semAcento(s.titulo);
    const ig = limitesPorFormato['instagram-feed'];
    if (/instagram/.test(t) && /legenda|caption/.test(t) && ig) {
      itens.push(maximo('Legenda Instagram — caracteres', contar(s.corpo), ig.caption_max_chars));
      itens.push(maximo('Legenda Instagram — hashtags', contarHashtags(s.corpo), ig.hashtags_max));
    } else if (/instagram/.test(t) && /carrossel|carousel/.test(t) && ig) {
      const slides = (s.corpo.match(/^\s*(?:#{3,6}\s*|\*\*\s*)slide\s*\d+/gim) ?? []).length;
      if (slides) itens.push(maximo('Carrossel Instagram — slides', slides, ig.carousel_max_slides));
    }
    const li = limitesPorFormato['linkedin-post'];
    if (/linkedin/.test(t) && !/carrossel|carousel/.test(t) && li) {
      itens.push(maximo('Post LinkedIn — caracteres', contar(s.corpo), li.post_max_chars));
      itens.push(maximo('Post LinkedIn — hashtags', contarHashtags(s.corpo), li.hashtags_max));
    }
    const tw = limitesPorFormato['twitter-post'];
    if (/tweet|twitter/.test(t) && tw) {
      s.corpo.split(/\n\s*\n/).filter((p) => p.trim()).forEach((p, i) => {
        const r = maximo(`Tweet ${i + 1} — caracteres`, contar(p), tw.tweet_max_chars);
        if (r?.nivel === 'bloqueio') itens.push(r);
      });
    }
  }
  return itens.filter(Boolean);
}

const PLACEHOLDERS = [
  /(?:https?:\/\/)?[^\s()[\]<>"']*?(\d)\1{5,}[^\s()[\]<>"']*/g, // 6+ dígitos repetidos (wa.me/5584999999999)
  /\[(?:empresa|cliente|nome|feira|evento|produto|cidade|link|url|telefone|e-?mail|data)\b[^\]]*\](?!\()/giu,
  /lorem ipsum/gi,
  /\bX{3,}\b/g,
  /\{\{[^}]+\}\}/g,
  /\b(?:example\.com|seusite\.com(?:\.br)?|suaempresa\.com(?:\.br)?)\b/gi,
];

const PRIMEIRA_PESSOA = /(?<!\p{L})(eu|nós|nosso|nossa|nossos|nossas|investimos|atendemos|fizemos|ajudamos|fundamos|começamos|criamos|entregamos|nossa equipe)(?!\p{L})/iu;
const DADO_CONCRETO = /R\$\s?\d|US\$\s?\d|\d+([.,]\d+)?\s?%|\d+\s+(clientes|empresas|eventos|anos|projetos|pessoas)/iu;

// Ano só conta como dado concreto se for passado: "Congresso 2026" (ano atual/futuro) é nome de
// evento, não afirmação sobre a história da empresa (achado no uso real).
function temDadoConcreto(frase) {
  if (DADO_CONCRETO.test(frase)) return true;
  const atual = new Date().getFullYear();
  return [...frase.matchAll(/(?<!\d)((?:19|20)\d{2})(?!\d)/g)].some((m) => Number(m[1]) < atual);
}

const citar = (frase) => {
  const limpa = frase.replace(/\*\*|__/g, '').replace(/\*([^*\n]+)\*/g, '$1').trim();
  return limpa.length > 160 ? `${limpa.slice(0, 160).trimEnd()}…` : limpa;
};

/** Checagens que valem para qualquer texto. */
export function regrasGerais(texto, proibidos) {
  const corpo = semFrontmatter(texto);
  const itens = [];
  for (const rx of PLACEHOLDERS) {
    for (const m of texto.matchAll(rx)) itens.push(item('Placeholder', null, null, 'bloqueio', m[0].replace(/[.,;:!?]+$/, '')));
  }
  for (const m of texto.matchAll(/\[PREENCHER:?\s*([^\]]*)\]/giu)) {
    itens.push(item(FALTA_INFO, null, null, 'bloqueio', m[1].trim() || m[0]));
  }
  const normal = semAcento(texto);
  for (const termo of proibidos) {
    if (normal.includes(semAcento(termo))) itens.push(item('Termo proibido (memória da crew)', null, null, 'bloqueio', termo));
  }
  for (const frase of corpo.split(/(?<=[.!?])\s+|\n+/)) {
    if (PRIMEIRA_PESSOA.test(frase) && temDadoConcreto(frase)) {
      itens.push(item('Afirmação a confirmar', null, null, 'alerta', citar(frase)));
    }
  }
  return itens;
}
