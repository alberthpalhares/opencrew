// O período do dia e o relógio da parede (regra 19 da E3). A hora é a do navegador de quem olha,
// e chega aqui por parâmetro: quem lê o relógio é a página (`app.js`).
// Puro: sem DOM, sem relógio, sem rede.
// Spec: fase-e3-conversa-e-entrega.md, regra 19 (repositório do OpenCrew).

/** Os quatro períodos, na ordem do dia. */
export const PERIODOS = Object.freeze(['manha', 'dia', 'entardecer', 'noite']);

// A hora em que cada período começa; antes das 6h ainda é a noite da véspera.
const INICIOS = Object.freeze([[6, 'manha'], [10, 'dia'], [17, 'entardecer'], [19, 'noite']]);
/** Sem hora (um teste, a folha de conferência), o relógio fica nas três horas, como na E1. */
const HORA_PADRAO = Object.freeze({ horas: 15, minutos: 0 });

const inteiro = (valor, limite) => (Number.isInteger(valor) && valor >= 0 && valor < limite ? valor : null);

/** A hora conferida: `{ horas, minutos }` com inteiros de 0 a 23 e de 0 a 59, ou `null`. */
function lerHora(hora) {
  const horas = inteiro(hora?.horas, 24);
  return horas === null ? null : { horas, minutos: inteiro(hora.minutos, 60) ?? 0 };
}

/** O que `?periodo=` pede, sem diferenciar maiúsculas, acentos e espaços; `null` se não é um período. */
function periodoPedido(forcado) {
  if (typeof forcado !== 'string') return null;
  const chave = forcado.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return PERIODOS.includes(chave) ? chave : null;
}

/**
 * O período do dia: manhã (6h às 9h59), dia (10h às 16h59), entardecer (17h às 18h59) e noite
 * (19h às 5h59).
 * @param {{ horas: number, minutos?: number } | null} hora a hora local de quem olha
 * @param {unknown} [forcado] o valor de `?periodo=`; se é um dos quatro, vale no lugar da hora
 * @returns {string} um de `PERIODOS`; sem hora válida e sem período pedido, `dia`
 */
export function periodoDe(hora, forcado) {
  const pedido = periodoPedido(forcado);
  if (pedido) return pedido;
  const lida = lerHora(hora);
  if (!lida) return 'dia';
  return INICIOS.findLast(([inicio]) => lida.horas >= inicio)?.[1] ?? 'noite';
}

/**
 * Para onde apontam os ponteiros do relógio da parede, em posições do mostrador (0 a 11, o 0 no
 * alto): o das horas na hora cheia, o dos minutos em passos de 5 minutos.
 * @param {{ horas: number, minutos?: number } | null} hora a hora local; sem ela, três horas
 * @returns {{ horas: number, minutos: number }}
 */
export function ponteiros(hora) {
  const { horas, minutos } = lerHora(hora) ?? HORA_PADRAO;
  return { horas: horas % 12, minutos: Math.floor(minutos / 5) };
}
