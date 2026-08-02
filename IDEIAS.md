# IDEIAS — Melhorias Futuras para o OpenCrew

> Coletânea de ideias identificadas no uso real do OpenCrew.
> Data base: 2026-08-01 — v1.1.0

---

## 1. Sherlock Multi-Fonte

**Problema:** O Sherlock atual só consegue pesquisar redes sociais (Instagram, LinkedIn,
Twitter, YouTube). Isso funciona para crews de conteúdo social, mas é insuficiente para
crews que precisam de pesquisa em sites, blogs, fóruns, Google Trends, ChatGPT, ou outras
fontes online.

**Proposta:**
- Expandir o Sherlock de um agente monolítico para um **orquestrador de pesquisa**:
  - `sherlock-social` (existente): Instagram, LinkedIn, Twitter, YouTube
  - `sherlock-web`: sites públicos, blogs, portais de notícias (via `web_search` + `web_fetch`)
  - `sherlock-seo`: Google Trends, Keyword Planner, Search Console
  - `sherlock-trends`: ChatGPT/Claude trending topics, GitHub trending, Product Hunt
- O Sherlock principal decide quais fontes acionar com base no briefing da crew
- Cada sub-fonte contribui achados estruturados que o Sherlock consolida

**Arquivos afetados:**
- `templates/_opencrew/core/prompts/sherlock-*.md` — expandir ou criar novos
- `templates/_opencrew/core/runner.pipeline.md` — orquestração multi-fonte
- `templates/skills/` — possível nova skill `sherlock-web`

**Horizonte:** Curto prazo (1-2 semanas)

---

## 2. Criação de Crew por Papéis (Não por Ferramentas)

**Problema:** Durante a criação de uma crew, o OpenCrew pede para o usuário validar
ferramentas técnicas como "apify", "resend" ou "image-creator". Um usuário comum
(gestor, analista, empreendedor) não sabe o que essas ferramentas fazem nem qual
escolher. Isso é uma barreira de entrada e gera frustração.

**Proposta:** O fluxo de criação deve mudar de **"quais ferramentas você quer?"**
para **"quais papéis sua equipe precisa?"**

### Novo fluxo de onboarding da crew:

1. O usuário descreve o objetivo em linguagem natural (já funciona)
2. O Architect sugere **pessoas e funções**, não ferramentas:
   ```
   Para criar conteúdo de blog com divulgação no Instagram e LinkedIn, sugiro:

   🔎 Pesquisador — encontra tendências do que é buscado no Google e no ChatGPT,
      mapeia palavras-chave e faz toda a parte de pesquisa de mercado
   ✍️ Redator / Copywriter — escreve os textos de maneira estratégica com base
      na pesquisa, incluindo legendas e chamadas para redes sociais
   💼 Consultor B2B — valida se o conteúdo está alinhado com o público-alvo
      corporativo (tom, abordagem, vocabulário)
   📢 Publicitário — sugere conceitos visuais e tipos de imagem que funcionam
      para cada formato (carrossel, banner, story)
   🎨 Designer Sênior — cria posts em carrossel para Instagram e LinkedIn
      alinhados com a identidade visual da marca
   ```
3. Cada papel é uma sugestão editável — o usuário pode remover, adicionar ou modificar
4. O usuário vê **quem** vai trabalhar, não **como** (ferramentas são detalhe interno)
5. Só depois da aprovação dos papéis o Architect resolve as skills necessárias automaticamente

**Arquivos afetados:**
- `templates/AGENTS.md` — fluxo do Architect na seção "Command Routing"
- `templates/_opencrew/core/prompts/design.prompt.md` — lógica de sugestão de papéis
- `templates/_opencrew/core/architect.agent.yaml` — reestruturar

**Horizonte:** Médio prazo (2-4 semanas) — é a mudança mais importante de UX

---

## 3. Criação Dinâmica de Skills

**Problema:** O catálogo de skills é fixo (11 skills pré-definidas). Se um usuário
precisa de uma função que não existe — ex: "especialista em regulamentação ANVISA"
ou "analista de dados financeiros com Bloomberg Terminal" — o OpenCrew não consegue
criar a skill sob demanda. O usuário fica limitado ao que existe no catálogo.

**Proposta:** O OpenCrew deve ser capaz de **criar skills personalizadas durante a
montagem da crew**, pesquisando e gerando o `SKILL.md` necessário.

### Novo fluxo:

1. Durante a criação da crew, se o Architect identifica um papel que não tem skill
   correspondente no catálogo, ele:
   a. **Pesquisa na internet** sobre a função/ferramenta (via `web_search`)
   b. **Gera um SKILL.md** seguindo o contrato do `skills.engine.md`
   c. **Instala automaticamente** a skill gerada no projeto
2. Skills geradas são salvas em `skills/.custom/<nome>/SKILL.md` — separadas do
   catálogo para não serem sobrescritas no `update`
3. O usuário pode revisar a skill gerada antes da crew rodar
4. O `skills.engine.md` já prevê Operation 3 (Create a Custom Skill) — é questão
   de expandir para suportar geração automática via IA

### Exemplo:
```
Usuário: "Preciso de um analista que cruze dados da ANVISA com o PubMed"

Architect:
1. Detecta que não há skill para ANVISA/PubMed no catálogo
2. Pesquisa: "ANVISA data access API", "PubMed API query", "regulatory data analysis"
3. Gera skill "regulatory-researcher" com:
   - type: hybrid
   - Inclui web_search para ANVISA e PubMed
   - Inclui script Python para cruzar datasets
4. Instala a skill e monta a crew com o novo papel
```

