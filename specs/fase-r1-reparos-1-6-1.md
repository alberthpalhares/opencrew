# Spec — Fase R1: Reparos da 1.6.0 — o verificador mede de verdade (1.6.1)

- **Fase:** R1 · **Módulos:** Runtime (`templates/_opencrew/core/scripts/`, `runner.pipeline.md`) + CLI (`src/commands/init.js`, `src/lib/migrations.js`) + testes · **Status:** implementada (2026-10-05); release 1.6.1 aguardando a confirmação do dono
- **Termos novos no GLOSSARIO.md:** sim — Peça, Formato declarado, Não medido, Não verificado, Nota informativa, Ciclo de revisão
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `docs/auditoria/2026-10-04-revisao-specs.md` §3 e §7 (os IDs entre parênteses são de lá)

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **"Não medido" e "não verificado" são alerta em dois casos** (regras 6 e 14): formato da tabela
   declarado sem a peça principal; item da lista ausente, pasta ou com erro. O alerta aparece na
   aprovação final e limita a nota do revisor a 7/10 quando não é resolvido nem justificado. Nos
   outros casos a linha não tem nível. Não adotado: linha sem nível em todos os casos.
2. **A linha `---` deixa de encerrar a seção** (regra 2): texto solto depois dela conta na peça de
   cima. Pode bloquear um texto que hoje passa por ter notas depois do `---`.
3. **Seção de outro canal no mesmo arquivo continua medida**, como na 1.6.0, menos em blog
   declarado (`blog-post`, `blog-seo`), onde cabeçalho é conteúdo (regra 3).
4. **HTML: são verificados o texto visível e os links** (`href`, `src`, `alt`) (regra 9). Não
   adotado: deixar o HTML sem verificação.
5. **Termo proibido é palavra inteira** (regra 10): casa com o plural `s`/`es`, não com o
   feminino; sigla em maiúsculas não casa com a palavra em minúsculas ("IA" × "ia").
6. **`{{variável}}` em e-mail e WhatsApp vira nota informativa**, não bloqueio (regra 8).
7. **Dígitos repetidos só bloqueiam em link ou com 10 dígitos ou mais** (regra 8): telefone falso
   de 8 ou 9 dígitos, fora de link, deixa de ser pego.
8. **Crew inexistente vira erro, código 1** (regra 13). Hoje sai `VERIFICACAO:OK`.
9. **Script que não rodou: o runner avisa e segue**, sem pergunta nova (regra 20).
10. **"Aceitar assim mesmo" perde o "(fica registrado…)"** até a U3a gravar o aceite (regra 18).
11. **`init --repair-bridges --yes` usa a detecção**; só `--all` regrava as 9 (regra 22).
12. **F1-01d: só o teste muda de nome** (R1-09b). O `update` continua recriando o `CLAUDE.md`
    apagado de uma IDE instalada (H1-05, opção b).

## 1. Objetivo
O "Revisor com dentes" (U1) falha em silêncio em vários casos comuns: não mede o texto escrito
com rótulos, do jeito que os próprios guias ensinam, bloqueia texto correto e se desliga sem
avisar. Esta fase fecha esses furos. Depois dela, o relatório do verificador só diz "Nada a
apontar." quando de fato mediu; sem medição, diz que os limites não foram medidos. Quem já usa
recebe tudo com um `update`.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| H2-01, H2-11 | Texto escrito com rótulos (`=== CAPTION ===`), como os best-practices ensinam, não é medido; título-pai soma os filhos; slides quase nunca contados | R1-01, R1-10 |
| H2-02, H2-15, E-07 | Cor hexadecimal, número comum e `{{name}}` viram "Placeholder"; arquivo que não é texto é lido como texto | R1-02 |
| H2-04 | Termo proibido casa dentro de outra palavra; o termo preferido vira proibido | R1-03 |
| H3-01, H2-10 | Overlay local sem limites desliga o verificador; limite ausente não é dito | R1-04 |
| Z-02, H2-10, H2-12 | Fora da raiz responde OK sem medir; crew inexistente passa; um caminho ruim derruba tudo | R1-05 |
| A-34, H2-09 | Comentários e linha de uso de `verificar.mjs` citam dois estados e a sintaxe antiga | R1-05k, §10 |
| H3-04, H3-15, H3-17, I-14 | Conferência de fontes não vê `caminho:` com comentário nem tasks; mensagens que enganam; aceita crew de fora do projeto | R1-06 |
| H2-06, H2-08, H3-05 | Limite de ciclos indefinido; regras do revisor só em crews novas; script que não roda segue em silêncio | R1-07 |
| H3-02 (C-12 da auditoria) | `init --repair-bridges` sem `--ide` cria pontes das 9 IDEs | R1-08 |
| H1-05, H1-17, H2-18 | Teste com nome que não diz o que testa; cenário F1-11a sem teste; trava do 1080×1440 estreita | R1-09 |
| Fora daqui | Ver §11 | — |

Fontes varridas no portão de entrada: §7 do relatório de 2026-10-04, `IDEIAS.md`, "Limites
conhecidos" e "Fora de escopo" das specs F1, U1 e U2.

## 3. Entradas
| Entrada | Tipo | Obrigatória | Validação |
|---|---|---|---|
| pasta atual do comando | raiz do projeto | sim | contém `_opencrew/` |
| `verificar.mjs --crew` | pasta | sim | dentro do projeto e existente |
| `verificar.mjs --arquivo` | lista separada por vírgula (a opção repetida soma à lista); cada item é `caminho` ou `caminho=formato` | sim | todos os caminhos dentro do projeto; ao menos um existe; `=formato` só vale com minúsculas, dígitos e hífen (senão o item inteiro é o caminho) |
| `verificar.mjs --formato` | `blog-post` ou `blog-seo` | não | só escolhe os limites de blog do item sem `=formato` que tem título no frontmatter, como na 1.6.0; ausente: `blog-post`. Não conta como formato declarado |
| `conferir-fontes.mjs --crew` | pasta | sim | dentro do projeto e existente |
| `conferir-fontes.mjs --corrigir` | opção | não | — |
| `init --repair-bridges` com `--ide=<ids>`, `--all` ou `--yes` | opções do CLI | não | `--ide` com id válido; sem `--ide` e sem `--all`: detecção (regra 22) |
| `max_review_cycles` | número, no mesmo lugar em que o passo declara `on_reject` (frontmatter do passo ou a entrada dele no `pipeline.yaml`) | não | inteiro a partir de 1; ausente ou inválido: 3. Em crew nova, o build grava o valor pelo tier: Express 1, Standard 2, Full 3 |

Exemplo: `--arquivo "crews/x/output/r1/v2/post.md=blog-seo,crews/x/output/r1/v3/legendas.md=instagram-feed"`.

## 4. Saídas
- **Relatório do verificador**, por arquivo de texto: tabela dos itens medidos, bloqueios e
  alertas, e as linhas novas `Não medido — …` e `Não verificado — …`. Cada uma começa por `⚠️`
  quando é alerta e por `⚪` quando não tem nível (regras 6 e 14; textos na §6). Quando há mais
  de uma peça do mesmo tipo no arquivo, o item traz o texto do cabeçalho da seção e o número de
  ordem ("post 1", "post 2"); na escrita com rótulos, só o número de ordem.
- **Notas informativas**: linhas da seção "Notas", no fim do relatório. Não são bloqueio, alerta
  nem "não medido", e não entram no resumo. Os arquivos que não são texto saem numa linha só:
  `⚪ Não verificado — não é texto (N): {lista}`.
- **Resumo:** `**Resumo: X bloqueios, Y alertas, Z não medidos**`. Z conta as linhas "Não medido"
  e "Não verificado" dos arquivos, com ou sem nível; a que é alerta conta também em Y. Arquivo
  que não é texto não entra em Z.
- **Última linha**, sem mudança: `VERIFICACAO:OK`, `VERIFICACAO:BLOQUEADA` ou
  `VERIFICACAO:AGUARDANDO_USUARIO`. Alerta e "não medido" não mudam o status.
- **Código de saída do verificador:** 0 quando ao menos um caminho da lista existe (se nenhum for
  texto, o status é `VERIFICACAO:OK`); 1 em erro de uso: opção obrigatória faltando, raiz sem
  `_opencrew/`, crew inexistente, crew ou algum caminho fora do projeto, nenhum caminho da lista
  existe. Em erro de uso não há linha `VERIFICACAO:`. Erro inesperado fora da verificação de um
  arquivo também dá 1, sem linha de status ("Não consegui verificar: …", §6).
- **Conferência de fontes:** última linha `FONTES:OK` ou `FONTES:PENDENTE`, sem mudança. Código 0
  quando conferiu; 1 em erro de uso (opção faltando, raiz sem `_opencrew/`, crew inexistente ou
  fora do projeto), sem linha `FONTES:` e sem escrever nada.
- **`init --repair-bridges`:** resumo com as IDEs regravadas e as cópias de segurança feitas;
  código 1, sem escrever nada, quando a pasta não tem workspace do OpenCrew ou quando não há
  ponte detectada, nem `--ide`, nem `--all`.

## 5. Regras de negócio

**Verificador: reconhecer o que foi escrito**
1. **Formato por arquivo.** Cada item da lista pode trazer o seu formato (`caminho=formato`): é o
   **formato declarado**. O runner passa o `format:` do passo que gerou o arquivo e deixa de
   passar `--formato`. Passo sem `format:`, com `format:` de exportação (`pdf`, `csv`,
   `formatted-post`) ou com `format:` que não é só minúsculas, dígitos e hífen vai sem
   `=formato`. Com formato declarado, a palavra do canal fica implícita: basta o cabeçalho
   dizer a peça (`## Legenda`, `## Post`, `## Carrossel`).
