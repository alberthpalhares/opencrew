// Descoberta de endereços da rede local e VPN (sem dependências externas) e formatação de URLs do Escritório.
import os from 'node:os';

const IGNORAR_INTERFACE = /vethernet|default switch|wsl|hyper-v|docker|br-|veth|vbox|virtualbox|vmware|vmnet|loopback|teredo|isatap|6to4/i;
const NOME_VPN = /\b(tailscale|wireguard|wg\d*|zerotier|zt\w*|vpn|tun\d*|tap\d*|utun\d*)\b/i;
const NOME_PREFERIDO_LAN = /wi-?fi|wlan|en\d+|eth\d*|ethernet|lan|conex/i;

function octetosIpv4(ip) {
  if (typeof ip !== 'string') return null;
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const nums = m.slice(1).map(Number);
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null;
}

const ehIpv4 = (item) => item && !item.internal && (item.family === 'IPv4' || item.family === 4);
const ehLinkLocal = (o) => o[0] === 169 && o[1] === 254;
const ehCgnatVpn = (o) => o[0] === 100 && o[1] >= 64 && o[1] <= 127;
const ehPrivadoLan = (o) => o[0] === 10 || (o[0] === 172 && o[1] >= 16 && o[1] <= 31) || (o[0] === 192 && o[1] === 168);

/**
 * Todos os endereços IPv4 não internos ativos da máquina (usado na validação de `Host`).
 * @param {Record<string, os.NetworkInterfaceInfo[]>} [interfaces]
 * @returns {Set<string>}
 */
export function ipsLocaisPermitidos(interfaces = os.networkInterfaces()) {
  const permitidos = new Set();
  for (const lista of Object.values(interfaces ?? {})) {
    for (const item of lista ?? []) {
      if (!ehIpv4(item)) continue;
      const o = octetosIpv4(item.address);
      if (o && !ehLinkLocal(o)) permitidos.add(item.address);
    }
  }
  return permitidos;
}

/**
 * Seleciona o endereço principal da rede local (`lan`) e, se houver, o de VPN/Tailscale (`vpn`).
 * @param {Record<string, os.NetworkInterfaceInfo[]>} [interfaces]
 * @returns {{ lan: string|null, vpn: string|null }}
 */
export function enderecosDeRede(interfaces = os.networkInterfaces()) {
  let lanPreferido = null;
  let lanReserva = null;
  let vpn = null;

  for (const [nome, lista] of Object.entries(interfaces ?? {})) {
    if (IGNORAR_INTERFACE.test(nome)) continue;
    const ehVpn = NOME_VPN.test(nome);
    const preferida = NOME_PREFERIDO_LAN.test(nome);
    for (const item of lista ?? []) {
      if (!ehIpv4(item)) continue;
      const o = octetosIpv4(item.address);
      if (!o || ehLinkLocal(o)) continue;
      if (ehVpn || ehCgnatVpn(o)) {
        vpn ??= item.address;
      } else if (ehPrivadoLan(o)) {
        if (preferida) lanPreferido ??= item.address;
        else lanReserva ??= item.address;
      }
    }
  }
  return { lan: lanPreferido ?? lanReserva, vpn };
}

/** Monta a URL do Escritório para um host e porta, opcionalmente apontada para crew e run_id. */
export function urlDoEscritorio(porta, crew, run, host = '127.0.0.1') {
  const url = new URL(`http://${host}:${porta}/`);
  if (crew && run) {
    url.searchParams.set('crew', crew);
    url.searchParams.set('run_id', run);
  }
  return url.href;
}

/**
 * Gera a URL local (`ESCRITORIO:URL`) e, quando disponíveis, as de rede local (`ESCRITORIO:URL_REDE`)
 * e VPN (`ESCRITORIO:URL_VPN`).
 */
export function linhasDeUrl(porta, crew, run, interfaces) {
  const url = urlDoEscritorio(porta, crew, run);
  const { lan, vpn } = enderecosDeRede(interfaces);
  const urlsRede = {
    lan: lan ? urlDoEscritorio(porta, crew, run, lan) : null,
    vpn: vpn ? urlDoEscritorio(porta, crew, run, vpn) : null,
  };
  const linhas = [`ESCRITORIO:URL ${url}`];
  if (urlsRede.lan) linhas.push(`ESCRITORIO:URL_REDE ${urlsRede.lan}`);
  if (urlsRede.vpn) linhas.push(`ESCRITORIO:URL_VPN ${urlsRede.vpn}`);
  return { url, urlsRede, linhas };
}
