// O ambiente de uma leitura: a sala (pelo tamanho do elenco), o cenário dela (pelo nome da crew),
// o período do dia e o relógio da parede (pela hora de quem olha). É o que a cena precisa saber
// além dos bonecos.
// Puro: sem DOM, sem relógio, sem rede. A hora entra por parâmetro.
// Spec: fase-e3-conversa-e-entrega.md, regras 13, 16 e 19 (repositório do OpenCrew).
import { salaDe } from './modelo-mesas.js';
import { moveisDe, varianteDe } from './modelo-moveis.js';
import { periodoDe, ponteiros } from './modelo-periodo.js';

/**
 * @param {object} [opcoes]
 * @param {number} [opcoes.total] quantos agentes tem o elenco (contam todos); sem ele, a sala Pequena
 * @param {string} [opcoes.crew] o nome da crew: a semente do cenário
 * @param {{ horas: number, minutos?: number } | null} [opcoes.hora] a hora local de quem olha
 * @param {unknown} [opcoes.periodo] o valor de `?periodo=`, que vale no lugar da hora
 * @returns {{ sala: object, moveis: object[], periodo: string, relogio: { horas: number, minutos: number }, chave: string }}
 *   `sala`: uma de `SALAS` · `moveis`: ver `moveisDe` · `periodo`: `manha`, `dia`, `entardecer` ou
 *   `noite` · `relogio`: ver `ponteiros` · `chave`: muda quando o desenho da sala muda (outra
 *   sala, outro arranjo, outro período ou os ponteiros em outro lugar)
 */
export function montarAmbiente({ total = 0, crew = '', hora = null, periodo = null } = {}) {
  const sala = salaDe(total);
  const relogio = ponteiros(hora);
  const quando = periodoDe(hora, periodo);
  const chave = [sala.nome, varianteDe(crew), quando, relogio.horas, relogio.minutos].join('|');
  return { sala, moveis: moveisDe(sala, crew), periodo: quando, relogio, chave };
}
