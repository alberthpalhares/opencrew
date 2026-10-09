# Entrega — The Delivery Folder of a Run

One script turns the approved files of a run into `crews/{name}/output/{run_id}/entrega/`: one
folder per channel, text ready to paste and a `LEIA-ME.md` that tells the user what to do with each
file. The same script copies what is ready to a folder of the project the user chose, one folder per
run. Your part is to build the list of files, run the script, act on its last line and ask, once per
crew, where the copy goes.

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
- `{canal}` is the folder name: `instagram`, `linkedin`, `blog`, `email`, `whatsapp`, `twitter`,
  `youtube` or `documentos` (the folder of `platform: "documento"`). Only a channel that has an item in the list (an item whose format has that
  `platform:`) — for any other the script stops with `Canal não encontrado nesta entrega: {canal}.`

## Step 3: Run the script

From the project root, one line, everything between double quotes:

`node _opencrew/core/scripts/entregar.mjs --crew "crews/{name}" --run "{run_id}" --arquivo "{lista}"`

With channels from Step 2, the same command ends with one option per channel:

`node _opencrew/core/scripts/entregar.mjs --crew "crews/{name}" --run "{run_id}" --arquivo "{lista}" --vai-publicar {canal}`

## Step 4: Show the result and read the last line

The output of the script is the final summary of the run (the folder, each channel as "Pronto",
"Pronto, com ressalva" or "Não está pronto", what is missing, the line of the copy, the path of
the `LEIA-ME.md`): show it to the user as it came,
without the `ENTREGA:` line. Do not rewrite it and do not add files it does not list. Besides the
`entrega/` folder, the script also writes `crews/{name}/output/{run_id}/verificacao-entrega.md`,
the report of the check made at delivery time (it is not part of the delivery).

- `ENTREGA:OK` → go on with the run (Step 5 first, when it applies). When the summary has a line
  that starts with "Sem papel timbrado:", the Word documents came out with no letterhead: say so
  and offer to set it up (`/opencrew documento`); after the profile exists, deliver again.
- `ENTREGA:COM_RESSALVA` → everything that was missing is a ressalva the user accepted: the
  `LEIA-ME.md` opens with it and the channel is "Pronto, com ressalva"; go on as with `ENTREGA:OK`.
