# IDEIAS — o que espera a hora certa

> Ideia só entra com triagem (4 campos): **O que plano/specs já dizem** · **Alocação**
> (`→ Fase N` ou `→ sem fase`, com motivo) · **Custo de adiar** · **Aprovação** (só se
> mudar o escopo de uma fase). Ideia implementada ou descartada **sai** daqui — o histórico
> fica no `CHANGELOG.md`. Ordem de execução: trilhas U em `docs/auditoria/2026-10-02-auditoria-geral.md`
> §3 (emenda) e `docs/jornada/2026-10-02-uso-real.md`.
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
- **Alocação:** → U3 — decisão de produto junto da entrega; até lá a doc diz que ele não é instalado.
- **Custo de adiar:** baixo; o runtime continua citando um arquivo que o usuário não tem.
- **Aprovação:** sim — escolher entre publicar (com correção de XSS e caminho do
  `state.json`) ou remover.

## `/opencrew retomar` — retomar um run interrompido
- **O que já existe:** o estado do run vive só na memória do modelo (T-A11).
- **Alocação:** → U4 — depende de `run-state.json` e do formato canônico de
  `pipeline.yaml` (T-A10).
- **Custo de adiar:** run longo que estoura o contexto é perdido inteiro.
- **Aprovação:** não.

## Orçamento de custo por run
- **O que já existe:** nada; skills pagas (OpenRouter, Apify, Resend) sem teto (T-A12).
- **Alocação:** → U5 — `Budget:` em `preferences.md`, confirmação antes de lote pago,
  teto de `--batch` no `generate.py`.
- **Custo de adiar:** gasto inesperado do usuário; retries multiplicam o custo.
- **Aprovação:** não.

## `/opencrew cleanup` + retenção
- **O que já existe:** `runs.md`, `output/{run_id}/vN/`, `_investigations/` (com `.wav`)
  crescem sem poda.
- **Alocação:** → U5.
- **Custo de adiar:** disco e leitura de contexto crescem com o uso.
- **Aprovação:** não.

## Dividir o `runner.pipeline.md`
- **O que já existe:** 829 linhas (~11k tokens) lidas em todo run; overhead fixo de
  25–35k tokens contra os "~5K" anunciados no tier Express.
- **Alocação:** → U5 — núcleo de ~250 linhas + arquivos carregados sob demanda
  (dashboard, seleção de agentes, reflexão); carregar os agentes uma vez só (T-M11).
- **Custo de adiar:** cada run paga o custo; a divisão fica mais cara à medida que a
  U1–U4 acrescentam regras ao runner.
- **Aprovação:** não.

## Crew que lê as fontes do próprio projeto (`fontes:` no `crew.yaml`)
- **O que já existe:** a crew só lê `company.md` e arquivos internos dela. No uso real, uma
  decisão já registrada no projeto foi ignorada e um dado de arquivo do projeto foi dado como
  "não encontrado" (`docs/jornada/2026-10-02-uso-real.md`, dor 3).
- **Alocação:** → U2 — junto com caminhos relativos conferidos no início do run e memória
  gravada no checkpoint.
- **Custo de adiar:** o usuário repete as mesmas correções a cada run.
- **Aprovação:** não.

## Documentos oficiais em DOCX/PDF + entrega dentro das pastas do projeto
- **O que já existe:** export PDF não executável (T-M21); no uso real o usuário escreveu um
  script Python + automação do Word à parte e copiou os resultados à mão (dor 6).
- **Alocação:** → U3.
- **Custo de adiar:** o resultado não vira uso direto; gambiarras por projeto.
- **Aprovação:** sim — escolher o motor de DOCX/PDF (sem dependência nativa).

## Modo equipe: `/opencrew pedir <crew> "<tarefa>"`
- **O que já existe:** só o pipeline completo. No uso real a crew virou equipe permanente com
  tarefas avulsas fora do pipeline, uma delas fora do histórico (dor 7).
- **Alocação:** → U4 — com `runs.md` confiável para tarefas avulsas.
- **Custo de adiar:** histórico e memória perdem o que acontece fora do pipeline.
- **Aprovação:** não.

## Convivência com outros sistemas de agentes no mesmo projeto
- **O que já existe:** a ponte manda "adotar o papel do opencrew" no `AGENTS.md`, que no uso
  real já tinha outro papel de sistema; restos de instalação antiga (dor 8).
- **Alocação:** → U2 (U6) — a ponte só ativa com `/opencrew`; `update` limpa restos.
- **Custo de adiar:** a IA do usuário recebe dois papéis concorrentes em toda sessão.
- **Aprovação:** não.

## `/opencrew feedback` — relato de uso para issue
- **O que já existe:** nenhum canal; usuários do npm não deixam rastro (U0).
- **Alocação:** → U5 — monta um texto (versão, etapa, onde travou, sem conteúdo do cliente)
  que o próprio usuário cola numa issue; + issue template "Relato de uso".
- **Custo de adiar:** decisões de produto sem evidência de quem usa.
- **Aprovação:** não.