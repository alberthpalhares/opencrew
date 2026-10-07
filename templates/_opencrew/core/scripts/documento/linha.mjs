// O texto de uma linha: negrito, itálico, link e imagem. Devolve os pedaços com a sua letra, sem
// mudar nenhuma palavra: o que não é marcação em par sai como foi escrito.
// Spec: fase-u3b-documento-word.md, regra 7 (repositório do OpenCrew).

// Guardam, durante a leitura, os sinais que não são marcação (`\*`, `\_` e os de dentro de um
// endereço). São caracteres de controle: o texto já chega aqui sem nenhum deles.
const ASTERISCO = String.fromCharCode(1);
const SUBLINHADO = String.fromCharCode(2);
const guardar = (texto) => texto.split('*').join(ASTERISCO).split('_').join(SUBLINHADO);
const devolver = (texto) => texto.split(ASTERISCO).join('*').split(SUBLINHADO).join('_');

const LINK = /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g;
const ENDERECO = /\bhttps?:\/\/\S+/g;
// Só em par, na mesma linha, colado ao texto, e com espaço, pontuação ou borda do lado de fora.
const ENFASE = /(?<![\p{L}\p{N}*_\\])(\*\*\*|___|\*\*|__|\*|_)(?=\S)(.+?)(?<=\S)\1(?![\p{L}\p{N}*_])/u;

/** `[texto](url)` vira `texto (url)` (ou só a URL, se o texto é ela); imagem fica como está. */
function semLinks(texto, contagem) {
  return texto.replace(LINK, (tudo, imagem, rotulo, url) => {
    if (imagem) contagem.imagens++;
    if (imagem) return guardar(tudo);
    return rotulo === url ? guardar(url) : `${rotulo} (${guardar(url)})`;
  });
}

/** Parte o texto nos trechos com e sem ênfase; a ênfase de fora vale para a de dentro. */
function partir(texto, letra) {
  const m = ENFASE.exec(texto);
  if (!m) return texto ? [{ texto, ...letra }] : [];
  const dentro = { b: letra.b || m[1].length >= 2, i: letra.i || m[1].length !== 2 };
  return [...partir(texto.slice(0, m.index), letra), ...partir(m[2], dentro), ...partir(texto.slice(m.index + m[0].length), letra)];
}

/** Junta pedaços vizinhos com a mesma letra. */
function juntar(pedacos) {
  const saida = [];
  for (const p of pedacos) {
    const ultimo = saida.at(-1);
    if (ultimo && ultimo.b === p.b && ultimo.i === p.i) ultimo.texto += p.texto;
    else saida.push({ ...p });
  }
  return saida;
}

/**
 * Lê uma linha de texto.
 * @param {string} texto a linha, já sem o sinal de título ou de lista
 * @param {{ imagens: number }} contagem soma as imagens que ficaram como texto
 * @returns {{ texto: string, b: boolean, i: boolean }[]}
 */
export function lerLinha(texto, contagem = { imagens: 0 }) {
  const semEscapes = texto.split('\\*').join(ASTERISCO).split('\\_').join(SUBLINHADO);
  const protegido = semLinks(semEscapes, contagem).replace(ENDERECO, guardar);
  return juntar(partir(protegido, { b: false, i: false })).map((p) => ({ ...p, texto: devolver(p.texto) }));
}

/** O texto como foi escrito, sem ler marcação nenhuma. */
export const literal = (texto) => (texto ? [{ texto, b: false, i: false }] : []);
