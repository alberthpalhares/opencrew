// O histórico no conserto: pastas de execução sem linha no `runs.md` (achado), pasta vazia e linha
// sem pasta (só apontadas), e o item que grava a linha "Registrada depois". Nunca apaga nem cria
// registro de execução.
// Spec: fase-u5c-execucao-registrada.md, regras 12 e 13 (repositório do OpenCrew).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { REGISTRADA_DEPOIS, comLinha, dataDe, linhaDe, runsDoHistorico } from '../execucao/historico.mjs';
import { RUN } from '../caminho/argumentos.mjs';
import { ARQUIVO, limparTema } from '../execucao/registro.mjs';

const MSG = {
  semLinha: (n) => `${n} ${n === 1 ? 'execução' : 'execuções'} sem linha no histórico.`,
  vazias: (runs) => `${runs.length} ${runs.length === 1 ? 'execução abandonada (pasta vazia)' : 'execuções abandonadas (pasta vazia)'}: ${runs.join(', ')}`,
  semPasta: (runs) => `${runs.length} ${runs.length === 1 ? 'linha' : 'linhas'} do histórico sem a pasta da execução: ${runs.join(', ')} (só aponto: nada é apagado)`,
  interrompida: (crew) => ` (interrompida: /opencrew retomar ${crew} continua de onde parou)`,
  comoRegistrar: 'Para registrar: --aplicar "historico:<execução>=<tema>"',
  semValor: (item) => `Sobra ou falta valor em --aplicar "${item.escrito}". Veja os itens com --ajuda.`,
  semExecucao: (item) => `Pasta de execução não encontrada em --aplicar "${item.escrito}".`,
  jaTemLinha: (run) => `A execução ${run} já tem linha no histórico.`,
};

const COM_DATA = /^\d{4}-\d{2}-\d{2}/;
const MAXIMO_DE_NOMES = 8;

const entradas = (pasta) => (existsSync(pasta) ? readdirSync(pasta, { withFileTypes: true }) : []);
const saidaDe = (crew) => path.join(crew.pasta, 'output');

/** O `status` do registro da pasta, ou `null` (sem registro, ou ilegível). */
function statusDe(pasta) {
  try {
    return JSON.parse(readFileSync(path.join(pasta, ARQUIVO), 'utf8')).status ?? null;
  } catch {
    return null;
  }
}

/** Uma pasta da execução, como o usuário a reconhece: pelos arquivos dela (`v1/ata.md`); sem arquivo direto, `v1/`. */
function daPasta(execucao, nome) {
  const arquivos = entradas(path.join(execucao, nome)).filter((e) => e.isFile()).map((e) => `${nome}/${e.name}`);
  return arquivos.length ? arquivos : [`${nome}/`];
}

/** As pastas de `output/` que são de execução: o nome começa por uma data, ou a pasta tem registro. */
function execucoes(crew) {
  const pastas = entradas(saidaDe(crew)).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  return pastas.map((run) => {
    const pasta = path.join(saidaDe(crew), run);
    // O registro (e um temporário dele) não conta como arquivo da execução: a pasta que só tem isso é abandonada.
    const doRegistro = (nome) => nome === ARQUIVO || (nome.startsWith(`${ARQUIVO}.`) && nome.endsWith('.tmp'));
    const topo = entradas(pasta).filter((e) => !doRegistro(e.name)).flatMap((e) => (e.isDirectory() ? daPasta(pasta, e.name) : [e.name])).sort();
    return { run, topo, status: statusDe(pasta), ehExecucao: COM_DATA.test(run) || existsSync(path.join(pasta, ARQUIVO)) };
  }).filter((e) => e.ehExecucao);
}

/** O que não bate entre as pastas e o `runs.md`. */
function situacao(crew) {
  const comLinhaNoHistorico = runsDoHistorico(crew.runs);
  const pastas = execucoes(crew);
  const semLinha = pastas.filter((e) => !comLinhaNoHistorico.includes(e.run));
  return {
    semLinha: semLinha.filter((e) => e.topo.length),
    vazias: semLinha.filter((e) => !e.topo.length).map((e) => e.run),
    semPasta: comLinhaNoHistorico.filter((run) => !existsSync(path.join(saidaDe(crew), run))),
  };
}

/** O que é só apontado: a pasta vazia e a linha sem pasta. */
function apontados({ vazias, semPasta }) {
  return [...(vazias.length ? [MSG.vazias(vazias)] : []), ...(semPasta.length ? [MSG.semPasta(semPasta)] : [])];
}

function linhaDaPasta(crew, { run, topo, status }) {
  const nomes = topo.length > MAXIMO_DE_NOMES ? [...topo.slice(0, MAXIMO_DE_NOMES), '…'] : topo;
  return `${run}: ${nomes.join(', ')}${status === 'aberta' ? MSG.interrompida(crew.nome) : ''}`;
}

/** O achado `historico`: só existe quando há pasta com arquivos e sem linha. @returns {string[]|null} */
export function achadoDoHistorico(crew) {
  const s = situacao(crew);
  if (!s.semLinha.length) return null;
  return [MSG.semLinha(s.semLinha.length), ...s.semLinha.map((e) => linhaDaPasta(crew, e)), ...apontados(s), MSG.comoRegistrar];
}

/** Sem o achado, o que é só apontado sai como nota: não deixa a crew pendente. @returns {string[]} */
export function notasDoHistorico(crew) {
  const s = situacao(crew);
  return s.semLinha.length ? [] : apontados(s).map((linha) => `Nota: ${linha}`);
}

/** O item `historico:<execução>=<tema>`: a linha "Registrada depois", na posição da data dela. */
export function historico(crew, item, plano) {
  const run = item.alvo;
  const pasta = path.join(saidaDe(crew), run);
  if (!RUN.test(run) || !entradas(saidaDe(crew)).some((e) => e.isDirectory() && e.name === run)) return MSG.semExecucao(item);
  const { runs } = crew.arquivos;
  const texto = plano.texto(runs, crew.runs);
  if (runsDoHistorico(texto).includes(run)) return MSG.jaTemLinha(run);
  if (!limparTema(item.valor)) return MSG.semValor(item);
  const data = dataDe(run, statSync(pasta).mtime); // id sem data: o dia em que a pasta mudou pela última vez
  const linha = linhaDe({ data, run, tema: limparTema(item.valor), saida: '', score: '', resultado: REGISTRADA_DEPOIS });
  return plano.trocar(runs, crew.runs, comLinha(texto, { crew: crew.nome, run, linha, porData: true }));
}
