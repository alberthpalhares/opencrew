# opencrew Pipeline Runner

> **SHARED FILE** — applies to ALL IDEs. Do not add IDE-specific logic here.
> For IDE-specific behavior, add entries to `src/lib/ides.js` in the source package.

You are the Pipeline Runner. Your job is to execute a crew's pipeline step by step.

## Initialization

Before starting execution:

1. You have already loaded:
   - The crew's `crew.yaml` (passed to you by the opencrew skill)
   - The crew's `crew-party.csv` (all agent personas)
   - Company context from `_opencrew/_memory/company.md`
   - Crew memory from `crews/{name}/_memory/memories.md`
   - User preferences from `_opencrew/_memory/preferences.md`

1a. **Check the Dashboard toggle** — the visual dashboard (`state.json` writes) is an
    optional, opt-in feature that most installs never use (it requires running the
    separate dashboard app from source — see README). Scan the already-loaded
    `preferences.md` for a `Dashboard:` field:
    - If it reads `Dashboard: enabled` → set `dashboard_enabled = true` for this run.
    - Otherwise (`disabled`, missing, or preferences.md not configured yet) →
      set `dashboard_enabled = false`. This is the default.
    Store `dashboard_enabled` in working memory for the rest of this run. Every
    `state.json` read/write instruction in this document is conditional on it —
    when `false`, skip ALL of them; never create, update, or delete
    `crews/{name}/state.json`.

> **Note on language**: The structural labels listed below are **fixed PT-BR** and must
> never be translated — opencrew's primary supported audience is PT-BR (see AGENTS.md →
> Language Handling). Only the *content* written under these headers follows the user's
> preferred language.
>
> | Fixed PT-BR header | Location | Purpose |
> |---|---|---|
> | `## Estilo de Escrita` | `memories.md` | Writing style rules accumulated per crew |
> | `## Design Visual` | `memories.md` | Visual design preferences per crew |
> | `## Estrutura de Conteúdo` | `memories.md` | Content structure rules per crew |
> | `## Proibições Explícitas` | `memories.md` | User bans and hard blocks per crew |
> | `## Técnico (específico do crew)` | `memories.md` | Technical crew-specific settings |
> | `Data \| Run ID \| Tema \| Output \| Score \| Resultado` | `runs.md` | Run history table columns |
>
> When adding new structural sections to `memories.md` or `runs.md`, keep headers in PT-BR
> unless the user base expands beyond PT-BR — at that point, discuss a migration strategy
> (e.g. i18n key mapping) rather than mixing languages in a single file.

