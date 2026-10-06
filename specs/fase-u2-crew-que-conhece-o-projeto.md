# Spec — Fase U2: Crew que conhece o projeto (+ U6 Convivência) — 1.6.0

- **Fase:** U2 · **Módulos:** CLI (`src/commands/update.js`, `src/commands/init.js`, `src/lib/ides.js`, `src/lib/manifest.js`, `src/lib/migrations.js`) + Runtime (`templates/`) · **Status:** implementada (2026-10-02)
- **Termos novos no GLOSSARIO.md:** sim — Fontes do projeto, Conferência de fontes, Overlay local; em 2026-10-04 (H3-21), Manifesto e Cópia de segurança
- **Modelo sugerido:** execução Sonnet 5.5 · médio

## 1. Objetivo
A crew trabalha com o que o projeto já sabe e não quebra quando o usuário reorganiza as pastas;
o que o usuário corrige fica gravado na hora; e o `update` entrega **tudo** a quem já usa, sem
apagar o que ele personalizou — convivendo com outros sistemas de agentes no mesmo projeto.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| Uso real, dor 3 | Decisão já registrada no projeto ignorada; correção que não chega ao `company.md` | U2-01, U2-04 |
| Uso real, dor 5 | Caminhos absolutos quebrados após reorganizar (Projeto B); logo com nome diferente, falha silenciosa (Projeto A) | U2-02, U2-03 |
| Uso real, dor 4 + T-M6, T-M10 | Correções não registradas; memória resetada sem backup; regras contraditórias | U2-04 |
| T-M5 | Regra de Ouro: a promoção procura repetições em `memories.md`, que não guarda dados de run; os modelos de memória não têm a seção | **não feito** (constava em U2-04) → U4 (H3-08) |
| Uso real, dor 8 (U6) + C-14, C-17 | `AGENTS.md` dividido com outro sistema; "adote o papel" global; restos `opensquad`; `_build/` e logs na raiz | U2-08, U2-09 |
| F2: C-01 | `update` não entrega diretórios novos (agentes-base, config, templates de crew) | U2-05 |
| F2: C-08 + atualização de 2026-10-02 | Skill de catálogo editada pelo usuário sobrescrita sem cópia (aconteceu no Projeto A) | U2-06 |
| F2: C-10 | Pontes das IDEs nunca atualizadas | U2-07 |
| F2: C-12 | `--repair-bridges` sem `--ide` cria pontes para IDEs não escolhidas | **não feito** nesta fase (constava em U2-07); feito na R1 (1.6.1) — R1-08a, R1-08d (H3-02) |
| F2: C-09 | Downgrade silencioso via cache do `npx` | U2-06 |
| F2: C-13 | `.mcp.json` existente sem merge | U2-09 |
| T-A7 | Best-practices aprendidas gravadas em `core/` (o `update` apaga) | U2-04 |
| Fora daqui | C-11 (precedência `-y`/`--ide`), T-M9 (`skills/.disabled`), C-20..27 (polimento do CLI) | → U5 |

## 3. Entradas
- `crew.yaml` ganha `fontes:` — lista de arquivos ou pastas do projeto, **caminho relativo à
  raiz do projeto**, com uma descrição curta:
  ```yaml
  fontes:
    - caminho: Memoria/01_Decisoes.md
      para_que: decisões de público e posicionamento
    - caminho: Ativos/Identidade Visual/PNG/
      para_que: logos oficiais
  ```
- `node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<nome> [--corrigir]`

## 4. Saídas
- Relatório de conferência em PT-BR; última linha `FONTES:OK` ou `FONTES:PENDENTE`.
- Com `--corrigir` (só depois do "sim" do usuário): caminhos trocados nos arquivos da crew, com
  cópia `.bak` de cada arquivo alterado.
- `update`: diretórios novos entregues, pontes atualizadas, cópias `.opencrew-backup/<data>/`
  do que o usuário tinha editado, avisos de restos antigos.

## 5. Regras de negócio
**Crew que conhece o projeto (runtime)**
1. **Fontes carregadas a cada run** — o runner lê as `fontes:` no início (arquivo: inteiro até
   ~300 linhas, senão os títulos + trechos relevantes à tarefa; pasta: lista de arquivos) e as
   trata como **verdade do projeto**: se contradizem o briefing ou a pesquisa, valem as fontes.
