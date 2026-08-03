# IDEIAS — Melhorias Futuras para o OpenCrew

> Coletânea de ideias identificadas no uso real do OpenCrew.
> Data base: 2026-08-01 — v1.1.0
> Análise de viabilidade: 2026-08-02 — todas as ideias avaliadas
> **Auditoria de implementação: 2026-08-03 — v1.2.2 — nenhuma ideia implementada**
> **✅ Implementação completa: 2026-08-03 — todas as 8 ideias implementadas (85 testes, 0 regressões)**

### Resultado da Auditoria Final (2026-08-03)

| # | Ideia | Status | Onda | Evidência |
|---|-------|:---:|------|-----------|
| 1 | Sherlock multi-fonte | ✅ | Onda 1 | `sherlock-web.md`, `sherlock-seo.md`, `sherlock-trends.md` + orquestração em `sherlock-shared.md` |
| 2 | Criação por papéis | ✅ | Onda 2 | Phase D = Role Proposal, Phase E = Skill Mapping em `design.prompt.md` |
| 3 | Criação dinâmica de skills | ✅ | Onda 7 | Operation 3a em `skills.engine.md` + Dynamic Skill Generation em `design.prompt.md` |
| 4 | Tiers de crew | ✅ | Onda 4 | Phase B.5: Tier Selection, campo `tier` no design.yaml, `Default Tier` em preferences.md |
| 5.1 | Aprendizado contínuo | ✅ | Onda 3 | Post-Run Reflection, Regras de Ouro, injeção de Crew Memory Rules no prompt |
| 5.2 | Templates de crew por setor | ✅ | Onda 5 | 4 templates em `templates/crews/`: blog-semanal, instagram-carrossel, newsletter-mensal, lancamento-produto |
| 5.3 | Exportação multi-formato | ✅ | Onda 5 | `export.prompt.md` com PDF (Playwright), CSV, e formatted-post |
| 6 | Registro compartilhado de agentes | ✅ | Onda 6 | 5 agentes base em `_opencrew/agents/`, `extends:` no design.yaml, Gate 0c no build |
| 7 | Instalação não-destrutiva | ✅ | Onda 7 (prévia) | `writeBridgeFile` em fsx.js, merge com marcadores, sidecar AGENTS.md removido |

**Conclusão:** Backlog 100% implementado. 85 testes, zero regressões. ~6.000 linhas novas em 22 arquivos.

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

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — não existe orquestração multi-fonte; Sherlock é monolítico
- Diretrizes:
  - ⚠️ Atenção para YAGNI: 3-4 sub-agentes especializados, mas cada um tem responsabilidade distinta (social, web, SEO, trends) → alinhado com "um agente = uma responsabilidade"
  - ✅ Simplicidade: complexidade interna (orquestrador decide fontes), interface simples para o usuário
  - ⚠️ Tokens: múltiplos subagentes em paralelo consomem mais, mas ganho de qualidade justifica. Estimar ~2-3K tokens extras por fonte adicional
- Impacto: 🔴 Alto / Esforço: 🟢 Baixo
- Dependências: Nenhuma
- Riscos: Pesquisa redundante entre fontes (mesmo conteúdo encontrado por social + web). Mitigação: passo de deduplicação no consolidado

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

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — fluxo atual é baseado em ferramentas/ skills, não em papéis
- Diretrizes:
  - ✅ Simplicidade: muda de "quais ferramentas?" para "quais pessoas?" — drasticamente mais intuitivo para não-técnicos
  - ✅ Não adiciona agentes nem passos de pipeline — é uma mudança de apresentação no fluxo de onboarding
  - ✅ Alinhado com "simplest pipeline that achieves the goal" — esconde complexidade técnica
