# Roteiro — Fase U7, a conclusão do que sobrou (problemas primeiro, recursos depois)

- **Status:** aprovado pelo dono em 2026-10-31 ("Revise com o Fable 5.1 high e inclua melhorias estruturais, possíveis problemas e não apenas recursos novos", plano revisado aprovado). Cada fase tem spec própria, aprovação do dono, revisão independente quando indicado, conferência real e release, na ordem abaixo. O ciclo do `AGENTS.md` vale em cada uma.
- **Origem:** o `IDEIAS.md` (24 entradas), a fatia U6c que nunca foi escrita (`fase-u6-roteiro.md`), os achados abertos das auditorias de 2026-10-02 e 2026-10-04 que a U5 prometeu triar, e duas revisões independentes de 2026-10-31 (uma do roteiro, outra do código: segurança, testes, CI, dívida técnica, documentos, `update`). O que as revisões afirmaram foi conferido no código antes de entrar aqui.
- **Termos novos no GLOSSARIO.md:** "Time" (as pessoas da crew) e "Pipeline" (os passos), nomes que a R5 passou a mostrar ao usuário.

## 1. Como cada fase anda
SPEC ⏸ → BDD ⏸ → teste que falha → código → `npm run verify` → registro → PR → merge → o dono cria o Release.
O ambiente em nuvem onde a IA trabalha **não cria tag nem Release** (HTTP 403): o dono cria, com o `gh release create`
que a IA entrega pronto. Versão sempre com `npm version <bump> --no-git-tag-version`. Precedente: reparo = patch;
comportamento ou polimento = minor; o número final é decidido na spec de cada fase.

**Portões em toda fase:**
1. `tests/upgrade-<fase>.test.js` provando que a mudança chega a quem já usa pelo `update` (regra 14).
2. Revisão independente da spec e do código quando a fase mexe em script, runner, medição ou `update`.
3. A conferência que o `verify` não cobre, nomeada na spec (execução real ou simulação; cada rede, na F9; o Word, se tocar documento).
4. Checklist de pronto no molde da §9 das specs anteriores.
5. `CHANGELOG.md`, `IDEIAS.md`, `STATUS.md` e a spec "implementada" no mesmo commit (regra 9).
6. Tetos de linhas declarados na spec: prompts de criação 703 (`design`) e 651 (`build`); núcleo do runner 560 e total 1.030.

## 2. As fases

| Fase | Natureza | Entrega |
|---|---|---|
| **F0** | documentação | este roteiro, a triagem dos achados abertos e os documentos que mentem |
| **F1** | defeito/segurança | higiene técnica e segurança do CLI e dos scripts — **publicada (1.19.4, 2026-10-31)** |
| **F2** | infraestrutura | publicação e CI seguros (Trusted Publishing, Node 24, Actions) — **publicada (1.19.5, 2026-11-01), a primeira por OIDC** |
| **F3** | defeito (alto risco) | `update` que reconcilia: remove o que saiu do payload, `init` sem mistura de versões, melhoria em arquivo não editado (H3-11) |
| **F4** | estrutura | divisão dos prompts de criação (só movimento de texto) e reforma das travas de prompt |
| **F5** | comportamento | criação de crew coerente (R6) e o que sobrou da criação e da investigação |
| **F6** | textos | PT-BR (CLI e runner) e arestas do runner (R8) |
| **F7** | comportamento (alto risco) | revisão no laço (R7) |
| **F8** | arestas | dados, publicador, Word, fontes, `.gitignore` antigo (R9) |
| **F9** | medição | inventário da regra 12, peso do X, overlay, "como será colado" (U6c) |
| **F10** | estrutura | dieta de tokens, parser comum, agentes-base, modelo `newsletter-mensal` |

