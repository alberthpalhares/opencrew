# Spec — Fase U4, fatia 1: Conserto de crews e caminho de criação (1.11.0)

- **Fase:** U4-1 · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/conserto.mjs`, `scripts/conserto/`, `formato-da-crew.md`, `prompts/repair.prompt.md`, `prompts/discovery.prompt.md`, `prompts/design.prompt.md`, `prompts/build.prompt.md`, `architect.agent.yaml`, `runner.pipeline.md`, `scripts/verificar/proibicoes.mjs`; `templates/AGENTS.md`) + CLI (`src/commands/init.js`, `src/lib/resumo.js`) + `AGENTS.md` + README + testes · **Status:** aprovada pelo dono (2026-10-07); implementada; aguardando a execução real e o release
- **Termos novos no GLOSSARIO.md:** sim — Conserto (de crew), Achado (do conserto), Formato da crew
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `IDEIAS.md` ("Conserto (`repair`) de crews antigas", "Formato canônico de `pipeline.yaml`, de `crew.yaml` e da crew criada", "Achados da execução real de aceite da 1.10.0", itens 6 a 10, "Documento Word", item 8, e "`init --ide=codex --yes`"); auditoria de 2026-10-02 (T-A10, T-A2, T-M14, T-M17 a T-M19, T-B15; H1-01, H2-03, H2-05, H3-03). Recorte decidido pelo dono em 2026-10-07: a U4 sai em três fatias — esta (1.11.0), histórico confiável e modo equipe (1.12.0), estado da execução e `retomar` (1.13.0).
- **Casos reais lidos (só leitura, 2026-10-07):** as três crews dos Projetos A e B, todas na 1.10.0. O que elas mostram está na §2.

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Leitura tolerante, escrita mínima.** O conserto não reescreve a crew para o formato novo. O
   runner e os scripts passam a aceitar as formas antigas que não mudam o resultado (`crew.yaml`
   sem o bloco `crew:`, `file: steps/…` no `pipeline.yaml`). O conserto só grava o que muda o
   comportamento, um item por vez, com cópia `.bak` e com o seu sim.
2. **Quem grava é o script.** A IA conversa e propõe; cada gravação em `crews/` é um comando de
   `conserto.mjs`, que faz a cópia antes. O conserto de nomes que já existe (o
   `crew-party.csv`) passa a ser um dos itens dele.
3. **`max_review_cycles` no `crew.yaml` passa a valer.** Hoje o runner só lê o número no passo de
   revisão; as duas crews do Projeto A o têm no `crew.yaml`, e uma delas pede 2 ciclos e recebe 3.
   O runner passa a ler: passo → `crew.yaml` → 3. Nenhum arquivo do usuário muda.
4. **Express tem passo de revisão, sem agente revisor.** No tier Express o próprio redator faz o
   passo de revisão (com `on_reject`, então o verificador roda). "Toda crew tem revisor" vira "toda
   crew tem um passo de revisão".
5. **Publicação antes da revisão (crews anteriores à 1.4.2): o conserto aponta e explica, não
   reordena.** Nenhuma crew real está assim (as do Projeto A foram recriadas na 1.6.0; a do B não
   publica). Mover passos mexe em números que `on_reject` usa. Quem tiver o caso reordena com
   `/opencrew edit`; a troca automática volta com um caso real.
6. **Proibição sem aspas:** para cada uma, você diz o trecho exato que vira trava, ou marca
   "revisão humana". O script acrescenta ao fim da linha ` — trava: "trecho"` ou
   ` (revisão humana)`; o seu texto não é reescrito. A linha marcada deixa de ser contada como
   pendente pelo verificador.
7. **Aviso depois do `update`:** uma linha fixa no resumo, quando existe ao menos uma crew:
   "Para levar as melhorias novas às crews que você já tem, peça na sua IDE: /opencrew repair".
   O runner não ganha conferência a cada execução.
8. **`init --ide=<lista> --yes` instala só a lista.** Hoje instala as 9 IDEs. `--yes` sozinho
   continua instalando todas.
9. **Agentes-base fora do formato do Build (T-M20) e `extends:` (T-B8)** ficam para a U5: pedem
   reescrever os cinco agentes-base. Aqui só sai a contradição sobre quem faz a junção.

## 1. Objetivo
Hoje as melhorias da 1.4.2 em diante só valem inteiras para crews novas, e criar uma crew nova
depende de a IA adivinhar o formato dos arquivos. Depois desta fase: (a) `/opencrew repair <crew>`
mostra, em português, o que falta numa crew que já existe e conserta um item por vez, com cópia;
(b) a criação tem um formato escrito, um caminho que a IA encontra a partir do ponto de entrada e
perguntas próprias para crew de documento. Chega a quem já usa com um `update`.

## 2. O que esta fase herda
Onde um documento antigo e o código divergem, vale o código (conferido em `98dba95`).

| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| Projeto B, `estatuto` (criada em 2026-08) | `crew.yaml` sem `crew:`, `pipeline:`, `fontes:` e `agent_dependencies`; `pipeline.yaml` com `file: steps/…`; nenhum passo com `format:`; 4 de 5 proibições sem aspas; `id` do agente em forma de caminho | decisão 1; achados `formato`, `fontes`, `proibicao` |
| Projeto A, `propostas-comerciais` | nenhum passo com `format:` (minuta e proposta); `max_review_cycles: 2` no `crew.yaml`, ignorado | achado `formato`; decisão 3 |
| Projeto A, `conteudo-marketing` | no formato atual; o passo de peças visuais, depois da revisão, sem formato | não vira achado (regra 6) |
| A e B | as 4 pastas de modelo em `crews/` (só `discovery.template.yaml`) | regra 12 |
| `verificar.mjs` | item sem formato é medido como `blog-post` (H2-03) | achado `formato` |
| `verificar/proibicoes.mjs` | conta os itens sem aspas (`semAspas`), sem distinguir o que é "revisão humana" | regra 8 |
| `conferir-fontes.mjs --corrigir` (U2) | já conserta caminho absoluto nos passos, com `.bak` | o conserto chama; não refaz |
| `repair.prompt.md` | só nomes e `crew-party.csv`, gravados pela IA | reescrito (decisão 2) |
| Runner, Review Loops, item 3 | `max_review_cycles` só no passo ou na entrada do `pipeline.yaml` | decisão 3 |
| `build.prompt.md` | 4 fragmentos de `crew.yaml`; uma linha sobre `pipeline.yaml`; `tier`, `name`, `icon` e `on_reject` sem lugar | `formato-da-crew.md` |
| `design.prompt.md` | "Writer self-reviews" (Express) × "Every crew needs a reviewer"; "The runner merges" × Build e runner dizem o contrário | decisão 4; regra 17 |
| `discovery.prompt.md` | 5 domínios, nenhum de documento; investigação de perfis oferecida a todos | regra 14 |
| `architect.agent.yaml` | manda ver o fluxo de fases no `SKILL.md`, que só aponta para o `system.md`; o `system.md` não cita as fases nem o caminho do Architect | regra 13 |
| Runner, checkpoint com `outputFile` | só o formato "Research Focus" | regra 18 |
| `build.prompt.md`, Gate 2c | exige checkpoint imediatamente antes de todo passo irreversível e "só irreversíveis depois": impossível com dois seguidos | regra 16 |
| `templates/AGENTS.md`, linha 13 | frase cortada no meio ("(except for `/opencrew documento` and the `") — saiu assim na 1.10.0 | regra 19 |
| `src/commands/init.js`, `resolveIdes` | `--yes` devolve as 9 IDEs antes de olhar `--ide` | decisão 8 |
| Tamanho | runner 875 linhas, design 703, build 673 (alvo 400; contagem do `check-size.js`) | regra 20 |

