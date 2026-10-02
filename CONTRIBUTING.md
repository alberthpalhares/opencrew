# Contributing to opencrew

Thanks for your interest! opencrew is a multi-agent orchestration framework distributed
as an npm CLI. This guide explains the repository layout so contributions land in the
right place.

> **Development rules live in [`AGENTS.md`](AGENTS.md)** (root): tier, work cycle,
> Rule → Guard table. Read it first. This file only explains layout and workflow.

## Repository layout

```
AGENTS.md              DEVELOPMENT rules for this repo (not the product runtime)
bin/opencrew.js        CLI entry point
src/                   CLI implementation
  cli.js               argument parsing + command routing
  commands/init.js     scaffolding logic
  commands/update.js   framework-only refresh
  lib/ides.js          IDE bridge map (bridges point to _opencrew/core/system.md)
  lib/fsx.js           filesystem helpers
  lib/prompts.js       interactive prompts (+ non-interactive fallback)
  lib/ui.js            terminal styling (zero deps)
  lib/paths.js         package-relative path resolution
templates/             the payload copied into user projects on `init`
  AGENTS.md            canonical RUNTIME system definition → installed as
                       _opencrew/core/system.md (root AGENTS.md becomes a thin bridge)
  _opencrew/           framework core (runner, skills engine, prompts, best-practices)
  skills/              catalog skills (README.md for humans, catalog.json for the engine)
dashboard/             virtual office — experimental, NOT shipped in the npm package
docs/auditoria/        audit reports (finding → phase → guard)
scripts/               verify.js (the gate), check-size.js, version stamping
tests/                 test suite (node:test, zero deps)
sandbox/               your local dogfood workspace (gitignored, create it yourself)
.github/workflows/     CI (Ubuntu + Windows, Node 20/22) + npm publish
```

## Golden rules

1. **`templates/AGENTS.md` is the single source of truth for the runtime.** Never
   duplicate system instructions into per-IDE files. IDE files are thin bridges generated
   from `src/lib/ides.js` — they only point to the system definition (plus, at most, a few
   IDE-specific overrides clearly marked). Nothing maintainer-specific goes into the
   payload (`AGENTS.md` rule 2).
2. **Adding a new IDE = one entry** in `src/lib/ides.js`. Do not hand-write full instruction
   documents per tool.
3. **`update` must never lose user data** — `crews/`, `_opencrew/_memory/`,
   `_opencrew/best-practices.local/` and `.env` are off limits; anything the user edited in
   files OpenCrew replaces (core, catalog skills, whole-file bridges) is copied to
   `.opencrew-backup/<date>/` first; shared files (`AGENTS.md`, `CLAUDE.md`, `.gitignore`,
   `.mcp.json`) only get the opencrew block/server changed. And every runtime change must reach
   existing installs through `update` (AGENTS.md rule 14, `tests/upgrade.test.js`).
4. **Skills follow the SKILL.md contract** (frontmatter + `When to use` → `Instructions`).
   See `templates/skills/opencrew-skill-creator/` for the format reference.

## Local testing

```bash
npm install
npm run verify                        # THE gate: lint + tests + version-sync + size alert
npm test                              # tests only (every tests/*.test.js, auto-discovered)
```

Say "done" only when `npm run verify` exits 0. It does **not** cover a real AI running the
prompts — check that in the sandbox:

```bash
mkdir sandbox && cd sandbox           # gitignored
node ../bin/opencrew.js init --ide=claude-code
```

Never install the runtime at the repo root: its `AGENTS.md` would collide with the
development rules.

## Releasing

1. Update `CHANGELOG.md`.
2. `npm version <patch|minor|major>` — always use this, never hand-edit the `version`
   field in `package.json`. The `version` lifecycle script stamps
   `templates/_opencrew/.opencrew-version` to match automatically; CI
   (`scripts/check-version-sync.js`) fails the build if the two ever drift apart.
3. `git push --tags` — this is what actually triggers `publish.yml` (it fires on
   `push: tags: v'*'`; `npm version` above already created the tag locally). CI checks
   the tag against `package.json`, runs `npm run verify`, then `npm publish`. You normally don't need to run `npm publish`
   by hand.

## Forking

If you publish your own fork of opencrew under a different name:

1. **Catalog URL** — Edit `templates/skills/catalog.json` → `baseUrl` to point to your
   fork's raw GitHub URL (e.g. `https://raw.githubusercontent.com/<you>/<repo>/main/templates/skills`).
   Alternatively, set the `OPENCREW_CATALOG_URL` env var at runtime — it takes precedence
   over `catalog.json` and lets you keep the file unmodified.
2. **Package name** — Update `name` in `package.json` and the `npx` commands in help text
   (`src/cli.js`), init messages (`src/commands/init.js`), and update messages
   (`src/commands/update.js`).
3. **npm publish** — Set the `NPM_TOKEN` secret in your repo's GitHub Actions and update
   `publish.yml` if you publish under a different scope or registry.
