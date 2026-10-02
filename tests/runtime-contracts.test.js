// Contracts the runtime prompts must keep (specs/fase-1-hotfix.md F1-08, F1-09, F1-11..F1-13).
// These guard the TEXT of the rules; whether a model obeys them is checked in sandbox/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../templates/${rel}`, import.meta.url), 'utf8');
const design = read('_opencrew/core/prompts/design.prompt.md');
const build = read('_opencrew/core/prompts/build.prompt.md');
const runner = read('_opencrew/core/runner.pipeline.md');

function sections(md) {
  return md.split(/\n(?=#{2,4} )/);
}

test('F1-08a: every pipeline pattern publishes/sends only after Review and Final Approval', () => {
  const patterns = design.split('\n').filter((l) => l.includes('→') && /Review/.test(l) && /checkpoint/i.test(l));
  assert.ok(patterns.length >= 4, `expected the pattern + presentation lines, got ${patterns.length}`);
  for (const line of patterns) {
    assert.doesNotMatch(line, /\[Execution( Steps)?\]/, `ambiguous [Execution] step: ${line}`);
    const pub = line.indexOf('[Publish/Send');
    const review = line.lastIndexOf('Review');
    assert.ok(pub > review && review > -1, `publish must come after Review: ${line}`);
    assert.match(line.slice(review, pub), /Approv/, `a final approval checkpoint must sit between Review and publish: ${line}`);
  }
});

test('F1-08b: build has a BLOCKING gate that keeps irreversible steps after Review + checkpoint', () => {
  const gate = sections(build).find((s) => /^### Gate 2c/.test(s));
  assert.ok(gate, 'missing "### Gate 2c"');
  assert.match(gate.split('\n')[0], /BLOCKING/);
  assert.match(gate, /side_effects: irreversible/);
  assert.match(gate, /Review/);
  assert.match(gate, /checkpoint/);
});

test('F1-09a: the step format defines side_effects: irreversible', () => {
  const format = sections(build).find((s) => s.startsWith('### Pipeline Step Format'));
  assert.match(format, /side_effects: irreversible/);
});

test('F1-09b: no automatic retry or veto auto-fix ever re-runs an irreversible step', () => {
  const retrying = sections(runner).filter((s) => /retry once|veto fix attempts/i.test(s));
  assert.ok(retrying.length >= 3, `expected output-validation, veto and error-handling sections, got ${retrying.length}`);
  for (const s of retrying) {
    assert.match(s, /side_effects: irreversible/, `section without the irreversible exception:\n${s.split('\n')[0]}`);
    assert.match(s, /may already have (happened|been)/i, `section must warn the action may already have happened:\n${s.split('\n')[0]}`);
  }
});

test('F1-11b: instagram-publisher reads images from the current run; image-creator renders JPEG for Instagram', () => {
  const ig = read('skills/instagram-publisher/SKILL.md');
  assert.match(ig, /crews\/\{crew\}\/output\/\{run_id\}\//);
  assert.doesNotMatch(ig, /output\/images\//);
  const creator = read('skills/image-creator/SKILL.md');
  assert.match(creator, /Instagram[\s\S]{0,200}jpeg/i);
});

test('F1-11c: image-ai-generator runs its own script and documents Windows', () => {
  const gen = read('skills/image-ai-generator/SKILL.md');
  assert.doesNotMatch(gen, /skills\/image-generator\//);
  assert.match(gen, /\{skill_path\}\/scripts\/generate\.py/);
  assert.match(gen, /py -3/);
});

test('F1-12a: the dashboard toggle rule matches the bold list format preferences.md writes', () => {
  assert.match(read('_opencrew/_memory/preferences.md'), /- \*\*Dashboard:\*\* disabled/);
  assert.match(runner, /- \*\*Dashboard:\*\* enabled/);
});

test('F1-13a: system definition keeps the title used by legacy AGENTS.md detection', () => {
  assert.equal(read('AGENTS.md').split('\n')[0].trim(), '# opencrew Instructions');
});
