# Pre-Execution Agent Selection

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only when `crew.yaml` declares an `agent_dependencies:` field. It decides which agents actually run for this task.

Run this step ONLY if `crew.yaml` declares an `agent_dependencies:` field (even an
empty map `{}`). If the field is absent → skip this entire step and run ALL agents
exactly as before (legacy behavior).

When active, in this order:

a. **Capture the task** — Determine the user's request for this run:
   - If the run was invoked with a description (e.g. `/opencrew run {name} {description}`),
     use that text as the task.
   - Otherwise ask: `📝 What is the task for this run? Reply in one line.`
     Wait for the user's reply before continuing.

b. **Analyze against the decision matrix** — Scan the task text (case-insensitive,
   PT-BR and EN keywords) for the signals below. Start with ALL agents suggested as
   SELECTED (`required`). For each matching signal, find the affected agent(s) in
   `crew-party.csv` by matching the role terms against the agent's `id` and `title`
   (and `displayName` if ambiguous), then apply the suggested status:

   | Signal in the task | Role terms to match (id / title) | Suggested status |
   |--------------------|----------------------------------|------------------|
   | "já pesquisei", "com base em", "fontes que tenho", "material pronto", "baseado nas fontes", "research already done" | researcher, pesquisad, research | optional |
   | "revise", "melhore", "corrija", "refine", "edite" (sem criar do zero), "improve this draft" | copywriter, redator, writer, criador | optional |
   | "só texto", "sem imagem", "sem visual", "sem arte", "no image" | designer, design, visual | skip |
   | "já revisei", "já foi aprovado", "aprovado por terceiros", "revisão feita", "already reviewed" | reviewer, revisor | optional |
   | "quero só revisar este texto", "apenas revisar", "review only" | researcher AND copywriter | skip |
   | "tenho o conteúdo pronto", "forneço o documento", "docs em anexo", "segue o material", "here is the content" | copywriter, writer, creator | optional |

   Resolution rules:
   - `optional` = agent stays selected but may be unchecked.
   - `skip` = agent is suggested deselected.
   - Conflicting signals on the same agent → the more restrictive wins (`skip` > `optional`).
   - Never suggest skipping an agent whose output is the run's final deliverable unless the
     signal is explicit.
   - No signal matches → suggest keeping all agents (no change).

c. **Present the selection** — IDE-neutral numbered multi-select. List every agent from
   `crew-party.csv` in party order:
   ```
   🧑‍🤝‍🧑 Which agents should work on this task?

   Suggested selection:
   1. [x] {icon} {displayName} ({id}) — {title}
   2. [x] {icon} {displayName} ({id}) — {title}
   3. [ ] {icon} {displayName} ({id}) — {title}
   ...
   [x] = suggested selected · [ ] = suggested deselected

   Reply with the numbers of the agents you want to INCLUDE, separated by commas.
   Example: "1, 2"   ·   Reply "all" to run everyone.
   ```
   Wait for the user's reply. Parse it into `selected_agents`. At least one agent must
   be selected — if the user replies with none, repeat the prompt once.

d. **Dependency warnings** — Using `crew.yaml → agent_dependencies`
   (e.g. `copywriter: [researcher]` = copywriter consumes researcher's output):
   for every dependency `dependent → required_agent`, if `dependent` is selected but
   `required_agent` is NOT, warn:
   ```
   ⚠️ {dependent} normally depends on {required_agent}'s output, which you deselected.

   1. Re-select {required_agent} (recommended)
   2. Keep going without it — I will supply the input myself
   3. Deselect {dependent} too
   ```
   Wait for the user's choice and apply it. If they pick option 2, set
   `missing_dependency = true` in working memory (the existing Pre-Step Input
   Validation recovery — "Skip step and continue / Abort" — then handles any
   downstream gap).

e. **Build the filtered step list** — Set `skipped_agents = all party agents − selected_agents`.
   Build `filtered_steps` by walking `pipeline.yaml` in order, keeping a step when:
   - its frontmatter has NO `agent:` field (checkpoints / generic steps), OR
   - its `agent:` value is in `selected_agents`.
   Store `selected_agents`, `skipped_agents`, and `filtered_steps` in working memory for
   the per-step loop (steps 5 and 6 of the Initialization reflect them).
