// Leitura do texto em markdown: uma linha, um bloco. Devolve os blocos na ordem em que foram
// escritos (título, parágrafo, item de lista, tabela, linha horizontal, assinaturas) e a contagem
// dos avisos de conversão. Não numera, não reordena e não corrige nada.
// Spec: fase-u3b-documento-word.md, regras 4 a 9 (repositório do OpenCrew).
import { lerLinha, literal } from './linha.mjs';
import { ehMarcacao, lerMarcacao } from './marcacoes.mjs';
import { limpar } from './xml.mjs';

const REGUA = /^(-{3,}|\*{3,}|_{3,})$/;
const TITULO = /^(#{1,6})[ \t]+(\S.*)$/;
const ITEM = /^(\s*)[-*][ \t]+(\S.*)$/;
const SEPARADORA = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const BARRA = /(?<!\\)\|/;
const CHAVE = /^[A-Za-z_][\w-]*:(\s|$)/;
const recuado = (inicio) => /^(\t| {2,})/.test(inicio);

/** Tira o frontmatter: da primeira linha `---` à próxima, só com `chave: valor` e continuações. */
function semFrontmatter(linhas) {
  if (linhas[0]?.trimEnd() !== '---') return linhas;
  const fim = linhas.findIndex((l, i) => i > 0 && l.trimEnd() === '---');
  if (fim < 0) return linhas;
  const meio = linhas.slice(1, fim).filter((l) => l.trim());
  return meio.every((l) => CHAVE.test(l) || /^\s+\S/.test(l)) ? linhas.slice(fim + 1) : linhas;
}

const ehSeparadora = (linha) => linha != null && linha.includes('|') && linha.includes('-') && SEPARADORA.test(linha);

/** As células de uma linha de tabela: sem as barras das pontas; `\|` dá a barra. */
function celulas(linha) {
  const miolo = linha.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  return miolo.split(BARRA).map((c) => c.trim().split('\\|').join('|'));
}

/** Tabela: cabeçalho, linha separadora e as linhas seguintes que têm barra. Vale a linha mais longa. */
function lerTabela(linhas, i, estado) {
  let fim = i + 2;
  while (fim < linhas.length && linhas[fim].trim() && linhas[fim].includes('|')) fim++;
  const brutas = [linhas[i], ...linhas.slice(i + 2, fim)].map(celulas);
  const colunas = Math.max(...brutas.map((l) => l.length));
  estado.avisos.celulas += brutas.slice(1).filter((l) => l.length > brutas[0].length).length;
  const completas = brutas.map((l) => [...l, ...Array(colunas - l.length).fill('')]);
  estado.por({ tipo: 'tabela', linhas: completas.map((l) => l.map((c) => lerLinha(c, estado.avisos))) });
  return fim;
}

/** Uma linha sozinha: linha horizontal, título, item de lista ou parágrafo. */
function lerBloco(linha, avisos) {
  const texto = linha.trim();
  if (REGUA.test(texto)) return { tipo: 'regua' };
  const titulo = TITULO.exec(texto);
  if (titulo && titulo[1].length <= 3) return { tipo: 'titulo', nivel: titulo[1].length, pedacos: lerLinha(titulo[2], avisos) };
  if (titulo) return { tipo: 'paragrafo', negrito: true, pedacos: lerLinha(titulo[2], avisos) };
  const item = ITEM.exec(linha);
  if (item) return { tipo: 'item', nivel: recuado(item[1]) ? 1 : 0, pedacos: lerLinha(item[2].trimEnd(), avisos) };
  return { tipo: 'paragrafo', recuo: recuado(linha), pedacos: lerLinha(texto, avisos) };
}

/** Onde os blocos se juntam: a quebra de página pedida vale para o próximo bloco, uma vez só. */
function novoEstado() {
  const estado = { blocos: [], avisos: { imagens: 0, desconhecidas: 0, semFim: 0, invalidos: 0, celulas: 0 }, quebra: false };
  estado.por = (bloco) => {
    estado.blocos.push(estado.quebra ? { ...bloco, quebra: true } : bloco);
    estado.quebra = false;
  };
  estado.texto = (linha) => estado.por({ tipo: 'paragrafo', pedacos: literal(linha.trim()) });
  estado.quebrar = () => { estado.quebra = estado.blocos.length > 0; };
  return estado;
}

/** Consome o bloco que começa na linha `i`; devolve a linha em que o próximo começa. */
function consumir(linhas, i, estado) {
  const linha = linhas[i];
  if (!linha.trim()) return i + 1;
  if (ehMarcacao(linha)) return lerMarcacao(linhas, i, estado);
  if (linha.includes('|') && ehSeparadora(linhas[i + 1])) return lerTabela(linhas, i, estado);
  estado.por(lerBloco(linha, estado.avisos));
  return i + 1;
}

/**
 * @param {string} bruto o texto do arquivo (CRLF ou LF, com ou sem BOM)
 * @returns {{ blocos: object[], avisos: { imagens: number, desconhecidas: number, semFim: number, invalidos: number } }}
 *   bloco: `{ tipo, pedacos | linhas | pessoas, nivel?, recuo?, negrito?, quebra? }`
 */
export function lerMarkdown(bruto) {
  const semBom = bruto.charCodeAt(0) === 0xfeff ? bruto.slice(1) : bruto;
  const { texto, removidos } = limpar(semBom.replace(/\r\n?/g, '\n'));
  const linhas = semFrontmatter(texto.split('\n'));
  const estado = novoEstado();
  estado.avisos.invalidos = removidos;
  for (let i = 0; i < linhas.length;) i = consumir(linhas, i, estado);
  return { blocos: estado.blocos, avisos: estado.avisos };
}
