// Linha de comando do verificador: as opções, os itens `caminho=formato` e a linha de uso.
// Spec: fase-r1-reparos-1-6-1.md, §3.

// Uma linha só, e sem o texto do status: em erro de uso a saída não tem linha de status.
export const USO = 'Uso: node _opencrew/core/scripts/verificar.mjs --crew crews/<nome> --arquivo "<caminho=formato>[,<caminho=formato>…]" [--formato blog-post|blog-seo]'
  + ' — o "=formato" é opcional; o relatório termina em OK, BLOQUEADA ou AGUARDANDO_USUARIO; código de saída: 0 = verificou, 1 = erro de uso';

/**
 * Opções da linha de comando: `{ crew, formato, arquivos }`. `--arquivo` repetido soma à lista, e
 * o que vem solto logo depois da lista (sem `--`) é mais um item dela: nenhum arquivo citado fica
 * sem verificação.
 */
export function lerArgs(argv) {
  const args = { arquivos: [] };
  let naLista = false;
  for (let i = 0; i < argv.length; i++) {
    const opcao = argv[i].match(/^--(crew|arquivo|formato)$/)?.[1];
    if (opcao && i + 1 < argv.length) {
      if (opcao === 'arquivo') args.arquivos.push(argv[++i]);
      else args[opcao] = argv[++i];
      naLista = opcao === 'arquivo';
    } else if (naLista && !argv[i].startsWith('--')) args.arquivos.push(argv[i]);
    else naLista = false;
  }
  return args;
}

/** `caminho=formato` → `{ arquivo, formato }`; "=formato" só vale com minúsculas, dígitos e hífen. */
export function lerItemDaLista(texto) {
  const igual = texto.lastIndexOf('=');
  const formato = igual > 0 ? texto.slice(igual + 1) : '';
  return /^[a-z0-9-]+$/.test(formato) ? { arquivo: texto.slice(0, igual), formato } : texto;
}
