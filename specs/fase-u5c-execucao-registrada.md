# Spec — Fase U5, fatia 3: Execução registrada — histórico confiável e retomar (1.14.0)

- **Fase:** U5-3 · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/caminho.mjs`, script novo `scripts/execucao.mjs` + `scripts/execucao/`, `scripts/conserto/`, `scripts/entrega/leiame.mjs`, `runner.pipeline.md`, `runner/fim-da-execucao.md`, parte nova `runner/retomar.md`, `prompts/repair.prompt.md`; `templates/AGENTS.md`) + `AGENTS.md` (regra 15) + README + CHANGELOG + testes. O CLI (`src/`) não muda · **Status:** escrita em 2026-10-07; **aprovada pelo dono em 2026-10-08** ("vamos começar a fase U5C"); implementada em 2026-10-08 — os desvios do texto aprovado estão na §12, aceitos pelo dono em 2026-10-08 ("sigo as recomendações")
- **Termos novos no GLOSSARIO.md:** sim — Registro da execução, Marco, Retomar (amplia "Execução")
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u5-roteiro.md` (fatia 3); `IDEIAS.md` — "`/opencrew retomar`", "Histórico: o score do `runs.md` tem duas definições"; auditoria de 2026-10-02 (T-A11, T-B6, T-M5/H3-08); jornada de uso real, dor 4 ("um run ficou fora do histórico; pasta de run vazia").

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **O registro mora na pasta da execução:** `crews/<crew>/output/<run>/execucao.json`, gravado só
   por script. A IA nunca escreve nele nem no `runs.md`.
2. **Nenhum comando a mais por passo.** O registro pega carona no que o runner já roda: o `pasta`
   do início (ganha `--tema` e `--passos`) e o `conferir` de cada passo (ganha `--passo`).
   Comandos novos só em três momentos: resposta de checkpoint, veredito da revisão e fim da
   execução.
3. **Uma definição de score:** checkpoints aprovados sem correção, sobre checkpoints respondidos
   (por exemplo `2/3`). Quem conta é o script, pelos marcos gravados.
4. **A linha do `runs.md` é gravada pelo script, no fecho** — também quando a execução é abortada
   ou rejeitada. As colunas não mudam.
5. **Retomar é continuar do passo seguinte ao último conferido**, com o mesmo `run_id`. O que já
   foi gravado e conferido não é refeito; um passo que estava no meio é refeito inteiro.
6. **Histórico antigo: o conserto aponta e propõe, não inventa.** Pasta de execução sem linha no
   `runs.md` vira achado do `/opencrew repair`; a linha é gravada com o tema que você disser e o
   resultado "Registrada depois". Linha sem pasta é só apontada: nada é apagado.
7. **Regra de Ouro passa a contar pelos marcos** das últimas execuções (as correções ficam
   gravadas no registro). O script mostra a lista no fecho; a IA deixa de procurar repetição na
   memória, que por regra não guarda dado de execução.
8. **Fica de fora:** replay no Escritório, estado de subagente em paralelo e limpeza de
   execuções antigas.

## 1. Objetivo
Hoje o estado da execução existe só na memória da IA, e o histórico é escrito por ela no fim:
execução que estoura o contexto se perde inteira, execução abortada não aparece no `runs.md`, e o
score quer dizer coisas diferentes de uma linha para outra. Depois desta fase cada execução deixa
um registro em disco gravado por script; o `runs.md` é escrito a partir dele; e
`/opencrew retomar <crew>` continua uma execução interrompida do ponto em que parou. Chega a
quem já usa com um `update`; execuções antigas ficam como estão.

## 2. O que esta fase herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| `runner.pipeline.md`, "Pipeline State" | "This state does NOT persist to disk" | passa a persistir (regra 1) |
| `caminho.mjs` (R3, U5-1) | `pasta` cria a pasta e o `run_id`; `conferir` confere cada saída; "nunca cria arquivo" | os dois ganham opções; passam a gravar um arquivo, o registro (regras 2 e 3; regra 15 do `AGENTS.md`) |
| `estado/arquivo.mjs` (E1) | gravação atômica de JSON (temporário + troca de nome, com nova tentativa no Windows) | reaproveitada (regra 4) |
| `state.json` do Escritório | um por crew, só com o painel ligado, sem `run_id` nem passos | não muda; o registro é outro arquivo |
| `runner/fim-da-execucao.md` | 2b manda a IA acrescentar a linha do `runs.md`; score com duas definições; 2c conta repetições em `memories.md` | 2b vira um comando; 2c lê a lista do script (regras 7 a 9) |
| Runner, "Error Handling" | execução abortada só avisa o Escritório | também fecha o registro (regra 6) |
| `entrega/leiame.mjs` | título "Entrega — {crew} — {run}" | ganha o tema quando o registro tem (regra 10) |
| `conserto.mjs` (U4-1) | dez achados; grava com `--aplicar` e `.bak` | achado e item novos (regras 12 e 13) |
| Projeto B (caso real) | 4 linhas no `runs.md`, 4 pastas em `output/`, só 1 `run_id` em comum | cenário U5c-06 |
| Tamanho | runner 543 linhas (teto de 560); partes até 120 | regra 14 |

