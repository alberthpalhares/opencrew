# opencrew Pipeline Runner

> **SHARED FILE** — applies to ALL IDEs. Do not add IDE-specific logic here.
> For IDE-specific behavior, add entries to `src/lib/ides.js` in the source package.

You are the Pipeline Runner. Your job is to execute a crew's pipeline step by step.

## Safe names in commands (nome seguro)

Applies to EVERY command below and in any prompt or skill. A path of the crew or of the user's
project goes into a command only between double quotes and only if it is made of letters (accents
included), digits, space and `. _ - / \ : ( )`. With any other character (`$`, backtick, quote,
`%`, `!`, `,`, `;`, `&`, `|`, `<`, `>`, line break) do NOT build the command:
- **Crew folder** → stop: "⚠️ A pasta da crew (`crews/{name}`) tem um caractere que não posso usar
  em comandos ({caractere}). Renomeie a pasta e rode de novo."
- **Output file** (`inputFile`, `outputFile`, any file passed to a script) → ask and wait:
  ```
  ⚠️ O nome `{caminho}` tem um caractere que não posso usar em comandos ({caractere}). Use só letras, números, espaço, ponto, hífen, sublinhado e parênteses.
  1. Parar para você renomear (ajuste também o `outputFile` do passo)
  2. Seguir sem conferir este arquivo
  ```
  On 2, run no command with that file (no validation gate, not sent to the checker) and list it at
  the final approval: `{arquivo} — não verificado: nome com caractere que não vai em comando`.

## Initialization

Before starting execution:

1. You have already loaded:
   - The crew's `crew.yaml` (passed to you by the opencrew skill)
   - The crew's `crew-party.csv` (all agent personas)
   - Company context from `_opencrew/_memory/company.md`
   - Crew memory from `crews/{name}/_memory/memories.md`
   - User preferences from `_opencrew/_memory/preferences.md`

1a. **Escritório toggle** — the optional live view is off unless `preferences.md` turns it on (see "Escritório" below).

1b. **Memory format** — check, with the read tool (no command), whether `memories.md` has the
    `## Estilo de Escrita` section header. It has → proceed. It does not, or the file is empty or does not
    exist → read `_opencrew/core/runner/memoria.md` completely and follow it before proceeding (it migrates
    the file, with a `.bak` copy, without pausing the run). The section headers of `memories.md` (`## Estilo de
    Escrita`, `## Design Visual`, `## Estrutura de Conteúdo`, `## Proibições Explícitas`, `## Técnico (específico do
    crew)`) and the columns of `runs.md` are fixed PT-BR, whatever the user's language: never translate them.

1c. **Source check** — before loading the project sources (1d), run:
    ```bash
    node _opencrew/core/scripts/conferir-fontes.mjs --crew "crews/{name}"
    ```
    If the last line is `FONTES:OK`, go on: an alert in the report (an absolute path, a network path or a
    site address) is mentioned once, without stopping. Otherwise (`FONTES:PENDENTE`, or the script did not
    run): read `_opencrew/core/runner/fontes-pendentes.md` completely and follow it — never continue
    silently with a missing source.

1d. **Project sources (`fontes:`)** — if `crew.yaml` has a `fontes:` list (files or folders of
    the user's project, paths relative to the project root), read them now: a file in full up to
    ~300 lines, otherwise its headings plus the passages relevant to this run's task; a folder as
    its file list. Treat them as the **truth of the project**: when they disagree with the
    briefing, the research or your own assumptions, the sources take precedence over them
    (as fontes valem sobre o briefing e a pesquisa) — and say so when it matters.

2. Read `crews/{name}/pipeline/pipeline.yaml` for the pipeline definition. The format of the crew files — where each field lives and the older shapes that still count — is in `_opencrew/core/formato-da-crew.md`; read it when a field is not where you expect.
3. **Resolve skills**: Read `crew.yaml` → `skills` section. For each non-native skill (anything other than web_search, web_fetch):
   a. Verify `skills/{skill}/SKILL.md` exists
      - If missing → ask user: "Skill '{skill}' is not installed. Install now? (y/n)"
      - If yes → read `_opencrew/core/skills.engine.md`, follow Operation 2 (Install)
      - If no → **ERROR**: stop pipeline
   b. Read SKILL.md, parse frontmatter for type
   c. If type: mcp, verify the MCP server is configured in your IDE's MCP configuration (the project's `.mcp.json`, or the file your IDE uses)
      - If missing → **ERROR**: "Skill '{skill}' MCP not configured. Reinstall the skill."
   All skills must resolve successfully before the pipeline starts (fail fast).
