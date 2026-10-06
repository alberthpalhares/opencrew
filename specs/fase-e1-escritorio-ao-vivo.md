# Spec — Fase E1: Escritório ao vivo — a equipe trabalhando, em 8 bits (1.7.0)

- **Fase:** E1 · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/`, `escritorio/`, `runner.pipeline.md`, `prompts/`; `templates/AGENTS.md`) + README + testes. O CLI (`src/`) não muda · **Status:** decisões e emendas aceitas pelo dono em 2026-10-05; texto emendado aguardando a aprovação final
- **Termos novos no GLOSSARIO.md:** sim — Escritório, Estado da execução, Evento de estado, Passagem de bastão
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** pedido do dono em 2026-10-05; `IDEIAS.md`; achados D-01, D-06 e T-B3 de `docs/auditoria/2026-10-02-auditoria-geral.md`; pesquisa de 78 projetos parecidos em `docs/pesquisa/2026-10-05-escritorios-de-agentes.md` (as emendas S1 a S14 vêm de lá). Desfaz a decisão 3 e a regra 32 de `specs/fase-u3a-entrega-por-canal.md` (remover o dashboard), que não chegou a ser aprovada.

**Decisões aceitas pelo dono em 2026-10-05:**
1. **Posição no roteiro: depois da R1 e da R2, antes da U3a**, como 1.7.0. A U3a passa a 1.8.0, a
   U3b a 1.9.0 e a U4 a 1.10.0; os documentos são renumerados no commit desta fase.
2. **Quem grava o estado é um script, não a IA** (regras 1 a 8), com **um comando por passo**: a
   passagem de bastão é gravada pelo próprio `passo`; não existe evento `handoff` (S1).
3. **Continua desligado por padrão** (regra 9). Liga com `/opencrew dashboard`.
4. **O comando é `/opencrew dashboard`** e a preferência continua `Dashboard`, que já existe nos
   projetos instalados. Na tela, o nome é "Escritório". Sem comando novo no CLI do npm.
5. **A página consulta o servidor a cada 1 segundo** (regra 20). Sem WebSocket e sem observação
   de arquivo.
6. **Desenho feito em código, sem imagem** (regra 16): nenhum PNG entra no pacote.
7. **`dashboard/` sai da raiz do repositório**: o que serve migra para o payload.
8. **Até 12 mesas** (regra 17). Agente além do 12º aparece só na lista ao lado.
9. **"Sem sinal" aos 20 minutos** (regra 21, S2): execução em andamento sem atualização muda a
   pose de quem trabalhava. Nada é regravado.
10. **Três escolhas em que a verificação da pesquisa divergiu** e a recomendada foi aceita:
    `?demo` força a demonstração (regra 23); a gravação é repetida quando o Windows recusa a
    troca de nome (regra 3); o servidor envia política de segurança de conteúdo (regra 13).

(IDs de regra estáveis: a regra 4 foi retirada e as novas entraram como 28 e 29.)

## 1. Objetivo
Quem roda uma crew passa a ver a equipe trabalhando: um escritório em pixel-art, aberto no
navegador, em que cada agente tem sua mesa, digita quando é a vez dele, leva o papel ao colega
na passagem de bastão e levanta a mão quando espera uma resposta do usuário. Hoje o desenho
existe no repositório, mas não é instalado, não tem como ser aberto e lê o arquivo no lugar
errado. Depois desta fase ele chega a quem já usa com um `update` e funciona nas 9 IDEs.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| D-01, T-B3 | A doc já prometeu um dashboard que não é instalado | E1-07, E1-upg |
| D-06 | Nome de agente e rótulo entram como HTML cru; modo ao vivo lê `./state.json`; congela se a primeira leitura falha; não abre por `file://` | E1-04, E1-05, E1-06 (`file://`: E1-06d) |
| Runner 1.6.x | `checkpoint` e falha nunca são gravados | E1-01 |
| Runner 1.6.x | Duas gravações seguidas na passagem de bastão, que uma consulta por segundo perde | resolvido gravando a passagem no `passo` e animando pela mudança de `handoff.completedAt` (E1-01c, E1-05f) |
| Runner 1.6.x | Cerca de 125 linhas mandando a IA montar JSON | E1-03 |
| Pesquisa, §3 | Queixa nº 1 dos projetos parecidos: a tela mente (boneco mexendo com o agente parado) | E1-05d (sem sinal), E1-05b (ocioso parado) |
| U3a, regra 32 (não aprovada) | Remoção do dashboard | desfeita; a guarda U3a-13c fica |
| Fora daqui | Ver §10 | — |

## 3. Entradas
| Entrada | Tipo | Obrigatória | Validação |
|---|---|---|---|
| pasta atual do comando | raiz do projeto | sim | contém `_opencrew/` |
| `estado.mjs <crew> <evento>` | nome da crew e evento | sim | `crews/<crew>/` existe, dentro do projeto; evento da lista da regra 2 |
| `--passos` | inteiro | não | a partir de 1; ausente ou inválido: `step.total` vazio |
| `--n` | inteiro | não | a partir de 1; ausente ou inválido: `step.current` não muda |
| `--agente` | id de agente | conforme o evento | consta no `crew-party.csv` da crew |
| `--rotulo`, `--mensagem`, `--motivo` | texto | não | cortado em 120 caracteres; quebras de linha viram espaço |
| `escritorio.mjs --porta` | inteiro | não | 1024 a 65535; ausente: 4747 |
| `- **Dashboard:** enabled` em `preferences.md` | preferência | não | ausente ou outro valor: desligado |

