# Spec — Fase U3a, fatia 2: Entrega no projeto — destino e ressalvas (1.9.0)

- **Fase:** U3a-2 · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/entregar.mjs`, `scripts/entrega/`, `scripts/verificar.mjs`, `scripts/verificar/`, `prompts/` (`entrega`, `export`, `discovery`), `runner.pipeline.md`) + `templates/gitignore` + CLI (`src/commands/update.js`, `src/lib/blocos.js`) + README + testes · **Status:** aprovada pelo dono (2026-10-07), com o corte do publicador; implementada; aguardando a execução real e o release
- **Termos novos no GLOSSARIO.md:** sim — Ressalva, Destino da entrega, Reentrega
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** o que sobrou de `specs/fase-u3a-entrega-por-canal.md` (a "spec grande") depois da fatia 1 (`specs/fase-u3a1-pasta-de-entrega.md`, 1.8.0), conferido contra o código da 1.8.0, mais quatro achados da execução real da 1.8.0. **Esta spec se basta:** regras e cenários estão escritos aqui, já corrigidos. Números de regra e IDs de cenário são os da spec grande; o que é novo ou reescrito leva `-f2`. São **41 cenários** (eram 53: o corte do publicador, de 2026-10-07, tirou 12 — §8).

**Decisões confirmadas pelo dono (2026-10-07):**
1. **Escopo:** entram a cópia para uma pasta do projeto, as ressalvas, o fim do PDF prometido e
   dois reparos do `update`. **Sai o publicador** (o publicador lendo a entrega e a publicação pela
   crew: §8). Fica para a **fatia 3** (sem versão; depois da U4) o que muda o que o verificador
   bloqueia (hashtags no fim, limites de imagem, seções de mais de um canal) e os arquivos citados
   nas fontes (§8).
2. **Uma pasta por execução:** `<destino>/<run_id>/` (nome aceito pelo dono). Canal que fica pronto
   depois entra na mesma pasta; se muda algo já copiado, a entrega vai para `<run_id>-reentrega-2`.
   Nada copiado é sobrescrito.
3. **A pergunta do destino é feita uma vez por crew**; a resposta (também o "não") fica no
   `crew.yaml`, com `.bak`.
4. **Canal que não está pronto não é copiado.** "Entregar assim mesmo" registra a ressalva, o canal
   vira "Pronto, com ressalva" e é copiado.
5. **Canal com ressalva é copiado como os prontos.** O que a crew faz ao publicar um canal assim
   saiu com o publicador (§8): os passos irreversíveis seguem como na 1.8.0.
6. (saiu com o corte do publicador — §8.)
7. **PDF e "posts formatados" deixam de ser prometidos e gerados** (desfaz uma promessa do README).
8. **Entrega avulsa (arquivos fora de uma execução) não entra:** vai para a U4, com o modo equipe
   (§8) — aceito pelo dono.
9. **`.gitignore` antigo com as 8 linhas soltas não é reescrito** (§8); entram o marcador órfão e o
   comentário do bloco.
10. **No relatório do verificador, `[PREENCHER]` passa de "Bloqueio" para "A preencher".** O que
    bloqueia não muda.

## 1. Objetivo
Desde a 1.8.0 a entrega nasce em `crews/<crew>/output/<run>/entrega/`, pasta descartável e fora do
git: quem quer usar ainda copia à mão. Depois desta fase a crew pergunta uma vez onde guardar e
copia a entrega para essa pasta do projeto, sem misturar execuções e sem sobrescrever nada. O que
não está pronto só é copiado se o usuário aceitar, e o aceite fica escrito. Chega a quem já usa só
com o `update`.

## 2. O que esta fase herda
Onde a spec grande e o código da 1.8.0 divergem, vale o código:

| Origem | Item | Exige daqui |
|---|---|---|
| 1.8.0 | Canal com pendência tem os arquivos gerados em `entrega/` e listados no LEIA-ME (na spec grande não tinha) | o LEIA-ME da cópia é gerado à parte, sem eles (§4) |
| 1.8.0 | `entrega.prompt.md` tem duas opções de `INCOMPLETA`; o teste U3a-08b proíbe citar `--aceitar-pendencias`, `--destino` e `--publicado` | três opções; o teste muda (U3a-08b-f2) e continua proibindo `--publicado` |
| 1.8.0 | `--run` é obrigatório; "recurso de editável" e "conjunto de imagens" não existem | continua assim |
| R3 | O caminho de cada saída vem de `caminho.mjs` | o passo antigo de `format: pdf` passa a esse script o caminho `.md` (regra 27) |
| R2 (1.6.3) | O `update` já renova o bloco do `.gitignore` e não toca no `.env.example` | da regra 30 sobram o marcador órfão e o comentário; U3a-12f é guarda |
| CLI | O stamp `_opencrew/.opencrew-version` existe desde a 1.0.0; sem ele, o `update` mostra "unknown" e atualiza; o `init` já conclui instalação parcial | regra 31: recusar é seguro para toda instalação que terminou |
| `image-creator` | O `SKILL.md` manda embutir imagem por caminho absoluto | o aviso de `file://` dispararia em todo carrossel: sai junto do conserto da skill (§8) |
| Execução real da 1.8.0 | Quatro achados | regras 22 (opção 1), 36 e 37; texto de `Atenção:` (§4) |

## 3. Entradas
```
node _opencrew/core/scripts/entregar.mjs --crew "crews/<crew>" --run "<id>" --arquivo "<lista>"
     [--destino "<pasta>"] [--lembrar-destino "<pasta>"|nao] [--aceitar-pendencias]
     [--vai-publicar <canal>] [--ajuda]
node _opencrew/core/scripts/verificar.mjs --crew "crews/<crew>" --arquivo "<lista>" [--relatorio "<caminho>"]
```
`--crew`, `--run`, `--arquivo`, `--vai-publicar` e `--ajuda` valem como na 1.8.0. Novas:

| Entrada | Validação |
|---|---|
| `--destino`: pasta que recebe a cópia, só nesta chamada | regra 13; vale sobre o `crew.yaml`; `nao` também vale aqui (a mesma função valida as três entradas) |
| `entrega.destino` no `crew.yaml` (`destino:` um nível abaixo de `entrega:`) | regra 13; aceita aspas e comentário no fim da linha; `nao`, `não` ou `no`, sem diferenciar maiúsculas = não copiar; `destino:` vazio = ninguém escolheu; lista = destino recusado (a mensagem mostra o primeiro item) |
| `--lembrar-destino`: pasta, ou `nao` | regra 13; grava no `crew.yaml` e já vale nesta chamada (vence as duas acima) |
| `--aceitar-pendencias` | — |
| `--relatorio` (verificador) | caminho dentro de `crews/<crew>/output/` (da crew de `--crew`), com nome `verificacao-*.md`, em pasta que existe; relatório que já existe é regravado |

