// A mesa de cada agente e o que muda nela, em matrizes de pixels: o tampo com os pés, o monitor
// com as telas de cada status e os sinais que aparecem sobre a cabeça do boneco (✓, "!" e "?"
// são desenhos, não texto). Quem diz onde cada desenho vai é `cena.js`.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 18 e 19 (repositório do OpenCrew).
import { CORES, matriz } from './sprites.js';

/**
 * A mesa vista de cima e de frente: o tampo (com teclado, papel e caneca), a borda, a saia com a
 * gaveta e os pés. Tem a largura do retângulo da mesa no modelo e `MESA_ACIMA` linhas a mais.
 */
export const MESA = matriz({
  o: CORES.tinta, t: CORES.madeiraLuz, T: CORES.madeira, F: CORES.madeiraMedia, D: CORES.madeiraEscura, x: CORES.junta,
  k: CORES.cinzaEscuro, K: CORES.cinzaClaro, w: CORES.branco, g: CORES.cinzaClaro, c: CORES.ceu, f: CORES.madeiraEscura,
}, [
  '.oooooooooooooooooooooooooooooooooooooooooo.',
  'otttttttttttttttkkkkkkkkkkkkttttttttttttttto',
  'oTTTTTTTTTTTTTTTkKKKKKKKKKKkTTTTwwwwwwTcccTo',
  'oTTTTTTTTTTTTTTTkkkkkkkkkkkkTTTTwggggwTcfcTo',
  'oTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTwwwwwwTcccTo',
  'oTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTwgggwwTTTTTo',
  'oTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTwwwwwwTTTTTo',
  'oFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFo',
  'oooooooooooooooooooooooooooooooooooooooooooo',
  '.oDDDDDDDDDDDDDDDDDDFFFFDDDDDDDDDDDDDDDDDDo.',
  '.oDDooooooooooooooooooooooooooooooooooooDDo.',
  '.oDDoxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxoDDo.',
  '.oDDoxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxoDDo.',
  '.oDDo..................................oDDo.',
  '.oooo..................................oooo.',
]);

/**
 * Quantas linhas do desenho da mesa ficam acima do retângulo do tampo: é o fundo do tampo, que
 * cobre as pernas de quem está sentado atrás dele.
 */
export const MESA_ACIMA = 4;

/** O monitor, de frente para quem olha, com a tela apagada; a base pousa no fundo do tampo. */
export const MONITOR = matriz({ o: CORES.tinta, g: CORES.cinzaEscuro, k: CORES.telaApagada, G: CORES.cinzaClaro }, [
  'oooooooooooo',
  'oggggggggggo',
  'ogkkkkkkkkgo',
  'ogkkkkkkkkgo',
  'ogkkkkkkkkgo',
  'ogkkkkkkkkgo',
  'ogkkkkkkkkgo',
  'oggggggggggo',
  'oooooooooooo',
  '....oGGo....',
  '..oGGGGGGo..',
  '..oooooooo..',
]);

/** Onde o monitor fica, a partir do canto do retângulo da mesa; e a tela, a partir do canto do monitor. */
export const MONITOR_EM = Object.freeze({ x: 1, y: -13 });
export const TELA_EM = Object.freeze({ x: 2, y: 2 });

const CODIGO = ['vlllllvv', 'vvvvvvvv', 'vlllvllv', 'vvvvvvvv'];
const LINHAS_DA_TELA = [0, 1, 2, 3, 4];

/** O monitor aceso, uma tela por fase (0 a 3): as linhas de código sobem um pixel a cada fase. */
export const TELAS_ACESAS = Object.freeze([0, 1, 2, 3].map((fase) => matriz(
  { v: CORES.telaAcesa, l: CORES.verde },
  LINHAS_DA_TELA.map((linha) => CODIGO[(linha + fase) % CODIGO.length]),
)));

/** Âmbar, com o sinal de pausa: está esperando o usuário. */
export const TELA_AMBAR = matriz({ y: CORES.ambar, o: CORES.tinta }, [
  'yyyyyyyy',
  'yyoyyoyy',
  'yyoyyoyy',
  'yyoyyoyy',
  'yyyyyyyy',
]);

/** Vermelha, com um xis: falhou. */
export const TELA_VERMELHA = matriz({ r: CORES.vermelho, o: CORES.tinta }, [
  'rrrrrrrr',
  'rrorrorr',
  'rrroorrr',
  'rrorrorr',
  'rrrrrrrr',
]);

/** Sobre a cabeça de quem concluiu. */
export const SINAL_FEITO = matriz({ o: CORES.tinta, g: CORES.verde }, [
  '......ooo',
  '.....oogo',
  'ooo.ooggo',
  'ogoooggoo',
  'oggoggoo.',
  'oogggoo..',
  '.oogoo...',
  '..ooo....',
]);

/** Sobre a cabeça de quem falhou. */
export const SINAL_FALHA = matriz({ o: CORES.tinta, r: CORES.vermelho }, [
  'oooo',
  'orro',
  'orro',
  'orro',
  'orro',
  'oooo',
  'orro',
  'oooo',
]);

/** Sobre a cabeça de quem trabalhava e está sem sinal. */
export const SINAL_DUVIDA = matriz({ o: CORES.tinta, w: CORES.branco }, [
  '.oooo.',
  'oowwoo',
  'owoowo',
  'ooowoo',
  '.owoo.',
  '.ooo..',
  '.owo..',
  '.ooo..',
]);

/** A sombra no chão de quem está em pé, fora da mesa. */
export const SOMBRA = matriz({ x: CORES.junta }, ['.xxxxxxxx.']);
