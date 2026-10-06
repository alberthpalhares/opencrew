# Changelog

All notable changes to opencrew are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Não lançado]

Fase E1 "Escritório ao vivo — a equipe trabalhando, em 8 bits"
(`specs/fase-e1-escritorio-ao-vivo.md`). Chega a quem já usa com um
`npx @aksp/opencrew@latest update`. O número da versão entra quando a fase for fechada.

### Added
- **Escritório ao vivo.** Uma página em pixel-art, aberta no navegador, mostra a crew
  trabalhando: cada agente na sua mesa, digitando na vez dele, levando o papel ao colega na
  passagem de bastão, de mão levantada quando espera a sua resposta, com ✓ quando termina e "!"
  quando falha. Ao lado, o passo atual, a lista dos agentes com o status por extenso e o que cada
  um fez, e a última passagem de bastão. O título da aba acompanha a execução.
- **`/opencrew dashboard`** liga o Escritório, sobe a página e mostra o endereço
  (`http://127.0.0.1:4747`, ou a porta livre seguinte); repetir o comando devolve o mesmo
  endereço. **`/opencrew dashboard off`** desliga. Continua desligado por padrão.
- Roda só no seu computador, sem internet e sem medição: o servidor
  (`_opencrew/core/scripts/escritorio.mjs`) escuta só em `127.0.0.1`, só lê e não escreve em disco.
- Sem execução nenhuma, a página roda uma demonstração e troca sozinha para a execução real
  quando ela aparece (`?demo` no endereço força a demonstração). Com mais de uma crew, mostra a
  de atualização mais recente e um seletor com as outras.
- A página não mente sobre o que não sabe: execução há mais de 2 minutos sem novidade mostra há
  quanto tempo foi a última atualização; há mais de 20, o agente sai da pose de digitar e aparece
  "sem sinal". Servidor fora do ar: a página avisa e tenta de novo sozinha.

### Changed
- **Quem avisa o Escritório é um script, não a IA escrevendo JSON.** Com o Escritório ligado, o
  runner roda um comando curto por passo (`_opencrew/core/scripts/estado.mjs`). Checkpoint, agente
  pulado e execução que falha passam a aparecer; antes nunca eram gravados. Falha desse comando
  não para a execução: o runner avisa uma vez e segue.
- **Com o Escritório ligado, o estado final deixa de ser copiado para
  `crews/<crew>/output/<run>/state.json`.** O estado da execução mora só em
  `crews/<crew>/state.json`.
- `state.json`: os agentes ganham os status `checkpoint` e `failed` e o campo `label`; a
  execução ganha `checkpoint` e `failed`; `desk` e `delivering` deixam de ser gravados. Arquivo
  gravado por versão anterior continua sendo lido pela página.
- Os prompts de criar e de consertar crew não escrevem mais `state.json`.
- README: a nota "o dashboard não é instalado" deu lugar à seção "Escritório ao vivo".

### Removed
- A pasta `dashboard/` do repositório (o desenho antigo, que nunca foi instalado pelo `init`). O
  que servia migrou para `_opencrew/core/escritorio/`, sem os defeitos apontados na auditoria:
  nome de agente entrava na página como HTML, o modo ao vivo lia o arquivo no lugar errado e a
  página congelava se a primeira leitura falhasse.

### Internal
- `npm run verify`: o lint passa a cobrir `templates/_opencrew/core/escritorio/` (com os nomes
  globais de navegador) e o alerta de tamanho mede os `.js` dessa pasta. Travas novas:
  `tests/estado*.test.js`, `tests/escritorio*.test.js`, `tests/runtime-contracts-e1.test.js`,
  `tests/docs-e1.test.js` e os cenários E1-07a, E1-07c e E1-upg nos testes de pacote, de
  referências e de upgrade. A trava de conteúdo do mantenedor passa a ler também `.mjs` e `.css`.

## [1.6.2] — 2026-10-05

Correção da 1.6.1. Chega a quem já usa com um `npx @aksp/opencrew@latest update`.

