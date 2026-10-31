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
  _opencrew/           framework core (runner, skills engine, prompts, best-practices,
                       scripts, and the Escritório page in _opencrew/core/escritorio/)
  skills/              catalog skills (README.md for humans, catalog.json for the engine)
docs/auditoria/        audit reports (finding → phase → guard)
scripts/               verify.js (the gate), check-size.js, version stamping
tests/                 test suite (node:test, zero deps)
sandbox/               your local dogfood workspace (gitignored, create it yourself)
.github/workflows/     CI (Ubuntu + Windows, Node 20.17/22/24) + npm publish
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

0. Once: the package's *Trusted Publisher* on npmjs.com points to this repository and `publish.yml`
   (see "Forking" below). Register it the day of the release: it expires in 2 days without a publish.
1. Update `CHANGELOG.md`.
2. `npm version <patch|minor|major>` — always use this, never hand-edit the `version`
   field in `package.json`. The `version` lifecycle script stamps
   `templates/_opencrew/.opencrew-version` to match automatically; CI
   (`scripts/check-version-sync.js`) fails the build if the two ever drift apart.
3. `git push --tags` — this is what actually triggers `publish.yml` (it fires on
   `push: tags: v'*'`; `npm version` above already created the tag locally). Push `main`
   first and wait for CI to be green: the publish workflow runs the same CI matrix (Ubuntu and
   Windows, Node 20.17, 22 and 24, plus `npm audit`) before publishing, and nothing is published if
   one cell fails. It then checks the tag against `package.json`, checks that this version is not
   on npm yet, checks the Node and npm versions, and runs `npm publish`, which authenticates by
   OIDC (see "Forking" below: the package's *Trusted Publisher* on npmjs.com). A manual run
   (`workflow_dispatch`) is a rehearsal by default (`dry_run`): it does not publish, and it fails if
   the version in `package.json` is already published.

## Como retomar o projeto

O OpenCrew está em desenvolvimento ativo, fase por fase. O roteiro vigente é `specs/fase-u7-roteiro.md`
(defeitos e riscos primeiro, recursos depois); o anterior, `specs/fase-u5-roteiro.md`, mostra o que a
fase de fechamento entregou e o que ficou de fora. Para desenvolver:

1. **Leia, nesta ordem:** `AGENTS.md` (as 15 regras e a tabela Regra → Trava), `GLOSSARIO.md` (os
   nomes do domínio) e `specs/fase-u7-roteiro.md` (o roteiro vigente) e `specs/fase-u5-roteiro.md`
   (o que a fase de fechamento entregou e o que ficou de fora). Cada versão publicada tem a spec dela em `specs/` e a entrada no `CHANGELOG.md`.
2. **O que ficou por fazer** está no `IDEIAS.md`: cada entrada diz a fase do roteiro que a recebe
   (`→ Fase Fx`) ou `sem fase`, com o motivo. Escolha a próxima fase do roteiro, escreva a spec e peça a
   aprovação do dono antes do código (ciclo da regra 1).
3. **A porta é uma só:** `npm run verify` (lint, testes, versão, tamanho, conteúdo do pacote). O CI
   e a publicação chamam o mesmo comando. Ela não cobre a IA seguindo os prompts: isso se confere
   com uma execução real numa pasta de teste (`sandbox/` ou uma pasta temporária), como as specs
   das fases U3 a U5 registram na seção de critérios de aceite.
4. **O que cada parte do produto é:** o CLI (`src/`) só instala e atualiza; o que a IA do usuário
   executa são os prompts e os scripts de `templates/_opencrew/core/`. O executor é o
   `runner.pipeline.md` (no teto de 560 linhas: regra nova vai para uma parte em `runner/`); os
   scripts gravam o que a IA não deve gravar (caminhos, registro da execução, histórico, entrega,
   conserto).
5. **Release:** a ordem da seção "Releasing", acima — `main` enviado, CI verde nas quatro células,
   e só então a tag `v*`, que publica no npm; depois, o release no GitHub com as notas do
   `CHANGELOG.md`. A máquina local pode estar num Node mais novo que o piso (20.17): só o CI prova.
6. **Toda mudança tem de chegar a quem já usa** com um `npx @aksp/opencrew@latest update`, sem tocar
   em `crews/` nem em `_opencrew/_memory/` (regras 3 e 14): cada fase tem um teste `upgrade-*`.

## Forking
If you publish your own fork of opencrew under a different name:

1. **Catalog URL** — Edit `templates/skills/catalog.json` → `baseUrl` to point to your
   fork's raw GitHub URL (e.g. `https://raw.githubusercontent.com/<you>/<repo>/main/templates/skills`).
   Alternatively, set the `OPENCREW_CATALOG_URL` env var at runtime — it takes precedence
   over `catalog.json` and lets you keep the file unmodified.
2. **Package name** — Update `name` in `package.json` and the `npx` commands in help text
   (`src/cli.js`), init messages (`src/commands/init.js`), and update messages
   (`src/commands/update.js`).
3. **npm publish** — The publish authenticates by OIDC; no token is stored. On npmjs.com, open
   your package → Settings → *Trusted Publisher* → GitHub Actions, and give your user or
   organization, the repository and the workflow file name (`publish.yml`). npm does not check
   this when you save: a typo shows up only when publishing, which then fails without publishing
   anything (an authentication error — `ENEEDAUTH` or a 404 on the PUT — fix it and re-run the
   failed job). A new trusted publisher expires if its first successful publish does not happen
   within 2 days. The package must already exist on npm to have the setting (publish the first
   version by hand, with 2FA, before registering the trusted publisher). Update `publish.yml` if
   you publish under a different scope or registry.
