# Escritório (optional live view)

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only when `preferences.md` has `Dashboard: enabled`.

A local page that shows the crew at work, off by default. Follow this part only when the
already-loaded `preferences.md` has `Dashboard: enabled` (written `- **Dashboard:** enabled` or
plain `Dashboard: enabled`, any letter case); otherwise run none of these commands. When it is on,
run, from the project root, the one-line command of each moment:

| Moment | Command |
|---|---|
| Start of the run (Initialization, step 6) | `node _opencrew/core/scripts/estado.mjs "{name}" iniciar --passos {N}` |
| Right after `iniciar`, once per deselected agent | `node _opencrew/core/scripts/estado.mjs "{name}" pular --agente {id}` |
| Before each step, each time it starts | `node _opencrew/core/scripts/estado.mjs "{name}" passo --n {K} --agente {id} --rotulo "{rótulo}" --mensagem "{frase}"` |
| Before asking the question of a checkpoint (instead of `passo`) | `node _opencrew/core/scripts/estado.mjs "{name}" checkpoint --n {K} --agente {id} --rotulo "{rótulo}"` |
| End of the run (After Pipeline Completion) | `node _opencrew/core/scripts/estado.mjs "{name}" concluir` |
| Run aborted after `iniciar`, by the user or by an error | `node _opencrew/core/scripts/estado.mjs "{name}" falhar --motivo "{motivo}"` |

- **One at a time** — Run these commands one at a time, waiting for the `ESTADO:` line of each
  before the next — never in parallel or in the background (each one reads and rewrites the same file).
- **Values** — `{name}`: the crew code. `{N}`: how many steps will run, checkpoints included (a
  deselected agent's steps do not count). `{K}`: the step's position among them, from 1. `{id}`: the agent's `id` column in
  `crew-party.csv`; a step or checkpoint with no `agent:` goes without `--agente`
  (the table shows the full form). `{rótulo}`: the step's name, in
  a few words. `--mensagem` goes only when the agent changed since the last `passo` (so never on the first
  one): one sentence on what the previous agent delivered — never look at the next step. `{motivo}`: why the run stopped.
- **Text on the command line** — `--rotulo`, `--mensagem` and `--motivo` go between double quotes,
  on one line, starting with a letter or a digit, with only letters (accents included), digits,
  spaces and `. , : ; - ( ) / ?`. Drop every other sign (quotes of any kind, `$`, backtick, `\`,
  `%`, `!`, emoji). If no text is left, omit the option. Write them in the user's language.
- **After `iniciar`**, when it answers `ESTADO:OK`, show the user once:
  `Escritório ligado. Se a página não estiver aberta, rode em outro terminal: node _opencrew/core/scripts/escritorio.mjs`
- **The Escritório never stops the run.** A command that fails, does not run or answers
  `ESTADO:IGNORADO`: go on, do not repeat that event, ask nothing, and tell the user once per run,
  in one line: `O escritório não foi atualizado nesta execução; o trabalho segue normalmente.` With
  the reason "escritório desligado", say nothing and stop calling the script for the rest of this run.
- The script is the only writer: never read, write or describe `crews/{name}/state.json` yourself.
