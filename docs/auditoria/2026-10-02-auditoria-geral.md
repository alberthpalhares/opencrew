# Auditoria geral — OpenCrew v1.4.1

> Data: 2026-10-02 · Versão auditada: 1.4.1 (commit `25c66e5`, publicada no npm)
> Régua: skill project-standards, **Tier T3**, cenário "auditoria geral fora de fim de fase"
> Método: três auditorias paralelas, só de leitura (CLI/infra · templates/runtime ·
> docs/release). Os achados de severidade alta foram conferidos no código.
> Modelo: Opus 5.5 (planejamento/auditoria)

Cada achado tem **dono** (a fase que o resolve) e **trava** (o teste ou script que o impede
de voltar). Uma constatação sem trava vira item da Fase em que a trava nasce.

---

## 1. Saúde geral

| Métrica | Valor |
|---|---|
| Arquivos versionados | 129 (código: 8 em `src/`+`bin/`, 2 scripts, 9 testes) |
| Código acima do alvo | 0 — maior: `src/lib/ides.js` 177/200, `src/commands/init.js` 159/200 |
| Testes acima do alvo | 2 em **aviso**: `tests/docs.test.js` 328/300 (109%), `tests/init.test.js` 302/300 (101%) |
| Prompts do runtime | `runner.pipeline.md` 829 linhas (~11k tokens) · `sherlock-shared.md` 756 · `design.prompt.md` 697 · `build.prompt.md` 633 |
| Testes | ~98 `test()` em 8 arquivos; CI Ubuntu+Windows × Node 20/22 |
| Porta de verificação única | **não existe** — CI roda test, lint, audit e version-sync em passos separados; o publish roda só test |
| Arquivo de regras de desenvolvimento | **não existe** — `AGENTS.md` da raiz era cópia do runtime; `CLAUDE.md` gitignored |
| Tabela Regra → Trava | não existe |
| Specs | não existem (`/specs` ausente) |

**Orçamento de tokens por execução de crew** (estimativa a 4 bytes/token; em PT conta
10–20% a menos do que o real):

| Momento | ~Tokens |
|---|---|
| Toda sessão (ponte + `system.md` + memória) | 2–3k (ok) |
| Overhead fixo de um run, antes de qualquer conteúdo | **25–35k** (o tier Express anuncia "~5K") |
| Criar uma crew (architect + discovery + design + build + best-practices + sherlock) | **55–75k** |

**Achado de processo — assertiva frouxa:** `tests/docs.test.js` testa os prompts por
`includes()` de string. Ele garante que um trecho existe, não que o fluxo faça sentido. Por
isso passaram contradições entre prompts (T-A2, T-A3, T-A10) e caminhos quebrados (T-A5,
T-A6). → Fase 0 cria `tests/template-refs.test.js` (referências de caminho) e a Fase 3
cria validação de esquema de `crew.yaml`/`pipeline.yaml`.

---

## 2. Achados

Legenda de dono: **F0** governança · **F1** hotfix 1.4.2 · **F2** update confiável (1.5.0) ·
**F3** coerência do runtime · **F4** tokens, infra e superfície.

### 2.1 CLI e infraestrutura (`src/`, `bin/`, `scripts/`, `.github/`)

