// Relatório da conferência de fontes e as mensagens ao usuário (PT-BR).
// Specs: specs/fase-r1-reparos-1-6-1.md, regra 17 e seção 6, e
// specs/fase-r2-update-e-envio-seguros.md, regras 24 a 26 e seção 6 (repositório do OpenCrew).
import { relativoAoProjeto } from '../comum.mjs';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export const MSG = {
  nadaACorrigir: 'Nada a corrigir.',
  corrigido: (arquivo, copia) => `Corrigi: ${arquivo} (cópia: ${copia})`,
  comoCorrigir: 'Para trocar os caminhos que têm sugestão, rode de novo com --corrigir (cada arquivo alterado ganha uma cópia).',
  semCorrecaoAutomatica: (n) => `Não há correção automática para ${n} pendência(s): escolha um candidato ou corrija o caminho na crew.`,
  buscaParcial: (limite) => `Procurei só nos primeiros ${limite} itens do projeto; pode existir um arquivo com esse nome que eu não vi.`,
  linkParaFora: (arquivo) => `Não corrigi \`${arquivo}\`: é um link que aponta para fora da crew. O caminho citado nele continua como estava.`,
  crewLigadaParaFora: (crew) => `Não corrigi nada: a pasta \`${crew}\` é um link que aponta para fora do projeto.`,
  naoConferi: (motivo) => `Não consegui conferir: ${motivo}`,
};

const MAX_NOMES = 20;
const comCrases = (lista) => lista.map((c) => `\`${c}\``);

/** Os primeiros nomes e, se sobram, quantos: uma pasta grande não pode encher a conversa. */
function resumida(nomes) {
  if (nomes.length <= MAX_NOMES) return nomes.join(', ');
  return [...nomes.slice(0, MAX_NOMES), `… e mais ${nomes.length - MAX_NOMES}`].join(', ');
}

/** Linha de um caminho que não existe. `aviso` é a frase de busca parcial, ou ''. */
function linhaDaPendencia(i, onde, aviso) {
  const inicio = `- ❌ Não encontrei \`${i.ref}\` (${onde})`;
  const fim = aviso ? `. ${aviso}` : '';
  const achados = plural(i.candidatos.length, 'candidato', 'candidatos');
  if (i.sugestao) return `${inicio}. Novo caminho sugerido: \`${i.sugestao}\`${fim}`;
  if (i.candidatos.length) return `${inicio}. Encontrei ${achados}: ${resumida(comCrases(i.candidatos))}${fim}`;
  if (i.pasta.length) return `${inicio}. Na pasta esperada existem: ${resumida(i.pasta)}${fim}`;
  return aviso ? `${inicio}${fim}` : `${inicio} nem nada com esse nome no projeto.`;
}

function linhaDoAlerta(i, onde) {
  const sugestao = i.sugestao ? ` Sugestão: \`${i.sugestao}\`` : '';
  return `- ⚠️ \`${i.ref}\` é um caminho absoluto (não é portátil — quebra em outro computador).${sugestao} (${onde})`;
}

/** Caminho de rede ou endereço de site: a citação aparece, e o relatório diz que não foi testada. */
function linhaDoNaoConferido(i, onde) {
  return `- ⚠️ \`${i.ref}\` é um caminho de rede ou um endereço de site: não conferi se existe (a conferência não acessa a rede). (${onde})`;
}

// Os dois estados de alerta (não mudam o status); qualquer outro estado apontado é pendência.
const LINHA_DO_ALERTA = { 'nao-portatil': linhaDoAlerta, 'nao-conferido': linhaDoNaoConferido };

export function formatar(r) {
  const aviso = r.buscaParcial ? MSG.buscaParcial(r.limite) : '';
  const contar = (estado) => r.refs.filter((i) => i.estado === estado).length;
  const apontados = r.refs.filter((x) => x.estado !== 'ok');
  const linhas = [`## Conferência de fontes — ${r.crew}`, ''];
  for (const i of apontados) {
    const onde = `citado em ${i.citadoEm.map((a) => relativoAoProjeto(r.raiz, a)).join(', ')}`;
    linhas.push((LINHA_DO_ALERTA[i.estado] ?? linhaDaPendencia)(i, onde, aviso));
  }
  if (apontados.length) linhas.push(''); // sem pendência nem alerta, uma linha em branco só
  const alertas = contar('nao-portatil') + contar('nao-conferido');
  const pendentes = contar('faltando');
  linhas.push(`**Resumo: ${plural(r.refs.length, 'fonte', 'fontes')} — ${contar('ok')} ok, ${plural(pendentes, 'pendente', 'pendentes')}, ${plural(alertas, 'alerta', 'alertas')}**`, '');
  return linhas.join('\n');
}