- Impacto: 🔴 Alto / Esforço: 🟡 Médio
- Dependências: Nenhuma. Sinergia futura com item 6 (registro compartilhado — papéis mapeiam para agentes base)
- Riscos: Baixo — é mudança de UX, não de arquitetura. Se o mapeamento papel→skill falhar, o usuário pode receber uma crew com skills erradas. Mitigação: preview antes de confirmar

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

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — skills.engine.md tem Operation 3 (Create Custom Skill) mas é manual, não automática
- Diretrizes:
  - ⚠️ YAGNI: skills geradas automaticamente podem ter qualidade inferior a skills curadas. A geração deve incluir validação obrigatória
  - ⚠️ Tokens: geração consome ~3-5K tokens na criação, mas o skill gerado pode economizar em execuções futuras
  - ✅ Flexibilidade: expande o sistema sem poluir o catálogo oficial — skills custom ficam em `skills/.custom/`
- Impacto: 🔴 Alto / Esforço: 🔴 Alto
- Dependências: Sinergia com item 2 (papéis não previstos geram skills automaticamente)
- Riscos: Skills geradas podem ser imprecisas ou quebrar em execução. Mitigação: validação em sandbox antes de instalar; flag `experimental: true` no frontmatter

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

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — não existe escolha de profundidade na criação ou execução
- Diretrizes:
  - ✅ Simplicidade: oferece escolha clara (Express/Standard/Full) em vez de decisões técnicas sobre quais agentes incluir
  - ✅ Token efficiency: tiers mais baixos economizam tokens para tarefas simples (~5K vs ~40K)
  - ✅ Não adiciona agentes — modula a profundidade dos existentes
- Impacto: 🟡 Médio / Esforço: 🟡 Médio
- Dependências: Nenhuma
- Riscos: Calibragem dos tiers — Express pode ser insuficiente e frustrar; Full pode ser caro demais. Mitigação: começar só com Standard + Express, adicionar Full depois com dados de uso

---

## 5. Outras Ideias (Backlog)

### 5.1 Aprendizado contínuo das Crews (Memória entre runs)

**Problema:** Hoje cada run de uma crew é independente. Se um agente comete um erro
(tom de voz errado, formato que o usuário não gostou, dado incorreto) e o usuário
corrige no checkpoint, essa correção se perde na próxima execução. A crew repete os
mesmos erros, obrigando o usuário a corrigir manualmente as mesmas coisas toda vez.

Isso é um dos maiores gargalos de usabilidade: **a crew não aprende com o feedback.**

**Proposta:** Implementar um ciclo de aprendizado em 3 camadas:

#### Camada 1 — Captura de feedback (já existe parcialmente)

- Após cada checkpoint, o usuário pode aprovar, rejeitar ou corrigir
- O feedback textual do usuário já é registrado no log da run
- **O que falta:** estruturar esse feedback em um formato que o sistema consiga aplicar

#### Camada 2 — Análise pós-run (nova)

Ao final de cada pipeline, o Pipeline Runner deve executar um passo de **Reflexão**:

1. Comparar o output de cada agente com as correções feitas pelo usuário
2. Identificar padrões de erro:
   - "O redator sempre usa tom muito informal para o público B2B"
   - "O designer usa cores que não combinam com a identidade visual"
   - "O pesquisador cita fontes desatualizadas"
3. Registrar esses padrões em `memories.md` como **regras de correção**:
   ```markdown
   ## Padrões de Correção (atualizado automaticamente)

   ### Tom de Voz
   - ❌ Muito informal — usar linguagem corporativa (feedback run #3, #5)
   - ❌ Gírias regionais — evitar (feedback run #2)

   ### Design
   - ❌ Cores muito saturadas — respeitar paleta da marca (feedback run #1, #4)

   ### Fontes
   - ❌ Citações sem data — sempre incluir ano da fonte (feedback run #3)
   ```
4. Se o mesmo erro ocorre **3 vezes ou mais**, promover de "observação" para
   **"regra de ouro"** — injetada diretamente no prompt do agente

#### Camada 3 — Aplicação proativa (nova)

Antes de cada execução, cada agente carrega:
1. Seu `.agent.md` original (definição base)
2. As **regras de correção** acumuladas em `memories.md`
3. As **proibições explícitas** (seção já existe em `memories.md`)

O prompt final do agente é composto como:
```
[Definição base do agente]
---
[Regras de correção acumuladas — NUNCA faça X, SEMPRE verifique Y]
---
[Proibições explícitas do usuário]
---
[Tarefa atual]
```

