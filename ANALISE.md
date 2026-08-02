# Relatório de Análise — opencrew v1.0.1

**Data:** 2026-08-01
**Branch analisada:** `melhorias/analise-opencrew` (merge pending)
**Escopo:** Código-fonte completo, testes, CI/CD, templates, dashboard, skills catalog

---

## 1. Visão Geral da Arquitetura

```
bin/opencrew.js              CLI entry point (shebang, delegação pura)
src/
  cli.js                     Parse de args + routing (init | update | help | version)
  commands/
    init.js                  Scaffolding do workspace (102 linhas)
    update.js                Refresh do framework (65 linhas)
  lib/
    fsx.js                   Helpers de filesystem: exists, copyDir, writeFileSafe, readJson
    ides.js                  Definições de bridge files para 9 IDEs (120 linhas)
    paths.js                 Resolução de caminhos relativos ao package
    prompts.js               Prompts interativos com fallback não-interativo
    ui.js                    Estilização de terminal (zero dependências)
templates/                   Payload copiado no init
  AGENTS.md                 Definição canônica do sistema (~200 linhas)
  _opencrew/
    core/                   Framework: runner, skills engine, prompts, best-practices
    _memory/                company.md + preferences.md
    config/                 playwright.config.json
  skills/                   Catálogo de 11 skills
  crews/                    Template vazio
dashboard/                   App React + Phaser (quebrado — "squads")
dashboard-lite/              Escritório virtual auto-contido (funcional, não documentado)
scripts/check-version-sync.js
tests/                       5 arquivos, 30 testes (node:test)
.github/workflows/           CI (ubuntu + windows) + Publish (npm)
```

O CLI é enxuto: 5 arquivos fonte (~350 linhas) + 5 libs (~250 linhas). O framework de runtime (templates) é o código "vivo" — markdown interpretado pelos agentes de IA em cada IDE.

---

## 2. Avaliação por Componente

### 2.1 CLI (`src/`)

| Aspecto | Estado |
|---------|--------|
| Parse de argumentos | Manual, simples, cobre `--key=value` e `--flag` |
| Routing | Switch-case limpo com fallback help |
| Error handling | `process.exitCode = 1` para comando desconhecido; erros de FS sobem via `run().catch()` |
| Extensibilidade | Adicionar comando = +1 case + +1 import |
| Testes | ❌ Nenhum teste específico do CLI (parseArgs, help output) |

**Gaps:**
- `readJson(packageJsonPath)` não tem tratamento de erro — se `package.json` estiver corrompido ou ausente, crasha com stack trace feio
- `parseArgs` não lida com `--no-` flags (ex: `--no-color`)
- Sem subcomando aninhado (ex: `opencrew skill install x`), só comando plano

### 2.2 Comando `init`

| Aspecto | Estado |
|---------|--------|
| Idempotência | ✅ Detecta reinstalação, preserva dados do usuário |
| Segurança de sobrescrita | ✅ `overwrite: false` por padrão |
| Seleção de IDE | ✅ Interativa, `--all`, `--ide=`, fallback TTY |
| Versionamento | ✅ Stampa `.opencrew-version` |
| Testes | ✅ 10 testes: scaffolding, IDE filtering, re-run safety, unknown IDE |

**Gaps:**
- Não há teste para o flag `--yes` (modo não-interativo sem especificar `--ide`)
- Playwright warning só aparece para `claude-code`; se o usuário seleciona `--all`, o warning aparece mas não menciona que todos os outros IDEs foram configurados também
- O `company.md` template é criado vazio; a lógica de onboarding só existe em AGENTS.md (runtime), não no CLI

### 2.3 Comando `update`

| Aspecto | Estado |
|---------|--------|
| Segurança | ✅ Só sobrescreve `_opencrew/core`, cataloga skills, AGENTS.md |
| Preservação | ✅ Nunca toca crews/, memory/, .env, IDE bridges |
| Dry-run forçado | Sempre sobrescreve `core/` mesmo se versão igual |
| Testes | ✅ 4 testes: no-op, refresh, user-authored skills, version bump |

**Gaps:**
- Não reporta arquivos que foram adicionados/removidos entre versões (só contagem)
- Sem `--check` (reporta se update é necessário sem aplicar)
- Sem opção de excluir skills específicas do refresh

### 2.4 `fsx.js` — Filesystem Helpers

| Aspecto | Estado |
|---------|--------|
| API | Limpa: exists, ensureDir, copyDir, writeFileSafe, readJson |
| Sobrescrita segura | ✅ `overwrite: false` nunca clobbera |
| Criação de diretórios | ✅ Automática com `ensureDir` |
| `skip()` callback | ✅ Permite excluir padrões (ex: `logs/` exceto `.gitkeep`) |
| `onCopy()` callback | ✅ Hook para contagem/progresso |
| Testes | ✅ 9 testes: todos os modos de copyDir, writeFileSafe, exists |

