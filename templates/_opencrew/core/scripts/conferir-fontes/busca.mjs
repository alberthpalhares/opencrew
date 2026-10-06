// Busca da conferência de fontes: onde está cada caminho citado (crew → raiz do projeto →
// absoluto → ao lado do agente ou da task que cita) e, quando ele sumiu, o que existe no projeto
// com o mesmo nome. Só testa existência e lista nomes; nunca lê conteúdo nem acessa a rede.
// Specs: specs/fase-r1-reparos-1-6-1.md, regra 17, e specs/fase-r2-update-e-envio-seguros.md,
// regra 25 (repositório do OpenCrew).
import { readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { ehDeRede } from '../comum.mjs';

export const LIMITE_DA_BUSCA = 20000;
const IGNORAR = new Set(['node_modules', 'output', '_opencrew', '_build']);

export const barra = (p) => p.split(path.sep).join('/');
export const ehAbsoluto = (p) => /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('/');
export const temBarraFinal = (ref) => /[\\/]$/.test(ref);
const semBarraFinal = (ref) => ref.replace(/[\\/]+$/, '');
const ehPasta = (p) => Boolean(p) && Boolean(statSync(p, { throwIfNoEntry: false })?.isDirectory());

const SUFIXO_DE_AGENTE = '.agent.md';

/**
 * Pastas ao lado de quem cita, só para arquivo de agente ou de task (dentro de `agents/`): a do
 * próprio arquivo e, para `agents/X.agent.md`, também `agents/X/` — é lá que fica a task que o
 * frontmatter do agente escreve como `tasks/x.md`.
 */
function pastasDeQuemCita(raiz, crew, citadoEm) {
  const agentes = path.resolve(raiz, crew, 'agents') + path.sep;
  return citadoEm.filter((arquivo) => arquivo.startsWith(agentes)).flatMap((arquivo) => {
    const pasta = path.dirname(arquivo);
    const nome = path.basename(arquivo);
    return nome.endsWith(SUFIXO_DE_AGENTE) ? [pasta, path.join(pasta, nome.slice(0, -SUFIXO_DE_AGENTE.length))] : [pasta];
  });
}

/**
 * Caminho real do que foi citado, ou null quando não existe. Ordem: pasta da crew → raiz do
 * projeto → absoluto → pastas ao lado dos arquivos de agente ou de task que citam (`citadoEm`).
 * Citação de duas barras (caminho de rede) nunca chega ao disco: sai como "não existe".
 */
export function resolver(raiz, crew, ref, citadoEm = []) {
  if (ehDeRede(ref)) return null;
  if (ehAbsoluto(ref)) return existsSync(ref) ? path.resolve(ref) : null;
  for (const base of [path.resolve(raiz, crew), raiz, ...pastasDeQuemCita(raiz, crew, citadoEm)]) {
    const p = path.resolve(base, ref);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * O primeiro segmento de `exemplo.com/blog/`, quando tem cara de domínio: um ponto que não é o
 * início e, depois do último ponto, 2 a 24 letras. Nome sem barra (`briefing.md`) é arquivo: null.
 */
function dominioNoInicio(ref) {
  const corte = ref.search(/[\\/]/);
  const primeiro = ref.slice(0, Math.max(corte, 0));
  const ponto = primeiro.lastIndexOf('.');
  return ponto > 0 && /^[A-Za-z]{2,24}$/.test(primeiro.slice(ponto + 1)) ? primeiro : null;
}

/**
 * Citação que a conferência não testa (regra 25 da fase R2): caminho de rede (começa por duas
 * barras) ou endereço de site — tem `://` (menos `http(s)://`, que fica como sempre foi), começa
 * por `mailto:` ou `www.`. Caminho de disco (letra de unidade ou uma barra no início) nunca é
 * endereço. Não consulta o disco nem a rede.
 */
export function ehRedeOuSite(ref) {
  if (ehDeRede(ref)) return true;
  if (ehAbsoluto(ref) || /^https?:\/\//i.test(ref)) return false;
  return ref.includes('://') || /^(?:mailto:|www\.)/i.test(ref);
}

/**
 * Citação que só parece endereço de site pela forma: o primeiro segmento tem cara de domínio e
 * não há pasta com esse nome no projeto. Quem chama confere antes se o projeto tem arquivo com o
 * mesmo nome: pasta com ponto que foi movida continua pendência, com sugestão.
 */
export function pareceSite({ raiz, crew }, { ref, citadoEm }) {
  if (ehAbsoluto(ref) || /^https?:\/\//i.test(ref)) return false;
  const dominio = dominioNoInicio(ref);
  return dominio != null && !ehPasta(resolver(raiz, crew, dominio, citadoEm));
}

/**
 * Índice nome → caminhos relativos à raiz (pasta termina em `/`), sem saídas, dependências e
 * pastas ocultas. Para ao passar de `limite` itens: aí `parcial` é true.
 */
export async function indexar(raiz, limite) {
  const porNome = new Map();
  let vistos = 0;
  let parcial = false;
  async function percorrer(dir) {
    let entradas;
    try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      if (++vistos > limite) { parcial = true; return; }
      if (e.name.startsWith('.') || (e.isDirectory() && IGNORAR.has(e.name))) continue;
      const abs = path.join(dir, e.name);
      const chave = e.name.toLowerCase();
      if (!porNome.has(chave)) porNome.set(chave, []);
      porNome.get(chave).push(barra(path.relative(raiz, abs)) + (e.isDirectory() ? '/' : ''));
      if (e.isDirectory()) await percorrer(abs);
    }
  }
  await percorrer(raiz);
  return { porNome, parcial };
}

/** Candidatos com o mesmo nome. Citado com barra final só casa com pasta; sem ela, com os dois. */
export function candidatosPorNome(indice, ref) {
  const todos = indice.porNome.get(path.basename(semBarraFinal(ref)).toLowerCase()) ?? [];
  return temBarraFinal(ref) ? todos.filter((c) => c.endsWith('/')) : todos;
}

/** Nomes do que existe na pasta em que o caminho deveria estar. */
export async function nomesDaPastaEsperada(raiz, crew, ref) {
  const pai = resolver(raiz, crew, path.dirname(semBarraFinal(ref)));
  if (!pai) return [];
  try { return (await readdir(pai)).filter((f) => !f.startsWith('.')); } catch { return []; }
}
