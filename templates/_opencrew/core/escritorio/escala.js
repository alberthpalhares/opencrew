// Escala do canvas (regra 16 da E1): a tela lógica da sala só é ampliada em escala inteira, e a
// conta é feita em pixels do dispositivo, para o pixel continuar quadrado com a tela do sistema
// em 125% ou 150%. E a disposição da página (regra 9 da E3): em janela estreita o painel da equipe
// desce para baixo do desenho, e a cena usa a largura inteira.
// Puro: sem DOM, sem relógio, sem rede. O tamanho disponível, a razão de pixels e a sala entram
// por parâmetro.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16, e fase-e3-conversa-e-entrega.md, regras 9 e 14
// (repositório do OpenCrew).

// Folga da conta com decimais: um canvas do tamanho exato que esta função devolveu tem de caber
// de novo (com razão 1,7 e escala 5, a divisão dá 4,999999999999999).
const FOLGA = 1e-9;

/**
 * A maior escala inteira em que a tela da sala cabe no espaço disponível.
 * @param {number} largura largura disponível, em pixels de CSS
 * @param {number} altura altura disponível, em pixels de CSS
 * @param {number} dpr pixels do dispositivo por pixel de CSS; inválido vale como 1
 * @param {{ largura: number, altura: number }} tela a tela lógica da sala em uso (uma de `SALAS`)
 * @returns {{ n: number, largura: number, altura: number }} `n`: o maior inteiro N ≥ 1 em que a
 *   tela ampliada N vezes cabe em largura·dpr × altura·dpr (se nem N = 1 cabe, 1: a página rola) ·
 *   `largura` e `altura`: o tamanho do canvas em pixels de CSS (a tela · N / dpr)
 */
export function escala(largura, altura, dpr, tela) {
  const razao = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const cabe = Math.min((largura * razao) / tela.largura, (altura * razao) / tela.altura);
  const n = Number.isFinite(cabe) ? Math.max(1, Math.floor(cabe + FOLGA)) : 1;
  return { n, largura: (tela.largura * n) / razao, altura: (tela.altura * n) / razao };
}

/** A partir desta largura útil da janela, em pixels de CSS, o painel da equipe fica ao lado do desenho. */
export const LARGURA_AO_LADO = 1100;
// Com o painel abaixo, o que sobra da largura para o desenho: as margens da página e da moldura,
// dos dois lados (os mesmos números estão na folha de estilo de `index.html`).
const MARGEM_DA_PAGINA = 12;
const MARGEM_DA_MOLDURA = 6;

/**
 * Onde fica o painel da equipe, pela largura útil da janela (regra 9 da E3).
 * @param {number} larguraUtil a largura da área da página, em pixels de CSS
 * @returns {{ painel: 'abaixo'|'ao-lado', desenho: number|null }} `abaixo`: com menos de
 *   `LARGURA_AO_LADO`; aí `desenho` é a largura que a cena tem para usar · `ao-lado`: `desenho` é
 *   `null`, porque depende da largura que o painel ocupar
 */
export function disposicao(larguraUtil) {
  if (!(larguraUtil < LARGURA_AO_LADO)) return { painel: 'ao-lado', desenho: null };
  return { painel: 'abaixo', desenho: Math.max(0, larguraUtil - 2 * (MARGEM_DA_PAGINA + MARGEM_DA_MOLDURA)) };
}
