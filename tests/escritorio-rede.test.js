// specs/fase-e6-escritorio-celular-rede.md — E6-01a, E6-01b, E6-02a and E6-02b.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { enderecosDeRede, ipsLocaisPermitidos, linhasDeUrl } from '../templates/_opencrew/core/scripts/escritorio/rede.mjs';
import { criarServidor } from '../templates/_opencrew/core/scripts/escritorio/servidor.mjs';
import { abrir } from '../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { main } from '../templates/_opencrew/core/scripts/escritorio.mjs';
import { projetoDe } from '../templates/_opencrew/core/scripts/escritorio/projeto.mjs';
import { mkTmp } from './_helpers.js';

const fechar = (servidor) => new Promise((ok) => { servidor.closeAllConnections?.(); servidor.close(() => ok()); });

function pedir(porta, caminho, Host) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: porta, path: caminho, method: 'GET', agent: false, headers: Host ? { Host } : {} }, (res) => {
      let corpo = '';
      res.setEncoding('utf8').on('data', (p) => { corpo += p; }).on('end', () => resolve({ status: res.statusCode, headers: res.headers, corpo }));
    });
    req.on('error', reject).end();
  });
}

test('E6-01a: enderecosDeRede selects Wi-Fi/LAN and Tailscale/VPN while ignoring virtual and link-local adapters', () => {
  const interfaces = {
    'Loopback Pseudo-Interface 1': [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    'Teredo Tunneling Pseudo-Interface': [{ family: 'IPv6', address: '2001::1', internal: false }],
    'vEthernet (Default Switch)': [{ family: 'IPv4', address: '172.17.32.1', internal: false }],
    'vEthernet (WSL)': [{ family: 'IPv4', address: '172.24.0.1', internal: false }],
    docker0: [{ family: 'IPv4', address: '172.18.0.1', internal: false }],
    Ethernet: [
      { family: 'IPv4', address: '169.254.10.20', internal: false },
      { family: 'IPv6', address: 'fe80::1', internal: false },
    ],
    'Wi-Fi': [{ family: 'IPv4', address: '192.168.3.13', internal: false }],
    Tailscale: [{ family: 'IPv4', address: '100.88.12.34', internal: false }],
  };
  assert.deepEqual(enderecosDeRede(interfaces), { lan: '192.168.3.13', vpn: '100.88.12.34' });
  const permitidos = ipsLocaisPermitidos(interfaces);
  assert.equal(permitidos.has('192.168.3.13'), true);
  assert.equal(permitidos.has('100.88.12.34'), true);
  assert.equal(permitidos.has('169.254.10.20'), false);
  assert.equal(permitidos.has('127.0.0.1'), false);
});

test('E6-01a: VPN detection ignores Windows Teredo Tunneling and matches real VPN interfaces', () => {
  const interfaces = {
    'Teredo Tunneling Pseudo-Interface': [{ family: 'IPv4', address: '10.99.0.1', internal: false }],
    wg0: [{ family: 'IPv4', address: '10.66.66.2', internal: false }],
    en0: [{ family: 'IPv4', address: '192.168.1.40', internal: false }],
  };
  assert.deepEqual(enderecosDeRede(interfaces), { lan: '192.168.1.40', vpn: '10.66.66.2' });
});

test('E6-01b: linhasDeUrl outputs ESCRITORIO:URL, ESCRITORIO:URL_REDE and ESCRITORIO:URL_VPN with or without run params', () => {
  const interfaces = {
    'Wi-Fi': [{ family: 'IPv4', address: '192.168.3.13', internal: false }],
    Tailscale: [{ family: 'IPv4', address: '100.88.12.34', internal: false }],
  };
  const comRun = linhasDeUrl(4747, 'editorial', '2026-11-16-080000', interfaces);
  assert.deepEqual(comRun.linhas, [
    'ESCRITORIO:URL http://127.0.0.1:4747/?crew=editorial&run_id=2026-11-16-080000',
    'ESCRITORIO:URL_REDE http://192.168.3.13:4747/?crew=editorial&run_id=2026-11-16-080000',
    'ESCRITORIO:URL_VPN http://100.88.12.34:4747/?crew=editorial&run_id=2026-11-16-080000',
  ]);
  const semRun = linhasDeUrl(4747, undefined, undefined, {});
  assert.deepEqual(semRun.linhas, ['ESCRITORIO:URL http://127.0.0.1:4747/']);
});

test('E6-02a: server listens on 0.0.0.0, accepts allowed local IPs and rejects unknown Hosts with 421', async (t) => {
  const raiz = await mkTmp('escritorio-rede');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  const pasta = path.join(raiz, '_opencrew', 'core', 'escritorio');
  await fs.mkdir(pasta, { recursive: true });
  await fs.writeFile(path.join(pasta, 'index.html'), '<!doctype html><title>Escritório</title>\n');
  const servidor = criarServidor({ raiz, pasta, arquivos: ['index.html'], ipsPermitidos: new Set(['192.168.3.13', '100.88.12.34']) });
  t.after(() => fechar(servidor));
  assert.equal(await abrir(servidor, 0), true);
  assert.equal(servidor.address().address, '0.0.0.0');
  const porta = servidor.address().port;

  for (const host of [`192.168.3.13:${porta}`, `100.88.12.34:${porta}`, `127.0.0.1:${porta}`, `localhost:${porta}`]) {
    const r = await pedir(porta, '/estado', host);
    assert.equal(r.status, 200, host);
    assert.equal(r.headers['access-control-allow-origin'], undefined);
    assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
  }
  for (const host of [`192.168.3.99:${porta}`, `exemplo.com:${porta}`, '192.168.3.13', `192.168.3.13:${porta + 1}`]) {
    const r = await pedir(porta, '/estado', host);
    assert.equal(r.status, 421, host);
    assert.equal(r.corpo, `Abra por http://127.0.0.1:${porta}`);
  }
});

test('E6-02b: automatic mode skips an old server that refuses the LAN Host header and starts on the next free port', async (t) => {
  const raiz = await mkTmp('escritorio-rede-auto');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'), { recursive: true });
  const antigo = http.createServer((req, res) => {
    const host = req.headers.host;
    if (host !== `127.0.0.1:${antigo.address().port}`) return res.writeHead(421).end('old');
    return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ projeto: projetoDe(raiz), versao: '', crews: [] }));
  });
  t.after(() => fechar(antigo));
  await new Promise((ok) => antigo.listen(0, '127.0.0.1', ok));
  const portaAntiga = antigo.address().port;

  let novoSubiu = false;
  const spawn = () => {
    const p = new EventEmitter();
    p.unref = () => {};
    queueMicrotask(() => { novoSubiu = true; p.emit('spawn'); });
    return p;
  };
  const interfaces = { 'Wi-Fi': [{ family: 'IPv4', address: '192.168.3.13', internal: false }] };
  const linhas = [];
  const r = await main(['--automatico', '--porta', String(portaAntiga), '--crew', 'c', '--run', '2026-11-16-080000'], {
    cwd: raiz,
    interfaces,
    escrever: (l) => linhas.push(l),
    auto: {
      ocupada: async (p) => p === portaAntiga,
      spawn,
      esperar: async () => {},
      sondar: async (p) => {
        if (p === portaAntiga) return null; // simulated 421 from old server when probed with LAN Host
        return novoSubiu && p === portaAntiga + 1 ? { projeto: projetoDe(raiz), versao: '' } : null;
      },
    },
  });
  assert.equal(r.code, 0);
  assert.equal(r.porta, portaAntiga + 1);
  assert.deepEqual(linhas, [
    `ESCRITORIO:URL http://127.0.0.1:${portaAntiga + 1}/?crew=c&run_id=2026-11-16-080000`,
    `ESCRITORIO:URL_REDE http://192.168.3.13:${portaAntiga + 1}/?crew=c&run_id=2026-11-16-080000`,
  ]);
});

