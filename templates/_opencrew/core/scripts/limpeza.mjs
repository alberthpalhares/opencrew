#!/usr/bin/env node
// Limpeza de uma crew: libera o espaço das execuções antigas que o usuário já tem salvas em outro lugar.
// Por padrão só mostra o que sairia; apagar exige `--apagar` com os run_id escritos um a um.
// Uso (na pasta do projeto): node _opencrew/core/scripts/limpeza.mjs <crew> [--listar] [--manter N]
//   node _opencrew/core/scripts/limpeza.mjs <crew> --apagar "<run>[,<run>…]" [--sem-entrega "<run>[,<run>…]"] [--audio]
// Só apaga a pasta inteira de uma execução FECHADA (nunca a aberta, nem a de registro ilegível) e os `.wav` de
// `_investigations/` com mais de 30 dias; nunca toca em `runs.md`, no `crew.yaml` nem em atalho (link ou junção:
// a crew, `output/` ou `_investigations/` que é atalho faz o comando parar).
// Última linha da saída: LIMPEZA:LISTA <n> <tamanho> · LIMPEZA:NADA · LIMPEZA:APAGADO <n> <tamanho> ·
// LIMPEZA:PARCIAL <n> <tamanho> (algo não saiu) · LIMPEZA:RECUSADA (nada foi apagado).
// Código de saída: 0, menos erro de uso, RECUSADA e PARCIAL (1).
// Spec: fase-u6b-dados-e-custo.md (repositório do OpenCrew).
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ehPrincipal, realDentroDe } from './comum.mjs';
import { acharCrew } from './caminho/crew.mjs';
import { lerPreferencia } from './preferencias.mjs';
import { USO, erroDeArgumentos, lerArgs } from './limpeza/argumentos.mjs';
import { ehAtalho, lerAudios, lerExecucoes } from './limpeza/disco.mjs';
import { MOTIVO, selecionar } from './limpeza/selecao.mjs';
import { MSG, linhasDaLista, tamanho } from './limpeza/texto.mjs';

const RETENCAO_PADRAO = 10;
const motivoDe = (erro) => erro?.code ?? erro?.message ?? erro;

/** Quantas execuções ficam: `--manter`, senão `Retencao:` das preferências, senão 10. */
function quantasFicam(raiz, args) {
  const escrito = args.manter ?? lerPreferencia(raiz, ['Retencao', 'Retenção']);
  return /^[1-9]\d?$/.test(escrito ?? '') ? Number(escrito) : RETENCAO_PADRAO;
}

/** A crew, `output/` ou `_investigations/` que é atalho: o que a limpeza não segue. `null` quando está tudo no lugar. */
function atalhoNaCrew(pasta) {
  const onde = [['A pasta da crew', pasta], ['A pasta output/', path.join(pasta, 'output')], ['A pasta _investigations/', path.join(pasta, '_investigations')]];
  const achado = onde.find(([, caminho]) => ehAtalho(caminho));
  return achado ? MSG.atalho(achado[0]) : null;
}

function listar({ nome, manter, selecao, audios }) {
  // A soma da linha final é só a das execuções: o áudio vem na linha dele e só sai se o usuário aprovar.
  const soma = selecao.candidatas.reduce((s, e) => s + e.tamanho, 0);
  const lista = linhasDaLista({ nome, manter, ...selecao, audios });
  if (!selecao.candidatas.length && !audios.length) return [...lista, MSG.nada(nome, manter), 'LIMPEZA:NADA'];
  return [...lista, `LIMPEZA:LISTA ${selecao.candidatas.length} ${tamanho(soma)}`];
}

/** Apaga a pasta de uma execução já conferida. @returns {string|null} a linha de falha, ou `null` */
function apagarExecucao(candidata, saida) {
  try {
    if (!realDentroDe(saida, candidata.pasta)) throw new Error('a pasta fica fora de output/');
    rmSync(candidata.pasta, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    return existsSync(candidata.pasta) ? MSG.parcial(candidata.run, 'sobrou parte da pasta') : null;
  } catch (erro) {
    return existsSync(candidata.pasta) ? MSG.parcial(candidata.run, motivoDe(erro)) : MSG.falhou(candidata.run, motivoDe(erro));
  }
}

function apagarAudios(audios) {
  const falhas = [];
  const apagados = audios.filter((a) => {
    try {
      rmSync(a.caminho, { force: true });
      return true;
    } catch (erro) {
      falhas.push(MSG.falhou(path.basename(a.caminho), motivoDe(erro)));
      return false;
    }
  });
  return { apagados, falhas, bytes: apagados.reduce((s, a) => s + a.tamanho, 0) };
}

function apagar({ args, selecao, audios, saida }) {
  const porId = new Map(selecao.candidatas.map((e) => [e.run, e]));
  const fora = args.apagar.filter((id) => !porId.has(id));
  const motivo = (id) => selecao.ficam.find((f) => f.run === id)?.motivo ?? MOTIVO.inexistente;
  if (fora.length) return { linhas: [...fora.map((id) => MSG.foraDaLista(id, motivo(id))), 'LIMPEZA:RECUSADA'], code: 1 };
  const linhas = [];
  let [n, bytes, falhou] = [0, 0, false];
  for (const id of args.apagar) {
    const falha = apagarExecucao(porId.get(id), saida);
    linhas.push(falha ?? MSG.apagou(id, porId.get(id).tamanho));
    if (falha) falhou = true;
    else [n, bytes] = [n + 1, bytes + porId.get(id).tamanho];
  }
  if (args.audio && audios.length) {
    const r = apagarAudios(audios);
    linhas.push(...(r.apagados.length ? [MSG.apagouAudio(r.apagados.length, r.bytes)] : []), ...r.falhas);
    [bytes, falhou] = [bytes + r.bytes, falhou || r.falhas.length > 0];
  }
  return { linhas: [...linhas, `LIMPEZA:${falhou ? 'PARCIAL' : 'APAGADO'} ${n} ${tamanho(bytes)}`], code: falhou ? 1 : 0 };
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto), `escrever` e `agora` (o relógio, para a idade do áudio)
 * @returns {Promise<number>} 0 = a linha `LIMPEZA:` saiu · 1 = erro de uso, `LIMPEZA:RECUSADA` ou `LIMPEZA:PARCIAL`
 */
export async function main(argv, deps = {}) {
  const { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`), agora = () => new Date() } = deps;
  const args = lerArgs(argv);
  const doUso = erroDeArgumentos(args);
  const achada = doUso ? { erro: doUso } : acharCrew(cwd, args.crew);
  const pasta = achada.crew ? path.join(cwd, 'crews', achada.crew) : null;
  const erro = achada.erro ?? atalhoNaCrew(pasta);
  if (erro) {
    escrever(USO);
    escrever(erro);
    return 1;
  }
  try {
    const manter = quantasFicam(cwd, args);
    const selecao = selecionar(lerExecucoes(pasta), { manter, semEntrega: args.semEntrega });
    const audios = lerAudios(pasta, agora());
    const r = args.apagar ? apagar({ args, selecao, audios, saida: path.join(pasta, 'output') }) : { linhas: listar({ nome: achada.crew, manter, selecao, audios }), code: 0 };
    r.linhas.forEach((l) => escrever(l));
    return r.code;
  } catch (falha) {
    escrever(`Não consegui fazer a limpeza: ${String(falha?.message ?? falha).replace(/\s+/g, ' ').trim()}`);
    return 1;
  }
}

if (ehPrincipal(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