## 3. Entradas
```
node _opencrew/core/scripts/conserto.mjs --crew "crews/<crew>"
node _opencrew/core/scripts/conserto.mjs --crew "crews/<crew>" --aplicar "<item>" [--aplicar "<item>" …]
node _opencrew/core/scripts/conserto.mjs --ajuda
```
| Entrada | Obrigatória | Validação |
|---|---|---|
| pasta atual do comando (raiz do projeto) | sim | contém `_opencrew/` |
| `--crew`: pasta `crews/<nome>` | sim | dentro do projeto, existente e com `crew.yaml` |
| `--aplicar "<item>"`, pode repetir | não | um dos itens da tabela abaixo; sem ele o script só lê |

Itens de `--aplicar` (o valor vai entre as mesmas aspas do item):

| Item | Valor | O que grava |
|---|---|---|
| `manifesto` | — | `crew-party.csv` com as 6 colunas, a partir dos `.agent.md` |
| `nome:<agente>=<Nome Sobrenome>` | `id` de um agente sem nome de duas palavras; o nome, com duas palavras ou mais, sem aspas | `name:` no frontmatter do agente e a primeira linha `# …` do arquivo (acrescentado na implementação: ver §10) |
| `formato:<passo>=<formato>` | número do passo e um formato que existe em `best-practices` (local ou do core) | a linha `format:` no frontmatter daquele passo |
| `fonte:<caminho>=<para que>` | caminho relativo à raiz do projeto, que existe; texto livre | um item em `fontes:` do `crew.yaml` (cria a chave se faltar) |
| `proibicao:<n>=<trecho>` | número do item na seção de proibições; o trecho aparece no item, sem aspas duplas | ` — trava: "<trecho>"` no fim da linha |
| `proibicao:<n>=revisao-humana` | número do item | ` (revisão humana)` no fim da linha |
| `irreversivel:<passo>` | número do passo (não checkpoint) | `side_effects: irreversible` e `execution: inline` no passo |