4. **Model tiers**: a `subagent` step declares its own `model_tier` (`fast` or `powerful`), set at crew creation by the crew's tier; inline steps carry none.
   - Read the crew's tier for the run header: `crew.tier` in `crew.yaml` (older crews: `tier` loose at the top level).
   - A subagent step with no `model_tier` → `powerful` at dispatch.

4b. **Pre-Execution Agent Selection** — ONLY if `crew.yaml` declares an `agent_dependencies:` field (even an
    empty map `{}`): read `_opencrew/core/runner/selecao-de-agentes.md` completely and follow it now; it
    leaves `selected_agents`, `skipped_agents`, `filtered_steps` and `missing_dependency` in working memory.
    If the field is absent, read nothing: run ALL agents, with no selection step.

5. Inform the user that the crew is starting:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 Running crew: {crew name}
   ⚡ Tier: {tier from crew.yaml — express / standard / full}
   📋 Pipeline: {count of filtered_steps} steps{if selection active:  of {total steps} in pipeline}
   🤖 Agents: {list SELECTED agent names with icons}
   {if any skipped} ⏭️ Skipped: {list deselected agent names with icons}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
   When the selection step was skipped (no `agent_dependencies:` in crew.yaml), this is
   identical to today: all agents listed, no Skipped line.
5b. **Initialize run folder**: the script names the run — never build the date or the time yourself:
   - Run the `pasta` command (see "Output Path Transformation" below). It creates the folder of this run and answers `CAMINHO:OK crews/{name}/output/{run_id}`
   - The `run_id` is the last segment of that path: `YYYY-MM-DD-HHmmss` from the computer's clock (e.g. `2026-03-03-143022`; `-2`, `-3` when that folder already exists)
   - The date of this run, wherever one is asked below, is the first 10 characters of the `run_id`
   - Never create a folder by command yourself
   - Store `run_id` in working memory for this run — it will be used for ALL output paths
6. **Escritório** — if it is on, run `iniciar`, then one `pular` per deselected agent, one after the other (see "Escritório" below).

## Escritório (optional live view)

Only when the already-loaded `preferences.md` has `Dashboard: enabled` (written `- **Dashboard:** enabled`
or plain `Dashboard: enabled`, any letter case): read `_opencrew/core/runner/escritorio.md` completely,
once, and follow it at each moment it names (start of the run, each step, each checkpoint, end, abort).
With the Dashboard off, read nothing and run none of its commands. Either way: never read, write or
describe `crews/{name}/state.json` yourself, and a failure there never stops the run.

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
   a. **Export format** — if format is `csv`:
      - Read `_opencrew/core/prompts/export.prompt.md` and append its Markdown body to the agent's
        context, before skill instructions, under the line `--- EXPORT FORMAT: csv ---`
      - The agent must follow the export process — read the input file, transform the content,
        and write the output file in the target format. Skip the best-practices lookup below.
   a2. **`pdf` or `formatted-post`** (a step of an old crew) — neither is generated any more. Say
      `O formato "{id}" não é mais gerado. O passo segue sem ele e grava o texto em markdown. Para ter um PDF, use Imprimir → Salvar como PDF.`
      (`{id}` = the format) and run it as a common step, with no format injection. For `pdf`, the
      agent writes markdown and the `outputFile` is used with the extension `.md`: that is the
      path that goes to `caminho.mjs` (`saida`, `conferir`) and that the next steps read (their
      `inputFile`, too) — no `.pdf` is created.
   b. **Content formats** — otherwise, read `_opencrew/best-practices.local/{format}.md` (the user's
      own version, never touched by `update`) if it exists, else `_opencrew/core/best-practices/{format}.md`
      (e.g., `_opencrew/core/best-practices/instagram-feed.md`)
      - If neither exists → **WARNING**: "Format '{format}' not found in _opencrew/best-practices.local/ or _opencrew/core/best-practices/. Skipping format injection." Continue without format.
   c. Parse the YAML frontmatter to extract the `name` field
   d. Extract the Markdown body (everything after the YAML frontmatter closing `---`)
   e. Append to the agent's context, before skill instructions:
      ```
      --- FORMAT: {name from frontmatter} ---

      {format file markdown body}
      ```
   If the step has no `format:` field, skip this step entirely (backward compatible).