2. **Conferência de fontes no início do run** (`conferir-fontes.mjs`), sobre: as `fontes:`, e todo
   caminho de arquivo citado entre crases nos passos e no `crew.yaml`. Resolução, nesta ordem:
   relativo à crew → relativo à raiz do projeto → absoluto.
   - Caminho que não existe → procura no projeto um arquivo com o **mesmo nome** (ignorando
     `node_modules`, `.git`, `output/`, `_opencrew/`) e sugere o novo caminho relativo; sem
     achado pelo nome, lista os arquivos da pasta esperada (ex.: logo com outro nome).
   - Caminho **absoluto dentro do projeto** que existe → alerta "não é portátil" + sugestão relativa.
   - Pendência → o runner mostra o relatório e oferece: *1. Corrigir os caminhos sugeridos
     (`--corrigir`) · 2. Seguir assim mesmo · 3. Parar*. Nunca segue em silêncio com fonte faltando.
3. **Correção gravada na hora** — em todo checkpoint em que o usuário corrige algo (tom, público,
   termo, fato), o runner grava a correção em `memories.md` **antes do próximo passo** (não só no
   fim do run); termos que o usuário mandou tirar entram em `## Proibições Explícitas` **entre
   aspas** (viram trava do verificador da U1).
4. **Perfil da empresa** — se a correção contradiz o `company.md` (ex.: nome da organização,
   público principal), o runner pergunta: "Isso vale para todas as crews? Atualizo o perfil da
   empresa?" e só altera com o "sim".
5. **Memória sem perda** — a migração de formato do `memories.md` faz cópia `.bak` antes e avisa
   o usuário (fim do reset silencioso, T-M6); `AGENTS.md`/runner com uma regra só sobre o que vai
   para a memória (só feedback explícito, T-M10).
6. **Aprendizado fora do core** — best-practices aprendidas/criadas vão para
   `_opencrew/best-practices.local/` (nunca tocado pelo `update`); o runner procura primeiro ali,
   depois em `core/best-practices/`. O verificador (U1) também lê os `constraints:` do local primeiro.
7. **Build gera caminhos relativos** — passos e `crew.yaml` só citam arquivos do projeto por
   caminho relativo à raiz; Discovery pergunta "Tem arquivos do projeto que a crew deve
   consultar sempre?" e grava em `fontes:`. `_build/` sempre em `crews/{code}/_build/`.

**`update` completo e seguro (CLI)**
8. **Entrega diretórios novos** — além de `core/` e skills: `_opencrew/agents/`,
   `_opencrew/config/`, `_opencrew/_investigations/` e templates de crew, **sem sobrescrever**
   o que existe (`overwrite: false`).
9. **Cópia antes de sobrescrever** — o `update` guarda em `_opencrew/manifest.json` o hash de cada
   arquivo que ele entregou. Na atualização seguinte, arquivo de core/skill cujo hash mudou
   (editado pelo usuário) é copiado para `.opencrew-backup/<data>/` antes de ser substituído, e o
   resumo lista o que foi copiado. Instalação sem manifesto (≤ 1.5.0): faz cópia de todo arquivo
   que difere do pacote novo **e** do pacote que ele substitui não puder ser provado igual — na
   prática, copia tudo o que difere do novo (seguro por padrão).
10. **Sem downgrade** — se a versão instalada é maior que a do pacote, o `update` para e explica
    (`npx @aksp/opencrew@latest update`); `--check` compara semver de verdade.
11. **Pontes atualizadas** — o `update` detecta as IDEs instaladas pela presença dos arquivos de
    ponte e regrava **só essas** (bloco marcado nos arquivos compartilhados; arquivos com
    frontmatter que são 100% do OpenCrew são substituídos). Nunca cria ponte de IDE não instalada.
12. **Convivência (U6)** — o texto das pontes e do bloco do `AGENTS.md` deixa de mandar "adotar o
    papel do opencrew" sempre: passa a valer **só quando o usuário digita `/opencrew` ou fala de
    crews**; fora disso, outras instruções do projeto têm prioridade. Pontes apontam direto para
    `_opencrew/core/system.md` (C-14).
13. **Restos antigos** — o `update` avisa (não apaga) pontes legadas reconhecíveis (ex.:
    `opensquad` apontando para `_opensquad/` inexistente), com o caminho para remover.