## 4. Saídas
**Diagnóstico** (sem `--aplicar`): não grava nada. Imprime, em PT-BR fixo, um bloco por achado e
termina com uma linha de situação.

```
Conserto da crew "estatuto" — 3 achados

[formato] 4 passos que a revisão confere não dizem o formato do texto.
  Sem o formato, o verificador mede cada um como post de blog.
  Passos: 2 (minutas-conciliadas.md), 4 (kit-cartorio.md), 5 (kit-comunicacao.md)…
  Para consertar: --aplicar "formato:<passo>=<formato>"

[fontes] A crew não registra os arquivos do projeto que ela precisa ler.
  …
CONSERTO:PENDENTE
```

| Código | Quando aparece | Quem resolve |
|---|---|---|
| `nome-de-agente` | `name:` do `.agent.md` vazio ou de uma palavra só | script, com o nome que a IA propõe e você confirma; depois `manifesto` |
| `manifesto` | `crew-party.csv` ausente, sem `displayName`, ou com `displayName` vazio ou igual ao `title` | script |
| `formato` | passo que não é checkpoint nem revisão, fica entre o passo de `on_reject` e a revisão, e não tem `format:` | script, com o formato que você confirmar |
| `fontes` | `crew.yaml` sem `fontes:` ou com a lista vazia | script, com os arquivos que você indicar |
| `proibicao` | item da seção de proibições sem trecho entre aspas e sem a marca "(revisão humana)" | script, com a sua resposta para cada item |
| `irreversivel` | passo cujo agente usa skill com `side_effects: irreversible` e que não tem a marca no frontmatter | script, só para o passo que você disser que publica ou envia |
| `sem-revisao` | nenhum passo com `on_reject` | conversa → `/opencrew edit` |
| `sem-aprovacao-final` | depois da revisão não há checkpoint | conversa → `/opencrew edit` |
| `publica-antes` | passo irreversível antes da revisão ou antes do checkpoint que vem depois dela | conversa → `/opencrew edit` (decisão 5) |
| `passo-faltando` | `pipeline.yaml` cita arquivo de passo que não existe, ou `on_reject` aponta para passo que não existe | conversa |

Linha final: `CONSERTO:OK` (nenhum achado) · `CONSERTO:PENDENTE` (há achados) ·
`CONSERTO:APLICADO` (tudo o que foi pedido em `--aplicar` foi gravado; lista o que mudou e as
cópias) · `CONSERTO:ERRO` (entrada inválida ou item recusado; **nada** é gravado).

**Arquivos que o script pode gravar:** `crews/<crew>/crew.yaml`, `crews/<crew>/crew-party.csv`,
`crews/<crew>/agents/*.agent.md`, `crews/<crew>/pipeline/steps/*.md`,
`crews/<crew>/_memory/memories.md` e a cópia `<arquivo>.bak` de cada um. Mais nada.

## 5. Regras
**Script do conserto**
1. O diagnóstico é só leitura. Com `--aplicar`, todos os itens são validados antes; se um for
   recusado, nenhum é gravado e a mensagem diz qual e por quê.
