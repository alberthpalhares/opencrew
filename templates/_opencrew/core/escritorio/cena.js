// A cena: pinta no canvas, em pixel lógico (320×180), o quadro que o modelo calculou — a sala, a
// mesa de cada agente do elenco com o monitor, e os bonecos. Nada aqui decide pose, posição ou
// cor de monitor: isso chega pronto de `quadro`. A cena só preenche retângulos; nenhum texto
// entra no canvas (nome e balão são elementos da página, numa camada por cima).
// O laço de animação pede um quadro por vez ao navegador e só pinta de novo quando ele muda.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 18, 19 e 28 (repositório do OpenCrew).
import { ALTURA, BONECO, COLUNAS, LARGURA, LARGURA_COLUNA, TOPO } from './modelo.js';
import { coresDoBoneco, linhasDoBoneco, retangulos } from './sprites.js';
import { JANELA, LADRILHO, LADRILHO_ESCURO, PAREDE, PLANTA, RELOGIO } from './sprites-sala.js';
import {
  MESA, MESA_ACIMA, MONITOR, MONITOR_EM, SINAL_DUVIDA, SINAL_FALHA, SINAL_FEITO, SOMBRA,
  TELA_AMBAR, TELA_EM, TELA_VERMELHA, TELAS_ACESAS,
} from './sprites-mesa.js';

/** Quem foi pulado aparece meio transparente. */
const ALFA_DO_PULADO = 0.45;
/** O sinal sobre a cabeça, por ação; quem entrega ou comemora não tem sinal. */
const SINAIS = Object.freeze({ done: SINAL_FEITO, failed: SINAL_FALHA, 'sem-sinal': SINAL_DUVIDA });
/** A tela do monitor, pela cor que o quadro manda pintar agora; apagado é o próprio monitor. */
const TELAS = Object.freeze({
  aceso: (fase) => TELAS_ACESAS[fase % TELAS_ACESAS.length],
  ambar: () => TELA_AMBAR,
  vermelho: () => TELA_VERMELHA,
});

const largura = (desenho) => desenho.linhas[0].length;
const altura = (desenho) => desenho.linhas.length;
const meio = (coluna) => coluna * LARGURA_COLUNA + LARGURA_COLUNA / 2;
const centrado = (desenho, x, y) => ({ desenho, x: x - Math.floor(largura(desenho) / 2), y });

// Na parede, uma janela sobre cada coluna de mesas e o relógio no meio; no chão, encostadas na
// parede e fora do caminho de quem anda, duas plantas.
const DECORACAO = Object.freeze([
  ...Array.from({ length: COLUNAS }, (_, coluna) => centrado(JANELA, meio(coluna), 3)),
  centrado(RELOGIO, LARGURA / 2, 3),
  centrado(PLANTA, LARGURA_COLUNA, 6),
  centrado(PLANTA, LARGURA - LARGURA_COLUNA, 6),
]);

/** Preenche uma matriz de pixels com o canto superior esquerdo em (x, y). */
function pintar(ctx, { paleta, linhas }, x, y) {
  for (const [dx, dy, l, a, letra] of retangulos(linhas)) {
    ctx.fillStyle = paleta[letra];
    ctx.fillRect(x + dx, y + dy, l, a);
  }
}

/** O piso: ladrilhos claros e escuros em xadrez, da parede até o fim da tela. */
function pintarPiso(ctx) {
  for (let y = TOPO, linha = 0; y < ALTURA; y += altura(LADRILHO), linha++) {
    for (let x = 0, coluna = 0; x < LARGURA; x += largura(LADRILHO), coluna++) {
      pintar(ctx, (linha + coluna) % 2 ? LADRILHO_ESCURO : LADRILHO, x, y);
    }
  }
}

function pintarSala(ctx) {
  for (let x = 0; x < LARGURA; x += largura(PAREDE)) pintar(ctx, PAREDE, x, 0);
  pintarPiso(ctx);
  for (const { desenho, x, y } of DECORACAO) pintar(ctx, desenho, x, y);
}

