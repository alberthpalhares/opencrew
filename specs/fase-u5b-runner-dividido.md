# Spec — Fase U5, fatia 2: Runner dividido (1.13.0)

- **Fase:** U5-2 · **Módulos:** Runtime (`templates/_opencrew/core/runner.pipeline.md`, pasta nova `templates/_opencrew/core/runner/`, `templates/AGENTS.md`, `prompts/entrega.prompt.md` e `formato-da-crew.md` só nas citações) + testes + README + CHANGELOG. Nenhum script e nada do CLI (`src/`) muda · **Status:** aprovada pelo dono (2026-10-07); implementada; aguardando a execução real e o release
- **Termos novos no GLOSSARIO.md:** sim — Núcleo do runner, Parte do runner
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u5-roteiro.md` (fatia 2); `IDEIAS.md`, "Dividir o `runner.pipeline.md`"; levantamento de 2026-10-07 (seção por seção, com as condições e os testes presos a cada cabeçalho).

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **O alvo é 560 linhas, não 450.** O runner tem 872. Sete blocos saem (quadro da §4) e ele fica
   com cerca de 555. Abaixo disso só sobra o que quase toda execução usa (laço de revisão,
   compressão de contexto, veto, formato): tirar esses blocos não economiza nada, porque seriam
   lidos de qualquer jeito, e ainda custaria uma leitura a mais.
2. **Nenhuma regra muda de texto.** Cada bloco é movido como está para um arquivo de
   `_opencrew/core/runner/`; no lugar fica um toco curto, no molde da seção `### Entrega`: quando
   ler, o comando (se houver) e o que nunca fazer.
3. **O resumo "Step Execution Order" sai de vez.** São 17 linhas que repetem a ordem já descrita
   em "For each pipeline step"; nenhum teste depende delas.
4. **O Escritório sai do núcleo.** Só quem ligou o painel lê as 36 linhas dele. O toco mantém a
   frase que impede a IA de mexer no `state.json`.
5. **A economia real é dita como é:** numa execução comum (sem painel, sem tarefas de agente, sem
   contrato de saída, memória já no formato novo), a IA lê o núcleo (ficou com 543) e, no fim, o arquivo
   do fim da execução (111): 654 linhas, contra 872 hoje. Com seleção de agentes, mais
   80. O ganho maior é outro: as regras do fim são lidas no fim, quando valem.

## 1. Objetivo
Toda execução de crew começa lendo 872 linhas, das quais 382 só valem em alguma condição e 121
só no fim. Depois desta fase o `runner.pipeline.md` traz o que toda execução usa, e cada bloco
condicional mora num arquivo próprio, lido só quando a condição acontece. Menos custo por
execução e instruções lidas na hora em que valem. Chega a quem já usa com um `update`.

## 2. O que esta fase herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| Levantamento de 2026-10-07 | 368 linhas usadas sempre, 382 condicionais, 121 só no fim | o quadro da §4 |
| `### Entrega` (U3a fatia 1) | toco de 9 linhas que aponta para `prompts/entrega.prompt.md`; `tests/runtime-contracts-u3a.test.js` fixa o molde | o mesmo molde nos tocos novos (regra 2) |
| `update` | arquivo novo em `_opencrew/core/` chega a quem já usa; arquivo removido fica para trás | só se acrescenta arquivo; o runner continua com o mesmo nome (regra 6) |
| `templates/AGENTS.md`, "Loading the Pipeline Runner", item 7 | repete a seleção de agentes | vira ponteiro (regra 5) |
| Testes `runtime-contracts*.test.js` | cerca de 300 conferências de texto do runner, dois terços por cabeçalho (`sectionOf(runner, '### …')`) | passam a ler o arquivo novo do bloco movido (regra 7) |
| R2-04d, R3-04a | contam comandos escritos no runner (6 do Escritório, 4 do `caminho`, 1 do `entregar`) | contam no runner e nas partes |
| E1 | `estado.mjs` não pode aparecer fora da seção do Escritório | passa a valer: não aparece no núcleo |
| Skills e prompts | citam "nome seguro" e "Output Path Transformation" pelo nome do `runner.pipeline.md` | os dois ficam no núcleo (regra 3) |
| `check-size.js` | todo `.md` de `_opencrew/core/` tem alvo de 400 linhas | cada parte fica abaixo do alvo |