14. **Sem lixo na raiz** — Playwright MCP com saída em `_opencrew/logs/playwright/`; o `update`
    acrescenta isso ao `.mcp.json` existente por merge do servidor `playwright` (C-13), sem tocar
    outros servidores.

## 6. Erros e casos-limite
| Situação | Comportamento | Mensagem |
|---|---|---|
| Fonte não encontrada e nenhum arquivo com o mesmo nome | pendência, lista a pasta esperada (se existir) | "Não encontrei `X`. Na pasta `Y` existem: …" |
| Vários arquivos com o mesmo nome | lista todos, não escolhe | "Encontrei N candidatos para `X`: …" |
| `--corrigir` sem pendência | nada muda | "Nada a corrigir." |
| Crew sem `fontes:` | só confere os caminhos citados nos passos | — |
| Manifesto corrompido | trata como instalação sem manifesto | aviso |
| Pacote mais antigo que o instalado | `update` para, exit 1 | "Você tem a vX instalada e este pacote é vY. Use npx @aksp/opencrew@latest update." |
| Ponte de IDE com frontmatter editada pelo usuário | cópia de segurança antes de substituir | listada no resumo |

## 7. Segurança
`conferir-fontes.mjs` deve ler e escrever só dentro do projeto. Na 1.6.0 a escrita ficava dentro
do projeto quando `--crew` apontava para uma pasta dele, que é o que o runner passa
(`crews/{name}`); o script não validava `--crew` (seção 12, H3-17 e I-14: feito na R1 (1.6.1) —
R1-06c; `--crew` de fora do projeto é recusado). Na leitura, ele testa a existência de
caminhos absolutos citados, dentro ou fora do projeto, e, quando o arquivo falta, lista os nomes
da pasta esperada, mesmo fora do projeto (regra 2). `--corrigir` só troca strings de caminho
nos arquivos da crew e guarda `.bak`; nunca apaga nada. O `update` nunca apaga arquivo do usuário.

## 8. Cenários BDD
**Conferência de fontes**
- **U2-02a** (Projeto B) DADO um passo com `J:/…/Reforma do Estatuto/Estatuto_2021.md` e o
  arquivo movido para `…/_Arquivo_Historico/Estatuto_2021.md` QUANDO conferido ENTÃO
  `FONTES:PENDENTE` com a sugestão do novo caminho **relativo**.
- **U2-02b** DADO um caminho absoluto que existe dentro do projeto ENTÃO alerta "não é portátil" +
  sugestão relativa.
- **U2-02c** (Projeto A) DADO o passo pede `Ativos/Identidade Visual/PNG/vertical_fundo_escuro.png` e
  a pasta tem `Vertical_Preta.png` ENTÃO pendência listando os arquivos da pasta.
- **U2-02d** DADO dois arquivos com o mesmo nome ENTÃO lista os dois, sem escolher.
- **U2-02e** DADO `--corrigir` ENTÃO os caminhos sugeridos (únicos) são trocados, com `.bak`, e a
  nova conferência dá `FONTES:OK`.
- **U2-02f** DADO caminhos relativos à crew (`pipeline/data/x.md`) que existem ENTÃO `FONTES:OK`.
- **U2-02 CLI** (teste sem letra) DADO uma crew sem pendência QUANDO o script roda com
  `--corrigir` ENTÃO relatório em PT-BR, "Nada a corrigir.", última linha `FONTES:OK` e código 0.
**Runtime (contratos de prompt)**
- **U2-01a** runner carrega `fontes:` no início e diz que elas valem sobre briefing/pesquisa.
- **U2-03a** runner roda `conferir-fontes.mjs` no início e oferece as 3 opções em pendência.
- **U2-04a** checkpoint grava a correção antes do próximo passo; termo removido entra entre aspas
  em `## Proibições Explícitas`.
- **U2-04b** correção que contradiz o `company.md` gera a pergunta de atualizar o perfil.
- **U2-04c** migração de memória faz `.bak` e avisa (não há mais "Do NOT inform the user").
- **U2-04d** aprendizado vai para `_opencrew/best-practices.local/`; verificador lê o local primeiro.
- **U2-07a** build/discovery: `fontes:` perguntadas e gravadas; caminhos relativos; `_build/` na crew.
**Update (CLI)**
- **U2-05a** DADO um workspace sem `_opencrew/agents/` QUANDO `update` ENTÃO os agentes-base
  chegam; um agente-base editado pelo usuário não é sobrescrito.
