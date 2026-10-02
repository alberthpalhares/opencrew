import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { copyDir, exists, writeFileSafe, readJson, writeBridgeFile, readFile } from '../lib/fsx.js';
import { AGENTS_BRIDGE, LEAKED_STATUS_SECTION, ideById } from '../lib/ides.js';
import { c, log, info, ok, warn, step } from '../lib/ui.js';

// Update refreshes ONLY the framework. It never touches:
//   crews/, _opencrew/_memory/, _opencrew/_browser_profile/, .env, IDE bridges
//   (one exception: the CLAUDE.md block leaked by 1.4.0/1.4.1 — see removeLeakedStatusSection).
// Note: catalog skills (skills/<name>/ that ship with the package) ARE fully
// overwritten below — user edits to a catalog skill's own files are not preserved.
// Only skill directories that don't exist in the package's templates/skills/ at all
// (i.e. custom/user-authored skills) are left untouched.
export async function update(opts = {}) {
  const target = process.cwd();
  const pkg = await readJson(packageJsonPath);
  const version = pkg.version;

  if (!(await exists(path.join(target, '_opencrew', 'core')))) {
    warn('No opencrew workspace found here.');
    info(`Run ${c.cyan('npx @aksp/opencrew init')} first.`);
    return;
  }

  const versionFile = path.join(target, '_opencrew', '.opencrew-version');
  const current = (await exists(versionFile))
    ? (await fs.readFile(versionFile, 'utf8')).trim()
    : 'unknown';

  log(`\n${c.bold(c.cyan('opencrew update'))}`);
  log(c.dim(`Installed: ${current}  →  Package: ${version}\n`));

  if (opts.check) {
    if (current === version) {
      ok(`Up to date (v${version}).`);
    } else {
      info(`Update available: v${current} → v${version}.`);
      info(`Run ${c.cyan('npx @aksp/opencrew update')} to apply.`);
      process.exitCode = 1;
    }
    return;
  }

  if (current === version) {
    ok('Already up to date. Refreshing framework files anyway.');
  }

  // Refresh core framework: _opencrew/core is fully overwritten (it is not user data).
  step('Refreshing framework');
  let n = 0;
  await copyDir(path.join(templatesDir, '_opencrew', 'core'), path.join(target, '_opencrew', 'core'), {
    overwrite: true,
    onCopy: () => (n += 1),
  });
  ok(`_opencrew/core refreshed (${n} files)`);

  // Refresh catalog skills: every skill shipped in templates/skills/ is fully
  // overwritten (edits to a catalog skill's files do not survive an update).
  // Skill directories that only exist in the user's project — i.e. not part of
  // the catalog — are never touched, since copyDir only visits paths that exist
  // in the source (templates/skills/).
  step('Refreshing catalog skills');
  warn('Catalog skills are fully overwritten — your edits to any built-in skill files will be lost.');
  let s = 0;
  await copyDir(path.join(templatesDir, 'skills'), path.join(target, 'skills'), {
    overwrite: true,
    onCopy: () => (s += 1),
  });
  ok(`Catalog skills refreshed (${s} files)`);

  // System doc — full definition in _opencrew/core/, thin bridge at root.
  const systemContent = await fs.readFile(path.join(templatesDir, 'AGENTS.md'), 'utf8');
  await writeFileSafe(path.join(target, '_opencrew', 'core', 'system.md'), systemContent);
  ok('_opencrew/core/system.md refreshed');

  await refreshAgentsBridge(target);
  await removeLeakedStatusSection(target);

  // Stamp last: a crash above leaves the old version, so the next update retries.
  await fs.writeFile(versionFile, version + '\n');
  log(`\n${c.green(c.bold('Updated to v' + version))}.`);
  log(c.dim('Your crews, memory, IDE bridges and .env were left untouched.\n'));
}

// Root AGENTS.md: create it if missing; a legacy full-system doc (pre-v1.3) is backed up
// byte for byte and replaced by the thin bridge; otherwise only the marked block changes.
async function refreshAgentsBridge(target) {
  const agentsPath = path.join(target, 'AGENTS.md');
  if (!(await exists(agentsPath))) {
    await writeBridgeFile(agentsPath, AGENTS_BRIDGE);
    ok('AGENTS.md (bridge created)');
    return;
  }
  const existing = await readFile(agentsPath);
  if (existing.includes('# opencrew Instructions') && !existing.includes('<!-- opencrew:start -->')) {
    const backup = await freeBackupPath(agentsPath);
    await fs.copyFile(agentsPath, backup);
    await writeFileSafe(agentsPath, AGENTS_BRIDGE);
    ok(`AGENTS.md (migrated from legacy full-system to thin bridge — backed up to ${path.basename(backup)})`);
    return;
  }
  await writeBridgeFile(agentsPath, AGENTS_BRIDGE);
  ok('AGENTS.md refreshed');
}

async function freeBackupPath(file) {
  const bak = `${file}.bak`;
  if (!(await exists(bak))) return bak;
  return `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

// 1.4.0/1.4.1 shipped the maintainer's STATUS.md workflow inside CLAUDE.md's opencrew
// block. Rewrite that block (only that block, only if the leak is there).
async function removeLeakedStatusSection(target) {
  const claudePath = path.join(target, 'CLAUDE.md');
  if (!(await exists(claudePath))) return;
  if (!(await readFile(claudePath)).includes(LEAKED_STATUS_SECTION)) return;
  const bridge = ideById('claude-code').files.find((f) => f.path === 'CLAUDE.md');
  await writeBridgeFile(claudePath, bridge.content);
  ok('CLAUDE.md (removed the STATUS.md section shipped by mistake in 1.4.0/1.4.1)');
}