- `ENTREGA:INCOMPLETA` → a channel is not ready, the destination was refused or a file could not be
  written. `entrega/` was generated anyway and the `LEIA-ME.md` marks the channel; a channel that
  is not ready is not copied to the project. The channels that are ready were already copied by
  this same call, before the user answers: nothing waits for the answer. Show what is missing and
  ask:
  ```
  ⚠️ A entrega ficou incompleta: {o que falta}
  1. Corrigir agora (eu ajusto no arquivo de origem, verifico e monto a entrega de novo)
  2. Entregar assim mesmo (fica registrado como ressalva no LEIA-ME)
  3. Deixar para depois (o canal fica como "Não está pronto" e não é copiado)
  ```
  Wait for the answer.
  - **1** — for each item that is missing, fix the file the pending item names, never inside
    `entrega/`, as a **new version**: read `_opencrew/core/runner/correcao-no-checkpoint.md` and
    follow its item 3 (the agent of the step that wrote the file rewrites it, `saida` opens the
    next `vN`, `conferir --passo` of that step; in a pedido the step is 1). Ask the user for the
    real information of every `[PREENCHER: …]`, shorten what is over a limit, write again a file
    that is not there. Then run the checker on the new file, saving the report as the next
    `verificacao-ciclo-{N}.md` of the run
    (`node _opencrew/core/scripts/verificar.mjs --crew "crews/{name}" --arquivo "{caminho}={formato}" --relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"`)
    and only then run the delivery again, with the list that has the **new** path in place of the
    old one. The reviewer does not run again and the `marcar` of the approval is not repeated.
  - **2** — run the same command again, ending with `--aceitar-pendencias`: the script records
    each pending item as a ressalva (in `ressalvas.json`, in the run folder, and at the top of the
    `LEIA-ME.md`), the channel becomes "Pronto, com ressalva" and is copied like the ready ones.
    It does **not** solve a file that does not exist, a refused destination or a file that could
    not be written: for those, see below.
  - **3** — go on: the channel stays "Não está pronto" and is not copied. Every irreversible step
    still asks for its own confirmation, as it does today. Tell the user what is missing and that
    it is enough to ask for the delivery of this run when the data exists.
  - **Destination refused, or a file that could not be written** (the lines "Não copiei: …" and
    "Não consegui gravar …"): show the message as it came and ask for another folder (Step 5, with
    the new answer) or for a new attempt, which is the same command again. A file of the list that
    does not exist: ask for it, or take it out of the list.
  - **A Word document that was not generated** (the line "Não consegui gerar o Word de
    {arquivo}: …"): show the message as it came; this is never accepted with option 2. When the
    reason starts with "Perfil, linha {n}:", the letterhead profile has a wrong line: ask the user
    for the right value, write it in `_opencrew/_memory/documento-oficial.md` and run the same
    command again.
  The first call never has `--aceitar-pendencias`. Outside option 2 it goes only when the user
  already chose "Aceitar assim mesmo" in the review loop of this run and what is missing is only
  what was accepted there: then run the command again with it, without asking.

After "Editar este conteúdo" (the final menu of the runner) changes an approved file, or any step
runs again after the delivery, run the delivery again with the new paths: the folder is rebuilt
from scratch, so whatever was edited inside `entrega/` is lost — the `LEIA-ME.md` says so. The copy
in the project is never overwritten: when something already copied changed, the script puts the
new delivery in a folder beside it (`{run_id}-reentrega-2`) and the summary says so.

## Step 5: The folder of the project that keeps the copy

The line `Cópia:` of the summary says what was copied and where (or "Criei a pasta …" before it):
show it as it came. A crew whose answer was "não" has no such line, and nothing is asked.

After **any** delivery whose summary has the line "Cópia: nenhuma pasta escolhida para esta crew."
— `ENTREGA:OK` and `ENTREGA:COM_RESSALVA` included — ask, once. When the last line was
`ENTREGA:INCOMPLETA`, ask only after it was resolved (Step 4):

```
Quer que eu copie o resultado para uma pasta do projeto? Se sim, diga qual (por exemplo, `Conteudo/Prontos`). Se não, não pergunto de novo.
```

- A folder → run the same command again (same list, same options), ending with
  `--lembrar-destino "{pasta}"`.
- "Não" → the same command again, ending with `--lembrar-destino nao`.

The script writes the answer in the `crew.yaml` of the crew (`entrega.destino`, with a `.bak` copy
of the file) and makes the copy in the same call: never edit the `crew.yaml` yourself for this. The
next deliveries of the crew do not ask again.

- **`{pasta}` was typed by the user and goes into a command** — the safe-name rule (nome seguro)
  of the runner applies: between double quotes and only if it is made of letters (accents
  included), digits, space and `. _ - / \ : ( )`. With any other character do NOT run the command;
  say `⚠️ O nome `{pasta}` tem um caractere que não posso usar em comandos ({caractere}). Use só letras, números, espaço, ponto, hífen, sublinhado e parênteses.`
  and ask for the folder again.
- The folder is a path inside the project, written from its root (`Conteudo/Prontos`). When the
  script refuses it ("Não copiei: …"), nothing was recorded — also when it is the only line of the
  output, with no `ENTREGA:` line: show it as it came and ask for another folder (or "não").
- To copy one delivery somewhere else without changing the answer of the crew, the same command
  ends with `--destino "{pasta}"` (same rule for `{pasta}`); only when the user asks for it.

## Changing the folder later

When the user asks to change where the copy goes, to stop copying or to copy again ("muda a pasta
de entrega", "não quero mais cópia", "volta a copiar"): run the delivery of the **last run** of the
crew ("A run that already ended", below), with the command ending with
`--lembrar-destino "{pasta}"` (same rule for `{pasta}`), or with `--lembrar-destino nao` to stop.
With no folder in the request, ask which. Never edit the `crew.yaml` by hand.

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

**A refused destination is not that.** When the only line is "Não copiei: … Recebi: {valor}." (the
folder given to `--lembrar-destino` was refused; nothing was written), the script did run: show
that line to the user as it came and ask for another folder (or "não"), as in Step 5 — never answer
it with "A entrega automática não rodou".

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
4. On "sim", follow Steps 2 to 5. No step of the pipeline runs again, and nothing is published.

## Rules

- **DO** show the output of the script as it came; the folder and file names and the `LEIA-ME.md`
  are fixed PT-BR, whatever the user's language.
- **DO** run the delivery again whenever an approved file changes.
- **DO NOT** create, edit or delete anything inside `entrega/` yourself.
- **DO NOT** write the destination in the `crew.yaml` yourself, nor copy the delivery by hand.
- **DO NOT** put in the list a file the user did not approve, nor a path you guessed.
- **DO NOT** treat `ENTREGA:INCOMPLETA` as an error of the script: it is its answer.
