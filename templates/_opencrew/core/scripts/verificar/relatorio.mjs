// Relatório do verificador em markdown (PT-BR). A última linha é o status que o runner lê.
// [PREENCHER] sai como "A preencher", contado à parte: bloqueia como antes, mas só o usuário resolve
// (fase-u3a2-entrega-no-projeto.md, regra 36). Sem [PREENCHER], o relatório é o de sempre.
import { FALTA_INFO, NAO_MEDIDO, NAO_VERIFICADO } from './regras.mjs';

const ROTULO = { bloqueio: '❌ Bloqueio', alerta: '⚠️ Alerta', ok: '✅ OK' };
const A_PREENCHER = '✏️ A preencher';
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const ehNaoMedido = (i) => i.item === NAO_MEDIDO || i.item === NAO_VERIFICADO;

function tabela(medidos) {
  if (!medidos.length) return [];
  const linhas = medidos.map((i) => `| ${i.item.replace(/\|/g, '\\|')} | ${i.medido} | ${i.minimo ? '≥' : '≤'} ${i.limite} | ${ROTULO[i.nivel]} |`);
  return ['| Item | Medido | Limite | Resultado |', '|---|---|---|---|', ...linhas];
}

/** "Não medido" e "Não verificado" começam por ⚠️ quando são alerta e por ⚪ quando não têm nível. */
function linhaDoAchado(i) {
  if (ehNaoMedido(i)) return `- ${i.nivel === 'alerta' ? '⚠️' : '⚪'} ${i.item} — ${i.detalhe}`;
  return `- ${i.item === FALTA_INFO ? A_PREENCHER : ROTULO[i.nivel]} — ${i.item}: "${i.detalhe}"`;
}

function secaoDoArquivo(a) {
  const medidos = tabela(a.itens.filter((i) => i.medido != null));
  const achados = a.itens.filter((i) => i.medido == null).map(linhaDoAchado);
  if (a.fecho) achados.push(`- ${a.fecho}`);
  const entre = medidos.length && achados.length ? [''] : [];
  return [`### ${a.arquivo}`, '', ...medidos, ...entre, ...achados, ''];
}

/** @param {object} r resultado de `verificar()` */
export function formatarRelatorio(r) {
  const naoTexto = r.naoTexto ?? [];
  const notas = [...r.notas];
  if (naoTexto.length) notas.push(`⚪ ${NAO_VERIFICADO} — não é texto (${naoTexto.length}): ${naoTexto.join(', ')}`);
  const aPreencher = r.aPreencher ?? 0;
  const resumo = [
    plural(r.bloqueios - aPreencher, 'bloqueio', 'bloqueios'), ...(aPreencher ? [`${aPreencher} a preencher`] : []),
    plural(r.alertas, 'alerta', 'alertas'), plural(r.naoMedidos ?? 0, 'não medido', 'não medidos'),
  ];
  return [
    '## Verificação automática',
    '',
    ...r.arquivos.flatMap(secaoDoArquivo),
    ...(notas.length ? ['**Notas:**', ...notas.map((n) => `- ${n}`), ''] : []),
    `**Resumo: ${resumo.join(', ')}**`,
    '',
    `VERIFICACAO:${r.status}`,
  ].join('\n');
}
