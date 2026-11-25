// Servidor do escritório: só leitura, acessível localmente e na rede local/VPN com rotas fechadas e validação de Host.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 13 a 15 (repositório do OpenCrew).
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { lerEstadoDaConsulta } from './leitura.mjs';
import { projetoDe, versaoDe } from './projeto.mjs';
import { ipsLocaisPermitidos } from './rede.mjs';
import { criarVigia } from './vigia.mjs';
import { escritorioLigado } from '../estado/preferencia.mjs';

// Vão em TODA resposta. Nenhuma resposta leva `Access-Control-*`: outra origem não lê o estado, e
// `frame-ancestors 'none'` impede que outra página embuta o escritório num iframe.
const CABECALHOS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
};
const TEXTO = 'text/plain; charset=utf-8';
const JSON_UTF8 = 'application/json; charset=utf-8';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const SEM_TIPO = 'application/octet-stream';

const MSG_HOST = (porta) => `Abra por http://127.0.0.1:${porta}`;

function responder(res, status, { corpo = '', tipo = TEXTO, extras = {} }) {
  const cabecalhos = status === 204
    ? { ...CABECALHOS, ...extras }
    : { ...CABECALHOS, 'Content-Type': tipo, 'Content-Length': Buffer.byteLength(corpo), ...extras };
  res.writeHead(status, cabecalhos);
  res.end(status === 204 ? undefined : corpo);
}

/**
 * O pedido veio para este endereço? Uma página de fora que aponte um nome dela para 127.0.0.1
 * chega com o nome dela no `Host`; só valem `127.0.0.1` e `localhost`, com a porta real.
 */
function hostAceito(req, ipsPermitidos) {
  const porta = req.socket.localPort;
  const sufixo = `:${porta}`;
  const host = String(req.headers.host ?? '').toLowerCase();
  if (!host.endsWith(sufixo)) return false;
  const nome = host.slice(0, -sufixo.length);
  if (nome === '127.0.0.1' || nome === 'localhost') return true;
  return (ipsPermitidos ?? ipsLocaisPermitidos()).has(nome);
}

/** Arquivo da página pelo nome da lista; null quando o caminho não é rota ou o arquivo falta. */
async function lerArquivo(ctx, caminho) {
  const nome = ctx.rotas.get(caminho);
  if (!nome) return null;
  const corpo = ctx.conteudos.get(nome);
  return corpo && { corpo, tipo: TIPOS[path.extname(nome)] ?? SEM_TIPO };
}

async function atender(req, res, ctx) {
  if (!hostAceito(req, ctx.ipsPermitidos)) return responder(res, 421, { corpo: MSG_HOST(req.socket.localPort) });
  if (req.method !== 'GET') return responder(res, 405, { corpo: 'Método não permitido', extras: { Allow: 'GET' } });
  const caminho = req.url.split('?')[0];
  if (caminho === '/estado') {
    const consulta = new URL(req.url, `http://127.0.0.1:${req.socket.localPort}`).searchParams;
    const soVisual = ctx.modo === 'automatico' && !(await escritorioLigado(ctx.raiz));
    let crews = [];
    if (!consulta.has('identidade')) {
      try {
        crews = await lerEstadoDaConsulta(ctx.raiz, consulta, { soVisual });
      } catch {
        if (consulta.has('run_id')) return responder(res, 503, { corpo: 'Estado da execução temporariamente indisponível' });
        throw new Error('Falha ao ler o estado do Escritório');
      }
    }
    const corpo = JSON.stringify({ projeto: ctx.projeto, versao: ctx.versao, modo: ctx.modo, crews });
    return responder(res, 200, { corpo, tipo: JSON_UTF8 });
  }
  if (caminho === '/favicon.ico') return responder(res, 204, {});
  const arquivo = await lerArquivo(ctx, caminho);
  if (!arquivo) return responder(res, 404, { corpo: 'Não encontrado' });
  if (arquivo.tipo === TIPOS['.html']) {
    const identidade = ` data-projeto="${encodeURIComponent(ctx.projeto)}" data-versao="${encodeURIComponent(ctx.versao)}"`;
    arquivo.corpo = arquivo.corpo.toString('utf8').replace(/<html(?=\s|>)/i, `<html${identidade}`);
  }
  return responder(res, 200, arquivo);
}

function falhar(res) {
  if (res.headersSent) res.destroy();
  else responder(res, 500, { corpo: 'Erro interno' });
}

/**
 * Cria o servidor (sem abrir a porta: quem abre é `abrir`, em `porta.mjs`).
 * @param {object} o
 * @param {string} o.raiz pasta do projeto (a que tem `_opencrew/` e `crews/`)
 * @param {string} o.pasta pasta da página (`_opencrew/core/escritorio/`)
 * @param {string[]} o.arquivos nomes servidos dessa pasta. É uma lista fixa: o caminho do pedido
 *   é comparado com ela e nunca é juntado a uma pasta, e a pasta nunca é lida para montar rota
 * @returns {import('node:http').Server}
 */
export function criarServidor({ raiz, pasta, arquivos, ipsPermitidos, modo = 'manual' }) {
  const rotas = new Map([['/', 'index.html'], ['/escritorio', 'index.html'], ['/dashboard', 'index.html'], ...arquivos.map((nome) => [`/${nome}`, nome])]);
  const conteudos = new Map(arquivos.map((nome) => [nome, readFileSync(path.join(pasta, nome))]));
  const ctx = { raiz, pasta, rotas, conteudos, projeto: projetoDe(raiz), versao: versaoDe(raiz), ipsPermitidos, modo };
  // Sem `Host` o pedido também chega aqui e leva o 421 com os cabeçalhos, e não o 400 do Node.
  const servidor = http.createServer({ requireHostHeader: false }, (req, res) => {
    atender(req, res, ctx).catch(() => falhar(res));
  });
  servidor.keepAliveTimeout = 65000;
  servidor.headersTimeout = 66000;
  servidor.on('clientError', (_erro, socket) => socket.destroy());
  return servidor;
}

/** Starts the server on the selected port; an occupied port is reported without touching its owner. */
export async function iniciarServidorExato({ raiz, pasta, arquivos, porta, escrever, automatico = false, vigia = {} }) {
  const servidor = criarServidor({ raiz, pasta, arquivos, modo: automatico ? 'automatico' : 'manual' });
  return new Promise((resolver) => {
    const falhou = (erro) => {
      if (erro.code === 'EADDRINUSE') escrever(`ESCRITORIO:PORTA_OCUPADA ${porta}`);
      else if (['EACCES', 'EPERM'].includes(erro.code)) escrever(`ESCRITORIO:PORTA_OCUPADA ${porta} — porta reservada ou bloqueada.`);
      else escrever(`ESCRITORIO:INDISPONIVEL — falha ao abrir a porta ${porta}: ${erro.code ?? 'erro desconhecido'}.`);
      resolver({ code: 1 });
    };
    servidor.once('error', falhou).listen(porta, '0.0.0.0', () => {
      servidor.off('error', falhou);
      if (automatico) {
        const monitor = criarVigia({ raiz, servidor, ...vigia });
        servidor.once('close', monitor.parar);
        const encerrar = () => {
          monitor.parar();
          servidor.close();
          servidor.closeAllConnections?.();
        };
        process.once('SIGINT', encerrar);
        process.once('SIGTERM', encerrar);
        servidor.once('close', () => {
          process.off('SIGINT', encerrar);
          process.off('SIGTERM', encerrar);
        });
      }
      resolver({ code: 0, porta, servidor });
    });
  });
}