- **U2-06a** DADO uma skill de catálogo editada QUANDO `update` ENTÃO a versão do usuário vai para
  `.opencrew-backup/<data>/…` e aparece no resumo; `manifest.json` gravado.
- **U2-06b** DADO workspace sem manifesto (1.5.0) e um arquivo de core igual ao pacote ENTÃO nenhuma
  cópia desnecessária.
- **U2-06c** DADO instalado 9.0.0 e pacote 1.6.0 ENTÃO o `update` para (exit 1) sem escrever nada.
- **U2-06d** DADO workspace sem manifesto e uma skill de catálogo que só difere do pacote na quebra
  de linha (CRLF no lugar de LF) QUANDO `update` ENTÃO nenhuma cópia em `.opencrew-backup/` e o
  resumo não diz "que você tinha editado".
- **U2-06e** DADO workspace sem manifesto e uma skill de catálogo com conteúdo diferente do pacote
  QUANDO `update` ENTÃO o resumo diz "diferentes do pacote novo", e não "que você tinha editado".
- **U2-07b** DADO só a ponte do Claude Code instalada QUANDO `update` ENTÃO ela é atualizada e
  nenhuma outra IDE ganha ponte.
- **U2-08a** o texto das pontes e do bloco do `AGENTS.md` só ativa com `/opencrew`/crews e aponta
  para `_opencrew/core/system.md`.
- **U2-08b** DADO `AGENTS.md` com bloco opencrew + instruções de outro sistema QUANDO `update`
  ENTÃO as instruções do outro sistema ficam intactas, byte a byte.
- **U2-09a** DADO `.mcp.json` com outros servidores QUANDO `update` ENTÃO o `playwright` ganha a
  pasta de saída em `_opencrew/logs/playwright/` e os outros ficam intactos.
- **U2-09b** DADO uma ponte legada `opensquad` ENTÃO aviso com o caminho, nada apagado.
- **U2-upg** `tests/upgrade.test.js`: um workspace 1.5.0 atualizado recebe tudo de U2.

## 9. O que o humano confere na tela
- [x] No Projeto B: `node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<crew>`
      depois do `update` → aparecem os caminhos absolutos que quebraram, com o novo caminho
      relativo sugerido. Rodar com `--corrigir` só se concordar.
      Feito em 2026-10-02 (seção 14): 5 caminhos, cada um com o novo lugar. Depois, com
      autorização do dono, o `--corrigir` trocou os 5.
- [ ] No Projeto A: a mesma conferência aponta o logo com nome diferente e lista os PNGs da pasta.
      Conferência rodada em 2026-10-02 (seção 14): as 9 fontes da crew estão OK e o logo não
      aparece, porque o nome errado está dentro do manual de marca (uma fonte), não nos arquivos
      da crew — pendente: conferir arquivos citados dentro das fontes → U3a.
- [ ] Rodar uma crew: ao corrigir algo num checkpoint, abrir `crews/<crew>/_memory/memories.md`
      e ver a correção gravada antes do fim do run.
      — pendente: não há execução real de crew registrada com esta conferência → jornada de
      referência (U0), com o dono (H3-18).

## 10. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código.
      Conferido em 2026-10-04: todo cenário da seção 8 tem teste de mesmo ID (H3-13) —
      pendente: não há registro de que foram vistos vermelhos antes do código (não se refaz depois).
- [x] `npm run verify` verde; `tests/upgrade.test.js` cobre 1.5.0 → 1.6.0.
      O publish da 1.6.0 (tag `v1.6.0`, 2026-10-02) roda `npm run verify`; o teste é o U2-upg.
- [ ] Conferência da seção 9 (dois primeiros itens, só leitura sem `--corrigir`).
      Feita em 2026-10-02 (seção 14): no Projeto B, como esperado; no Projeto A a conferência rodou
      e não apontou o logo (seção 9) — pendente: conferir arquivos citados dentro das fontes → U3a.
- [x] CHANGELOG 1.6.0; release (commit + tag) com confirmação; atualizar A e B com autorização.
      1.6.0 publicada em 2026-10-02 (tag no GitHub e npm); A e B atualizados pelo npm, com
      autorização do dono, sem dado alterado.

