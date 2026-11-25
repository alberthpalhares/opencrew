import { promises as fs } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { gravarTexto } from '../estado/arquivo.mjs';
import { ARQUIVO, comPasso, gravarRegistro, lerParaGravar } from '../execucao/registro.mjs';
import { comTrava } from '../trava.mjs';
import { atualizarIndice } from './indice.mjs';
import { hash, iniciarConsolidacao, recuperarConsolidacao } from './transacao.mjs';

const relativo = (base, arquivo) => path.relative(base, arquivo).split(path.sep).join('/');

function dentro(pasta, arquivo) {
  if (!realDentroDe(pasta, arquivo)) throw new Error('Arquivo fora da pasta da execução.');
  return arquivo;
}

export async function reservarRevisao(raiz, exec, locais) {
  const pasta = path.resolve(raiz, exec);
  dentro(raiz, pasta);
  const rascunhos = dentro(pasta, path.join(pasta, 'rascunhos'));
  await fs.mkdir(rascunhos, { recursive: true });
  const tentativa = await fs.mkdtemp(path.join(rascunhos, 'passo-'));
  const arquivos = [];
  for (const { grupo, nome } of locais) {
    const alvo = dentro(tentativa, path.join(tentativa, relativo(pasta, path.resolve(raiz, grupo)), nome));
    await fs.mkdir(path.dirname(alvo), { recursive: true });
    arquivos.push(relativo(raiz, alvo));
  }
  await fs.writeFile(path.join(tentativa, '.lote.json'), JSON.stringify(arquivos), { flag: 'wx' });
  return arquivos;
}

export async function reservarSaidas(raiz, exec, nomes, locais) {
  const reservados = await reservarRevisao(raiz, exec, locais.filter(Boolean));
  let i = 0;
  return nomes.map((nome, pos) => locais[pos] ? reservados[i++] : nome);
}

