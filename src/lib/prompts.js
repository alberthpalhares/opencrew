// Interactive prompts with a non-interactive fallback.
// Uses @inquirer/checkbox when a TTY is available; otherwise returns defaults.
import { IDES, allIdeIds } from './ides.js';
import { warn } from './ui.js';

export async function pickIdes({ preselected } = {}) {
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;
  if (!isTTY) {
    const chosen = preselected?.length ? preselected : allIdeIds();
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
        checked: preselected ? preselected.includes(i.id) : i.id === 'claude-code',
      })),
      new Separator(),
    ],
    validate: (a) => (a.length ? true : 'Select at least one IDE.'),
  });
  return answer;
}

export async function confirm(message, def = true) {
  const isTTY = process.stdin.isTTY && process.stdout.isTTY;
  if (!isTTY) return def;
  const { default: confirmPrompt } = await import('@inquirer/confirm');
  return confirmPrompt({ message, default: def });
}