## 4. Saídas
```
<destino>/<run_id>/                        a cópia; se preciso, <run_id>-reentrega-2, -3…
  LEIA-ME.md  +  as pastas dos canais prontos, outros/ e editaveis/
crews/<crew>/output/<run>/ressalvas.json   só se houve aceite
crews/<crew>/output/<run>/copia.json       o retrato do que foi copiado (ajuste da execução real)
crews/<crew>/output/<run>/verificacao-ciclo-N.md    gravado pelo verificar.mjs --relatorio
crews/<crew>/crew.yaml                     entrega.destino, só com --lembrar-destino (com .bak)
```
- Última linha do `entregar.mjs`: `ENTREGA:OK`, `ENTREGA:COM_RESSALVA` ou `ENTREGA:INCOMPLETA`.
  Código de saída como na 1.8.0 (0 sempre que a linha sai; 1 em erro de uso, sem escrever nada).
- O resumo da tela ganha, antes da linha do LEIA-ME, a linha `Cópia:` (§6). Com `destino: nao`, ela
  não aparece. O destino recusado e a gravação que falhou saem nesse mesmo lugar. A pendência nova
  e o `ressalvas.json` ilegível saem em `Avisos:`. Cada canal aparece com a situação dele (`-
  Instagram: Pronto, com ressalva`).
- Ordem das gravações: `crew.yaml` (com `--lembrar-destino`), `ressalvas.json`, a cópia e, por
  último, `entrega/` — assim o LEIA-ME de `entrega/` só cita a cópia que existe.
- `ressalvas.json`: `{ "ressalvas": [ { "arquivo", "item", "trecho" } ] }`. UTF-8, LF.
- `copia.json` (ajuste da execução real): `{ "copias": { "<pasta da cópia>": { "<canal>/<arquivo>":
  "<hash>" } } }` — por pasta de cópia (relativa ao projeto), o que o script copiou para ela. É
  gravado logo depois da cópia; é arquivo de serviço do script e não entra em entrega.
- Legenda sem marcador (ajuste da execução real): arquivo de `instagram-feed` que é só o texto (sem
  `=== CAPTION ===`, sem cabeçalho e sem linha "Slide N") sai como `instagram/legenda.txt`, com o
  texto inteiro limpo como as outras peças, o aviso da §6 em `Atenção:` e o alerta de tamanho da
  regra 34 valendo — como o leitor já faz com o post do LinkedIn e com o tweet. Com cabeçalho ou
  rótulo e nenhuma legenda, o arquivo segue inteiro, com o aviso da 1.8.0. O verificador não muda.

**LEIA-ME da entrega: o que muda.**
- `Situação:` é uma só: `Pronto` · `Pronto, com ressalva` · `Não está pronto`.
- `## Antes de usar` abre com "Entregue com ressalva:" e uma linha por ressalva (item, trecho e
  arquivo de origem), escrita como a pendência. Na de `[PREENCHER]`, a linha cita também os
  arquivos entregues daquela origem que contêm o trecho: termina em "— está em `linkedin/post.txt`".
- Canal `Pronto, com ressalva`: os passos começam por "Antes de postar, confira as ressalvas em
  "Antes de usar"."
- `Atenção:`, bloco que ficou fora: o aviso cita o arquivo de origem (achado 3). `## Sobre esta
  pasta`: com cópia feita, cita a pasta da cópia. Textos na §6.

**LEIA-ME da cópia.** O mesmo módulo o gera, com quatro diferenças: canal que não foi copiado traz
só `Situação:` e `Pendências:`; `## Outros arquivos` e `## Editáveis` listam só o que foi copiado;
`## Sobre esta pasta` traz o texto da cópia; e, na pasta que deixou de ser a mais nova, a primeira
linha é o aviso da pasta nova. Todo arquivo citado existe na cópia. Na pasta de reentrega, o título
diz qual é: `# Entrega — {crew} — {run} (reentrega {N})` (ajuste da execução real).

## 5. Regras
(Números da spec grande; 35 a 37 são novas. O que a 1.8.0 já faz não é repetido.)

