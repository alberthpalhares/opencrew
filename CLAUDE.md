# CLAUDE.md — OpenCrew (desenvolvimento)

> As regras vivem em AGENTS.md (fonte única, lida também pelas outras IDEs). Este arquivo
> só existe para o Claude Code carregar aquele conteúdo automaticamente.

@AGENTS.md

<!-- session-continuity:start -->
## Session continuity (STATUS.md)

This project keeps session continuity in `STATUS.md` at the project root
(gitignored — never committed).

**At the start of every session:**
1. Read `STATUS.md` first. If it is missing, create it with the template below.
2. Report a 3-line summary: (a) what was in progress, (b) the concrete next step,
   (c) blockers/decisions awaiting approval.

**During the session:**
- Move items from `⬜ Pendente` to `🔄 Em andamento` when you start work.
- Move finished items to `✅ Concluído (esta sessão)`.
- Add new items as they emerge.

**Before ending the session (non-negotiable):**
- Update `STATUS.md` to reflect reality, even if interrupted or incomplete.
- Refresh `COMECE AQUI`, move items, add a row to `Histórico de atualizações`.
- If `STATUS.md` and real code diverge, the code wins: fix `STATUS.md` immediately.

**Template (only if STATUS.md is missing):**
```markdown
# STATUS.md — Onde paramos

> **Regra de uso:** leia este arquivo no início de TODA sessão, antes de qualquer outra
> coisa. Atualize-o no fim de TODA sessão, mesmo que o trabalho tenha ficado incompleto.
> Se este arquivo e o código real divergirem, o código manda — corrija aqui na hora.

---

## COMECE AQUI — próxima sessão

- **Foco atual:**
- **Próximo passo concreto:**
- **Bloqueio:**
- **Decisão aguardando aprovação:**

## 🔄 Em andamento

## ⬜ Pendente

## ✅ Concluído (esta sessão)

## 📋 Backlog

## 💡 Decisões

## Histórico de atualizações

| Data | Sessão | O que mudou |
|---|---|---|
| {data-atual} | {ferramenta} | instalação da continuidade de sessão |
```
<!-- session-continuity:end -->
