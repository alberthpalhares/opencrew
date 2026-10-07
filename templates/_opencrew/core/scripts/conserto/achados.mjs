// O diagnóstico do conserto: o que falta numa crew para as melhorias do runtime valerem nela.
// Cada achado tem um código e as linhas, em PT-BR fixo, que o usuário lê. Só leitura.
// Spec: fase-u4a-conserto-de-crews.md, §4 e regras 5, 6 e 9 (repositório do OpenCrew).
import path from 'node:path';
import { lerFrontmatter, semBom } from '../verificar/leitura.mjs';
import { itensDeProibicao } from '../verificar/proibicoes.mjs';
import { idDoAgente, lerBruto, listaDe } from './crew.mjs';
import { lerCsv } from './edicoes.mjs';

const EXPORTACAO = new Set(['pdf', 'csv', 'formatted-post']);
const plural = (n, um, varios) => (n === 1 ? um : varios);
const editar = (crew) => `Resolve-se editando a crew: /opencrew edit ${crew.nome}`;
const irreversivel = (passo) => passo.dados.side_effects === 'irreversible';
const revisoes = (crew) => crew.passos.filter((p) => p.revisao);

function manifesto(crew) {
  if (!crew.agentes.length) return null;
  const { colunas, linhas } = lerCsv(crew.csv);
  const semNome = (l) => !l.displayName || l.displayName.toLowerCase() === (l.title ?? '').toLowerCase();
  if (crew.csv !== null && colunas.includes('displayName') && !linhas.some(semNome)) return null;
  return ['O arquivo de nomes da crew (crew-party.csv) está incompleto: aparece a função no lugar do nome.', 'Para consertar: --aplicar "manifesto"'];
}

function nomeDeAgente(crew) {
  const semNome = crew.agentes.filter((a) => String(a.dados.name ?? '').trim().split(/\s+/).filter(Boolean).length < 2);
  if (!semNome.length) return null;
  const n = semNome.length;
  return [
    `${n} ${plural(n, 'agente', 'agentes')} sem nome de duas palavras.`,
    ...semNome.map((a) => `${a.id} (name: "${a.dados.name ?? ''}")`),
    'Para consertar: --aplicar "nome:<agente>=<Nome Sobrenome>" e depois --aplicar "manifesto"',
  ];
}

/** Os passos que o verificador mede: do passo de `on_reject` até o anterior à revisão (regra 6). */
function medidos(crew) {
  const dentro = new Set();
  for (const revisao of revisoes(crew)) {
    const de = crew.passos.findIndex((p) => p.numero === revisao.volta);
    const ate = crew.passos.indexOf(revisao);
    if (de >= 0) crew.passos.slice(de, ate).forEach((p) => dentro.add(p));
  }
  return crew.passos.filter((p) => dentro.has(p) && p.arquivo && !p.checkpoint && !p.revisao);
}

const semFormato = (passo) => !passo.dados.format || EXPORTACAO.has(String(passo.dados.format));
const saidaDe = (passo) => path.posix.basename(String(passo.dados.outputFile ?? passo.citado).replace(/\\/g, '/'));

function formato(crew) {
  const passos = medidos(crew).filter(semFormato);
  if (!passos.length) return null;
  const n = passos.length;
  return [
    `${n} ${plural(n, 'passo que a revisão confere não diz', 'passos que a revisão confere não dizem')} o formato do texto.`,
    `Sem o formato, o verificador mede ${plural(n, 'esse texto', 'cada um')} como post de blog.`,
    `Passos: ${passos.map((p) => `${p.numero} (${saidaDe(p)})`).join(', ')}`,
    'Para consertar: --aplicar "formato:<passo>=<formato>"',
  ];
}

