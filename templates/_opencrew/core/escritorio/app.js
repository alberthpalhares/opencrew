// A página do escritório: pergunta o estado ao servidor a cada segundo (e na hora, ao voltar para
// a aba), entrega a resposta ao modelo e aplica o que ele devolve — o desenho no canvas, os
// rótulos por cima e o painel em volta. Consulta que falha mantém o último estado bom e liga o
// aviso; a página segue tentando, sem recarregar.
// É o único módulo que toca na janela: o relógio, a rede, o endereço (`?demo`), o tamanho da tela
// e a preferência "reduzir movimento" entram no modelo por parâmetro.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 16, 20 a 23 e 28 (repositório do OpenCrew).
import { ALTURA, LARGURA, MEMORIA_INICIAL, consultar, emExibicao, escala, escolher, montarPagina, quadro, transicao } from './modelo.js';
import { animar } from './cena.js';
import { criarPainel } from './painel.js';
import { criarRotulos } from './rotulos.js';

/** De quanto em quanto tempo a página pergunta o estado. */
const INTERVALO_MS = 1000;
/** Consulta sem resposta neste prazo é abandonada e conta como falha: a seguinte sai no ritmo normal. */
const PRAZO_MS = 4000;
/** Na demonstração nenhuma consulta traz o passo seguinte: o roteiro é relido neste ritmo. */
const RITMO_DA_DEMO_MS = 200;
/** Relativo à página: o servidor só atende o próprio endereço. */
const ENDERECO = 'estado';

/** Regra 16: o canvas tem 320·N × 180·N pixels de verdade e, na página, o tamanho que `escala` devolve. */
function ajustar(p) {
  const [moldura, sala, tela] = ['moldura', 'sala', 'tela'].map(p.el);
  p.razao = p.janela.devicePixelRatio;
  const { n, largura, altura } = escala(moldura.clientWidth, moldura.clientHeight, p.razao);
  if (tela.width !== LARGURA * n) Object.assign(tela, { width: LARGURA * n, height: ALTURA * n });
  sala.style.width = `${largura}px`;
  sala.style.height = `${altura}px`;
  // Quantos pixels da página vale um pixel lógico: o CSS dos rótulos acompanha a escala por aqui.
  sala.style.setProperty('--u', String(largura / LARGURA));
}

/**
 * Uma leitura: monta o modelo deste instante, compara com a leitura anterior (é daí que saem a
 * entrega e a comemoração) e escreve a página. Na primeira, mostra a página e mede o canvas.
 */
function ler(p) {
  const agora = Date.now();
  const naDemo = emExibicao(p.memoria, { demo: p.demo }).modo === 'demo';
  p.demoDesde = naDemo ? (p.demoDesde ?? agora) : null;
  const opcoes = { agoraMs: agora, reduzirMovimento: p.menosMovimento.matches, demo: p.demo, decorridoDemoMs: naDemo ? agora - p.demoDesde : 0 };
  const primeira = p.leitura === null;
  p.leitura = transicao(p.leitura, montarPagina(p.memoria, opcoes), agora);
  p.lidaEm = agora;
  p.painel.atualizar(p.leitura);
  p.rotulos.atualizar(p.leitura.agentes);
  if (!primeira) return;
  p.el('pagina').hidden = false;
  ajustar(p);
}

/** A resposta de `/estado`, ou `null` se a consulta falhou, demorou demais ou veio inválida. */
async function perguntar(p) {
  const corte = new AbortController();
  const prazo = p.janela.setTimeout(() => corte.abort(), PRAZO_MS);
  try {
    const resposta = await p.janela.fetch(ENDERECO, { cache: 'no-store', signal: corte.signal });
    return resposta.ok ? await resposta.json() : null;
  } catch {
    return null;
  } finally {
    p.janela.clearTimeout(prazo);
  }
}

/** Regra 20: uma consulta por vez; a que falha entra na memória como falha, e a página não para. */
async function consultarServidor(p) {
  if (p.consultando) return;
  p.consultando = true;
  const resposta = await perguntar(p);
  p.consultando = false;
  p.memoria = consultar(p.memoria ?? MEMORIA_INICIAL, resposta);
  ler(p);
}

/** Regra 22: a escolha do usuário no seletor vale até ele trocar. */
function escolherCrew(p, crew) {
  if (!p.memoria) return;
  p.memoria = escolher(p.memoria, crew);
  ler(p);
}

/** Os bonecos deste instante, para a cena pintar; `null` antes da primeira leitura. */
function quadroAgora(p) {
  if (!p.leitura) return null;
  const agora = Date.now();
  if (p.leitura.modo === 'demo' && agora - p.lidaEm >= RITMO_DA_DEMO_MS) ler(p);
  if (p.janela.devicePixelRatio !== p.razao) ajustar(p);
  const bonecos = quadro(p.leitura, agora);
  p.rotulos.acompanhar(bonecos);
  return bonecos;
}

/** O que a página guarda entre uma consulta e a seguinte. */
function criarPagina(janela) {
  const documento = janela.document;
  const el = (id) => documento.getElementById(id);
  const p = {
    janela,
    documento,
    el,
    demo: new URLSearchParams(janela.location.search).has('demo'),
    menosMovimento: janela.matchMedia('(prefers-reduced-motion: reduce)'),
    rotulos: criarRotulos(el('rotulos'), documento),
    memoria: null, // as consultas ao servidor; `null` até a primeira voltar
    leitura: null, // o modelo da última leitura, com o que está animando
    lidaEm: 0,
    demoDesde: null, // quando a demonstração entrou na tela
    consultando: false,
    razao: 0, // a razão de pixels com que o canvas foi medido
  };
  p.painel = criarPainel(documento, (crew) => escolherCrew(p, crew));
  return p;
}

/**
 * Liga a página a uma janela. A frase de abertura, que já está no HTML, só some depois do
 * primeiro desenho: se algo aqui não carregar ou não rodar, ela continua na tela.
 * @param {Window} janela a janela do navegador (nos testes, uma de mentira)
 */
export function iniciar(janela) {
  const p = criarPagina(janela);
  const reajustar = () => ajustar(p);
  janela.addEventListener('resize', reajustar);
  if (janela.ResizeObserver) new janela.ResizeObserver(reajustar).observe(p.el('moldura'));
  p.documento.addEventListener('visibilitychange', () => {
    if (!p.documento.hidden) consultarServidor(p);
  });
  janela.setInterval(() => consultarServidor(p), INTERVALO_MS);
  animar(janela, p.el('tela'), () => quadroAgora(p), () => {
    p.el('abertura').hidden = true;
  });
  consultarServidor(p);
}

if (typeof window !== 'undefined') iniciar(window);