async function bytesDe(arquivo) {
  try {
    if (!(await fs.lstat(arquivo)).isFile()) throw new Error('O caminho não é um arquivo regular.');
    return await fs.readFile(arquivo);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

function identificar(raiz, pasta, caminho) {
  const fonte = dentro(pasta, path.resolve(raiz, caminho));
  const [grupo, tentativa, ...partes] = relativo(pasta, fonte).split('/');
  if (grupo !== 'rascunhos' || !tentativa?.startsWith('passo-') || !partes.length) throw new Error('Tentativa inválida.');
  return { fonte, tentativa, nome: partes.join('/') };
}

async function preparar(raiz, pasta, { fonte, nome }, revisoes) {
    const bytes = await bytesDe(fonte);
    if (!bytes?.length) throw new Error('Arquivo ausente ou vazio.');
    const atual = dentro(pasta, path.join(pasta, 'atuais', nome));
    const anterior = await bytesDe(atual);
    const previa = Object.hasOwn(revisoes, nome) ? revisoes[nome] : null;
    const versao = (previa?.versao ?? 0) + 1;
    const preservado = anterior && hash(anterior) !== previa?.hash;
    const historico = dentro(pasta, path.join(pasta, 'historico', nome));
    const cache = dentro(pasta, path.join(pasta, '.conferidos', nome));
    const assinatura = hash(bytes);
    const anteriorCache = /^[a-f0-9]{64}$/.test(previa?.hash) ? dentro(pasta, path.join(cache, previa.hash)) : null;
    const conferido = anteriorCache ? (await bytesDe(anteriorCache)) ?? (!preservado ? anterior : null) : null;
    await fs.mkdir(path.dirname(atual), { recursive: true });
    if (conferido || preservado) await fs.mkdir(historico, { recursive: true });
    const numerado = (numero) => path.join(historico, `${numero}${path.extname(nome)}`);
    const arquivoAnterior = conferido ? numerado(versao - 1) : null;
    if (arquivoAnterior) {
      const existente = await bytesDe(arquivoAnterior);
      if (!existente) await fs.writeFile(arquivoAnterior, conferido, { flag: 'wx' });
      else if (!existente.equals(conferido)) throw new Error('A revisão anterior já existe com outro conteúdo.');
    }
    const cacheAtual = dentro(pasta, path.join(cache, assinatura));
    await fs.mkdir(cache, { recursive: true });
    const memorizado = await bytesDe(cacheAtual);
    if (!memorizado) await fs.writeFile(cacheAtual, bytes, { flag: 'wx' });
    else if (!memorizado.equals(bytes)) throw new Error('A cópia de conferência está diferente.');
    const destino = preservado ? numerado(versao) : atual;
    const arquivo = relativo(raiz, destino);
    return { nome, destino, substituir: anterior && !preservado, bytes, anterior, arquivoAnterior, anteriorCache: cacheAtual === anteriorCache ? null : anteriorCache, revisao: { versao, arquivo, hash: assinatura } };
}

async function limparTentativa(pasta, tentativa, itens) {
  const raizDaTentativa = path.join(pasta, 'rascunhos', tentativa);
  await fs.unlink(path.join(raizDaTentativa, '.lote.json')).catch(() => {});
  for (const { fonte } of itens) {
    await fs.unlink(fonte).catch(() => {});
    for (let dir = path.dirname(fonte); realDentroDe(raizDaTentativa, dir); dir = path.dirname(dir)) {
      const removida = await fs.rmdir(dir).then(() => true, () => false);
      if (!removida || dir === raizDaTentativa) break;
    }
  }
}

export async function consolidarRevisao(raiz, pasta, caminhos, n, em) {
  const itens = caminhos.map((caminho) => identificar(raiz, pasta, caminho));
  const tentativa = itens[0].tentativa;
  const nomes = new Set(itens.map(({ nome }) => process.platform === 'win32' ? nome.toLowerCase() : nome));
  if (nomes.size !== itens.length || itens.some((item) => item.tentativa !== tentativa)) throw new Error('As saídas devem ser distintas e da mesma tentativa.');
  return comTrava(path.join(pasta, ARQUIVO), async () => {
    const registro = await lerParaGravar(pasta);
    if (!registro?.organizada) throw new Error('Registro da execução indisponível.');
    await recuperarConsolidacao(pasta, registro);
    const manifesto = dentro(pasta, path.join(pasta, 'rascunhos', tentativa, '.lote.json'));
    const esperados = JSON.parse(await bytesDe(manifesto) ?? 'null');
    if (!Array.isArray(esperados) || esperados.length !== caminhos.length || !esperados.every((arquivo) => caminhos.includes(arquivo))) {
      throw new Error('Confirme todos os arquivos da tentativa na mesma chamada.');
    }
    const revisoes = { ...registro.revisoes };
    const mudancas = [];
    for (const item of itens) mudancas.push(await preparar(raiz, pasta, item, revisoes));
    const arquivos = mudancas.map(({ revisao }) => revisao.arquivo);
    await iniciarConsolidacao(pasta, tentativa, mudancas);
    try {
      for (const item of mudancas) {
        if (item.substituir) await gravarTexto(item.destino, item.bytes);
        else await fs.writeFile(item.destino, item.bytes, { flag: 'wx' });
        revisoes[item.nome] = item.revisao;
      }
      const novo = { ...comPasso(registro, { n, arquivo: arquivos[0], arquivos, em }), revisoes, ultimaConsolidacao: tentativa, pacoteAprovado: null, origensAprovadas: null };
      const falha = await gravarRegistro(pasta, novo);
      if (falha) throw new Error(falha);
      await recuperarConsolidacao(pasta, novo);
    } catch (erro) {
      await recuperarConsolidacao(pasta, (await lerParaGravar(pasta)) ?? registro);
      throw erro;
    }
    await limparTentativa(pasta, tentativa, itens);
    for (const { anteriorCache } of mudancas) {
      if (anteriorCache && realDentroDe(pasta, anteriorCache)) await fs.unlink(anteriorCache).catch(() => {});
    }
    await atualizarIndice(pasta, revisoes, registro.tema, 'Conferido').catch(() => {});
    return arquivos;
  });
}
