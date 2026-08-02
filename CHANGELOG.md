# Changelog

All notable changes to opencrew are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] — 2026-08-02

### Fixed
- **Crews created without agent names**: some crews rendered their agents' functions
  (e.g. "Pesquisador") but not their persona names (e.g. "Pedro Pesquisa"). Root cause:
  `build.prompt.md` never specified the `crew-party.csv` schema, so the manifest could be
  generated without a `displayName` column — the exact column the Pipeline Runner reads to
  render agent names — even though the correct two-word names were present in each
  `.agent.md`. Build now documents the full CSV schema (header + example) and enforces it
  with a new blocking **Gate 0b: Crew-Party Manifest** that checks `displayName` exists and
  matches each agent's `.agent.md` `name:`.

### Added
- **`/opencrew repair <crew>`**: repairs an already-created crew whose manifest is missing
  agent names. It rebuilds `crew-party.csv` from the persona names already stored in each
  `.agent.md` (no re-generation of agents, research, or pipeline). New prompt at
  `_opencrew/core/prompts/repair.prompt.md`, routed via `AGENTS.md`.

### Migration
- To fix an existing crew that shows functions but no names:
  1. `npx @aksp/opencrew update` — refreshes the framework and installs the repair command.
  2. `/opencrew repair <crew>` — rewrites the crew's manifest with the correct names.
  `update` intentionally never touches `crews/`, so the repair step is required in addition
  to updating.

## [1.1.0] — 2026-08-01

### Fixed
- **Skill catalog URLs**: `/opencrew install` now fetches skills from the correct fork
  (`alberthpalhares/opencrew/templates/skills/`) instead of the upstream OpenSquad repo.
- **Publish workflow**: restored `push: tags` as the sole trigger — the actual release
  flow is `npm version` + `git push --tags`, not GitHub Releases. Documented in
  `CONTRIBUTING.md`.
- **Cross-platform test script**: replaced shell glob (`tests/*.test.js`) with an
  explicit file list so `npm test` works on Windows PowerShell + Node 20.
- **CI matrix**: test suite now runs on Ubuntu and Windows on every push/PR.

### Added
- **Test suite**: 30 tests (`node:test`) covering `fsx.js`, init, update, IDE bridge
  validation, and documentation contracts.
- **CI version-sync check**: `scripts/check-version-sync.js` fails the build if
  `.opencrew-version` drifts from `package.json`.
- **Playwright plugin warning**: `init` now warns Claude Code users to disable the
  native Playwright extension (opencrew ships its own via `.mcp.json`).

### Changed
- **Dashboard opt-in**: Pipeline Runner `state.json` writes are now gated on
  `Dashboard: enabled` in `preferences.md` (default: disabled). Removed the
  unconditional 10-second sleep at the end of every pipeline run.
- **Smaller fixes**: removed `AskUserQuestion` references from IDE-neutral files,
  corrected `update.js` comment about overwrite behavior, pinned `@playwright/mcp`
  version, removed stale root `skills/` directory (drifted duplicate of
  `templates/skills/`).

## [1.0.1] — 2026-08-01

### Changed
- API keys for optional skills are now requested conversationally in chat (during crew
  creation or skill install) instead of requiring the user to manually copy/edit `.env`
  beforehand. Values are collected and written to `.env` automatically.
- `init` no longer tells users to configure `.env` as a next step — no setup is required
  to start using opencrew.

## [1.0.0] — 2026-08-01

### Added
- npm-style installer: `npx @aksp/opencrew init` scaffolds a full opencrew workspace.
- `npx @aksp/opencrew update` refreshes only the framework (`_opencrew/core`, catalog
  skills, `AGENTS.md`) while preserving `crews/`, `_memory/`, IDE bridges and `.env`.
- Interactive IDE selection during `init` (or `--ide=`, `--all`, non-interactive fallback).
- Single source of truth: `AGENTS.md`. Every IDE receives only a thin bridge file that
  points to it — adding a new IDE is one entry in `src/lib/ides.js`.
- Version stamping via `_opencrew/.opencrew-version`, read by `update`.

### Notes
- Reformulation of the OpenSquad framework (originally by Renato Asse) published under
  the `opencrew` name by [aksp](https://www.npmjs.com/~aksp). MIT licensed.
