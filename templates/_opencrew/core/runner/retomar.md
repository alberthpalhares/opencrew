# Resuming a run (retomar)

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only on `/opencrew retomar {name}`.

A run that stopped in the middle — the conversation ended, the context ran out — left its record on
disk. Resuming is going on from the step after the last one that was done, with the same `run_id`:
what was written and checked is not redone; the step that was in the middle is done again, whole.

1. From the project root, with the crew code between double quotes (safe-name rule of the runner):
   ```
   node _opencrew/core/scripts/execucao.mjs "{name}" retomar
   ```
2. Read the last line:
   - `EXECUCAO:NADA` → say `Não há execução interrompida da crew {nome}.` and stop (to start a new
     run: `/opencrew run {name}`).
   - `EXECUCAO:RETOMAR {run_id} {N}` → the lines before it are the theme, the steps already checked
     (each with its file), the checkpoints already answered and the verdicts of the review. Go to 3.
   - The output starts with `Execuções abertas` → more than one run is open: show the list and ask
     which one. For one that is not the newest, run the command again with `--run "{run_id}"`.
   - A line `Tipo: pedido` after `Tema:` → the open run is a request outside the pipeline: after
     the yes of item 3, read `_opencrew/core/prompts/pedido.prompt.md` and go on from its step
     `{N}` ("Resuming a request" there) — items 4 and 5 below, which are about the pipeline, do
     not apply.
   - A line `Não consegui ler na crew para qual passo a revisão … volta` → show it and confirm the
     step with the user before going on.
   - No `EXECUCAO:` line (no Node, an error) → show the message as it came and stop. Never rebuild
     the state of a run by looking at its folder, and never read `execucao.json` yourself.
3. Ask, and wait for the answer:
   `A execução {run} ({tema}) parou depois do passo {k}. Já estão prontos: {lista}. Continuo do passo {N}?`
   (`{run}`: the `run_id`; `{k}`: the step of the line `Parou depois do passo`; `{lista}`: the files
   under `Passos conferidos` — not the ones under `Já gravados, mas serão feitos de novo`; a run
   with no theme goes without the parentheses.)
   - No → change nothing. Ask `Quer que eu encerre essa execução como abortada?`; after a yes, run
     the `fechar` command of the runner ("Run record") with `--resultado abortado`, so it is no
     longer offered. Then stop.
4. Only now, after the yes (nothing of the runner's Initialization runs before the question): do the Initialization of the runner in full (memory format, source check, project
   sources, pipeline, skills, tiers, agent selection, the header) **except step 5b**: do not run
   `pasta` — the `run_id` is the one of the `EXECUCAO:RETOMAR` line.
   Step 6 (the Escritório) happens as in a new run. The header of step 5 says `Retomando do passo {N} de {total}`
   (`{total}`: the steps of the pipeline) in place of the line `Pipeline: … steps`. Agent selection: when
   `crew.yaml` declares `agent_dependencies:`, ask it again and say once `A escolha de agentes da
   execução anterior não foi guardada; escolha de novo.`
5. Go on at step `{N}` of "For each pipeline step", with that `run_id`:
   - Every input comes from the `entrada` command, as always: it finds what the earlier steps wrote.
   - The paths under `Passos conferidos` are the stored paths of those steps: use them to show a
     file at a checkpoint and to build the list of the delivery.
   - Do not ask again a checkpoint the script listed as answered: its answer is in the file the
     checkpoint saved (the `inputFile` of the step after it), or in the note the script printed.
   - Step `{N}` is done whole, even when a file of it is already there (`saida` opens a new version).
   - A review cycle the script listed counts: the cycles left are `max_review_cycles` minus the
     `rejeitado` verdicts under `Revisões:` for that review step (no such section: none), and the
     next `verificacao-ciclo-{N}.md` is the number of verdicts there plus 1.
   - The `Tema:` line says whether the record has a topic: `(sem tema)` → send `--tema` with the
     next `marcar` or with `fechar`.
   - `{N}` is after the last step of the pipeline (the script says `Todos os passos já foram feitos`)
     → go straight to "After Pipeline Completion".
6. Say once, before the first step: `Retomei pelo que está gravado. O que foi combinado só na conversa anterior não veio junto.`
   A resumed run is recorded and closed like any other (`conferir --passo`, `marcar`, `fechar`).
