// Reserva de run e pedido no mesmo domínio de trava da atualização protegida.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { realDentroDe } from '../comum.mjs';
import { comTrava } from '../trava.mjs';

export async function comReservaProjeto(raiz, criar) {
  const nucleo = path.resolve(raiz, '_opencrew');
  const info = await fs.lstat(nucleo);
  if (!info.isDirectory() || info.isSymbolicLink() || !realDentroDe(raiz, nucleo)) {
    throw new Error('_opencrew não é uma pasta segura do projeto.');
  }
  return comTrava(path.join(nucleo, '.projeto-opencrew'), criar);
}
