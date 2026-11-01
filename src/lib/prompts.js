// Interactive prompts with a non-interactive fallback.
// Uses @inquirer/checkbox when a TTY is available; otherwise returns defaults.
import { IDES, allIdeIds, ideById } from './ides.js';
import { UsageError } from './errors.js';
import { warn } from './ui.js';

const loadCheckbox = () => import('@inquirer/checkbox');

/**
 * Load the list's library. Only the import is guarded (spec R2, rule 28): on a Node where it
 * does not load, the user gets the way out; Ctrl+C on the open list still passes through.
 */
async function openIdeList(load) {
  try {
    return await load();
  } catch (e) {
    throw new Error(
      `Não consegui abrir a lista de IDEs neste Node (v${process.versions.node}).\n`
      + 'Atualize o Node em https://nodejs.org/ ou escolha as IDEs no próprio comando: '
      + 'npx @aksp/opencrew init --ide=claude-code (ou --all para todas). Nada foi alterado nesta pasta.',
      { cause: e },
    );
  }
}

/**
 * @param {{ preselected?: string[] }} [opts]
 * @param {{ load?: () => Promise<object> }} [deps]  injectable for tests
 */
export async function pickIdes({ preselected } = {}, { load = loadCheckbox } = {}) {
  const validIds = new Set(allIdeIds());
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;

  // Filter and validate preselected IDs.
  let chosen = preselected?.length ? preselected : null;
  if (chosen) {
    const invalid = chosen.filter((id) => !validIds.has(id));
    if (invalid.length) {
      warn(`Unknown IDE(s) ignored: ${invalid.join(', ')}. Valid: ${allIdeIds().join(', ')}`);
      chosen = chosen.filter((id) => validIds.has(id));
    }
    if (!chosen.length) chosen = null; // fall through to defaults
  }

  if (!isTTY) {
    if (!chosen) chosen = allIdeIds();
    warn(`Non-interactive terminal — configuring IDEs: ${chosen.join(', ')}`);
    return chosen;
  }
  const { default: checkbox, Separator } = await openIdeList(load);
  const answer = await checkbox({
    message: 'Which AI IDEs do you use? (space to toggle, enter to confirm)',
    instructions: false,
    choices: [
      ...IDES.map((i) => ({
        name: i.label,
        value: i.id,
        checked: chosen ? chosen.includes(i.id) : i.id === 'claude-code',
      })),
      new Separator(),
    ],
    validate: (a) => (a.length ? true : 'Select at least one IDE.'),
  });
  return answer;
}

/**
 * Decide which IDEs to configure. --ide → validated list, whatever comes with it; without it,
 * --all / --yes → every IDE; nothing → `fallback()` (the interactive prompt; in repair mode, the
 * detection). Throws UsageError if --ide names no valid IDE.
 */
export async function resolveIdes(opts, fallback) {
  const ids = normalizeIdes(opts.ide);
  if (!ids) return opts.all || opts.yes ? allIdeIds() : fallback();
  const invalid = ids.filter((id) => !ideById(id));
  const valid = ids.filter((id) => ideById(id));
  if (!valid.length) {
    throw new UsageError(`Unknown IDE "${invalid.join('", "')}". Valid: ${allIdeIds().join(', ')}`);
  }
  for (const id of invalid) warn(`Unknown IDE "${id}" — skipped. Valid: ${allIdeIds().join(', ')}`);
  return valid;
}

function normalizeIdes(val) {
  if (!val || val === true) return null;
  const list = Array.isArray(val) ? val : String(val).split(',');
  const ids = list.map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : null;
}
