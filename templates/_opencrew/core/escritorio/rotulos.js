// Os rótulos sobre o desenho (regra 19 da E1 e regras 2 a 4 da E3): o nome de cada agente, sob a
// mesa dele, o balão de status, sobre o boneco, e o balão de fala de quem está falando são
// elementos da página numa camada por cima do canvas, escritos só por `textContent`. A posição
// vem do modelo, em pixel lógico, e é aplicada em porcentagem da tela da sala em uso; nome e balão
// de status têm a largura de uma coluna, e o CSS corta o texto que não cabe. A camada é
// `aria-hidden`: o leitor de tela lê a lista ao lado, que tem o texto inteiro.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 18 e 19, e fase-e3-conversa-e-entrega.md, regras 2
// a 4 e 14 (repositório do OpenCrew).
import { BONECO, LARGURA_COLUNA, caixaDaFala } from './modelo.js';

/** Altura, em pixels lógicos, da faixa que o nome ocupa sob a mesa. */
const ALTURA_DO_NOME = 10;
/** Quanto sobra do nome enquanto um boneco em pé está por cima dele. */
const QUASE_APAGADO = '0.15';

const porcento = (valor, total) => `${(valor / total) * 100}%`;

function criar(documento, classe, texto = '') {
  const elemento = documento.createElement('div');
  elemento.className = classe;
  elemento.textContent = texto;
  return elemento;
}

/** Um rótulo com a largura de uma coluna, centrado na âncora; o texto fica num `span`, que o CSS corta. */
function criarRotulo(documento, sala, { classe, texto, ancora }) {
  const caixa = criar(documento, classe);
  const tinta = documento.createElement('span');
  caixa.style.left = porcento(ancora.x - LARGURA_COLUNA / 2, sala.largura);
  caixa.style.width = porcento(LARGURA_COLUNA, sala.largura);
  tinta.textContent = texto;
  caixa.append(tinta);
  return caixa;
}

/** O nome (sempre) e o balão de status (quando o modelo traz um) de um agente com mesa. */
function criarItem(documento, sala, { mesa, nome, balao, acao }) {
  const item = { mesa, nome: criarRotulo(documento, sala, { classe: 'nome', texto: nome, ancora: mesa.nome }), balao: null };
  item.nome.style.top = porcento(mesa.nome.y, sala.altura);
  if (balao === null) return item;
  item.balao = criarRotulo(documento, sala, { classe: acao === 'checkpoint' ? 'balao espera' : 'balao', texto: balao, ancora: mesa.balao });
  item.balao.style.bottom = porcento(sala.altura - mesa.balao.y, sala.altura);
  return item;
}

/**
 * O balão de fala de um boneco (regras 2 e 4 da E3). A caixa vai do teto que o modelo deu até a
 * cabeça de quem fala, e o balão fica no pé dela; na horizontal ele fica entre duas molas, na
 * proporção do x do boneco: assim, seja qual for a largura do texto, o balão não sai da cena e
 * continua por cima de quem fala. O rabicho é um elemento à parte, no x do boneco.
 */
function criarFala(documento, sala, boneco) {
  const { x, teto, baixo } = caixaDaFala(boneco, sala);
  const [caixa, linha, rabicho] = ['fala', 'fala-linha', 'fala-rabicho'].map((classe) => criar(documento, classe));
  const [antes, texto, depois] = ['fala-vao', 'fala-texto', 'fala-vao'].map((classe) => criar(documento, classe));
  caixa.style.top = porcento(teto, sala.altura);
  caixa.style.height = porcento(baixo - teto, sala.altura);
  antes.style.flexGrow = String(x);
  depois.style.flexGrow = String(sala.largura - x);
  rabicho.style.left = porcento(x, sala.largura);
  texto.textContent = boneco.fala;
  linha.append(antes, texto, depois);
  caixa.append(linha, rabicho);
  return caixa;
}

/** O boneco está sobre a faixa do nome desta mesa? */
function cobre(boneco, { nome }) {
  const esquerda = nome.x - LARGURA_COLUNA / 2;
  const naColuna = boneco.x < esquerda + LARGURA_COLUNA && boneco.x + BONECO > esquerda;
  return naColuna && boneco.y < nome.y + ALTURA_DO_NOME && boneco.y + BONECO > nome.y;
}

function opacidade(elemento, valor) {
  if (elemento.style.opacity !== valor) elemento.style.opacity = valor;
}

/**
 * A camada de nomes, balões de status e balões de fala.
 * @param {object} camada o elemento que fica sobre o canvas, do mesmo tamanho dele
 * @param {object} documento de quem vem o `createElement`
 * @returns {{ atualizar: (agentes: object[], sala: object) => void, acompanhar: (bonecos: object[]) => void }}
 *   `atualizar`: recebe os agentes do modelo e a sala em uso a cada leitura, e só refaz a camada
 *   quando um nome, um balão, uma mesa ou a sala mudou · `acompanhar`: recebe os bonecos de cada
 *   quadro; o nome sob um boneco em pé quase some, para não cobrir quem entrega; o balão de
 *   status some enquanto o boneco está fora da mesa, falando ou na conversa de uma entrega; e os
 *   balões de fala são os de quem fala neste quadro (só são refeitos quando uma fala muda)
 */
export function criarRotulos(camada, documento) {
  let [itens, sala, escrito, falado, falas] = [[], null, '', '', null];
  const filhos = () => [...itens.flatMap((item) => (item.balao ? [item.nome, item.balao] : [item.nome])), ...(falas ? [falas] : [])];
  function atualizar(agentes, salaEmUso) {
    const comMesa = agentes.filter((agente) => agente.mesa);
    const novo = JSON.stringify([salaEmUso.nome, comMesa.map((a) => [a.mesa.indice, a.nome, a.balao, a.acao])]);
    if (novo === escrito) return;
    [escrito, sala] = [novo, salaEmUso];
    itens = comMesa.map((agente) => criarItem(documento, sala, agente));
    camada.replaceChildren(...filhos());
  }
  function falar(bonecos) {
    const falando = sala ? bonecos.filter((boneco) => boneco.fala) : [];
    const novo = JSON.stringify([sala?.nome, falando.map((b) => [b.indice, b.fala, b.x, b.sentado])]);
    if (novo === falado) return;
    falado = novo;
    if (!falas && !falando.length) return;
    if (!falas) {
      falas = criar(documento, 'falas');
      camada.append(falas);
    }
    falas.replaceChildren(...falando.map((boneco) => criarFala(documento, sala, boneco)));
  }
  function acompanhar(bonecos) {
    const emPe = bonecos.filter((boneco) => !boneco.sentado);
    const semBalao = new Set(bonecos.filter((b) => !b.sentado || b.fala || b.semBalao).map((b) => b.indice));
    for (const { mesa, nome, balao } of itens) {
      opacidade(nome, emPe.some((boneco) => cobre(boneco, mesa)) ? QUASE_APAGADO : '');
      if (balao) opacidade(balao, semBalao.has(mesa.indice) ? '0' : '');
    }
    falar(bonecos);
  }
  return { atualizar, acompanhar };
}
