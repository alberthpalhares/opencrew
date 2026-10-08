// Linha de comando do `caminho.mjs`: a crew, a ação, as opções e a linha de uso.
// Spec: fase-r3-runner-em-uso-real.md, §3 e §6 (repositório do OpenCrew).
import { MSG } from '../comum.mjs';
import { ACOES } from './nucleo.mjs';

export const USO = 'Uso: node _opencrew/core/scripts/caminho.mjs <crew> <ação> --run <id> [opções]';

const LISTA = ACOES.join(', ');
const OPCAO = /^--(run|arquivo|secoes|tldr|pedido|agente|formato|tema|passos|passo)(?:=(.*))?$/s;
/** O nome de uma execução: letras, dígitos, ponto, sublinhado e hífen (nunca só pontos). */
export const RUN = /^(?!\.+$)[A-Za-z0-9._-]+$/;
const INTEIRO = /^[1-9]\d{0,8}$/;

/** Texto que veio da linha de comando e volta numa mensagem: uma linha só, até 200 caracteres. */
export const limpar = (valor) => String(valor).replace(/\s+/g, ' ').trim().slice(0, 200);

/**
 * `argv` → `{ crew, acao, run, arquivo, secoes, tldr, pedido, tema, passos, passo }`. Os dois primeiros argumentos soltos são
 * a crew e a ação. Opção vale como `--nome valor` e `--nome=valor`; `--tldr` e `--pedido` não levam valor.
 * Opção ausente fica `undefined`.
 */
export function lerArgs(argv) {
  const soltos = [];
  const opcoes = {};
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(OPCAO) ?? [];
    if (!nome) soltos.push(argv[i]);
    else if (nome === 'tldr' || nome === 'pedido') opcoes[nome] = true;
    else if (colado !== undefined) opcoes[nome] = colado;
    else opcoes[nome] = i + 1 < argv.length && !OPCAO.test(argv[i + 1]) ? argv[++i] : '';
  }
  const [crew, acao] = soltos.filter((s) => !s.startsWith('--'));
  return { crew, acao, tldr: false, ...opcoes };
}

/**
 * O que falta ou está errado na linha de comando, antes de olhar o disco. `conferir` recebe um
 * caminho já resolvido: é a única ação que não precisa de `--run`.
 * @returns {string|null} o motivo em PT-BR, ou `null`
 */
export function erroDeArgumentos({ crew, acao, run, arquivo, secoes, passos, passo, pedido, agente, formato }) {
  if (!crew) return 'Falta o nome da crew.';
  if (!acao) return `Falta a ação. Ações: ${LISTA}.`;
  if (!ACOES.includes(acao)) return `Ação desconhecida: ${limpar(acao)}. Ações: ${LISTA}.`;
  // `pasta` sem --run: o script dá o nome à execução (data e hora do computador).
  if (acao !== 'conferir' && acao !== 'pasta' && !run) return MSG.faltaOpcao('--run');
  if (run === '') return MSG.faltaOpcao('--run'); // `--run` sem valor não vira "sem --run"
  if (run !== undefined && !RUN.test(run)) return 'O --run só aceita letras, dígitos, ponto, sublinhado e hífen.';
  if (acao !== 'pasta' && !arquivo) return MSG.faltaOpcao('--arquivo');
  if (secoes !== undefined && !INTEIRO.test(secoes)) return 'O --secoes é um número inteiro a partir de 1.';
  if (passos !== undefined && !INTEIRO.test(passos)) return 'O --passos é um número inteiro a partir de 1.';
  if (passo !== undefined && !INTEIRO.test(passo)) return 'O --passo é um número inteiro a partir de 1.';
  if (pedido && acao !== 'pasta') return 'O --pedido só vale na ação pasta.';
  if (pedido && passos !== undefined) return 'Um pedido não tem pipeline: --pedido não vai com --passos.';
  if ((agente !== undefined || formato !== undefined) && !pedido) return 'O --agente e o --formato só valem com --pedido.';
  if (agente !== undefined && !RUN.test(agente)) return 'O --agente é o id do agente na crew (letras, dígitos, ponto, sublinhado e hífen).';
  if (formato !== undefined && !/^[a-z0-9-]+$/.test(formato)) return 'O --formato é o id de um formato (letras minúsculas, dígitos e hífen).';
  return null;
}
