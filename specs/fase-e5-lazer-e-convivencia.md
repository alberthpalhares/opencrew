# Fase E5 — Escritório Expandido, Copa, Lazer e Convivência

> Expande as 4 salas do Escritório ao Vivo com uma Ala de Copa e Lazer dedicada (café, sofás, mesa de sinuca e vídeo game) e dá aos agentes ociosos (`idle`/`done`) vida própria: caminham pela sala, alternam de estação, usam adereços, conversam em duplas e retornam ao computador ao entrar em trabalho.

## 1. Salas em 4:3 e 3:2 com Trabalho à Esquerda e Copa/Lazer à Direita

| Sala | Elenco | Tela lógica | Proporção | Colunas de mesa (esquerda) | Ala de Copa e Lazer (direita) |
|---|---|---|---|---|---|
| `pequena` | 1 a 3 | `320×240` | `4:3` | 2 (`x = 0..159`, até 2×2) | `x = 160..319` (`160×240`) |
| `media` | 4 a 6 | `320×240` | `4:3` | 2 (`x = 0..159`, 2×3) | `x = 160..319` (`160×240`) |
| `grande` | 7 a 9 | `360×240` | `3:2` | 3 (`x = 0..239`, 3×3) | `x = 240..359` (`120×240`) |
| `completa` | 10 a 12 | `360×240` | `3:2` | 3 (`x = 0..239`, 3×4) | `x = 240..359` (`120×240`) |

- `sala.vaosX` continua listando exclusivamente os `colunasDeMesa - 1` vãos entre colunas de mesa (`[72]` na pequena e média; `[72, 152]` na grande e completa).
- O corredor vertical de entrada da ala começa em `x0 = colunasDeMesa * 80` (`lx = 0..15`), livre do topo das mesas (`y = 25`) até o fim da sala (`y = 239`), permitindo que todas as estações de lazer fiquem empilhadas à direita em 4 faixas sem invadir a zona de trabalho nem colidir com mesas.
- **Móveis obrigatórios em todas as 4 salas**:
  - **Copa** (topo, `y = 2..50`): `cafe` (`16×22`), `bancada-copa` (`28×18`), `bebedouro` (`10×22`).
  - **Vídeo Game** (faixa 2): `videogame` (`32×20`) com 4 quadros animados (`TELAS_DE_JOGO`) quando ocupado, e dois `pufe` (`14×10`).
  - **Sinuca** (faixa 3): `sinuca` (`52×26`, maior que a mesa de computador `44×11`).
  - **Sofás** (faixa 4, base): `tapete`, `sofa` (`40×18`), `poltrona` (`18×16`), `mesa-baixa` (`24×10`), `abajur` (`9×22`).
- Todos os móveis ficam inteiros dentro da sala (`0 <= x`, `x + largura <= sala.largura`, `0 <= y`, `y + altura <= sala.altura`). Móveis de parede ficam com `y + altura <= 24`; móveis de chão não cruzam células de mesa nem sobrepõem móveis vizinhos.
- Na paleta `CORES` (`sprites.js`), o teto máximo continua `<= 24` cores.

## 2. Estações de Lazer, Alternância e Retorno

- `ESTACOES_DE_LAZER = ['cafe', 'sofas', 'sinuca', 'videogame']`.
- Cada sala tem 2 postos por estação (`postosDeLazer(sala, crew)`), com `adereco` contextual:
  - `cafe` → `'xicara'`
  - `sofas` → posto 0 sentado no `sofa` (`assento: 'sofa'`, `adereco: 'livro'`) e posto 1 sentado na `poltrona` (`assento: 'poltrona'`, `adereco: 'livro'` ou `null` para alternar leitura e conversa)
  - `sinuca` → `'taco'`
  - `videogame` → `'controle'`
- Constantes de tempo (determinísticas por `(modelo, agoraMs)`):
  - `TURNO_LAZER_MS = 16000` (troca de ambiente a cada 16 s)
  - `CAMINHADA_LAZER_MS = 2800` (deslocamento ortogonal no início do turno)
  - `RETORNO_MS = 2400` (caminhada de volta da estação de lazer até `mesa.boneco` quando entra em `working`)
- **Agentes livres (`idle` ou `done`)**, quando não estão em entrega (`entrega`) nem em comemoração (`comemoracao`) e `reduzirMovimento` é falso:
  - Caminham da mesa (no turno 0) ou da estação anterior até o novo posto via `rotaDeLazer` sem cruzar móveis sólidos ou tampos de mesa.
  - Pareamento: quando há `>= 2` agentes livres, eles são alocados em duplas na mesma estação (com rotação a cada `TURNO_LAZER_MS` garantindo que ninguém permaneça na mesma estação em dois turnos consecutivos).
  - Quando em estação diferente da própria mesa, `sentado = false`, `pose = 'em-pe'` (ou caminhando com `'andar-a'` / `'andar-b'`), e o sinal `✓` (`done`) fica oculto para não poluir a cena.
