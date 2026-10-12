// A cena: pinta no canvas, em pixel lógico da sala em uso, o quadro que o modelo calculou — a
// sala com o cenário dela (em `cena-sala.js`), a mesa de cada agente do elenco com o monitor, e os
// bonecos. Nada aqui decide pose, posição, cor de monitor, sala ou móvel: isso chega pronto de
// `quadro` e de `ambiente`. A cena só preenche retângulos; nenhum texto entra no canvas (nome,
// balão e fala são elementos da página, numa camada por cima).
// O laço de animação pede um quadro por vez ao navegador e só pinta de novo quando ele muda.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 18, 19 e 28, e fase-e3-conversa-e-entrega.md,
// regras 14, 15 e 19 (repositório do OpenCrew).
import { BONECO, montarAmbiente } from './modelo.js';
import { coresDoBoneco, linhasDoBoneco } from './sprites-boneco.js';
import { pintar, pintarMovel, pintarSala, tomDe } from './cena-sala.js';
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

/** A mesa de um agente, com o monitor na cor e na fase que o quadro traz; a tela acesa não escurece. */
function pintarMesa(ctx, { mesa, monitor, monitorFase }, tom) {
  const [x, y] = [mesa.retangulo.x + MONITOR_EM.x, mesa.retangulo.y + MONITOR_EM.y];
  pintar(ctx, MESA, mesa.retangulo.x, mesa.retangulo.y - MESA_ACIMA, tom);
  pintar(ctx, MONITOR, x, y, tom);
  const tela = TELAS[monitor]?.(monitorFase);
  if (tela) pintar(ctx, tela, x + TELA_EM.x, y + TELA_EM.y);
}

/** O boneco na pose do quadro, com a sombra no chão (se está em pé) e o sinal sobre a cabeça. */
function pintarBoneco(ctx, boneco, tom) {
  const { x, y, acao, pose, papel, espelhado } = boneco;
  const { molde, corte } = boneco.aparencia;
  const linhas = linhasDoBoneco(pose, { molde, corte, papel, espelhado, festa: acao === 'comemorando' && pose === 'mao' });
  const sinal = SINAIS[acao];
  if (!boneco.sentado) pintar(ctx, SOMBRA, x + Math.floor((BONECO - largura(SOMBRA)) / 2), y + BONECO, tom);
  ctx.globalAlpha = acao === 'skipped' ? ALFA_DO_PULADO : 1;
  pintar(ctx, { linhas, paleta: coresDoBoneco(boneco.aparencia) }, x, y, tom);
  ctx.globalAlpha = 1;
  if (sinal) pintar(ctx, sinal, x + Math.floor((BONECO - largura(sinal)) / 2), y - altura(sinal) - 1);
}

/**
 * Pinta um quadro inteiro, em pixel lógico: a sala e, do fundo para a frente, móveis de chão,
 * mesas e bonecos. Quem está mais abaixo na tela fica na frente: o boneco sentado é pintado antes
 * da própria mesa (o tampo cobre as pernas dele) e quem entrega, parado diante de outra mesa,
 * depois dela.
 * @param {object} ctx o contexto 2D (ou qualquer objeto com `fillStyle`, `globalAlpha` e `fillRect`)
 * @param {object[]} bonecos o que `quadro` devolveu; só há mesa para quem está nesta lista. Um
 *   item com `vazio` é só a mesa, sem boneco (a folha de conferência das salas)
 * @param {object} [ambiente] o `ambiente` do modelo (ver `montarAmbiente`); sem ele, a sala do
 *   tamanho da lista, de dia
 */
export function pintarCena(ctx, bonecos, ambiente = montarAmbiente({ total: bonecos.length })) {
  const tom = tomDe(ambiente.periodo);
  pintarSala(ctx, ambiente);
  const moveis = ambiente.moveis.filter((movel) => movel.camada === 'chao').map((movel) => ({ base: movel.y + movel.altura, pintar: () => pintarMovel(ctx, movel, ambiente) }));
  const camadas = bonecos.flatMap((boneco) => [
    { base: boneco.mesa.retangulo.y + boneco.mesa.retangulo.altura, pintar: () => pintarMesa(ctx, boneco, tom) },
    ...(boneco.vazio ? [] : [{ base: boneco.y + BONECO, pintar: () => pintarBoneco(ctx, boneco, tom) }]),
  ]);
  for (const camada of [...moveis, ...camadas].sort((a, b) => a.base - b.base)) camada.pintar();
}

/** O que muda o desenho de um boneco: se nada disto mudou, o quadro é o mesmo. */
const resumo = (b) => [b.id, b.indice, b.aparencia.molde, b.acao, b.pose, b.papel, b.espelhado, b.x, b.y, b.monitor, b.monitorFase].join(':');

/**
 * O laço de animação. A cada quadro do navegador pede os bonecos e, se algo mudou desde a última
 * pintura (os bonecos, a sala, o período, o relógio ou o tamanho do canvas), pinta na escala
 * inteira do canvas, sem suavização. Um quadro que falha não para o laço.
 * @param {object} janela de quem vem o `requestAnimationFrame`
 * @param {object} tela o canvas, já com a largura e a altura da sala multiplicadas pela escala
 * @param {() => object[] | null} obterQuadro os bonecos deste instante; `null`: ainda não há o que pintar
 * @param {() => void} aoPintar chamada depois de cada pintura
 * @param {() => object | undefined} [obterAmbiente] o `ambiente` da leitura em exibição; sem ele,
 *   o de `pintarCena`
 */
export function animar(janela, tela, obterQuadro, aoPintar, obterAmbiente = () => undefined) {
  const ctx = tela.getContext('2d');
  let pintado = '';
  function passo() {
    try {
      const bonecos = obterQuadro();
      if (!bonecos) return;
      const ambiente = obterAmbiente() ?? montarAmbiente({ total: bonecos.length });
      const marca = `${tela.width}|${ambiente.chave}|${bonecos.map(resumo).join(';')}`;
      if (marca === pintado) return;
      const n = tela.width / ambiente.sala.largura;
      ctx.setTransform(n, 0, 0, n, 0, 0);
      ctx.imageSmoothingEnabled = false;
      pintarCena(ctx, bonecos, ambiente);
      pintado = marca;
      aoPintar();
    } finally {
      janela.requestAnimationFrame(passo);
    }
  }
  janela.requestAnimationFrame(passo);
}
