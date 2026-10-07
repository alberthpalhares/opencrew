// O LEIA-ME.md da entrega: títulos fixos, na ordem da spec; seção sem conteúdo não aparece.
// Arquivo da entrega é citado com caminho relativo à pasta do LEIA-ME; o de origem, relativo ao
// projeto. Sem hora: as mesmas entradas geram os mesmos bytes. PT-BR fixo.
// Spec: fase-u3a1-pasta-de-entrega.md, §4 e §6 (repositório do OpenCrew).
import { CANAIS, EDITAVEIS, OUTROS } from './canais.mjs';
import { frasesDePendencia } from './pendencias.mjs';
import { passosDe } from './passos.mjs';

export const TEXTO = {
  vaiPublicar: 'Esta crew publica este canal sozinha. Antes de postar à mão, confira se já saiu.',
  pdf: 'Abra o arquivo que você quer (por exemplo, o artigo do blog) no navegador ou no editor de texto e use Imprimir → Salvar como PDF.',
  semCanal: 'sem canal de publicação; está aqui para você usar como quiser.',
  sobre: 'Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde. Para guardar, copie a pasta para outro lugar do projeto.',
  pronto: 'Pronto',
  naoPronto: 'Não está pronto',
};

const lista = (linhas) => linhas.map((l) => `- ${l}`).join('\n');
const bloco = (titulo, linhas) => (linhas.length ? [`${titulo}\n${lista(linhas)}`] : []);
const secao = (titulo, partes) => (partes.length ? [`## ${titulo}\n\n${partes.join('\n\n')}`] : []);

/** Uma linha por arquivo entregue: o caminho na entrega, o título do bloco (se houver) e a origem. */
function linhaDoArquivo(a) {
  const titulo = a.titulo ? ` — ${a.titulo}` : '';
  return `\`${a.pasta}/${a.nome}\`${titulo} — origem: \`${a.origem}\``;
}

/** Os avisos de uma pasta que o LEIA-ME mostra (o que só vai para a tela não tem `texto`). */
const avisosDe = (d, pasta) => d.avisos.filter((a) => a.pasta === pasta && a.texto).map((a) => a.texto);

/** `## Antes de usar`: os alertas de tamanho e, por canal que não está pronto, o que falta. */
function antesDeUsar(d) {
  const pastas = [...d.pastas, OUTROS].filter((p) => d.pendencias.has(p));
  const frases = frasesDePendencia(pastas, d.pendencias);
  const faltas = pastas.map((p, i) => `- ${frases[i]}\n${d.pendencias.get(p).map((l) => `  - ${l}`).join('\n')}`);
  return secao('Antes de usar', [[...d.alertas.map((a) => `- ${a}`), ...faltas].join('\n')].filter(Boolean));
}

/** `## {Canal}`: o aviso de publicação, a situação, os arquivos, as pendências, os avisos e os passos. */
function secaoDoCanal(d, pasta) {
  const arquivos = d.arquivos.filter((a) => a.pasta === pasta);
  const pendencias = d.pendencias.get(pasta) ?? [];
  const passos = passosDe(pasta, arquivos, pendencias.length > 0).map((p, i) => `${i + 1}. ${p}`);
  return secao(CANAIS[pasta], [
    ...(d.vaiPublicar.includes(pasta) ? [TEXTO.vaiPublicar] : []),
    `Situação: ${pendencias.length ? TEXTO.naoPronto : TEXTO.pronto}`,
    ...bloco('Arquivos:', arquivos.map(linhaDoArquivo)),
    ...bloco('Pendências:', pendencias),
    ...bloco('Atenção:', avisosDe(d, pasta)),
    ...(passos.length ? [`Passos:\n${passos.join('\n')}`] : []),
  ]);
}

/** `## Outros arquivos` e `## Editáveis`: cada arquivo com a origem; em `outros`, a linha diz por que está ali. */
function secaoDaPasta(d, pasta, titulo) {
  const fim = pasta === OUTROS ? ` — ${TEXTO.semCanal}` : '';
  const arquivos = d.arquivos.filter((a) => a.pasta === pasta).map((a) => `${linhaDoArquivo(a)}${fim}`);
  const pendencias = d.pendencias.get(pasta) ?? [];
  return secao(titulo, [
    ...(arquivos.length ? [lista(arquivos)] : []),
    ...bloco('Pendências:', pendencias),
    ...bloco('Atenção:', avisosDe(d, pasta)),
  ]);
}

/**
 * @param {object} d
 * @param {string} d.crew nome da crew · @param {string} d.run id da execução
 * @param {string[]} d.pastas os canais presentes, na ordem das seções
 * @param {object[]} d.arquivos `{ pasta, nome, tipo, origem, titulo, numerado }`
 * @param {object[]} d.avisos `{ pasta, texto, tela }` (`tela`: como o aviso sai no resumo da tela)
 * @param {Map<string, string[]>} d.pendencias por pasta · @param {string[]} d.alertas regra 34
 * @param {string[]} d.naoConferido · @param {string[]} d.vaiPublicar canais que a crew publica
 * @returns {string} o LEIA-ME, em UTF-8 sem BOM e com LF
 */
export function montarLeiame(d) {
  const temMd = d.arquivos.some((a) => a.nome.toLowerCase().endsWith('.md'));
  const partes = [
    `# Entrega — ${d.crew} — ${d.run}`,
    ...antesDeUsar(d),
    ...d.pastas.flatMap((pasta) => secaoDoCanal(d, pasta)),
    ...secaoDaPasta(d, OUTROS, 'Outros arquivos'),
    ...secaoDaPasta(d, EDITAVEIS, 'Editáveis'),
    ...secao('O que não foi conferido', [lista(d.naoConferido)]),
    ...(temMd ? secao('Para ter um PDF', [TEXTO.pdf]) : []),
    ...secao('Sobre esta pasta', [TEXTO.sobre]),
  ];
  return `${partes.join('\n\n')}\n`;
}
