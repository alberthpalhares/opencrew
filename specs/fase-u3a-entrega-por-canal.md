# Spec — Fase U3a, fatia 2: Entrega por canal — destino, ressalvas e publicação (1.9.0)

- **Fase:** U3a · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/`, `prompts/`, `runner.pipeline.md`, best-practices; `templates/_opencrew/_memory/preferences.md`; skills `instagram-publisher` e `image-creator`; `templates/AGENTS.md`; `templates/gitignore`) + CLI (`src/commands/update.js`, `src/lib/`) + README + testes · **Status:** não aprovada; passa a ser a **fatia 2 (1.9.0)**. A fatia 1 (1.8.0, a pasta `entrega/` por canal com o LEIA-ME) está em `specs/fase-u3a1-pasta-de-entrega.md`. Este texto ainda é o original, de antes da divisão: precisa de uma revisão antes de ser aprovado (nota abaixo)
- **Termos novos no GLOSSARIO.md:** sim — Entrega, Entrega avulsa, Canal, Peça (amplia o termo da R1), Bloco de serviço, Pendência, Ressalva, Destino da entrega, Reentrega, Editáveis, Recurso de editável, Conjunto de imagens
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `docs/auditoria/2026-10-04-revisao-specs.md` §2, §2.6 e §7 (os IDs entre parênteses são de lá). Substitui `specs/fase-u3-entrega-no-projeto.md`, que não foi aprovada. Parte do verificador como ele fica depois da R1 (`specs/fase-r1-reparos-1-6-1.md`).

> **Nota de 2026-10-07 (2) — este arquivo agora é só histórico.** A fatia 2 (1.9.0) tem spec
> própria, que se basta: `specs/fase-u3a2-entrega-no-projeto.md` (destino e cópia, ressalvas,
> publicação, export e PDF, reparos do `update`). **Não implementar a partir daqui.** Este arquivo
> fica como origem do que foi para a "fatia 3" (sem versão; depois da U4) — regras 5, 9 a 11, 26,
> 28 e 29 e os cenários delas — e do que a §8 de lá mandou para a U4 (entrega avulsa) e para "sem
> fase" (regra 30, caso b). O corpo abaixo não foi reescrito, e o título e o status da linha 3
> ficaram como estavam.
>
> **Nota de 2026-10-07 — o que muda na revisão desta spec.** Ela foi relida contra o código da
> 1.7.1 e dividida em duas fatias. O corpo abaixo não foi reescrito.
> - **Vai na fatia 1** (`specs/fase-u3a1-pasta-de-entrega.md`, que diz o que entra e o que foi
>   reescrito lá): regras 1 a 4, 6 a 9, 11, 12, 15, 17, 19 a 22, 24 e 33, na parte simples, e os
>   cenários listados na §7 de lá. As regras 6, 7 e 8 e 42 cenários valem lá **com o texto
>   daqui**: não apagar daqui antes de a 1.8.0 estar implementada.
> - **Já entregue por outras fases, sai daqui:** a regra 30 em quase tudo e os cenários U3a-12a,
>   12b, 12d, 12e e 12h (R2, 1.6.3: o `update` renova o bloco do `.gitignore`, que já traz
>   `.opencrew-backup/`) — sobram os casos (b) e (f) e o comentário do bloco; a regra 32 (E1,
>   1.7.0); e toda menção ao `state.json` na pasta da execução (desde a E1 ele mora em
>   `crews/<crew>/`).
> - **A conferir na revisão:** a regra 2 e o U3a-01e (o caminho das saídas vem de `caminho.mjs`,
>   R3); o saldo de linhas do runner (§12); a numeração de versões (U3b 1.10.0, U4 1.11.0).

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto).

*O que você vai notar:*

1. **Os passos de cada canal no LEIA-ME** são os do quadro "Passos por canal" (§4). É o texto que
   o usuário mais lê: leia e ajuste antes de aprovar.
2. **PDF e "posts formatados" deixam de ser gerados** (regra 27). Isso desfaz uma promessa do
   README. O LEIA-ME ensina a salvar como PDF.
3. **O dashboard não é assunto desta fase** (regra 32). Ele virou o Escritório na fase E1 (1.7.0,
   `specs/fase-e1-escritorio-ao-vivo.md`) e a pasta `dashboard/` não existe mais. A proposta
   anterior, de removê-lo aqui, foi desfeita.
4. **`entrega/` é refeita do zero** (regra 12): o que for editado dentro dela se perde na entrega
   seguinte, e o LEIA-ME avisa. Não adotado: preservar por hash o arquivo editado ali (B-05, E-22).
5. **Cópia na pasta do projeto: uma pasta por execução** (regra 14). Canal que fica pronto depois
   entra na mesma pasta. Só quando muda algo que já foi copiado a cópia vai para uma pasta nova,
   `<run_id>-reentrega-2`, e a anterior ganha, no LEIA-ME, o aviso de que há uma entrega mais nova.
6. **A legenda, o post do LinkedIn e o tweet são medidos como serão colados**, com as hashtags no
   fim (regra 26): pode bloquear um texto que passava sozinho, como um tweet de 270 caracteres com
   duas hashtags. Cada tweet de `twitter-thread` também passa a ser medido: uma thread que passava
   pode bloquear.
7. **Limites de imagem** em `instagram-feed` (regra 10): `images_max: 10`, `image_ratio_min: 0.8`,
   `image_ratio_max: 1.91`, `images_same_ratio: true`. Quantidade e faixa bloqueiam; mistura alerta.
8. **"Entregar assim mesmo" não é "publicar sem olhar"** (regra 22). Depois dele, a confirmação do
   passo que publica repete as ressalvas: "Este canal tem ressalva: {lista}. Publicar assim?".
   Canal com `[PREENCHER]` aceito não é publicado pela crew: fica para postar à mão.
9. **Crews antigas** (regras 21 e 23). Sem aprovação final: a entrega roda assim mesmo, com o
   aviso "Esta crew não tem aprovação final: confira os arquivos antes de usar." Anterior à
   1.4.2, que publica antes da revisão: a entrega roda ao fim, e o publicador segue o caminho da
   1.6.0, com aviso. O conserto da ordem fica na U4.

*Detalhes já aplicados:*

10. **Atalho que leva para fora do projeto é recusado como destino** (regra 13, I-06).
11. **Arquivo com seções de mais de um canal** (regra 5): cada seção vai para a pasta do seu canal
    e é medida pelos limites do formato padrão desse canal. Vale também para arquivo sem formato.
    Em roteiro, e-mail, artigo e WhatsApp, nada é separado nem medido por canal.
12. **Arquivos citados nas fontes** (regra 28): lista de extensões; tetos de 20 avisos, 3
    sugestões e 1 MB por fonte.
13. **Quem grava é o script, nunca a IA à mão**: `entrega.destino` (regra 16), as ressalvas (regra
    18) e o relatório da verificação da entrega (regra 20). O script só apaga a própria pasta de
    entrega e os temporários dele: é o texto da regra 15 do AGENTS.md (regra 33).
14. **`.gitignore` antigo** (regra 30): a linha `STATUS.md` das instalações 1.4.0 e 1.4.1 fica
    fora do bloco, como linha do usuário.
15. **Texto para colar** (regra 6): além de negrito, itálico e link, saem os `#` de título, a
    linha `---` e as linhas de rótulo `=== … ===`. Marcador de lista e citação ficam.
16. **Nomes iguais na mesma pasta** (regra 8): os arquivos da segunda pasta de origem ganham o
    prefixo `2-`, os da terceira `3-`. Nada é gravado por cima.
17. **Carrossel sem imagem na lista** (tabela da §4): o arquivo de origem vai inteiro para
    `instagram/`, para o texto dos slides não ficar só na pasta da execução.
18. **Canal que a crew publica sozinha** (regra 24): opção `--vai-publicar`, para o LEIA-ME avisar
    antes de alguém postar à mão. Publicação sem link também é marcada.
19. **Entrega avulsa não guarda nada entre chamadas** (regras 18 e 24): ressalva e "já publicado"
    valem só para a chamada que os recebeu.
20. **Nome da pasta de reentrega** (regra 14): `<run_id>-reentrega-2`, e não `<run_id>-2`, que o
    runner já usa para execuções iniciadas no mesmo segundo (I-01).
21. **Imagem de apoio dos slides** (regra 11): o logo ou a foto que o HTML do slide cita vai para
    `editaveis/` com ele e não conta como slide.

## 1. Objetivo
Depois da aprovação final, o resultado chega separado por canal — texto pronto para colar nas
redes e no WhatsApp; artigo e corpo de e-mail em markdown — e com um LEIA-ME que diz o que fazer
com cada arquivo. Se o usuário quiser, uma cópia vai para uma pasta do projeto, sem misturar
execuções. O que não está pronto fica marcado e não é copiado. Tudo funciona em crews que já
existem, só com o `update`.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| D1: A-01, A-02, B-01, C-04, E-17, F-01, F-02, F-03, G-04, G-05, I-12, Z-03, Z-07 | "Só o aprovado" e "última `vN`" não existem em disco; a pasta da execução guarda arquivos de serviço | U3a-01 |
| D2: A-03, A-04, A-08, B-02, B-04, B-12, C-02, C-08, E-03, E-04, E-09, E-10, F-04, F-07, G-01, G-10, G-14, H2-03, Z-01 | `canal:` e `titulo:` não existem e viram bloqueio de blog; formatos do catálogo sem pasta | U3a-02 |
| A-09, A-10, B-11, B-13, C-19, F-05, F-06, F-21, G-11 | "Byte a byte" × "pronto para colar"; `hashtags.txt`; vários itens no mesmo canal | U3a-03 |
| A-11, A-12, A-13, B-06, B-08, B-09, C-20, D-06, D-12, F-08, F-09, G-03, H1-09, I-09, I-16 | Imagem tratada como carrossel de Instagram; limites fora de `constraints:`; HTML dos slides | U3a-04 |
| D3: A-05, A-23, A-32, B-05, B-15, C-07, C-23, D-13, E-01, E-08, E-22, F-10, F-16, F-17, G-16, G-17, I-01, I-04, I-05, I-06, I-07, Z-05, Z-12 | Destino fixo mistura execuções; ninguém pergunta o destino; validação e falha de escrita | U3a-05 |
| A-14, A-25, A-26, A-29, C-16, G-23, H1-20, I-13, Z-02 | Contrato do script: entradas, código de saída, uso errado | U3a-06 |
| D4: A-15, A-16, B-10, B-21, C-03, C-09, E-14, E-16, F-12, G-07, H2-07, H2-16, I-02, Z-04 | `INCOMPLETA` com dois sentidos; bloqueio aceito sem registro; verificar o texto já separado | U3a-07 |
| A-17, B-07, C-21, E-06, F-11, G-06, H1-07, H1-08, H1-10, H1-15 | Entrega depois de publicar; publicador com outra legenda; dry-run mal descrito | U3a-08 |
| A-28, B-20, C-12, E-07, G-09, H2-13 | E-mail e WhatsApp entregues sem medição | U3a-09 |
| A-19, A-20, B-14, C-13, D-16, E-11, G-18, Z-10 | PDF e `formatted-post` prometidos sem método | U3a-10 |
| A-07, A-18, B-19, C-06, C-10, F-14, G-13, I-11 | Arquivos citados dentro das fontes | U3a-11 |
| A-24, C-01, C-11, F-15, G-27, H1-02, H1-03, I-10 | `update` e o bloco do `.gitignore`; instalação interrompida | U3a-12 |
| A-27, B-18, E-19, F-23, G-08, H1-13, H3-20 | Decisão do dashboard | → feito na fase E1 (1.7.0, `specs/fase-e1-escritorio-ao-vivo.md`); aqui só a guarda U3a-13c |
| A-33, B-17, B-24, C-14, C-15, C-22, E-15, E-18, E-20, F-22, G-12, G-21, G-22, G-28, Z-09, Z-11 | Nomes, idioma, tamanho, travas e regra nova | U3a-14, §13 |
| A-06, A-30, B-03, C-05, E-02, G-02, G-24 | Crews que já existem (regra 14 do AGENTS.md); aceite que mede o objetivo | U3a-upg, §9 |
| Fora daqui | Ver §11 | — |

Fontes varridas no portão de entrada: §2, §2.6 e §7 do relatório de 2026-10-04, `IDEIAS.md`,
"Fora de escopo" e "Limites conhecidos" das specs F1, U1, U2 e R1.