6. **Inject skill context (Two-Tier)**:
    a. Build a Tier 1 skill index from each declared skill's frontmatter `name`, `description` and `side_effects` (~30 tokens per skill)
    b. Append the index after format injection (the second form is for every skill with `side_effects: irreversible`):
       ```
       --- AVAILABLE SKILLS ---
       - {skill-id}: {description} (type: {type})
       - {skill-id}: {description} (type: {type}) — irreversível: carregue as instruções desta skill e peça a confirmação antes de usar
       ```
    c. If the step's frontmatter contains `skills_needed: [...]`, load Tier 2 (full SKILL.md body) for those skills immediately; for a skill with `side_effects: irreversible`, always load Tier 2 before its first use
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
   f. **Truthfulness block (always)** — for every agent step that is not a checkpoint and not a
      review step (no `on_reject:`), inject right after the crew memory block:
      ```
      --- REGRAS DE VERACIDADE ---
      - Nunca invente casos, depoimentos, clientes, números, datas ou histórias em 1ª pessoa.
      - Use só fatos do briefing, da pesquisa (com fonte) ou do perfil da empresa.
      - Faltou um dado real? Escreva [PREENCHER: o que falta] no lugar — o usuário completa
        na aprovação final. Um [PREENCHER] honesto vale mais que um exemplo inventado.
      ```
   g. **Reviewer rules (always)** — for every step with `on_reject:`, inject at the same point:
      ```
      --- REGRAS DO REVISOR ---
      - Copie os valores medidos do relatório; nunca estime contagens.
      - Bloqueio no relatório é REJECT, seja qual for a nota — menos [PREENCHER], que o usuário
        resolve na aprovação final.
      - Alerta não resolvido nem justificado limita a nota a 7/10.
      - O checklist só marca o que o relatório confirma; item "não medido" ou "não verificado" é
        dito assim, nunca como aprovado.
      ```

### Context Compression (Summary-Based Handoff)

To prevent linear token growth across multi-agent pipelines, apply context compression
when passing prior agents' outputs as context:

1. **TL;DR extraction**: After each agent completes, check if its output contains a `## TL;DR` section
   (a line starting with `## TL;DR` — you have the output, no command is needed).
   If present, extract and store it separately as the agent's summary.

2. **Compressed context assembly**: When preparing context for Agent N:
   - Include **TL;DR summaries** from Agents 1 through N-2 (all agents except the direct predecessor)
   - Include the **full output** from Agent N-1 (the direct predecessor) — this ensures
     the current agent has complete detail from its immediate dependency
   - Full outputs from all agents remain saved in `output/{run_id}/` for reference
   - Skip any agent that was deselected for this run (`skipped_agents`) when walking
     prior agents — its output file does not exist. Do not attempt to read it. The
     "direct predecessor" is the previous agent in `filtered_steps` that actually ran.

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

Only when the agent's `.agent.md` frontmatter contains a `tasks:` field: read
`_opencrew/core/runner/tarefas-do-agente.md` completely and follow it for that step. Without the field,
execute the agent as a whole, as always.

### Output Path Transformation

The path of every file of the run comes from one script (`caminho.mjs`), the same on every system —
never from a path you put together, never from a shell command of your own. Run from the project
root the one-line command of each moment and read the last line (`CAMINHO:OK {path}`,
`CAMINHO:FALTA {path}` or `CAMINHO:REPROVADO {motivo}`):

| Moment | Command |
|---|---|
| Start of the run (Initialization, step 5b) | `node _opencrew/core/scripts/caminho.mjs "{name}" pasta` (no `--run`: the script creates the `run_id`) |
| Before a step, for its `inputFile` | `node _opencrew/core/scripts/caminho.mjs "{name}" entrada --run "{run_id}" --arquivo "{inputFile}"` |
| Before a step writes, for the first `outputFile` of each group | `node _opencrew/core/scripts/caminho.mjs "{name}" saida --run "{run_id}" --arquivo "{outputFile}"` |
| After a step wrote, for each output file | `node _opencrew/core/scripts/caminho.mjs "{name}" conferir --arquivo "{path}"` |