## 3. Entradas
```
node _opencrew/core/scripts/caminho.mjs  "<crew>" pasta [--tema "<texto>"] [--passos N]
node _opencrew/core/scripts/caminho.mjs  "<crew>" conferir --arquivo "<caminho>" [--passo N] [--secoes N] [--tldr]
node _opencrew/core/scripts/execucao.mjs "<crew>" marcar --run "<id>" --passo N --evento checkpoint|revisao --resultado <r> [--nota "<texto>"] [--tema "<texto>"]
node _opencrew/core/scripts/execucao.mjs "<crew>" fechar --run "<id>" --resultado aprovado|rejeitado|abortado|publicado [--saida "<descrição>"] [--tema "<texto>"]
node _opencrew/core/scripts/execucao.mjs "<crew>" retomar [--run "<id>"]
```
| Entrada | Validação |
|---|---|
| `--tema` | uma linha; cortado em 160 caracteres; sem `|` (vira `/`). Vale no `pasta`, no `marcar` e no `fechar`: o tema que só aparece num checkpoint vai com o `marcar` dele |
| `--passos` | inteiro a partir de 1: quantos passos esta execução vai rodar |
| `--passo` | inteiro a partir de 1: o número do passo no `pipeline.yaml` |
| `--resultado` de `marcar` | checkpoint: `aprovado`, `corrigido` ou `pulado` · revisao: `aprovado` ou `rejeitado` |
| `--nota` | uma linha, até 300 caracteres: a correção pedida ou o motivo da rejeição |
| `--run` | o mesmo formato de hoje; a pasta da execução tem de existir |

## 4. Saídas
**`execucao.json`** (uma linha por campo; `versao` permite mudar depois):
```json
{ "versao": 1, "crew": "atas", "run": "2026-10-07-143022", "tema": "Ata de março",
  "status": "aberta | aprovada | rejeitada | abortada | publicada",
  "iniciadaEm": "ISO", "fechadaEm": "ISO (só depois do fecho)", "passosPrevistos": 6,
  "passos": [ { "n": 2, "arquivo": "crews/atas/output/…/v1/ata.md", "em": "ISO" } ],
  "marcos": [ { "passo": 1, "evento": "checkpoint", "resultado": "aprovado", "nota": "", "em": "ISO" } ],
  "saida": "descrição curta do que foi produzido" }
```
- Um passo conferido de novo (ciclo de revisão) troca a entrada do mesmo `n`: fica a última saída.
- Os marcos só acumulam, na ordem em que chegam.

**Últimas linhas dos comandos**
| Comando | Última linha |
|---|---|
| `pasta` | `CAMINHO:OK <pasta>` (como hoje; o registro nasce junto) |
| `conferir --passo N` | `CAMINHO:OK <arquivo>` ou `CAMINHO:REPROVADO <motivo>` (como hoje; só o OK entra no registro) |
| `marcar` | `EXECUCAO:OK` |
| `fechar` | `EXECUCAO:FECHADA <resultado> <score>`, depois de imprimir a linha gravada no `runs.md` e, se houver, "Correções das últimas execuções:" com uma linha por correção (execução, passo, nota) |
| `retomar` | `EXECUCAO:RETOMAR <run> <próximo passo>` — precedida de: tema, passos já conferidos com o arquivo de cada um, checkpoints já respondidos — ou `EXECUCAO:NADA` (nenhuma execução aberta) |
| qualquer um, sem conseguir gravar | a linha de sempre do comando e, antes dela, "Não consegui gravar o registro desta execução: {motivo}" — a execução segue |

**Linha do `runs.md`** (as mesmas seis colunas, a mais nova em cima):
`| 2026-10-07 | 2026-10-07-143022 | Ata de março | Ata e comunicado | 2/3 | Aprovado |`
Resultados possíveis: `Aprovado`, `Rejeitado`, `Abortado`, `Publicado`, `Registrada depois`.