#### Métricas de melhoria

- **Taxa de rejeição por agente:** % de outputs rejeitados pelo usuário
- **Recorrência de correção:** quantas runs até um erro parar de aparecer
- **Economia de tokens:** o usuário gasta menos tokens corrigindo porque a crew já
  internalizou as preferências

**Arquivos afetados:**
- `templates/_opencrew/core/runner.pipeline.md` — passo de Reflexão pós-run
- `templates/_opencrew/_memory/memories.md` — template expandido com padrões de correção
- Cada `.agent.md` — prompt template com slot para regras acumuladas
- `crews/{name}/crew.yaml` — metadados de aprendizado (taxa de rejeição, etc.)

**Horizonte:** Médio prazo (3-5 semanas) — é um ciclo completo de feedback,
não só um feature flag.

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — `memories.md` existe mas é estático; não há ciclo de feedback automático
- Diretrizes:
  - ✅ Simplicidade: o usuário corrige menos a cada run — a crew aprende sozinha
  - ⚠️ Tokens: adiciona passo de Reflexão pós-run (~500-1000 tokens/run), mas ROI é positivo após 3+ runs com as mesmas correções
  - ✅ Não adiciona agentes permanentes — é um passo de pipeline ao final da execução
- Impacto: 🔴 Alto / Esforço: 🟡 Médio
- Dependências: Nenhuma. Sinergia com item 6 (agentes compartilhados — aprendizado cross-crew)
- Riscos: Overfitting — regras automáticas podem aprender padrões errados se o usuário corrigir por motivos diferentes. Mitigação: threshold de 3 ocorrências + sempre permitir override manual nas proibições explícitas

### 5.2 Templates de crew por setor
- Templates pré-definidos para casos comuns: "Blog semanal", "Lançamento de produto",
  "Gestão de Instagram", "Newsletter mensal", "Relatório de vendas".
- O usuário escolhe o template e ajusta — em vez de descrever do zero.

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — não existe sistema de templates pré-definidos
- Diretrizes:
  - ✅ Simplicidade: reduz atrito de criação — "quero um blog semanal" vs descrever tudo do zero
  - ✅ Templates são conteúdo, não código — não adicionam complexidade ao core
- Impacto: 🟡 Médio / Esforço: 🟢 Baixo
- Dependências: Sinergia com item 2 (criação por papéis — templates definem os papéis padrão)
- Riscos: Templates desatualizados conforme o sistema evolui. Mitigação: versionar templates junto com o core; teste de integração no CI

### 5.3 Exportação multi-formato
- Hoje o output é markdown. Adicionar exportação direta para:
  - PDF (via Playwright/puppeteer)
  - CSV/Excel (dados estruturados)
  - Post pronto para Instagram/LinkedIn (formatação nativa)

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — output é exclusivamente markdown
- Diretrizes:
  - ✅ Não adiciona agentes nem complexidade ao pipeline — é pós-processamento
  - ✅ Playwright já está disponível no projeto (image-creator skill)
- Impacto: 🟡 Médio / Esforço: 🟢 Baixo
- Dependências: Playwright (já instalado). CSV não tem dependência extra
- Riscos: Formatação PDF pode ser frágil entre temas/plataformas. Mitigação: usar o mesmo Playwright que já renderiza imagens — caminho testado

---

## 6. Registro Compartilhado de Agentes (Shared Agent Registry)

**Problema:** Hoje cada crew define seus agentes isoladamente em
`crews/{code}/agents/{agent-id}.agent.md`. Se duas crews diferentes precisam de
um pesquisador, redator ou revisor com funções iguais ou muito parecidas, o sistema
duplica a definição inteira em cada crew. Isso causa:

- **Duplicação de arquivos:** o mesmo agente (ex: pesquisador que busca notícias)
  existe em 3 crews diferentes com definições 99% iguais
- **Desperdício de tokens:** cada geração de crew recria agentes do zero; cada
  execução carrega definições duplicadas