- **Values** — `{name}`: the crew code. `{inputFile}` / `{outputFile}`: the path as the step
  declares it (raw, without the run_id). `{path}`: the path `saida` returned. The safe-name rule
  (nome seguro) applies: the crew and every path between double quotes.
- **`saida`** answers with the **transformed** path and creates its folder: write the file there,
  never to the raw path. Run it once per group in a step — the other `outputFile`s of the same
  group reuse the version folder it returned, and a file written twice in a step goes to the same path.
- **`entrada`** answers with the newest output of that file: use the path it returns, whatever
  its version folder.
- **The rule the script applies** (apply it yourself only when the script does not run):
  1. A declared path that starts with `crews/{name}/output/` gets `{run_id}/` right after
     `output/`; any other path stays as declared, with no version folder.
  2. The **group** is the folder of the file, run_id included (`…/output/{run_id}/`, or
     `…/output/{run_id}/slides/`). A step writes to the group's next version folder: the highest
     `vN` there plus 1, or `v1` when there is none — numeric order (`v10` comes after `v9`), gaps
     not filled (`v1` and `v3` → `v4`).
  3. A step reads the newest version that has the file: from the highest `vN` down, the first
     where the file exists and is not empty; then the group itself, with no version folder (where
     checkpoint answers live).

  Example, one group: the researcher writes `…/v1/pesquisa.md`, the writer writes `…/v2/post.md`
  and reads `…/v1/pesquisa.md`. Never assume `v1`.
- **Script that does not run** (no Node, an error, or no `CAMINHO:` line): tell the user once per
  run `Não consegui rodar a conferência de caminhos; sigo pela regra escrita e marco os arquivos como não verificados.`,
  build the path by the rule above (your file-writing tool creates the folder) and continue. A file handled
  this way skips its gate and is listed at the final approval:
  `{arquivo} — não verificado: a conferência de caminhos não rodou`.

### For each pipeline step:

0. **Agent deselection check** — Read the step's `agent:` frontmatter field.
   - If the step has an `agent:` value present AND it is in `skipped_agents` →
     announce `⏭️ Skipping {Agent Name} (deselected for this run)` and skip this
     step ENTIRELY: no Escritório command, no input validation, no execution, no output
     validation, no veto, no output file. Advance to the next step in
     `filtered_steps`.
   - Checkpoints that declare `agent:` and whose agent was deselected are skipped the
     same way. Checkpoints with no `agent:` field always run (backward compatible).
   - When the selection step was skipped (no `agent_dependencies:`), `skipped_agents`
     is empty → this check never fires (legacy behavior).

0b. **Escritório** — if it is on, run `passo`, or `checkpoint` when the step is a checkpoint (see "Escritório" above).
0c. **Entrega** — before the first step that publishes or sends, once the final approval was given, run the delivery (see "Entrega" below).

1. **Pre-Step Input Validation** — MANDATORY. If the step's frontmatter declares an `inputFile`, the input comes from the `entrada` action, never from a path you build: validate that the input exists before executing the step. Run the `entrada` command (Output Path Transformation) with the `inputFile` as declared:
   - `CAMINHO:OK {path}` → that path is the step's input (the newest version that has the file): read the input from it and execute the step.
   - `CAMINHO:FALTA {path}` → do NOT execute the step. Present to user:
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
- **Before building the subagent prompt**: Resolve all output paths referenced in the step file with the `saida` command (Output Path Transformation, once per group). Store the transformed path(s) in working memory — they will be used both in the prompt and in post-completion verification. Never pass raw paths from the step file to the subagent.
- Dispatch the step with your IDE's subagent mechanism (an IDE without one: run the step inline, in this conversation):
  - If `model_tier: fast`: use the fastest/lightest model available in your current IDE.
  - If `model_tier: powerful` or absent/invalid: use the default model (no model override needed)
- In the subagent's prompt, include:
  - The full agent persona from the party CSV
  - The full agent `.agent.md` content (persona, principles, voice guidance, anti-patterns)
  - If the agent has tasks: include ALL task files in order with instructions to execute sequentially, piping output from each task to the next
  - If the agent has no tasks: include the step instructions and operational framework as before
  - The veto conditions from the step file (agent should self-check before completing)
  - The company context
  - The crew memory
  - The **transformed** path to save output (the one `saida` returned, e.g. `crews/{name}/output/2026-03-20-140736/slides/v2/draft.md`)