## 4. Saídas
- **`crews/<crew>/state.json`** (o estado da execução), gravado só pelo `estado.mjs`:
  ```json
  {
    "crew": "<crew>",
    "status": "running | checkpoint | completed | failed",
    "step": { "current": 2, "total": 5, "label": "<rótulo>" },
    "agents": [
      { "id": "researcher", "name": "Pedro Pesquisa", "icon": "🔎",
        "status": "idle | working | checkpoint | done | skipped | failed",
        "label": "<último rótulo do agente>" }
    ],
    "handoff": { "from": "<id>", "to": "<id>", "message": "<1 frase>", "completedAt": "<ISO>" },
    "motivo": "<só em failed>",
    "startedAt": "<ISO>", "updatedAt": "<ISO>", "completedAt": "<ISO>", "failedAt": "<ISO>"
  }
  ```
  É o formato da 1.6.x com dois status de agente a mais (`checkpoint`, `failed`; `skipped` já
  existia), dois de execução (`checkpoint`, `failed`), o campo `label` por agente e sem `desk`.
  `delivering` deixa de ser gravado. Arquivo antigo (com `desk`, com `delivering`, com execução
  `idle`, sem `label`) continua sendo lido pela página.
- **Última linha do `estado.mjs`:** `ESTADO:OK`, `ESTADO:OK — estado recriado` ou
  `ESTADO:IGNORADO — <motivo>`. Código 0 nos três casos; 1 só em erro de uso (crew ou evento
  faltando, raiz sem `_opencrew/`, crew inexistente ou fora do projeto), sem linha `ESTADO:` e
  sem escrever nada.
- **Servidor:** uma linha ao subir, `Escritório aberto em http://127.0.0.1:<porta> — Ctrl+C para
  fechar`. `GET /estado` devolve `{ "projeto": "<id>", "crews": [ { "crew": "<nome>", "estado":
  { … } } ] }`, a crew de `updatedAt` mais recente primeiro. `projeto` são 12 caracteres do
  SHA-256 do caminho real da raiz (em minúsculas no Windows); o caminho em si não é exposto.
- **Página:** o escritório (canvas), o nome da crew, o passo atual com contagem, a lista dos
  agentes com o status por extenso e o que cada um fez, e a última passagem de bastão.

## 5. Regras

**Gravação do estado (`scripts/estado.mjs`, módulos em `scripts/estado/`)**
1. **Núcleo puro.** `proximoEstado(estado, evento)` devolve o estado novo sem ler nem escrever
   nada; a casca lê o arquivo, aplica e grava. Todo evento renova `updatedAt`.
2. **Seis eventos:**
   - `iniciar [--passos N]`: lê `id`, `displayName` e `icon` de `crew-party.csv` (em crew antiga,
     sem a coluna `id`, o id sai do nome do arquivo em `path`); todos `idle`, com
     `label` vazio; execução `running`; `step` em 0 de N; `handoff` nulo; `startedAt`. Substitui
     o arquivo que houver.
   - `passo [--n K] [--agente <id>] [--rotulo "<texto>"] [--mensagem "<texto>"]`: o agente vira
     `working` e o `label` dele recebe o rótulo; execução `running`. Todo outro agente ativo
     (`working` ou `checkpoint`; `delivering`, em arquivo antigo) vira `done`. Se havia outro
     agente ativo, grava `handoff { from: <o primeiro deles, na ordem do elenco>, to: <id>,
     message, completedAt: agora }`; sem `--mensagem`, `message` vazio. Mesmo agente de novo, ou
     ninguém ativo: o `handoff` fica como está. Agente `done` que volta a trabalhar vira
     `working`. Sem `--agente`: só o `step` e a execução (`running`) mudam.
   - `checkpoint [--n K] [--agente <id>] [--rotulo "<texto>"]`: execução `checkpoint`; com
     `--agente`, ele vira `checkpoint`. Não mexe no `label` dos agentes nem em `handoff`.
   - `pular --agente <id>`: o agente vira `skipped`.
   - `concluir`: todo agente que não é `skipped` vira `done`; execução `completed`; `completedAt`.
   - `falhar [--motivo "<texto>"]`: o agente em `working` ou `checkpoint` vira `failed`; execução
     `failed`; `failedAt` e `motivo`.

   No `passo` e no `checkpoint`, `--n` grava `step.current` e `--rotulo` grava `step.label` (sem
   `--rotulo`: vazio).
3. **Gravação inteira ou nenhuma:** escreve em `state.json.<pid>.tmp`, na mesma pasta, e troca o
   nome. Troca recusada com EPERM, EBUSY ou EACCES (o Windows faz isso quando outro processo lê
   o arquivo) é repetida até 3 vezes em cerca de 300 ms. Se desistir: apaga o temporário e
   responde `ESTADO:IGNORADO — não foi possível gravar o estado`, código 0.
4. *(retirada em 2026-10-05: a cópia do estado final em `output/<run>/` não tinha leitor.)*
5. **O estado se conserta; o que não se aplica é ignorado.**
   - `passo` e `checkpoint` sem `state.json`, com ele ilegível, ou `passo --n 1` sobre execução
     `completed` ou `failed`: montam o estado como o `iniciar` (elenco do `crew-party.csv`;
     `step.total` herdado do estado anterior, se legível; senão vazio), aplicam o evento e
     respondem `ESTADO:OK — estado recriado`.
   - Ignorados sem mexer em nada (`ESTADO:IGNORADO`): agente que não está no elenco (o motivo
     lista os ids válidos); `pular`, `concluir` e `falhar` sem `state.json` ou com ele ilegível;
     `crew-party.csv` ausente ou sem agentes.
6. **Só escreve em um lugar:** `crews/<crew>/state.json`. Nunca toca em outro arquivo da crew.
7. **Texto recebido é dado:** nome, rótulo, mensagem e motivo vão para o JSON como texto, sem
   interpretação. O corte em 120 caracteres não parte um emoji ao meio.
8. **Sem dependência** e dentro dos limites de Node 20.0 da R1.

**Runner e roteamento**
9. **Desligado por padrão, em dois lugares.** O runner só chama o `estado.mjs` quando
   `preferences.md` tem `Dashboard: enabled`. O script confere a mesma linha em todo evento,
   inclusive no `iniciar`: sem ela responde `ESTADO:IGNORADO — escritório desligado (ligue com
   /opencrew dashboard)`, código 0, e não grava nada. Valem `- **Dashboard:** enabled` e
   `Dashboard: enabled`, sem diferenciar maiúsculas.
