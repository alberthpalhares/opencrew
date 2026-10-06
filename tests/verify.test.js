// Proveta for the verification gate (AGENTS.md rule 7): a gate that never saw red
// doesn't count. These prove runSteps fails on a broken step and stops there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSteps, defaultSteps } from '../scripts/verify.js';

const node = process.execPath;
const quiet = () => {};
const ok = (name) => ({ name, cmd: node, args: ['-e', ''] });
const fail = (name, code = 3) => ({ name, cmd: node, args: ['-e', `process.exit(${code})`] });

test('verify returns 0 when every step passes', () => {
  assert.equal(runSteps([ok('a'), ok('b')], { log: quiet }), 0);
});

test('verify returns 1 when a step fails, and stops at the first failure', () => {
  const ran = [];
  const spawn = (cmd, args, opts) => {
    ran.push(args.at(-1));
    return { status: args.at(-1).includes('exit') ? 3 : 0, opts };
  };
  const code = runSteps([ok('a'), fail('broken'), ok('never')], { spawn, log: quiet });
  assert.equal(code, 1);
  assert.deepEqual(ran, ['', 'process.exit(3)']);
});

test('verify really fails with a real failing child process', () => {
  assert.equal(runSteps([fail('real', 7)], { log: quiet }), 1);
});

test('default steps cover lint, test, version-sync and size, and call node directly', () => {
  const steps = defaultSteps();
  assert.deepEqual(steps.map((s) => s.name), ['lint', 'test', 'version-sync', 'size (alert only)']);
  for (const s of steps) assert.equal(s.cmd, process.execPath, `${s.name} must spawn node directly`);
  const testStep = steps.find((s) => s.name === 'test');
  assert.ok(testStep.args.some((a) => a.endsWith('verify.test.js')), 'test step discovers every tests/*.test.js');
});

test('E1: the lint step covers the office page shipped in the payload, next to the runtime scripts', () => {
  const lint = defaultSteps().find((s) => s.name === 'lint');
  for (const pasta of ['templates/_opencrew/core/scripts/', 'templates/_opencrew/core/escritorio/']) {
    assert.ok(lint.args.includes(pasta), `lint must cover ${pasta}`);
  }
});
