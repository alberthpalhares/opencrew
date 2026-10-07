# Spec — Fase U3a, fatia 1: Pasta de entrega (1.8.0)

- **Fase:** U3a-1 · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/entregar.mjs`, `scripts/entrega/`, `scripts/verificar/`, `prompts/entrega.prompt.md`, `runner.pipeline.md`; `templates/AGENTS.md`) + `AGENTS.md` + README + testes. O CLI (`src/`) não muda · **Status:** aprovada pelo dono (2026-10-07); implementada; aguardando a execução real e o release
- **Termos novos no GLOSSARIO.md:** sim — Entrega, Canal, Peça (amplia o termo da R1), Bloco de serviço, Pendência, Editáveis
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u3a-entrega-por-canal.md` (a "spec grande", não aprovada), relida contra o código da 1.7.1 e dividida em duas fatias; esta é a primeira. **Os números de regra e os IDs de cenário são os da spec grande**, para as duas fatias somarem a original. O que é novo ou reescrito aqui leva `-f1` ou uma nota.

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **Os passos de cada canal no LEIA-ME** são os do quadro "Passos por canal" (§4), como estão na
   spec grande. Ajusta-se depois, com a conferência em cada rede.
2. **Canal com pendência: os arquivos são gerados e marcados "Não está pronto"**, com as
   pendências em "Antes de usar"; o final é `ENTREGA:INCOMPLETA`. O aceite registrado ("entregar
   assim mesmo") fica para a fatia 2.
3. **Crew que publica sozinha:** na 1.8.0 o publicador continua usando o `caption.txt`, como hoje.
   O LEIA-ME só avisa que a crew publica aquele canal.
4. **Cada arquivo vai para o canal do seu formato.** Arquivo com seções de mais de um canal fica
   para a fatia 2: nas crews reais cada arquivo de conteúdo tem um formato só.
5. **Formato sem canal conhecido** (como `google-business-post`) **ou arquivo sem formato**
   (proposta, minuta, relatório): vai inteiro para `outros/`, com o nome original, e o LEIA-ME o
   lista. É a regra que a spec grande já tinha.
6. **`entrega/` é refeita do zero a cada entrega**: o que for editado ali se perde; o LEIA-ME avisa.
7. **"Uma pasta de versão por ciclo de revisão"** (R3, §8): não adotado. Continua uma por passo.
8. **Roteiro:** a fatia 2 é a 1.9.0 (destino e cópia, ressalvas e publicação, medir como será
   colado, export e PDF, arquivos citados nas fontes, resto do `update`); a U3b passa a 1.10.0 e a
   U4 a 1.11.0. Os documentos são renumerados no commit desta fase.

## 1. Objetivo
Hoje, depois de aprovar, o usuário recebe uma pasta de execução com `v1`, `v2`, relatórios e
textos cheios de `#`, `**` e rótulos. Depois desta fase ele encontra `entrega/`: uma pasta por
canal, texto pronto para colar e um LEIA-ME que diz o que fazer com cada arquivo. O que não está
pronto fica marcado. Funciona em crews que já existem, só com o `update`.

## 2. O que esta fase herda
Onde a spec grande e o código de hoje divergem, vale o código:

| Origem | Item | Exige daqui |
|---|---|---|
| E1 | O `state.json` mora em `crews/<crew>/`, não mais na pasta da execução | sai da regra 1 e do U3a-01b |
| R3 | O caminho de cada saída vem de `caminho.mjs`; o runner guarda o que `saida` devolveu | regra 2 reescrita (U3a-01e-f1) |
| R3, §8 | "Save final output" não diz qual arquivo é o final | sai do runner (U3a-08a) |
| R2 e R3 | Nome seguro nos comandos; script que não rodou: avisa e segue | U3a-08a, 08c |
| `verificar.mjs` | `verificar()` não tem como desligar o padrão `blog-post` do item sem formato | parâmetro opcional novo (regra 17, U3a-02d) |
| `verificar/pecas.mjs` | `lerPecas` só lê rótulos de blog, `instagram-feed`, `linkedin-post` e `twitter-post`; devolve também peça de outro canal | módulo novo (regra 4); peça de outro canal não vira arquivo (U3a-03m-f1) |
| `IDEIAS.md` (aceite da R3) | O título H1 do arquivo (`# Legenda — …`) é lido como legenda | conserto no leitor (U3a-03w) |
| Runner | Tem 865 linhas, para um alvo de 400 | seção `### Entrega` curta; o detalhe mora em `entrega.prompt.md` |
| `instagram-publisher` | Lê `crews/<crew>/output/<run>/caption.txt` | não muda (decisão 3) |
| Fora daqui | Ver §8 | — |

## 3. Entradas
```
node _opencrew/core/scripts/entregar.mjs --crew "crews/<crew>" --run "<id>" --arquivo "<lista>"
     [--vai-publicar <canal>] [--ajuda]
```
| Entrada | Obrigatória | Validação |
|---|---|---|
| pasta atual do comando (raiz do projeto) | sim | contém `_opencrew/` |
| `--crew`: pasta `crews/<nome>` | sim | dentro do projeto, existente e com `crew.yaml` |
| `--run`: nome da pasta da execução | sim | um segmento só (sem `/`, `\` ou `..`); `crews/<crew>/output/<run>/` existe |
| `--arquivo`: lista separada por vírgula, `caminho=formato` (a sintaxe do verificador) | sim | todo item dentro do projeto; ao menos um existe; `=formato` é opcional |
| `--vai-publicar <canal>`, pode repetir | não | o canal existe nesta entrega |
| `--ajuda` | não | só imprime o uso |

## 4. Saídas
```
crews/<crew>/output/<run>/entrega/
  LEIA-ME.md
  instagram/  linkedin/  blog/  email/  whatsapp/  twitter/  youtube/     só os canais presentes
  outros/  editaveis/                                                      só se tiverem arquivo
```
- Ao lado de `entrega/`: `verificacao-entrega.md`. Na tela: resumo em PT-BR (pasta da entrega,
  situação de cada canal, o que falta, caminho do LEIA-ME); é o resumo final da execução.
- Última linha: `ENTREGA:OK` ou `ENTREGA:INCOMPLETA`. Código de saída 0 sempre que essa linha sai
  (e em `--ajuda`); 1 em erro de uso ou em erro inesperado que impeça a entrega inteira ("Não
  consegui montar a entrega: {motivo}"), sem linha `ENTREGA:` e sem escrever nada.

**Formato → pasta → arquivos.** "Leitor" = `lerPecas`, que já existe; "novo" = módulo desta fase.

| Formato | Pasta | Arquivo gerado ← onde a peça é achada |
|---|---|---|
| `instagram-feed` | `instagram/` | `legenda.txt`, com as hashtags no fim ← leitor · imagens (`.png`, `.jpg`, `.jpeg`) com o nome original · slides em texto: com imagem do formato na lista, não viram arquivo; sem imagem, o arquivo de origem vai inteiro, com o nome original |
| `linkedin-post` | `linkedin/` | `post.txt`, com as hashtags no fim ← leitor · `post-comentario.txt` ← novo: seção com "comentário" ou "comment" no cabeçalho, depois de um post; sai do texto do post |
| `twitter-post`, `twitter-thread` | `twitter/` | `tweet.txt` ou `tweet-N.txt` ← leitor · na thread ← novo: cada bloco iniciado por `TWEET n/N`; sem esses blocos, como no `twitter-post` |
| `blog-post`, `blog-seo` | `blog/` | `seo.txt`: título e meta description ← leitor; palavra-chave ← novo: frontmatter `palavra_chave` ou `keyword`, ou, em `=== TARGET KEYWORD ===`, o texto depois de `Primary:` até a barra vertical ou o fim da linha; slug ← frontmatter `slug` · `artigo.md` ← novo: o resto do arquivo, sem título (`TITLE`, `TITLE TAG`), meta description, `TARGET KEYWORD` nem bloco de serviço |
| `email-newsletter`, `email-sales` | `email/` | ← novo. `assunto.txt`: `=== SUBJECT LINE ===` ou cabeçalho com "assunto" ou "subject" (cada assunto abre um e-mail) · `previa.txt`: `=== PREVIEW TEXT ===` ou cabeçalho com "prévia" ou "preview" · `corpo.md`: o resto do e-mail, até o próximo assunto, sem bloco de serviço |
| `whatsapp-broadcast` | `whatsapp/` | `mensagem.txt` ← novo: corpo do arquivo, sem linhas de rótulo e sem blocos de serviço |
| `instagram-reels`, `instagram-stories`, `linkedin-article`, `youtube-script`, `youtube-shorts`, outro formato com plataforma conhecida | pasta da plataforma | nome original ← corpo do arquivo (roteiro ou artigo); as linhas de rótulo ficam |
| sem formato, sem best-practice, sem `platform:` ou plataforma desconhecida | `outros/` | cópia como está |

**`seo.txt`**: uma linha por campo, nesta ordem, só os que existem: `Título: …`,
`Meta description: …`, `Palavra-chave: …`, `Slug: …`.

**LEIA-ME.md.** Primeira linha: título com a crew e o `run_id`. Depois, títulos fixos, nesta
ordem; seção sem conteúdo não aparece:
- `## Antes de usar`: os alertas da regra 34; o que falta preencher, com o trecho e o arquivo de
  origem; os canais que não estão prontos, com o motivo.
- um `## {Canal}` por canal presente (Instagram, LinkedIn, Blog, E-mail, WhatsApp, X/Twitter,
  YouTube), nesta ordem: a frase da regra 24, se for o caso; `Situação:` (`Pronto` ou `Não está
  pronto`); `Arquivos:`, cada um com o arquivo de origem; `Pendências:`; `Atenção:`; `Passos:`
  (quadro abaixo). Com várias peças, cada arquivo numerado aparece com o título do bloco de origem
  (o cabeçalho logo acima do da peça), quando houver. Em canal `Não está pronto`, os passos
  continuam aparecendo, junto da situação e das pendências do canal, e começam por um passo a
  mais, antes dos do quadro: "Antes de postar, resolva o que está em Pendências. Corrija no
  arquivo de origem e peça para montar a entrega de novo: o que você mudar nesta pasta se perde."
  (ajuste da execução real: sem ele, quem seguia os passos publicava o `[PREENCHER: …]`).
  **Como ficou no código:** os avisos da §6 sobre um arquivo (arquivo inteiro sem peça
  reconhecida, seção de outro canal, nome repetido, bloco que ficou fora) aparecem em `Atenção:`,
  dentro da seção do canal (ou de `## Outros arquivos`) a que o arquivo pertence, e também no
  resumo da tela, em "Avisos:"; não vão para "Antes de usar", que fica só com os alertas da regra
  34 e com o que falta.
  **Bloco que ficou fora (ajuste da execução real):** quando o arquivo de origem tem um bloco de
  rótulo com texto que não vira peça nem entra no texto para colar — bloco de serviço (`POST
  NOTES`, `FORMAT`…) ou, nos formatos de legenda, post e tweet, rótulo que não é a peça do formato
  (`SLIDES`) —, `Atenção:` traz um aviso por arquivo, com os rótulos na ordem do arquivo (texto na
  §6). O que é entregue não muda. Sem aviso quando o arquivo de origem vai inteiro para a entrega.
- `## Outros arquivos` e `## Editáveis`, cada arquivo com a origem. Em `## Outros arquivos`, a
  linha de cada arquivo termina com " — sem canal de publicação; está aqui para você usar como
  quiser." (ajuste da execução real: o aviso de formato sem canal saía duas vezes; agora o
  LEIA-ME diz uma vez só, na linha do arquivo, e a frase da §6 fica no resumo da tela).
- `## O que não foi conferido` (regra 20).
- `## Para ter um PDF`: "Abra o arquivo que você quer (por exemplo, o artigo do blog) no navegador
  ou no editor de texto e use Imprimir → Salvar como PDF." (ajuste da execução real) Só quando a
  entrega tem arquivo `.md`.
- `## Sobre esta pasta`: o texto da §6.

Arquivo da entrega é citado com caminho relativo à pasta do LEIA-ME (`instagram/legenda.txt`);
arquivo de origem, com caminho relativo ao projeto. Só cita o que existe; nenhum caminho absoluto.

**Passos por canal** (texto literal; o módulo do LEIA-ME guarda o quadro como dado). Cada passo só
aparece quando o arquivo que ele cita existe na entrega; os que aparecem são numerados em
sequência. `{arquivo}` é o nome do arquivo entregue; com várias peças, o passo cita os arquivos
numerados (`post-1.txt`, `post-2.txt`…). "A linha do markdown" é: "Este texto está em markdown: se
o seu editor não aceitar, ajuste títulos, negrito e links depois de colar." `{campos}` são os
campos que o `seo.txt` daquela entrega tem, na ordem das linhas — com título e meta description
só, "(título, meta description)" (ajuste da execução real: o passo prometia os quatro sempre).

| Canal | Passos, na ordem (entre colchetes, o arquivo que faz o passo aparecer) |
|---|---|
| Instagram | "No computador, abra instagram.com e comece uma publicação nova. Pelo celular, mande os arquivos para ele antes." · [imagens] "Escolha as imagens na ordem dos nomes dos arquivos." · [`legenda.txt`] "Abra `instagram/legenda.txt`, copie tudo e cole no campo da legenda. As hashtags já estão no fim." · "Confira a prévia e publique." · [roteiro ou carrossel em texto] "`instagram/{arquivo}` é para ler e produzir (gravar ou montar os slides): não é texto para colar." |
| LinkedIn | "No computador, abra linkedin.com e comece uma publicação." · [`post.txt`] "Abra `linkedin/post.txt`, copie tudo e cole." · [imagens] "Anexe as imagens na ordem dos nomes dos arquivos." · "Confira e publique." · [`post-comentario.txt`] "Depois de publicar, abra `linkedin/post-comentario.txt`, copie e cole como primeiro comentário." · [artigo] "Para o artigo, escolha escrever um artigo no LinkedIn e cole o texto de `linkedin/{arquivo}`, seção por seção." |
| Blog | "Abra o editor do seu blog e crie um post novo." · [`seo.txt`] "Abra `blog/seo.txt` e copie cada linha para o campo de mesmo nome ({campos})." · [`artigo.md`] "Abra `blog/artigo.md`, copie tudo e cole no corpo do post." · a linha do markdown · "Confira a prévia e publique." |
| E-mail | "Abra a sua ferramenta de e-mail e crie uma mensagem nova." · [`assunto.txt`] "Copie o texto de `email/assunto.txt` para o campo do assunto." · [`previa.txt`] "Copie o texto de `email/previa.txt` para o campo de prévia (a linha que aparece ao lado do assunto)." · [`corpo.md`] "Abra `email/corpo.md`, copie tudo e cole no corpo." · a linha do markdown · "Envie um teste para você antes de enviar para a lista." |
| WhatsApp | "No computador, abra o WhatsApp Web ou o aplicativo. Pelo celular, mande o arquivo para ele antes." · "Abra `whatsapp/mensagem.txt`, copie tudo e cole na conversa ou na lista de transmissão." · "Se o texto tiver `{{…}}`, troque pelo dado real, ou confira se a sua ferramenta de envio faz a troca." · "Envie primeiro para você, para ver como ficou." |
| X/Twitter | "No computador, abra x.com e comece uma publicação." · [`tweet.txt`] "Abra `twitter/tweet.txt`, copie tudo e cole." · [`tweet-N.txt`] "Para a sequência, cole `twitter/tweet-1.txt`, acrescente outra publicação e cole o arquivo seguinte, na ordem dos números." · [imagens] "Anexe as imagens." · "Confira e publique." |
| YouTube | [roteiro] "`youtube/{arquivo}` é o roteiro para gravar: não é texto para colar." |

## 5. Regras
(Números da spec grande; os que faltam estão na fatia 2. A regra 34 é nova.)

**O que entra e para onde vai**
1. **O script não julga aprovação.** Entra o que vier em `--arquivo` (imagens e HTML também) e
   existir. Nunca entra, mesmo listado: `verificacao-*.md`, `publicado.json`, o que estiver em
   `entrega/`, `entrega.tmp/` ou `export/`, e o `caption.txt` direto na pasta da execução (onde o
   publicador o grava). Dentro de uma pasta `vN`, `caption.txt` é saída de passo e entra.
2. **Quem monta a lista é o runner, com os caminhos que ele já tem** (instrução em
   `entrega.prompt.md`): para cada passo de criação ou de renderização da execução aprovada, os
   caminhos que `caminho.mjs saida` devolveu na última vez em que o passo rodou, com o `format:`
   do passo (passo de renderização sem `format:` usa o do passo de conteúdo que ele renderiza). O
   runner não procura pasta `vN` por conta própria. Ficam de fora pesquisa, briefing, parecer do
   revisor, resposta de checkpoint e passo pulado. Em execução já encerrada, a IA roda
   `caminho.mjs entrada` para o `outputFile` de cada passo, mostra a lista e pede o "sim".
3. **Canal = `platform:` do best-practice do formato**: o de
   `_opencrew/best-practices.local/{formato}.md`, quando o arquivo declara `platform:`; senão, o
   do core. Sete pastas (`instagram`, `linkedin`, `blog`, `email`, `whatsapp`, `twitter`,
   `youtube`); o resto vai para `outros/`. Nada é exigido nem editado em `crews/`.
4. **Peças.** Legenda, hashtags, post, tweet, título e meta description vêm de `lerPecas`, com o
   formato do item; só as peças desse formato viram arquivo (decisão 4). As outras peças da §4
   vêm de um módulo novo, em `scripts/entrega/`, que reaproveita as funções de seção do
   verificador. Só `.md` e `.txt` têm procura de peças. **Conserto no leitor:** cabeçalho de
   nível 1 sob o qual existe outro cabeçalho candidato à mesma peça é o título do arquivo e não
   abre peça.
6, 7 e 8. **Texto para colar, peças numeradas e "nada some"** valem como estão na spec grande
   (§5 de lá), inteiras. Em resumo: no `.txt` saem os rótulos, a linha de cabeçalho da peça,
   negrito, itálico, a linha `---` e os `#`; link vira `texto: url`; lista e citação ficam; as
   hashtags vão no fim; bloco de serviço (`NOTES`, `NOTE`, `CHECKLIST`, `FORMAT`, comentário HTML)
   nunca vai para arquivo de canal; tudo em UTF-8 sem BOM, com LF. Peças do mesmo tipo no mesmo
   canal são numeradas (`post-1.txt`, `post-2.txt`). Arquivo sem peça reconhecida vai inteiro,
   com aviso; nome repetido ganha o prefixo `2-`, `3-`; nada é gravado por cima, e tudo o que
   foi entregue aparece no LEIA-ME, com a origem.
9. **Imagem é copiada com o nome original e os mesmos bytes** para a pasta do canal do seu
   formato. O script não abre a imagem e não renumera: slide que falta aparece como buraco.
11. **Editáveis.** HTML que tem na lista uma imagem de mesmo nome (`slide-01.html` e
    `slide-01.png`) vai para `editaveis/`, sem subpasta.
12. **`entrega/` é refeita do zero a cada chamada**: montada em `entrega.tmp/`, ao lado, e trocada
    no fim. O script só apaga a própria `entrega/` e o temporário dele.
15. **Nada pela metade, saída determinística.** Falha de escrita (pasta de nuvem, arquivo aberto,
    sem permissão): mensagem em PT-BR com o arquivo, nenhuma pasta parcial nem temporária, a
    entrega anterior fica como estava e o final é `ENTREGA:INCOMPLETA`. As mesmas entradas geram
    os mesmos bytes: o LEIA-ME não tem hora.

**Pendências**
17. **Verificação na origem.** Antes de separar, o script importa o verificador
    (`verificar({ raiz, crew, arquivos })`) e o roda nos arquivos de origem, cada um com o seu
    formato. O que ele mede não muda, com uma exceção, só na entrega: item sem `=formato` não tem
    o `title:` do frontmatter medido como blog (parâmetro opcional novo; sem ele, tudo igual).
    Bloqueio, `[PREENCHER]` ou item da lista que não existe é **pendência** do canal do formato do
    arquivo (sem canal: `outros`). Canal com pendência aparece como "Não está pronto"; os arquivos
    dele são gerados mesmo assim (decisão 2).
19. **Dois finais.** `ENTREGA:OK`: nenhuma pendência. `ENTREGA:INCOMPLETA`: algum canal não está
    pronto ou a gravação falhou.
20. **O que não foi conferido** vai para o LEIA-ME e não muda o final: alertas, itens "não medido"
    e "não verificado", e a lista fixa (links e fatos; texto dentro das imagens; aparência final
    em cada rede). O relatório do verificador é gravado pelo script, em `verificacao-entrega.md`.
34. **Alerta de tamanho do texto entregue** (nova; atenua o risco até a fatia 2). O script conta
    os caracteres de cada `legenda*.txt`, `post*.txt` (não o comentário) e `tweet*.txt` gerado,
    como o verificador conta (emoji vale 1; a quebra de linha do fim não conta), e compara com
    `caption_max_chars`, `post_max_chars` ou `tweet_max_chars` do formato do item. Passou: um
    ALERTA em "Antes de usar" — só quando o verificador não bloqueou o tamanho dessa mesma peça
    na origem: nunca dois avisos para a mesma peça. Não é pendência e não muda o final.

**Runner e projeto**
21. **Onde mora o texto e quando a entrega roda.** As instruções ficam em
    `_opencrew/core/prompts/entrega.prompt.md`. O `runner.pipeline.md` ganha a seção
    `### Entrega`, só com a chamada e o momento (até 15 linhas), e perde o passo "Save final
    output" e as linhas "Run folder" e "Output saved to"; o menu final continua.
    - **Momento:** depois da aprovação final, imediatamente antes do primeiro passo que publica ou
      envia (`side_effects: irreversible`, no passo ou na skill do agente); sem passo desses,
      depois do último passo. Sempre antes do `concluir` do Escritório. Se o passo irreversível
      vem antes da aprovação final (crew anterior à 1.4.2), a entrega roda no fim.
    - Crew sem aprovação final: mesmos momentos, com o aviso da §6. Execução rejeitada, abortada
      antes da aprovação ou sem arquivo aprovado não tem entrega.
    - A saída do script é o resumo final; se a execução parar depois, num passo irreversível, o
      runner a mostra antes de parar. Comandos pela regra do nome seguro (R2): tudo entre aspas.
    - O `system.md` (`templates/AGENTS.md`) ganha uma linha na tabela de comandos: pedido para
      entregar uma execução já encerrada → ler `_opencrew/core/prompts/entrega.prompt.md`.
22. **O que o runner faz com cada final.** `OK`: segue. `INCOMPLETA`: mostra o que falta e as duas
    opções da §6. Opção 1: volta ao texto (ou tenta gravar de novo) e roda a entrega outra vez.
    Opção 2: segue; cada passo irreversível continua pedindo a sua confirmação, como hoje. Depois
    de "editar este conteúdo", a entrega roda de novo. Script que não rodou (sem Node, erro, sem
    linha `ENTREGA:`): aviso da §6, lista dos arquivos aprovados, e a execução continua.
24. **Canal que a crew publica sozinha.** O runner passa `--vai-publicar <canal>` para cada canal
    da lista que tem passo irreversível no pipeline. O canal do passo é o `platform:` do `format:`
    dele; sem `format:`, o da skill (`instagram-publisher` → `instagram`); sem os dois, a opção
    não é passada. A seção desse canal no LEIA-ME abre com a frase da §6.
33. **Regra 15 do AGENTS.md**, com linha na tabela Regra → Trava (U3a-14b): "Script do runtime só
    escreve onde foi combinado: arquivos da crew (com `.bak`), o `state.json` da crew, a pasta de
    saída da crew (`crews/<crew>/output/`) e o destino declarado; nunca sobrescreve arquivo do
    usuário, e só apaga a própria pasta de entrega e os temporários que ele mesmo criou." O
    `system.md` (Language Handling) ganha a exceção: nomes de pasta e de arquivo da entrega e o
    LEIA-ME são PT-BR fixo. Scripts novos em módulos de até 200 linhas, sem dependência, com APIs
    do Node 20.0. Tudo mora em `templates/_opencrew/core/`: chega com um `update`, sem migração.

## 6. Textos
"(novo)" = não está na spec grande. Erros de uso que `comum.mjs` já tem (pasta sem `_opencrew/`,
opção obrigatória faltando, crew não encontrada, caminho fora do projeto) saem com o texto de lá.

| Onde | Texto |
|---|---|
| Opção desconhecida | "Opção desconhecida: {opção}." e o uso |
| `--run` inválido ou inexistente | "Execução não encontrada: {run}. Execuções desta crew: {lista}." |
| Nenhum arquivo da lista existe | "Nenhum arquivo da lista foi encontrado." |
| Item da lista não existe ou é pasta (pendência) | "Não encontrei {arquivo}." |
| Arquivo de serviço na lista | "{arquivo} é arquivo de serviço e não entra na entrega." |
| Formato sem canal conhecido (só no resumo da tela — ajuste da execução real) | "{arquivo} não tem canal conhecido. Está em `outros/`." |
| LEIA-ME, fim da linha de cada arquivo de `## Outros arquivos` (ajuste da execução real) | " — sem canal de publicação; está aqui para você usar como quiser." |
| Bloco do arquivo de origem que ficou fora (ajuste da execução real) | LEIA-ME, em `Atenção:`: "Ficou fora do texto para colar: {blocos}. Veja no arquivo de origem." · resumo da tela: "{arquivo}: ficou fora do texto para colar: {blocos}. Veja no arquivo de origem." |
| LEIA-ME, primeiro passo de canal `Não está pronto` (ajuste da execução real) | "Antes de postar, resolva o que está em Pendências. Corrija no arquivo de origem e peça para montar a entrega de novo: o que você mudar nesta pasta se perde." |
| LEIA-ME, `## Para ter um PDF` (ajuste da execução real) | "Abra o arquivo que você quer (por exemplo, o artigo do blog) no navegador ou no editor de texto e use Imprimir → Salvar como PDF." |
| Nenhuma peça que gere arquivo foi achada | "Não encontrei {peça} em {arquivo}. Confira antes de colar." |
| Peça de outro canal no arquivo (novo) | "{arquivo} tem uma seção de outro canal ({cabeçalho}) que não foi separada. Ela continua no arquivo de origem." |
| Nomes iguais na mesma pasta | "{arquivo} tem o mesmo nome de outro e foi guardado como {novo nome}." |
| Falha de escrita | "Não consegui gravar {arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo." |
| Canal com pendência | "{canal} não está pronto: {n} pendências." (concorda em número) |
| `--vai-publicar` com canal fora da entrega | "Canal não encontrado nesta entrega: {canal}." |
| LEIA-ME, canal com `--vai-publicar` | "Esta crew publica este canal sozinha. Antes de postar à mão, confira se já saiu." |
| LEIA-ME, alerta da regra 34 (novo) | "ALERTA: `{arquivo}` tem {n} caracteres; o limite é {limite}. Encurte antes de publicar." |
| LEIA-ME, `## Sobre esta pasta` (novo) | "Esta pasta é refeita a cada entrega e fica fora do git: o que você editar aqui se perde. Para guardar, copie a pasta para outro lugar do projeto." |
| Runner, crew sem aprovação final | "Esta crew não tem aprovação final: confira os arquivos antes de usar." |
| Runner, script que não rodou | "⚠️ A entrega automática não rodou: {motivo}" e, abaixo, "Os arquivos aprovados estão em:" com a lista |
| Runner, arquivo que a regra do nome seguro deixou fora dos comandos (novo, na implementação) | "{arquivo} — ficou fora da entrega: nome com caractere que não vai em comando" |
| Runner, execução já encerrada: a confirmação da lista (novo, na implementação) | "Entrega da execução {run_id} da crew {name}. Arquivos:", a lista e "Posso montar a entrega com esta lista? (sim / não)" |
| Runner, `ENTREGA:INCOMPLETA` (novo) | "⚠️ A entrega ficou incompleta: {o que falta}" · "1. Corrigir agora (eu ajusto e monto a entrega de novo)" · "2. Seguir assim (no LEIA-ME, o canal fica marcado como "Não está pronto")" |

## 7. Cenários
São 57. **Os 42 da primeira lista valem com o texto da spec grande (§8 de lá), palavra por
palavra**, só acrescentando um `--run` que existe; aqui vai o que cada grupo prova. Os 15 da
segunda lista são novos ou reescritos e valem com o texto daqui. Sem QUANDO, a ação é rodar
`entregar.mjs`. Em cenário com mais de um DADO…ENTÃO, cada par vira um teste, com o mesmo ID.

**Como estão na spec grande**
- **U3a-01a, 01c** — só entra o que está na lista; item que não existe deixa o canal "não pronto".
- **U3a-02a, 02c, 02d, 02e** — pasta pelo `platform:`; `title:` longo não vira pendência.
- **U3a-03a, 03b, 03v** — `legenda.txt` com as hashtags no fim, por rótulo e por cabeçalho.
- **U3a-03c, 03d, 03t** — o que sai e o que fica do markdown; UTF-8 sem BOM, com LF.
- **U3a-03e, 03f, 03i, 03p** — posts, tweets de thread e e-mails numerados; comentário à parte.
- **U3a-03g, 03h, 03j, 03k** — blog (`seo.txt` e `artigo.md`); WhatsApp; roteiro e artigo.
- **U3a-03l, 03n, 03q, 03s** — arquivo inteiro com aviso; `outros/`; prefixo `2-`; carrossel.
- **U3a-04a, 04b, 04h, 04k** — imagens com os mesmos bytes; `editaveis/`; prefixo `2-`.
- **U3a-05a, 05b, 05n** — `entrega/` refeita do zero; mesmos bytes; falha não estraga a anterior.
- **U3a-06a, 06c, 06d, 06f** — erro de uso não escreve nada; entrega completa; passos por canal.
- **U3a-07b, 07f** — `[PREENCHER]` em "Antes de usar"; o que não foi conferido não muda o final.
- **U3a-08c, 08d** (contrato) — script que não rodou (sem a parte do destino); reentrega ao editar.
- **U3a-14a, 14c, upg-a** — regra 15 e idioma; pacote; workspace 1.6.0 atualizado entrega.

**Novos ou reescritos**
- **U3a-01b** (sem `state.json`, `ressalvas.json` e entrega avulsa) DADOS na lista
  `verificacao-ciclo-1.md`, `publicado.json`, `caption.txt` (direto na pasta da execução),
  `export/temp.html` e `entrega/instagram/legenda.txt` ENTÃO nenhum entra e o resumo avisa cada
  um; DADO `v2/caption.txt=instagram-feed` ENTÃO ele entra.
- **U3a-01e-f1** (contrato) `entrega.prompt.md` manda montar a lista com os caminhos devolvidos
  por `caminho.mjs saida`, diz o formato do passo de renderização e o que fica de fora, e, em
  execução já encerrada, manda usar `caminho.mjs entrada` e confirmar a lista.
- **U3a-02b** (item sem formato vai sempre para `outros/`) DADOS um item sem `=formato`, um com
  formato inexistente e um com `platform: "outra-rede"` ENTÃO os três estão em `outros/` e no
  LEIA-ME.
- **U3a-03m-f1** (o U3a-03m é da fatia 2) DADO um `=instagram-feed` com `## Legenda Instagram` e
  `## Post LinkedIn` ENTÃO existe `instagram/legenda.txt`, não existe `linkedin/` e o LEIA-ME traz
  o aviso da seção de outro canal, com o arquivo de origem.
- **U3a-03w** (novo: conserto do leitor) DADO um `=instagram-feed` com `# Legenda — Dia das Mães`,
  uma linha de texto logo abaixo e, depois, `## Legenda` e `## Hashtags` ENTÃO `lerPecas` devolve
  uma legenda só (a de `## Legenda`), o verificador mede uma legenda e existe um só
  `legenda.txt`; DADO um arquivo só com `# Legenda` e o texto ENTÃO a legenda é esse texto.
- **U3a-06b** (`--run` obrigatório) DADO `--destno x` ENTÃO código 1, "Opção desconhecida" e o
  uso; DADA uma chamada sem `--arquivo`, ou sem `--run` ENTÃO código 1, "Falta a opção
  obrigatória" e o uso; nada escrito; DADO `--ajuda` ENTÃO o uso, código 0 e nada escrito.
- **U3a-06e** (duas situações) como na spec grande, com: cada canal traz `Pronto` ou `Não está
  pronto`, e o LEIA-ME traz o texto de "Sobre esta pasta".
- **U3a-07a** (sem destino; decisão 2) DADOS uma legenda de 2.300 caracteres e um blog sem
  pendência ENTÃO `instagram` não está pronto e `blog` está, `instagram/legenda.txt` existe,
  "Antes de usar" traz a pendência e o final é `ENTREGA:INCOMPLETA`.
- **U3a-07g** (sem entrega avulsa) DADA qualquer entrega ENTÃO `verificacao-entrega.md` é igual ao
  relatório do verificador para os mesmos itens, com o parâmetro da regra 17; DADA a mesma lista
  em `verificar.mjs` ENTÃO o resultado é o de hoje (os testes da R1 não mudam).
- **U3a-09c-f1** (regra 34; o U3a-09c é da fatia 2) DADAS uma legenda de 2.100 caracteres e
  hashtags que levam o `legenda.txt` a 2.260 ENTÃO "Antes de usar" traz o ALERTA com 2260 e 2200,
  `instagram` está pronto e o final é `ENTREGA:OK`; DADO um `tweet.txt` de 290 ENTÃO o ALERTA com
  290 e 280; DADO um `legenda.txt` de 2.200 ENTÃO nenhum alerta.
- **U3a-08a** (contrato) o runner tem a seção `### Entrega`, com até 15 linhas: chama
  `entregar.mjs` com `--crew`, `--run` e `--arquivo` entre aspas duplas, no momento da regra 21,
  antes do `concluir`; não o chama em execução rejeitada ou abortada; traz o aviso da crew sem
  aprovação final; cita `prompts/entrega.prompt.md` (que existe). O runner não tem mais "Output
  saved to", "Run folder" nem "Save final output".
- **U3a-08b** (contrato; texto novo) `entrega.prompt.md` traz as duas opções de `INCOMPLETA` da §6
  e o que cada uma faz, e não cita `--aceitar-pendencias`, `--destino` nem `--publicado`.
  *(Nota, 1.9.0: as opções de `INCOMPLETA` mudaram — são três, com "Entregar assim mesmo", e o
  prompt passou a citar `--aceitar-pendencias` e `--destino`. O cenário virou U3a-08b-f2, em
  `specs/fase-u3a2-entrega-no-projeto.md`; `--publicado` continua proibido.)*
- **U3a-08h** (só `--vai-publicar`) DADO `--vai-publicar outra-rede` ENTÃO código 1 e a mensagem
  da §6. **U3a-08n** (1º caso) DADO `--vai-publicar instagram` ENTÃO a seção do canal abre com a
  frase da regra 24. **U3a-14b** (sem destino) DADO cada cenário de `tests/entregar*.test.js`
  ENTÃO, fora de `crews/<crew>/output/<run>/`, a árvore do projeto é igual antes e depois, e não
  sobra pasta `.tmp`.

## 8. Fora desta fase
Tudo abaixo vai para **→ U3a fatia 2 (1.9.0)**, `specs/fase-u3a-entrega-por-canal.md`. O que a
spec grande já mandava para U3b, U4, U5 ou "sem fase" (§11 de lá) não muda.

| Item | Regras e cenários de lá |
|---|---|
| Destino e cópia para uma pasta do projeto; pergunta do destino | 13, 14, 16; U3a-05c a 05m, 05o |
| Entrega avulsa (sem `--run`) | U3a-01d, 07l, 08k |
| Ressalvas e "entregar assim mesmo"; final `COM_RESSALVA`; aceite do laço de revisão "fica registrado" | 18, 19, 22; U3a-07c a 07e, 07h a 07p |
| `--publicado`, "Já publicado" e o publicador lendo a legenda da entrega; um "sim" por passo irreversível | 23 a 25; U3a-08e a 08m, 08o, 08p, upg-c, upg-d |
| Canal de um passo de `blotato` e de `resend` | 22 |
| Arquivo com seções de mais de um canal | 5; U3a-03m, 03o, 03r, 03u |
| Limites de imagem; extensão × conteúdo da imagem; HTML com `file://`; recurso de editável | 9 a 11 (resto); U3a-04c a 04g, 04i, 04j, 04l a 04p |
| Medir como será colado (hashtags no fim); e-mail, WhatsApp e thread no verificador | 26; U3a-09a a 09f |
| Relatório `verificacao-ciclo-N.md` gravado pelo script (a spec grande mandava para a U5; o `IDEIAS.md`, para a U3a) | entra na fatia 2 |
| PDF e `formatted-post` deixam de ser gerados | 27; U3a-10 |
| Arquivos citados dentro das fontes | 28, 29; U3a-11 |
| Resto do `.gitignore` no `update` (casos b e f, o comentário do bloco); instalação interrompida | 30, 31; U3a-12c, 12g, 12i, upg-b |

## 9. Critérios de aceite
- [x] Cenários com teste de mesmo ID, vistos vermelhos antes do código. Os do runner, dos prompts,
      do pacote e do `update` (U3a-01e-f1, 08a a 08d, o lado do runner de 08h e 08n, 14a, 14c e
      upg-a) estão em `tests/runtime-contracts-u3a.test.js`, `tests/package.test.js` e
      `tests/upgrade-u3a.test.js`. Do U3a-upg-a, o teste que roda o script instalado nasceu verde:
      o script já estava pronto; o que ficou vermelho foi a chegada do prompt e da seção do runner.
- [x] `npm run verify` verde (1007 testes em 2026-10-07). Os testes de R1, R2, E1 e R3 continuam
      passando sem mudança: nenhum afirmava "Save final output", "Run folder" (o que existe é
      "Initialize run folder", que fica) nem "Output saved to".
- [x] **Execução real**, por um agente no papel da IA da IDE, no `sandbox/`: uma crew criada pelo
      fluxo normal, com três canais (Instagram com imagens, LinkedIn e blog), rodada do início ao
      fim seguindo o runner ao pé da letra. Conferir e registrar aqui: a entrega rodou no momento
      certo, sem comando traduzido; `entrega/` tem o que a §4 diz; `legenda.txt` e `post.txt` sem
      `#`, `**` nem rótulo, com as hashtags no fim; todo arquivo citado no LEIA-ME existe. Uma
      segunda rodada com um `[PREENCHER]` deixado de propósito (`ENTREGA:INCOMPLETA`, as duas
      opções, "Não está pronto"). E um pedido de entrega de uma execução já encerrada.
      Feita em 2026-10-07 (PowerShell, pasta temporária): crew de 4 agentes e 10 passos (blog, Instagram com 2 imagens e 1 HTML, LinkedIn e um arquivo sem formato). A entrega rodou no momento certo, com a lista montada como o prompt manda: `ENTREGA:OK`, texto limpo para colar, arquivo sem formato em `outros/`, HTML em `editaveis/`. Segunda rodada com `[PREENCHER: telefone]`: `ENTREGA:INCOMPLETA`, pergunta das duas opções, canal marcado "Não está pronto". Pedido de remontar a entrega de uma execução encerrada: funcionou e a pasta foi refeita do zero. Seis ajustes saíram dela (marcados "ajuste da execução real" na §4 e na §6). Não exercitados: `--vai-publicar`, limite estourado, peças longas, script que não roda.
- [ ] O dono abre o LEIA-ME de uma entrega, cola o `post.txt` num rascunho do LinkedIn e segue os
      passos de um canal (se o quadro bate com a tela de cada rede, só ele vê).
- [x] No mesmo commit (regra 9 do AGENTS.md): README (árvore de pastas com `entrega/` e a entrega
      por canal), CHANGELOG 1.8.0, `GLOSSARIO.md`, `AGENTS.md` (regra 15 e a linha da tabela),
      `IDEIAS.md` (sai a parte do título H1) e a renumeração da decisão 8 nos documentos que
      citavam U3b = 1.9.0 e U4 = 1.10.0 (specs U1, U2, U3, U3b, E1 e R3, as duas auditorias e a
      jornada). Em aberto: entrar em `IDEIAS.md` o que a execução real achar.
- [ ] `npm version minor --no-git-tag-version`; push do `main`, CI verde nas 4 células (Ubuntu e
      Windows, Node 20.17 e 22) e só então a tag `v1.8.0`, com confirmação do dono.

## 10. Limites conhecidos
- A lista de arquivos é montada pela IA; o script confere se cada um existe, não se foi aprovado.
  As regras 2, 21, 22 e 24 são seguidas pela IA: os testes garantem o texto; a execução real, o uso.
- `entrega/` fica fora do git, some com a crew e é refeita a cada entrega. Até a fatia 2, quem
  quiser guardar copia à mão.
- Legenda, post e tweet ainda são medidos sem as hashtags no fim (a regra 34 só alerta). E-mail,
  WhatsApp e thread saem como "não medido".
- Canal com pendência tem os arquivos gerados: quem não ler o LEIA-ME pode colar um texto com
  `[PREENCHER]`. Não há registro de "aceitei assim".
- Crew que publica sozinha: a legenda publicada vem do `caption.txt` e pode diferir do
  `legenda.txt`; depois de publicar, o LEIA-ME não diz "já publicado".
- Seção de outro canal não é separada (há aviso). O verificador ainda pode contar o primeiro
  comentário do LinkedIn dentro do post. O conserto do título H1 só vale quando há, abaixo dele,
  outro cabeçalho candidato à mesma peça.
- O script não abre imagens: extensão, quantidade e proporção não são conferidas; logo ou foto de
  apoio na pasta dos slides vai para o canal como se fosse slide.
- LEIA-ME e nomes de arquivo só em PT-BR (→ U5). `artigo.md`, `corpo.md` e roteiros saem em
  markdown. O runner cresceu 9 linhas (de 865 para 874) e continua acima do alvo (→ U5).

## 11. Travas que esta spec deixa
`tests/entregar.test.js` (U3a-01a a 01c, 02, 06a a 06d, 14b) · `tests/entregar-leiame.test.js`
(U3a-06e, 06f) · `tests/entregar-pecas.test.js` e `tests/entregar-pecas-longas.test.js` (U3a-03a a
03w) · `tests/entregar-imagens.test.js` (U3a-04, 05) · `tests/entregar-pendencias.test.js`
(U3a-07, 08h, 08n, 09c-f1) · `tests/verificar-pecas.test.js` (U3a-03w, 02d, 07g) ·
`tests/runtime-contracts-u3a.test.js` (U3a-01e-f1, 08a a 08d, 14a) · `tests/package.test.js`
(U3a-14c) · `tests/upgrade-u3a.test.js` (U3a-upg-a) · `tests/template-refs.test.js` (as
referências a `prompts/entrega.prompt.md` e `scripts/entregar.mjs` existem) · alerta de tamanho:
nenhum módulo de `scripts/` acima de 200 linhas; nenhum teste novo acima de 300.
