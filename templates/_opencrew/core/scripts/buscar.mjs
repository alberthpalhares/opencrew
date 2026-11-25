#!/usr/bin/env node
// Busca local de execuções e arquivos, sem seguir links de pastas.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ehPrincipal, realDentroDe } from './comum.mjs';
import { RUN } from './caminho/argumentos.mjs';
import { lerRegistro } from './execucao/registro.mjs';

const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const listar = (pasta) => fs.readdir(pasta, { withFileTypes: true }).catch(() => []);

async function arquivosDe(pasta, prefixo = '') {
  const arquivos = [];
  for (const entrada of await listar(pasta)) {
    if (entrada.isSymbolicLink() || /^(?:rascunhos|historico|entrega|atuais)$|\.tmp$/.test(entrada.name)) continue;
    const rel = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) arquivos.push(...await arquivosDe(path.join(pasta, entrada.name), rel));
    else if (entrada.isFile() && !/^(?:execucao\.json|copia\.json|estado-escritorio\.json|verificacao-.*|INDICE\.md)$/.test(entrada.name)) arquivos.push(rel);
  }
  return arquivos;
}

async function legados(pasta, prefixo) {
  const porNome = new Map();
  const caminhos = (await arquivosDe(pasta)).sort((a, b) => b.localeCompare(a, 'pt-BR', { numeric: true }));
  for (const arquivo of caminhos) {
    const nome = arquivo.replace(/(^|\/)v\d+\//, '$1');
    if (!porNome.has(nome)) porNome.set(nome, `${prefixo}/${arquivo}`);
  }
  return porNome;
}

export async function buscar(raiz, { termo, crew, run }) {
  if (!termo?.trim()) throw new Error('Informe um termo para a busca.');
  const base = path.resolve(raiz, 'crews');
  const resultados = [];
  for (const entrada of await listar(base)) {
    if (!entrada.isDirectory() || entrada.isSymbolicLink() || (crew && entrada.name !== crew)) continue;
    const pastaCrew = path.join(base, entrada.name);
    if (!realDentroDe(base, pastaCrew)) continue;
    if (!(await fs.stat(path.join(pastaCrew, 'crew.yaml')).catch(() => null))?.isFile()) continue;
    const output = path.join(pastaCrew, 'output');
    if ((await fs.lstat(output).catch(() => null))?.isSymbolicLink()) continue;
    for (const item of await listar(output)) {
      if (!item.isDirectory() || item.isSymbolicLink() || !RUN.test(item.name) || (run && item.name !== run)) continue;
      const pasta = path.join(output, item.name);
      if (!realDentroDe(output, pasta)) continue;
      const registro = await lerRegistro(pasta);
      const prefixo = `crews/${entrada.name}/output/${item.name}`;
      const arquivos = registro?.organizada
        ? new Map(Object.entries(registro.revisoes ?? {}).map(([nome, revisao]) => [nome, revisao?.arquivo]))
        : await legados(pasta, prefixo);
      const consulta = normalizar(termo);
      const tema = registro?.tema ?? '';
      const bateTema = normalizar(tema).includes(consulta);
      const encontrados = [...arquivos].filter(([nome, arquivo]) => (
        (bateTema || normalizar(path.posix.basename(nome)).includes(consulta))
        && typeof arquivo === 'string' && arquivo.startsWith(`${prefixo}/`)
        && realDentroDe(pasta, path.resolve(raiz, arquivo))
      )).map(([, arquivo]) => arquivo);
      if (!bateTema && !encontrados.length) continue;
      const aprovada = Boolean(registro?.pacoteAprovado) && !['abortada', 'rejeitada'].includes(registro.status);
      const situacao = aprovada ? 'aprovada' : (registro?.organizada && registro.status === 'aberta' ? 'aguardando aprovação'
        : ['abortada', 'rejeitada'].includes(registro?.status) ? registro.status : 'aprovação não registrada');
      const copias = Array.isArray(registro?.copiasFinais) ? registro.copiasFinais : [];
      const ultimaCopia = aprovada ? copias.filter((c) => c?.assinatura === registro.pacoteAprovado).at(-1)?.pasta : null;
      resultados.push({ crew: entrada.name, run: item.name, tema, situacao, arquivos: aprovada ? [`${prefixo}/entrega/LEIA-ME.md`] : encontrados.length ? encontrados : [prefixo], ultimaCopia, data: String(registro?.iniciadaEm ?? item.name) });
    }
  }
  return resultados.sort((a, b) => b.data.localeCompare(a.data) || b.run.localeCompare(a.run));
}

export async function main(argv, { cwd = process.cwd(), escrever = console.log } = {}) {
  const termo = argv[0];
  const opts = { termo };
  for (let i = 1; i < argv.length; i++) {
    if (!['--crew', '--run'].includes(argv[i]) || !argv[i + 1]) {
      escrever('Uso: buscar.mjs "termo" [--crew nome] [--run id]');
      return 1;
    }
    opts[argv[i].slice(2)] = argv[++i];
  }
  try {
    const resultados = await buscar(cwd, opts);
    if (!resultados.length) escrever('Nenhuma execução encontrada.');
    for (const r of resultados) {
      escrever(`${r.crew} · ${r.run} · ${r.tema || 'sem tema'} · ${r.situacao}`);
      for (const arquivo of r.arquivos) escrever(`  ${arquivo}`);
      if (r.ultimaCopia) escrever(`  Última cópia: ${r.ultimaCopia}`);
    }
    return 0;
  } catch (erro) {
    escrever(`Não consegui buscar: ${erro.message}`);
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