2. Antes de mudar um arquivo, o script grava `<arquivo>.bak` com o conteúdo de antes. Se o `.bak`
   já existe, ele não é sobrescrito: a cópia mais antiga é a que fica. A regra 15 do `AGENTS.md`
   ganha `conserto.mjs` entre os scripts que gravam arquivos da crew.
3. O script muda só a linha que o item pede. O resto do arquivo sai igual, byte a byte: fim de
   linha (LF ou CRLF), BOM, comentários e ordem das chaves.
4. Aplicar duas vezes o mesmo item não muda nada na segunda (formato já igual, fonte já na lista,
   linha já marcada): responde `CONSERTO:APLICADO` com "já estava assim".
5. **Leitura tolerante** (decisão 1): `tier`, `name`, `code`, `description` e `icon` valem dentro
   de `crew:` ou soltos no topo; a entrada `file:` do `pipeline.yaml` vale com ou sem `steps/` na
   frente; o número do passo é o `step:` da entrada, e na falta dele a posição na lista;
   `on_reject` vale como número, com ou sem aspas; o `id` do agente é o nome do arquivo sem
   `.agent.md`, e um `id:` em forma de caminho vale pelo último segmento. Nada disso é achado.
6. `formato` só olha os passos que o verificador mede (do passo de `on_reject` até o anterior à
   revisão). Passo fora desse trecho sem formato não é achado. Formato de exportação (`pdf`,
   `csv`, `formatted-post`) no trecho conta como "sem formato".
7. `fonte:` recusa caminho absoluto, caminho com `..` para fora do projeto e arquivo que não
   existe. Grava no formato que o Build grava (`- caminho:` e `para_que:`).
8. `proibicoes.mjs` deixa de contar como "sem aspas" o item que termina em "(revisão humana)" ou
   que começa por "Sem trava automática". O trecho de ` — trava: "…"` é lido como qualquer termo
   entre aspas (não muda o leitor).
9. `irreversivel` só aparece quando a skill do agente está instalada e declara a marca. O script
   não deduz publicação pelo nome do passo.

**Prompt do conserto (`repair.prompt.md`, reescrito)**
10. Roda o diagnóstico e mostra os achados na ordem em que vieram, um por vez, com a pergunta de
    cada um (§6). Só chama `--aplicar` depois do sim. No fim, roda o diagnóstico de novo e mostra
    o que ficou pendente e onde estão as cópias.
11. Para `formato`, a IA lê o passo e propõe um formato por passo, dentre os que existem; texto
    para imprimir, assinar ou arquivar (ata, ofício, contrato, minuta, proposta, parecer) recebe
    a proposta `documento-oficial`. Para `fontes`, faz a pergunta de fontes do discovery. Depois
    dos itens, roda `conferir-fontes.mjs` e segue o que ele já diz (caminhos absolutos).

**Lista de crews**
12. Pasta de `crews/` sem `crew.yaml` não é crew: não aparece em `list`, `run`, `edit`, `delete`
    nem `repair` (`system.md`, `architect.agent.yaml`, `repair.prompt.md`). As pastas de modelo
    continuam instaladas e continuam servindo ao discovery.

**Caminho de criação**
13. O `system.md` passa a dizer onde está o Architect (`_opencrew/core/architect.agent.yaml`) e o
    Architect lista as fases com o arquivo de cada uma (discovery, investigação, design, build),
    em vez de apontar para o `SKILL.md`.
14. O discovery ganha o domínio `document` (ata, ofício, contrato, proposta, estatuto, parecer,
    relatório formal), com perguntas próprias: quais documentos saem, quem assina e quem recebe,
    quais arquivos do projeto mandam no texto, se há papel timbrado (perfil de documento oficial).
    Nesse domínio a investigação de perfis de referência não é oferecida e o formato sugerido é
    `documento-oficial`.
15. `_opencrew/core/formato-da-crew.md` (novo) traz um `crew.yaml`, um `pipeline.yaml` e o
    frontmatter de um passo de criação, de um de revisão e de um checkpoint, completos, com uma
    linha por campo: quem grava e quem lê. É a única definição de: onde fica `tier` (`crew.tier`);
    `name`, `description`, `icon`; `on_reject` (o número do passo para onde volta);
    `max_review_cycles` (decisão 3); o `id` do agente (regra 5); `model_tier` (só em passo
    `subagent`; no Express, `fast` nesses passos); `agent_dependencies` (gravado quando ao menos
    um agente pode ficar de fora sem quebrar outro; senão, omitido). Build, design, runner e
    repair apontam para ele; os fragmentos repetidos saem do Build.
