import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { exists, writeFileSafe, readJson, readFile } from '../lib/fsx.js';
import { AGENTS_BRIDGE, LEAKED_STATUS_SECTION } from '../lib/ides.js';
import { readManifest, manifestUnreadable, UNREADABLE, writeManifest, newDelivery, deliverTree, deliverFile } from '../lib/manifest.js';
import { deliverBlock, deliverBridges, blockHas } from '../lib/blocos.js';
import { detectInstalledIdes } from '../lib/deteccao.js';
import { withoutLegacy } from '../lib/legado.js';
import { updateMcp } from '../lib/mcp.js';
import { compareVersions, installedVersion, findLeftovers } from '../lib/migrations.js';
import { say, recreatedLines, updateSummary, UNTOUCHED, INTERRUPTED } from '../lib/resumo.js';
import { c, log, info, ok, warn, err, step } from '../lib/ui.js';

const tpl = (...p) => path.join(templatesDir, ...p);

// `update` brings EVERY improvement to people who already use OpenCrew (AGENTS.md rule 14),
// without losing what they made:
//   - _opencrew/core and catalog skills are replaced — a file the user edited is copied to
//     .opencrew-backup/<date>/ first (manifest of hashes; none = copy whatever differs);
//   - new framework folders (agents, config, crew templates) arrive without overwriting — a
//     crew template the user deleted comes back, and the output lists it;
//   - bridges of the IDEs already installed are refreshed (never new IDEs — an IDE is proved by
//     a file, src/lib/deteccao.js), and so are the opencrew blocks of AGENTS.md and .gitignore
//     — a block the user edited is copied first; the text bridges had up to 1.2.2 leaves the
//     outside of the block, with a copy, only when it is still exactly what was generated;
//   - the Playwright server of .mcp.json is delivered once (the manifest records it) and never
//     put back; the file is copied before any rewrite (src/lib/mcp.js);
//   - the crews the user created, _opencrew/_memory/, _opencrew/best-practices.local/ and .env
//     are never touched.
// Every step returns what it did, and the summary only says that (src/lib/resumo.js).
export async function update(opts = {}) {
  const target = process.cwd();
  const { version } = await readJson(packageJsonPath);

  if (!(await exists(path.join(target, '_opencrew', 'core')))) {
    warn('No opencrew workspace found here.');
    info(`Run ${c.cyan('npx @aksp/opencrew init')} first.`);
    return;
  }

  // No stamp = an install that did not finish: nothing is written or stamped (rule 31).
  const current = await installedVersion(target);
  if (!current) {
    err(INTERRUPTED);
    process.exitCode = 1;
    return;
  }
  log(`\n${c.bold(c.cyan('opencrew update'))}`);
  log(c.dim(`Installed: ${current}  →  Package: ${version}\n`));
  if (canApply(opts, current, version)) await apply(target, version);
}

/** `--check` only reports, and a package older than the workspace stops: false = write nothing. */
function canApply(opts, current, version) {
  const newer = compareVersions(current, version) > 0;
  if (opts.check) {
    if (current === version) ok(`Up to date (v${version}).`);
    else if (newer) info(`A versão instalada (v${current}) é mais nova que este pacote (v${version}).`);
    else {
      info(`Update available: v${current} → v${version}.`);
      info(`Run ${c.cyan('npx @aksp/opencrew update')} to apply.`);
      process.exitCode = 1;
    }
    return false;
  }
  if (newer) {
    err(`Você tem a v${current} instalada e este pacote é a v${version} (mais antigo). Nada foi alterado.`);
    info(`Use ${c.cyan('npx @aksp/opencrew@latest update')}.`);
    process.exitCode = 1;
  }
  return !newer;
}

