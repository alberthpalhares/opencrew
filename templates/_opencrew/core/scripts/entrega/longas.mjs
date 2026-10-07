// Peças que o leitor do verificador não lê: blog (`seo.txt` e `artigo.md`), e-mail (assunto,
// prévia e corpo), mensagem de WhatsApp e os tweets de uma thread (`TWEET n/N`).
// Recebem o texto do arquivo, sem BOM e com LF. Spec: fase-u3a1-pasta-de-entrega.md, §4.
import { lerFrontmatter, semAcento, semFrontmatter } from '../verificar/leitura.mjs';
import { lerPecas } from '../verificar/pecas.mjs';
import { rotuloDe } from '../verificar/secoes.mjs';
import { fecharMd, paraColar, secoesDeRotulo, semServico } from './texto.mjs';

const parte = (nome, ext, texto) => ({ nome, sufixo: '', ext, tipo: nome, texto });
const TITULO = /^#{1,6}\s+(.*)$/s;
const palavra = (formas) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${formas})(?![\\p{L}\\p{N}])`, 'u');

// ── Blog ─────────────────────────────────────────────────────────────────────────────────────
const FORA_DO_ARTIGO = new Set(['TITLE', 'TITLE TAG', 'META DESCRIPTION', 'TARGET KEYWORD']);
const emUmaLinha = (valor) => String(valor).replace(/\s+/g, ' ').trim();

/** Palavra-chave: do frontmatter; senão, o que vem depois de `Primary:` em `=== TARGET KEYWORD ===`. */
function palavraChave(fm, secoes) {
  const doRotulo = secoes.find((s) => s.rotulo === 'TARGET KEYWORD')?.texto.match(/Primary:[ \t]*([^|\n]+)/i)?.[1];
  return [fm.palavra_chave, fm.keyword, doRotulo].find((v) => v != null && typeof v !== 'object' && String(v).trim());
}

/** @returns {object[]} uma unidade com `seo.txt` (só as linhas que existem) e `artigo.md` */
export function pecasDoBlog(texto, formato) {
  const fm = lerFrontmatter(texto) ?? {};
  const secoes = secoesDeRotulo(semServico(semFrontmatter(texto)));
  const lida = (tipo) => lerPecas(texto, formato).find((p) => p.tipo === tipo)?.texto;
  const campos = [['Título', lida('titulo')], ['Meta description', lida('meta')], ['Palavra-chave', palavraChave(fm, secoes)], ['Slug', typeof fm.slug === 'object' ? null : fm.slug]];
  const seo = campos.filter(([, v]) => v != null && emUmaLinha(v)).map(([campo, v]) => `${campo}: ${emUmaLinha(v)}\n`).join('');
  const artigo = secoes.filter((s) => !FORA_DO_ARTIGO.has(s.rotulo) && s.texto).map((s) => s.texto).join('\n\n');
  return [{ tipo: 'blog', partes: [parte('seo', 'txt', seo), parte('artigo', 'md', fecharMd(artigo))] }];
}

// ── E-mail ───────────────────────────────────────────────────────────────────────────────────
const DO_ROTULO = { 'SUBJECT LINE': 'assunto', 'PREVIEW TEXT': 'previa' };
const DO_CABECALHO = [['assunto', palavra('assuntos?|subject')], ['previa', palavra('previas?|preview')], ['corpo', /^(?:corpo|body)(?![\p{L}\p{N}])/u]];

/** O que a linha abre: assunto, prévia ou corpo (linha de rótulo ou cabeçalho que nomeia); senão null. */
function papelDaLinha(linha) {
  const rotulo = rotuloDe(linha);
  if (rotulo) return DO_ROTULO[rotulo] ?? 'corpo';
  const h = linha.match(TITULO);
  return h ? DO_CABECALHO.find(([, rx]) => rx.test(semAcento(h[1]).trim()))?.[0] ?? null : null;
}

/** Tira do fim das linhas o cabeçalho que vem logo antes de um assunto: é o título do bloco. */
function tituloPendente(linhas) {
  let fim = linhas.length;
  while (fim && !linhas[fim - 1].trim()) fim--;
  const h = fim ? linhas[fim - 1].match(TITULO) : null;
  if (!h) return null;
  linhas.length = fim - 1;
  return h[1].trim();
}

/** Os e-mails do corpo, na ordem: cada assunto abre um. `[{ titulo, assunto, previa, corpo }]` (linhas). */
function lerEmails(corpo) {
  const novo = () => ({ titulo: null, assunto: [], previa: [], corpo: [] });
  const emails = [novo()];
  let alvo = 'corpo';
  for (const linha of corpo.split('\n')) {
    const papel = papelDaLinha(linha);
    if (papel === 'assunto') {
      const titulo = tituloPendente(emails.at(-1).corpo);
      if (emails.at(-1).assunto.length) emails.push(novo());
      emails.at(-1).titulo = titulo;
    }
    if (papel) alvo = papel;
    else if (TITULO.test(linha) && alvo !== 'corpo') alvo = 'corpo'; // outro cabeçalho: é conteúdo
    if (!papel) emails.at(-1)[alvo].push(linha);
  }
  return emails;
}

/** @returns {object[]} uma unidade por e-mail, com `assunto.txt`, `previa.txt` e `corpo.md` */
export function pecasDoEmail(texto) {
  const emails = lerEmails(semServico(semFrontmatter(texto)));
  return emails.map((e) => ({
    tipo: 'email',
    titulo: e.titulo,
    partes: [
      parte('assunto', 'txt', paraColar(e.assunto.join('\n'))),
      parte('previa', 'txt', paraColar(e.previa.join('\n'))),
      parte('corpo', 'md', fecharMd(e.corpo.join('\n'))),
    ],
  }));
}

// ── WhatsApp ─────────────────────────────────────────────────────────────────────────────────
/** @returns {object[]} uma unidade: os textos das seções, na ordem, separados por uma linha em branco */
export function pecasDoWhatsapp(texto) {
  const textos = secoesDeRotulo(semServico(semFrontmatter(texto))).map((s) => s.texto).filter(Boolean);
  return [{ tipo: 'mensagem', partes: [parte('mensagem', 'txt', paraColar(textos.join('\n\n'), { whatsapp: true }))] }];
}

// ── Thread ───────────────────────────────────────────────────────────────────────────────────
const TWEET_N = /^[\s*_#>-]{0,8}TWEET\s{1,3}\d{1,3}\s{0,3}\/\s{0,3}(?:\d{1,3}|N)(?![\p{L}\p{N}])/iu;

/** Texto de cada bloco iniciado por `TWEET n/N` (sem essa linha), até o próximo bloco, rótulo ou cabeçalho. */
export function tweetsDaThread(corpo) {
  const blocos = [];
  let atual = null;
  for (const linha of corpo.split('\n')) {
    if (TWEET_N.test(linha)) blocos.push((atual = []));
    else if (rotuloDe(linha) || TITULO.test(linha)) atual = null;
    else atual?.push(linha);
  }
  return blocos.map((b) => b.join('\n').trim()).filter(Boolean);
}
