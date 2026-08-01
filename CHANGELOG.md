# Changelog

All notable changes to opencrew are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

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