- **Inconsistência:** o "mesmo" pesquisador evolui diferente em cada crew — correções
  e melhorias feitas em uma crew não se propagam para as outras
- **Manutenção custosa:** para ajustar o tom de voz do redator, é preciso editar
  N arquivos em N crews

**Proposta:** Criar um **registro compartilhado de agentes** onde definições comuns
vivem em `_opencrew/agents/` e as crews apenas referenciam (com possibilidade de
sobrescrever parâmetros específicos).

### Arquitetura proposta:

```
_opencrew/
  agents/                           ← NOVO: registro compartilhado
    researcher.agent.md             ← definição base do pesquisador
    copywriter.agent.md             ← definição base do redator
    reviewer.agent.md               ← definição base do revisor
    designer.agent.md               ← definição base do designer
    strategist.agent.md             ← definição base do estrategista

crews/
  blog-semanal/
    crew.yaml
    crew-party.csv                  ← referencia IDs do registro compartilhado
    agents/                         ← apenas overrides específicos da crew
      blog-copywriter.agent.md      ← extends copywriter com regras de blog
    pipeline/
  instagram-crew/
    crew.yaml
    crew-party.csv
    agents/                         ← vazio se usa agentes compartilhados puros
    pipeline/
```

### Mecanismo de Resolução de Agente:

1. **Ordem de busca:** Primeiro `crews/{code}/agents/{id}.agent.md` (override local),
   depois `_opencrew/agents/{id}.agent.md` (registro compartilhado)
2. **Herança por extend:** Um agente local pode estender um compartilhado com
   `extends: _opencrew/agents/copywriter` no frontmatter, sobrescrevendo apenas
   seções específicas (ex: tom de voz, exemplos de output, critérios de qualidade)
3. **Parametrização:** Agentes compartilhados aceitam parâmetros no `crew.yaml`:
   ```yaml
   agents:
     - ref: _opencrew/agents/copywriter
       params:
         format: instagram-feed
         tone: autoritativo
         max_length: 2200
   ```
4. **Versionamento:** Agentes compartilhados têm versão (`version: 1`). Crews
   podem travar em uma versão específica ou seguir `latest`.

### Tipos de agentes candidatos a compartilhamento:

| Tipo | Função | Variações por parâmetro |
|------|--------|------------------------|
| `researcher` | Pesquisa web, busca fontes, rankeia notícias | Fonte (web_search vs fonte fixa), profundidade |
| `copywriter` | Escreve conteúdo a partir de briefing | Formato (post, thread, artigo, legenda), tom, plataforma |
| `reviewer` | Revisa qualidade, aplica critérios | Critérios específicos da crew, peso por dimensão |
| `designer` | Cria conceitos visuais para conteúdo | Formato (carrossel, story, banner), identidade visual |
| `strategist` | Define ângulos, hooks, estratégia de conteúdo | Plataforma, público-alvo |
| `analyst` | Analisa dados, extrai insights | Tipo de dados, métricas |

### Impacto no fluxo de criação (Design Phase):

1. Architect identifica os papéis necessários para a crew
2. **Antes de criar novos agente:** consulta o registro compartilhado (`_opencrew/agents/`)
3. Se existe agente compatível → referencia com parâmetros específicos da crew
4. Se o agente compartilhado cobre 80%+ mas precisa de ajustes → cria override local
   com `extends`
5. Se não existe → cria novo agente. Pergunta ao usuário: "Este agente parece
   reutilizável? Salvar no registro compartilhado para futuras crews?"
6. Se o agente é muito específico da crew → cria localmente (não polui o registro)

### Benefícios:

- **Tokens:** Definições de agentes não são regeneradas nem recarregadas por crew
- **Consistência:** A mesma persona de pesquisador em todas as crews; correções no
  agente base propagam automaticamente
- **Aprendizado cross-crew:** O feedback do usuário sobre o copywriter na crew de
  blog também melhora o copywriter na crew de Instagram (sinergia com item 5.1)
- **Manutenção:** Ajustar o tom de voz do redator é 1 edição, não N
- **Onboarding mais rápido:** Criar uma crew nova é principalmente pipeline + parâmetros,
  não agentes inteiros do zero

