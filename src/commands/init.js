import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { copyDir, exists, writeFileSafe, readJson, writeBridgeFile } from '../lib/fsx.js';
import { ideById, allIdeIds } from '../lib/ides.js';
import { pickIdes } from '../lib/prompts.js';
import { c, log, info, ok, warn, step } from '../lib/ui.js';

export async function init(opts = {}) {
  const target = process.cwd();
  const pkg = await readJson(packageJsonPath);
  const version = pkg.version;
  const repairBridges = opts['repair-bridges'];

  const alreadyInstalled = await exists(path.join(target, '_opencrew', 'core'));

  // --repair-bridges mode: regenerate IDE bridge files in an existing workspace.
  if (repairBridges && alreadyInstalled) {
    log(`\n${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — repairing IDE bridges`);
    log(c.dim(`Target: ${target}\n`));

    let ids = normalizeIdes(opts.ide);
    if (opts.all) ids = allIdeIds();
    if (opts.yes || !ids) ids = allIdeIds();
    await writeBridges(target, ids, { overwrite: true });

    log(`\n${c.green(c.bold('Done!'))} IDE bridges regenerated.\n`);
    log(`${c.bold('Next step:')} Restart your IDE, then type ${c.cyan('/opencrew')} to verify.\n`);
    return;
  }

  if (alreadyInstalled) {
    warn('An opencrew workspace already exists here.');
    info(`To update only the framework, use: ${c.cyan('npx @aksp/opencrew update')}`);
    info(`To repair IDE bridges, use: ${c.cyan('npx @aksp/opencrew init --repair-bridges')}`);
    info(`To reinstall from scratch, delete _opencrew/ first, then run init again.`);
    return;
  }

  log(`\n${c.bold(c.cyan('opencrew'))} ${c.dim('v' + version)} — scaffolding a crew workspace`);
  log(c.dim(`Target: ${target}\n`));

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

  // 2. System doc + root configs.
  step('Writing configuration');

  // Full system definition lives in _opencrew/core/ — never at project root.
  // The root AGENTS.md is just a thin bridge (like CLAUDE.md, GEMINI.md, etc.).
  await writeFileSafe(path.join(target, '_opencrew', 'core', 'system.md'), await tpl('AGENTS.md'));
  ok('_opencrew/core/system.md (full system definition)');

  const agentsBridge = '# opencrew\n\n'
    + 'The opencrew system definition lives at `_opencrew/core/system.md`.\n'
    + 'Read that file and adopt the opencrew system role — follow all initialization,\n'
    + 'command routing, and workflow instructions defined there.\n\n'
    + 'Type `/opencrew` to open the main menu.\n';

  const agentsResult = await writeBridgeFile(path.join(target, 'AGENTS.md'), agentsBridge);
  if (agentsResult.merged) info('AGENTS.md (merged — existing content preserved)');
  else ok('AGENTS.md (bridge to system.md)');

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
  if (opts.yes) ids = allIdeIds();
  if (!ids) ids = await pickIdes();
  await writeBridges(target, ids, { overwrite: false });

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

/**
 * Write IDE bridge files to the target directory.
 * @param {string} target — project root
 * @param {string[]} ids — IDE ids to configure
 * @param {{ overwrite: boolean }} opts
 */
async function writeBridges(target, ids, { overwrite }) {
  const writtenPaths = new Set();

  for (const id of ids) {
    const ide = ideById(id);
    if (!ide) {
      warn(`Unknown IDE "${id}" — skipped. Valid: ${allIdeIds().join(', ')}`);
      continue;
    }
    for (const f of ide.files) {
      if (writtenPaths.has(f.path)) {
        info(`${f.path} (shared path — written once)`);
        continue;
      }
      writtenPaths.add(f.path);
      const fp = path.join(target, f.path);
      const hasFrontmatter = f.content.startsWith('---');
      if (hasFrontmatter) {
        await writeFileSafe(fp, f.content, { overwrite });
      } else {
        const result = await writeBridgeFile(fp, f.content);
        if (result.merged) info(`${f.path} (merged — existing content preserved)`);
        else if (result.written && overwrite) info(`${f.path} (regenerated)`);
      }
    }
    ok(`${ide.label} → ${ide.files.map((f) => f.path).join(', ')}`);
  }
}

async function tpl(name) {
  return fs.readFile(path.join(templatesDir, name), 'utf8');
}

function normalizeIdes(val) {
  if (!val || val === true) return null;
  const list = Array.isArray(val) ? val : String(val).split(',');
  return list.map((s) => s.trim()).filter(Boolean);
}
