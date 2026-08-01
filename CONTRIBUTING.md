# Contributing to opencrew

Thanks for your interest! opencrew is a multi-agent orchestration framework distributed
as an npm CLI. This guide explains the repository layout so contributions land in the
right place.

## Repository layout

```
bin/opencrew.js        CLI entry point
src/                   CLI implementation
  cli.js               argument parsing + command routing
  commands/init.js     scaffolding logic
  commands/update.js   framework-only refresh
  lib/ides.js          IDE bridge map (single source of truth = AGENTS.md)
  lib/fsx.js           filesystem helpers
  lib/prompts.js       interactive prompts (+ non-interactive fallback)
templates/             the payload copied into user projects on `init`
  AGENTS.md            canonical system definition (the ONE source of truth)
  _opencrew/          framework core (agents, pipeline, prompts, best-practices)
  skills/              catalog skills
```

## Golden rules

1. **AGENTS.md is the single source of truth.** Never duplicate system instructions into
   per-IDE files. IDE files are thin bridges generated from `src/lib/ides.js` — they only
   point to `AGENTS.md` (plus, at most, a few IDE-specific overrides clearly marked).
2. **Adding a new IDE = one entry** in `src/lib/ides.js`. Do not hand-write full instruction
   documents per tool.
3. **`update` must never touch user data** — `crews/`, `_opencrew/_memory/`, `.env`,
   and generated IDE bridges are off limits.
4. **Skills follow the SKILL.md contract** (frontmatter + `When to use` → `Instructions`).
   See `templates/skills/opencrew-skill-creator/` for the format reference.

## Local testing

```bash
npm install
mkdir /tmp/try && cd /tmp/try
node /path/to/opencrew/bin/opencrew.js init --ide=claude-code
npm --prefix /path/to/opencrew pack   # dry-run the published tarball
```

## Releasing

1. Update `CHANGELOG.md`.
2. `npm version <patch|minor|major>` (also stamps `.opencrew-version`).
3. `npm publish`.
