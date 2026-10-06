// Os rótulos sobre o desenho (regra 19): o nome de cada agente, sob a mesa dele, e o balão, sobre
// o boneco, são elementos da página numa camada por cima do canvas, escritos só por
// `textContent`. A posição vem das âncoras do modelo, em pixel lógico, e é aplicada em
// porcentagem de 320×180; cada rótulo tem a largura de uma coluna, e o CSS corta o texto que não
// cabe. A camada é `aria-hidden`: o leitor de tela lê a lista ao lado, que tem o texto inteiro.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 18 e 19 (repositório do OpenCrew).
import { ALTURA, BONECO, LARGURA, LARGURA_COLUNA } from './modelo.js';

/** Altura, em pixels lógicos, da faixa que o nome ocupa sob a mesa. */
const ALTURA_DO_NOME = 10;
/** Quanto sobra do nome enquanto um boneco em pé está por cima dele. */
const QUASE_APAGADO = '0.15';

const porcento = (valor, total) => `${(valor / total) * 100}%`;

/** Um rótulo com a largura de uma coluna, centrado na âncora; o texto fica num `span`, que o CSS corta. */
function criarRotulo(documento, { classe, texto, ancora }) {
  const caixa = documento.createElement('div');
  const tinta = documento.createElement('span');
  caixa.className = classe;
  caixa.style.left = porcento(ancora.x - LARGURA_COLUNA / 2, LARGURA);
  caixa.style.width = porcento(LARGURA_COLUNA, LARGURA);
  tinta.textContent = texto;
  caixa.append(tinta);
  return caixa;
}

/** O nome (sempre) e o balão (quando o modelo traz um) de um agente com mesa. */
function criarItem(documento, { mesa, nome, balao, acao }) {
  const item = { mesa, nome: criarRotulo(documento, { classe: 'nome', texto: nome, ancora: mesa.nome }), balao: null };
  item.nome.style.top = porcento(mesa.nome.y, ALTURA);
  if (balao === null) return item;
  item.balao = criarRotulo(documento, { classe: acao === 'checkpoint' ? 'balao espera' : 'balao', texto: balao, ancora: mesa.balao });
  item.balao.style.bottom = porcento(ALTURA - mesa.balao.y, ALTURA);
  return item;
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
 * A camada de nomes e balões.
 * @param {object} camada o elemento que fica sobre o canvas, do mesmo tamanho dele
 * @param {object} documento de quem vem o `createElement`
 * @returns {{ atualizar: (agentes: object[]) => void, acompanhar: (bonecos: object[]) => void }}
 *   `atualizar`: recebe os agentes do modelo a cada leitura e só refaz a camada quando um nome,
 *   um balão ou uma mesa mudou · `acompanhar`: recebe os bonecos de cada quadro; o nome sob um
 *   boneco em pé quase some, para não cobrir quem entrega, e o balão de quem saiu da mesa some
 *   até ele voltar
 */
export function criarRotulos(camada, documento) {
  let itens = [];
  let escrito = '';
  function atualizar(agentes) {
    const comMesa = agentes.filter((agente) => agente.mesa);
    const novo = JSON.stringify(comMesa.map((a) => [a.mesa.indice, a.nome, a.balao, a.acao]));
    if (novo === escrito) return;
    escrito = novo;
    itens = comMesa.map((agente) => criarItem(documento, agente));
    camada.replaceChildren(...itens.flatMap((item) => (item.balao ? [item.nome, item.balao] : [item.nome])));
  }
  function acompanhar(bonecos) {
    const emPe = bonecos.filter((boneco) => !boneco.sentado);
    for (const { mesa, nome, balao } of itens) {
      opacidade(nome, emPe.some((boneco) => cobre(boneco, mesa)) ? QUASE_APAGADO : '');
      if (balao) opacidade(balao, emPe.some((boneco) => boneco.indice === mesa.indice) ? '0' : '');
    }
  }
  return { atualizar, acompanhar };
}