## 3. Entradas
Nenhum comando novo. A IA passa a ler, além do `runner.pipeline.md`, o arquivo de
`_opencrew/core/runner/` que o toco indicar.

## 4. Saídas
Os arquivos novos e o que cada um recebe (linhas do runner de hoje):

| Arquivo em `_opencrew/core/runner/` | Bloco movido | Linhas | Quando a IA lê |
|---|---|---|---|
| `selecao-de-agentes.md` | "4b. Pre-Execution Agent Selection" | 77 | o `crew.yaml` declara `agent_dependencies:` |
| `memoria.md` | nota dos cabeçalhos em PT-BR + "1b. Memory format migration" | 50 | o `memories.md` não tem `## Estilo de Escrita`, está vazio ou não existe |
| `escritorio.md` | "## Escritório (optional live view)" | 36 | `Dashboard: enabled` no `preferences.md` |
| `tarefas-do-agente.md` | "### Task-Based Agent Execution" | 33 | o agente do passo tem `tasks:` no frontmatter |
| `contrato-de-saida.md` | "### Output Contract Validation" | 32 | o passo tem `output_contract:` |
| `fontes-pendentes.md` | de "1c. Source check", o que fazer com `FONTES:PENDENTE` e com o script que não rodou | 17 | a conferência de fontes não terminou em `FONTES:OK` |
| `fim-da-execucao.md` | "2a. Update memories.md", "2b. Prepend to runs.md", "2c. Post-Run Reflection" e o resumo final com o menu | 105 | o pipeline terminou |

Sai sem destino: "### Step Execution Order (Summary)" (17 linhas; decisão 3).
Ficam no núcleo: nome seguro, inicialização (o que sempre roda), carga do agente com formato,
skills e memória, compressão de contexto, caminho de saída, o laço de cada passo, validação da
saída, veto, laço de revisão, o toco da entrega, tratamento de erro e estado em memória.

## 5. Regras
1. O texto de cada bloco movido é o mesmo, linha por linha; muda só o recuo (o bloco que era item de lista perde o recuo da lista), o nível do primeiro
   cabeçalho (vira `#`) e o que depende do lugar ("above", "below", "this section").
2. Cada toco tem no máximo 8 linhas e traz: a condição, exata, para ler o arquivo; o caminho
   `_opencrew/core/runner/<arquivo>.md`; "read it completely and follow it"; e o que vale mesmo
   sem ler (por exemplo, no Escritório: nunca ler, gravar nem descrever o `state.json`).
3. "Safe names in commands (nome seguro)" e "Output Path Transformation" ficam no
   `runner.pipeline.md`, com os mesmos cabeçalhos: skills e prompts os citam por esse arquivo.
4. Quando a condição é falsa, a IA não lê o arquivo. Quando é verdadeira, lê uma vez por
   execução, na hora indicada pelo toco.
5. Em `templates/AGENTS.md`, o item 7 de "Loading the Pipeline Runner" deixa de repetir a seleção
   de agentes: diz que o runner cuida disso.
6. Nenhum arquivo é renomeado nem removido do payload; o `update` só acrescenta `runner/`.
7. Os testes que conferem o texto de um bloco movido passam a ler o arquivo novo, com as mesmas
   frases. Nenhuma conferência de texto é apagada, só a do resumo que saiu (decisão 3), se houver.
8. O `runner.pipeline.md` termina a fase com no máximo 560 linhas; cada arquivo de `runner/`, com
   no máximo 120; a soma do núcleo com todas as partes não passa de 930 (cada parte ganha quatro
   linhas de cabeçalho e cada toco custa de 4 a 7; ficou em 919, contra 872 do arquivo único).
