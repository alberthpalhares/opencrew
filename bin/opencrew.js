#!/usr/bin/env node
// opencrew — CLI entry point
import { run } from '../src/cli.js';

run(process.argv.slice(2)).catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
