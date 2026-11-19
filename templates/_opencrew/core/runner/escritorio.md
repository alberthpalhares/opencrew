# Escritório por execução

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it when the Office is on.

The Escritório is on by default; only `Dashboard: off` disables it. Legacy `Dashboard: disabled` is on, so an update activates old projects without changing preferences. When on, run these commands from the project root:

| Moment | Command |
|---|---|
| Start of `run` or confirmed `retomar` | `node _opencrew/core/scripts/estado.mjs "{name}" iniciar --run "{run_id}" --passos {N}` |
| Start of `pedir`, after the user's confirmation | `node _opencrew/core/scripts/estado.mjs "{name}" iniciar --run "{run_id}" --pedido --agente {worker_id} --passos {N}` |
| Right after `iniciar`, once per deselected agent | `node _opencrew/core/scripts/estado.mjs "{name}" pular --run "{run_id}" --agente {id}` |
| Before each pipeline step or checkpoint | `node _opencrew/core/scripts/estado.mjs "{name}" {passo or checkpoint} --run "{run_id}" --n {K} --agente {id} --rotulo "{label}" --mensagem "{message}"` |
| Before work or review in a pedido | `node _opencrew/core/scripts/estado.mjs "{name}" passo --run "{run_id}" --pedido --n {K} --agente {worker_or_reviewer_id} --rotulo "{label}"` |
| End of the run | `node _opencrew/core/scripts/estado.mjs "{name}" concluir --run "{run_id}"` |
| Run aborted after `iniciar` | `node _opencrew/core/scripts/estado.mjs "{name}" falhar --run "{run_id}" --motivo "{reason}"` |

After the first `ESTADO:OK`, ensure the server and obtain the targeted URL. In a normal CLI or
host session that keeps a detached child alive, use `--automatico` directly:

```
node _opencrew/core/scripts/escritorio.mjs --automatico --crew "{name}" --run "{run_id}"
```

In Codex App and any sandbox that stops detached children, add `--preparar`. `ESCRITORIO:URL` is released only after `/` responds HTTP 200 and `/estado` confirms this project, installed version, crew and exact `run_id`.
If preparation returns `ESCRITORIO:DAEMON <port> <url>`, start `node _opencrew/core/scripts/escritorio.mjs --servidor --porta <port>` in a persistent authorized host session, then run `node _opencrew/core/scripts/escritorio.mjs --automatico --confirmar --porta <port> --crew "{name}" --run "{run_id}"`. Confirmation checks only that port. If daemon startup or confirmation reports `ESCRITORIO:PORTA_OCUPADA`, prepare and start once more on the newly selected port. Add `--externo` when opening the system browser.

Open only the confirmed `ESCRITORIO:URL` in the app's visible native Browser when available (Claude Code Desktop Browser pane, Codex App integrated Browser, or Antigravity browser agent), and check that the page loaded before saying it opened. In a CLI, or if the integrated Browser is absent or fails technically, use `--externo` if that browser can access the confirmed URL. When browser and server are on different machines, use only port forwarding provided and authorized by the harness, then verify the page. Show the URL as a clickable link in chat, along with the base address and any `ESCRITORIO:URL_REDE` and `ESCRITORIO:URL_VPN` links for phone or tablet. A refusal or policy block leaves the link manual and must not be bypassed. On `ESCRITORIO:INDISPONIVEL`, tell the user once and continue.

- **One event at a time:** wait for each `ESTADO:` line before the next. Per-run events write `crews/{name}/output/{run_id}/estado-escritorio.json`; this keeps simultaneous runs apart. Use the `run_id` from `CAMINHO:OK` or `EXECUCAO:RETOMAR`; never create one yourself.
- **Pedido agents:** pass `--pedido` on every pedido event and the selected worker or reviewer in `--agente`; never infer it from pipeline step numbers.
- **Values:** `{name}` is the crew code; `{N}` is the run's step count; `{K}` is the current step; `{id}`: the step's `agent:` value (the same text as the agent's `id` column in `crew-party.csv`) for `run`/`retomar`; a pedido uses the selected worker or reviewer id from that file. `{label}`, `{message}` and `{reason}` are one-line user-language text with letters (including accents), digits, spaces and `. , : ; - ( ) / ?`; drop quotes, `$`, backticks, `\`, `%`, `!` and emoji. `{message}` says what the previous agent delivered and is used only when the agent changed. Omit empty text options.
- The script is the only writer. Never read, write or describe the per-run file or legacy `crews/{name}/state.json` yourself.
- **The Escritório never stops the run.** Do not repeat a failed command or `ESTADO:IGNORADO`; tell the user once that the run's Office was not updated, then continue. If it says `escritório desligado`, make no more Office calls for that run.