## 11. Fora de escopo → destino
| O que não entra | Alocação |
|---|---|
| Ler fontes externas (Google Drive via API, Notion) | → sem fase — só arquivos do projeto |
| Busca semântica dentro das fontes | → U5 (custo) |
| C-11, T-M9, C-20..27 | → U5 |
| Modo equipe / tarefas avulsas no histórico | → U4 |
| C-12 (`--repair-bridges` sem `--ide`): constava como herdado e não foi feito (H3-02) | feito na R1 (1.6.1) — R1-08a, R1-08d |
| T-M5 (Regra de Ouro): constava como herdado e não foi feito (H3-08) | → U4 — depende de histórico confiável |

## 12. Limites conhecidos
- Regras 1 a 7 são, no todo ou em parte, texto de prompt seguido pela IA (inclusive a oferta das
  3 opções da regra 2, a migração com `.bak` da regra 5 e o aprendizado fora do core da regra 6);
  os testes garantem o texto e o script → jornada de referência (U0). A jornada precisa conferir,
  em execução real: a conferência de fontes rodou; a correção entrou em `memories.md` antes do fim
  do run; a pergunta do perfil apareceu quando cabia (H3-18).
- Caminhos citados fora de crases nos passos não são conferidos → sem fase — o build grava os
  caminhos do projeto entre crases; a R1 mantém este limite declarado (§12 da spec R1).

**Achados da revisão de 2026-10-04** (`docs/auditoria/2026-10-04-revisao-specs.md`): pontos em que
o código não cumpre a spec, ou em que a spec não previu o caso. Nenhuma promessa foi retirada;
cada item tem destino. Atualização de 2026-10-05: os itens com "feito na R1 (1.6.1)" descrevem a
1.6.0 e foram corrigidos; o cenário citado é a trava, e o que vale agora está na seção 14.

Conferência de fontes e runner (regras 1, 2 e 7):
- **H3-04** — `fontes:` com comentário na mesma linha (o formato do exemplo do `build.prompt.md`)
  ou com apóstrofo no caminho não é conferida. Caminhos citados em tasks e em arquivos de agente
  também não: a coleta só lê `crew.yaml` e `pipeline/steps/*.md`. Feito na R1 (1.6.1) — R1-06a
  (comentário, aspas e apóstrofo), R1-06b (tasks e arquivos de agente).
- **H3-05** — o runner carrega as fontes antes de conferi-las, não diz o que fazer se o script
  não rodar (sem Node) ou sair com código 1 e sem linha `FONTES:*` (erro de uso, crew não
  encontrada) e não manda reler as fontes depois do `--corrigir`. Feito na R1 (1.6.1) — R1-07i
  (confere antes de carregar; relê depois do `--corrigir`), R1-07h (avisa quando o script não
  roda); contrato de prompt.
- **H3-15** — `--corrigir` com pendência sem sugestão única responde "Nada a corrigir." e depois
  `FONTES:PENDENTE`; pasta de `fontes:` escrita sem barra final e movida não recebe sugestão;
  passado o limite de 20.000 entradas, o relatório diz "nem nada com esse nome no projeto" sem
  avisar que parou de procurar. Feito na R1 (1.6.1) — R1-06d (`--corrigir`), R1-06e (pasta sem
  barra final), R1-06f (busca parcial).
- **H3-17, I-14** — `--crew` não é validado: apontando para fora do projeto, o script lê a crew
  de fora e, com `--corrigir`, altera os arquivos dela (seção 7). Feito na R1 (1.6.1) — R1-06c.
- **H3-16** — o alerta "não é portátil" não vira oferta de correção, embora o `--corrigir` já
  troque esses caminhos → U5.
- **H3-03** — `fontes:` só é perguntada na criação da crew. Crew criada antes da 1.6.0 só ganha
  fontes com edição manual do `crew.yaml`; o runner e o fluxo de edição não perguntam → U4.

Memória e overlay local (regras 3 a 6):
- **H3-08** — T-M5 (Regra de Ouro) não foi feito: a promoção conta repetições em `memories.md`,
  mas a memória equivalente é pulada e os modelos de memória não têm a seção → U4.