### Fixed
- **Node 20: o verificador não esgota mais a memória com texto grande.** Um post, tweet ou
  legenda de dezenas de milhares de caracteres numa peça só derrubava o verificador no Node 20,
  sem relatório (o runner avisava que a verificação não rodou). A contagem de caracteres passou a
  ser feita em janelas, com o mesmo resultado. O defeito vinha da 1.5.0; Node 22 e 24 não o
  tinham.

### Internal
- Release: a tag só sai depois do CI verde nas quatro células (Ubuntu e Windows, Node 20 e 22).
  A 1.6.1 foi publicada com o CI do Node 20 vermelho, porque a publicação roda só no Node 22.

## [1.6.1] — 2026-10-05

Fase R1 "Reparos da 1.6.0: o verificador mede de verdade" (`specs/fase-r1-reparos-1-6-1.md`),
vinda da revisão das specs (`docs/auditoria/2026-10-04-revisao-specs.md`). Chega a quem já usa com
um `npx @aksp/opencrew@latest update`.

### Fixed
- **O verificador mede o texto escrito com rótulos**, do jeito que os próprios best-practices
  ensinam (`=== CAPTION ===`, `=== HASHTAGS ===`, `=== SLIDES ===`, `=== HOOK ===`, `=== TWEET ===`,
  `=== TITLE ===`). Antes respondia "Nada a apontar" sem medir.
- **"Não medido" é dito**: com o formato informado e a peça principal não achada, o relatório
  alerta em vez de aprovar em silêncio. O resumo passa a ser
  `X bloqueios, Y alertas, Z não medidos`.
- **Bloqueios falsos**: cor hexadecimal (`#666666`), número comum, CEP e "XXX Congresso" não são
  mais "Placeholder"; `{{name}}` em e-mail e WhatsApp vira nota; termo proibido vale como palavra
  inteira ("IA" não bloqueia "dia a dia"); o termo que o usuário mandou preferir não é proibido.
- **Arquivo local sem limites não desliga o verificador**: os limites de
  `_opencrew/best-practices.local/` somam aos do core, chave a chave.
- **Erros que passavam por OK**: rodar fora da pasta do projeto ou com crew inexistente agora dá
  erro (código 1), sem linha de status; um arquivo ausente na lista não derruba a verificação dos
  outros; imagem e `.docx` não são lidos como texto; no HTML, só o texto visível e os links;
  arquivo de texto fora do UTF-8 vira alerta "Não verificado" (UTF-16 com marca é lido).
- **Relatório que não saía**: com o projeto aberto por junção ou link de pasta, os dois scripts
  terminavam sem imprimir nada.
- **Várias peças no mesmo arquivo** são medidas uma a uma (três posts não viram uma soma); a linha
  `---` não encerra mais a seção; slides contados nas escritas comuns ("📌 Slide 2", "Slide #3").
  Título e meta description em bloco YAML (`>-`, `|`) são medidos inteiros; `[PREENCHER: …]`
  longo não escapa; imagem e link de âncora não contam como link.