2. **Seção nos dois jeitos de escrever.** Uma seção começa num cabeçalho markdown ou numa linha
   `=== RÓTULO ===` (a escrita com rótulos, que os best-practices ensinam).
   - A seção de cabeçalho vai até o próximo cabeçalho do mesmo nível ou de nível acima, ou até a
     próxima linha de rótulo. A seção de rótulo vai até o próximo rótulo, até um cabeçalho que
     seja candidata a uma peça (regra 4) ou até o fim do arquivo.
   - O rótulo é comparado inteiro, sem diferenciar maiúsculas: `=== HOOK (0-30s) ===` não é
     `=== HOOK ===`.
   - Rótulo repetido abre uma peça nova: cada `=== CAPTION ===`, `=== SLIDES ===`,
     `=== HOOK ===` ou `=== TWEET ===` abre uma peça. `BODY`, `INSIGHTS` e `CTA` pertencem ao
     post aberto por último (sem `HOOK` antes, abrem o primeiro post); `HASHTAGS`, à legenda ou
     ao post aberto por último. Em blog vale a primeira ocorrência de cada rótulo.
   - A linha `---` não encerra seção e não conta como texto; a linha que é só a cerca de um
     bloco de código (três ou mais crases ou tis) também não conta. A contagem de caracteres é
     a da regra 6 da U1: as quebras de linha contam.
3. **O que é medido em cada formato** (fonte única; os nomes de limite são os de `constraints:`).
   **Peça** é o trecho do texto que tem limite próprio.

   | Formato | Peça | Onde é achada | Limite |
   |---|---|---|---|
   | `blog-post`, `blog-seo` | título | frontmatter `title` ou `titulo`; senão `=== TITLE ===` ou `=== TITLE TAG ===` | `title_max_chars` |
   | | meta description | frontmatter `meta_description` ou `meta_descricao`; senão `=== META DESCRIPTION ===` | `meta_description_chars` |
   | | links | corpo do arquivo; imagem e link de âncora (`#…`) não contam | `min_internal_links`, `min_external_links` (alerta; só quando o formato declara) |
   | `instagram-feed` | legenda | `=== CAPTION ===`; cabeçalho com a palavra da peça | `caption_max_chars` |
   | | hashtags | dentro da legenda; em `=== HASHTAGS ===`; em seção com "hashtags" no cabeçalho, que soma à legenda anterior | `hashtags_max` |
   | | slides | quantos números N diferentes aparecem em linhas que começam por "Slide N" ou "Slide #N" (cabeçalho, negrito, item ou texto; antes pode haver até 12 símbolos, como um emoji), dentro de `=== SLIDES ===` ou sob cabeçalho com a palavra da peça. Sem essa peça, num `=instagram-feed`, valem os cabeçalhos "Slide N" do arquivo inteiro, quando trazem 2 ou mais números | `carousel_max_slides` |
   | `linkedin-post` | post | o texto de `=== HOOK ===`, `=== BODY ===`, `=== INSIGHTS ===` e `=== CTA ===`, na ordem, unido por uma linha em branco; cabeçalho com a palavra do canal ou da peça, e sem a de slides | `post_max_chars` |
   | | hashtags | dentro do post; em `=== HASHTAGS ===`; em seção com "hashtags" no cabeçalho, que soma ao post anterior | `hashtags_max` |
   | `twitter-post` | tweet | `=== TWEET ===`: a seção inteira é um tweet; cabeçalho com a palavra do canal ou da peça: um tweet por parágrafo, como na 1.6.0 | `tweet_max_chars` |

   Palavra do canal: `instagram` · `linkedin` · `twitter` ou `tweet`. Palavra da peça: legenda =
   `legenda` ou `caption`; slides = `carrossel`, `carousel` ou `slides`; post = `post`; tweet =
   `tweet`. As palavras casam inteiras (antes e depois não há letra nem dígito), com plural, sem
   diferenciar maiúsculas e acentos: "proposta" e "retweet" não casam. Um cabeçalho "Slide N" é
   um slide, não um carrossel, mesmo com palavra de peça ou de canal no texto. Um cabeçalho que
   começa por "hashtags" é só seção de hashtags: com a palavra de um canal, soma à peça desse
   canal aberta por último (`## Hashtags LinkedIn` → o post do LinkedIn); as do Twitter não
   somam a ninguém. Um cabeçalho que casa com legenda e com slides abre uma peça só: slides, se
   o texto tem linha "Slide N"; senão, legenda.

   Qual linha da tabela vale em cada arquivo `.md` ou `.txt`:
   - **(a) Formato declarado da tabela:** são procuradas as peças desse formato, pelos rótulos e
     cabeçalhos da linha dele. Um `title:` num `=linkedin-post` não é blog.
   - **(b) Seção de outro canal:** sem formato declarado, e com qualquer formato declarado que não
     seja de blog, a seção cujo cabeçalho casa com um canal pelos critérios da 1.6.0 é medida
     pelo formato desse canal (ex.: `## Post LinkedIn` num `=instagram-feed`). Critérios da
     1.6.0: Instagram pede a palavra do canal e a da peça; LinkedIn e Twitter, só a do canal
     (cabeçalho de carrossel do LinkedIn não é post). Em `blog-post` e `blog-seo`, cabeçalho é
     conteúdo: um `## Como postar no LinkedIn` não é post, e o relatório diz que essa seção não
     foi medida (regra 6).
   - **(c) Formato declarado fora da tabela** (`instagram-reels`, `twitter-thread`,
     `email-newsletter`…): vale só (b). Os rótulos não são lidos (a linha de rótulo é texto
     comum e não encerra a seção), e o `title:` do frontmatter não é medido como blog.
   - **(d) Sem formato declarado:** vale (b); cada rótulo inconfundível abre uma peça do seu
     formato (`CAPTION` e `SLIDES` → `instagram-feed`; `HOOK` → `linkedin-post`; `TWEET` →
     `twitter-post`); e `title` ou `titulo` no frontmatter é medido como blog, pelos limites de
     `--formato`, como na 1.6.0.
4. **Cada trecho é medido uma vez.** Uma seção é candidata a uma peça se o cabeçalho dela casa
   com a peça (regra 3), ou se tem a palavra da peça e um cabeçalho que a contém tem a palavra
   do canal dessa peça. Candidata que contém outra candidata é medida só no texto próprio: o
   corpo dela sem os trechos das candidatas de dentro. Sem texto próprio, não entra no
   relatório. Assim `# LinkedIn — semana` com três `## LinkedIn — Post` dá três medições, e não
   uma soma; e `## LinkedIn — Post 1` com um `### Primeiro comentário do post` dentro mede o
   post e o comentário em separado.
5. **Arquivo que é só o texto.** Com formato `linkedin-post` ou `twitter-post` e nenhum cabeçalho
   nem rótulo, o corpo inteiro é a peça (em `twitter-post`, um tweet só), e o item diz "(arquivo
   inteiro)".
6. **"Não medido" é dito** (textos na §6). A procura de peças e as linhas abaixo valem para `.md`
   e `.txt`. Nos outros arquivos de texto (`.html`, `.csv`…) rodam só as **checagens gerais**:
   placeholders, `[PREENCHER]`, termos proibidos e afirmações a confirmar.
   - Formato da tabela declarado e **peça principal** não achada: alerta "Não medido — não
     encontrei {peça}…", mesmo que hashtags ou links tenham sido contados. Peça principal: o
     título (`blog-post`, `blog-seo`); a legenda ou os slides (`instagram-feed`: basta um dos
     dois); o post (`linkedin-post`); o tweet (`twitter-post`).
   - Peça com máximo achada e formato sem o limite numérico: "Não medido — {peça}: sem limite
     definido no formato…", sem nível. Mínimo de links que o formato não declara não gera linha,
     como na 1.6.0.
   - Formato declarado fora da tabela, com best-practice, e nenhuma peça medida no arquivo: "Não
     medido — o verificador ainda não mede os limites do formato…", sem nível.
   - Blog declarado com seção cujo cabeçalho casaria com outro canal: "Não medido — seção de
     outro canal num arquivo de blog: {cabeçalho}", sem nível, uma linha por cabeçalho.
   - `✅ Nada a apontar.` só aparece quando ao menos uma peça foi medida e o arquivo não tem
     bloqueio, alerta nem linha "Não medido". Arquivo sem peça medida, sem linha "Não medido" e
     sem achado recebe `⚪ Nada a apontar nas checagens gerais (limites não medidos)`; sem
     formato declarado, o complemento é "(formato não informado: limites não medidos)". Essa
     linha não conta em Z.
   - Peça dentro do limite aparece na tabela como OK. Nos tweets por parágrafo, só o que passa
     do limite gera linha, como na 1.6.0.
7. **A marca invisível de início de arquivo (BOM) é ignorada** na leitura de qualquer arquivo.

**Verificador: não bloquear o que está certo**
8. **Placeholders (altera a regra 3 da U1).**
   - Dígitos repetidos (6 ou mais iguais) só contam em link ou telefone: trecho sem espaço com
     `http`, `wa.me`, `tel:` ou `/`, ou sequência de 10 dígitos ou mais. Cor hexadecimal
     (`#` + 3, 6 ou 8 dígitos hexadecimais) nunca conta.
   - `XXX` não conta quando, na mesma linha e separada só por espaço, vem uma palavra iniciada
     por maiúscula (numeral romano: "XXX Congresso").
   - `{{variável}}` em arquivo de formato declarado `email-*` ou `whatsapp-*` vira nota
     informativa (§6), sem bloqueio. Nos demais, bloqueia.
   - As outras expressões (`[Empresa X]`, `lorem ipsum`, `example.com`…) não mudam.
