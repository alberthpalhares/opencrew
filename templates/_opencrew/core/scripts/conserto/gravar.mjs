// A gravação do conserto: o que impede de gravar é visto antes de tocar em qualquer arquivo; cada
// arquivo alterado ganha antes a cópia `.bak` (a que já existe fica).
// Spec: fase-u4a-conserto-de-crews.md, regras 1 e 2 (repositório do OpenCrew).
import { accessSync, constants, existsSync, writeFileSync } from 'node:fs';
import { relativoAoProjeto } from '../comum.mjs';

const MSG = {
  naoUtf8: (arquivo) => `Não altero ${arquivo}: o arquivo não está em UTF-8. Salve-o em UTF-8 e rode de novo.`,
  somenteLeitura: (arquivo) => `Não consigo gravar em ${arquivo} (arquivo protegido ou aberto em outro programa). Nada foi gravado.`,
  parouNoMeio: (gravados, arquivo, motivo) => `A gravação parou em ${arquivo}: ${motivo}. Já gravados: ${gravados.join(', ') || 'nenhum'} (a cópia .bak de cada um tem o texto de antes).`,
};

const INVALIDO = String.fromCharCode(0xfffd); // o que sobra de um byte que não é UTF-8

function podeGravar(arquivo) {
  try {
    accessSync(arquivo, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** O que impede a gravação, visto antes de tocar em qualquer arquivo: texto que não é UTF-8, arquivo protegido. */
export function erroAntesDeGravar(raiz, mudancas) {
  const rel = (m) => relativoAoProjeto(raiz, m.arquivo);
  const estranho = mudancas.find((m) => m.antes?.includes(INVALIDO));
  if (estranho) return MSG.naoUtf8(rel(estranho));
  const fechado = mudancas.find((m) => m.antes !== null && !podeGravar(m.arquivo));
  return fechado ? MSG.somenteLeitura(rel(fechado)) : null;
}

/**
 * Grava as mudanças; antes de cada arquivo, a cópia `.bak` do que estava lá (se ainda não existe).
 * @returns {string[]} as linhas do relatório, com os caminhos relativos ao projeto
 */
export function gravar(raiz, mudancas) {
  const linhas = [];
  const gravados = [];
  for (const { arquivo, antes, depois } of mudancas) {
    const rel = relativoAoProjeto(raiz, arquivo);
    const copia = `${arquivo}.bak`;
    const jaHavia = existsSync(copia);
    try {
      if (antes !== null && !jaHavia) writeFileSync(copia, antes, 'utf8');
      writeFileSync(arquivo, depois, 'utf8');
    } catch (falha) {
      throw new Error(MSG.parouNoMeio(gravados, rel, falha?.code ?? falha?.message ?? falha), { cause: falha });
    }
    gravados.push(rel);
    linhas.push(`Gravei: ${rel}`);
    if (antes !== null) linhas.push(`Cópia: ${rel}.bak${jaHavia ? ' (mantive a cópia que já existia)' : ''}`);
  }
  return linhas;
}