### Desafios:

- **Generalidade vs especificidade:** Um copywriter genérico pode ficar "água com
  açúcar" — o sistema de overrides e parâmetros precisa ser robusto
- **Breaking changes:** Alterar um agente compartilhado pode quebrar crews existentes
  → versionamento resolve
- **Governança:** Quem decide se um agente merece ir para o registro compartilhado?
  → critério: usado em 2+ crews = candidato a compartilhado

### Arquivos afetados:

- `templates/_opencrew/agents/` — novo diretório com agentes base
- `templates/_opencrew/core/prompts/design.prompt.md` — Phase E: busca no registro
  antes de criar
- `templates/_opencrew/core/prompts/build.prompt.md` — Step B: resolução de
  referências + extends
- `templates/_opencrew/core/runner.pipeline.md` — carregamento com resolução de
  agentes (local → compartilhado)
- `templates/AGENTS.md` — "Loading Agents" com lógica de resolução
- `crews/{code}/crew.yaml` — novo campo `agents:` com refs e parâmetros
- `crews/{code}/crew-party.csv` — suporte a paths do registro compartilhado

**Horizonte:** Longo prazo (6-10 semanas) — é uma mudança arquitetural profunda que
afeta criação, execução, e manutenção. Ideal para ser planejada junto com o item 2
(Criação por papéis) pois ambos mexem na mesma camada de design de agents.

**Análise de Viabilidade:**
- Cobertura: 🔴 Nova — cada crew define agentes isoladamente; zero reuso
- Diretrizes:
  - ✅ YAGNI: evita duplicação — cada agente existe uma vez no registro, referenciado por N crews
  - ✅ Token efficiency: reduz tokens de geração (não recria definições) e de execução (não recarrega duplicatas). Estimar economia de 40-60% nos tokens de agent definition
  - ⚠️ Complexidade: adiciona conceitos de herança (`extends`), versionamento, resolução em 2 níveis (local → compartilhado). Custo único de implementação compensado por economia perpétua
  - ✅ "Um agente = uma responsabilidade": agentes compartilhados são ainda mais focados por não terem que se adaptar a múltiplos contextos
- Impacto: 🔴 Alto / Esforço: 🔴 Alto
- Dependências: Sinergia forte com item 2 (criação por papéis — os "papéis" são os agentes compartilhados) e item 5.1 (aprendizado cross-crew)
- Riscos: Generalidade vs especificidade — agentes genéricos podem produzir output genérico. Mitigação: sistema de overrides + parâmetros no `crew.yaml`; heurística "80%+ coberto = compartilhado, <80% = crew-specific"

---

## 7. Instalação Não-Destrutiva — Estratégia de Merge para Arquivos Existentes

