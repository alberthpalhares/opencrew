// Texto de um HTML para as checagens gerais: o texto visível e os valores de `href`, `src` e
// `alt`. Ficam de fora `<style>`, `<script>`, os comentários e o resto das tags.
// Uma passada só pelo arquivo, de `<` em `<`: nada aqui recomeça a busca do início.

const ATRIBUTO = /(?:^|\s)(href|src|alt)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const DE_BLOCO = /^\/?(?:p|div|br|hr|li|ul|ol|h[1-6]|tr|td|th|table|section|article|header|footer|main|nav|aside|title|blockquote|figure|figcaption|body|head|html)\b/i;
const ENTIDADES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** Posição logo depois de `marca`, procurada a partir de `de`; o fim do texto se não houver. */
function depoisDe(html, marca, de) {
  marca.lastIndex = de;
  const m = marca.exec(html);
  return m ? m.index + m[0].length : html.length;
}

/** Consome o que começa no `<` da posição `abre` e devolve a posição seguinte. */
function consumir(html, abre, saida) {
  if (html.startsWith('<!--', abre)) return depoisDe(html, /-->/g, abre + 4);
  const ehTag = /[a-z/!?]/i.test(html[abre + 1] ?? '');
  const fecha = ehTag ? html.indexOf('>', abre) : -1;
  if (fecha < 0) {
    // "<" solto é texto; tag sem nenhum ">" adiante: o resto todo é texto.
    const ate = ehTag ? html.length : abre + 1;
    saida.visivel.push(html.slice(abre, ate));
    return ate;
  }
  const tag = html.slice(abre + 1, fecha);
  for (const m of tag.matchAll(ATRIBUTO)) {
    const valor = m[2] ?? m[3] ?? m[4];
    // `src="data:…"` é o conteúdo de um arquivo embutido, não um link: fica de fora.
    if (m[1].toLowerCase() === 'alt' || !/^\s*data:/i.test(valor)) saida.valores.push(valor);
  }
  if (DE_BLOCO.test(tag)) saida.visivel.push('\n');
  // Só `<script>` e `<style>`: `<script-x>` e `<style-guia>` são tags comuns.
  const invisivel = tag.match(/^(script|style)(?=[\s/]|$)/i);
  return invisivel ? depoisDe(html, new RegExp(`</${invisivel[1]}\\s*>`, 'gi'), fecha + 1) : fecha + 1;
}

/** Texto visível do HTML, seguido dos valores de `href`, `src` e `alt` (um por linha). */
export function textoDeHtml(html) {
  const saida = { visivel: [], valores: [] };
  let pos = 0;
  while (pos < html.length) {
    const abre = html.indexOf('<', pos);
    if (abre < 0) break;
    saida.visivel.push(html.slice(pos, abre));
    pos = consumir(html, abre, saida);
  }
  saida.visivel.push(html.slice(pos));
  const texto = [saida.visivel.join(''), ...saida.valores].join('\n');
  return texto.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (entidade) => ENTIDADES[entidade]);
}