9. **Só texto é verificado.**
   - `.html` e `.htm`: o texto visível e os valores de `href`, `src` e `alt`. Ficam de fora
     `<style>`, `<script>` e o resto das tags.
   - Não é texto: `.png .jpg .jpeg .gif .webp .bmp .ico .svg .pdf .doc .docx .xls .xlsx .ods
     .pptx .mp3 .wav .ogg .mp4 .mov .webm .zip .css .js .json` e qualquer arquivo com conteúdo
     binário (contém byte nulo). Saem juntos na linha "Não verificado — não é texto" (§4).
   - `.md`, `.txt`, `.html` e `.htm` gravados em UTF-16 com a marca de início são lidos
     normalmente; com byte nulo e sem a marca, viram o alerta "Não verificado — o arquivo não
     está em UTF-8" (§6).
   - Os demais são texto (`.md`, `.txt`, `.csv`, `.yaml`…).
10. **Termo proibido é palavra inteira.** Compara sem diferenciar maiúsculas e acentos. Antes do
    termo, e depois dele ou do seu plural simples (`s`, `es`), não pode haver letra nem dígito;
    vale também para termo com símbolo, como "#publi". Assim "barato" casa com "baratos". Termo
    todo em maiúsculas, de até 5 letras (sigla), compara diferenciando maiúsculas: "IA" casa com
    "IA" e "IAs", não com "dia" nem com o verbo "ia".
11. **Termo preferido não é proibido.** Numa linha de proibição, valem como proibidos os termos
    entre aspas até o primeiro marcador de troca. O que vem depois é termo preferido.
    - Marcadores: `prefira`, `preferir`, `use`, `usar`, `utilize`, `utilizar`, `→`, `->`, e `por`
      quando vem logo antes de um termo entre aspas.
    - O marcador só vale como palavra inteira, fora das aspas, depois do primeiro termo, e quando
      não há negação entre as 3 palavras antes dele, sem atravessar o termo entre aspas anterior.
      Negações: `não`, `nunca`, `nem`, `jamais`, `sem`, `evite`, `evitar`, `proibido`,
      `proibida`, `proibidos`, `proibidas`, `vetado`, `vetada`, `parar`, `pare`, `deixar`,
      `deixe`.
    - `em vez de`, `ao invés de` e `no lugar de` não são marcadores: nessa linha todos os termos
      entre aspas continuam proibidos, como na 1.6.0.
    - Uma nota informativa lista os termos lidos como preferidos (§6).
    - O runner grava na forma canônica, `- Nunca usar "termo"` ou
      `- Nunca usar "termo" → usar "outro"`, nos dois pontos em que escreve proibições: no
      checkpoint e na atualização da memória no fim da execução.
12. **O overlay local soma, não substitui.** Os limites são os do core, com as chaves que o
    arquivo de `_opencrew/best-practices.local/` declarar por cima. Overlay sem `constraints:`
    usa os do core e gera nota informativa (§6). Limite do overlay que não é número inteiro é
    ignorado: vale o do core, com nota informativa (§6). Formato da tabela cujo arquivo só
    existe no overlay usa os limites dele.

**Verificador e conferência: contrato**
13. **Raiz e crew conferidas** nos dois scripts, nesta ordem: opção obrigatória faltando; pasta
    atual sem `_opencrew/`; crew ou caminho da lista fora do projeto (antes de testar se existe);
    crew inexistente. Qualquer um dá código 1, mensagem em PT-BR e nenhuma linha de status; nada
    é lido da crew nem escrito.
14. **Verifica o que der.** Item da lista que não existe, que é pasta ou que dá erro ao ler ou ao
    aplicar uma regra vira alerta "Não verificado — {motivo}", e os outros seguem. Link
    malformado é ignorado na contagem de links. Caminho absoluto dentro do projeto é aceito.
    Item repetido na lista (mesmo caminho e mesmo formato) é verificado uma vez. Fora os casos
    da regra 13 e o erro inesperado (§4), o código só é 1 quando nenhum caminho da lista existe.

**Conferência de fontes**
15. `caminho:` aceita aspas e comentário no fim da linha.
16. A coleta também lê todos os `.md` dentro de `agents/` da crew, em qualquer nível (agentes e
    tasks). O caminho relativo citado ali é procurado na crew, na raiz e, por fim, na pasta do
    arquivo que cita e, para `agents/X.agent.md`, em `agents/X/`. Não é caminho: comando entre
    crases (`node …`, `npx …`, `git …`) e nome com marcador de modelo (`AAAA-MM-DD`; R1-06j).
17. **Mensagens verdadeiras** (textos na §6). `--corrigir` troca os caminhos de sugestão única
    e, se sobra pendência sem sugestão única, diz quantas; "Nada a corrigir." só sem pendência.
    A troca vale só onde o caminho foi lido (o texto inteiro entre crases; no `crew.yaml`, o
    valor de `caminho:`), nunca num pedaço de outro texto. Pasta citada sem barra final também
    é procurada como pasta. Quando a busca por nome para no limite de itens, o relatório diz
    que foi parcial e não afirma "nem nada com esse nome no projeto". Em dois casos não há
    sugestão única, só candidato listado: busca parcial; e caminho de destino (linha
    `Writes to` de um agente), para o `--corrigir` nunca apontar a gravação para um arquivo que
    já existe.

**Runner**
18. **Laço de revisão com fim.** **Ciclo** = uma passada do revisor. Máximo de ciclos:
    `max_review_cycles` (§3); sem ele, 3. Se a última passada permitida também rejeita, o runner
    para, e o status do último relatório escolhe o que mostrar: `VERIFICACAO:BLOQUEADA`, os
    bloqueios; qualquer outro (inclusive `AGUARDANDO_USUARIO`), o parecer do revisor. As opções
    são *1. Corrigir eu mesmo · 2. Aceitar assim mesmo · 3. Abortar*. A opção 2 perde
    o "(fica registrado no histórico da execução)": nada é gravado até a U3a (H2-07). O parecer
    do revisor vai ao redator em toda rejeição.
19. **Regras do revisor em toda execução.** Em todo passo com `on_reject`, o runner injeta este
    bloco, com este texto:
    ```
    --- REGRAS DO REVISOR ---
    - Copie os valores medidos do relatório; nunca estime contagens.
    - Bloqueio no relatório é REJECT, seja qual for a nota — menos [PREENCHER], que o usuário
      resolve na aprovação final.
    - Alerta não resolvido nem justificado limita a nota a 7/10.
    - O checklist só marca o que o relatório confirma; item "não medido" ou "não verificado" é
      dito assim, nunca como aprovado.
    ```
20. **Script que não rodou não passa em silêncio.** Sem Node, com erro ou sem linha de status,
    o runner avisa e segue: "⚠️ A verificação automática não rodou: {motivo}" ou "⚠️ A
    conferência de fontes não rodou: {motivo}". A aprovação final repete o aviso. A conferência
    roda antes de carregar as fontes; depois de `--corrigir`, o runner relê o `crew.yaml` e os
    agentes já carregados e só então carrega as fontes. Se o resultado ainda for
    `FONTES:PENDENTE`, pergunta de novo, só com "Seguir assim mesmo" e "Parar".
21. A aprovação final mostra a quantidade e a lista dos itens não medidos ou não verificados
    (arquivo — motivo): os mesmos que o Z do resumo conta. Em seguida mostra as linhas de
    "Notas" do relatório, como o verificador as escreveu.

**CLI**
22. `init --repair-bridges` sem `--ide` e sem `--all` usa a mesma detecção do `update` e regrava
    só as pontes das IDEs instaladas — inclusive com `--yes`, que no reparo não escolhe IDE. Com
    `--ide`, vale a lista pedida (também quando vem junto com `--all`). `--all` sozinho regrava
    as 9, por escolha explícita. Sem ponte detectada, sem `--ide` e sem `--all`, para com erro
    (§6). O resumo lista cada cópia de segurança, com o
    caminho em `.opencrew-backup/<data>/`. O reparo não instala: numa pasta sem workspace do
    OpenCrew, para com erro antes de qualquer escrita, com qualquer opção (§6). Num workspace
    sem `manifest.json`, não cria o manifesto: quem cria é o `update`. A precedência das opções
    no `init` comum não muda (C-11 → U5).

