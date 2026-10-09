// Documentos na entrega: o item cujo formato tem a plataforma `documento` vai para a pasta
// `documentos/`. Texto (`.md` ou `.txt`) vira Word, inteiro, com o perfil de documento oficial do
// projeto, se existir: os mesmos bytes que o `documento.mjs` grava para o mesmo texto e o mesmo
// perfil. Outro tipo de arquivo é copiado como está, com aviso. Erro ao converter (inclusive
// perfil inválido) é pendência de `documentos`, que nunca vira ressalva: os outros canais seguem.
// Este módulo só lê: quem grava é `gravar.mjs`.
// Spec: fase-u3b-documento-word.md, decisão 9, regra 12 e §6 (repositório do OpenCrew).
import { existsSync, promises as fs, statSync } from 'node:fs';
import path from 'node:path';
import { AVISO_PERFIL_VAZIO, PERFIL, gerarDocx, lerPerfilDoProjeto, perfilVazio } from '../documento.mjs';
import { limpar } from './argumentos.mjs';

/** A pasta da entrega e o tipo do arquivo que é (ou vai virar) um Word. */
export const DOCUMENTOS = 'documentos';
export const WORD = 'documento';
const TEXTO = /\.(md|txt)$/i;

export const MSG = {
  copiado: (arquivo) => `${arquivo}: só converto .md ou .txt em Word. Copiei o arquivo como está.`,
  erro: (arquivo, motivo) => `Não consegui gerar o Word de ${arquivo}: ${limpar(motivo).replace(/\.+$/, '')}.`,
  aviso: (arquivo, aviso) => `${arquivo}: ${aviso}`,
  semPerfil: 'Sem papel timbrado: este projeto não tem perfil de documento oficial. Para criar o seu: node _opencrew/core/scripts/documento.mjs --criar-perfil',
  semTexto: 'o arquivo não tem texto para converter',
  naoUtf8: 'o arquivo não está em UTF-8',
};
/** A linha de "O que não foi conferido" da entrega que tem um Word. */
export const NAO_CONFERIDO = 'Como o documento abre no Word.';

/** O tipo do arquivo em `documentos/`: texto que vira Word, ou cópia como está. */
export const tipoDoDocumento = (arquivo) => (TEXTO.test(arquivo) ? WORD : 'copia');
export const naoConferidoDoWord = (arquivos) => (arquivos.some((a) => a.pasta === DOCUMENTOS && a.tipo === WORD) ? [NAO_CONFERIDO] : []);

/** O perfil do projeto, lido uma vez: `{}` sem perfil, `{ perfil, logotipo }` ou `{ erro }`. */
async function perfilDoProjeto(raiz) {
  const arquivo = path.join(raiz, PERFIL);
  if (!existsSync(arquivo) || !statSync(arquivo).isFile()) return {};
  try {
    return await lerPerfilDoProjeto(raiz, PERFIL);
  } catch (falha) {
    return { erro: falha?.message ?? falha };
  }
}

/** O texto do arquivo, em UTF-8; null quando os bytes não são UTF-8. */
function decodificar(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** O Word de um texto: `{ bytes, avisos }`, ou `{ erro }` com o motivo. */
async function converter(copia, lido, gerar) {
  if (lido.erro) return { erro: lido.erro };
  try {
    const texto = decodificar(await fs.readFile(copia.de));
    if (texto === null) return { erro: MSG.naoUtf8 };
    const documento = gerar({ texto, perfil: lido.perfil, logotipo: lido.logotipo });
    return documento.vazio ? { erro: MSG.semTexto } : documento;
  } catch (falha) {
    return { erro: falha?.message ?? falha };
  }
}

/** A cópia do texto vira o arquivo Word: cada origem é um grupo, para dois nomes iguais não se perderem. */
const comoWord = (copia, bytes) => ({ ...copia, nome: copia.nome.replace(TEXTO, '.docx'), de: null, bytes, pastaDeOrigem: copia.de });
const aviso = (texto) => ({ pasta: DOCUMENTOS, texto });
const pendencia = (linha) => ({ linha, chave: null, preencher: null });

/** Um arquivo de `documentos/` → o que entra em `copias`, `avisos` ou `pendencias`. */
async function tratar(copia, lido, gerar, saida) {
  if (copia.tipo !== WORD) {
    saida.avisos.push(aviso(MSG.copiado(copia.origem)));
    return saida.copias.push(copia);
  }
  const r = await converter(copia, lido, gerar);
  if (r.erro) return saida.pendencias.push(pendencia(MSG.erro(copia.origem, r.erro)));
  saida.avisos.push(...r.avisos.map((a) => aviso(MSG.aviso(copia.origem, a))));
  return saida.copias.push(comoWord(copia, r.bytes));
}

/**
 * Converte os textos que `separar` pôs em `documentos/`. Sem nenhum, devolve o que recebeu e não
 * lê o perfil.
 * @param {string} raiz a pasta do projeto
 * @param {{ unidades: object[], copias: object[], avisos: object[] }} produtos o que `separar` devolve
 * @param {function} [gerar] quem monta o Word (`gerarDocx`); os testes trocam para injetar um erro
 * @returns {Promise<{ produtos: object, pendencias: object[] }>} `produtos`: os mesmos, com o Word
 *   (`{ …, nome: '<nome>.docx', bytes }`) no lugar de cada texto convertido e os avisos da conversão ·
 *   `pendencias`: uma por texto que não foi convertido, `{ linha, chave: null, preencher: null }`
 */
export async function converterDocumentos(raiz, produtos, gerar = gerarDocx) {
  const saida = { copias: [], avisos: [...produtos.avisos], pendencias: [] };
  if (!produtos.copias.some((c) => c.pasta === DOCUMENTOS)) return { produtos, pendencias: [] };
  const lido = produtos.copias.some((c) => c.pasta === DOCUMENTOS && c.tipo === WORD) ? await perfilDoProjeto(raiz) : {};
  for (const copia of produtos.copias) {
    if (copia.pasta === DOCUMENTOS) await tratar(copia, lido, gerar, saida);
    else saida.copias.push(copia);
  }
  // Sem perfil, o Word sai sem cabeçalho: a entrega diz, para ninguém procurar um timbre que não existe.
  const temWord = saida.copias.some((c) => c.pasta === DOCUMENTOS && c.bytes);
  if (!lido.perfil && !lido.erro && temWord) saida.avisos.push(aviso(MSG.semPerfil));
  // Perfil criado e ainda vazio: também sem timbre, e a entrega diz.
  if (lido.perfil && perfilVazio(lido.perfil) && temWord) saida.avisos.push(aviso(AVISO_PERFIL_VAZIO));
  return { produtos: { ...produtos, copias: saida.copias, avisos: saida.avisos }, pendencias: saida.pendencias };
}
