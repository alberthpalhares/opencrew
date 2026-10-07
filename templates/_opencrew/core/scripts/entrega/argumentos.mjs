// Linha de comando do `entregar.mjs`: as opções, a lista `caminho=formato` e a linha de uso.
// Spec: fase-u3a1-pasta-de-entrega.md, §3 e §6 (repositório do OpenCrew).
import { lerItemDaLista } from '../verificar/argumentos.mjs';

export const USO = 'Uso: node _opencrew/core/scripts/entregar.mjs --crew "crews/<crew>" --run "<id>" --arquivo "<caminho=formato>[,<caminho=formato>…]" [--vai-publicar <canal>] [--ajuda]';

const OPCAO = /^--(crew|run|arquivo|vai-publicar)(?:=(.*))?$/s;

/** Texto que veio da linha de comando e volta numa mensagem: uma linha só, até 200 caracteres. */
export const limpar = (valor) => String(valor).replace(/\s+/g, ' ').trim().slice(0, 200);

function guardar(args, nome, valor) {
  if (nome === 'arquivo') args.arquivos.push(valor);
  else if (nome === 'vai-publicar') args.vaiPublicar.push(valor.trim().toLowerCase());
  else args[nome] = valor;
}

/**
 * `argv` → `{ crew, run, arquivos, vaiPublicar, ajuda, desconhecida }`. Opção vale como
 * `--nome valor` e `--nome=valor`. `--arquivo` e `--vai-publicar` repetidos somam, e o que vem
 * solto logo depois da lista é mais um item dela. `desconhecida`: a primeira opção que o script
 * não conhece, ou null.
 */
export function lerArgs(argv) {
  const args = { arquivos: [], vaiPublicar: [], ajuda: false, desconhecida: null };
  let naLista = false;
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(OPCAO) ?? [];
    const solto = !nome && !argv[i].startsWith('--');
    if (nome) guardar(args, nome, colado ?? (i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : ''));
    else if (argv[i] === '--ajuda') args.ajuda = true;
    else if (solto && naLista) args.arquivos.push(argv[i]);
    else args.desconhecida ??= argv[i];
    naLista = nome ? nome === 'arquivo' : solto && naLista;
  }
  return args;
}

/** A lista de `--arquivo` → `[{ arquivo, formato }]` (`formato` null quando não veio `=formato`). */
export function lerLista(arquivos) {
  const textos = arquivos.join(',').split(',').map((s) => s.trim()).filter(Boolean);
  return textos.map(lerItemDaLista).map((i) => (typeof i === 'string' ? { arquivo: i, formato: null } : i));
}

/** O `--run` é um segmento só: sem `/`, `\` nem `..`. */
export const runValido = (run) => !/[\\/]/.test(run) && run !== '..' && run !== '.';
