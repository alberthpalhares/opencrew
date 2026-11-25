// Garante uma instância compatível do Escritório sem prender o processo do harness.
import { spawn as criarProcesso } from 'node:child_process';
import { aceitaBind, sondarEstado, sondarPronto, alguemEscuta } from './porta.mjs';
import { procurarAutomatico } from './procurar.mjs';

const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function subir(script, raiz, porta, spawn, restante) {
  return new Promise((resolver) => {
    let terminou = false;
    const espera = setTimeout(() => resolver(null), restante());
    try {
      const modo = raiz.modo === 'automatico' ? ['--automatico-servidor'] : [];
      const processo = spawn(process.execPath, [script, '--servidor', ...modo, '--porta', String(porta)], {
        cwd: raiz.pasta, detached: true, stdio: 'ignore', windowsHide: true, shell: false,
      });
      processo.once('exit', () => { terminou = true; });
      processo.once('spawn', () => {
        clearTimeout(espera);
        processo.unref();
        resolver(() => terminou);
      });
      processo.once('error', () => { clearTimeout(espera); terminou = true; resolver(null); });
    } catch {
      clearTimeout(espera);
      resolver(null);
    }
  });
}

export async function confirmarPorta(porta, { confirmar, sondar, ocupada, projeto, versao, modo, tentativas = 30, esperar = pausa, restante, terminou = () => false }) {
  for (let i = 0; i < tentativas && restante(); i++) {
    const quem = await sondar(porta);
    if (quem && (quem.projeto !== projeto || quem.versao !== versao || (quem.modo && quem.modo !== modo))) return 'ocupada';
    if ((!quem && !terminou() || quem) && await confirmar(porta)) return 'pronta';
    if (!quem && terminou()) return 'outra-porta';
    await esperar(Math.min(100, restante()));
  }
  return restante() && (await ocupada(porta)) && !(await sondar(porta)) ? 'ocupada' : 'nao-confirmada';
}

export const prazoDeAbertura = (ms = 8000) => {
  const fim = performance.now() + ms;
  return () => Math.max(0, Math.ceil(fim - performance.now()));
};

/** Devolve uma instância já confirmada, `daemon` (com `--preparar`) ou `sem-porta`; instância anterior fica ativa. */
export async function garantirServidor(opcoes) {
  const {
    raiz, script, inicial, projeto, versao, crew, run, modo = 'automatico', tentativas = 10, hostRede = null, preparar = false,
    restante = prazoDeAbertura(),
    sondar = (porta) => sondarEstado(porta, Math.min(250, restante()), hostRede),
    ocupada = (porta) => alguemEscuta(porta, Math.min(100, restante())),
    spawn = criarProcesso, esperar = pausa, ciclos = 30, pronto = sondarPronto, testarBind = aceitaBind,
  } = opcoes;
  const confirmar = (porta) => restante() > 0 && pronto(porta, projeto, versao, crew, run, Math.min(500, restante()), undefined, modo);
  const achado = await procurarAutomatico({
    inicial, projeto, versao, modo, tentativas, sondar, ocupada, esperar, dentroDoPrazo: restante,
    confirmarExistente: confirmar,
    tentarAbrir: preparar ? testarBind : (porta) => subir(script, { pasta: raiz, modo }, porta, spawn, restante),
    confirmar: preparar ? undefined : async (porta, terminou) => {
      const res = await confirmarPorta(porta, { confirmar, sondar, ocupada, projeto, versao, modo, tentativas: ciclos, esperar, restante, terminou });
      if (res === 'pronta') return true;
      return res === 'ocupada' || res === 'outra-porta' ? 'outra-porta' : false;
    },
    pararAposFalha: true,
  });
  return preparar && achado.tipo === 'aberto' ? { ...achado, tipo: 'daemon' } : achado;
}
