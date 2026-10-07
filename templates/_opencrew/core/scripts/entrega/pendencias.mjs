// O que a verificação diz da entrega: as pendências de cada canal (bloqueio, [PREENCHER], item
// que não existe), o que não foi conferido e o alerta de tamanho do texto entregue.
// Spec: fase-u3a1-pasta-de-entrega.md, regras 17, 19, 20 e 34 (repositório do OpenCrew).
import path from 'node:path';
import { lerLimites } from '../verificar/leitura.mjs';
import { contar, FALTA_INFO, NAO_MEDIDO, NAO_VERIFICADO } from '../verificar/regras.mjs';
import { OUTROS, nomeDaPasta } from './canais.mjs';

export const MSG = {
  naoEncontrei: (arquivo) => `Não encontrei ${arquivo}.`,
  naoPronto: (canal, n) => `${canal} não está pronto: ${n} ${n === 1 ? 'pendência' : 'pendências'}.`,
  alerta: (arquivo, n, limite) => `ALERTA: \`${arquivo}\` tem ${n} caracteres; o limite é ${limite}. Encurte antes de publicar.`,
};
/** A lista fixa do que o script nunca confere. */
export const NUNCA_CONFERIDO = ['Links e fatos citados no texto.', 'Texto dentro das imagens.', 'Aparência final em cada rede.'];

const ehNaoMedido = (i) => i.item === NAO_MEDIDO || i.item === NAO_VERIFICADO;
const origem = (arquivo) => `origem: \`${arquivo}\``;

/** Uma linha de pendência ou de alerta, com o trecho (ou a medida) e o arquivo de origem. */
function linhaDoItem(i, arquivo) {
  if (i.item === FALTA_INFO) return `Falta preencher "${i.detalhe}" — ${origem(arquivo)}`;
  if (ehNaoMedido(i)) return `${i.item} — ${i.detalhe} — ${origem(arquivo)}`;
  if (i.medido != null) return `${i.item}: ${i.medido} (${i.minimo ? 'mínimo' : 'limite'} ${i.limite}) — ${origem(arquivo)}`;
  return `${i.item}: "${i.detalhe}" — ${origem(arquivo)}`;
}

/** O resultado do verificador para um item da lista (só os arquivos de texto têm). */
const resultadoDe = (raiz, r, item) => r.arquivos.find((a) => path.resolve(raiz, a.arquivo) === item.abs && (a.formato ?? null) === (item.formato ?? null));

/**
 * Pendências por pasta da entrega (canal ou `outros`), na ordem da lista.
 * @returns {Map<string, string[]>} só as pastas que têm pendência
 */
export function pendenciasPorPasta(raiz, itens, r) {
  const mapa = new Map();
  const somar = (item, linha) => mapa.set(item.canal ?? OUTROS, [...(mapa.get(item.canal ?? OUTROS) ?? []), linha]);
  for (const item of itens) {
    if (item.tipo !== 'arquivo') somar(item, MSG.naoEncontrei(item.rel));
    for (const i of resultadoDe(raiz, r, item)?.itens ?? []) if (i.nivel === 'bloqueio') somar(item, linhaDoItem(i, item.rel));
  }
  return mapa;
}

/** As frases "{canal} não está pronto: {n} pendências.", na ordem das pastas dadas. */
export const frasesDePendencia = (pastas, pendencias) => pastas.filter((p) => pendencias.has(p)).map((p) => MSG.naoPronto(nomeDaPasta(p), pendencias.get(p).length));

/** O que não foi conferido: alertas, "não medido", "não verificado" e a lista fixa. Não muda o final. */
export function naoConferido(raiz, itens, r) {
  const linhas = [];
  for (const item of itens.filter((i) => i.tipo === 'arquivo')) {
    for (const i of resultadoDe(raiz, r, item)?.itens ?? []) {
      if (i.nivel === 'alerta' || ehNaoMedido(i)) linhas.push(linhaDoItem(i, item.rel));
    }
  }
  if (r.naoTexto.length) linhas.push(`${NAO_VERIFICADO} — não é texto: ${r.naoTexto.join(', ')}`);
  return [...linhas, ...NUNCA_CONFERIDO];
}

const LIMITE = { legenda: 'caption_max_chars', post: 'post_max_chars', tweet: 'tweet_max_chars' };
const NOME_NO_RELATORIO = { legenda: 'Legenda Instagram', post: 'Post LinkedIn', tweet: 'Tweet' };
const NUMERADA = { legenda: 'legenda', post: 'post', tweet: 'Tweet' };

/** O verificador já bloqueou, no arquivo de origem, o tamanho desta mesma peça? */
function jaApontada(itensDaOrigem, a) {
  const doTipo = itensDaOrigem.filter((i) => i.nivel === 'bloqueio' && i.item.startsWith(NOME_NO_RELATORIO[a.tipo]) && i.item.endsWith('caracteres'));
  if (a.total < 2) return doTipo.length > 0;
  const numero = new RegExp(`${NUMERADA[a.tipo]} ${a.ordem}(?!\\d)`);
  return doTipo.some((i) => numero.test(i.item));
}

/**
 * Regra 34: cada `legenda*.txt`, `post*.txt` (não o comentário) e `tweet*.txt` gerado é contado
 * como o verificador conta e comparado com o limite do formato do item. Passou: um ALERTA — mas
 * só quando o verificador não apontou a mesma peça. Não é pendência.
 */
export async function alertasDeTamanho(raiz, itens, arquivos, r) {
  const alertas = [];
  for (const a of arquivos.filter((x) => LIMITE[x.tipo] && x.texto)) {
    const limite = (await lerLimites(raiz, a.formato)).limites?.[LIMITE[a.tipo]];
    const medido = contar(a.texto);
    const item = itens.find((i) => i.rel === a.origem && i.formato === a.formato);
    const daOrigem = (item && resultadoDe(raiz, r, item)?.itens) ?? [];
    if (typeof limite === 'number' && medido > limite && !jaApontada(daOrigem, a)) alertas.push(MSG.alerta(`${a.pasta}/${a.nome}`, medido, limite));
  }
  return alertas;
}
