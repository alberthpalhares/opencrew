// Gravação da entrega: montada em `entrega.tmp/`, ao lado, e trocada no fim. Nada pela metade:
// em qualquer falha a entrega anterior fica como estava e não sobra pasta temporária. O script só
// apaga a própria `entrega/` e os temporários que ele mesmo criou.
// Spec: fase-u3a1-pasta-de-entrega.md, regras 12 e 15 (repositório do OpenCrew).
import { promises as fs } from 'node:fs';
import path from 'node:path';

const apagar = (pasta) => fs.rm(pasta, { recursive: true, force: true, maxRetries: 3 });

/** 'pasta', 'arquivo' ou null (não existe). */
async function tipoDe(caminho) {
  try {
    return (await fs.stat(caminho)).isDirectory() ? 'pasta' : 'arquivo';
  } catch {
    return null;
  }
}

/** Temporário que sobrou de uma chamada interrompida: a pasta é do script; arquivo com o mesmo nome não é. */
async function limparSobras({ entrega, tmp, antiga }) {
  if ((await tipoDe(antiga)) === 'pasta') {
    if (await tipoDe(entrega)) await apagar(antiga);
    else await fs.rename(antiga, entrega); // a troca anterior parou no meio: a entrega volta
  }
  if ((await tipoDe(tmp)) === 'pasta') await apagar(tmp);
}

/** Grava um arquivo da entrega na pasta temporária: os bytes ou o texto gerados, ou os mesmos bytes da origem. */
async function gravarArquivo(destino, a) {
  await fs.mkdir(path.dirname(destino), { recursive: true });
  if ((a.bytes ?? a.texto) != null) await fs.writeFile(destino, a.bytes ?? a.texto, 'utf8');
  else await fs.copyFile(a.de, destino);
}

/** Põe a pasta nova no lugar da anterior; se a nova não entra, a anterior volta. */
async function trocar({ entrega, tmp, antiga }, passo) {
  const anterior = await tipoDe(entrega);
  passo(entrega);
  if (anterior === 'arquivo') throw new Error('entrega não é uma pasta');
  if (anterior) await fs.rename(entrega, antiga);
  try {
    await fs.rename(tmp, entrega);
  } catch (erro) {
    if (anterior) await fs.rename(antiga, entrega);
    throw erro;
  }
  passo(antiga);
  if (anterior) await apagar(antiga);
}

/**
 * Refaz `entrega/` do zero e grava, ao lado, o relatório da verificação.
 * @param {string} execucao pasta da execução (`crews/<crew>/output/<run>/`), absoluta
 * @param {object[]} arquivos `{ pasta, nome, texto | bytes | de }`
 * @param {{ leiame: string, relatorio: string }} textos
 * @returns {Promise<string|null>} null quando gravou tudo; senão, o caminho que não foi gravado
 */
export async function gravarEntrega(execucao, arquivos, { leiame, relatorio }) {
  const pastas = { entrega: path.join(execucao, 'entrega'), tmp: path.join(execucao, 'entrega.tmp'), antiga: path.join(execucao, 'entrega.antiga.tmp') };
  let alvo = pastas.tmp;
  let criei = false;
  const passo = (caminho) => { alvo = caminho; };
  try {
    await limparSobras(pastas);
    await fs.mkdir(pastas.tmp);
    criei = true;
    for (const a of arquivos) {
      passo(path.join(pastas.tmp, a.pasta, a.nome));
      await gravarArquivo(alvo, a);
    }
    passo(path.join(pastas.tmp, 'LEIA-ME.md'));
    await fs.writeFile(alvo, leiame, 'utf8');
    await trocar(pastas, passo);
    criei = false;
    passo(path.join(execucao, 'verificacao-entrega.md'));
    await fs.writeFile(alvo, relatorio, 'utf8');
    return null;
  } catch {
    if (criei) await apagar(pastas.tmp).catch(() => {});
    // O arquivo que falhou dentro da pasta temporária é citado pelo lugar em que ficaria.
    return alvo.startsWith(pastas.tmp + path.sep) ? path.join(pastas.entrega, alvo.slice(pastas.tmp.length + 1)) : alvo;
  }
}
