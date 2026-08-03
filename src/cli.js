import { readJson } from './lib/fsx.js';
import { packageJsonPath } from './lib/paths.js';
import { allIdeIds } from './lib/ides.js';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { c, log, err, warn, info } from './lib/ui.js';

// Extract the minimum required Node version from an engines.node range string.
// Handles: ">=20.0.0", "^20.5", ">=18.0.0 || >=20.0.0", plain "20.0.0".
function minNodeVersion(range) {
  // Split on || and take the lowest version (user is expected to meet at least one).
  const parts = range.split(/\s*\|\|\s*/);
  let lowest = null;
  for (const part of parts) {
    const v = part.replace(/[^0-9.]/g, '');
    if (!v) continue;
    if (!lowest || lt(v, lowest)) lowest = v;
  }
  return lowest;
}

// Simple semver comparison (no prerelease tags). Returns true if a < b.
function lt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na < nb;
  }
  return false; // equal
}

function parseArgs(argv) {
  const opts = { _: [] };
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      const k = eq > -1 ? a.slice(2, eq) : a.slice(2);
      const v = eq > -1 ? a.slice(eq + 1) : true;
      opts[k] = v;
    } else if (a.startsWith('-') && a.length === 2) {
      // Short flags: -y → yes, -v → version, -h → help
      const short = a[1];
      opts[short] = true;
    } else {
      opts._.push(a);
    }
  }
  // Normalize short flags to their long-form equivalents.
  if (opts.y) opts.yes = true;
  if (opts.v) opts.version = true;
  if (opts.h) opts.help = true;
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
  upgrade         Alias for update
  help            Show this help
  version         Print the version

${c.bold('Options for init')}
  --ide=a,b       Preselect IDEs (skip the prompt). Valid: ${allIdeIds().join(', ')}
  --all           Configure every supported IDE
  --yes, -y       Non-interactive; accept defaults

${c.bold('Options for update')}
  --check         Dry-run: report whether an update is available without making changes

${c.bold('Examples')}
  npx @aksp/opencrew init
  npx @aksp/opencrew init --ide=claude-code,codex
  npx @aksp/opencrew init --all
  npx @aksp/opencrew init -y
  npx @aksp/opencrew update
  npx @aksp/opencrew update --check
`);
}

export async function run(argv) {
  const opts = parseArgs(argv);

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

  // Validate Node version against engines.node requirement.
  if (engines.node) {
    const required = minNodeVersion(engines.node);
    const current = process.versions.node;
    if (required && lt(current, required)) {
      warn(`opencrew requires Node.js ${engines.node}. You have v${current}.`);
      info(`Upgrade Node or use a compatible version.`);
      process.exitCode = 1;
      return;
    }
  }

  const cmd = opts._[0] || (opts.version ? 'version' : opts.help ? 'help' : 'init');

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
