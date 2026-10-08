# Correction at a checkpoint

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only when the answer to a checkpoint asks for a change or gives the data of a `[PREENCHER]`.

A correction is anything the user asks to change in what the crew produced or in how it works. Follow the items in this order; the `marcar` of the checkpoint comes last, once.

1. **Correction → memory, right away**: if the answer corrects something (tone, audience, a term,
   a fact, a format), write it to `crews/{name}/_memory/memories.md` in the matching section
   **before the next step** (antes do próximo passo) — not only at the end of the run, which may
   never come. A term the user asked to remove goes to `## Proibições Explícitas` **between
   quotes** (entre aspas), in the canonical form — `- Nunca usar "termo"` or, with a replacement,
   `- Nunca usar "termo" → usar "outro"` — so the automatic checker blocks it next time.
   A change that only concerns **this** text (add a paragraph, a date, a fact of this occasion) is
   not a preference: it goes into the file (item 3), never to the memory.
2. **Correction vs. company profile**: if the correction contradicts `_opencrew/_memory/company.md`
   (e.g. the organization's name, the main audience), ask: "Isso vale para todas as crews?
   Atualizo o perfil da empresa?" — change `company.md` only after a yes.
3. **The file is rewritten by the agent that wrote it** — when the correction is about a file an
   earlier step produced (the usual case: the checkpoint showed a draft):
   - Take that step again, as its agent, with the correction as the instruction and the current
     file as the input. Change what was asked and nothing else.
   - Write the new text to the next version of that file: run the `saida` command with the
     `outputFile` of that step (it opens a new `vN`; never edit the old file in place), then
     `conferir` with `--passo` of **that** step — the record then points to the corrected file.
   - The veto conditions of that step apply to the new text, as always.
   - An irreversible step (`side_effects: irreversible`) is never taken again here: say that the
     action already happened and ask the user what to do.
4. **Show the checkpoint again**, with the path of the new file, and wait for the answer. Another
   correction → items 1 to 4 again. The user accepts → go on.
5. **A correction that is not about a file** (a choice the user changed, an instruction for the
   steps that come next) changes no file: items 1 and 2 only, and the answer is saved as the
   checkpoint's answer.
6. **Data for a `[PREENCHER]`** (the user gives real information the text was missing, usually at
   the final approval) follows items 3 and 4 — new version, `conferir`, the checker again on it (the `verificar.mjs` command of "Review Loops", the next `verificacao-ciclo-{N}.md`), shown again with the new summary — but it is
   **not** a correction: nothing goes to the memory, and the checkpoint is recorded as `aprovado`
   when the user accepts the filled text.
7. **Record the checkpoint once**, when the user finally accepts: `marcar` with `--resultado
   corrigido` if there was any correction (items 1 to 5) before the acceptance, with the first
   correction in `--nota`; `aprovado` otherwise. Then the next step runs — it reads the newest
   version through `entrada`, as always.
