#!/usr/bin/env node
// Stamps templates/_opencrew/.opencrew-version to match package.json.
// Called by the "version" npm lifecycle script so `npm version <bump>` keeps
// the two in sync automatically.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const versionFile = path.join(root, 'templates', '_opencrew', '.opencrew-version');
writeFileSync(versionFile, pkg.version + '\n');
console.log(`Stamped .opencrew-version with ${pkg.version}`);
