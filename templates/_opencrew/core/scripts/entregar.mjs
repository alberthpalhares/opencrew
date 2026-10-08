#!/usr/bin/env node
// Entrega de uma execução: separa os arquivos aprovados por canal, com texto pronto para colar e
// um LEIA-ME que diz o que fazer com cada arquivo; e copia o que está pronto para a pasta do
// projeto que o usuário escolheu.
// Uso (na pasta do projeto): node _opencrew/core/scripts/entregar.mjs --crew "crews/<crew>"
//   --run "<id>" --arquivo "<caminho=formato>[,<caminho=formato>…]" [--destino "<pasta>"]
//   [--lembrar-destino "<pasta>"|nao] [--aceitar-pendencias] [--vai-publicar <canal>] [--ajuda]
//   --arquivo: a lista do verificador (o "=formato" é opcional); entra o que estiver nela e existir.
//   --destino: pasta do projeto que recebe a cópia, só nesta chamada (vale sobre o crew.yaml).
//   --lembrar-destino: grava a pasta (ou "nao") em `entrega.destino` do crew.yaml e já vale agora.
//   --aceitar-pendencias: as pendências deste momento viram ressalvas ("entregar assim mesmo"); a
//     ressalva vale enquanto a pendência dela existir: a que some sai do `ressalvas.json`.
//   --vai-publicar: canal que a crew publica sozinha (pode repetir); o LEIA-ME avisa.
// Item de formato com a plataforma `documento` (`.md` ou `.txt`) sai em `entrega/documentos/`, em
// Word, com o perfil de documento oficial do projeto (fase-u3b-documento-word.md, regra 12).
// Grava em crews/<crew>/output/<run>/: a pasta `entrega/` (refeita do zero a cada chamada, montada
// em `entrega.tmp/`), `verificacao-entrega.md`, `ressalvas.json` (as pendências aceitas que ainda
// existem) e `copia.json` (o retrato do que foi copiado, para a comparação seguinte). Fora
// dali, só o combinado: a cópia em `<destino>/<run>/` (nunca por cima do que já está lá; se a
// entrega mudou, `<run>-reentrega-2`…) e, com --lembrar-destino, o crew.yaml (com crew.yaml.bak).
// Última linha da saída (o runner lê esta linha): ENTREGA:OK (nenhuma pendência),
// ENTREGA:COM_RESSALVA (toda pendência foi aceita) ou ENTREGA:INCOMPLETA (algum canal não está
// pronto, o destino foi recusado ou uma gravação falhou).
// Código de saída: 0 sempre que a linha ENTREGA: sai, e em --ajuda · 1 = erro de uso ou erro que
// impediu a entrega inteira; com código 1 não há linha ENTREGA: e nada é escrito.
// Specs: fase-u3a1-pasta-de-entrega.md e fase-u3a2-entrega-no-projeto.md (repositório do OpenCrew).
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { MSG as COMUM, erroDeUso, ehPrincipal, relativoAoProjeto } from './comum.mjs';
import { formatarRelatorio, verificar } from './verificar.mjs';
import { USO, lerArgs, lerLista, limpar, runValido } from './entrega/argumentos.mjs';
import { CANAIS, canalDoFormato, ehCanal, ehDeServico } from './entrega/canais.mjs';
import { MSG as DESTINO, escolherDestino, validarDestino } from './entrega/destino.mjs';
import { DOCUMENTOS, converterDocumentos, naoConferidoDoWord } from './entrega/documentos.mjs';
import { MSG as COPIA, guardar } from './entrega/guardar.mjs';
import { gravarEntrega } from './entrega/gravar.mjs';
import { montarLeiame } from './entrega/leiame.mjs';
import { lerRegistro } from './execucao/registro.mjs';
import { lembrarDestino } from './entrega/lembrar.mjs';
import { nomear } from './entrega/nomes.mjs';
import { alertasDeTamanho, naoConferido, pendenciasPorPasta } from './entrega/pendencias.mjs';
import { ARQUIVO as RESSALVAS, MSG as RESSALVA, gravarRessalvas, lerRessalvas, separarPendencias } from './entrega/ressalvas.mjs';
import { resumo } from './entrega/resumo.mjs';
import { separar } from './entrega/separar.mjs';