**Por que esta ordem.** O que é defeito ou risco para quem já usa vem primeiro (F1 a F3). A F4 vem antes das fases de conteúdo
porque os tetos de 703 e 651 linhas, travados em testes, e as travas que fixam frases de prompt (57 arquivos de teste)
impedem a F5 e a F6. A F7 mexe no núcleo cheio do runner (559 de 560 linhas; total 1.029 de 1.030) e vem depois de a F6
tirar os textos soltos. A F9 muda o que o verificador bloqueia e pede a conferência do dono em cada rede, por isso fica perto
do fim. A F10 é refatoração grande e depende da F3 (agentes-base só chegam a quem já usa com a H3-11).

### F1 — Higiene técnica e segurança (spec: `fase-u7-f1-higiene-e-seguranca.md`)
Teste `U4a-02b` sem o guarda de root (o de `limpeza-revisao.test.js` já tem); `image-creator` sobe `python -m http.server`
em todas as interfaces (`--bind 127.0.0.1`, e equivalente em PowerShell); Escritório com `frame-ancestors 'none'` e
`Referrer-Policy`; o `AGENTS.md.bak` do `update` antigo fora de `.opencrew-backup/`; `deliverFile` seguindo link simbólico;
`init` sem proteção de `~` e da raiz do disco (C-20) e aviso dentro de um workspace; `update` sem workspace saindo com 0 (C-25);
`no-unused-vars` como erro; T-M8 (skill remota busca scripts no `main`), T-B4 (`/opencrew reset` sem definição); código morto
(`copyDir`/`deleteDir`/`ensureDir`) e `@inquirer/confirm` (C-22). **Conferido em 2026-10-31 e já corrigido no código:** C-11, C-21
e o lint sem `bin/` (C-27, parte do lint).

### F2 — Publicação e CI seguros
Trusted Publishing (OIDC) no lugar do `NPM_TOKEN`, que expira (ação do dono no npmjs.com; `npm` ≥ 11.5.1 no runner);
`workflow_dispatch` que ensaie tag × versão e autenticação; `ci.yml` com `permissions: contents: read`, `npm ci --ignore-scripts`,
Actions fora do runtime Node 20 e fixadas por SHA (C-19), célula Node 24 (C-18, T-B14). A matriz é travada por
`release-gate.test.js` e repetida no `CONTRIBUTING.md` e no `publish.yml`: mudar nos quatro lugares no mesmo commit.

### F3 — `update` que reconcilia
`update` nunca remove arquivo que saiu do payload (C-27): usar o `manifest.json`, com cópia em `.opencrew-backup/`;
marcador de fim apagado gera bloco duplicado e mistura LF/CRLF (C-26); `init` sobre workspace completo sem carimbo trata como
"interrompido" e mistura versões: com `manifest.json`, delegar ao caminho do `update`; H3-11 (arquivo registrado no manifesto e não
editado recebe a melhoria); T-M9 (desinstalar skill de catálogo é desfeito no `update`). Pré-requisito de qualquer divisão de prompt
(F4, F10) e da reescrita dos agentes-base (F10).

### F4 — Divisão dos prompts de criação e reforma das travas
`design.prompt.md` (686), `build.prompt.md` (651) e `sherlock-shared.md` (757, lido por 7 prompts) em partes lidas sob demanda,
como o runner na 1.13.0. Travas de frase de prompt (57 arquivos de teste; ex.: `runtime-contracts-r3.test.js:88`): separar
"contrato" de "redação" e consolidar helpers (`sectionOf` ×7, `flat` ×17, `ler` ×24). Pré-requisito da tradução (regra 13).

### F5 — Criação de crew coerente
Antes da spec, o dono cria **uma crew real** com a 1.19.3. Os quatro pontos das simulações da R5 (checkpoints do Express × Fase G;
cross-review do Full; quem define os ângulos; idioma de reserva); Fase C depois da D; sobras da 1.11.0 (checkpoint Standard ×
renderização, "6 tons padrão", pesquisa atribuída ao discovery, descrição do `/opencrew run` só com `agent_dependencies:`);
T-B7, T-B9, T-M15; H3-07 e H3-16 (best-practice do overlay invisível na criação; alerta "não é portátil" sem oferta); Sherlock:
T-A8 (duas sessões de browser incompatíveis) e T-A9 (subagente "pergunta ao usuário"). `preferences.md` com `IDEs:` morto:
`_memory/` nunca é renovada pelo `update`, a correção só alcança instalação nova.

