// O painel em volta do desenho: o nome da crew, o passo com a barra de progresso, os avisos, a
// faixa do checkpoint, a última passagem de bastão, o seletor de crews e a lista dos agentes
// (regras 22 a 24 e 29). Tudo o que vem do estado — nome, rótulo, mensagem, motivo — entra por
// `textContent`: é texto, nunca marcação. Cada parte só é reescrita quando muda.
// Spec: fase-e1-escritorio-ao-vivo.md, regras 18 e 20 a 24 (repositório do OpenCrew).
import { TEXTOS } from './modelo.js';

/** Os elementos de `index.html` que o painel escreve. */
const IDS = [
  'pagina', 'crew', 'situacao', 'passo', 'barra', 'barra-feito', 'barra-atual', 'barra-resto', 'aviso', 'frase',
  'faixa', 'etiqueta', 'parada', 'motivo', 'passagem', 'lista', 'seletor', 'seletor-caixa',
];
/** A situação da execução, por extenso. */
const SITUACAO = Object.freeze({ running: 'Em andamento', checkpoint: TEXTOS.aguardando, completed: 'Concluída', failed: 'Falhou' });
/** A marca de cada ação na lista: a forma muda junto com a cor. */
const MARCAS = Object.freeze({ idle: '○', working: '▶', checkpoint: '▲', done: '✓', skipped: '–', failed: '✕', 'sem-sinal': '?' });

/** Escreve o texto no elemento e o esconde quando não há o que mostrar. */
function escrever(elemento, texto) {
  const novo = texto || '';
  if (elemento.textContent !== novo) elemento.textContent = novo;
  elemento.hidden = novo === '';
}

/** Um elemento novo com classe e texto; `enfeite`: fora do alcance do leitor de tela. */
function criar(documento, marca, { classe, texto = '', enfeite = false }) {
  const elemento = documento.createElement(marca);
  elemento.className = classe;
  elemento.textContent = texto;
  if (enfeite) elemento.setAttribute('aria-hidden', 'true');
  return elemento;
}

/**
 * A linha de um agente: a cor da camisa (a mesma do boneco), o ícone, o nome, o status e o que fez.
 * A marca segue o status do agente, não a ação do boneco (regra 18: no checkpoint a lista não
 * muda); só "sem sinal" a troca.
 */
function criarLinha(documento, agente) {
  const novo = (marca, opcoes) => criar(documento, marca, opcoes);
  const item = novo('li', { classe: 'agente' });
  const cor = novo('span', { classe: 'cor', enfeite: true });
  const quem = novo('div', { classe: 'quem' });
  const status = novo('span', { classe: 'status' });
  const marca = agente.acao === 'sem-sinal' ? 'sem-sinal' : agente.status;
  item.dataset.acao = marca;
  cor.style.background = agente.aparencia.camisa ?? 'transparent';
  status.append(novo('span', { classe: 'sinal', texto: MARCAS[marca], enfeite: true }), novo('span', { classe: 'texto', texto: agente.statusTexto }));
  quem.append(novo('strong', { classe: 'nome', texto: agente.nome }), status);
  if (agente.label) quem.append(novo('span', { classe: 'fez', texto: agente.label }));
  item.append(cor, novo('span', { classe: 'icone', texto: agente.icone, enfeite: true }), quem);
  return item;
}

function criarOpcao(documento, crew) {
  return Object.assign(criar(documento, 'option', { classe: '', texto: crew }), { value: crew });
}

const textoDoPasso = ({ contagem, rotulo }) => (rotulo ? `${contagem} — ${rotulo}` : contagem);
const textoDaPassagem = ({ de, para, mensagem }) => `Última passagem de bastão: ${de} → ${para}${mensagem ? ` — ${mensagem}` : ''}`;

/**
 * O painel da página.
 * @param {object} documento a página (`getElementById`, `createElement`, `title`)
 * @param {(crew: string) => void} aoEscolher chamada quando o usuário troca de crew no seletor
 * @returns {{ atualizar: (modelo: object) => void }} `atualizar` recebe o que `montarPagina` devolveu
 */
export function criarPainel(documento, aoEscolher) {
  const el = Object.fromEntries(IDS.map((id) => [id, documento.getElementById(id)]));
  const escrito = { crews: '', agentes: '' };
  el.seletor.addEventListener('change', () => aoEscolher(el.seletor.value));

  /** A barra em três partes: passos feitos, o passo atual e o que falta. */
  function progresso({ passo, execucao }) {
    const total = passo?.total ?? 0;
    el.barra.hidden = total === 0;
    if (!total) return;
    const feitos = execucao === 'completed' ? total : Math.min(total, Math.max(0, passo.atual - 1));
    const atual = feitos < total && passo.atual >= 1 ? 1 : 0;
    el.barra.style.setProperty('--total', String(total));
    [feitos, atual, total - feitos - atual].forEach((parte, i) => {
      el[['barra-feito', 'barra-atual', 'barra-resto'][i]].style.flexGrow = String(parte);
    });
  }

  /** O seletor só aparece com mais de uma crew (regra 22). */
  function seletor({ crews, crew }) {
    const novo = JSON.stringify(crews);
    el['seletor-caixa'].hidden = crews.length < 2;
    if (novo !== escrito.crews) el.seletor.replaceChildren(...crews.map((nome) => criarOpcao(documento, nome)));
    escrito.crews = novo;
    if (crews.includes(crew) && el.seletor.value !== crew) el.seletor.value = crew;
  }

  /** A lista traz todo agente, com ou sem mesa: é ela que vale para o leitor de tela (regra 24). */
  function lista({ agentes }) {
    const novo = JSON.stringify(agentes.map((a) => [a.id, a.nome, a.icone, a.acao, a.statusTexto, a.label, a.aparencia.camisa]));
    if (novo !== escrito.agentes) el.lista.replaceChildren(...agentes.map((agente) => criarLinha(documento, agente)));
    escrito.agentes = novo;
  }

  function atualizar(modelo) {
    if (documento.title !== modelo.titulo) documento.title = modelo.titulo;
    el.pagina.dataset.execucao = modelo.execucao ?? '';
    el.etiqueta.hidden = modelo.modo !== 'demo';
    escrever(el.crew, modelo.crew);
    escrever(el.situacao, SITUACAO[modelo.execucao]);
    escrever(el.passo, modelo.passo && textoDoPasso(modelo.passo));
    escrever(el.aviso, modelo.aviso);
    escrever(el.frase, modelo.frase);
    escrever(el.faixa, modelo.faixa);
    escrever(el.parada, modelo.parada);
    escrever(el.motivo, modelo.motivo && `Motivo da falha: ${modelo.motivo}`);
    escrever(el.passagem, modelo.passagem && textoDaPassagem(modelo.passagem));
    progresso(modelo);
    seletor(modelo);
    lista(modelo);
  }
  return { atualizar };
}
