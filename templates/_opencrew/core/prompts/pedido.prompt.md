# Pedido — one task for a crew, outside its pipeline

You are handling a **pedido**: the user asks one crew that already exists for a single piece of
work ("escreve o ofício para a prefeitura", "refaz o comunicado com a data nova") without running
its whole pipeline. A pedido is a run like any other, with no pipeline: it has its own folder, its
record on disk, one agent of the crew doing the work, the automatic check, the user's approval,
the delivery and a row in the crew's history.

Speak to the user in their language (`_opencrew/_memory/preferences.md`); the scripts answer in fixed PT-BR: translate what you show.

Everything below that is a command follows three sections of `_opencrew/core/runner.pipeline.md` —
read them now: "Safe names in commands (nome seguro)", "Output Path Transformation" (what `saida`
and `conferir` answer) and "Run record (registro da execução)": the crew and every path between
double quotes; text on the command line (`{tema}`, `{nota}`, `{saída}`) on one line, with only
letters, digits, spaces and `. , : ; - ( ) / ?`; and you **never read, write or describe
`execucao.json` yourself, and never write `runs.md`** — only the scripts do. A script that does not
run never stops the pedido: tell the user once and go on.

## Step 1: The crew and the task

- The crew: the one in the command (`/opencrew pedir <name> "<task>"`) or named in the request. No
  crew, or one that does not exist → list the crews (a folder under `crews/` without `crew.yaml` is
  not a crew) and ask which.
- The task: the text of the request. Empty → ask: "O que você quer pedir à crew {nome}?"
- A task that asks to **publish, post or send** something → say "Um pedido não publica nem envia;
  para isso use o pipeline da crew." and offer to prepare the text only. Never use a skill with
  `side_effects: irreversible` in a pedido.
- A task that is the crew's whole pipeline ("roda a crew", "faz o post da semana" for a crew that
  does exactly that) → say so and offer `/opencrew run {name}` instead.

## Step 2: Load what a run loads

Read `crews/{name}/crew.yaml`, `crews/{name}/crew-party.csv`, `_opencrew/_memory/company.md`,
`_opencrew/_memory/preferences.md` and `crews/{name}/_memory/memories.md`. Then do, from the
Initialization of `_opencrew/core/runner.pipeline.md`, items **1b** (memory format), **1c** (source
check) and **1d** (project sources), exactly as written there. Do not read the pipeline of the crew
and do not run the agent selection: a pedido has no pipeline.

When the task refers to something the crew produced before ("o comunicado de ontem"), ask which
file, or use the one the user points at — never guess a file from the output folder.

## Step 3: Who does it, and what comes out

Choose **one** agent of the crew whose role fits the task (read its row in `crew-party.csv` and its
full `.agent.md`). Decide the file (`crews/{name}/output/{arquivo}.md` — `{arquivo}` short, lower
case, no accent, no space) and its format, among the files of `_opencrew/core/best-practices/` (and
`_opencrew/best-practices.local/`): a text for a channel gets that channel's format; a text to
print, sign or file gets `documento-oficial` (it is delivered as a Word file); any other text gets
`texto-livre`. When you cannot tell (an aviso, a convite), ask first: "Esse texto vai ser impresso
ou assinado (sai em Word), vai para algum canal (qual?), ou é só o texto?"

Ask and wait: "Quem faz: {Nome} ({função}). Vai sair: {arquivo}, como {formato}. Posso começar?"
The user may change the agent, the file or the format.

- No agent of the crew does that kind of work → say "Nenhum agente da crew {nome} faz esse tipo de
  trabalho. Dá para acrescentar um com /opencrew edit {nome}, ou criar outra crew." and stop. Never
  improvise an agent that is not in the crew.

## Step 4: Open the pedido

After the yes, from the project root:

```
node _opencrew/core/scripts/caminho.mjs "{name}" pasta --pedido --tema "{tema}" --agente {id} --formato {formato}
```

`{tema}`: the task in a few words. `{id}`: the agent's `id` in `crew-party.csv`; `{formato}`: the id of
the format (`texto-livre`) — the record keeps both, so a resumed pedido knows them. The last line is `CAMINHO:OK crews/{name}/output/{run_id}`:
the `run_id` is the last segment — store it. `--passo` takes the numbers of the pedido, not the
numbers of the headings of this file: **1** = the work; **2** = the review, only in a crew that has
a reviewer; the approval = **3** with a reviewer, **2** without one.

## Step 5: The work (step 1)

Do the task as that agent, with the context the runner gives an agent ("Agent Loading" there): the
full agent definition, the crew memory block, the truthfulness block (`REGRAS DE VERACIDADE`), the
format file and the crew's skills — none with `side_effects: irreversible`.

Write the file where the script says, and check it:

```
node _opencrew/core/scripts/caminho.mjs "{name}" saida --run "{run_id}" --arquivo "crews/{name}/output/{arquivo}.md"
node _opencrew/core/scripts/caminho.mjs "{name}" conferir --arquivo "{path}" --passo 1
```

`{path}` is the path `saida` returned. `CAMINHO:REPROVADO` → write the file again, once; still
reproved → tell the user and offer to try again or cancel (Step 7, "cancela").

## Step 6: The automatic check and the review (step 2)

