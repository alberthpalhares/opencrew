// Blocos de rótulo do arquivo de origem que não chegam à entrega: os de serviço (notas, checklist,
// FORMAT) e, nos formatos lidos pelo leitor de peças, os que não são a peça do formato (os SLIDES
// de um carrossel, por exemplo). A entrega não muda: o LEIA-ME só passa a dizer o que ficou fora.
// Spec: fase-u3a1-pasta-de-entrega.md, §4 e §6, ajuste da execução real (repositório do OpenCrew).
import { semFrontmatter } from '../verificar/leitura.mjs';
import { ROTULOS } from '../verificar/pecas.mjs';
import { lerTrechos, marcar } from '../verificar/secoes.mjs';
import { PRINCIPAL } from './leitor.mjs';
import { ehServico, secoesDeRotulo, semComentarios } from './texto.mjs';

export const MSG = {
  fora: (blocos) => `Ficou fora do texto para colar: ${blocos.join(', ')}. Veja no arquivo de origem.`,
  foraNaTela: (arquivo, blocos) => `${arquivo}: ficou fora do texto para colar: ${blocos.join(', ')}. Veja no arquivo de origem.`,
};

const tabelaDe = (formato) => (formato === 'twitter-thread' ? 'twitter-post' : formato);

/** O bloco deste rótulo chega à entrega? `formato`: o do leitor de peças, ou null (só o de serviço sai). */
function entra(rotulo, formato) {
  if (ehServico(rotulo)) return false;
  if (!formato) return true;
  const papel = ROTULOS[tabelaDe(formato)]?.[rotulo];
  return papel === PRINCIPAL[formato] || papel === 'parte' || rotulo === 'HASHTAGS';
}

/** As seções de rótulo como o leitor de peças as vê: cada uma vai até o próximo rótulo ou cabeçalho de peça. */
function secoesDoLeitor(corpo, formato) {
  const trechos = lerTrechos(marcar(corpo), tabelaDe(formato)).filter((t) => t.rotulo);
  return trechos.map((t) => ({ rotulo: t.rotulo, texto: t.linhas.join('\n').trim() }));
}

/**
 * Rótulos dos blocos com texto que ficam fora da entrega, cada um uma vez, na ordem do arquivo.
 * @param {string} texto o arquivo de origem, sem BOM e com LF
 * @param {string|null} [formato] formato lido pelo leitor de peças (`instagram-feed`,
 *   `linkedin-post`, `twitter-post`, `twitter-thread`); null nos outros, em que só o bloco de
 *   serviço fica fora
 * @returns {string[]}
 */
export function blocosFora(texto, formato = null) {
  const corpo = semComentarios(semFrontmatter(texto));
  const secoes = formato ? secoesDoLeitor(corpo, formato) : secoesDeRotulo(corpo);
  return [...new Set(secoes.filter((s) => s.rotulo && s.texto && !entra(s.rotulo, formato)).map((s) => s.rotulo))];
}

/** O aviso de um arquivo: `{ pasta, texto, tela }`, ou nenhum quando nada ficou fora. */
export function avisoDeFora(item, blocos) {
  return blocos.length ? [{ pasta: item.canal, texto: MSG.fora(blocos), tela: MSG.foraNaTela(item.rel, blocos) }] : [];
}
