// Textos que a página mostra, em português do Brasil: os da §6 da spec, o status por extenso de
// cada agente e o título da aba. A página os grava só por `textContent`.
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e1-escritorio-ao-vivo.md, §6 e regras 18, 21, 24 e 29 (repositório do OpenCrew).

export const TEXTOS = Object.freeze({
  nome: 'Escritório',
  aguardando: 'Aguardando você',
  abrindo: 'Abrindo o escritório… Se esta mensagem não sumir, abra pelo endereço que o comando /opencrew dashboard mostrou, e não pelo arquivo.',
  semServidor: 'Sem conexão com o escritório. Tentando de novo… Para reabrir, rode /opencrew dashboard.',
  demonstracao: 'Demonstração — nenhuma execução ainda. Rode uma crew e ela aparece aqui.',
  demoForcada: 'Demonstração. Tire ?demo do endereço para ver a sua crew.',
});

/** Status do agente por extenso, para a lista ao lado do desenho (regra 24). */
export const STATUS_TEXTO = Object.freeze({
  idle: 'Em espera',
  working: 'Trabalhando',
  checkpoint: TEXTOS.aguardando,
  done: 'Concluído',
  skipped: 'Pulado',
  failed: 'Falhou',
});

/** "Passo 2 de 5"; sem total, "Passo 2". */
export function textoPasso(atual, total) {
  return total ? `Passo ${atual} de ${total}` : `Passo ${atual}`;
}

/** Faixa do checkpoint: "Aguardando você: <rótulo>"; sem rótulo, "Aguardando você". */
export function textoFaixa(rotulo) {
  return rotulo ? `${TEXTOS.aguardando}: ${rotulo}` : TEXTOS.aguardando;
}

/** "há 19 min" até 59 minutos; depois, em horas inteiras: "há 1 h". */
function textoIdade(minutos) {
  return minutos <= 59 ? `há ${minutos} min` : `há ${Math.floor(minutos / 60)} h`;
}

export const textoParada = (minutos) => `Última atualização ${textoIdade(minutos)}`;
export const textoSemSinal = (minutos) => `Sem sinal ${textoIdade(minutos)}`;

const TITULO_FIXO = Object.freeze({
  checkpoint: `(!) ${TEXTOS.aguardando}`,
  completed: '✓ Concluída',
  failed: '✗ Falhou',
});

/** "2/5 Escrever"; sem rótulo, "Passo 2 de 5"; sem total saem o "/5" e o " de 5". */
function tituloDoPasso({ current, total, label }) {
  if (!label) return textoPasso(current, total);
  return `${current}${total ? `/${total}` : ''} ${label}`;
}

/**
 * Título da aba (regra 29), para a página gravar quando mudar.
 * @param {object|null} estado o estado normalizado da crew em exibição; `null`: sem estado
 * @param {{ demo?: boolean, semConexao?: boolean }} [opcoes]
 * @returns {string} "Escritório" em demonstração, sem estado ou sem conexão
 */
export function titulo(estado, { demo = false, semConexao = false } = {}) {
  if (!estado || demo || semConexao) return TEXTOS.nome;
  const inicio = TITULO_FIXO[estado.status] ?? tituloDoPasso(estado.step);
  return estado.crew ? `${inicio} — ${estado.crew}` : inicio;
}