| ID | Sev | Achado | Onde | Dono | Trava |
|---|---|---|---|---|---|
| C-01 | alta | `update` não entrega diretórios novos (`_opencrew/agents/`, `config/`, `_investigations/`, templates de crew); quem instalou antes da 1.3.2 não tem os agentes base de que os prompts dependem | `src/commands/update.js:50-68` | F2 | teste `update` em workspace 1.3.1 simulado |
| C-02 | alta | `update --help`, `update --dry-run`, `update -h` executam o update de verdade; `init --help` cria o workspace | `src/cli.js:34-55,118` | F1 | F1-02 |
| C-03 | alta | `CLAUDE.md` gerado para todo usuário contém o fluxo pessoal de STATUS.md do mantenedor (`/status`), publicado em 1.4.0 e 1.4.1; `templates/gitignore` também inclui `STATUS.md` | `src/lib/ides.js:45-79`, `templates/gitignore` | F1 | `ides.test.js` "pontes sem conteúdo do mantenedor" |
| C-04 | alta | `.gitignore` existente não ganha nada: `.env`, `_opencrew/_browser_profile/` e `company.md` podem ir para o git | `src/commands/init.js:87-90` | F1 | F1-06 |
| C-05 | alta | `.env.example` do usuário é sobrescrito sem aviso | `src/commands/init.js:86` | F1 | F1-05 |
| C-06 | alta | Ctrl+C no prompt de IDE deixa o workspace pela metade (core sem pontes nem stamp), e o `init` seguinte se recusa a rodar; mostra stack trace cru | `init.js:32-38,97`, `bin/opencrew.js:6` | F1 | F1-07 |
| C-07 | alta | `update` quebra com ENOENT se `AGENTS.md` não existir, **depois** de sobrescrever o core; toda execução seguinte quebra igual | `update.js:83`, `fsx.js:100` | F1 | F1-03 |
| C-08 | alta | `update` sobrescreve skills de catálogo editadas pelo usuário sem backup nem confirmação | `update.js:62-67` | F2 | manifesto de hashes + teste |
| C-09 | média | Comparação de versão por string: downgrade silencioso via cache do `npx`; `--check` erra quando a instalação é mais nova | `update.js:33,43` | F2 | teste semver |
| C-10 | média | `update` nunca atualiza as pontes de IDE (o fix do Antigravity em 0e2c954 não chega a ninguém) | `update.js:7-8,94` | F2 | teste |
| C-11 | média | `-y` atropela um `--ide` explícito (`init --ide=cursor -y` configura as 9 IDEs) | `init.js:24,96` | F2 | teste de precedência |
| C-12 | média | `--repair-bridges` sem `--ide` cria pontes para IDEs que o usuário nunca escolheu; a escolha não é persistida | `init.js:24` | F2 | `_opencrew/.opencrew.json` + teste |
| C-13 | média | `.mcp.json` existente é mantido sem merge; Playwright quebra em silêncio; o comentário do template promete um refresh que não existe | `init.js:81-84`, `templates/.mcp.json` | F2 | teste de merge |
| C-14 | média | Pontes dizem "a definição está em AGENTS.md", mas desde a 1.3 ele é um ponteiro: são dois saltos até `system.md` | `ides.js:1-10,35` | F4 | `ides.test.js` exige `system.md` |
| C-15 | média | Cursor, Copilot e Trae não registram o slash command `/opencrew`, mas a mensagem final diz "type /opencrew" | `ides.js` | F4 | teste de paridade |
| C-16 | média | Migração do `AGENTS.md` legado substitui o arquivo inteiro e apaga o que o usuário escreveu | `update.js:84-86` | F1 | F1-04 |
| C-17 | média | O bloco opencrew é colocado no **início** do `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` do usuário e passa a ter prioridade sobre as instruções do projeto | `fsx.js:91-93` | F4 | teste |
| C-18 | média | `engines >=20.0.0`, mas `@inquirer/checkbox@5` exige `^20.17 \|\| >=22.13`; Node 20 está em EOL desde 2026-04-30; CI não testa Node 24 | `package.json`, `.nvmrc`, `ci.yml:18` | F4 | CI matrix |
| C-19 | média | Pipeline de publish mais fraco que o CI: sem lint, sem version-sync, sem checar tag × versão, `workflow_dispatch` publica de qualquer branch, `npm ci \|\| npm install` esconde drift, token de longa duração | `publish.yml` | F0 (porta + tag) / F4 (OIDC, SHA) | `npm run verify` no publish |
| C-20 | média | `init` não protege o diretório-alvo (home, raiz do disco); `init minha-pasta` ignora o argumento em silêncio | `init.js` | F4 | teste |
| C-21 | média | Falha parcial (permissão, arquivo travado no Windows) mostra stack trace e deixa o projeto meio escrito | `init.js`, `update.js`, `bin/` | F1 (bin) / F2 | teste |
| C-22 | baixa | Código morto: `deleteDir` (só os testes usam), `preselected` em `pickIdes`, `case '--version'/'--help'` inalcançáveis, dependência `@inquirer/confirm` não importada | `fsx.js:110`, `prompts.js:10`, `cli.js:127,130`, `package.json` | F1 (cli) / F2 | lint `no-unused-vars` como erro |
| C-23 | baixa | Duplicação: string `agentsBridge` em `init.js:71` e `update.js:75`; `package.json` lido três vezes; IDs de IDE validados em dois lugares | — | F2 | — |
| C-24 | baixa | Parser: `-yv` vira comando desconhecido; `--ide claude-code` (com espaço) ignora o valor; `--ide=bogus` termina "Done!" sem nenhuma ponte | `cli.js:34-55`, `init.js:127` | F1 | F1-02 |
| C-25 | baixa | Mensagens e códigos de saída enganosos: `ok()` mesmo quando o arquivo foi pulado; `update` sem workspace sai com 0 | `init.js:140,147`, `update.js:18` | F2 | teste |
| C-26 | baixa | `writeBridgeFile`: marcador de fim apagado gera bloco duplicado; mistura LF em arquivo CRLF | `fsx.js:79-93` | F2 | teste |
| C-27 | baixa | Lint exclui `bin/`; `no-unused-vars` só avisa; `copyDir` segue symlinks; `update` não remove arquivos que saíram dos templates | `package.json`, `eslint.config.js`, `fsx.js` | F0 (lint bin) / F2 | lint na porta |

