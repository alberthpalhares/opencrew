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

After the first `ESTADO:OK`, ensure the server and obtain the targeted URL:

```
node _opencrew/core/scripts/escritorio.mjs --automatico --crew "{name}" --run "{run_id}"
```

It returns `ESCRITORIO:URL` only after `/estado` confirms this project and installed version, and also emits `ESCRITORIO:URL_REDE` (same Wi-Fi/LAN) and `ESCRITORIO:URL_VPN` (Tailscale/VPN) when available for phone or tablet. In harnesses whose commands run in a sandbox or kill detached children on exit (such as Antigravity), pass `--preparar` outside the sandbox: on `ESCRITORIO:DAEMON <port> <url>`, start `node _opencrew/core/scripts/escritorio.mjs --servidor --porta <port>` outside the sandbox as a persistent background daemon before opening `<url>`. Open that URL in the app's native Browser when available (Claude Code Desktop Browser pane, Codex App built-in Browser, or Antigravity browser agent); in a CLI, or when the embedded Browser is unavailable, add `--externo` to open the system browser. Show the URL as a clickable link in chat (along with the base `http://127.0.0.1:<port>` address and any `ESCRITORIO:URL_REDE` and `ESCRITORIO:URL_VPN` links so the user can watch the team on a phone or tablet). If the embedded Browser fails technically, try `--externo`; if the user refuses, host policy blocks navigation, or no graphical browser is available, leave the link manual and continue. Never bypass a refusal or policy block. On `ESCRITORIO:INDISPONIVEL`, tell the user once and continue.

- **One event at a time:** wait for each `ESTADO:` line before the next. Per-run events write `crews/{name}/output/{run_id}/estado-escritorio.json`; this keeps simultaneous runs apart. Use the `run_id` from `CAMINHO:OK` or `EXECUCAO:RETOMAR`; never create one yourself.
- **Pedido agents:** pass `--pedido` on every pedido event and the selected worker or reviewer in `--agente`; never infer it from pipeline step numbers.
- **Values:** `{name}` is the crew code; `{N}` is the run's step count; `{K}` is the current step; `{id}`: the step's `agent:` value (the same text as the agent's `id` column in `crew-party.csv`) for `run`/`retomar`; a pedido uses the selected worker or reviewer id from that file. `{label}`, `{message}` and `{reason}` are one-line user-language text with letters (including accents), digits, spaces and `. , : ; - ( ) / ?`; drop quotes, `$`, backticks, `\`, `%`, `!` and emoji. `{message}` says what the previous agent delivered and is used only when the agent changed. Omit empty text options.
- The script is the only writer. Never read, write or describe the per-run file or legacy `crews/{name}/state.json` yourself.
- **The Escritório never stops the run.** Do not repeat a failed command or `ESTADO:IGNORADO`; tell the user once that the run's Office was not updated, then continue. If it says `escritório desligado`, make no more Office calls for that run.