## 5. Regras
**Registro**
1. Toda execução iniciada pelo `pasta` tem `execucao.json` na pasta dela, com `status: aberta`.
   Só os scripts o gravam; o runner manda nunca ler, escrever nem descrever o arquivo à mão.
2. `conferir` com `--passo N` grava o passo no registro quando o resultado é `CAMINHO:OK`. Sem
   `--passo`, ou com o arquivo fora de uma pasta de execução, nada é gravado (como hoje).
3. `pasta` com `--run` de uma pasta que já tem registro não o apaga nem o reabre: responde
   `CAMINHO:OK` e deixa o registro como está. O registro nasce só com a pasta: pasta que já
   existia sem registro (execução anterior à 1.14.0) não ganha um, para não virar retomável.
4. A gravação é atômica (temporário na mesma pasta e troca de nome). Registro ilegível ou cortado
   é tratado como ausente: o próximo `conferir --passo` ou `marcar` começa um registro novo, e o
   `fechar` grava a linha com o que o próprio comando informou, avisa e regrava o registro, fechado.
5. Falha ao gravar o registro nunca para a execução nem muda a linha `CAMINHO:` (§4).
6. Execução abortada (pelo usuário, por erro, ou rejeitada no limite de ciclos) é fechada com
   `fechar --resultado abortado` ou `rejeitado`. Execução que ficou aberta (contexto estourado)
   continua `aberta`: é o que o `retomar` procura.

**Histórico**
7. O `fechar` grava a linha no `runs.md` da crew: cria o arquivo com o cabeçalho se não existe;
   põe a linha logo abaixo do cabeçalho; se já há linha com o mesmo `run_id`, troca essa linha.
   Nenhuma outra linha do arquivo muda, byte a byte. Célula vazia sai como `—`. Arquivo sem tabela
   ganha a tabela no fim. Histórico que não pôde ser gravado: o aviso "Não consegui gravar o
   histórico desta execução: {motivo}" sai antes da linha `EXECUCAO:FECHADA`, e o registro é fechado.
8. Score = marcos de checkpoint com `aprovado` ÷ marcos de checkpoint com `aprovado` ou
   `corrigido` (os `pulado` não contam). Sem checkpoint respondido: `—`. A data é a do `run_id`;
   `run_id` sem data (nome dado pelo usuário): o dia do fecho.
9. No fecho o script lista as notas dos marcos `corrigido` e `rejeitado` das 10 execuções
   fechadas mais recentes da crew. A reflexão do fim da execução (2c) usa essa lista para achar o
   que se repetiu em 3 execuções ou mais; a seção da memória chama-se `## Regras de Ouro`, um
   nome só.
10. A entrega usa o tema do registro no título do LEIA-ME ("Entrega — {crew} — {tema} ({run})").
    Sem registro ou sem tema, o título de hoje.

**Retomar**
11. `/opencrew retomar <crew>` roda `execucao.mjs "<crew>" retomar`, que olha a execução `aberta`
    mais recente. Com `EXECUCAO:RETOMAR <run> <N>`, a IA mostra ao usuário o tema, o que já foi
    feito e de onde vai continuar, pede o sim, refaz a inicialização do runner **sem** criar
    pasta nova e segue do passo N com aquele `run_id`. Com `EXECUCAO:NADA`, diz que não há
    execução para retomar. Com mais de uma aberta, o script lista todas e usa a mais recente; a
    IA pergunta qual e, para outra, roda de novo com `--run`. O passo seguinte é o que vem depois
    do último fato gravado (passo conferido ou marco); revisão rejeitada volta ao passo do
    `on_reject`; passo conferido cujo arquivo sumiu é refeito. Se o usuário não quer continuar, a
    IA oferece encerrar a execução como abortada.

**Conserto do histórico**
12. Achado novo `historico`: pasta de `output/` com nome de execução e sem linha no `runs.md`
    (uma linha por pasta, com os arquivos de topo dela), e linha do `runs.md` cujo `run_id` não
    tem pasta (só apontada). Pasta vazia é dita como "execução abandonada". Pasta de execução é a
    que tem nome começado por data ou tem registro. O achado só existe quando há pasta **com
    arquivos** sem linha; sem isso, a pasta vazia e a linha sem pasta saem como nota, e a crew
    continua `CONSERTO:OK` (não há item que as resolva). Execução aberta é dita como interrompida.
