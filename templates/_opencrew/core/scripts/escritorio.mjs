#!/usr/bin/env node
// Escritório do OpenCrew — servidor local da página que mostra a equipe trabalhando.
// Rode na pasta do projeto. O servidor serve só GET para a página e o estado de cada execução.
// A busca começa em 4747. O servidor de histórico fica ativo até ser encerrado no terminal.
// Spec: fase-u7-f3c-escritorio-auto-open.md (repositório do OpenCrew).
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ehPrincipal } from './comum.mjs';
import { criarServidor, iniciarServidorExato } from './escritorio/servidor.mjs';
import { abrir, alguemEscuta, sondarEstado, sondarPronto, procurar } from './escritorio/porta.mjs';
import { confirmarPorta, garantirServidor, prazoDeAbertura } from './escritorio/automatico.mjs';
import { abrirNoSistema } from './escritorio/navegador.mjs';
import { projetoDe, versaoDe } from './escritorio/projeto.mjs';
import { enderecosDeRede, linhasDeUrl } from './escritorio/rede.mjs';

/**
 * Os arquivos da página, um a um: é a lista inteira do que o servidor entrega além de `/estado`.
 * Arquivo novo em `_opencrew/core/escritorio/` só é servido depois de entrar aqui.
 */
export const ARQUIVOS = [
  'index.html', 'app.js', 'painel.js', 'rotulos.js', 'cena.js', 'cena-sala.js', 'folha.js', 'folha-salas.js',
  'sprites.js', 'sprites-sala.js', 'sprites-mesa.js', 'sprites-rosto.js', 'sprites-corpo.js', 'sprites-boneco.js',
  'sprites-parede.js', 'sprites-moveis.js', 'sprites-lazer.js',
  'modelo.js', 'modelo-mesas.js', 'modelo-textos.js', 'modelo-estado.js', 'modelo-agentes.js',
  'modelo-personagem.js', 'modelo-visao.js', 'modelo-pagina.js', 'demo.js',
  'modelo-periodo.js', 'modelo-moveis.js', 'modelo-ambiente.js', 'modelo-falas.js',
  'modelo-lazer.js', 'modelo-dialogos.js',
  'escala.js', 'rota.js', 'animacao.js', 'quadro.js',
  'aviso.js',
];

const PORTA_PADRAO = 4747;
const PORTA_MINIMA = 1024;
const PORTA_MAXIMA = 65535;

// Instalado, este script fica em `_opencrew/core/scripts/` e a página em `_opencrew/core/escritorio/`.
const PASTA_DA_PAGINA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'escritorio');

const endereco = (porta) => `http://127.0.0.1:${porta}`;

const USO = `Uso: node _opencrew/core/scripts/escritorio.mjs [--porta <${PORTA_MINIMA} a ${PORTA_MAXIMA}>] [--automatico --crew <nome> --run <id> [--preparar|--confirmar] [--externo]]`;
const MSG = {
  aberto: (porta) => `Escritório aberto em ${endereco(porta)} — Ctrl+C para fechar`,
  jaAberto: (porta) => `O escritório já está aberto em ${endereco(porta)}`,
  desatualizado: (porta) => `O Escritório aberto em ${endereco(porta)} é de uma versão anterior e continua ativo. Use --automatico para abrir a versão atual em outra porta.`,
  semPorta: (a, b) => `Não foi possível abrir o escritório: as portas ${a} a ${b} estão ocupadas. Use --porta.`,
  foraDaRaiz: 'Rode este comando na pasta do projeto (a que contém _opencrew/).',
  portaInvalida: `Porta inválida: use --porta com um número de ${PORTA_MINIMA} a ${PORTA_MAXIMA}.`,
  autoIndisponivel: 'ESCRITORIO:INDISPONIVEL — não consegui iniciar ou confirmar o servidor; a execução pode continuar.',
  autoSemPorta: 'ESCRITORIO:INDISPONIVEL — nenhuma porta do intervalo pôde ser aberta.',
  autoPrazo: 'ESCRITORIO:INDISPONIVEL — o prazo de abertura do Escritório terminou.',
  portaOcupada: (porta) => `ESCRITORIO:PORTA_OCUPADA ${porta} — escolha outra porta e confirme novamente.`,
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

const flag = (argv, nome) => argv.includes(nome);

function valor(argv, nome) {
  let achado;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith(`${nome}=`)) achado = argv[i].slice(nome.length + 1);
    else if (argv[i] === nome) achado = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
  }
  return achado;
}

function erroAutomatico(argv) {
  if (!flag(argv, '--automatico')) return null;
  const crew = valor(argv, '--crew');
  const run = valor(argv, '--run');
  if ((crew === undefined) !== (run === undefined)) return ['No modo automático, informe `--crew` e `--run` juntos.', USO];
  if (crew !== undefined && (!/^[\p{L}\p{N} ._-]+$/u.test(crew) || crew === '.' || crew === '..')) return ['Nome de crew inválido para abrir o Escritório.', USO];
  if (run !== undefined && (!/^(?!\.{1,2}$)[A-Za-z0-9._-]+$/.test(run))) return ['O --run precisa ser o run_id de uma execução.', USO];
  if (flag(argv, '--confirmar') && crew === undefined && !flag(argv, '--historico')) return ['No modo de confirmação, informe `--crew` e `--run`.', USO];
  if (flag(argv, '--confirmar') && !argv.some((arg) => arg === '--porta' || arg.startsWith('--porta='))) return ['No modo de confirmação, informe a porta recebida em `ESCRITORIO:DAEMON`.', USO];
  if (flag(argv, '--confirmar') && flag(argv, '--preparar')) return ['Não combine `--confirmar` com `--preparar`.', USO];
  if (flag(argv, '--servidor')) return ['Não combine `--servidor` com `--automatico`.', USO];
  return null;
}

