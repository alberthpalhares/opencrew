import path from 'node:path';
import { promises as fs } from 'node:fs';
import { realDentroDe } from '../comum.mjs';
import { abertaRecente, linhasDaAberta } from './aberta.mjs';
import { PEDIDO, anotar, limparTema } from '../execucao/registro.mjs';
import { novoRun } from './nucleo.mjs';
import { ehPasta } from './disco.mjs';
const ok = (caminho) => 'CAMINHO:OK ' + caminho;

/** A pasta da execução; a que nasce agora ganha o registro (regras 1 e 3 da U5c: a que já existia fica como está). */
export async function pasta(raiz, crew, args, agora) {
  // Regra 8 da E4: sem --run, sem --pedido e sem --nova, a execução aberta e recente é perguntada antes.
  const aberta = args.run || args.pedido || args.nova ? null : await abertaRecente(raiz, crew, agora);
  if (aberta) return linhasDaAberta(crew, aberta);
  const saida = path.resolve(raiz, 'crews', crew, 'output');
  if (!realDentroDe(raiz, saida)) throw new Error('A pasta de saída fica fora do projeto.');
  const reserva = await reservarPasta(saida, args.run, agora);
  const run = reserva.run;
  const rel = `crews/${crew}/output/${run}`;
  const base = { crew, run, tema: limparTema(args.tema), passos: args.passos ? Number(args.passos) : null, tipo: args.pedido ? PEDIDO : undefined, agente: args.agente, formato: args.formato, em: agora.toISOString() };
  return [reserva.nova ? await anotar(path.resolve(raiz, rel), base, (registro) => ({ ...registro, organizada: true })) : null, ok(rel)];
}
async function reservarPasta(saida, runExplicito, agora) {
  await fs.mkdir(saida, { recursive: true });
  if (runExplicito !== undefined) {
    try {
      await fs.mkdir(path.join(saida, runExplicito));
      return { run: runExplicito, nova: true };
    } catch (erro) {
      if (erro.code !== 'EEXIST' || !ehPasta(path.join(saida, runExplicito))) throw erro;
      return { run: runExplicito, nova: false };
    }
  }
  const base = novoRun(agora, []);
  for (let numero = 1; ; numero++) {
    const run = numero === 1 ? base : `${base}-${numero}`;
    try {
      await fs.mkdir(path.join(saida, run));
      return { run, nova: true };
    } catch (erro) {
      if (erro.code !== 'EEXIST') throw erro;
    }
  }
}