## 3. Entradas
```
node _opencrew/core/scripts/entregar.mjs --crew crews/<crew> --arquivo "<lista>" [--run <id>]
     [--destino <pasta>] [--lembrar-destino <pasta|nao>] [--aceitar-pendencias]
     [--vai-publicar <canal>] [--publicado <canal>[=<link>]] [--ajuda]
```
| Entrada | Tipo | Obrigatória | Validação |
|---|---|---|---|
| pasta atual do comando | raiz do projeto | sim | contém `_opencrew/` |
| `--crew` | pasta `crews/<nome>` | sim | dentro do projeto, existente e com `crew.yaml` |
| `--arquivo` | lista separada por vírgula, na sintaxe da R1: `caminho=formato` | sim | todo item dentro do projeto; ao menos um arquivo existe; `=formato` é opcional |
| `--run` | nome da pasta da execução | não | um segmento só (sem `/`, `\` ou `..`); `crews/<crew>/output/<run>/` existe. Ausente: entrega avulsa |
| `--destino` | pasta | não | regra 13; vale sobre o `crew.yaml` |
| `entrega.destino` no `crew.yaml` | `chave: valor`, um nível abaixo de `entrega:` | não | regra 13; aceita aspas e comentário no fim da linha; `nao`, `não` ou `no`, sem diferenciar maiúsculas = não copiar (vale também nas duas opções de destino) |
| `--lembrar-destino` | pasta ou `nao` | não | regra 13; grava a resposta no `crew.yaml` e já vale nesta entrega |
| `--aceitar-pendencias` | opção | não | — |
| `--vai-publicar` | `canal`, pode repetir | não | o canal existe nesta entrega |
| `--publicado` | `canal` ou `canal=link`, pode repetir | não | o canal existe nesta entrega; o link, se vier, começa por `http` |
| `--ajuda` | opção | não | só imprime o uso |

Exemplo de lista (é uma linha só; aqui está quebrada para caber) e de `crew.yaml`:
```
--arquivo "crews/conteudo-semanal/output/2026-03-03-143022/v2/post.md=blog-seo,
           crews/conteudo-semanal/output/2026-03-03-143022/slides/v1/slide-01.png=instagram-feed"

entrega:
  destino: "Conteudo/Prontos"   # pasta do projeto que recebe a cópia
```

## 4. Saídas
```
crews/<crew>/output/<run_id>/entrega/     (sem execução: crews/<crew>/output/entrega-avulsa/)
  LEIA-ME.md
  instagram/  linkedin/  blog/  email/  whatsapp/  twitter/  youtube/     só os canais presentes
  outros/      o que não tem canal conhecido            só existe se tiver arquivo
  editaveis/   HTML dos slides e imagens que ele cita   só existe se tiver arquivo
```
- Ao lado de `entrega/`, na pasta da execução: `verificacao-entrega.md`, `ressalvas.json` (se
  houve aceite) e `publicado.json` (se houve publicação). Sem execução, os dois primeiros ficam ao
  lado de `entrega-avulsa/`, com o prefixo `entrega-avulsa-`, e `publicado.json` não é gravado
  (regra 24). Com destino: `<destino>/<run_id>/` (sem execução: `<destino>/entrega-avulsa/`).
- Na tela: resumo em PT-BR (pasta da entrega, pasta da cópia, situação de cada canal, o que falta,
  caminho do LEIA-ME). É o resumo final da execução: o runner só o mostra.
- Última linha: `ENTREGA:OK`, `ENTREGA:COM_RESSALVA` ou `ENTREGA:INCOMPLETA`.
- Código de saída: 0 sempre que a última linha é `ENTREGA:` (e em `--ajuda`). 1 só em erro de uso:
  nesse caso não há linha `ENTREGA:` e nada é escrito.

**Formato → pasta → arquivos ← origem.** Fonte única para `entregar.mjs` e `verificar.mjs`. Os
nomes de limite são os de `constraints:`. "R1" = peça achada e medida como na regra 3 da R1.

| Formato | Pasta | Peça ← onde é achada | Arquivo gerado | Limite medido |
|---|---|---|---|---|
| `instagram-feed` | `instagram/` | legenda e hashtags ← R1 | `legenda.txt` (hashtags no fim) | `caption_max_chars` sobre o texto entregue; `hashtags_max` |
| | | slides (texto) ← R1 | com imagem do formato na lista: não vira arquivo (vira imagem); sem imagem: o arquivo de origem vai inteiro, com o nome original | `carousel_max_slides` |
| | | imagens ← itens de imagem do formato (regra 9), menos os recursos de editável (regra 11) | nome original | `images_max`, `image_ratio_min`, `image_ratio_max`, `images_same_ratio` |
| `linkedin-post` | `linkedin/` | post ← R1 | `post.txt` (hashtags no fim) | `post_max_chars` sobre o texto entregue; `hashtags_max` |
| | | primeiro comentário ← seção com "comentário" ou "comment" no cabeçalho, depois de um post; não conta como post | `post-comentario.txt` | — |
| `twitter-post` | `twitter/` | tweet ← a seção `=== TWEET ===` inteira, com as suas quebras de linha (um tweet só); sob cabeçalho com "tweet" ou "twitter", um tweet por parágrafo (R1) | `tweet.txt`, `tweet-N.txt` | `tweet_max_chars` sobre o texto entregue |
| `twitter-thread` | `twitter/` | cada tweet ← cada bloco iniciado por `TWEET n/N`; sem esses blocos, como no `twitter-post` | `tweet-N.txt` | `tweet_max_chars` |
| `blog-post`, `blog-seo` | `blog/` | título e meta description ← R1 | linhas de `seo.txt` | os da R1 |
| | | palavra-chave ← frontmatter `palavra_chave` ou `keyword`, ou, em `=== TARGET KEYWORD ===`, o texto depois de `Primary:` até a barra vertical ou o fim da linha; slug ← frontmatter `slug` | linhas de `seo.txt`, só se existirem | — |
| | | artigo ← o resto do arquivo: tudo o que não é título (`TITLE`, `TITLE TAG`), meta description, `TARGET KEYWORD` nem bloco de serviço | `artigo.md` | links (R1) |
| `email-newsletter`, `email-sales` | `email/` | assunto ← `=== SUBJECT LINE ===`; cabeçalho com "assunto" ou "subject". Cada assunto abre um e-mail | `assunto.txt` | `subject_line_max_chars` |
| | | prévia ← `=== PREVIEW TEXT ===`; cabeçalho com "prévia" ou "preview" | `previa.txt` | `preview_text_chars` (só o `email-newsletter` declara) |
| | | corpo ← o resto do e-mail, até o próximo assunto: tudo o que não é assunto, prévia nem bloco de serviço | `corpo.md` | — |
| `whatsapp-broadcast` | `whatsapp/` | mensagem ← corpo do arquivo, sem linhas de rótulo e sem blocos de serviço | `mensagem.txt` | `message_max_chars` sobre o texto entregue |
| `instagram-reels`, `instagram-stories`, `linkedin-article`, `youtube-script`, `youtube-shorts`, outro formato com plataforma conhecida | pasta da plataforma | roteiro ou artigo ← corpo do arquivo; as linhas de rótulo ficam (regra 6) | nome original | — (não medido) |
| sem formato e sem peça reconhecida (regra 5), sem best-practice, sem `platform:` ou plataforma desconhecida | `outros/` | — | cópia como está | — |

**`seo.txt`**: uma linha por campo, nesta ordem, só os que existem: `Título: …`,
`Meta description: …`, `Palavra-chave: …`, `Slug: …`.

**LEIA-ME.md.** Primeira linha: título com a crew e o `run_id` (na avulsa, só a crew). Depois,
títulos fixos, nesta ordem; seção sem conteúdo não aparece:
- `## Antes de usar`: ressalvas; o que falta preencher, com o trecho e o arquivo (o entregue,
  quando o canal vai com ressalva: `linkedin/post.txt` — `[PREENCHER: link do artigo]`; o de
  origem, quando o canal não está pronto); canais que não estão prontos, com o motivo.
- um `## {Canal}` por canal presente (Instagram, LinkedIn, Blog, E-mail, WhatsApp, X/Twitter,
  YouTube): situação, arquivos, passos curtos (pelo computador primeiro; são os do quadro
  "Passos por canal", abaixo) e o arquivo de origem.
  A situação é uma só: `Pronto` · `Pronto, com ressalva` · `Não está pronto` · `Já publicado`
  (esta vale sobre as outras). Com várias peças no canal, cada arquivo numerado aparece com o
  título do bloco de origem (o cabeçalho logo acima do da peça), copiado como está, quando
  houver; as imagens aparecem agrupadas por pasta de origem. Blog e e-mail trazem a linha "Este
  texto está em markdown: se o seu editor não aceitar, ajuste títulos, negrito e links depois de
  colar." O passo que fala de imagens só aparece quando o canal tem imagem.
- `## Outros arquivos` e `## Editáveis`.
- `## O que não foi conferido` (regra 20).
- `## Para ter um PDF`: "Abra o arquivo e use Imprimir → Salvar como PDF." Só aparece quando a
  entrega tem arquivo `.md`.
- `## Sobre esta pasta`: a `entrega/` da execução é refeita a cada entrega e fica fora do git; a
  cópia na pasta do projeto, não.

Os arquivos da entrega são citados com caminho relativo à pasta do LEIA-ME
(`instagram/legenda.txt`); só o arquivo de origem usa caminho relativo ao projeto. Só cita o que
existe. O LEIA-ME da cópia é o mesmo arquivo: por isso a seção do canal que não vai para a cópia
(pendência não aceita) traz só a situação, as pendências e o arquivo de origem. Pelo mesmo motivo,
`## Editáveis` só lista o HTML e os recursos de canal que vai para a cópia.

**Passos por canal** (texto literal, aprovado junto com a spec). O módulo do LEIA-ME guarda este
quadro como dado, um item por canal. Cada passo só aparece quando o arquivo que ele cita existe na
entrega; os passos que aparecem são numerados em sequência. `{arquivo}` é o nome do arquivo
entregue; com várias peças, o passo cita os arquivos numerados (`post-1.txt`, `post-2.txt`…). Em
canal "Já publicado", os passos não aparecem.

| Canal | Passos, na ordem (entre colchetes, o arquivo que faz o passo aparecer) |
|---|---|
| Instagram | "No computador, abra instagram.com e comece uma publicação nova. Pelo celular, mande os arquivos para ele antes." · [imagens] "Escolha as imagens na ordem dos nomes dos arquivos." · [`legenda.txt`] "Abra `instagram/legenda.txt`, copie tudo e cole no campo da legenda. As hashtags já estão no fim." · "Confira a prévia e publique." · [roteiro ou carrossel em texto] "`instagram/{arquivo}` é para ler e produzir (gravar ou montar os slides): não é texto para colar." |
| LinkedIn | "No computador, abra linkedin.com e comece uma publicação." · [`post.txt`] "Abra `linkedin/post.txt`, copie tudo e cole." · [imagens] "Anexe as imagens na ordem dos nomes dos arquivos." · "Confira e publique." · [`post-comentario.txt`] "Depois de publicar, abra `linkedin/post-comentario.txt`, copie e cole como primeiro comentário." · [artigo] "Para o artigo, escolha escrever um artigo no LinkedIn e cole o texto de `linkedin/{arquivo}`, seção por seção." |
| Blog | "Abra o editor do seu blog e crie um post novo." · [`seo.txt`] "Abra `blog/seo.txt` e copie cada linha para o campo de mesmo nome (título, meta description, palavra-chave, slug)." · [`artigo.md`] "Abra `blog/artigo.md`, copie tudo e cole no corpo do post." · a linha do markdown · "Confira a prévia e publique." |
| E-mail | "Abra a sua ferramenta de e-mail e crie uma mensagem nova." · [`assunto.txt`] "Copie o texto de `email/assunto.txt` para o campo do assunto." · [`previa.txt`] "Copie o texto de `email/previa.txt` para o campo de prévia (a linha que aparece ao lado do assunto)." · [`corpo.md`] "Abra `email/corpo.md`, copie tudo e cole no corpo." · a linha do markdown · "Envie um teste para você antes de enviar para a lista." |
| WhatsApp | "No computador, abra o WhatsApp Web ou o aplicativo. Pelo celular, mande o arquivo para ele antes." · "Abra `whatsapp/mensagem.txt`, copie tudo e cole na conversa ou na lista de transmissão." · "Se o texto tiver `{{…}}`, troque pelo dado real, ou confira se a sua ferramenta de envio faz a troca." · "Envie primeiro para você, para ver como ficou." |
| X/Twitter | "No computador, abra x.com e comece uma publicação." · [`tweet.txt`] "Abra `twitter/tweet.txt`, copie tudo e cole." · [`tweet-N.txt`] "Para a sequência, cole `twitter/tweet-1.txt`, acrescente outra publicação e cole o arquivo seguinte, na ordem dos números." · [imagens] "Anexe as imagens." · "Confira e publique." |
| YouTube | [roteiro] "`youtube/{arquivo}` é o roteiro para gravar: não é texto para colar." |

## 5. Regras de negócio

**O que entra (D1)**
1. **O script não julga aprovação.** Entra o que vier em `--arquivo` (imagens e HTML também) e
   existir; o runner monta a lista logo depois da aprovação final. Nunca entra, mesmo listado:
   `verificacao-*.md`, `ressalvas.json`, `publicado.json`, todo arquivo cujo nome começa por
   `entrega-avulsa-` e o que estiver em `export/`, `entrega/` ou `entrega-avulsa/`. `state.json` e
   `caption.txt` só ficam de fora quando estão direto na pasta de uma execução
   (`crews/<crew>/output/<run_id>/`, fora de `vN`): é ali que o runner e o publicador da 1.6.0 os
   gravam. Dentro de uma pasta `vN`, são saída de passo e entram.
2. **A unidade de versão é a execução do passo** (instrução ao runner, em `entrega.prompt.md`):
   para cada passo de criação ou de renderização aprovado (ou concluído, em crew sem aprovação
   final: regra 21), a pasta `vN` mais alta que contém o `outputFile`, com todos os arquivos dela
   e só eles; saída sem `vN` entra pelo próprio caminho. Passo de renderização sem `format:` usa
   o formato do passo de conteúdo que ele renderiza. Ficam de fora pesquisa, briefing, parecer do
   revisor, resposta de checkpoint e passo pulado. Em execução já encerrada (a lista não está
   mais na memória da IA), a IA monta a lista pelos `format:` e `outputFile:` dos passos e pede o
   "sim".

**Canal e peças (D2)**
3. **Canal = `platform:` do best-practice do formato.** É lido por chave, como os limites na
   regra 12 da R1: vale o de `_opencrew/best-practices.local/{formato}.md` quando o arquivo
   declara `platform:`; senão, o do core. Sete pastas: `instagram`, `linkedin`, `blog`, `email`,
   `whatsapp`, `twitter`, `youtube`; o resto vai para `outros/`. Não há `canal:` nem `titulo:`
   obrigatório, nem edição em `crews/`.
4. **Um leitor só.** As peças são achadas pela função que o verificador usa (cabeçalho por palavras
   e rótulo `=== RÓTULO ===`), exportada de um módulo único. O relatório mede o texto entregue. A
   procura de peças só vale para arquivo de texto que não é HTML: imagem e HTML não geram "peça
   não achada" nem "não medido" de peça, e o HTML passa só pelas checagens gerais.
5. **Seção de outro canal.** Em arquivo sem formato, ou de formato `instagram-feed`,
   `linkedin-post`, `twitter-post` ou `twitter-thread`, a seção que o leitor reconhece pela
   detecção sem formato da R1 (regra 3, último parágrafo) é peça daquele canal, desde que não seja
   linha de slide ("Slide N") nem esteja dentro de uma peça já achada. Ela é achada e medida pela
   linha da tabela do formato padrão do canal — `instagram` → `instagram-feed`, `linkedin` →
   `linkedin-post`, `twitter` → `twitter-post` —, com os limites desse formato. De arquivo sem
   formato com peça achada, só as peças são entregues, e o LEIA-ME aponta o arquivo de origem; sem
   peça achada, o arquivo vai para `outros/`, como está. Em texto longo ou de corpo único (blog,
   artigo, e-mail, roteiro, WhatsApp), cabeçalho é conteúdo: nada é separado nem medido por canal.