**Destino e cópia**
13. **Destino válido:** caminho relativo, dentro do projeto mesmo depois de resolver atalhos,
    diferente da raiz e fora de `_opencrew/`, `crews/`, `skills/`, `.git/` e `node_modules/` (sem
    diferenciar maiúsculas). Absoluto é o que começa por `/`, `\` ou letra de unidade. Caminho que é
    arquivo é recusado; pasta que não existe é criada, e o resumo diz. Recusado: sem cópia, e o
    final é `ENTREGA:INCOMPLETA`. Uma função só valida as três entradas.
14. **Cópia.** Vai para `<destino>/<run_id>/` o que está pronto: ficam de fora o canal (ou
    `outros/`) com pendência não aceita e o HTML de `editaveis/` desse canal. Sem nada pronto,
    nenhuma pasta é criada. O script compara as pastas que copiaria agora com **o que foi copiado**
    para a pasta mais nova da execução (a de maior número) — o retrato dela em `copia.json`, e não
    o que está na pasta agora (ajuste da execução real): o que o usuário edita, apaga ou acrescenta
    na cópia nunca é sobrescrito nem gera reentrega. Sem retrato dessa pasta (cópia feita antes
    deste ajuste, ou `copia.json` ilegível), a comparação é com os arquivos da pasta, como abaixo,
    e o retrato passa a existir a partir dessa chamada. Arquivo novo cujo lugar na cópia já está
    ocupado por outro conteúdo conta como diferente.
    - *Igual* (mesmo conteúdo — texto sem contar CRLF/LF, o resto byte a byte — e nenhum arquivo a
      mais nessas pastas): nada é copiado. Texto é `.txt`, `.md`, `.html`, `.htm`, `.csv` e `.json`.
    - *Só acrescenta* (o que está lá continua igual e há arquivos novos, como um canal que ficou
      pronto depois): os novos entram na mesma pasta, sem sobrescrever.
    - *Diferente* (arquivo copiado mudou ou saiu, ou há arquivo a mais): a entrega inteira vai para
      `<run_id>-reentrega-2`, `-3`…, e o LEIA-ME das pastas anteriores ganha, uma vez, o aviso da §6
      na primeira linha (o aviso que já estava lá é trocado pelo da pasta mais nova).
    - Pasta de canal que está na cópia e não seria copiada agora (o canal voltou a "não está
      pronto") fica como está e não é comparada — o HTML dele em `editaveis/` também não. Arquivo
      do usuário na raiz da cópia nunca é tocado.
      **Nada é sobrescrito**, menos o `LEIA-ME.md` da cópia, que é do script: é regravado quando
      muda, sempre por último.
15. **Nada pela metade.** Pasta nova é montada em `<pasta>.tmp/`, ao lado, e renomeada no fim. Falha
    de escrita: mensagem com o arquivo, nenhuma pasta parcial nem temporária, `entrega/` continua
    válida e o final é `ENTREGA:INCOMPLETA`. Ao acrescentar, vale o que já entrou, e a chamada
    seguinte completa.
16. **O runner pergunta, o script grava.** Depois de qualquer entrega cujo resumo traz "nenhuma
    pasta escolhida" (`OK` e `COM_RESSALVA` também; numa `INCOMPLETA`, depois de resolvida — regra
    22) (ajuste da execução real), o runner faz a pergunta da §6 e repete a mesma chamada
    com `--lembrar-destino "<pasta>"` ou `--lembrar-destino nao`. O script grava `entrega.destino`
    sem mexer no resto do `crew.yaml`, com cópia `crew.yaml.bak` (se já existe,
    `crew.yaml.bak-<data-hora>`, como no `conferir-fontes.mjs`). `não` e `no` viram `nao`. Valor
    igual ao gravado: nada é regravado. Destino inválido: código 1, a mensagem do destino recusado
    (§6), `crew.yaml` intacto e nada escrito. A linha gravada é `destino: "<pasta>"` (com `/`), ou
    `destino: nao`. Essa resposta de código 1 — só a linha "Não copiei: …", sem linha `ENTREGA:` —
    é destino recusado, não "o script não rodou": o runner mostra a linha e pede outra pasta, ou
    "não" (ajuste da execução real). **Mudar depois** (ajuste da execução real): para trocar a
    pasta, parar de copiar ou voltar a copiar, o runner roda a entrega da última execução da crew
    com `--lembrar-destino "<pasta>"` (ou `nao`); nunca edita o `crew.yaml` à mão. A rota está na
    tabela de comandos do `templates/AGENTS.md`.

**Ressalvas**
18. **Ressalva.** Pendência é o que a 1.8.0 define. Com `--aceitar-pendencias`, o script regrava
    `ressalvas.json` com todas as pendências daquele momento. Chave: arquivo de origem + item do
    verificador + trecho (em bloqueio de medida, `medido/limite`: `2300/2200`). Nas entregas
    seguintes da execução, pendência igual a uma ressalva continua aceita, mesmo sem a opção; mudou
    um dos três, é pendência nova. A ressalva só vale enquanto a pendência existir sem interrupção
    (ajuste da execução real): a cada entrega o `ressalvas.json` é regravado só com as ressalvas
    que ainda correspondem a uma pendência atual (sem nenhuma, fica com a lista vazia); pendência
    que some e volta é pendência nova — `ENTREGA:INCOMPLETA` e a pergunta. Arquivo que não existe
    nunca vira ressalva; sem pendência e sem arquivo, nada é gravado. `ressalvas.json` ilegível
    vale como vazio, com aviso, e fica como está até um aceite novo.
    `ressalvas.json` é arquivo de serviço: não entra em entrega.
19. **Três finais.** `ENTREGA:OK`: nenhuma pendência. `ENTREGA:COM_RESSALVA`: toda pendência é
    ressalva. `ENTREGA:INCOMPLETA`: algum canal não está pronto, o destino foi recusado ou uma
    gravação falhou.
22. **O que o runner faz com cada final** (texto em `entrega.prompt.md`). `OK` e `COM_RESSALVA`:
    segue. `INCOMPLETA`: mostra o que falta e as três opções da §6. Os canais prontos já foram
    copiados por essa mesma chamada, antes de o usuário responder (ajuste da execução real).
    - **1, corrigir agora:** corrige no arquivo de origem que a pendência cita, no lugar (o mesmo
      arquivo, no mesmo caminho: sem pasta `vN` nova e sem cópia — ajuste da execução real), nunca
      dentro de `entrega/`; roda o `verificar.mjs` nesse arquivo; só então monta a entrega de novo,
      com a mesma lista (achado 2).
    - **2, entregar assim mesmo:** repete a chamada com `--aceitar-pendencias`. Não resolve arquivo
      que não existe, destino recusado nem falha de gravação: aí o runner mostra a mensagem e pede o
      arquivo, outra pasta ou nova tentativa.
    - **3, deixar para depois:** o canal fica como "Não está pronto" e não é copiado; os passos
      irreversíveis seguem como na 1.8.0, cada um com a sua confirmação. O resumo diz o que falta e
      que basta pedir a entrega desta execução quando o dado existir.
    - A primeira chamada vai sempre sem `--aceitar-pendencias`. Fora da opção 2, ela só é passada
      quando o usuário já escolheu "Aceitar assim mesmo" no laço de revisão e o que falta é só o que
      ele aceitou ali. No `runner.pipeline.md`, essa opção do laço passa a "Aceitar assim mesmo
      (fica registrado na entrega)".
37. **"Não tenho esse dado"** (nova; achado 1). Na aprovação final, se o usuário não tem o dado de
    um `[PREENCHER: …]`, o runner não insiste e não inventa: mantém o `[PREENCHER]`, diz a frase da
    §6 e segue. A entrega mostra a pendência e as três opções.

**Verificador e export**
35. **O relatório do ciclo é gravado pelo script** (nova). Com `--relatorio "<caminho>"`, o
    `verificar.mjs` grava nesse arquivo exatamente o que imprime. No laço de revisão, o runner passa
    `--relatorio "crews/{name}/output/{run_id}/verificacao-ciclo-{N}.md"` e deixa de copiar a saída
    à mão. Caminho fora da regra da §3: código 1, nada escrito. Falha de escrita: o relatório sai na
    tela, precedido do aviso da §6, com código 0.
36. **`[PREENCHER]` no relatório** (nova; achado 4). A linha passa de "❌ Bloqueio — Falta informação
    sua" para "✏️ A preencher — Falta informação sua", e o resumo o conta à parte: "**Resumo: 0
    bloqueios, 1 a preencher, …**" (só quando há). `verificar()` ganha o campo `aPreencher`;
    `nivel`, `bloqueios` e `status` não mudam, e a entrega continua tratando `[PREENCHER]` como
    pendência. Relatório sem `[PREENCHER]` sai igual ao de hoje, byte a byte. Na aprovação final, o
    runner mostra "{P} a preencher".
27. **Export.** O `export.prompt.md` perde `pdf` (método que não executa) e `formatted-post` (a
    entrega por canal o substitui); `csv` fica. No runner, só `csv` lê o `export.prompt.md`. Passo
    antigo com `format: pdf` ou `formatted-post`: aviso da §6, e roda como passo comum. No de `pdf`,
    o agente grava markdown no caminho do `outputFile` com a extensão `.md`; é esse o caminho que
    vai ao `caminho.mjs` e que vale como entrada dos passos seguintes: nenhum `.pdf` é criado. No
    mesmo commit: README e `discovery.prompt.md` (sai "PDF report").

**`update` (CLI) e regras do projeto**
30. **Bloco do `.gitignore`.** Ganha, na primeira linha, o comentário da §6. Marcador órfão (só `#
    opencrew:start` ou só `# opencrew:end`, sem bloco completo): nenhuma linha é apagada, o arquivo
    anterior vai para `.opencrew-backup/<data>/`, o bloco novo é anexado no fim e o resumo lista a
    cópia. Com um bloco completo e um marcador sobrando, o bloco completo é renovado, como hoje.