Run the checker on the file, with `{N}` = the cycle, from 1:

```
node _opencrew/core/scripts/verificar.mjs --crew "crews/{name}" --arquivo "{path}={formato}" --relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"
```

- **The crew has a reviewer** (an agent whose role is to review) and the output is text: the
  reviewer reads the file and the report, with the rules of "Review Loops" of the runner (items 1
  and 2: a block is a rejection, `VERIFICACAO:AGUARDANDO_USUARIO` is not). It writes its verdict to
  `crews/{name}/output/revisao/revisao.md` through `saida` and `conferir --passo 2` (verdicts in
  `revisao/v1`, `revisao/v2`…; the text keeps `v1`, `v2`… alone), and then:
  `node _opencrew/core/scripts/execucao.mjs "{name}" marcar --run "{run_id}" --passo 2 --evento revisao --resultado {aprovado or rejeitado} --nota "{nota}"`
  (`--nota` only on a rejection: its reason in a few words — never the score)
  Rejected → the agent of Step 5 rewrites (a new `saida`, `conferir --passo 1`), and the check and
  the review run again; at most `max_review_cycles` **rejections** (the crew's number; 3 when it
  declares none). Still rejected → show the reasons and let the user decide in Step 7.
- **No reviewer**: nobody reviews; the report goes to Step 7 as it is. `VERIFICACAO:BLOQUEADA` →
  the agent fixes the blocks and the checker runs again, twice at most.

## Step 7: Your approval (the only checkpoint)

Show the path of the file, the summary of the last report (`Verificação automática: {N} bloqueios,
{M} alertas, {Z} não medidos`, with `{P} a preencher` when it counts any, the alerts and the notes)
and the reviewer's verdict when there is one. If the text still has `[PREENCHER: …]`, ask for each
missing piece now; the user does not have it → keep it and say the `Sem problema: …` sentence of "Review Loops" item 5.
For each `Datas` alert in the report, ask which is right, the weekday or the date, and fix it as an adjustment. Then ask: "Aprova como está, quer um ajuste ou cancela?"

- **Um ajuste**, or data for a `[PREENCHER]` → read `_opencrew/core/runner/correcao-no-checkpoint.md`
  and follow it: the step that wrote the file is step 1 and its `outputFile` is the path of Step 5
  (`crews/{name}/output/{arquivo}.md`). The new version goes through **Step 6 again** before you show
  this approval again, with the new path and the new report (the next `verificacao-ciclo-{N}.md`):
  after an adjustment, the checker and the reviewer; after data for a `[PREENCHER]` only, the
  checker alone — the reviewer already judged that text.
- **Aprova** → record it, then Step 8:
  `node _opencrew/core/scripts/execucao.mjs "{name}" marcar --run "{run_id}" --passo {3 or 2} --evento checkpoint --resultado {resultado}`
  — `aprovado` when no adjustment was asked; `corrigido` when any was, adding `--nota "{nota}"`
  with the first adjustment (the score then counts this approval as corrected: `0/1`).
- **Cancela** → `node _opencrew/core/scripts/execucao.mjs "{name}" fechar --run "{run_id}" --resultado abortado`,
  say "Pedido cancelado. Nada foi entregue; os arquivos ficaram em {pasta do pedido}." and stop: no
  delivery, no memory, no reflection.

## Step 8: Deliver and close

1. Delivery: read `_opencrew/core/prompts/entrega.prompt.md` and follow it for this run, with the
   list made of the approved file (`{path}={formato}`, the newest version).
2. Memory: item **2a** of `_opencrew/core/runner/fim-da-execucao.md` (only the user's explicit
   feedback).
3. Close: `node _opencrew/core/scripts/execucao.mjs "{name}" fechar --run "{run_id}" --resultado aprovado --saida "{saída}"`
   — `{saída}`: what was produced, in a few words. The script writes the row of the history (the
   theme comes out as `Pedido: {tema}`). Then item **2c** of the same file (reflection), when the
   script printed corrections.
4. Say: "Pedido entregue: {pasta da entrega}. Ficou no histórico da crew {nome}."

## Resuming a request

You are here from `/opencrew retomar` (`_opencrew/core/runner/retomar.md`) with a `run_id` and a
step `{N}`. The script printed `Agente:` and `Formato:`: they are the agent and the format of this
pedido — use them, do not choose again; `(não registrado)` → ask the user which, before going on.
Do Step 2 above, do **not** run `pasta`, do not ask "Posso começar?" again (the yes to resume is enough),
and go on with that `run_id`: `{N}` = 1 → Step 5; `{N}` = 2 → Step 6 when the crew has a reviewer, else
Step 7; `{N}` = 3 or more → Step 7 (ask the approval again: the script cannot tell an answered approval from
one also delivered and closed). The file of step 1 is the path listed under `Passos conferidos`.

## Rules

- **DO** ask "Posso começar?" before opening, and the approval before delivering; write every file through `saida` and check it with `conferir --passo`.
- **DO NOT** change the crew (agents, steps, `crew.yaml`): that is `/opencrew edit`.
- **DO NOT** publish, post or send anything, and do not chain a second agent to produce a second
  piece: one pedido, one piece of work. For more, the user asks again or runs the pipeline.