async function confirmarPreparada(porta, o, alvo) {
  const restante = o.auto?.restante ?? prazoDeAbertura();
  const sondar = o.sondar ?? ((numero) => sondarEstado(numero, Math.min(250, restante())));
  const confirmar = (numero) => (o.pronto ?? sondarPronto)(
    numero, alvo.projeto, alvo.versao, alvo.crew, alvo.run, Math.min(500, restante()), undefined, alvo.modo,
  );
  return confirmarPorta(porta, {
    ...alvo, confirmar, sondar, restante, esperar: o.auto?.esperar,
    ocupada: o.auto?.ocupada ?? ((numero) => alguemEscuta(numero, Math.min(100, restante()))),
  });
}

async function executarAutomatico(argv, o, raiz, inicial) {
  const [crew, run, preparar] = [valor(argv, '--crew'), valor(argv, '--run'), flag(argv, '--preparar')];
  const { lan, vpn } = enderecosDeRede(o.interfaces);
  const projeto = projetoDe(raiz);
  const versao = versaoDe(raiz);
  const modo = flag(argv, '--historico') ? 'manual' : 'automatico';
  const alvo = { projeto, versao, crew, run, modo };
  if (flag(argv, '--confirmar')) {
    const resultado = await confirmarPreparada(inicial, o, alvo);
    if (resultado !== 'pronta') {
      o.escrever(resultado === 'ocupada' ? MSG.portaOcupada(inicial) : MSG.autoIndisponivel);
      return { code: 0 };
    }
    const links = linhasDeUrl(inicial, crew, run, o.interfaces);
    links.linhas.forEach(o.escrever);
    if (flag(argv, '--externo') && !(await (o.abrirNavegador ?? abrirNoSistema)(links.url, o.navegador))) {
      o.escrever('NAVEGADOR:INDISPONIVEL — o link continua disponível para abertura manual.');
    }
    return { code: 0, porta: inicial, url: links.url };
  }
  const resultado = await garantirServidor({
    raiz, script: fileURLToPath(import.meta.url), inicial, preparar,
    ...alvo, hostRede: lan ?? vpn, ...(o.auto ?? {}), pronto: o.pronto ?? o.auto?.pronto ?? sondarPronto,
  });
  const falha = { 'sem-porta': MSG.autoSemPorta, 'nao-confirmado': MSG.autoIndisponivel, prazo: MSG.autoPrazo }[resultado.tipo];
  if (falha) return (o.escrever(falha), { code: 0 });
  const { url, urlsRede, linhas } = linhasDeUrl(resultado.porta, crew, run, o.interfaces);
  const escrever = o.escrever ?? ((linha) => process.stdout.write(`${linha}\n`));
  const saida = resultado.tipo === 'daemon' ? [`ESCRITORIO:DAEMON ${resultado.porta} ${url}`, ...linhas.slice(1)] : linhas;
  saida.forEach((linha) => escrever(linha));
  if (!preparar && flag(argv, '--externo') && !(await (o.abrirNavegador ?? abrirNoSistema)(url, o.navegador))) {
    escrever('NAVEGADOR:INDISPONIVEL — o link continua disponível para abertura manual.');
  }
  return { code: 0, porta: resultado.porta, url, urlsRede };
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
 * @param {(porta: number) => Promise<{ projeto: string, versao: string|null }|null>} [o.sondar] SÓ
 *   PARA TESTE: quem responde na porta
 * @returns {Promise<{ code: number, porta?: number, servidor?: import('node:http').Server }>}
 *   `code` 0 com `porta` (escritório aberto ou já aberto) ou 1 (com `porta` quando o escritório
 *   que está nela é de versão anterior); `servidor` só quando este
 *   comando abriu um — é ele que mantém o processo vivo
 */
export async function main(argv, o = {}) {
  const { cwd = process.cwd(), escrever = (linha) => process.stdout.write(`${linha}\n`), pasta = PASTA_DA_PAGINA, arquivos = ARQUIVOS } = o;
  const inicial = lerPorta(argv);
  const erro = erroDeUso(inicial, cwd) ?? erroAutomatico(argv);
  if (erro) {
    erro.forEach((linha) => escrever(linha));
    return { code: 1 };
  }
  if (flag(argv, '--servidor')) return iniciarServidorExato({ raiz: cwd, pasta, arquivos, porta: inicial, escrever, automatico: flag(argv, '--automatico-servidor'), vigia: o.vigia });
  if (flag(argv, '--automatico')) return executarAutomatico(argv, { ...o, escrever }, cwd, inicial);
  const servidor = criarServidor({ raiz: cwd, pasta, arquivos });
  const tentar = (porta) => (o.abrir ?? abrir)(servidor, porta);
  const r = await procurar({ inicial, projeto: projetoDe(cwd), versao: versaoDe(cwd), abrir: tentar, sondar: o.sondar ?? sondarEstado });
  if (r.tipo === 'sem-porta') {
    escrever(MSG.semPorta(inicial, r.ultima));
    return { code: 1 };
  }
  escrever({ aberto: MSG.aberto, 'ja-aberto': MSG.jaAberto, desatualizado: MSG.desatualizado }[r.tipo](r.porta));
  if (r.tipo === 'desatualizado') return { code: 1, porta: r.porta };
  return r.tipo === 'aberto' ? { code: 0, porta: r.porta, servidor } : { code: 0, porta: r.porta };
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then(({ code }) => { process.exitCode = code; });
}
