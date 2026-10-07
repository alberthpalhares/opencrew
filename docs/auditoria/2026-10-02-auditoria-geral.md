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
| T-B3 | baixa | `dashboard/index.html` não vai no pacote, e os dois arquivos o descrevem de formas diferentes (resolvido na E1, 1.7.0) | `AGENTS.md:93`, `runner.pipeline.md:21` | F4 | `package.test.js` |
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
| D-01 | alta | README diz que `dashboard/index.html` é instalado; não está no pacote (`files`, `.npmignore`) nem é copiado (resolvido na E1, 1.7.0) | `README.md:189-190` | F0 (doc) / F4 (decisão) | `package.test.js` |
| D-02 | média | README diz que `update` atualiza as pontes; não atualiza (só `AGENTS.md` e `system.md`). `--repair-bridges` não está documentado | `README.md:208` | F0 | — |
| D-03 | média | README promete "nada se perde" na migração do legado; a migração apaga conteúdo do usuário | `README.md:210-212` | F0 (doc) / F1 (código) | F1-04 |
| D-04 | média | CHANGELOG 1.4.0 incompleto: faltam migração do AGENTS.md legado, STATUS no CLAUDE.md, fix do Antigravity, pontes `.agents/`, `--repair-bridges` | `CHANGELOG.md:11-26` | F0 | — |
| D-05 | média | `AGENTS.md` da raiz era cópia manual do runtime e a mudança pendente no `.gitignore` o mandaria para o git: qualquer IA no repo agiria como o produto | `.gitignore`, `AGENTS.md` | F0 | `AGENTS.md` de dev + `sandbox/` |
| D-06 | média | Dashboard: nomes de agente e rótulos inseridos como HTML cru (XSS via `state.json` escrito a partir de conteúdo web); modo live procura `state.json` no lugar errado, não funciona via `file://` e congela se o primeiro poll falha (resolvido na E1, 1.7.0) | `dashboard/index.html:266-268,278,337` | F4 | — |
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

> **Emenda (2026-10-02, depois da F1; substituída pela de 2026-10-04, logo abaixo):** o
> diagnóstico de **uso real** (`docs/jornada/2026-10-02-uso-real.md`) mudou a ordem. As trilhas
> de experiência "U" vêm primeiro; os itens técnicos das fases F2–F4 entram na trilha que os
> usa. A tabela acima vale como inventário; a ordem de execução é esta:
>
> | Trilha | Versão | Absorve da tabela acima |
> |---|---|---|
> | **U1 Revisor com dentes** | 1.5.0 | — (achado novo do uso real); T-M5 parcial (memória de proibições lida pelo verificador) |
> | **U2 Crew que conhece o projeto + U6 Convivência** | 1.6.0 | F2 inteira (C-01, C-08..13, T-A7, T-M9…), C-14, C-17, T-M5, T-M6, T-M10 |
> | **U3 Entrega no projeto** | 1.7.0 | T-M21 (export), T-B3/D-06 (dashboard: decidir), instagram 4:5 |
> | **U4 Modo equipe + histórico confiável** | 1.8.0 | T-A2 (condutor da criação), T-A10, T-A11 (retomar), T-B15 |
> | **U5 Rápido, barato e em PT-BR** | contínuo | T-A1, T-A8, T-A9, T-A12, T-M11, T-B13, runner dividido, C-18/C-19 (infra) |
> | **U0 Processo** | sempre | jornada de referência (`docs/jornada/roteiro-de-teste.md`) antes de cada release |

