// O que a limpeza mostra ao usuário: tamanhos, a lista de candidatas e o que fica. PT-BR fixo.
// Spec: fase-u6b-dados-e-custo.md, §4 e §6 (repositório do OpenCrew).
import { AUDIO_DIAS, diaDe } from './disco.mjs';

const SITUACAO = { aprovada: 'aprovada', rejeitada: 'rejeitada', abortada: 'abortada', publicada: 'publicada' };

/** Bytes em texto: `1,5 MB`. */
export function tamanho(bytes) {
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let [valor, i] = [bytes, 0];
  while (valor >= 1024 && i < unidades.length - 1) [valor, i] = [valor / 1024, i + 1];
  return i === 0 ? `${bytes} B` : `${valor.toFixed(1).replace('.', ',')} ${unidades[i]}`;
}

const linhaDaCandidata = (e) => `- ${e.run} · ${diaDe(e)} · ${tamanho(e.tamanho)} · ${SITUACAO[e.status] ?? 'sem registro'} · entrega copiada: ${e.copiada ? 'sim' : 'não'}`;

/** As linhas da listagem, sem a linha `LIMPEZA:`. */
export function linhasDaLista({ nome, manter, candidatas, ficam, audios }) {
  const soAudio = audios.reduce((soma, a) => soma + a.tamanho, 0);
  return [
    `Limpeza da crew ${nome} — ${manter === 1 ? 'fica a execução fechada mais recente' : `ficam as ${manter} execuções fechadas mais recentes`}`,
    ...(candidatas.length ? ['Candidatas a apagar (a mais antiga primeiro):', ...candidatas.map(linhaDaCandidata)] : []),
    ...(ficam.length ? ['Ficam (não entram na limpeza):', ...ficam.map((f) => `- ${f.run}: ${f.motivo}`)] : []),
    ...(audios.length ? [`Áudio com mais de ${AUDIO_DIAS} dias em _investigations/: ${audios.length} ${audios.length === 1 ? 'arquivo' : 'arquivos'}, ${tamanho(soAudio)} (use --audio junto com --apagar)`] : []),
  ];
}

export const MSG = {
  nada: (nome, manter) => `Não há execução para limpar na crew ${nome}: ${manter === 1 ? 'a mais recente fica' : `as ${manter} mais recentes ficam`} e o resto está aberto ou sem cópia.`,
  foraDaLista: (run, motivo) => `A execução ${run} não pode ser apagada agora: ${motivo}.`,
  apagou: (run, bytes) => `Apaguei: ${run} (${tamanho(bytes)})`,
  apagouAudio: (n, bytes) => `Apaguei o áudio de ${n} ${n === 1 ? 'arquivo' : 'arquivos'} (${tamanho(bytes)})`,
  parcial: (run, motivo) => `Apaguei só parte de ${run}: ${String(motivo).replace(/\s+/g, ' ').trim()}. Feche o programa que usa a pasta e rode a limpeza de novo.`,
  atalho: (onde) => `${onde} é um atalho para outro lugar: a limpeza não segue atalho e não mexe nele.`,
  falhou: (alvo, motivo) => `Não consegui apagar ${alvo}: ${String(motivo).replace(/\s+/g, ' ').trim()}`,
};
