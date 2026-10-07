// Ressalvas: as pendências que o usuário aceitou ("entregar assim mesmo"). Ficam em
// `crews/<crew>/output/<run>/ressalvas.json` e valem para as entregas seguintes da execução,
// enquanto a pendência existir sem interrupção (mesmo arquivo de origem, item e trecho): a cada
// entrega o arquivo é regravado só com as que ainda valem, e a pendência que some e volta é nova.
// Spec: fase-u3a2-entrega-no-projeto.md, §4 e regras 18 e 19 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const ARQUIVO = 'ressalvas.json';
export const MSG = {
  ilegivel: (arquivo) => `Não consegui ler ${arquivo}. Segui sem ele.`,
  nova: (item) => `Há pendência nova, que você ainda não aceitou: ${item}.`,
};

const CAMPOS = ['arquivo', 'item', 'trecho'];
const ehRessalva = (r) => r != null && typeof r === 'object' && CAMPOS.every((c) => typeof r[c] === 'string');
const mesma = (a, b) => CAMPOS.every((c) => a[c] === b[c]);

/**
 * As ressalvas já aceitas nesta execução. Arquivo que não existe: nenhuma. Arquivo que não é o
 * JSON esperado vale como vazio, com `ilegivel: true` (o resumo avisa); ele não é apagado.
 * @returns {Promise<{ aceitas: object[], ilegivel: boolean }>} `aceitas`: `{ arquivo, item, trecho }`
 */
export async function lerRessalvas(execucao) {
  let texto;
  try {
    texto = await fs.readFile(path.join(execucao, ARQUIVO), 'utf8');
  } catch (erro) {
    return { aceitas: [], ilegivel: erro.code !== 'ENOENT' };
  }
  try {
    const lista = JSON.parse(texto)?.ressalvas;
    if (Array.isArray(lista) && lista.every(ehRessalva)) return { aceitas: lista, ilegivel: false };
  } catch { /* não é JSON: cai no retorno abaixo */ }
  return { aceitas: [], ilegivel: true };
}

/**
 * Separa as pendências em aceitas (ressalvas) e não aceitas. Pendência sem chave (arquivo que não
 * existe) nunca é aceita.
 * @param {Map<string, object[]>} todas por pasta: `{ linha, chave, preencher }`
 * @param {object[]} aceitas o que `lerRessalvas` leu · @param {boolean} aceitarTudo `--aceitar-pendencias`
 * @returns {{ pendencias: Map<string, string[]>, ressalvas: Map<string, object[]>, novas: string[] }}
 *   `novas`: o aviso de cada pendência que apareceu depois de um aceite
 */
export function separarPendencias(todas, aceitas, aceitarTudo) {
  const [pendencias, ressalvas, novas] = [new Map(), new Map(), new Set()];
  const somar = (mapa, pasta, valor) => mapa.set(pasta, [...(mapa.get(pasta) ?? []), valor]);
  for (const [pasta, lista] of todas) {
    for (const p of lista) {
      const aceita = Boolean(p.chave) && (aceitarTudo || aceitas.some((a) => mesma(a, p.chave)));
      if (aceita) somar(ressalvas, pasta, p);
      else somar(pendencias, pasta, p.linha);
      if (!aceita && p.chave && aceitas.length) novas.add(MSG.nova(p.chave.item));
    }
  }
  return { pendencias, ressalvas, novas: [...novas] };
}

/**
 * Regrava `ressalvas.json` com as ressalvas deste momento: a que não corresponde mais a uma
 * pendência sai. Sem nenhuma, o arquivo que existe fica com a lista vazia e o que não existe não é
 * criado; com o mesmo conteúdo, nada é gravado.
 * @returns {Promise<string|null>} null quando está gravado; senão, o arquivo que não foi gravado
 */
export async function gravarRessalvas(execucao, ressalvas) {
  const lista = [...ressalvas.values()].flat().map((r) => r.chave);
  const arquivo = path.join(execucao, ARQUIVO);
  const texto = `${JSON.stringify({ ressalvas: lista }, null, 2)}\n`;
  try {
    const atual = await fs.readFile(arquivo, 'utf8').catch(() => null);
    if (atual == null && !lista.length) return null;
    if (atual !== texto) await fs.writeFile(arquivo, texto, 'utf8');
    return null;
  } catch {
    return arquivo;
  }
}