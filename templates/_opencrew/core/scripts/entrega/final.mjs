import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ehDeRede, realDentroDe } from '../comum.mjs';
import { gravarTexto } from '../estado/arquivo.mjs';
import { ARQUIVO, gravarRegistro, lerParaGravar, novoRegistro } from '../execucao/registro.mjs';
import { comTrava } from '../trava.mjs';
import { destinoDoTexto, validarDestino } from './destino.mjs';
import { atualizarIndice } from '../caminho/indice.mjs';
import { recuperarConsolidacao } from '../caminho/transacao.mjs';

const hash = (dados) => createHash('sha256').update(dados).digest('hex');
const sugestao = (pasta) => path.resolve(pasta, '..', '.destino-entrega.json');

async function arquivos(pasta, prefixo = '') {
  if (!(await fs.lstat(pasta)).isDirectory()) throw new Error('Pasta da entrega indisponível.');
  const itens = [];
  for (const e of await fs.readdir(pasta, { withFileTypes: true })) {
    const alvo = path.join(pasta, e.name);
    const nome = prefixo + e.name;
    if (e.isDirectory()) itens.push(...await arquivos(alvo, `${nome}/`));
    else if (e.isFile()) itens.push({ nome, bytes: await fs.readFile(alvo) });
    else throw new Error('O pacote contém um item que não é um arquivo regular.');
  }
  return itens.sort((a, b) => a.nome.localeCompare(b.nome));
}

async function pacote(pasta) {
  const itens = await arquivos(path.join(pasta, 'entrega'));
  const assinatura = hash(JSON.stringify(itens.map(({ nome, bytes }) => [nome, hash(bytes)])));
  return { itens, assinatura };
}

export async function conferirOrigens(pasta, itens) {
  if (itens.some((item) => !realDentroDe(pasta, item.abs))) throw new Error('O pacote só pode incluir arquivos desta execução.');
  const registro = await lerParaGravar(pasta);
  if (!registro?.organizada) return null;
  await recuperarConsolidacao(pasta, registro);
  const revisoes = new Map(Object.entries(registro.revisoes ?? {}).map(([nome, revisao]) => [revisao.arquivo, { nome, ...revisao }]));
  const origens = [];
  for (const item of itens) {
    const revisao = revisoes.get(item.rel);
    if (!revisao || !realDentroDe(pasta, item.abs) || !(await fs.lstat(item.abs)).isFile() || hash(await fs.readFile(item.abs)) !== revisao.hash) {
      throw new Error(`A saída ${item.rel} precisa passar novamente pela conferência.`);
    }
    origens.push(revisao);
  }
  return origens;
}

export async function registrarPacote(pasta, pronto, origensAprovadas) {
  let registro = await lerParaGravar(pasta);
  if (!registro) {
    if (!pronto) return;
    const existe = await fs.lstat(path.join(pasta, ARQUIVO)).catch((erro) => {
      if (erro.code === 'ENOENT') return null;
      throw erro;
    });
    if (existe) throw new Error('O registro antigo está ilegível. A entrega ficou na crew.');
    const run = path.basename(pasta);
    const crew = path.basename(path.dirname(path.dirname(pasta)));
    registro = { ...novoRegistro({ crew, run, em: new Date().toISOString() }), status: 'aprovada' };
  }
  const aprovado = pronto ? (await pacote(pasta)).assinatura : null;
  const erro = await gravarRegistro(pasta, { ...registro, pacoteAprovado: aprovado, origensAprovadas: aprovado ? origensAprovadas : null });
  if (erro) throw new Error(erro);
  if (registro.organizada) {
    await atualizarIndice(pasta, registro.revisoes ?? {}, registro.tema, aprovado ? 'Aprovado' : 'Aguardando aprovação');
  }
}

async function destinoFinal(raiz, valor) {
  if (!valor || ehDeRede(valor) || [...valor].some((c) => c.charCodeAt(0) < 32)) throw new Error('Informe uma pasta de destino válida.');
  if (!path.isAbsolute(valor)) {
    const destino = validarDestino(raiz, valor);
    if (destino.tipo !== 'pasta') throw new Error('O destino relativo precisa ficar dentro do projeto.');
    await fs.mkdir(destino.abs, { recursive: true });
    return fs.realpath(destino.abs);
  }
  const canonico = await fs.realpath(valor);
  if (path.parse(canonico).root === canonico || !(await fs.stat(canonico)).isDirectory()) throw new Error('Escolha uma pasta existente.');
  if (realDentroDe(raiz, canonico) && validarDestino(raiz, path.relative(raiz, canonico)).tipo !== 'pasta') {
    throw new Error('Área reservada do projeto.');
  }
  return canonico;
}

