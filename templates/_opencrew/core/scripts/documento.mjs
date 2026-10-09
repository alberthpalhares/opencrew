#!/usr/bin/env node
// Documento Word: converte um texto em markdown (.md ou .txt) num `.docx`, com as mesmas palavras
// e os mesmos números, na mesma ordem. Com o perfil de documento oficial do projeto, sai em papel
// timbrado: cabeçalho com logotipo, rodapé com "Página X de Y", margens e letra do perfil.
// Uso (na pasta do projeto): node _opencrew/core/scripts/documento.mjs "<arquivo.md>"
//   [--saida <arquivo.docx|pasta>] [--perfil <arquivo>] [--sem-perfil] [--substituir] [--ajuda]
//   node _opencrew/core/scripts/documento.mjs --criar-perfil
//   --saida: onde gravar (padrão: ao lado do texto, com o mesmo nome e `.docx`); a pasta é criada.
//   --perfil: outro arquivo de perfil (padrão: `_opencrew/_memory/documento-oficial.md`, se existir).
//   --sem-perfil: ignora o perfil do projeto (sem timbre, com os padrões).
//   --substituir: autoriza trocar um `.docx` diferente que já existe no destino.
//   --criar-perfil: cria o perfil do projeto a partir do modelo, só se ele não existir.
// Grava só o `.docx` pedido (por um temporário ao lado, renomeado no fim) e, com --criar-perfil, o
// perfil que faltava. Nunca apaga nada. Um `.docx` igual ao que seria gravado não é tocado.
// Última linha da saída: DOCUMENTO:OK (o Word está no destino) · PERFIL:CRIADO ou PERFIL:JA-EXISTE
// (com --criar-perfil).
// Código de saída: 0 quando a linha final sai, e em --ajuda · 1 = erro: uma mensagem em PT-BR, sem
// linha DOCUMENTO: e nada gravado.
// Para outros scripts: `gerarDocx({ texto, perfil, logotipo })` → `{ bytes, avisos }`, sem tocar o
// disco; `lerPerfilDoProjeto(raiz, arquivo)` → `{ perfil, logotipo }` ou `{ erro }`.
// Spec: fase-u3b-documento-word.md (repositório do OpenCrew).
import { existsSync, promises as fs, statSync } from 'node:fs';
import path from 'node:path';
import { MSG as COMUM, dentroDoProjeto, ehPrincipal, relativoAoProjeto } from './comum.mjs';
import { MSG, USO, lerArgs, limpar } from './documento/argumentos.mjs';
import { gravarDocx } from './documento/gravar.mjs';
import { gerarDocx } from './documento/pacote.mjs';
import { AVISO_PERFIL_VAZIO, perfilVazio } from './documento/perfil.mjs';
import { PERFIL, criarPerfil, lerPerfilDoProjeto } from './documento/projeto.mjs';

export { gerarDocx } from './documento/pacote.mjs';
export { AVISO_PERFIL_VAZIO, lerPerfil, perfilVazio } from './documento/perfil.mjs';
export { PERFIL, lerPerfilDoProjeto } from './documento/projeto.mjs';

const TEXTO = /\.(md|txt)$/i;
const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();
const ehArquivo = (p) => existsSync(p) && statSync(p).isFile();
const erro = (mensagem, comUso = false) => ({ erro: mensagem, comUso });

/** O arquivo de texto pedido: um só, dentro do projeto, `.md` ou `.txt`, e que existe. */
function conferirOrigem(raiz, arquivos) {
  if (arquivos.length === 0) return erro(MSG.semArquivo, true);
  if (arquivos.length > 1) return erro(MSG.maisDeUm(arquivos.length), true);
  if (!ehPasta(path.join(raiz, '_opencrew'))) return erro(COMUM.semRaiz);
  if (!dentroDoProjeto(raiz, arquivos[0])) return erro(COMUM.foraDoProjeto(limpar(arquivos[0])));
  const rel = relativoAoProjeto(raiz, arquivos[0]);
  if (!TEXTO.test(rel)) return erro(MSG.extensao(rel));
  return ehArquivo(path.resolve(raiz, arquivos[0])) ? { rel, abs: path.resolve(raiz, arquivos[0]) } : erro(MSG.naoEncontrei(rel));
}

/** Onde o Word vai: ao lado do texto, ou no arquivo `.docx` ou na pasta de `--saida`. */
function conferirDestino(raiz, saida, origem) {
  const nome = `${path.basename(origem.abs).replace(TEXTO, '')}.docx`;
  if (saida === undefined) return { destino: path.join(path.dirname(origem.abs), nome) };
  const recusada = erro(MSG.saida(limpar(saida)));
  if (!saida.trim() || !dentroDoProjeto(raiz, saida)) return recusada;
  const alvo = path.resolve(raiz, saida);
  if (/\.docx$/i.test(alvo)) return ehPasta(alvo) ? recusada : { destino: alvo };
  if (ehPasta(alvo)) return { destino: path.join(alvo, nome) };
  return existsSync(alvo) || path.extname(alvo) ? recusada : { destino: path.join(alvo, nome) };
}

