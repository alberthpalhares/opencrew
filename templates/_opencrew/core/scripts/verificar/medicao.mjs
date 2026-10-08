// Medição das peças: compara cada peça com o limite do seu formato (`constraints:`) e diz o que
// não foi medido. Máximos bloqueiam (fácil de corrigir: encurtar); mínimos alertam (podem
// depender do usuário). Spec: fase-r1-reparos-1-6-1.md, regras 3 e 6.
import { BLOG, secoesDeOutroCanal } from './secoes.mjs';
import { contarSlides, listarHashtags } from './pecas.mjs';
import { contar, item, NAO_MEDIDO } from './regras.mjs';

const NOME = { titulo: 'Título (SEO)', meta: 'Meta description', legenda: 'Legenda Instagram', slides: 'Carrossel Instagram', post: 'Post LinkedIn', tweet: 'Tweet' };
const NUMERADA = { legenda: 'legenda', slides: 'carrossel', post: 'post' };
const DITA = { titulo: 'título', meta: 'meta description', legenda: 'legenda', hashtags: 'hashtags', slides: 'slides', post: 'post', tweet: 'tweet' };
const LIMITE = {
  titulo: 'title_max_chars',
  meta: 'meta_description_chars',
  legenda: 'caption_max_chars',
  hashtags: 'hashtags_max',
  slides: 'carousel_max_slides',
  post: 'post_max_chars',
  tweet: 'tweet_max_chars',
};
// Peça principal de cada formato da tabela: sem ela, o arquivo sai como "Não medido".
const PRINCIPAL = {
  'blog-post': [['titulo'], 'o título'],
  'blog-seo': [['titulo'], 'o título'],
  'instagram-feed': [['legenda', 'slides'], 'legenda nem slides'],
  'linkedin-post': [['post'], 'o post'],
  'twitter-post': [['tweet'], 'o tweet'],
};

// O cabeçalho entra no relatório até 120 caracteres: a linha não cresce com ele.
const curto = (cabecalho) => (cabecalho?.length > 120 ? `${cabecalho.slice(0, 120).trimEnd()}…` : cabecalho);

/** Com mais de uma peça do mesmo tipo, o nome traz o número de ordem e o cabeçalho da seção. */
function nomeDaPeca(p, total) {
  const base = NOME[p.tipo];
  if (p.origem === 'arquivo') return `${base} (arquivo inteiro)`;
  if (p.tipo === 'tweet') return p.porParagrafo || total > 1 ? `Tweet ${p.ordem}` : base;
  if (total < 2) return base;
  const cabecalho = curto(p.cabecalho);
  return `${base} — ${NUMERADA[p.tipo]} ${p.ordem}${cabecalho ? ` (${cabecalho})` : ''}`;
}

function nomeDoItem(p, totais) {
  const total = (tipo) => totais[`${tipo}|${p.formato}`] ?? 0;
  if (p.tipo !== 'hashtags') return `${nomeDaPeca(p, total(p.tipo))} — ${p.tipo === 'slides' ? 'slides' : 'caracteres'}`;
  const canal = p.formato === 'instagram-feed' ? 'Instagram' : 'LinkedIn';
  return `${p.de ? nomeDaPeca({ ...p, tipo: p.de }, total(p.de)) : canal} — hashtags`;
}

function medir(p) {
  if (p.tipo === 'slides') return contarSlides(p.texto);
  return p.tipo === 'hashtags' ? listarHashtags(p.texto).length : contar(p.texto);
}

// Âncora da própria página (`#seção`), e-mail, telefone e WhatsApp não são link interno nem externo.
const NAO_CONTA = /^(#|mailto:|tel:|https?:\/\/(wa\.me|api\.whatsapp\.com)\/)/i;

/** O `]` da posição `fecha` fecha uma imagem (`![alt](…)`)? Procura o `[` par até 500 caracteres atrás. */
function ehImagem(corpo, fecha) {
  let nivel = 0;
  for (let i = fecha - 1; i >= 0 && i >= fecha - 500; i--) {
    if (corpo[i] === ']') nivel += 1;
    else if (corpo[i] === '[' && nivel-- === 0) return corpo[i - 1] === '!';
  }
  return false;
}

/** Alvos dos links markdown `](alvo)` ou `](alvo "título")`. Imagem não é link. */
function alvosDeLinks(corpo) {
  const fecho = /(?:[ \t][^)\n]{0,300})?\)/y;
  const alvos = [];
  for (const m of corpo.matchAll(/\]\(([^)\s]{1,2000})/g)) {
    fecho.lastIndex = m.index + m[0].length;
    if (fecho.test(corpo) && !ehImagem(corpo, m.index)) alvos.push(m[1]);
  }
  return alvos;
}