/** A mesa de um agente, com o monitor na cor e na fase que o quadro traz. */
function pintarMesa(ctx, { mesa, monitor, monitorFase }) {
  const [x, y] = [mesa.retangulo.x + MONITOR_EM.x, mesa.retangulo.y + MONITOR_EM.y];
  pintar(ctx, MESA, mesa.retangulo.x, mesa.retangulo.y - MESA_ACIMA);
  pintar(ctx, MONITOR, x, y);
  const tela = TELAS[monitor]?.(monitorFase);
  if (tela) pintar(ctx, tela, x + TELA_EM.x, y + TELA_EM.y);
}

/** O boneco na pose do quadro, com a sombra no chão (se está em pé) e o sinal sobre a cabeça. */
function pintarBoneco(ctx, boneco) {
  const { x, y, acao, pose, papel, espelhado } = boneco;
  const linhas = linhasDoBoneco(pose, { papel, espelhado, festa: acao === 'comemorando' && pose === 'mao' });
  const sinal = SINAIS[acao];
  if (!boneco.sentado) pintar(ctx, SOMBRA, x + Math.floor((BONECO - largura(SOMBRA)) / 2), y + BONECO);
  ctx.globalAlpha = acao === 'skipped' ? ALFA_DO_PULADO : 1;
  pintar(ctx, { linhas, paleta: coresDoBoneco(boneco.aparencia) }, x, y);
  ctx.globalAlpha = 1;
  if (sinal) pintar(ctx, sinal, x + Math.floor((BONECO - largura(sinal)) / 2), y - altura(sinal) - 1);
}

/**
 * Pinta um quadro inteiro, em pixel lógico: a sala e, do fundo para a frente, mesas e bonecos.
 * Quem está mais abaixo na tela fica na frente: o boneco sentado é pintado antes da própria
 * mesa (o tampo cobre as pernas dele) e quem entrega, parado diante de outra mesa, depois dela.
 * @param {object} ctx o contexto 2D (ou qualquer objeto com `fillStyle`, `globalAlpha` e `fillRect`)
 * @param {object[]} bonecos o que `quadro` devolveu; só há mesa para quem está nesta lista
 */
export function pintarCena(ctx, bonecos) {
  pintarSala(ctx);
  const camadas = bonecos.flatMap((boneco) => [
    { base: boneco.mesa.retangulo.y + boneco.mesa.retangulo.altura, pintar: pintarMesa, boneco },
    { base: boneco.y + BONECO, pintar: pintarBoneco, boneco },
  ]);
  camadas.sort((a, b) => a.base - b.base);
  for (const camada of camadas) camada.pintar(ctx, camada.boneco);
}

/** O que muda o desenho de um boneco: se nada disto mudou, o quadro é o mesmo. */
const resumo = (b) => [b.id, b.indice, b.acao, b.pose, b.papel, b.espelhado, b.x, b.y, b.monitor, b.monitorFase].join(':');

/**
 * O laço de animação. A cada quadro do navegador pede os bonecos e, se algo mudou desde a última
 * pintura (ou o canvas mudou de tamanho), pinta na escala inteira do canvas, sem suavização.
 * Um quadro que falha não para o laço.
 * @param {object} janela de quem vem o `requestAnimationFrame`
 * @param {object} tela o canvas, já com 320·N × 180·N pixels
 * @param {() => object[] | null} obterQuadro os bonecos deste instante; `null`: ainda não há o que pintar
 * @param {() => void} aoPintar chamada depois de cada pintura
 */
export function animar(janela, tela, obterQuadro, aoPintar) {
  const ctx = tela.getContext('2d');
  let pintado = '';
  function passo() {
    try {
      const bonecos = obterQuadro();
      const marca = bonecos ? `${tela.width}|${bonecos.map(resumo).join(';')}` : pintado;
      if (marca === pintado) return;
      const n = tela.width / LARGURA;
      ctx.setTransform(n, 0, 0, n, 0, 0);
      ctx.imageSmoothingEnabled = false;
      pintarCena(ctx, bonecos);
      pintado = marca;
      aoPintar();
    } finally {
      janela.requestAnimationFrame(passo);
    }
  }
  janela.requestAnimationFrame(passo);
}