**Arquivos afetados:**
- `templates/_opencrew/core/skills.engine.md` — Operation 3 expandida
- `templates/_opencrew/core/architect.agent.yaml` — novo passo de descoberta
- `templates/_opencrew/core/prompts/design.prompt.md` — geração de skills
- `src/commands/update.js` — garantir que `skills/.custom/` não seja tocado

**Horizonte:** Longo prazo (4-8 semanas) — funcionalidade complexa, requer iteração

---

## 4. Tiers de Crew: Básico vs Completo

**Problema:** O OpenSquad original permitia escolher entre um squad mais enxuto
(rápido, menos tokens) ou mais completo (mais agentes, mais etapas, mais tokens).
Essa opção desapareceu no OpenCrew — toda crew é criada com o pipeline completo,
sem escolha de profundidade.

**Proposta:** Reintroduzir tiers de execução como escolha no momento da criação:

### Tiers propostos:

| Nível | Nome | Agentes | Etapas | Tokens | Ideal para |
|-------|------|---------|--------|--------|------------|
| ⚡ | **Express** | 2-3 | Pipeline reduzido, sem revisão | ~5K | Testes rápidos, conteúdo simples, validação de ideia |
| 🎯 | **Standard** (padrão) | 3-5 | Pipeline completo com 1 checkpoint | ~15K | Uso diário, produção de conteúdo, crews bem definidas |
| 🔬 | **Full** | 5-7 | Pipeline completo + Sherlock + 2 checkpoints + validação cruzada | ~40K+ | Projetos complexos, clientes, conteúdo de alta qualidade |

### Como funciona:
1. No `/opencrew create`, após descrever o objetivo, o usuário escolhe o tier
2. O Architect ajusta automaticamente:
   - Número de agentes na crew
   - Quantidade de checkpoints
   - Se inclui Sherlock (pesquisa de referências) ou não
   - Se inclui rodada de revisão cruzada entre agentes
   - Model tier por etapa (`fast` vs `powerful`)
3. O tier é salvo no `crew.yaml` e pode ser alterado depois
4. O Pipeline Runner respeita o tier na execução

**Arquivos afetados:**
- `templates/AGENTS.md` — novo passo no fluxo de criação
- `templates/_opencrew/core/prompts/design.prompt.md` — lógica de tiers
- `templates/_opencrew/core/architect.agent.yaml` — decisão de agentes por tier
- `templates/_opencrew/core/runner.pipeline.md` — execução condicional por tier
- `templates/_opencrew/_memory/preferences.md` — tier padrão configurável

**Horizonte:** Médio prazo (2-4 semanas) — alto impacto, complexidade moderada

---

## 5. Outras Ideias (Backlog)

### 5.1 Memória entre runs
- Hoje cada run é independente. O crew deveria aprender com execuções anteriores,
  refinando automaticamente seus agentes e prompts com base no feedback do usuário.
- `memories.md` já existe — expandir para capturar padrões e preferências.

### 5.2 Templates de crew por setor
- Templates pré-definidos para casos comuns: "Blog semanal", "Lançamento de produto",
  "Gestão de Instagram", "Newsletter mensal", "Relatório de vendas".
- O usuário escolhe o template e ajusta — em vez de descrever do zero.

### 5.3 Modo colaborativo
- Suporte para múltiplos usuários humanos revisando e aprovando checkpoints.
- Cada checkpoint pode ser enviado para um revisor específico (ex: "aprovação do
  diretor de marketing").

### 5.4 Dashboard web com histórico
- Evoluir o dashboard de single-file para uma interface que mostre:
  - Histórico de todas as runs passadas
  - Comparação entre runs (métricas, tokens, qualidade)
  - Fila de crews agendadas

### 5.5 Integração com calendários
- Agendar execuções de crews (ex: "todo domingo às 9h gerar os posts da semana").
- Integrar com Google Calendar ou Notion para planejamento de conteúdo.

### 5.6 Exportação multi-formato
- Hoje o output é markdown. Adicionar exportação direta para:
  - PDF (via Playwright/puppeteer)
  - CSV/Excel (dados estruturados)
  - Post pronto para Instagram/LinkedIn (formatação nativa)

---

## Priorização Sugerida

| # | Ideia | Impacto | Esforço | Horizonte |
|---|-------|---------|---------|-----------|
| 1 | Sherlock multi-fonte (item 1) | 🔴 Alto | 🟢 Baixo | Curto |
| 2 | Criação por papéis, não ferramentas (item 2) | 🔴 Alto | 🟡 Médio | Médio |
| 3 | Tiers de crew (item 4) | 🟡 Médio | 🟡 Médio | Médio |
| 4 | Criação dinâmica de skills (item 3) | 🔴 Alto | 🔴 Alto | Longo |
| 5 | Templates por setor (5.2) | 🟡 Médio | 🟢 Baixo | Curto |
| 6 | Memória entre runs (5.1) | 🟢 Baixo | 🟡 Médio | Longo |
| 7 | Modo colaborativo (5.3) | 🟢 Baixo | 🔴 Alto | Longo |

---

*Este arquivo é vivo — alimentado pelo uso real do OpenCrew. Para cada ideia,
avalie: a dor é real e frequente? A solução proposta resolve a causa raiz?*
