// Linha de comando do `estado.mjs`: a crew, o evento, as opções e a linha de uso.
// Spec: fase-e1-escritorio-ao-vivo.md, §3 e regra 7 (repositório do OpenCrew).

export const USO = 'Uso: node _opencrew/core/scripts/estado.mjs <crew> <evento> [opções]';

/** Teto, em caracteres visíveis, de `--rotulo`, `--mensagem` e `--motivo`. */
export const TETO = 120;

const OPCAO = /^--(passos|n|agente|rotulo|mensagem|motivo)(?:=(.*))?$/s;
const QUEBRA = /[\r\n\v\f\u0085\u2028\u2029]+/g;
const segmentador = new Intl.Segmenter('pt', { granularity: 'grapheme' });

/**
 * Texto recebido é dado: fica numa linha (quebra de linha vira espaço) e com até 120 caracteres.
 * O corte conta caracteres visíveis, por isso nunca parte um emoji ao meio. O laço para no 121º
 * segmento: no Node 20 cada segmento guarda uma cópia da entrada, e guardar todos custaria caro.
 */
export function limparTexto(valor) {
  const linha = String(valor).replace(QUEBRA, ' ').trim();
  let fim = 0;
  let visiveis = 0;
  for (const { index, segment } of segmentador.segment(linha)) {
    if (visiveis++ === TETO) break;
    fim = index + segment.length;
  }
  return linha.slice(0, fim);
}

/** Inteiro a partir de 1; qualquer outra coisa é `null` (a opção não vale). */
const inteiro = (valor) => (/^\d{1,9}$/.test(valor ?? '') && Number(valor) >= 1 ? Number(valor) : null);

/** As opções como o núcleo as recebe: ausente ou inválida é `null` (número, agente) ou vazio (texto). */
function converter(cru) {
  return {
    passos: inteiro(cru.passos),
    n: inteiro(cru.n),
    agente: limparTexto(cru.agente ?? '') || null,
    rotulo: limparTexto(cru.rotulo ?? ''),
    mensagem: limparTexto(cru.mensagem ?? ''),
    motivo: limparTexto(cru.motivo ?? ''),
  };
}

/**
 * `argv` → `{ crew, evento, opcoes: { passos, n, agente, rotulo, mensagem, motivo } }`. Os dois
 * primeiros argumentos soltos são a crew e o evento (indefinidos, se faltam). Opção vale como
 * `--nome valor` e `--nome=valor`; opção sem valor (a última, ou seguida de outra opção) não
 * consome o argumento seguinte.
 */
export function lerArgs(argv) {
  const soltos = [];
  const cru = {};
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(OPCAO) ?? [];
    if (!nome) soltos.push(argv[i]);
    else if (colado !== undefined) cru[nome] = colado;
    else if (i + 1 < argv.length && !OPCAO.test(argv[i + 1])) cru[nome] = argv[++i];
  }
  const [crew, evento] = soltos.filter((s) => !s.startsWith('--'));
  return { crew, evento, opcoes: converter(cru) };
}
