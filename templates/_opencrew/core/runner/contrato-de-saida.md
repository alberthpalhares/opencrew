# Output Contract Validation

> Part of the Pipeline Runner (`_opencrew/core/runner.pipeline.md`). Read it only when the step's frontmatter declares an `output_contract:` field.

If the step's frontmatter declares an `output_contract:` field, apply structured validation
in the same call as the basic file existence check (Post-Step Output Validation):

1. **Required sections check**: If `output_contract.required_sections` is defined, add
   `--secoes {min_sections}` to the same `conferir` command: the file needs at least that many
   lines starting with `## `.

2. **TL;DR check**: If the output contract requires a TL;DR section, add `--tldr` to the same
   `conferir` command.

3. **If a check fails** (the last line is `CAMINHO:REPROVADO {motivo}`, with a motivo other than
   `arquivo ausente ou vazio`; the script reports the first one):
   - Present to user: "⚠️ A saída de {Agent Name} está incompleta: {motivo}"
   - Options as numbered list:
     1. Aceitar assim mesmo e seguir
     2. Refazer o passo (executar o agente de novo)
     3. Abortar a execução

4. **If no `output_contract` is defined**, skip this validation entirely (backward compatible).

Example `output_contract` in step frontmatter:
```yaml
output_contract:
  required_sections:
    - "Fontes Pesquisadas"
    - "Principais Descobertas"
    - "TL;DR"
  min_sections: 3
```
