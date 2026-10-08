// Linha de comando do `execucao.mjs`: a crew, a ação, as opções e a linha de uso.
// Spec: fase-u5c-execucao-registrada.md, §3 (repositório do OpenCrew).
import { MSG } from '../comum.mjs';
import { RUN, limpar } from '../caminho/argumentos.mjs';

export const USO = 'Uso: node _opencrew/core/scripts/execucao.mjs <crew> <marcar|fechar|retomar> [opções]';
export const ACOES = ['marcar', 'fechar', 'retomar'];
/** Os resultados que cada evento do `marcar` aceita. */
export const RESULTADOS = { checkpoint: ['aprovado', 'corrigido', 'pulado'], revisao: ['aprovado', 'rejeitado'] };
export const FECHOS = ['aprovado', 'rejeitado', 'abortado', 'publicado'];

const OPCAO = /^--(run|passo|evento|resultado|nota|saida|tema)(?:=(.*))?$/s;
const INTEIRO = /^[1-9]\d{0,8}$/;
const lista = (itens) => `${itens.slice(0, -1).join(', ')} ou ${itens.at(-1)}`;

/**
 * `argv` → `{ crew, acao, run, passo, evento, resultado, nota, saida, tema }`. Os dois primeiros
 * argumentos soltos são a crew e a ação. Opção vale como `--nome valor` e `--nome=valor`; opção
 * ausente fica `undefined`.
 */
export function lerArgs(argv) {
  const soltos = [];
  const opcoes = {};
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(OPCAO) ?? [];
    if (!nome) soltos.push(argv[i]);
    else if (colado !== undefined) opcoes[nome] = colado;
    else opcoes[nome] = i + 1 < argv.length && !OPCAO.test(argv[i + 1]) ? argv[++i] : '';
  }
  const [crew, acao] = soltos.filter((s) => !s.startsWith('--'));
  return { crew, acao, ...opcoes };
}

function erroDoMarcar({ passo, evento, resultado }) {
  if (!passo) return MSG.faltaOpcao('--passo');
  if (!INTEIRO.test(passo)) return 'O --passo é um número inteiro a partir de 1.';
  if (!evento) return MSG.faltaOpcao('--evento');
  if (!RESULTADOS[evento]) return 'O --evento é checkpoint ou revisao.';
  if (!resultado) return MSG.faltaOpcao('--resultado');
  return RESULTADOS[evento].includes(resultado) ? null : `O --resultado de ${evento} é ${lista(RESULTADOS[evento])}.`;
}

function erroDoFechar({ resultado }) {
  if (!resultado) return MSG.faltaOpcao('--resultado');
  return FECHOS.includes(resultado) ? null : `O --resultado de fechar é ${lista(FECHOS)}.`;
}

/**
 * O que falta ou está errado na linha de comando, antes de olhar o disco. Só o `retomar` dispensa
 * o `--run` (sem ele, vale a execução aberta mais recente).
 * @returns {string|null} o motivo em PT-BR, ou `null`
 */
export function erroDeArgumentos(args) {
  const { crew, acao, run } = args;
  if (!crew) return 'Falta o nome da crew.';
  if (!acao) return `Falta a ação. Ações: ${ACOES.join(', ')}.`;
  if (!ACOES.includes(acao)) return `Ação desconhecida: ${limpar(acao)}. Ações: ${ACOES.join(', ')}.`;
  if (run === '' || (acao !== 'retomar' && !run)) return MSG.faltaOpcao('--run');
  if (run !== undefined && !RUN.test(run)) return 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.';
  if (acao === 'marcar') return erroDoMarcar(args);
  return acao === 'fechar' ? erroDoFechar(args) : null;
}