16. Gate 2c do Build: o passo irreversível vem depois da revisão e é precedido pelo checkpoint de
    aprovação final **ou por outro passo irreversível**.
17. Design: no Express o redator faz o passo de revisão (decisão 4); a junção de `extends:` é do
    Build (sai "The runner merges").
18. Checkpoint com `outputFile`: quando não é foco de pesquisa, o arquivo leva o título do
    checkpoint, a resposta do usuário e a data. O formato "Research Focus" continua para o
    checkpoint que antecede o pesquisador.
19. A frase cortada da linha 13 do `templates/AGENTS.md` é completada: a rota do documento Word e
    o pedido de entrega de uma execução encerrada não exigem o onboarding.

**CLI e tamanho**
20. Runner, build e design não crescem: cada um termina a fase com no máximo as linhas de hoje
    (875, 673, 703, na contagem do `check-size.js`). O que é novo mora em `formato-da-crew.md` e
    no `repair.prompt.md`.
21. `init`: com `--ide`, a lista vence `--yes` e `--all` (como já é em `--repair-bridges`).
22. `update`: a linha da decisão 7 aparece só quando `crews/` tem ao menos uma pasta com
    `crew.yaml`. O `update` continua sem ler nem alterar o conteúdo das crews.

## 6. Textos
Mostrados ao usuário em PT-BR; em outro idioma, a IA traduz as perguntas (a saída do script é fixa).

| Onde | Texto |
|---|---|
| Abertura | "Olhei a crew {nome}. Encontrei {n} ponto(s) para consertar. Vou mostrar um por vez; nada é gravado sem o seu sim, e cada arquivo alterado ganha uma cópia `.bak`." |
| Nada a fazer | "A crew {nome} está em dia: não há o que consertar." |
| `formato` | "Estes passos não dizem que tipo de texto produzem; sem isso, o verificador mede cada um como post de blog. Minha proposta: {passo → formato}. Posso gravar assim?" |
| `fontes` | "Esta crew não registra os arquivos do projeto que ela deve ler antes de escrever. Quais arquivos ou pastas ela precisa conhecer? (Pode responder 'nenhum'.)" |
| `proibicao` | "Esta proibição não tem um trecho entre aspas, então o verificador não consegue barrar: «{item}». Qual trecho exato devo barrar? Se for uma regra de conteúdo, e não uma palavra ou expressão, responda 'revisão humana': ela fica para o revisor." |
| `manifesto` | "O arquivo de nomes da crew está incompleto; por isso aparece a função no lugar do nome. Posso refazer a partir dos arquivos dos agentes?" |
| `nome-de-agente` | "O agente {id} está sem nome de pessoa. Proponho {Nome Sobrenome}. Posso gravar?" |
| `irreversivel` | "O passo {n} é feito por um agente que tem uma ferramenta de publicar ou enviar ({skill}). Este passo publica ou envia alguma coisa para fora do projeto? Se sim, marco o passo para que ele nunca seja repetido sozinho." |
| `sem-revisao` | "Esta crew não tem passo de revisão: nada é conferido antes de chegar a você. Isso se resolve editando a crew: /opencrew edit {nome}." |
| `sem-aprovacao-final` | "Depois da revisão não há um ponto de aprovação seu. Isso se resolve editando a crew: /opencrew edit {nome}." |
| `publica-antes` | "O passo {n} publica ou envia antes da revisão e da sua aprovação final. Enquanto estiver assim, o que sai não passou pela revisão. Isso se resolve editando a crew: /opencrew edit {nome}." |
| Fecho | "Pronto: {k} conserto(s) gravado(s). Cópias do que mudou: {lista de .bak}. Ficou pendente: {lista ou 'nada'}." |
| `update` | "Para levar as melhorias novas às crews que você já tem, peça na sua IDE: /opencrew repair" |

## 7. Cenários
Cada cenário vira ao menos um teste com o mesmo ID no nome. As crews de teste são escritas
literalmente nos testes, com nomes inventados (nada dos Projetos A e B entra no repositório).

