# End of the run

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it when the pipeline has completed. It continues the list of "After Pipeline Completion" in the runner: items 2 and 3 below are the items 2 and 3 of that list; follow them in order.

2. **Update crew memory** — write to BOTH files:

### 2a. Update `memories.md` (living preferences)

Read `crews/{name}/_memory/memories.md` in full. Then identify candidates from this run: **only explicit user feedback** — approvals with comments, rejections with reasons, direct requests ("prefiro X", "não quero Y"). Never infer preferences.

For each candidate:
- If an equivalent memory already exists and is compatible → skip (no duplicate)
- If an equivalent memory exists but contradicts the new item → replace with the newer version
- If no equivalent exists → add to the correct semantic section:
  - Writing style choices → `## Estilo de Escrita`
  - Visual/design preferences → `## Design Visual`
  - Content structure choices → `## Estrutura de Conteúdo`
  - Explicit rejections or prohibitions → `## Proibições Explícitas`, in the canonical form
    (`- Nunca usar "termo"` or `- Nunca usar "termo" → usar "outro"`)
  - Crew-specific technical patterns → `## Técnico (específico do crew)`

**Never write to `memories.md`:**
- Runner inferences ("usuário parece preferir X")
- Run scores, review grades, output file paths, topics from past runs

**Technical routing:** For any technical learning (bugs, workarounds, API behavior):
- If it affects any crew (Playwright bugs, OS rendering quirks, API limits) → write to `_opencrew/best-practices.local/{format}.md` instead of `memories.md` (copy the core file there first if the local one does not exist yet — the core folder is replaced by every `update`; the local one is never touched)
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
- `Data`: the date of this run (the first 10 characters of the `run_id`)
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
📁 Delivery: crews/{name}/output/{run_id}/entrega/ — start with LEIA-ME.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What would you like to do?
● Run again (new topic)
○ Edit this content
○ Back to menu
```