- **Conferência de fontes**: enxerga `caminho:` com comentário ou aspas e os arquivos de `agents/`
  (agentes e tasks); recusa crew de fora do projeto; mensagens corrigidas ("Não há correção
  automática…", aviso de busca parcial); caminho com marcador de modelo (`AAAA-MM-DD`) e comando
  entre crases não são conferidos; o `--corrigir` troca só o caminho citado (antes trocava
  qualquer trecho igual) e nunca aponta o destino de gravação de um agente para um arquivo que
  já existe.
- **`init --repair-bridges`** sem `--ide` regrava só as IDEs instaladas (antes criava as pontes
  das 9); `--all` regrava todas; o resumo lista as cópias de segurança. Numa pasta sem workspace,
  para com erro em vez de instalar; num workspace sem manifesto, não cria um.

### Changed
- **Runner**: passa o formato de cada arquivo ao verificador (`caminho=formato`); laço de revisão
  com 3 ciclos por padrão (`max_review_cycles`) e saída também quando não há bloqueio; regras do
  revisor injetadas em toda execução (valem para crews já criadas); avisa quando um script não
  rodou; a conferência de fontes roda antes de carregar as fontes; a aprovação final mostra o que
  ficou sem medir e as notas do relatório.
- Crew nova recebe o limite de ciclos de revisão pelo tier: Express 1, Standard 2, Full 3.
- Em blog, a seção com cabeçalho de outro canal ("Como postar no LinkedIn") não é medida como
  post, e o relatório diz isso ("Não medido").
- Hashtags sob um cabeçalho que cita o canal ("Hashtags LinkedIn") somam à peça desse canal.
- "Aceitar assim mesmo" não promete mais registro: o registro chega com a entrega por canal.
- Texto solto depois de uma linha `---` passa a contar na peça de cima. Telefone falso de 8 ou 9
  dígitos, fora de link, deixa de ser pego.

### Internal
- Scripts do runtime em módulos (`verificar/`, `conferir-fontes/`, `comum.mjs`); leitor de peças
  exportado para a próxima fase. Todos os cenários R1 com teste de mesmo ID; teste de upgrade
  1.6.0 → 1.6.1.
- Revisão do código antes da tag: sete leituras independentes e duas rodadas de conserto com
  teste; o que ficou adiado tem destino na spec (§11 e §12).
- Revisão das specs (265 achados) e faxina de documentos; specs R1, U3a e U3b.

## [1.6.0] — 2026-10-02

Trilha U2 "Crew que conhece o projeto" + U6 "Convivência" (`specs/fase-u2-crew-que-conhece-o-projeto.md`).

### Added
- **`fontes:` no `crew.yaml`** — arquivos/pastas do projeto (caminho relativo) que a crew lê em todo
  run e trata como verdade; o discovery pergunta quais são.
- **Conferência de fontes** (`_opencrew/core/scripts/conferir-fontes.mjs`) no início de cada run:
  arquivo movido → acha o novo lugar e oferece corrigir (`--corrigir`, com `.bak`); nome diferente →
  lista a pasta; caminho absoluto → alerta "não é portátil". No uso real (Projeto B) achou os 5
  caminhos quebrados pela reorganização, cada um com o lugar exato.
- **Correção gravada na hora** — o que o usuário corrige num checkpoint vai para a memória antes do
  próximo passo; termo removido vira proibição entre aspas (trava do verificador); conflito com o
  `company.md` gera a pergunta "Atualizo o perfil da empresa?".
- **`_opencrew/best-practices.local/`** — best-practices do usuário (aprendidas/criadas), lidas antes
  das do core e nunca tocadas pelo `update`; o verificador também lê os limites dali primeiro.

### Changed
- **`update` completo e seguro**: entrega pastas novas do framework (agentes-base, config, templates
  de crew) sem sobrescrever; guarda em `.opencrew-backup/<data>/` o que o usuário editou antes de
  substituir (manifesto `_opencrew/manifest.json`); recusa voltar para versão mais antiga; atualiza
  as pontes **só das IDEs instaladas**; faz merge do Playwright no `.mcp.json` (saída em
  `_opencrew/logs/playwright/`, outros servidores intactos); avisa sobre pontes antigas (`opensquad`).
- **Convivência**: pontes e bloco do `AGENTS.md` só ativam o OpenCrew com `/opencrew` (ou pedido
  sobre crews) e apontam direto para `_opencrew/core/system.md`; outras instruções do projeto têm
  prioridade no resto.
- Migração do formato de memória faz `memories.md.bak` e avisa (fim do reset silencioso); regra única
  sobre o que vai para a memória (só feedback explícito).
- `_build/discovery.yaml` agora em `crews/{code}/_build/`; build grava caminhos relativos à raiz.

## [1.5.0] — 2026-10-02

Trilha U1 "Revisor com dentes" — primeira melhoria vinda do uso real
(`docs/jornada/2026-10-02-uso-real.md`, `specs/fase-u1-revisor-com-dentes.md`).

### Added
- **Verificador automático** (`_opencrew/core/scripts/verificar.mjs`, Node puro): mede o texto
  ANTES do revisor usando os limites `constraints:` dos best-practices — título e meta description
  do blog, legenda e hashtags do Instagram, slides do carrossel, post do LinkedIn, tweets, links
  (alerta quando abaixo do mínimo). Bloqueia placeholders (`wa.me/55…9999…`, `[Empresa X]`,
  `lorem ipsum`…), termos entre aspas em `## Proibições Explícitas` da memória da crew e
  `[PREENCHER: …]`; alerta afirmações em 1ª pessoa com dado concreto (R$, %, ano passado,
  "N clientes"). Relatório em PT-BR com valor medido × limite; última linha
  `VERIFICACAO:OK | BLOQUEADA | AGUARDANDO_USUARIO`.
- **Regras de veracidade** injetadas em todo passo de criação: nunca inventar casos, depoimentos,
  números ou histórias em 1ª pessoa — usar `[PREENCHER: o que falta]`.

### Changed
- **Revisão com trava**: antes de todo passo com `on_reject`, o runner verifica **todas** as saídas
  desde o redator (não só a entrada do revisor — no uso real as legendas nunca eram revisadas);
  `VERIFICACAO:BLOQUEADA` força REJECT seja qual for a nota; no limite de ciclos o usuário escolhe
  corrigir, aceitar (registrado) ou abortar; a aprovação final mostra o resumo e pede os
  `[PREENCHER]`.
- `review.md`: o revisor copia os números do relatório (nunca estima), não aprova com bloqueio e
  tem nota máxima 7/10 com alerta não resolvido. `copywriting.md` e o build: regra de não inventar.
- **Instagram em 4:5**: carrossel/feed agora 1080×1350 (a API do Instagram só publica de 4:5 a
  1,91:1), no máximo 10 slides; presets do `image-creator`, `template-designer` (e modelos-base),
  `image-fetcher` e best-practices atualizados. Limites com nomes canônicos (`hashtags_max`).

### Internal
- Docs de jornada (`docs/jornada/`: uso real, roteiro de teste U0, medições) e roadmap de trilhas U.
- Regras de dev 12 (limite só vale se medido) e 13 (PT-BR para o usuário); alerta de tamanho e
  lint cobrem os scripts do runtime.

## [1.4.2] — 2026-10-02

Hotfix "parar de causar dano" (Fase 1 da auditoria — `specs/fase-1-hotfix.md`).

### Fixed
- **`CLAUDE.md` gerado não traz mais o fluxo STATUS.md do mantenedor** (vazado na 1.4.0/1.4.1);
  o `update` remove a seção de instalações existentes, sem tocar no texto do usuário.
  `STATUS.md` saiu do `.gitignore` do template.
- **`--help` nunca executa comando**: `update --help` / `-h` e `init --help` só mostram a ajuda.
  Parser estrito (`node:util.parseArgs`): opção desconhecida, `--ide` sem id válido ou
  argumento solto (`init minha-pasta`) falham com exit 1 **antes** de escrever qualquer arquivo.
  `--ide claude-code` (com espaço) e `-yv` funcionam. `update --dry-run` = `--check`.
- **`update` sem `AGENTS.md`** cria a ponte em vez de quebrar com ENOENT.
- **Migração do `AGENTS.md` legado faz backup** em `AGENTS.md.bak` (ou `.bak-<timestamp>`).
- **`.env.example` e `.gitignore` do usuário não são mais sobrescritos/ignorados**: recebem um
  bloco `# opencrew:start … # opencrew:end` no fim; as linhas do usuário ficam intactas.
  O bloco do `.gitignore` agora cobre `.claude/settings.local.json`, `crews/*/state.json` e
  `crews/*/_investigations/`.
- **Ctrl+C no prompt de IDEs não deixa instalação pela metade**: as IDEs são escolhidas antes
  da primeira escrita; cancelamento sai com 130 e "Cancelled — nothing was written.". Uma
  instalação interrompida (core sem stamp de versão) é **retomada** pelo próximo `init`.
- Erros inesperados mostram uma linha `✗ <mensagem>` (stack só com `OPENCREW_DEBUG=1`).
- Marcadores de bloco: um `start` órfão (fim apagado à mão) não faz mais a regravação engolir
  linhas do usuário.
- Skills: caminho do `image-ai-generator` corrigido (`{skill_path}/scripts/generate.py`, nota
  `py -3` no Windows); `instagram-publisher` lê as imagens da pasta do run atual; o
  `image-creator` renderiza JPEG quando o destino é Instagram.
- Runner: o toggle do dashboard reconhece o formato `- **Dashboard:** enabled` gravado no
  onboarding.

### Security
- **Publicar/enviar é sempre o último trecho do pipeline**: `… → Review → Final Approval
  checkpoint → [Publish/Send]` (design), com o novo Gate 2c BLOCKING no build. Passos com
  `side_effects: irreversible` rodam inline e **nunca** têm retry automático nem auto-correção
  de veto — o runner avisa que a ação pode já ter acontecido e pergunta.
- **`instagram-publisher`**: legenda via `--caption-file` (nunca interpolada no shell); só
  aceita `.jpg`/`.jpeg` dentro de `crews/*/output/`; upload no imgBB expira em 24h; token da
  Graph API no corpo dos POST, não na URL; fluxo preview → `--dry-run` → confirmação explícita
  ("publish"/"publicar") → publicação única.

### Changed
- Template `templates/AGENTS.md` (o `system.md` instalado) compactado (−24%) sem mudar o roteamento.

### Internal
- Testes por cenário da spec (F1-01a…F1-13a); trava nova: nenhum arquivo de `templates/`
  carrega conteúdo do mantenedor. `KNOWN_BROKEN` de referências zerado.

### Added (governança do repositório — Fase 0)
- Auditoria geral da v1.4.1 com roadmap por fases: `docs/auditoria/2026-10-02-auditoria-geral.md`.
- Regras de desenvolvimento em `AGENTS.md` (project-standards T3, tabela Regra → Trava);
  `CLAUDE.md` da raiz vira apontador versionado.
- Porta de verificação única `npm run verify` (`scripts/verify.js`): lint (agora inclui
  `bin/`), testes (descobertos automaticamente em `tests/`), version-sync e alerta de
  tamanho (`scripts/check-size.js`). CI e publish chamam a mesma porta.
- Travas novas: `tests/package.test.js` (conteúdo do tarball × README),
  `tests/template-refs.test.js` (caminhos citados nos prompts existem),
  `tests/verify.test.js` e `tests/check-size.test.js` (provetas).
- `GLOSSARIO.md`; `IDEIAS.md` reformatado com triagem e `Alocação: →`.

### Changed (governança do repositório — Fase 0)
- Dogfood do mantenedor sai da raiz e vai para `sandbox/` (fora do git).
- `publish.yml` confere a tag contra a versão do `package.json` e roda `npm run verify`;
  CI e publish usam só `npm ci` (sem fallback que esconde drift do lockfile).

### Docs (Fase 0)
- README: o dashboard não é instalado pelo `init`; `update` não atualiza as pontes de IDE
  (use `init --repair-bridges`); migração do `AGENTS.md` legado perde instruções extras;
  flags `upgrade`, `--ide`, `--all`/`-y`, `--repair-bridges` documentadas; contagens
  corrigidas (22 guias, 13 prompts); Windsurf removido da lista; promessa "30-70% de
  economia" sem base removida.

## [1.4.1] — 2026-08-04

### Fixed
- **NPM publish**: v1.4.0 já existia no registro. Re-publicado como 1.4.1.

## [1.4.0] — 2026-08-04

### Added
- **Seleção automática de agentes (IDEIAS #8)**: o Pipeline Runner agora analisa
  a solicitação do usuário contra uma matriz de decisão e sugere quais agentes são
  realmente necessários para aquela tarefa. O usuário confirma ou ajusta a seleção
  antes da execução. Agentes excluídos têm seus steps pulados automaticamente.
  - `runner.pipeline.md` — step 4b (Pre-Execution Agent Selection) com matriz de
    6 sinais PT-BR/EN, menu multi-select IDE-neutral, alertas de dependências
    quebradas, e step 0 de skip condicional no loop de execução.
  - `crew.yaml` — novo campo `agent_dependencies:` (opcional). O step de seleção
    só dispara quando o campo existe — crews antigas mantêm comportamento idêntico.
  - `build.prompt.md` — schema do `agent_dependencies:`, campo `agent:` opcional
    em checkpoints, gate de validação.
  - `AGENTS.md` — step 7b na seção Loading the Pipeline Runner.
  - 3 novos testes de contrato em `docs.test.js`.

> Itens desta versão que ficaram de fora da entrada original (acrescentados na auditoria
> de 2026-10-02):
- **Pontes `.agents/`** para Antigravity, Gemini CLI e Qwen Code
  (`.agents/skills/opencrew/SKILL.md`, `.agents/workflows/opencrew.md`).
- **`init --repair-bridges`**: regrava as pontes de IDE num workspace existente.
- **`update` migra `AGENTS.md` legado** (pré-1.3, sistema completo) para a ponte fina.
- **Fix Antigravity**: frontmatter no workflow para registrar `/opencrew`.
- ⚠️ **Regressão**: o `CLAUDE.md` gerado passou a conter a seção "STATUS.md (gestão de
  sessão)" do fluxo pessoal do mantenedor, e `templates/gitignore` ganhou `STATUS.md`.
  Correção prevista na 1.4.2 (F1-01).

## [1.3.3] — 2026-08-03

### Fixed
- **Auditoria D3 — cobertura de testes**: `--all` test agora verifica os 10 bridges
  (eram 5). Teste de scaffold verifica `_opencrew/agents/`. +2 testes no update
  (`--check` mismatch + refresh de `system.md`/bridge).

### Security
- **Auditoria D4 — segurança e robustez**: `escapeRx` verificada para todos os
  caracteres especiais regex. Todos os paths usam `path.join` (zero concatenação).

## [1.3.2] — 2026-08-03

### Fixed
- **Auditoria D2 — consistência de prompts**: coluna `Score` adicionada à migração
  OLD_FORMAT do `runs.md`. Passos de injeção do runner renumerados (memory=4,
  format=5, skill=6) para refletir a ordem real de composição. Números de fase
  corrigidos no `skills.engine.md` (3.5/5 → descritivos) e `discovery.prompt.md`
  (Phase 2 → 3). Campo `domains` reconciliado entre discovery e design.
  Referência ao diretório inexistente `ide-templates/` removida.

## [1.3.1] — 2026-08-03

### Fixed
- **Auditoria D1 — código TypeScript**: `--version`/`-v` não executa mais `init`.
  `--yes`/`-y` agora funciona (seleciona todos os IDEs automaticamente).
  `writeBridgeFile` não corrompe mais arquivos com frontmatter YAML (SKILL.md,
  `.mdc`). `--ide` sem valor não produz mais warning "Unknown IDE 'true'".
  Fase G.5 renomeada para H.5 no `architect.agent.yaml`. `model_tier` de
  pesquisador alinhado entre build e design/runner (`fast`).
  `template_selection` adicionado ao schema do `design.yaml`. Tier e domains
  de templates agora persistem no `discovery.yaml`.

## [1.3.0] — 2026-08-03

### Added
- **Instalação não-destrutiva**: `writeBridgeFile` com estratégia de blocos
  marcados (`<!-- opencrew:start/end -->`). `AGENTS.md` agora é uma ponte fina;
  sistema completo em `_opencrew/core/system.md`. Merge preserva conteúdo
  existente em todos os arquivos de bridge (CLAUDE.md, GEMINI.md, QWEN.md, etc.).
- **Sherlock multi-fonte**: novos extratores `sherlock-web.md` (pesquisa em
  sites públicos), `sherlock-seo.md` (keywords e content gaps), e
  `sherlock-trends.md` (trending topics de 9 fontes). Orquestração multi-fonte
  no `sherlock-shared.md` com matriz de seleção por tipo de crew.
- **Templates de crew por setor**: 4 templates em `templates/crews/`:
  blog-semanal, instagram-carrossel, newsletter-mensal, lancamento-produto.
  Template selection no Step 0 do Discovery.
- **Exportação multi-formato**: `export.prompt.md` com suporte a PDF
  (Playwright), CSV (compatível Excel), e formatted-post (por plataforma).
- **Criação por papéis**: `design.prompt.md` refatorado — Phase D = Role
  Proposal (sugere pessoas, não ferramentas), Phase E = Skill Mapping
  (resolve skills automaticamente). Tabela de mapeamento para 12 papéis.
- **Tiers de crew**: usuário escolhe Express/Standard/Full na criação.
  Impacto no número de agentes, checkpoints, Sherlock, e model_tier.
  Campo `tier` no `design.yaml` e `Default Tier` no `preferences.md`.
- **Aprendizado contínuo**: Post-Run Reflection com detecção de padrões
  recorrentes. Regras de Ouro após 3+ ocorrências. Crew Memory Rules
  injetadas no prompt dos agentes. Coluna `Score` no `runs.md`.
- **Registro compartilhado de agentes**: 5 agentes base em
  `_opencrew/agents/` (researcher, copywriter, reviewer, designer,
  strategist). Sistema `extends:` para herança de agentes. Gate 0c
  para validação de referências.
- **Criação dinâmica de skills**: Operation 3a no `skills.engine.md`
  para geração automática de SKILL.md. Skills geradas em
  `skills/.custom/` (não afetadas por `update`).

### Changed
- **85→91 testes** (eram 64 na v1.2.2). 103 arquivos no pacote npm.
- **Todas as 8 ideias do `IDEIAS.md` implementadas** (backlog zerado).

## [1.2.2] — 2026-08-02

### Fixed
- **`parseArgs` truncates values containing `=`**: flags like `--description=foo=bar`
  no longer lose everything after the second `=`.
- **`version` npm script uses `require()` in ESM project**: extracted to a dedicated
  `scripts/stamp-version.js` that uses proper ESM imports.
- **`skills.engine.md` numbering was out of order** in Operation 2 (Install a Skill):
  steps 3/4 repeated instead of continuing 5–9. Cross-references updated accordingly.
- **`init` now aborts when a workspace already exists** instead of proceeding with
  `overwrite: false` (which silently did nothing). It prints instructions to use
  `update` or reinstall from scratch.
- **`deleteDir` semantics**: now returns `false` when the path does not exist (was `true`).
- **`.env.example` placeholders** (`[REDACTED:API key param]`) removed — these were
  security-redaction artifacts from the tooling, not real file content. No code change.

### Added
- **Short flags**: `-y` (yes), `-v` (version), `-h` (help) now work alongside their
  `--long-form` equivalents.
- **`OPENCREW_CATALOG_URL` env var**: forks can override the skill catalog base URL
  without editing `catalog.json`. Documented in `CONTRIBUTING.md` → Forking.
- **`update` now warns** that catalog skills are fully overwritten before refreshing them.
- **`readJson` error messages now include the file path** (e.g. `Failed to read
  /path/to/package.json: file not found`).
- **`pickIdes` validates preselected IDs**: unknown IDs from `--ide` are filtered with
  a warning instead of being passed through silently.
- **`c.gray` removed** (unused). **`confirm()` removed** (dead code, never imported).
- **ESLint** (`eslint.config.js` + `npm run lint` + CI step) with `@eslint/js` flat config.
- **55 tests** (up from 30): new coverage for `paths.js`, `ui.js`, `fsx.js` error
  scenarios, `normalizeIdes` string input, CLI smoke tests.

### Changed
- **CI `npm audit` raised from `moderate` to `high`** to avoid spurious build failures
  from dev-dependency vulnerabilities without attack vectors.
- **Playwright config**: `channel: "chrome"` removed — uses bundled Chromium for better
  portability. `.mcp.json` now includes a `_comment` field explaining how to upgrade the
  pinned `@playwright/mcp` version.
- **Node version check** in `cli.js` now uses a proper semver comparison that handles
  `||` ranges (e.g. `>=18.0.0 || >=20.0.0`).

### Docs
- **`discovery.prompt.md`**: `crew_code` uniqueness is now self-service (`ls crews/`)
  instead of depending on the orchestrator to pass a list.
- **`runner.pipeline.md`**: language contract table documents all fixed PT-BR headers
  and the policy for adding new ones.
- **`CONTRIBUTING.md`**: new "Forking" section with catalog URL, package name, and
  publish instructions.

## [1.2.1] — 2026-08-02

### Changed
- **Menu discovery for repair**: the "My crews" menu entry now mentions `repair`, so the
  command introduced in 1.2.0 is discoverable from the menu and not only from the command
  routing table.
- **README**: standardized the project name as "OpenCrew" in prose (commands and the npm
  package name stay lowercase).

## [1.2.0] — 2026-08-02

### Fixed
- **Crews created without agent names**: some crews rendered their agents' functions
  (e.g. "Pesquisador") but not their persona names (e.g. "Pedro Pesquisa"). Root cause:
  `build.prompt.md` never specified the `crew-party.csv` schema, so the manifest could be
  generated without a `displayName` column — the exact column the Pipeline Runner reads to
  render agent names — even though the correct two-word names were present in each
  `.agent.md`. Build now documents the full CSV schema (header + example) and enforces it
  with a new blocking **Gate 0b: Crew-Party Manifest** that checks `displayName` exists and
  matches each agent's `.agent.md` `name:`.

### Added
- **`/opencrew repair <crew>`**: repairs an already-created crew whose manifest is missing
  agent names. It rebuilds `crew-party.csv` from the persona names already stored in each
  `.agent.md` (no re-generation of agents, research, or pipeline). New prompt at
  `_opencrew/core/prompts/repair.prompt.md`, routed via `AGENTS.md`.

### Migration
- To fix an existing crew that shows functions but no names:
  1. `npx @aksp/opencrew update` — refreshes the framework and installs the repair command.
  2. `/opencrew repair <crew>` — rewrites the crew's manifest with the correct names.
  `update` intentionally never touches `crews/`, so the repair step is required in addition
  to updating.

## [1.1.0] — 2026-08-01

### Fixed
- **Skill catalog URLs**: `/opencrew install` now fetches skills from the correct fork
  (`alberthpalhares/opencrew/templates/skills/`) instead of the upstream OpenSquad repo.
- **Publish workflow**: restored `push: tags` as the sole trigger — the actual release
  flow is `npm version` + `git push --tags`, not GitHub Releases. Documented in
  `CONTRIBUTING.md`.
- **Cross-platform test script**: replaced shell glob (`tests/*.test.js`) with an
  explicit file list so `npm test` works on Windows PowerShell + Node 20.
- **CI matrix**: test suite now runs on Ubuntu and Windows on every push/PR.

### Added
- **Test suite**: 30 tests (`node:test`) covering `fsx.js`, init, update, IDE bridge
  validation, and documentation contracts.
- **CI version-sync check**: `scripts/check-version-sync.js` fails the build if
  `.opencrew-version` drifts from `package.json`.
- **Playwright plugin warning**: `init` now warns Claude Code users to disable the
  native Playwright extension (opencrew ships its own via `.mcp.json`).

### Changed
- **Dashboard opt-in**: Pipeline Runner `state.json` writes are now gated on
  `Dashboard: enabled` in `preferences.md` (default: disabled). Removed the
  unconditional 10-second sleep at the end of every pipeline run.
- **Smaller fixes**: removed `AskUserQuestion` references from IDE-neutral files,
  corrected `update.js` comment about overwrite behavior, pinned `@playwright/mcp`
  version, removed stale root `skills/` directory (drifted duplicate of
  `templates/skills/`).

## [1.0.1] — 2026-08-01

### Changed
- API keys for optional skills are now requested conversationally in chat (during crew
  creation or skill install) instead of requiring the user to manually copy/edit `.env`
  beforehand. Values are collected and written to `.env` automatically.
- `init` no longer tells users to configure `.env` as a next step — no setup is required
  to start using opencrew.

## [1.0.0] — 2026-08-01

### Added
- npm-style installer: `npx @aksp/opencrew init` scaffolds a full opencrew workspace.
- `npx @aksp/opencrew update` refreshes only the framework (`_opencrew/core`, catalog
  skills, `AGENTS.md`) while preserving `crews/`, `_memory/`, IDE bridges and `.env`.
- Interactive IDE selection during `init` (or `--ide=`, `--all`, non-interactive fallback).
- Single source of truth: `AGENTS.md`. Every IDE receives only a thin bridge file that
  points to it — adding a new IDE is one entry in `src/lib/ides.js`.
- Version stamping via `_opencrew/.opencrew-version`, read by `update`.

### Notes
- Reformulation of the OpenSquad framework (originally by Renato Asse) published under
  the `opencrew` name by [aksp](https://www.npmjs.com/~aksp). MIT licensed.