### F6 — Textos em PT-BR e arestas do runner
Textos ao usuário em inglês no CLI (`init.js`, `update.js`, resumo do `init`; C-15: mensagem final manda digitar `/opencrew` em
IDE sem o comando), no runner, no `review.md` e no menu final; T-M12 (arquivo "para todas as IDEs" cita ferramenta de uma);
T-M13; T-B5; T-B13; checkpoint sem título definido e com três perguntas/uma resposta; "limites não medidos" × "0 não medidos";
título do `runs.md`; cabeçalho da execução retomada; `tasks:` em passo `subagent`; contrato sem "exige TL;DR"; `## Regras de Ouro`;
LEIA-ME traduzido (G-28); alerta de data depois de vírgula; arquivo entregue com o nome do `outputFile` (`rascunho.md`) e
`texto-livre` sempre em `outros/` — mexe em `entregar.mjs` e em pelo menos 8 testes e pode gerar `-reentrega-N` em crews que já
entregaram: cenário de upgrade e revisão independente obrigatórios. Sem refatorar o runner.

### F7 — Revisão no laço
O texto corrigido na aprovação final passa só pelo verificador; o revisor nunca vê a versão entregue (1.16.0, item 1); depois de um
REJECT, dizer se os passos entre o alvo e a revisão rodam de novo; `[PREENCHER]` na aprovação final (no lugar ou versão nova;
confere de novo; `aprovado` × `corrigido`); score de pedido `1/1`. A spec declara como os tetos do runner são tratados.

### F8 — Dados e arestas
Limpeza, custo e preferências (trava velha concorrente, erro de disco cru, `Budget:` vazio, `crews/` que é junção); `publish.js`
(proporção do JPEG antes do upload, emoji como 2, post de 1 imagem, `--dry-run` que já envia ao imgBB, H1-15); `generate.py`
(T-B11, teto de lote, T-A12); skills (T-M7, T-B10); T-M1 e T-A1 (segredos digitados no chat em texto puro em `.claude/settings.local.json`, e o MCP verificado num arquivo que o Playwright do `.mcp.json` não usa: pedem pesquisa do que cada IDE lê; o `.gitignore` cobre o arquivo desde a 1.4.2); Word (perfil vazio aparece como "perfil usado"; documento em outro idioma);
conferir arquivos citados DENTRO das fontes (dividir `conferir-fontes.mjs`, 199 de 200 linhas, antes); `.gitignore` antigo no
`update` (reescreve linha do usuário: backup e confirmação, regra 3); exemplos neutros no payload e nos testes.

### F9 — Medição
Começa por um **inventário da regra 12**: toda chave `*_max_*` declarada e não medida (`subject_line_max_chars`, `preview_text_chars`,
`message_max_chars`, `headline_max_chars`, `max_words_per_slide`, `max_duration_seconds`, `caption_visible_chars`,
`post_visible_chars`…) vira medida, `recommended_*` ou sai, com uma trava (teste que reprova chave `*_max_*` sem medidor). Depois:
peso do X (emoji vale 2, link vale 23); "limite de cinco linhas" pedido pelo usuário; overlay local como acréscimo e aviso no `update`
(**aprovação explícita do dono**: muda como o usuário guarda os próprios best-practices); medir "como será colado" (com hashtags),
imagens e arquivo com mais de um canal (texto que passa hoje pode passar a bloquear: o dono confere cada rede).

