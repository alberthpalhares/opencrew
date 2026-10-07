// O destino da cópia: a pasta do projeto que o usuário escolheu para guardar a entrega. Vem de
// `--lembrar-destino`, de `--destino` ou de `entrega.destino` no `crew.yaml`, nessa ordem, e uma
// função só valida os três. Este módulo só lê.
// Spec: fase-u3a2-entrega-no-projeto.md, §3 e regra 13 (repositório do OpenCrew).
import { existsSync, promises as fs, statSync } from 'node:fs';
import path from 'node:path';
import { lugarReal } from '../comum.mjs';
import { limpar } from './argumentos.mjs';

export const MSG = {
  recusado: (valor) => `Não copiei: o destino precisa ser uma pasta dentro do projeto, fora de \`_opencrew/\`, \`crews/\`, \`skills/\`, \`.git/\` e \`node_modules/\`. Recebi: ${limpar(valor)}.`,
  semDestino: 'Cópia: nenhuma pasta escolhida para esta crew.',
};

const PROIBIDAS = new Set(['_opencrew', 'crews', 'skills', '.git', 'node_modules']);
const NAO = /^(?:nao|não|no)$/i;
// Absoluto: começa por `/`, `\` ou letra de unidade. Lista ou mapa do YAML não é caminho.
const NAO_E_CAMINHO = /^(?:[\\/]|[A-Za-z]:|[[{]|-(?:\s|$))/;

/** Relativo à raiz, com `/`; null quando sai do projeto, é a raiz ou cai numa pasta reservada. */
function dentro(raiz, alvo) {
  const rel = path.relative(raiz, alvo);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  const partes = rel.split(path.sep);
  return PROIBIDAS.has(partes[0].toLowerCase()) ? null : partes.join('/');
}

/** O trecho do caminho que já existe é uma pasta? Um arquivo no caminho impede a cópia. */
function semArquivoNoCaminho(abs) {
  let existente = abs;
  while (!existsSync(existente)) existente = path.dirname(existente);
  return statSync(existente).isDirectory();
}

/**
 * Valida um destino (regra 13), venha de onde vier.
 * @returns {{ tipo: 'nao' } | { tipo: 'recusado', valor: string } | { tipo: 'pasta', rel: string, abs: string }}
 *   `nao`: o usuário não quer cópia · `rel`: relativo ao projeto, com `/`
 */
export function validarDestino(raiz, valor) {
  const texto = String(valor ?? '').trim();
  if (NAO.test(texto)) return { tipo: 'nao' };
  const recusado = { tipo: 'recusado', valor: texto };
  if (!texto || NAO_E_CAMINHO.test(texto)) return recusado;
  const abs = path.resolve(raiz, texto);
  const rel = dentro(raiz, abs);
  // Pelo lugar real também: um atalho dentro do projeto pode levar para fora, ou para `crews/`.
  if (!rel || !dentro(lugarReal(raiz), lugarReal(abs)) || !semArquivoNoCaminho(abs)) return recusado;
  return { tipo: 'pasta', rel, abs };
}

const semFim = (linha) => linha.replace(/\r?\n$/, '');
const recuoDe = (linha) => linha.match(/^[ \t]*/)[0];

/**
 * O bloco `entrega:` de um `crew.yaml` já separado em linhas: onde começa e acaba, o recuo dos
 * filhos e a linha de `destino:` (um nível abaixo; -1 quando não há). Sem o bloco: null.
 */
export function blocoDaEntrega(linhas) {
  const limpas = linhas.map(semFim);
  const inicio = limpas.findIndex((l) => /^entrega:\s*(?:#.*)?$/.test(l));
  if (inicio < 0) return null;
  let fim = inicio + 1;
  while (fim < limpas.length && (!limpas[fim].trim() || /^[ \t]/.test(limpas[fim]))) fim += 1;
  const filhos = limpas.slice(inicio + 1, fim).filter((l) => l.trim());
  const recuo = filhos.length ? recuoDe(filhos[0]) : '  ';
  const destino = limpas.findIndex((l, i) => i > inicio && i < fim && recuoDe(l) === recuo && /^destino:/.test(l.trim()));
  return { inicio, fim, recuo, destino };
}

/** O valor de uma linha `chave: valor`: sem as aspas e sem o comentário do fim da linha. */
function valorDaLinha(linha) {
  const resto = linha.slice(linha.indexOf(':') + 1).trim();
  const comAspas = resto.match(/^(["'])(.*?)\1\s*(?:#.*)?$/);
  return comAspas ? comAspas[2] : resto.replace(/(?:^|\s+)#.*$/, '').trim();
}

/** `entrega.destino` como está escrito no texto de um `crew.yaml`; null quando não há. Uma lista volta como o primeiro item dela (`- a`), que nunca é um destino válido. */
export function destinoDoTexto(texto) {
  const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/);
  const bloco = blocoDaEntrega(linhas);
  if (!bloco || bloco.destino < 0) return null;
  const valor = valorDaLinha(linhas[bloco.destino]);
  if (valor) return valor;
  const seguinte = (linhas[bloco.destino + 1] ?? '').trim();
  return seguinte.startsWith('-') ? seguinte : null;
}

/**
 * O destino desta chamada: `--lembrar-destino` vence `--destino`, que vence o `crew.yaml`.
 * @returns {Promise<object>} o que `validarDestino` devolve, ou `{ tipo: 'nenhum' }` (ninguém escolheu)
 */
export async function escolherDestino(raiz, crew, args) {
  const doYaml = async () => destinoDoTexto(await fs.readFile(path.join(crew, 'crew.yaml'), 'utf8'));
  const valor = args.lembrarDestino ?? args.destino ?? (await doYaml());
  return valor == null ? { tipo: 'nenhum' } : validarDestino(raiz, valor);
}