const MSG = {
  desconhecida: (opcao) => `Opção desconhecida: ${limpar(opcao)}.`,
  semExecucao: (run, lista) => `Execução não encontrada: ${limpar(run)}. Execuções desta crew: ${lista.join(', ') || 'nenhuma'}.`,
  nenhumArquivo: 'Nenhum arquivo da lista foi encontrado.',
  deServico: (arquivo) => `${arquivo} é arquivo de serviço e não entra na entrega.`,
  semCanal: (canal) => `Canal não encontrado nesta entrega: ${limpar(canal)}.`,
};

const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();
const tipoNoDisco = (p) => (!existsSync(p) ? 'ausente' : statSync(p).isDirectory() ? 'pasta' : 'arquivo');
const execucoes = (saida) => (ehPasta(saida) ? readdirSync(saida, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : []);

/** Erro de uso, na ordem da §6: `{ mensagem, comUso }`, ou null quando a chamada está certa. */
function erroDeChamada(raiz, args, pedidos) {
  if (args.desconhecida) return { mensagem: MSG.desconhecida(args.desconhecida), comUso: true };
  const faltando = [['--crew', args.crew], ['--run', args.run], ['--arquivo', pedidos.length]].filter(([, v]) => !v).map(([opcao]) => opcao);
  const comum = erroDeUso({ raiz, faltando, crew: args.crew, caminhos: pedidos.map((p) => p.arquivo) });
  if (comum) return { mensagem: comum, comUso: faltando.length > 0 };
  const crew = path.resolve(raiz, args.crew);
  if (!existsSync(path.join(crew, 'crew.yaml'))) return { mensagem: COMUM.crewNaoEncontrada(args.crew) };
  const saida = path.join(crew, 'output');
  if (!runValido(args.run) || !ehPasta(path.join(saida, args.run))) return { mensagem: MSG.semExecucao(args.run, execucoes(saida)) };
  // O destino a lembrar é validado antes de qualquer escrita: recusado, o crew.yaml fica intacto.
  const lembrar = args.lembrarDestino == null ? null : validarDestino(raiz, args.lembrarDestino);
  return lembrar?.tipo === 'recusado' ? { mensagem: DESTINO.recusado(lembrar.valor) } : null;
}

/** Cada item da lista, uma vez: onde fica, se existe, se é de serviço e qual é o canal do formato. */
async function classificar(raiz, pedidos) {
  const itens = [];
  const vistos = new Set();
  for (const { arquivo, formato } of pedidos) {
    const abs = path.resolve(raiz, arquivo);
    if (vistos.has(`${abs}|${formato ?? ''}`)) continue;
    vistos.add(`${abs}|${formato ?? ''}`);
    const rel = relativoAoProjeto(raiz, arquivo);
    itens.push({ arquivo, formato, abs, rel, tipo: tipoNoDisco(abs), servico: ehDeServico(rel), canal: await canalDoFormato(raiz, formato) });
  }
  return itens;
}

/** Verifica na origem, separa por canal e monta tudo o que a entrega mostra; não escreve nada. */
async function montar(raiz, args, itens, aceitas) {
  const arquivosDaLista = itens.map((i) => (i.formato ? { arquivo: i.arquivo, formato: i.formato } : i.arquivo));
  const verificacao = await verificar({ raiz, crew: args.crew, arquivos: arquivosDaLista, semPadraoDeBlog: true });
  const separados = await converterDocumentos(raiz, await separar(itens), args.gerarDocx);
  const { arquivos, avisos } = nomear(separados.produtos);
  const todas = pendenciasPorPasta(raiz, itens, verificacao);
  // O texto que não virou Word é pendência de `documentos` (fase-u3b-documento-word.md, regra 12).
  if (separados.pendencias.length) todas.set(DOCUMENTOS, [...(todas.get(DOCUMENTOS) ?? []), ...separados.pendencias]);
  const presentes = new Set([...arquivos.map((a) => a.pasta), ...todas.keys()]);
  const dados = {
    crew: path.basename(path.resolve(raiz, args.crew)), run: args.run, arquivos, avisos,
    tema: (await lerRegistro(path.resolve(raiz, args.crew, 'output', args.run)))?.tema ?? '',
    ...separarPendencias(todas, aceitas, args.aceitar),
    pastas: Object.keys(CANAIS).filter((c) => presentes.has(c)),
    alertas: await alertasDeTamanho(raiz, itens, arquivos, verificacao),
    naoConferido: [...naoConferido(raiz, itens, verificacao), ...naoConferidoDoWord(arquivos)],
    vaiPublicar: args.vaiPublicar,
  };
  return { dados, relatorio: `${formatarRelatorio(verificacao)}\n` };
}

/** O que a entrega grava, na ordem: crew.yaml, ressalvas, a cópia e, por último, `entrega/`. */
async function gravarTudo(raiz, args, validos, pastas) {
  const falhas = [args.lembrarDestino == null ? null : await lembrarDestino(raiz, pastas.crew, validarDestino(raiz, args.lembrarDestino))];
  const lidas = await lerRessalvas(pastas.execucao);
  const { dados, relatorio } = await montar(raiz, args, validos, lidas.aceitas);
  // Ilegível, o arquivo fica como está — só um aceite novo o regrava.
  if (!lidas.ilegivel || (args.aceitar && dados.ressalvas.size)) falhas.push(await gravarRessalvas(pastas.execucao, dados.ressalvas));
  const copia = await guardar(raiz, await escolherDestino(raiz, pastas.crew, args), dados, pastas.execucao);
  const leiame = montarLeiame({ ...dados, copiaEm: copia.pasta });
  const daEntrega = await gravarEntrega(pastas.execucao, dados.arquivos, { leiame, relatorio });
  const naoGravados = falhas.filter(Boolean).map((f) => COPIA.falhaDeEscrita(relativoAoProjeto(raiz, f)));
  return { dados, copia, lidas, naoGravados, daEntrega: daEntrega && COPIA.falhaDeEscrita(relativoAoProjeto(raiz, daEntrega)) };
}

function linhaFinal(dados, incompleta) {
  if (incompleta || dados.pendencias.size) return 'ENTREGA:INCOMPLETA';
  return dados.ressalvas.size ? 'ENTREGA:COM_RESSALVA' : 'ENTREGA:OK';
}

async function entregar(raiz, args, itens, escrever) {
  const execucao = relativoAoProjeto(raiz, path.join(args.crew, 'output', args.run));
  const pastas = { crew: path.resolve(raiz, args.crew), execucao: path.resolve(raiz, execucao) };
  const r = await gravarTudo(raiz, args, itens.filter((i) => !i.servico), pastas);
  if (r.daEntrega) {
    for (const linha of [...r.naoGravados, r.daEntrega]) escrever(linha);
    escrever('ENTREGA:INCOMPLETA');
    return 0;
  }
  const notas = [
    ...(r.lidas.ilegivel ? [RESSALVA.ilegivel(`${execucao}/${RESSALVAS}`)] : []), ...r.dados.novas,
    ...itens.filter((i) => i.servico).map((i) => MSG.deServico(i.rel)),
  ];
  for (const linha of resumo(execucao, r.dados, notas, [...r.naoGravados, ...r.copia.linhas])) escrever(linha);
  escrever(linhaFinal(r.dados, r.copia.falhou || r.naoGravados.length > 0));
  return 0;
}

/**
 * @param {string[]} argv
 * @param {object} [deps] `cwd` (a pasta do projeto), `escrever` e `gerarDocx` (quem monta o Word
 *   de um documento oficial; sem ele, o do `documento.mjs`)
 * @returns {Promise<number>} 0 = a linha `ENTREGA:` saiu (ou `--ajuda`) · 1 = erro de uso, ou erro
 *   que impediu a entrega inteira (uma linha em PT-BR, sem linha `ENTREGA:`, nada escrito)
 */
export async function main(argv, { cwd = process.cwd(), escrever = (s) => process.stdout.write(`${s}\n`), gerarDocx } = {}) {
  const args = { ...lerArgs(argv), gerarDocx };
  const sair = (...linhas) => linhas.forEach((l) => escrever(l)) ?? 1;
  if (args.ajuda) return sair(USO) && 0;
  const pedidos = lerLista(args.arquivos);
  const erro = erroDeChamada(cwd, args, pedidos);
  if (erro) return sair(erro.mensagem, ...(erro.comUso ? [USO] : []));
  try {
    const itens = await classificar(cwd, pedidos);
    const validos = itens.filter((i) => !i.servico);
    if (!validos.some((i) => i.tipo === 'arquivo')) return sair(MSG.nenhumArquivo);
    const canais = new Set(validos.map((i) => i.canal));
    const fora = args.vaiPublicar.find((canal) => !ehCanal(canal) || !canais.has(canal));
    if (fora !== undefined) return sair(MSG.semCanal(fora));
    return await entregar(cwd, args, itens, escrever);
  } catch (erroGeral) {
    return sair(`Não consegui montar a entrega: ${limpar(erroGeral?.message ?? erroGeral)}`);
  }
}

if (ehPrincipal(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}