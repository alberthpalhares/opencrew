// Linha de comando do `conserto.mjs`: a crew, os itens de `--aplicar` e a ajuda.
// Spec: fase-u4a-conserto-de-crews.md, §3 (repositório do OpenCrew).

export const USO = 'Uso: node _opencrew/core/scripts/conserto.mjs --crew "crews/<crew>" [--aplicar "<item>" …]';
export const AJUDA = [
  USO,
  'Sem --aplicar: só lê a crew e mostra o que há para consertar.',
  'Itens de --aplicar (cada gravação deixa uma cópia .bak do arquivo de antes):',
  '  manifesto                        refaz o crew-party.csv a partir dos agentes',
  '  nome:<agente>=<Nome Sobrenome>   grava o nome de duas palavras no arquivo do agente',
  '  formato:<passo>=<formato>        grava o formato do texto no passo',
  '  fonte:<caminho>=<para que>       registra um arquivo ou pasta do projeto em fontes:',
  '  fonte:nenhuma                    registra que a crew não lê arquivos do projeto',
  '  proibicao:<n>=<trecho>           o trecho do item n vira trava do verificador',
  '  proibicao:<n>=revisao-humana     o item n fica para o revisor',
  '  irreversivel:<passo>             marca o passo que publica ou envia',
  '  historico:<execução>=<tema>      põe no histórico a execução que ficou sem linha',
];

export const TIPOS = ['manifesto', 'nome', 'formato', 'fonte', 'proibicao', 'irreversivel', 'historico'];
const OPCAO = /^--(crew|aplicar|ajuda)(?:=(.*))?$/s;
const ITEM = /^([a-z-]+)(?::([^=]*))?(?:=(.*))?$/s;

/** Texto que veio da linha de comando e volta numa mensagem: uma linha só, até 200 caracteres. */
export const limpar = (valor) => String(valor).replace(/\s+/g, ' ').trim().slice(0, 200);

/**
 * `argv` → `{ crew, itens, ajuda, estranho }`. Opção vale como `--nome valor` e `--nome=valor`;
 * `--aplicar` pode repetir. `estranho`: o primeiro argumento que não é opção conhecida.
 */
export function lerArgs(argv) {
  const args = { crew: undefined, itens: [], ajuda: false, estranho: undefined };
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(OPCAO) ?? [];
    if (!nome) args.estranho ??= argv[i];
    else if (nome === 'ajuda') args.ajuda = true;
    else {
      const valor = colado ?? (i + 1 < argv.length ? argv[++i] : '');
      if (nome === 'crew') args.crew = valor;
      else args.itens.push(valor);
    }
  }
  return args;
}

/**
 * Um item de `--aplicar`: `tipo[:alvo][=valor]`.
 * @returns {{ tipo: string, alvo: string, valor: string, escrito: string } | null} null = tipo desconhecido
 */
export function lerItem(escrito) {
  const [, tipo, alvo = '', valor = ''] = String(escrito).match(ITEM) ?? [];
  return TIPOS.includes(tipo) ? { tipo, alvo: alvo.trim(), valor: valor.trim(), escrito: limpar(escrito) } : null;
}