## 6. Erros e casos-limite
| Situação | Comportamento | Mensagem |
|---|---|---|
| Opção obrigatória faltando | código 1, sem status | "Falta a opção obrigatória {opção}." e a linha de uso; a do verificador cita `caminho=formato` |
| Pasta atual sem `_opencrew/` | código 1, sem status | "Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto." |
| `--crew` ou caminho da lista fora do projeto | código 1; conferido antes de testar se existe; nada lido nem escrito | "Caminho fora do projeto: {caminho}" |
| `--crew` inexistente | código 1 | "Crew não encontrada: {caminho}" |
| Nenhum caminho da lista existe | código 1 | "Arquivo não encontrado: {caminho}", uma linha por item |
| Um item da lista não existe | alerta; os outros são verificados | "⚠️ Não verificado — arquivo não encontrado" |
| Pasta na lista | alerta; os outros seguem | "⚠️ Não verificado — é uma pasta" |
| Erro ao ler o arquivo ou ao aplicar uma regra | alerta; os outros seguem | "⚠️ Não verificado — erro ao verificar: {mensagem}" |
| `.md`, `.txt`, `.html` ou `.htm` com byte nulo e sem a marca de UTF-16 | alerta; os outros seguem | "⚠️ Não verificado — o arquivo não está em UTF-8" |
| Erro inesperado fora da verificação de um arquivo | código 1, sem status | "Não consegui verificar: {mensagem}" |
| Arquivo que não é texto | uma linha só, sem nível, fora do resumo | "⚪ Não verificado — não é texto (N): {lista}" |
| Formato declarado sem best-practice | nota informativa; rodam as checagens gerais | "Formato "{id}" não encontrado em `_opencrew/best-practices.local/` nem em `_opencrew/core/best-practices/`." |
| Overlay local sem `constraints:` | usa os limites do core; nota informativa | "O arquivo `_opencrew/best-practices.local/{id}.md` não declara limites (`constraints:`); usei os do core." |
| Limite do overlay local que não é número inteiro | vale o do core; nota informativa | "O arquivo `_opencrew/best-practices.local/{id}.md` tem um limite que não é número inteiro (`{chave}: {valor}`); usei o do core." |
| Formato da tabela declarado, peça principal não achada | alerta | "⚠️ Não medido — não encontrei {peça} neste arquivo (formato {id})"; {peça}: "o título", "legenda nem slides", "o post" ou "o tweet" |
| Peça achada, formato sem o limite | sem nível; conta em Z | "⚪ Não medido — {peça}: sem limite definido no formato {id}"; {peça}: "título", "meta description", "legenda", "hashtags", "slides", "post" ou "tweet" |
| Formato declarado fora da tabela, com best-practice, e nada medido no arquivo | sem nível; conta em Z | "⚪ Não medido — o verificador ainda não mede os limites do formato {id}" |
| Blog declarado com seção de outro canal | sem nível; conta em Z; a seção não é medida | "⚪ Não medido — seção de outro canal num arquivo de blog: {cabeçalho}" |
| Arquivo sem formato declarado e sem achado | não conta em Z | "⚪ Nada a apontar nas checagens gerais (formato não informado: limites não medidos)" |
| Arquivo com formato declarado, sem procura de peça (`.html`, `.csv`, formato sem best-practice) e sem achado | não conta em Z | "⚪ Nada a apontar nas checagens gerais (limites não medidos)" |
| `{{variável}}` em e-mail ou WhatsApp | nota informativa, sem bloqueio | "Variável de personalização {{…}}: confira se a sua ferramenta de envio troca pelo dado real." |
| Linha de proibição com termo preferido | o termo preferido não bloqueia; nota informativa | "Termos lidos como preferidos (não bloqueiam): "…"" |
| `--corrigir` com pendência sem sugestão única | esses itens não mudam; os de sugestão única são trocados | "Não há correção automática para {N} pendência(s): escolha um candidato ou corrija o caminho na crew." |
| Busca por nome parou no limite de itens | segue; o relatório avisa; o candidato visto é listado ("Encontrei 1 candidato: …"), sem virar sugestão | "Procurei só nos primeiros {limite} itens do projeto; pode existir um arquivo com esse nome que eu não vi." |
| Lista com mais de 20 candidatos ou nomes da pasta esperada | mostra os 20 primeiros; a contagem segue completa | "… e mais {N}" |
| Script não rodou (sem Node, erro ou sem linha de status) | o runner avisa, segue e repete o aviso na aprovação final | "⚠️ A verificação automática não rodou: {motivo}" ou "⚠️ A conferência de fontes não rodou: {motivo}" |
| Limite de ciclos, último relatório `VERIFICACAO:BLOQUEADA` | o runner para e mostra os bloqueios e as três opções | "⚠️ A revisão ainda encontra bloqueios depois de {N} ciclos:" |
| Limite de ciclos, qualquer outro status | o runner para e mostra o parecer e as três opções | "A revisão não aprovou o texto depois de {N} ciclos. Motivo: {parecer resumido}" |
| `--repair-bridges` sem ponte detectada, sem `--ide` e sem `--all` | código 1, nada escrito | "Não encontrei pontes de IDE aqui. Use `--ide=<id>` para escolher. Ids válidos: {lista}." |
| `--repair-bridges` numa pasta sem workspace do OpenCrew | código 1, nada escrito, com qualquer opção | "Não encontrei um workspace do OpenCrew nesta pasta. O reparo não instala: para instalar, rode `npx @aksp/opencrew@latest init`." |

## 7. Segurança
O verificador só lê dentro do projeto. A conferência recusa `--crew` de fora (regra 13) e só lê o
conteúdo e escreve em arquivos da crew; `--corrigir` guarda `.bak`. Para um caminho absoluto ou
com `..` citado pela crew, ela continua testando se existe e, quando falta, listando os nomes da
pasta esperada, mesmo fora do projeto, sem ler conteúdo (regra 2 da U2, sem mudança). Nenhum
acesso à internet. Nada é apagado. Dois limites, só com link ou caminho de rede criados pelo
próprio usuário (§12): a checagem de "dentro do projeto" compara o texto dos caminhos e não
resolve links; e um caminho de rede (`\\servidor\…`) citado pela crew é testado como os outros.

## 8. Cenários BDD
Nos cenários, "num `=formato`" quer dizer que o arquivo vai na lista com esse formato declarado;
"sem formato declarado", que vai sem `=formato` e sem `--formato`. Número solto é contagem de
caracteres; "125/70" é medido/limite. O grupo R1-10 continua o R1-01, que usou todas as letras.

**Reconhecer**
- **R1-01a** DADO, num `=instagram-feed`, legenda de 2.300 em `=== CAPTION ===` e 31 hashtags em
  `=== HASHTAGS ===` ENTÃO dois bloqueios: 2300/2200 e 31/30.
- **R1-01b** DADO, num `=instagram-feed`, um carrossel de 12 slides ENTÃO bloqueio 12/10 em cada
  escrita, sob `# Carrossel` ou em `=== SLIDES ===`: linhas "Slide 1 (Cover):"; `## Slide N`;
  `**Slide N**`; slides separados por `---`.
- **R1-01c** DADO, num `=blog-post`, blog sem frontmatter, com `=== TITLE ===` de 125 e
  `=== META DESCRIPTION ===` de 218 ENTÃO dois bloqueios: 125/70 e 218/160.
- **R1-01d** DADO, num `=linkedin-post`, `=== HOOK ===`, `=== BODY ===` e `=== CTA ===` cujo
  texto unido tem 3.100, e 6 hashtags em `=== HASHTAGS ===` ENTÃO dois bloqueios: 3100/3000 e
  6/5.
- **R1-01e** DADO um `=instagram-feed` sem legenda nem slide reconhecível ENTÃO aparece o alerta
  "Não medido — não encontrei legenda nem slides…", o resumo conta 1 alerta e 1 não medido, não
  aparece "Nada a apontar" e o status é `VERIFICACAO:OK`.
- **R1-01f** DADO, na mesma chamada, um `=blog-seo` com título de 65 e um `=instagram-feed` com
  legenda de 2.300 ENTÃO cada um é medido pelo seu formato: 65/60 e 2300/2200.
- **R1-01g** DADO, sem formato declarado, `# LinkedIn — semana` (sem texto próprio) com três
  `## LinkedIn — Post` de 1.200 ENTÃO três medições, numeradas na ordem ("post 1" a "post 3"), e
  nenhum bloqueio.
- **R1-01h** DADO, sem formato declarado, `## Legenda Instagram`, o texto, uma linha `---` e,
  depois dela, 31 hashtags ENTÃO bloqueio 31/30, e a linha `---` não entra na contagem.
- **R1-01i** DADO arquivo com BOM e título de 125 no frontmatter ENTÃO bloqueio 125/70.
- **R1-01j** DADO um arquivo só com o texto, sem cabeçalho nem rótulo ENTÃO bloqueio com "(arquivo
  inteiro)", em cada caso: `=linkedin-post` com 3.100 (3100/3000); `=twitter-post` com 300 em
  dois parágrafos (300/280).
- **R1-01k** DADO, num `=linkedin-post`, `## LinkedIn — Post 1` com 3.100 de texto próprio e um
  `### Primeiro comentário do post` dentro ENTÃO bloqueio 3100/3000 no post, e o comentário é
  medido à parte.
- **R1-01l** DADO um formato declarado fora da tabela ENTÃO a seção com a palavra do canal
  continua medida, em cada caso: `## Legenda Instagram` de 2.300 num `=instagram-reels`
  (2300/2200); `## Thread Twitter` com um parágrafo de 400 num `=twitter-thread` (400/280).
- **R1-01m** DADO um `=blog-seo` com título dentro do limite e um `## Como postar no LinkedIn` de
  3.500 ENTÃO nenhum item de LinkedIn e nenhum bloqueio.
- **R1-01n** DADO um `=blog-seo` sem frontmatter e sem rótulos, com o título só em `# …` de 125
  ENTÃO aparece o alerta "Não medido — não encontrei o título…", os links são contados, o resumo
  conta 1 não medido e não aparece "Nada a apontar".
- **R1-01o** DADO arquivo sem formato declarado e sem nenhum achado ENTÃO aparece "⚪ Nada a
  apontar nas checagens gerais (formato não informado: limites não medidos)", não aparece "✅", e
  o resumo conta 0 não medidos.
- **R1-01p** DADO, num `=twitter-post`, `=== TWEET ===` com 300 em dois parágrafos ENTÃO um
  bloqueio 300/280.
- **R1-01q** DADO `title:` no frontmatter de um `=linkedin-post` ENTÃO não há item de blog.
- **R1-01r** DADO, sem formato declarado, `# Legendas para Instagram` (sem texto próprio) com três
  `## Legenda N` de 975 ENTÃO três medições e nenhum bloqueio.
- **R1-01s** DADO, num `=instagram-feed`, 10 slides e uma lista de notas com
  `- Slide 3: trocar a foto` ENTÃO 10/10, sem bloqueio.
- **R1-01t** DADO, sem formato declarado, `=== CAPTION ===` de 2.300 ENTÃO bloqueio 2300/2200.
- **R1-01u** DADO, num `=linkedin-post`, dois posts escritos com `=== HOOK ===` … `=== CTA ===`,
  de 1.600 cada ENTÃO duas medições ("post 1" e "post 2") e nenhum bloqueio.