**Diagnóstico**
- **U4a-01a** DADO uma crew no formato atual, com formatos, fontes e proibições entre aspas QUANDO rodo o diagnóstico ENTÃO sai "não há o que consertar", `CONSERTO:OK`, e a árvore do projeto é igual antes e depois.
- **U4a-01b** DADO uma crew como a do Projeto B (`crew.yaml` sem `crew:`, `file: steps/…`, sem `fontes:`, passos sem formato, proibições sem aspas) ENTÃO saem `formato`, `fontes` e `proibicao`, nessa ordem, `CONSERTO:PENDENTE`, e nada é gravado.
- **U4a-01c** `tier` solto no topo, `id:` em forma de caminho e `on_reject: "8"` com aspas não são achados (regra 5).
- **U4a-01d** passo sem formato depois da revisão não é achado; passo com `format: pdf` dentro da revisão é (regra 6).
- **U4a-01e** crew sem passo com `on_reject` → `sem-revisao`; `formato` não aparece (não há trecho medido).
- **U4a-01f** revisão sem checkpoint depois → `sem-aprovacao-final`.
- **U4a-01g** passo com `side_effects: irreversible` antes da revisão → `publica-antes`, com o número do passo.
- **U4a-01h** agente com skill instalada que declara `side_effects: irreversible` e passo sem a marca → `irreversivel`; skill não instalada → sem achado (regra 9).
- **U4a-01i** `pipeline.yaml` cita arquivo que não existe; `on_reject: 9` numa crew de 7 passos → `passo-faltando`.
- **U4a-01j** `crew-party.csv` sem `displayName` → `manifesto`; `name:` de uma palavra só → `nome-de-agente`.
- **U4a-01k** pasta sem `crew.yaml`, pasta fora do projeto, `--crew` ausente → `CONSERTO:ERRO` com a frase do motivo; nada gravado.

**Aplicar**
- **U4a-02a** `formato:4=documento-oficial` grava a linha `format:` no passo 4, cria `step-04-….md.bak` igual ao arquivo de antes, e o resto do arquivo sai igual byte a byte (com CRLF e com LF).
- **U4a-02b** formato que não existe em `best-practices` → `CONSERTO:ERRO`; com dois itens, um válido e um recusado, nenhum é gravado (regra 1).
- **U4a-02c** `.bak` que já existe não é sobrescrito (regra 2).
- **U4a-02d** aplicar o mesmo item duas vezes: a segunda não muda nenhum arquivo (regra 4).
- **U4a-02e** `fonte:` cria a chave `fontes:` num `crew.yaml` sem ela; acrescenta ao fim da lista quando existe; recusa caminho absoluto, `..` para fora e arquivo inexistente. Depois dela, `conferir-fontes.mjs` lê a fonte nova.
- **U4a-02f** `proibicao:2=<trecho>` acrescenta ` — trava: "<trecho>"`; `verificar.mjs` passa a bloquear um texto com o trecho; trecho que não está no item ou com aspas duplas é recusado.
- **U4a-02g** `proibicao:3=revisao-humana` marca a linha; o verificador deixa de contá-la como sem aspas; linha que começa por "Sem trava automática" também não conta (regra 8).
- **U4a-02h** `manifesto` refaz o `crew-party.csv` com as 6 colunas, na ordem do CSV antigo, com aspas em campo com vírgula ou espaço.
- **U4a-02i** `irreversivel:13` grava as duas linhas; passo checkpoint é recusado.
- **U4a-02j** (trava da regra 15) em todos os cenários de aplicar, fora dos arquivos da §4 e dos seus `.bak`, a árvore do projeto é igual antes e depois.
- **U4a-02l** `nome:rita-redacao=Rita Redação` grava o nome no frontmatter e no título do arquivo do agente, com `.bak`; `manifesto` na mesma chamada já leva o nome novo; nome de uma palavra, agente que não existe e agente que já tem nome são recusados.
- **U4a-02k** depois de aplicar `formato`, `fontes` e `proibicao` na crew do U4a-01b, o diagnóstico responde `CONSERTO:OK`.

