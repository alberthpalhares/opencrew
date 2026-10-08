# Memory format

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only when `memories.md` has no `## Estilo de Escrita` section header, is empty or does not exist.

**Note on language**: The structural labels listed below are **fixed PT-BR** and must
never be translated — opencrew's primary supported audience is PT-BR (see AGENTS.md →
Language Handling). Only the *content* written under these headers follows the user's
preferred language.

| Fixed PT-BR header | Location | Purpose |
|---|---|---|
| `## Estilo de Escrita` | `memories.md` | Writing style rules accumulated per crew |
| `## Design Visual` | `memories.md` | Visual design preferences per crew |
| `## Estrutura de Conteúdo` | `memories.md` | Content structure rules per crew |
| `## Proibições Explícitas` | `memories.md` | User bans and hard blocks per crew |
| `## Regras de Ouro` | `memories.md` | Corrections repeated in 3 or more runs, promoted at the end of a run |
| `## Técnico (específico do crew)` | `memories.md` | Technical crew-specific settings |
| `Data \| Run ID \| Tema \| Output \| Score \| Resultado` | `runs.md` | Run history table columns |

When adding new structural sections to `memories.md` or `runs.md`, keep headers in PT-BR
unless the user base expands beyond PT-BR — at that point, discuss a migration strategy
(e.g. i18n key mapping) rather than mixing languages in a single file.

## Migration

**Memory format migration** — After loading `memories.md`, check whether it uses the new format: it does when it has the `## Estilo de Escrita` section header (read the file with the read tool — no command).
   - If it has the header → proceed normally.
   - If it does not (or the file is empty / does not exist) → migrate before proceeding:
     a0. If the file exists and is not empty, FIRST copy it to `crews/{name}/_memory/memories.md.bak`
        (never lose what the crew learned), then tell the user in one line:
        "Atualizei o formato da memória da crew; a versão anterior está em `memories.md.bak`."
        Move every rule you can recognize from the old file into the matching new section.
     a. Write `crews/{name}/_memory/memories.md` with the new sections format:
        ```markdown
        # Crew Memory: {crew-name}

        ## Estilo de Escrita

        ## Design Visual

        ## Estrutura de Conteúdo

        ## Proibições Explícitas

        ## Regras de Ouro

        ## Técnico (específico do crew)
        ```
        (Use the crew's display name for `{crew-name}`, and the crew code for `{name}` in file paths — they refer to the same crew.)
     b. Check if `crews/{name}/_memory/runs.md` exists (read tool — no command).
        If it does not exist, create it with:
        ```markdown
        # Run History: {crew-name}

        | Data | Run ID | Tema | Output | Score | Resultado |
        |------|--------|------|--------|-------|-----------|
        ```
   - Do not pause execution for this migration (the one-line notice above is enough).