test('E6-01b: --automatico --preparar also emits LAN and VPN links alongside ESCRITORIO:DAEMON', async (t) => {
  const raiz = await mkTmp('escritorio-rede-preparar');
  t.after(() => fs.rm(raiz, { recursive: true, force: true, maxRetries: 3 }));
  await fs.mkdir(path.join(raiz, '_opencrew'), { recursive: true });
  const interfaces = {
    'Wi-Fi': [{ family: 'IPv4', address: '192.168.3.13', internal: false }],
    Tailscale: [{ family: 'IPv4', address: '100.88.12.34', internal: false }],
  };
  const linhas = [];
  const r = await main(['--automatico', '--preparar', '--porta', '4747', '--crew', 'c', '--run', '2026-11-16-080000'], {
    cwd: raiz,
    interfaces,
    escrever: (l) => linhas.push(l),
    auto: { sondar: async () => null, ocupada: async () => false },
  });
  assert.equal(r.code, 0);
  assert.deepEqual(linhas, [
    'ESCRITORIO:DAEMON 4747 http://127.0.0.1:4747/?crew=c&run_id=2026-11-16-080000',
    'ESCRITORIO:URL_REDE http://192.168.3.13:4747/?crew=c&run_id=2026-11-16-080000',
    'ESCRITORIO:URL_VPN http://100.88.12.34:4747/?crew=c&run_id=2026-11-16-080000',
  ]);
});
