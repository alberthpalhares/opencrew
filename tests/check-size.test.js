// Proveta for the size alert (AGENTS.md rule 6): oversized files are classified in the
// right band, and files within target are not reported.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, band } from '../scripts/check-size.js';

test('bands follow the percentage of the target', () => {
  assert.equal(band(1.0), null);
  assert.equal(band(1.05), 'aviso');
  assert.equal(band(1.2), 'atencao');
  assert.equal(band(1.4), 'alto');
  assert.equal(band(1.6), 'critico');
});

test('each category uses its own target', () => {
  assert.equal(classify('src/lib/x.js', 200), null);
  assert.equal(classify('src/lib/x.js', 320).level, 'critico');
  assert.equal(classify('tests/x.test.js', 320).level, 'aviso');
  assert.equal(classify('templates/_opencrew/core/runner.pipeline.md', 829).level, 'critico');
  assert.equal(classify('README.md', 5000), null, 'files outside the categories are ignored');
});