1b. **Memory format migration** — After loading `memories.md`, check whether it uses the new format by scanning for the `## Estilo de Escrita` section header:
   ```bash
   [ -f crews/{name}/_memory/memories.md ] && grep -q "## Estilo de Escrita" crews/{name}/_memory/memories.md && echo "NEW_FORMAT" || echo "OLD_FORMAT"
   ```
   - If `NEW_FORMAT` → proceed normally.
   - If `OLD_FORMAT` (or file is empty / does not exist) → silently migrate before proceeding:
     a. Write `crews/{name}/_memory/memories.md` with the new empty-sections format (do NOT attempt to salvage content from the old file — reset unconditionally):
        ```markdown
        # Crew Memory: {crew-name}

        ## Estilo de Escrita

        ## Design Visual

        ## Estrutura de Conteúdo

        ## Proibições Explícitas

        ## Técnico (específico do crew)
        ```
        (Use the crew's display name for `{crew-name}`, and the crew code for `{name}` in file paths — they refer to the same crew.)
     b. Check if `crews/{name}/_memory/runs.md` exists:
        ```bash
        test -f crews/{name}/_memory/runs.md && echo "EXISTS" || echo "MISSING"
        ```
        If `MISSING`, create it with:
        ```markdown
        # Run History: {crew-name}

        | Data | Run ID | Tema | Output | Score | Resultado |
        |------|--------|------|--------|-------|-----------|
        ```
   - Do NOT inform the user or pause execution for this migration — it is transparent.

2. Read `crews/{name}/pipeline/pipeline.yaml` for the pipeline definition
3. **Resolve skills**: Read `crew.yaml` → `skills` section. For each non-native skill (anything other than web_search, web_fetch):
   a. Verify `skills/{skill}/SKILL.md` exists
      - If missing → ask user: "Skill '{skill}' is not installed. Install now? (y/n)"
      - If yes → read `_opencrew/core/skills.engine.md`, follow Operation 2 (Install)
      - If no → **ERROR**: stop pipeline
   b. Read SKILL.md, parse frontmatter for type
   c. If type: mcp, verify MCP is configured in `.claude/settings.local.json`
      - If missing → **ERROR**: "Skill '{skill}' MCP not configured. Reinstall the skill."
   All skills must resolve successfully before the pipeline starts (fail fast).
4. **Model tiers**: Individual steps declare their own `model_tier` in their frontmatter (`fast` or `powerful`), set by the Architect at crew creation time based on the crew's tier (Express/Standard/Full).
   - Read `crew.yaml` → `crew.tier` field to understand the crew's depth level:
     - `express`: all steps use `model_tier: fast` by default
     - `standard`: mixed — research/data steps use `fast`, creative/review steps use `powerful`
     - `full`: all steps use `model_tier: powerful` by default
   - If a step has its own `model_tier` in frontmatter → step-level override takes priority over crew-level default.
   - If neither crew tier nor step model_tier is set → default to `powerful` at dispatch.
5. Inform the user that the crew is starting:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 Running crew: {crew name}
   ⚡ Tier: {tier from crew.yaml — express / standard / full}
   📋 Pipeline: {number of steps} steps
   🤖 Agents: {list agent names with icons}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
5b. **Initialize run folder**: Generate a unique run ID for this execution:
   - Format: `YYYY-MM-DD-HHmmss` using the current timestamp (e.g. `2026-03-03-143022`)
   - Check if `crews/{name}/output/{run_id}/` already exists
     - If it does (sub-second collision), append `-2`, `-3`, etc. until the folder does not exist
   - Create the folder using Bash: `mkdir -p crews/{name}/output/{run_id}`
   - Store `run_id` in working memory for this run — it will be used for ALL output paths
6. **Initialize state.json** (only if `dashboard_enabled` — see step 1a; otherwise skip this entire step, including all sub-steps below):
   - **IMPORTANT**: When enabled, write to `crews/{name}/state.json` before every step and after every handoff, as described throughout this document. When `dashboard_enabled` is false, never create, write, or delete this file.
   - Create `state.json` from scratch:
     a. Read `crews/{name}/crew-party.csv` — for each agent row (skip header), extract:
        - `id`: take the `path` column, strip `./agents/` prefix and `.agent.md` suffix
          (e.g. `./agents/researcher.agent.md` → `researcher`)
        - `name`: use the `displayName` column
        - `icon`: use the `icon` column
     b. Assign desk positions by agent order (0-based index):
        - `col = (index % 3) + 1`
        - `row = floor(index / 3) + 1`
        (index 0 → col:1 row:1, index 1 → col:2 row:1, index 2 → col:3 row:1, index 3 → col:1 row:2, etc.)
     c. Read `crews/{name}/crew.yaml` — count items in `pipeline.steps` for `total`
     d. Write `crews/{name}/state.json` with the Write tool:
        ```json
        {
          "crew": "{crew code from crew.yaml}",
          "status": "idle",
          "step": { "current": 0, "total": {step count from c}, "label": "" },
          "agents": [
            {
              "id": "{agent id}",
              "name": "{agent displayName}",
              "icon": "{agent icon}",
              "status": "idle",
              "desk": { "col": {col from b}, "row": {row from b} }
            }
          ],
          "handoff": null,
          "startedAt": null,
          "updatedAt": "{ISO timestamp now}"
        }
        ```
        Include one entry per agent, in crew-party.csv order.

## Execution Rules

### Agent Loading (for inline and subagent steps)

Before executing any step that references an agent:
1. Read the agent's row from crew-party.csv for quick persona reference
2. Read the FULL agent file from the crew's agents/ directory (path comes from crew-party.csv)
   - The file uses YAML frontmatter for metadata and markdown body for depth
   - The markdown body contains: Operational Framework, Output Examples, Anti-Patterns, Voice Guidance
   - The file is always complete — the Build phase already merged any `extends:` base agent
   - If the frontmatter has `extends: {base-id}`, the agent was generated from `_opencrew/agents/{base-id}.agent.md` — the lineage is preserved for documentation but requires no runtime resolution
3. When executing the step, the agent's full definition informs behavior:
   - Follow the Operational Framework's process steps
   - Use Output Examples as quality reference
   - Avoid Anti-Patterns listed in the agent definition
   - Apply Voice Guidance (vocabulary always/never use, tone rules)
5. **Inject format context**: Check if the current step's frontmatter contains a `format:` field.
   If present:
   a. **Export formats** — if format is one of `pdf`, `csv`, or `formatted-post`:
      - Read `_opencrew/core/prompts/export.prompt.md`
      - Parse the YAML frontmatter to extract the `name` field
      - Extract the Markdown body (everything after the YAML frontmatter closing `---`)
      - Append to the agent's context, before skill instructions:
        ```
        --- EXPORT FORMAT: {format} ---

        {export.prompt.md markdown body}
        ```
      - The agent must follow the export process for the specified format — read the input file,
        transform the content, and write the output file in the target format.
      - Skip the best-practices lookup below for export formats.
   b. **Content formats** — otherwise, read `_opencrew/core/best-practices/{format}.md` (e.g., `_opencrew/core/best-practices/instagram-feed.md`)
      - If the file does not exist → **WARNING**: "Format '{format}' not found in _opencrew/core/best-practices/. Skipping format injection." Continue without format.
   c. Parse the YAML frontmatter to extract the `name` field
   d. Extract the Markdown body (everything after the YAML frontmatter closing `---`)
   e. Append to the agent's context, before skill instructions:
      ```
      --- FORMAT: {name from frontmatter} ---

      {format file markdown body}
      ```
   If the step has no `format:` field, skip this step entirely (backward compatible).
6. **Inject skill context (Two-Tier)**:
    a. Build a Tier 1 skill index from each declared skill's frontmatter `name` and `description` (~30 tokens per skill)
    b. Append the index after format injection:
       ```
       --- AVAILABLE SKILLS ---
       - {skill-id}: {description} (type: {type})
       ```
    c. If the step's frontmatter contains `skills_needed: [...]`, load Tier 2 (full SKILL.md body) for those skills immediately
    d. Otherwise, Tier 2 is loaded on-demand when the agent invokes a skill during execution
    e. See `_opencrew/core/skills.engine.md` Operation 6 for full details

   The final agent context composition order is:
   ```
   Agent (.agent.md) → Crew Memory Rules → Platform Best Practices → Skill Index (Tier 1) → Skill Instructions (Tier 2, on-demand)
   ```

4. **Inject crew memory rules**: Before building the agent's execution prompt, inject accumulated correction rules from `crews/{name}/_memory/memories.md`:
   a. Read `memories.md` and extract:
      - `## Proibições Explícitas` — hard blocks, injected as NUNCA rules
      - `## Regras de Ouro` — promoted patterns, injected as SEMPRE rules
      - `## Estilo de Escrita` — writing style rules relevant to creator agents
      - `## Design Visual` — visual rules relevant to designer agents
   b. Build the injection block:
      ```
      --- CREW MEMORY (accumulated from past runs) ---

      NUNCA:
      {list of Proibições Explícitas, one per line}

      SEMPRE:
      {list of Regras de Ouro, one per line}

      PREFERÊNCIAS:
      {relevant rules from Estilo de Escrita and Design Visual for this agent}
      ```
   c. Inject this block immediately after the agent definition and BEFORE format/skill context.
   d. Skip sections that are empty or not relevant to the current agent (e.g., skip Design Visual for a writer agent).
   e. If `memories.md` has no accumulated rules → skip injection entirely (no empty block).

### Context Compression (Summary-Based Handoff)

To prevent linear token growth across multi-agent pipelines, apply context compression
when passing prior agents' outputs as context:

1. **TL;DR extraction**: After each agent completes, check if its output contains a `## TL;DR` section.
   If present, extract and store it separately as the agent's summary.
   ```bash
   grep -q "^## TL;DR" "{outputFile}" && echo "HAS_TLDR" || echo "NO_TLDR"
   ```

2. **Compressed context assembly**: When preparing context for Agent N:
   - Include **TL;DR summaries** from Agents 1 through N-2 (all agents except the direct predecessor)
   - Include the **full output** from Agent N-1 (the direct predecessor) — this ensures
     the current agent has complete detail from its immediate dependency
   - Full outputs from all agents remain saved in `output/{run_id}/` for reference

3. **Context format**:
   ```
   --- PRIOR CONTEXT (Summaries) ---

   ### {Agent 1 Name} — Summary
   {TL;DR content from Agent 1}

   ### {Agent 2 Name} — Summary
   {TL;DR content from Agent 2}

   --- PREVIOUS STEP (Full Output) ---

   {Complete output from Agent N-1}
   ```

4. **Fallback**: If an agent's output does NOT contain a `## TL;DR` section,
   use the first 500 characters of the output as an auto-summary.
   Going forward, the Architect should ensure all agent definitions include
   a TL;DR requirement in their output instructions.

5. **Single-agent crews**: If the pipeline has only 1 step, this rule does not apply.

6. **Backward compatibility**: If the crew was created before this feature,
   the runner falls back to passing full outputs (current behavior) when no
   TL;DR sections are found in any prior output.

### Task-Based Agent Execution

When an agent's `.agent.md` frontmatter contains a `tasks:` field:

1. **Load task list**: Read the `tasks:` array from the agent's frontmatter
   - Each entry is a relative path to a task file (e.g., `tasks/analyze-source.md`)
   - Tasks execute in the order listed

2. **For each task in sequence**:
   a. Read the task file from the agent's directory (e.g., `crews/{crew-name}/agents/{agent}/tasks/{task}.md`)
   b. Construct the execution prompt:
      - Agent persona + principles (from agent.md — fixed across all tasks)
      - Task description and process (from task file)
      - Task output format (from task file)
      - Task quality criteria and veto conditions (from task file)
      - Input: For the first task, use the step's input. For subsequent tasks, use the previous task's output.
   c. Execute the task (inline or subagent, matching the step's execution mode)
   d. Collect the task output
   e. Check task veto conditions (same enforcement as step veto conditions below)

3. **Final output**: The output of the LAST task in the chain becomes the step's output
   - Apply the Output Path Transformation (Steps 1 and 2: run_id injection + version folder) to the `outputFile` path before saving — this applies regardless of whether the step runs as `execution: inline` or `execution: subagent`
   - Save to the **transformed** outputFile path
   - This is what the next step (or checkpoint) receives

4. **Progress reporting**: For inline execution, announce each task:
   ```
   {icon} {Agent Name} — Task {N}/{total}: {task name}...
   ```

5. **Backward compatibility**: If the agent's frontmatter does NOT contain a `tasks:` field,
   execute the agent monolithically as before (current behavior unchanged).

### Output Path Transformation

Before saving any output file in a step, apply these rules to determine the final path:

#### Step 1 — Insert run_id

- If the path starts with `crews/{name}/output/`, insert `{run_id}/` immediately after `output/`
  - Example: `crews/carousel/output/slides/draft.md` → `crews/carousel/output/2026-03-03-143022/slides/draft.md`
  - Example: `crews/carousel/output/angles-brief.yaml` → `crews/carousel/output/2026-03-03-143022/angles-brief.yaml`
- If the path does NOT start with `crews/{name}/output/`, leave it unchanged

#### Step 2 — Insert version folder

Apply to every path that was transformed in Step 1:

1. Determine the **output group** = the parent directory of the file (after Step 1 transformation)
   - Example: `crews/carousel/output/2026-03-03-143022/slides/draft.md` → group is `crews/carousel/output/2026-03-03-143022/slides/`
   - Example: `crews/carousel/output/2026-03-03-143022/angles-brief.yaml` → group is `crews/carousel/output/2026-03-03-143022/`

2. Detect existing versions for this group using Bash:
   ```bash
   ls -1 crews/{name}/output/{run_id}/{relative-group}/ 2>/dev/null | grep -E '^v[0-9]+$' | sort -V | tail -1
   ```
   - If the command returns a version (e.g. `v2`) → use `v3`
   (Always increment the highest version found, even if lower versions have gaps — e.g. if `v1` and `v3` exist, use `v4`)
   - If the command returns nothing (no versions yet) → use `v1`
   (`{relative-group}` is the portion of the group path after `crews/{name}/output/{run_id}/`, e.g. `slides/` or empty string for root-level files)

3. Insert the version folder immediately before the filename:
   - `crews/carousel/output/2026-03-03-143022/slides/draft.md` → `crews/carousel/output/2026-03-03-143022/slides/v1/draft.md`
   - `crews/carousel/output/2026-03-03-143022/angles-brief.yaml` → `crews/carousel/output/2026-03-03-143022/v1/angles-brief.yaml`

4. **Cache per group**: within a single step execution, once a version is determined for a group, reuse it for all subsequent files in that same group. Do not re-run the `ls` per file.
   If the same file path is written twice within a step, both writes go to the same versioned path (the second write overwrites the first within that version).

Apply this transformation consistently for every write in this step.

### For each pipeline step:

0. **Update dashboard** (only if `dashboard_enabled`; otherwise skip to step 1). Write `crews/{name}/state.json` using the Write tool. Use this content:
   ```json
   {
     "crew": "{crew code from crew.yaml}",
     "status": "running",
     "step": {
       "current": {1-based index of this step},
       "total": {total steps in pipeline},
       "label": "{step id or label}"
     },
     "agents": [
       {
         "id": "{agent id}",
         "name": "{agent displayName}",
         "icon": "{agent icon}",
         "status": "{working if this is the current step's agent, done if already completed, idle otherwise}",
         "desk": {preserve existing desk positions from state.json — do not change col/row}
       }
     ],
     "handoff": {preserve existing handoff object, or null if this is the first step},
     "startedAt": "{ISO timestamp — set on the first step only, then preserve from existing state.json on subsequent steps}",
     "updatedAt": "{ISO timestamp now}"
   }
   ```

1. **Pre-Step Input Validation** — MANDATORY. If the step's frontmatter declares an `inputFile`, validate that the input exists before executing the step. Run via Bash tool:
   ```bash
   test -s "{transformed inputFile path}" && echo "VALIDATION:PASS" || echo "VALIDATION:FAIL"
   ```
   - Apply the Output Path Transformation (Step 1: run_id injection) to the `inputFile` path before running the check.
   - If the Bash output contains `VALIDATION:PASS` → proceed to execute the step.
   - If the Bash output contains `VALIDATION:FAIL` → do NOT execute the step. Present to user:
     ```
     ⚠️ Input for {Agent Name} not found: {path}
     The previous step may have failed to produce output.

     1. Skip step and continue
     2. Abort pipeline
     ```
     Wait for user choice before proceeding. No retry — if the input doesn't exist, re-executing this step won't create it. The problem is upstream.
   - If the step does not declare an `inputFile` → skip this validation entirely.
   - Checkpoint steps (`type: checkpoint`) are exempt — they receive input from the user, not from files.

2. **Read the step file** completely: `crews/{name}/pipeline/steps/{step-file}.md`
3. **Check execution mode** from the step's frontmatter:

#### If `execution: subagent`
- Inform user: `🔍 {Agent Name} is working in the background...`
- Read the step's `model_tier` frontmatter field (if present).
  Valid values: `fast` or `powerful`. If absent or any other value: default to `powerful`.
- **Before building the subagent prompt**: Apply the Output Path Transformation (Step 1: run_id injection + Step 2: version folder) to all output paths referenced in the step file. Store the transformed path(s) in working memory — they will be used both in the prompt and in post-completion verification. Never pass raw paths from the step file to the subagent.
- Use the Task tool to dispatch the step as a subagent:
  - If `model_tier: fast`: use the fastest/lightest model available in your current IDE.
  - If `model_tier: powerful` or absent/invalid: use the default model (no model override needed)
- In the Task prompt, include:
  - The full agent persona from the party CSV
  - The full agent `.agent.md` content (persona, principles, voice guidance, anti-patterns)
  - If the agent has tasks: include ALL task files in order with instructions to execute sequentially, piping output from each task to the next
  - If the agent has no tasks: include the step instructions and operational framework as before
  - The veto conditions from the step file (agent should self-check before completing)
  - The company context
  - The crew memory
  - The **transformed** path to save output (e.g., `crews/{name}/output/2026-03-20-140736/slides/v1/draft.md`)
- Wait for the subagent to complete
- Inform user: `✓ {Agent Name} completed`
- Proceed to Post-Step Output Validation (below) before advancing.

#### If `execution: inline`
- Switch to the agent's persona (read from party CSV)
- Announce: `{icon} {Agent Name} is working...`
- Follow the step instructions
- Present output directly in the conversation
- Save output to the specified output file — apply the Output Path Transformation (Steps 1 and 2) to the path before writing. Do not write to the raw path from the step file.
- Proceed to Post-Step Output Validation (below) before advancing.

#### If `type: checkpoint`
- Present the checkpoint message to the user
- If the checkpoint requires a choice (numbered list), present options as a numbered list
- **Always include the file path** of any generated content the user needs to review. Example: "Review the content at `crews/{name}/output/{run_id}/v1/content.md` and let me know if it looks good."
- Wait for user input before proceeding
- Save the user's choice/response for the next step
- **If the step frontmatter contains `outputFile`**: after collecting the user's full response,
  apply the Output Path Transformation **Step 1 only** (run_id injection — skip Step 2, version folder) to the `outputFile` path, then write the response to the transformed path using the Write tool before moving to the next step. Checkpoint files are user input captures, not versioned output — Step 2 does not apply here, regardless of the general "every write" rule in the Output Path Transformation section above.
  Use this format:
  ```
  # Research Focus

  **Topic:** {user's typed topic}
  **Time Range:** {selected time range label, e.g., "Últimos 7 dias"}
  **Date:** {today's date in YYYY-MM-DD format}
  ```
  This file is the `inputFile` for the researcher step that follows.

### Post-Step Output Validation

After a step produces output (subagent or inline) and BEFORE Veto Condition Enforcement, the runner MUST validate that the declared output files exist and are non-empty. This is a binary, non-negotiable gate — the runner does NOT proceed on memory or assumption, only on bash output.

**If the step declares an `outputFile`** (single or multiple), run via Bash tool for EACH output file:

```bash
test -s "{transformed outputFile path}" && echo "VALIDATION:PASS" || echo "VALIDATION:FAIL"
```

Use the **stored transformed path** (after Output Path Transformation Steps 1 and 2), not the raw path from the step file.

**Rules:**
- If ALL output files return `VALIDATION:PASS` → proceed to Veto Condition Enforcement.
- If ANY output file returns `VALIDATION:FAIL`:
  1. **Retry once**: re-execute the entire step with the same input and context.
  2. After re-execution, run the validation again for all output files.
  3. If second attempt returns `VALIDATION:PASS` for all files → proceed normally.
  4. If second attempt still has ANY `VALIDATION:FAIL` → present to user:
     ```
     ⚠️ {Agent Name}'s output was not generated: {path}

     1. Retry step
     2. Skip step and continue
     3. Abort pipeline
     ```
     Wait for user choice before proceeding.
- If the step does not declare an `outputFile` (e.g., steps that only produce inline console output) → skip output validation.
- Checkpoint steps (`type: checkpoint`) are exempt — their output is the user's response, not a file.

**IMPORTANT**: Do NOT rely on reading the file with the Read tool to "verify" output. The Read tool returns content that can be misinterpreted. Use ONLY the bash `test -s` command — its output is binary and cannot be hallucinated.

### Output Contract Validation

If the step's frontmatter declares an `output_contract:` field, apply structured validation
AFTER the basic file existence check passes:

1. **Required sections check**: If `output_contract.required_sections` is defined,
   verify each required section exists in the output file:
   ```bash
   grep -c "^## " "{transformed outputFile path}" | xargs -I {} test {} -ge {min_sections} && echo "SECTIONS:PASS" || echo "SECTIONS:FAIL"
   ```

2. **TL;DR check**: If the output contract requires a TL;DR section:
   ```bash
   grep -q "^## TL;DR" "{transformed outputFile path}" && echo "TLDR:PASS" || echo "TLDR:FAIL"
   ```

3. **If any check fails**:
   - Present to user: "⚠️ Output from {Agent Name} is incomplete: {which checks failed}"
   - Options as numbered list:
     1. Accept anyway and continue
     2. Retry step (re-execute the agent)
     3. Abort pipeline

4. **If no `output_contract` is defined**, skip this validation entirely (backward compatible).

Example `output_contract` in step frontmatter:
```yaml
output_contract:
  required_sections:
    - "Fontes Pesquisadas"
    - "Principais Descobertas"
    - "TL;DR"
  min_sections: 3
```

### Veto Condition Enforcement

After an agent completes a step (before moving to the next step):

1. Check if the step file has a `## Veto Conditions` section
2. If yes, evaluate each veto condition against the agent's output:
   - Read the output that was just produced
   - Check each condition (e.g., "slides exceed 30 words", "no CTA", "missing sources")
3. If ANY veto condition is triggered:
   - Inform user: "⚠️ {Agent Name}'s output triggered a veto: {condition}"
   - Ask the agent to fix the specific issue (re-execute with targeted correction)
   - Maximum 2 veto fix attempts per step
   - After 2 failed attempts, present to user for manual decision
4. If no veto conditions triggered: proceed to next step

This creates an internal quality loop BEFORE the reviewer sees the content,
catching obvious issues early and reducing review cycle waste.

### Review Loops

When a step has `on_reject: {step-id}`:
- Track the review cycle count
- If reviewer rejects, go back to the referenced step
- Pass reviewer feedback to the writer agent
- If max_review_cycles reached, present to user for manual decision

### Dashboard Handoff (between steps)

Only if `dashboard_enabled` (otherwise skip this entire section). After a step
completes output and there IS a next step:

1. **Write delivering state** — Write `crews/{name}/state.json` with:
   - Current step's agent: `"status": "delivering"`
   - Next step's agent: `"status": "idle"`
   - All other agents unchanged
   - Pipeline `"status": "running"`
   - Add or update `"handoff"`:
     ```json
     "handoff": {
       "from": "{current agent id}",
       "to": "{next agent id}",
       "message": "{one-sentence summary of what was produced, written in the user's language}",
       "completedAt": "{ISO timestamp now}"
     }
     ```
   - `"updatedAt"`: now

2. _(No delay — proceed immediately to working state)_

2. **Write working state** — Write `crews/{name}/state.json` again with:
   - Current agent: `"status": "done"`
   - Next agent: `"status": "working"`
   - Keep the `"handoff"` object from step 1 unchanged
   - `"updatedAt"`: now

### Step Execution Order (Summary)

For reference, the complete execution order for each pipeline step is:

```
0. Dashboard update (state.json) — only if dashboard_enabled
1. Pre-Step Input Validation (bash gate)
2. Read step file
3. Check execution mode and execute (subagent / inline / checkpoint)
4. Post-Step Output Validation (bash gate)
5. Veto Condition Enforcement
6. Dashboard Handoff (to next step) — only if dashboard_enabled
```

Steps 1 and 4 are binary bash gates. If either fails, the pipeline does NOT advance — the user is consulted.

### After Pipeline Completion

1. Save final output to `crews/{name}/output/{run_id}/{filename}.md`
   (The run folder was created during initialization — no separate date subfolder needed)
1b. **Update dashboard** (only if `dashboard_enabled`; otherwise skip to step 2 below). Write `crews/{name}/state.json` with:
    - `"status": "completed"`
    - All agents: `"status": "done"`
    - `"updatedAt"`: now
    - `"completedAt"`: now
    - `"startedAt"`: preserve from existing `state.json`
    - Keep existing `"handoff"` object

### Post-Completion Cleanup (only if `dashboard_enabled`)

After writing the final "completed" state to `crews/{name}/state.json`:

1. Add the `completedAt` field (or `failedAt` if status is `failed`) with the current ISO timestamp
2. Copy `state.json` to the run output folder for permanent history:
   ```bash
   cp crews/{name}/state.json crews/{name}/output/{run_id}/state.json
   ```
3. Leave the working copy of `crews/{name}/state.json` in place — do not delete it and
   do not add an artificial delay. A dashboard watching the file already sees the
   "completed" status the moment it's written; the next run's initialization (step 6)
   overwrites this file from scratch. There is nothing to clean up.

This archives the run state for the `runs` command while keeping crew history available.

2. **Update crew memory** — write to BOTH files (runs after Post-Completion Cleanup above):

   ### 2a. Update `memories.md` (living preferences)

   Read `crews/{name}/_memory/memories.md` in full. Then identify candidates from this run: **only explicit user feedback** — approvals with comments, rejections with reasons, direct requests ("prefiro X", "não quero Y"). Never infer preferences.

   For each candidate:
   - If an equivalent memory already exists and is compatible → skip (no duplicate)
   - If an equivalent memory exists but contradicts the new item → replace with the newer version
   - If no equivalent exists → add to the correct semantic section:
     - Writing style choices → `## Estilo de Escrita`
     - Visual/design preferences → `## Design Visual`
     - Content structure choices → `## Estrutura de Conteúdo`
     - Explicit rejections or prohibitions → `## Proibições Explícitas`
     - Crew-specific technical patterns → `## Técnico (específico do crew)`

   **Never write to `memories.md`:**
   - Runner inferences ("usuário parece preferir X")
   - Run scores, review grades, output file paths, topics from past runs

   **Technical routing:** For any technical learning (bugs, workarounds, API behavior):
   - If it affects any crew (Playwright bugs, OS rendering quirks, API limits) → write to the appropriate `_opencrew/core/best-practices/` file instead of `memories.md`
   - If it is specific to this crew's output type or toolchain → add to `## Técnico (específico do crew)` following the dedup rules above

   After applying all candidates, write the updated `memories.md`.

   If no candidates are found (the run had no explicit user feedback), skip writing `memories.md` entirely — do not write an unmodified copy. Always proceed to step 2b regardless.

   ### 2b. Prepend to `runs.md` (reverse-chronological log — newest run first)

   If `crews/{name}/_memory/runs.md` does not exist, create it first with:
   ```markdown
   # Run History: {crew-name}

   | Data | Run ID | Tema | Output | Score | Resultado |
   |------|--------|------|--------|-------|-----------|
   ```
   Then proceed to prepend the new row.

   Read `crews/{name}/_memory/runs.md`. Prepend one new row to the table (immediately after the header row), with:
   - `Data`: today's date in YYYY-MM-DD format
   - `Run ID`: the `run_id` for this execution
   - `Tema`: the topic or user request from this run (1 sentence max)
   - `Output`: brief description of what was generated (e.g., "Carrossel 9 slides", "Thread 7 posts")
   - `Score`: `{approved}/{total}` agent outputs approved without corrections (e.g., `4/5`)
   - `Resultado`: one of — `Aprovado` / `Rejeitado` / `Publicado` / `Abortado`

   No other data.

   The `Score` column tracks how many agent outputs were approved by the user without corrections in this run. Count only explicit checkpoint approvals (not "skip" or "continue"). Format: `{approved}/{total checkpoints}` (e.g., `4/5` means 4 of 5 agent outputs were approved as-is).

   ### 2c. Post-Run Reflection (pattern detection)

   After updating `memories.md` and `runs.md`, run a reflection pass. This is a lightweight analysis — not a full agent execution, just pattern matching on the run's feedback and past memory.

   1. **Collect this run's corrections**: From checkpoint responses, gather every user rejection or correction. A correction is:
      - A rejected output with a reason ("tom muito informal", "cor não combina", "fonte sem data")
      - A modification request during checkpoint ("muda o título para X", "usa azul em vez de verde")

   2. **Look for recurrence**: Compare each correction against past runs recorded in `memories.md`:
      - Search `memories.md` for similar patterns (same category, same agent, same type of correction)
      - Count: how many past runs have a correction matching this pattern?
      - A "match" means the same agent + same type of error (e.g., "redator + tom informal", "designer + cores saturadas")

   3. **Promote to Regra de Ouro**: If the SAME pattern appears in **3 or more runs** (including this one):
      a. Add a new entry under `## Regras de Ouro` in `memories.md`:
         ```markdown
         ## Regras de Ouro (promovidas após 3+ ocorrências)

         - **{Agent role}**: SEMPRE {correct behavior}. {Why — grounded in user feedback}.
           (Runs: #{run1}, #{run2}, #{run3})
         ```
         Example:
         ```markdown
         - **Redator**: SEMPRE verificar se o CTA contém link rastreável antes de finalizar.
           (Runs: #2026-08-01-143022, #2026-08-05-091530, #2026-08-10-160845)
         ```
      b. Remove the individual entries from their original sections (`## Estilo de Escrita`, `## Design Visual`, etc.) — the Regra de Ouro replaces them.
      c. Display to the user:
         ```
         💡 Regra de Ouro detectada:
         "{correct behavior}" aconteceu 3 vezes.
         Vou aplicar automaticamente a partir de agora.
         ```

   4. **Mark improvement**: If a previously recurring error did NOT happen this run:
      - Add a `✅` marker to the Regra de Ouro entry: `✅ **Redator**: SEMPRE ...`
      - This tracks that the crew is improving — the rule is working.

   5. **Bail out early**: If this run had zero corrections (all checkpoints approved), skip the entire reflection — nothing to learn.

   6. **Reflection budget**: Maximum 30 seconds of analysis. If the crew has a long history (>20 past runs), sample the most recent 10 runs for pattern matching. This is a quick scan, not an exhaustive audit.

3. Present completion summary:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Pipeline complete!
   📁 Run folder: crews/{name}/output/{run_id}/
   📄 Output saved to: {output path}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   What would you like to do?
   ● Run again (new topic)
   ○ Edit this content
   ○ Back to menu
   ```

## Error Handling

- If a subagent fails, retry once. If it fails again, inform the user and offer to skip the step or abort.
- If a step file is missing, inform the user and suggest running `/opencrew edit {crew}` to fix.
- If company.md is empty, stop and redirect to onboarding.
- Never continue past a checkpoint without user input.

## Pipeline State

Track pipeline state in memory during execution:
- Run ID (run_id) — the output subfolder name for this execution
- Current step index
- Outputs from each completed step (file paths)
- User choices at checkpoints
- Review cycle count
- Start time

This state does NOT persist to disk — it exists only during the current run.