13. Item novo `historico:<run>=<tema>`: grava a linha "Registrada depois" daquela pasta, na posição
    da data dela, com cópia `runs.md.bak`. Não fecha nem cria `execucao.json`. Recusa pasta que
    não existe, execução que já tem linha e item sem tema.

**Runner e tamanho**
14. O runner continua com no máximo 560 linhas. O que é do fim mora em
    `runner/fim-da-execucao.md`; o retomar, em `runner/retomar.md` (toco de até 8 linhas). O
    total de núcleo mais partes, que a U5-2 travou em 930 linhas, passa a 980: entrou uma parte.
15. A regra 15 do `AGENTS.md` passa a dizer: o `caminho.mjs` e o `execucao.mjs` gravam o
    `execucao.json` da execução, e o `execucao.mjs fechar` acrescenta ou troca uma linha do
    `runs.md` da crew; mais nada.

## 6. Textos
| Onde | Texto |
|---|---|
| `retomar`, antes de continuar | "A execução {run} ({tema}) parou depois do passo {k}. Já estão prontos: {lista}. Continuo do passo {N}?" |
| `retomar`, sem nada | "Não há execução interrompida da crew {nome}." |
| Achado `historico` | "{n} execução(ões) sem linha no histórico." / "{n} execução(ões) abandonada(s) (pasta vazia): {lista}" / "{n} linha(s) do histórico sem a pasta da execução: {lista} (só aponto: nada é apagado)" |
| `repair`, pergunta | "A pasta {run} tem arquivos de uma execução que não está no histórico: {arquivos}. Qual foi o tema dela? (Se não lembrar, responda 'não sei'.)" — com 'não sei', o tema gravado é "não informado" |
| `retomar`, quem não quer continuar | "Quer que eu encerre essa execução como abortada?" |
| `retomar`, antes do primeiro passo | "Retomei pelo que está gravado. O que foi combinado só na conversa anterior não veio junto." |
| `fechar`, sem registro legível | "O registro desta execução não existia ou estava ilegível: a linha do histórico saiu só com o que este comando informou." |
| Histórico que não gravou | "Não consegui gravar o histórico desta execução: {motivo}" |
| Registro que não gravou | "Não consegui gravar o registro desta execução: {motivo}" |