31. **Instalação interrompida.** `update` e `update --check` sobre `_opencrew/core` sem
    `_opencrew/.opencrew-version` não escrevem nada, não carimbam, saem com código 1 e mandam rodar
    o `init`.
33. **Regra 15 do AGENTS.md** (1.8.0) já cobre o destino declarado e o `crew.yaml` com `.bak`: só a
    linha da tabela Regra → Trava ganha os testes novos. Módulos novos de até 200 linhas, sem
    dependência, com APIs do Node 20.0. Tudo mora em `_opencrew/core/` e nas skills do catálogo:
    chega com um `update`.

## 6. Textos
As mensagens com `{n}` concordam em número. Nenhuma mostra caminho absoluto.

| Onde | Texto |
|---|---|
| Resumo, crew sem destino | "Cópia: nenhuma pasta escolhida para esta crew." |
| Resumo, cópia nova | "Cópia: {pasta}" (antes, se criou o destino: "Criei a pasta {destino}.") |
| Resumo, cópia igual | "Cópia: {pasta} — já está atualizada." |
| Resumo, só acrescentou | "Cópia: {pasta} — completei com {n} arquivos novos." |
| Resumo, pasta de reentrega (ajuste da execução real) | "Cópia: {pasta nova} — guardei aqui porque a entrega mudou. Os arquivos da anterior ficaram como estavam; só o LEIA-ME dela ganhou um aviso." |
| LEIA-ME da pasta de reentrega, título (ajuste da execução real) | "# Entrega — {crew} — {run} (reentrega {N})" |
| Legenda sem marcador, em `Atenção:` e no resumo (ajuste da execução real) | "Não encontrei a legenda marcada em {arquivo}: usei o texto inteiro. Confira antes de colar." |
| LEIA-ME, `## Para ter um PDF` (ajuste da execução real; troca o texto da 1.8.0) | "Abra o arquivo que você quer no navegador ou no editor de texto e use Imprimir → Salvar como PDF." |
| Resumo, nada pronto | "Cópia: nada foi copiado, porque nenhum canal está pronto." |
| Destino recusado | "Não copiei: o destino precisa ser uma pasta dentro do projeto, fora de `_opencrew/`, `crews/`, `skills/`, `.git/` e `node_modules/`. Recebi: {valor}." |
| Falha de escrita na cópia | "Não consegui gravar {arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo." |
| Pendência nova depois de uma ressalva | "Há pendência nova, que você ainda não aceitou: {item}." |
| `ressalvas.json` ilegível | "Não consegui ler {arquivo}. Segui sem ele." |
| LEIA-ME, `Atenção:`, bloco que ficou fora | "Ficou fora do texto para colar: {blocos}. Veja no arquivo de origem, `{arquivo}`." |
| LEIA-ME da pasta que deixou de ser a mais nova | "Há uma entrega mais nova desta execução em `{pasta}`." |
| LEIA-ME da entrega, `## Sobre esta pasta`, com cópia | "Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde. A cópia para guardar está em `{pasta}`." |
| LEIA-ME da cópia, `## Sobre esta pasta` | "Esta é a cópia da entrega da execução {run_id}. Ela não é refeita: pode editar e guardar. Se a entrega mudar, a versão nova vai para outra pasta, ao lado desta." |
| Runner, pergunta do destino | "Quer que eu copie o resultado para uma pasta do projeto? Se sim, diga qual (por exemplo, `Conteudo/Prontos`). Se não, não pergunto de novo." |
| Runner, `ENTREGA:INCOMPLETA` | "⚠️ A entrega ficou incompleta: {o que falta}" · "1. Corrigir agora (eu ajusto no arquivo de origem, verifico e monto a entrega de novo)" · "2. Entregar assim mesmo (fica registrado como ressalva no LEIA-ME)" · "3. Deixar para depois (o canal fica como "Não está pronto" e não é copiado)" |
| Runner, "não tenho esse dado" | "Sem problema: deixo [PREENCHER: {o que falta}] no texto. Na entrega você escolhe entre preencher depois e entregar assim mesmo, com ressalva." |
| Verificador, `--relatorio` inválido | "O relatório só pode ser gravado em crews/<crew>/output/, com nome verificacao-….md. Recebi: {valor}." |
| Verificador, relatório não gravado | "⚠️ Não consegui gravar o relatório em {caminho}." |
| Runner, passo antigo de `pdf` ou `formatted-post` | "O formato "{id}" não é mais gerado. O passo segue sem ele e grava o texto em markdown. Para ter um PDF, use Imprimir → Salvar como PDF." |
| `update`, instalação interrompida | "A instalação anterior não terminou. Rode `npx @aksp/opencrew init` para concluir." |
| Bloco do `.gitignore`, primeira linha | `# gerenciado pelo OpenCrew: suas linhas ficam fora deste bloco` |

## 7. Cenários
Sem QUANDO, a ação é rodar `entregar.mjs` (com um `--run` que existe), `verificar.mjs` (U3a-09)
ou `update` (U3a-12, 13c, upg). "(contrato)" lê o texto do arquivo
citado. Cada DADO…ENTÃO vira um teste, com o ID no nome. "Legenda de 2.300" = um `=instagram-feed`
com legenda de 2.300 caracteres (o limite é 2.200).

**Destino e cópia**
- **U3a-05c** DADO o destino `Conteudo/Prontos`, que não existe ENTÃO ele é criado, a cópia está em
  `Conteudo/Prontos/<run_id>/` e o resumo diz "Criei a pasta".
- **U3a-05d** DADAS duas execuções com o mesmo destino ENTÃO há duas subpastas, sem arquivo de uma
  na outra.
- **U3a-05e** DADA a mesma execução entregue de novo, sem mudança, ou só com CRLF no lugar de LF num
  `.txt` do destino ENTÃO nenhuma pasta é criada, nenhum arquivo do destino muda e o resumo diz "já
  está atualizada".