/** Link relativo é interno; http(s) é interno quando o domínio é o do site. Malformado: fora. */
function ehInterno(url, dominio) {
  if (!/^https?:\/\//i.test(url)) return true;
  try {
    return new URL(url).hostname.replace(/^www\./, '') === dominio;
  } catch {
    return null;
  }
}

function itensDeLinks(corpo, limites, dominio) {
  const tipos = alvosDeLinks(corpo).filter((u) => !NAO_CONTA.test(u)).map((u) => ehInterno(u, dominio));
  const minimo = (nome, medido, limite) =>
    (typeof limite === 'number' ? [{ ...item(nome, medido, limite, medido < limite ? 'alerta' : 'ok'), minimo: true }] : []);
  return [
    ...minimo('Links internos', tipos.filter((t) => t === true).length, limites?.min_internal_links),
    ...minimo('Links externos', tipos.filter((t) => t === false).length, limites?.min_external_links),
  ];
}

/**
 * Linhas "Não medido" do arquivo: peça principal ausente, peça sem limite, seção de outro canal
 * em blog declarado (cabeçalho é conteúdo: não é medida), formato fora da tabela.
 */
function naoMedidos({ pecas, corpo, formato, limites }, semLimite, medidas) {
  const linhas = [];
  const [tipos, dita] = PRINCIPAL[formato] ?? [];
  const achou = tipos && pecas.some((p) => p.formato === formato && tipos.includes(p.tipo));
  if (tipos && !achou) linhas.push(item(NAO_MEDIDO, null, null, 'alerta', `não encontrei ${dita} neste arquivo (formato ${formato})`));
  for (const detalhe of semLimite) linhas.push(item(NAO_MEDIDO, null, null, null, detalhe));
  for (const cabecalho of BLOG.includes(formato) ? secoesDeOutroCanal(corpo) : []) {
    linhas.push(item(NAO_MEDIDO, null, null, null, `seção de outro canal num arquivo de blog: ${curto(cabecalho)}`));
  }
  // Formato que não declara limite nenhum (documento-oficial, texto-livre) não tem o que medir.
  if (formato && !tipos && Object.keys(limites[formato] ?? {}).length && !medidas) {
    linhas.push(item(NAO_MEDIDO, null, null, null, `o verificador ainda não mede os limites do formato ${formato}`));
  }
  return linhas;
}

/**
 * Mede as peças de um arquivo `.md` ou `.txt`.
 * @param {{ pecas: object[], corpo: string, formato: string|null, limites: object, dominio: string|null }} o
 *   `formato`: o declarado, ou null · `limites`: `{ [formato]: constraints | null }`
 * @returns {{ itens: object[], medidas: number }} `medidas`: quantas peças tinham limite numérico
 */
export function medirPecas(o) {
  const totais = {};
  for (const p of o.pecas) totais[`${p.tipo}|${p.formato}`] = (totais[`${p.tipo}|${p.formato}`] ?? 0) + 1;
  const itens = [];
  const semLimite = new Set();
  let medidas = 0;
  for (const p of o.pecas) {
    const limite = o.limites[p.formato]?.[LIMITE[p.tipo]];
    if (typeof limite !== 'number') semLimite.add(`${DITA[p.tipo]}: sem limite definido no formato ${p.formato}`);
    else {
      medidas += 1;
      const medido = medir(p);
      // Nos tweets por parágrafo, só o que passa do limite gera linha.
      if (!p.porParagrafo || medido > limite) itens.push(item(nomeDoItem(p, totais), medido, limite, medido > limite ? 'bloqueio' : 'ok'));
    }
  }
  const blog = BLOG.includes(o.formato) ? o.formato : o.pecas.find((p) => p.tipo === 'titulo')?.formato;
  if (blog) itens.push(...itensDeLinks(o.corpo, o.limites[blog], o.dominio));
  return { itens: [...itens, ...naoMedidos(o, semLimite, medidas)], medidas };
}
