// Leitura de um campo de `_opencrew/_memory/preferences.md` por um script (`Budget`, `Retencao`…).
// O arquivo é do usuário: aqui só se lê. Aceita `- **Campo:** valor` e `Campo: valor`, em qualquer caixa.
// Spec: fase-u6b-dados-e-custo.md, regra 8 (repositório do OpenCrew).
import { readFileSync } from 'node:fs';
import path from 'node:path';

const escapar = (nome) => nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * O valor escrito num campo das preferências, ou `null` quando o arquivo não existe, o campo falta ou está vazio.
 * @param {string} raiz a pasta do projeto · @param {string[]} nomes os nomes aceitos do campo (`['Retencao', 'Retenção']`)
 */
export function lerPreferencia(raiz, nomes) {
  let texto;
  try {
    texto = readFileSync(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), 'utf8');
  } catch {
    return null;
  }
  const rx = new RegExp(`^[ \\t]*(?:[-*][ \\t]+)?\\*{0,2}(?:${nomes.map(escapar).join('|')})\\*{0,2}[ \\t]*:[ \\t]*\\*{0,2}[ \\t]*(.*)$`, 'im');
  // Comentário HTML e bloco de código não valem: o campo é a linha do arquivo, não um exemplo escrito nele.
  const vivo = texto.replace(/<!--[\s\S]*?-->/g, '').replace(/^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1[ \t]*$/gm, '');
  const valor = rx.exec(vivo.charCodeAt(0) === 0xfeff ? vivo.slice(1) : vivo)?.[1]?.replace(/\*+$/, '').trim();
  return valor ? valor : null;
}