6. **Texto para colar e texto em markdown.**
   - `.txt`: mesmas palavras, na mesma ordem. Saem todas as linhas de rótulo (`=== … ===`) de
     dentro da peça, a linha de cabeçalho que a nomeia e esta sintaxe de markdown, e só ela:
     `**x**`, `__x__`, `*x*` e `_x_` viram `x`; `[texto](url)` vira `texto: url`, e `[url](url)`
     vira só a URL; a linha só com `---` sai; o título dentro da peça (linha que começa por `#` e
     espaço) perde os `#`. Marcador de lista e citação ficam.
   - Marcador de negrito ou itálico só sai em par e colado ao texto que marca (sem espaço depois
     do de abertura nem antes do de fechamento). Nunca sai no meio de palavra
     (`relatorio_final_2026`), nem dentro de URL (em `[ ]( )` ou solta: `http…`, `www.`,
     `wa.me/…`), de e-mail, de `@usuário` ou de `#hashtag`.
   - No WhatsApp, `**x**` vira `*x*`, e `*x*` e `_x_` ficam. Na mensagem escrita com rótulos
     (`GREETING`, `BODY`, `CTA`, `SIGNATURE`), os textos das seções vêm na ordem do arquivo,
     separados por uma linha em branco.
   - As hashtags de `=== HASHTAGS ===`, ou de seção com "hashtags" no cabeçalho, vão no fim da
     legenda, do post ou do tweet (havendo vários tweets, no fim do primeiro), depois de uma linha
     em branco. O texto é aparado e termina com uma quebra de linha.
   - `artigo.md` e `corpo.md` (blog e e-mail): corpo sem frontmatter e sem linhas de rótulo; o
     markdown fica.
   - Cópia com o nome original (roteiros, `linkedin-article`, outro formato com plataforma):
     corpo sem frontmatter e sem blocos de serviço. As linhas de rótulo ficam como estão, porque
     são a estrutura do texto.
   - **Bloco de serviço nunca é entregue em arquivo de canal** (os gerados e a cópia de roteiro
     ou de artigo): seção de rótulo terminado em `NOTES`, `NOTE` ou `CHECKLIST`, o rótulo `FORMAT`
     e comentário HTML (`<!-- … -->`). Só a cópia como está o mantém: em `outros/` e no arquivo
     que vai inteiro (regra 8 e carrossel sem imagem).
   - Todo arquivo de texto gerado (`.txt` e `.md`) sai em UTF-8 sem BOM, com LF.
   - Nada é inventado: peça ausente não gera arquivo nem linha.
7. **Várias peças do mesmo tipo no mesmo canal são numeradas**, na ordem de `--arquivo` e, dentro
   do arquivo, na ordem do texto: `post-1.txt`, `post-1-comentario.txt`, `post-2.txt`;
   `assunto-2.txt`, `corpo-2.md`. Uma peça só fica sem número.
8. **Nada some.** Arquivo de formato da tabela sem nenhuma peça que gere arquivo vai inteiro, com
   o nome original, para a pasta do canal, e o LEIA-ME avisa; faltando só uma peça, as achadas
   viram arquivo, sem aviso. Arquivo que não tem peça a separar (`.csv`, `.pdf`, e `.webp`, `.gif`
   ou `.svg` que não seja recurso de editável, HTML sem imagem de mesmo nome) é copiado como está
   para a pasta do canal ou para `outros/`. Quando um arquivo copiado com o nome original chegaria
   a uma pasta onde já há outro com esse nome, todos os arquivos vindos da mesma pasta de origem
   que ele ganham o prefixo `2-` (os da pasta seguinte, `3-`), na ordem de `--arquivo`: nenhum
   arquivo da entrega é gravado por cima de outro. Tudo o que foi entregue aparece no LEIA-ME, com
   a origem.

**Imagens e editáveis**
9. **Imagem é copiada com o nome original**, para a pasta do canal do seu formato (o recurso de
   editável vai para `editaveis/`: regra 11). É imagem o item de extensão `.png`, `.jpg` ou
   `.jpeg`; o conteúdo diz se é PNG ou JPEG, e extensão que não bate gera aviso. Não há
   renumeração: slide que falta aparece como buraco. Arquivo com uma dessas extensões que não é
   PNG nem JPEG por dentro é copiado como está, com o aviso "Não consegui ler {arquivo} como
   imagem."; só é bloqueio quando o formato tem limites de imagem (regra 10).
10. **Limites de imagem moram em `constraints:`** (regra 12 do AGENTS.md) e são medidos pelo
    `verificar.mjs` antes do revisor: `images_max`, `image_ratio_min`, `image_ratio_max` (largura ÷
    altura, arredondada para duas casas) e `images_same_ratio`. Em `instagram-feed.md`:
    `images_max: 10`, `image_ratio_min: 0.8`, `image_ratio_max: 1.91`, `images_same_ratio: true`.
    O tamanho é lido do cabeçalho (PNG: IHDR; JPEG: primeiro marcador SOF, segmento a segmento).
    O **conjunto** medido são as imagens da mesma pasta com o mesmo formato, menos os recursos
    de editável (regra 11).
    - Formato que declara esses limites: acima de `images_max`, fora da faixa ou conteúdo que não
      é PNG nem JPEG → bloqueio (no último caso, "Imagem ilegível"); proporções diferentes no
      conjunto → alerta; uma imagem só é válida.
    - Formato sem esses limites: `⚪ Não medido — o formato {id} não tem limites de imagem`, e o
      verificador não abre o arquivo. Sem `=formato`: continua `⚪ Não verificado — não é texto`
      (regra 9 da R1; o R1-02c não muda).
    - No laço de revisão, o runner passa os arquivos do passo de renderização (imagens e HTML)
      com o formato do passo de conteúdo que eles renderizam (a mesma regra da 2). Esse texto
      mora no `runner.pipeline.md`, junto da chamada do verificador.
    - PNG não é defeito: o aviso "a publicação automática exige JPEG" é do publicador.
11. **Editáveis.** HTML que tem na lista uma imagem de mesmo nome (`slide-01.html` e
    `slide-01.png`) é HTML editável: vai para `editaveis/`, sem subpasta, e só é copiado para o
    destino se o canal dessa imagem estiver pronto. Se o HTML cita arquivo deste computador
    (`file://`, letra de unidade ou caminho que começa por `/`), o LEIA-ME avisa, sem mostrar o
    caminho. `image-creator/SKILL.md` e `image-design.md` deixam de mandar embutir imagem por
    caminho absoluto: passam a orientar base64 ou arquivo na pasta do HTML, com caminho relativo.
    - **Recurso de editável.** Arquivo de imagem da lista (`.png`, `.jpg`, `.jpeg`, `.svg`,
      `.webp` ou `.gif`) citado por um HTML editável da lista, da mesma pasta (em `src=` ou em
      `url()`, por caminho relativo), é recurso de editável: o logo ou a foto que o slide usa.
      Vai para `editaveis/` junto com o HTML, e para o destino quando ele for. Não é imagem do
      canal, não entra no conjunto da regra 10, não é medido e nunca é usado pelo publicador
      (regra 23). No relatório do verificador, sai como imagem sem formato (regra 9 da R1). A
      imagem de mesmo nome de um HTML editável é sempre slide, mesmo quando outro HTML a cita.

**Pasta e destino (D3)**
12. **`entrega/` é refeita do zero a cada chamada do script**: montada na pasta temporária
    `entrega.tmp/`, ao lado, e trocada no fim (na avulsa, `entrega-avulsa/` e
    `entrega-avulsa.tmp/`). O script só apaga a própria `entrega/` (ou `entrega-avulsa/`) e os
    temporários dele.
13. **Destino válido**: caminho relativo, dentro do projeto mesmo depois de resolver atalhos,
    diferente da raiz e fora de `_opencrew/`, `crews/`, `skills/`, `.git/` e `node_modules/`.
    Absoluto é o que começa por `/`, `\` ou letra de unidade, em qualquer sistema; as pastas
    reservadas são comparadas sem diferenciar maiúsculas. Se não existe, é criado, e o resumo diz
    isso. Uma função só valida destino, para todos os scripts.
14. **Cópia.** Vai para `<destino>/<run_id>/` (sem execução: `<destino>/entrega-avulsa/`) a entrega
    inteira, menos os canais que não estão prontos. Se a pasta já existe e está igual, nada é
    copiado; se a entrega só acrescenta arquivos, eles entram na mesma pasta; se está diferente, a
    cópia vai para uma pasta nova, `<run_id>-reentrega-2`, `-3` (sem execução:
    `entrega-avulsa-reentrega-2`), com a entrega inteira. Compara-se com a pasta mais recente da
    execução.
    - *Igual*: cada arquivo a copiar (fora o LEIA-ME) existe na pasta com o mesmo conteúdo (texto
      comparado sem diferença de CRLF/LF; o que não é texto, byte a byte), e as pastas de canal,
      `outros/` e `editaveis/` da cópia não têm arquivo a mais. Arquivo a mais na raiz da cópia,
      posto pelo usuário, não conta e nunca é tocado.
    - *Só acrescenta*: tudo o que já está nas pastas de canal, em `outros/` e em `editaveis/` da
      cópia continua igual na entrega nova, e ela tem arquivos que a cópia ainda não tem (um canal
      que ficou pronto depois, por exemplo). Os arquivos novos são copiados para a mesma pasta, e
      nada é sobrescrito: a cópia fica igual à entrega nova. Pasta que ainda não existe na cópia
      entra inteira, de uma vez; só em pasta que já existe (`editaveis/`, `outros/`) os arquivos
      entram um a um; o `LEIA-ME.md` da cópia é o último a ser trocado. Falha no meio: não sobra
      temporário, vale o que já entrou, o LEIA-ME continua o anterior e a chamada seguinte
      completa o resto (regra 15).
    - *Diferente*: algum arquivo já copiado mudou ou saiu da entrega, ou a cópia tem arquivo a
      mais numa dessas pastas.
    - Nunca sobrescreve e nunca mistura. Exceção: o `LEIA-ME.md`, que é do script. Ao criar uma
      pasta de reentrega, o script acrescenta, no começo do LEIA-ME das pastas anteriores daquela
      execução, a linha "Há uma entrega mais nova desta execução em {pasta}."
15. **Nada pela metade, saída determinística.** A cópia é feita numa pasta temporária ao lado
    (`<pasta>.tmp/`) e renomeada no fim; no caso "só acrescenta" da regra 14, os arquivos novos
    são preparados nela e movidos assim: pasta que ainda não existe na cópia entra inteira, de
    uma vez; só em pasta que já existe (`editaveis/`, `outros/`) os arquivos entram um a um; o
    `LEIA-ME.md` da cópia é o último a ser trocado. Falha no meio: vale o que já entrou, e o
    LEIA-ME continua o anterior. Falha de escrita (pasta de nuvem, arquivo aberto, sem
    permissão), na entrega ou na cópia: mensagem em PT-BR com o arquivo, nenhuma pasta parcial
    nem temporária, a entrega anterior fica como estava e o final é `ENTREGA:INCOMPLETA`. As
    mesmas entradas geram os mesmos bytes: o LEIA-ME não tem hora (a data vem do `run_id`).
16. **Quem pergunta o destino é o runner**, uma vez, ao fim da primeira execução de uma crew sem
    `entrega.destino`, depois de mostrar o resumo da entrega: "Quer que eu copie o resultado para
    uma pasta do projeto? Qual?". Com a resposta, o runner repete a chamada com
    `--lembrar-destino <pasta>` ou `--lembrar-destino nao`; o resumo dessa segunda chamada é o
    resumo final. Quem grava é o script, sem mexer no resto do arquivo e com cópia `crew.yaml.bak`
    (se ela já existe, `crew.yaml.bak-<data-hora>`, como faz o `conferir-fontes.mjs`).
    `--lembrar-destino` com `nao`, `não` ou `no` grava sempre `nao` no `crew.yaml`; com o valor
    que já está gravado, não regrava o `crew.yaml` nem cria `.bak`; a chamada repetida depois da
    pergunta do destino só acrescenta `--lembrar-destino` às opções da primeira. Sem destino, a
    entrega fica na pasta da execução e o resumo mostra o caminho.

**Pendências (D4)**
17. **Verificação na origem.** Antes de separar, o script roda o verificador (módulo importado) nos
    arquivos de origem, cada um com o seu formato. Item sem `=formato` recebe as checagens gerais
    e a medição das seções de canal da regra 5; item com formato sem best-practice, só as
    checagens gerais. Em nenhum dos dois o `title:` ou `titulo:` do frontmatter é medido: na
    entrega não vale o padrão `blog-post` da 1.6.0 (é o modo da entrega do verificador; no laço
    de revisão, o padrão continua). Bloqueio, `[PREENCHER]` ou item da lista que não existe é
    **pendência**. A de medida (tamanho, hashtags, imagens) é do canal da peça medida. A do
    arquivo inteiro (placeholder, termo proibido, `[PREENCHER]`) é de todo canal que recebe peça
    ou cópia daquele arquivo. A de um HTML editável é do canal da imagem de mesmo nome. A do
    arquivo que não existe é do canal do formato dele. Canal com pendência (ou `outros/`) aparece
    no LEIA-ME como "Não está pronto" e não é copiado para o destino: vai inteiro ou não vai.
18. **Ressalva.** Com `--aceitar-pendencias`, o script grava em
    `crews/<crew>/output/<run_id>/ressalvas.json` todas as pendências daquele momento e entrega;
    cada chamada com a opção regrava o arquivo. A chave da ressalva é arquivo (caminho relativo ao
    projeto) + item do verificador + trecho; em bloqueio de medida, o trecho é o valor medido e o
    limite (`2300/2200`). Nas entregas seguintes da mesma execução, pendência igual a uma ressalva
    gravada continua aceita; mudou qualquer um dos três, é pendência nova. Arquivo que não existe
    nunca vira ressalva. Na entrega avulsa, a ressalva vale só para aquela chamada:
    `entrega-avulsa-ressalvas.json` é gravado como registro e não é lido de volta. Isso cumpre o
    "Aceitar assim mesmo (fica registrado)" da U1 (H2-07).
19. **Três finais.** `ENTREGA:OK`: nenhuma pendência. `ENTREGA:COM_RESSALVA`: toda pendência é
    ressalva; o LEIA-ME abre com elas e com o que falta preencher. `ENTREGA:INCOMPLETA`: algum
    canal não está pronto, o destino foi recusado ou a gravação falhou.
20. **O que não foi conferido** vai para o LEIA-ME e não muda o final: alertas, itens "não medido"
    e "não verificado", e a lista fixa (links e fatos; texto dentro das imagens; aparência final em
    cada rede). O relatório dessa verificação é gravado pelo próprio script, em
    `verificacao-entrega.md` (na avulsa, `entrega-avulsa-verificacao-entrega.md`) (H2-16).

**Runner e publicação**
21. **Onde mora o texto e quando a entrega roda.** As instruções da entrega ficam em
    `_opencrew/core/prompts/entrega.prompt.md`. O `runner.pipeline.md` ganha a seção `### Entrega`,
    só com a chamada (até 15 linhas), e as frases das regras 10, 22 (a opção 2 do laço de
    revisão), 25, 27 e 29, cada uma no seu lugar (até 30 linhas ao todo). Perde as linhas "Run
    folder" e "Output saved to" do resumo e o passo "Save final output"; o menu final (rodar de
    novo, editar, voltar) continua. O `system.md` ganha uma linha na tabela de comandos: pedido
    para entregar uma execução já encerrada, ou para retomar uma entrega deixada para depois →
    ler `_opencrew/core/prompts/entrega.prompt.md`. Não há comando novo.
    - A primeira chamada acontece com a execução aprovada: imediatamente antes do primeiro passo
      que publica ou envia; sem passo desses, depois do último passo. É uma chamada do próprio
      runner, não um passo do pipeline.
    - Conta como passo que publica ou envia o que declara `side_effects: irreversible`, ou cujo
      agente usa uma skill que declara `side_effects: irreversible` no `SKILL.md` (hoje, a
      `instagram-publisher`). Crews anteriores à 1.4.2 não têm a marca no passo.
    - Se esse passo vem antes da revisão ou da aprovação final da crew (crew anterior à 1.4.2,
      que publica antes da revisão), a entrega roda ao fim, já com `--publicado` do canal que saiu.
    - Execução rejeitada, abortada antes da aprovação ou sem arquivo aprovado não tem entrega. A
      saída do script é mostrada ao fim da execução; se a execução parar ou for abortada depois da
      entrega (num passo irreversível), o runner mostra a saída antes de parar.
    - Em crew sem checkpoint de aprovação final, vale como aprovada a execução que conclui os
      passos sem ser abortada. A entrega roda nos momentos dos itens acima: antes do primeiro
      passo irreversível (que pede a própria confirmação) ou, sem ele, depois do último passo. O
      runner mostra, junto do resumo, o aviso "Esta crew não tem aprovação final: confira os
      arquivos antes de usar."