**Problema:** O `opencrew init` sobrescreve `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
`QWEN.md` e outros arquivos de bridge sem verificar se o usuário já tem conteúdo
próprio nesses arquivos.

### Raiz do problema

No `src/commands/init.js`, as chamadas a `writeFileSafe` têm comportamentos
inconsistentes:

| Arquivo | Flag | Comportamento |
|---------|------|---------------|
| `AGENTS.md` | `overwrite: true` (default) | 🔴 Sobrescreve sempre |
| `CLAUDE.md` | `overwrite: true` (default) | 🔴 Sobrescreve sempre |
| `GEMINI.md` | `overwrite: true` (default) | 🔴 Sobrescreve sempre |
| `QWEN.md` | `overwrite: true` (default) | 🔴 Sobrescreve sempre |
| `.env.example` | `overwrite: true` (default) | 🔴 Sobrescreve sempre |
| `.mcp.json` | `overwrite: false` | 🟢 Preserva existente |
| `.gitignore` | `overwrite: false` | 🟢 Preserva existente |
| `_opencrew/` | `overwrite: false` | 🟢 Preserva existente |
| `skills/` | `overwrite: false` | 🟢 Preserva existente |
| `crews/` | `overwrite: false` | 🟢 Preserva existente |

Um usuário que já tem um `CLAUDE.md` com instruções do projeto (ex: "esse projeto
usa DDD, sempre escreva testes, etc.") **perde tudo** ao rodar `opencrew init`.
O mesmo vale para `GEMINI.md` no Gemini CLI, `QWEN.md` no Qwen Code, etc.

Além disso, `.mcp.json` preserva o existente mas **não faz merge** — se o usuário
já tem servidores MCP configurados, o servidor Playwright do OpenCrew não é
adicionado (o que é pior do que sobrescrever: a funcionalidade quebra silenciosamente).

### Proposta: Estratégia de 3 níveis por arquivo

Para cada arquivo que o init escreve, aplicar uma estratégia específica baseada
no tipo de conteúdo:

#### Nível 1 — Detecção de conteúdo

Antes de escrever qualquer arquivo:
1. O arquivo existe?
2. Se sim, o conteúdo é exatamente igual ao template do OpenCrew? (ex: update de
   versão → pode sobrescrever)
3. Se o conteúdo é diferente → é conteúdo do usuário → dispara estratégia de merge

A detecção usa hash ou comparação de string normalizada (ignorando whitespace).

#### Nível 2 — Estratégia de merge por tipo de arquivo

**`AGENTS.md` (sistema completo — 150+ linhas):**
- OpenCrew escreve o sistema INTEIRO no AGENTS.md — é o "single source of truth"
- Se o usuário já tem um AGENTS.md de outro sistema → conflito real
- Estratégia:
  1. Se não existe → cria normalmente
  2. Se existe e é idêntico ao template OpenCrew → sobrescreve (update)
  3. Se existe com conteúdo de usuário → **backup + perguntar**:
     - Opção A: "Substituir — OpenCrew gerencia o AGENTS.md" (recomendado)
     - Opção B: "Criar `AGENTS.opencrew.md` como sidecar — você referencia manualmente"
     - Opção C: "Pular — manter meu AGENTS.md como está"
  - Se `--yes` foi passado → default para Opção A com aviso explícito:
    "⚠️ AGENTS.md substituído. Backup salvo em AGENTS.md.bak."

**`CLAUDE.md`, `GEMINI.md`, `QWEN.md` (arquivos de bridge — ~5-10 linhas cada):**
- São arquivos finos que apontam para `AGENTS.md` + notas específicas da IDE
- Estratégia: **bloco marcado com delimitadores HTML**
  ```
  <!-- opencrew:start -->
  # opencrew — Project Instructions
  This project uses opencrew...
  <!-- opencrew:end -->

  [conteúdo existente do usuário PRESERVADO aqui]
  ```
- Em updates subsequentes → substitui apenas o bloco entre `<!-- opencrew:start -->`
  e `<!-- opencrew:end -->`
- Se o usuário remover os marcadores → redetecta como "arquivo modificado" e
  pergunta (não sobrescreve cegamente)
- Se não existe → cria com o bloco OpenCrew apenas

**`.mcp.json` (merge de servidores MCP):**
- Hoje: `overwrite: false` → preserva o existente mas NÃO adiciona o servidor
  Playwright do OpenCrew
- Proposta: **merge inteligente**
  1. Lê o `.mcp.json` existente
  2. Lê o servidor `@anthropic/mcp-server-playwright` do template
  3. Se o servidor já existe no arquivo do usuário → mantém o do usuário
  4. Se não existe → adiciona ao objeto `mcpServers`
  5. Preserva todos os outros servidores do usuário intactos
- Mesma lógica para `.claude/settings.local.json`

**`.gitignore` (append de entradas):**
- Hoje: `overwrite: false` → preserva existente mas NÃO adiciona novas entradas
- Proposta: **append condicional**
  1. Lê o `.gitignore` existente
  2. Para cada entrada do template OpenCrew, verifica se já existe no arquivo
  3. Adiciona apenas as entradas faltantes ao final, com comentário:
     ```
     # opencrew
     _opencrew/logs/
     _browser_profile/
     ```
- Detecta bloco `# opencrew` existente → substitui só esse bloco

