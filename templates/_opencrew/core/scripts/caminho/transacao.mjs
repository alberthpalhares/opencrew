import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { gravarTexto } from '../estado/arquivo.mjs';
import { ARQUIVO, lerParaGravar, lerRegistro } from '../execucao/registro.mjs';
import { comTrava } from '../trava.mjs';

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const diario = (pasta) => path.join(pasta, '.consolidacao.json');

function resolver(pasta, rel, area) {
  if (typeof rel !== 'string' || rel.includes('\\') || !rel.startsWith(`${area}/`) || rel.split('/').some((parte) => parte === '..' || parte === '.')) {
    throw new Error('Caminho inválido no registro de consolidação.');
  }
  const arquivo = path.resolve(pasta, rel);
  if (!realDentroDe(pasta, arquivo)) throw new Error('Caminho fora da execução.');
  return arquivo;
}

async function ler(arquivo) {
  try {
    if (!(await fs.lstat(arquivo)).isFile()) throw new Error('O caminho não é um arquivo regular.');
    return await fs.readFile(arquivo);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

export async function iniciarConsolidacao(pasta, tentativa, mudancas) {
  const rel = (arquivo) => path.relative(pasta, arquivo).split(path.sep).join('/');
  const itens = mudancas.map((item) => ({
    destino: rel(item.destino), novo: item.revisao.hash,
    anterior: item.substituir ? rel(item.arquivoAnterior) : null,
    hashAnterior: item.substituir ? hash(item.anterior) : null,
  }));
  await gravarTexto(diario(pasta), JSON.stringify({ tentativa, itens }));
}

export async function recuperarConsolidacao(pasta, registro) {
  const bytes = await ler(diario(pasta));
  if (!bytes) return;
  const { tentativa, itens } = JSON.parse(bytes.toString('utf8'));
  if (registro.ultimaConsolidacao !== tentativa) {
    for (const item of itens) {
      const area = item.destino.startsWith('atuais/') ? 'atuais' : 'historico';
      const destino = resolver(pasta, item.destino, area);
      const atual = await ler(destino);
      if (!atual || hash(atual) !== item.novo) continue;
      if (!item.anterior) {
        await fs.unlink(destino);
        continue;
      }
      const anterior = await ler(resolver(pasta, item.anterior, 'historico'));
      if (!anterior || hash(anterior) !== item.hashAnterior) throw new Error('A revisão anterior não pôde ser recuperada.');
      await gravarTexto(destino, anterior);
    }
  }
  await fs.unlink(diario(pasta));
}

export async function lerAposConsolidacao(pasta) {
  if (!(await fs.lstat(diario(pasta)).catch((erro) => {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }))) return lerRegistro(pasta);
  return comTrava(path.join(pasta, ARQUIVO), async () => {
    const registro = await lerParaGravar(pasta);
    if (registro?.organizada) await recuperarConsolidacao(pasta, registro);
    return registro;
  });
}
