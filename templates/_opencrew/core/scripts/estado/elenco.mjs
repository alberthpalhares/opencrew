// O elenco de uma crew, lido de `crew-party.csv` (cabeçalho id,displayName,title,icon,path,execution;
// crew antiga pode não ter a coluna `id`).
// Spec: fase-e1-escritorio-ao-vivo.md, regra 2 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Texto CSV → linhas, cada uma com os seus campos (sem as aspas e sem espaço nas pontas). Entre
 * aspas o campo pode ter vírgula, quebra de linha e `""` (uma aspa). Uma passada só, caractere a
 * caractere: aspa que não fecha leva o resto do texto para o campo, nunca trava.
 */
export function lerCsv(texto) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  const fechaCampo = () => { linha.push(campo.trim()); campo = ''; };
  const fechaLinha = () => { fechaCampo(); linhas.push(linha); linha = []; };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"' && aspas && texto[i + 1] === '"') campo += texto[i++];
    else if (c === '"') aspas = !aspas;
    else if (aspas || !',\r\n'.includes(c)) campo += c;
    else if (c === ',') fechaCampo();
    else if (c === '\n' || texto[i + 1] !== '\n') fechaLinha(); // `\r\n` fecha a linha uma vez só
  }
  if (campo || linha.length) fechaLinha();
  return linhas;
}

/** O id que o nome do arquivo do agente dá: `./agents/x.agent.md` → `x`; outro caminho, nenhum. */
const idDoCaminho = (caminho = '') => caminho.match(/([^/\\]+)\.agent\.md$/i)?.[1] ?? '';

/**
 * O elenco, na ordem do arquivo: `[{ id, name, icon }]`. As colunas `id`, `displayName`, `icon` e
 * `path` são achadas pelo nome no cabeçalho. Linha sem `id` (crew antiga, de antes de o cabeçalho
 * ser fixo) usa o nome do arquivo em `path`. Sem nenhum dos dois, ou com `id` repetido, a linha
 * fica de fora; sem `displayName`, o nome é o `id`.
 */
export function elencoDoCsv(texto) {
  const [cabecalho = [], ...linhas] = lerCsv(texto.replace(/^\uFEFF/, ''));
  const colunas = ['id', 'displayname', 'icon', 'path'].map((c) => cabecalho.findIndex((h) => h.toLowerCase() === c));
  const [id, nome, icone, caminho] = colunas;
  const vistos = new Set();
  return linhas
    .map((l) => ({ l, i: l[id] || idDoCaminho(l[caminho]) }))
    .map(({ l, i }) => ({ id: i, name: l[nome] || i, icon: l[icone] ?? '' }))
    .filter((a) => a.id && !vistos.has(a.id) && vistos.add(a.id));
}

/** O elenco da crew; lista vazia quando o `crew-party.csv` falta, não abre ou não tem agentes. */
export async function lerElenco(pastaDaCrew) {
  try {
    return elencoDoCsv(await fs.readFile(path.join(pastaDaCrew, 'crew-party.csv'), 'utf8'));
  } catch {
    return [];
  }
}