/** O arquivo de perfil que vale nesta chamada (`arquivo` fica sem valor quando não há perfil). */
function conferirPerfil(raiz, args) {
  if (args.semPerfil) return {};
  if (args.perfil === undefined) return ehArquivo(path.join(raiz, PERFIL)) ? { arquivo: PERFIL } : {};
  if (!dentroDoProjeto(raiz, args.perfil)) return erro(COMUM.foraDoProjeto(limpar(args.perfil)));
  return ehArquivo(path.resolve(raiz, args.perfil)) ? { arquivo: args.perfil } : erro(MSG.semPerfil(limpar(args.perfil)));
}

/** Tudo o que a chamada pede, conferido antes de ler ou gravar qualquer coisa. */
function conferir(raiz, args) {
  const origem = conferirOrigem(raiz, args.arquivos);
  if (origem.erro) return origem;
  const destino = conferirDestino(raiz, args.saida, origem);
  const perfil = conferirPerfil(raiz, args);
  return destino.erro ? destino : perfil.erro ? perfil : { origem, destino: destino.destino, perfil: perfil.arquivo };
}

/** O texto do arquivo, em UTF-8; `null` quando os bytes não são UTF-8. */
async function lerTexto(arquivo) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(await fs.readFile(arquivo));
  } catch (falha) {
    if (falha instanceof TypeError) return null;
    throw falha;
  }
}

/** Monta o documento na memória: `{ bytes, avisos }`, ou `{ erro }` com a mensagem. */
async function montar(raiz, pedido) {
  const texto = await lerTexto(pedido.origem.abs);
  if (texto === null) return erro(MSG.naoUtf8(pedido.origem.rel));
  const lido = pedido.perfil ? await lerPerfilDoProjeto(raiz, pedido.perfil) : {};
  if (lido.erro) return erro(lido.erro);
  const documento = gerarDocx({ texto, perfil: lido.perfil, logotipo: lido.logotipo });
  if (documento.vazio) return erro(MSG.semTexto(pedido.origem.rel));
  return lido.perfil && perfilVazio(lido.perfil) ? { ...documento, avisos: [...documento.avisos, AVISO_PERFIL_VAZIO] } : documento;
}

function relatorio(raiz, pedido, estado, avisos) {
  const destino = relativoAoProjeto(raiz, pedido.destino);
  return [
    estado === 'igual' ? MSG.igual(destino) : MSG.gerado(destino),
    pedido.perfil ? MSG.perfil(relativoAoProjeto(raiz, pedido.perfil)) : MSG.nenhumPerfil,
    ...(avisos.length ? [MSG.avisos, ...avisos.map((a) => `- ${a}`)] : []),
    ...MSG.dicas,
    'DOCUMENTO:OK',
  ];
}

/** Converte e grava; devolve as linhas da saída e o código. */
async function converter(raiz, args, disco) {
  const pedido = conferir(raiz, args);
  if (pedido.erro) return { linhas: [pedido.erro, ...(pedido.comUso ? [USO] : [])], code: 1 };
  const documento = await montar(raiz, pedido);
  if (documento.erro) return { linhas: [documento.erro], code: 1 };
  const estado = await gravarDocx(pedido.destino, documento.bytes, { substituir: args.substituir, disco });
  const destino = relativoAoProjeto(raiz, pedido.destino);
  if (estado === 'diferente') return { linhas: [MSG.jaExiste(destino)], code: 1 };
  if (estado === 'falha') return { linhas: [MSG.falha(destino)], code: 1 };
  return { linhas: relatorio(raiz, pedido, estado, documento.avisos), code: 0 };
}

async function criar(raiz) {
  if (!ehPasta(path.join(raiz, '_opencrew'))) return { linhas: [COMUM.semRaiz], code: 1 };
  const criado = await criarPerfil(raiz);
  return { linhas: criado ? [MSG.perfilCriado(PERFIL), 'PERFIL:CRIADO'] : [MSG.perfilJaExiste(PERFIL), 'PERFIL:JA-EXISTE'], code: 0 };
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto), `escrever` e `disco` (as funções de
 *   `fs.promises` usadas na gravação do `.docx`)
 * @returns {Promise<number>} 0 = a linha final saiu (ou `--ajuda`) · 1 = erro (uma mensagem em
 *   PT-BR, sem linha `DOCUMENTO:`, nada gravado)
 */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`), disco = fs } = {}) {
  const args = lerArgs(argv);
  const sair = ({ linhas, code }) => linhas.forEach((l) => escrever(l)) ?? code;
  if (args.ajuda) return sair({ linhas: [USO], code: 0 });
  if (args.desconhecida) return sair({ linhas: [MSG.desconhecida(limpar(args.desconhecida)), USO], code: 1 });
  try {
    return sair(args.criarPerfil ? await criar(cwd) : await converter(cwd, args, disco));
  } catch (falha) {
    return sair({ linhas: [`Não consegui gerar o documento: ${limpar(falha?.message ?? falha)}`], code: 1 });
  }
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