22. **O que o runner faz com cada final.** `OK` e `COM_RESSALVA`: segue. `INCOMPLETA`: mostra o que
    falta e oferece *1. Preencher ou corrigir agora · 2. Entregar assim mesmo · 3. Deixar para
    depois*.
    - Opção 1: o runner volta ao texto e roda a entrega de novo.
    - Opção 2: o runner repete a chamada com `--aceitar-pendencias`.
    - Opção 3: os passos irreversíveis dos canais prontos seguem, cada um com a sua confirmação; o
      do canal que não está pronto não roda. O resumo diz o que falta e que basta pedir a entrega
      desta execução quando o dado existir.
    - `--aceitar-pendencias` só é passada na opção 2 e em mais um caso: o usuário escolheu "Aceitar
      assim mesmo" no laço de revisão, e as pendências que a entrega mostra são só as que ele
      aceitou ali. Nesse caso, o runner repete a chamada com a opção, sem perguntar de novo. A
      primeira chamada vai sempre sem ela. Havendo qualquer outra pendência, o runner mostra as
      três opções. Como o aceite agora é gravado (regra 18), a opção 2 do laço de revisão volta a
      dizer "Aceitar assim mesmo (fica registrado na entrega)".
    - Passo irreversível de canal que não está pronto não roda sem a opção 2. Em canal com
      ressalva, a confirmação do passo irreversível repete as ressalvas: "Este canal tem ressalva:
      {lista}. Publicar assim?". Canal com `[PREENCHER]` aceito não é publicado pela crew: o passo
      não roda, o runner avisa e o canal fica para postar à mão. Quando o passo não roda por
      isso, o runner repete a chamada sem `--vai-publicar` desse canal, para o LEIA-ME não dizer
      que a crew publica sozinha.
    - O canal de um passo irreversível é o `platform:` do `format:` do passo; sem `format:`, o da
      skill de publicação (`instagram-publisher` → `instagram`); sem os dois, o runner pergunta.
    - Com destino recusado ou falha de gravação, o runner mostra a mensagem e pede outra pasta ou
      nova tentativa. Depois de "editar este conteúdo", a entrega roda de novo. Script que não
      rodou (sem Node, erro, sem linha de status): aviso, lista dos arquivos aprovados, e a
      execução continua.
23. **O publicador do Instagram usa a legenda aprovada**: `entrega/instagram/legenda.txt` em
    `--caption-file` e, de `entrega/instagram/`, só as imagens do conjunto daquele post (as que
    entraram na lista com `=instagram-feed`, vindas da mesma pasta; recurso de editável não
    entra), na ordem dos nomes. Não varre a pasta, que pode ter imagens de Reels ou de Stories, e
    não remonta a legenda a partir dos slides (H1-08).
    - Mais de uma legenda (`legenda-1.txt`…) ou mais de um conjunto: para e pergunta qual publicar.
    - `entrega/` existe, mas sem legenda: para e pergunta.
    - Sem `entrega/` nesta execução (crew anterior à 1.4.2, que publica antes da entrega, ou
      script que não rodou): avisa e segue pelo caminho da 1.6.0, com prévia e confirmação.
    - O `SKILL.md` diz o que o `--dry-run` faz de verdade: envia as imagens ao imgBB, onde ficam
      públicas por 24 horas, e cria os contêineres; só não publica (H1-15).
    - O `publish.js` tira a quebra de linha do fim da legenda antes de medir e de enviar: o
      `legenda.txt` termina com uma (regra 6), e sem isso uma legenda de 2.200 seria recusada.