### 2.2 Templates — o runtime (`templates/`)

| ID | Sev | Achado | Onde | Dono | Trava |
|---|---|---|---|---|---|
| T-A1 | alta | MCP registrado/checado em `.claude/settings.local.json`, mas o Playwright vem em `.mcp.json`; `image-creator`/`image-fetcher` podem falhar no check do runner; arquivo "SHARED" fica preso ao Claude | `runner.pipeline.md:90`, `skills.engine.md:7,166-207` | F3 | teste de referência MCP |
| T-A2 | alta | Criar crew entrega o fluxo a um "SKILL.md orchestrator" que não existe; ninguém define a sequência Discovery → Sherlock → Design → Build; os prompts se contradizem sobre quem chama o Sherlock | `architect.agent.yaml:57-70`, `sherlock-shared.md:7,24` | F3 | `create.prompt.md` + teste |
| T-A3 | alta | Pipeline padrão roda publicar/enviar **antes** do Review e da aprovação final | `design.prompt.md:528-529,558-559`, `build.prompt.md:561-573` | F1 | F1-08 |
| T-A4 | alta | Retry automático re-executa o passo inteiro; uma publicação que deu certo sem escrever o output é publicada de novo | `runner.pipeline.md:549-553,811`, `publish.js:150` | F1 | F1-09 |
| T-A5 | alta | `instagram-publisher`: caminho `crews/{crew}/tools/publish.js` inexistente; pasta de imagens ignora `{run_id}/vN/`; "só JPEG" com renderizador que gera PNG | `skills/instagram-publisher/SKILL.md:42,50,60` | F1 | `template-refs.test.js` |
| T-A6 | alta | `image-ai-generator` chama `skills/image-generator/...` (a pasta é `image-ai-generator`); `python3` não existe no Windows | `skills/image-ai-generator/SKILL.md:58,69,81` | F1 | `template-refs.test.js` |
| T-A7 | alta | Best-practices aprendidas são gravadas em `_opencrew/core/best-practices/`, que o `update` sobrescreve: o conhecimento do usuário some | `runner.pipeline.md:723`, `opencrew-best-practice-creator/SKILL.md:70,80` | F2 | overlay `best-practices.local/` + teste |
| T-A8 | alta | Dois mecanismos de sessão de browser incompatíveis (Sherlock com `npx playwright --save-storage` × MCP com `userDataDir`); o fluxo salva sessão vazia | `sherlock-shared.md:96-121,211-225` | F3 | — (revisão humana) |
| T-A9 | alta | Subagentes do Sherlock "perguntam ao usuário", mas subagentes não falam com o usuário; o Discovery já perguntou | `sherlock-shared.md:704-740` | F3 | teste de conteúdo |
| T-A10 | alta | `crew.yaml` e `pipeline.yaml` sem formato definido; o runner conta passos num arquivo e percorre outro; `max_review_cycles`, `crew.tier` e `checkpoints:` são citados mas nunca definidos | `build.prompt.md:136`, `runner.pipeline.md:83,208,626` | F3 | exemplo canônico + teste de esquema |
| T-A11 | alta | Máquina de estados do run incompleta: `failed` nunca é atribuído, abortar não é registrado, o estado vive só na memória do modelo; run que estoura o contexto não retoma | `runner.pipeline.md:432-438,690,809-829` | F3 | `run-state.json` + `/opencrew resume` |
| T-A12 | alta | Nenhum controle de custo: lotes OpenRouter sem teto, atores Apify, envios em lote no Resend; retries multiplicam o custo; estimativas dos tiers 5–7× abaixo do real | `design.prompt.md:95-103`, `generate.py:148-164` | F3 | teto de lote no script + teste |
| T-M1 | média | Segredos coletados no chat e gravados em texto puro em `.claude/settings.local.json`, que o `gitignore` do template não cobre | `skills.engine.md:144-205`, `templates/gitignore` | F1 (gitignore) / F3 (`${VAR}`) | F1-06 |
| T-M2 | média | `--caption "{caption}"` interpolado no shell: legenda vinda de pesquisa web pode executar comando | `instagram-publisher/SKILL.md` | F1 | F1-10 |
| T-M3 | média | `publish.js` sobe qualquer caminho (até `.env`) para o imgBB público e sem expiração; token na query string | `publish.js:27-30,49-54,84,91` | F1 | F1-10 |
| T-M4 | média | As skills de publicação injetadas no run não têm a regra "preview → dry-run → confirmação explícita"; ela existe só numa best-practice que o runner não injeta | `instagram-publisher`, `blotato`, `resend` SKILL.md | F1 (instagram) / F3 (demais) | teste de conteúdo |
| T-M5 | média | Detecção da Regra de Ouro procura correções em `memories.md`, que por regra não guarda dados de run; os templates de memória não têm a seção | `runner.pipeline.md:761-766`, `build.prompt.md:27-40` | F3 | — |
| T-M6 | média | `memories.md` sem o cabeçalho exato `## Estilo de Escrita` é resetado sem backup | `runner.pipeline.md:49-55` | F3 | — |
| T-M7 | média | Skills geradas vão para `skills/.custom/`, mas a detecção de "instalada" só olha `skills/<nome>/` | `skills.engine.md:31,285` | F3 | — |
| T-M8 | média | Instalação remota busca scripts no `main` mutável e roda `npm install`/`pip install` global (cadeia de suprimentos); redundante, já que o `init` copia o catálogo | `skills.engine.md:119-137,214` | F3 | — |
| T-M9 | média | Desinstalar uma skill de catálogo é desfeito no próximo `update` | `skills.engine.md` Op 4, `update.js:64` | F2 | `skills/.disabled` + teste |
| T-M10 | média | `AGENTS.md` manda sempre gravar "key learnings"; o runner diz "só feedback explícito" | `AGENTS.md:118`, `runner.pipeline.md:706,728` | F3 | — |
| T-M11 | média | Todos os agentes são carregados no início e de novo antes de cada passo (8–12k tokens dobrados) | `AGENTS.md:79`, `runner.pipeline.md:238` | F4 | — |
| T-M12 | média | Arquivos "SHARED/IDE-neutral" citam ferramentas do Claude, `.claude/` e `src/lib/ides.js` (que não existe no projeto do usuário) | `runner.pipeline.md:3-7,209,493` | F3 | teste "payload sem `src/`" |
| T-M13 | média | "Nunca use Bash mkdir" × "crie a pasta com `mkdir -p`" | `architect.agent.yaml:35`, `runner.pipeline.md:194` | F3 | — |
| T-M14 | média | Templates de crew copiados para `crews/` aparecem como crews e podem ser apagados; escolher template pula a pergunta de propósito | `discovery.prompt.md:39-66` | F3 | — |
| T-M15 | média | A lista de formatos inclui `copywriting`, `review`, `_catalog.yaml` | `discovery.prompt.md:194` | F3 | — |
| T-M16 | média | `discovery.yaml` gravado num caminho relativo e lido em `crews/{code}/_build/` | `discovery.prompt.md:237` | F3 | — |
| T-M17 | média | Tier Express: "writer se auto-revisa" × reviewer obrigatório | `design.prompt.md:109-110` | F3 | — |
| T-M18 | média | Tier Full: "Sherlock sempre", mas o tier é escolhido depois do Sherlock | `design.prompt.md:111` | F3 | — |
| T-M19 | média | `id:` do agente é um caminho, mas seleção e filtro usam o id curto do CSV: a seleção filtra errado em silêncio | `build.prompt.md:176,379`, `runner.pipeline.md:172` | F3 | — |
| T-M20 | média | Agentes base sem `title:` e fora do formato do Build: um `extends:` reprova no Gate 1 | `_opencrew/agents/*.agent.md` | F3 | teste de formato |
| T-M21 | média | Export em PDF com `npx playwright open` + "imprimir" não é executável; `lang="pt-BR"` fixo | `export.prompt.md:50-55` | F3 | — |
| T-B1 | baixa | Numeração do carregamento de agentes 1,2,3,5,6,4; `2.` duplicado | `runner.pipeline.md:236-311,649` | F4 | — |
| T-B2 | baixa | Runner procura `Dashboard: enabled`, mas o arquivo grava `- **Dashboard:** enabled`: o toggle nunca casa | `runner.pipeline.md:22`, `preferences.md:11` | F1 | F1-12 |
| T-B3 | baixa | `dashboard/index.html` não vai no pacote, e os dois arquivos o descrevem de formas diferentes | `AGENTS.md:93`, `runner.pipeline.md:21` | F4 | `package.test.js` |
| T-B4 | baixa | "Load Architect / Skills Engine" sem caminho; `/opencrew help` e `/opencrew reset` (destrutivo) não definidos | `templates/AGENTS.md:48,54,61` | F3 | — |
| T-B5 | baixa | `outputFile` de checkpoint com formato "Research Focus" fixo | `runner.pipeline.md:523-533` | F3 | — |
| T-B6 | baixa | Comando `runs` inexistente; "30 segundos" que o modelo não mede; bullets ●/○ fora da convenção | `runner.pipeline.md:700,793,806` | F3 | — |
| T-B7 | baixa | "Responda com um número" × "nunca diga 'responda com um número'"; "máx. 8 perguntas" inviável | `discovery.prompt.md:10,17,304` | F3 | — |
| T-B8 | baixa | "O runner faz merge" × "sem merge em runtime"; "design from scratch" contradiz o registro compartilhado | `design.prompt.md:368`, `build.prompt.md:162` | F3 | — |
| T-B9 | baixa | Papel Publisher mapeado para `apify` (um scraper) | `design.prompt.md:252` | F3 | — |
| T-B10 | baixa | Frontmatter de skills inconsistente (`name` ≠ id, sem `categories`, `invoke` exigido mas fora da spec; `type: prompt` com scripts) | skills | F3 | teste de frontmatter |
| T-B11 | baixa | `generate.py`: `choices: []` dá IndexError; extensão forçada; imagem de referência ausente é ignorada; modelos fixos no código | `generate.py:67,109,124` | F3 | — |
| T-B12 | baixa | `gitignore` sem `crews/*/state.json`, `_build/`, `_investigations/`; `_opencrew/logs/` e `_opencrew/_investigations/` não são usados | `templates/gitignore` | F1 | F1-06 |
| T-B13 | baixa | Mistura de PT/EN; PT sem acento no design; `.env.example` lista 1 de 3 escopos necessários | vários | F4 | — |

