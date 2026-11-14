// Abre o navegador padrão quando o harness não oferece navegador integrado.
import { spawn as criarProcesso } from 'node:child_process';

function navegador(plataforma, url) {
  if (plataforma === 'win32') return ['rundll32.exe', ['url.dll,FileProtocolHandler', url]];
  if (plataforma === 'darwin') return ['open', [url]];
  if (plataforma === 'linux') return ['xdg-open', [url]];
  return null;
}

function urlLocalSegura(texto) {
  try {
    const url = new URL(texto);
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** false em host sem interface, URL inválida ou falha de lançamento; nunca remove o link da saída. */
export function abrirNoSistema(url, deps = {}) {
  const plataforma = deps.plataforma ?? process.platform;
  const ambiente = deps.ambiente ?? process.env;
  const comando = navegador(plataforma, url);
  if (!urlLocalSegura(url) || !comando || ambiente.CI === 'true') return Promise.resolve(false);
  if (plataforma === 'linux' && !ambiente.DISPLAY && !ambiente.WAYLAND_DISPLAY) return Promise.resolve(false);
  const spawn = deps.spawn ?? criarProcesso;
  return new Promise((resolve) => {
    let terminou = false;
    const fim = (valor) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(relogio);
      resolve(valor);
    };
    const relogio = setTimeout(() => fim(false), deps.prazoMs ?? 1500);
    try {
      const processo = spawn(comando[0], comando[1], { detached: true, stdio: 'ignore', windowsHide: true, shell: false });
      processo.once('spawn', () => { processo.unref(); fim(true); });
      processo.once('error', () => fim(false));
    } catch {
      fim(false);
    }
  });
}
