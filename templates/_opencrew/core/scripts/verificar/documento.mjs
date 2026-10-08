// O que o Word não vai converter, visto antes do revisor: no texto de formato `documento-oficial`
// o verificador lê as mesmas marcações que o conversor e põe um alerta para cada tipo de sobra.
// Alerta, nunca bloqueio: quem decide é o revisor. Spec: fase-u5a-polimento-do-uso.md, regra 6.
import { lerMarkdown } from '../documento/markdown.mjs';
import { item } from './regras.mjs';

export const FORMATO_DE_DOCUMENTO = 'documento-oficial';
const NOME = 'Documento Word';
const plural = (n, um, varios) => (n === 1 ? um : varios.replace('{n}', n));
const FRASES = [
  ['imagens', '1 imagem não entra no documento', '{n} imagens não entram no documento'],
  ['desconhecidas', '1 marcação `:::` desconhecida vai como texto', '{n} marcações `:::` desconhecidas vão como texto'],
  ['semFim', '1 bloco de assinaturas sem a linha `:::` do fim vai como texto', '{n} blocos de assinaturas sem a linha `:::` do fim vão como texto'],
];

/** Os alertas de um texto que vai virar Word; lista vazia quando tudo converte. */
export function alertasDeDocumento(texto) {
  const { avisos } = lerMarkdown(texto);
  return FRASES.filter(([chave]) => avisos[chave]).map(([chave, um, varios]) => item(NOME, null, null, 'alerta', plural(avisos[chave], um, varios)));
}