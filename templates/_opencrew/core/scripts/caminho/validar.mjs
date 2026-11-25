import path from 'node:path';
import { MSG, dentroDoProjeto, realDentroDe } from '../comum.mjs';
import { erroDeArgumentos, limpar } from './argumentos.mjs';
import { acharCrew } from './crew.mjs';
import { naExecucao, normalizar } from './nucleo.mjs';

/** Confere se o arquivo declarado permanece dentro da execução. */
function erroDoArquivo(raiz, crew, { acao, run, arquivo }) {
  if (!dentroDoProjeto(raiz, arquivo)) return MSG.foraDoProjeto(limpar(arquivo));
  const local = acao === 'conferir' || acao === 'pasta' ? null : naExecucao(arquivo, crew, run);
  if (!local) return null;
  if (!local.nome) return `Falta o nome do arquivo em --arquivo: ${limpar(arquivo)}`;
  const execucao = path.resolve(raiz, 'crews', crew, 'output', run);
  const partes = normalizar(arquivo).split('/');
  const sai = partes.includes('..') || partes.includes('.') || !realDentroDe(execucao, path.resolve(raiz, local.grupo));
  return sai ? `Caminho fora da pasta da execução: ${limpar(arquivo)}` : null;
}

/** Localiza a crew e valida os caminhos de entrada antes de qualquer escrita. */
export function localizar(raiz, args) {
  const erro = erroDeArgumentos(args);
  if (erro) return { erro };
  const achada = acharCrew(raiz, args.crew);
  if (achada.erro) return achada;
  const arquivos = args.arquivos ?? (args.arquivo ? [args.arquivo] : []);
  const doArquivo = arquivos.map((arquivo) => erroDoArquivo(raiz, achada.crew, { ...args, arquivo })).find(Boolean);
  return doArquivo ? { erro: doArquivo } : achada;
}
