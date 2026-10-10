// Linha de comando do `limpeza.mjs`: a crew, o que fazer e a linha de uso.
// Spec: fase-u6b-dados-e-custo.md, §3 e regras 2 a 4 (repositório do OpenCrew).
import { MSG } from '../comum.mjs';
import { RUN, limpar } from '../caminho/argumentos.mjs';

export const USO = 'Uso: node _opencrew/core/scripts/limpeza.mjs <crew> [--listar] [--manter N] [--apagar "<run>[,<run>…]" [--sem-entrega "<run>[,<run>…]"] [--audio]]';
const COM_VALOR = /^--(manter|apagar|sem-entrega)(?:=(.*))?$/s;
const SEM_VALOR = { '--listar': 'listar', '--audio': 'audio' };
const TODOS = new Set(['*', 'all', 'todos', 'tudo']);

const ids = (texto) => [...new Set(String(texto).split(',').map((s) => s.trim()).filter(Boolean))];

/**
 * `argv` → `{ crew, listar, audio, manter, apagar, semEntrega, desconhecido }`. `apagar` e `semEntrega`
 * ficam `undefined` quando a opção não veio, e uma lista (talvez vazia) quando veio.
 */
export function lerArgs(argv) {
  const args = { crew: undefined, listar: false, audio: false, manter: undefined, apagar: undefined, semEntrega: undefined, desconhecido: undefined };
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(COM_VALOR) ?? [];
    if (SEM_VALOR[argv[i]]) args[SEM_VALOR[argv[i]]] = true;
    else if (nome) {
      const valor = colado ?? (i + 1 < argv.length ? argv[++i] : '');
      if (nome === 'manter') args.manter = valor;
      else args[nome === 'apagar' ? 'apagar' : 'semEntrega'] = ids(valor);
    } else if (argv[i].startsWith('--')) args.desconhecido ??= argv[i];
    else args.crew ??= argv[i];
  }
  return args;
}

/** O que falta ou está errado na linha de comando, antes de olhar o disco; `null` quando está certo. */
export function erroDeArgumentos(args) {
  if (args.desconhecido) return `Opção desconhecida: ${limpar(args.desconhecido)}.`;
  if (!args.crew) return 'Falta o nome da crew.';
  if (args.manter !== undefined && !/^[1-9]\d?$/.test(args.manter)) return 'O --manter é um número inteiro de 1 a 99.';
  if (args.apagar && args.listar) return 'Use --listar ou --apagar, não os dois.';
  if (args.semEntrega && !args.apagar) return MSG.faltaOpcao('--apagar');
  if (!args.apagar) return args.audio ? 'O --audio só vale junto com --apagar.' : null;
  const todos = [...args.apagar, ...(args.semEntrega ?? [])];
  if (todos.some((id) => TODOS.has(id.toLowerCase()))) return 'Não existe "apagar tudo": escreva os run_id um a um.';
  const ruim = todos.find((id) => !RUN.test(id));
  if (ruim) return `O run_id só aceita letras, dígitos, ponto, sublinhado e hífen: ${limpar(ruim)}.`;
  const solto = (args.semEntrega ?? []).find((id) => !args.apagar.includes(id));
  if (solto) return `O --sem-entrega só vale para quem está em --apagar: ${limpar(solto)}.`;
  return args.apagar.length || args.audio ? null : 'Falta dizer o que apagar: escreva os run_id em --apagar.';
}
