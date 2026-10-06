import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { IDES, ideById, allIdeIds } from '../src/lib/ides.js';
import { USER_FILE_TITLES } from '../src/lib/deteccao.js';

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

test('no two IDEs write to the same file path with different content', () => {
  const seen = new Map(); // path -> { id, content }
  for (const ide of IDES) {
    for (const f of ide.files) {
      if (seen.has(f.path)) {
        const other = seen.get(f.path);
        assert.equal(
          f.content,
          other.content,
          `Path collision with different content: ${f.path} is written by both "${other.id}" and "${ide.id}" — shared paths must use identical content`
        );
      }
      seen.set(f.path, { id: ide.id, content: f.content });
    }
  }
});

test('workflow, skill, and command bridge files have YAML frontmatter with name', () => {
  // Files under workflows/, skills/, or commands/ register slash commands in IDEs.
  // They must have YAML frontmatter (--- ... ---).
  // workflows/ and skills/ also require a `name` field so the IDE registers the slash command.
  // commands/ files (OpenCode, etc.) infer the command name from the filename, so name is optional.
  const slashPaths = IDES.flatMap((ide) =>
    ide.files.filter((f) =>
      f.path.includes('workflows/') ||
      f.path.includes('skills/') ||
      f.path.includes('commands/')
    )
  );

  assert.ok(slashPaths.length > 0, 'expected at least one slash-command bridge file');

  for (const f of slashPaths) {
    assert.ok(
      f.content.startsWith('---'),
      `${f.path} must start with YAML frontmatter (---). Without it, the IDE won't register the slash command.`
    );
    assert.match(
      f.content,
      /^---\n[\s\S]*?\n---/,
      `${f.path} must have a complete YAML frontmatter block (opening --- and closing ---).`
    );

    // commands/ files (OpenCode) infer the name from the filename, so name is not required.
    if (!f.path.includes('commands/')) {
      assert.match(
        f.content,
        /^---[\s\S]*?\bname:\s*\S+/m,
        `${f.path} frontmatter must include a 'name' field so the IDE registers the slash command.`
      );
    } else {
      assert.match(
        f.content,
        /^---[\s\S]*?\bdescription:\s*\S+/m,
        `${f.path} frontmatter must include a 'description' field.`
      );
    }
  }
});

// AGENTS.md rule 2: bridges ship to every user's project — no maintainer workflow inside.
const MAINTAINER_MARKERS = [/STATUS\.md/, /Skill: \/status/, /\/ideias\b/, /gestão de sessão/i];

test('F1-01a: bridge content carries no maintainer-only workflow (STATUS.md, /status, /ideias)', () => {
  for (const ide of IDES) {
    for (const f of ide.files) {
      for (const rx of MAINTAINER_MARKERS) {
        assert.doesNotMatch(f.content, rx, `${ide.id} -> ${f.path} leaks maintainer content (${rx})`);
      }
    }
  }
});

test('F1-01b: templates/gitignore carries no maintainer-only entries', async () => {
  const gi = await readFile(new URL('../templates/gitignore', import.meta.url), 'utf8');
  assert.doesNotMatch(gi, /STATUS\.md/);
});

// spec R2, rule 1: the detection of the installed IDEs tells an instruction file OpenCrew
// shares with the user by its path (no "opencrew" in it) and by the title generated in it
// since 1.0.0. Both are written out here: a path or a title changed in ides.js would hide,
// without any other test failing, the installs made by the versions that wrote the old one.
const TITULOS_GERADOS = {
  'CLAUDE.md': '# opencrew — Project Instructions',
  '.github/copilot-instructions.md': '# opencrew — Copilot Instructions',
  'GEMINI.md': '# opencrew — Gemini CLI',
  'QWEN.md': '# opencrew — Qwen Code',
};

test('R2-01d: the 4 paths shared with the user and the 4 generated titles are the ones written out here', () => {
  const divididos = IDES.flatMap((ide) => ide.files).filter((f) => !f.path.includes('opencrew'));
  const gerados = Object.fromEntries(divididos.map((f) => [f.path, f.content.split('\n')[0]]));
  assert.deepEqual(gerados, TITULOS_GERADOS, 'what src/lib/ides.js generates today');
  assert.equal(divididos.length, 4, 'each of the 4 paths belongs to one IDE');
  assert.deepEqual({ ...USER_FILE_TITLES }, TITULOS_GERADOS, 'what the detection has fixed in the code');
});