### F10 — Estrutura
Dieta de tokens (o núcleo do runner custa cerca de 10 mil tokens em toda execução; T-M11: carregar os agentes uma vez só; o pedido lê
quase o runner inteiro); parser de argumentos comum para os seis `lerArgs`; `init()` com 73 linhas e demais funções fora do alvo nos
módulos críticos; C-23 (duplicações); acoplamento de `src/lib/escritorio.js` aos scripts do payload; reescrever os cinco agentes-base,
`extends:` e nomes de campo do `design.yaml` (T-M20, T-B8; depende da F3); modelo `newsletter-mensal` (Express com revisor dedicado)
**com migração**: só troca o `discovery.template.yaml` se for idêntico ao original (manifesto) ou com `.bak` e confirmação (regra 3).

## 3. Decisões do dono pedidas
- **U0, a jornada de referência** (`docs/jornada/medicoes.md`, sem linha desde a 1.6.0): **declarada encerrada pelo dono em 2026-10-31**
  (spec da F1, §8). A conferência real de cada fase fica na spec dela.
- **Aprovação explícita na spec de cada um:** overlay como acréscimo (F9) e `.gitignore` antigo no `update` (F8).

## 4. Fica de fora (continua `sem fase` no `IDEIAS.md`, cada um com o motivo)
Word itens 1 a 7 (`.dotx`, logotipo JPEG/SVG, imagem, sumário, PDF direto): o perfil cobre o caso real. Publicador lendo a entrega e
"já publicado": nenhuma crew publica sozinha — **mas H1-08 é defeito conhecido** (publica a legenda remontada dos slides, não a
aprovada) e volta ao primeiro usuário que publique pela crew. Conserto que reordena a publicação: nenhuma crew real está assim.
Busca semântica nas fontes: custo em tokens. Apelido `--execucao`: o conserto é na configuração do `lean-ctx` do mantenedor.

**Auditados e sem necessidade de mexer:** o servidor do Escritório além do cabeçalho da F1 (binding em `127.0.0.1`, checagem de `Host`,
rotas fixas, página escrevendo por `textContent`); `npm audit` moderado (só devDependencies do ESLint); tempo da suíte (68 s);
contagens do README; `CHANGELOG.md` no tarball.

## 5. Triagem dos achados abertos das auditorias
| ID | Achado | Fase |
|---|---|---|
| T-M1, T-A1 | segredos e MCP em `.claude/settings.local.json`, arquivo "para todas as IDEs" (decidido na spec da F1: pede pesquisa por IDE) | F8 |
| T-M8 | instalação remota de skill busca scripts no `main` mutável | F1 |
| T-B4 | `/opencrew reset` e `help` sem definição | F1 |
| C-20, C-22, C-25 | `init`/`update`: alvo sem proteção, código morto, saída 0 sem workspace | F1 |
| C-11, C-21 | `-y` × `--ide`; pilha de erro em falha parcial | já corrigidos no código (conferido em 2026-10-31); sem ação |
| C-18, C-19, T-B14 | Node 24 na matriz, OIDC e SHA no publish | F2 |
| C-26, C-27, H3-11, T-M9 | `update`: bloco duplicado, arquivo órfão, melhoria em arquivo não editado, desinstalação | F3 |
| T-A8, T-A9, T-B7, T-B9, T-M15, H3-07, H3-16 | criação e investigação | F5 |
| C-15, T-M12, T-M13, T-B5, T-B13, G-28 | textos e arestas do runner e do CLI | F6 |
| T-A12, T-B10, T-B11, T-M7, T-M1, T-A1 | custo do `generate.py`, skills e segredos de MCP | F8 |
| T-M11, T-M20, T-B8, C-23 | agentes e duplicações | F10 |
| D-08 | contagens e promessas no README | conferido em 2026-10-31: as contagens estão certas; sem ação |

## 6. Teto de tamanho
Núcleo do `runner.pipeline.md` em 559 linhas, de 560; total com as partes em 1.029, de 1.030. `design.prompt.md` em 686, de 703;
`build.prompt.md` em 650, de 651. Regra nova de runner ou de criação compensa cortando outra, ou a spec da fase declara o novo teto
com o motivo (a F4 existe para folgar esses tetos).