**`.env.example` (append de variáveis):**
- Hoje: sobrescreve sempre
- Proposta: mesmo tratamento do `.gitignore` — append das variáveis do OpenCrew
  que não existem, com delimitador `# opencrew`

#### Nível 3 — Confirmação interativa

Quando conteúdo de usuário é detectado em qualquer arquivo crítico:
1. Lista todos os arquivos que serão modificados e a ação em cada um
2. Para cada arquivo, mostra diff do que será adicionado/alterado
3. Oferece checkpoints:
   - "Prosseguir com merge" (default com `--yes`)
   - "Ver diff completo"
   - "Cancelar instalação"

### Parte 2: Modelo de Instalação — Global vs Per-Project

Hoje o OpenCrew só suporta instalação per-project (`npx @aksp/opencrew init`
na raiz do projeto). A questão é: deveria existir um modo global?

#### Modelo A: Per-Project (atual)

**Vantagens:**
- ✅ Isolamento total: cada projeto tem sua versão, crews, skills, e company profile
- ✅ MCP servers no escopo do projeto — sem conflitos entre projetos
- ✅ Company profile diferente por projeto (essencial para agências com múltiplos clientes)
- ✅ Cada projeto pode travar em uma versão específica do OpenCrew
- ✅ Simples: um diretório, uma instalação

**Desvantagens:**
- ❌ Instalação repetida para cada novo projeto
- ❌ Conflito com arquivos IDE existentes (este ticket)
- ❌ Updates manuais por projeto (ou automação externa)
- ❌ Skills reinstaladas por projeto (duplicação em disco)

#### Modelo B: Global (`~/.opencrew/`)

**Vantagens:**
- ✅ Instala uma vez, funciona em qualquer projeto
- ✅ Zero conflito com arquivos do projeto
- ✅ Skills compartilhadas entre projetos (instala uma vez)
- ✅ Update único para todos os projetos
- ✅ Menos arquivos na raiz do projeto

**Desvantagens:**
- ❌ Company profile único — inviável para agências com múltiplos clientes
- ❌ MCP servers globais no `settings.json` da IDE
- ❌ Versionamento: todos os projetos usam a mesma versão
- ❌ Crews e outputs são sempre per-project mesmo com core global (confunde)
- ❌ IDEs como Claude Code leem configuração do diretório do projeto, não de `~/`

#### Modelo C: Híbrido (recomendado)

Combina o melhor dos dois mundos:

| Camada | Local | Justificativa |
|--------|-------|---------------|
| Core do framework (`_opencrew/core/`) | Per-project | Cada projeto trava sua versão; evita breaking changes |
| Skills | **Global com cache local** | Instala em `~/.opencrew/skills/`; projeto tem symlink ou cópia local como cache. Update de skill beneficia todos os projetos. |
| Company profile | Per-project | Agências precisam de perfis diferentes por cliente |
| Crews + outputs | Per-project | São específicos do contexto do projeto |
| Bridge files (`AGENTS.md`, `CLAUDE.md`) | Per-project | Cada projeto tem seu próprio ecossistema de arquivos IDE |
| `.mcp.json` | Per-project | MCP servers são escopo de projeto |
| `.env` | Per-project | Chaves de API por projeto/cliente |

**Implementação em fases:**

**Fase 1 (curto prazo):** Resolver o problema de sobrescrita (merge strategy acima).
Corrige o bug sem mudar arquitetura.

**Fase 2 (médio prazo):** Adicionar flag `--global` experimental:
```
npx @aksp/opencrew init --global   # instala em ~/.opencrew/
```
- Skills são instaladas em `~/.opencrew/skills/`
- Projetos referenciam skills globais via `crew.yaml` → `skills: [global:resend]`
- Se uma skill local existe em `skills/`, shadowa a global (override local)

**Fase 3 (longo prazo):** Cache inteligente de skills:
- `npx @aksp/opencrew install <skill>` → instala em `~/.opencrew/skills/` por padrão
- `npx @aksp/opencrew install <skill> --local` → instala localmente (override)
- `opencrew update` → atualiza core + skills globais