- **U3a-05f** DADA a mesma execução com a legenda alterada ENTÃO existe `<run_id>-reentrega-2/` com
  a entrega inteira, e em `<run_id>/` só o LEIA-ME muda (ganha o aviso na primeira linha); DADA mais
  uma chamada igual ENTÃO nada muda e o aviso não se repete.
- **U3a-05g-f2** DADA nova chamada com `--vai-publicar instagram`, sem outra mudança ENTÃO o LEIA-ME
  do destino é regravado e nenhuma pasta é criada.
- **U3a-05h** DADOS, um por vez, os destinos `C:/x`, `/x`, `\x`, `../fora`, `.`, `_opencrew/x`,
  `crews/x`, `Crews/x`, `skills/x`, `.git/x`, `node_modules/x`, um atalho que aponta para fora do
  projeto e um caminho que é arquivo ENTÃO não há cópia, nada é escrito fora do projeto, sai a
  mensagem do destino recusado, o final é `ENTREGA:INCOMPLETA` e `entrega/` existe.
- **U3a-05i** DADO `destino: "Conteúdo Pronto/Semana"` com um comentário no fim da linha ENTÃO o
  destino lido é `Conteúdo Pronto/Semana`; DADO `destino: nao` ou `destino: Não` ENTÃO não há cópia,
  nem linha `Cópia:`, nem pasta com esse nome; DADO `--destino` ENTÃO ele vence o `crew.yaml`; DADO
  `destino:` com uma lista ENTÃO vale como destino recusado; DADO um `crew.yaml` sem `entrega:`
  ENTÃO o resumo traz "nenhuma pasta escolhida" e o final não muda por isso.
- **U3a-05j** DADO que em `<destino>/` já existe um arquivo chamado `<run_id>` ENTÃO não fica pasta
  parcial nem temporária, esse arquivo continua igual, a mensagem cita o caminho e o final é
  `ENTREGA:INCOMPLETA`.
- **U3a-05k** DADO `--lembrar-destino Conteudo/Prontos` ENTÃO o `crew.yaml` tem `entrega.destino`,
  `crew.yaml.bak` é o arquivo anterior, as outras linhas não mudam e a cópia já foi feita; DADO um
  `crew.yaml.bak` que já existia ENTÃO ele continua igual e a cópia nova é
  `crew.yaml.bak-<data-hora>`; DADO `--lembrar-destino nao` ENTÃO fica `destino: nao`; DADA a mesma
  chamada outra vez ENTÃO nada é regravado; DADO `--lembrar-destino ../fora` ENTÃO código 1 e
  `crew.yaml` intacto.
- **U3a-05l-f2** (contrato) `entrega.prompt.md` faz a pergunta da §6 quando o resumo traz "nenhuma
  pasta escolhida", depois de resolvida a `INCOMPLETA`; manda repetir a mesma chamada com
  `--lembrar-destino`, também para o "não"; e não manda a IA editar o `crew.yaml`.
- **U3a-05m** DADO um `anotacoes.txt` posto pelo usuário em `<destino>/<run_id>/` e nova chamada sem
  mudança ENTÃO nenhuma pasta é criada e o arquivo continua lá; DADO um arquivo a mais dentro de
  `<destino>/<run_id>/instagram/` ENTÃO nada muda e o arquivo continua lá (ajuste da execução
  real); na cópia sem `copia.json`, a entrega vai para `<run_id>-reentrega-2/` e esse arquivo
  continua onde estava.
- **U3a-07a-f2** DADOS uma legenda de 2.300, um blog sem pendência e um destino ENTÃO o destino tem
  `blog/` e não tem `instagram/`; o LEIA-ME da cópia não cita arquivo de `instagram/` e traz a
  situação e as pendências do canal; o de `entrega/` continua citando `instagram/legenda.txt`; o
  final é `ENTREGA:INCOMPLETA`.
- **U3a-05o** DADA a U3a-07a-f2 e, depois, a mesma execução com a legenda corrigida ENTÃO
  `instagram/` está em `<destino>/<run_id>/`, os arquivos de `blog/` continuam iguais, byte a byte,
  o resumo diz "completei" e não existe pasta `-reentrega-`.
- **U3a-05p-f2** DADA uma cópia com `blog/` e `instagram/` e, depois, a mesma execução com um
  `[PREENCHER]` novo só no arquivo do Instagram ENTÃO nenhuma pasta é criada, `instagram/` da cópia
  continua igual, byte a byte, e o final é `ENTREGA:INCOMPLETA`.
- **U3a-04n-f2** DADOS `slide-01.html`, `slide-01.png` e uma legenda de 2.300, todos
  `=instagram-feed`, e um destino ENTÃO o destino não tem `instagram/` nem
  `editaveis/slide-01.html`, e o LEIA-ME da cópia não cita esse arquivo.

**Ressalvas**
- **U3a-07c** DADA a U3a-07a-f2 num workspace novo, com `--aceitar-pendencias` ENTÃO
  `ressalvas.json` tem o arquivo de origem, o item da legenda (com o nome que o relatório usa) e o
  trecho `2300/2200`; `instagram/` está em `<destino>/<run_id>/`; a situação do canal é "Pronto, com
  ressalva"; o LEIA-ME abre com a ressalva; o final é `ENTREGA:COM_RESSALVA`.
- **U3a-07d** DADA a U3a-07c e nova chamada sem a opção e sem mudança ENTÃO `ENTREGA:COM_RESSALVA` e
  `ressalvas.json` igual, byte a byte.
- **U3a-07e** DADA a U3a-07c e um `[PREENCHER]` novo no texto ENTÃO `ENTREGA:INCOMPLETA`, a mensagem
  de pendência nova, e `ressalvas.json` não muda; DADA a U3a-07c e a legenda passando de 2.300 para
  2.250 caracteres ENTÃO `ENTREGA:INCOMPLETA` e a ressalva antiga sai do `ressalvas.json` (ajuste
  da execução real).
