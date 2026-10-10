// Quem entra na limpeza e quem fica, em funções puras. Uma execução só é candidata quando está FECHADA (uma
// das quatro situações finais, ou sem registro por ser de antes da 1.14.0), fora das `manter` mais recentes
// e com a entrega guardada em outro lugar (ou o usuário diz que não precisa). Na dúvida, fica.
// Spec: fase-u6b-dados-e-custo.md, regras 2 e 3 (repositório do OpenCrew).

/** As situações em que uma execução terminou; qualquer outra coisa no registro fica. */
const FECHADAS = new Set(['aprovada', 'rejeitada', 'abortada', 'publicada']);

export const MOTIVO = {
  inexistente: 'não há pasta de execução com esse nome em output/',
  aberta: 'aberta: pode ser retomada com /opencrew retomar',
  ilegivel: 'o registro da execução não pôde ser lido (arquivo em uso ou danificado)',
  situacao: 'a situação gravada no registro não é de uma execução fechada',
  recente: (n) => (n === 1 ? 'é a execução fechada mais recente' : `entre as ${n} mais recentes`),
  semCopia: 'a entrega não foi copiada para o projeto',
  desconhecida: 'não é uma pasta de execução',
};

/** Por que uma execução não pode ser candidata pela situação dela, ou `null` quando está fechada. */
function motivoDaSituacao(e) {
  if (!e.reconhecida) return MOTIVO.desconhecida;
  if (e.ilegivel) return MOTIVO.ilegivel;
  if (e.status === 'aberta') return MOTIVO.aberta;
  return e.status === null || FECHADAS.has(e.status) ? null : MOTIVO.situacao;
}

/**
 * @param {Array<object>} execucoes o que `lerExecucoes` devolveu
 * @param {{ manter: number, semEntrega?: string[] }} o
 * @returns {{ candidatas: object[], ficam: Array<{ run: string, motivo: string }> }} candidatas da mais antiga para a mais nova
 */
export function selecionar(execucoes, { manter, semEntrega = [] }) {
  const ficam = [];
  const fechadas = [];
  for (const e of execucoes) {
    const motivo = motivoDaSituacao(e);
    if (motivo) ficam.push({ run: e.run, motivo });
    else fechadas.push(e);
  }
  const maisNovasPrimeiro = [...fechadas].sort((a, b) => b.instante - a.instante || (a.run < b.run ? 1 : -1));
  const candidatas = [];
  maisNovasPrimeiro.forEach((e, i) => {
    if (i < manter) ficam.push({ run: e.run, motivo: MOTIVO.recente(manter) });
    else if (!e.copiada && !semEntrega.includes(e.run)) ficam.push({ run: e.run, motivo: MOTIVO.semCopia });
    else candidatas.push(e);
  });
  return { candidatas: candidatas.reverse(), ficam: ficam.sort((a, b) => (a.run < b.run ? -1 : 1)) };
}
