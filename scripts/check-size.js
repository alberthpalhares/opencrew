#!/usr/bin/env node
// File-size ALERT (AGENTS.md rule 6) — never fails, always exits 0.
// Bands are a percentage of the target for the file's category:
//   aviso 100–110% · atencao 110–130% · alto 130–150% · critico >150%
// Prompts count too: every line of a core prompt is paid in tokens on every run.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// First match wins.
export const CATEGORIES = [
  { name: 'test', target: 300, match: (p) => p.startsWith('tests/') && p.endsWith('.js') },
  { name: 'code', target: 200, match: (p) => /^(src|bin|scripts)\//.test(p) && p.endsWith('.js') },
  // Scripts shipped in the payload (e.g. the automatic checker) are code, not prompts.
  { name: 'runtime-script', target: 200, match: (p) => /^templates\/.*\/scripts\/.*\.m?js$/.test(p) },
  // So are the modules of the office page (E1), which run in the user's browser.
  { name: 'office-page', target: 200, match: (p) => /^templates\/_opencrew\/core\/escritorio\/.*\.js$/.test(p) },
  { name: 'prompt', target: 400, match: (p) => p.startsWith('templates/_opencrew/core/') && p.endsWith('.md') },
];

const SCAN_DIRS = ['bin', 'src', 'scripts', 'tests', 'templates/_opencrew/core'];

export function band(ratio) {
  if (ratio > 1.5) return 'critico';
  if (ratio > 1.3) return 'alto';
  if (ratio > 1.1) return 'atencao';
  if (ratio > 1.0) return 'aviso';
  return null;
}

export function classify(relPath, lines) {
  const cat = CATEGORIES.find((c) => c.match(relPath));
  if (!cat) return null;
  const ratio = lines / cat.target;
  const level = band(ratio);
  return level ? { path: relPath, lines, target: cat.target, ratio, level } : null;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

function main() {
  const hits = [];
  for (const d of SCAN_DIRS) {
    for (const abs of walk(path.join(root, d))) {
      const rel = path.relative(root, abs).split(path.sep).join('/');
      const lines = readFileSync(abs, 'utf8').split(/\r?\n/).length;
      const hit = classify(rel, lines);
      if (hit) hits.push(hit);
    }
  }
  hits.sort((a, b) => b.ratio - a.ratio);
  if (hits.length === 0) {
    console.log('size: every file is within its target.');
    return;
  }
  console.log('size alerts (not blocking):');
  for (const h of hits) {
    console.log(`  ${h.level.padEnd(8)} ${String(Math.round(h.ratio * 100)).padStart(4)}%  ${h.lines}/${h.target}  ${h.path}`);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
  process.exitCode = 0;
}
