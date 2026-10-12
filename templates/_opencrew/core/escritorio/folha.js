// A folha de conferência dos personagens (`?folha=1` no endereço do escritório): todos os cortes
// dos dois moldes, nas 8 peles, com as cores de cabelo e de olhos variando, e uma fileira com as
// poses de um corte com volume de cada molde. Serve para conferir os desenhos de uma vez, com o
// olho — nenhum teste vê desenho. Não lê o estado nem dado nenhum do projeto, e não usa a rede.
// `planoDaFolha` é puro; só `abrirFolha` toca no documento, e escreve os rótulos como texto.
// Spec: fase-e2-personagens-do-escritorio.md, §5 (repositório do OpenCrew).
import { CABELOS, CAMISAS, MOLDES, OLHOS, PELES, corDistinta } from './modelo-personagem.js';
import { CORES, retangulos } from './sprites.js';
import { NOMES_DOS_CORTES } from './sprites-rosto.js';
import { coresDoBoneco, linhasDoBoneco } from './sprites-boneco.js';

/** O boneco tem 16 pixels de lado; entre um e outro, e em volta, ficam 4. */
const LADO = 16;
const VAO = 4;
/** Cada pixel do desenho vira um quadrado de 4 pixels do canvas. */
const ESCALA = 4;
/** O corte com volume de cada molde (cacheado e crespo) é o que mais disputa espaço com os braços. */
const VOLUMOSO = 2;
const TITULOS = Object.freeze({ feminino: 'Feminino', masculino: 'Masculino' });
const TEXTOS = Object.freeze({
  titulo: 'Folha de conferência dos personagens',
  nota: 'Cada linha é um corte de cabelo, nas 8 peles, da mais clara à mais escura; a última linha de cada molde mostra as poses. Para voltar ao escritório, tire ?folha do endereço.',
  poses: (corte) => `Poses (${corte.toLowerCase()})`,
  desenho: (molde, rotulo) => `Bonecos em pixel-art: ${molde}, ${rotulo}.`,
});
// As poses da fileira: digitando, andando, a mão levantada, a festa, o papel e o boneco espelhado.
const POSES = Object.freeze([
  ['parado', {}], ['digitar-a', {}], ['digitar-b', {}], ['andar-a', {}], ['andar-b', {}],
  ['mao', {}], ['mao', { festa: true }], ['andar-a', { papel: true }], ['andar-b', { espelhado: true }], ['mao', { espelhado: true }],
]);

/** As cores de um boneco da folha: cabelo e olhos passam pela mesma troca do escritório. */
function cores(pele, cabelo, olhos, camisa) {
  return {
    camisa: CAMISAS[camisa % CAMISAS.length],
    pele,
    cabelo: corDistinta(CABELOS, cabelo % CABELOS.length, pele),
    olhos: corDistinta(OLHOS, olhos % OLHOS.length, pele),
  };
}

function cortesDe(molde, m) {
  return NOMES_DOS_CORTES[molde].map((rotulo, corte) => ({
    rotulo,
    bonecos: PELES.map((pele, p) => ({ pose: 'parado', opcoes: { molde, corte }, aparencia: cores(pele, 2 * corte + p + 4 * m, corte + p, corte + p) })),
  }));
}

function posesDe(molde, m) {
  const bonecos = POSES.map(([pose, extra], i) => ({
    pose,
    opcoes: { molde, corte: VOLUMOSO, ...extra },
    aparencia: cores(PELES[(3 * i + m) % PELES.length], i + 5 * m, i + m, i + 6 * m),
  }));
  return { rotulo: TEXTOS.poses(NOMES_DOS_CORTES[molde][VOLUMOSO]), bonecos };
}

/**
 * O que a folha mostra, como dado: uma seção por molde, cada uma com uma linha por corte (8
 * bonecos parados, um por pele) e uma linha de poses. Sempre a mesma folha.
 * @returns {{ titulo: string, linhas: { rotulo: string, bonecos: { pose: string, opcoes: object, aparencia: object }[] }[] }[]}
 *   `opcoes`: o que `linhasDoBoneco` recebe · `aparencia`: `{ camisa, pele, cabelo, olhos }`
 */
export function planoDaFolha() {
  return MOLDES.map((molde, m) => ({ titulo: TITULOS[molde], linhas: [...cortesDe(molde, m), posesDe(molde, m)] }));
}

function criar(documento, tag, classe, texto = '') {
  const el = documento.createElement(tag);
  el.className = classe;
  el.textContent = texto;
  return el;
}

/** Um canvas com os bonecos de uma linha, lado a lado, sobre a cor do piso. */
function tela(documento, titulo, { rotulo, bonecos }) {
  const el = criar(documento, 'canvas', 'folha-tela');
  el.width = (bonecos.length * (LADO + VAO) + VAO) * ESCALA;
  el.height = (LADO + 2 * VAO) * ESCALA;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', TEXTOS.desenho(titulo, rotulo));
  const ctx = el.getContext('2d');
  ctx.fillStyle = CORES.pisoClaro;
  ctx.fillRect(0, 0, el.width, el.height);
  bonecos.forEach(({ pose, opcoes, aparencia }, i) => {
    const paleta = coresDoBoneco(aparencia);
    const [x, y] = [VAO + i * (LADO + VAO), VAO];
    for (const [dx, dy, largura, altura, letra] of retangulos(linhasDoBoneco(pose, opcoes))) {
      ctx.fillStyle = paleta[letra];
      ctx.fillRect((x + dx) * ESCALA, (y + dy) * ESCALA, largura * ESCALA, altura * ESCALA);
    }
  });
  return el;
}

/**
 * Põe a folha na página, no lugar do escritório (que fica escondido).
 * @param {Window} janela a janela do navegador (nos testes, uma de mentira)
 */
export function abrirFolha(janela) {
  const documento = janela.document;
  for (const id of ['abertura', 'pagina']) {
    const el = documento.getElementById(id);
    if (el) el.hidden = true;
  }
  const folha = criar(documento, 'main', 'folha');
  folha.append(criar(documento, 'h2', 'folha-titulo', TEXTOS.titulo), criar(documento, 'p', 'nota', TEXTOS.nota));
  for (const { titulo, linhas } of planoDaFolha()) {
    const secao = criar(documento, 'section', 'folha-molde');
    secao.append(criar(documento, 'h3', 'folha-nome', titulo));
    for (const linha of linhas) {
      const fila = criar(documento, 'div', 'folha-linha');
      fila.append(criar(documento, 'span', 'folha-rotulo', linha.rotulo), tela(documento, titulo, linha));
      secao.append(fila);
    }
    folha.append(secao);
  }
  documento.body.append(folha);
}
