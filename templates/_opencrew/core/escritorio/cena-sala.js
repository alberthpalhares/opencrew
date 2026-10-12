// A sala da cena: a parede, o piso, o que fica na parede do fundo (janelas com o céu do período,
// o relógio com a hora de quem olha, estante, quadros, plantas), os tapetes e, à noite, o halo do
// abajur aceso. Os móveis de chão são pintados um a um por `cena.js`, na ordem de profundidade,
// junto com as mesas e os bonecos. À noite toda cor passa pelo mesmo escurecimento (`noite`),
// menos o céu das janelas, o abajur aceso e a luz dele — e, em `cena.js`, a tela dos monitores.
// Nada aqui decide o que há na sala nem onde: isso chega pronto do modelo, em `ambiente`.
// Spec: fase-e3-conversa-e-entrega.md, §2B e regras 15 e 19 (repositório do OpenCrew).
import { TOPO } from './modelo.js';
import { CORES, noite, retangulos } from './sprites.js';
import { JANELAS, LADRILHO, LADRILHO_ESCURO, PAREDE, PLANTA, RELOGIO } from './sprites-sala.js';
import { ESTANTE, QUADRO, QUADRO_BRANCO } from './sprites-parede.js';
import { ABAJUR, ABAJUR_ACESO, BEBEDOURO, CAFE, MESA_BAIXA, PLANTA_ALTA, POLTRONA, SOFA, halo, tapete } from './sprites-moveis.js';

const DESENHOS = Object.freeze({
  relogio: RELOGIO, planta: PLANTA, estante: ESTANTE, quadro: QUADRO, 'quadro-branco': QUADRO_BRANCO, sofa: SOFA,
  poltrona: POLTRONA, 'mesa-baixa': MESA_BAIXA, bebedouro: BEBEDOURO, cafe: CAFE, 'planta-alta': PLANTA_ALTA,
});
/** O que não escurece à noite: o céu lá fora e o abajur aceso. */
const COM_LUZ_PROPRIA = Object.freeze(['janela', 'abajur']);
// A luz do abajur aceso: elipses translúcidas, em volta da cúpula (na parede, se ele está
// encostado nela) e no chão, ao pé dele. Cada uma: largura, altura, onde fica o meio dela a
// partir do canto do abajur, e a opacidade.
const LUZES = Object.freeze([[42, 32, 4, 4, 0.1], [28, 20, 4, 4, 0.14], [14, 10, 4, 3, 0.18], [36, 12, 4, 21, 0.14]]);
/** O ponteiro dos minutos tem 3 pixels; o das horas, 2. */
const PONTEIROS = Object.freeze([['minutos', 3, CORES.cinzaEscuro], ['horas', 2, CORES.tinta]]);

const COMO_E = (cor) => cor;
/** Como cada cor é pintada num período: à noite, mais escura; nos outros, como é. */
export const tomDe = (periodo) => (periodo === 'noite' ? noite : COMO_E);

/**
 * O desenho de uma peça do cenário num período: a matriz de pixels que a cena pinta no lugar dela.
 * @param {object} movel uma peça de `moveisDe`
 * @param {string} periodo `manha`, `dia`, `entardecer` ou `noite`
 */
export function desenhoDe(movel, periodo) {
  if (movel.tipo === 'janela') return JANELAS[periodo] ?? JANELAS.dia;
  if (movel.tipo === 'tapete') return tapete(movel.padrao, movel.largura, movel.altura);
  if (movel.tipo === 'abajur') return periodo === 'noite' ? ABAJUR_ACESO : ABAJUR;
  return DESENHOS[movel.tipo];
}

/** Preenche uma matriz de pixels com o canto superior esquerdo em (x, y), cada cor no tom pedido. */
export function pintar(ctx, { paleta, linhas }, x, y, tom = COMO_E) {
  for (const [dx, dy, l, a, letra] of retangulos(linhas)) {
    ctx.fillStyle = tom(paleta[letra]);
    ctx.fillRect(x + dx, y + dy, l, a);
  }
}