**Gaps:**
- `copyDir` não lida com symlinks — `fs.readdir({ withFileTypes: true })` retorna symlinks como `isSymbolicLink()`, mas eles são ignorados
- Sem checksum ou diff para detectar mudanças reais (update sempre copia, mesmo que idêntico)
- `readJson` sem caching (chamado repetidamente com o mesmo path)
- Sem `deleteDir` ou `move` — só add/overwrite

### 2.5 `ides.js` — Definições de IDE

| Aspecto | Estado |
|---------|--------|
| Cobertura | 9 IDEs: Claude Code, Codex, Cursor, Copilot, OpenCode, Antigravity, Gemini CLI, Qwen, Trae |
| Princípio | Bridge files finos que apontam para AGENTS.md |
| Metadados | Cada IDE tem id, label, files[] |
| Testes | ✅ 4 testes: unicidade, referência a AGENTS.md, lookup |

**Gaps:**
- Sem validação de unicidade de path entre IDEs — dois IDEs poderiam escrever no mesmo arquivo
- `CLAUDE_MD` é um caso especial inline — isso fere o princípio de "uma entry por IDE" declarado no CONTRIBUTING
- Os bridge files são strings hardcoded; mudar o template base requer editar todos

### 2.6 Dashboard

| Componente | Estado |
|-------------|--------|
| `dashboard/` (React + Phaser) | ❌ Quebrado — procura `squads/`, não `crews/`; não empacotado no npm |
| `dashboard-lite/` (HTML vanilla) | ✅ Funcional — lê `state.json`, renderiza escritório animado |
| Integração com runner | ✅ Opt-in via `Dashboard: enabled` em preferences.md (default off) |
| Documentação | Dashboard-lite não é mencionado em lugar nenhum |

**Gaps críticos:**
- `dashboard/package.json` nome: `"opensquad-dashboard"` — branding errado
- Dashboard React depende de Phaser (~1MB) para uma cena 2D estática — overkill
- Dashboard-lite faz tudo que o dashboard React faz com 1 arquivo HTML de ~200 linhas
- Ambos os dashboards leem `state.json` do filesystem local — não funcionam em ambientes cloud/remotos

### 2.7 Catálogo de Skills

| Aspecto | Estado |
|---------|--------|
| Número de skills | 11 (apify, blotato, canva, image-ai-generator, image-creator, image-fetcher, instagram-publisher, opencrew-best-practice-creator, opencrew-skill-creator, resend, template-designer) |
| Índice | `templates/skills/README.md` — acoplado como índice de runtime |
| Tipos | MCP, script, hybrid, prompt |
| Instalação | Skills Engine lê README.md e faz fetch de `raw.githubusercontent.com/.../SKILL.md` |

**Gaps:**
- URL hardcoded para `alberthpalhares/opencrew/main/` — se o branch padrão mudar, quebra
- Sem versionamento de skills (sempre a última do `main`)
- README.md como índice de runtime: se alguém reformata a tabela, o parsing quebra
- Skills não têm metadados de compatibilidade (versão mínima do opencrew)

### 2.8 Testes

| Aspecto | Estado |
|---------|--------|
| Framework | `node:test` (zero dependências) |
| Cobertura | fsx, ides, init, update, docs (contract tests) |
| Total | 30 testes |
| CI | Ubuntu + Windows, Node 20 |

**Gaps:**
- Sem cobertura de CLI (`cli.js`, parseArgs, help)
- Sem cobertura de `prompts.js`
- Sem cobertura de `paths.js`
- Sem testes de regressão para o `runner.pipeline.md` além dos 3 asserts de docs
- Testes de integração usam filesystem real (tmp dirs) — bom para realismo, mas mais lento

### 2.9 CI/CD

| Aspecto | Estado |
|---------|--------|
| CI trigger | push + PR contra main |
| Matrix | ubuntu-latest, windows-latest |
| Node | 20 (deprecated, o runner já alerta) |
| Publish trigger | push de tag `v*` |
| Provenance | ✅ npm publish --provenance |
| Publish gates | npm test + npm pack --dry-run |

**Gaps:**
- Node 20 deprecated; CI mostra warning. Bump para 22 ou 24 mantendo compatibilidade com `>=20.0.0`
- Sem `npm audit` ou `npx eslint` no CI
- Sem test matrix para Node 22/24 (só testa na versão mínima)
- Não há cache de `node_modules` no CI
- Workflow de publish não executa em Windows (só ubuntu) — consistente com CI mas não testa cross-platform antes de publicar

### 2.10 Repositório