> **Emenda (2026-10-04, depois da revisão das specs):** a revisão de 2026-10-04
> (`docs/auditoria/2026-10-04-revisao-specs.md`) achou defeitos no que já está publicado (1.6.0)
> e não recomendou aprovar a spec da U3 como estava. O dono aceitou as recomendações. A ordem de
> execução passa a ser a da tabela abaixo; o destino de cada achado da revisão (IDs A a I, H1 a
> H3 e Z) está no §7 daquele relatório. Nesta emenda, C-xx, D-xx e T-xx são sempre achados deste
> documento (§2; T-B14 e T-B15, §5); da revisão só aparecem IDs G, H1, H2 e H3. Onde este
> documento diz F2, F3 ou F4 (legenda e coluna "Dono" do §2, §1, tabela do §3 e §5), vale o
> destino desta emenda.
>
> | Trilha | Versão | Absorve |
> |---|---|---|
> | **R1 Reparos da 1.6.0: o verificador mede de verdade** | 1.6.1 | Defeitos do verificador, da conferência de fontes e do laço de revisão (lista no §7 da revisão); C-12 (`--repair-bridges` sem `--ide`, H3-02); de T-A10, só o `max_review_cycles` (H2-06) |
> | **U3a Entrega por canal** | 1.8.0 (fatia 1: a pasta `entrega/`) e 1.9.0 (fatia 2: destino, ressalvas e publicação) | T-M21 (export e PDF); T-B3/D-01/D-06 (dashboard: resolvido na E1, 1.7.0); bloco do `.gitignore` renovado pelo `update`; assunto de e-mail e WhatsApp medidos (spec U1 §11, H2-13); aviso de arquivo citado dentro das fontes; H2-07, H1-02, H1-03, H1-07, H1-08, H1-10, H1-15, H1-20 |
> | **U3b Documento Word** | 1.10.0 | Dor 6 do uso real: documento oficial em `.docx` (gerador próprio, em perfil fechado) |
> | **R2 `update` e envio seguros** | 1.6.3 | T-M4 (resto: `blotato` e `resend`, H1-04); H1-06, H3-06, H3-09, H3-10, H3-11, H3-14, H3-19. Vem depois da R1 e antes da U3a (decisão do dono, 2026-10-05) |
> | **E1 Escritório ao vivo** | 1.7.0 | T-B3, D-01 e D-06: o dashboard virou o Escritório e passou a ser instalado. Vem depois da R2 e antes da U3a (decisão do dono, 2026-10-05) |
> | **R3 Reparos do runner em uso real** | 1.7.1 | A entrada de um passo não acha a saída do anterior (pasta de versão); comandos do runner e do discovery só em bash. Achados da execução real de 2026-10-06 (`IDEIAS.md`). Aprovada pelo dono em 2026-10-06; vem antes da U3a; spec a escrever |
> | **U4 Modo equipe + histórico confiável** | 1.11.0 | T-A2 (condutor da criação), T-A10, T-A11 (retomar), T-B15 e o conserto (`repair`) de crews antigas (H1-01, H2-05, H3-03); T-M5 (H3-08); T-M14, T-M17..20, T-B6, T-B8 |
> | **U5 Rápido, barato e em PT-BR** | contínuo | T-A1, T-A8, T-A9, T-A12, T-M11, T-B13, runner dividido, C-18/C-19 (infra); C-11, C-20..23, C-25..27, T-M9 e busca semântica nas fontes (spec U2 §11; ela escreve "C-20..27", mas o C-24 saiu na F1); C-15, T-M1 (segredos em texto puro), T-M7, T-M8, T-M12, T-M13, T-M15, T-B1, T-B4, T-B5, T-B7, T-B9..B11, T-B14; D-08 (restante), poda e duplicação, estrutura `src/modules/` prevista na F2 (não feita; sem rastro, H3-12); H2-17, H3-07, H3-16, H1-19, G-29, H3-01 (arquivo de acréscimo) |
> | **U0 Processo** | sempre | jornada de referência (`docs/jornada/roteiro-de-teste.md`) antes de cada release. Pendente, com o dono: uma execução real com o verificador no laço de revisão (H2-14) e a conferência manual de publicação no Instagram (F1-10e, H1-12); o roteiro ainda não confere fontes, correção gravada nem pergunta do perfil (H3-18) |
>
> **Já feito:** na 1.4.2, os itens da F1 (ver §5). Conferido no código da 1.6.0: da 1.5.0, o
> Instagram em 4:5 com no máximo 10 slides (U1-05) e as proibições da memória lidas pelo
> verificador (parte do T-M5); da 1.6.0, C-01, C-08, C-09, C-10, C-13, C-14, T-A7, T-M6, T-M10 e
> T-M16, e o C-17 pelo caminho da spec U2 (U2-08): o bloco continua no início do arquivo, mas só
> vale com `/opencrew` e cede a prioridade às outras instruções do projeto. Ficaram com ressalva:
> C-01 (H3-11 → R2), C-10 (H3-10 → R2), C-13 (H3-09 → R2), C-17 (H3-06 → R2) e T-A7 (H3-01 → R1 e
> U5; H3-07 → U5). A emenda de 2026-10-02 dava a U2 como dona da "F2 inteira" e do T-M5: a
> própria spec U2 adiou C-11, T-M9 e C-20..27 (→ U5; desses, o C-24 já tinha saído na F1), e C-12
> e T-M5 constavam como cobertos sem terem sido feitos (H3-02 → R1; H3-08 → U4; H3-12).
>
> **Achados do §2 que estavam sem trilha** (G-25). Conferidos no código da 1.6.0: todos continuam
> valendo.
>
> | ID | Destino | Motivo |
> |---|---|---|
> | T-M4 (resto) | R2 | `blotato` e `resend` enviam sem prévia nem confirmação (H1-04) |
> | T-M5 | U4 | a Regra de Ouro precisa de histórico confiável para contar ocorrências (H3-08) |
> | T-M7 | U5 | polimento: skill gerada em `skills/.custom/` não conta como instalada |
> | T-M8 | U5 | segurança de instalação: scripts buscados no `main`, que muda |
> | T-M12 | U5 | polimento: arquivo "para todas as IDEs" cita ferramenta de uma só |
> | T-M13 | U5 | polimento: instruções opostas sobre `mkdir` |
> | T-M14 | U4 | formato de crew: modelo aparece na lista como se fosse crew |
> | T-M15 | U5 | polimento: lista de formatos do discovery (junto do H3-07) |
> | T-M17 | U4 | formato de crew: no tier Express, "o redator se revisa" × revisor obrigatório |
> | T-M18 | U4 | formato de crew: ordem da criação, junto de T-A2 |
> | T-M19 | U4 | formato de crew: `id` do agente, junto de T-A10 |
> | T-M20 | U4 | formato de crew: agentes-base fora do formato do Build |
> | T-B4 | U5 | polimento: comandos do `system.md` sem definição |
> | T-B5 | U5 | polimento: saída de checkpoint com formato fixo |
> | T-B6 | U4 | histórico: o comando `runs` não existe; tempo e marcadores vão junto |
> | T-B7 | U5 | polimento: instruções opostas no discovery |
> | T-B8 | U4 | formato de crew: `extends:` e quem faz o merge |
> | T-B9 | U5 | polimento: papel Publisher ligado a um scraper |
> | T-B10 | U5 | polimento: frontmatter das skills |
> | T-B11 | U5 | custo: robustez do `generate.py`, junto de T-A12 |
> | C-15 | U5 | superfície do CLI: a mensagem final manda digitar `/opencrew` em IDE sem o comando |
> | T-B14 | U5 | infraestrutura: Node mínimo, junto de C-18 (H1-19) |

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
| 5. Guarda menor que a promessa | `template-refs` não varre os `.js`/`.py` das skills | → U4 (junto com a validação de esquema, T-A10; era "F3") |
| 7. Doc que o código não sustenta | README dizia "até a v1.4.1 se perde" / sem `--dry-run` / sem bloco no `.gitignore` | README corrigido no mesmo commit |
| 8. Travas com proveta | `verify` (proveta em `verify.test.js`), conteúdo do mantenedor (plantado), `KNOWN_BROKEN` (teste de lista obsoleta) | — |
| 9. Aprendizados | Pipe do PowerShell mascarou exit code **2 vezes** na sessão | padrão anotado no STATUS; a porta não usa pipe (`spawnSync` direto) |

