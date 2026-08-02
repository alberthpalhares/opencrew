import { readJson } from './lib/fsx.js';
import { packageJsonPath } from './lib/paths.js';
import { allIdeIds } from './lib/ides.js';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { c, log, err } from './lib/ui.js';

function parseArgs(argv) {
  const opts = { _: [] };
  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      opts[k] = v === undefined ? true : v;
    } else {
      opts._.push(a);
    }
  }
  return opts;
}

function help(version) {
  log(`
${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — create AI agent crews that work together

${c.bold('Usage')}
  npx @aksp/opencrew <command> [options]

${c.bold('Commands')}
  init            Scaffold an opencrew workspace in the current folder
  update          Refresh the framework (keeps your crews, memory and .env)
  help            Show this help
  version         Print the version

${c.bold('Options for init')}
  --ide=a,b       Preselect IDEs (skip the prompt). Valid: ${allIdeIds().join(', ')}
  --all           Configure every supported IDE
  --yes           Non-interactive; accept defaults

${c.bold('Options for update')}
  --check         Dry-run: report whether an update is available without making changes

${c.bold('Examples')}
  npx @aksp/opencrew init
  npx @aksp/opencrew init --ide=claude-code,codex
  npx @aksp/opencrew init --all
  npx @aksp/opencrew update
  npx @aksp/opencrew update --check
`);
}

export async function run(argv) {
  const opts = parseArgs(argv);

  let version = 'unknown';
  try {
    const pkg = await readJson(packageJsonPath);
    version = pkg.version;
  } catch {
    err('Could not read package.json. The installation may be corrupted.');
    info('Try reinstalling: npm install @aksp/opencrew');
    process.exitCode = 1;
    return;
  }

  const cmd = opts._[0] || (opts.help ? 'help' : 'init');

  switch (cmd) {
    case 'init':
      return init(opts);
    case 'update':
    case 'upgrade':
      return update(opts);
    case 'version':
    case '--version':
      return log(version);
    case 'help':
    case '--help':
      return help(version);
    default:
      err(`Unknown command: ${cmd}`);
      help(version);
      process.exitCode = 1;
  }
}
