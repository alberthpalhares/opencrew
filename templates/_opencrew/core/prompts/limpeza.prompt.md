# Limpeza — free the space of old runs, safely (cleanup)

You are handling `/opencrew cleanup <name>`: the user wants to free disk space taken by old runs of one
crew. You never delete anything yourself and never decide by yourself what goes: the script lists, the
user approves, and the script deletes only the run ids you pass to it, one by one.

Speak to the user in their language (`_opencrew/_memory/preferences.md`); the script answers in fixed PT-BR.
Every command follows the safe-name rule of `_opencrew/core/runner.pipeline.md` (the crew between double quotes).

## Step 1: The crew

The crew of the command, or the one named in the request. None, or one that does not exist → list the
crews (a folder under `crews/` without `crew.yaml` is not a crew) and ask which.

## Step 2: List (nothing is deleted yet)

```
node _opencrew/core/scripts/limpeza.mjs "{name}" --listar
```

The last line is `LIMPEZA:LISTA {n} {tamanho}` or `LIMPEZA:NADA`. The script did not run (no Node, an
error, no `LIMPEZA:` line) → show the message as it came and stop; never list or delete by hand.

- `LIMPEZA:NADA` → say `Não há execução para limpar na crew {nome}: as {N} mais recentes ficam e o resto está aberto ou sem cópia.` and, if the output lists runs under "Ficam" for lack of a copy, say that
  those only exist in the run folder and offer Step 3b. Stop otherwise.
- `LIMPEZA:LISTA` → show the user the candidates (run, date, size, whether the delivery was copied), the
  runs that stay and why, and the size that comes back (the size of the line is of the runs only; the
  audio has its own line). The history (`runs.md`) is not touched: say so. A run listed under "Ficam"
  for lack of a copy is offered in Step 3b too, not only when nothing else is left.

## Step 3: Ask, one thing at a time

a. The candidates that **have** a copy of the delivery: ask once for all of them:
   `Vou apagar {n} execuções da crew {nome} e liberar {tamanho}. O histórico (runs.md) fica. Posso apagar?`
b. A run that stays only because its delivery was not copied: never offer it together with the others.
   Ask for each: `A entrega da execução {run} só existe nesta pasta (não foi copiada para o projeto). Posso apagar mesmo assim?`
   A yes puts that run in **both** `--apagar` and `--sem-entrega`. A "não" leaves it.
c. Old audio (`.wav`) listed in `_investigations/`: ask separately
   `Há áudio com mais de 30 dias em _investigations/ ({n} arquivos, {tamanho}). A transcrição fica. Posso apagar o áudio?`;
   a yes adds `--audio`.

"Apague tudo o que for antigo", "só o que você listou": that is the **candidates** of Step 2 only. What
stays (open, recent, no copy) and the audio each need their own yes.

The user may take only some of the candidates: use exactly the ones they approve.

## Step 4: Delete

Only with the run ids the user approved, taken **from the list of Step 2** — never typed from memory, never
"all":

```
node _opencrew/core/scripts/limpeza.mjs "{name}" --apagar "{run1},{run2}" [--sem-entrega "{run}"] [--audio]
```

(`--sem-entrega` lists only runs that are also in `--apagar`; the audio alone: `--apagar "" --audio`.)

- `LIMPEZA:APAGADO {n} {tamanho}` → say what was freed.
- `LIMPEZA:RECUSADA` → nothing was deleted: the line before it says why for each run; show it and go back to Step 2 (the list changed).
- `LIMPEZA:PARCIAL {n} {tamanho}` → something did not go: a line `Apaguei só parte de {run}` or `Não consegui apagar …` says what. Show it, say that the run is **half deleted** (what is left is still in `output/`), ask the user to close the program that uses the folder and offer to run the list again. Never finish the deletion by hand.
- A line `… é um atalho para outro lugar` → the crew, `output/` or `_investigations/` is a shortcut (a Drive or OneDrive folder, for instance): the cleanup does not follow it. Tell the user; do not try another way.

## Rules

- **DO** show the list and get a yes before every `--apagar`.
- **DO NOT** delete, move or edit any file or folder with your own tools, not even to "finish" a cleanup.
- **DO NOT** touch the copies of the deliveries in the user's project: they are the user's.
- **DO NOT** use this for an open run (`/opencrew retomar` continues it) or for the history.
