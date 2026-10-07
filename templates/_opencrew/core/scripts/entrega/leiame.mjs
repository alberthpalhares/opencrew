// O LEIA-ME.md da entrega e o da cópia: títulos fixos, na ordem da spec; seção sem conteúdo não
// aparece. Arquivo da entrega é citado com caminho relativo à pasta do LEIA-ME; o de origem,
// relativo ao projeto. Sem hora: as mesmas entradas geram os mesmos bytes. PT-BR fixo.
// Specs: fase-u3a1-pasta-de-entrega.md, §4 e §6, e fase-u3a2-entrega-no-projeto.md, §4 e §6
// (ressalvas, a cópia e "Sobre esta pasta"), no repositório do OpenCrew.
import { CANAIS, EDITAVEIS, OUTROS } from './canais.mjs';
import { frasesDePendencia } from './pendencias.mjs';
import { passosDe } from './passos.mjs';

export const TEXTO = {
  vaiPublicar: 'Esta crew publica este canal sozinha. Antes de postar à mão, confira se já saiu.',
  pdf: 'Abra o arquivo que você quer (por exemplo, o artigo do blog) no navegador ou no editor de texto e use Imprimir → Salvar como PDF.',
  semCanal: 'sem canal de publicação; está aqui para você usar como quiser.',
  sobre: 'Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde. Para guardar, copie a pasta para outro lugar do projeto.',
  sobreComCopia: (pasta) => `Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde. A cópia para guardar está em \`${pasta}\`.`,
  sobreDaCopia: (run) => `Esta é a cópia da entrega da execução ${run}. Ela não é refeita: pode editar e guardar. Se a entrega mudar, a versão nova vai para outra pasta, ao lado desta.`,
  comRessalva: 'Entregue com ressalva:',
  pronto: 'Pronto',
  prontoComRessalva: 'Pronto, com ressalva',
  naoPronto: 'Não está pronto',
};

const lista = (linhas) => linhas.map((l) => `- ${l}`).join('\n');
const bloco = (titulo, linhas) => (linhas.length ? [`${titulo}\n${lista(linhas)}`] : []);
const secao = (titulo, partes) => (partes.length ? [`## ${titulo}\n\n${partes.join('\n\n')}`] : []);

/** A situação de um canal: uma só. Pendência não aceita vale sobre a ressalva. */
export function situacaoDe(d, pasta) {
  if (d.pendencias.has(pasta)) return TEXTO.naoPronto;
  return d.ressalvas.has(pasta) ? TEXTO.prontoComRessalva : TEXTO.pronto;
}

/** Uma linha por arquivo entregue: o caminho na entrega, o título do bloco (se houver) e a origem. */
function linhaDoArquivo(a) {
  const titulo = a.titulo ? ` — ${a.titulo}` : '';
  return `\`${a.pasta}/${a.nome}\`${titulo} — origem: \`${a.origem}\``;
}

/** Os avisos de uma pasta que o LEIA-ME mostra (o que só vai para a tela não tem `texto`). */
const avisosDe = (d, pasta) => d.avisos.filter((a) => a.pasta === pasta && a.texto).map((a) => a.texto);

/** A linha de uma ressalva; a de [PREENCHER] cita os arquivos entregues daquela origem que têm o trecho. */
function linhaDaRessalva(d, r) {
  const temOTrecho = (a) => a.origem === r.chave.arquivo && a.texto?.includes('[PREENCHER') && a.texto.includes(r.preencher);
  const onde = r.preencher ? d.arquivos.filter(temOTrecho).map((a) => `\`${a.pasta}/${a.nome}\``) : [];
  return `${r.linha}${onde.length ? ` — está em ${onde.join(', ')}` : ''}`;
}

/** `## Antes de usar`: as ressalvas, os alertas de tamanho e, por canal que não está pronto, o que falta. */
function antesDeUsar(d) {
  const ressalvas = [...d.ressalvas.values()].flat().map((r) => linhaDaRessalva(d, r));
  const pastas = [...d.pastas, OUTROS].filter((p) => d.pendencias.has(p));
  const frases = frasesDePendencia(pastas, d.pendencias);
  const faltas = pastas.map((p, i) => `- ${frases[i]}\n${d.pendencias.get(p).map((l) => `  - ${l}`).join('\n')}`);
  // Na cópia, o alerta de um arquivo que não foi copiado não aparece: ele cita um arquivo que não está lá.
  const alertas = d.alertas.filter((a) => !d.ehCopia || !d.pendencias.has(a.pasta)).map((a) => `- ${a.texto}`);
  return secao('Antes de usar', [...bloco(TEXTO.comRessalva, ressalvas), [...alertas, ...faltas].join('\n')].filter(Boolean));
}

/** `## {Canal}`: o aviso de publicação, a situação, os arquivos, as pendências, os avisos e os passos. */
function secaoDoCanal(d, pasta) {
  const pendencias = d.pendencias.get(pasta) ?? [];
  const situacao = `Situação: ${situacaoDe(d, pasta)}`;
  // Na cópia, o canal que não foi copiado traz só a situação e o que falta.
  if (d.ehCopia && pendencias.length) return secao(CANAIS[pasta], [situacao, ...bloco('Pendências:', pendencias)]);
  const arquivos = d.arquivos.filter((a) => a.pasta === pasta);
  const passos = passosDe(pasta, arquivos, pendencias.length > 0, d.ressalvas.has(pasta)).map((p, i) => `${i + 1}. ${p}`);
  return secao(CANAIS[pasta], [
    ...(d.vaiPublicar.includes(pasta) ? [TEXTO.vaiPublicar] : []),
    situacao,
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
    ...(d.ehCopia && pendencias.length ? [] : bloco('Atenção:', avisosDe(d, pasta))),
  ]);
}

/** `## Sobre esta pasta`: o que é a pasta da entrega (com a cópia, onde ela está) ou o que é a cópia. */
function sobre(d) {
  if (d.ehCopia) return TEXTO.sobreDaCopia(d.run);
  return d.copiaEm ? TEXTO.sobreComCopia(d.copiaEm) : TEXTO.sobre;
}

/**
 * @param {object} d
 * @param {string} d.crew nome da crew · @param {string} d.run id da execução
 * @param {string[]} d.pastas os canais presentes, na ordem das seções
 * @param {object[]} d.arquivos `{ pasta, nome, tipo, origem, titulo, numerado }` — no LEIA-ME da
 *   cópia, só os que foram copiados
 * @param {object[]} d.avisos `{ pasta, texto, tela }` (`tela`: como o aviso sai no resumo da tela)
 * @param {Map<string, string[]>} d.pendencias por pasta, as não aceitas
 * @param {Map<string, object[]>} d.ressalvas por pasta, as aceitas: `{ linha, chave, preencher }`
 * @param {object[]} d.alertas regra 34: `{ pasta, texto }`
 * @param {string[]} d.naoConferido · @param {string[]} d.vaiPublicar canais que a crew publica
 * @param {string|null} [d.copiaEm] a pasta da cópia, relativa ao projeto, quando ela foi feita
 * @param {boolean} [d.ehCopia] é o LEIA-ME da cópia: todo arquivo citado existe nela
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
    ...secao('Sobre esta pasta', [sobre(d)]),
  ];
  return `${partes.join('\n\n')}\n`;
}