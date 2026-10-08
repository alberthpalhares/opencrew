// O que os registros de uma crew dizem: qual execução ficou aberta e de que passo ela continua
// (`retomar`), e as correções das últimas execuções fechadas (lista do `fechar`). Só leitura.
// Spec: fase-u5c-execucao-registrada.md, regras 9 e 11 (repositório do OpenCrew).
import path from 'node:path';
import { pastasDe, temConteudo } from '../caminho/disco.mjs';
import { lerCrew } from '../conserto/crew.mjs';
import { lerRegistro } from './registro.mjs';

const MSG = {
  abertas: 'Execuções abertas (a mais recente primeiro):',
  naoAberta: (run) => `A execução ${run} não está aberta.`,
  sumiu: ' (o arquivo não está mais lá)',
  tudoFeito: 'Todos os passos já foram feitos: falta só encerrar a execução.',
  refeitos: 'Já gravados, mas serão feitos de novo:',
  voltaIncerta: (revisao, n) => `Não consegui ler na crew para qual passo a revisão do passo ${revisao} volta: recomeço do passo ${n}. Confira antes de continuar.`,
  correcoes: 'Correções das últimas execuções:',
};

/** Os registros legíveis das execuções da crew: `{ run, ...registro }`. */
async function registrosDe(raiz, crew) {
  const saida = path.resolve(raiz, 'crews', crew, 'output');
  const lidos = await Promise.all(pastasDe(saida).map(async (run) => ({ run, registro: await lerRegistro(path.join(saida, run)) })));
  return lidos.filter((l) => l.registro).map((l) => ({ ...l.registro, run: l.run }));
}

const maisNova = (campo) => (a, b) => String(b[campo] ?? '').localeCompare(String(a[campo] ?? '')) || b.run.localeCompare(a.run);

/**
 * Regra 9: as notas dos marcos `corrigido` e `rejeitado` das 10 execuções fechadas mais recentes.
 * @returns {Promise<string[]>} o título e uma linha por correção, a mais recente primeiro; `[]` sem nenhuma
 */
export async function correcoesRecentes(raiz, crew) {
  const fechadas = (await registrosDe(raiz, crew)).filter((r) => r.status !== 'aberta').sort(maisNova('fechadaEm')).slice(0, 10);
  const corrigiu = (m) => (m.resultado === 'corrigido' || m.resultado === 'rejeitado') && m.nota;
  const linhas = fechadas.flatMap((r) => r.marcos.filter(corrigiu).map((m) => `- ${r.run} · passo ${m.passo} · ${m.nota}`));
  return linhas.length ? [MSG.correcoes, ...linhas] : [];
}

/** Os passos da crew (o número e, na revisão, o passo para onde a rejeição volta); `[]` se a crew não pôde ser lida. */
function passosDaCrew(raiz, crew) {
  try {
    return lerCrew(raiz, path.join('crews', crew)).passos;
  } catch {
    return [];
  }
}

/** O que foi feito por último: o passo conferido ou o marco mais recente (no empate, o do passo maior; depois, o marco). */
function ultimoFeito(registro) {
  const feitos = [
    ...registro.passos.map((p) => ({ em: String(p.em ?? ''), passo: p.n, peso: 0 })),
    ...registro.marcos.map((m) => ({ em: String(m.em ?? ''), passo: m.passo, peso: 1, marco: m })),
  ];
  return feitos.sort((a, b) => a.em.localeCompare(b.em) || a.passo - b.passo || a.peso - b.peso).at(-1) ?? null;
}

/**
 * Para onde volta a revisão rejeitada no passo `revisao`: o passo do `on_reject`; se a crew não
 * diz (pipeline ilegível, alvo que não é número), o primeiro passo gravado antes da revisão —
 * refazer a mais é mais seguro que mandar o revisor ler de novo o texto que ele rejeitou.
 * @returns {{ n: number, incerto: boolean }}
 */
function voltaDe(registro, passos, revisao) {
  const declarado = passos.find((p) => p.numero === revisao)?.volta ?? null;
  if (declarado !== null) return { n: declarado, incerto: false };
  const antes = registro.passos.map((p) => p.n).filter((n) => n < revisao);
  return { n: antes.length ? Math.min(...antes) : revisao, incerto: true };
}

