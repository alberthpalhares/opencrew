// Linha de comando do `documento.mjs`: as opções, a linha de uso e as mensagens em PT-BR.
// Spec: fase-u3b-documento-word.md, §3 e §6 (repositório do OpenCrew).

const COMANDO = 'node _opencrew/core/scripts/documento.mjs';
export const USO = `Uso: ${COMANDO} "<arquivo.md>" [--saida <arquivo.docx|pasta>] [--perfil <arquivo>] [--sem-perfil] [--substituir] [--ajuda]\n     ${COMANDO} --criar-perfil`;

export const MSG = {
  desconhecida: (opcao) => `Opção desconhecida: ${opcao}.`,
  semArquivo: 'Falta o arquivo de texto.',
  maisDeUm: (n) => `Converto um arquivo por vez. Recebi ${n}.`,
  naoEncontrei: (arquivo) => `Não encontrei ${arquivo}.`,
  semTexto: (arquivo) => `${arquivo} não tem texto para converter.`,
  naoUtf8: (arquivo) => `${arquivo} não está em UTF-8. Salve como UTF-8 e tente de novo.`,
  extensao: (arquivo) => `Só converto texto em markdown (.md ou .txt). Recebi: ${arquivo}.`,
  saida: (valor) => `A saída precisa ser um arquivo .docx ou uma pasta, dentro do projeto. Recebi: ${valor}.`,
  jaExiste: (arquivo) => `Já existe ${arquivo}, diferente do que eu ia gravar. Para trocar, rode de novo com --substituir.`,
  falha: (arquivo) => `Não consegui gravar ${arquivo}. Feche o arquivo no Word, ou espere a sincronização da pasta, e rode de novo.`,
  semPerfil: (arquivo) => `Perfil não encontrado: ${arquivo}.`,
  gerado: (arquivo) => `Documento gerado: ${arquivo}`,
  igual: (arquivo) => `${arquivo} já existe e está igual. Nada a fazer.`,
  perfil: (arquivo) => `Perfil: ${arquivo}`,
  nenhumPerfil: `Perfil: nenhum (sem papel timbrado). Para criar o seu: ${COMANDO} --criar-perfil`,
  avisos: 'Avisos:',
  dicas: ['Para ter um PDF: abra o documento no Word e use Arquivo → Salvar como → PDF.', 'O Word é uma cópia do texto. O que você mudar nele não volta sozinho: altere o texto e gere de novo.'],
  perfilCriado: (arquivo) => `Criei ${arquivo}. Abra, preencha o logotipo, o cabeçalho e o rodapé, e gere o documento de novo.`,
  perfilJaExiste: (arquivo) => `${arquivo} já existe. Não mexi nele.`,
};

const COM_VALOR = /^--(saida|perfil)(?:=(.*))?$/s;
const SEM_VALOR = { '--sem-perfil': 'semPerfil', '--substituir': 'substituir', '--ajuda': 'ajuda', '--criar-perfil': 'criarPerfil' };

/** Texto que veio da linha de comando e volta numa mensagem: uma linha só, até 200 caracteres. */
export const limpar = (valor) => String(valor).replace(/\s+/g, ' ').trim().slice(0, 200);

/**
 * `argv` → `{ arquivos, saida, perfil, semPerfil, substituir, ajuda, criarPerfil, desconhecida }`.
 * Opção com valor vale como `--nome valor` e `--nome=valor`; `saida` e `perfil` ficam `undefined`
 * quando a opção não veio. `desconhecida`: a primeira opção que o script não conhece, ou null.
 */
export function lerArgs(argv) {
  const args = { arquivos: [], semPerfil: false, substituir: false, ajuda: false, criarPerfil: false, desconhecida: null };
  for (let i = 0; i < argv.length; i++) {
    const [, nome, colado] = argv[i].match(COM_VALOR) ?? [];
    if (nome) args[nome] = colado ?? (i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : '');
    else if (Object.hasOwn(SEM_VALOR, argv[i])) args[SEM_VALOR[argv[i]]] = true;
    else if (argv[i].startsWith('--')) args.desconhecida ??= argv[i];
    else args.arquivos.push(argv[i]);
  }
  return args;
}
