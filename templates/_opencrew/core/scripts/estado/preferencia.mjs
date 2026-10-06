// O escritório está ligado? A preferência mora em `_opencrew/_memory/preferences.md`.
// Spec: fase-e1-escritorio-ao-vivo.md, regra 9 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';

// A linha da preferência: `- **Dashboard:** <valor>` (a que o onboarding grava) ou
// `Dashboard: <valor>`, sem diferenciar maiúsculas. Comentário e texto corrido não contam.
const LINHA = /^[ \t]*(?:[-*+][ \t]+)?(?:\*\*)?dashboard(?:\*\*)?:(?:\*\*)?[ \t]*(\S*)/im;

/**
 * Pura: o texto de `preferences.md` liga o escritório? Vale a primeira linha da preferência. A marca
 * de ordem de bytes que o PowerShell do Windows e alguns editores gravam no início do arquivo não
 * faz parte da linha.
 */
export const ligadoNoTexto = (texto) => texto.replace(/^\uFEFF/, '').match(LINHA)?.[1].toLowerCase() === 'enabled';

/** Desligado por padrão: sem o arquivo, sem a linha ou com outro valor, a resposta é `false`. */
export async function escritorioLigado(raiz) {
  try {
    return ligadoNoTexto(await fs.readFile(path.join(raiz, '_opencrew', '_memory', 'preferences.md'), 'utf8'));
  } catch {
    return false;
  }
}
