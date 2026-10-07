# Entrega — The Delivery Folder of a Run

One script turns the approved files of a run into `crews/{name}/output/{run_id}/entrega/`: one
folder per channel, text ready to paste and a `LEIA-ME.md` that tells the user what to do with each
file. Your part is to build the list of files, run the script and act on its last line.

You do NOT copy, split, rename or rewrite a file yourself, and you never write inside `entrega/`:
the script rebuilds that folder from scratch on every call. **When** the delivery runs is in the
section "Entrega" of `_opencrew/core/runner.pipeline.md`; a request to deliver a run that is
already over starts at "A run that already ended", below.

## Step 1: Build the list

`{lista}` is one item per file, separated by commas, each written `{caminho}={formato}`.

- **What goes in:** for each **creation or rendering step** of the approved run, every path the
  `saida` action of `caminho.mjs` returned the **last time** the step ran (a step sent back by the
  reviewer ran more than once: only its last version counts) — all the output files of the step,
  images and HTML included. Use the paths you stored during the run. Never look for a `vN` folder
  by yourself and never assume `v1`.
- **`{formato}`** is the `format:` of the step that wrote the file. A rendering step with no
  `format:` uses the `format:` of the content step it renders (the slides of an `instagram-feed`
  carousel go as `=instagram-feed`). With no format either way, with an export format (`pdf`,
  `csv`, `formatted-post`) or with one outside `[a-z0-9-]+`, the item goes without `={formato}`:
  the script puts that file in `outros/`.
  This list is **not** the list of the checker (`verificar.mjs`), where a step with no `format:`
  goes without one: here the rendering step (images, HTML) takes the format of the content step it
  renders — the step that wrote its `inputFile`. Without it the images land in `outros/`.
- **Stay out:** research, briefing, the reviewer's verdict, checkpoint answers and every skipped
  step (a deselected agent, or a step the user skipped).
- **Safe names** — the safe-name rule (nome seguro) of the runner applies. A file that rule left
  out of commands stays out of the list too; tell the user:
  `{arquivo} — ficou fora da entrega: nome com caractere que não vai em comando`.

## Step 2: Channels the crew publishes by itself

Add `--vai-publicar {canal}` once for each channel of the list that has an irreversible step in the
pipeline (`side_effects: irreversible`, in the step or in the agent's skill), whether that step
already ran or not. The `LEIA-ME.md` then opens that channel with: "Esta crew publica este canal
sozinha. Antes de postar à mão, confira se já saiu."

- The channel of a step is the `platform:` of its `format:` — read it in
  `_opencrew/best-practices.local/{format}.md` when that file declares `platform:`, otherwise in
  `_opencrew/core/best-practices/{format}.md`. For a step with no `format:`, the one of the skill
  (`instagram-publisher` → `instagram`). With neither, do not pass the option.
- `{canal}` is the folder name: `instagram`, `linkedin`, `blog`, `email`, `whatsapp`, `twitter` or
  `youtube`. Only a channel that has an item in the list (an item whose format has that
  `platform:`) — for any other the script stops with `Canal não encontrado nesta entrega: {canal}.`

## Step 3: Run the script

From the project root, one line, everything between double quotes:

`node _opencrew/core/scripts/entregar.mjs --crew "crews/{name}" --run "{run_id}" --arquivo "{lista}"`

With channels from Step 2, the same command ends with one option per channel:

`node _opencrew/core/scripts/entregar.mjs --crew "crews/{name}" --run "{run_id}" --arquivo "{lista}" --vai-publicar {canal}`

## Step 4: Show the result and read the last line

The output of the script is the final summary of the run (the folder, each channel as "Pronto" or
"Não está pronto", what is missing, the path of the `LEIA-ME.md`): show it to the user as it came,
without the `ENTREGA:` line. Do not rewrite it and do not add files it does not list. Besides the
`entrega/` folder, the script also writes `crews/{name}/output/{run_id}/verificacao-entrega.md`,
the report of the check made at delivery time (it is not part of the delivery).

- `ENTREGA:OK` → go on with the run.
- `ENTREGA:INCOMPLETA` → a channel is not ready, or a file could not be written. The files were
  generated anyway and the `LEIA-ME.md` marks the channel. Show what is missing and ask:
  ```
  ⚠️ A entrega ficou incompleta: {o que falta}
  1. Corrigir agora (eu ajusto e monto a entrega de novo)
  2. Seguir assim (no LEIA-ME, o canal fica marcado como "Não está pronto")
  ```
  Wait for the answer.
  - **1** — for each item that is missing, fix it in the source file the summary names: ask the
    user for the real information of every `[PREENCHER: …]`, shorten what is over a limit, write
    again a file that is not there (when the summary says a file could not be written, there is
    nothing to fix in the text). Then run the delivery again, with the same list.
  - **2** — go on, with the delivery as it is. Every irreversible step still asks for its own
    confirmation, as it does today.

After "Edit this content" (the final menu of the runner) changes an approved file, or any step
runs again after the delivery, run the delivery again with the new paths: the folder is rebuilt
from scratch, so whatever was edited inside `entrega/` is lost — the `LEIA-ME.md` says so.

## When the script does not run

The script did not run when there is no Node, an error, or no `ENTREGA:` line at the end (it prints
one line in PT-BR and stops, with nothing written). Then never build the folder by hand. If the line points to something in the
command you wrote (an option, a channel, the run), fix the command and run it once more. Otherwise
tell the user, list the approved files (the paths of your list) and go on with the run:

```
⚠️ A entrega automática não rodou: {motivo}
Os arquivos aprovados estão em:
- {caminho}
```

`{motivo}` is the line the script printed, or what kept it from running. The completion summary
of the runner then shows this list in place of the `entrega/` folder.

## A run that already ended

When the user asks to deliver a run that is over (it was run before this folder existed, or the
delivery did not run):

1. Find the crew and the run. If the user did not say which, list the folders of
   `crews/{name}/output/` with the IDE's folder-listing tool (no shell command) and ask.
2. Read the steps of `crews/{name}/pipeline/`. For the `outputFile` of each creation or rendering
   step (same rules of Step 1 for what stays out and for `{formato}`), run:
   `node _opencrew/core/scripts/caminho.mjs "{name}" entrada --run "{run_id}" --arquivo "{outputFile}"`
   `CAMINHO:OK {path}` → that path is the item. `CAMINHO:FALTA` → the file is not in that run:
   leave it out.
3. Nobody recorded what was approved in that run, so show the list and wait for the "sim":
   ```
   Entrega da execução {run_id} da crew {name}. Arquivos:
   - {caminho} ({formato})
   Posso montar a entrega com esta lista? (sim / não)
   ```
4. On "sim", follow Steps 2 to 4. No step of the pipeline runs again, and nothing is published.

## Rules

- **DO** show the output of the script as it came; the folder and file names and the `LEIA-ME.md`
  are fixed PT-BR, whatever the user's language.
- **DO** run the delivery again whenever an approved file changes.
- **DO NOT** create, edit or delete anything inside `entrega/` yourself.
- **DO NOT** put in the list a file the user did not approve, nor a path you guessed.
- **DO NOT** treat `ENTREGA:INCOMPLETA` as an error of the script: it is its answer.
