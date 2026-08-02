// Interactive prompts with a non-interactive fallback.
// Uses @inquirer/checkbox when a TTY is available; otherwise returns defaults.
import { IDES, allIdeIds } from './ides.js';
import { warn } from './ui.js';

export async function pickIdes({ preselected } = {}) {
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
  const { default: checkbox, Separator } = await import('@inquirer/checkbox');
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
