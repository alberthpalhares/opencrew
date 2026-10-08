// Leitura de uma crew para o conserto: `crew.yaml`, os passos do pipeline, os agentes, o manifesto,
// a memória e o histórico (`runs.md`). A leitura é tolerante (aceita as formas que versões antigas gravaram) e nunca grava.
// Spec: fase-u4a-conserto-de-crews.md, regra 5 (repositório do OpenCrew).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { lerFrontmatter, semBom } from '../verificar/leitura.mjs';

/** O texto do arquivo como está no disco (com BOM e fim de linha), ou null quando não existe. */
export function lerBruto(arquivo) {
  return existsSync(arquivo) && statSync(arquivo).isFile() ? readFileSync(arquivo, 'utf8') : null;
}

/** Valor de uma linha de YAML simples: sem aspas e sem o comentário do fim. */
const limpo = (valor) => valor.replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2');
const PAR = /^\s*(?:-\s+)?([A-Za-z_]+)\s*:\s*(.*)$/;

/** As entradas de `steps:` do `pipeline.yaml`, na ordem: `{ step, file, on_reject, … }`. */
export function entradasDoPipeline(texto) {
  const entradas = [];
  let dentro = false;
  for (const linha of semBom(texto ?? '').split(/\r?\n/)) {
    if (!linha.trim() || /^\s*#/.test(linha)) continue; // linha em branco e comentário não mudam a leitura
    if (/^\S/.test(linha) && !/^-\s/.test(linha)) dentro = /^steps\s*:/.test(linha);
    else if (dentro) anotar(entradas, linha);
  }
  return entradas.map(({ coluna: _coluna, ...entrada }) => entrada);
}

/** Só valem as chaves da própria entrada (na coluna da primeira): chave de um bloco de dentro não conta. */
function anotar(entradas, linha) {
  const item = linha.match(/^(\s*-\s+)(.*)$/);
  if (item) entradas.push({ coluna: item[1].length });
  const atual = entradas.at(-1);
  if (!atual || (!item && linha.match(/^\s*/)[0].length !== atual.coluna)) return;
  const par = linha.match(PAR);
  if (par) atual[par[1]] = limpo(par[2]);
  else if (item) atual.file = limpo(item[2]);
}

/**
 * Onde está o arquivo do passo: com ou sem `steps/` na frente (regra 5). O passo é sempre um
 * arquivo de dentro da crew: caminho absoluto ou com `..` não é lido nem alterado.
 */
function arquivoDoPasso(pasta, citado) {
  const partes = citado.split(/[\\/]/);
  if (path.isAbsolute(citado) || /^[A-Za-z]:/.test(citado) || partes.includes('..')) return null;
  const candidatos = [['pipeline', 'steps', citado], ['pipeline', citado], [citado]];
  const achado = candidatos.map((c) => path.join(pasta, ...c)).find((c) => realDentroDe(pasta, c) && lerBruto(c) !== null);
  return achado ?? null;
}

/** Número inteiro escrito como número ou entre aspas; senão, null. */
const inteiro = (v) => (/^\d+$/.test(String(v ?? '').trim()) ? Number(v) : null);

function passoDe(pasta, entrada, posicao) {
  const arquivo = entrada.file ? arquivoDoPasso(pasta, entrada.file) : null;
  const bruto = arquivo ? lerBruto(arquivo) : null;
  const dados = (bruto && lerFrontmatter(semBom(bruto))) || {};
  const volta = dados.on_reject ?? entrada.on_reject;
  return {
    numero: inteiro(entrada.step) ?? posicao + 1,
    citado: entrada.file ?? '',
    arquivo,
    bruto,
    dados,
    checkpoint: dados.type === 'checkpoint',
    revisao: volta !== undefined && volta !== '',
    volta: inteiro(volta),
  };
}

/** Sem `pipeline.yaml` (ou sem entradas), os passos são os arquivos de `pipeline/steps`, em ordem. */
function entradasDaPasta(pasta) {
  const dir = path.join(pasta, 'pipeline', 'steps');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((file) => ({ file }));
}

/** Lista de um frontmatter: `chave: [a, b]` ou um item `- a` por linha. */
export function listaDe(bruto, chave) {
  const fm = semBom(bruto ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const linhas = fm.split(/\r?\n/);
  const i = linhas.findIndex((l) => new RegExp(`^${chave}\\s*:`).test(l));
  if (i < 0) return [];
  const naLinha = linhas[i].slice(linhas[i].indexOf(':') + 1).trim();
  if (naLinha) return naLinha.replace(/^\[|\]$/g, '').split(',').map(limpo).filter(Boolean);
  const itens = [];
  for (let n = i + 1; n < linhas.length && /^\s*-\s+/.test(linhas[n]); n++) itens.push(limpo(linhas[n].replace(/^\s*-\s+/, '')));
  return itens;
}

function agentesDe(pasta) {
  const dir = path.join(pasta, 'agents');
  if (!existsSync(dir)) return [];
  const arquivos = readdirSync(dir).filter((f) => f.endsWith('.agent.md')).sort();
  return arquivos.map((f) => {
    const bruto = lerBruto(path.join(dir, f));
    return { id: f.slice(0, -'.agent.md'.length), arquivo: path.join(dir, f), bruto, dados: lerFrontmatter(semBom(bruto)) ?? {} };
  });
}

/** O `id` do agente de um passo: o último segmento do que está em `agent:` (regra 5). */
export const idDoAgente = (passo) => String(passo.dados.agent ?? '').split(/[\\/]/).at(-1);

/**
 * A crew como está no disco.
 * @param {string} raiz pasta do projeto · @param {string} crew `crews/<nome>`, como veio em `--crew`
 */
export function lerCrew(raiz, crew) {
  const pasta = path.resolve(raiz, crew);
  const arquivo = (...partes) => path.join(pasta, ...partes);
  const doPipeline = entradasDoPipeline(lerBruto(arquivo('pipeline', 'pipeline.yaml')));
  const entradas = doPipeline.length ? doPipeline : entradasDaPasta(pasta);
  return {
    raiz,
    pasta,
    nome: path.basename(pasta),
    yaml: lerBruto(arquivo('crew.yaml')),
    passos: entradas.map((e, i) => passoDe(pasta, e, i)),
    agentes: agentesDe(pasta),
    csv: lerBruto(arquivo('crew-party.csv')),
    memoria: lerBruto(arquivo('_memory', 'memories.md')),
    runs: lerBruto(arquivo('_memory', 'runs.md')),
    arquivos: { yaml: arquivo('crew.yaml'), csv: arquivo('crew-party.csv'), memoria: arquivo('_memory', 'memories.md'), runs: arquivo('_memory', 'runs.md') },
  };
}
