// `--aplicar`: valida todos os itens, monta as mudanças em memória e só então grava — cada arquivo
// alterado ganha antes uma cópia `.bak` (a que já existe fica). Um item recusado: nada é gravado.
// Spec: fase-u4a-conserto-de-crews.md, regras 1 a 4 e 7 (repositório do OpenCrew).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { dentroDoProjeto } from '../comum.mjs';
import { lerFrontmatter, semAcento, semBom } from '../verificar/leitura.mjs';
import { ehRevisaoHumana, itensDeProibicao, lerLinha } from '../verificar/proibicoes.mjs';
import { comChave, comFonte, comSufixo, comTitulo, montarCsv } from './edicoes.mjs';
import { erroAntesDeGravar } from './gravar.mjs';

const MSG = {
  semValor: (item) => `Sobra ou falta valor em --aplicar "${item.escrito}". Veja os itens com --ajuda.`,
  semPasso: (item) => `Passo não encontrado em --aplicar "${item.escrito}".`,
  checkpoint: (n, item) => `O passo ${n} é um ponto de aprovação: --aplicar "${item.escrito}" não vale para ele.`,
  semFrontmatter: (n) => `Não altero o passo ${n}: o arquivo não tem o bloco de campos no começo (entre linhas ---), ou o campo ocupa mais de uma linha. Ajuste pela edição da crew.`,
  fontesNaLinha: 'Não altero o `crew.yaml`: a lista `fontes:` está escrita numa linha só. Ajuste pela edição da crew.',
  trechoIlegivel: 'O verificador não consegue ler esse trecho como trava: use até 200 caracteres, sem crase nem aspas.',
  semFormato: (id) => `Formato "${id}" não encontrado em \`_opencrew/best-practices.local/\` nem em \`_opencrew/core/best-practices/\`.`,
  fonteAbsoluta: (c) => `A fonte tem de ser um caminho relativo à pasta do projeto: ${c}`,
  fonteFora: (c) => `Caminho fora do projeto: ${c}`,
  fonteAusente: (c) => `Não encontrei no projeto: ${c}`,
  semAgentes: 'A crew não tem agentes em `agents/`: não há de onde refazer o crew-party.csv.',
  semAgente: (item) => `Agente não encontrado em --aplicar "${item.escrito}".`,
  nomeCurto: 'O nome do agente tem duas palavras (nome e sobrenome), sem aspas.',
  jaTemNome: (id, nome) => `O agente ${id} já tem nome: ${nome}. Para trocar, use /opencrew edit.`,
  semFrontmatterDoAgente: (id) => `Não altero o agente ${id}: o arquivo não tem o bloco de campos no começo (entre linhas ---), ou o campo name ocupa mais de uma linha.`,
  semItem: (item) => `Item de proibição não encontrado em --aplicar "${item.escrito}".`,
  jaResolvido: (n) => `A proibição ${n} já tem trecho entre aspas ou já está marcada como revisão humana.`,
  comAspas: 'O trecho da trava não pode ter aspas duplas.',
  foraDoItem: (n, trecho) => `O trecho "${trecho}" não aparece na proibição ${n}.`,
};

/** As mudanças em memória: por arquivo, o texto do disco (`antes`) e o texto novo (`depois`). */
function novoPlano() {
  const arquivos = new Map();
  const plano = {
    arquivos,
    trocas: 0,
    texto: (arquivo, doDisco) => (arquivos.has(arquivo) ? arquivos.get(arquivo).depois : doDisco),
    /** Texto igual ao que já está no plano não conta como troca. Devolve null (não há erro). */
    trocar(arquivo, doDisco, depois) {
      if (depois === plano.texto(arquivo, doDisco)) return null;
      arquivos.set(arquivo, { antes: arquivos.has(arquivo) ? arquivos.get(arquivo).antes : doDisco, depois });
      plano.trocas += 1;
      return null;
    },
  };
  return plano;
}

function passoDe(crew, item) {
  const passo = /^\d+$/.test(item.alvo) ? crew.passos.find((p) => p.numero === Number(item.alvo)) : null;
  if (!passo?.arquivo) return { erro: MSG.semPasso(item) };
  return passo.checkpoint ? { erro: MSG.checkpoint(passo.numero, item) } : { passo };
}

const formatoExiste = (raiz, id) => [['best-practices.local'], ['core', 'best-practices']].some((p) => existsSync(path.join(raiz, '_opencrew', ...p, `${id}.md`)));

function formato(crew, item, plano) {
  const { passo, erro } = passoDe(crew, item);
  if (erro) return erro;
  if (!/^[a-z0-9-]+$/.test(item.valor) || !formatoExiste(crew.raiz, item.valor)) return MSG.semFormato(item.valor);
  const novo = comChave(plano.texto(passo.arquivo, passo.bruto), 'format', item.valor, 'agent');
  return novo === null ? MSG.semFrontmatter(passo.numero) : plano.trocar(passo.arquivo, passo.bruto, novo);
}

function irreversivel(crew, item, plano) {
  const { passo, erro } = passoDe(crew, item);
  if (erro) return erro;
  if (item.valor) return MSG.semValor(item);
  const inline = comChave(plano.texto(passo.arquivo, passo.bruto), 'execution', 'inline');
  const marcado = inline === null ? null : comChave(inline, 'side_effects', 'irreversible');
  return marcado === null ? MSG.semFrontmatter(passo.numero) : plano.trocar(passo.arquivo, passo.bruto, marcado);
}