- **R1-01v** DADO, num `=instagram-feed`, `# Carrossel` com doze `## Slide N` e um `## Legenda` de
  500 ENTÃO bloqueio 12/10 nos slides, e a legenda é medida em separado (500/2200).
- **R1-01w** DADO, num `=instagram-feed`, `## Legenda` (sem "Instagram") de 2.300 ENTÃO bloqueio
  2300/2200.
- **R1-01x** DADO um `=blog-seo` com `=== TITLE TAG ===` de 80 ENTÃO bloqueio 80/60.
- **R1-01y** DADO um roteiro `=youtube-script` com `=== HOOK ===`, `=== BODY ===` e `=== CTA ===`
  somando 5.000 ENTÃO nenhum item de LinkedIn, nenhum bloqueio, e aparece "Não medido — o
  verificador ainda não mede os limites do formato youtube-script".
- **R1-01z** DADO um `=instagram-feed` com `## Legenda` de 500 e `## Post LinkedIn` de 3.100 ENTÃO
  bloqueio 3100/3000 no post.
- **R1-10a** DADO, sem formato declarado, um roteiro com `=== HOOK (0-30s) ===` e 5.000 ENTÃO
  nenhum item de LinkedIn (o rótulo é comparado inteiro).
- **R1-10b** DADO, num `=instagram-feed`, `## Legenda` de 500 e, depois, `## Hashtags` com 31
  ENTÃO bloqueio 31/30.
- **R1-10c** DADO, num `=instagram-feed`, `## Legenda` de 500 e, depois, `=== HASHTAGS ===` com
  31 ENTÃO a legenda mede 500 (a linha de rótulo encerra a seção de cabeçalho) e sai o bloqueio
  31/30.
- **R1-10d** DADO, num `=blog-post`, dois `=== TITLE ===`, o primeiro de 60 e o segundo de 125
  ENTÃO um item de título só, 60/70.
- **R1-10e** DADO, num `=linkedin-post`, `=== BODY ===` e `=== CTA ===` sem `=== HOOK ===`, com
  texto unido de 3.100 ENTÃO bloqueio 3100/3000.
- **R1-10f** DADO, num `=linkedin-post`, só o cabeçalho `## Proposta comercial` ENTÃO ele não é
  post ("proposta" não é "post"): sai o alerta "Não medido — não encontrei o post…".
- **R1-10g** DADO, num `=instagram-feed`, `=== CAPTION ===` de 500 seguido de `## Post LinkedIn`
  de 3.100 ENTÃO a legenda mede 500 (o cabeçalho que é peça encerra a seção de rótulo) e sai o
  bloqueio 3100/3000 no post.

**Não bloquear errado**
- **R1-02a** DADO `.md` com `#666666`, `#111` e `#000000ff` ENTÃO nenhum "Placeholder".
- **R1-02b** DADO `slide.html` com cores no `<style>` e `[Nome]` no texto visível ENTÃO um
  bloqueio, o do texto.
- **R1-02c** DADO `foto.jpg` e `doc.docx` na lista ENTÃO código 0, uma linha "Não verificado —
  não é texto (2)" com os dois, nenhum bloqueio e `VERIFICACAO:OK`, mesmo quando a lista só tem
  esses dois.
- **R1-02d** DADO "XXX Congresso Brasileiro", "2000000" e "CEP 59000000" ENTÃO zero bloqueios.
- **R1-02e** DADO "Oi {{name}}!" num `=whatsapp-broadcast` ou num `=email-newsletter` ENTÃO nota
  informativa e nenhum bloqueio.
- **R1-02f** DADO `dados.json` e um arquivo com conteúdo binário e extensão desconhecida ENTÃO os
  dois saem em "Não verificado — não é texto".
- **R1-02g** DADO um post correto e 10 arquivos `.png` ENTÃO o resumo diz 0 não medidos, e uma
  linha só cita os 10.
- **R1-02h** DADO `wa.me/5584999999999` no texto ENTÃO bloqueio "Placeholder".
- **R1-02i** DADO "Ligue para XXX" no fim de uma linha, seguida de uma linha que começa com
  maiúscula ENTÃO bloqueio.
- **R1-02j** DADO "Oi {{name}}!" num `=linkedin-post` ENTÃO bloqueio.
- **R1-02k** DADO `pagina.html` com `<a href="https://wa.me/5584999999999">Fale conosco</a>`
  ENTÃO bloqueio.
- **R1-02l** DADO `slide-01.html` num `=instagram-feed`, sem achado ENTÃO não aparece "Não medido"
  para ele, e sai "⚪ Nada a apontar nas checagens gerais (limites não medidos)".
- **R1-03a** DADO a proibição "IA" e o texto "no dia a dia, a trajetória" ENTÃO nenhum bloqueio.
- **R1-03b** DADO `- Nunca usar "barato"; prefira "acessível"` e o texto "acessível" ENTÃO
  nenhum bloqueio, e uma nota informativa lista "acessível" como termo preferido.
- **R1-03c** DADO a proibição "IA" e o texto "a IA resolve" ou "as IAs" ENTÃO bloqueio.
- **R1-03d** DADO a proibição "IA" e o texto "eu ia comentar" ENTÃO nenhum bloqueio.
- **R1-03e** DADO a proibição "#publi" ENTÃO "use #publi no fim" bloqueia e "#publicidade" não.
- **R1-03f** DADO a proibição "barato" e o texto "baratos" ENTÃO bloqueio.
- **R1-03g** DADO um marcador de troca e o texto "acessível" ENTÃO nenhum bloqueio, em cada caso:
  `- Nunca usar "barato" → usar "acessível"`; `- Nunca usar "barato"; trocar por "acessível"`.
- **R1-03h** DADO uma linha em que o marcador não vale ENTÃO o termo depois dele continua
  proibido, em cada caso: `- Nunca usar "barato" nem usar "promoção"`;
  `- Nunca usar "barato"; também não usar "baratinho"`;
  `- Proibido "grátis" por exigência do jurídico, e também "gratuito"`;
  `- Nunca usar "barato" nem "por apenas"`.
- **R1-03i** DADO `- Usar "acessível" em vez de "barato"` ENTÃO os dois termos bloqueiam.
- **R1-04a** DADO `best-practices.local/instagram-feed.md` sem `constraints:` e, num
  `=instagram-feed`, uma legenda com 45 hashtags ENTÃO bloqueio 45/30, pelo limite do core, e
  uma nota informativa.
- **R1-04b** DADO overlay local com `hashtags_max: 5` e, num `=instagram-feed`, legenda de 2.300
  em `=== CAPTION ===` e 6 hashtags em `=== HASHTAGS ===` ENTÃO dois bloqueios: 6/5 e 2300/2200.
- **R1-04c** DADO, num `=blog-post`, título achado e um best-practice que não declara
  `title_max_chars` ENTÃO aparece "Não medido — título: sem limite definido no formato…" e o
  resumo conta 1 não medido.
- **R1-04d** DADO `instagram-feed.md` só em `best-practices.local/` (o core não tem o arquivo),
  com `hashtags_max: 5`, e, num `=instagram-feed`, uma legenda com 6 hashtags ENTÃO bloqueio 6/5
  e nenhuma nota informativa de formato não encontrado.
- **R1-04e** DADO um `=blog-post` com título e meta description dentro do limite ENTÃO nenhuma
  linha sobre links, 0 não medidos e aparece "Nada a apontar.".

**Contrato**
- **R1-05a** DADO o verificador rodado numa pasta sem `_opencrew/` ENTÃO código 1, a mensagem "Não
  encontrei `_opencrew/` nesta pasta…" e nenhuma linha `VERIFICACAO:`.
- **R1-05b** DADO `verificar.mjs --crew crews/nao-existe` ENTÃO código 1, "Crew não encontrada:
  crews/nao-existe" e nenhuma linha `VERIFICACAO:`.
- **R1-05c** DADO um arquivo com dois bloqueios e outro inexistente ENTÃO código 0, os dois
  bloqueios aparecem, o outro sai como alerta "Não verificado — arquivo não encontrado" e a
  última linha é `VERIFICACAO:BLOQUEADA`.
- **R1-05d** DADO só caminhos inexistentes ENTÃO código 1 e "Arquivo não encontrado: {caminho}"
  para cada um (o U1-01j continua valendo).
- **R1-05e** DADO um post de blog com o link `[x](https://)` e o site no `company.md` ENTÃO
  nenhum erro, e o link não entra na contagem.
- **R1-05f** DADO o caminho absoluto de um arquivo de dentro do projeto ENTÃO ele é verificado
  como o relativo.
- **R1-05g** DADO `post.md=formato-inexistente` ENTÃO a nota informativa "Formato … não
  encontrado…", as checagens gerais rodam, o código é 0 e, sem achado, sai "⚪ Nada a apontar nas
  checagens gerais (limites não medidos)".
- **R1-05h** DADO uma regra que lança erro num arquivo (falha injetada pelo teste, por parâmetro
  de `verificar()`) e outro arquivo com bloqueio ENTÃO o primeiro sai como "Não verificado — erro
  ao verificar: …", o bloqueio do outro aparece e o status é `VERIFICACAO:BLOQUEADA`.
- **R1-05i** DADO `--arquivo ../fora.md`, ou `--crew ../outra`, no verificador ENTÃO código 1,
  "Caminho fora do projeto: …" e nenhuma linha `VERIFICACAO:`.
- **R1-05j** DADO uma pasta e um arquivo na lista ENTÃO a pasta sai como alerta "Não verificado —
  é uma pasta" e o arquivo é verificado.
- **R1-05k** DADO o verificador sem `--crew` ou sem `--arquivo` ENTÃO código 1, "Falta a opção
  obrigatória …" e a linha de uso, que cita `caminho=formato`.
