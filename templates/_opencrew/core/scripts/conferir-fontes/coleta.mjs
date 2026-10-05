// Coleta da conferência de fontes: os caminhos que a crew cita. Lê o crew.yaml, os passos
// (pipeline/steps/*.md) e todos os .md de agents/, em qualquer nível (agentes e tasks).
// Spec: specs/fase-r1-reparos-1-6-1.md, regras 15 e 16 (repositório do OpenCrew).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Marcador de modelo: nome a preencher, não arquivo (R1-06j). Pela ordem: ano (`AAAA-MM-DD`,
// `YYYY`); par de data ou hora sem letra nem dígito em volta (`DD-MM`, `MM-AA`, `HHMM`); número de
// ordem (`slide-NN.png`, só em maiúsculas); reticências no lugar de uma pasta. Ficam de fora, para
// não esconder fonte de verdade: `MM`, `DD` e `AA` sozinhos, `XX` e `[…]`.
const MARCADORES = [
  /AAAA|YYYY/i,
  /(?<![A-Za-z0-9])(?:DD[-_.]?MM|MM[-_.]?DD|MM[-_.]?(?:AA|YY)|(?:AA|YY)[-_.]?MM|HH[-_.h]?MM)(?![A-Za-z0-9])/i,
  /(?<![A-Za-z0-9])NN(?![A-Za-z0-9])/,
  /(^|[\\/])(\.\.\.|…)[\\/]/,
];
// Comando que termina em nome de arquivo (`node scripts/render.js`) não é caminho.
const COMANDO = /^(?:node|npx|npm|pnpm|yarn|python3?|pip|git|bash|sh|ls|cd|cat|cp|mv|mkdir|curl)\s/;

function pareceCaminho(t) {
  if (/[{}<>*$|]/.test(t) || /^https?:/i.test(t) || !/[\\/]/.test(t)) return false;
  if (COMANDO.test(t) || MARCADORES.some((m) => m.test(t))) return false;
  return /\.[A-Za-z0-9]{1,5}$/.test(t) || /[\\/]$/.test(t);
}
const saidaDeRun = (t) => /(^|[\\/])(output|_build)[\\/]/.test(t);

const ENTRE_CRASES = /`([^`\n]+)`/g;
// Só espaço e tab antes de `caminho:`: `\s` atravessa linhas e fica lento com muitas em branco.
const LINHA_DE_CAMINHO = /^([ \t]*(?:-[ \t]*)?caminho:[ \t]*)(.*)$/gm;
// Linha `- **Writes to**: …` do formato do agente: o que a crew grava (destino), não o que lê.
const LINHA_DE_DESTINO = /^[ \t]*[-*][ \t]*\*\*Writes to:?\*\*.*$/gim;

/** Caminhos de arquivo citados entre crases (saída de run não é fonte). */
function entreCrases(texto) {
  const citados = [...texto.matchAll(ENTRE_CRASES)].map((m) => m[1].trim());
  return citados.filter((t) => pareceCaminho(t) && !saidaDeRun(t));
}

/** Valor de `caminho:` — aceita aspas simples ou duplas e comentário `# …` no fim da linha. */
function valorDeCaminho(resto) {
  const entreAspas = resto.match(/^(["'])(.*?)\1\s*(?:#.*)?$/);
  if (entreAspas) return entreAspas[2].trim();
  return resto.replace(/(^|\s)#.*$/, '').trim();
}

/** Os `caminho:` declarados em `fontes:` no crew.yaml. */
function fontesDeclaradas(texto) {
  const linhas = [...texto.matchAll(LINHA_DE_CAMINHO)];
  return linhas.map((m) => valorDeCaminho(m[2].trim())).filter(Boolean);
}

/**
 * Troca `ref` por `sugestao` só onde a coleta o leu: o texto inteiro de um par de crases e, no
 * crew.yaml, o valor de uma linha `caminho:` (aspas e comentário ficam). O resto do arquivo —
 * outro caminho que contém o citado, frontmatter, texto fora de crases — não muda.
 */
export function trocarCitacao(texto, { ref, sugestao }, noCrewYaml) {
  const trocar = (trecho) => trecho.replace(ref, () => sugestao);
  const novo = texto.replace(ENTRE_CRASES, (tudo, dentro) => (dentro.trim() === ref ? trocar(tudo) : tudo));
  if (!noCrewYaml) return novo;
  const naLinha = (tudo, chave, resto) => (valorDeCaminho(resto.trim()) === ref ? chave + trocar(resto) : tudo);
  return novo.replace(LINHA_DE_CAMINHO, naLinha);
}

/** Os .md de uma pasta; com `fundo`, também os das subpastas (caminhada própria, Node 20.0). */
async function arquivosMd(dir, fundo) {
  let entradas;
  try { entradas = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const achados = [];
  for (const e of entradas) {
    const abs = path.join(dir, e.name);
    if (!e.isDirectory() && e.name.endsWith('.md')) achados.push(abs);
    if (e.isDirectory() && fundo) achados.push(...await arquivosMd(abs, true));
  }
  return achados;
}

/**
 * Caminho citado → { arquivos: os arquivos da crew em que ele aparece, destino: true quando só é
 * citado em linha `Writes to` }.
 */
export async function coletar(raiz, crew) {
  const base = path.resolve(raiz, crew);
  const crewYaml = path.join(base, 'crew.yaml');
  const arquivos = [
    ...(existsSync(crewYaml) ? [crewYaml] : []),
    ...await arquivosMd(path.join(base, 'pipeline', 'steps'), false),
    ...await arquivosMd(path.join(base, 'agents'), true),
  ];
  const refs = new Map();
  const anotar = (ref, arquivo, destino) => {
    if (!refs.has(ref)) refs.set(ref, { arquivos: new Set(), destino: true });
    refs.get(ref).arquivos.add(arquivo);
    refs.get(ref).destino &&= destino;
  };
  for (const arquivo of arquivos) {
    const texto = await readFile(arquivo, 'utf8');
    const lidos = new Set(entreCrases(texto.replace(LINHA_DE_DESTINO, '')));
    for (const ref of entreCrases(texto)) anotar(ref, arquivo, !lidos.has(ref));
    if (arquivo === crewYaml) for (const ref of fontesDeclaradas(texto)) anotar(ref, arquivo, false);
  }
  return refs;
}
