# IDEIAS — Melhorias Futuras para o OpenCrew

> Coletânea de ideias identificadas no uso real do OpenCrew.
> Data base: 2026-08-01 — v1.1.0
> Análise de viabilidade: 2026-08-02 — todas as ideias avaliadas
> **✅ 10 ideias implementadas: 2026-08-04 (88 testes, 0 regressões)**

### Histórico de Implementação

| # | Ideia | Onda | Evidência |
|---|-------|------|-----------|
| 1 | Sherlock multi-fonte | Onda 1 | `sherlock-web.md`, `sherlock-seo.md`, `sherlock-trends.md` + orquestração |
| 2 | Criação por papéis | Onda 2 | Phase D = Role Proposal, Phase E = Skill Mapping em `design.prompt.md` |
| 3 | Criação dinâmica de skills | Onda 7 | Operation 3a em `skills.engine.md` + Dynamic Skill Generation |
| 4 | Tiers de crew | Onda 4 | Phase B.5: Tier Selection, campo `tier` no design.yaml, `Default Tier` em preferences.md |
| 5.1 | Aprendizado contínuo | Onda 3 | Post-Run Reflection, Regras de Ouro, injeção de Crew Memory Rules |
| 5.2 | Templates de crew por setor | Onda 5 | 4 templates em `templates/crews/` |
| 5.3 | Exportação multi-formato | Onda 5 | `export.prompt.md` com PDF (Playwright), CSV, e formatted-post |
| 6 | Registro compartilhado de agentes | Onda 6 | 5 agentes base, `extends:` no design.yaml, Gate 0c no build |
| 7 | Instalação não-destrutiva | Onda 7 | `writeBridgeFile` em fsx.js, merge com marcadores |
| 8 | Seleção automática de agentes | Onda 8 | `runner.pipeline.md` (step 4b), `AGENTS.md` (step 7b), `build.prompt.md` (agent_dependencies) |

**Conclusão:** Backlog 100% implementado. 88 testes, zero regressões. ~6.600 linhas novas em 24 arquivos.

---

## Ideias Pendentes

*Nenhuma ideia pendente. Backlog 100% concluído em 2026-08-04.*

---

## Priorização Atual

*Nada a priorizar — todas as ideias registradas foram implementadas.*

---

## Histórico — Detalhes das Ideias Implementadas

<details>
<summary>Expandir para ver os detalhes originais das 10 ideias implementadas (2026-08-04)</summary>

### 1. Sherlock Multi-Fonte

**Problema:** Sherlock só pesquisava redes sociais. **Solução:** Orquestrador multi-fonte com sub-agentes para web, SEO, e trends. **Impacto:** 🔴 Alto / **Esforço:** 🟢 Baixo. **Evidência:** `sherlock-web.md`, `sherlock-seo.md`, `sherlock-trends.md` + orquestração em `sherlock-shared.md`.

### 2. Criação de Crew por Papéis (Não por Ferramentas)

**Problema:** Usuário não-técnico não entendia termos como "apify", "resend". **Solução:** Fluxo de criação mudou de "quais ferramentas?" para "quais papéis/pessoas?". **Impacto:** 🔴 Alto / **Esforço:** 🟡 Médio. **Evidência:** Phase D = Role Proposal, Phase E = Skill Mapping em `design.prompt.md`.

### 3. Criação Dinâmica de Skills

**Problema:** Catálogo fixo de 11 skills limitava necessidades específicas. **Solução:** Geração automática de `SKILL.md` sob demanda via pesquisa web + IA. **Impacto:** 🔴 Alto / **Esforço:** 🔴 Alto. **Evidência:** Operation 3a em `skills.engine.md` + Dynamic Skill Generation em `design.prompt.md`.

### 4. Tiers de Crew: Express / Standard / Full

**Problema:** Toda crew rodava com pipeline completo, sem escolha de profundidade. **Solução:** 3 tiers (Express ~5K tokens, Standard ~15K, Full ~40K) escolhidos na criação. **Impacto:** 🟡 Médio / **Esforço:** 🟡 Médio. **Evidência:** Phase B.5: Tier Selection, campo `tier` no design.yaml, `Default Tier` em preferences.md.

### 5.1 Aprendizado Contínuo das Crews (Memória entre runs)

**Problema:** Correções do usuário se perdiam entre execuções. **Solução:** Ciclo de feedback em 3 camadas: captura → análise pós-run → aplicação proativa com regras de ouro. **Impacto:** 🔴 Alto / **Esforço:** 🟡 Médio. **Evidência:** Post-Run Reflection, Regras de Ouro, injeção de Crew Memory Rules no prompt.

### 5.2 Templates de Crew por Setor

**Problema:** Criar crew do zero exigia descrever tudo. **Solução:** 4 templates pré-definidos: blog-semanal, instagram-carrossel, newsletter-mensal, lancamento-produto. **Impacto:** 🟡 Médio / **Esforço:** 🟢 Baixo. **Evidência:** 4 templates em `templates/crews/`.

### 5.3 Exportação Multi-Formato

**Problema:** Output era só markdown. **Solução:** Export para PDF (Playwright), CSV, e formatted-post. **Impacto:** 🟡 Médio / **Esforço:** 🟢 Baixo. **Evidência:** `export.prompt.md` com suporte a 3 formatos.

### 6. Registro Compartilhado de Agentes (Shared Agent Registry)

**Problema:** Cada crew duplicava agentes idênticos. **Solução:** Registro em `_opencrew/agents/` com herança (`extends:`) e parametrização no `crew.yaml`. **Impacto:** 🔴 Alto / **Esforço:** 🔴 Alto. **Evidência:** 5 agentes base, `extends:` no design.yaml, Gate 0c no build.

### 7. Instalação Não-Destrutiva (Estratégia de Merge)

**Problema:** `opencrew init` sobrescrevia `CLAUDE.md`, `AGENTS.md` e outros arquivos do usuário. **Solução:** Merge com blocos marcados `<!-- opencrew:start/end -->`, append condicional em `.gitignore` e `.env.example`. **Impacto:** 🔴 Alto / **Esforço:** 🟡 Médio. **Evidência:** `writeBridgeFile` em fsx.js, merge com marcadores.

</details>

---

*Este arquivo é vivo — alimentado pelo uso real do OpenCrew. Para cada ideia,
avalie: a dor é real e frequente? A solução proposta resolve a causa raiz?*

*✅ Backlog concluído: 2026-08-04 — 10 de 10 ideias implementadas (88 testes, 0 regressões).*