async function apply(target, version) {
  // A manifest that exists but cannot be used is said so, then treated as none (R2 rule 12).
  const manifest = await readManifest(target);
  const unreadable = !manifest && (await manifestUnreadable(target));
  if (unreadable) warn(UNREADABLE.update);
  const ctx = newDelivery(target, manifest);

  step('Refreshing framework');
  const crews = await refreshFramework(ctx);
  ok(`Framework and catalog skills refreshed (${ctx.written} files written)`);
  say(recreatedLines(crews));

  step('Refreshing IDE bridges');
  const done = { unreadable, ...(await refreshBridges(ctx)) };
  done.mcp = await updateMcp(ctx, await readFile(tpl('.mcp.json')));
  done.leftovers = await findLeftovers(target);
  say(updateSummary(ctx, done));

  await writeManifest(target, version, ctx.files);
  // Stamp last: a crash above leaves the old version, so the next update retries.
  await fs.writeFile(path.join(target, '_opencrew', '.opencrew-version'), version + '\n');
  log(`\n${c.green(c.bold('Updated to v' + version))}.`);
  log(c.dim(`${UNTOUCHED}\n`));
}

/** @returns what `deliverTree` did to each crew template (only the missing ones are written). */
async function refreshFramework(ctx) {
  const dest = (...p) => path.join(ctx.target, ...p);
  await deliverTree(ctx, tpl('_opencrew', 'core'), dest('_opencrew', 'core'), { overwrite: true });
  await deliverFile(ctx, dest('_opencrew', 'core', 'system.md'), await fs.readFile(tpl('AGENTS.md')), { overwrite: true });
  await deliverTree(ctx, tpl('skills'), dest('skills'), { overwrite: true });
  // New framework folders (e.g. base agents since 1.3.2): only what is missing.
  for (const dir of ['agents', 'config', '_investigations']) {
    await deliverTree(ctx, tpl('_opencrew', dir), dest('_opencrew', dir), { overwrite: false });
  }
  return deliverTree(ctx, tpl('crews'), dest('crews'), { overwrite: false });
}

/** AGENTS.md, .gitignore and the bridges of the IDEs installed: what happened to each. */
async function refreshBridges(ctx) {
  const agents = await refreshAgentsBridge(ctx);
  // The copies in .opencrew-backup/ stay out of the user's git (R2 rule 7).
  const gitignore = await deliverBlock(ctx, '.gitignore', await readFile(tpl('gitignore')));
  const ides = await detectInstalledIdes(ctx.target);
  // 1.4.0/1.4.1 shipped the maintainer's STATUS.md workflow inside CLAUDE.md's opencrew block.
  // It leaves with the block; the same title outside the block is the user's and stays.
  const leaked = () => blockHas(ctx.target, 'CLAUDE.md', LEAKED_STATUS_SECTION);
  const hadLeak = await leaked();
  const bridges = await withoutLegacy(ctx, ides, () => deliverBridges(ctx, ides)); // R2 rule 3 (src/lib/legado.js)
  return { agents, gitignore, ides, bridges, leak: hadLeak && !(await leaked()) };
}

// Root AGENTS.md: a legacy full-system doc (pre-v1.3) is backed up byte for byte and replaced by
// the thin bridge (said here; returns null); otherwise only the marked block is delivered (a
// block the user edited is copied first — src/lib/blocos.js) and its result goes to the summary.
async function refreshAgentsBridge(ctx) {
  const agentsPath = path.join(ctx.target, 'AGENTS.md');
  const existing = (await exists(agentsPath)) ? await readFile(agentsPath) : '';
  if (existing.includes('# opencrew Instructions') && !existing.includes('<!-- opencrew:start -->')) {
    const backup = await freeBackupPath(agentsPath);
    await fs.copyFile(agentsPath, backup);
    await writeFileSafe(agentsPath, AGENTS_BRIDGE);
    ok(`AGENTS.md (migrated from legacy full-system to thin bridge — backed up to ${path.basename(backup)})`);
    return null;
  }
  return deliverBlock(ctx, 'AGENTS.md', AGENTS_BRIDGE);
}

async function freeBackupPath(file) {
  const bak = `${file}.bak`;
  if (!(await exists(bak))) return bak;
  return `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}