- **R1-05l** (acrescentado na implementação, §14) DADO `--crew` em caminho absoluto de dentro do
  projeto e um termo proibido na memória da crew ENTÃO a memória é lida e o termo bloqueia, como
  com o caminho relativo.

**Conferência de fontes**
- **R1-06a** DADO `- caminho: Docs/guia.md   # comentário` e `- caminho: "Docs/outro.md"`,
  ambos inexistentes ENTÃO duas pendências.
- **R1-06b** DADO um caminho inexistente entre crases numa task e outro num arquivo de agente
  ENTÃO duas pendências.
- **R1-06c** DADO `--crew ../vizinho/crews/c --corrigir` ENTÃO código 1, "Caminho fora do
  projeto" e nenhum arquivo escrito.
- **R1-06d** DADO `--corrigir` com uma pendência de dois candidatos ENTÃO aparece "Não há
  correção automática para 1 pendência(s)…" e não aparece "Nada a corrigir.".
- **R1-06e** DADO, em `fontes:`, uma pasta sem barra final (`caminho: Docs/Marca`) que foi movida
  ENTÃO o novo caminho é sugerido.
- **R1-06f** DADO o limite de itens da busca reduzido pelo teste (parâmetro de `conferir()`) e um
  arquivo movido para além dele ENTÃO o relatório traz a frase de busca parcial e não diz "nem
  nada com esse nome no projeto".
- **R1-06g** DADO a conferência rodada numa pasta sem `_opencrew/` ENTÃO código 1, a mesma
  mensagem do verificador e nenhuma linha `FONTES:`.
- **R1-06h** DADO `conferir-fontes.mjs --crew crews/nao-existe` ENTÃO código 1, "Crew não
  encontrada: crews/nao-existe" e nenhuma linha `FONTES:`.
- **R1-06i** (acrescentado na implementação, §14) DADO a conferência sem `--crew` ENTÃO código 1,
  "Falta a opção obrigatória --crew." e a linha de uso.
- **R1-06j** (acrescentado depois da conferência no Projeto A, §14) DADO um caminho com marcador
  de modelo entre crases num arquivo de agente (`Relatorios/AAAA-MM-DD_resumo.pdf`,
  `Relatorios/YYYY-MM-DD-nota.md`) ENTÃO ele não é conferido: nenhuma pendência e `FONTES:OK`;
  DADO `Relatorios/2026-03-03_resumo.pdf` inexistente ENTÃO pendência.

**Runner (contratos de prompt)**
- **R1-07a** o runner passa `caminho=formato` com o `format:` do passo de cada arquivo, não passa
  `--formato`, e deixa sem `=formato` o passo sem `format:` ou com `format:` de exportação
  (`pdf`, `csv`, `formatted-post`).
- **R1-07b** ciclos: o texto diz que ciclo é uma passada do revisor, que o padrão é 3 e onde
  `max_review_cycles` mora; no limite sem bloqueio, mostra "A revisão não aprovou o texto depois
  de {N} ciclos" com as três opções; a opção 2 não traz "fica registrado".
- **R1-07c** o bloco `--- REGRAS DO REVISOR ---` é injetado em todo passo com `on_reject`, com as
  quatro linhas da regra 19, inclusive a exceção do `[PREENCHER]`.
- **R1-07d** verificador que não rodou: o aviso aparece, a execução segue e a aprovação final o
  repete.
- **R1-07e** a aprovação final mostra a quantidade e a lista (arquivo — motivo) dos itens não
  medidos ou não verificados.
- **R1-07f** a proibição é gravada na forma canônica nos dois pontos: no checkpoint e na
  atualização da memória no fim da execução.
- **R1-07g** o parecer do revisor vai ao redator em toda rejeição, com ou sem bloqueio.
- **R1-07h** conferência que não rodou: o aviso "A conferência de fontes não rodou: {motivo}"
  aparece, a execução segue e a aprovação final o repete.
- **R1-07i** a conferência roda antes de carregar as fontes, e as fontes são relidas depois de
  `--corrigir`.

**CLI**
- **R1-08a** DADO workspace só com Claude Code QUANDO `init --repair-bridges` ENTÃO só a ponte
  do Claude Code é regravada e nenhuma outra IDE ganha arquivo.
- **R1-08b** DADO a ponte `.claude/skills/opencrew/SKILL.md` editada QUANDO
  `init --repair-bridges` ENTÃO o resumo lista a cópia de segurança, com o caminho em
  `.opencrew-backup/<data>/`.
- **R1-08c** DADO nenhuma ponte detectada e sem `--ide` ENTÃO código 1, a mensagem com os ids
  válidos e nada escrito.
- **R1-08d** DADO workspace só com Claude Code QUANDO `init --repair-bridges --yes` ENTÃO nenhuma
  outra IDE ganha arquivo.
- **R1-08e** DADO workspace só com Claude Code QUANDO `init --repair-bridges --all` ENTÃO as
  pontes das 9 IDEs são gravadas.
- **R1-08f** DADO workspace só com Claude Code QUANDO `init --repair-bridges --ide=cursor --yes`
  ENTÃO só a ponte do Cursor é gravada.

**Travas e upgrade**
- **R1-09a** (F1-11a) DADO o payload ENTÃO a lista `KNOWN_BROKEN` de
  `tests/template-refs.test.js` está vazia.
- **R1-09b** (F1-01d) DADO um workspace só com Cursor QUANDO `update` ENTÃO nenhum `CLAUDE.md` é
  criado. O teste que já existe ganha o nome "IDE não instalada não ganha CLAUDE.md".
- **R1-09c** nenhum arquivo de `templates/` (fora `skills/opencrew-skill-creator/`) casa com
  `1080\s*[x×]\s*1440`, sem diferenciar maiúsculas.
- **R1-09d** DADO um workspace completo com o `.gitignore` editado QUANDO `init` roda de novo
  ENTÃO o `.gitignore` não muda: o `init` sai sem escrever. Substitui o teste "init preserves an
  existing .gitignore (overwrite:false)" de `tests/init.test.js`.
- **R1-upg** DADO um workspace 1.6.0 (sem os módulos novos do verificador) com
  `best-practices.local/instagram-feed.md` sem `constraints:` e uma saída com legenda de 2.300
  em `=== CAPTION ===` QUANDO `update` e, depois, o verificador entregue em
  `<workspace>/_opencrew/core/scripts/` (importado de lá, não de `templates/`) roda com
  `=instagram-feed` ENTÃO bloqueio 2300/2200 e uma nota informativa; o `runner.pipeline.md`
  instalado traz `--- REGRAS DO REVISOR ---`; o overlay local e a crew ficam como estavam.

Os testes de R1-09a e R1-09b levam os dois IDs no nome: "F1-11a (R1-09a): …" e
"F1-01d (R1-09b): …".

## 9. O que o humano confere na tela
- [x] Antes da tag, sem atualizar nada: a partir da pasta do Projeto A, rodar o verificador deste
      repositório (só leitura) nas saídas da última execução, com `=linkedin-post` e `=blog-seo`.
      Cada post aparece medido em separado, não há "Nada a apontar" sem medição e nenhum bloqueio
      é falso. Depois do `update` autorizado, repetir com o script instalado.
      Feito em 2026-10-05 (§14): seis posts medidos um a um, título e meta do blog no limite,
      nenhum bloqueio falso; só os `[PREENCHER]` de verdade. A repetição com o script instalado
      fica para depois do `update`.
- [x] No Projeto A, antes da tag: rodar a conferência de fontes deste repositório (sem
      `--corrigir`) e ver que nenhuma pendência nova vem de texto de agente ou de task que não é
      caminho.
      Feito em 2026-10-05 (§14): numa crew, 39 fontes conferidas, nenhuma pendência; na outra,
      uma pendência falsa vinda de um arquivo de agente (caminho de destino com modelo de data
      no nome). Virou o cenário R1-06j e foi corrigido antes da tag. Repetido com o código
      final: as duas crews dão `FONTES:OK` (39 e 33 fontes), e o verificador segue sem bloqueio
      falso.
- [ ] Rodar uma crew até a revisão: o relatório aparece antes do parecer e o revisor cita os
      números dele (jornada de referência, U0).

## 10. Critérios de aceite
- [x] Cenários com teste de mesmo ID, vistos vermelhos antes do código — menos R1-09a a R1-09d,
      que já passam hoje e ficam como trava de regressão (ver cada um falhar com uma alteração
      provisória, desfeita em seguida). Os 101 IDs da seção 8 têm teste; os consertos da revisão
      do código sem cenário próprio levam "R1 revisão:" no nome do teste (§14).
- [x] `npm run verify` verde; os testes U1 e U2 existentes continuam passando (as pastas de teste
      da conferência ganham `_opencrew/`).
- [x] Os comentários de cabeçalho e a linha de uso de `verificar.mjs` citam os três estados e
      `caminho=formato`; os dos dois scripts citam os códigos de saída desta spec (A-34, H2-09).
- [x] Specs F1, U1 e U2, README (linhas do `init --repair-bridges`), `GLOSSARIO.md`, `AGENTS.md`
      (tabela Regra → Trava) e a ajuda do CLI (`src/cli.js`) corrigidos no mesmo commit (regra 9).
- [x] Conferências da seção 9 (1º e 2º itens) feitas antes da tag; o 3º item entra na jornada de
      referência (U0).
- [ ] CHANGELOG 1.6.1; `npm version patch`; release (commit + tag) só com confirmação;
      atualizar A e B só com autorização. Feitos: CHANGELOG e versão local. Faltam a tag e a
      atualização dos dois projetos.

**A porta não cobre:** uma IA seguindo as regras 18 a 21, e as partes do runner nas regras 1 e 11,
numa execução real (→ U0).