**Runtime (contratos de texto dos prompts)**
- **U4a-03a** `repair.prompt.md` manda rodar o diagnóstico, perguntar antes de cada `--aplicar` e repetir o diagnóstico no fim; não manda a IA gravar em `crews/` por conta própria.
- **U4a-03b** `system.md`, Architect e repair dizem que pasta sem `crew.yaml` não é crew (regra 12).
- **U4a-03c** o `system.md` cita o caminho do Architect; o Architect cita os quatro prompts de fase e não cita `SKILL.md`; todo caminho citado existe (regra 13).
- **U4a-03d** o discovery tem o domínio `document`, com as quatro perguntas, sem oferta de investigação de perfis e com `documento-oficial` (regra 14).
- **U4a-03e** `formato-da-crew.md` existe, é citado por build, design, runner e repair, e define cada campo da regra 15; o exemplo de `crew.yaml` e o de `pipeline.yaml` passam pelo diagnóstico com `CONSERTO:OK`.
- **U4a-03f** o runner lê `max_review_cycles` do passo, depois do `crew.yaml`, depois 3 (decisão 3).
- **U4a-03g** design: Express com passo de revisão feito pelo redator; nenhuma frase "The runner merges" (regra 17). Build: Gate 2c aceita dois irreversíveis seguidos (regra 16).
- **U4a-03h** checkpoint com `outputFile` tem os dois formatos (regra 18).
- **U4a-03i** `templates/AGENTS.md` não tem linha terminando em crase aberta; a frase da regra 19 está inteira.
- **U4a-03j** runner ≤ 875, build ≤ 673, design ≤ 703 linhas, e `formato-da-crew.md` ≤ 400 (regra 20).

**CLI e chegada a quem já usa**
- **U4a-04a** `init --ide=codex --yes` e `init --ide=codex --all` instalam só a ponte do Codex; `init --yes` sem `--ide` continua instalando as 9.
- **U4a-04b** `update` num projeto com ao menos uma crew mostra a linha da decisão 7; sem crew (só as pastas de modelo), não mostra.
- **U4a-upg-a** DADO um workspace 1.10.0 escrito literalmente, com a crew do U4a-01b QUANDO roda o `update` ENTÃO `conserto.mjs`, `formato-da-crew.md` e o `repair.prompt.md` novo estão instalados, nenhum arquivo de `crews/` mudou (hash), e o diagnóstico roda nessa crew com `CONSERTO:PENDENTE`.

## 8. Fora desta fase
| Item | Destino |
|---|---|
| Histórico confiável (`runs.md`: uma definição de score, execução sem linha e linha sem pasta), modo equipe (`/opencrew pedir`), entrega avulsa, tema da execução no nome da pasta, Regra de Ouro (T-M5) | → U4 fatia 2 (1.12.0) |
| `run-state.json`, `/opencrew retomar`, replay e sinais do Escritório que dependem dele | → U4 fatia 3 (1.13.0) |
| Reordenar sozinho a publicação que vem antes da revisão (H1-01, T-B15) | → sem fase — nenhuma crew real está assim; volta com um caso real (decisão 5) |
| Agentes-base no formato do Build e `extends:` (T-M20, T-B8) | → U5 — pede reescrever os cinco agentes-base (decisão 9) |
| Reescrever o `crew.yaml` antigo para o formato novo | → sem fase — a leitura tolerante dá o mesmo resultado sem tocar no arquivo |
| Verificador ver imagem, `:::` desconhecido e assinaturas sem fim antes do revisor; a linha "Não medido" de `documento-oficial` (aceite da 1.10.0, item 1) | → U5 — é aviso do verificador, junto dos itens 2 a 5 e do item 9 da entrada do documento Word; não é conserto de crew nem criação |
| "1 fontes" e caminho citado contado como fonte (aceite da 1.10.0, item 11) | → U5 (já alocado) |
| `design.yaml` com `input_file`/`output_file` e o passo com `inputFile`/`outputFile` | → U5 — arquivo interno da criação; não chega ao runner |
| Ativar o documento Word por pedido em texto em conversa nova | → U4 fatia 2 — é pedido avulso, como o modo equipe |
| Dividir o runner | → U5 (já alocado) |

O `IDEIAS.md` é atualizado no commit desta fase: saem as entradas entregues; o item 1 dos achados
da 1.10.0 muda de U4 para U5, com o motivo acima.

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa.
- [ ] Conferido num checkout limpo do commit (`git worktree`), e o CI verde nas 4 células antes da tag.
- [ ] Execução real por IA, num projeto de teste fora do repositório: criar uma crew de documento
      (ata) pelo caminho novo, da descoberta ao Build, e rodar o diagnóstico nela (`CONSERTO:OK`);
      depois, numa crew antiga escrita à mão como a do U4a-01b, seguir o `/opencrew repair` até o fim.
