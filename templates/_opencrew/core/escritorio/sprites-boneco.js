// O boneco de 16×16 montado por camadas, de baixo para cima: o corpo do molde com as linhas que a
// pose troca → o braço levantado (um, ou os dois na festa) → o papel → a cabeça com o corte.
// A cabeça entra por último e ocupa só as colunas do meio: nenhuma pose apaga, quebra ou muda de
// lugar o cabelo, e nenhum corte cobre o braço.
// Spec: fase-e2-personagens-do-escritorio.md, regras 1 e 2 (repositório do OpenCrew).
import { CORES, TINTAS, sombra } from './sprites.js';
import { CORTES } from './sprites-rosto.js';
import { BRACO, CORPOS, PAPEL, TROCAS } from './sprites-corpo.js';

const LADO = 16;
const VAZIA = '.'.repeat(LADO);
/** Molde de quem não diz qual é (um boneco montado à mão, num teste ou na folha). */
const MOLDE_PADRAO = 'masculino';

const virar = (linha) => [...linha].reverse().join('');
const BRACO_ESQUERDO = { de: BRACO.de, linhas: BRACO.linhas.map(virar) };

/** Põe a camada por cima das linhas: onde ela tem ponto, fica o que já estava. */
function sobrepor(linhas, camada) {
  camada.linhas.forEach((nova, i) => {
    const y = camada.de + i;
    linhas[y] = [...nova].map((letra, x) => (letra === '.' ? linhas[y][x] : letra)).join('');
  });
}

function montar({ molde, corte, pose, papel, festa }) {
  const corpo = CORPOS[molde];
  const trocas = !festa && Object.hasOwn(TROCAS[molde], pose) ? TROCAS[molde][pose] : {};
  const linhas = Array.from({ length: LADO }, (_, y) => trocas[y] ?? corpo.linhas[y - corpo.de] ?? VAZIA);
  if (festa || pose === 'mao') sobrepor(linhas, BRACO);
  if (festa) sobrepor(linhas, BRACO_ESQUERDO);
  if (papel) sobrepor(linhas, PAPEL);
  sobrepor(linhas, CORTES[molde][corte]);
  return linhas;
}

const POSTAS = new Map();

/**
 * As 16 linhas do boneco numa pose. O mesmo pedido devolve sempre a mesma lista.
 * @param {string} pose uma das poses de `quadro` (`parado` é o boneco sem troca nenhuma)
 * @param {{ molde?: string, corte?: number, papel?: boolean, festa?: boolean, espelhado?: boolean }} [o]
 *   `molde`: `feminino` ou `masculino` (outro valor: o masculino) · `corte`: 0 a 4, na ordem de
 *   `CORTES` (outro valor: 0) · `papel`: leva o papel · `festa`: os dois braços para cima, no
 *   lugar da pose · `espelhado`: virado para a esquerda
 */
export function linhasDoBoneco(pose, o = {}) {
  const molde = Object.hasOwn(CORPOS, o.molde ?? '') ? o.molde : MOLDE_PADRAO;
  const corte = Number.isInteger(o.corte) && o.corte >= 0 && o.corte < CORTES[molde].length ? o.corte : 0;
  const pedido = { molde, corte, pose: String(pose), papel: Boolean(o.papel), festa: Boolean(o.festa) };
  const chave = `${Object.values(pedido).join('|')}|${Boolean(o.espelhado)}`;
  if (!POSTAS.has(chave)) {
    const linhas = montar(pedido);
    POSTAS.set(chave, Object.freeze(o.espelhado ? linhas.map(virar) : linhas));
  }
  return POSTAS.get(chave);
}

const PALETAS = new Map();

/**
 * A paleta do boneco com as cores de um agente (`{ camisa, cabelo, pele, olhos }`, em `#rrggbb`).
 * Sem `olhos` (quem monta a aparência à mão), o olho é o ponto de tinta de antes.
 */
export function coresDoBoneco({ camisa, cabelo, pele, olhos = CORES.tinta }) {
  const chave = `${camisa}|${cabelo}|${pele}|${olhos}`;
  if (!PALETAS.has(chave)) {
    const fendas = { cabelo, 'cabelo-sombra': sombra(cabelo), pele, 'pele-sombra': sombra(pele), olhos, camisa, 'camisa-sombra': camisa && sombra(camisa) };
    const cores = Object.entries(TINTAS).map(([letra, cor]) => [letra, Object.hasOwn(fendas, cor) ? fendas[cor] : cor]);
    PALETAS.set(chave, Object.freeze({ '.': null, ...Object.fromEntries(cores) }));
  }
  return PALETAS.get(chave);
}