- **U3a (real-2)** — os ajustes da execução real, em `tests/entregar-real2.test.js` e, os de
  contrato, em `tests/runtime-contracts-u3a2.test.js`: DADA uma pendência aceita, depois resolvida
  (`ENTREGA:OK`) e que volta ao texto ENTÃO `ENTREGA:INCOMPLETA`, sem "Entregue com ressalva"; DADAS
  duas ressalvas e uma resolvida ENTÃO só a outra fica no `ressalvas.json`; DADO um arquivo da cópia
  editado pelo usuário e nova entrega sem mudança ENTÃO "já está atualizada", nenhuma pasta nova e o
  arquivo editado intacto; DADA a cópia editada e a entrega mudando de fato ENTÃO `-reentrega-2`, e
  o arquivo editado continua como o usuário deixou; DADO um canal que ficou pronto depois ENTÃO ele
  entra na cópia editada ("completei") sem sobrescrever; DADA a cópia sem `copia.json`, ou com ele
  ilegível ENTÃO a comparação é com os arquivos; DADO `copia.json` na lista ENTÃO não entra (arquivo
  de serviço); DADO um arquivo de `instagram-feed` que é só o texto ENTÃO `instagram/legenda.txt`, o
  aviso, o alerta de tamanho quando passa do limite e o canal "Pronto"; DADA a reentrega ENTÃO a
  linha nova do resumo e o título "(reentrega N)"; DADA uma crew sem blog ENTÃO "Para ter um PDF"
  não cita o blog. Contrato: a pergunta do destino depois de qualquer entrega; os canais prontos já
  copiados; corrigir no lugar; "Não copiei: …" sem linha `ENTREGA:` é destino recusado; mudar o
  destino depois, com a rota no `templates/AGENTS.md`.
- **U3a-07j** DADA a U3a-07e (o `[PREENCHER]` novo) e nova chamada com `--aceitar-pendencias` ENTÃO
  `ressalvas.json` tem as duas pendências e o final é `ENTREGA:COM_RESSALVA`.
- **U3a-07h** DADOS um item da lista que não existe e `--aceitar-pendencias` ENTÃO
  `ENTREGA:INCOMPLETA` e nenhuma ressalva cita esse arquivo; DADA uma entrega sem pendência, com a
  opção ENTÃO `ENTREGA:OK` e não existe `ressalvas.json`.
- **U3a-07i** DADO um `ressalvas.json` ilegível ENTÃO ele vale como vazio e o resumo avisa.
- **U3a-07m** DADO `[PREENCHER: link do artigo]` num post de LinkedIn, com `--aceitar-pendencias`
  ENTÃO o LEIA-ME lista, em `## Antes de usar`, o trecho e `linkedin/post.txt`, e os passos do canal
  começam por "Antes de postar, confira as ressalvas".
- **U3a-01b-f2** DADO `ressalvas.json` na lista de `--arquivo` ENTÃO ele não entra e o resumo avisa
  que é arquivo de serviço.
- **U3a-08b-f2** (contrato) `entrega.prompt.md` traz as três opções da §6 e o que cada uma faz: na
  1, corrigir no arquivo de origem, nunca em `entrega/`, e rodar o `verificar.mjs` antes de entregar
  de novo; `--aceitar-pendencias` só na 2, ou quando o que falta é só o que foi aceito no laço de
  revisão; a 2 não resolve arquivo que não existe; na 3, o canal não é copiado. O prompt não cita
  `--publicado`. No `runner.pipeline.md`, a opção 2 do laço de revisão diz "Aceitar assim mesmo
  (fica registrado na entrega)".
- **U3a-08c-f2** (contrato) destino recusado ou falha de gravação: `entrega.prompt.md` manda mostrar
  a mensagem e pedir outra pasta ou nova tentativa.
- **U3a-08q-f2** (contrato; achado 1) na aprovação final, o `runner.pipeline.md` diz o que fazer
  quando o usuário não tem o dado de um `[PREENCHER]`: manter o `[PREENCHER]`, não inventar e dizer
  a frase da §6.

**Verificador e LEIA-ME**
- **U3a-09g-f2** DADO `--relatorio "crews/x/output/<run>/verificacao-ciclo-1.md"` ENTÃO o arquivo é
  igual, byte a byte, ao que o script imprimiu, e o código é 0; DADOS, um por vez, `--relatorio
  ../fora.md`, `--relatorio crews/x/crew.yaml` e `--relatorio crews/x/output/<run>/post.md` ENTÃO
  código 1, a mensagem da §6 e nada escrito; (contrato) o runner passa `--relatorio` no laço de
  revisão e não manda mais salvar a saída.
- **U3a-09h-f2** DADO um texto cujo único problema é `[PREENCHER: telefone]` ENTÃO o relatório traz
  "✏️ A preencher", o resumo diz "0 bloqueios, 1 a preencher", a última linha é
  `VERIFICACAO:AGUARDANDO_USUARIO` e `verificar()` devolve `aPreencher: 1`; DADO um texto sem
  `[PREENCHER]` ENTÃO o relatório é igual, byte a byte, ao da 1.8.0; DADA a entrega do primeiro
  texto ENTÃO o canal não está pronto, como hoje.
- **U3a-06e-f2** DADO um canal com dois arquivos de origem, um deles com `=== POST NOTES ===` ENTÃO
  o aviso de `Atenção:` cita esse arquivo de origem; DADA uma entrega com destino ENTÃO o LEIA-ME de
  `entrega/` cita a pasta da cópia em "Sobre esta pasta", o da cópia traz o texto da cópia, e todo
  arquivo que o LEIA-ME da cópia cita existe nela.

**Export e PDF**
- **U3a-10a** (contrato) `export.prompt.md` não cita `pdf`, `playwright open` nem `formatted-post`,
  e mantém `csv`.
- **U3a-10b** (contrato) no runner, só `csv` lê o `export.prompt.md`; há o aviso da §6 para passo
  antigo com `pdf` ou `formatted-post`; no de `pdf`, manda gravar em markdown no caminho do
  `outputFile` com a extensão `.md`, usar esse caminho no `caminho.mjs` e não criar `.pdf`.
- **U3a-10c** (contrato) `discovery.prompt.md` não oferece "PDF report"; o README não promete PDF
  nem posts formatados e descreve a cópia para a pasta do projeto.

**`update`** (arquivos antigos escritos literalmente no teste, nunca pelo `init` atual)
- **U3a-12g** DADO `_opencrew/core` sem o stamp de versão QUANDO `update` ou `update --check` ENTÃO
  código 1, nada escrito, a mensagem manda rodar o `init` e não aparece "unknown"; o `init` seguinte
  conclui, e o `update` depois dele roda.
- **U3a-12h-f2** `templates/gitignore` começa pelo comentário da §6; DADO um workspace 1.8.0 com
  linhas do usuário antes e depois do bloco QUANDO `update` ENTÃO o bloco tem o comentário, as
  linhas do usuário ficam iguais, byte a byte, e não há cópia de segurança.
- **U3a-12i-f2** DADO um `.gitignore` com `# opencrew:start`, três linhas do bloco, sem `#
  opencrew:end`, e depois `dist/` e `minha-pasta/` ENTÃO nenhuma linha some, há um bloco completo no
  fim, o arquivo anterior está em `.opencrew-backup/<data>/`, o resumo lista a cópia e o segundo
  `update` não muda nada; DADO um bloco completo e, depois dele, um `# opencrew:start` solto ENTÃO o
  bloco completo é renovado e nenhuma linha some.