- **Retorno ao PC (`VoltandoAoPC`)**:
  - Ao detectar `transicao(anterior, atual, agoraMs)` em que um agente passa de `idle`/`done` para `working`, registra-se o retorno com origem no posto onde o agente estava e início `agoraMs`.
  - Durante `[inicioMs, inicioMs + RETORNO_MS)`, o agente caminha de volta até sua `mesa.boneco` (pose de caminhada) e depois senta no computador (`sentado = true`, `adereco = null`, `acao = 'digitando'`).
- **Acessibilidade (`reduzirMovimento: true`)**: todos permanecem sentados em suas mesas (`sentado = true`, `adereco = null`, `lazer = null`).

## 3. Diálogos de Convivência e Prioridade de Balões

- Novo módulo puro `modelo-dialogos.js` com catálogos em PT-BR (acentos corretos):
  - `DIALOGOS_DE_LAZER`: pares de falas ida-e-volta para cada estação (`cafe`, `sofas`, `sinuca`, `videogame`).
  - `FALAS_SOLO`: falas contextuais quando o agente está sozinho na estação.
  - `FALAS_RETORNO`: falas curtas ao voltar para o PC quando uma tarefa começa.
  - `FALAS_TRABALHO`: falas ocasionais de progresso para agentes `working`.
- **Prioridade de balões**:
  1. Passagem de bastão (`entrega` em curso).
  2. Fala fixa de transição (`falaFixa`: passo novo, pronto, erro, ou retorno ao PC).
  3. Fala de convivência (`falaDeConvivencia`): no máximo **1 balão** ativo por vez na sala inteira, alternando entre os colegas da dupla após chegarem à estação.
- `rotulos.js` atualiza a posição do balão inclusive quando `b.y` muda durante caminhadas.

## 4. Cenários BDD

- **E5-01a — Salas em 4:3 e 3:2 com Trabalho à esquerda e Copa/Lazer à direita**: nas 4 salas (`pequena`/`media` `320×240` [4:3] com 2 colunas de trabalho; `grande`/`completa` `360×240` [3:2] com 3 colunas de trabalho), `moveisDe` inclui `cafe`, `bancada-copa`, `bebedouro`, `videogame`, `pufe`, `sinuca` (maior que a mesa de computador) e `sofa`/`poltrona` concentrados à direita (`x >= colunasDeMesa * 80`), sem sair da sala nem cruzar células de mesa.
- **E5-02a — Postos, balões de fala e rotas livres de colisão**: `postosDeLazer` devolve 8 postos (2 por estação) dentro dos limites da sala; apenas os postos do lounge acomodam-se dentro do próprio assento (`sofa` e `poltrona`), enquanto todos os demais ficam fora de obstáculos sólidos; `rotaDeLazer` gera caminhos ortogonais de pixels inteiros ligando qualquer mesa a qualquer posto e entre postos sem atravessar mesas ou outros móveis sólidos; `caixaDaFala` em postos de lazer não sofre corte por nomes de mesas da ala de trabalho.
- **E5-03a — Caminhada, adereços e alternância entre ambientes**: agentes `idle`/`done` deslocam-se até as estações, recebem o `adereco` da estação (`xicara`, `livro`, `taco`, `controle`), agrupam-se quando há `>= 2` livres e trocam de estação após `TURNO_LAZER_MS`.
- **E5-04a — Diálogos entre colegas em PT-BR e prioridade**: dois agentes na mesma estação alternam falas em turnos depois da caminhada; nunca há dois balões de convivência simultâneos; entrega (`handoff`) tem prioridade sobre diálogos de lazer.
- **E5-05a — Retorno ao computador ao iniciar tarefa**: quando um agente em lazer muda para `working`, ele caminha da estação de lazer de volta até `mesa.boneco` durante `RETORNO_MS` e volta a digitar sentado sem adereço.
- **E5-06a — Acessibilidade `reduzirMovimento`**: com `reduzirMovimento: true`, nenhum agente sai da mesa ou segura adereço de lazer.
- **E5-upg — Upgrade de workspace existente**: `update` entrega `sprites-lazer.js`, `modelo-lazer.js` e `modelo-dialogos.js` e atualiza o runtime mantendo um `state.json` pré-existente funcional sem perder dados do usuário.
