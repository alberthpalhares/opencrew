// The office (Escritório) seen from `update`: does an older server of this project still answer?
// Its existing tabs stay on that version; automatic openings start the installed version on a
// compatible server or another port. Only asks `GET /estado`; writes nothing.
import { sondarEstado } from '../../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { projetoDe } from '../../templates/_opencrew/core/scripts/escritorio/projeto.mjs';

// The ports `escritorio.mjs` tries when run without `--porta`.
const DEFAULT_PORTS = { first: 4747, count: 10 };

const LINE = (port) => `O Escritório em http://127.0.0.1:${port} continua ativo para as abas abertas; novas execuções usarão a versão atualizada.`;

/**
 * The line for the summary of `update`, or null when no office of this project, started by a
 * version other than `version`, answers on the ports. The ports are asked at once: with nobody
 * there, the wait is the one of a refused connection.
 * @param {string} target the project root
 * @param {string} version the version `update` is installing
 * @param {{ first: number, count: number }} [ports] ONLY FOR TESTS: where to look
 */
export async function officeLine(target, version, ports = DEFAULT_PORTS) {
  try {
    const project = projetoDe(target);
    const asked = Array.from({ length: ports.count }, (_, i) => ports.first + i);
    const answers = await Promise.all(asked.map((port) => sondarEstado(port)));
    const at = answers.findIndex((who) => who?.projeto === project && who.versao !== version);
    return at < 0 ? null : LINE(asked[at]);
  } catch {
    return null; // looking for the office never fails an update
  }
}
