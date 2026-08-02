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
  lib/ui.js            terminal styling (zero deps)
  lib/paths.js         package-relative path resolution
templates/             the payload copied into user projects on `init`
  AGENTS.md            canonical system definition (the ONE source of truth)
  _opencrew/           framework core (runner, skills engine, prompts, best-practices)
  skills/              catalog skills (README.md for humans, catalog.json for the engine)
dashboard/             virtual office — self-contained HTML file (zero build)
tests/                 test suite (node:test, zero deps)
.github/workflows/     CI (Ubuntu + Windows, Node 20/22) + npm publish
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
npm test                              # unit + integration tests (tests/*.test.js)

mkdir /tmp/try && cd /tmp/try
node /path/to/opencrew/bin/opencrew.js init --ide=claude-code
npm --prefix /path/to/opencrew pack   # dry-run the published tarball
```

## Releasing

1. Update `CHANGELOG.md`.
2. `npm version <patch|minor|major>` — always use this, never hand-edit the `version`
   field in `package.json`. The `version` lifecycle script stamps
   `templates/_opencrew/.opencrew-version` to match automatically; CI
   (`scripts/check-version-sync.js`) fails the build if the two ever drift apart.
3. `git push --tags` — this is what actually triggers `publish.yml` (it fires on
   `push: tags: v'*'`; `npm version` above already created the tag locally). CI runs
   the test suite, then `npm publish`. You normally don't need to run `npm publish`
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