- **H3-01** — o verificador usa só os `constraints:` do primeiro arquivo que existir, sem mesclar
  com o core. Arquivo local sem `constraints:` desliga os limites do formato, sem nota; a cópia
  inteira que o runner manda fazer congela os limites, e correções do core deixam de chegar.
  Mescla com o core e nota: feito na R1 (1.6.1) — R1-04a, R1-04b. A cópia inteira continua
  valendo por cima do core, chave a chave; arquivo de acréscimo e aviso no `update` → U5.
- **H3-07** — best-practice criada no overlay não é vista por discovery, design e build, que leem
  só o core; na skill, remover e validar ainda operam no core → U5.

`update`, pontes e `.mcp.json` (regras 8 a 14):
- **H3-02** — `init --repair-bridges` sem `--ide` cria as pontes das 9 IDEs (C-12 não feito) e
  não lista a cópia de segurança que faz. Feito na R1 (1.6.1) — R1-08a e R1-08d (usa a detecção
  do `update`), R1-08b (lista a cópia), R1-08c (sem ponte detectada: erro), R1-08e (`--all`
  regrava as 9). Ponte de bloco marcado editada dentro do bloco continua regravada sem cópia
  → R2 (§14 da spec R1).
- **H3-10, H1-06** — a detecção de IDE aceita qualquer arquivo de ponte que contenha a palavra
  "opencrew". Um `CLAUDE.md`, `GEMINI.md`, `QWEN.md` ou `.github/copilot-instructions.md` do
  usuário que só cita o OpenCrew ganha o bloco e os demais arquivos de ponte daquela IDE, contra
  a regra 11. O resumo cita o Codex sempre que existe `.agents/skills/opencrew/SKILL.md` → R2.
- **H3-06** — ponte sem marcador (instalações até a 1.2.2) recebe o bloco novo e mantém, abaixo
  dele, o texto antigo que manda "adotar o papel", sem cópia; o U2-upg não cobre esse caso → R2.
- **H3-09** — `.mcp.json`: o `update` cria o arquivo que não existe, repõe o servidor `playwright`
  removido e regrava o arquivo sem cópia; a versão fixada do Playwright não é renovada → R2.
- **H3-11** — agentes-base, `config/`, `_investigations/` e templates de crew nunca recebem
  melhoria, mesmo sem edição do usuário: é o efeito do `overwrite: false` da regra 8 (o código faz
  o que a regra manda). Template de crew apagado volta a cada `update` → R2.
