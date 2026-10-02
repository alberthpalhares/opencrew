#!/usr/bin/env node
// opencrew — CLI entry point
import { run, reportError } from '../src/cli.js';

// run() reports its own errors; this only catches a failure inside the reporter itself.
run(process.argv.slice(2)).catch((e) => {
  process.exitCode = reportError(e);
});
