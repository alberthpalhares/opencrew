// Relatório da conferência de fontes e as mensagens ao usuário (PT-BR).
// Spec: specs/fase-r1-reparos-1-6-1.md, regra 17 e seção 6 (repositório do OpenCrew).
import path from 'node:path';
import { barra } from './busca.mjs';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export const MSG = {
  nadaACorrigir: 'Nada a corrigir.',
  corrigidos: (n) => `${plural(n, 'caminho corrigido', 'caminhos corrigidos')} (cópia .bak ao lado de cada arquivo alterado).\n`,
  semCorrecaoAutomatica: (n) => `Não há correção automática para ${n} pendência(s): escolha um candidato ou corrija o caminho na crew.`,
  buscaParcial: (limite) => `Procurei só nos primeiros ${limite} itens do projeto; pode existir um arquivo com esse nome que eu não vi.`,
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

export function formatar(r) {
  const aviso = r.buscaParcial ? MSG.buscaParcial(r.limite) : '';
  const contar = (estado) => r.refs.filter((i) => i.estado === estado).length;
  const apontados = r.refs.filter((x) => x.estado !== 'ok');
  const linhas = [`## Conferência de fontes — ${r.crew}`, ''];
  for (const i of apontados) {
    const onde = `citado em ${i.citadoEm.map((a) => barra(path.relative(r.raiz, a))).join(', ')}`;
    linhas.push(i.estado === 'nao-portatil' ? linhaDoAlerta(i, onde) : linhaDaPendencia(i, onde, aviso));
  }
  if (apontados.length) linhas.push(''); // sem pendência nem alerta, uma linha em branco só
  linhas.push(`**Resumo: ${r.refs.length} fontes — ${contar('ok')} ok, ${contar('faltando')} pendentes, ${contar('nao-portatil')} alertas**`, '');
  return linhas.join('\n');
}
