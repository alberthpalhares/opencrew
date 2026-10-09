// O resumo que o `entregar.mjs` mostra na tela: a pasta, a situação de cada canal, o que falta, os
// avisos, a cópia e o LEIA-ME. O runner mostra essas linhas ao usuário como vieram.
// Specs: fase-u3a1-pasta-de-entrega.md, §4, e fase-u3a2-entrega-no-projeto.md, §4 e §6 (a linha
// `Cópia:` e a situação "Pronto, com ressalva"), e fase-u6a-polimento-do-uso-real.md, regra 5 (a linha de
// "Outros arquivos"), no repositório do OpenCrew.
import { CANAIS, OUTROS } from './canais.mjs';
import { situacaoDe } from './leiame.mjs';
import { frasesDePendencia } from './pendencias.mjs';

/** Regra 5 da U6a: "Outros arquivos" tem linha de situação quando é o único destino, ou quando tem pendência. */
const mostrarOutros = ({ pastas, arquivos, pendencias }) => pendencias.has(OUTROS) || (!pastas.length && arquivos.some((a) => a.pasta === OUTROS));

/**
 * @param {string} execucao a pasta da execução, relativa ao projeto
 * @param {object} dados os dados da entrega (os do LEIA-ME)
 * @param {string[]} notas o que sai em "Avisos:" antes dos avisos dos arquivos
 * @param {string[]} daCopia as linhas da cópia (ou da gravação que falhou), antes da linha do LEIA-ME
 * @returns {string[]} as linhas do resumo, sem a linha `ENTREGA:`
 */
export function resumo(execucao, dados, notas, daCopia) {
  const { crew, run, pastas, pendencias, avisos, alertas } = dados;
  const comPendencia = [...pastas, OUTROS].filter((p) => pendencias.has(p));
  const avisar = [...alertas.map((a) => a.texto), ...notas, ...avisos.map((a) => a.tela ?? a.texto)];
  return [
    `Entrega da execução ${run} da crew ${crew}`,
    `Pasta: ${execucao}/entrega`,
    ...pastas.map((p) => `- ${CANAIS[p]}: ${situacaoDe(dados, p)}`),
    ...(mostrarOutros(dados) ? [`- Outros arquivos: ${situacaoDe(dados, OUTROS)}`] : []),
    ...frasesDePendencia(comPendencia, pendencias).flatMap((frase, i) => [frase, ...pendencias.get(comPendencia[i]).map((l) => `- ${l}`)]),
    ...(avisar.length ? ['Avisos:', ...avisar.map((l) => `- ${l}`)] : []),
    ...daCopia,
    `LEIA-ME: ${execucao}/entrega/LEIA-ME.md`,
  ];
}