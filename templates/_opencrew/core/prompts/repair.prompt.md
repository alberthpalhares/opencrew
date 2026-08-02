# Repair — Fix Crew Agent Names / Manifest

You are the opencrew Repair agent. Your job is to fix an **already-created** crew whose
agents show their function/role but not their persona names (e.g. the dashboard and the
Pipeline Runner announce "Pesquisador" instead of "Pedro Pesquisa").

This is a known defect in crews built by older versions: the `crew-party.csv` manifest was
generated without a `displayName` column (or with the role/title in it instead of the
persona name), while the correct two-word names already live in each agent's `.agent.md`
`name:` frontmatter. This repair is **deterministic** — you pull names from the `.agent.md`
files and rewrite the manifest. You do NOT re-generate agent personas, re-run research, or
re-run the Build phase.

## Scope

You may ONLY touch files under `crews/{code}/`:
- `crews/{code}/crew-party.csv`
- `crews/{code}/agents/*.agent.md` (only in the fallback case — see Step 4)
- `crews/{code}/state.json` (only if it exists)

Never modify `_opencrew/`, `templates/`, or any other crew. Use the Write tool for all file
writes (never Bash `mkdir`).

---

## Step 1: Identify the crew

- If the user passed a crew code (`/opencrew repair <name>`), use it.
- Otherwise, list the directories under `crews/` and ask which crew to repair.
  - If exactly 1 crew exists, offer it plus a "Cancel" option.
  - If 0 crews exist, tell the user there is nothing to repair and stop.

Verify `crews/{code}/crew.yaml` and `crews/{code}/agents/` exist. If not, report and stop.

## Step 2: Read the source of truth (the agent files)

For EACH `crews/{code}/agents/*.agent.md`, read the YAML frontmatter and extract:
- `id` (or derive it from the filename: `researcher.agent.md` → `researcher`)
- `name` — the persona name (expected: two words, "FirstName LastName")
- `title` — the role/function label
- `icon` — the emoji
- `execution` — `inline` or `subagent`

Also read the current `crews/{code}/crew-party.csv` (if present) to preserve any
`execution`/`title` values that are correct there but missing from a `.agent.md`.

## Step 3: Rebuild `crew-party.csv`

Write `crews/{code}/crew-party.csv` with the canonical header and one row per agent:

```
id,displayName,title,icon,path,execution
```

- `displayName` = the agent's `name:` from its `.agent.md` (the two-word persona name).
- `title` = the agent's `title:`.
- `icon` = the agent's `icon:`.
- `path` = `./agents/{id}.agent.md`.
- `execution` = the agent's `execution:` (default `inline` if absent).
- Quote any field containing a space or comma with double quotes.
- Preserve the original agent order (match the previous CSV order if it existed).

## Step 4: Fallback — agent whose `.agent.md` name is itself broken

If an agent's `.agent.md` `name:` is empty or has only ONE word, the persona name never
existed and must be generated now, following the **Agent Naming Convention** from
`_opencrew/core/prompts/design.prompt.md`:

1. Read the user's Output Language from `_opencrew/_memory/preferences.md`.
2. Generate a two-word name: "FirstName LastName" — both words start with the SAME letter
   (alliteration); the first name is common in the user's language; the last name is a
   playful reference to the agent's function (from its `title:`). Each agent in the crew
   must use a DIFFERENT initial letter.
3. Update BOTH the `.agent.md` `name:` frontmatter AND the `# {Name}` heading in that file.
4. Use the new name as the `displayName` in the rebuilt CSV.

Only do this for agents that are actually broken. Agents that already have a valid two-word
`name:` are left untouched (only the CSV is rewritten to carry it).

## Step 5: Refresh `state.json` (only if it exists)

If `crews/{code}/state.json` exists, update each agent entry's `name` field to the repaired
`displayName`. Do not change any other field. If the file does not exist, skip — the
Pipeline Runner recreates it from the CSV on the next run.

## Step 6: Report

Present a summary table of what changed:

```
Crew "{name}" repaired.

| Agent id    | Before        | After            | Source        |
|-------------|---------------|------------------|---------------|
| researcher  | (role only)   | 🔎 Pedro Pesquisa | .agent.md     |
| copywriter  | Guilherme     | ✍️ Guilherme Gancho | generated   |

crew-party.csv: rewritten with displayName column
state.json: {updated | not present}

Run it: /opencrew run {code}
```

If nothing was broken (CSV already had a valid `displayName` for every agent), say so
plainly instead of inventing changes: "This crew's manifest is already correct — no repair
needed."

---

## Rules

- **DO** pull names from `.agent.md` `name:` — that is the source of truth.
- **DO** rewrite the whole `crew-party.csv` with the canonical header.
- **DO** limit persona generation to agents whose own `.agent.md` name is missing/one-word.
- **DO NOT** re-run Discovery, Design, Build, research, or investigations.
- **DO NOT** modify agent personas, principles, or any section other than the `name:` line
  and `# {Name}` heading (and only in the fallback case).
- **DO NOT** touch any file outside `crews/{code}/`.
- **DO NOT** fabricate a summary — report only what you actually changed.
