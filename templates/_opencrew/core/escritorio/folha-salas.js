// A parte das salas da folha de conferência (`?folha=1` ou `?folha=salas`): as quatro salas
// vazias — todas as mesas, sem ninguém —, com os móveis, cada uma de dia e de noite. Para o desenho
// de noite a folha usa o arranjo oposto ao de dia (o outro lado, o outro assento, o outro tapete):
// assim as duas variações de cada sala aparecem. Não lê o estado nem dado nenhum do projeto, e não
// usa a rede nem o relógio.
// `planoDasSalas` é puro; só `secaoDasSalas` toca no documento, e escreve os rótulos como texto.
// Spec: fase-e3-conversa-e-entrega.md, regra 18 (repositório do OpenCrew).
import { SALAS, montarAmbiente, varianteDe } from './modelo.js';
import { pintarCena } from './cena.js';

/** Cada pixel lógico da sala vira um quadrado de 3 pixels do canvas. */
const ESCALA = 3;
const ELENCOS = Object.freeze({ pequena: '1 a 3 agentes', media: '4 a 6 agentes', grande: '7 a 9 agentes', completa: '10 a 12 agentes' });
const PERIODOS = Object.freeze([['dia', 'De dia'], ['noite', 'À noite']]);
const TEXTOS = Object.freeze({
  titulo: 'Salas',
  nota: 'As quatro salas, vazias, com os móveis: a sala é escolhida pelo tamanho do elenco, e o arranjo dos móveis, pelo nome da crew. Cada sala aparece de dia e de noite; de noite a folha mostra o outro arranjo dela (o outro lado, o outro assento, o outro tapete). O primeiro monitor fica ligado, para conferir a tela à noite.',
  sala: (sala) => `Sala ${sala.titulo} — ${ELENCOS[sala.nome]} (${sala.largura}×${sala.altura})`,
  desenho: (sala, rotulo) => `Sala ${sala.titulo} em pixel-art, vazia, ${rotulo.toLowerCase()}.`,
});

/** Um nome de crew que dá o arranjo `variante`: a folha não tem crew, e mostra arranjos escolhidos. */
function crewDoArranjo(variante) {
  for (let i = 0; ; i++) if (varianteDe(`sala-${i}`) === variante) return `sala-${i}`;
}

/** As mesas da sala, todas, sem boneco; só o monitor da primeira fica ligado. */
const mesasVazias = (sala) => sala.mesas.map((mesa) => ({ mesa, vazio: true, monitor: mesa.indice === 0 ? 'aceso' : 'apagado', monitorFase: 0 }));

/**
 * O que a folha mostra das salas, como dado. Sempre a mesma folha.
 * @returns {{ sala: object, titulo: string, telas: { rotulo: string, ambiente: object, mesas: object[] }[] }[]}
 *   uma entrada por sala, da Pequena à Completa, cada uma com o desenho de dia e o de noite ·
 *   `ambiente`: o de `montarAmbiente` · `mesas`: o que `pintarCena` recebe no lugar dos bonecos
 */
export function planoDasSalas() {
  return Object.values(SALAS).map((sala) => ({
    sala,
    titulo: TEXTOS.sala(sala),
    telas: PERIODOS.map(([periodo, rotulo], i) => ({
      rotulo,
      ambiente: montarAmbiente({ total: sala.mesas.length, crew: crewDoArranjo(i ? 15 : 0), periodo }),
      mesas: mesasVazias(sala),
    })),
  }));
}

/** O contexto do canvas, com tudo ampliado `n` vezes: a cena pinta em pixel lógico. */
const ampliado = (ctx, n) => ({
  set fillStyle(cor) { ctx.fillStyle = cor; },
  set globalAlpha(alfa) { ctx.globalAlpha = alfa; },
  fillRect: (x, y, largura, altura) => ctx.fillRect(x * n, y * n, largura * n, altura * n),
});

function tela(documento, criar, sala, { rotulo, ambiente, mesas }) {
  const el = criar(documento, 'canvas', 'folha-tela');
  el.width = sala.largura * ESCALA;
  el.height = sala.altura * ESCALA;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', TEXTOS.desenho(sala, rotulo));
  pintarCena(ampliado(el.getContext('2d'), ESCALA), mesas, ambiente);
  return el;
}

/**
 * A seção das salas, pronta para entrar na folha.
 * @param {object} documento de quem vem o `createElement`
 * @param {(documento: object, tag: string, classe: string, texto?: string) => object} criar o
 *   mesmo ajudante da folha: um elemento com classe e texto
 */
export function secaoDasSalas(documento, criar) {
  const secao = criar(documento, 'section', 'folha-salas');
  secao.append(criar(documento, 'h3', 'folha-nome', TEXTOS.titulo), criar(documento, 'p', 'nota', TEXTOS.nota));
  for (const { sala, titulo, telas } of planoDasSalas()) {
    secao.append(criar(documento, 'h4', 'folha-sala', titulo));
    for (const desenho of telas) {
      const fila = criar(documento, 'div', 'folha-linha');
      fila.append(criar(documento, 'span', 'folha-rotulo', desenho.rotulo), tela(documento, criar, sala, desenho));
      secao.append(fila);
    }
  }
  return secao;
}
