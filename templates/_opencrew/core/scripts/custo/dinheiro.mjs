// Dinheiro em centavos inteiros (sem erro de ponto flutuante): ler o `Budget:` das preferências e
// escrever `R$ 1,50`. Spec: fase-u6b-dados-e-custo.md, regras 8 e 9 (repositório do OpenCrew).

/** Preço por imagem, em centavos: o teto da faixa publicada na skill `image-ai-generator` (SKILL.md, "Cost awareness"). */
export const PRECO_POR_ITEM = Object.freeze({ test: 2, production: 10 });

/**
 * O valor escrito em `Budget:` em centavos: `R$ 5,00`, `5`, `5.50`, `R$ 1.250,00`. `null` quando não é um valor
 * (o ponto separa milhares só em grupos de três; vírgula ou ponto com 1 ou 2 dígitos no fim são os centavos).
 * @param {string|null} texto
 */
export function lerReais(texto) {
  const limpo = String(texto ?? '').replace(/R\$/gi, '').replace(/\s+/g, '');
  const decimal = /^(.*?)[.,](\d{1,2})$/.exec(limpo);
  const [inteiro, centavos] = decimal ? [decimal[1], decimal[2]] : [limpo, ''];
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(inteiro)) return null;
  return Number(inteiro.replace(/\./g, '')) * 100 + Number(centavos.padEnd(2, '0') || 0);
}

/** Centavos em texto: `R$ 1,50`. */
export function reais(centavos) {
  const inteiro = Math.floor(centavos / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${inteiro},${String(centavos % 100).padStart(2, '0')}`;
}