10. **Uma linha por evento.** No runner, os blocos que hoje descrevem o JSON viram a tabela
    "momento → comando", com seis momentos: início (`iniciar`), antes de cada passo (`passo`),
    antes da pergunta de um checkpoint (`checkpoint`), logo depois do `iniciar`, um por agente desselecionado (`pular`), fim
    (`concluir`), execução abortada (`falhar`). Quando o agente muda, o `passo` leva em
    `--mensagem` uma frase sobre o que o agente anterior entregou; o runner não olha o passo
    seguinte. Depois do `iniciar`, o runner mostra ao usuário, uma vez por execução, a linha
    "Runner, início" da §6, se o `iniciar` respondeu `ESTADO:OK`. Passo do tipo checkpoint roda só
    o `checkpoint`, não `passo` e depois `checkpoint`. Os comandos rodam um por vez, esperando a
    resposta de cada um, nunca em paralelo (cada um lê e regrava o mesmo arquivo). O runner não
    escreve nem lê `state.json` por conta própria.
    **Texto no terminal:** `--rotulo`, `--mensagem` e `--motivo` vão entre aspas duplas, numa
    linha, começando por letra ou número, só com letras (com acento), números, espaço e
    `. , : ; - ( ) / ?`. Todo outro sinal sai (aspas de qualquer tipo, `$`, crase, `\`, `%`, `!`,
    emoji). Se não sobrar texto, a opção é omitida.
11. **O escritório nunca para a execução.** Comando que falha, não roda ou responde
    `ESTADO:IGNORADO`: o runner segue, não repete o evento, avisa o usuário uma vez por
    execução, em uma linha, e não pergunta nada. Com o motivo "escritório desligado" o runner
    não avisa e deixa de chamar o script naquela execução.
12. **`/opencrew dashboard`** (rota nova em `templates/AGENTS.md`): grava `- **Dashboard:**
    enabled` em `_opencrew/_memory/preferences.md`, trocando só essa linha (ou acrescentando-a no
    fim, se faltar); sobe `node _opencrew/core/scripts/escritorio.mjs` em segundo plano; mostra o
    endereço e diz que a próxima execução aparece ali. Repetir o comando é seguro e devolve o
    mesmo endereço (regra 15). Onde a IDE não roda processo em segundo plano, mostra o comando
    para o usuário rodar em outro terminal. `/opencrew dashboard off` grava `disabled` e não
    mexe em mais nada.

**Servidor (`scripts/escritorio.mjs`, módulos em `scripts/escritorio/`)**
13. **Só leitura, só local.** `node:http` preso em `127.0.0.1`; aceita só `GET`. Pedido cujo
    cabeçalho `Host` não seja `127.0.0.1` ou `localhost` (com a porta) recebe 421, em texto
    puro, com a instrução da §6; o `Host` recebido não é devolvido. Toda resposta leva
    `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` e `Content-Security-Policy:
    default-src 'self'; style-src 'self' 'unsafe-inline'`; nenhuma leva cabeçalho
    `Access-Control-*`. Não escreve em disco.
14. **Rotas fechadas:** `/` e os arquivos de `_opencrew/core/escritorio/`, por lista fixa de
    nomes escrita no `escritorio.mjs` (um teste exige que ela seja igual ao conteúdo da pasta), e
    `/estado`. O que vem depois de `?` é ignorado. Qualquer outro caminho: 404. Nenhum caminho
    vindo do pedido é juntado a uma pasta, e a pasta nunca é lida para montar rota.
15. **`/estado` lê os arquivos a cada pedido.** Entram as crews de `crews/` que têm `state.json`
    legível, com `agents` em lista. Arquivo ausente, pela metade ou inválido deixa a crew de fora
    daquela resposta; nunca vira erro. Sem nenhuma: `"crews": []`. **Porta ocupada** (inclusive por
    serviço que escuta em todas as interfaces, que o Windows deixaria abrir por cima): o script
    faz `GET /estado` nessa porta, com espera de até 1 s. Se a resposta traz `projeto` igual ao
    deste projeto, mostra a linha "já aberto" da §6 e sai com 0, sem subir outro servidor.
    Qualquer outra resposta, ou nenhuma: tenta a porta seguinte, até 10 portas ao todo (`<a>` a `<a>`+9); se nenhuma servir, sai
    com código 1 e a mensagem da §6.

**Página (`escritorio/`: `index.html` e módulos; `modelo.js` é o núcleo puro, testado no Node)**
16. **8 bits de verdade.** Tela interna de 320×180, ampliada só em escala inteira, sem
    suavização. A escala é medida em pixels do dispositivo: `escala(largura, altura, dpr)`, pura,
    devolve o maior inteiro N ≥ 1 em que 320·N × 180·N cabe em largura·dpr × altura·dpr, e o
    tamanho do canvas em CSS (320·N/dpr × 180·N/dpr); se nem N = 1 cabe, N = 1 com rolagem.
    Sala, mesas e bonecos são matrizes de pixels com paleta. Um molde de boneco de 16×16, só de
    frente, espelhado conforme a direção; as poses são o molde com linhas trocadas (pernas A/B,
    digitar A/B, braço levantado, braço com papel), não uma matriz por pose. A camisa vem da
    posição da mesa (12 cores, uma por mesa); cabelo e pele vêm do `id` do agente.
17. **Mesas pela ordem do elenco**, em grade de 4 colunas, até 12. A posição é calculada na
    página.
18. **O que cada status mostra:**

    | Status do agente | Boneco | Monitor |
    |---|---|---|
    | `idle` | sentado, parado | apagado |
    | `working` | digitando; balão com o rótulo do passo | aceso, com linhas correndo |
    | `checkpoint` | mão levantada; balão "Aguardando você" | âmbar, piscando 1 vez por segundo |
    | `done` | sentado, com ✓ | apagado |
    | `skipped` | apagado (meio transparente) | apagado |
    | `failed` | sentado, com ponto de exclamação vermelho | vermelho, fixo |

    O status nunca muda a cor do boneco: muda o monitor e o sinal sobre a cabeça (✓, !, mão),
    cada um com forma própria. Sem rótulo, o balão de `working` mostra "Passo K de N" (sem
    total: "Passo K"). Execução `checkpoint`, com ou sem agente: faixa no alto da sala,
    `Aguardando você: <rótulo>` (sem rótulo: `Aguardando você`), nenhum balão de rótulo, e o agente
    `working` é desenhado como `idle` (boneco e monitor; a lista e o arquivo não mudam).
    `delivering`, lido de arquivo antigo, vale como `done`. Status desconhecido vale como `idle`.
19. **Nenhum texto dentro do canvas.** O canvas só desenha matrizes de pixels (✓, "!" e "?" são
    sprites). Nome, rótulo, mensagem e motivo entram na página só por `textContent`. O nome de
    cada agente fica sob a mesa dele e o balão sobre o boneco, como elementos numa camada sobre
    o canvas, com `aria-hidden="true"` (a lista da regra 24 é a fonte para leitor de tela). A
    posição vem do `modelo.js` em coordenada lógica e é aplicada em porcentagem de 320×180. Nome
    e balão têm a largura de uma coluna e cortam com reticências por CSS; o texto inteiro está
    na lista. Nenhum arquivo de `escritorio/` usa `fillText`, `strokeText`, `innerHTML` nem
    equivalente.
20. **A página nunca trava e sempre diz o próximo passo.**
    - Consulta `/estado` a cada 1 segundo e, ao voltar para a aba, na hora. Consulta que falha ou
      vem inválida mantém o último estado bom.
    - Crew que some de uma resposta válida continua na tela por até 3 consultas seguidas; na 4ª,
      sai. Sem estado bom anterior, não há espera.
    - Servidor fora do ar: o aviso "sem servidor" da §6 e novas tentativas, sem recarregar.
    - O `index.html` traz, em HTML estático, a frase de abertura da §6; a página só a esconde
      depois do primeiro desenho. Quem abre o arquivo direto (`file://`), está com JavaScript
      desligado ou pega um módulo que não carrega lê a instrução, em vez de tela vazia.
21. **Sem sinal.** `modelo.js` recebe a hora atual por parâmetro e calcula a idade de `updatedAt`
    a cada leitura. Execução `running` há mais de 2 minutos sem atualização: a página mostra
    `Última atualização há <N> min` (até 59; depois `há <N> h`). Há mais de 20 minutos: o agente
    em `working` recebe a ação derivada `sem-sinal` (o desenho de `idle` com um "?" em cima) e a
    lista diz `Sem sinal há <N>`. Não afirma que travou: um passo longo é normal. Nada é
    regravado por idade, nem pelo servidor nem pelo `estado.mjs`; passo, agente e status do
    arquivo ficam como estão, e o evento seguinte desfaz. Não vale para execução `checkpoint`,
    `completed` ou `failed`, para a demonstração, nem sem `updatedAt` válido.
22. **Mais de uma crew:** mostra a de atualização mais recente e um seletor com as outras. A
    escolha do usuário vale até ele trocar.
23. **Sem execução nenhuma:** roda uma demonstração roteirizada, com a etiqueta e a frase da §6
    à vista, e passa sozinha para a execução real quando ela aparecer. O roteiro passa por todos
    os status de agente da regra 18, por uma passagem de bastão e pela execução `completed`. Com
    `?demo` no endereço, a demonstração roda mesmo com execução gravada, não troca sozinha e
    mostra a frase própria da §6.
24. **Lista ao lado do desenho:** todo agente, com ícone, nome, status por extenso em PT-BR
    (regra 13 do AGENTS.md) e, quando houver, o `label` dele (o que fez ou está fazendo). É o
    que vale para leitor de tela e para o agente sem mesa. Com "reduzir movimento" ligado no
    sistema, os bonecos não andam nem balançam e o monitor não pisca (âmbar fixo); o status
    continua visível.
25. **Sem rede externa:** nenhuma fonte, script ou imagem de fora. Sem build. O `index.html` só
    carrega script por `src`: nenhum script embutido, nenhum atributo `on…`.
28. **Animações pela transição e pelo relógio, nunca por contador de quadros.**
    - O que anima sai de uma função pura de `modelo.js` (leitura anterior, leitura atual, hora
      recebida por parâmetro), nunca de um status gravado. `quadro(modelo, agoraMs)`, também
      pura, devolve pose e posição inteira de cada boneco pelo tempo decorrido: digitar troca de
      pose a cada 0,3 s; andar, a cada 0,15 s. `cena.js` só pinta o que recebe.
    - **Passagem de bastão:** `handoff.completedAt` diferente do da leitura anterior da mesma
      crew: quem entregou vai até a frente da mesa de quem recebe, com o papel, e volta a sentar.
      Duração fixa: 2 s de ida e 2 s de volta. A rota tem só trechos horizontais e verticais,
      pelos vãos entre as mesas, sem busca de caminho. Estado que chega no meio não interrompe;
      passagem nova substitui a que estiver em curso. Percurso cujo tempo já passou aparece
      terminado. Se quem entrega ou quem recebe não tem mesa, não há caminhada.
    - **Comemoração:** execução que passa a `completed`: todos comemoram por 4 s e voltam a
      `done`.
    - Na primeira leitura de cada crew (abrir, recarregar, trocar no seletor, sair da
      demonstração) nada disso toca. Com "reduzir movimento", não há caminhada nem comemoração.
      A demonstração usa o mesmo caminho.
29. **Título da aba.** `modelo.js` devolve o título e a página o grava em `document.title`, só
    quando muda: `(!) Aguardando você — <crew>` · `✓ Concluída — <crew>` · `✗ Falhou — <crew>` ·
    `<K>/<N> <rótulo> — <crew>` (sem rótulo: `Passo <K> de <N> — <crew>`; sem total, saem o
    `/<N>` e o ` de <N>`). Segue a crew em
    exibição (regra 22). Em demonstração, sem estado ou sem conexão: `Escritório`.

**Entrega**
26. **Tudo mora em `templates/_opencrew/core/`**, que o `update` renova: chega a quem já usa sem
    migração (regra 14 do AGENTS.md). `preferences.md` do usuário não é tocado pelo `update`.
27. **`dashboard/` da raiz é apagada**; saem a linha `dashboard/` do `.npmignore` e os restos do
    app antigo no `.gitignore`.

## 6. Textos
| Onde | Texto |
|---|---|
| `estado.mjs`, agente desconhecido | `ESTADO:IGNORADO — agente "<id>" não está no elenco da crew. Ids válidos: <id1>, <id2>, …` |
| `estado.mjs`, sem estado | `ESTADO:IGNORADO — sem estado desta execução` |
| `estado.mjs`, estado refeito | `ESTADO:OK — estado recriado` |
| `estado.mjs`, desligado | `ESTADO:IGNORADO — escritório desligado (ligue com /opencrew dashboard)` |
| `estado.mjs`, gravação recusada | `ESTADO:IGNORADO — não foi possível gravar o estado` |
| `estado.mjs`, erro de uso | `Uso: node _opencrew/core/scripts/estado.mjs <crew> <evento> [opções]` e o motivo |
| Servidor, já aberto | `O escritório já está aberto em http://127.0.0.1:<porta>` |
| Servidor, sem porta | `Não foi possível abrir o escritório: as portas <a> a <b> estão ocupadas. Use --porta.` |
| Servidor, fora da raiz | `Rode este comando na pasta do projeto (a que contém _opencrew/).` |
| Servidor, `Host` recusado | `Abra por http://127.0.0.1:<porta>` |
| Runner, início | `Escritório ligado. Se a página não estiver aberta, rode em outro terminal: node _opencrew/core/scripts/escritorio.mjs` |
| Runner, aviso único | `O escritório não foi atualizado nesta execução; o trabalho segue normalmente.` |
| Página, abrindo (HTML estático) | `Abrindo o escritório… Se esta mensagem não sumir, abra pelo endereço que o comando /opencrew dashboard mostrou, e não pelo arquivo.` |
| Página, sem servidor | `Sem conexão com o escritório. Tentando de novo… Para reabrir, rode /opencrew dashboard.` |
| Página, demonstração | `Demonstração — nenhuma execução ainda. Rode uma crew e ela aparece aqui.` |
| Página, `?demo` | `Demonstração. Tire ?demo do endereço para ver a sua crew.` |
| Página, parada | `Última atualização há <N> min` (ou `há <N> h`) |
| Página, lista, sem sinal | `Sem sinal há <N> min` (ou `há <N> h`) |
| Página, faixa do checkpoint | `Aguardando você: <rótulo>` (sem rótulo: `Aguardando você`) |
| Página, título da aba | os cinco da regra 29 |

## 7. Cenários

**E1-01 — Eventos** (núcleo puro)
- **E1-01a** DADO um `crew-party.csv` com 3 agentes QUANDO `iniciar --passos 5` ENTÃO o estado tem
  os 3 em `idle`, na ordem do arquivo, com nome, ícone e `label` vazio, `step` 0 de 5, `handoff`
  nulo e execução `running`.
- **E1-01b** DADO o estado iniciado QUANDO `passo --n 1 --agente a --rotulo "Pesquisar"` ENTÃO `a`
  está `working` com `label` "Pesquisar", os outros `idle` e o `handoff` segue nulo; QUANDO
  depois `passo --n 2 --agente b --rotulo "Escrever"` ENTÃO `a` está `done` e mantém o `label`,
  `b` está `working` com o dele, e o `handoff` tem `from` a, `to` b, `message` vazio e
  `completedAt`; o `step` tem `current` 2 e `label` "Escrever".
- **E1-01c** DADO `a` em `working` QUANDO `passo --n 2 --agente b --mensagem "x"` ENTÃO
  `handoff.message` é "x"; DADO `a` em `checkpoint`, o mesmo; QUANDO `passo --agente b` de novo,
  `passo` sem `--agente` ou `passo` sem ninguém ativo ENTÃO o `handoff` não muda; DADOS `a` em
  `checkpoint` e `b` em `working` QUANDO `passo --agente c` ENTÃO `from` é `a` e os dois estão
  `done`. DADA a execução em `checkpoint` QUANDO `passo` sem `--agente` ENTÃO ela volta a
  `running`.
- **E1-01d** QUANDO `checkpoint --agente a --rotulo "Aprovar pauta"` ENTÃO execução e agente estão
  `checkpoint` e o `label` de `a` não muda; sem `--agente`, só a execução; nos dois casos,
  `step.label` é "Aprovar pauta".
- **E1-01e** QUANDO `pular --agente c` e depois `concluir` ENTÃO `c` segue `skipped`, os outros
  estão `done` e a execução `completed`, com `completedAt`.
- **E1-01f** DADO `a` em `working` QUANDO `falhar --motivo "sem acesso"` ENTÃO `a` e a execução
  estão `failed`, com `failedAt` e `motivo`.
- **E1-01g** DADO `a` em `done` e ninguém ativo QUANDO `passo --agente a` ENTÃO `a` volta a
  `working`.
- **E1-01h** DADO um arquivo da 1.6.x com `a` em `delivering` QUANDO `passo --agente b` ENTÃO `a`
  está `done` e o `handoff` vai de `a` para `b`.

**E1-02 — Casca do script** (os testes montam um `preferences.md` com `enabled`, menos o E1-02g)
- **E1-02a** QUANDO `passo --agente fantasma` ENTÃO o arquivo fica igual, byte a byte, a última
  linha traz todos os ids do elenco e o código é 0.
- **E1-02b** DADA uma crew sem `state.json`, ou com ele ilegível (JSON cortado), QUANDO `passo
  --n 1 --agente a` ENTÃO o arquivo fica com o elenco, `a` em `working`, e a última linha é
  `ESTADO:OK — estado recriado`; QUANDO `checkpoint` ENTÃO a mesma linha, com o elenco em `idle`
  e execução `checkpoint`; QUANDO `pular`, `concluir` ou `falhar` ENTÃO o arquivo não é criado
  nem muda e a saída é `ESTADO:IGNORADO`; DADA uma crew sem `crew-party.csv` QUANDO `iniciar
  --passos 3` ENTÃO nada é criado, a última linha começa com `ESTADO:IGNORADO` e o código é 0.
- **E1-02c** DADA uma crew inexistente, ou `../fora`, ENTÃO código 1, sem linha `ESTADO:` e nada
  escrito.
- **E1-02d** *(retirado com a regra 4; o ID não é reaproveitado.)*
- **E1-02e** DADA uma `--mensagem` com 300 caracteres, quebra de linha e `<b>` ENTÃO o JSON guarda
  120 caracteres, numa linha, com `<b>` como texto.
- **E1-02f** DEPOIS de qualquer sequência de eventos ENTÃO o único arquivo novo ou mudado na crew
  é `state.json` (nenhum temporário sobra).
- **E1-02g** DADO `preferences.md` ausente, sem a linha ou com `disabled` ENTÃO nenhum evento cria
  arquivo, inclusive o `iniciar`, e a última linha é a "desligado" da §6, com código 0; DADAS as
  duas formas da linha citadas no runner ENTÃO as duas ligam.
- **E1-02h** DADA a troca de nome (recebida por parâmetro) que falha 2 vezes com EPERM e passa na
  3ª ENTÃO o estado é gravado; DADA a que falha sempre ENTÃO `ESTADO:IGNORADO — não foi possível
  gravar o estado`, código 0, e nenhum temporário sobra.
- **E1-02i** DADA uma execução `completed` QUANDO `passo --n 1 --agente a` ENTÃO o elenco volta a
  `idle` (menos `a`), o `handoff` é nulo, `startedAt` é novo e o `step.total` é o anterior.

**E1-03 — Runner e roteamento (contrato)**
- **E1-03a** o runner cita `scripts/estado.mjs` com os seis eventos e condiciona todos a
  `Dashboard: enabled`; não descreve o JSON, não manda escrever `state.json` e não cita o evento
  `handoff`; traz a lista de caracteres da regra 10 e a linha "Runner, início" da §6.
- **E1-03b** o runner diz que falha do escritório não para a execução, traz o aviso da §6 e diz
  que "escritório desligado" não gera aviso.
- **E1-03c** `templates/AGENTS.md` tem a rota `/opencrew dashboard` e a `/opencrew dashboard off`, cita `scripts/escritorio.mjs`
  e mantém "disabled by default"; o modelo de `preferences.md` segue com `Dashboard: disabled`.
- **E1-03d** `build.prompt.md` e `repair.prompt.md` não mandam escrever `state.json`.

**E1-04 — Servidor**
- **E1-04a** DADO um projeto com duas crews com estado QUANDO `GET /estado` ENTÃO a resposta traz
  `projeto` e as duas crews, a de `updatedAt` mais recente primeiro, e os dois `state.json`
  ficam iguais, byte a byte.
- **E1-04b** DADO um `state.json` cortado pela metade e outro válido ENTÃO só o válido vem e o
  código é 200; DADO nenhum ENTÃO `"crews": []`.
- **E1-04c** `GET /` e `GET /?demo` devolvem a página; `GET /modelo.js` devolve o módulo com tipo
  JavaScript.
- **E1-04d** `GET /../../package.json`, `GET /%2e%2e/segredo` e `GET /crews/x/state.json`
  ENTÃO 404; `POST /estado` ENTÃO 405.
- **E1-04e** pedido com `Host: exemplo.com` ENTÃO 421 com o texto da §6 e a porta real, sem
  repetir o `Host` recebido; o servidor escuta só em `127.0.0.1`.
- **E1-04f** DADA a porta pedida em `--porta` ocupada por um serviço alheio (responde 401, ou JSON sem
  `projeto`) ou por um escritório de outro projeto ENTÃO sobe na seguinte e a linha de abertura
  mostra a porta real; DADAS as 10 ocupadas ENTÃO código 1 e a mensagem da §6.
- **E1-04g** fora da raiz do projeto ENTÃO código 1 e a mensagem da §6.
- **E1-04h** DADO um escritório deste projeto na porta QUANDO o comando roda de novo ENTÃO código
  0, a linha "já aberto" com a mesma porta e nenhum servidor novo.
- **E1-04i** as respostas de `/`, `/estado`, de um 404 e do 421 trazem os três cabeçalhos da
  regra 13; nenhuma traz `Access-Control-Allow-Origin`.
- **E1-04j** a lista fixa de arquivos do servidor é igual ao conteúdo de `escritorio/`, nome a
  nome.
- **E1-04k** o cálculo de `projeto` devolve 12 caracteres hexadecimais, o mesmo valor para a
  mesma raiz e, com a plataforma Windows, o mesmo valor para a raiz escrita com outra caixa.

**E1-05 — Modelo da página (`modelo.js`, testado no Node)**
- **E1-05a** 1, 4, 5 e 12 agentes ENTÃO mesas em grade de 4 colunas, sem sobreposição e dentro de
  320×180, cada uma com a âncora do nome e a do balão dentro da tela e na própria coluna; com
  14, os dois últimos não têm mesa e constam na lista.
- **E1-05b** cada status da tabela da regra 18 vira o boneco e o monitor correspondentes; status
  desconhecido vira `idle` e `delivering` vira `done`; `working` sem rótulo gera o balão "Passo K
  de N"; com execução `checkpoint`, nenhum agente tem balão de rótulo, a faixa traz o rótulo
  e o agente `working` tem boneco e monitor de `idle`.
- **E1-05c** estado da 1.6.x (com `desk`, execução `idle`, sem `label`) é aceito e a lista mostra
  só o status; com `label`, a lista o devolve; `step.total` vazio gera "Passo K"; com `handoff`,
  o modelo devolve a última passagem (nome de quem entregou, nome de quem recebeu e a mensagem)
  e, em execução `failed`, o `motivo`.
- **E1-05d** o mesmo elenco gera sempre a mesma aparência e, até 12 agentes, nenhuma camisa se
  repete. Execução `running` com um agente `working`: `updatedAt` de 19 min atrás mantém a ação
  de `working` e gera `Última atualização há 19 min`; de 21 min atrás dá `sem-sinal` só a ele, e
  o objeto recebido não é alterado; de 90 min atrás gera `há 1 h`. Com execução `checkpoint`,
  `completed` ou `failed`, ou sem `updatedAt`, nunca há `sem-sinal`.
- **E1-05e** entrada que não é objeto, sem `agents` ou com `agents` que não é lista ENTÃO o modelo
  devolve "sem estado", sem lançar erro.
- **E1-05f** DADAS duas leituras com `handoff.completedAt` diferente ENTÃO quem entregou tem a
  ação "entregando" rumo à mesa de quem recebe enquanto o relógio marca menos de 4 s, inclusive
  se uma terceira leitura traz outro `passo`; depois, `done`. Passagem nova no meio substitui a
  anterior. Com 14 agentes, as passagens do 12º para o 13º e do 13º para o 14º não geram
  caminhada nem erro.
- **E1-05g** DADA a primeira leitura de uma crew, com `handoff` preenchido e execução `completed`,
  ENTÃO não há caminhada nem comemoração; o mesmo ao trocar de crew e ao sair da demonstração.
  DADA a passagem de `running` para `completed` ENTÃO há comemoração por 4 s; `completed` nas
  duas leituras: nada.
- **E1-05h** DADO um agente `working` ENTÃO `quadro` em t e em t + 0,3 s dá poses diferentes, em t
  e em t + 0,1 s dá a mesma, e chamar 1 ou 100 vezes no mesmo instante dá o mesmo resultado.
  DADA uma entrega de `a` para `b` ENTÃO no início a posição é a mesa de `a`; aos 2 s, a frente
  da mesa de `b`; na ida, a pose em t e em t + 0,15 s é diferente; aos 4 s e 10 minutos depois, a mesa de `a`, sentado; toda posição é inteira.
  Com "reduzir movimento": pose fixa e posição final.
- **E1-05i** PARA todo par de mesas entre 12 ENTÃO a rota só tem trechos horizontais ou
  verticais, fica dentro de 320×180, não cruza o retângulo de nenhuma mesa e termina na frente
  da mesa de quem recebe.
- **E1-05j** `escala(1000, 600, dpr)` com dpr 1, 1,25, 1,5 e 2 dá N = 3, 3, 4 e 6, com canvas de
  320·N/dpr × 180·N/dpr; `escala(200, 100, 1)` dá N = 1.
- **E1-05k** `checkpoint`, `completed`, `failed` e `running` (com e sem rótulo, com e sem total) geram os títulos
  da regra 29; demonstração, "sem estado" e sem conexão geram `Escritório`.
- **E1-05l** DADA uma crew que some da resposta por 1, 2 e 3 consultas ENTÃO o último estado bom
  é mantido; na 4ª, ela sai (e, sem nenhuma, entra a demonstração). Sem estado bom anterior, a
  demonstração entra na hora.
- **E1-05m** o roteiro da demonstração contém cada status de agente da regra 18, uma passagem de
  bastão e a execução `completed`; DADA uma execução gravada ENTÃO o modelo escolhe a real, e
  com `?demo` escolhe a demonstração e não troca. DADAS duas crews ENTÃO o modelo mostra a de
  `updatedAt` mais recente; com a escolha do usuário na outra, ela segue em exibição quando a
  primeira é atualizada; se a escolhida sair (regra 20), entra a mais recente.

**E1-06 — Página (contrato sobre os arquivos)**
- **E1-06a** nenhum arquivo de `escritorio/` contém `innerHTML`, `outerHTML`,
  `insertAdjacentHTML`, `document.write`, `fillText` nem `strokeText`; em `index.html`, toda tag
  `<script` tem `src` e não há atributo `on…=`.
- **E1-06b** nenhum arquivo de `escritorio/` cita `http://` ou `https://` nem tem imagem embutida
  (`data:image`); toda matriz de pixels tem linhas do mesmo tamanho e só usa chaves da própria
  paleta.
- **E1-06c** a página tem a lista de agentes e os textos de página da §6 em PT-BR, com acentos.
- **E1-06d** a frase de abertura da §6 está no HTML estático de `index.html`, fora de `<script>`.

**E1-07 — Pacote e documentos**
- **E1-07a** o pacote contém `scripts/estado.mjs`, `scripts/escritorio.mjs` e todos os arquivos
  de `escritorio/`; não contém a pasta `dashboard/`.
- **E1-07b** o README explica como abrir o escritório (`/opencrew dashboard`), mostra
  `escritorio/` na árvore de pastas instalada e diz, na seção dele: que roda só neste
  computador, sem internet e sem medição; que cada passo custa um comando curto a mais; e que a
  tela mostra o que a IA avisa, podendo atrasar.
- **E1-07c** toda referência a `_opencrew/core/escritorio/…` e aos dois scripts nos prompts existe.

**E1-upg — Quem já usa**
- **E1-upg-a** DADO um workspace 1.6.x QUANDO `update` ENTÃO existem os dois scripts e a pasta
  `escritorio/`, e `preferences.md` e as crews ficam iguais, byte a byte.
- **E1-upg-b** DADO esse workspace com `- **Dashboard:** enabled` e um `crews/x/state.json` da
  1.6.x QUANDO `update` e depois `GET /estado` ENTÃO a crew `x` vem na resposta.

## 8. Conferência à mão (o que o `verify` não cobre)
No `sandbox/`, com o navegador aberto no escritório:
1. Dirigir uma crew de 5 agentes com os seis eventos, um a um, e ver cada linha da tabela da
   regra 18 acontecer, inclusive o boneco indo até a mesa certa sem atravessar mesa e voltando a
   sentar.
2. Agente chamado `<b>Zé</b>`: o nome aparece com os sinais, como texto.
3. Apagar e corromper o `state.json` com a página aberta; derrubar e subir o servidor; abrir o
   `index.html` com duplo clique e ver a frase de abertura ficar na tela.
4. Janela pequena, grande e celular, com a escala do Windows em 100%, 125% e 150%: os pixels
   continuam quadrados e os nomes e o balão ficam sobre as mesas certas.
5. Uma execução real de crew com `Dashboard: enabled`, do início ao fim.
6. Uma crew de 12 agentes: conferir se a sala fica legível (ponto de atenção da pesquisa).
7. Depois de uma execução real, abrir com `?demo`: a demonstração roda e não troca sozinha.
8. Deixar a aba oculta por 10 minutos durante uma execução e voltar: o desenho mostra o estado
   atual, sem animação atrasada.
9. Rodar `/opencrew dashboard` em pelo menos três IDEs, uma delas sem segundo plano, e
   registrar o que acontece; rodar duas vezes e ver o mesmo endereço.

## 9. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código.
- [ ] `npm run verify` verde; os testes de dashboard em `tests/docs.test.js` e o F1-12a em
      `tests/runtime-contracts.test.js` são reescritos para o contrato novo (E1-03).
- [ ] Conferência da §8 feita e registrada aqui.
- [ ] No mesmo commit (regra 9 do AGENTS.md): README, CHANGELOG (inclui: com o escritório ligado,
      o estado final deixa de ser copiado para `crews/<crew>/output/<run>/state.json`),
      CONTRIBUTING, `AGENTS.md` (a regra 7 deixa de citar o dashboard entre o que não é coberto;
      fica "a aparência do escritório no navegador"), `GLOSSARIO.md`, `IDEIAS.md` (sai a entrada
      do dashboard), renumeração de versões da decisão 1 nas specs U3a e U3b, na auditoria e no
      STATUS.
- [ ] O passo `lint` de `scripts/verify.js` inclui `templates/_opencrew/core/escritorio/`, e
      `eslint.config.js` dá a essa pasta os nomes globais de navegador; `scripts/check-size.js`
      mede os `.js` dessa pasta (alvo 200).
- [ ] `npm version minor --no-git-tag-version`; release (commit + tag) só com confirmação do dono.

## 10. Fora desta fase
| Item | Alocação |
|---|---|
| Subagente, tarefa interna do agente, ciclo de revisão e resultado do verificador no desenho | → U4 — pede o `run-state.json`, que nasce lá |
| Histórico: rever uma execução antiga como replay | → U4 — mesma dependência |
| Sinal de reserva vindo do disco (data do arquivo mais novo de `output/<run>/`, linha em `runs.md`) | → U4 — nenhum projeto pesquisado mostra que funciona sozinho; `runs.md` também registra execução abortada |
| Arquivo entregue por agente na lista (caminho, botão copiar) | → sem fase — só depois que a U3a definir a entrega; o `passo` roda antes de o arquivo existir |
| Vários balões ao mesmo tempo (prioridade de colisão) | → U4 — só existe com subagentes em paralelo |
| Servidor que se destaca sozinho do terminal e fecha por inatividade | → sem fase — só se a conferência da §8 (item 9) mostrar IDE em que o segundo plano falha |
| Recarregar a aba sozinha depois de um `update`; teto de tamanho e de número de crews em `/estado` | → sem fase — com `no-store` um F5 basta; só com caso real |
| Piscar de olhos ou outro movimento no `idle` | → sem fase — a queixa nº 1 dos projetos parecidos é boneco que se mexe parado |
| Comando `opencrew dashboard` no CLI do npm | → sem fase — só com pedido real; a rota da IDE resolve |
| Personalizar sala, bonecos e cores; som | → sem fase — só com pedido real |
| Ler os hooks ou as transcrições das IDEs para animar sem a IA avisar | → sem fase — hooks existem em 8 das 9 IDEs, mas em 8 formatos e gravando na configuração do usuário; não conhecem passo nem agente |
| Dividir o runner em arquivos sob demanda | → U5 — já está em `IDEIAS.md` |

## 11. Limites conhecidos
- O escritório mostra o que o runner avisa. Se a IA pular um comando, o desenho atrasa até o
  evento seguinte; a regra 21 informa o tempo parado e, depois de 20 minutos, tira o agente da
  pose de digitar. Ela não distingue passo longo de sessão encerrada.
- Se a IA pular um `passo`, a passagem seguinte sai de quem estava ativo no arquivo, não de quem
  de fato entregou.
- A caminhada aparece quando o agente seguinte começa. Num checkpoint sem agente entre os dois,
  quem terminou segue na mesa até lá.
- Cada evento é uma chamada de terminal: em IDE que pede aprovação a cada comando, o usuário
  precisa liberar o `estado.mjs` uma vez.
- Duas chamadas de `/opencrew dashboard` no mesmo instante podem subir dois servidores, em
  portas diferentes; os dois funcionam. O servidor fecha com Ctrl+C ou com o fim do terminal.
- Duas execuções da mesma crew ao mesmo tempo gravam no mesmo `state.json`.
- Texto de `--rotulo`, `--mensagem` e `--motivo` passa pelo terminal e segue a lista da regra
  10: "R$ 50" aparece como "R 50". A regra mora no prompt: se a IA não a seguir, o shell pode
  cortar o texto ou executar um trecho antes de o script rodar, e o script não desfaz isso.
- Em aba de fundo o navegador espaça as consultas (no Chrome, até cerca de 1 por minuto); o
  título da aba chega com esse atraso.
- Execução abandonada num checkpoint mantém a faixa e o título "(!) Aguardando você" até o
  próximo `iniciar`.
- Em tela estreita (escala 1), nome e balão mostram cerca de 10 caracteres; o texto inteiro
  está na lista.
- "Rode uma crew e ela aparece aqui" só vale com `Dashboard: enabled`: quem sobe o
  `escritorio.mjs` à mão sem ligar a preferência não vê a execução.
- Mais de 12 agentes: os excedentes ficam só na lista (decisão 8).

## 12. Travas que esta spec deixa
`tests/estado.test.js` (E1-01) · `tests/estado-casca.test.js` (E1-02) ·
`tests/escritorio.test.js` (E1-04) · `tests/escritorio-modelo.test.js` (E1-05a a 05e, 05k a 05m)
· `tests/escritorio-animacao.test.js` (E1-05f a 05j) · `tests/escritorio-pagina.test.js` (E1-06)
· `tests/runtime-contracts-e1.test.js` (E1-03) · `tests/docs.test.js` (E1-03c, E1-07b) ·
`tests/package.test.js` (E1-07a) · `tests/template-refs.test.js` (E1-07c) ·
`tests/upgrade.test.js` (E1-upg) · alerta de tamanho: nenhum módulo de `scripts/` ou de
`escritorio/` acima de 200 linhas; nenhum teste novo acima de 300.
