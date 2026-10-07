// Separa os itens da lista em produtos da entrega: peças que viram arquivo próprio (unidades),
// cópias com o nome original e avisos. Não escreve nada: quem grava é `gravar.mjs`.
// Spec: fase-u3a1-pasta-de-entrega.md, §4 e regras 4, 8, 9 e 11 (repositório do OpenCrew).
import path from 'node:path';
import { lerItem } from '../verificar/arquivos.mjs';
import { semFrontmatter } from '../verificar/leitura.mjs';
import { EDITAVEIS, OUTROS } from './canais.mjs';
import { avisoDeFora, blocosFora } from './fora.mjs';
import { PRINCIPAL, hashtagsSoltas, pecasDoLeitor } from './leitor.mjs';
import { pecasDoBlog, pecasDoEmail, pecasDoWhatsapp, tweetsDaThread } from './longas.mjs';
import { emLf, fecharMd, paraColar, semServico } from './texto.mjs';

export const MSG = {
  // Só no resumo da tela: no LEIA-ME, a linha do arquivo em "Outros arquivos" já diz.
  semCanal: (arquivo) => `${arquivo} não tem canal conhecido. Está em \`outros/\`.`,
  semPeca: (peca, arquivo) => `Não encontrei ${peca} em ${arquivo}. Confira antes de colar.`,
  outroCanal: (arquivo, cabecalho) => `${arquivo} tem uma seção de outro canal (${cabecalho}) que não foi separada. Ela continua no arquivo de origem.`,
};

const IMAGEM = new Set(['.png', '.jpg', '.jpeg']);
const HTML = new Set(['.html', '.htm']);
const DITA = { legenda: 'a legenda', post: 'o post', tweet: 'o tweet', blog: 'o artigo', email: 'o e-mail', mensagem: 'a mensagem' };
const LONGAS = {
  'blog-post': ['blog', pecasDoBlog], 'blog-seo': ['blog', pecasDoBlog],
  'email-newsletter': ['email', pecasDoEmail], 'email-sales': ['email', pecasDoEmail],
  'whatsapp-broadcast': ['mensagem', pecasDoWhatsapp],
};

const extensao = (item) => path.extname(item.abs).toLowerCase();
const semExtensao = (item) => item.abs.slice(0, item.abs.length - path.extname(item.abs).length).toLowerCase();
const ehImagem = (item) => IMAGEM.has(extensao(item));

/** HTML editável: tem na lista uma imagem de mesmo nome, na mesma pasta. */
const ehEditavel = (item, itens) => HTML.has(extensao(item)) && itens.some((i) => i.tipo === 'arquivo' && ehImagem(i) && semExtensao(i) === semExtensao(item));

/** Cópia com o nome original: `de` (os mesmos bytes do arquivo) ou `texto` (o corpo tratado). */
function copia(item, pasta, tipo, texto = null) {
  const base = { pasta, nome: path.basename(item.abs), tipo, origem: item.rel, pastaDeOrigem: path.dirname(item.abs) };
  return texto ? { ...base, texto } : { ...base, de: item.abs };
}

/** Tweets de uma thread escrita em blocos `TWEET n/N`; as hashtags soltas vão no fim do primeiro. */
function daThread(corpo) {
  const tweets = tweetsDaThread(corpo);
  const soltas = tweets.length ? hashtagsSoltas(corpo) : [];
  const unidades = tweets.map((t, i) => {
    const texto = paraColar(i === 0 && soltas.length ? `${t}\n\n${soltas.join(' ')}` : t);
    return { tipo: 'tweet', ordem: i + 1, total: tweets.length, partes: [{ nome: 'tweet', sufixo: '', ext: 'txt', tipo: 'tweet', texto }] };
  });
  return { unidades, temSlides: false, outros: [] };
}

