import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { IDES, ideById, allIdeIds } from '../src/lib/ides.js';

test('every IDE has a unique id and at least one non-empty, relative bridge file', () => {
  const ids = IDES.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate IDE ids found');

  for (const ide of IDES) {
    assert.ok(ide.label, `${ide.id} is missing a label`);
    assert.ok(ide.files.length > 0, `${ide.id} declares no bridge files`);
    for (const f of ide.files) {
      assert.ok(f.path && !path.isAbsolute(f.path), `${ide.id} has an unsafe file path: ${f.path}`);
      assert.ok(f.content && f.content.trim().length > 0, `${ide.id} -> ${f.path} has empty content`);
    }
  }
});

test('every bridge file content references the opencrew system entry point', () => {
  for (const ide of IDES) {
    for (const f of ide.files) {
      assert.match(
        f.content,
        /AGENTS\.md|_opencrew\/core\/system\.md/,
        `${ide.id} -> ${f.path} does not reference AGENTS.md or system.md`
      );
    }
  }
});

test('ideById resolves a known id and returns undefined for unknown ids', () => {
  assert.equal(ideById('claude-code').label, 'Claude Code');
  assert.equal(ideById('does-not-exist'), undefined);
});

test('allIdeIds returns every declared IDE id in order', () => {
  assert.deepEqual(allIdeIds(), IDES.map((i) => i.id));
});

test('no two IDEs write to the same file path', () => {
  const seen = new Map(); // path -> ide id
  for (const ide of IDES) {
    for (const f of ide.files) {
      if (seen.has(f.path)) {
        assert.fail(
          `Path collision: ${f.path} is written by both "${seen.get(f.path)}" and "${ide.id}"`
        );
      }
      seen.set(f.path, ide.id);
    }
  }
  // If we got here, all paths are unique.
  assert.equal(true, true);
});
