// Canais da entrega: a pasta de cada formato (o `platform:` do best-practice), os nomes que o
// LEIA-ME mostra e o que nunca entra numa entrega.
// Spec: fase-u3a1-pasta-de-entrega.md, regras 1 e 3 (repositório do OpenCrew).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { lerFrontmatter, lerTexto } from '../verificar/leitura.mjs';

/** Pasta do canal → nome no LEIA-ME, na ordem em que as seções aparecem. */
export const CANAIS = { instagram: 'Instagram', linkedin: 'LinkedIn', blog: 'Blog', email: 'E-mail', whatsapp: 'WhatsApp', twitter: 'X/Twitter', youtube: 'YouTube', documentos: 'Documentos' };
/** Plataforma cuja pasta tem outro nome (fase-u3b-documento-word.md, regra 12). */
const PASTA_DA_PLATAFORMA = { documento: 'documentos' };
export const OUTROS = 'outros';
export const EDITAVEIS = 'editaveis';
export const ehCanal = (pasta) => Object.hasOwn(CANAIS, pasta);
/** Como a pasta é chamada numa mensagem: o nome do canal, ou `outros/`. */
export const nomeDaPasta = (pasta) => CANAIS[pasta] ?? `${pasta}/`;

async function plataformaEm(raiz, pasta, formato) {
  const arquivo = path.join(raiz, '_opencrew', ...pasta, `${formato}.md`);
  if (!existsSync(arquivo)) return null;
  const valor = lerFrontmatter(await lerTexto(arquivo))?.platform;
  return typeof valor === 'string' && valor.trim() ? valor.trim().toLowerCase() : null;
}

/**
 * Canal de um formato: o `platform:` de `_opencrew/best-practices.local/<formato>.md`, quando o
 * arquivo o declara; senão, o do core. Sem formato, sem best-practice, sem `platform:` ou com
 * plataforma que não é uma das oito pastas: null (o arquivo vai para `outros/`). A plataforma
 * `documento` é a pasta `documentos`.
 */
export async function canalDoFormato(raiz, formato) {
  if (!formato || !/^[a-z0-9-]+$/.test(formato)) return null;
  const local = await plataformaEm(raiz, ['best-practices.local'], formato);
  const plataforma = local ?? (await plataformaEm(raiz, ['core', 'best-practices'], formato));
  const pasta = Object.hasOwn(PASTA_DA_PLATAFORMA, plataforma ?? '') ? PASTA_DA_PLATAFORMA[plataforma] : plataforma;
  return pasta && ehCanal(pasta) ? pasta : null;
}

const PASTAS_DE_SERVICO = new Set(['entrega', 'entrega.tmp', 'export']);

/**
 * Arquivo de serviço nunca entra, mesmo listado: `verificacao-*.md`, `ressalvas.json` (as
 * pendências aceitas, fase-u3a2-entrega-no-projeto.md, regra 18), `publicado.json`, o que está
 * em `entrega/`, `entrega.tmp/` ou `export/` de uma execução e o `caption.txt` direto na pasta
 * da execução (é ali que o publicador o grava; dentro de uma pasta `vN` ele é saída de passo).
 * E o `copia.json` direto na pasta da execução: o retrato do que foi copiado (mesma spec, regra 14).
 * @param {string} rel caminho relativo ao projeto, com `/`
 */
export function ehDeServico(rel) {
  const partes = rel.toLowerCase().split('/');
  const nome = partes.at(-1);
  if (/^verificacao-.*\.md$/.test(nome) || nome === 'publicado.json' || nome === 'ressalvas.json') return true;
  const naSaida = partes[0] === 'crews' && partes[2] === 'output';
  if (!naSaida) return false;
  if (partes.slice(4, -1).some((p) => PASTAS_DE_SERVICO.has(p))) return true;
  return (nome === 'caption.txt' || nome === 'copia.json') && partes.length === 5;
}