9. Toda citação de seção do runner em outro arquivo do payload (`entrega.prompt.md`: "the final
   menu of the runner"; `formato-da-crew.md`: "Runner (Pre-Execution Agent Selection)") continua
   levando a um texto que existe: aponta para a parte quando o bloco se mudou.

## 6. Textos
Nenhum texto mostrado ao usuário muda. O molde do toco (em inglês, como o runner):

```
### Escritório (optional live view)
Only when the already-loaded `preferences.md` has `Dashboard: enabled`: read
`_opencrew/core/runner/escritorio.md` completely, once, and follow it at each moment it names
(start of the run, each step, each checkpoint, end, abort). With the Dashboard off, read nothing
and run none of its commands. Either way: never read, write or describe
`crews/{name}/state.json` yourself, and a failure there never stops the run.
```

## 7. Cenários
- **U5b-01a** os sete arquivos da §4 existem em `templates/_opencrew/core/runner/`, cada um com no máximo 120 linhas e começando por um cabeçalho `#`.
- **U5b-01b** o `runner.pipeline.md` tem no máximo 560 linhas; a soma com as partes, no máximo 930.
- **U5b-02a** para cada parte, o runner tem um toco que cita o caminho do arquivo, traz "read it completely" e tem no máximo 8 linhas; todo caminho citado existe.
- **U5b-02b** o toco de cada parte traz a condição da §4 (`agent_dependencies:`, `## Estilo de Escrita`, `Dashboard: enabled`, `tasks:`, `output_contract:`, `FONTES:OK`, fim do pipeline).
- **U5b-03a** as frases que os testes das fases anteriores conferiam em cada bloco movido estão no arquivo novo (os testes de E1, R1, R2, R3, U3a e `docs.test.js` passam, lendo a parte).
- **U5b-03b** "Safe names in commands (nome seguro)" e "Output Path Transformation" continuam cabeçalhos do `runner.pipeline.md`; o nome seguro continua antes do primeiro comando.
- **U5b-03c** `estado.mjs` não aparece no núcleo; os seis comandos dele estão em `runner/escritorio.md`; o toco proíbe mexer no `state.json`.
- **U5b-03d** os comandos escritos somam os mesmos de hoje: no núcleo, os quatro do `caminho.mjs`, o do `entregar.mjs`, o do `verificar.mjs` e o do `conferir-fontes.mjs`; os seis do `estado.mjs`, na parte.
- **U5b-03e** o runner não tem mais a seção "Step Execution Order (Summary)".
- **U5b-04a** `templates/AGENTS.md` não repete a matriz da seleção de agentes; manda seguir o runner.
- **U5b-04b** o menu final que o `entrega.prompt.md` cita ("the final menu of the runner") continua existindo: está na parte do fim da execução.
- **U5b-05a** o pacote publicado traz os sete arquivos de `runner/`.
- **U5b-upg-a** workspace 1.12.0 (runner inteiro, sem a pasta `runner/`) → `update` → o runner novo e as sete partes instalados; nenhum arquivo de `crews/` nem de `_opencrew/_memory/` mudou.

## 8. Fora desta fase
| Item | Destino |
|---|---|
| Mexer no texto de alguma regra do runner (score com duas definições, lista "Agent Loading" numerada 1, 2, 3, 5, 6, 4, descrição do `/opencrew run`) | → U5 fatia 3 (score e histórico) · → sem fase — projeto pausado (o resto) |
| Tirar do núcleo o laço de revisão, a compressão de contexto, o veto e a injeção de formato | → sem fase — são lidos em quase toda execução (decisão 1) |
| Dividir `design.prompt.md`, `build.prompt.md` e `sherlock-shared.md` (também acima do alvo) | → sem fase — projeto pausado; são lidos só na criação da crew |
| Apagar do projeto do usuário arquivo que saiu do payload | → sem fase — não há arquivo removido nesta fase |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Conferência mecânica do movimento: para cada bloco, as linhas do arquivo novo são as do runner da 1.12.0, salvo o cabeçalho e as palavras de lugar (script descartável, resultado registrado na §10).
- [ ] Execução real por IA, num projeto de teste: uma crew com `agent_dependencies:` e passo de revisão roda do começo ao fim com o painel desligado, e de novo com o painel ligado; o relatório diz quais partes a IA leu e em que momento, e o que ficou ambíguo nos tocos.
- [ ] Com o sim do dono: release; `update` em A e B com conferência por hash.
- [ ] README (árvore de pastas), CHANGELOG, GLOSSARIO e `IDEIAS.md` atualizados no mesmo commit.

## 10. Limites conhecidos
- **Conferência mecânica do movimento (2026-10-07):** comparadas, sem recuo, as linhas do runner da
  1.12.0 com o núcleo e as sete partes. Nas partes só há de novo o título, a nota "Part of the
  Pipeline Runner", o cabeçalho "Migration" e duas trocas de palavra de lugar ("below" → o nome da
  seção). Do runner antigo só não estão em lugar nenhum as 11 linhas do resumo que saiu e as duas
  frases de abertura dos itens 1b e 4b, que viraram os tocos. O núcleo ganhou 28 linhas (os tocos).