## 11. Fora de escopo → destino
| O que não entra | Alocação |
|---|---|
| Critério de detecção de IDE, `.mcp.json`, pontes antigas sem marcador, manifesto corrompido, confirmação em `blotato`/`resend` (H3-10, H1-06, H3-09, H3-06, H3-14, H3-11, H3-19, H1-04) | → R2 — `update` e envio seguros: defeitos do CLI e das skills de envio, fora do verificador |
| Registrar o "aceitar assim mesmo" (H2-07) | → U3a — a entrega grava o aceite |
| Relatório do laço de revisão gravado pelo script (H2-16) | → U5 — custo de tokens; não desliga a trava |
| Medir assunto e prévia de e-mail, WhatsApp e cada tweet de thread; contar legenda e post com as hashtags no fim; em artigo, e-mail e roteiro, cabeçalho é conteúdo (H2-13) | → U3a — a tabela de formatos cresce com a entrega por canal |
| Hashtags do tweet, título do YouTube, título do artigo do LinkedIn e legenda de Reels (H2-13) | → U5 — até lá não são medidos. Os formatos fora da tabela aparecem como "não medido"; as hashtags do tweet não geram linha (o formato não declara limite para elas) |
| Tabela única canal → arquivos | → U3a — nasce com a pasta por canal |
| Mudar a escrita com rótulos dos best-practices | → U5 — o verificador e a entrega leem os dois jeitos de escrever |
| Proibições antigas sem aspas; `fontes:` e regras em crews antigas (H2-05, H3-03, H1-01) | → U4 — conserto de crews antigas |
| Contagem por canal do X/Twitter; arquivo de acréscimo no overlay local e aviso no `update`; best-practice do overlay visível na criação; oferta de trocar caminho absoluto por relativo; precedência de `-y` e `--ide` no `init` comum (H2-17, H3-01, H3-07, H3-16, C-11) | → U5 — polimento: nenhum deles desliga a trava |
| Da revisão do código: checagem de "dentro do projeto" sem resolver links; caminho de rede testado pela conferência; reparo sem a guarda de versão do `update`; caracteres de shell em caminho ou em texto que o runner passa a um script (L7-10, L7-11, L6-06, L7-14) | → R2 — `update` e envio seguros: mesma família de defeito, e nenhum acontece sem link, caminho de rede ou nome fora do padrão criados pelo usuário |
| Da revisão do código: descrição de foto entre colchetes que começa por Produto, Cliente, Evento, Cidade, Data, Nome, Link, Empresa ou Feira lida como placeholder; `BODY` e `CTA` de um bloco de e-mail ou WhatsApp somados ao post aberto antes; deixar de conferir a linha `Writes to` (L2-06, L3-09, L4-05) | → U3a — a entrega por canal define o que é peça de cada canal e onde a crew grava |
| Da revisão do código: pasta de crew sem `crew.yaml` e `fontes:` em lista simples respondem "0 fontes" e `FONTES:OK` (L7-12) | → U4 — conserto de crews antigas: o build grava sempre `- caminho:` |
| Da revisão do código: `=formato` com maiúsculas ou espaço lido como parte do caminho; arquivo enorme lido inteiro para saber se é binário; acento escrito como entidade HTML (L2-14, L7-13, L2-09) | → U5 — polimento |

## 12. Limites conhecidos
- As regras 18 a 21, e as partes do runner nas regras 1 e 11, são seguidas pela IA; os testes
  garantem o texto do runner → U0.
- Sem formato declarado, a detecção continua dependendo das palavras do cabeçalho, e um `title:`
  ou `titulo:` no frontmatter ainda é medido como blog, como na 1.6.0 → U3a na entrega; no laço
  de revisão, → U4 (H2-03): só acontece em passo sem `format:`, e dar formato ao passo é
  conserto de crew antiga.
- Com formato declarado fora da tabela (artigo, e-mail, roteiro), um cabeçalho com a palavra de
  um canal ainda é medido como peça desse canal, como na 1.6.0, e os rótulos não são lidos: uma
  legenda de reels em `=== CAPTION ===` fica "não medida" → U5 (H2-13); o cabeçalho como
  conteúdo em artigo, e-mail e roteiro → U3a.
- Título de blog escrito só como `# …` não é reconhecido: sai o alerta "Não medido" → U5 (o
  `#` do artigo nem sempre é o título de SEO).
- Arquivo `=instagram-feed` só com a legenda, sem cabeçalho nem rótulo: sai o alerta "Não
  medido" → U5 (sem cabeçalho nem rótulo não dá para saber se é legenda ou slide).
- Rótulo traduzido pelo redator (`=== LEGENDA ===`) não é reconhecido: com formato declarado sai
  o alerta "Não medido" → U5 (pede lista de rótulos por idioma).
- Texto solto depois de uma linha `---`, sem cabeçalho nem rótulo, conta na peça de cima.
- Na escrita com rótulos, legenda e post são medidos sem as hashtags de `=== HASHTAGS ===`; sob
  cabeçalho, as hashtags de dentro entram na conta → U3a (regra 26 de lá).
- Cópia inteira de um formato no overlay local continua valendo por cima do core, chave a chave:
  limite corrigido no core não chega a quem tem a cópia → U5 (H3-01).
- Termo proibido: plural só `s`/`es` ("barato" não casa com "barata"); "ia" em minúsculas não
  casa com a sigla "IA"; linha escrita ao contrário (`- Usar "A" em vez de "B"`) mantém os dois
  termos proibidos, e a forma canônica resolve.
- Telefone falso de 8 ou 9 dígitos repetidos, fora de link, não é pego.
- Caminho citado fora de crases (em passos, agentes e tasks) não é conferido → sem fase — o
  build grava os caminhos entre crases (limite herdado da U2).
- Caminho com marcador de modelo no nome (`AAAA-MM-DD`, `{…}`, `<…>`, `*`) não é conferido: é
  nome a preencher, não arquivo. Caminho de destino sem marcador, citado entre crases num
  agente e ainda inexistente, continua virando pendência: a saída é "Seguir assim mesmo"
  → U3a (a entrega declara o destino no `crew.yaml`, fora da conferência).
- "Aceitar assim mesmo" continua sem registrar nada → U3a (H2-07).
- O runner foi de 917 para 945 linhas (alvo 400) e o `build.prompt.md` ganhou 2 (673); a divisão
  fica na U5.
- Os scripts seguem compatíveis com o Node 20.0: sem `readdir({ recursive: true })` (20.1),
  `import.meta.dirname` (20.11), `Object.groupBy` (21) e `fs.glob` (22). A leitura de `agents/`
  usa caminhada própria, como a busca por nome.
- No reparo, a IDE cujos arquivos de ponte próprios foram todos apagados não é detectada: ela só
  volta com `--ide`. O critério da detecção fica como está → R2 (H3-10).
- As mensagens novas do `init --repair-bridges` saem em PT-BR; o resto do CLI continua em
  inglês → U5.
- Arquivo `=twitter-post` sem cabeçalho nem rótulo, com várias opções de tweet separadas por
  linha em branco, é medido como um tweet só (regra 5): escrever cada opção sob
  `=== TWEET ===` resolve → U5 (L3-08).
- Descrição de foto entre colchetes que começa por uma das palavras de placeholder
  (`[Produto sobre a mesa…]`) ainda bloqueia → U3a (L2-06).
- `max_review_cycles` só entra em crew nova, e só quando o desenho da crew tem tier; crew já
  criada segue no padrão 3 → U4.
- Blog que fala de redes sociais (`## Como postar no LinkedIn`) sai com uma linha "Não medido"
  por cabeçalho e sem "✅ Nada a apontar.": o relatório prefere dizer a mais.