| Aspecto | Estado |
|---------|--------|
| PR template | ❌ Ausente |
| Issue templates | ❌ Ausentes |
| `.nvmrc` / `.node-version` | ❌ Ausente |
| `.npmrc` | ❌ Ausente |
| Linting | ❌ Sem ESLint/Prettier |
| CHANGELOG | ✅ Atualizado até v1.0.1 |
| LICENSE | ✅ MIT |
| README | ✅ Em PT-BR, cobre instalação rápida |

---

## 3. Problemas Identificados

### 🔴 Críticos (bloqueiam funcionalidade ou vão quebrar em breve)

| # | Problema | Impacto |
|---|----------|---------|
| C1 | **Node 20 deprecated no GitHub Actions** — CI mostra warning; runners vão remover suporte em 2026 | CI para de funcionar |
| C2 | **Dashboard React quebrado** — referencia `squads/`, branding `opensquad`, não empacotado | Código morto no repósitorio |
| C3 | **URL hardcoded no Skills Engine** — `raw.githubusercontent.com/alberthpalhares/opencrew/main/` | Instalação de skills quebra se muda branch ou repo |

### 🟡 Médios (qualidade, manutenibilidade, DX)

| # | Problema | Sugestão |
|---|----------|----------|
| M1 | **README.md como índice de runtime** — acoplamento documentação ↔ código | Separar catalog index para JSON |
| M2 | **`--yes` sem cobertura de teste** — modo não-interativo pode quebrar silenciosamente | Adicionar teste com `--yes` |
| M3 | **`package.json` corrompido crasha o CLI** — sem tratamento em `readJson` | Try/catch com mensagem amigável |
| M4 | **Sem diffs no update** — usuário não sabe o que mudou entre versões | Reportar arquivos adicionados/removidos/modificados |
| M5 | **Dashboard-lite não documentado** — funciona mas ninguém sabe que existe | Documentar no README ou remover |
| M6 | **Sem verificação de conflito de paths entre IDEs** — dois IDEs podem escrever no mesmo arquivo | Validação em `ides.test.js` |
| M7 | **Phaser como dependência do dashboard** (~1MB) para renderização 2D simples | Migrar para Canvas API vanilla |

### 🟢 Menores (nice-to-have, polish)

| # | Problema | Sugestão |
|---|----------|----------|
| m1 | Sem PR/Issue templates | Adicionar `.github/PULL_REQUEST_TEMPLATE.md` |
| m2 | Sem `.nvmrc` | Adicionar `.nvmrc` com `20` |
| m3 | Sem cache no CI | Adicionar `actions/setup-node@v4` com `cache: 'npm'` |
| m4 | Sem badge de CI/versão/npm no README | Adicionar badges |
| m5 | `copyDir` ignora symlinks silenciosamente | Logar warning ou tratar |
| m6 | `readJson` sem cache | Cache simples em memória para leituras repetidas |
| m7 | CHANGELOG desatualizado para a branch atual | Atualizar com as correções do PR #1 |
| m8 | Sem `deleteDir` no `fsx.js` | Adicionar para futuro `uninstall` |
| m9 | `dashboard/package.json` nome `opensquad-dashboard` | Renomear para `opencrew-dashboard` |

---

## 4. Plano de Implantação

### Fase 1 — Correções Imediatas (1-2 dias)

**Objetivo:** Resolver os problemas críticos e finalizar o PR #1.

| Ordem | Tarefa | Prioridade |
|--------|-------|------------|
| 1.1 | Atualizar CHANGELOG.md com as mudanças do PR #1 | 🟡 |
| 1.2 | Adicionar `.github/PULL_REQUEST_TEMPLATE.md` | 🟢 |
| 1.3 | Bump Node no CI de 20 para 22 (`node-version: '22'`) mantendo `engines: >=20.0.0` no `package.json` para não quebrar usuários | 🔴 |
| 1.4 | Adicionar `cache: 'npm'` no `actions/setup-node@v4` do CI | 🟢 |
| 1.5 | Adicionar badges no README (CI status, npm version) | 🟢 |

### Fase 2 — Robustez do CLI (2-3 dias)

**Objetivo:** Tratamento de erros, testes, e melhorias de DX.

| Ordem | Tarefa | Prioridade |
|--------|-------|------------|
| 2.1 | Try/catch em `readJson(packageJsonPath)` com mensagem amigável | 🟡 |
| 2.2 | Adicionar testes para `cli.js`: parseArgs, help output, version, unknown command | 🟡 |
| 2.3 | Adicionar teste para `init --yes` (modo não-interativo sem --ide) | 🟡 |
| 2.4 | Adicionar validação de unicidade de paths entre IDEs + teste | 🟡 |
| 2.5 | Adicionar `--check` no update (dry-run: reporta se update é necessário) | 🟡 |
| 2.6 | Adicionar `.nvmrc` (node 20) | 🟢 |

