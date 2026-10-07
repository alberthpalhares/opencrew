// Leitor de peças do verificador: acha, num texto, os trechos que têm limite próprio no formato
// (título, meta description, legenda, hashtags, slides, post, tweet), nos dois jeitos de
// escrever — cabeçalho markdown e rótulo `=== RÓTULO ===`. Sem estado global e sem depender do
// relatório: recebe o texto e o formato declarado e devolve as peças.
// Spec: specs/fase-r1-reparos-1-6-1.md, regras 1 a 5 (repositório do OpenCrew).
import { lerFrontmatter, semFrontmatter } from './leitura.mjs';
import { BLOG, marcar, lerTrechos, numeroDoSlide } from './secoes.mjs';

/** Formatos que o verificador mede (a tabela da regra 3). */
export const FORMATOS_DA_TABELA = [...BLOG, 'instagram-feed', 'linkedin-post', 'twitter-post'];

const FORMATO_DA_PECA = { legenda: 'instagram-feed', slides: 'instagram-feed', post: 'linkedin-post', tweet: 'twitter-post' };
// O que cada rótulo faz, por formato declarado. Sem formato declarado valem todos: os
// inconfundíveis abrem peça e os outros só se juntam a uma peça já aberta.
export const ROTULOS = {
  'instagram-feed': { CAPTION: 'legenda', SLIDES: 'slides', HASHTAGS: 'hashtags' },
  'linkedin-post': { HOOK: 'post', BODY: 'parte', INSIGHTS: 'parte', CTA: 'parte', HASHTAGS: 'hashtags' },
  'twitter-post': { TWEET: 'tweet' },
};
const TODOS_OS_ROTULOS = Object.assign({}, ...Object.values(ROTULOS));

