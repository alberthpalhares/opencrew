import path from 'node:path';
import { promises as fs } from 'node:fs';
import { templatesDir, packageJsonPath } from '../lib/paths.js';
import { exists, writeFileSafe, readJson, writeBridgeFile, readFile } from '../lib/fsx.js';
import { AGENTS_BRIDGE, LEAKED_STATUS_SECTION, ideById } from '../lib/ides.js';
import { readManifest, writeManifest, newDelivery, deliverTree, deliverFile } from '../lib/manifest.js';
import { compareVersions, detectInstalledIdes, refreshBridges, mergeMcp, findLegacyBridges } from '../lib/migrations.js';
import { c, log, info, ok, warn, err, step } from '../lib/ui.js';

// `update` brings EVERY improvement to people who already use OpenCrew (AGENTS.md rule 14),
// without losing what they made:
//   - _opencrew/core and catalog skills are replaced — a file the user edited is copied to
//     .opencrew-backup/<date>/ first (manifest of hashes; none = copy whatever differs);
//   - new framework folders (agents, config, crew templates) arrive without overwriting;
//   - bridges of the IDEs already installed are refreshed (never new IDEs);
//   - crews/, _opencrew/_memory/, _opencrew/best-practices.local/ and .env are never touched.
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
  const newer = current !== 'unknown' && compareVersions(current, version) > 0;

  log(`\n${c.bold(c.cyan('opencrew update'))}`);
  log(c.dim(`Installed: ${current}  →  Package: ${version}\n`));

  if (opts.check) {
    if (current === version) ok(`Up to date (v${version}).`);
    else if (newer) info(`A versão instalada (v${current}) é mais nova que este pacote (v${version}).`);
    else {
      info(`Update available: v${current} → v${version}.`);
      info(`Run ${c.cyan('npx @aksp/opencrew update')} to apply.`);
      process.exitCode = 1;
    }
    return;
  }

  if (newer) {
    err(`Você tem a v${current} instalada e este pacote é a v${version} (mais antigo). Nada foi alterado.`);
    info(`Use ${c.cyan('npx @aksp/opencrew@latest update')}.`);
    process.exitCode = 1;
    return;
  }

  const manifest = await readManifest(target);
  const ctx = newDelivery(target, manifest);
  const tpl = (...p) => path.join(templatesDir, ...p);
  const dest = (...p) => path.join(target, ...p);

  step('Refreshing framework');
  await deliverTree(ctx, tpl('_opencrew', 'core'), dest('_opencrew', 'core'), { overwrite: true });
  await deliverFile(ctx, dest('_opencrew', 'core', 'system.md'), await fs.readFile(tpl('AGENTS.md')), { overwrite: true });
  await deliverTree(ctx, tpl('skills'), dest('skills'), { overwrite: true });
  // New framework folders (e.g. base agents since 1.3.2): only what is missing.
  for (const dir of ['agents', 'config', '_investigations']) {
    await deliverTree(ctx, tpl('_opencrew', dir), dest('_opencrew', dir), { overwrite: false });
  }
  await deliverTree(ctx, tpl('crews'), dest('crews'), { overwrite: false });
  ok(`Framework and catalog skills refreshed (${ctx.written} files written)`);

  step('Refreshing IDE bridges');
  await refreshAgentsBridge(target);
  const ides = await detectInstalledIdes(target);
  await refreshBridges(ctx, ides);
  ok(ides.length ? `Bridges refreshed: ${ides.map((i) => i.label).join(', ')}` : 'No IDE bridges found to refresh');
  await removeLeakedStatusSection(target);

  const mcp = await mergeMcp(target, tpl('.mcp.json'));
  if (mcp === 'updated' || mcp === 'created') ok(`.mcp.json (Playwright: ${mcp === 'created' ? 'created' : 'saída em _opencrew/logs/playwright/'})`);
  if (mcp === 'invalid') warn('.mcp.json não é um JSON válido — não alterado. Confira o arquivo.');

  for (const legacy of await findLegacyBridges(target)) {
    warn(`Ponte antiga encontrada: ${legacy} (aponta para _opensquad/, que não existe neste projeto). Pode apagar com segurança.`);
  }

  if (ctx.copied.length) {
    const rel = path.relative(target, ctx.backupDir).split(path.sep).join('/');
    const what = manifest ? 'que você tinha editado' : 'diferentes do pacote novo';
    warn(`${ctx.copied.length} arquivo(s) ${what} foram copiados para ${rel}/ antes de serem substituídos:`);
    for (const f of ctx.copied.slice(0, 15)) log(`    ${f}`);
    if (ctx.copied.length > 15) log(`    … e mais ${ctx.copied.length - 15}`);
    if (!manifest) info('Primeira atualização com proteção: sem registro anterior, guardamos tudo o que diferia. Daqui em diante, só o que você editar.');
  }

  await writeManifest(target, version, ctx.files);
  // Stamp last: a crash above leaves the old version, so the next update retries.
  await fs.writeFile(versionFile, version + '\n');
  log(`\n${c.green(c.bold('Updated to v' + version))}.`);
  log(c.dim('Your crews, memory, local best-practices and .env were left untouched.\n'));
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