/** As unidades de um arquivo de texto, pelo formato dele; `tipo`: a peça que não pode faltar; `fora`: os blocos que não entram. */
function lerUnidades(texto, formato) {
  if (LONGAS[formato]) return { tipo: LONGAS[formato][0], unidades: LONGAS[formato][1](texto, formato), temSlides: false, outros: [], fora: blocosFora(texto) };
  const corpo = semServico(semFrontmatter(texto));
  const thread = formato === 'twitter-thread' ? daThread(corpo) : null;
  if (thread?.unidades.length) return { tipo: PRINCIPAL[formato], ...thread, fora: blocosFora(texto) };
  return { tipo: PRINCIPAL[formato], ...pecasDoLeitor(corpo, formato), fora: blocosFora(texto, formato) };
}

/** Arquivo `.md` ou `.txt` de um formato com peças: as unidades, ou o arquivo inteiro, com aviso. */
function separarPecas(item, texto, itens, p) {
  const { tipo, unidades, temSlides, outros, fora } = lerUnidades(texto, item.formato);
  const comArquivo = unidades.map((u) => ({ ...u, partes: u.partes.filter((parte) => parte.texto) })).filter((u) => u.partes.length);
  for (const u of comArquivo) p.unidades.push({ ...u, pasta: item.canal, origem: item.rel, formato: item.formato });
  for (const cabecalho of outros) p.avisos.push({ pasta: item.canal, texto: MSG.outroCanal(item.rel, cabecalho) });
  const semImagem = !itens.some((i) => i.tipo === 'arquivo' && ehImagem(i) && i.formato === item.formato);
  if (!comArquivo.length) p.avisos.push({ pasta: item.canal, texto: MSG.semPeca(DITA[tipo], item.rel) });
  // O arquivo que vai inteiro leva todos os blocos: só há o que avisar quando ele não vai.
  if (!comArquivo.length || (temSlides && semImagem)) p.copias.push(copia(item, item.canal, 'inteiro'));
  else p.avisos.push(...avisoDeFora(item, fora));
}

/** Um item que existe → os produtos dele. */
async function separarItem(item, itens, p) {
  if (ehEditavel(item, itens)) return p.copias.push(copia(item, EDITAVEIS, 'editavel'));
  if (!item.canal) {
    p.avisos.push({ pasta: OUTROS, tela: MSG.semCanal(item.rel) });
    return p.copias.push(copia(item, OUTROS, 'copia'));
  }
  const lido = ['.md', '.txt'].includes(extensao(item)) ? await lerItem(item.abs) : null;
  if (lido?.tipo !== 'texto') return p.copias.push(copia(item, item.canal, ehImagem(item) ? 'imagem' : 'copia'));
  const texto = emLf(lido.texto);
  if (LONGAS[item.formato] || PRINCIPAL[item.formato]) return separarPecas(item, texto, itens, p);
  // Roteiro ou artigo: o corpo, sem frontmatter e sem blocos de serviço; as linhas de rótulo ficam.
  p.avisos.push(...avisoDeFora(item, blocosFora(texto)));
  return p.copias.push(copia(item, item.canal, 'roteiro', fecharMd(semServico(semFrontmatter(texto)))));
}

/**
 * @param {object[]} itens os itens da lista, já sem os arquivos de serviço:
 *   `{ abs, rel, formato, canal, tipo }` (`tipo`: arquivo, pasta ou ausente)
 * @returns {Promise<{ unidades: object[], copias: object[], avisos: object[] }>}
 *   · `unidades`: `{ pasta, tipo, titulo, origem, formato, ordem, total, partes }`
 *   · `copias`: `{ pasta, nome, tipo, origem, pastaDeOrigem, de | texto }`
 *   · `avisos`: `{ pasta, texto, tela }` (`tela`: o texto do resumo da tela; sem `texto`, só sai lá)
 */
export async function separar(itens) {
  const produtos = { unidades: [], copias: [], avisos: [] };
  for (const item of itens.filter((i) => i.tipo === 'arquivo')) await separarItem(item, itens, produtos);
  return produtos;
}
