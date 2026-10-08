# Spec — Fase U5, fatia 4: Modo equipe — pedido avulso à crew (1.15.0) e fechamento

- **Fase:** U5-4 · **Módulos:** Runtime (`templates/_opencrew/core/`: prompt novo `prompts/pedido.prompt.md`, parte nova `runner/correcao-no-checkpoint.md`, `runner.pipeline.md`, `runner/retomar.md`, `prompts/repair.prompt.md`, `prompts/documento.prompt.md`, `scripts/caminho.mjs`, `scripts/execucao/`, `scripts/conserto/`, `scripts/conferir-fontes.mjs`; `templates/AGENTS.md`) + README + CHANGELOG + GLOSSARIO + `IDEIAS.md` + `STATUS.md` + testes. O CLI (`src/`) não muda · **Status:** escrita em 2026-10-08; **aprovada pelo dono em 2026-10-08** ("aprovado"); implementada em 2026-10-08 — os desvios do texto aprovado estão na §12
- **Termos novos no GLOSSARIO.md:** sim — Pedido (pedido avulso), amplia "Execução" e "Registro da execução"
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u5-roteiro.md` (fatia 4 e fechamento); `IDEIAS.md` — "Modo equipe", item 8 de "Documento Word", itens 1 e 10 de "Achados da execução real de aceite da 1.14.0" (decisão do dono em 2026-10-08); jornada de uso real, dor 7 ("a crew virou equipe permanente: as execuções seguintes foram tarefas avulsas, fora do pipeline").

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Um pedido é uma execução, só que sem pipeline.** `/opencrew pedir <crew> "<tarefa>"` abre uma
   pasta de execução e um registro como qualquer outra, marcados como pedido. Com isso o pedido
   ganha, sem código novo, o que a 1.14.0 deu às execuções: linha no histórico, score, `retomar` e
   a entrega de sempre.
2. **Não haverá `entregar.mjs` sem `--run`** (o roteiro previa). Como todo pedido tem pasta de
   execução, a entrega avulsa é a entrega daquela pasta. Entregar arquivo que não nasceu de um
   pedido nem de uma execução fica de fora.
3. **Quem faz o pedido é um agente da crew, escolhido pela IA e dito ao usuário antes de começar**
   ("Quem faz: {nome}. Posso começar?"). O usuário pode trocar. A revisão entra quando a crew tem
   revisor e o pedido produz texto: o verificador roda antes dele, como no pipeline.
4. **Sempre há uma aprovação sua no fim**, antes da entrega. É o único checkpoint do pedido; pedido
   nunca publica nem envia nada (passo irreversível é só do pipeline).
5. **No histórico, o pedido aparece na mesma tabela**, com o tema começado por "Pedido: ". As
   colunas não mudam.
6. **Documento Word por pedido em texto:** "transforma {arquivo} em Word", dito em qualquer
   conversa, leva ao prompt do documento — hoje só o comando `/opencrew documento` leva. O pedido à
   crew cujo texto é `documento-oficial` sai em Word pela entrega, como no pipeline.
7. **Correção num checkpoint do meio ganha procedimento** (item 1): quem refaz, onde grava e o que
   é mostrado de novo. Vai para uma parte do runner; o núcleo não cresce.
8. **"Nenhum" nas fontes passa a ser uma resposta gravada** (item 10): a crew deixa de ficar
   `CONSERTO:PENDENTE` para sempre.
9. **Fechamento no mesmo commit:** `IDEIAS.md` com "sem fase — projeto pausado" no que não entrou,
   roteiro fechado e "Como retomar" no `STATUS.md` e no README de quem mantém (`CONTRIBUTING.md`).

## 1. Objetivo
Hoje a crew só sabe rodar o pipeline inteiro. No uso real ela virou equipe: depois da primeira
execução, o que se pede a ela é uma tarefa solta ("refaz o comunicado com a data nova", "escreve o
ofício para a prefeitura"), feita na conversa, fora da pasta de saída, fora do histórico e sem
verificação. Depois desta fase esse pedido tem um comando, usa os agentes, a memória e as fontes da
crew, passa pelo verificador e pela sua aprovação, é entregue como uma execução e fica no
histórico. Chega a quem já usa com um `update`; nenhuma crew precisa mudar.

## 2. O que esta fase herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| `execucao.json` (U5-3) | registro por execução: tema, passos, marcos, situação | ganha `tipo: "pedido"` (regra 2) |
| `caminho.mjs pasta` | cria a pasta e o registro; `--tema`, `--passos` | ganha `--pedido` (regra 2) |
| `caminho.mjs saida`/`entrada`/`conferir --passo` | caminho pela regra do `outputFile` declarado no passo | o pedido não tem passo: o arquivo é declarado pela IA como `crews/<crew>/output/<nome>.md` (regra 5) |
| `execucao.mjs fechar` | grava a linha do `runs.md` | prefixa o tema do pedido (regra 8) |
| `execucao.mjs retomar` | próximo passo pelo `pipeline.yaml` | pedido aberto: diz que é pedido e o que já foi gravado (regra 9) |
| `entregar.mjs --run` | não depende do pipeline | usado como está (regra 7) |
| `verificar.mjs`, memória, fontes, formatos | rodam por arquivo e por crew | usados como estão |
| Runner, "If `type: checkpoint`" | "Correction → memory, right away" (6 linhas) e "Correction vs. company profile" (3) | saem do núcleo para a parte nova, com o procedimento que falta (regra 11) |
| `conserto.mjs`, achado `fontes` | some só com um `caminho:` na lista | some também com a resposta "nenhuma" gravada (regra 13) |
| `documento.prompt.md` (U3b) | rota só por `/opencrew documento` e pelo menu | rota também por pedido em texto (regra 10) |
| Tamanho | núcleo do runner em 560 linhas, no teto; total 980 | regra 15 |

## 3. Entradas
```
/opencrew pedir <crew> "<tarefa>"            (ou em texto: "peça à crew X: …")
node _opencrew/core/scripts/caminho.mjs "<crew>" pasta --pedido --tema "<tarefa em poucas palavras>" [--agente <id>] [--formato <id>]
node _opencrew/core/scripts/conserto.mjs --crew "crews/<crew>" --aplicar "fonte:nenhuma"
```
| Entrada | Validação |
|---|---|
| `<crew>` | uma crew que existe (pasta com `crew.yaml`); sem ela, a IA lista e pergunta |
| `<tarefa>` | texto livre; vazio → a IA pergunta "O que você quer pedir à crew {nome}?" |
| `--pedido` | sem valor; só vale no `pasta`; com `--passos` é erro de uso |
| `fonte:nenhuma` | sem `=`; recusado se a crew já tem fonte registrada |

## 4. Saídas
- **Registro:** o mesmo `execucao.json`, com `"tipo": "pedido"` logo depois de `tema` (execução de
  pipeline não tem o campo; ausente = pipeline). `passosPrevistos` fica `null`.
- **Passos de um pedido:** o trabalho do agente é o passo 1; a revisão, quando há, é o passo 2; a
  aprovação final é o passo seguinte ao último (2 ou 3). São esses os números do `conferir --passo`
  e do `marcar`.
- **Arquivos:** `crews/<crew>/output/<run>/v1/<nome>.md` (e `v2/…` a cada reescrita), `revisao.md`
  quando há revisor, `verificacao-ciclo-N.md`, `entrega/`.
- **Linha do `runs.md`:** `| 2026-10-08 | 2026-10-08-143022 | Pedido: ofício para a prefeitura | Ofício | 1/1 | Aprovado |`
- **`retomar` de um pedido aberto:** as linhas de sempre, mais `Tipo: pedido` depois de `Tema:`; a
  última é `EXECUCAO:RETOMAR <run> <passo>` com o passo pela regra da §4.
- **Conserto:** `crew.yaml` com `fontes: []`.

## 5. Regras
**Pedido**
1. `/opencrew pedir <crew> "<tarefa>"` e o pedido em texto ("peça à crew {nome}…", "pede para a
   equipe {nome}…") carregam `prompts/pedido.prompt.md`. O onboarding vale como no `run`.
2. O pedido começa com `pasta --pedido --tema "…"`: nasce a pasta da execução e o registro com
   `tipo: pedido`. Daí em diante valem as regras de registro da U5-3 (só script grava; falha de
   gravação não para o trabalho).
3. Antes de trabalhar, a IA carrega o que o `run` carrega (perfil da empresa, preferências, memória
   da crew, conferência de fontes e fontes) e diz quem vai fazer e o que vai sair: "Quem faz:
   {Nome} ({função}). Vai sair: {arquivo}, como {formato}. Posso começar?" Sem agente que sirva,
   diz isso e oferece `/opencrew edit` ou `/opencrew create`; não improvisa um agente.
4. O agente trabalha com o contexto do pipeline: definição completa do agente, bloco de memória,
   regras de veracidade, formato (quando o texto tem um: a IA propõe, pelas mesmas regras do
   `repair`) e skills da crew. Skill com `side_effects: irreversible` não é usada num pedido: a IA
   diz "Um pedido não publica nem envia; para isso use o pipeline da crew."
5. O arquivo é gravado pelo caminho que o `saida` devolve para `crews/<crew>/output/<nome>.md`
   (`<nome>` curto, em minúsculas, sem acento nem espaço, escolhido pela IA) e conferido com
   `conferir --passo 1`.
6. Com revisor na crew e saída em texto: `verificar.mjs` no arquivo, depois o revisor, com as
   regras do revisor do runner; o veredito vai com `marcar --evento revisao`. Rejeição volta ao
   agente; no máximo `max_review_cycles` da crew (3 se não houver). Sem revisor, o verificador roda
   do mesmo jeito e o relatório é mostrado na aprovação.
7. Aprovação final: mostra o caminho do arquivo e o resumo do verificador, pergunta "Aprova como
   está, quer um ajuste ou cancela?", e grava a resposta com `marcar --evento checkpoint`. Ajuste →
   procedimento da regra 11. Aprovado → `entregar.mjs --run` (como no fim do pipeline, pelo
   `entrega.prompt.md`), memória (2a do fim da execução), `fechar --resultado aprovado`, reflexão
   (2c). Cancelado → `fechar --resultado abortado`, sem entrega.
8. No `fechar`, o tema de um registro com `tipo: pedido` vai para o `runs.md` como "Pedido: {tema}".
   Score e data como nas outras execuções.
9. `retomar` trata o pedido aberto como execução aberta: a IA mostra o que já foi gravado e segue
   pelo `pedido.prompt.md`, não pelo pipeline. O achado `historico` do conserto vale igual.
10. Pedido em texto para transformar um arquivo em Word ("transforma {arquivo} em Word", "gera o
    .docx de {arquivo}") é roteado ao `documento.prompt.md`, que não usa crew nem histórico.

**Correção no checkpoint (item 1)**
11. Parte nova `runner/correcao-no-checkpoint.md`, lida quando a resposta de um checkpoint pede
    mudança. Ela diz, nesta ordem: (a) gravar a correção na memória já (o texto que hoje está no
    núcleo, igual); (b) se a correção é sobre um arquivo que um passo anterior gravou: o agente
    daquele passo reescreve, o arquivo vai para a versão seguinte pelo `saida`, passa pelo
    `conferir --passo` do passo dele e pelo veto; (c) o checkpoint é mostrado de novo com o arquivo
    novo; (d) só então o `marcar`: uma vez por checkpoint, `corrigido` se houve qualquer correção
    antes do aceite; (e) correção que contradiz o perfil da empresa: a pergunta de hoje, igual;
    (f) dado que o usuário fornece para um `[PREENCHER]` na aprovação final segue (b) e (c), e não
    conta como correção (`aprovado`).
12. No núcleo ficam o toco (até 3 linhas) e a frase "Never continue past a checkpoint without user
    input"; as 9 linhas de hoje saem.

**Fontes (item 10)**
13. `--aplicar "fonte:nenhuma"` grava `fontes: []` no `crew.yaml` (com `.bak`); o achado `fontes`
    some quando a crew tem uma fonte ou tem `fontes: []`. Um `fonte:<caminho>=…` depois troca a
    lista vazia pela fonte. A conferência de fontes do runner trata `fontes: []` como hoje trata a
    falta da lista (`FONTES:OK`, 0 fontes).
14. No `repair.prompt.md`, a resposta "nenhum" à pergunta das fontes leva a esse comando, depois de
    "Certo: a crew fica registrada como sem arquivos do projeto para ler. Posso gravar?"

**Tamanho e fechamento**
15. Núcleo do runner ≤ 560 linhas; partes ≤ 120; total (núcleo + partes) ≤ 1.020. O
    `pedido.prompt.md` ≤ 160 linhas.
16. Fechamento, no commit desta fatia: no `IDEIAS.md`, toda entrada com `→ U5` que não entrou vira
    `→ sem fase — projeto pausado`; o roteiro `fase-u5-roteiro.md` ganha a situação final de cada
    fatia; `CONTRIBUTING.md` ganha "Como retomar o projeto" (onde estão as specs, o que cada trava
    cobre, a ordem do release, o que ficou de fora e por quê); o README diz que o projeto está em
    manutenção.

## 6. Textos
| Onde | Texto |
|---|---|
| Sem tarefa | "O que você quer pedir à crew {nome}?" |
| Antes de começar | "Quem faz: {Nome} ({função}). Vai sair: {arquivo}, como {formato}. Posso começar?" |
| Sem agente que sirva | "Nenhum agente da crew {nome} faz esse tipo de trabalho. Dá para acrescentar um com /opencrew edit {nome}, ou criar outra crew." |
| Pedido que publicaria | "Um pedido não publica nem envia; para isso use o pipeline da crew." |
| Aprovação | "Aprova como está, quer um ajuste ou cancela?" |
| Fim | "Pedido entregue: {pasta da entrega}. Ficou no histórico da crew {nome}." |
| Fontes, "nenhum" | "Certo: a crew fica registrada como sem arquivos do projeto para ler. Posso gravar?" |

## 7. Cenários
- **U5d-01a** `pasta --pedido --tema "Ofício para a prefeitura"` cria a pasta e o registro com `tipo: "pedido"`, `passosPrevistos: null`; sem `--pedido` o registro não tem o campo (como na 1.14.0, byte a byte).
- **U5d-01b** `pasta --pedido --passos 3` e `saida … --pedido` são erro de uso, sem gravar.
- **U5d-02a** pedido com `conferir --passo 1`, `marcar` da aprovação (passo 2) e `fechar --resultado aprovado --saida "Ofício"`: a linha é `| … | Pedido: Ofício para a prefeitura | Ofício | 1/1 | Aprovado |`; execução de pipeline com o mesmo tema sai sem o prefixo.
- **U5d-02b** `fechar --resultado abortado` de um pedido: linha `Pedido: …` com `Abortado`.
- **U5d-03a** `retomar` com um pedido aberto que tem o passo 1 conferido: `Tipo: pedido` depois de `Tema:` e `EXECUCAO:RETOMAR <run> 2`; a crew sem `pipeline.yaml` legível não quebra o comando.
- **U5d-03b** `entregar.mjs --run <pedido>` monta a entrega e o LEIA-ME abre com "Entrega — {crew} — {tema} ({run})"; fora da pasta do pedido, a árvore do projeto é igual antes e depois (trava da regra 15 do `AGENTS.md`).
- **U5d-04a** `pedido.prompt.md` existe; tem os comandos `pasta --pedido`, `saida`, `conferir --passo 1`, `verificar.mjs`, `marcar`, `entregar.mjs --run`, `fechar`; os textos da §6; "never read, write or describe `execucao.json`"; a proibição de skill irreversível; ≤ 160 linhas; toda referência dele existe (`template-refs`).
- **U5d-04b** `system.md` tem a rota `/opencrew pedir <name> "<task>"`, a rota do pedido em texto e a do Word em texto; o menu "Run an existing crew" não muda.
- **U5d-04c** `runner/retomar.md` diz que um registro `Tipo: pedido` segue pelo `pedido.prompt.md`.
- **U5d-05a** `runner/correcao-no-checkpoint.md` existe, com o toco no núcleo; tem as frases de memória e de perfil da empresa que estavam no núcleo, o procedimento (b) a (d) e a regra do `[PREENCHER]`; o núcleo não as repete e tem ≤ 560 linhas; total ≤ 1.020.
- **U5d-06a** `--aplicar "fonte:nenhuma"` numa crew sem `fontes:` grava `fontes: []` com `.bak` e o diagnóstico seguinte não tem o achado `fontes`; numa crew com fonte, é recusado sem gravar.
- **U5d-06b** depois de `fonte:nenhuma`, `--aplicar "fonte:Regras/estatuto.md=regras"` deixa a lista com a fonte e sem `[]`; `conferir-fontes.mjs` numa crew com `fontes: []` responde `FONTES:OK`.
- **U5d-06c** `repair.prompt.md` tem o caminho do "nenhum" com a pergunta da §6.
- **U5d-07a** fechamento: nenhuma entrada do `IDEIAS.md` tem `Alocação: → U5`; `CONTRIBUTING.md` tem a seção "Como retomar o projeto"; o roteiro lista as quatro fatias com versão publicada.
- **U5d-upg-a** workspace 1.14.0 com uma crew → `update` → `pedido.prompt.md` e `runner/correcao-no-checkpoint.md` instalados; nenhum arquivo de `crews/` mudou; o `caminho.mjs` instalado aceita `pasta --pedido`.

## 8. Fora desta fase
| Item | Destino |
|---|---|
| `entregar.mjs` sem `--run` (arquivo que não nasceu de pedido nem de execução) | → sem fase — o pedido cobre o caso real (decisão 2) |
| Pedido que usa mais de um agente em sequência, ou que cria um mini-pipeline | → sem fase — projeto pausado; para isso existe o pipeline |
| Pedido que publica ou envia | → sem fase — irreversível fica só no pipeline, atrás da aprovação final |
| Promover um pedido repetido a passo do pipeline | → sem fase — projeto pausado |
| Itens 2 a 9, 11 e 12 dos achados da execução real da 1.14.0 | → sem fase — projeto pausado (`IDEIAS.md`) |
| Tudo o que o roteiro lista em "Fica de fora" | → sem fase — projeto pausado |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Revisão independente do código dos scripts alterados.
- [ ] Execução real por IA, em pasta de teste: um pedido até a entrega numa crew com revisor; um pedido cancelado; um pedido abandonado e retomado em conversa nova; uma execução de pipeline com correção num checkpoint do meio; o conserto com "nenhum" nas fontes.
- [ ] Com o sim do dono: release; `update` em A e B; as três crews reais conferidas (só leitura).
- [ ] README, CHANGELOG, GLOSSARIO, `IDEIAS.md`, `CONTRIBUTING.md` e o roteiro no mesmo commit; `STATUS.md` com "Como retomar".

## 10. Limites conhecidos
- Quem escolhe o agente e o formato do pedido é a IA; o usuário confere na pergunta "Posso começar?".
- O pedido não lê a saída de execuções anteriores sozinho: se a tarefa é "refaz o comunicado de ontem", a IA pergunta qual arquivo ou usa o que o usuário apontar.
- O score de um pedido tem no máximo uma aprovação: `1/1` ou `0/1`.
- Registro de pedido que fica ilegível é recomeçado sem o `tipo` (como já perdia o tema): o pedido passa a ser tratado como execução de pipeline no `retomar` e sai no histórico sem "Pedido: ".

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 4 | `tests/template-refs.test.js` passa a cobrir `pedido.prompt.md` e a parte nova |
| 6 | U5d-05a (núcleo ≤ 560, total ≤ 1.020) |
| 14 | `tests/upgrade-u5d.test.js` (U5d-upg-a) |
| 15 | U5d-03b (o pedido só escreve na pasta dele, no `runs.md` e na memória) |

## 12. O que mudou em relação ao texto aprovado
- **Total do runner: 1.020 linhas**, não 1.010: a parte da correção ficou com 40 linhas e o núcleo
  desceu para 554.
- **`fontes: []` sem comentário** (§4): o comentário "nenhuma" ficaria mentindo depois que uma fonte
  fosse registrada.
- **A rota do Word em texto é uma linha própria** na tabela do `system.md`; a linha do
  `/opencrew documento <arquivo>` ficou como estava (um teste da U3b a trava).
- **Pedido sem tema** sai no histórico como "Pedido: sem tema".
- **Regra 16:** as entradas `→ U3a fatia 3` do `IDEIAS.md` também viraram "sem fase — projeto
  pausado"; a seção "Como retomar o projeto" do `CONTRIBUTING.md` está em PT-BR num arquivo em
  inglês, e o README ganhou "Situação do projeto".

**Da revisão independente do código (2026-10-08; 4 defeitos reproduzidos, 3 corrigidos com teste):**
- `fonte:nenhuma` recusa, sem gravar, a lista `fontes:` escrita de outra forma (antes deixava o YAML
  inválido); aceita comentário na linha `fontes:` e a marca de ordem de bytes; só olha os `caminho:`
  da própria lista.
- Ficou como limite (§10): registro de pedido que fica ilegível perde o `tipo`.

**Da execução real por IA (2026-10-08, duas conversas, 6 cenários; nenhum comando falhou):**
- **`--agente` e `--formato` no `pasta --pedido`**, gravados no registro e ditos pelo `retomar`: sem
  isso o pedido retomado em conversa nova não sabia o formato (um documento oficial sairia sem Word).
- No pedido: a versão ajustada volta ao verificador e ao revisor antes da nova aprovação (dado de
  `[PREENCHER]`: só o verificador); os `[PREENCHER]` são perguntados na aprovação; `aprovado` e
  `corrigido` têm critério escrito; `--nota` da revisão é só o motivo da rejeição; `max_review_cycles`
  conta rejeições; pergunta de desempate do formato; frase do cancelamento.
- Na correção do checkpoint: mudança que só vale para aquele texto não vai para a memória; dado de
  `[PREENCHER]` na aprovação final passa de novo pelo verificador.
- Pedido registrado depois pelo conserto sai com "Pedido: " e, na mesma data, na ordem do `run_id`;
  na lista de correções do `fechar`, o pedido vem marcado "(pedido)".
- `formato-da-crew.md` documenta `fontes: []`.
- Textos novos para o usuário, fora da §6 aprovada: "Esse texto vai ser impresso ou assinado (sai em
  Word), vai para algum canal (qual?), ou é só o texto?"; "Pedido cancelado. Nada foi entregue; os
  arquivos ficaram em {pasta do pedido}."; "Agente: (não registrado)" e "Formato: (não registrado)".
- Os ajustes posteriores à segunda conversa (agente e formato no registro, verificador de novo no
  `[PREENCHER]`) só têm teste automático: não houve terceira execução real.
