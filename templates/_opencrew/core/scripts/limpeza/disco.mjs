// O que a limpeza lê do disco: as pastas de execução de uma crew, o tamanho delas e o áudio antigo de
// `_investigations/`. Nunca segue atalho (link ou junção), nem nas pastas de dentro nem nas raízes
// (`crews/<crew>`, `output/`, `_investigations/`): quem aponta para fora não é lido nem apagado.
// Um registro de execução que existe e não pôde ser lido NÃO é registro ausente: a execução fica.
// Spec: fase-u6b-dados-e-custo.md, regras 2 a 6 (repositório do OpenCrew).
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { RUN } from '../caminho/argumentos.mjs';
import { conferido } from '../execucao/registro.mjs';

export const AUDIO_DIAS = 30;
const COM_DATA = /^(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})(\d{2})(\d{2}))?/;
const DIA_MS = 24 * 60 * 60 * 1000;

/** `caminho` é um atalho (link simbólico ou junção)? Caminho que não existe não é. */
export function ehAtalho(caminho) {
  try {
    return lstatSync(caminho).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Soma dos bytes dos arquivos de uma pasta, sem seguir atalho. */
export function tamanhoDe(pasta) {
  let soma = 0;
  for (const e of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, e.name);
    if (e.isSymbolicLink()) continue;
    soma += e.isDirectory() ? tamanhoDe(caminho) : lstatSync(caminho).size;
  }
  return soma;
}

/**
 * O registro da execução: `{ registro }`; `{ ausente: true }` quando não há o arquivo (execução de antes da
 * 1.14.0); `{ ilegivel: true }` quando há e não deu para ler (cortado, em uso, uma pasta no lugar).
 */
function lerRegistroDaPasta(pasta) {
  try {
    const texto = readFileSync(path.join(pasta, 'execucao.json'), 'utf8');
    const lido = JSON.parse(texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto);
    return lido && typeof lido === 'object' && !Array.isArray(lido) ? { registro: conferido(lido) } : { ilegivel: true };
  } catch (erro) {
    return erro?.code === 'ENOENT' ? { ausente: true } : { ilegivel: true };
  }
}

/** O instante de uma execução: o fecho, senão o começo, senão a data do nome (hora local). */
function instanteDe(registro, run) {
  const gravado = Date.parse(registro?.fechadaEm ?? registro?.iniciadaEm ?? '');
  if (Number.isFinite(gravado)) return gravado;
  const [, a, m, d, h = 0, mi = 0, s = 0] = COM_DATA.exec(run) ?? [];
  return a ? new Date(Number(a), Number(m) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime() : 0;
}

/** O dia (AAAA-MM-DD) de uma execução, para a listagem. */
export const diaDe = (e) => (COM_DATA.test(e.run) ? e.run.slice(0, 10) : new Date(e.instante).toISOString().slice(0, 10));

/**
 * As pastas de `output/` que são pasta de verdade (não atalho), com o que a limpeza precisa saber de cada uma.
 * `reconhecida`: tem registro ou o nome começa por data · `ilegivel`: o registro existe e não foi lido.
 * `output/` que é atalho não é lida (vale como vazia).
 * @returns {Array<{ run, pasta, status, instante, tamanho, copiada, reconhecida, ilegivel }>}
 */
export function lerExecucoes(pastaDaCrew) {
  const saida = path.join(pastaDaCrew, 'output');
  if (!existsSync(saida) || ehAtalho(saida)) return [];
  const pastas = readdirSync(saida, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.isSymbolicLink() && RUN.test(e.name) && realDentroDe(saida, path.join(saida, e.name)))
    .map((e) => e.name).sort();
  return pastas.map((run) => {
    const pasta = path.join(saida, run);
    const { registro = null, ilegivel = false } = lerRegistroDaPasta(pasta);
    return {
      run, pasta, status: registro ? registro.status : null, instante: instanteDe(registro, run), tamanho: tamanhoDe(pasta), ilegivel,
      copiada: existsSync(path.join(pasta, 'copia.json')), reconhecida: registro !== null || ilegivel || COM_DATA.test(run),
    };
  });
}

/** Os `.wav` de `_investigations/` com mais de `AUDIO_DIAS` dias: `{ caminho, tamanho }`. Atalho não é seguido. */
export function lerAudios(pastaDaCrew, agora) {
  const raiz = path.join(pastaDaCrew, '_investigations');
  if (!existsSync(raiz) || ehAtalho(raiz)) return [];
  const achados = [];
  const olhar = (pasta) => {
    for (const e of readdirSync(pasta, { withFileTypes: true })) {
      const caminho = path.join(pasta, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) olhar(caminho);
      else if (/\.wav$/i.test(e.name)) achados.push({ caminho, info: statSync(caminho) });
    }
  };
  olhar(raiz);
  return achados.filter(({ info }) => agora.getTime() - info.mtimeMs > AUDIO_DIAS * DIA_MS).map(({ caminho, info }) => ({ caminho, tamanho: info.size }));
}
