// A cópia da entrega para a pasta do projeto que o usuário escolheu: uma pasta por execução
// (`<destino>/<run_id>/`). Nada é sobrescrito, menos o `LEIA-ME.md` da cópia, que é do script.
// Pasta nova é montada em `<pasta>.tmp/`, ao lado, e renomeada no fim: nada fica pela metade.
// O script só apaga o temporário que ele mesmo criou.
// Spec: fase-u3a2-entrega-no-projeto.md, regras 14 e 15 (repositório do OpenCrew).
import { constants, existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { emLf, oQueFalta, pastasDaExecucao } from './comparar.mjs';

export const AVISO = (pasta) => `Há uma entrega mais nova desta execução em \`${pasta}\`.`;
const AVISO_ANTERIOR = /^Há uma entrega mais nova desta execução em `[^`\n]*`\.\r?\n\r?\n/;
const LEIAME = 'LEIA-ME.md';
const apagar = (pasta) => fs.rm(pasta, { recursive: true, force: true, maxRetries: 3 });
const ehPasta = async (p) => fs.stat(p).then((s) => s.isDirectory(), () => false);

/** Grava um arquivo que ainda não existe ali: se existir, falha (nunca por cima). */
async function gravarNovo(alvo, a) {
  await fs.mkdir(path.dirname(alvo), { recursive: true });
  if (a.texto != null) await fs.writeFile(alvo, a.texto, { encoding: 'utf8', flag: 'wx' });
  else await fs.copyFile(a.de, alvo, constants.COPYFILE_EXCL);
}

/** Monta a pasta nova no temporário e a põe no lugar; em falha, o temporário some. */
async function montar(pasta, arquivos, leiame, em) {
  const tmp = `${pasta}.tmp`;
  if (await ehPasta(tmp)) await apagar(tmp); // sobra de uma chamada interrompida
  await fs.mkdir(tmp);
  try {
    for (const a of arquivos) {
      em.alvo = path.join(pasta, a.pasta, a.nome);
      await gravarNovo(path.join(tmp, a.pasta, a.nome), a);
    }
    em.alvo = path.join(pasta, LEIAME);
    await fs.writeFile(path.join(tmp, LEIAME), leiame, 'utf8');
    em.alvo = pasta;
    await fs.rename(tmp, pasta);
  } catch (erro) {
    await apagar(tmp).catch(() => {});
    throw erro;
  }
}

/** A pasta mais alta do caminho que ainda não existe (é a que o script cria); null quando todas existem. */
function primeiraQueFalta(pasta) {
  let falta = null;
  for (let p = pasta; !existsSync(p); p = path.dirname(p)) falta = p;
  return falta;
}

/** Desfaz as pastas vazias que esta chamada criou, de `pasta` até `criada`. */
async function desfazer(criada, pasta) {
  for (let p = pasta; ; p = path.dirname(p)) {
    await fs.rmdir(p);
    if (p === criada) return;
  }
}

/** Cria `pasta` com a entrega inteira. @returns {Promise<boolean>} o destino precisou ser criado? */
async function criar(pasta, arquivos, leiame, em) {
  em.alvo = pasta;
  if (existsSync(pasta)) throw new Error('já existe um arquivo com o nome da pasta');
  const destino = path.dirname(pasta);
  const criada = primeiraQueFalta(destino);
  try {
    await fs.mkdir(destino, { recursive: true });
    await montar(pasta, arquivos, leiame, em);
  } catch (erro) {
    if (criada) await desfazer(criada, destino).catch(() => {});
    throw erro;
  }
  return Boolean(criada);
}

/** O LEIA-ME da cópia é regravado quando muda (CRLF no lugar de LF não é mudança), sempre por último. */
async function regravarLeiame(pasta, leiame, em) {
  em.alvo = path.join(pasta, LEIAME);
  const atual = await fs.readFile(em.alvo, 'utf8').catch(() => null);
  if (atual == null || emLf(atual) !== leiame) await fs.writeFile(em.alvo, leiame, 'utf8');
}

/** As pastas anteriores ganham, na primeira linha do LEIA-ME, o aviso da pasta nova (um só). */
async function avisarAnteriores(destino, anteriores, pastaNova, em) {
  for (const { nome } of anteriores) {
    em.alvo = path.join(destino, nome, LEIAME);
    const atual = await fs.readFile(em.alvo, 'utf8').catch(() => null);
    if (atual != null) await fs.writeFile(em.alvo, `${AVISO(pastaNova)}\n\n${atual.replace(AVISO_ANTERIOR, '')}`, 'utf8');
  }
}

/** Completa a pasta mais nova com o que falta, ou cria a pasta de reentrega quando algo mudou. */
async function atualizar({ destino, run, arquivos, ignorar, leiame }, existentes, em) {
  const ultima = existentes.at(-1);
  const pasta = path.join(destino.abs, ultima.nome);
  const faltam = await oQueFalta(pasta, arquivos, ignorar);
  if (!faltam) {
    const nome = `${run}-reentrega-${ultima.n + 1}`;
    await criar(path.join(destino.abs, nome), arquivos, leiame, em);
    await avisarAnteriores(destino.abs, existentes, `${destino.rel}/${nome}`, em);
    return { tipo: 'reentrega', pasta: `${destino.rel}/${nome}` };
  }
  for (const a of faltam) {
    em.alvo = path.join(pasta, a.pasta, a.nome);
    await gravarNovo(em.alvo, a);
  }
  await regravarLeiame(pasta, leiame, em);
  return { tipo: faltam.length ? 'completada' : 'igual', pasta: `${destino.rel}/${ultima.nome}`, novos: faltam.length };
}

/**
 * Copia para o destino o que está pronto.
 * @param {object} o
 * @param {{ rel: string, abs: string }} o.destino a pasta escolhida, já validada · @param {string} o.run
 * @param {object[]} o.arquivos o que é copiado agora: `{ pasta, nome, texto | de }`
 * @param {Set<string>} o.ignorar `pasta/nome` do que a entrega tem e não é copiado agora
 * @param {string} o.leiame o LEIA-ME da cópia
 * @returns {Promise<object>} `{ tipo, pasta, novos, criouDestino }` — `tipo`: nova, igual,
 *   completada ou reentrega; `pasta`: relativa ao projeto · ou `{ tipo: 'falha', arquivo }`, com o
 *   caminho absoluto que não pôde ser gravado
 */
export async function copiar(o) {
  const em = { alvo: o.destino.abs };
  try {
    const existentes = await pastasDaExecucao(o.destino.abs, o.run);
    if (existentes.length) return await atualizar(o, existentes, em);
    const criouDestino = await criar(path.join(o.destino.abs, o.run), o.arquivos, o.leiame, em);
    return { tipo: 'nova', pasta: `${o.destino.rel}/${o.run}`, criouDestino };
  } catch {
    return { tipo: 'falha', arquivo: em.alvo };
  }
}