- **U3a-12f** (guarda: já passa hoje) DADO um `.env.example` com ou sem bloco ENTÃO o `update` não o
  altera.
- **U3a-13c** (guarda: já passa hoje) DADO um workspace com `preferences.md` editado e um
  `crews/x/state.json` QUANDO `update` ENTÃO os dois ficam iguais, byte a byte.

**Regras e pacote**
- **U3a-08h-f2** DADO `--ajuda` ENTÃO o uso lista as três opções novas (`--destino`,
  `--lembrar-destino`, `--aceitar-pendencias`) e o código é 0; DADO `--publicado instagram` ENTÃO é
  opção desconhecida: código 1 e nada escrito.
- **U3a-14b-f2** DADO cada cenário de `tests/entregar*.test.js` ENTÃO, fora de
  `crews/<crew>/output/<run>/`, do destino e de `crew.yaml` + `.bak` (só com `--lembrar-destino`), a
  árvore do projeto é igual antes e depois, e não sobra pasta `.tmp`.
- **U3a-14c-f2** o pacote contém os módulos novos de `scripts/entrega/`; nenhum módulo de `scripts/`
  passa de 200 linhas.
- **U3a-upg-e-f2** DADO um workspace 1.8.0 escrito literalmente, com uma execução e a `entrega/`
  dela QUANDO `update` e, depois, o `entregar.mjs` instalado (executado de
  `<workspace>/_opencrew/core/scripts/`) com `--lembrar-destino Prontos` ENTÃO a cópia está em
  `Prontos/<run_id>/`, o `crew.yaml` tem o destino e o `.bak`, e nenhum outro arquivo de
  `crews/<crew>/` fora de `output/` mudou.

## 8. Fora desta fase
| Item (regras e cenários da spec grande) | Alocação |
|---|---|
| **Corte do publicador (dono, 2026-10-07).** O publicador do Instagram lendo `entrega/instagram/` (`SKILL.md` e `publish.js`: `--caption-file`, as `.jpg`, os três casos, o `--dry-run`, a quebra do fim da legenda); `--publicado`, `publicado.json` e a situação "Já publicado"; um "sim" por passo irreversível e os Gates 2b e 2c do `build.prompt.md`; a confirmação que repete as ressalvas e o canal com `[PREENCHER]` aceito que a crew não publica; o canal de um passo irreversível sem `format:` em `blotato` e `resend` (23, 24, 25 e o fim da 22; U3a-08e-f2, 08f, 08g, 08i, 08j, 08l, 08m, 08n-f2, 08o, 08p, upg-c, upg-d; de 05g, 07i, 08b-f2 e 08h-f2, só a parte de `--publicado` e da publicação) | → sem fase — nenhuma crew real do dono publica em rede social sozinha; volta com pedido real |
| Medir como será colado: legenda, post e tweet com as hashtags no fim; assunto, prévia, WhatsApp e cada tweet de thread no verificador (26; U3a-09a a 09f) | → U3a fatia 3 (sem versão; depois da U4) — muda o que bloqueia: texto que hoje passa pode parar, e pede a conferência do dono em cada rede. Até lá vale o alerta da regra 34 (1.8.0) |
| Limites de imagem; extensão × conteúdo; imagem ilegível (9, 10; U3a-04c a 04g, 04l, 04m, 04o) | → U3a fatia 3 — idem: bloqueio novo |
| Arquivo com seções de mais de um canal (5; U3a-03m, 03o, 03r, 03u, 07k, 07n, 07o) | → U3a fatia 3 — muda o leitor de peças e o que é medido; nas crews reais cada arquivo tem um formato só |
| Recurso de editável; aviso de HTML com `file://`; `image-creator` sem caminho absoluto; pendência de HTML editável (11; U3a-04i, 04j, 04p, 07p) | → U3a fatia 3 — o aviso dispararia em todo carrossel enquanto a skill mandar caminho absoluto, e mudar a skill pede teste de renderização real |
| Arquivos citados dentro das fontes (28, 29; U3a-11a a 11g) | → U3a fatia 3 — é conferência de fontes, não entrega: leitor novo, sete cenários, sem relação com a cópia |
| Entrega avulsa, sem `--run` (U3a-01d, 07l, 08k) | → U4 — modo equipe: é ele que cria a tarefa fora do pipeline. Aqui mudaria o contrato da 1.8.0 e, na cópia, cada entrega avulsa viraria "reentrega" da anterior |
| `.gitignore` sem marcador, com as 8 linhas soltas das versões 1.0.0 a 1.4.1 (30, caso b; U3a-12c, upg-b) | → sem fase — cosmético (linha repetida não muda o que o git ignora) e exige reescrever linha do usuário; quem atualizou desde a 1.6.3 já tem o bloco |
| Tema da execução no nome da pasta da cópia; estado da execução em disco; conserto de crews antigas | → U4 — como na spec grande (§11 de lá) |
| Tradução do LEIA-ME; aviso ao apagar a crew; poda de `output/` | → U5 — como na spec grande |

O que a spec grande já mandava para U3b, U4, U5 ou "sem fase" (§11 de lá) não muda.

## 9. Critérios de aceite
- [x] Cenários com teste de mesmo ID, vistos vermelhos antes do código — menos as guardas U3a-12f e
      13c, que já passam e ficam como trava de regressão. Os 41 cenários têm teste. Nasceram verdes,
      porque os scripts ficaram prontos antes do runner e do CLI: U3a-14c-f2 e a metade de
      U3a-upg-e-f2 que roda o script instalado (sem o `update`, ela falha: os módulos não existem
      num workspace 1.8.0).
- [x] `npm run verify` verde (2026-10-07, Windows, Node 24: 1102 testes). Mudam no mesmo commit, e
      só eles: o U3a-08b da 1.8.0 (vira 08b-f2); os
      testes que afirmam "Seguir assim" e o texto antigo de `Atenção:`
      (`tests/entregar-real.test.js`, `tests/entregar-leiame.test.js`); o R1-07b, na opção 2 (volta
      "fica registrado"); os de export em `tests/docs.test.js`; e os que afirmam "Bloqueio" para
      `[PREENCHER]`. Mudaram também, por consequência direta das regras 27 e 35: o R1-07a (o
      comando do verificador agora termina em `--relatorio`) e o R2-04d do `export.prompt.md` (o
      único comando com caminho de crew era o do PDF: a lista ficou vazia).
