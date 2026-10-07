// O perfil de documento oficial no disco do projeto: onde mora, como nasce do modelo (e nunca é
// sobrescrito) e a leitura do logotipo que ele cita. Perfil inválido não gera documento: o erro
// diz a linha.
// Spec: fase-u3b-documento-word.md, regras 10 e 11 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dentroDoProjeto } from '../comum.mjs';
import { lerPerfil } from './perfil.mjs';
import { MAXIMO, lerPng } from './png.mjs';

/** Onde o perfil do projeto mora (o `update` não toca esta pasta). */
export const PERFIL = '_opencrew/_memory/documento-oficial.md';
/** O modelo do pacote, ao lado dos scripts: `_opencrew/core/modelos/documento-oficial.md`. */
const MODELO = fileURLToPath(new URL('../../modelos/documento-oficial.md', import.meta.url));

export const MSG = {
  semLogotipo: (n, arquivo) => `Perfil, linha ${n}: não encontrei o logotipo ${arquivo}.`,
  logotipo: (n, arquivo) => `Perfil, linha ${n}: o logotipo precisa ser um arquivo PNG de até 2 MB, dentro do projeto. Recebi: ${arquivo}.`,
};

/** Os bytes do logotipo citado no perfil: `{ bytes }`, ou `{ erro }` com a mensagem da linha. */
async function lerLogotipo(raiz, arquivo, linha) {
  if (!dentroDoProjeto(raiz, arquivo)) return { erro: MSG.logotipo(linha, arquivo) };
  const info = await fs.stat(path.resolve(raiz, arquivo)).catch(() => null);
  if (!info) return { erro: MSG.semLogotipo(linha, arquivo) };
  if (!info.isFile() || info.size > MAXIMO) return { erro: MSG.logotipo(linha, arquivo) };
  const bytes = await fs.readFile(path.resolve(raiz, arquivo));
  return lerPng(bytes) ? { bytes } : { erro: MSG.logotipo(linha, arquivo) };
}

/**
 * Lê o perfil de um arquivo do projeto, com o logotipo que ele cita.
 * @param {string} raiz a pasta do projeto
 * @param {string} arquivo o perfil, relativo à raiz ou absoluto (já conferido: existe e fica no projeto)
 * @returns {Promise<{ perfil?: object, logotipo?: Buffer, erro?: string }>}
 */
export async function lerPerfilDoProjeto(raiz, arquivo) {
  const { perfil, linhas, erro } = lerPerfil(await fs.readFile(path.resolve(raiz, arquivo), 'utf8'));
  if (erro) return { erro };
  if (!perfil.logotipo) return { perfil };
  const logotipo = await lerLogotipo(raiz, perfil.logotipo, linhas.logotipo);
  return logotipo.erro ? { erro: logotipo.erro } : { perfil, logotipo: logotipo.bytes };
}

/**
 * Cria o perfil do projeto a partir do modelo, só se ele não existir.
 * @returns {Promise<boolean>} true quando criou; false quando já existia (e não foi tocado)
 */
export async function criarPerfil(raiz) {
  const destino = path.join(raiz, PERFIL);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  try {
    await fs.writeFile(destino, await fs.readFile(MODELO), { flag: 'wx' });
    return true;
  } catch (erro) {
    if (erro.code === 'EEXIST') return false;
    throw erro;
  }
}
