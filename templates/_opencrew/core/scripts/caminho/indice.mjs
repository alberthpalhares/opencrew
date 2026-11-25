import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gravarTexto } from '../estado/arquivo.mjs';
import { realDentroDe } from '../comum.mjs';

const MARCA = '<!-- Índice gerado pelo OpenCrew -->';
const link = (nome, alvo) => `[${nome.replace(/[[\]<>]/g, '')}](${alvo.split('/').map(encodeURIComponent).join('/')})`;

export async function atualizarIndice(pasta, revisoes, tema, situacao) {
  const alvo = path.join(pasta, 'INDICE.md');
  let anterior;
  try {
    if (!(await fs.lstat(alvo)).isFile()) return;
    anterior = await fs.readFile(alvo, 'utf8');
    if (!anterior.startsWith(MARCA)) return;
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
  }
  const linhas = [MARCA, '', '# Arquivos da execução', '', tema || 'Sem tema', '', `Situação: ${situacao}`, ''];
  const prefixo = `/output/${path.basename(pasta)}/`;
  for (const [nome, revisao] of Object.entries(revisoes)) {
    const rel = revisao.arquivo.split(prefixo).at(-1);
    linhas.push(`- ${link(nome, rel)} · revisão ${revisao.versao}`);
    const historico = path.join(pasta, 'historico', nome);
    if (!realDentroDe(pasta, historico)) continue;
    const entradas = await fs.readdir(historico, { withFileTypes: true }).catch(() => []);
    for (const item of entradas.filter((e) => e.isFile()).sort((a, b) => b.name.localeCompare(a.name, 'pt-BR', { numeric: true }))) {
      const versao = `historico/${nome}/${item.name}`;
      if (versao !== rel) linhas.push(`  - ${link(item.name, versao)}`);
    }
  }
  const conteudo = `${linhas.join('\n')}\n`;
  if (anterior === undefined) await fs.writeFile(alvo, conteudo, { flag: 'wx' });
  else await gravarTexto(alvo, conteudo);
}
