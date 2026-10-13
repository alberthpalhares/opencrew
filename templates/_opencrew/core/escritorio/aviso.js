// Quando a página não abre: diz qual arquivo faltou. A página é um conjunto de módulos, e basta um
// deles não vir para o `app.js` nunca rodar — é o que acontece num escritório que ficou aberto de
// antes de uma atualização do OpenCrew, porque o servidor só entrega os arquivos que conhecia ao
// subir. Este arquivo não depende de nenhum outro: carrega sozinho, e por isso consegue avisar.
// Só lê (pede os próprios arquivos da página) e escreve por `textContent`.
// Spec: fase-e4-robustez-do-escritorio.md, regra 6 (repositório do OpenCrew).

const ESPERA_MS = 4000;
const INICIO = 'app.js';
// O único jeito de a página citar outro arquivo: `import … from './nome.js'` e `export * from './nome.js'`.
const CITADO = /\bfrom\s+['"]\.\/([\w.-]+\.js)['"]/g;

const FALTOU = (nomes) => `O escritório não carregou: faltou ${nomes.join(', ')}. Feche o escritório e rode /opencrew dashboard de novo.`;

/**
 * Os arquivos da página que o servidor não entrega: pede o `app.js` e, a partir dele, cada módulo
 * citado, uma vez cada. Sem resposta, ou resposta diferente de 200, o arquivo falta.
 * @param {(nome: string) => Promise<{ status: number, text: () => Promise<string> }>} buscar
 * @returns {Promise<string[]>} os nomes, em ordem alfabética; `[]` quando veio tudo
 */
export async function faltando(buscar) {
  const [pedidos, faltam, fila] = [new Set([INICIO]), [], [INICIO]];
  while (fila.length) {
    const nome = fila.shift();
    const resposta = await buscar(nome).catch(() => null);
    if (resposta?.status !== 200) {
      faltam.push(nome);
      continue;
    }
    for (const [, citado] of (await resposta.text()).matchAll(CITADO)) {
      if (!pedidos.has(citado)) fila.push(citado);
      pedidos.add(citado);
    }
  }
  return faltam.sort();
}

/**
 * Se a frase de abertura ainda estiver na tela depois da espera, procura o que faltou e troca a
 * frase pela que diz os nomes. Com a página aberta, ou sem nada faltando, não mexe em nada.
 * @param {Window} janela a janela do navegador (nos testes, uma de mentira)
 */
export function vigiar(janela) {
  janela.setTimeout(async () => {
    const abertura = janela.document.getElementById('abertura');
    if (!abertura || abertura.hidden) return;
    const faltam = await faltando((nome) => janela.fetch(nome));
    if (faltam.length && !abertura.hidden) abertura.textContent = FALTOU(faltam);
  }, ESPERA_MS);
}

if (typeof window !== 'undefined') vigiar(window);