**Crescimento sem poda** (dono: F4, `/opencrew cleanup` + retenção): `runs.md` só cresce;
`output/{run_id}/vN/` e cópias de `state.json` nunca são apagados; `_investigations/`
guarda `.wav` e screenshots; Regras de Ouro e `memories.md` não têm limite de tamanho.

**Duplicação** (dono: F4): templates de `memories.md`/`runs.md` repetidos 3×; resolução
de skill escrita 2× (runner e engine); geração dinâmica de skill 2×; persona do architect
copiada no design; timeouts do Sherlock 2×.

### 2.3 Documentação, release e superfície

| ID | Sev | Achado | Onde | Dono | Trava |
|---|---|---|---|---|---|
| D-01 | alta | README diz que `dashboard/index.html` é instalado; não está no pacote (`files`, `.npmignore`) nem é copiado | `README.md:189-190` | F0 (doc) / F4 (decisão) | `package.test.js` |
| D-02 | média | README diz que `update` atualiza as pontes; não atualiza (só `AGENTS.md` e `system.md`). `--repair-bridges` não está documentado | `README.md:208` | F0 | — |
| D-03 | média | README promete "nada se perde" na migração do legado; a migração apaga conteúdo do usuário | `README.md:210-212` | F0 (doc) / F1 (código) | F1-04 |
| D-04 | média | CHANGELOG 1.4.0 incompleto: faltam migração do AGENTS.md legado, STATUS no CLAUDE.md, fix do Antigravity, pontes `.agents/`, `--repair-bridges` | `CHANGELOG.md:11-26` | F0 | — |
| D-05 | média | `AGENTS.md` da raiz era cópia manual do runtime e a mudança pendente no `.gitignore` o mandaria para o git: qualquer IA no repo agiria como o produto | `.gitignore`, `AGENTS.md` | F0 | `AGENTS.md` de dev + `sandbox/` |
| D-06 | média | Dashboard: nomes de agente e rótulos inseridos como HTML cru (XSS via `state.json` escrito a partir de conteúdo web); modo live procura `state.json` no lugar errado, não funciona via `file://` e congela se o primeiro poll falha | `dashboard/index.html:266-268,278,337` | F4 | — |
| D-07 | baixa | IDEIAS #7 diz que `.gitignore`/`.env.example` recebem append; não recebem | `IDEIAS.md` | F0 (doc) / F1 (código) | F1-05, F1-06 |
| D-08 | baixa | Contagens divergentes (23 guias vs 22, 12 prompts vs 13, contagens de testes); Windsurf citado sem suporte; Gemini/Qwen sem `.agents/skills`; flags `upgrade`, `-y`, `-v`, `-h` não documentadas; promessa de "30-70% de economia" sem base; template de PR com rodapé "Generated with Claude Code" | `README.md`, `CHANGELOG.md`, `.github/PULL_REQUEST_TEMPLATE.md` | F0 (as que mentem) / F4 | — |