- **H3-14** — manifesto ilegível não gera o aviso da seção 6 (com cópia, aparece "Primeira
  atualização com proteção", que é falso); `{"files": null}` derruba o `update`; sem teste → R2.
- **H3-19** — "restos antigos" (regra 13) só olha 5 pastas (`.gemini/skills`, `.claude/skills`,
  `.agents/skills`, `.agent/workflows`, `.agent/rules`) e só `.md` que cita `_opensquad/`;
  `_build/` e logs já existentes na raiz não geram aviso → R2.

## 13. Travas que esta spec deixa
`tests/conferir-fontes.test.js` (U2-02a…f, U2-02 CLI) · `tests/update-u2.test.js` (U2-05a,
U2-06a…e, U2-07b, U2-08b, U2-09a, U2-09b) · `tests/runtime-contracts.test.js` (U2-01a, U2-03a,
U2-04a…d, U2-07a, U2-08a) · `tests/verificar.test.js` (U2-04d) · `tests/upgrade.test.js` (U2-upg,
1.5.0 → 1.6.0) · alerta de tamanho para o novo script.

## 14. Correções
- 2026-10-02 — Regra 9: o manifesto e as cópias de segurança também cobrem `system.md` e as
  pontes de arquivo inteiro (frontmatter), não só core e skills. `init` e `--repair-bridges`
  gravam o manifesto.
- 2026-10-02 — Regra 11: a detecção de IDEs usa os arquivos de ponte **próprios** de cada IDE;
  um arquivo compartilhado (`.agents/skills/opencrew/SKILL.md`) só detecta a IDE que não tem
  arquivo próprio (Codex) — senão uma instalação Antigravity ganharia `GEMINI.md`/`QWEN.md`.
- 2026-10-02 — Conferência real (seção 9): no Projeto B a conferência achou os 5 caminhos
  absolutos quebrados, cada um com o novo lugar exato. No Projeto A as 9 fontes da crew estão OK;
  o problema real do logo está **no manual de marca do projeto** (documento lista nomes de
  arquivo que não existem na pasta), fora dos arquivos da crew — não coberto aqui
  (→ IDEIAS: conferir arquivos citados dentro das fontes).
- 2026-10-02 — Simulação 1.5.0 → 1.6.0 revelou falso "editado" por diferença CRLF/LF: o hash de
  arquivos de texto passou a ignorar a quebra de linha (U2-06d) e, sem manifesto, o resumo diz
  "diferentes do pacote novo" em vez de "você editou" (U2-06e). Resultado: 8 cópias (os arquivos
  que mudaram na 1.6.0 + o editado), não 72.
- 2026-10-02 — Mensagens novas do `update` em PT-BR; o resto do CLI continua em inglês até a U5.
- 2026-10-04 — Faxina de documentos depois da revisão das specs
  (`docs/auditoria/2026-10-04-revisao-specs.md`); nenhum código mudou. Não houve auditoria de fim
  de fase da U2: a revisão (lente H3) cumpre esse papel (H3-12). Corrigidos o cabeçalho (faltavam
  `init.js`, `manifest.js` e `migrations.js`) e a seção 13, que apontava os cenários do `update`
  para `tests/update.test.js` (A-35, C-24, H3-13). U2-06d, U2-06e e "U2-02 CLI" ganharam texto na
  seção 8; os testes já existiam. Seções 9 e 10 marcadas só com o que está provado (H3-18).
  Os termos Manifesto e Cópia de segurança (regra 9) entraram no `GLOSSARIO.md` (H3-21).
- 2026-10-04 — Seção 2: C-12 e T-M5 constavam como herdados e cobertos e não foram feitos
  (H3-02: feito na R1 (1.6.1) — R1-08; H3-08 → U4). O que o código não cumpre está na seção 12,
  com destino.
- 2026-10-04 — Seção 7: a frase "só lê/escreve dentro do projeto" afirmava mais do que o script
  garante. Vale para a escrita, e só quando `--crew` aponta para o projeto, porque `--crew` não é
  validado (H3-17, I-14: feito na R1 (1.6.1) — R1-06c). A conferência de existência alcança
  caminhos absolutos de fora do projeto e lista a pasta esperada (regra 2).
- 2026-10-04 — Regra 2, pastas ignoradas e limite: ao procurar um arquivo pelo nome, o script
  ignora também `_build` e tudo que começa com ponto (não só `.git`), e para de indexar em 20.000
  entradas (H3-15).
- 2026-10-04 — Regra 2, alerta "não é portátil": caminho absoluto que existe não muda o status,
  que fica `FONTES:OK` (teste U2-02b); o runner cita o alerta uma vez, sem parar (H3-16).
- 2026-10-04 — Regra 11, critério real da detecção: conta como instalada a IDE que tem um arquivo
  de ponte próprio contendo a palavra "opencrew" (maiúsculas ou minúsculas); o marcador
  `opencrew:start` não é exigido (H3-10, H1-06).
- 2026-10-04 — Regra 14, `.mcp.json`: além do merge, o `update` cria o arquivo quando ele não
  existe (a partir do template) e repõe o servidor `playwright` quando ele foi removido. Servidor
  que já tem `--output-dir` não é tocado; JSON inválido não é alterado e gera aviso (H3-09).
- 2026-10-05 — R1 (1.6.1): `specs/fase-r1-reparos-1-6-1.md` corrigiu os achados da seção 12
  marcados "feito na R1", cada um com teste. Onde a R1 mudou o que esta spec descreve, vale o que
  está abaixo.
  - Seção 2 e regra 11 — C-12 (H3-02): `init --repair-bridges` sem `--ide` e sem `--all` usa a
    mesma detecção do `update` e regrava só as pontes das IDEs instaladas, também com `--yes`
    (R1-08a, R1-08d). Com `--ide`, vale a lista pedida (R1-08f). `--all` sozinho regrava as 9
    (R1-08e). Sem ponte detectada, sem `--ide` e sem `--all`, o comando para com código 1 e não
    escreve nada (R1-08c). O resumo lista cada cópia de segurança, com o caminho em
    `.opencrew-backup/<data>/` (R1-08b). A cópia vale para ponte de arquivo inteiro; ponte de
    bloco marcado editada dentro do bloco é regravada sem cópia, como no `update` → R2. O reparo
    não instala: numa pasta sem workspace do OpenCrew, para com código 1 e não escreve nada; num
    workspace sem `manifest.json`, não cria o manifesto (quem cria é o `update`).
  - Seção 3 e regra 2 — coleta (H3-04): `caminho:` aceita aspas e comentário no fim da linha
    (R1-06a). A conferência lê também todos os `.md` de `agents/` da crew, em qualquer nível:
    agentes e tasks (R1-06b). O caminho relativo citado ali também é procurado na pasta de quem
    cita e, para `agents/X.agent.md`, em `agents/X/`. Não é conferido como caminho: comando entre
    crases (`node …`, `npx …`) e nome com marcador de modelo, como `AAAA-MM-DD` (R1-06j).
  - Seção 6 — mensagens (H3-15): `--corrigir` troca os caminhos de sugestão única e, se sobra
    pendência sem sugestão única, diz quantas; "Nada a corrigir." só aparece sem pendência
    (R1-06d). Pasta citada sem barra final também é procurada como pasta (R1-06e). Quando a busca
    por nome para no limite de itens, o relatório diz que foi parcial (R1-06f). Nesse caso, e
    quando o caminho é o destino de gravação de um agente (linha `Writes to`), o candidato único
    é só listado: não vira sugestão, e o `--corrigir` não troca. A troca do `--corrigir` vale só
    onde o caminho foi lido (entre crases ou no valor de `caminho:`), nunca num pedaço de outro
    texto. Listas longas mostram os 20 primeiros nomes e "… e mais N".
  - Seções 4 e 7 — contrato (H3-17, I-14): a conferência recusa `--crew` de fora do projeto antes
    de ler ou escrever (R1-06c). Também sai com código 1, sem linha `FONTES:`, numa pasta sem
    `_opencrew/` ou com crew inexistente (R1-06g, R1-06h). Os caminhos citados pela crew
    continuam sendo testados dentro e fora do projeto, sem leitura de conteúdo (regra 2).
  - Regras 1 e 2 — runner (H3-05): a conferência roda antes de carregar as fontes; depois do
    `--corrigir`, o runner relê o `crew.yaml` e os agentes já carregados e, se ainda houver
    pendência, pergunta de novo só com "Seguir assim mesmo" e "Parar" (R1-07i). Se o script não roda (sem Node, erro ou sem
    linha `FONTES:`), o runner avisa, segue e repete o aviso na aprovação final (R1-07h). É
    contrato de prompt: a obediência do modelo → U0.
  - Regra 6 e U2-04d — overlay local (H3-01): os limites são os do core, com as chaves que o
    arquivo do overlay declarar por cima; o verificador deixou de usar só o primeiro arquivo que
    existir. Overlay sem `constraints:` usa os limites do core e gera nota (R1-04a, R1-04b,
    R1-upg). A cópia inteira no overlay continua valendo por cima do core, chave a chave; o
    arquivo de acréscimo e o aviso no `update` → U5.
  - Seção 13 — travas: `tests/conferir-fontes.test.js` ganhou os cenários R1-06, divididos com o
    novo `tests/conferir-fontes-r1.test.js`. São novos também
    `tests/init-repair.test.js` (R1-08), `tests/verificar-regras.test.js` (R1-04) e
    `tests/runtime-contracts-r1.test.js` (R1-07h, R1-07i); `tests/upgrade.test.js` ganhou o
    R1-upg (1.6.0 → 1.6.1).
  - Continua fora: o que a seção 12 manda para R2, U4 e U5, e os limites da §12 da spec R1. No
    reparo, a IDE que teve todos os arquivos de ponte próprios apagados não é detectada: só volta
    com `--ide` (critério da detecção → R2, H3-10).
- 2026-10-06 — R2 (1.6.3): os itens "→ R2" da seção 12 e desta seção (detecção de IDE, Codex no resumo, texto antigo das pontes, `.mcp.json`, manifesto ilegível, restos antigos, bloco editado sem cópia) foram tratados em `specs/fase-r2-update-e-envio-seguros.md`. O que entrou está nas regras de lá; o que não entrou tem destino na §11 de lá.
  A regra 11 passa a valer pelo arquivo de ponte, não pela palavra "opencrew"; a regra 14 passa a entregar o servidor Playwright uma única vez; modelo de crew apagado continua voltando (→ U5).