24. **Antes e depois de publicar.** Na chamada que antecede os passos irreversíveis, o runner
    passa `--vai-publicar <canal>` para cada canal que a crew publica sozinha, e o LEIA-ME desse
    canal abre com "Esta crew publica este canal sozinha. Antes de postar à mão, confira se já
    saiu." Depois de publicar, o runner repete a mesma chamada, com as mesmas opções, trocando,
    no canal que saiu, `--vai-publicar` por `--publicado <canal>=<link>` (sem link, só
    `<canal>`). O script grava `publicado.json` na pasta da execução, e o LEIA-ME daquele canal
    passa a dizer "Já publicado em {link}. Não poste de novo." (sem link: "Já publicado por esta
    crew. Não poste de novo."), também nas entregas seguintes da execução. Na entrega avulsa,
    `publicado.json` não é gravado: a frase vale só para a chamada que traz `--publicado`.
25. **Um "sim" por passo irreversível.** Com dois passos de publicação, cada um pede a sua
    confirmação, com o nome do canal. No build, os Gates 2b e 2c passam a aceitar passo
    irreversível "precedido por um checkpoint ou por outro passo irreversível" (H1-10).

**Verificador, export e PDF**
26. **O verificador ganha linhas na tabela**: assunto e prévia de e-mail, mensagem de WhatsApp,
    cada tweet de `twitter-thread` e as imagens (regra 10). Toda peça é contada como será entregue
    (regra 6): legenda, post e tweet, com as hashtags no fim; o tweet de `=== TWEET ===`, inteiro.
    O número do relatório é o de caracteres do texto do arquivo entregue (emoji vale 1; a quebra
    de linha do fim não conta).
27. **Export.** O `export.prompt.md` perde `pdf` (método que não executa) e `formatted-post` (a
    entrega por canal o substitui). `csv` fica, e a saída dele vai para `outros/`. Passo antigo com
    `format: pdf` ou `format: formatted-post` recebe um aviso em PT-BR e roda como passo comum. No
    de `format: pdf`, o agente grava o conteúdo em markdown, no caminho do `outputFile` com a
    extensão `.md`, e a validação de saída usa esse caminho: nenhum arquivo `.pdf` é criado.
    Mudam no mesmo commit: README (promessa de PDF e de posts formatados), `discovery.prompt.md`
    (opção "PDF report"), runner e `tests/docs.test.js`.

**Arquivos citados dentro das fontes**
28. O `conferir-fontes.mjs` passa a ler as fontes `.md` (arquivo listado em `fontes:`; em pasta, os
    `.md` do primeiro nível) e a conferir os nomes de arquivo **citados** nelas.
    - *Citado*: nome com extensão `png`, `jpg`, `jpeg`, `svg`, `webp`, `gif`, `pdf`, `docx`, `ai`,
      `eps` ou `psd`, escrito entre crases, numa célula de tabela (a célula inteira, sem espaços
      nas pontas, é o nome) ou em linha de árvore (`├──`, `└──`). Não conta: URL, nome com `{`,
      `}`, `*`, `<` ou `>`, nome em texto corrido.
    - *Onde procurar*: citado com pasta, relativo à pasta da fonte e depois à raiz; citado sem
      pasta, qualquer arquivo do projeto com esse nome, sem diferenciar maiúsculas.
    - *Parecido*: só entre arquivos (não pastas) com extensão da lista acima. Primeiro, os de
      nome igual depois de tirar caixa, acento e separadores (`-`, `_`, espaço); depois, os que
      têm uma palavra de 4 letras ou mais em comum; em cada grupo, ordem alfabética. No máximo 3
      sugestões.
    - É **aviso**: tem seção própria no relatório, não muda `FONTES:OK`/`FONTES:PENDENTE`, não
      para a execução, e `--corrigir` nunca altera uma fonte nem cria `.bak` ao lado dela.
    - Tetos: 20 avisos por chamada (o relatório diz quantos ficaram de fora) e 1 MB por fonte.
      Fonte fora do projeto não é lida.
29. O runner mostra esses avisos uma vez, no início, sem parar, e os entrega aos passos que geram
    imagem, com a ordem: usar um arquivo parecido só se o usuário confirmar.

**`update` (CLI)**
30. O `update` passa a renovar o bloco marcado do `.gitignore`, que ganha `.opencrew-backup/` e o
    comentário "gerenciado pelo OpenCrew: suas linhas ficam fora deste bloco":
    (a) com bloco: troca o bloco, linhas do usuário intactas; se o conteúdo do bloco não é igual a
    nenhum que o OpenCrew já entregou (lista literal no código, comparada sem CRLF/LF), o arquivo
    é copiado para `.opencrew-backup/<data>/` antes, e o resumo avisa;
    (b) sem marcador, com as 8 linhas do template das versões 1.0.0 a 1.4.1 em sequência: essas
    linhas viram o bloco marcado, no mesmo lugar, sem repetir nenhuma; a linha `STATUS.md` (das
    versões 1.4.0 e 1.4.1) e as demais ficam;
    (c) sem marcador e diferente: o bloco é anexado no fim; (d) arquivo ausente: é criado;
    (e) segundo `update`: nada muda;
    (f) marcador órfão (só o de início ou só o de fim, sem bloco completo): nenhuma linha é
    apagada, o arquivo anterior vai para `.opencrew-backup/<data>/` e o bloco novo, completo, é
    anexado no fim; havendo um bloco completo e um marcador sobrando, vale o caso (a) sobre o
    bloco completo. O fim de linha do arquivo é mantido.
    O `.env.example` não entra: não muda desde a 1.0, e repetir chaves faz dano.
31. `update` sobre instalação interrompida (`_opencrew/core` sem o arquivo
    `_opencrew/.opencrew-version`, o stamp de versão) não escreve nada, não carimba e manda rodar
    o `init` (H1-02).

**Dashboard e regras do projeto**
32. **O Escritório (o antigo dashboard) não muda nesta fase.** Runner, prompts, `preferences.md` e
    o `state.json` ficam como a fase E1 (1.7.0) os deixou (`specs/fase-e1-escritorio-ao-vivo.md`).
    Daqui só valem: o `update`
    não toca em `preferences.md` nem em `crews/*/state.json`, e a linha `crews/*/state.json`
    continua no bloco do `.gitignore`.
33. **Regra 15 do AGENTS.md**, com linha na tabela Regra → Trava: "Script do runtime só escreve
    onde foi combinado: arquivos da crew (com `.bak`), a pasta de saída da crew
    (`crews/<crew>/output/`) e o destino declarado; nunca sobrescreve arquivo do usuário, e só
    apaga a própria pasta de entrega e os temporários que ele mesmo criou." A pasta de entrega é
    `entrega/` ou `entrega-avulsa/` (regra 12). Trava: U3a-14b (`tests/entregar*.test.js`) e
    U3a-11b (`tests/conferir-fontes-citados.test.js`). O `system.md` (Language Handling) ganha a
    exceção: nomes de pasta e de arquivo da entrega e o LEIA-ME são PT-BR fixo. Scripts novos em
    módulos de até 200 linhas (`scripts/entrega/`, `scripts/conferir-fontes/citados.mjs`).

## 6. Erros e casos-limite
As mensagens com `{n}` concordam em número ("1 pendência", "2 pendências"; "1 arquivo novo", "2
arquivos novos").

| Situação | Comportamento | Mensagem |
|---|---|---|
| Pasta atual sem `_opencrew/` | código 1, sem status, nada escrito | "Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto." |
| Opção desconhecida | código 1, nada escrito | "Opção desconhecida: {opção}." e o uso |
| `--crew` ou `--arquivo` ausente | código 1, nada escrito | "Falta a opção obrigatória {opção}." e o uso |
| `--ajuda` | só imprime o uso; código 0 | o uso, em PT-BR |
| `--crew` inexistente ou sem `crew.yaml` | código 1 | "Crew não encontrada: {caminho}" |
| `--crew` ou item de `--arquivo` fora do projeto | código 1, nada lido nem escrito | "Caminho fora do projeto: {caminho}" |
| `--run` com `/`, `\` ou `..`, ou pasta inexistente | código 1 | "Execução não encontrada: {run}. Execuções desta crew: {lista}." |
| Nenhum arquivo da lista existe | código 1 | "Nenhum arquivo da lista foi encontrado." |
| Item da lista não existe ou é pasta | pendência do canal dele; os outros seguem | "Não encontrei {arquivo}." |
| Arquivo de serviço na lista | não entra; aviso | "{arquivo} é arquivo de serviço e não entra na entrega." |
| Formato sem canal conhecido | vai para `outros/` | "{arquivo} não tem canal conhecido. Está em `outros/`." |
| Nenhuma peça que gere arquivo foi achada | arquivo inteiro na pasta do canal | "Não encontrei {peça} em {arquivo}. Confira antes de colar." |
| Falta uma peça e outra foi achada | só as achadas viram arquivo; sem aviso | — |
| Dois arquivos com o mesmo nome para a mesma pasta | prefixo `2-`, `3-` nos da pasta de origem seguinte; nada é sobrescrito | "{arquivo} tem o mesmo nome de outro e foi guardado como {novo nome}." |
| Extensão diferente do conteúdo da imagem | copia; aviso | "{arquivo} tem extensão .jpg, mas é um PNG." |
| `.png`, `.jpg` ou `.jpeg` que não é PNG nem JPEG por dentro, em formato com limites de imagem | bloqueio do verificador | "Imagem ilegível: {arquivo}" |
| O mesmo, em formato sem limites de imagem ou sem formato | copia; aviso | "Não consegui ler {arquivo} como imagem." |
| HTML editável cita arquivo deste computador | copia; aviso sem o caminho | "{arquivo} usa imagens deste computador e pode não abrir em outro." |
| Destino absoluto, fora do projeto, raiz, pasta reservada, atalho para fora ou ilegível no `crew.yaml` | sem cópia; a entrega fica na execução; `INCOMPLETA` | "Não copiei: o destino precisa ser uma pasta dentro do projeto, fora de {pastas reservadas}. Recebi: {valor}." |
| Destino não existe | é criado | "Criei a pasta {destino}." |
| Cópia igual já existe | nada é copiado | "A cópia em {pasta} já está atualizada." |
| Cópia já existe e a entrega só acrescenta arquivos | os novos entram na mesma pasta; nada é sobrescrito | "Completei a cópia em {pasta}: {n} arquivos novos." |
| Cópia diferente, da mesma execução | pasta nova; a anterior só ganha o aviso no LEIA-ME | "Guardei em {pasta nova}. A anterior ficou como estava." |
| Falha de escrita | nada pela metade (ao completar uma cópia, fica o que já entrou, igual à entrega); `INCOMPLETA` | "Não consegui gravar {arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo." |
| Canal com pendência | "não está pronto"; sem cópia; `INCOMPLETA` | "{canal} não está pronto: {n} pendências." |
| Pendência nova depois de uma ressalva | `INCOMPLETA`; `ressalvas.json` não muda | "Há pendência nova, que você ainda não aceitou: {item}." |
| `ressalvas.json` ou `publicado.json` ilegível | tratado como vazio; aviso | "Não consegui ler {arquivo}. Segui sem ele." |
| `--publicado` ou `--vai-publicar` com canal fora da entrega | código 1 | "Canal não encontrado nesta entrega: {canal}." |
| `--publicado` com link que não começa por `http` | código 1 | "Link inválido em --publicado: {valor}. Use o link completo (https://…)." |
| `--lembrar-destino` com destino inválido | código 1; `crew.yaml` intacto | a mensagem do destino recusado |
| Passo antigo com `format: pdf` ou `formatted-post` | aviso; roda como passo comum; o de `pdf` grava `.md` | "O formato "{id}" não é mais gerado. O passo segue sem ele e grava o texto em markdown. Para ter um PDF, use Imprimir → Salvar como PDF." |
| Publicador sem `entrega/` nesta execução | avisa; segue pelo caminho da 1.6.0, com prévia e confirmação | "Não há entrega nesta execução. Vou montar a legenda a partir do conteúdo aprovado, como antes: confira na prévia." |
| Publicador com `entrega/`, mas sem legenda | para e pergunta | "Não encontrei a legenda aprovada na entrega. Veja o LEIA-ME e me diga qual texto usar." |
| Publicador com mais de uma legenda ou conjunto | para e pergunta | "Há {n} posts de Instagram nesta entrega. Qual você quer publicar?" |
| Script de entrega não rodou | o runner avisa e mostra os arquivos aprovados | "⚠️ A entrega automática não rodou: {motivo}" |
| Crew sem checkpoint de aprovação final | a entrega roda; o runner avisa junto do resumo | "Esta crew não tem aprovação final: confira os arquivos antes de usar." |
| Passo irreversível de canal com ressalva | a confirmação do passo repete as ressalvas | "Este canal tem ressalva: {lista}. Publicar assim?" |
| Passo irreversível de canal com `[PREENCHER]` aceito | o passo não roda; o runner avisa | "{canal} ainda tem [PREENCHER]: não publico. Fica para postar à mão." |
| Fonte acima de 1 MB ou fora do projeto | não é lida | "Não li {fonte}: {motivo}." |
| Mais de 20 arquivos citados faltando | 20 avisos | "… e mais {n} arquivos citados que não encontrei." |
| `update` em instalação interrompida | código 1, nada escrito | "A instalação anterior não terminou. Rode `npx @aksp/opencrew init` para concluir." |
| `.gitignore` com bloco alterado pelo usuário ou com marcador órfão | cópia de segurança antes de mexer | listada no resumo do `update` |

## 7. Segurança
Nenhum acesso à rede. Os scripts só leem dentro do projeto: item de `--arquivo` fora dele é erro
de uso. `entregar.mjs` só escreve na pasta de saída da crew (`crews/<crew>/output/`: a pasta da
execução ou, na entrega avulsa, `entrega-avulsa/` e os arquivos `entrega-avulsa-*`), no
`crew.yaml` (só com `--lembrar-destino`, com `.bak`) e no destino validado, resolvido com o
caminho real para barrar atalhos. Só apaga a própria `entrega/` (ou `entrega-avulsa/`) e os
temporários dele. No destino, nunca sobrescreve: a exceção é o `LEIA-ME.md` que ele mesmo gerou.
Resumo e LEIA-ME não mostram caminho absoluto. `ressalvas.json` guarda trechos do texto do
usuário e fica em `crews/*/output/`, fora do git. `--corrigir` nunca toca numa fonte do projeto. O
`update` nunca altera `crews/`.

## 8. Cenários BDD
Sem QUANDO, a ação é rodar `entregar.mjs` com os itens citados (U3a-01 a 08), `verificar.mjs`
(U3a-04e, 04f, o 2º caso do 04p e o grupo 09), `publish.js` (U3a-08j e 08p),
`conferir-fontes.mjs` (U3a-11) ou `update` (U3a-12, 13c e upg). Cenário marcado "(contrato)" lê
o texto do arquivo citado. Em cenário com mais de um DADO…ENTÃO, cada par vira um teste próprio,
com o mesmo ID e o caso no nome.

**U3a-01 — O que entra**
- **U3a-01a** DADOS `v1/pesquisa.md`, `v2/post.md` e `v3/revisao.md` e a lista só com
  `v2/post.md=blog-post` ENTÃO a entrega tem o artigo e nenhum texto de `v1` nem de `v3`.
- **U3a-01b** DADOS na lista `verificacao-ciclo-1.md`, `ressalvas.json`, `publicado.json`,
  `caption.txt` e `state.json` (os dois direto na pasta da execução), `export/temp.html`,
  `entrega/instagram/legenda.txt` e `entrega-avulsa-ressalvas.json` ENTÃO nenhum entra e o resumo
  avisa cada um; DADO `v2/caption.txt=instagram-feed` na lista ENTÃO ele entra.
- **U3a-01c** DADOS um arquivo que existe, um `=linkedin-post` que não existe e uma pasta
  `=twitter-post` ENTÃO o primeiro é entregue e os dois canais não estão prontos (`INCOMPLETA`).
- **U3a-01d** DADOS arquivos soltos, sem `--run` ENTÃO a entrega nasce em `output/entrega-avulsa/`
  e, com destino, a cópia está em `<destino>/entrega-avulsa/`.
- **U3a-01e** (contrato) `entrega.prompt.md` traz a unidade de versão da regra 2, o formato do
  passo de renderização, o que fica de fora e a confirmação da lista em execução já encerrada.

**U3a-02 — Canal**
- **U3a-02a** DADO um item de cada um dos 14 formatos de plataforma do core ENTÃO cada um está na
  pasta do seu `platform:`; DADO um formato que só existe em `best-practices.local/`, com
  `platform: "blog"` ENTÃO o arquivo está em `blog/`, com o nome original.
- **U3a-02b** DADOS um item sem `=formato` e sem seção de canal, um com formato inexistente e um
  com `platform: "outra-rede"` ENTÃO os três estão em `outros/` e no LEIA-ME.
- **U3a-02c** DADO `title:` de 120 caracteres no frontmatter de um `=linkedin-post` ENTÃO existe
  `linkedin/post.txt` e não há pendência de título.
- **U3a-02d** DADO um item sem `=formato`, com `title:` de 120 caracteres no frontmatter ENTÃO ele
  está em `outros/`, sem pendência, e o final é `ENTREGA:OK`.
- **U3a-02e** DADO `best-practices.local/instagram-feed.md` sem `platform:` ENTÃO o item
  `=instagram-feed` está em `instagram/`.

**U3a-03 — Peças e texto**
- **U3a-03a** DADOS `=== FORMAT ===`, `=== SLIDES ===`, `=== CAPTION ===` e `=== HASHTAGS ===`
  ENTÃO `instagram/legenda.txt` é a legenda, uma linha em branco e as hashtags, sem "===" e sem
  texto de slide, termina com uma só quebra de linha, e não existe `hashtags.txt`.
- **U3a-03b** DADA a mesma legenda sob `## Legenda`, com as hashtags no fim ENTÃO o `legenda.txt`
  é igual, byte a byte, ao da U3a-03a.
- **U3a-03c** DADO `**Promoção** de _verão_ com @ana__lima, #meu_negocio e
  [o site](https://exemplo.org/a__b)` ENTÃO o `.txt` traz `Promoção de verão com @ana__lima,
  #meu_negocio e o site: https://exemplo.org/a__b`; DADA a linha `Fale com
  ana_maria_lima@exemplo.org, veja https://exemplo.org/?utm_source=a_b&utm_medium=c_d, abra
  relatorio_final_2026 e calcule 2 * 3 * 4` ENTÃO ela sai igual.
- **U3a-03d** DADOS um post e um blog em CRLF com BOM ENTÃO `post.txt` e `artigo.md` saem em UTF-8
  sem BOM, com LF, com as mesmas palavras na mesma ordem.
- **U3a-03e** DADOS três posts de LinkedIn num arquivo, cada um sob um título de bloco e seguido
  de "Primeiro comentário" ENTÃO existem `post-1.txt`, `post-1-comentario.txt` …
  `post-3-comentario.txt`, e o LEIA-ME lista cada arquivo com o título do seu bloco; DADO um post
  só ENTÃO existe `post.txt`.
- **U3a-03f** DADA uma thread com cinco blocos `TWEET n/5` e `=== THREAD NOTES ===` ENTÃO existem
  `tweet-1.txt` … `tweet-5.txt`, sem a linha "TWEET n/5" e sem as notas.
- **U3a-03g** DADO um blog com frontmatter (`title`, `meta_description`, `palavra_chave`) e um
  comentário HTML ENTÃO `artigo.md` não tem frontmatter nem o comentário, e `seo.txt` tem as
  linhas `Título: …`, `Meta description: …` e `Palavra-chave: …`, nesta ordem, sem linha de slug.
- **U3a-03h** DADO um blog em rótulos (`=== TARGET KEYWORD ===` com "Primary: horta em casa |
  Secondary: horta em apartamento" e "Search intent: …", `=== TITLE TAG ===`,
  `=== META DESCRIPTION ===`, `=== BODY ===`, `=== SEO CHECKLIST ===`) ENTÃO `seo.txt` tem título,
  meta description e a palavra-chave "horta em casa", sem "Secondary"; `artigo.md` não tem "===",
  o checklist, o texto do título, o da meta description nem as linhas `Primary:` e
  `Search intent:`.
- **U3a-03i** DADO um e-mail com `=== SUBJECT LINE ===`, `=== PREVIEW TEXT ===`, o corpo em
  `=== BODY ===` e `=== EMAIL NOTES ===` ENTÃO existem `assunto.txt`, `previa.txt` e `corpo.md`,
  este sem as notas; DADO um arquivo com três e-mails, cada um aberto por
  `=== SUBJECT LINE ===` ENTÃO `assunto-1.txt` … `corpo-3.md`.
- **U3a-03j** DADA uma mensagem de WhatsApp com `**oferta**`, `*hoje*` e `{{name}}` ENTÃO
  `mensagem.txt` traz `*oferta*`, `*hoje*` e `{{name}}`; DADA a mensagem escrita com
  `=== GREETING ===`, `=== BODY ===`, `=== CTA ===` e `=== SIGNATURE ===` ENTÃO `mensagem.txt` não
  tem "===" e traz os quatro textos, na ordem, separados por uma linha em branco.
- **U3a-03k** DADO um roteiro `=instagram-reels` com `=== REEL SCRIPT ===`, `=== CAPTION ===` e
  `=== AUDIO NOTE ===` ENTÃO o corpo está em `instagram/`, com o nome original, sem a nota e com
  as linhas `=== REEL SCRIPT ===` e `=== CAPTION ===`; DADO um `=linkedin-article` com
  `=== SECTION 1: Por que mudar ===` ENTÃO "Por que mudar" está no arquivo entregue.
- **U3a-03l** DADO um arquivo `=instagram-feed` sem legenda reconhecível ENTÃO ele está inteiro em
  `instagram/` e o LEIA-ME diz "Não encontrei a legenda".
- **U3a-03m** DADO um arquivo `=instagram-feed` com `## Legenda Instagram` e `## Post LinkedIn`
  ENTÃO existem `instagram/legenda.txt` e `linkedin/post.txt`; DADO um artigo `=blog-post` com o
  cabeçalho `## Como escrever um post no LinkedIn` ENTÃO a seção fica em `artigo.md` e não existe
  `linkedin/`.
- **U3a-03n** DADO um `.csv` sem formato ENTÃO a cópia em `outros/` é igual, byte a byte.
- **U3a-03o** DADO um arquivo sem `=formato` com `## Legenda Instagram`, `## Post LinkedIn` e
  `## Anotações` ENTÃO existem `instagram/legenda.txt` e `linkedin/post.txt`, nada vai para
  `outros/` e o LEIA-ME aponta o arquivo de origem.
- **U3a-03p** DADO um `=email-sales` com `=== SUBJECT LINE ===` e o corpo em `=== OPENER ===`, sem
  prévia ENTÃO existem `assunto.txt` e `corpo.md`, não existe `previa.txt` e não há aviso.
- **U3a-03q** DADOS `reels/v1/roteiro.md=instagram-reels` e
  `stories/v1/roteiro.md=instagram-stories` ENTÃO existem `instagram/roteiro.md` e
  `instagram/2-roteiro.md`, e o LEIA-ME diz a origem de cada um.
- **U3a-03r** DADO um `=instagram-feed` com `## Carrossel` e, dentro dele,
  `### Slide 4 — LinkedIn para vender` ENTÃO não existe `linkedin/`.
- **U3a-03s** DADO um `=instagram-feed` com legenda e slides, sem imagem do formato na lista ENTÃO
  existem `instagram/legenda.txt` e o arquivo de origem, inteiro, com o nome original; DADA a
  mesma lista com uma imagem `=instagram-feed` ENTÃO o arquivo de origem não está em `instagram/`.
- **U3a-03t** DADO um post de LinkedIn com a linha `### Três passos`, uma linha `---`, o item
  `- primeiro passo` e `[https://exemplo.org](https://exemplo.org)` ENTÃO o `.txt` traz "Três
  passos" sem `#`, não traz a linha `---`, mantém `- primeiro passo` e traz a URL uma vez só.
- **U3a-03u** DADOS, um por vez, um roteiro `=instagram-reels`, um `=email-newsletter` com
  `=== SUBJECT LINE ===` e `=== BODY ===` e um `=linkedin-article`, cada um com a seção
  `## Legenda Instagram` de 2.300 caracteres (no e-mail, dentro do corpo) ENTÃO não existe
  `legenda.txt`, não há bloqueio de legenda e a seção está no arquivo entregue (o roteiro,
  `corpo.md` ou o artigo).
- **U3a-03v** DADO um `=instagram-feed` com `## Legenda` e, depois, `## Hashtags` com cinco
  hashtags ENTÃO o `legenda.txt` é a legenda, uma linha em branco e as cinco hashtags, sem a
  linha `## Hashtags`.

**U3a-04 — Imagens e editáveis**
- **U3a-04a** DADOS oito PNG 1080×1350, `slide-01.png` a `slide-08.png`, `=instagram-feed` ENTÃO
  os oito estão em `instagram/` com o mesmo nome e os mesmos bytes, sem aviso de JPEG.
- **U3a-04b** DADA uma imagem só ENTÃO não há bloqueio nem alerta; DADOS `slide-01`, `slide-02` e
  `slide-04` ENTÃO não existe `slide-03` na entrega.
- **U3a-04c** DADO um PNG salvo como `slide-02.jpg` ENTÃO ele é copiado e o LEIA-ME avisa que é PNG.
- **U3a-04d** DADO um `slide-05.png=instagram-feed` com conteúdo de texto ENTÃO bloqueio "Imagem
  ilegível" e o canal `instagram` não está pronto.
- **U3a-04e** (verificador) DADAS 11 imagens ENTÃO bloqueio 11/10; DADA uma 1080×1440 ENTÃO
  bloqueio de proporção (0,75); DADAS 1200×628 e 1200×627 ENTÃO as duas passam (1,91); DADA uma
  1200×626 ENTÃO bloqueio (1,92); DADAS uma 1080×1350 e uma 1080×1080 na mesma pasta ENTÃO alerta
  de proporções diferentes.
- **U3a-04f** DADOS `images_max: 20` em `best-practices.local/instagram-feed.md` e 11 imagens
  ENTÃO não há bloqueio.
- **U3a-04g** DADA uma imagem `=linkedin-post` 1200×627 em PNG ENTÃO ela está em `linkedin/` e
  aparece no LEIA-ME como "não medido".
- **U3a-04h** DADOS `slide-01.html` e `slide-01.png`, ambos `=instagram-feed` ENTÃO o HTML está em
  `editaveis/` e o LEIA-ME não traz "Não encontrei" para nenhum dos dois; DADO `relatorio.html`,
  sem imagem de mesmo nome e sem formato ENTÃO ele está em `outros/`.
- **U3a-04i** DADO um HTML com `src="file:///…"` ENTÃO ele é copiado e o LEIA-ME avisa, sem
  mostrar o caminho.
- **U3a-04j** (contrato) `instagram-feed.md` tem os quatro limites da regra 10, com os valores
  dela; `image-creator/SKILL.md` e `image-design.md` não mandam embutir imagem por caminho
  absoluto (saem "Embed images as absolute paths" e "referenced as absolute paths").
- **U3a-04k** DADOS dois conjuntos, de pastas diferentes, ambos com `slide-01.png`, e `capa.png`
  só na segunda pasta ENTÃO a entrega tem `slide-01.png`, `2-slide-01.png` e `2-capa.png`, e o
  resumo avisa.
- **U3a-04l** (contrato) o runner, na verificação antes do revisor, passa as imagens e os HTML do
  passo de renderização com o `=formato` do passo de conteúdo que eles renderizam.
- **U3a-04m** DADA `capa.webp=instagram-feed` ENTÃO ela está em `instagram/`, igual, byte a byte,
  e aparece no LEIA-ME em "O que não foi conferido".
- **U3a-04n** DADOS `slide-01.html`, `slide-01.png` e uma legenda de 2.300 caracteres, todos
  `=instagram-feed`, e um destino ENTÃO o destino não tem `instagram/` nem o HTML em
  `editaveis/`, e o LEIA-ME não cita `editaveis/slide-01.html`.
- **U3a-04o** DADO um `foto.png=linkedin-post` com conteúdo de texto ENTÃO ele é copiado para
  `linkedin/`, o LEIA-ME avisa "Não consegui ler" e não há bloqueio.
- **U3a-04p** DADOS `slide-01.html` com `<img src="logo.png">`, `slide-01.png` 1080×1350 e
  `logo.png` 800×200, todos `=instagram-feed` ENTÃO `logo.png` está em `editaveis/` e não em
  `instagram/`, não há bloqueio de proporção e o conjunto tem 1 imagem; DADOS os mesmos três
  itens no verificador ENTÃO não há bloqueio e `logo.png` não é medido; DADA a mesma lista sem o
  `slide-01.html` ENTÃO `logo.png` é medido como slide (bloqueio de proporção: 4,0); DADO o mesmo
  slide citando `logo.svg`, com `logo.svg=instagram-feed` na lista ENTÃO `logo.svg` está em
  `editaveis/` e não em `instagram/`.

**U3a-05 — Pasta e destino**
- **U3a-05a** DADA uma entrega com oito imagens e, depois, outra da mesma execução com seis ENTÃO
  `entrega/instagram/` tem seis, e nenhum arquivo fora de `entrega/` foi apagado.
- **U3a-05b** DADAS as mesmas entradas duas vezes ENTÃO todos os arquivos de `entrega/` são iguais,
  byte a byte, e o LEIA-ME não tem hora.
- **U3a-05c** DADO o destino `Conteudo/Prontos`, que não existe ENTÃO ele é criado, a cópia está em
  `Conteudo/Prontos/<run_id>/` e o resumo diz "Criei a pasta".
- **U3a-05d** DADAS duas execuções com o mesmo destino ENTÃO há duas subpastas, sem arquivo de uma
  na outra.
- **U3a-05e** DADA a mesma execução entregue de novo, sem mudança ou só com CRLF no lugar de LF num
  `.txt` do destino ENTÃO nenhuma pasta é criada e nenhum arquivo do destino muda.
- **U3a-05f** DADA a mesma execução com a legenda alterada ENTÃO existe `<run_id>-reentrega-2/` com
  a entrega inteira; em `<run_id>/`, só o LEIA-ME muda (ganha, no começo, o aviso da pasta nova) e
  os outros arquivos continuam iguais, byte a byte.
- **U3a-05g** DADA uma nova chamada com `--publicado instagram=https://exemplo.org/p/1`, sem outra
  mudança ENTÃO o LEIA-ME do destino é atualizado e nenhuma pasta é criada.
- **U3a-05h** DADOS, um por vez, os destinos `C:/x`, `/x`, `\x`, `../fora`, `.`, `_opencrew/x`,
  `crews/x`, `Crews/x`, `skills/x`, `.git/x`, `node_modules/x`, um atalho que aponta para fora do
  projeto e um caminho que é arquivo ENTÃO não há cópia, nada é escrito fora do projeto, o final é
  `ENTREGA:INCOMPLETA` e `entrega/` existe na execução.
- **U3a-05i** DADO `destino: "Conteúdo Pronto/Semana"   # comentário` ENTÃO o destino lido é
  `Conteúdo Pronto/Semana`; DADO `destino: nao` ou `destino: não` ENTÃO não há cópia nem aviso, e
  nenhuma pasta com esse nome é criada; DADO `--destino` ENTÃO ele vence o `crew.yaml`; DADO
  `destino:` com uma lista ENTÃO vale como destino recusado.
- **U3a-05j** DADO que em `<destino>/` já existe um arquivo chamado `<run_id>` (a pasta não pode
  ser criada) ENTÃO não fica pasta parcial nem temporária em `<destino>/`, esse arquivo continua
  igual, a mensagem cita o caminho e o final é `ENTREGA:INCOMPLETA`.
- **U3a-05k** DADO `--lembrar-destino Conteudo/Prontos` ENTÃO o `crew.yaml` tem `entrega.destino`,
  `crew.yaml.bak` é o arquivo anterior e as outras linhas não mudam; DADO um `crew.yaml.bak` que
  já existia ENTÃO ele continua igual, byte a byte, e a cópia nova é `crew.yaml.bak-<data-hora>`;
  DADO `--lembrar-destino nao` ENTÃO fica `destino: nao`; DADO `--lembrar-destino ../fora` ENTÃO
  código 1 e `crew.yaml` intacto.
- **U3a-05l** (contrato) `entrega.prompt.md` faz a pergunta da regra 16 uma vez, depois do resumo,
  manda repetir a chamada com `--lembrar-destino`, grava também o "não" e, sem destino, manda
  mostrar o caminho da entrega.
- **U3a-05m** DADO um `anotacoes.txt` posto pelo usuário em `<destino>/<run_id>/` e nova chamada
  sem mudança ENTÃO nenhuma pasta é criada e o arquivo continua lá; DADO um arquivo a mais dentro
  de `<destino>/<run_id>/instagram/` ENTÃO a cópia vai para `<run_id>-reentrega-2/` e esse arquivo
  continua onde estava.
- **U3a-05n** DADO que ao lado de `entrega/` existe um arquivo chamado `entrega.tmp` (a pasta
  temporária não pode ser criada) ENTÃO a `entrega/` anterior continua inteira, byte a byte, esse
  arquivo continua igual, a mensagem cita o caminho e o final é `ENTREGA:INCOMPLETA`.
- **U3a-05o** DADA a entrega da U3a-07a (o destino tem `blog/` e não tem `instagram/`) e, depois,
  a mesma execução com a legenda corrigida ENTÃO `instagram/` está em `<destino>/<run_id>/`, os
  arquivos de `blog/` continuam iguais, byte a byte, o resumo diz "Completei a cópia" e não existe
  pasta `-reentrega-`.

**U3a-06 — Contrato do script**
- **U3a-06a** DADA uma pasta sem `_opencrew/` ENTÃO código 1, mensagem em PT-BR, nenhuma linha
  `ENTREGA:` e nada escrito.
- **U3a-06b** DADO `--destno x` ENTÃO código 1, "Opção desconhecida" e o uso; DADA uma chamada sem
  `--arquivo` ENTÃO código 1, "Falta a opção obrigatória --arquivo" e o uso; nos dois casos, nada
  escrito; DADO `--ajuda` ENTÃO o uso, código 0 e nada escrito.
- **U3a-06c** DADOS, um por vez, `--crew crews/nao-existe`, `--crew .`,
  `--crew ../vizinho/crews/c`, `--arquivo "../fora/x.md=blog-post"`, `--run ../x`,
  `--run nao-existe` e uma lista só com arquivos inexistentes ENTÃO código 1, a mensagem da §6 e
  nada escrito; no caso do `--run`, a mensagem lista as execuções que existem.
- **U3a-06d** DADOS um blog e um carrossel (legenda e oito imagens), sem pendência ENTÃO existem
  `LEIA-ME.md`, `blog/artigo.md`, `blog/seo.txt`, `instagram/legenda.txt` e as oito imagens, não
  existem `outros/` nem `editaveis/`, o final é `ENTREGA:OK`, o código é 0 e não existe
  `ressalvas.json`.
- **U3a-06e** DADA a entrega da U3a-06d ENTÃO o LEIA-ME tem os títulos fixos da §4, na ordem e só
  dos canais presentes; cada canal traz uma das quatro situações; todo arquivo citado com caminho
  relativo à pasta do LEIA-ME existe; a seção do blog traz a linha do markdown; há "Imprimir →
  Salvar como PDF" e nenhum caminho absoluto; DADO um Instagram sem imagens ENTÃO a seção não
  cita imagem; DADA uma entrega só de imagens ENTÃO o LEIA-ME não tem `## Para ter um PDF`.
- **U3a-06f** DADA uma entrega com um item de cada canal ENTÃO a seção de cada canal traz os
  passos do quadro "Passos por canal" da §4, com o texto dele, e só os passos cujo arquivo existe.

**U3a-07 — Pendências**
- **U3a-07a** DADOS uma legenda de 2.300 caracteres, um blog sem pendência e um destino ENTÃO
  `instagram` não está pronto, o destino tem `blog/` e não tem `instagram/`, o LEIA-ME não cita
  arquivo de `instagram/` e o final é `ENTREGA:INCOMPLETA`.
- **U3a-07b** DADO `[PREENCHER: link do artigo]` no post de LinkedIn ENTÃO o canal não está pronto
  e o LEIA-ME lista, em `## Antes de usar`, o trecho e o arquivo de origem.
- **U3a-07c** DADO o caso da U3a-07a num workspace novo, com `--aceitar-pendencias` ENTÃO
  `ressalvas.json` tem o arquivo, o item da legenda (com o nome que o relatório usa) e o trecho
  `2300/2200`; `instagram/` está em `<destino>/<run_id>/`; o final é `ENTREGA:COM_RESSALVA` e o
  LEIA-ME abre com a ressalva.
- **U3a-07d** DADA a U3a-07c e nova chamada sem a opção e sem mudança ENTÃO `ENTREGA:COM_RESSALVA`.
- **U3a-07e** DADA a U3a-07c e um placeholder novo no texto ENTÃO `ENTREGA:INCOMPLETA`, a mensagem
  de pendência nova, e `ressalvas.json` não muda; DADA a U3a-07c e a legenda passando de 2.300
  para 2.250 caracteres ENTÃO `ENTREGA:INCOMPLETA`.
- **U3a-07f** DADOS um alerta (afirmação a confirmar) e um item "não medido" ENTÃO os dois estão em
  "O que não foi conferido", a seção traz os três itens fixos (links e fatos; texto dentro das
  imagens; aparência final em cada rede) e o final é `ENTREGA:OK`.
- **U3a-07g** DADA qualquer entrega ENTÃO o relatório existe (`verificacao-entrega.md`; na avulsa,
  `output/entrega-avulsa-verificacao-entrega.md`) e é igual ao que o verificador devolve para os
  mesmos itens no modo da entrega (sem o padrão `blog-post`).
- **U3a-07h** DADO um arquivo inexistente e `--aceitar-pendencias` ENTÃO `ENTREGA:INCOMPLETA`.
- **U3a-07i** DADO um `ressalvas.json` ou um `publicado.json` ilegível ENTÃO ele vale como vazio e
  o resumo avisa.
- **U3a-07j** DADA a U3a-07e (placeholder novo) e nova chamada com `--aceitar-pendencias` ENTÃO
  `ressalvas.json` tem as duas pendências e o final é `ENTREGA:COM_RESSALVA`.
- **U3a-07k** DADO o primeiro arquivo da U3a-03m com `[PREENCHER: link]` ENTÃO `instagram` e
  `linkedin` não estão prontos.
- **U3a-07l** DADA uma entrega avulsa aceita com `--aceitar-pendencias` e, depois, outra entrega
  avulsa com o mesmo `[PREENCHER]`, sem a opção ENTÃO existe `entrega-avulsa-ressalvas.json` e o
  final da segunda é `ENTREGA:INCOMPLETA`.
- **U3a-07m** DADO o caso da U3a-07b com `--aceitar-pendencias` ENTÃO o LEIA-ME lista, em
  `## Antes de usar`, `linkedin/post.txt` e o trecho.
- **U3a-07n** DADO o primeiro arquivo da U3a-03m com o post de LinkedIn de 3.100 caracteres ENTÃO
  bloqueio 3100/3000, `linkedin` não está pronto e `instagram` está.
- **U3a-07o** DADO um arquivo sem `=formato` com `## Legenda Instagram` de 2.300 caracteres ENTÃO
  bloqueio 2300/2200 e `instagram` não está pronto.
- **U3a-07p** DADOS `slide-01.html` com `[Nome]` no texto e `slide-01.png`, ambos
  `=instagram-feed` ENTÃO `instagram` não está pronto.

**U3a-08 — Runner e publicação**
- **U3a-08a** (contrato) o runner tem a seção `### Entrega`, com até 15 linhas: chama
  `entregar.mjs` com a execução aprovada, imediatamente antes do primeiro passo que publica ou
  envia (pela marca `side_effects: irreversible` do passo ou da skill) ou, sem ele, depois do
  último passo; não o chama em execução rejeitada ou abortada; em crew sem checkpoint de aprovação
  final, chama nos mesmos momentos e mostra o aviso "Esta crew não tem aprovação final: confira
  os arquivos antes de usar."; mostra a saída quando a execução para num passo irreversível; cita
  `prompts/entrega.prompt.md` (que existe). O runner não tem mais "Output saved to" nem "Save
  final output".
- **U3a-08b** (contrato) `entrega.prompt.md` traz as três opções de `INCOMPLETA` e o que cada uma
  faz; passa `--aceitar-pendencias` só na opção 2 ou quando as pendências são só as aceitas no
  laço de revisão; não roda passo irreversível de canal que não está pronto sem a opção 2; em
  canal com ressalva, a confirmação do passo irreversível traz "Este canal tem ressalva: {lista}.
  Publicar assim?"; canal com `[PREENCHER]` aceito não é publicado pela crew e fica para postar à
  mão, e, quando o passo não roda por isso, o runner repete a chamada sem `--vai-publicar` desse
  canal, para o LEIA-ME não dizer que a crew publica sozinha; diz como achar o canal de um passo
  irreversível. No `runner.pipeline.md`, a opção 2 do laço de revisão diz "Aceitar assim mesmo
  (fica registrado na entrega)".
- **U3a-08c** (contrato) script que não rodou: o aviso da §6 e a lista dos arquivos aprovados;
  destino recusado ou falha de gravação: a mensagem e o pedido de outra pasta ou nova tentativa.
- **U3a-08d** (contrato) depois de "editar este conteúdo", a entrega roda de novo.
- **U3a-08e** (contrato) o `SKILL.md` do `instagram-publisher` usa
  `entrega/instagram/legenda.txt` em `--caption-file` e só as imagens do conjunto do post, na
  ordem dos nomes; não manda varrer a pasta nem extrair a legenda dos slides.
- **U3a-08f** (contrato) o mesmo `SKILL.md` diz que o `--dry-run` envia as imagens ao imgBB, por 24
  horas, e cria os contêineres.
- **U3a-08g** DADO `--publicado instagram=https://exemplo.org/p/1` ENTÃO `publicado.json` é
  gravado, o LEIA-ME do canal diz "Já publicado em … Não poste de novo." e a seção do canal não
  traz os passos de postar à mão; DADA a entrega seguinte da mesma execução, sem a opção ENTÃO a
  frase continua.
- **U3a-08h** DADOS, um por vez, `--publicado outra-rede=https://exemplo.org`,
  `--vai-publicar outra-rede` e `--publicado instagram=exemplo` ENTÃO código 1 e a mensagem da §6.
- **U3a-08i** (contrato) os Gates 2b e 2c do build aceitam "checkpoint ou outro passo
  irreversível"; o runner pede uma confirmação por passo irreversível.
- **U3a-08j** (guarda da regra 23: já passa hoje; trava de regressão) DADAS imagens JPEG em
  `crews/x/output/<run>/entrega/instagram/` ENTÃO o `publish.js` as aceita na validação de caminho.
- **U3a-08k** DADA uma entrega avulsa com `--publicado instagram` e, depois, outra entrega avulsa
  de outros arquivos ENTÃO não existe `publicado.json` nem `entrega-avulsa-publicado.json`, e o
  LEIA-ME da segunda não diz "Já publicado".
- **U3a-08l** (contrato) o mesmo `SKILL.md` traz os três casos da regra 23: mais de uma legenda ou
  conjunto (para e pergunta), `entrega/` sem legenda (para e pergunta) e execução sem `entrega/`
  (avisa e segue pelo caminho da 1.6.0, com prévia e confirmação).
- **U3a-08m** DADO `--publicado instagram`, sem link ENTÃO o LEIA-ME do canal diz "Já publicado
  por esta crew. Não poste de novo."
- **U3a-08n** DADO `--vai-publicar instagram` ENTÃO a seção do canal abre com "Esta crew publica
  este canal sozinha. Antes de postar à mão, confira se já saiu."; DADA a chamada seguinte com
  `--publicado instagram` no lugar ENTÃO o aviso sai e fica "Já publicado".
- **U3a-08o** (contrato) `entrega.prompt.md` manda passar `--vai-publicar` na chamada que antecede
  os passos irreversíveis e, depois de publicar, repetir a mesma chamada com `--publicado`, com ou
  sem link.
- **U3a-08p** DADO um `legenda.txt` de 2.200 caracteres mais a quebra de linha do fim ENTÃO o
  `readCaption` do `publish.js` devolve 2.200 caracteres e não há erro de tamanho.

**U3a-09 — Verificador**
- **U3a-09a** DADO um assunto de 75 caracteres (`=email-newsletter` e `=email-sales`) ENTÃO
  bloqueio 75/60; DADA uma prévia de 120 com `=email-newsletter` ENTÃO bloqueio 120/90; com
  `=email-sales` ENTÃO "sem limite definido no formato".
- **U3a-09b** DADA uma mensagem de WhatsApp de 4.200 caracteres ENTÃO bloqueio.
- **U3a-09c** DADAS uma legenda de 2.100 caracteres e hashtags que levam o `legenda.txt` a 2.260
  ENTÃO bloqueio 2260/2200; DADOS um post de LinkedIn de 2.950 caracteres e hashtags em
  `=== HASHTAGS ===` que levam o `post.txt` a 3.020 ENTÃO bloqueio 3020/3000; DADO um
  `=twitter-post` com `=== TWEET ===` de 270 caracteres e `=== HASHTAGS ===` que levam o
  `tweet.txt` a 290 ENTÃO o `tweet.txt` termina com uma linha em branco e as hashtags, e bloqueio
  290/280.
- **U3a-09d** DADOS os arquivos da U3a-03 ENTÃO, para cada peça que vira arquivo próprio (legenda,
  post, tweet, assunto, prévia e mensagem), o número do relatório é igual ao número de caracteres
  do texto do arquivo (emoji vale 1; a quebra de linha do fim não conta).
- **U3a-09e** DADA uma thread em que o terceiro tweet tem 300 caracteres ENTÃO bloqueio "Tweet 3".
- **U3a-09f** DADO `=== TWEET ===`, `=twitter-post`, com dois parágrafos cujo texto, contada a
  linha em branco entre eles, tem 300 caracteres ENTÃO existe um só `twitter/tweet.txt`, com a
  linha em branco, e bloqueio 300/280.

**U3a-10 — Export e PDF**
- **U3a-10a** (contrato) `export.prompt.md` não cita `pdf`, `playwright open` nem `formatted-post`,
  e mantém `csv`.
- **U3a-10b** (contrato) o runner só trata `csv` como formato de export e traz o aviso em PT-BR
  para passo antigo com `pdf` ou `formatted-post`; no de `pdf`, manda gravar em markdown, no
  caminho do `outputFile` com a extensão `.md`, validar esse caminho e não criar arquivo `.pdf`.
- **U3a-10c** (contrato) `discovery.prompt.md` não oferece "PDF report"; o README não promete PDF
  nem posts formatados e descreve a entrega por canal.

**U3a-11 — Arquivos citados dentro das fontes**
- **U3a-11a** DADA uma fonte `.md` que cita `logo-claro.png` numa célula de tabela (a célula é só
  o nome), com `Logo_Clara.png` no projeto ENTÃO um aviso com essa sugestão, `FONTES:OK` e
  código 0.
- **U3a-11b** (guarda da regra 33: já passa hoje; trava de regressão) DADO o caso da U3a-11a com
  `--corrigir` ENTÃO a fonte fica igual, byte a byte, sem `.bak` ao lado dela.
- **U3a-11c** DADA a linha de árvore `├── marca-vertical.svg`, sem arquivo e sem parecido ENTÃO um
  aviso sem sugestão.
- **U3a-11d** DADOS `https://exemplo.org/logo.png`, `{nome}.png`, um nome em texto corrido, um
  nome sem crases no meio da frase de uma célula e um nome que existe em outra pasta, com caixa
  diferente ENTÃO nenhum aviso.
- **U3a-11e** DADOS cinco parecidos, um deles de nome igual depois de normalizar ENTÃO três
  sugestões, com esse em primeiro; DADOS uma pasta e um `.md` com a mesma palavra do nome citado
  ENTÃO nenhum dos dois é sugerido; DADOS 25 nomes faltando ENTÃO 20 avisos e "… e mais 5".
- **U3a-11f** DADA uma fonte que é pasta ENTÃO os `.md` do primeiro nível são lidos; DADAS uma
  fonte de 2 MB e uma de fora do projeto ENTÃO nenhuma é lida, e o relatório diz.
- **U3a-11g** (contrato) o runner mostra os avisos uma vez, não para e os entrega aos passos que
  geram imagem.

**U3a-12 — `update`** (arquivos antigos escritos literalmente no teste, nunca pelo `init` atual)
- **U3a-12a** DADO o `.gitignore` de um workspace 1.6.0, com o bloco marcado e linhas do usuário
  antes e depois ENTÃO o bloco passa a ter `.opencrew-backup/`, as linhas do usuário ficam iguais,
  byte a byte, e não há cópia de segurança.
- **U3a-12b** DADO o mesmo arquivo com `crews/*/output/` apagada de dentro do bloco ENTÃO o arquivo
  anterior está em `.opencrew-backup/<data>/` e o resumo avisa.
- **U3a-12c** DADO o `.gitignore` da 1.4.1 (9 linhas, sem marcador), mais `dist/` ENTÃO há um bloco
  só, nenhuma linha repetida, e `STATUS.md` e `dist/` continuam no arquivo.
- **U3a-12d** DADO um `.gitignore` só com `dist/` e `.env` ENTÃO o bloco é anexado no fim e as duas
  linhas ficam; DADO um projeto sem `.gitignore` ENTÃO ele é criado, só com o bloco.
- **U3a-12e** DADO um segundo `update` em cada caso acima ENTÃO o arquivo fica igual, byte a byte;
  DADO um arquivo em CRLF ENTÃO ele continua em CRLF.
- **U3a-12f** (guarda: já passa hoje; trava de regressão) DADO um `.env.example` com ou sem bloco
  ENTÃO o `update` não o altera.
- **U3a-12g** DADO `_opencrew/core` sem o stamp de versão QUANDO `update` ou `update --check` ENTÃO
  código 1, nada escrito, a mensagem manda rodar o `init` e não aparece "vunknown"; o `init`
  seguinte conclui.
- **U3a-12h** `templates/gitignore` contém `.opencrew-backup/`, `crews/*/state.json` e o
  comentário do bloco.
- **U3a-12i** DADO um `.gitignore` com `# opencrew:start`, três linhas do bloco, sem
  `# opencrew:end`, e depois `dist/` e `minha-pasta/` ENTÃO `dist/` e `minha-pasta/` continuam, há
  um bloco completo no fim, o arquivo anterior está em `.opencrew-backup/<data>/` e o segundo
  `update` não muda nada; DADO um bloco completo e, depois dele, um `# opencrew:start` solto ENTÃO
  o bloco completo é renovado e nenhuma linha some.

**U3a-13 — Dashboard**
- **U3a-13a, 13b e 13d** retirados em 2026-10-05: o dashboard passou para a fase E1 (1.7.0; os IDs não
  são reaproveitados).
- **U3a-13c** (guarda: já passa hoje; trava de regressão) DADO um workspace com
  `- **Dashboard:** enabled` em `preferences.md` e um `crews/x/state.json` QUANDO `update` ENTÃO os
  dois arquivos ficam iguais, byte a byte.

**U3a-14 — Regras e travas**
- **U3a-14a** (contrato) o `AGENTS.md` tem a regra 15 e a linha na tabela, com a trava;
  `templates/AGENTS.md` cita a exceção de idioma da entrega e tem, na tabela de comandos, a linha
  do pedido de entrega de execução já encerrada, que cita `prompts/entrega.prompt.md`.
- **U3a-14b** DADO cada cenário de `tests/entregar*.test.js` ENTÃO, fora de
  `crews/<crew>/output/`, do destino e de `crew.yaml` + `.bak` (só com `--lembrar-destino`), a
  árvore do projeto é igual antes e depois, e não sobra pasta `.tmp`.
- **U3a-14c** o pacote contém `scripts/entregar.mjs`, `scripts/entrega/` e
  `prompts/entrega.prompt.md`.

**U3a-upg — Chega a quem já usa**
- **U3a-upg-a** DADO um workspace 1.6.0 escrito literalmente, com uma crew antiga (passos com
  `format: instagram-feed` e `format: linkedin-post`; uma saída em rótulos `=== CAPTION ===` e
  outra em cabeçalhos `## LinkedIn — Post`; execução antiga com `v1/` a `v3/`) QUANDO `update` e,
  depois, o `entregar.mjs` entregue em `<workspace>/_opencrew/core/scripts/` (executado de lá, não
  de `templates/`) com a lista ENTÃO existem `instagram/legenda.txt` e `linkedin/post.txt`, e
  nenhum arquivo de `crews/<crew>/` fora de `output/` mudou.
- **U3a-upg-b** DADO o mesmo workspace com o `.gitignore` da 1.4.1 QUANDO `update` ENTÃO o
  resultado é o da U3a-12c e a versão carimbada é a do pacote.
- **U3a-upg-c** DADO o mesmo workspace QUANDO `update` ENTÃO o `SKILL.md` do `instagram-publisher`
  cita `entrega/instagram/legenda.txt`.
- **U3a-upg-d** DADO o mesmo workspace, com uma crew anterior à 1.4.2 escrita literalmente (passo
  de publicação sem `side_effects`, antes da revisão) QUANDO `update` ENTÃO (contrato) o runner
  entregue reconhece o passo pela skill e manda a entrega para o fim, com `--publicado`; o
  `SKILL.md` entregue traz o caminho sem `entrega/`, com o aviso; e nenhum arquivo de
  `crews/<crew>/` mudou.

## 9. O que o humano confere na tela
- [ ] No Projeto A, depois do `update`: pedir a entrega da última execução (a IA lê
      `entrega.prompt.md`, mostra a lista e espera o "sim"). Abrir `entrega/LEIA-ME.md`, seguir um
      canal e colar o `post.txt` num rascunho do LinkedIn: sem asterisco, sem rótulo. Olhar o que
      foi para `outros/`. Antes, conferir se essa execução deixou mesmo os arquivos soltos em
      `output/` (F-03).
- [ ] Ler os passos de cada canal no LEIA-ME e seguir um deles em cada rede: curtos, em PT-BR
      correto, pelo computador primeiro (a porta confere o texto contra o quadro da §4; se ele
      bate com a tela de cada rede, só você vê).
- [ ] Responder à pergunta do destino: conferir o `crew.yaml`, o `.bak` e a pasta
      `<destino>/<run_id>/`. Entregar de novo, sem mudar nada: nenhuma pasta nova.
- [ ] Rodar uma crew até o fim, com uma pendência (jornada U0): `INCOMPLETA`, depois "entregar
      assim mesmo", e o LEIA-ME abre com a ressalva. Se a crew publica, a confirmação do passo
      repete a ressalva. Registrar a rodada em `docs/jornada/medicoes.md`, com "Fora do chat" e
      "Usou?" preenchidos.
- [ ] No `.gitignore` dos Projetos A e B (instalados na 1.4.1): um bloco só, nenhuma linha
      repetida, `.opencrew-backup/` dentro do bloco.
- [ ] No Projeto B, com a unidade montada: ver como os caminhos de saída ficaram presos (G-26) e
      anotar. Os documentos saem em `outros/`, como `.md`, até a U3b.

## 10. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código — menos as guardas
      U3a-08j, 11b, 12f e 13c, que já passam hoje e ficam como trava de regressão.
- [ ] `npm run verify` verde; os testes de F1, U1, U2 e R1 continuam passando, menos os que mudam
      no mesmo commit: os de export em `tests/docs.test.js` (regra 27); os do verificador que afirmam o número
      de legenda, post ou tweet, que passa a ser o do texto entregue (regra 26; o R1-01a e o
      R1-01d estão entre eles); os que deixam de valer pela regra 5: o R1-01l (1º caso, reels) e
      a parte do comentário no R1-01k; e o R1-07b, na parte da opção 2, que volta a trazer "fica
      registrado" (regra 22).
- [ ] No mesmo commit do código (regra 9 do AGENTS.md): README (PDF, árvore de pastas, tabela "O
      que é atualizado"), `AGENTS.md` (regra 15 e tabela), `GLOSSARIO.md`,
      `templates/AGENTS.md`, `IDEIAS.md` (saem os itens entregues; entram os da §11 que não têm
      entrada) e a entrada de correção nas specs F1, U1, U2 e R1. Na R1: regra 3 (b) e (c), seção
      de outro canal só é peça em arquivo sem formato ou de formato `instagram-feed`,
      `linkedin-post`, `twitter-post` e `twitter-thread`; regra 4, primeiro comentário não é
      post; regra 6, HTML e imagem sem procura de peça; regra 9, imagem de formato com limites;
      regra 18 e decisão 10, a opção 2 volta a dizer "(fica registrado na entrega)"; decisão 3
      (seção de outro canal); regra 1 (passo de renderização sem `format:`: usa o formato do
      passo de conteúdo).
- [ ] Conferência da §9 feita e registrada.
- [ ] CHANGELOG 1.8.0, com as mudanças de comportamento (PDF e `formatted-post`, legenda
      medida com as hashtags, thread medida tweet a tweet, post do LinkedIn e tweet medidos com as
      hashtags no fim, legenda escrita dentro de roteiro, e-mail ou artigo e primeiro comentário do
      LinkedIn deixam de ser medidos); `npm version minor`; release (commit + tag) só com
      confirmação; atualizar A e B só com autorização.

**A porta não cobre:** a IA seguindo `entrega.prompt.md` e as regras 2, 10 (imagens no laço de
revisão), 16, 21 a 25, 27 (o aviso do passo antigo) e 29 numa execução real (→ U0); a publicação
real no Instagram; pasta sincronizada com a nuvem; como cada rede mostra o texto colado; se os
passos do LEIA-ME batem com a tela de cada rede (conferência da §9).

## 11. Fora de escopo → destino
| O que não entra | Alocação |
|---|---|
| `.docx`, conversão avulsa de documento, "modo plano" de destino, documento declarado em `entrega:` (os achados de DOCX, mais Z-06 e parte de Z-08) | → U3b — documento Word |
| PDF direto e papel timbrado | → sem fase — PDF pede motor de renderização, e o navegador e o Word salvam como PDF; timbrado só depois da U3b e com pedido real |
| Tradução do LEIA-ME e dos nomes de arquivo (B-24, G-28, Z-11) | → U5 — limite declarado: só PT-BR |
| Conserto de crews antigas: caminhos de saída presos (G-26), crew sem revisão ou sem aprovação final, ordem de publicação das crews anteriores à 1.4.2 (H1-01), `Output Format` antigo dos passos | → U4 — mexe em `crews/`; depende da conferência do dono na §9 |
| Comando `/opencrew entregar`; entrega de tarefa avulsa no histórico (A-16) | → U4 — modo equipe; até lá vale o pedido em linguagem natural, que o `system.md` leva ao `entrega.prompt.md` (regra 21) |
| Tema da execução no título do LEIA-ME e no nome da pasta do destino (E-14, I-01) | → U4 — o tema só existe no `runs.md`, escrito depois da entrega; a U4 torna o histórico confiável. Até lá: crew + `run_id`, que traz a data |
| Estado da execução em disco (`aprovado.json`, `run-state.json`) | → U4 — aqui a lista vem por argumento |
| Contagem do X/Twitter; limites ainda sem medição: hashtags do tweet, imagens por tweet (`images_per_tweet`), palavras por slide, título do YouTube, título do artigo do LinkedIn, legenda de Reels (H2-13, H2-17) | → U5 — esta fase só mede peça que vira arquivo próprio, e estas pedem peça nova na tabela da §4. Até lá aparecem como "não medido" |
| No laço de revisão, item sem formato com `title:` ou `titulo:` no frontmatter continua medido como blog (H2-03; a R1, §12, apontava para cá) | → U4 — só acontece em passo sem `format:`, e dar formato ao passo é conserto de crew antiga. Na entrega já não vale (regra 17) |
| Título de blog escrito só como `# …` (a R1, §12, apontava para cá) | → U5 — o `#` do artigo nem sempre é o título de SEO, e medi-lo por esse limite pode bloquear artigo correto. Até lá: alerta "Não medido", `seo.txt` sem a linha do título, e o `#` segue em `artigo.md` |
| Arquivo `=instagram-feed` só com a legenda, sem cabeçalho nem rótulo (a R1, §12, apontava para cá) | → U5 — sem cabeçalho nem rótulo não dá para saber se o texto é legenda ou slide. Até lá: o arquivo vai inteiro para `instagram/`, com o aviso da regra 8, e sai "não medido" |
| Rótulo traduzido pelo redator, como `=== LEGENDA ===` (a R1, §12, apontava para cá) | → U5 — pede uma lista de rótulos por idioma, que entra com a tradução. Até lá: a peça não é achada (regra 8) e sai "não medida" |
| Relatório do laço de revisão (`verificacao-ciclo-N.md`) gravado pelo script, e não transcrito pela IA (parte de H2-16) | → U5 — é custo de tokens; a entrega já grava o próprio relatório |
| Reescrever o `Output Format` dos 14 best-practices; exemplos do payload com nomes de pasta dos projetos reais (G-29); HTML dos slides como saída obrigatória do passo (B-09) | → U5 — a entrega lê os dois jeitos de escrever |
| `.mcp.json`, detecção de IDE, pontes antigas, manifesto, confirmação e marca `side_effects` em `blotato` e `resend`; no `publish.js`, contagem de emoji igual à do verificador e post de uma imagem só | → R2 — defeitos do `update` e do envio, com spec própria |
| Artigo e e-mail em HTML para colar com formatação (E-15, F-21) | → sem fase — só com pedido real |
| Reescrever o HTML dos slides com caminhos relativos (I-09) | → sem fase — a skill passa a orientar; o script só avisa |
| Aviso de entregas ao apagar a crew; poda de `output/`; caminho da entrega no `runs.md` (Z-12) | → U5 — polimento; a pergunta do destino já tira a entrega da pasta descartável |
| `_build/` e `*.bak` no bloco do `.gitignore` (H1-03, G-27) | → sem fase — o `design.yaml` é fonte do build; versionar é escolha do usuário |
| Publicar o dashboard (corrigir XSS e o modo ao vivo) | → E1 — feito na 1.7.0: virou o Escritório, e a pasta `dashboard/` saiu do repositório |

## 12. Limites conhecidos
- As regras 2, 10 (imagens no laço de revisão), 16, 21 a 25, 27 (o aviso do passo antigo) e 29 são
  seguidas pela IA; os testes garantem o texto e o script.
- A lista de arquivos é montada pela IA. O script confere se cada um existe, não se foi aprovado.
- `entrega/` mora em `crews/*/output/`: fica fora do git, some com a crew e é refeita a cada
  entrega. O que precisa durar vai para o destino.
- LEIA-ME, resumo e nomes de pasta e de arquivo da entrega só existem em PT-BR, qualquer que seja
  o idioma do usuário (→ U5).
- As palavras de cabeçalho reconhecidas são em português e inglês. Em outro idioma valem os
  rótulos `=== … ===`; sem eles, o arquivo vai inteiro para a pasta do canal, com o aviso da
  regra 8.
- `artigo.md`, `corpo.md` e os roteiros saem em markdown: em editor que não entende markdown (a
  maioria das ferramentas de e-mail), `#`, `**` e `[texto](url)` vão junto. Pelo mesmo motivo, o
  PDF de um `.md` feito por "Imprimir" sai com os símbolos, até a U3b.
- Linhas de metadado dentro de uma seção ("Caracteres: 1.180", "Botão: …") e a seção `## TL;DR`
  vão junto com o texto: ler antes de colar. Em blog escrito em rótulos, a linha
  `=== FAQ SECTION ===` sai com as outras: as perguntas ficam, sem título de seção.
- Seção que não é peça nem bloco de serviço (descrição de imagem, por exemplo) fica só no arquivo
  de origem, que o LEIA-ME aponta.
- Legenda escrita dentro de um roteiro, e-mail ou artigo deixa de ser medida (na 1.6.x era), e o
  primeiro comentário do LinkedIn deixa de ser medido como post.
- Em e-mail, o texto que vem depois de `=== SUBJECT LINE ===` ou de `=== PREVIEW TEXT ===` conta
  como assunto ou prévia até o próximo rótulo, mesmo com cabeçalho no meio: corpo sem rótulo
  aparece como bloqueio de tamanho do assunto.
- No laço de revisão, o item sem formato com `title:` longo ainda é bloqueado como blog; na
  entrega, não (→ U4, §11).
- Ressalva é presa ao arquivo, ao item e ao trecho: mudou o texto, o valor medido ou a pasta `vN`
  do arquivo, volta a ser pendência.
- Duas threads na mesma execução têm os tweets numerados em sequência.
- Entrega avulsa não tem data e não guarda nada entre chamadas. `entrega-avulsa/` guarda só a
  última entrega avulsa da crew; no destino, entregas avulsas de conteúdos diferentes viram
  `entrega-avulsa`, `entrega-avulsa-reentrega-2`…
- Crew anterior à 1.4.2, que publica antes da revisão: a entrega só roda ao fim, e a legenda
  publicada ainda é a do caminho antigo (→ U4).
- Entre a entrega e a publicação automática, os passos de postar à mão continuam no LEIA-ME do
  canal, abaixo do aviso da regra 24.
- O publicador publica um conjunto por vez: com mais de um post de Instagram na entrega, ele
  pergunta qual.
- O publicador conta emoji como 2, e o verificador, como 1: legenda com emoji perto do limite pode
  passar no verificador e ser recusada no teste de publicação (→ R2).
- O `publish.js` só publica carrossel de 2 a 10 imagens: o post de uma imagem só passa na entrega
  (regra 10) e é recusado pelo publicador, com a mensagem dele (→ R2).
- Só o `instagram-publisher` usa os arquivos da entrega. `blotato` e `resend` seguem como na
  1.6.0, e a crew anterior à 1.4.2 que publica por eles não ganha o aviso "Já publicado" (→ R2).
- Formato do usuário com plataforma fora das sete vai para `outros/`.
- Em crew sem revisão, a primeira medição acontece na entrega. Em crew sem aprovação final,
  ninguém aprovou o texto: a entrega roda e só avisa (regra 21).
- HTML editável pode citar arquivo deste computador. A orientação EXIF de fotos não é lida.
- Imagem de apoio guardada na pasta dos slides só deixa de contar como slide quando um HTML
  editável da lista a cita: sem esse HTML, é tratada como slide. Com dois conjuntos de slides na
  mesma entrega, o HTML de prefixo `2-` continua citando o nome sem prefixo.
- Os scripts novos seguem os limites de Node 20.0 da R1 (§12 de lá).
- Destino dentro de uma pasta de `fontes:` faz a entrega aparecer na lista de arquivos da fonte.
- Runner: saldo de cerca de +25 linhas ("Output saved to" e "Save final output" −5; chamada e
  frases +30). A redução ligada ao dashboard já veio na fase E1 (1.7.0).

## 13. Travas que esta spec deixa
`tests/entregar.test.js` (U3a-01a a 01d, 02, 06, 14b) · `tests/entregar-pecas.test.js` (U3a-03) ·
`tests/entregar-imagens.test.js` (U3a-04a a 04d, 04g a 04i, 04k, 04m a 04p) ·
`tests/entregar-destino.test.js` (U3a-05a a 05k, 05m a 05o) · `tests/entregar-pendencias.test.js`
(U3a-07, 08g, 08h, 08k, 08m, 08n) · `tests/verificar-u3a.test.js` (U3a-04e, 04f, 04p no
verificador, 09) · `tests/conferir-fontes-citados.test.js` (U3a-11a a 11f) ·
`tests/update-u3a.test.js` (U3a-12, 13c) · `tests/upgrade.test.js` (U3a-upg) ·
`tests/runtime-contracts-u3a.test.js` (U3a-01e, 04j, 04l, 05l, 08a a 08f, 08i, 08l, 08o, 10, 11g,
14a) · `tests/instagram-publisher.test.js` (U3a-08j, 08p) · `tests/package.test.js`
(U3a-14c) · `tests/docs.test.js` (os testes antigos de export são apagados: U3a-10 os
substitui) · `tests/template-refs.test.js` (as referências a
`prompts/entrega.prompt.md` e `scripts/entregar.mjs` existem) · alerta de tamanho: nenhum módulo
de `scripts/` acima de 200 linhas, inclusive os de `verificar/`; nenhum arquivo de teste novo
acima de 300.

**Pontos de extensão para a U3b** (sem regra nova aqui). A tabela formato → pasta da §4 é dado:
aceita uma pasta a mais (`documentos/`, plataforma `documento`), e os testes desta fase conferem
cada formato pelo nome, não o total de pastas. O leitor do bloco `entrega:` do `crew.yaml` ignora,
sem erro, a chave que não conhece, e a gravação de `--lembrar-destino` preserva as outras chaves
do bloco. A validação de destino (regra 13) é uma função única, exportada. A seção de cada canal
no LEIA-ME, os passos dela (quadro "Passos por canal") e a linha do canal no resumo são montados
a partir de dados: canal novo entra como mais um item. Na comparação "cópia igual" da regra 14,
arquivo que não é texto é comparado byte a byte. O texto da regra 15 do AGENTS.md (regra 33) é
uma lista de lugares combinados: não impede que um comando futuro grave ao lado do arquivo de
origem. O `entrega.prompt.md` tem um bloco "antes da chamada", que aceita perguntas novas.
"Entrega avulsa" (`entregar.mjs` sem `--run`) não se confunde com "conversão avulsa" (U3b).

## 14. Correções
(preenchida durante a implementação)
