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

### 2b. Prepend to `runs.md` — the script writes the row

Never write `crews/{name}/_memory/runs.md` yourself. Close the run with the `fechar` command of the runner ("Run record"): `--resultado` is `aprovado` (the final approval was given), `publicado` (an irreversible step published or sent) or `rejeitado` (the review rejected at the last cycle and the user aborted); `--saida` is a brief description of what was generated (e.g. "Carrossel 9 slides", "Thread 7 posts"); add `--tema "{tema}"` (1 sentence max) if no command of this run carried the topic yet.

The script writes the row of this run right below the header — `Data | Run ID | Tema | Output | Score | Resultado`, newest run first; a row this run already had is replaced — and prints it. No other data.

`Score` has one definition, and the script counts it from the recorded checkpoints: the checkpoints the user approved without corrections ÷ the checkpoints the user answered (approved + corrected; a skipped one does not count), e.g. `2/3`; `—` when none was answered. Never compute it yourself.

- Last line `EXECUCAO:FECHADA {resultado} {score}` → go on to 2c. A line `Não consegui gravar o histórico desta execução: {motivo}` before it → show it to the user as it came.
- The script did not run (no Node, an error, no `EXECUCAO:` line) → tell the user `⚠️ Não consegui gravar o histórico desta execução: {motivo}` and go on. Do not write the row by hand.

### 2c. Post-Run Reflection (pattern detection)

After updating `memories.md` and closing the run, run a reflection pass. This is a lightweight analysis — not a full agent execution, just pattern matching on the corrections of this run and of the last runs.

1. **Collect this run's corrections**: From checkpoint responses, gather every user rejection or correction. A correction is:
   - A rejected output with a reason ("tom muito informal", "cor não combina", "fonte sem data")
   - A modification request during checkpoint ("muda o título para X", "usa azul em vez de verde")

2. **Look for recurrence**: use the list the `fechar` command printed under `Correções das últimas execuções:` — one line per correction recorded in the last 10 closed runs of this crew, this one included (`- {run_id} · passo {N} · {nota}`).
   - Do not search `memories.md` for past runs: by rule it keeps no run data.
   - Count: in how many different runs of that list does the same pattern appear?
   - A "match" means the same step (so the same agent) + the same type of error (e.g. "redator + tom informal", "designer + cores saturadas"). A line marked `(pedido)` is a request outside the pipeline: its step numbers are not the pipeline's — compare it by the type of error only.
   - No list was printed → there is nothing to compare: skip items 3 and 4.

3. **Promote to Regra de Ouro**: If the SAME pattern appears in **3 or more runs** (including this one):
   a. Add a new entry under `## Regras de Ouro` in `memories.md` (the header is exactly this, fixed PT-BR; create the section if the file does not have it):
      ```markdown
      ## Regras de Ouro

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

6. **Reflection budget**: Maximum 30 seconds of analysis: the list of the script is all the history you read. This is a quick scan, not an exhaustive audit.

3. Present completion summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Execução concluída!
📁 Entrega: crews/{name}/output/{run_id}/entrega/ — comece pelo LEIA-ME.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O que você quer fazer?
● Rodar de novo (outro tema)
○ Editar este conteúdo
○ Voltar ao menu
```

(The text between the lines is fixed PT-BR, whatever the user's language.)
