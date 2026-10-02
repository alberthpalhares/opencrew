// AGENTS.md rule 4: every _opencrew/... or skills/... path a prompt mentions exists in
// templates/, and every script a skill tells the AI to run lives inside that skill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tpl = path.join(root, 'templates');

// Paths created at runtime (not shipped), or ids that look like paths.
const RUNTIME_PATHS = [
  '_opencrew/_browser_profile', // Sherlock login sessions, created on first login
  '_opencrew/core/architect', // agent id, not a file
  'skills/.custom', // dynamically generated skills
  'skills/transcripts', // opencrew-skill-creator eval workspace
];

// Known-broken references, each with a destination. Remove the entry when fixed —
// the last test fails if a listed reference starts resolving.
// Format: 'ref or skill: path' → 'Alocação: → Fase N (item)'. Emptied by F1-11.
const KNOWN_BROKEN = {};

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

const docs = walk(tpl).filter((f) => /\.(md|ya?ml)$/.test(f));
const PATH_RX = /(?<![\w./-])((?:_opencrew|skills)\/[A-Za-z0-9_.\-/]+)/g;

function brokenPathRefs() {
  const broken = new Map();
  for (const file of docs) {
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(PATH_RX)) {
        if (/[{<*[]/.test(line[m.index + m[0].length] ?? '')) continue; // templated path
        const ref = m[1].replace(/[./]+$/, '');
        if (RUNTIME_PATHS.some((p) => ref === p || ref.startsWith(p + '/'))) continue;
        if (!existsSync(path.join(tpl, ref))) broken.set(ref, `${path.relative(root, file)}:${i + 1}`);
      }
    });
  }
  return broken;
}

const SCRIPT_RX = /([\w{}.-]+(?:\/[\w{}.-]+)*)\/(?:scripts|tools)\/([\w.-]+\.(?:js|py))/g;

function brokenSkillScripts() {
  const broken = new Map();
  const skillsDir = path.join(tpl, 'skills');
  for (const skill of readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const file = path.join(skillsDir, skill.name, 'SKILL.md');
    if (!existsSync(file)) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(SCRIPT_RX)) {
      const [whole, prefix, script] = m;
      const ownPrefix = prefix === '{skill_path}' || prefix === `skills/${skill.name}`;
      const exists = existsSync(path.join(skillsDir, skill.name, 'scripts', script));
      if (!ownPrefix || !exists) broken.set(`${skill.name}: ${whole}`, file);
    }
  }
  return broken;
}

test('every _opencrew/ and skills/ path referenced by the payload exists', () => {
  const broken = [...brokenPathRefs()].filter(([ref]) => !(ref in KNOWN_BROKEN));
  assert.deepEqual(broken, [], 'broken references:\n' + broken.map(([r, at]) => `  ${r}  (${at})`).join('\n'));
});

test('every script a SKILL.md runs is {skill_path}/scripts/<file> and exists', () => {
  const broken = [...brokenSkillScripts()].filter(([key]) => !(key in KNOWN_BROKEN));
  assert.deepEqual(broken, [], 'broken skill scripts:\n' + broken.map(([k]) => `  ${k}`).join('\n'));
});

// AGENTS.md rule 2, whole payload (not only the bridges in src/lib/ides.js).
test('no file in templates/ carries the maintainer workflow (STATUS.md, /status, /ideias, local paths)', () => {
  const markers = [/STATUS\.md/, /Skill: \/status/, /\/ideias\b/, /gestão de sessão/i, /[A-Z]:\\60-69/];
  const leaks = [];
  for (const file of walk(tpl)) {
    if (!/\.(md|ya?ml|json|js|py|html|txt)$|(^|[\\/])(gitignore|\.env\.example)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const rx of markers) if (rx.test(text)) leaks.push(`${path.relative(root, file)} (${rx})`);
  }
  assert.deepEqual(leaks, []);
});

test('KNOWN_BROKEN only lists references that are still broken', () => {
  const stillBroken = new Set([...brokenPathRefs().keys(), ...brokenSkillScripts().keys()]);
  for (const key of Object.keys(KNOWN_BROKEN)) {
    assert.ok(stillBroken.has(key), `"${key}" is fixed — remove it from KNOWN_BROKEN`);
  }
});