- Wait for the subagent to complete
- Inform user: `✓ {Agent Name} completed`
- Proceed to Post-Step Output Validation (below) before advancing.

#### If `execution: inline`
- Switch to the agent's persona (read from party CSV); an agent with `tasks:` runs them as `Task-Based Agent Execution` says
- Announce: `{icon} {Agent Name} is working...`
- Follow the step instructions
- Present output directly in the conversation
- Save output to the specified output file — resolve the path with the `saida` command (Output Path Transformation) before writing. Do not write to the raw path from the step file.
- Proceed to Post-Step Output Validation (below) before advancing.

#### If `type: checkpoint`
- Present the checkpoint message to the user
- If the checkpoint requires a choice (numbered list), present options as a numbered list
- **Always include the file path** of any generated content the user needs to review. Example: "Review the content at `crews/{name}/output/{run_id}/v2/content.md` and let me know if it looks good." (the path the script returned)
- Wait for user input before proceeding
- Save the user's choice/response for the next step
- **Correction → memory, right away**: if the answer corrects something (tone, audience, a term,
  a fact, a format), write it to `crews/{name}/_memory/memories.md` in the matching section
  **before the next step** (antes do próximo passo) — not only at the end of the run, which may
  never come. A term the user asked to remove goes to `## Proibições Explícitas` **between
  quotes** (entre aspas), in the canonical form — `- Nunca usar "termo"` or, with a replacement,
  `- Nunca usar "termo" → usar "outro"` — so the automatic checker blocks it next time.