- [ ] Com o seu sim: `update` nos Projetos A e B e diagnóstico (só leitura) nas três crews reais;
      o que ele apontar é mostrado a você. Aplicar conserto em crew real é decisão sua, crew por crew.
- [ ] `AGENTS.md` (regra 15 e tabela Regra → Trava), README, CHANGELOG, GLOSSARIO e `IDEIAS.md`
      atualizados no mesmo commit.

## 10. Limites conhecidos
- O formato que a IA propõe para cada passo é julgamento dela; o script só confere que o formato
  existe. Você confirma antes de gravar.
- Uma regra de conteúdo ("nunca prever votação por aclamação") não vira trava de texto: fica
  marcada como revisão humana. É o caso de 4 das 5 proibições da crew do Projeto B.
- O diagnóstico não sabe se um passo publica quando a crew publica por instrução no texto do
  passo, sem skill marcada.
- A linha do `update` aparece a cada `update`, mesmo com as crews já consertadas: o CLI não lê as crews.
- **Desvios da spec aprovada, feitos na implementação:** (a) o item `nome:<agente>=<Nome>` não
  estava na spec. Sem ele, o conserto de nome — que o `repair` antigo fazia — dependeria de a IA
  editar o arquivo do agente, contra a decisão 2; (b) os números da regra 20 estavam na contagem
  sem linhas em branco: valem os do `check-size.js`; (c) quatro testes antigos foram alinhados
  ao comportamento novo (`docs.test.js`: o repair pelo script e o tier no arquivo de formato;
  `runtime-contracts-r1.test.js`, R1-07b: o limite de ciclos também no `crew.yaml`).
- **Da revisão do código (2026-10-07), tudo com teste em `tests/conserto-bordas.test.js`:** passo
  citado fora da crew (`..` ou caminho absoluto) não é lido nem alterado; comentário na coluna 0
  e chave de bloco interno não mudam a leitura do `pipeline.yaml`; arquivo que não está em UTF-8
  ou está protegido é recusado antes de qualquer gravação; `fontes:` escrita numa linha só e
  campo que ocupa mais de uma linha são recusados (o script não reescreve bloco); valor que já é
  o pedido não é regravado; a trava só é aceita se o verificador a lê de volta. Se a gravação
  falha no meio por outro motivo, a mensagem diz quais arquivos já foram gravados.
- **Da execução real (2026-10-07, `%TEMP%\opencrew-u4a-real-3192`):** a crew de ata criada pelo
  caminho novo deu `CONSERTO:OK`; a crew antiga foi de 5 achados a `CONSERTO:OK`, com as 6
  cópias iguais aos originais e nada alterado fora dela. Ajustes que saíram dela: o prompt do
  conserto cita `--corrigir` e não mostra códigos nem comandos ao usuário; o nome do agente vem
  antes do manifesto; as respostas da crew de documento têm campo no `discovery.yaml`; o segundo
  formato de uma crew de documento (um aviso de WhatsApp) é guardado; o modelo de agente do Build
  usa o `id` curto; `icon` entra no `design.yaml`. Não houve segunda execução real depois dos
  ajustes. O que ela achou e é anterior a esta fase está no `IDEIAS.md`.
- `irreversivel` aparece em todo passo do agente que tem a skill, mesmo no que só prepara o
  material; quem responde "não publica" verá o achado de novo no próximo diagnóstico.
- `fontes` continua pendente para quem responde "nenhum": o script não grava lista vazia.
- Seguir o caminho de criação e o prompt do conserto depende da IA; os testes medem o texto dos
  prompts e o script, não a obediência do modelo (regra 7 do `AGENTS.md`).

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 3 e 15 | `tests/conserto*.test.js` (U4a-02j: árvore igual fora dos arquivos combinados; U4a-02c: `.bak` preservado) |
| 4 | `tests/template-refs.test.js` passa a cobrir `formato-da-crew.md` e os caminhos citados pelo Architect |
| 6 | U4a-03j (os três prompts não crescem) |
| 12 | U4a-02f e 02g (a trava da proibição é medida pelo verificador) |
| 14 | `tests/upgrade-u4a.test.js` (U4a-upg-a) |