- Negação perto do marcador cancela a troca mesmo em frase afirmativa ("deixe claro e use
  "x""): os dois termos ficam proibidos, e a forma canônica resolve.
- Caminho relativo citado por dois agentes com o mesmo texto é conferido uma vez: se existe ao
  lado de um deles, vale para os dois. A lista "Na pasta esperada existem" olha só a crew e a
  raiz.
- Arquivo em UTF-32 ou em Latin-1 é lido como está, sem aviso → U5.
- Links e caminhos de rede (§7): a checagem de "dentro do projeto" não resolve junção nem link
  simbólico, e a conferência testa caminho de rede citado pela crew → R2 (L7-10, L7-11).

## 13. Travas que esta spec deixa
`tests/verificar-pecas.test.js` (novo: R1-01a a R1-01m) · `tests/verificar-formatos.test.js`
(novo: R1-01n a R1-01z, R1-10) · `tests/verificar-regras.test.js` (novo: R1-02 a R1-04) ·
`tests/verificar-contrato.test.js` (novo: R1-05) · `tests/conferir-fontes.test.js` e
`tests/conferir-fontes-r1.test.js` (novo) (R1-06) · `tests/runtime-contracts-r1.test.js` (novo:
R1-07, R1-09c) · `tests/init-repair.test.js` (novo: R1-08) · `tests/template-refs.test.js`
(R1-09a) · `tests/update.test.js` (R1-09b) · `tests/init.test.js` (R1-09d) ·
`tests/upgrade.test.js` (R1-upg: importa do workspace atualizado os dois scripts entregues).

Tamanho (regra 6 do AGENTS.md): os arquivos de teste novos existem porque `verificar.test.js`
(194 linhas), `runtime-contracts.test.js` (215) e `init.test.js` (302) passariam do alvo de 300;
os auxiliares comuns vão para `tests/_helpers.js`. `conferir-fontes.mjs` (189 linhas) e
`verificar/` são divididos em módulos de até 200; `verificar/leitura.mjs` e
`verificar/regras.mjs` mantêm o nome (o teste U1-upg depende dele) e os novos entram ao lado. A
detecção e o resumo das cópias do reparo moram em `src/lib/migrations.js`: `init.js` já tem 189
de 200.

Pontos de extensão que a U3a e a U3b vão usar (sem regra nova aqui): o leitor de peças fica num
módulo próprio, exportado; `verificar()` aceita itens `{ arquivo, formato }` e devolve, para cada
bloqueio, arquivo, item e trecho estáveis; a validação de raiz e de caminho e as mensagens de
erro de uso ficam num módulo comum aos scripts; a divisão de `conferir-fontes.mjs` deixa folga
para um módulo novo. As fases seguintes acrescentam por conta delas: a chamada de `verificar()`
sem crew (U3b), o modo da entrega, sem o padrão `blog-post` para item sem formato, e a medição
de imagens (U3a).

## 14. Correções
Leituras adotadas na implementação (2026-10-05), onde a spec não fechava o caso.

**Verificador**
- Relatório: as linhas "Não medido" e "Não verificado" saem como item de lista (`- ⚠️ …`,
  `- ⚪ …`). Os arquivos que não são texto saem numa linha só, no fim de "**Notas:**", e ficam no
  campo `naoTexto` do resultado.
- Formato declarado sem best-practice segue a regra 3 (c): a seção com palavra de canal continua
  medida. Notas de formato só saem para formato de fato usado (o declarado ou o de uma peça
  achada); a 1.6.0 avisava dos quatro formatos padrão em toda execução.
- Regra 3, plural das palavras de canal e de peça: só `s` (mais "carrosséis"); com `es`,
  "postes" casaria com "post". Na regra 10 o plural é `s`/`es`, como escrito. Carrossel sem
  nenhuma linha "Slide N" não é peça.
- Hashtags: `## Hashtags` sem palavra de canal soma à legenda ou ao post aberto por último; com
  a palavra de um canal, soma à peça desse canal (regra 3). Hashtags sem dono viram peça solta
  com formato declarado e são ignoradas sem ele. Âncora de URL (`…/pagina#secao`) não é hashtag.
- Post do LinkedIn com rótulos: o texto é unido na ordem em que os rótulos aparecem no arquivo.
  Sem formato declarado, `BODY`, `INSIGHTS` e `CTA` só entram depois de um `HOOK`.
- Linha `---`: só a linha some; as linhas em branco em volta contam como quebra.
- "Não medido — {peça}: sem limite…" sai uma vez por peça e formato em cada arquivo.
- Regra 11: numa linha com "em vez de", "ao invés de" ou "no lugar de", nenhum marcador vale;
  todos os termos entre aspas ficam proibidos, mesmo com "use" ou "prefira" na linha.
- Para não haver expressão regular lenta, há teto no que cabe dentro de cada marcação:
  `[Nome …]` até 200 caracteres, `{{…}}` até 100, termo da memória até 200, alvo de link até
  2.000. `[PREENCHER: …]` não tem teto; só o detalhe mostrado é cortado em 300 caracteres.
- HTML: tag de bloco vira quebra de linha; os valores de `href`, `src` e `alt` vão para o fim do
  texto; comentário HTML fica de fora; só as entidades básicas são decodificadas.
- A linha de uso cita os três estados pelo nome, sem o texto "VERIFICACAO:", para o erro de uso
  não imprimir nada parecido com uma linha de status.
- Nome do item com várias peças: "Post LinkedIn — post 2 (texto do cabeçalho) — caracteres"; com
  rótulos, "Post LinkedIn — post 2 — caracteres". Tweets são numerados pelo arquivo inteiro.
- API: `verificar()` lança erro com a mensagem de uso (o `main` valida antes e devolve 1);
  `lerLimites` devolve `{ limites, nota }`; `lerSecoes`, `regrasBlog` e `regrasCanais` deixaram
  de existir (não tinham outro consumidor).
- Cenário novo R1-05l: `--crew` em caminho absoluto de dentro do projeto passava na validação e
  a memória da crew não era lida (achado na integração, corrigido com teste).

**Conferência de fontes**
- Cenário novo R1-06i: opção faltando dá "Falta a opção obrigatória --crew." e a linha de uso.
  `--crew` seguido de outra opção conta como faltando; `--crew` apontando para um arquivo dá
  "Crew não encontrada".
- Regra 17: todo caminho sem barra final casa com arquivo ou pasta de mesmo nome (não só os de
  `fontes:`); a sugestão de pasta sai com barra final. Quando a busca para no limite, a frase
  de busca parcial vai em toda linha de pendência.
- Regra 15: o que está entre aspas é lido ao pé da letra; comentário só começa em espaço + `#`.
- "Não há correção automática para {N}…": N conta toda pendência sem sugestão única.
- Regra 16: caminho citado num agente ou numa task é resolvido na ordem da U2 (crew, raiz,
  absoluto) e, depois, na pasta de quem cita e em `agents/X/` (para `agents/X.agent.md`). Passo
  e `crew.yaml` não ganham a pasta própria.
- **Conferência no Projeto A (§9), 2026-10-05:** a leitura nova de `agents/` gerou uma pendência
  falsa numa crew real: um arquivo de agente citava, entre crases, o caminho de destino dos
  arquivos que a crew grava, com modelo de data no nome. A 1.6.0 dava `FONTES:OK`; a versão nova
  pararia toda execução para perguntar. Cenário novo R1-06j: caminho com marcador de modelo não
  é conferido. O limite que sobra está na §12.

**Runner**
- Regra 20: os passos de início trocaram de ordem (a conferência de fontes passou a ser o 1c e a
  carga das fontes o 1d). Depois de `--corrigir`, o runner relê o `crew.yaml` e os agentes já
  carregados; o 1d carrega as fontes dos caminhos corrigidos.
- Regra 21: a linha da aprovação final é `Verificação automática: {N} bloqueios, {M} alertas,
  {Z} não medidos`, seguida da lista `{arquivo} — {motivo}` e das linhas de "Notas".
- Regra 19: o bloco do revisor é o item 4g de "Agent Loading", logo depois do bloco de veracidade.
- Crew sem passo de revisão não tem aprovação final: nela o aviso de script que não rodou
  aparece só no início.
- `max_review_cycles`: o `build.prompt.md` grava o campo no passo de revisão, pelo tier da crew
  (Express 1, Standard 2, Full 3). O `design.prompt.md` não cita o campo; sem tier no desenho,
  ele fica ausente e vale o padrão 3.
- Regra 1: o runner só passa `=formato` quando o `format:` do passo tem só minúsculas, dígitos
  e hífen; com outro texto, o item iria inteiro como caminho e o arquivo ficaria sem
  verificação. A pasta da crew vai entre aspas nos dois comandos.
- Limite de ciclos quando o verificador não rodou (sem relatório nem status): o runner não tem
  texto próprio; vale a mensagem do parecer do revisor.

**CLI**
- O erro do reparo sem ponte sai como erro de uso: depois da mensagem em PT-BR vem a linha padrão
  do CLI, em inglês ("Run npx @aksp/opencrew help for usage.") → U5 (CLI em PT-BR).
- Resumo das cópias: "{N} cópia(s) de segurança feita(s) antes de regravar:" e uma linha por
  cópia, com o caminho em `.opencrew-backup/<data>/`.
- Ponte de bloco marcado (`CLAUDE.md`, `GEMINI.md`…) editada dentro do bloco é regravada sem
  cópia, como no `update` → R2.
- `init --repair-bridges` numa pasta sem workspace para com erro de uso (código 1, nada
  escrito), também com `--yes`, `--all` e `--ide`. Workspace com o core e sem o carimbo de
  versão continua sendo reparado. A dica do `init` e a tabela do README citam
  `npx @aksp/opencrew@latest`.
- O teste do R1-09b ficou com o nome em inglês, como os demais.

**Conferência no Projeto A (§9), verificador, 2026-10-05:** com o script deste repositório, só
leitura: seis posts de LinkedIn medidos um a um (a 1.6.0 mostrava as linhas sem dizer qual post
era qual e uma medição vazia do título do arquivo), título e meta description do blog no limite,
links contados, nenhum bloqueio falso; o estado final foi `AGUARDANDO_USUARIO`, só pelos
`[PREENCHER]` que existem de fato.

**Revisão do código antes da tag (2026-10-05).** Sete leituras independentes do código, cada
achado posto à prova antes de valer, e duas rodadas de conserto com teste visto vermelho. O que
mudou de comportamento está nas regras 1 a 3, 6, 9, 11, 12, 14, 16 a 18 e 20 a 22 e na §6. Os
consertos sem cenário próprio têm teste com "R1 revisão:" no nome. Fora das regras:
- Verificador: título e meta description em bloco YAML (`>-`, `|`) ou entre aspas em duas linhas
  são medidos inteiros; primeira linha `---` usada como separador não é lida como frontmatter;
  limite do overlay com comentário ou entre aspas vale como número; termo proibido de duas
  palavras casa com quebra de linha ou dois espaços no meio; proibição em lista numerada, com
  `+` ou sob cabeçalho de nível 2 a 4 é lida; `src="data:…"` fica fora das checagens; o detalhe
  do placeholder é cortado em 160 caracteres e o cabeçalho no nome do item, em 120.
- Os dois scripts imprimem o relatório também com o projeto aberto por junção ou link de pasta
  (antes saíam em silêncio, com código 0).
- Conferência: no relatório sem pendência nem alerta, o resumo vem logo depois do título.
- Testes: os de R1-02, R1-03, R1-06, R1-08 e R1-10 foram reforçados onde passavam com a regra
  errada (conferido alterando o código de propósito).
- Adiados, com destino na §11 e na §12: L2-06, L2-09, L2-14, L3-08, L3-09, L4-05, L6-06 e L7-10
  a L7-14.