### Fase 3 — Dashboard e Skills (3-5 dias)

**Objetivo:** Resolver a situação do dashboard e desacoplar skills catalog.

| Ordem | Tarefa | Prioridade |
|--------|-------|------------|
| 3.1 | **Decisão de arquitetura**: manter `dashboard-lite/` como o dashboard oficial e remover `dashboard/` (React+Phaser), OU corrigir `dashboard/` | 🔴 |
| 3.2 | Se manter lite: renomear `dashboard-lite/` → `dashboard/`, documentar no README, atualizar AGENTS.md | 🔴 |
| 3.3 | Se manter React: corrigir referências `squads/` → `crews/`, renomear package, reavaliar Phaser | 🔴 |
| 3.4 | Separar catálogo de skills: `templates/skills/catalog.json` como índice de runtime, README.md como documentação humana | 🟡 |
| 3.5 | Adicionar campo `minVersion` nos metadados das skills | 🟢 |
| 3.6 | Tornar URL base do skills engine configurável (variável no runner, não hardcoded) | 🟡 |

### Fase 4 — Polish e Comunidade (2-3 dias)

**Objetivo:** Preparar o projeto para contribuições externas.

| Ordem | Tarefa | Prioridade |
|--------|-------|------------|
| 4.1 | Adicionar `.github/ISSUE_TEMPLATE/` (bug report, feature request) | 🟢 |
| 4.2 | Adicionar ESLint + Prettier config | 🟢 |
| 4.3 | Adicionar `npm audit` ao CI (ou npm audit ci) | 🟢 |
| 4.4 | Expandir testes do `runner.pipeline.md` (mais contract tests para skills engine, onboarding, pipeline execution) | 🟢 |
| 4.5 | Adicionar `deleteDir` ao `fsx.js` para suporte futuro a `uninstall` | 🟢 |
| 4.6 | Adicionar `engines` check no `init`/`update` (avisa se Node < 20) | 🟢 |

---

## 5. Recomendações Estratégicas

### 5.1 Dashboard: Lite vs React

**Recomendação:** Manter `dashboard-lite/` como o dashboard oficial e descartar `dashboard/`.

**Justificativa:**
- Dashboard-lite: 1 arquivo HTML auto-contido (~200 linhas JS), zero build, zero dependências, funcional
- Dashboard React: Phaser (~1MB), React 19, Vite, TypeScript, package.json errado, procura `squads/`
- Ambos leem o mesmo `state.json` — mesma funcionalidade, complexidade 50x menor no lite
- O lite já está em PT-BR (público-alvo do opencrew)

### 5.2 Skills Catalog: Desacoplar Índice

**Recomendação:** Criar `templates/skills/catalog.json` com o índice estruturado e manter `README.md` como documentação.

**Formato proposto:**
```json
{
  "version": "1",
  "skills": {
    "apify": { "type": "mcp", "description": "...", "minVersion": "1.0.0" }
  }
}
```

Isso permite que o Skills Engine faça parsing determinístico (JSON) e o README.md seja editado livremente como documentação.

### 5.3 Node Version Strategy

**Recomendação:** Testar em Node 20 e 22 no CI; documentar Node 20 como mínimo, 22 como recomendado.

- `engines.node: ">=20.0.0"` no `package.json` (mantido)
- CI matrix: `[20, 22]` para Ubuntu, `[20]` para Windows (custo menor)
- `.nvmrc`: `20` (mínimo suportado)

### 5.4 Estrutura de Testes

**Recomendação:** Manter `node:test` (zero dependências), expandir cobertura.

Prioridade de novos testes:
1. CLI (parseArgs, routing)
2. prompts.js (TTY vs não-TTY)
3. Runner pipeline contracts (mais asserts de docs)
4. Skills engine (instalação, descoberta)

---

## 6. Métricas

| Métrica | Valor |
|---------|-------|
| Total de arquivos fonte (src/) | 10 |
| Linhas de código fonte | ~600 |
| Linhas de templates markdown | ~8000 |
| Testes | 30 |
| Cobertura de testes (componentes) | fsx ✅, ides ✅, init ✅, update ✅, docs ✅, cli ❌, prompts ❌ |
| IDEs suportadas | 9 |
| Skills no catálogo | 11 |
| Dependências runtime | 2 (@inquirer/checkbox, @inquirer/confirm) |
| Dependências dev | 0 |
| Tamanho do package (npm pack) | ~250KB (estimado) |

---

*Relatório gerado por análise manual completa do código-fonte. Todos os arquivos em `src/`, `tests/`, `templates/`, `dashboard/`, `dashboard-lite/`, `.github/` foram lidos e avaliados.*
