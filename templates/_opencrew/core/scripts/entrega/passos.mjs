// Os passos de cada canal no LEIA-ME: o quadro "Passos por canal" da spec, guardado como dado.
// O texto é literal (aprovado com a spec): não reescreva aqui sem mudar a spec.
// Specs: fase-u3a1-pasta-de-entrega.md, §4, e fase-u3a2-entrega-no-projeto.md, §4 (o primeiro
// passo do canal com ressalva), no repositório do OpenCrew.

/** O primeiro passo do canal que não está pronto (ajuste da execução real). */
export const ANTES_DE_POSTAR = 'Antes de postar, resolva o que está em Pendências. Corrija no arquivo de origem e peça para montar a entrega de novo: o que você mudar nesta pasta se perde.';
/** O primeiro passo do canal entregue com ressalva. */
export const CONFIRA_AS_RESSALVAS = 'Antes de postar, confira as ressalvas em "Antes de usar".';
/** O passo de `documentos` que só vale na pasta da entrega (a cópia não é refeita). Spec: fase-u3b-documento-word.md, §6. */
export const NAO_EDITE_O_WORD = 'Não edite o Word dentro desta pasta: ela é refeita a cada entrega. Para mexer, copie o arquivo para outra pasta do projeto.';
const MARKDOWN ='Este texto está em markdown: se o seu editor não aceitar, ajuste títulos, negrito e links depois de colar.';

// Cada passo: [o que o faz aparecer, o texto]. null = sempre que o canal tem arquivo; um tipo de
// arquivo = só quando a entrega tem arquivo desse tipo no canal; `tipo:um` e `tipo:varios` = só
// quando a peça é uma só, ou quando é numerada. `{arquivo}`: uma linha por arquivo. `{campos}`:
// os campos que o `seo.txt` daquela entrega tem.
const PASSOS = {
  instagram: [
    [null, 'No computador, abra instagram.com e comece uma publicação nova. Pelo celular, mande os arquivos para ele antes.'],
    ['imagem', 'Escolha as imagens na ordem dos nomes dos arquivos.'],
    ['legenda', 'Abra `instagram/legenda.txt`, copie tudo e cole no campo da legenda. As hashtags já estão no fim.'],
    [null, 'Confira a prévia e publique.'],
    ['texto', '`instagram/{arquivo}` é para ler e produzir (gravar ou montar os slides): não é texto para colar.'],
  ],
  linkedin: [
    [null, 'No computador, abra linkedin.com e comece uma publicação.'],
    ['post', 'Abra `linkedin/post.txt`, copie tudo e cole.'],
    ['imagem', 'Anexe as imagens na ordem dos nomes dos arquivos.'],
    [null, 'Confira e publique.'],
    ['comentario', 'Depois de publicar, abra `linkedin/post-comentario.txt`, copie e cole como primeiro comentário.'],
    ['roteiro', 'Para o artigo, escolha escrever um artigo no LinkedIn e cole o texto de `linkedin/{arquivo}`, seção por seção.'],
  ],
  blog: [
    [null, 'Abra o editor do seu blog e crie um post novo.'],
    ['seo', 'Abra `blog/seo.txt` e copie cada linha para o campo de mesmo nome ({campos}).'],
    ['artigo', 'Abra `blog/artigo.md`, copie tudo e cole no corpo do post.'],
    ['artigo', MARKDOWN],
    [null, 'Confira a prévia e publique.'],
  ],
  email: [
    [null, 'Abra a sua ferramenta de e-mail e crie uma mensagem nova.'],
    ['assunto', 'Copie o texto de `email/assunto.txt` para o campo do assunto.'],
    ['previa', 'Copie o texto de `email/previa.txt` para o campo de prévia (a linha que aparece ao lado do assunto).'],
    ['corpo', 'Abra `email/corpo.md`, copie tudo e cole no corpo.'],
    ['corpo', MARKDOWN],
    [null, 'Envie um teste para você antes de enviar para a lista.'],
  ],
  whatsapp: [
    [null, 'No computador, abra o WhatsApp Web ou o aplicativo. Pelo celular, mande o arquivo para ele antes.'],
    ['mensagem', 'Abra `whatsapp/mensagem.txt`, copie tudo e cole na conversa ou na lista de transmissão.'],
    [null, 'Se o texto tiver `{{…}}`, troque pelo dado real, ou confira se a sua ferramenta de envio faz a troca.'],
    [null, 'Envie primeiro para você, para ver como ficou.'],
  ],
  twitter: [
    [null, 'No computador, abra x.com e comece uma publicação.'],
    ['tweet:um', 'Abra `twitter/tweet.txt`, copie tudo e cole.'],
    ['tweet:varios', 'Para a sequência, cole `twitter/tweet-1.txt`, acrescente outra publicação e cole o arquivo seguinte, na ordem dos números.'],
    ['imagem', 'Anexe as imagens.'],
    [null, 'Confira e publique.'],
  ],
  youtube: [['roteiro', '`youtube/{arquivo}` é o roteiro para gravar: não é texto para colar.']],
  documentos: [
    ['documento', 'Abra `documentos/{arquivo}` no Word e confira: cabeçalho, páginas, tabelas e assinaturas.'],
    ['documento', NAO_EDITE_O_WORD],
    ['documento', 'Para ter um PDF: abra o documento no Word e use Arquivo → Salvar como → PDF.'],
    ['documento', 'O Word é uma cópia do texto. O que você mudar nele não volta sozinho: altere o texto e gere de novo.'],
  ],
};
// "texto": o roteiro e o arquivo que foi inteiro (carrossel em texto, peça não encontrada).
const TIPOS = { texto: ['roteiro', 'inteiro'] };

