# IDEIAS — o que espera a hora certa

> Ideia só entra com triagem (4 campos): **O que plano/specs já dizem** · **Alocação**
> (`→ Fase N` ou `→ sem fase`, com motivo) · **Custo de adiar** · **Aprovação** (só se
> mudar o escopo de uma fase). Ideia implementada ou descartada **sai** daqui — o histórico
> fica no `CHANGELOG.md`. Fases: ver `docs/auditoria/2026-10-02-auditoria-geral.md` §3.
>
> As 10 ideias do backlog original (Sherlock multi-fonte, criação por papéis, skills
> dinâmicas, tiers, aprendizado contínuo, templates de crew, exportação, registro de
> agentes, instalação não-destrutiva, seleção de agentes) saíram: estão no CHANGELOG
> (v1.3.0–v1.4.0). A #7 (instalação não-destrutiva) foi concluída na v1.4.2 (bloco marcado
> no `.gitignore` e no `.env.example`).

---

## Dashboard: publicar ou remover
- **O que já existe:** `dashboard/index.html` no repo, fora do pacote npm; o runtime o cita
  (`runner.pipeline.md:20`, `templates/AGENTS.md`). Achados D-01 e D-06 (XSS, modo live
  quebrado).
- **Alocação:** → Fase 4 — decisão de produto; até lá a doc diz que ele não é instalado.
- **Custo de adiar:** baixo; o runtime continua citando um arquivo que o usuário não tem.
- **Aprovação:** sim — escolher entre publicar (com correção de XSS e caminho do
  `state.json`) ou remover.

## `/opencrew resume` — retomar um run interrompido
- **O que já existe:** o estado do run vive só na memória do modelo (T-A11).
- **Alocação:** → Fase 3 — depende de `run-state.json` e do formato canônico de
  `pipeline.yaml` (T-A10).
- **Custo de adiar:** run longo que estoura o contexto é perdido inteiro.
- **Aprovação:** não.

## Orçamento de custo por run
- **O que já existe:** nada; skills pagas (OpenRouter, Apify, Resend) sem teto (T-A12).
- **Alocação:** → Fase 3 — `Budget:` em `preferences.md`, confirmação antes de lote pago,
  teto de `--batch` no `generate.py`.
- **Custo de adiar:** gasto inesperado do usuário; retries multiplicam o custo.
- **Aprovação:** não.

## `/opencrew cleanup` + retenção
- **O que já existe:** `runs.md`, `output/{run_id}/vN/`, `_investigations/` (com `.wav`)
  crescem sem poda.
- **Alocação:** → Fase 4.
- **Custo de adiar:** disco e leitura de contexto crescem com o uso.
- **Aprovação:** não.

## Dividir o `runner.pipeline.md`
- **O que já existe:** 829 linhas (~11k tokens) lidas em todo run; overhead fixo de
  25–35k tokens contra os "~5K" anunciados no tier Express.
- **Alocação:** → Fase 4 — núcleo de ~250 linhas + arquivos carregados sob demanda
  (dashboard, seleção de agentes, reflexão); carregar os agentes uma vez só (T-M11).
- **Custo de adiar:** cada run paga o custo; a divisão fica mais cara à medida que a
  Fase 3 acrescenta regras ao runner.
- **Aprovação:** não.
