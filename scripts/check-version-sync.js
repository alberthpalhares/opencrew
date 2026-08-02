#!/usr/bin/env node
// Fails if templates/_opencrew/.opencrew-version has drifted from package.json's
// version. The "version" npm-lifecycle script keeps them in sync automatically
// when releasing via `npm version <bump>` — this check catches the case where
// someone edits package.json's version by hand instead. Run: node scripts/check-version-sync.js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const versionFile = path.join(root, 'templates', '_opencrew', '.opencrew-version');
const stamped = readFileSync(versionFile, 'utf8').trim();

if (stamped !== pkg.version) {
  console.error(
    `templates/_opencrew/.opencrew-version (${stamped}) does not match package.json ` +
    `version (${pkg.version}). Run "npm version <bump>" instead of editing package.json ` +
    `by hand — it stamps this file automatically.`
  );
  process.exit(1);
}

console.log(`.opencrew-version matches package.json (${pkg.version}).`);