const ehAbsoluto = (c) => path.isAbsolute(c) || /^[A-Za-z]:/.test(c) || /^[\\/]/.test(c);

function fonte(crew, item, plano) {
  if (!item.alvo || !item.valor) return MSG.semValor(item);
  if (ehAbsoluto(item.alvo)) return MSG.fonteAbsoluta(item.alvo);
  if (!dentroDoProjeto(crew.raiz, item.alvo)) return MSG.fonteFora(item.alvo);
  if (!existsSync(path.resolve(crew.raiz, item.alvo))) return MSG.fonteAusente(item.alvo);
  const caminho = item.alvo.replace(/\\/g, '/');
  const novo = comFonte(plano.texto(crew.arquivos.yaml, crew.yaml), caminho, item.valor);
  return novo === null ? MSG.fontesNaLinha : plano.trocar(crew.arquivos.yaml, crew.yaml, novo);
}

function manifesto(crew, item, plano) {
  if (item.alvo || item.valor) return MSG.semValor(item);
  if (!crew.agentes.length) return MSG.semAgentes;
  const { csv } = crew.arquivos;
  // Os agentes como ficam depois dos itens anteriores desta chamada (um `nome:` antes do `manifesto`).
  const agentes = crew.agentes.map((a) => ({ ...a, dados: lerFrontmatter(semBom(plano.texto(a.arquivo, a.bruto))) ?? {} }));
  return plano.trocar(csv, crew.csv, montarCsv(agentes, plano.texto(csv, crew.csv)));
}

const palavras = (nome) => String(nome ?? '').trim().split(/\s+/).filter(Boolean);

/** O nome de duas palavras no `name:` do agente e no título do arquivo (a primeira linha `# …`). */
function nome(crew, item, plano) {
  const agente = crew.agentes.find((a) => a.id === item.alvo);
  if (!agente) return MSG.semAgente(item);
  if (palavras(item.valor).length < 2 || /["\r\n]/.test(item.valor)) return MSG.nomeCurto;
  if (agente.dados.name === item.valor) return null;
  if (palavras(agente.dados.name).length >= 2) return MSG.jaTemNome(agente.id, agente.dados.name);
  const comNome = comChave(plano.texto(agente.arquivo, agente.bruto), 'name', JSON.stringify(item.valor));
  if (comNome === null) return MSG.semFrontmatterDoAgente(agente.id);
  return plano.trocar(agente.arquivo, agente.bruto, comTitulo(comNome, item.valor));
}

/** Por que o item não pode ganhar a marca pedida, ou null. */
function recusaDaProibicao(alvo, item, humano) {
  if (!alvo.pendente) return MSG.jaResolvido(alvo.n);
  if (humano) return null;
  if (item.valor.includes('"')) return MSG.comAspas;
  return semAcento(alvo.texto).includes(semAcento(item.valor)) ? null : MSG.foraDoItem(alvo.n, item.valor);
}

function proibicao(crew, item, plano) {
  const { memoria } = crew.arquivos;
  const texto = plano.texto(memoria, crew.memoria) ?? '';
  const alvo = itensDeProibicao(semBom(texto)).find((i) => String(i.n) === item.alvo);
  if (!alvo || !item.valor) return MSG.semItem(item);
  const humano = item.valor === 'revisao-humana';
  const linha = texto.split(/\r?\n/)[alvo.indice];
  if (humano ? ehRevisaoHumana(linha) : linha.includes(`"${item.valor}"`)) return null;
  const recusa = recusaDaProibicao(alvo, item, humano);
  if (recusa) return recusa;
  const novo = comSufixo(texto, alvo.indice, humano ? ' (revisão humana)' : ` — trava: "${item.valor}"`);
  // A trava só vale se o verificador a lê de volta, igual (crase, aspa solta e trecho longo quebram a leitura).
  const lido = lerLinha(novo.split(/\r?\n/)[alvo.indice]);
  if (!humano && !(lido.proibidos.includes(item.valor) && lido.preferidos.length === 0)) return MSG.trechoIlegivel;
  return plano.trocar(memoria, crew.memoria, novo);
}

const ACOES = { manifesto, nome, formato, fonte, proibicao, irreversivel };

/**
 * Valida os itens e monta as mudanças, sem gravar.
 * @returns {{ erro: string } | { mudancas: Array<{ arquivo, antes, depois }>, iguais: string[] }}
 *   `iguais`: os itens que não mudaram nada (já estava assim)
 */
export function planejar(crew, itens) {
  const plano = novoPlano();
  const iguais = [];
  for (const item of itens) {
    const antes = plano.trocas;
    const erro = ACOES[item.tipo](crew, item, plano);
    if (erro) return { erro };
    if (plano.trocas === antes) iguais.push(item.escrito);
  }
  const mudancas = [...plano.arquivos].map(([arquivo, m]) => ({ arquivo, ...m })).filter((m) => m.depois !== m.antes);
  const erro = erroAntesDeGravar(crew.raiz, mudancas);
  return erro ? { erro } : { mudancas, iguais };
}
