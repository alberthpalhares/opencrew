# Changelog

All notable changes to opencrew are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.4.1] — 2026-08-04

### Fixed
- **NPM publish**: v1.4.0 já existia no registro. Re-publicado como 1.4.1.

## [1.4.0] — 2026-08-04

### Added
- **Seleção automática de agentes (IDEIAS #8)**: o Pipeline Runner agora analisa
  a solicitação do usuário contra uma matriz de decisão e sugere quais agentes são
  realmente necessários para aquela tarefa. O usuário confirma ou ajusta a seleção
  antes da execução. Agentes excluídos têm seus steps pulados automaticamente.
  - `runner.pipeline.md` — step 4b (Pre-Execution Agent Selection) com matriz de
    6 sinais PT-BR/EN, menu multi-select IDE-neutral, alertas de dependências
    quebradas, e step 0 de skip condicional no loop de execução.
  - `crew.yaml` — novo campo `agent_dependencies:` (opcional). O step de seleção
    só dispara quando o campo existe — crews antigas mantêm comportamento idêntico.
  - `build.prompt.md` — schema do `agent_dependencies:`, campo `agent:` opcional
    em checkpoints, gate de validação.
  - `AGENTS.md` — step 7b na seção Loading the Pipeline Runner.
  - 3 novos testes de contrato em `docs.test.js`.

## [1.3.3] — 2026-08-03

### Fixed
- **Auditoria D3 — cobertura de testes**: `--all` test agora verifica os 10 bridges
  (eram 5). Teste de scaffold verifica `_opencrew/agents/`. +2 testes no update
  (`--check` mismatch + refresh de `system.md`/bridge).

### Security
- **Auditoria D4 — segurança e robustez**: `escapeRx` verificada para todos os
  caracteres especiais regex. Todos os paths usam `path.join` (zero concatenação).

## [1.3.2] — 2026-08-03

### Fixed
- **Auditoria D2 — consistência de prompts**: coluna `Score` adicionada à migração
  OLD_FORMAT do `runs.md`. Passos de injeção do runner renumerados (memory=4,
  format=5, skill=6) para refletir a ordem real de composição. Números de fase
  corrigidos no `skills.engine.md` (3.5/5 → descritivos) e `discovery.prompt.md`
  (Phase 2 → 3). Campo `domains` reconciliado entre discovery e design.
  Referência ao diretório inexistente `ide-templates/` removida.

## [1.3.1] — 2026-08-03

### Fixed
- **Auditoria D1 — código TypeScript**: `--version`/`-v` não executa mais `init`.
  `--yes`/`-y` agora funciona (seleciona todos os IDEs automaticamente).
  `writeBridgeFile` não corrompe mais arquivos com frontmatter YAML (SKILL.md,
  `.mdc`). `--ide` sem valor não produz mais warning "Unknown IDE 'true'".
  Fase G.5 renomeada para H.5 no `architect.agent.yaml`. `model_tier` de
  pesquisador alinhado entre build e design/runner (`fast`).
  `template_selection` adicionado ao schema do `design.yaml`. Tier e domains
  de templates agora persistem no `discovery.yaml`.

## [1.3.0] — 2026-08-03

### Added
- **Instalação não-destrutiva**: `writeBridgeFile` com estratégia de blocos
  marcados (`<!-- opencrew:start/end -->`). `AGENTS.md` agora é uma ponte fina;
  sistema completo em `_opencrew/core/system.md`. Merge preserva conteúdo
  existente em todos os arquivos de bridge (CLAUDE.md, GEMINI.md, QWEN.md, etc.).
- **Sherlock multi-fonte**: novos extratores `sherlock-web.md` (pesquisa em
  sites públicos), `sherlock-seo.md` (keywords e content gaps), e
  `sherlock-trends.md` (trending topics de 9 fontes). Orquestração multi-fonte
  no `sherlock-shared.md` com matriz de seleção por tipo de crew.
- **Templates de crew por setor**: 4 templates em `templates/crews/`:
  blog-semanal, instagram-carrossel, newsletter-mensal, lancamento-produto.
  Template selection no Step 0 do Discovery.
- **Exportação multi-formato**: `export.prompt.md` com suporte a PDF
  (Playwright), CSV (compatível Excel), e formatted-post (por plataforma).
- **Criação por papéis**: `design.prompt.md` refatorado — Phase D = Role
  Proposal (sugere pessoas, não ferramentas), Phase E = Skill Mapping
  (resolve skills automaticamente). Tabela de mapeamento para 12 papéis.
- **Tiers de crew**: usuário escolhe Express/Standard/Full na criação.
  Impacto no número de agentes, checkpoints, Sherlock, e model_tier.
  Campo `tier` no `design.yaml` e `Default Tier` no `preferences.md`.
- **Aprendizado contínuo**: Post-Run Reflection com detecção de padrões
  recorrentes. Regras de Ouro após 3+ ocorrências. Crew Memory Rules
  injetadas no prompt dos agentes. Coluna `Score` no `runs.md`.
- **Registro compartilhado de agentes**: 5 agentes base em
  `_opencrew/agents/` (researcher, copywriter, reviewer, designer,
  strategist). Sistema `extends:` para herança de agentes. Gate 0c
  para validação de referências.
- **Criação dinâmica de skills**: Operation 3a no `skills.engine.md`
  para geração automática de SKILL.md. Skills geradas em
  `skills/.custom/` (não afetadas por `update`).

### Changed
- **85→91 testes** (eram 64 na v1.2.2). 103 arquivos no pacote npm.
- **Todas as 8 ideias do `IDEIAS.md` implementadas** (backlog zerado).

## [1.2.2] — 2026-08-02

### Fixed
- **`parseArgs` truncates values containing `=`**: flags like `--description=foo=bar`
  no longer lose everything after the second `=`.
- **`version` npm script uses `require()` in ESM project**: extracted to a dedicated
  `scripts/stamp-version.js` that uses proper ESM imports.
- **`skills.engine.md` numbering was out of order** in Operation 2 (Install a Skill):
  steps 3/4 repeated instead of continuing 5–9. Cross-references updated accordingly.
- **`init` now aborts when a workspace already exists** instead of proceeding with
  `overwrite: false` (which silently did nothing). It prints instructions to use
  `update` or reinstall from scratch.
- **`deleteDir` semantics**: now returns `false` when the path does not exist (was `true`).
- **`.env.example` placeholders** (`[REDACTED:API key param]`) removed — these were
  security-redaction artifacts from the tooling, not real file content. No code change.

### Added
- **Short flags**: `-y` (yes), `-v` (version), `-h` (help) now work alongside their
  `--long-form` equivalents.
- **`OPENCREW_CATALOG_URL` env var**: forks can override the skill catalog base URL
  without editing `catalog.json`. Documented in `CONTRIBUTING.md` → Forking.
- **`update` now warns** that catalog skills are fully overwritten before refreshing them.
- **`readJson` error messages now include the file path** (e.g. `Failed to read
  /path/to/package.json: file not found`).
- **`pickIdes` validates preselected IDs**: unknown IDs from `--ide` are filtered with
  a warning instead of being passed through silently.
- **`c.gray` removed** (unused). **`confirm()` removed** (dead code, never imported).
- **ESLint** (`eslint.config.js` + `npm run lint` + CI step) with `@eslint/js` flat config.
- **55 tests** (up from 30): new coverage for `paths.js`, `ui.js`, `fsx.js` error
  scenarios, `normalizeIdes` string input, CLI smoke tests.

### Changed
- **CI `npm audit` raised from `moderate` to `high`** to avoid spurious build failures
  from dev-dependency vulnerabilities without attack vectors.
- **Playwright config**: `channel: "chrome"` removed — uses bundled Chromium for better
  portability. `.mcp.json` now includes a `_comment` field explaining how to upgrade the
  pinned `@playwright/mcp` version.
- **Node version check** in `cli.js` now uses a proper semver comparison that handles
  `||` ranges (e.g. `>=18.0.0 || >=20.0.0`).

### Docs
- **`discovery.prompt.md`**: `crew_code` uniqueness is now self-service (`ls crews/`)
  instead of depending on the orchestrator to pass a list.
- **`runner.pipeline.md`**: language contract table documents all fixed PT-BR headers
  and the policy for adding new ones.
- **`CONTRIBUTING.md`**: new "Forking" section with catalog URL, package name, and
  publish instructions.

## [1.2.1] — 2026-08-02

### Changed
- **Menu discovery for repair**: the "My crews" menu entry now mentions `repair`, so the
  command introduced in 1.2.0 is discoverable from the menu and not only from the command
  routing table.
- **README**: standardized the project name as "OpenCrew" in prose (commands and the npm
  package name stay lowercase).

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