## 7. Cenários
- **U5c-01a** `pasta --tema "Ata de março" --passos 4` cria a pasta e o `execucao.json` com `status: aberta`, tema e passos previstos; sem `--tema`, o tema fica vazio.
- **U5c-01b** `pasta --run r1` numa pasta que já tem registro não muda o registro (regra 3).
- **U5c-02a** `conferir --arquivo …/v1/ata.md --passo 2` com `CAMINHO:OK` grava o passo 2; com `CAMINHO:REPROVADO` não grava; sem `--passo` não grava (o comportamento da 1.13.0, byte a byte).
- **U5c-02b** o mesmo passo conferido de novo com outro arquivo troca a entrada; os outros passos ficam.
- **U5c-03a** `marcar` grava o marco e responde `EXECUCAO:OK`; resultado que não é do evento, `--run` sem pasta e passo inválido são erro de uso, sem gravar.
- **U5c-03b** nota com quebra de linha vira uma linha; acima de 300 caracteres é cortada.
- **U5c-04a** `fechar --resultado aprovado --saida "Ata e comunicado"` com 3 checkpoints (2 aprovados, 1 corrigido) grava a linha `… | 2/3 | Aprovado |` logo abaixo do cabeçalho, marca `status: aprovada` e responde `EXECUCAO:FECHADA aprovado 2/3`.
- **U5c-04b** sem `runs.md`, o arquivo nasce com o cabeçalho; com `runs.md` de outras linhas (CRLF, comentário no topo), só a linha nova muda.
- **U5c-04c** `fechar` duas vezes para a mesma execução troca a linha, não repete.
- **U5c-04d** `fechar --resultado abortado` numa execução sem checkpoint respondido grava `—` no score e `Abortado`.
- **U5c-04e** registro ilegível: `fechar` grava a linha com tema vazio e score `—`, e avisa (regra 4).
- **U5c-05a** com três execuções fechadas que têm marcos `corrigido`, o `fechar` lista as notas, a mais recente primeiro; sem correção nenhuma, a seção não aparece.
- **U5c-06a** `retomar` com uma execução aberta de 2 passos conferidos responde `EXECUCAO:RETOMAR <run> 3` e lista tema, arquivos e checkpoints; com todas fechadas, `EXECUCAO:NADA`; com duas abertas, lista as duas e escolhe a mais recente.
- **U5c-06b** execução aberta cujo passo 2 está no registro mas o arquivo sumiu: o próximo passo é o 2.
- **U5c-07a** (trava da regra 15) em todos os cenários, fora do `execucao.json` da execução e, no `fechar`, do `runs.md`, a árvore do projeto é igual antes e depois; não sobra arquivo temporário.
- **U5c-07b** pasta de execução sem permissão de escrita: `conferir --passo` responde `CAMINHO:OK` com o aviso antes (regra 5).
- **U5c-08a** entrega de uma execução com tema no registro: o LEIA-ME abre com "Entrega — {crew} — {tema} ({run})"; sem registro, com o título de hoje.
- **U5c-09a** `conserto.mjs` numa crew com uma pasta de execução sem linha, uma pasta vazia e uma linha sem pasta: achado `historico` com as três, cada uma no seu grupo.
- **U5c-09b** `--aplicar "historico:2026-09-12-revisao=Revisão do regimento"` grava a linha "Registrada depois" na posição da data, com `runs.md.bak`; pasta que não existe e execução já registrada são recusadas.
- **U5c-10a** runner: os comandos `pasta` (com `--tema` e `--passos`), `conferir` (com `--passo`), `marcar` nos checkpoints e na revisão, `fechar` no fim e no aborto; "never read, write or describe `execucao.json`"; runner ≤ 560 linhas.
- **U5c-10b** `runner/fim-da-execucao.md`: 2b manda rodar o `fechar` e não escrever a linha à mão; uma definição de score; 2c usa a lista do script; `## Regras de Ouro` com um nome só, também no modelo de memória.
- **U5c-10c** `runner/retomar.md` existe, tem o toco no núcleo e a rota `/opencrew retomar <name>` no `system.md`; o texto da pergunta da §6.
- **U5c-10d** `repair.prompt.md` tem a linha do achado `historico` com a pergunta da §6.
- **U5c-upg-a** workspace 1.13.0 com uma crew que tem `runs.md` e pastas de execução antigas → `update` → `execucao.mjs` e `runner/retomar.md` instalados; nenhum arquivo de `crews/` mudou; `execucao.mjs retomar` do workspace responde `EXECUCAO:NADA` (execução antiga não tem registro).

## 8. Fora desta fase
| Item | Destino |
|---|---|
| `/opencrew pedir`, tarefa avulsa no histórico, entrega avulsa | → U5 fatia 4 (1.15.0) |
| Replay de execução antiga no Escritório; subagente, ciclo de revisão e resultado do verificador no desenho; sinal de reserva vindo do disco | → sem fase — projeto pausado (o registro que eles pediam passa a existir) |
| Criar registro para execuções anteriores à 1.14.0 | → sem fase — o conserto dá a linha do histórico; não há como reconstituir passos e marcos |
| Apagar pasta de execução abandonada; retenção e limpeza | → sem fase — projeto pausado |
| Comando `/opencrew runs` para ver o histórico | → sem fase — o `runs.md` é legível; projeto pausado |
| Retomar no meio de um passo, ou execução de outra máquina com caminhos diferentes | → sem fase — o passo interrompido é refeito inteiro |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Revisão independente do código dos scripts novos e alterados.
- [ ] Execução real por IA: uma crew roda até o fim (registro, linha no `runs.md` gravada pelo script, score); outra execução é abandonada depois do passo 2 e retomada numa conversa nova com `/opencrew retomar`; o conserto do histórico é seguido numa crew com pasta sem linha.
- [ ] Com o sim do dono: release; `update` em A e B; diagnóstico (só leitura) do histórico das três crews reais, mostrado a ele. Gravar linha no `runs.md` de crew real é decisão dele.
- [ ] `AGENTS.md` (regra 15), README, CHANGELOG, GLOSSARIO e `IDEIAS.md` no mesmo commit.

## 10. Limites conhecidos
- O registro só sabe o que os comandos contam: se a IA pula o `marcar` de um checkpoint, o score sai errado para menos. O `conferir`, que ela já roda, é o que sustenta o retomar.
- Retomar numa conversa nova refaz a leitura da crew e das fontes; o que estava só na cabeça da IA (um ângulo combinado no chat e não gravado) se perde.
- Execução anterior à 1.14.0 não tem registro: não é retomável e só entra no histórico pelo conserto.
- "Publicado" continua sendo dito pela IA no `fechar`; o script não confere se algo foi publicado.

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 3 e 15 | `tests/execucao*.test.js` (U5c-07a; U5c-04b: o `runs.md` só ganha ou troca uma linha) |
| 14 | `tests/upgrade-u5c.test.js` (U5c-upg-a) |
| 6 | U5c-10a (o runner não passa de 560 linhas) |

