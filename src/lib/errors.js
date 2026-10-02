// Error types the CLI turns into exit codes (see src/cli.js → exitCodeFor).

/** Wrong flags/arguments — reported in one line, exit 1, nothing written. */
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

/** @inquirer throws this when the user presses Ctrl+C on a prompt. */
export const isPromptCancel = (e) => e?.name === 'ExitPromptError';
