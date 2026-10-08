// O perfil de documento oficial: um arquivo de texto do projeto, com linhas `chave: valor`.
// Aqui ele é lido e validado, sem tocar o disco; o logotipo é conferido em `projeto.mjs`.
// Spec: fase-u3b-documento-word.md, §3 e regra 10 (repositório do OpenCrew).

/** O que vale quando a chave não vem, ou vem vazia. */
export const PADRAO = Object.freeze({
  logotipo: '', logotipo_largura_cm: 2.5, cabecalho_1: '', cabecalho_2: '', cabecalho_3: '', rodape: '', numero_pagina: true,
  margem_esquerda_cm: 3, margem_direita_cm: 2, margem_superior_cm: 2.5, margem_inferior_cm: 2.5, fonte: 'Arial', tamanho_corpo_pt: 11,
});

export const MSG = {
  chave: (n, chave) => `Perfil, linha ${n}: não conheço a chave ${chave}.`,
  grafia: (n, certa) => `Perfil, linha ${n}: a chave se escreve ${certa}: em minúsculas, sem acento, no começo da linha e sem espaço antes dos dois-pontos.`,
  valor: (n, chave, esperado, valor) => `Perfil, linha ${n}: ${chave} precisa ser ${esperado}. Recebi: ${valor}.`,
};

// `chave: valor`; o espaço depois dos dois-pontos é opcional, mas um endereço (`https://…`) não é chave.
const LINHA = /^([a-z0-9_]+):(?!\/\/)[ \t]*(.*)$/;
const NUMERO = /^\d+(?:[.,]\d+)?$/;
const numero = (valor) => (NUMERO.test(valor) ? Number(valor.replace(',', '.')) : NaN);
const texto = { esperado: '', ler: (valor) => valor };
const deUmASeis = { esperado: 'um número de 1 a 6', ler: (valor) => (numero(valor) >= 1 && numero(valor) <= 6 ? numero(valor) : undefined) };
const SIM_OU_NAO = { sim: true, nao: false, 'não': false };

/** Como cada chave é lida: `ler` devolve o valor, ou `undefined` quando ele não serve. */
const CHAVES = {
  logotipo: texto,
  logotipo_largura_cm: deUmASeis,
  cabecalho_1: texto,
  cabecalho_2: texto,
  cabecalho_3: texto,
  rodape: texto,
  numero_pagina: { esperado: 'sim ou nao', ler: (valor) => (Object.hasOwn(SIM_OU_NAO, valor.toLowerCase()) ? SIM_OU_NAO[valor.toLowerCase()] : undefined) },
  margem_esquerda_cm: deUmASeis,
  margem_direita_cm: deUmASeis,
  margem_superior_cm: deUmASeis,
  margem_inferior_cm: deUmASeis,
  fonte: { esperado: 'um nome com até 40 letras, dígitos e espaços', ler: (valor) => (/^[\p{L}\p{N} ]{1,40}$/u.test(valor) ? valor : undefined) },
  tamanho_corpo_pt: { esperado: 'um número de 8 a 14 (aceita meio ponto)', ler: (valor) => (numero(valor) >= 8 && numero(valor) <= 14 && Number.isInteger(numero(valor) * 2) ? numero(valor) : undefined) },
};

// Linha que parece "chave: valor" mas não foi lida como chave: maiúscula, acento ou espaço antes.
const QUASE = /^[ \t]*([\p{L}0-9_]+)[ \t]*:(?!\/\/)/u;
const semAcento = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** A chave conhecida que a linha quis escrever, quando não a escreveu do jeito certo; senão, null. */
function chaveQuaseCerta(linha) {
  const [, escrita] = QUASE.exec(linha) ?? [];
  const certa = escrita ? semAcento(escrita) : '';
  return Object.hasOwn(CHAVES, certa) && !linha.startsWith(`${certa}:`) ? certa : null;
}

/** Tira as aspas em volta do valor, se as duas pontas têm a mesma. */
function semAspas(valor) {
  const v = valor.trim();
  return v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0] ? v.slice(1, -1).trim() : v;
}

/**
 * Lê o texto do perfil. Só valem as linhas `chave: valor` cuja chave tem letras minúsculas,
 * dígitos e `_`, a partir da primeira coluna; qualquer outra linha é comentário. Valor vazio vale
 * o padrão. Chave repetida: vale a última.
 * @param {string} bruto
 * @returns {{ perfil: object, linhas: Record<string, number>, erro: string|null }} `perfil` com os
 *   padrões aplicados; `linhas`: o número da linha de cada chave lida; `erro`: a mensagem em PT-BR
 */
export function lerPerfil(bruto) {
  const perfil = { ...PADRAO };
  const linhas = {};
  const semBom = bruto.charCodeAt(0) === 0xfeff ? bruto.slice(1) : bruto;
  for (const [i, linha] of semBom.split(/\r\n?|\n/).entries()) {
    const [, chave, escrito = ''] = LINHA.exec(linha.trimEnd()) ?? [];
    const quase = chave ? null : chaveQuaseCerta(linha);
    if (quase) return { perfil, linhas, erro: MSG.grafia(i + 1, quase) };
    if (!chave) continue;
    if (!Object.hasOwn(CHAVES, chave)) return { perfil, linhas, erro: MSG.chave(i + 1, chave) };
    linhas[chave] = i + 1;
    const valor = semAspas(escrito);
    const lido = valor === '' ? PADRAO[chave] : CHAVES[chave].ler(valor);
    if (lido === undefined) return { perfil, linhas, erro: MSG.valor(i + 1, chave, CHAVES[chave].esperado, valor) };
    perfil[chave] = lido;
  }
  return { perfil, linhas, erro: null };
}