**Achados novos** (entram na tabela §2 na próxima revisão):
- T-B14 (baixa) — `publish.js` e outros scripts `.js` das skills usam ESM; num projeto do
  usuário sem `"type": "module"` só rodam em Node ≥ 22.12 (detecção de sintaxe). → U5,
  junto com `engines` (C-18) (era "F4"; H1-19).
- T-B15 (baixa) — crews criadas antes da 1.4.2 mantêm "publicar antes do Review" até serem
  recriadas. → U4 (`/opencrew repair` reordena passos irreversíveis) (era "F3"; H1-01).

**Não coberto pela porta e não conferido nesta sessão:** a execução real de uma crew por uma IA
seguindo F1-08/F1-09 e o fluxo de confirmação do Instagram (F1-10e). Conferência manual no
`sandbox/` → dono do repositório, antes ou logo depois do release.
Situação em 2026-10-04: não há registro dessa conferência (H1-12). Segue pendente, com o dono,
na jornada de referência (U0).

### U1 — Revisor com dentes, 1.5.0 (auditoria feita em 2026-10-04)

Nenhuma auditoria de fim de fase foi escrita ao fechar a U1. A revisão das specs de 2026-10-04
(lente H2: spec × código, com segundo revisor) cumpre esse papel; o relatório é
`docs/auditoria/2026-10-04-revisao-specs.md` (§3, §4 e §7). Resultado: o verificador existe, roda
antes do revisor e pegou os defeitos reais do Projeto A na conferência offline. Mas há casos em
que ele não mede e responde `VERIFICACAO:OK`, e casos em que bloqueia texto correto.