### Arquivos afetados

- `src/commands/init.js` — reescrever `writeFileSafe` calls com merge strategy
- `src/lib/fsx.js` — novos helpers: `mergeJsonFile`, `appendToFile`, `insertBlockWithMarkers`
- `src/commands/update.js` — usar a mesma estratégia de merge (consistência)
- `templates/*` — templates de bridge com delimitadores `<!-- opencrew:start/end -->`
- `tests/init.test.js` — testes para cada cenário de merge

### Cenários de teste

1. **Init em projeto vazio:** comportamento atual (todos os arquivos criados)
2. **Init em projeto com CLAUDE.md existente:** bloco OpenCrew inserido, conteúdo preservado
3. **Init em projeto com AGENTS.md de outro sistema:** pergunta com opções
4. **Init com `--yes` em projeto com conteúdo:** default para merge, backup criado
5. **Init em projeto com OpenCrew prévio (update):** sobrescreve blocos marcados, preserva resto
6. **Init em projeto com `.mcp.json` contendo outros servidores:** adiciona servidor Playwright, preserva existentes
7. **Init com `--global`:** instala em `~/.opencrew/`, bridge files vão para o projeto atual

### Sinergia com outras ideias

- **Item 6 (Registro compartilhado de agentes):** Um modelo híbrido de instalação é
  pré-requisito para agentes compartilhados cross-project
- **Item 3 (Criação dinâmica de skills):** Skills criadas automaticamente podem ser
  salvas globalmente para reuso em outros projetos

**Análise de Viabilidade:**
- Cobertura: 🔴 Bug real — `writeFileSafe` com `overwrite: true` destrói arquivos do usuário
- Diretrizes:
  - ✅ Simplicidade: merge não-destrutivo resolve o bug sem mudar o modelo mental do usuário
  - ✅ Backward compatible: quem usa `--yes` em projeto vazio não percebe diferença
  - ⚠️ Complexidade: merge de `.mcp.json` e blocos marcados adiciona lógica condicional. Mas o ganho de segurança (não destruir dados do usuário) justifica
- Impacto: 🔴 Alto / Esforço: 🟡 Médio (Fase 1), 🔴 Alto (Fase 3 com `--global`)
- Dependências: Nenhuma
- Riscos: Detecção de "conteúdo igual ao template" pode falhar com whitespace/encoding diferente. Mitigação: comparação com hash do template normalizado (trim + normalize line endings)

**Horizonte:** Fase 1 (merge não-destrutivo) — Curto prazo (1-2 semanas). Fases 2-3 (global/híbrido) — Longo prazo (6-10 semanas).

---

## Priorização Sugerida

| # | Ideia | Impacto | Esforço | Horizonte |
|---|-------|---------|---------|-----------|
| 1 | Instalação não-destrutiva — merge (item 7) | 🔴 Alto | 🟡 Médio | Curto |
| 2 | Criação por papéis, não ferramentas (item 2) | 🔴 Alto | 🟡 Médio | Médio |
| 3 | Aprendizado contínuo das crews (item 5.1) | 🔴 Alto | 🟡 Médio | Médio |
| 4 | Sherlock multi-fonte (item 1) | 🔴 Alto | 🟢 Baixo | Curto |
| 5 | Tiers de crew (item 4) | 🟡 Médio | 🟡 Médio | Médio |
| 6 | Registro compartilhado de agentes (item 6) | 🔴 Alto | 🔴 Alto | Longo |
| 7 | Criação dinâmica de skills (item 3) | 🔴 Alto | 🔴 Alto | Longo |
| 8 | Templates por setor (5.2) | 🟡 Médio | 🟢 Baixo | Curto |
| 9 | Exportação multi-formato (5.3) | 🟡 Médio | 🟢 Baixo | Curto |

---

*Este arquivo é vivo — alimentado pelo uso real do OpenCrew. Para cada ideia,
avalie: a dor é real e frequente? A solução proposta resolve a causa raiz?*

*✅ Backlog concluído: 2026-08-03 — 9 de 9 ideias implementadas. 85 testes, 0 regressões.*
