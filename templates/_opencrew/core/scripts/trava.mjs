// Coordena a leitura e regravação de um arquivo entre processos.
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { uptime } from 'node:os';
import path from 'node:path';

const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const MARCA = /^opencrew-(\d+)-(\d+)-[a-f0-9-]+$/;
const IGNORAR = new Set(['ENOENT', 'ENOTEMPTY', 'EEXIST']);
const RECUPERACAO_CONCORRENTE = new Set(['EPERM', 'EBUSY']);
const PRAZO_MS = 12000;

function pidVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (erro) {
    return erro.code !== 'ESRCH';
  }
}

async function soltar(pasta, dono) {
  try {
    if (dono) {
      await fs.unlink(path.join(pasta, dono)).catch((erro) => {
        if (erro.code !== 'ENOENT') throw erro;
      });
    }
    await fs.rmdir(pasta);
  } catch (erro) {
    if (!IGNORAR.has(erro.code)) throw erro;
  }
}

/** O nome do dono é único. Um recuperador atrasado nunca remove o arquivo de um novo dono. */
async function recuperar(trava) {
  try {
    const info = await fs.lstat(trava);
    if (!info.isDirectory() || info.isSymbolicLink()) return;
    const nomes = await fs.readdir(trava);
    if (!nomes.length) return soltar(trava);
    if (nomes.length !== 1) return;
    const [dono] = nomes;
    const marca = dono.match(MARCA);
    if (marca && (Number(marca[2]) < Date.now() - uptime() * 1000 - 5000 || !pidVivo(Number(marca[1])))) {
      await soltar(trava, dono);
    }
  } catch (erro) {
    // No Windows, outro recuperador pode remover a pasta entre lstat/readdir/rmdir.
    // Esses códigos indicam disputa transitória; adquirir() tenta a trava novamente.
    if (!IGNORAR.has(erro.code) && !RECUPERACAO_CONCORRENTE.has(erro.code)) throw erro;
  }
}

async function adquirir(candidata, trava) {
  const limite = performance.now() + PRAZO_MS;
  for (;;) {
    try {
      await fs.rename(candidata, trava);
      return;
    } catch (erro) {
      if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(erro.code)) throw erro;
      if (performance.now() >= limite) throw Object.assign(new Error('arquivo em uso'), { code: 'EBUSY' });
      await recuperar(trava);
      // Evita que todos os candidatos voltem a disputar no mesmo instante.
      await pausa(25 + Math.floor(Math.random() * 50));
    }
  }
}

export async function comTrava(arquivo, executar) {
  const trava = `${arquivo}.opencrew.lock.tmp`;
  const candidata = await fs.mkdtemp(`${trava}-`);
  const dono = `opencrew-${process.pid}-${Date.now()}-${randomUUID()}`;
  let adquirida = false;
  try {
    await fs.writeFile(path.join(candidata, dono), '', { flag: 'wx' });
    await adquirir(candidata, trava);
    adquirida = true;
    return await executar();
  } finally {
    await soltar(adquirida ? trava : candidata, dono);
  }
}