---

## 3. Roadmap por fase

| Fase | Versão | Objetivo | Itens |
|---|---|---|---|
| **F0** | — | Governança: regras de dev, porta única, travas, docs que mentem | D-01..05, D-07, D-08 (parcial), C-19 (parcial), C-27 (parcial) |
| **F1** | 1.4.2 | Parar de causar dano ao usuário | C-02..07, C-16, C-21 (bin), C-22 (cli), C-24, T-A3..A6, T-M1 (gitignore), T-M2..M4 (instagram), T-B2, T-B12 |
| **F2** | 1.5.0 | `update` confiável | C-01, C-08..13, C-21..23, C-25..27, T-A7, T-M9 + estrutura `src/modules/{install,upgrade,bridges}` |
| **F3** | 1.6.0 | Coerência do runtime | T-A1, T-A2, T-A8..A12, T-M4..M8, T-M10, T-M12..M21, T-B4..B11 |
| **F4** | 1.7.0 | Tokens, infra e superfície | C-14, C-15, C-17, C-18, C-19 (OIDC/SHA), C-20, T-M11, T-B1, T-B3, T-B13, D-06, D-08 (restante), poda e duplicação |

Cada fase abre com o **portão de entrada** (varrer `Alocação: → Fase N` neste relatório e no
`IDEIAS.md`) e fecha com a **auditoria de fim de fase** (`governance.md` §7).