## 12. O que mudou em relação ao texto aprovado
Decisões tomadas na implementação, para o dono conferir (o código manda; este texto já está alinhado):
- **`--tema` também no `marcar` e no `fechar`.** No começo da execução o tema muitas vezes ainda não
  existe (ele vem do primeiro checkpoint).
- **`retomar --run`**, para escolher entre duas execuções abertas.
- **Pasta antiga não ganha registro** (regra 3): senão toda execução anterior à 1.14.0 que passasse
  por `pasta --run` apareceria como interrompida.
- **Linha sem pasta e pasta vazia não deixam a crew pendente** (regra 12): não há item que as resolva,
  e as crews reais ficariam com `CONSERTO:PENDENTE` para sempre.
- **Pergunta do conserto** reescrita (§6): a frase aprovada ("Respondo 'não sei' por você") não dizia
  o que o usuário devia fazer.
- **Total do runner: 980 linhas** (era 930), porque entrou uma parte; o núcleo segue em 560.
- **O modelo de memória do `build.prompt.md` ganhou `## Regras de Ouro`** (2 linhas; o teto do teste
  U5a-16a foi de 649 para 651).
- **`gravarTexto` em `estado/arquivo.mjs`**: a gravação atômica da E1 virou uma função de texto, usada
  pelo estado do Escritório, pelo registro e pelo `runs.md`. O `main` do `caminho.mjs` passou a ser
  assíncrono.
- **Textos novos para o usuário, fora da §6 aprovada:** os quatro acrescentados à tabela da §6.

**Da revisão independente do código (2026-10-08; 12 achados, 9 corrigidos com teste):**
- `runs.md` que não está em UTF-8 não é regravado: o `fechar` avisa ("o arquivo runs.md não está em
  UTF-8; salve-o em UTF-8 e feche a execução de novo") e fecha só o registro. Antes ele trocava os
  bytes estranhos, sem cópia.
- O registro só é gravado em pasta de execução que fica mesmo dentro de `output/`: nome começado por
  data ou pasta que já tem registro. Pasta qualquer do usuário, a raiz de `output/` e atalho que leva
  para fora não ganham `execucao.json`.
- Linha em branco no meio da tabela do `runs.md` não esconde as linhas de baixo; "Run  ID" com mais
  de um espaço continua sendo o cabeçalho.
- O que vem do registro lido do disco é tratado como dado: cada campo vira uma linha antes de ir
  para a tela; passo e marco sem número saem.
- Registro que existe e não pôde ser lido (arquivo em uso) não é trocado por um vazio.
- Tema cortado por caractere inteiro (emoji não fica pela metade).
- `retomar`: o que será refeito sai em "Já gravados, mas serão feitos de novo:", fora de "Passos
  conferidos"; revisão rejeitada sem `on_reject` legível volta ao primeiro passo gravado antes dela
  e avisa.
- Conserto: pasta que só tem o registro é "abandonada"; a pasta sem linha é mostrada pelos arquivos
  dela (`v1/convite.md`), não só por `v1/`.
- Ficaram como estão, por desenho: duas gravações do registro no mesmo instante podem perder uma
  (não há execução em paralelo nesta fase); pasta antiga com nome de data ganha registro se um
  `conferir --passo` rodar nela.

**Da execução real por IA (2026-10-08, duas conversas; nenhum comando falhou):**
- `pulado` passou a valer também para o checkpoint que só coleta uma resposta (tema, escolha): ele
  não entra no score. Na execução real, feita com o texto anterior, o score saiu 2/3 e 3/3 por causa
  disso.
- O `marcar` é a última coisa do checkpoint (depois da memória e do arquivo da resposta) e, na
  revisão, vem depois do `conferir` do arquivo dela. `--passos` conta os checkpoints.
- O toco do retomar foi para o começo da inicialização do runner: a pergunta vem antes de qualquer
  comando. A parte diz de onde tirar os caminhos, o número do ciclo de revisão e o tema.
- A pasta vazia e a linha sem pasta, quando não há achado, saem com "Nota:" na frente.
- Não repetida depois dos ajustes (só teste automático). O que ela achou fora desta fase está no
  `IDEIAS.md`.