/** Com várias peças, o passo cita os arquivos numerados no lugar do nome sem número. */
function citar(texto, pasta, achados) {
  if (!achados[0].numerado) return texto;
  const lista = achados.map((a) => `\`${pasta}/${a.nome}\``).join(', ');
  return texto.replace(new RegExp(`\`${pasta}/[^\`]+\``), lista);
}

/** Os campos que os arquivos têm (`Título: …` → "título"), cada um uma vez, na ordem das linhas. */
function camposDe(achados) {
  const linhas = achados.flatMap((a) => (a.texto ?? '').split('\n')).filter((l) => l.includes(':'));
  return [...new Set(linhas.map((l) => l.slice(0, l.indexOf(':')).toLowerCase()))].join(', ');
}

/** Os passos do quadro, só os que citam arquivo que existe nesse canal, na ordem do quadro. */
function doQuadro(pasta, arquivos) {
  if (!arquivos.length) return [];
  return (PASSOS[pasta] ?? []).flatMap(([condicao, texto]) => {
    if (!condicao) return [texto];
    const [tipo, quantos] = condicao.split(':');
    const achados = arquivos.filter((a) => (TIPOS[tipo] ?? [tipo]).includes(a.tipo));
    if (!achados.length) return [];
    if (quantos) return Boolean(achados[0].numerado) === (quantos === 'varios') ? [texto] : [];
    if (texto.includes('{arquivo}')) return achados.map((a) => texto.replace('{arquivo}', a.nome));
    return [citar(texto, pasta, achados).replace('{campos}', camposDe(achados))];
  });
}

/**
 * Os passos de um canal. No canal que não está pronto, o primeiro manda resolver as pendências; no
 * que foi entregue com ressalva, manda conferir as ressalvas.
 * @param {string} pasta a pasta do canal
 * @param {object[]} arquivos os arquivos da entrega nessa pasta: `{ nome, tipo, numerado, texto }`
 * @param {boolean} [comPendencia] o canal tem pendência · @param {boolean} [comRessalva] tem ressalva
 * @returns {string[]}
 */
export function passosDe(pasta, arquivos, comPendencia = false, comRessalva = false) {
  const passos = doQuadro(pasta, arquivos);
  const antes = comPendencia ? ANTES_DE_POSTAR : comRessalva ? CONFIRA_AS_RESSALVAS : null;
  // Documento não se posta: imprime-se, assina-se, protocola-se.
  const frase = pasta === 'documentos' ? antes?.replace('Antes de postar', 'Antes de usar') : antes;
  return frase && passos.length ? [frase, ...passos] : passos;
}