function fontes(crew) {
  const linhas = semBom(crew.yaml ?? '').split(/\r?\n/);
  const inicio = linhas.findIndex((l) => /^fontes\s*:/.test(l));
  const fim = linhas.findIndex((l, i) => i > inicio && /^[^\s#-]/.test(l));
  const daLista = inicio < 0 ? [] : linhas.slice(inicio + 1, fim < 0 ? linhas.length : fim);
  if (daLista.some((l) => /^\s*(?:-\s*)?caminho\s*:\s*\S/.test(l))) return null;
  return [
    'A crew não registra os arquivos do projeto que ela precisa ler.',
    'Sem isso, ela escreve sem conhecer o que o projeto já decidiu.',
    'Para consertar: --aplicar "fonte:<caminho>=<para que>" (um por arquivo ou pasta)',
  ];
}

function proibicao(crew) {
  const pendentes = itensDeProibicao(semBom(crew.memoria ?? '')).filter((i) => i.pendente);
  if (!pendentes.length) return null;
  const n = pendentes.length;
  return [
    `${n} ${plural(n, 'proibição', 'proibições')} sem trecho entre aspas: o verificador não consegue barrar.`,
    ...pendentes.map((i) => `${i.n}. ${i.texto}`),
    'Para consertar: --aplicar "proibicao:<n>=<trecho>" ou --aplicar "proibicao:<n>=revisao-humana"',
  ];
}

/** A skill instalada no projeto declara `side_effects: irreversible`? (regra 9) */
function publica(raiz, skill) {
  const texto = lerBruto(path.join(raiz, 'skills', skill, 'SKILL.md'));
  return texto !== null && lerFrontmatter(semBom(texto))?.side_effects === 'irreversible';
}

function semMarca(crew) {
  const doPasso = (passo) => {
    const agente = crew.agentes.find((a) => a.id === idDoAgente(passo));
    const skills = [...listaDe(agente?.bruto, 'skills'), ...listaDe(passo.bruto, 'skills_needed')];
    const skill = skills.find((s) => /^[A-Za-z0-9._-]+$/.test(s) && publica(crew.raiz, s));
    return skill ? `Passo ${passo.numero} — agente ${agente?.id ?? idDoAgente(passo)}, skill ${skill}` : null;
  };
  const linhas = crew.passos.filter((p) => p.arquivo && !p.checkpoint && !irreversivel(p)).map(doPasso).filter(Boolean);
  if (!linhas.length) return null;
  const n = linhas.length;
  return [
    `${n} ${plural(n, 'passo', 'passos')} de agente que tem ferramenta de publicar ou enviar, sem a marca de passo irreversível.`,
    ...linhas,
    'Se o passo publica ou envia: --aplicar "irreversivel:<passo>"',
  ];
}

function semRevisao(crew) {
  if (revisoes(crew).length || !crew.passos.length) return null;
  return ['A crew não tem passo de revisão: nada é conferido antes de chegar a você.', editar(crew)];
}

/** Posição da última revisão e do primeiro checkpoint depois dela (-1 quando não há). */
function fecho(crew) {
  const revisao = crew.passos.indexOf(revisoes(crew).at(-1));
  const aprovacao = crew.passos.findIndex((p, i) => i > revisao && p.checkpoint);
  return { revisao, aprovacao };
}

function semAprovacaoFinal(crew) {
  const { revisao, aprovacao } = fecho(crew);
  if (revisao < 0 || aprovacao >= 0) return null;
  return ['Depois da revisão não há um ponto de aprovação seu.', editar(crew)];
}

function publicaAntes(crew) {
  const { revisao, aprovacao } = fecho(crew);
  if (revisao < 0) return null;
  const limite = aprovacao >= 0 ? aprovacao : revisao;
  const cedo = crew.passos.filter((p, i) => i < limite && irreversivel(p)).map((p) => p.numero);
  if (!cedo.length) return null;
  const quem = cedo.length === 1 ? `O passo ${cedo[0]} publica ou envia` : `Os passos ${cedo.join(', ')} publicam ou enviam`;
  return [`${quem} antes da revisão e da sua aprovação final.`, 'Enquanto estiver assim, o que sai não passou pela revisão.', editar(crew)];
}

function passoFaltando(crew) {
  const semArquivo = crew.passos.filter((p) => !p.arquivo).map((p) => `O passo ${p.numero} cita ${p.citado || 'um arquivo sem nome'}, que não existe.`);
  const existe = (numero) => crew.passos.some((p) => p.numero === numero);
  const semAlvo = revisoes(crew).filter((p) => !existe(p.volta)).map((p) => `O passo ${p.numero} manda voltar ao passo ${p.volta ?? p.dados.on_reject}, que não existe.`);
  const linhas = [...semArquivo, ...semAlvo];
  return linhas.length ? ['A sequência de passos cita o que não existe.', ...linhas, editar(crew)] : null;
}

// A ordem em que os achados aparecem (§4 da spec).
const CONFERENCIAS = [
  ['nome-de-agente', nomeDeAgente], ['manifesto', manifesto], ['formato', formato], ['fontes', fontes],
  ['proibicao', proibicao], ['irreversivel', semMarca], ['sem-revisao', semRevisao],
  ['sem-aprovacao-final', semAprovacaoFinal], ['publica-antes', publicaAntes], ['passo-faltando', passoFaltando],
];

/**
 * Os achados de uma crew, na ordem da spec.
 * @param {object} crew o que `lerCrew` devolveu
 * @returns {Array<{ codigo: string, linhas: string[] }>} a primeira linha é o título do achado
 */
export function diagnosticar(crew) {
  return CONFERENCIAS.map(([codigo, conferir]) => ({ codigo, linhas: conferir(crew) })).filter((a) => a.linhas);
}
