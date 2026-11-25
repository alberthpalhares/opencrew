import { alguemEscuta, sondarEstado } from './porta.mjs';

const ULTIMA_PORTA = 65535;

/**
 * Busca primeiro uma instância compatível em todo o intervalo; só depois tenta iniciar em portas
 * livres. Um serviço estranho ou um escritório antigo ocupa sua porta, mas nunca é encerrado.
 */
export async function procurarAutomatico({ inicial, projeto, versao, modo, sondar: perguntar = sondarEstado, ocupada = alguemEscuta, tentarAbrir, confirmar = async () => true, confirmarExistente = async () => true, pararAposFalha = false, tentativas = 10, esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms)), disputas = 80, dentroDoPrazo = () => true }) {
  const ultima = Math.min(inicial + tentativas - 1, ULTIMA_PORTA);
  const conhecidos = new Map();
  const mesmoServidor = (quem) => quem?.projeto === projeto && quem.versao === versao && (!quem.modo || !modo || quem.modo === modo);
  async function conferir(porta) {
    const quem = await perguntar(porta);
    if (quem) conhecidos.set(porta, quem);
    return mesmoServidor(quem) && await confirmarExistente(porta);
  }
  for (let porta = inicial; porta <= ultima && dentroDoPrazo(); porta++) {
    if (await conferir(porta)) return { tipo: 'ja-aberto', porta, ultima };
  }
  const existente = [...conhecidos].find(([, quem]) => mesmoServidor(quem));
  if (existente) {
    const [porta] = existente;
    for (let i = 0; i < disputas && dentroDoPrazo(); i++) {
      if (await conferir(porta)) return { tipo: 'ja-aberto', porta, ultima };
      if (!(await ocupada(porta))) {
        conhecidos.delete(porta);
        break;
      }
      await esperar(100);
    }
    if (conhecidos.has(porta)) return { tipo: 'nao-confirmado', porta, ultima };
  }
  for (let porta = inicial; porta <= ultima && dentroDoPrazo(); porta++) {
    if (conhecidos.has(porta)) continue;
    const tentativa = (await ocupada(porta)) ? null : await tentarAbrir(porta);
    if (tentativa) {
      const pronta = await confirmar(porta, tentativa);
      if (pronta === true) return { tipo: 'aberto', porta, ultima };
      if (pronta !== 'outra-porta' && pararAposFalha) return { tipo: 'nao-confirmado', porta, ultima };
    }
    if (!tentativa) {
      for (let i = 0; i < Math.min(disputas, 10) && dentroDoPrazo(); i++) {
        if (await conferir(porta)) return { tipo: 'ja-aberto', porta, ultima };
        if (!(await ocupada(porta))) { conhecidos.delete(porta); break; }
        await esperar(100);
      }
      continue;
    }
    for (let i = 0; i < disputas && dentroDoPrazo(); i++) {
      if (await conferir(porta)) return { tipo: 'ja-aberto', porta, ultima };
      if (conhecidos.has(porta)) break;
      await esperar(100);
    }
  }
  return { tipo: dentroDoPrazo() ? 'sem-porta' : 'prazo', ultima };
}
