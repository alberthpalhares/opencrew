# Spec — Fase U6, fatia 2: Dados e custo — limpeza, orçamento e relato de uso (1.17.0)

- **Fase:** U6-2 · **Módulos:** Runtime (`templates/_opencrew/core/`: scripts novos `limpeza.mjs` + `limpeza/`, `custo.mjs` + `custo/`, `relato.mjs` + `relato/`; prompts novos `prompts/limpeza.prompt.md` e `prompts/relato.prompt.md`; `templates/AGENTS.md`; `templates/_opencrew/_memory/preferences.md`; skill `image-ai-generator` (`SKILL.md`, `scripts/generate.py`); `runner.pipeline.md` (só o toco do orçamento, se couber)) + `.github/ISSUE_TEMPLATE/relato-de-uso.md` + `AGENTS.md` (regra 15) + README + CHANGELOG + GLOSSARIO + testes. O CLI (`src/`) não muda · **Status:** escrita em 2026-10-09; **aprovada pelo dono em 2026-10-09** ("spec aprovada"); implementada em 2026-10-09 — os desvios do texto aprovado estão na §12
- **Termos novos no GLOSSARIO.md:** sim — Limpeza (retenção), Orçamento, Relato de uso
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u6-roteiro.md` (fatia 2); `IDEIAS.md` — "`/opencrew cleanup` + retenção", "Orçamento de custo por run", "`/opencrew feedback`"; auditoria de 2026-10-02 (T-A12).

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **A limpeza só apaga o que o usuário já tem em outro lugar.** Uma execução fechada só entra na
   limpeza se a entrega dela foi copiada para uma pasta do projeto (`copia.json` na pasta da execução)
   ou se o usuário disser, por execução, que não precisa da entrega. Execução `aberta` (retomável) nunca
   entra. O `runs.md` nunca é tocado: o histórico fica inteiro.
2. **Dois passos, sempre:** o comando só mostra (`--listar`, o padrão); apagar exige `--apagar` com os
   `run_id` escritos um a um. Não existe "apagar tudo". A IA mostra a lista, o espaço que volta e pergunta.
3. **Retenção padrão: manter as 10 execuções fechadas mais recentes** de cada crew (`Retencao:` em
   `preferences.md` muda o número). O áudio `.wav` de `_investigations/` entra à parte: é o que mais
   pesa, a transcrição (`.md`) fica.
4. **Orçamento é por execução e só conta o que tem preço conhecido:** as imagens geradas pela skill
   `image-ai-generator` (tabela em reais por modo, na própria skill). Apify e Resend não têm preço que o
   OpenCrew saiba: para eles vale só a confirmação antes de lote (item 5), sem conta em reais.
5. **`Budget:` em `preferences.md`** (`- **Budget:** R$ 5,00`; vazio = sem limite). Antes de cada
   chamada paga a IA roda `custo.mjs estimar`; acima do orçamento, ela pergunta (seguir, baixar para o
   que cabe, parar). Todo lote com mais de 6 imagens, ou qualquer lote de Apify/Resend com mais de 20
   itens, pede confirmação mesmo sem `Budget:`.
6. **`generate.py` ganha teto de lote e de tentativas:** `--batch` recusa mais de 12 itens
   (`--max-itens N` muda), e uma imagem que falha é tentada no máximo 2 vezes. O orçamento é conta da IA
   e do `custo.mjs`; o teto é do script e vale mesmo se a IA errar a conta.
7. **`/opencrew feedback` monta um relato sem nada do cliente:** versão, Node, sistema, IDE, a última
   execução (situação, passo em que parou, a última linha `…:` de cada script) e o que o usuário
   escrever. Não entra tema, nota, nome de arquivo do projeto nem texto de crew. O usuário lê e cola
   numa issue; o OpenCrew **não envia nada** sozinho. Vem com o modelo de issue "Relato de uso".
8. **Fica de fora:** apagar pasta de entrega copiada, limpeza automática (sem comando), `Budget`
   acumulado por mês, preço de Apify/Resend em reais, envio do relato.

## 1. Objetivo
Hoje as execuções só crescem (`output/<run>/vN/`, `_investigations/` com áudio), a skill de imagens pode
gastar sem teto — um lote errado, ou um retry em laço, multiplica o custo — e quem usa o OpenCrew não
deixa rastro de onde travou. Depois desta fatia o usuário pode liberar espaço com segurança (só o que
já está salvo em outro lugar, com a lista na frente), tem um teto de gasto por execução que a IA e o
script respeitam, e gera em um comando um relato de uso que não vaza conteúdo. Chega a quem já usa com
um `update`; nada muda se o usuário não usar os comandos.

## 2. O que esta fatia herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| `execucao.json` (U5-3) | situação da execução (`aberta`, `aprovada`…), `fechadaEm`, `passos` | a limpeza lê a situação e a data (regra 2) |
| `copia.json` (U3a-2) | retrato do que foi copiado, na pasta da execução, só quando houve cópia | critério da limpeza (regra 3) |
| `runs.md` (U5-3) | uma linha por execução, gravada pelo `fechar` | nunca tocado pela limpeza (regra 1) |
| `AGENTS.md`, regra 15 | só scripts nomeados escrevem; o `entregar.mjs` só apaga a própria `entrega/` | o `limpeza.mjs` passa a apagar pasta de execução, com travas (regra 18) |
| `preferences.md` | `Dashboard`, `Default Tier`… | campos novos `Budget` e `Retencao` (regras 8 e 10) |
| `image-ai-generator` | tabela de custo só em texto (`R$0.07-0.10` produção, `R$0.01-0.02` teste), sem teto | preço por modo lido pelo `custo.mjs`; teto no `generate.py` (regras 9 a 12) |
| `estado.mjs`/`execucao.mjs` | cada um com seu formato de linha final | linha final no mesmo molde: `LIMPEZA:…`, `CUSTO:…`, `RELATO:OK` |
| Runner (núcleo 558/560) | sem orçamento | o orçamento mora na skill e no `custo.mjs`; o núcleo ganha no máximo 2 linhas (regra 13) |

## 3. Entradas
```
node _opencrew/core/scripts/limpeza.mjs "<crew>" [--listar] [--manter N]
node _opencrew/core/scripts/limpeza.mjs "<crew>" --apagar "<run>[,<run>…]" [--sem-entrega "<run>[,<run>…]"]
node _opencrew/core/scripts/custo.mjs   "<crew>" estimar --run "<id>" --modo test|production --itens N
node _opencrew/core/scripts/custo.mjs   "<crew>" registrar --run "<id>" --modo test|production --itens N
node _opencrew/core/scripts/relato.mjs  [--crew "<crew>"] [--ide "<nome>"]
```
| Entrada | Validação |
|---|---|
| `--manter` | inteiro de 1 a 99; sem ele vale `Retencao:` de `preferences.md`, e sem isso, 10 |
| `--apagar` | lista de `run_id` do formato de execução; cada um tem de estar na lista do `--listar` de agora; vazia ou com `*`/`all`/`todos` é erro de uso |
| `--sem-entrega` | subconjunto de `--apagar`: execuções cuja entrega o usuário disse que não precisa guardar |
| `--modo` | `test` ou `production` |
| `--itens` | inteiro de 1 a 999 |
| `--ide` | nome curto, letras/dígitos/hífen, até 30 caracteres |

## 4. Saídas
**`limpeza.mjs` (sem `--apagar`)**: uma linha por candidato (`{run} · {data} · {tamanho} · {situação} · entrega copiada: sim|não`),
a seção "Fica (não entra na limpeza)" com o motivo de cada uma (aberta, entre as {N} mais recentes,
entrega não copiada), os `.wav` de `_investigations/` com o tamanho, o espaço que voltaria e, por último,
`LIMPEZA:LISTA <n execuções> <tamanho>` ou `LIMPEZA:NADA`.
**`limpeza.mjs --apagar`**: `Apaguei: {run} ({tamanho})` por execução; `Apaguei o áudio de {n} arquivos
({tamanho})` quando for o caso; por último `LIMPEZA:APAGADO <n> <tamanho>`. Recusa (nada apagado):
a razão e `LIMPEZA:RECUSADA`.
**`custo.mjs`**: `estimar` → linhas `Estimativa desta chamada: R$ {x}`, `Já gasto nesta execução: R$ {y}`,
`Orçamento: R$ {z}` (ou `sem limite`) e `CUSTO:OK` / `CUSTO:ACIMA {sobra}`. `registrar` grava a chamada
em `crews/<crew>/output/<run>/custo.json` e responde `CUSTO:REGISTRADO R$ {total}`.
**`relato.mjs`**: um bloco de texto em markdown, pronto para colar, e `RELATO:OK`.

**`custo.json`** (na pasta da execução; só o `custo.mjs` grava):
`{ "versao": 1, "chamadas": [ { "modo": "test", "itens": 1, "reais": 0.02, "em": "ISO" } ], "total": 0.02 }`

## 5. Regras
**Limpeza**
1. O `runs.md` e o `crew.yaml` da crew nunca são tocados. Só se apaga a pasta inteira de uma execução, ou
   um arquivo `.wav` de `_investigations/`.
2. **Quem entra:** execução com `execucao.json` de situação diferente de `aberta`, fora das `N` mais
   recentes (por `fechadaEm`, e `iniciadaEm` se faltar). Pasta sem `execucao.json` (anterior à 1.14.0)
   entra só se o nome começa por data e ela tem mais de `N` irmãs mais novas.
3. **Quem fica, mesmo velha:** execução `aberta`; execução cuja entrega **não** foi copiada (sem
   `copia.json`), a menos que o `run_id` esteja também em `--sem-entrega`; qualquer pasta que o script
   não reconheça como execução.
4. `--apagar` recusa, sem apagar nada, se algum `run_id` da lista não está nos candidatos de agora
   (inclusive "mudou entre a lista e o apagar"), não existe, ou fica fora de `crews/<crew>/output/`
   (caminho real conferido, atalho que leva para fora não vale).
5. Nenhum arquivo temporário; a pasta é apagada de uma vez, sem seguir atalho (link ou junção é removido,
   nunca o destino).
6. Os `.wav`: arquivos `.wav` direto em `crews/<crew>/_investigations/**`, com mais de 30 dias. A
   transcrição, a análise e o resto da pasta ficam. Entram na listagem e no `--apagar` (flag `--audio`).
7. A IA, no `prompts/limpeza.prompt.md`: lista, mostra o espaço, **explica o que fica e por quê**,
   pergunta por execução sem cópia ("a entrega de {run} só existe aqui; posso apagar mesmo assim?") e
   só então roda o `--apagar` com os ids que o usuário aprovou. Ela nunca monta a lista a partir de
   outra coisa que a saída do `--listar`.

**Orçamento**
8. `preferences.md` ganha `- **Budget:**` (valor em reais, `R$ 5,00`, `5`, `5.50`; vazio = sem limite) e
   `- **Retencao:**` (número). O `update` não toca em `preferences.md` (já é regra); o `custo.mjs` e o
   `limpeza.mjs` leem os campos que existirem, e a falta de um campo vale o padrão.
9. `custo.mjs estimar`: preço por item = o da tabela da skill (`test` R$ 0,02; `production` R$ 0,10, o
   teto da faixa publicada), estimativa = itens × preço. Já gasto = soma do `custo.json` da execução.
   `CUSTO:ACIMA` quando gasto + estimativa > `Budget`; `{sobra}` = o que ainda cabe, em itens do mesmo
   modo (arredondado para baixo).
10. `custo.mjs registrar` soma ao `custo.json`; chamada repetida com os mesmos dados é outra chamada (um
    retry custa de novo, e é isso que o registro mostra).
11. A skill `image-ai-generator` manda: antes de qualquer geração, `estimar`; `CUSTO:ACIMA` → perguntar
    ao usuário (seguir mesmo assim / gerar só {sobra} / parar); depois de gerar, `registrar` com a
    quantidade que **realmente** saiu (as que o script respondeu como geradas). Lote com mais de 6 itens
    pede confirmação mesmo sem `Budget`.
12. `generate.py`: `--batch` com mais de `--max-itens` (padrão 12) imagens → recusa com a razão e o
    código 1, sem chamar a API; falha de uma imagem → no máximo 1 nova tentativa (2 no total). Modo
    `test` por padrão continua.
13. **Apify e Resend:** as skills dizem para confirmar com o usuário antes de qualquer lote com mais de 20
    itens (Apify: execuções do Actor ou itens pedidos; Resend: destinatários). Sem conta em reais.
    O núcleo do runner só ganha, se couber, uma frase que aponta a regra 11 no passo de skill; o texto
    mora na skill.

**Relato**
14. `relato.mjs` junta: versão do OpenCrew (`.opencrew-version`), versão do Node, sistema operacional, o
    IDE dito em `--ide`, e — para a execução mais recente da crew pedida (ou do projeto, se não pedida) —
    `run_id`, situação, `passosPrevistos`, número do último passo conferido, contagem de marcos por
    resultado e o tipo (`pedido` ou não). Nada mais do registro.
15. O relato **nunca** inclui: `tema`, `nota`, `saida`, caminhos de arquivo do projeto ou da crew, nomes
    de agente, texto de arquivo de crew, nem caminho absoluto (o do usuário vira `<projeto>`).
16. O `prompts/relato.prompt.md`: a IA roda o script, mostra o relato, pergunta "O que aconteceu? (uma ou
    duas frases, sem dados de cliente)" e junta a resposta ao fim do bloco, e diz onde colar
    (`https://github.com/alberthpalhares/opencrew/issues/new?template=relato-de-uso.md`). Não abre
    navegador nem envia.
17. O modelo `.github/ISSUE_TEMPLATE/relato-de-uso.md` tem os mesmos campos do relato e o aviso de não
    colar conteúdo de cliente.

**Regras do repositório**
18. A regra 15 do `AGENTS.md` passa a dizer: o `limpeza.mjs` também apaga pasta de execução fechada (nunca
    `runs.md`, nunca execução aberta) e `.wav` antigo de `_investigations/`; o `custo.mjs` grava o
    `custo.json` da execução; o `relato.mjs` só lê. **Trava:** `tests/limpeza*.test.js`.
19. Tamanho: scripts ≤ 200 linhas por arquivo; núcleo do runner ≤ 560; partes ≤ 120; total ≤ 1.030;
    `limpeza.prompt.md` e `relato.prompt.md` ≤ 100 linhas cada.

## 6. Textos
| Onde | Texto |
|---|---|
| Limpeza, antes de apagar | "Vou apagar {n} execuções da crew {nome} e liberar {tamanho}. O histórico (`runs.md`) fica. Posso apagar?" |
| Entrega só aqui | "A entrega da execução {run} só existe nesta pasta (não foi copiada para o projeto). Posso apagar mesmo assim?" |
| Nada a limpar | "Não há execução para limpar na crew {nome}: as {N} mais recentes ficam e o resto está aberto ou sem cópia." |
| Orçamento acima | "Esta chamada custa cerca de R$ {x}; já foram R$ {y} nesta execução e o orçamento é R$ {z}. Quer seguir mesmo assim, gerar só {sobra} imagem(ns) ou parar?" |
| Lote grande | "Vou gerar {n} imagens (cerca de R$ {x}). Posso seguir?" |
| Relato | "Aqui está o relato. Confira que não tem nada do seu cliente e cole numa issue em {endereço}. O que aconteceu? (uma ou duas frases, sem dados de cliente)" |

## 7. Cenários
- **U6b-01a** `limpeza.mjs "<crew>"` numa crew com 14 execuções fechadas (todas com `copia.json`): lista as 4 mais antigas, mostra "Fica" para as 10 mais recentes, o tamanho e `LIMPEZA:LISTA 4 …`; a árvore do projeto é igual antes e depois.
- **U6b-01b** execução `aberta` antiga, execução sem `copia.json` e pasta que não é de execução ficam, cada uma com o motivo; `--sem-entrega` com o `run_id` põe a segunda na lista.
- **U6b-01c** pasta de execução sem `execucao.json` (anterior à 1.14.0): entra só com nome de data e mais de `N` irmãs mais novas.
- **U6b-02a** `--apagar "<ids>"` apaga só aquelas pastas, não toca `runs.md`, `crew.yaml` nem as irmãs; saída `Apaguei: …` e `LIMPEZA:APAGADO 2 …`.
- **U6b-02b** `--apagar` com id que não está na lista de agora, que não existe, `*`, vazio, ou fora de `output/` (`..`, atalho): `LIMPEZA:RECUSADA`, nada apagado.
- **U6b-02c** atalho (link/junção) dentro de `output/` que leva para fora: não é apagado o destino; o atalho não vira candidato.
- **U6b-03a** `.wav` de `_investigations/` com mais de 30 dias: listado e apagado com `--audio`; a transcrição `.md` ao lado fica; `.wav` recente fica.
- **U6b-04a** `Retencao: 3` em `preferences.md` muda o padrão; `--manter 5` vale sobre a preferência; fora de 1–99 é erro de uso.
- **U6b-05a** (trava da regra 15) em todos os cenários de limpeza, fora das pastas apagadas, a árvore é igual antes e depois; nenhum temporário sobra.
- **U6b-06a** `custo.mjs estimar` sem `Budget`: `Orçamento: sem limite`, `CUSTO:OK`; com `Budget: R$ 1,00`, 5 imagens `production` (R$ 0,50) e já gasto R$ 0,60 → `CUSTO:ACIMA 4`.
- **U6b-06b** `registrar` soma ao `custo.json` e responde `CUSTO:REGISTRADO R$ …`; duas chamadas iguais somam duas vezes; `Budget` em `R$ 5,00`, `5` e `5.50` são lidos.
- **U6b-06c** `custo.mjs` só grava `custo.json` na pasta da execução; execução que não existe é erro de uso.
- **U6b-07a** `generate.py`: lote de 13 itens recusa sem chamar a API; `--max-itens 20` aceita; falha repetida de uma imagem tem 2 tentativas, não mais (API simulada).
- **U6b-07b** `SKILL.md` da imagem manda `estimar` antes e `registrar` depois, com a quantidade realmente gerada, e a confirmação acima de 6; `apify` e `resend` mandam confirmar acima de 20.
- **U6b-08a** `relato.mjs`: a saída tem versão, Node, sistema, IDE e os campos de §5 regra 14, e termina em `RELATO:OK`; sem execução, diz "nenhuma execução registrada".
- **U6b-08b** o relato de uma execução com tema `Ata do cliente Fulano`, nota, saída e caminhos não contém nenhum desses textos nem o caminho absoluto do projeto.
- **U6b-09a** os dois prompts e o modelo de issue existem; `limpeza.prompt.md` só aceita ids da saída do `--listar` e tem as perguntas da §6; `relato.prompt.md` não abre navegador; toda referência existe (`template-refs`); ≤ 100 linhas.
- **U6b-09b** `system.md` tem as rotas `/opencrew cleanup <name>` e `/opencrew feedback`; o texto do pedido em palavras ("libera espaço da crew X", "quero reportar um problema") leva aos mesmos prompts.
- **U6b-upg-a** workspace 1.16.0 → `update` → os três scripts e os dois prompts instalados; `preferences.md` e `crews/` intactos; `limpeza.mjs` instalado lista sem apagar.

## 8. Fora desta fatia
| Item | Destino |
|---|---|
| Apagar a pasta de **cópia** da entrega, ou qualquer arquivo fora de `output/` e `_investigations/` | → sem fase — nunca: é dado do usuário |
| Limpeza automática, agendada ou ao fim da execução | → sem fase — projeto pausado |
| `Budget` por mês/por crew, preço em reais de Apify e Resend | → sem fase — o OpenCrew não sabe o preço deles |
| Enviar o relato (abrir issue sozinho) | → sem fase — decisão: o usuário lê e cola |
| Fatia 3 da U6 (medição) | → `fase-u6c-…` (roteiro) |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Revisão independente do código dos scripts novos (em especial: o que o `--apagar` pode atingir).
- [ ] Execução real por IA, em pasta de teste (nunca nos projetos A e B): uma limpeza com execução sem cópia (a IA pergunta), uma recusa de id que não está na lista; um lote de imagens acima do orçamento (com chave de teste ou API simulada — **nunca gastar de verdade sem o seu sim**); um relato conferido linha a linha.
- [ ] Com o sim do dono: release; `update` em A e B; **`limpeza.mjs --listar` nas crews reais, só a lista, mostrada a ele** — apagar execução de crew real é decisão dele.
- [ ] README, CHANGELOG, GLOSSARIO, `AGENTS.md` (regra 15), `IDEIAS.md` (itens entregues saem) no mesmo commit; `STATUS.md` atualizado.

## 10. Limites conhecidos
- O preço por imagem é a estimativa publicada na skill (teto da faixa): o gasto real na OpenRouter pode ser menor; o orçamento é uma trava de segurança, não uma fatura.
- A IA pode esquecer de rodar `estimar` ou `registrar`: o que fica garantido, mesmo assim, é o teto do `generate.py` (lote e tentativas).
- A limpeza só enxerga o que está em `crews/<crew>/output/` e `_investigations/`; cópias da entrega no projeto são do usuário.
- Execução sem `copia.json` pode ter sido copiada à mão pelo usuário: por isso a pergunta, e não uma regra.

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 3 e 15 | `tests/limpeza*.test.js` (U6b-05a: só as pastas pedidas somem; `runs.md` e execução aberta intactos), `tests/custo.test.js` (U6b-06c), `tests/relato.test.js` (U6b-08b: nada do cliente) |
| 14 | `tests/upgrade-u6b.test.js` (U6b-upg-a) |
| 2 | `tests/package.test.js` (o modelo de issue não cita o fluxo do mantenedor) |
| 6 | U6b-09a (prompts ≤ 100 linhas), núcleo do runner ≤ 560 |

## 12. O que mudou em relação ao texto aprovado
- **`custo.json` guarda centavos inteiros** (`centavos`, `total`), não reais com vírgula flutuante: sem erro de
  arredondamento. O formato do `Budget:` aceito é `R$ 5,00`, `5`, `5.50` e `R$ 1.250,00`; o ponto só separa
  milhares em grupos de três.
- **`--audio` só vale com `--apagar`** (`--apagar "" --audio` apaga só o áudio): a spec dizia "flag --audio" sem
  dizer a combinação.
- **`LIMPEZA:NADA` também mostra quem fica e o motivo** antes da mensagem, para o usuário ver por que nada saiu.
- **O relato omite também o nome da crew** e o `run_id` que não seja só data e hora (nome dado pelo usuário
  pode ser do cliente): "(nome próprio, omitido)".
- **O `custo.mjs` avisa quando o `Budget:` não é um valor** ("tratei como sem limite") em vez de calar.
- **`preferences.md` ganhou `Budget` (vazio) e `Retencao: 10` só no modelo novo**; o `update` não toca no
  arquivo de quem já tem.
- **A tentativa dupla do `generate.py` é testada por contrato de texto** (o teto de lote, por execução real
  do script, sem chave e sem rede; o teste é pulado se a máquina não tem Python).
- **Da revisão independente do código (veredito inicial: bloqueado; 8 defeitos reproduzidos, todos tratados
  com teste em `tests/limpeza-revisao.test.js`):**
  - **Atalho na raiz.** Junção como pasta da crew, como `output/` ou como `_investigations/` era seguida e o
    destino apagado (o `realpath` dos dois lados caía dentro do alvo). Agora cada raiz é conferida com `lstat`:
    atalho para o comando com `… é um atalho para outro lugar`, sem ler nem apagar nada.
  - **Registro ilegível não é registro ausente.** Arquivo em uso, cortado, vazio ou uma pasta no lugar do
    `execucao.json` deixava a execução aberta virar candidata (e meia pasta era apagada). Agora ela fica,
    com o motivo; só a falta do arquivo (`ENOENT`) vale como execução de antes da 1.14.0.
  - **"Fechada" é lista fechada:** `aprovada`, `rejeitada`, `abortada`, `publicada`. `ABERTA`, vazio, número
    ou ausente, com registro, ficam.
  - **Apagar em parte** é dito (`Apaguei só parte de {run}`), termina em `LIMPEZA:PARCIAL` e sai com código 1.
  - **`registrar` em paralelo** perdia chamadas: agora passa por uma trava (`.custo.lock`, apagada no fim).
  - **`custo.mjs --run`** que é atalho é "Execução não encontrada".
  - **Relato:** só valores de listas fechadas (situação, evento, resultado, versão) e só o id que o
    `caminho.mjs` cria (`AAAA-MM-DD-HHmmss` e `-N`).
  - **Preferências:** `Budget` e `Retencao` dentro de comentário HTML ou de bloco de código não valem.
  - Também: o singular ("fica a execução fechada mais recente").
- **Da execução real (5 cenários):** `--sem-entrega` precisa estar também em `--apagar` (o prompt dizia o
  contrário); cada recusa diz o motivo; a soma da última linha da lista é só das execuções; o áudio tem
  pergunta própria; os caminhos das imagens vêm do `saida`; uma pergunta só quando o orçamento e o teto
  de lote coincidem.
- **Da segunda revisão (sem bloqueio):** `custo.json` que existe e não pôde ser lido (em uso, sem permissão) não
  vira "vazio": o `registrar` para com a mensagem em PT-BR e não regrava por cima (só arquivo que falta ou cortado
  vale como vazio); a trava `.custo.lock` esquecida por um processo morto sai em 4 s (a espera é de 8 s); a linha
  "Apaguei o áudio de 0 arquivos" não sai mais quando nenhum áudio foi apagado. As arestas que ficaram estão no
  `IDEIAS.md`.