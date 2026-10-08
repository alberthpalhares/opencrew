# Source check that did not end in FONTES:OK

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only when the source check of the Initialization (1c) ended in `FONTES:PENDENTE` or did not run.

If the last line is `FONTES:PENDENTE` (a cited file was moved, renamed or deleted), show the
report and ask — never continue silently with a missing source:
```
Alguns arquivos que a crew usa não estão mais onde ela espera:
{resumo do relatório}

1. Corrigir os caminhos sugeridos (troco nos arquivos da crew e guardo .bak)
2. Seguir assim mesmo
3. Parar
```
On 1, run the same command with `--corrigir`, show the new result and re-read `crew.yaml` and
any agent file already loaded (it may have changed them); 1d then loads the sources from the
corrected paths. If the new result still ends in `FONTES:PENDENTE`, ask again with options 2 and
3 only. Alerts — not portable (absolute paths) or "não conferido" (a network path or a site
address: the script never accesses the network) — are mentioned once, without stopping. If the
script did not run (no Node, an error, or no `FONTES:` status line), tell the user "⚠️ A
conferência de fontes não rodou: {motivo}" and continue; the final approval repeats the warning.