| Constatação da revisão | Achados | Destino |
|---|---|---|
| Texto no formato que os próprios best-practices ensinam (`=== CAPTION ===`) não é medido | H2-01 | → R1 |
| Bloqueio falso: cor hexadecimal, `{{name}}` que os guias mandam usar, "XXX Congresso", CEP | H2-02, E-07, H2-15 | → R1 |
| Termo proibido casa dentro de outra palavra; o termo que o usuário mandou preferir vira proibido | H2-04 | → R1 |
| `max_review_cycles` sem definição; a saída do laço sem bloqueio sumiu | H2-06 | → R1 |
| Nota máxima 7 com alerta e checklist só do que foi medido não chegam a crews já criadas | H2-08 | → R1 |
| `--crew` inexistente passa; seções lidas de forma frágil; um caminho ruim derruba toda a checagem; fora da raiz do projeto responde `OK` | H2-10, H2-11, H2-12, Z-02 | → R1 |
| Trava do U1-05 não cobre os 4 arquivos corrigidos depois | H2-18 | → R1 |
| "Aceitar assim mesmo (fica registrado)" não registra; assunto de e-mail e WhatsApp sem medição | H2-07, H2-13 | → U3a (o resto do H2-13: Reels, YouTube, artigo do LinkedIn, hashtags do tweet → U5) |
| Relatório do laço de revisão salvo pela IA, não pelo script | H2-16 | → U5 |
| Proibições antigas, sem aspas, não viram trava | H2-05 | → U4 |
| Contagem de caracteres igual em todos os canais (no X, emoji e link pesam diferente) | H2-17 | → U5 |
| Spec e glossário com dois estados do verificador (são três); status "implementada" sem execução real | H2-09, A-34, H2-14 | faxina de documentos de 2026-10-04; os dois comentários de `verificar.mjs` que ainda citam só dois estados (payload) → R1 |

**Não coberto pela porta e não conferido:** uma IA rodando o verificador dentro do laço de revisão
e respeitando o REJECT forçado. Não há execução real registrada (H2-14) → jornada de referência
(U0), com o dono.

### U2 — Crew que conhece o projeto, 1.6.0 (auditoria feita em 2026-10-04)

Nenhuma auditoria de fim de fase foi escrita ao fechar a U2. A revisão de 2026-10-04 (lente H3)
cumpre esse papel; mesmo relatório. Resultado: `fontes:`, conferência de fontes, overlay local e
`update` com cópia de segurança estão no código e têm teste. Os Projetos A e B foram atualizados
para a 1.6.0 pelo npm, com autorização do dono, sem dado alterado; no Projeto B a conferência com
`--corrigir` foi rodada com autorização (5 caminhos corrigidos).

| Constatação da revisão | Achados | Destino |
|---|---|---|
| Overlay local: arquivo sem `constraints:` desliga o verificador do formato; a cópia inteira congela os limites | H3-01 | → R1 (mescla com o core e nota); → U5 (arquivo de acréscimo, aviso no `update`) |
| `--repair-bridges` sem `--ide` cria pontes das 9 IDEs (C-12 constava como coberto) | H3-02 | → R1 |
| Conferência não vê `fontes:` com comentário na linha, nem tasks e agentes; falha do script e recarga sem regra; mensagens que enganam; `--crew` de fora do projeto é aceito | H3-04, H3-05, H3-15, H3-17, I-14 | → R1 |
| `update`: a palavra "opencrew" num arquivo do usuário cria ponte de IDE não instalada; `.mcp.json` recriado e regravado sem cópia; ponte sem marcador (até a 1.2.2) segue mandando "adotar o papel" | H3-10, H1-06, H3-09, H3-06 | → R2 |
| `update`: agentes-base e modelos de crew nunca recebem melhoria, e modelo apagado volta; manifesto corrompido sem aviso; restos antigos só em 5 pastas | H3-11, H3-14, H3-19 | → R2 |
| `fontes:` não chega a crews que já existem; a Regra de Ouro (T-M5) constava como herdada e segue quebrada | H3-03, H3-08 | → U4 |
| Best-practice criada no overlay não é vista por discovery, design e build; o alerta "não é portátil" nunca vira oferta de correção | H3-07, H3-16 | → U5 |
| Decisão do dashboard alocada na U3 e não herdada pela spec | H3-20 | → E1 (decidido em 2026-10-05: publicar) |
| Spec com arquivos de teste errados; itens adiados sem rastro; termos fora do glossário | H3-13, H3-12, H3-21 | faxina de documentos de 2026-10-04 |
| O roteiro da jornada U0 não tem passo nem métrica para o que a spec manda conferir nela (fontes conferidas no início, correção gravada, pergunta do perfil) | H3-18 | → U0 (`docs/jornada/roteiro-de-teste.md`), pendente |

**Não coberto pela porta e não conferido:** as regras que a IA segue ao executar (fontes lidas no
início, correção gravada no checkpoint, pergunta do perfil da empresa). Não há execução real
registrada → jornada de referência (U0), com o dono.