## 4. Estado do IDEIAS.md

As 10 ideias registradas estão marcadas como feitas, mas a #7 (instalação não-destrutiva)
está **parcial**: as pontes fazem merge, `.gitignore` e `.env.example` não (D-07 → F1).
As ideias concluídas saíram do `IDEIAS.md` (o histórico fica no CHANGELOG). Entraram, com
triagem: decisão sobre o dashboard, `/opencrew resume`, orçamento de custo,
`/opencrew cleanup` e divisão do runner.

---

## 5. Auditorias de fim de fase

(seções acrescentadas ao fechar cada fase: achado → trava criada)

### Fase 1 — hotfix 1.4.2 (2026-10-02)

Resultado: 15 achados de severidade alta/média resolvidos (C-02..07, C-16, C-24, T-A3..A6,
T-M2, T-M3, T-B2, T-B12), todos com teste de mesmo ID da spec. Porta: 152 testes, 0 falhas,
0 `todo`, `KNOWN_BROKEN` vazio.

| Checklist (governance.md §7) | Constatação | Trava |
|---|---|---|
| 1. Regra sem trava | Regras 1, 9, 10 e 11 do `AGENTS.md` seguem como revisão humana (declarado) | — |
| 2. Trava de um lado só | "Payload sem mantenedor" olhava só as pontes e o gitignore | ampliada: `template-refs.test.js` varre todo o `templates/` (proveta: arquivo plantado → exit 1) |
| 3. Verde pelo motivo errado | F1-02a passaria mesmo com `update` executado (reescrita idêntica) | o teste grava stamp antigo antes do snapshot |
| 3. Verde pelo motivo errado | F1-01d e F1-13a já passavam antes do conserto | aceitos como guarda de regressão (comportamento já correto) |
| 5. Guarda menor que a promessa | Marcador órfão: a 2ª escrita apagava linhas do usuário | regex do bloco mais interno + F1-06c com duas escritas |
| 5. Guarda menor que a promessa | `template-refs` não varre os `.js`/`.py` das skills | → F3 (junto com a validação de esquema) |
| 7. Doc que o código não sustenta | README dizia "até a v1.4.1 se perde" / sem `--dry-run` / sem bloco no `.gitignore` | README corrigido no mesmo commit |
| 8. Travas com proveta | `verify` (proveta em `verify.test.js`), conteúdo do mantenedor (plantado), `KNOWN_BROKEN` (teste de lista obsoleta) | — |
| 9. Aprendizados | Pipe do PowerShell mascarou exit code **2 vezes** na sessão | padrão anotado no STATUS; a porta não usa pipe (`spawnSync` direto) |

**Achados novos** (entram na tabela §2 na próxima revisão):
- T-B14 (baixa) — `publish.js` e outros scripts `.js` das skills usam ESM; num projeto do
  usuário sem `"type": "module"` só rodam em Node ≥ 22.12 (detecção de sintaxe). → F4,
  junto com `engines` (C-18).
- T-B15 (baixa) — crews criadas antes da 1.4.2 mantêm "publicar antes do Review" até serem
  recriadas. → F3 (`/opencrew repair` reordena passos irreversíveis).

**Não coberto pela porta e não conferido nesta sessão:** a execução real de uma crew por uma IA
seguindo F1-08/F1-09 e o fluxo de confirmação do Instagram (F1-10e). Conferência manual no
`sandbox/` → dono do repositório, antes ou logo depois do release.