/**
 * Regra 11 (decisão 5 da spec): continua do passo seguinte ao último feito; revisão rejeitada
 * volta ao passo do `on_reject`; passo cujo arquivo sumiu é refeito.
 * @returns {{ feito: number|null, n: number, fim: boolean, incerto: boolean }} `fim`: não há passo
 *   depois do último feito · `incerto`: o passo de volta da revisão foi deduzido
 */
function proximoPasso(registro, passos, existe) {
  const numeros = passos.map((p) => p.numero).sort((a, b) => a - b);
  const ultimo = ultimoFeito(registro);
  const seguinte = (k) => numeros.find((n) => n > k) ?? k + 1;
  const rejeitou = ultimo?.marco?.evento === 'revisao' && ultimo.marco.resultado === 'rejeitado';
  const volta = rejeitou ? voltaDe(registro, passos, ultimo.passo) : null;
  const pelaOrdem = ultimo ? volta?.n ?? seguinte(ultimo.passo) : numeros[0] ?? 1;
  const sumidos = registro.passos.filter((p) => p.n < pelaOrdem && !existe(p.arquivo)).map((p) => p.n);
  const fim = numeros.length > 0 && pelaOrdem > numeros.at(-1);
  return { feito: ultimo?.passo ?? null, n: Math.min(pelaOrdem, ...sumidos), fim, incerto: volta?.incerto ?? false };
}

const comNota = (m) => `- passo ${m.passo}: ${m.resultado}${m.nota ? ` — ${m.nota}` : ''}`;
const grupo = (titulo, linhas) => (linhas.length ? [titulo, ...linhas] : []);

/** As linhas que descrevem uma execução aberta e a linha `EXECUCAO:RETOMAR`. */
function descrever(raiz, crew, registro) {
  const existe = (arquivo) => temConteudo(path.resolve(raiz, String(arquivo)));
  const { feito, n, fim, incerto } = proximoPasso(registro, passosDaCrew(raiz, crew), existe);
  const linha = (p) => `- passo ${p.n}: ${p.arquivo}${existe(p.arquivo) ? '' : MSG.sumiu}`;
  // Pronto é só o que fica antes do passo de onde a execução continua; o resto será feito de novo.
  const prontos = registro.passos.filter((p) => p.n < n).map(linha);
  const doEvento = (evento) => registro.marcos.filter((m) => m.evento === evento).map(comNota);
  return [
    `Execução: ${registro.run}`,
    `Tema: ${registro.tema || '(sem tema)'}`,
    ...(prontos.length ? ['Passos conferidos:', ...prontos] : ['Passos conferidos: nenhum']),
    ...grupo(MSG.refeitos, registro.passos.filter((p) => p.n >= n).map(linha)),
    ...grupo('Checkpoints respondidos:', doEvento('checkpoint')),
    ...grupo('Revisões:', doEvento('revisao')),
    ...(feito === null ? [] : [`Parou depois do passo ${feito}.`]),
    ...(incerto ? [MSG.voltaIncerta(feito, n)] : []),
    ...(fim && n > feito ? [MSG.tudoFeito] : []),
    `EXECUCAO:RETOMAR ${registro.run} ${n}`,
  ];
}

/**
 * Regra 11: a execução aberta mais recente da crew (ou a de `run`) e o passo de onde ela continua.
 * @returns {Promise<string[]>} as linhas da resposta; a última é `EXECUCAO:RETOMAR <run> <passo>` ou `EXECUCAO:NADA`
 */
export async function retomar(raiz, crew, run) {
  const abertas = (await registrosDe(raiz, crew)).filter((r) => r.status === 'aberta').sort(maisNova('iniciadaEm'));
  if (!abertas.length) return [...(run ? [MSG.naoAberta(run)] : []), 'EXECUCAO:NADA'];
  const lista = abertas.length > 1 ? [MSG.abertas, ...abertas.map((r) => `- ${r.run} — ${r.tema || 'sem tema'}`)] : [];
  const alvo = run ? abertas.find((r) => r.run === run) : abertas[0];
  return alvo ? [...lista, ...descrever(raiz, crew, alvo)] : [...lista, MSG.naoAberta(run), 'EXECUCAO:NADA'];
}
