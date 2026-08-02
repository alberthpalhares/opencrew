import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { copyDir, exists, writeFileSafe, readJson } from '../lib/fsx.js';
import { IDES, ideById, allIdeIds } from '../lib/ides.js';
import { pickIdes } from '../lib/prompts.js';
import { c, log, info, ok, warn, step } from '../lib/ui.js';

export async function init(opts = {}) {
  const target = process.cwd();
  const pkg = await readJson(packageJsonPath);
  const version = pkg.version;

  log(`\n${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — scaffolding a crew workspace`);
  log(c.dim(`Target: ${target}\n`));

  const alreadyInstalled = await exists(path.join(target, '_opencrew', 'core'));
  if (alreadyInstalled) {
    warn('An opencrew workspace already exists here.');
    warn(`Framework files are refreshed but your crews, memory and .env are kept intact.`);
    warn(`To update only the framework, use: ${c.cyan('npx @aksp/opencrew update')}\n`);
  }

  // 1. Copy the framework payload (never clobber user work).
  step('Installing framework files');
  const copied = { count: 0 };
  await copyDir(path.join(templatesDir, '_opencrew'), path.join(target, '_opencrew'), {
    overwrite: false,
    // Never ship stray logs or browser sessions; keep the empty dir via .gitkeep only.
    skip: (rel) =>
      (rel.startsWith('logs/') && rel !== 'logs/.gitkeep') ||
      rel.startsWith('_browser_profile/'),
    onCopy: () => (copied.count += 1),
  });
  await copyDir(path.join(templatesDir, 'skills'), path.join(target, 'skills'), {
    overwrite: false,
    onCopy: () => (copied.count += 1),
  });
  await copyDir(path.join(templatesDir, 'crews'), path.join(target, 'crews'), {
    overwrite: false,
  });
  ok(`Framework files ready (${copied.count} written, existing files preserved)`);

  // 2. Canonical system doc + root configs.
  step('Writing configuration');
  await writeFileSafe(path.join(target, 'AGENTS.md'), await tpl('AGENTS.md'));
  ok('AGENTS.md (single source of truth)');

  const mcpWritten = await writeFileSafe(path.join(target, '.mcp.json'), await tpl('.mcp.json'), {
    overwrite: false,
  });
  info(mcpWritten ? '.mcp.json' : '.mcp.json (kept existing)');

  await writeFileSafe(path.join(target, '.env.example'), await tpl('.env.example'));
  const giWritten = await writeFileSafe(path.join(target, '.gitignore'), await tpl('gitignore'), {
    overwrite: false,
  });
  info(giWritten ? '.gitignore' : '.gitignore (kept existing)');

  // 3. IDE bridge files.
  step('Configuring AI IDEs');
  let ids = normalizeIdes(opts.ide);
  if (opts.all) ids = allIdeIds();
  if (!ids) ids = await pickIdes();

  for (const id of ids) {
    const ide = ideById(id);
    if (!ide) {
      warn(`Unknown IDE "${id}" — skipped. Valid: ${allIdeIds().join(', ')}`);
      continue;
    }
    for (const f of ide.files) {
      await writeFileSafe(path.join(target, f.path), f.content);
    }
    ok(`${ide.label} → ${ide.files.map((f) => f.path).join(', ')}`);
  }

  if (ids.includes('claude-code')) {
    warn(`opencrew ships its own Playwright MCP server (.mcp.json) — disable Claude Code's`);
    warn(`native Playwright plugin/extension to avoid the two conflicting.`);
  }

  // 4. Version stamp.
  await fs.writeFile(path.join(target, '_opencrew', '.opencrew-version'), version + '\n');

  // 5. Done.
  log(`\n${c.green(c.bold('Done!'))} opencrew is installed.\n`);
  log(`${c.bold('Next steps:')}`);
  log(`  1. Open this folder in your AI IDE.`);
  log(`  2. Type ${c.cyan('/opencrew')} to start (first run sets up your company profile).`);
  log(`     No API keys needed up front — opencrew asks for them in chat only if a skill you use requires one.\n`);
}

async function tpl(name) {
  return fs.readFile(path.join(templatesDir, name), 'utf8');
}

function normalizeIdes(val) {
  if (!val) return null;
  const list = Array.isArray(val) ? val : String(val).split(',');
  return list.map((s) => s.trim()).filter(Boolean);
}
