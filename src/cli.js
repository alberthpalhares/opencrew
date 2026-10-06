import { parseArgs as nodeParseArgs } from 'node:util';
import { readJson } from './lib/fsx.js';
import { packageJsonPath } from './lib/paths.js';
import { allIdeIds } from './lib/ides.js';
import { UsageError, isPromptCancel } from './lib/errors.js';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { nodeBelowFloor } from './lib/node-version.js';
import { c, log, err, warn, info } from './lib/ui.js';

const OPTION_SPEC = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  ide: { type: 'string' },
  all: { type: 'boolean' },
  yes: { type: 'boolean', short: 'y' },
  'repair-bridges': { type: 'boolean' },
  check: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
};

const GLOBAL_OPTIONS = ['help', 'version'];
const COMMAND_OPTIONS = {
  init: ['ide', 'all', 'yes', 'repair-bridges'],
  update: ['check', 'dry-run'],
  upgrade: ['check', 'dry-run'],
};

/**
 * Strict argument parsing: unknown options, options of another command and stray
 * positionals are UsageErrors — raised before any command can write a file.
 */
export function parseArgs(argv) {
  let parsed;
  try {
    parsed = nodeParseArgs({ args: argv, options: OPTION_SPEC, allowPositionals: true, strict: true, tokens: true });
  } catch (e) {
    const unknown = e.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION' && e.message.match(/'([^']+)'/);
    const cmd = argv.find((a) => !a.startsWith('-')) ?? 'init';
    throw new UsageError(unknown
      ? `Unknown option '${unknown[1]}' for "${cmd}".`
      : e.message.split('. ')[0].replace(/\.$/, '') + '.');
  }
  const [cmd, ...extra] = parsed.positionals;
  const { values } = parsed;
  const command = cmd ?? (values.version ? 'version' : values.help ? 'help' : 'init');

  const allowed = new Set([...GLOBAL_OPTIONS, ...(COMMAND_OPTIONS[command] ?? [])]);
  const foreign = parsed.tokens.find((t) => t.kind === 'option' && !allowed.has(t.name));
  if (foreign) throw new UsageError(`Unknown option '${foreign.rawName}' for "${command}".`);

  if (extra.length) {
    throw new UsageError(command === 'init'
      ? 'init does not take a directory — cd into the project folder first.'
      : `Unexpected argument "${extra[0]}" for "${command}".`);
  }

  const opts = { ...values, _: parsed.positionals };
  if (opts['dry-run']) opts.check = true;
  return { command, opts };
}

function help(version) {
  log(`
${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — create AI agent crews that work together

${c.bold('Usage')}
  npx @aksp/opencrew <command> [options]

${c.bold('Commands')}
  init            Scaffold an opencrew workspace in the current folder
  update          Refresh the framework (keeps your crews, memory and .env)
  upgrade         Alias for update
  help            Show this help (also: <command> --help, -h)
  version         Print the version (also: --version, -v)

${c.bold('Options for init')}
  --ide=a,b       Preselect IDEs (skip the prompt). Valid: ${allIdeIds().join(', ')}
  --all           Configure every supported IDE
  --yes, -y       Non-interactive; accept defaults
  --repair-bridges  Rewrite the bridges of the IDEs already installed in an existing
                    workspace (with --ide: only those; with --all: every IDE)

${c.bold('Options for update')}
  --check         Report whether an update is available without making changes
  --dry-run       Same as --check

${c.bold('Examples')}
  npx @aksp/opencrew init
  npx @aksp/opencrew init --ide=claude-code,codex
  npx @aksp/opencrew init --all
  npx @aksp/opencrew init -y
  npx @aksp/opencrew update
  npx @aksp/opencrew update --check
`);
}

/** Turn any error into one readable line and an exit code. Stack only with OPENCREW_DEBUG=1. */
export function reportError(e) {
  if (isPromptCancel(e)) {
    warn('Cancelled — nothing was written.');
    return 130;
  }
  err(e?.message ?? String(e));
  if (e instanceof UsageError) info(`Run ${c.cyan('npx @aksp/opencrew help')} for usage.`);
  else if (process.env.OPENCREW_DEBUG) console.error(e?.cause ? e : e?.stack); // with a cause: both stacks
  return 1;
}

/**
 * @param {string[]} argv
 * @param {{ commands?: object, nodeVersion?: string }} deps  injectable for tests
 */
export async function run(argv, { commands = { init, update }, nodeVersion = process.versions.node } = {}) {
  let command, opts;
  try {
    ({ command, opts } = parseArgs(argv));
  } catch (e) {
    process.exitCode = reportError(e);
    return;
  }

  let version = 'unknown';
  let engines = {};
  try {
    const pkg = await readJson(packageJsonPath);
    version = pkg.version;
    engines = pkg.engines || {};
  } catch {
    err('Could not read package.json. The installation may be corrupted.');
    info('Try reinstalling: npm install @aksp/opencrew');
    process.exitCode = 1;
    return;
  }

  // Below the floor of engines.node every command stops here — --version and help too —
  // before anything is written (spec R2, rule 27).
  const tooOld = nodeBelowFloor(engines.node, nodeVersion);
  if (tooOld) {
    err(tooOld[0]);
    info(tooOld[1]);
    process.exitCode = 1;
    return;
  }

  // --version / --help never run a command (they may follow any command).
  if (opts.version || command === 'version') return log(version);
  if (opts.help || command === 'help') return help(version);

  try {
    switch (command) {
      case 'init':
        return await commands.init(opts);
      case 'update':
      case 'upgrade':
        return await commands.update(opts);
      default:
        err(`Unknown command: ${command}`);
        help(version);
        process.exitCode = 1;
    }
  } catch (e) {
    process.exitCode = reportError(e);
  }
}