- [x] **Execução real**, por um agente no papel da IA da IDE, no `sandbox/`, seguindo o runner ao pé
      da letra, numa crew de três canais (Instagram com imagens, LinkedIn e blog). Conferir e
      registrar aqui: (1) a pergunta do destino aparece uma vez; o `crew.yaml` tem o destino e o
      `.bak`; a cópia está em `<destino>/<run_id>/`; (2) segunda execução, com um `[PREENCHER]` e a
      resposta "não tenho esse dado": `INCOMPLETA`, as três opções, "entregar assim mesmo",
      `COM_RESSALVA`, o canal na cópia e o LEIA-ME abrindo com a ressalva; a pergunta do destino não
      se repete; (3) entregar de novo sem mudar nada: nenhuma pasta nova; mudar a legenda:
      `-reentrega-2`; (4) `verificacao-ciclo-1.md` gravado pelo script; (5) um passo antigo com
      `format: pdf`: o aviso e um `.md`.
      Feita em 2026-10-07 (PowerShell, pasta temporária, crew de 4 agentes): a pergunta do destino saiu uma vez, a resposta ficou no `crew.yaml` com `.bak` e a cópia chegou à pasta do projeto; com `[PREENCHER]` e "não tenho esse dado", a entrega saiu incompleta, "entregar assim mesmo" gerou `ENTREGA:COM_RESSALVA` e o `ressalvas.json`; a reentrega foi para uma pasta nova sem sobrescrever; destino fora do projeto foi recusado; o relatório do ciclo foi gravado pelo script. Oito ajustes saíram dela (marcados "ajuste da execução real"), entre eles dois defeitos: ressalva antiga aceitava pendência nova, e editar a cópia gerava reentrega. Os ajustes só têm teste automático: não houve segunda execução real.
- [ ] O dono abre a pasta da cópia no projeto, lê o LEIA-ME e confere um canal com ressalva.
- [x] No mesmo commit (regra 9 do AGENTS.md; feito no working tree, o commit é do dono): README (entrega no projeto, árvore de pastas, fim do
      PDF e dos posts formatados), CHANGELOG 1.9.0 (com as mudanças de comportamento: PDF,
      `formatted-post`, "A preencher"), `GLOSSARIO.md`, `AGENTS.md`
      (linha da regra 15 na tabela), `IDEIAS.md` (saem os itens entregues; entram os da §8 que não
      têm entrada) e o status desta spec.
- [ ] `npm version minor --no-git-tag-version`; push do `main`, CI verde nas 4 células (Ubuntu e
      Windows, Node 20.17 e 22) e só então a tag `v1.9.0` — push e tag só com o "sim" do dono.

## 10. Limites conhecidos
- As regras 16, 22, 27 e 37 são seguidas pela IA: os testes garantem o texto; a execução real, o
  uso.
- A ressalva é presa ao arquivo de origem, ao item e ao trecho: se o texto for reescrito (pasta `vN`
  nova) ou o valor medido mudar, a pendência volta e pede novo aceite. O mesmo vale para a
  pendência que foi resolvida e voltou, e para o arquivo que saiu da lista numa entrega e voltou
  na seguinte: a ressalva dele saiu do `ressalvas.json`.
- A cópia nunca é atualizada no lugar: texto corrigido depois de copiado gera uma pasta
  `-reentrega-N`. Pasta de canal que voltou a "não está pronto" fica na cópia como estava.
- O que o usuário edita na cópia não chega à pasta de reentrega: ela leva a entrega nova, e a
  versão editada fica na pasta anterior. Se o usuário apagar um arquivo da cópia, o script não o
  repõe (o retrato diz que ele foi copiado). O retrato é por caminho de pasta: cópia movida ou
  renomeada à mão deixa de ser reconhecida.
- Nome de pasta de destino com caractere que não vai em comando (por exemplo, `&`) é recusado pelo
  prompt, pela regra do nome seguro, embora o script o aceitasse: o usuário precisa de uma pasta
  com nome simples (ajuste da execução real; sem código).
- A legenda sem marcador é o arquivo inteiro: se o arquivo trouxer mais do que a legenda (uma nota
  solta, por exemplo), ela vai junto — por isso o aviso "Confira antes de colar". O verificador
  continua dizendo "não medido" para esse arquivo; quem mede o tamanho é o alerta da regra 34.
- Legenda, post e tweet continuam medidos sem as hashtags no fim (só o alerta da regra 34); e-mail,
  WhatsApp, thread e imagens saem como "não medido" (→ fatia 3).
- O destino é uma pasta do projeto: se ela entra no git, é escolha do usuário. Em pasta sincronizada
  com a nuvem a escrita pode falhar: a mensagem pede nova tentativa.
- A pasta que o usuário responde à pergunta do destino entra num comando: vale a regra do nome
  seguro do runner (aspas duplas e só caracteres seguros); com outro caractere o comando não roda
  e a IA pede outra pasta, com a mesma frase que o runner usa para nome de arquivo.
- A cópia de segurança do marcador órfão (regra 30) vale para todo arquivo de bloco marcado, não só
  para o `.gitignore`: o escritor de blocos é um só (`src/lib/blocos.js`).
- O `build.prompt.md` não citava PDF nem "post formatado": não mudou.
- Quem pulou da 1.4.1 direto para cá fica com linhas repetidas no `.gitignore` (§8). O runner não
  deve crescer mais de 10 linhas: o detalhe mora em `entrega.prompt.md` (→ U5).

## 11. Travas que esta spec deixa
`tests/entregar-destino.test.js` (U3a-05c, 05d, 05h a 05k) · `tests/entregar-copia.test.js`
(U3a-05e a 05g-f2, 05m, 05o, 05p-f2, 04n-f2, 07a-f2) · `tests/entregar-ressalvas.test.js` (U3a-07c
a 07m, 01b-f2, 08h-f2) · `tests/entregar-leiame-copia.test.js` (U3a-06e-f2) · `tests/_entrega.js`
(U3a-14b-f2, em toda chamada) · `tests/verificar-relatorio.test.js` (U3a-09g-f2, 09h-f2) ·
`tests/runtime-contracts-u3a2.test.js` (U3a-05l-f2, 08b-f2, 08c-f2, 08q-f2, 10a, 10b, e o lado do
runner de 09g-f2 e 09h-f2; trava também o tamanho do runner: até 874 linhas) ·
`tests/docs.test.js` (U3a-10c) · `tests/update-u3a2.test.js` (U3a-12f a 12i-f2, 13c) ·
`tests/upgrade-u3a2.test.js` (U3a-upg-e-f2) · `tests/package.test.js` (U3a-14c-f2) ·
`tests/template-refs.test.js` (as referências dos prompts existem) · `tests/entregar-real2.test.js`
(U3a (real-2): os ajustes da execução real) · alerta de tamanho: nenhum
módulo de `scripts/` acima de 200 linhas; nenhum teste novo acima de 300.