export async function sugerirDestino(pasta, crew) {
  const anteriores = [];
  if ((await fs.lstat(sugestao(pasta)).catch(() => null))?.isFile()) {
    const local = await fs.readFile(sugestao(pasta), 'utf8').then(JSON.parse).catch(() => null);
    if (typeof local?.destino === 'string') anteriores.push(local.destino);
  }
  const legado = destinoDoTexto(await fs.readFile(path.join(crew, 'crew.yaml'), 'utf8'));
  if (legado && !/^(?:não|nao|no)$/i.test(legado) && !anteriores.includes(legado)) anteriores.push(legado);
  return anteriores;
}

async function reservar(destino, nome) {
  for (let n = 1; ; n++) {
    const pasta = path.join(destino, n === 1 ? nome : `${nome}-reentrega-${n}`);
    try {
      await fs.mkdir(pasta);
      return pasta;
    } catch (erro) {
      if (erro.code !== 'EEXIST') throw erro;
    }
  }
}

async function copiarArquivos(pasta, itens) {
  const gravados = [];
  const criadas = [pasta];
  try {
    for (const { nome, bytes } of itens) {
      const alvo = path.join(pasta, nome);
      if (!realDentroDe(pasta, alvo)) throw new Error('O arquivo da cópia fica fora do destino.');
      await criarPastas(pasta, path.dirname(alvo), criadas);
      const arquivo = await fs.open(alvo, 'wx');
      gravados.push(alvo);
      try {
        await arquivo.writeFile(bytes);
      } finally {
        await arquivo.close();
      }
    }
  } catch (erro) {
    for (const alvo of gravados) {
      if (realDentroDe(pasta, alvo)) await fs.unlink(alvo).catch(() => {});
    }
    for (const dir of criadas.reverse()) {
      if (realDentroDe(pasta, dir)) await fs.rmdir(dir).catch(() => {});
    }
    throw erro;
  }
}

async function criarPastas(pasta, alvo, criadas) {
  if (alvo === pasta) return;
  await criarPastas(pasta, path.dirname(alvo), criadas);
  try {
    await fs.mkdir(alvo);
    criadas.push(alvo);
  } catch (erro) {
    if (erro.code !== 'EEXIST' || !(await fs.lstat(alvo)).isDirectory()) throw erro;
  }
}

export async function copiarFinal(raiz, pasta, args) {
  return comTrava(path.join(pasta, ARQUIVO), async () => {
    const registro = await lerParaGravar(pasta);
    if (!registro?.pacoteAprovado || ['abortada', 'rejeitada'].includes(registro.status)) throw new Error('Não há pacote aprovado para copiar.');
    const { itens, assinatura } = await pacote(pasta);
    if (assinatura !== registro.pacoteAprovado) throw new Error('O pacote mudou depois da aprovação.');
    const destino = await destinoFinal(raiz, args.destino);
    const copias = Array.isArray(registro.copiasFinais) ? registro.copiasFinais : [];
    const recibo = copias.find((item) => item.destino === destino && item.assinatura === assinatura);
    let copiada = recibo?.pasta;
    if (!copiada || !(await fs.lstat(copiada).catch(() => null))?.isDirectory() || path.dirname(copiada) !== destino) {
      const crew = path.basename(path.dirname(path.dirname(pasta)));
      copiada = await reservar(destino, `${crew}-${path.basename(pasta)}`);
      await copiarArquivos(copiada, itens);
      const erro = await gravarRegistro(pasta, { ...registro, copiasFinais: [...copias, { destino, assinatura, pasta: copiada }] });
      if (erro) throw new Error(`${erro}. Os arquivos foram gravados em ${copiada}.`);
    }
    if (args.lembrarFinal) {
      const alvo = sugestao(pasta);
      if (!realDentroDe(path.dirname(pasta), alvo)) throw new Error('A configuração local aponta para fora da crew.');
      await comTrava(alvo, () => gravarTexto(alvo, JSON.stringify({ destino })));
    }
    return copiada;
  });
}
