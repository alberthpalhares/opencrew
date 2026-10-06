// Escala do canvas (regra 16): a tela interna de 320×180 só é ampliada em escala inteira, e a
// conta é feita em pixels do dispositivo, para o pixel continuar quadrado com a tela do sistema
// em 125% ou 150%.
// Puro: sem DOM, sem relógio, sem rede. O tamanho disponível e a razão de pixels entram por
// parâmetro.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 16 (repositório do OpenCrew).
import { ALTURA, LARGURA } from './modelo-mesas.js';

// Folga da conta com decimais: um canvas do tamanho exato que esta função devolveu tem de caber
// de novo (com razão 1,7 e escala 5, a divisão dá 4,999999999999999).
const FOLGA = 1e-9;

/**
 * A maior escala inteira em que a tela cabe no espaço disponível.
 * @param {number} largura largura disponível, em pixels de CSS
 * @param {number} altura altura disponível, em pixels de CSS
 * @param {number} dpr pixels do dispositivo por pixel de CSS; inválido vale como 1
 * @returns {{ n: number, largura: number, altura: number }} `n`: o maior inteiro N ≥ 1 em que
 *   320·N × 180·N cabe em largura·dpr × altura·dpr (se nem N = 1 cabe, 1: a página rola) ·
 *   `largura` e `altura`: o tamanho do canvas em pixels de CSS (320·N/dpr × 180·N/dpr)
 */
export function escala(largura, altura, dpr) {
  const razao = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const cabe = Math.min((largura * razao) / LARGURA, (altura * razao) / ALTURA);
  const n = Number.isFinite(cabe) ? Math.max(1, Math.floor(cabe + FOLGA)) : 1;
  return { n, largura: (LARGURA * n) / razao, altura: (ALTURA * n) / razao };
}
