// Data escrita com o dia da semana: o dia tem de bater com a data. "20 de setembro, sábado" em 2026
// cai num domingo. Alerta, nunca bloqueio; só olha o par dia da semana + data escrito por extenso em
// PT-BR, e não julga data passada (uma ata cita datas passadas de propósito).
// Um dia da semana entre duas datas serve às duas ("5 de maio, quarta, 6 de maio"): só há alerta quando
// nenhuma das duas bate. Lista de dias ("segunda a sexta", "sábado e domingo") não é conferida.
// Spec: fase-u6a-polimento-do-uso-real.md, regras 1 e 2 (repositório do OpenCrew).
import { item } from './regras.mjs';

const NOME = 'Datas';
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const NUMERO_DO_DIA = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const semAcento = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const FORA = '(?![\\p{L}\\d])';
const DIA = '(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:-feira)?';
// O ponto só entra na abreviatura ("20 de set."): em "20 de setembro." ele é o fim da frase.
const MES = '(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\\.?)';
const DIA_RX = new RegExp(`(?<![\\p{L}\\d])${DIA}${FORA}`, 'giu');
const DATA_RX = new RegExp(`(?<![\\p{L}\\d])(\\d{1,2})[º°]?[ \\t]+de[ \\t]+${MES}(?:[ \\t]+de[ \\t]+(\\d{4}))?${FORA}`, 'giu');
// Entre a data e o dia (vírgula, parêntese ou travessão) e entre o dia e a data; nunca atravessa a quebra de linha.
const ENTRE_DATA_E_DIA = /^[ \t]*[,(–—-][ \t]*$/;
const ENTRE_DIA_E_DATA = /^[ \t,–—-]+(?:dia[ \t]+)?$/;
const LISTA_DEPOIS = new RegExp(`^[ \\t]+(?:a|à|e|ou)[ \\t]+${DIA}${FORA}`, 'iu');
const LISTA_ANTES = new RegExp(`(?<![\\p{L}\\d])${DIA}[ \\t]+(?:a|à|e|ou)[ \\t]+$`, 'iu');

const mesDe = (texto) => {
  const chave = semAcento(texto);
  return MESES.findIndex((m) => semAcento(m).startsWith(chave.slice(0, 3)));
};

/** O dia da semana (0 = domingo) de uma data, ou `null` quando a data não existe (30 de fevereiro). */
function diaDaSemana(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes, dia));
  return data.getUTCMonth() === mes && data.getUTCDate() === dia ? data.getUTCDay() : null;
}

const bissexto = (ano) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

/**
 * Os anos em que a data vale, na ordem: o escrito; sem ano, o do relógio e — se a data já passou neste
 * ano — também o seguinte; 29 de fevereiro sem ano, o próximo bissexto.
 */
function anosDaData({ numero, mes, ano }, hoje) {
  if (ano) return [Number(ano)];
  const atual = hoje.getFullYear();
  if (mes === 1 && numero === 29) return [[atual, atual + 1, atual + 2, atual + 3, atual + 4].find(bissexto)];
  const jaPassou = mes < hoje.getMonth() || (mes === hoje.getMonth() && numero < hoje.getDate());
  return jaPassou ? [atual, atual + 1] : [atual];
}

/** Uma data contra o dia da semana: `{ ok: true }`, ou `{ ok: false, detalhe }` com o aviso. */
function avaliar({ trecho, dia, data }, hoje) {
  const numero = Number(data.numero);
  const mes = mesDe(data.mes);
  const anos = anosDaData({ numero, mes, ano: data.ano }, hoje);
  const certos = anos.map((ano) => diaDaSemana(ano, mes, numero));
  if (certos.includes(NUMERO_DO_DIA[semAcento(dia)])) return { ok: true };
  const escrita = `${numero} de ${MESES[mes]} de ${anos[0]}`;
  if (certos[0] === null) return { ok: false, detalhe: `‘${trecho}’: ${escrita} não existe. Confira a data.` };
  return { ok: false, detalhe: `‘${trecho}’: ${escrita} cai ${[0, 6].includes(certos[0]) ? 'num' : 'numa'} ${DIAS[certos[0]]}. Confira a data.` };
}

/** O último elemento de `lista` (em ordem) para o qual `cabe` é verdadeiro, ou `undefined`; busca binária. */
function ultimo(lista, cabe) {
  let [de, ate, achado] = [0, lista.length - 1, undefined];
  while (de <= ate) {
    const meio = (de + ate) >> 1;
    if (cabe(lista[meio])) [achado, de] = [lista[meio], meio + 1];
    else ate = meio - 1;
  }
  return achado;
}

/** O primeiro elemento de `lista` (em ordem) para o qual `cabe` é verdadeiro, ou `undefined`; busca binária. */
function primeiro(lista, cabe) {
  let [de, ate, achado] = [0, lista.length - 1, undefined];
  while (de <= ate) {
    const meio = (de + ate) >> 1;
    if (cabe(lista[meio])) [achado, ate] = [lista[meio], meio - 1];
    else de = meio + 1;
  }
  return achado;
}

const comPosicao = (m) => ({ ini: m.index, fim: m.index + m[0].length, m });
const anoValido = (ano) => !ano || (Number(ano) >= 1900 && Number(ano) <= 2200);

/** Cada dia da semana do texto com as datas que podem ser as dele (a de antes e a de depois), sem as listas de dias. */
function candidatos(texto) {
  const datas = [...texto.matchAll(DATA_RX)].map(comPosicao)
    .map(({ ini, fim, m }) => ({ ini, fim, numero: m[1], mes: m[2], ano: m[3] })).filter((d) => anoValido(d.ano));
  return [...texto.matchAll(DIA_RX)].map(comPosicao).flatMap(({ ini, fim, m }) => {
    if (LISTA_DEPOIS.test(texto.slice(fim, fim + 40)) || LISTA_ANTES.test(texto.slice(Math.max(0, ini - 40), ini))) return [];
    const antes = ultimo(datas, (d) => d.fim <= ini);
    const depois = primeiro(datas, (d) => d.ini >= fim);
    const pares = [];
    if (depois && ENTRE_DIA_E_DATA.test(texto.slice(fim, depois.ini))) pares.push({ tipo: 'antes', data: depois, dia: m[1], trecho: texto.slice(ini, depois.fim) });
    if (antes && ENTRE_DATA_E_DIA.test(texto.slice(antes.fim, ini))) pares.push({ tipo: 'depois', data: antes, dia: m[1], trecho: texto.slice(antes.ini, fim + (texto[fim] === ')' ? 1 : 0)) });
    return pares.length ? [pares] : [];
  });
}

/**
 * Os alertas de data de um texto; lista vazia quando todo dia da semana bate com uma data ao lado dele.
 * @param {string} texto · @param {Date} hoje o relógio do computador: o ano das datas escritas sem ano
 */
export function alertasDeDatas(texto, hoje) {
  const vistos = new Set();
  const detalhes = candidatos(texto).flatMap((pares) => {
    const resultados = pares.map((p) => avaliar({ ...p, trecho: p.trecho.replace(/\s+/g, ' ').trim() }, hoje));
    if (resultados.some((r) => r.ok)) return [];
    return [resultados[Math.max(0, pares.findIndex((p) => p.tipo === 'antes'))].detalhe];
  });
  return detalhes.filter((d) => !vistos.has(d.toLowerCase()) && vistos.add(d.toLowerCase())).map((d) => item(NOME, null, null, 'alerta', d));
}