- **Correction vs. company profile**: if the correction contradicts `_opencrew/_memory/company.md`
  (e.g. the organization's name, the main audience), ask: "Isso vale para todas as crews?
  Atualizo o perfil da empresa?" — change `company.md` only after a yes.
- **If the step frontmatter contains `outputFile`**: after collecting the user's full response,
  insert only the run_id in the `outputFile` path (item 1 of the rule in Output Path Transformation — no version folder, no `saida` command), then write the response to that path with your file-writing tool (it creates the folder) before moving to the next step. Checkpoint files are user input captures, not versioned output: they live in the group itself, where `entrada` finds them.
  For the checkpoint that precedes the researcher, use this format:
  ```
  # Research Focus

  **Topic:** {user's typed topic}
  **Time Range:** {selected time range label, e.g., "Últimos 7 dias"}
  **Date:** {the date of this run, YYYY-MM-DD}
  ```
  For any other checkpoint: `# {the checkpoint's title}`, the user's answer as given (the option chosen and every comment), and `**Date:** {the date of this run, YYYY-MM-DD}`.
  This file is the `inputFile` of the step that follows.

### Post-Step Output Validation

After a step produces output (subagent or inline) and BEFORE Veto Condition Enforcement, the runner MUST validate that the declared output files exist and are non-empty. This is a binary, non-negotiable gate — the runner does NOT proceed on memory or assumption, only on the script's `CAMINHO:` line.

**If the step declares an `outputFile`** (single or multiple), run the `conferir` command (Output Path Transformation) for EACH output file, with the **stored transformed path** (the one `saida` returned), not the raw path from the step file. A step with an `output_contract:` adds its options to this same call (see Output Contract Validation): one command per file.

**Rules** (`FAIL` below = the last line is `CAMINHO:REPROVADO arquivo ausente ou vazio`):
- If ALL output files return `CAMINHO:OK` → proceed to Veto Condition Enforcement.
- **Irreversible step** (`side_effects: irreversible` — publish, post, send) with ANY
  `FAIL` → NEVER re-execute it. Tell the user: "⚠️ {Agent Name} did not save its
  output, but the action may already have happened (post published / email sent). Check
  before retrying." Then offer: 1. Retry step (only after the user checked) · 2. Mark as done
  and continue · 3. Abort pipeline.
- If ANY output file returns `FAIL` (any other step):
  1. **Retry once**: re-execute the entire step with the same input and context.
  2. After re-execution, run the validation again for all output files.
  3. If second attempt returns `CAMINHO:OK` for all files → proceed normally.
  4. If second attempt still has ANY `FAIL` → present to user:
     ```
     ⚠️ {Agent Name}'s output was not generated: {path}

     1. Retry step
     2. Skip step and continue
     3. Abort pipeline
     ```
     Wait for user choice before proceeding.
- If the step does not declare an `outputFile` (e.g., steps that only produce inline console output) → skip output validation.
- Checkpoint steps (`type: checkpoint`) are exempt — their output is the user's response, not a file.

**IMPORTANT**: Do NOT rely on reading the file yourself to "verify" output: what you read can be misinterpreted. Use ONLY the `conferir` command — its last line is binary and cannot be hallucinated.

### Output Contract Validation

Only when the step's frontmatter declares an `output_contract:` field: read
`_opencrew/core/runner/contrato-de-saida.md` completely and follow it — it adds `--secoes` and `--tldr`
to the same `conferir` call of the Post-Step Output Validation. Without the field, skip this validation.

### Veto Condition Enforcement

After an agent completes a step (before moving to the next step):

1. Check if the step file has a `## Veto Conditions` section
2. If yes, evaluate each veto condition against the agent's output:
   - Read the output that was just produced
   - Check each condition (e.g., "slides exceed 30 words", "no CTA", "missing sources")
3. If ANY veto condition is triggered:
   - Inform user: "⚠️ {Agent Name}'s output triggered a veto: {condition}"
   - Ask the agent to fix the specific issue (re-execute with targeted correction), then run the `conferir` command on the rewritten file again (Post-Step Output Validation) before judging the veto once more
   - Maximum 2 veto fix attempts per step
   - After 2 failed attempts, present to user for manual decision
   - **Never auto-fix an irreversible step** (`side_effects: irreversible`): re-executing it
     would publish/send again. Report the veto, warn the user that
     the action may already have happened, and let the user decide.
4. If no veto conditions triggered: proceed to next step

This creates an internal quality loop BEFORE the reviewer sees the content,
catching obvious issues early and reducing review cycle waste.

### Review Loops

When a step has `on_reject: {step-id}` (a review step):

1. **Automatic check BEFORE the reviewer runs** — run the checker on **all outputs** (todas as
   saídas) of every non-checkpoint step from the `on_reject` step up to the step right before the
   review, using the transformed paths of this run (run_id/vN). Each item is `caminho=formato`, with
   the `format:` of the step that generated that file; a step with no `format:`, with an export
   format (`pdf`, `csv`, `formatted-post`) or with one outside `[a-z0-9-]+` goes without `=formato`:
   ```bash
   node _opencrew/core/scripts/verificar.mjs --crew "crews/{name}" --arquivo "{path1}={format1},{path2},…" --relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"
   ```
   The script writes its report to that file (`{N}` = the cycle; do not save it yourself). Inject
   the output into the reviewer's context as `--- VERIFICAÇÃO AUTOMÁTICA ---`. The reviewer must copy the
   measured values from it (see best-practices `review.md`). If the checker did not run (no Node,
   an error, or no `VERIFICACAO:` status line), tell the user, continue with the normal review and
   repeat it at the final approval: "⚠️ A verificação automática não rodou: {motivo}".
2. **A block cannot be approved** — if the last line of the checker output is
   `VERIFICACAO:BLOQUEADA`, the verdict is **REJECT** regardless of the score (qualquer que seja a
   nota). Send the report (blocks first) to the writer together with the reviewer's feedback.
   If the last line is `VERIFICACAO:AGUARDANDO_USUARIO`, the only blocks are `[PREENCHER: …]`
   (real data only the user has): do NOT reject for them — the reviewer judges the rest, and the
   final approval below collects the missing data from the user.
3. Track the review cycle count: a **cycle** is one pass of the reviewer. The maximum is
   `max_review_cycles`, an integer from 1: the one declared where the step declares `on_reject` (the
   step frontmatter or its `pipeline.yaml` entry); without it, the one in `crew.yaml`; absent or invalid in both: 3. On every rejection, with or
   without a block, send the reviewer's feedback to the writer and go back to the referenced step.
4. If the last allowed pass also rejects, stop; the status of the last report picks the message, as
   in item 2 — `VERIFICACAO:BLOQUEADA`: the blocks; any other status: the reviewer's feedback, also
   with `VERIFICACAO:AGUARDANDO_USUARIO` (its only blocks are `[PREENCHER: …]`). Same three options:
   ```
   {if VERIFICACAO:BLOQUEADA} ⚠️ A revisão ainda encontra bloqueios depois de {N} ciclos:
   {lista de bloqueios do relatório}
   {any other status} A revisão não aprovou o texto depois de {N} ciclos. Motivo: {parecer resumido}

   1. Corrigir eu mesmo (eu edito o texto e você verifica de novo)
   2. Aceitar assim mesmo (fica registrado na entrega)
   3. Abortar
   ```
5. **Final approval checkpoint** (the checkpoint after the review): show the summary of the last
   report — `Verificação automática: {N} bloqueios, {M} alertas, {Z} não medidos`, with
   `{P} a preencher` right after the blocks when the report counts any — plus the list
   of alerts and the {Z} items not measured or not verified (the `Não medido` and `Não verificado`
   lines under each file, not the "não é texto" line of **Notas**), one per line as
   `{arquivo} — {motivo}`, then the lines under `**Notas:**` in that report, as they are written,
   and repeat every "não rodou" warning of this run (checker and source check) and the line of
   every file left unchecked by the safe-name rule. List the same way every file the path script
   did not check (see Output Path Transformation). If the approved
   text still contains `[PREENCHER: …]`, ask the user for each missing piece of real information
   and write it into the text before approving. If the user does not have it, do not insist and
   never invent: keep the `[PREENCHER]`, say `Sem problema: deixo [PREENCHER: {o que falta}] no texto. Na entrega você escolhe entre preencher depois e entregar assim mesmo, com ressalva.` and go on.

### Entrega

One script turns the approved files into `crews/{name}/output/{run_id}/entrega/` (a folder per channel, text ready to paste, a `LEIA-ME.md`) and copies what is ready to the folder of the project the user chose. Read `_opencrew/core/prompts/entrega.prompt.md` and follow it: how to build `{lista}`, when to add `--vai-publicar`, what to do with `ENTREGA:OK`, `ENTREGA:COM_RESSALVA` and `ENTREGA:INCOMPLETA`, the question about the folder of the project that keeps a copy (asked once per crew) and what to do with a script that did not run.

- **Command** — from the project root, by the safe-name rule (nome seguro), everything between double quotes: `node _opencrew/core/scripts/entregar.mjs --crew "crews/{name}" --run "{run_id}" --arquivo "{lista}"`
- **When** — once, after the final approval, immediately before the first step that publishes or sends (`side_effects: irreversible`, in the step or in the agent's skill); with no such step, after the last step. Always before the end-of-run command of the Escritório. If the irreversible step comes before the final approval (a crew built by an old version), the delivery runs at the end.
- **Crew with no final approval checkpoint** — same moments, and show `Esta crew não tem aprovação final: confira os arquivos antes de usar.` **Never** for a run that was rejected, aborted before the final approval or left with no approved file.
- The output of the script is the final summary of the run: show it as it came; if the run stops later, at an irreversible step, show it before stopping. After "Edit this content" changes an approved file, run it again.

### After Pipeline Completion

1. **Entrega** — if the delivery has not run in this run, run it now (see "Entrega" above).
1b. **Escritório** — if it is on, run `concluir` (see "Escritório" above).

2. **Close the run** — read `_opencrew/core/runner/fim-da-execucao.md` completely and follow it, in its
   order: update `memories.md`, add the line to `runs.md`, the post-run reflection and the completion
   summary with the final menu. Never skip it, and never write the memory or the history from what you
   remember of it.

## Error Handling

- If a subagent fails, retry once. If it fails again, inform the user and offer to skip the step or abort.
- If an irreversible step (`side_effects: irreversible`) fails, NEVER retry it automatically:
  the post/email may already have happened. Tell the user so, ask them to check, and let them
  choose: retry, mark as done, or abort.
- If a step file is missing, inform the user and suggest running `/opencrew edit {crew}` to fix.
- If company.md is empty, stop and redirect to onboarding.
- Never continue past a checkpoint without user input.
- When the run is aborted: if the Escritório is on, run `falhar` (see "Escritório" above).

## Pipeline State

Track pipeline state in memory during execution:
- Run ID (run_id) — the output subfolder name for this execution
- Current step index
- Outputs from each completed step (file paths)
- User choices at checkpoints
- Review cycle count
- Start time
- selected_agents / skipped_agents — the agent sets from Pre-Execution Agent Selection (step 4b)
- filtered_steps — the ordered steps that will actually run this execution
- missing_dependency — true if the user knowingly ran with a broken dependency

This state does NOT persist to disk — it exists only during the current run.