/** Hashtags de um texto, na ordem em que aparecem. Âncora de URL e entidade `&#39;` não contam. */
export const listarHashtags = (texto) => texto.replace(/https?:\/\/\S+/gi, ' ').match(/(?<!&)#[\p{L}\p{N}_]+/gu) ?? [];

/** Quantos números N diferentes aparecem em linhas que começam por "Slide N". */
export function contarSlides(texto) {
  const numeros = texto.split('\n').map(numeroDoSlide).filter((n) => n != null);
  return new Set(numeros).size;
}

/** Parágrafos: blocos de linhas separados por linha em branco. */
function paragrafos(texto) {
  const blocos = [[]];
  for (const linha of texto.split('\n')) {
    if (linha.trim()) blocos.at(-1).push(linha);
    else if (blocos.at(-1).length) blocos.push([]);
  }
  return blocos.filter((b) => b.length).map((b) => b.join('\n'));
}

/** Abre uma peça. Legenda e post ganham, logo a seguir, a peça das suas hashtags. */
function abrir(e, tipo, origem, extra = {}) {
  const peca = { tipo, formato: FORMATO_DA_PECA[tipo], texto: '', origem, cabecalho: null, ordem: 0, ...extra };
  const entrada = { peca, partes: [], dono: null, hashtags: null };
  e.entradas.push(entrada);
  if (tipo === 'legenda' || tipo === 'post') {
    entrada.hashtags = { peca: { ...peca, tipo: 'hashtags', de: tipo }, partes: [], dono: entrada };
    e.entradas.push(entrada.hashtags);
    e.dono = entrada;
    e.donos[peca.formato] = entrada;
  }
  return entrada;
}

/**
 * Hashtags de rótulo ou de cabeçalho somam à legenda ou ao post aberto por último; quando o
 * cabeçalho cita um canal (`canal`), à legenda ou ao post desse canal aberto por último.
 */
function juntarHashtags(e, texto, origem, cabecalho = null, canal = null) {
  const dono = canal ? e.donos[canal] : e.dono;
  const formato = canal ?? e.tabela;
  if (dono) dono.hashtags.partes.push(texto);
  else if (e.tabela && (formato === 'instagram-feed' || formato === 'linkedin-post')) {
    abrir(e, 'hashtags', origem, { formato, cabecalho, de: null }).partes.push(texto);
  }
}

function pecaDoRotulo(e, papel, texto) {
  if (papel === 'hashtags') juntarHashtags(e, texto, 'rotulo');
  else if (papel === 'parte') {
    // BODY, INSIGHTS e CTA pertencem ao post aberto por último; sem HOOK antes, abrem o primeiro.
    if (!e.post && e.tabela === 'linkedin-post') e.post = abrir(e, 'post', 'rotulo');
    e.post?.partes.push(texto);
  } else if (papel) {
    const aberta = abrir(e, papel, 'rotulo');
    aberta.partes.push(texto);
    if (papel === 'post') e.post = aberta;
  }
}

function pecasDoCabecalho(e, tipo, texto, { titulo: cabecalho, canal }) {
  if (tipo === 'hashtags') juntarHashtags(e, texto, 'cabecalho', cabecalho, canal);
  else if (tipo === 'tweet') {
    for (const p of paragrafos(texto)) abrir(e, 'tweet', 'cabecalho', { cabecalho, porParagrafo: true }).partes.push(p);
  } else abrir(e, tipo, 'cabecalho', { cabecalho }).partes.push(texto);
}

/** Cabeçalho de legenda e de slides ao mesmo tempo abre uma peça só: slides, se o texto tem "Slide N". */
function semPecaDupla(tipos, texto) {
  if (!tipos.includes('legenda') || !tipos.includes('slides')) return tipos;
  const sobra = contarSlides(texto) ? 'legenda' : 'slides';
  return tipos.filter((tipo) => tipo !== sobra);
}

function pecasDoTrecho(e, trecho, rotulos) {
  const texto = trecho.linhas.join('\n').trim();
  if (trecho.rotulo) pecaDoRotulo(e, rotulos[trecho.rotulo], texto);
  else for (const tipo of semPecaDupla(trecho.tipos, texto)) pecasDoCabecalho(e, tipo, texto, trecho);
}

/** Blog: título e meta description do frontmatter; senão, da primeira ocorrência do rótulo. */
function pecasDoBlog(e, texto, trechos, formato, lerRotulos) {
  const fm = lerFrontmatter(texto) ?? {};
  const achar = (tipo, chaves, rotulos) => {
    const valor = chaves.map((c) => fm[c]).find((v) => v != null && typeof v !== 'object' && String(v).trim());
    const trecho = valor == null && lerRotulos ? trechos.find((t) => rotulos.includes(t.rotulo)) : null;
    if (valor == null && !trecho) return false;
    // Título escrito como cabeçalho logo abaixo do rótulo: o "# " não é texto.
    const escrito = trecho ? trecho.linhas.join('\n').trim().replace(/^#{1,6}\s+/, '') : String(valor);
    abrir(e, tipo, trecho ? 'rotulo' : 'frontmatter', { formato }).partes.push(escrito);
    return true;
  };
  const temTitulo = achar('titulo', ['title', 'titulo'], ['TITLE', 'TITLE TAG']);
  if (temTitulo || lerRotulos) achar('meta', ['meta_description', 'meta_descricao'], ['META DESCRIPTION']);
}

/** Arquivo que é só o texto (sem cabeçalho nem rótulo): o corpo inteiro é o post ou o tweet. */
function pecaDoArquivoInteiro(e, marcas) {
  const tipo = { 'linkedin-post': 'post', 'twitter-post': 'tweet' }[e.tabela];
  if (!tipo || marcas.some((m) => m.rotulo || m.nivel)) return;
  abrir(e, tipo, 'arquivo').partes.push(marcas.map((m) => m.linha).join('\n').trim());
}

/**
 * `instagram-feed` sem peça de slides: os cabeçalhos "Slide N" do arquivo inteiro são o
 * carrossel, quando trazem 2 ou mais números diferentes.
 */
function slidesDoArquivoInteiro(e, marcas) {
  const temSlides = ({ peca, partes }) => peca.tipo === 'slides' && contarSlides(partes.join('\n')) > 0;
  if (e.tabela !== 'instagram-feed' || e.entradas.some(temSlides)) return;
  const titulos = marcas.filter((m) => m.nivel && numeroDoSlide(m.linha) != null).map((m) => m.linha).join('\n');
  if (contarSlides(titulos) >= 2) abrir(e, 'slides', 'arquivo').partes.push(titulos);
}

/** Texto final e número de ordem de cada peça. Sem texto próprio, a peça não entra. */
function fechar(entradas) {
  const contagem = {};
  const proxima = ({ tipo, formato }) => {
    const chave = `${tipo}|${formato}`;
    contagem[chave] = (contagem[chave] ?? 0) + 1;
    return contagem[chave];
  };
  const pecas = [];
  for (const { peca, partes, dono } of entradas) {
    const proprio = partes.filter(Boolean).join('\n\n');
    const comDono = Boolean(dono?.peca.ordem);
    if (peca.tipo === 'hashtags') {
      peca.texto = listarHashtags(`${comDono ? dono.peca.texto : ''}\n${proprio}`).join(' ');
      if (!comDono) peca.de = null;
    } else peca.texto = peca.tipo === 'slides' && !contarSlides(proprio) ? '' : proprio;
    if (!peca.texto && !comDono) continue;
    peca.ordem = comDono ? dono.peca.ordem : proxima(peca);
    pecas.push(peca);
  }
  return pecas;
}

/**
 * Lê as peças de um texto, na ordem em que aparecem.
 * @param {string} texto conteúdo de um arquivo `.md` ou `.txt`, já sem o BOM
 * @param {string|null} [formato] formato declarado (`caminho=formato`); null = sem formato declarado
 * @param {{ formatoDeBlog?: string|null }} [opcoes] sem formato declarado, o formato em que o
 *   título do frontmatter é medido (`--formato`); null = não é peça (a entrega chama assim)
 * @returns {object[]} peças `{ tipo, formato, texto, origem, cabecalho, ordem }`
 *   · `tipo`: titulo, meta, legenda, hashtags, slides, post ou tweet
 *   · `formato`: o formato cujo limite vale para a peça
 *   · `texto`: o texto da peça (nas hashtags, as hashtags achadas, separadas por espaço)
 *   · `origem`: de onde veio — cabecalho, rotulo, frontmatter ou arquivo (o arquivo inteiro)
 *   · `cabecalho`: texto do cabeçalho da seção, ou null
 *   · `ordem`: número da peça entre as do mesmo tipo e formato; as hashtags levam o da legenda
 *   ou do post a que pertencem (dito em `de`; null quando não pertencem a nenhum)
 *   · `porParagrafo`: true no tweet tirado de um parágrafo de uma seção de cabeçalho
 */
export function lerPecas(texto, formato = null, { formatoDeBlog = 'blog-post' } = {}) {
  const tabela = FORMATOS_DA_TABELA.includes(formato) ? formato : null;
  // Formato declarado fora da tabela: a linha `=== RÓTULO ===` é texto comum (regra 3 c).
  const marcas = marcar(semFrontmatter(texto), formato == null || tabela != null);
  const trechos = lerTrechos(marcas, tabela);
  const e = { entradas: [], tabela, dono: null, donos: {}, post: null };
  if (BLOG.includes(tabela)) pecasDoBlog(e, texto, trechos, tabela, true);
  else {
    // Fora da tabela os rótulos não são lidos; sem formato declarado, título no frontmatter é blog.
    if (formato == null && formatoDeBlog) pecasDoBlog(e, texto, trechos, formatoDeBlog, false);
    const rotulos = tabela ? ROTULOS[tabela] : formato == null ? TODOS_OS_ROTULOS : {};
    for (const trecho of trechos) pecasDoTrecho(e, trecho, rotulos);
    pecaDoArquivoInteiro(e, marcas);
    slidesDoArquivoInteiro(e, marcas);
  }
  return fechar(e.entradas);
}