/** Uma peça do cenário, no desenho e no tom do período. */
export function pintarMovel(ctx, movel, { periodo }) {
  pintar(ctx, desenhoDe(movel, periodo), movel.x, movel.y, COM_LUZ_PROPRIA.includes(movel.tipo) ? COMO_E : tomDe(periodo));
}

/** O piso: ladrilhos claros e escuros em xadrez, da parede até o fim da sala. */
function pintarPiso(ctx, sala, tom) {
  const [largura, altura] = [LADRILHO.linhas[0].length, LADRILHO.linhas.length];
  for (let y = TOPO, linha = 0; y < sala.altura; y += altura, linha++) {
    for (let x = 0, coluna = 0; x < sala.largura; x += largura, coluna++) {
      pintar(ctx, (linha + coluna) % 2 ? LADRILHO_ESCURO : LADRILHO, x, y, tom);
    }
  }
}

/** Onde fica a ponta de um ponteiro que aponta para a posição `posicao` do mostrador (0 a 11). */
function ponta(posicao, raio) {
  const angulo = (posicao * Math.PI) / 6;
  const inteiro = (valor) => Math.sign(valor) * Math.round(Math.abs(valor));
  return [inteiro(raio * Math.sin(angulo)), -inteiro(raio * Math.cos(angulo))];
}

/** Os ponteiros, pixel a pixel, do centro do mostrador para fora. */
function pintarPonteiros(ctx, relogio, hora, tom) {
  const centro = [relogio.x + Math.floor(relogio.largura / 2), relogio.y + Math.floor(relogio.altura / 2)];
  for (const [qual, tamanho, cor] of PONTEIROS) {
    ctx.fillStyle = tom(cor);
    for (let raio = 0; raio <= tamanho; raio++) {
      const [dx, dy] = ponta(hora[qual], raio);
      ctx.fillRect(centro[0] + dx, centro[1] + dy, 1, 1);
    }
  }
}

/** A luz de um abajur aceso, sem sair da sala. */
function pintarLuz(ctx, abajur, sala) {
  for (const [largura, altura, dx, dy, alfa] of LUZES) {
    const [x0, y0] = [abajur.x + dx - largura / 2, abajur.y + dy - altura / 2];
    const { paleta, linhas } = halo(largura, altura);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = paleta.l;
    for (const [dxr, dyr, l, a] of retangulos(linhas)) {
      const [x, y] = [Math.max(0, x0 + dxr), Math.max(0, y0 + dyr)];
      const [fimX, fimY] = [Math.min(sala.largura, x0 + dxr + l), Math.min(sala.altura, y0 + dyr + a)];
      if (fimX > x && fimY > y) ctx.fillRect(x, y, fimX - x, fimY - y);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Pinta a sala vazia: a parede, o piso, o que fica na parede, os tapetes e a luz dos abajures.
 * @param {object} ctx o contexto 2D (ou qualquer objeto com `fillStyle`, `globalAlpha` e `fillRect`)
 * @param {object} ambiente o de `montarAmbiente`: `{ sala, moveis, periodo, relogio }`
 */
export function pintarSala(ctx, ambiente) {
  const { sala, moveis, periodo, relogio } = ambiente;
  const tom = tomDe(periodo);
  for (let x = 0; x < sala.largura; x += PAREDE.linhas[0].length) pintar(ctx, PAREDE, x, 0, tom);
  pintarPiso(ctx, sala, tom);
  for (const movel of moveis.filter((m) => m.camada !== 'chao')) {
    pintarMovel(ctx, movel, ambiente);
    if (movel.tipo === 'relogio') pintarPonteiros(ctx, movel, relogio, tom);
  }
  if (periodo !== 'noite') return;
  for (const abajur of moveis.filter((m) => m.tipo === 'abajur')) pintarLuz(ctx, abajur, sala);
}
