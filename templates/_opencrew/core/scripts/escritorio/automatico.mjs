// Garante uma instância compatível do Escritório sem prender o processo do harness.
import { spawn as criarProcesso } from 'node:child_process';
import { procurarAutomatico, sondarEstado, alguemEscuta } from './porta.mjs';

const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function subir(script, raiz, porta, spawn) {
  return new Promise((resolver) => {
    try {
      const processo = spawn(process.execPath, [script, '--servidor', '--porta', String(porta)], {
        cwd: raiz, detached: true, stdio: 'ignore', windowsHide: true, shell: false,
      });
      processo.once('spawn', () => { processo.unref(); resolver(true); });
      processo.once('error', () => resolver(false));
    } catch {
      resolver(false);
    }
  });
}

async function confirmar(porta, projeto, versao, sondar, esperar, tentativas) {
  for (let i = 0; i < tentativas; i++) {
    const servidor = await sondar(porta);
    if (servidor?.projeto === projeto && servidor.versao === versao) return true;
    await esperar(100);
  }
  return false;
}

/** Devolve uma instância já confirmada, ou `sem-porta`; a instância anterior nunca é encerrada. */
export async function garantirServidor(opcoes) {
  const {
    raiz, script, inicial, projeto, versao, tentativas = 10, sondar = sondarEstado,
    ocupada = alguemEscuta, spawn = criarProcesso, esperar = pausa, ciclos = 30,
  } = opcoes;
  return procurarAutomatico({
    inicial, projeto, versao, tentativas, sondar, ocupada,
    tentarAbrir: (porta) => subir(script, raiz, porta, spawn),
    confirmar: (porta) => confirmar(porta, projeto, versao, sondar, esperar, ciclos),
  });
}
