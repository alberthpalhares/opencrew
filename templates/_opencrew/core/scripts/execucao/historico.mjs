// A tabela do `runs.md` de uma crew, em funções puras: a linha de uma execução e o texto do
// arquivo com essa linha posta ou trocada. Nenhuma outra linha muda, byte a byte (fim de linha
// incluído). Usado pelo `execucao.mjs fechar` e pelo conserto do histórico.
// Spec: fase-u5c-execucao-registrada.md, §4 e regras 7 e 13 (repositório do OpenCrew).

const COLUNAS = '| Data | Run ID | Tema | Output | Score | Resultado |';
const TRACOS = '|------|--------|------|--------|-------|-----------|';
/** O `runs.md` que nasce quando a crew ainda não tem um. */
export const cabecalho = (crew) => `# Run History: ${crew}\n\n${COLUNAS}\n${TRACOS}\n`;

/** O `--resultado` do `fechar` como aparece na coluna Resultado. */
export const ROTULO = { aprovado: 'Aprovado', rejeitado: 'Rejeitado', abortado: 'Abortado', publicado: 'Publicado' };
export const REGISTRADA_DEPOIS = 'Registrada depois';

const celula = (texto) => String(texto ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim() || '—';
/** @param {{ data, run, tema, saida, score, resultado }} execucao célula vazia sai como `—` */
export const linhaDe = ({ data, run, tema, saida, score, resultado }) => `| ${[data, run, tema, saida, score, resultado].map(celula).join(' | ')} |`;

const dois = (n) => String(n).padStart(2, '0');
/** A data de uma execução: os 10 primeiros caracteres do `run_id`; id sem data, o dia de `quando`. */
export function dataDe(run, quando) {
  const [doRun] = /^\d{4}-\d{2}-\d{2}/.exec(run) ?? [];
  return doRun ?? `${quando.getFullYear()}-${dois(quando.getMonth() + 1)}-${dois(quando.getDate())}`;
}

const celulas = (linha) => (linha.trim().startsWith('|') ? linha.trim().replace(/\|$/, '').split('|').slice(1).map((c) => c.trim()) : null);
const ehTracos = (linha) => /^\s*\|[\s:|-]*-[\s:|-]*$/.test(linha);

/** Onde está a tabela: o índice da linha de traços e o da última linha de execução (ou o dos traços). */
function tabela(pedacos) {
  const comRunId = (i) => i > 0 && (celulas(pedacos[i - 1]) ?? []).some((c) => /^run\s*id$/i.test(c));
  let tracos = pedacos.findIndex((p, i) => ehTracos(p) && comRunId(i));
  if (tracos < 0) tracos = pedacos.findIndex((p, i) => ehTracos(p) && i > 0 && celulas(pedacos[i - 1]));
  if (tracos < 0) return null;
  // Linha em branco no meio não encerra a tabela, se depois dela ainda há linha de execução.
  let fim = tracos;
  for (let i = tracos + 1; i < pedacos.length && (celulas(pedacos[i]) || !pedacos[i].trim()); i++) if (celulas(pedacos[i])) fim = i;
  return { tracos, fim };
}

/** Os `run_id` que já têm linha no histórico. */
export function runsDoHistorico(texto) {
  const pedacos = String(texto ?? '').split(/(?<=\n)/);
  const t = tabela(pedacos);
  return t ? pedacos.slice(t.tracos + 1, t.fim + 1).map((p) => celulas(p)?.[1]).filter(Boolean) : [];
}

/** Onde a linha entra: logo abaixo dos traços, ou (`porData`) antes da primeira execução mais antiga. */
function posicao(pedacos, { tracos, fim }, data) {
  if (data === null) return tracos + 1;
  for (let i = tracos + 1; i <= fim; i++) if (celulas(pedacos[i]) && (celulas(pedacos[i])[0] ?? '') < data) return i;
  return fim + 1;
}

/**
 * O texto do `runs.md` com a linha da execução: trocada, se o `run` já tem linha; senão, posta.
 * @param {string|null} texto o arquivo como está no disco (`null`: não existe)
 * @param {{ crew: string, run: string, linha: string, porData?: boolean }} dados `porData`: a linha
 *   entra na posição da data dela (conserto); sem isso, logo abaixo do cabeçalho (a mais nova em cima)
 */
export function comLinha(texto, { crew, run, linha, porData = false }) {
  if (texto === null || texto === '') return `${cabecalho(crew)}${linha}\n`;
  const fimDeLinha = /\r\n/.test(texto) ? '\r\n' : '\n';
  const pedacos = texto.split(/(?<=\n)/);
  const t = tabela(pedacos);
  if (!t) return `${texto}${texto.endsWith('\n') ? '' : fimDeLinha}${fimDeLinha}${[COLUNAS, TRACOS, linha].join(fimDeLinha)}${fimDeLinha}`;
  const igual = pedacos.findIndex((p, i) => i > t.tracos && i <= t.fim && celulas(p)?.[1] === run);
  if (igual >= 0) pedacos[igual] = `${linha}${/\r?\n$/.exec(pedacos[igual])?.[0] ?? ''}`;
  else {
    const i = posicao(pedacos, t, porData ? linha.split('|')[1].trim() : null);
    // Depois de uma linha sem quebra no fim (a última do arquivo), a quebra vem antes da linha nova.
    const semQuebra = i > 0 && !pedacos[i - 1].endsWith('\n');
    pedacos.splice(i, 0, semQuebra ? `${fimDeLinha}${linha}` : `${linha}${fimDeLinha}`);
  }
  return pedacos.join('');
}
