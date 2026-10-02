# Spec — Fase U2: Crew que conhece o projeto (+ U6 Convivência) — 1.6.0

- **Fase:** U2 · **Módulos:** CLI (`src/commands/update.js`, `src/lib/ides.js`) + Runtime (`templates/`) · **Status:** aguardando aprovação
- **Termos novos no GLOSSARIO.md:** sim — Fontes do projeto, Conferência de fontes, Overlay local
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
| Uso real, dor 4 + T-M5, T-M6, T-M10 | Correções não registradas; memória resetada sem backup; regras contraditórias | U2-04 |
| Uso real, dor 8 (U6) + C-14, C-17 | `AGENTS.md` dividido com outro sistema; "adote o papel" global; restos `opensquad`; `_build/` e logs na raiz | U2-08, U2-09 |
| F2: C-01 | `update` não entrega diretórios novos (agentes-base, config, templates de crew) | U2-05 |
| F2: C-08 + atualização de 2026-10-02 | Skill de catálogo editada pelo usuário sobrescrita sem cópia (aconteceu no Projeto A) | U2-06 |
| F2: C-10, C-12 | Pontes das IDEs nunca atualizadas; `--repair-bridges` cria pontes para IDEs não escolhidas | U2-07 |
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
`conferir-fontes.mjs` só lê/escreve dentro do projeto; `--corrigir` só troca strings de caminho
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
- [ ] No Projeto B: `node _opencrew/core/scripts/conferir-fontes.mjs --crew crews/<crew>`
      depois do `update` → aparecem os caminhos absolutos que quebraram, com o novo caminho
      relativo sugerido. Rodar com `--corrigir` só se concordar.
- [ ] No Projeto A: a mesma conferência aponta o logo com nome diferente e lista os PNGs da pasta.
- [ ] Rodar uma crew: ao corrigir algo num checkpoint, abrir `crews/<crew>/_memory/memories.md`
      e ver a correção gravada antes do fim do run.

## 10. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código.
- [ ] `npm run verify` verde; `tests/upgrade.test.js` cobre 1.5.0 → 1.6.0.
- [ ] Conferência da seção 9 (dois primeiros itens, só leitura sem `--corrigir`).
- [ ] CHANGELOG 1.6.0; release (commit + tag) com confirmação; atualizar A e B com autorização.

## 11. Fora de escopo → destino
| O que não entra | Alocação |
|---|---|
| Ler fontes externas (Google Drive via API, Notion) | → sem fase — só arquivos do projeto |
| Busca semântica dentro das fontes | → U5 (custo) |
| C-11, T-M9, C-20..27 | → U5 |
| Modo equipe / tarefas avulsas no histórico | → U4 |

## 12. Limites conhecidos
- Regras 1, 3, 4 e 7 são seguidas pela IA; os testes garantem o texto e o script → jornada de
  referência (U0).
- Caminhos citados fora de crases nos passos não são conferidos.

## 13. Travas que esta spec deixa
`tests/conferir-fontes.test.js` · `tests/update.test.js` (U2-05…U2-09) · `tests/runtime-contracts.test.js`
(U2-01…U2-07) · `tests/upgrade.test.js` (1.5.0 → 1.6.0) · alerta de tamanho para o novo script.

## 14. Correções
(preenchida durante a implementação)
