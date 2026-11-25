// Serializa update confirmado no menu com o início de run/pedido, e recusa execução aberta ou incerta.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../../templates/_opencrew/core/scripts/comum.mjs';
import { comTrava } from '../../templates/_opencrew/core/scripts/trava.mjs';

const STATUS_FECHADO = ['aprovada', 'rejeitada', 'abortada', 'publicada'];
const lstatOpcional = (arquivo) => fs.lstat(arquivo).catch((erro) => (erro.code === 'ENOENT' ? null : Promise.reject(erro)));

async function pastaDentro(target, pasta, etiqueta) {
  const info = await lstatOpcional(pasta);
  if (!info || !info.isDirectory() || info.isSymbolicLink() || !realDentroDe(target, pasta)) return `${etiqueta} não pôde ser verificada`;
  return null;
}

async function registroDaExecucao(target, crew, run, pasta) {
  const arquivo = path.join(pasta, 'execucao.json');
  const info = await lstatOpcional(arquivo);
  if (!info) return null;
  if (!info.isFile() || info.isSymbolicLink() || !realDentroDe(target, arquivo)) return `o registro de ${crew}/${run} não pôde ser lido`;
  let registro;
  try { registro = JSON.parse(await fs.readFile(arquivo, 'utf8')); }
  catch { return `o registro de ${crew}/${run} não pôde ser lido`; }
  if (registro?.status === 'aberta') return `há uma execução aberta em ${crew}/${run}`;
  return STATUS_FECHADO.includes(registro?.status) ? null : `o registro de ${crew}/${run} não pôde ser lido`;
}

async function crewPendente(target, raizCrews, crew) {
  const pastaCrew = path.join(raizCrews, crew.name);
  const erroCrew = await pastaDentro(target, pastaCrew, `a crew ${crew.name}`);
  if (erroCrew) return erroCrew;
  const saida = path.join(pastaCrew, 'output');
  const info = await lstatOpcional(saida);
  if (!info) return null;
  if (!info.isDirectory() || info.isSymbolicLink() || !realDentroDe(target, saida)) return `output de ${crew.name} não pôde ser verificado`;
  for (const run of await fs.readdir(saida, { withFileTypes: true })) {
    if (!run.isDirectory() && !run.isSymbolicLink()) continue;
    const pastaRun = path.join(saida, run.name);
    const erroRun = await pastaDentro(target, pastaRun, `uma execução de ${crew.name}`);
    if (erroRun) return erroRun;
    const pendente = await registroDaExecucao(target, crew.name, run.name, pastaRun);
    if (pendente) return pendente;
  }
  return null;
}

/** Registro aberto ou ilegível bloqueia; pasta ou registro ausente mantém compatibilidade legada. */
export async function execucaoPendente(target) {
  const raizCrews = path.join(target, 'crews');
  if (!(await lstatOpcional(raizCrews))) return null;
  const erro = await pastaDentro(target, raizCrews, 'a pasta crews');
  if (erro) return erro;
  for (const crew of await fs.readdir(raizCrews, { withFileTypes: true })) {
    if (!crew.isDirectory() && !crew.isSymbolicLink()) continue;
    const pendente = await crewPendente(target, raizCrews, crew);
    if (pendente) return pendente;
  }
  return null;
}

/** Executa sob a mesma trava que cria run/pedido; nenhuma gravação de update ocorre antes da varredura. */
export async function aplicarProtegido(target, aplicar) {
  const nucleo = path.resolve(target, '_opencrew');
  const erro = await pastaDentro(target, nucleo, 'a pasta _opencrew');
  if (erro) throw new Error(erro);
  return comTrava(path.join(nucleo, '.projeto-opencrew'), async () => {
    const pendente = await execucaoPendente(target);
    if (pendente) throw new Error(`${pendente}. Retome ou encerre essa execução e tente novamente.`);
    return aplicar();
  });
}
