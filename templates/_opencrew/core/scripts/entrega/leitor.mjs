// Peças que vêm do leitor do verificador (`lerPecas`): legenda, post e tweet, cada um com as
// suas hashtags no fim — e o primeiro comentário do LinkedIn, que sai do texto do post.
// Spec: fase-u3a1-pasta-de-entrega.md, §4 e regra 4 (repositório do OpenCrew). A legenda sem
// marcador (o arquivo que é só o texto) é da fase-u3a2-entrega-no-projeto.md, §4.
import { semAcento } from '../verificar/leitura.mjs';
import { contarSlides, lerPecas, listarHashtags } from '../verificar/pecas.mjs';
import { lerTrechos, marcar, rotuloDe } from '../verificar/secoes.mjs';
import { paraColar } from './texto.mjs';

/** Peça principal de cada formato: sem ela, o arquivo vai inteiro. */
export const PRINCIPAL = { 'instagram-feed': 'legenda', 'linkedin-post': 'post', 'twitter-post': 'tweet', 'twitter-thread': 'tweet' };
const TITULO = /^(#{1,6})\s+(.*)$/s;
const COMENTARIO = /(?<![\p{L}\p{N}])(?:comentarios?|comments?)(?![\p{L}\p{N}])/u;
const marca = (n) => `⟦comentario:${n}⟧`;
const MARCA = /^⟦comentario:(\d+)⟧$/;

/**
 * Tira do corpo as seções de comentário (cabeçalho com "comentário" ou "comment", até o próximo
 * cabeçalho do mesmo nível ou acima, ou até um rótulo). No lugar de cada uma fica uma linha de
 * marca: ela cai dentro do texto do post que vem antes.
 * @returns {{ corpo: string, comentarios: string[] }}
 */
function tirarComentarios(corpo) {
  const linhas = [];
  const comentarios = [];
  let nivel = 0; // nível do cabeçalho de comentário aberto; 0 = nenhum
  for (const linha of corpo.split('\n')) {
    const h = linha.match(TITULO);
    if (nivel && (rotuloDe(linha) || (h && h[1].length <= nivel))) nivel = 0;
    if (!nivel && h && COMENTARIO.test(semAcento(h[2]))) {
      nivel = h[1].length;
      linhas.push(marca(comentarios.push([]) - 1));
    } else if (nivel) comentarios.at(-1).push(linha);
    else linhas.push(linha);
  }
  return { corpo: linhas.join('\n'), comentarios: comentarios.map((c) => c.join('\n')) };
}

/** Texto da peça sem as linhas de marca, e os números dos comentários que estavam nele. */
function separarMarcas(texto) {
  const numeros = [];
  const linhas = texto.split('\n').filter((linha) => {
    const m = linha.trim().match(MARCA);
    if (m) numeros.push(Number(m[1]));
    return !m;
  });
  return { texto: linhas.join('\n'), numeros };
}

/** Cabeçalhos do corpo, na ordem: `[{ titulo, pai }]` (`pai`: o cabeçalho logo acima, ou null). */
function cabecalhos(corpo) {
  const lista = [];
  let pilha = [];
  for (const linha of corpo.split('\n')) {
    const h = linha.match(TITULO);
    if (!h) continue;
    pilha = pilha.filter((c) => c.nivel < h[1].length);
    lista.push({ titulo: h[2].trim(), pai: pilha.at(-1)?.titulo ?? null });
    pilha.push({ nivel: h[1].length, titulo: h[2].trim() });
  }
  return lista;
}

/** Título do bloco de cada peça de cabeçalho: o cabeçalho logo acima do dela, quando houver. */
function titulosDeBloco(corpo, pecas) {
  const lista = cabecalhos(corpo);
  let cursor = 0;
  return pecas.map((p) => {
    const i = p.origem === 'cabecalho' ? lista.findIndex((c, n) => n >= cursor && c.titulo === p.cabecalho) : -1;
    if (i < 0) return null;
    cursor = p.porParagrafo ? i : i + 1;
    return lista[i].pai;
  });
}

/** Hashtags da seção própria (rótulo ou cabeçalho) da legenda ou do post, sem as que já estão no texto. */
function hashtagsDaPeca(pecas, p) {
  const h = pecas.find((x) => x.tipo === 'hashtags' && x.de === p.tipo && x.ordem === p.ordem && x.formato === p.formato);
  return h ? listarHashtags(h.texto).slice(listarHashtags(p.texto).length) : [];
}

/** Hashtags das seções `=== HASHTAGS ===` e de cabeçalho "Hashtags" de um arquivo de tweets. */
export function hashtagsSoltas(corpo, tabela = 'twitter-post') {
  const trechos = lerTrechos(marcar(corpo), tabela).filter((t) => t.rotulo === 'HASHTAGS' || t.tipos?.[0] === 'hashtags');
  return trechos.flatMap((t) => listarHashtags(t.linhas.join('\n')));
}

const comHashtags = (texto, hashtags) => paraColar(hashtags.length ? `${texto}\n\n${hashtags.join(' ')}` : texto);

/** Comentário de cada post: o que caiu no texto dele; os que sobraram vão, na ordem, para os posts sem comentário. */
function distribuir(marcas, comentarios) {
  const usados = new Set(marcas.flat());
  const sobras = comentarios.map((_, n) => n).filter((n) => !usados.has(n));
  return marcas.map((numeros) => (numeros.length ? numeros : sobras.splice(0, 1)).map((n) => comentarios[n]).join('\n\n'));
}

/**
 * Arquivo de `instagram-feed` que é só o texto (sem rótulo, sem cabeçalho e sem linha "Slide N"): o
 * corpo inteiro é a legenda, como o leitor do verificador já faz com o post e com o tweet. A
 * unidade sai com `inteiro: true`, para o aviso.
 */
function legendaInteira(corpo) {
  const soTexto = corpo.trim() && !contarSlides(corpo) && !marcar(corpo).some((m) => m.rotulo || m.nivel);
  if (!soTexto) return [];
  return [{ tipo: 'legenda', titulo: null, ordem: 1, total: 1, inteiro: true, partes: [{ nome: 'legenda', sufixo: '', ext: 'txt', tipo: 'legenda', texto: paraColar(corpo) }] }];
}

/**
 * Lê as peças do formato num corpo já sem frontmatter e sem blocos de serviço.
 * @returns {{ unidades: object[], temSlides: boolean, outros: string[] }} `unidades`: uma por
 *   legenda, post ou tweet, `{ tipo, titulo, ordem, total, partes: [{ nome, sufixo, ext, tipo, texto }] }`
 *   · `outros`: cabeçalhos das seções de outro canal, que não são separadas
 */
export function pecasDoLeitor(corpoOriginal, formato) {
  const tabela = formato === 'twitter-thread' ? 'twitter-post' : formato;
  const tipo = PRINCIPAL[formato];
  const { corpo, comentarios } = tipo === 'post' ? tirarComentarios(corpoOriginal) : { corpo: corpoOriginal, comentarios: [] };
  const pecas = lerPecas(corpo, tabela);
  const principais = pecas.filter((p) => p.formato === tabela && p.tipo === tipo);
  const limpas = principais.map((p) => separarMarcas(p.texto));
  const doPost = distribuir(limpas.map((l) => l.numeros), comentarios);
  const titulos = titulosDeBloco(corpo, principais);
  const soltas = tipo === 'tweet' ? hashtagsSoltas(corpo) : [];
  const unidades = principais.map((p, i) => {
    const hashtags = tipo === 'tweet' ? (i === 0 ? soltas : []) : hashtagsDaPeca(pecas, p);
    const partes = [{ nome: tipo, sufixo: '', ext: 'txt', tipo, texto: comHashtags(limpas[i].texto, hashtags) }];
    if (doPost[i]?.trim()) partes.push({ nome: tipo, sufixo: '-comentario', ext: 'txt', tipo: 'comentario', texto: paraColar(doPost[i]) });
    return { tipo, titulo: titulos[i], ordem: i + 1, total: principais.length, partes };
  });
  const outros = pecas.filter((p) => p.formato !== tabela && p.tipo !== 'hashtags' && p.cabecalho).map((p) => p.cabecalho);
  const achadas = unidades.length || tipo !== 'legenda' ? unidades : legendaInteira(corpo);
  return { unidades: achadas, temSlides: pecas.some((p) => p.formato === tabela && p.tipo === 'slides'), outros: [...new Set(outros)] };
}
