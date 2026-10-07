// Seções de um texto nos dois jeitos de escrever: cabeçalho markdown e linha `=== RÓTULO ===`.
// Devolve os trechos que podem virar peça, cada um com o seu texto próprio (o corpo sem os
// trechos das candidatas de dentro). Nenhuma expressão regular daqui refaz a linha inteira a cada
// tentativa: a do cabeçalho leva a flag `s`, para o resto da linha nunca falhar.
import { semAcento } from './leitura.mjs';

export const BLOG = ['blog-post', 'blog-seo'];

// Palavra inteira (antes e depois não há letra nem dígito), com o plural escrito em cada forma.
const palavra = (formas) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${formas})(?![\\p{L}\\p{N}])`, 'u');
const CANAL = { instagram: palavra('instagram'), linkedin: palavra('linkedin'), twitter: palavra('twitter|tweets?') };
// "Slide N" é um slide, não um carrossel: o singular fica de fora.
const PECA = {
  legenda: palavra('legendas?|captions?'),
  slides: palavra('carrossel|carrosseis|carousels?|slides'),
  post: palavra('posts?'),
  hashtags: palavra('hashtags?'),
};
// Linha de slide: "Slide N" ou "Slide #N", com até 12 caracteres que não são letra nem dígito
// antes (emoji, colchete, ">", "|", "#", negrito, espaço).
const SLIDE_N = /^[^\p{L}\p{N}]{0,12}slide\s{0,3}#?(\d{1,4})(?!\d)/iu;
// Cabeçalho que começa por "hashtags" é só hashtags, com qualquer palavra depois.
const SO_HASHTAGS = /^(?:\*\*|__|\*|_)?\s*hashtags?(?![\p{L}\p{N}])/u;
const FORMATO_DO_CANAL = { instagram: 'instagram-feed', linkedin: 'linkedin-post', twitter: 'twitter-post' };
// Só a cerca de código: três crases ou três tis, com ou sem o nome da linguagem.
const CERCA = /^(?:`{3,}|~{3,})[ \t]{0,3}[\p{L}\p{N}_+.#-]{0,30}$/u;

/** Número do slide de uma linha que começa por "Slide N" (cabeçalho, negrito, item ou texto). */
export function numeroDoSlide(linha) {
  const m = linha.trim().replace(/^(?:#{1,6}|[-*+]|\d{1,3}[.)])\s+/, '').match(SLIDE_N);
  return m ? Number(m[1]) : null;
}

/** `=== RÓTULO ===` → o rótulo inteiro, em maiúsculas; qualquer outra linha → null. */
export function rotuloDe(linha) {
  const t = linha.trim();
  let inicio = 0;
  let fim = t.length;
  while (t[inicio] === '=') inicio++;
  while (fim > inicio && t[fim - 1] === '=') fim--;
  const nome = t.slice(inicio, fim).trim();
  return inicio >= 3 && t.length - fim >= 3 && nome ? nome.toUpperCase().replace(/\s+/g, ' ') : null;
}

/**
 * Cada linha vira uma marca: rótulo, cabeçalho ou texto. A linha `---` e a que é só a cerca de
 * código não contam como texto. Com `comRotulos` false (formato declarado fora da tabela), a
 * linha `=== RÓTULO ===` é texto comum.
 */
export function marcar(corpo, comRotulos = true) {
  const marcas = [];
  for (const linha of corpo.split(/\r?\n/)) {
    if (linha.startsWith('---') && linha.trim() === '---') continue;
    if (CERCA.test(linha.trim())) continue;
    const rotulo = comRotulos ? rotuloDe(linha) : null;
    const h = rotulo ? null : linha.match(/^(#{1,6})\s+(.*)$/s);
    if (rotulo) marcas.push({ rotulo });
    else if (h) marcas.push({ nivel: h[1].length, titulo: h[2].trim(), norm: semAcento(h[2]), linha });
    else marcas.push({ linha });
  }
  return marcas;
}

/**
 * A que peças o cabeçalho é candidato (regras 3 e 4): casa com a peça pelo próprio texto, ou tem
 * a palavra da peça e o canal vem do formato declarado ou de um cabeçalho que o contém.
 * @param {string} t cabeçalho sem acentos e em minúsculas
 * @param {string[]} acima cabeçalhos que contêm este, na mesma forma
 * @param {string|null} formato formato declarado da tabela, ou null
 */
export function candidaturas(t, acima, formato) {
  if (BLOG.includes(formato)) return []; // em blog, cabeçalho é conteúdo
  if (numeroDoSlide(t) != null) return []; // "Slide N" é um slide, com qualquer palavra depois do número
  if (SO_HASHTAGS.test(t)) return ['hashtags'];
  const tem = (rx) => rx.test(t);
  const sob = (rx) => acima.some((a) => rx.test(a));
  const [ig, li, tw] = [tem(CANAL.instagram), tem(CANAL.linkedin), tem(CANAL.twitter)];
  const noInstagram = ig || (!li && !tw && (formato === 'instagram-feed' || sob(CANAL.instagram)));
  const noLinkedin = li || (!ig && !tw && tem(PECA.post) && (formato === 'linkedin-post' || sob(CANAL.linkedin)));
  const tipos = [];
  if (noInstagram && tem(PECA.legenda)) tipos.push('legenda');
  if (noInstagram && tem(PECA.slides)) tipos.push('slides');
  if (noLinkedin && !tem(PECA.slides)) tipos.push('post');
  if (tw) tipos.push('tweet');
  return tipos.length || !tem(PECA.hashtags) ? tipos : ['hashtags'];
}

/** Formato do canal que o cabeçalho cita (Instagram, LinkedIn ou Twitter, nesta ordem), ou null. */
const canalDe = (t) => FORMATO_DO_CANAL[Object.keys(CANAL).find((c) => CANAL[c].test(t))] ?? null;

/**
 * Cabeçalhos de um corpo de blog que casam com outro canal pelos critérios da regra 3 (b), cada
 * um uma vez: em blog declarado a seção não é medida, mas o relatório diz qual é.
 */
export function secoesDeOutroCanal(corpo) {
  const titulos = new Set();
  let pilha = [];
  for (const m of marcar(corpo)) {
    if (m.rotulo) pilha = [];
    if (!m.nivel) continue;
    pilha = pilha.filter((c) => c.nivel < m.nivel);
    if (candidaturas(m.norm, pilha.map((c) => c.norm), null).some((tipo) => tipo !== 'hashtags')) titulos.add(m.titulo);
    pilha.push(m);
  }
  return [...titulos];
}

function abrir(trechos, trecho) {
  trechos.push({ ...trecho, linhas: [] });
  return trechos.at(-1);
}

/**
 * Peças a que algum cabeçalho de baixo do cabeçalho de nível 1 da posição `i` é candidato; a
 * seção dele vai até o próximo de nível 1 ou até um rótulo.
 */
function tiposSobOTitulo(marcas, i, formato) {
  const tipos = new Set();
  let pilha = [marcas[i]];
  for (let j = i + 1; j < marcas.length && !marcas[j].rotulo && marcas[j].nivel !== 1; j++) {
    if (!marcas[j].nivel) continue;
    pilha = pilha.filter((c) => c.nivel < marcas[j].nivel);
    for (const tipo of candidaturas(marcas[j].norm, pilha.map((c) => c.norm), formato)) tipos.add(tipo);
    pilha.push(marcas[j]);
  }
  return tipos;
}

/**
 * Percorre as marcas e devolve os trechos, na ordem do texto: `{ rotulo, linhas }` para cada
 * linha de rótulo e `{ titulo, tipos, canal, linhas }` para cada cabeçalho candidato a peça
 * (`canal`: na seção de hashtags, o formato do canal que o cabeçalho cita; senão null).
 * A seção de cabeçalho vai até o próximo cabeçalho do mesmo nível ou acima, ou até um rótulo; a
 * de rótulo, até o próximo rótulo ou até um cabeçalho candidato (regra 2).
 * O cabeçalho de nível 1 que tem, abaixo dele, outro candidato à mesma peça é o título do
 * arquivo: não abre essa peça (fase-u3a1-pasta-de-entrega.md, regra 4).
 */
export function lerTrechos(marcas, formato) {
  const trechos = [];
  let pilha = []; // cabeçalhos abertos, do mais externo ao mais interno
  let rotulo = null; // seção de rótulo aberta
  for (const [i, m] of marcas.entries()) {
    if (m.rotulo) {
      pilha = [];
      rotulo = abrir(trechos, { rotulo: m.rotulo });
      continue;
    }
    if (m.nivel) {
      pilha = pilha.filter((c) => c.nivel < m.nivel);
      const todos = candidaturas(m.norm, pilha.map((c) => c.norm), formato);
      const abaixo = m.nivel === 1 && todos.length ? tiposSobOTitulo(marcas, i, formato) : null;
      const tipos = abaixo ? todos.filter((tipo) => !abaixo.has(tipo)) : todos;
      const canal = tipos[0] === 'hashtags' ? canalDe(m.norm) : null;
      const trecho = tipos.length ? abrir(trechos, { titulo: m.titulo, tipos, canal }) : null;
      pilha.push({ nivel: m.nivel, norm: m.norm, trecho });
      if (trecho) {
        rotulo = null;
        continue;
      }
    }
    const dono = rotulo ?? pilha.findLast((c) => c.trecho)?.trecho;
    dono?.linhas.push(m.linha);
  }
  return trechos;
}
