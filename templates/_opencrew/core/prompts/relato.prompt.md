# Relato — a usage report to paste into an issue (feedback)

You are handling `/opencrew feedback`: the user wants to tell the maintainer how OpenCrew behaved, without
sending anything of their client. A script writes the report; you show it, add what the user says and tell
them where to paste it. You never send it yourself and never open a browser.

Speak to the user in their language (`_opencrew/_memory/preferences.md`); the script answers in fixed PT-BR.

## Step 1: Build the report

From the project root (the crew between double quotes, only when the user said which one; the IDE is the
one you are running in, a short name with letters, digits and hyphen: `claude-code`, `cursor`, `codex`…):

```
node _opencrew/core/scripts/relato.mjs --ide {ide}
```

The user did not say which crew: run it as above, with no `--crew` (the report then takes the newest run of the project). With a crew: `node _opencrew/core/scripts/relato.mjs --crew "{name}" --ide {ide}`. The last line is
`RELATO:OK`. The script did not run (no Node, an error) → show the message as it came and stop; write no
report by hand.

## Step 2: Show it and ask

Show the whole block. Then say: `Aqui está o relato. Confira que não tem nada do seu cliente e cole numa issue em https://github.com/alberthpalhares/opencrew/issues/new?template=relato-de-uso.md.`

Ask: `O que aconteceu? (uma ou duas frases, sem dados de cliente)`. Put the answer at the end of the block
under `### O que aconteceu`, in the user's own words — if it names a client, a person or a file of the
project, ask them to rewrite it without that before you show the final text.

## Rules

- **DO NOT** add to the block the theme of a run, the content of a file, a path, a crew or agent name.
- **DO NOT** send, post or open anything: the user reads and pastes.
