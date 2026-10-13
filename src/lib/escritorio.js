// The office (Escritório) seen from `update`: is the page of this project open, served by a
// process that started before the update? That server keeps the list of page files it started
// with, so the new page does not load in it until it is closed and opened again
// (specs/fase-e4-robustez-do-escritorio.md, rule 4). Only asks `GET /estado`; writes nothing.
import { sondarEstado } from '../../templates/_opencrew/core/scripts/escritorio/porta.mjs';
import { projetoDe } from '../../templates/_opencrew/core/scripts/escritorio/projeto.mjs';

// The ports `escritorio.mjs` tries when run without `--porta`.
const DEFAULT_PORTS = { first: 4747, count: 10 };

const LINE = (port) => `O escritório está aberto em http://127.0.0.1:${port}. Feche e rode /opencrew dashboard de novo para ver a versão nova.`;

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
