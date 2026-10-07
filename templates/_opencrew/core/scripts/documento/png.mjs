// Leitura mínima de um PNG: a assinatura de 8 bytes e a largura e a altura do bloco IHDR, para a
// proporção do logotipo. A imagem não é aberta nem regravada: vai para o documento como veio.
// Spec: fase-u3b-documento-word.md, §3 (repositório do OpenCrew).

const ASSINATURA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Tamanho máximo do logotipo: 2 MB. */
export const MAXIMO = 2 * 1024 * 1024;

/**
 * @param {Uint8Array} bytes
 * @returns {{ largura: number, altura: number }|null} null quando não é um PNG
 */
export function lerPng(bytes) {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length < 24 || ASSINATURA.some((valor, i) => b[i] !== valor)) return null;
  if (b.toString('latin1', 12, 16) !== 'IHDR') return null;
  const largura = b.readUInt32BE(16);
  const altura = b.readUInt32BE(20);
  return largura > 0 && altura > 0 ? { largura, altura } : null;
}
