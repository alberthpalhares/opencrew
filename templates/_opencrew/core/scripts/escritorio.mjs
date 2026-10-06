#!/usr/bin/env node
// Escritório do OpenCrew — servidor local da página que mostra a equipe trabalhando.
// Uso: node _opencrew/core/scripts/escritorio.mjs [--porta <1024 a 65535>]
//   Rode na pasta do projeto (a que contém `_opencrew/`). Sem --porta, começa na 4747.
// Só leitura e só neste computador: escuta em 127.0.0.1, aceita só GET e não escreve em disco.
// Serve a página (`_opencrew/core/escritorio/`) e `GET /estado`, que lê `crews/*/state.json` a
// cada pedido.
// Porta ocupada: se quem responde nela é o escritório deste mesmo projeto, avisa e sai com 0, sem
// subir outro; senão tenta a seguinte, até 10 portas ao todo.
// Código de saída: 0 = escritório aberto (o processo segue rodando até Ctrl+C) ou já aberto ·
// 1 = erro de uso (porta inválida, pasta sem `_opencrew/`) ou nenhuma das 10 portas livre.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 13 a 15 (repositório do OpenCrew).
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ehPrincipal } from './comum.mjs';
import { criarServidor } from './escritorio/servidor.mjs';
import { abrir, sondar, procurar } from './escritorio/porta.mjs';
import { projetoDe } from './escritorio/projeto.mjs';

/**
 * Os arquivos da página, um a um: é a lista inteira do que o servidor entrega além de `/estado`.
 * Arquivo novo em `_opencrew/core/escritorio/` só é servido depois de entrar aqui.
 */
export const ARQUIVOS = [
  'index.html', 'app.js', 'painel.js', 'rotulos.js', 'cena.js',
  'sprites.js', 'sprites-sala.js', 'sprites-mesa.js',
  'modelo.js', 'modelo-mesas.js', 'modelo-textos.js', 'modelo-estado.js', 'modelo-agentes.js',
  'modelo-visao.js', 'modelo-pagina.js', 'demo.js',
  'escala.js', 'rota.js', 'animacao.js', 'quadro.js',
];

const PORTA_PADRAO = 4747;
const PORTA_MINIMA = 1024;
const PORTA_MAXIMA = 65535;

// Instalado, este script fica em `_opencrew/core/scripts/` e a página em `_opencrew/core/escritorio/`.
const PASTA_DA_PAGINA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'escritorio');

const endereco = (porta) => `http://127.0.0.1:${porta}`;

const USO = `Uso: node _opencrew/core/scripts/escritorio.mjs [--porta <${PORTA_MINIMA} a ${PORTA_MAXIMA}>]`;
const MSG = {
  aberto: (porta) => `Escritório aberto em ${endereco(porta)} — Ctrl+C para fechar`,
  jaAberto: (porta) => `O escritório já está aberto em ${endereco(porta)}`,
  semPorta: (a, b) => `Não foi possível abrir o escritório: as portas ${a} a ${b} estão ocupadas. Use --porta.`,
  foraDaRaiz: 'Rode este comando na pasta do projeto (a que contém _opencrew/).',
  portaInvalida: `Porta inválida: use --porta com um número de ${PORTA_MINIMA} a ${PORTA_MAXIMA}.`,
};

const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * A porta pedida em `--porta N` ou `--porta=N` (a última vale); sem a opção, a padrão.
 * @returns {number|null} null quando o valor não é um inteiro de 1024 a 65535
 */
function lerPorta(argv) {
  let porta = PORTA_PADRAO;
  for (let i = 0; i < argv.length; i++) {
    const opcao = argv[i].match(/^--porta(?:=(.*))?$/s);
    if (!opcao) continue;
    const valor = opcao[1] ?? argv[++i] ?? '';
    const numero = /^\d{1,5}$/.test(valor) ? Number(valor) : 0;
    if (numero < PORTA_MINIMA || numero > PORTA_MAXIMA) return null;
    porta = numero;
  }
  return porta;
}

/**
 * Erro de uso, na ordem: porta inválida → pasta atual sem `_opencrew/`.
 * @returns {string[]|null} as linhas em PT-BR, ou null quando está tudo certo
 */
function erroDeUso(porta, cwd) {
  if (porta === null) return [MSG.portaInvalida, USO];
  if (!ehPasta(path.join(cwd, '_opencrew'))) return [MSG.foraDaRaiz];
  return null;
}

/**
 * Sobe o escritório do projeto que mora em `cwd`, ou reconhece o que já está aberto.
 * @param {string[]} argv argumentos da linha de comando
 * @param {object} [o]
 * @param {string} [o.cwd] pasta do projeto
 * @param {(linha: string) => void} [o.escrever] recebe cada linha da saída
 * @param {string} [o.pasta] pasta da página
 * @param {string[]} [o.arquivos] nomes servidos da pasta da página
 * @param {(servidor: object, porta: number) => Promise<boolean>} [o.abrir] SÓ PARA TESTE: tenta
 *   abrir a porta (serve para simular portas ocupadas sem ocupá-las)
 * @param {(porta: number) => Promise<string|null>} [o.sondar] SÓ PARA TESTE: o `projeto` de quem
 *   responde na porta
 * @returns {Promise<{ code: number, porta?: number, servidor?: import('node:http').Server }>}
 *   `code` 0 com `porta` (escritório aberto ou já aberto) ou 1; `servidor` só quando este
 *   comando abriu um — é ele que mantém o processo vivo
 */
export async function main(argv, o = {}) {
  const { cwd = process.cwd(), escrever = (linha) => process.stdout.write(`${linha}\n`), pasta = PASTA_DA_PAGINA, arquivos = ARQUIVOS } = o;
  const inicial = lerPorta(argv);
  const erro = erroDeUso(inicial, cwd);
  if (erro) {
    erro.forEach((linha) => escrever(linha));
    return { code: 1 };
  }
  const servidor = criarServidor({ raiz: cwd, pasta, arquivos });
  const tentar = (porta) => (o.abrir ?? abrir)(servidor, porta);
  const r = await procurar({ inicial, projeto: projetoDe(cwd), abrir: tentar, sondar: o.sondar ?? sondar });
  if (r.tipo === 'sem-porta') {
    escrever(MSG.semPorta(inicial, r.ultima));
    return { code: 1 };
  }
  escrever(r.tipo === 'aberto' ? MSG.aberto(r.porta) : MSG.jaAberto(r.porta));
  return r.tipo === 'aberto' ? { code: 0, porta: r.porta, servidor } : { code: 0, porta: r.porta };
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then(({ code }) => { process.exitCode = code; });
}
