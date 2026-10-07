// Guardar a entrega no projeto: decide o que está pronto para ser copiado, chama a cópia e diz,
// em uma ou duas linhas do resumo, o que aconteceu. Canal com pendência não aceita fica de fora,
// e o HTML editável dele também. Depois da cópia, guarda o retrato do que foi copiado (`copia.json`).
// Spec: fase-u3a2-entrega-no-projeto.md, regras 13 a 15 e §6 (repositório do OpenCrew).
import { relativoAoProjeto } from '../comum.mjs';
import { EDITAVEIS } from './canais.mjs';
import { retratoDe } from './comparar.mjs';
import { copiar } from './copia.mjs';
import { MSG as DESTINO } from './destino.mjs';
import { montarLeiame } from './leiame.mjs';
import { gravarRetratos, lerRetratos } from './retrato.mjs';

export const MSG = {
  falhaDeEscrita: (arquivo) => `Não consegui gravar ${arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo.`,
  criei: (destino) => `Criei a pasta ${destino}.`,
  nova: (pasta) => `Cópia: ${pasta}`,
  igual: (pasta) => `Cópia: ${pasta} — já está atualizada.`,
  completada: (pasta, n) => `Cópia: ${pasta} — completei com ${n} ${n === 1 ? 'arquivo novo' : 'arquivos novos'}.`,
  reentrega: (pasta) => `Cópia: ${pasta} — guardei aqui porque a entrega mudou. Os arquivos da anterior ficaram como estavam; só o LEIA-ME dela ganhou um aviso.`,
  nada: 'Cópia: nada foi copiado, porque nenhum canal está pronto.',
};

/** A pasta cuja situação decide se o arquivo é copiado: a do canal (o editável segue o canal dele). */
const canalDe = (a) => (a.pasta === EDITAVEIS ? a.doCanal : a.pasta);

/** Pasta criada nesta chamada: o retrato dela começa do zero. */
const ehNova = (r) => r.tipo === 'nova' || r.tipo === 'reentrega';

/** As linhas do resumo para o que a cópia devolveu. */
function linhasDe(r, destino) {
  if (r.tipo === 'nova') return [...(r.criouDestino ? [MSG.criei(destino.rel)] : []), MSG.nova(r.pasta)];
  return [MSG[r.tipo](r.pasta, r.novos)];
}

/**
 * Copia para o destino o que está pronto e descreve o resultado.
 * @param {string} raiz pasta do projeto · @param {object} destino o que `escolherDestino` devolveu
 * @param {object} dados os dados da entrega (os do LEIA-ME)
 * @param {string} execucao a pasta da execução, absoluta: é nela que fica o retrato da cópia
 * @returns {Promise<{ linhas: string[], pasta: string|null, falhou: boolean }>} `linhas`: as do
 *   resumo · `pasta`: a pasta da cópia, relativa ao projeto, quando há uma · `falhou`: destino
 *   recusado ou gravação que falhou (o final é ENTREGA:INCOMPLETA)
 */
export async function guardar(raiz, destino, dados, execucao) {
  if (destino.tipo === 'nao') return { linhas: [], pasta: null, falhou: false };
  if (destino.tipo === 'nenhum') return { linhas: [DESTINO.semDestino], pasta: null, falhou: false };
  if (destino.tipo === 'recusado') return { linhas: [DESTINO.recusado(destino.valor)], pasta: null, falhou: true };
  const pronto = (a) => !dados.pendencias.has(canalDe(a));
  const arquivos = dados.arquivos.filter(pronto);
  if (!arquivos.length) return { linhas: [MSG.nada], pasta: null, falhou: false };
  const ignorar = new Set(dados.arquivos.filter((a) => !pronto(a)).map((a) => `${a.pasta}/${a.nome}`));
  const leiame = (n) => montarLeiame({ ...dados, arquivos, ehCopia: true, reentrega: n });
  const retratos = await lerRetratos(execucao);
  const r = await copiar({ destino, run: dados.run, arquivos, ignorar, leiame, retratos });
  if (r.tipo === 'falha') return { linhas: [MSG.falhaDeEscrita(relativoAoProjeto(raiz, r.arquivo))], pasta: null, falhou: true };
  // O retrato da pasta: o que já estava nele e o que esta entrega tem (copiado agora ou igual ao que foi).
  const semRetrato = await gravarRetratos(execucao, { ...retratos, [r.pasta]: { ...(ehNova(r) ? {} : retratos[r.pasta]), ...(await retratoDe(arquivos)) } });
  const falha = semRetrato ? [MSG.falhaDeEscrita(relativoAoProjeto(raiz, semRetrato))] : [];
  return { linhas: [...linhasDe(r, destino), ...falha], pasta: r.pasta, falhou: falha.length > 0 };
}