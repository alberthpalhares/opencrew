// O corpo do documento (`word/document.xml`): cada bloco lido do markdown vira um parágrafo ou uma
// tabela, na ordem em que foi escrito; a seção (papel, margens, cabeçalho e rodapé) vai por último.
// Spec: fase-u3b-documento-word.md, §4 e regra 3 (repositório do OpenCrew).
import { tabelaDeAssinaturas, tabelaDeDados } from './tabelas.mjs';
import { DECLARACAO, NS_R, NS_W, RECUO, borda, pPr, paragrafo, twips } from './xml.mjs';

/** A4 em pé, em twips. */
export const PAPEL = { largura: 11906, altura: 16838 };
/** Distância do cabeçalho e do rodapé até a borda do papel: 1,2 cm. */
const DA_BORDA = twips(1.2);
const PENDURADO = 283;
const VAZIO = '<w:p/>';

/** Largura da área de texto, em twips: o papel menos as margens dos lados. */
export const larguraDoTexto = (perfil) => PAPEL.largura - twips(perfil.margem_esquerda_cm) - twips(perfil.margem_direita_cm);

const PARAGRAFO = {
  centro: (b) => paragrafo({ estilo: b.estilo, quebra: b.quebra }, b.pedacos),
  titulo: (b) => paragrafo({ estilo: `Heading${b.nivel}`, quebra: b.quebra }, b.pedacos),
  item: (b) => paragrafo({ quebra: b.quebra, lista: b.nivel, recuo: { left: RECUO * (b.nivel + 1), hanging: PENDURADO } }, b.pedacos),
  paragrafo: (b) => paragrafo({ quebra: b.quebra, recuo: b.recuo ? { left: RECUO } : null }, b.pedacos, { b: b.negrito }),
  regua: (b) => `<w:p>${pPr({ quebra: b.quebra, bordas: borda('bottom', { cor: 'AAAAAA', espaco: 1 }) })}</w:p>`,
};
const TABELA = { tabela: tabelaDeDados, assinaturas: tabelaDeAssinaturas };
const ehTabela = (bloco) => Boolean(bloco && TABELA[bloco.tipo]);

/** Tabela: a quebra de página vai num parágrafo vazio antes; no fim, ou antes de outra tabela, um depois. */
function comTabela(bloco, proximo, largura) {
  const antes = bloco.quebra ? `<w:p>${pPr({ quebra: true })}</w:p>` : '';
  return `${antes}${TABELA[bloco.tipo](bloco, largura)}${!proximo || ehTabela(proximo) ? VAZIO : ''}`;
}

function secao(perfil, referencias) {
  const margens = { top: twips(perfil.margem_superior_cm), right: twips(perfil.margem_direita_cm), bottom: twips(perfil.margem_inferior_cm), left: twips(perfil.margem_esquerda_cm), header: DA_BORDA, footer: DA_BORDA, gutter: 0 };
  const lados = Object.entries(margens).map(([lado, valor]) => ` w:${lado}="${valor}"`).join('');
  const cabecalho = referencias.cabecalho ? `<w:headerReference w:type="default" r:id="${referencias.cabecalho}"/>` : '';
  const rodape = referencias.rodape ? `<w:footerReference w:type="default" r:id="${referencias.rodape}"/>` : '';
  return `<w:sectPr>${cabecalho}${rodape}<w:pgSz w:w="${PAPEL.largura}" w:h="${PAPEL.altura}"/><w:pgMar${lados}/></w:sectPr>`;
}

/**
 * @param {object[]} blocos os de `lerMarkdown`
 * @param {object} perfil o perfil completo (com os padrões)
 * @param {{ cabecalho?: string, rodape?: string }} referencias o `r:id` de cada parte que existe
 * @returns {string} o XML de `word/document.xml`
 */
export function montarCorpo(blocos, perfil, referencias) {
  const largura = larguraDoTexto(perfil);
  const partes = blocos.map((bloco, i) => (ehTabela(bloco) ? comTabela(bloco, blocos[i + 1], largura) : PARAGRAFO[bloco.tipo](bloco)));
  return `${DECLARACAO}<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}"><w:body>${partes.join('')}${secao(perfil, referencias)}</w:body></w:document>`;
}