- **Testes:** os arquivos de contrato das fases anteriores passaram a ler o runner "com todas as
  partes carregadas" (`tests/_runner.js`, que repõe cada parte depois do toco, no recuo antigo);
  nenhuma conferência de frase foi apagada. Duas mudaram de alvo: o `state.json` agora é citado
  duas vezes (toco e parte), e o teste de `upgrade` da E1 procura o `estado.mjs` na parte.
- **Desvio da spec aprovada:** a soma do núcleo com as partes ficou em 919 linhas, não em até 890;
  o `entrega.prompt.md` não mudou (a frase "the final menu of the runner" continua verdadeira).
- **Nenhum script mudou**, então não houve revisão de código nesta fatia.
- **Execução real (2026-10-07, `%TEMP%\opencrew-u5b-real-6889`):** uma crew com seleção de
  agentes, tarefas de agente, contrato de saída e memória no formato antigo rodou duas vezes — com
  o painel desligado e ligado (com um REJECT). Nas duas, cada parte foi lida na hora certa e
  nenhuma foi lida com a condição falsa; nenhuma referência quebrou; as sete condições dos tocos
  foram decidíveis sem leitura extra. `fontes-pendentes.md` não foi exercitada (as fontes estavam
  certas), nem os eventos `pular` e `falhar` do painel. O passo `subagent` foi escrito na
  conversa, não despachado. O que a divisão deixou e foi consertado depois dela, só com teste
  automático: "this section" numa parte; a numeração da parte do fim (começa no item 2); os nomes
  das cinco seções da memória voltaram ao núcleo; o ramo `inline` cita as tarefas; o lugar dos
  arquivos de tarefa (`agents/<id>/tasks/`) entrou no `formato-da-crew.md`. O que ela achou e é
  anterior à divisão está no `IDEIAS.md`.
- Se a IA não ler a parte quando a condição acontece, a regra daquela parte não é seguida: é o
  risco de todo arquivo sob demanda, e é por isso que os tocos trazem a condição exata e o que
  nunca fazer. Só a execução real mostra.
- Quem editou o `runner.pipeline.md` à mão no próprio projeto recebe o arquivo novo; o antigo vai
  para `.opencrew-backup/`, como em todo `update`.
- O runner continua acima do alvo de 400 linhas do `check-size.js` (decisão 1).

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 4 | U5b-02a (todo caminho de parte citado existe) |
| 5 | U5b-05a (as partes estão no pacote) |
| 6 | U5b-01b (o runner não volta a crescer acima de 560) |
| 14 | `tests/upgrade-u5b.test.js` (U5b-upg-a) |
