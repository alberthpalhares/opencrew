# Spec — Fase U1: Revisor com dentes (1.5.0)

- **Fase:** U1 · **Módulo:** Runtime (`templates/`) · **Status:** implementada (2026-10-02) e
  publicada na 1.5.0; execução real com o verificador no laço de revisão **pendente** → jornada
  de referência (U0), com o dono (§9, §10 e §14)
- **Termos novos no GLOSSARIO.md:** sim — Verificador automático, Bloqueio, Alerta, Marcador `[PREENCHER]`
- **Modelo sugerido:** execução Sonnet 5.5 · médio

## 1. Objetivo
O que a crew entrega para aprovação passa a ter sido **medido**, não "achado": textos acima do
limite do formato, placeholders, termos que o usuário proibiu e invenções não chegam ao usuário
como "aprovados". O revisor passa a citar números reais.

## 2. O que esta fase herda
Varredura do relatório de auditoria (§3, emenda) e de `docs/jornada/2026-10-02-uso-real.md`:

| Origem | Item | Exige daqui |
|---|---|---|
| Uso real, dor 1 | Revisor aprova sem medir (meta 218 declarada como 158; placeholder aprovado; 10/10 sempre) | U1-01, U1-02, U1-03 |
| Uso real, dor 2 | Fatos inventados (história em 1ª pessoa, caso "[Empresa X]") | U1-01 (alerta/placeholder), U1-04 |
| Uso real (achado novo) | No Projeto A, o revisor só recebeu o post do blog; as legendas (passo seguinte) nunca foram revisadas | U1-02 (verificar todas as saídas desde o redator) |
| T-M5 (parcial) | Proibições da memória não eram cobradas | U1-01 lê `## Proibições Explícitas` |
| Uso real, dor 6 (parcial) | Slides 1080×1440 (3:4) que a API do Instagram recusa | U1-05 (limites normalizados; formato 4:5) |
| Fora daqui | Regra de Ouro, propagação ao `company.md`, fontes do projeto | → U2 |

## 3. Entradas
`node _opencrew/core/scripts/verificar.mjs --crew <pasta da crew> --arquivo <a>[,<b>…] [--formato <blog-post|blog-seo>]`

| Campo | Tipo | Obrigatório | Validação |
|---|---|---|---|
| `--crew` | caminho relativo à raiz do projeto | sim | pasta existe (lê `_memory/memories.md` se existir) |
| `--arquivo` | um ou mais `.md`, separados por vírgula | sim | cada arquivo existe |
| `--formato` | id do best-practice do blog | não | padrão `blog-post`; o arquivo `_opencrew/core/best-practices/<id>.md` existe |

Os limites vêm **sempre** do frontmatter `constraints:` dos best-practices (fonte única). Desde a
1.6.0 (spec U2, regra 6 e cenário U2-04d), o verificador procura primeiro o overlay local
`_opencrew/best-practices.local/<id>.md` (nunca tocado pelo `update`) e só depois o arquivo do
core.

## 4. Saídas
- Relatório em PT-BR (markdown) no stdout, uma seção por arquivo: tabela *Item · Medido · Limite
  · Resultado*, depois a lista de alertas e um resumo ("2 bloqueios, 1 alerta").
- **Última linha**, um de três estados: `VERIFICACAO:OK` (nenhum bloqueio),
  `VERIFICACAO:BLOQUEADA` (há bloqueio que o redator resolve) ou `VERIFICACAO:AGUARDANDO_USUARIO`
  (os únicos bloqueios são `[PREENCHER]`). O terceiro estado entrou em 2026-10-02 (§14).
- Código de saída: 0 sempre que conseguiu verificar (qualquer um dos três estados); 1 em erro de
  uso (opção faltando, arquivo inexistente).
- O runner grava o relatório em `crews/{nome}/output/{run_id}/verificacao-ciclo-{N}.md`.

## 5. Regras de negócio
1. **Máximos bloqueiam, mínimos alertam.** Ultrapassar um `*_max_chars`, `hashtags_max` ou
   `carousel_max_slides` é **bloqueio** (fácil de corrigir: encurtar). Ficar abaixo de um mínimo
   (`min_internal_links`, `min_external_links`) é **alerta** (pode depender de informação do
   usuário).
2. **O que é medido, por tipo de conteúdo detectado no arquivo:**
   - *Blog* (frontmatter com `title`/`titulo`): título contra `title_max_chars`; `meta_description`
     (ou `meta_descricao`) contra `meta_description_chars`; links internos (relativos ou do
     domínio do site da empresa) e externos contra os mínimos, se existirem no formato.
   - *Instagram* (seção cujo cabeçalho tem "legenda"/"caption" e "instagram"): caracteres contra
     `caption_max_chars`; hashtags contra `hashtags_max`. Seção de carrossel com subtítulos
     "Slide N": número de slides contra `carousel_max_slides`. Limites de `instagram-feed`.
   - *LinkedIn* (cabeçalho com "linkedin"): caracteres contra `post_max_chars`; hashtags contra
     `hashtags_max`. Limites de `linkedin-post`.
   - *Twitter/X* (cabeçalho com "tweet"/"twitter"): cada tweet contra `tweet_max_chars`.
   - *Qualquer texto*: placeholders → **bloqueio**; `[PREENCHER: …]` → **bloqueio** ("falta
     informação sua"); termo proibido → **bloqueio**; afirmação a confirmar → **alerta**. Se os
     únicos bloqueios forem `[PREENCHER]`, a última linha é `VERIFICACAO:AGUARDANDO_USUARIO` (§14).
3. **Placeholders** (bloqueio): sequências de 6+ dígitos repetidos (ex.: `wa.me/5584999999999`);
   colchetes com Empresa/Cliente/Nome/Feira/Evento/Produto/Cidade/Link/URL/Telefone/E-mail/Data
   que **não** sejam link markdown (`[Empresa X]` sim, `[Empresa parceira](https://…)` não);
   `lorem ipsum`; `XXX`; `{{…}}`; `example.com`, `seusite.com`, `suaempresa.com`.
4. **Termos proibidos**: tudo o que estiver **entre aspas** (`"…"`, `'…'`, `“…”`, `` `…` ``) nos
   itens da seção `## Proibições Explícitas` do `memories.md` da crew; comparação sem
   diferenciar maiúsculas e acentos.
5. **Afirmações a confirmar** (alerta, com a frase): frase com marca de 1ª pessoa (eu, nós,
   nosso/a/s, investimos, atendemos, fizemos, ajudamos, fundamos, começamos, criamos, entregamos,
   nossa equipe) **e** um dado concreto (R$, US$, %, ano 19xx/20xx anterior ao ano atual,
   "N clientes/empresas/eventos/anos/projetos/pessoas").
6. **Contagem de caracteres** = caracteres visíveis do texto (sem os marcadores de markdown de
   negrito/itálico), contando emojis como 1.
7. **Runner** — antes de todo passo com `on_reject:` (revisão):
   1. roda o verificador nas saídas de **todos** os passos (não checkpoint) desde o passo
      apontado por `on_reject` até o anterior à revisão, usando os caminhos já transformados
      (run_id/vN); `--formato` = o `format:` de blog desses passos, se houver;
   2. grava o relatório e o injeta no contexto do revisor (`--- VERIFICAÇÃO AUTOMÁTICA ---`);
   3. **se a última linha for `VERIFICACAO:BLOQUEADA`, o veredito é REJECT**, qualquer que seja a
      nota, e o relatório vai ao redator junto com o feedback do revisor; se for
      `VERIFICACAO:AGUARDANDO_USUARIO`, não há REJECT por isso: o revisor julga o resto e a
      aprovação final (regra 8) pede o dado ao usuário (§14);
   4. ao atingir o máximo de ciclos com bloqueio, mostra o relatório ao usuário com as opções:
      *1. Corrigir eu mesmo · 2. Aceitar assim mesmo (fica registrado) · 3. Abortar*.
8. **Aprovação final** (checkpoint depois da revisão) mostra o resumo do último relatório
   ("Verificação automática: 0 bloqueios, 2 alertas"), a lista de alertas, e **pergunta ao
   usuário** o conteúdo de cada `[PREENCHER: …]` restante antes de aprovar.
9. **Revisor** (`best-practices/review.md`): copia os números do relatório, nunca estima
   contagens; não pode dar APPROVE com bloqueio (exceto `[PREENCHER]`, que vai ao usuário na
   aprovação final); com alerta não resolvido nem justificado, a nota máxima é 7/10; o checklist
   só marca ✓ o que o relatório confirma.
10. **Veracidade** — bloco fixo injetado pelo runner em todo passo de agente que não seja
    checkpoint nem revisão: nunca inventar casos, depoimentos, números, clientes ou histórias em
    1ª pessoa; sem dado real, escrever `[PREENCHER: o que falta]`. O build gera os agentes
    redatores com essa regra; `copywriting.md` também a traz.
11. **Formatos com nomes canônicos**: `hashtags_max` (não `max_hashtags`); Instagram feed
    `carousel_max_slides: 10`, `image_ratio: "4:5 portrait"`, `image_resolution: "1080x1350px"`;
    presets do `image-creator` e do `template-designer` (e os 3 modelos-base) em 1080×1350.

## 6. Erros e casos-limite

| Situação | Comportamento esperado | Mensagem ao usuário |
|---|---|---|
| Arquivo de saída não existe | exit 1, nenhuma verificação | `Arquivo não encontrado: <caminho>` |
| Crew sem `memories.md` | segue sem termos proibidos | (nota no relatório: "sem proibições registradas") |
| Proibição escrita sem aspas | ignorada pelo verificador | nota no relatório: "N proibições sem termo entre aspas não são verificadas automaticamente" |
| Arquivo sem blog/legenda/LinkedIn detectável | só as checagens gerais | — |
| Best-practice sem o limite | item não medido | "sem limite definido no formato" |
| Link markdown com texto entre colchetes | não é placeholder | — |
| Verificador falha (Node ausente, erro inesperado) | runner avisa e segue com a revisão normal | `⚠️ A verificação automática não rodou: <motivo>` |

## 7. Segurança
O verificador só lê arquivos dentro do projeto (caminhos relativos à raiz); não executa nada do
conteúdo; não faz chamadas de rede.

## 8. Cenários BDD

**U1-01 — Verificador**
- **U1-01a** (o caso real do Projeto A) DADO um post de blog com título de 125 caracteres,
  `meta_description` de 218, um link `wa.me/5584999999999` e a frase "Era 2017 quando
  investimos R$ 15 mil", formato `blog-post` QUANDO verificado ENTÃO a última linha é
  `VERIFICACAO:BLOQUEADA` E o relatório mostra "125" contra "70", "218" contra "160", o
  placeholder como bloqueio e a frase como alerta.
- **U1-01b** DADO um post correto (título 55, meta 150, sem placeholder) QUANDO verificado ENTÃO
  `VERIFICACAO:OK`.
- **U1-01c** DADO `--formato blog-seo` e um post sem links QUANDO verificado ENTÃO aparecem dois
  **alertas** (internos 0/3, externos 0/2) e o resultado não é bloqueado só por isso.
- **U1-01d** DADO uma legenda de Instagram com 2.300 caracteres e 31 hashtags QUANDO verificada
  ENTÃO dois bloqueios com os números medidos.
- **U1-01e** DADO um post de LinkedIn com 3.100 caracteres QUANDO verificado ENTÃO bloqueio.
- **U1-01f** DADO `memories.md` com `- Nunca usar o nome "Associação Cultural X"` e um texto que
  contém "associacao cultural x" QUANDO verificado ENTÃO bloqueio por termo proibido.
- **U1-01g** DADO um texto com `[PREENCHER: case real de cliente]` QUANDO verificado ENTÃO
  bloqueio "falta informação sua" (sozinho, ele leva ao estado `AGUARDANDO_USUARIO` — U1-01l).
- **U1-01h** DADO `[Empresa parceira](https://exemplo.org)` (link) e `[Empresa X]` QUANDO
  verificado ENTÃO só o segundo é placeholder.
- **U1-01i** DADO um best-practice de teste com `title_max_chars: 200` QUANDO o mesmo título de
  125 caracteres é verificado ENTÃO o título passa (os limites vêm do formato).
- **U1-01j** DADO um arquivo inexistente QUANDO verificado ENTÃO exit 1 e mensagem em PT-BR.
- **U1-01k** DADO vários arquivos QUANDO um deles tem bloqueio ENTÃO a última linha agregada é
  `VERIFICACAO:BLOQUEADA`.
- **U1-01l** (nasceu na correção de 2026-10-02, §14; texto da faxina de 2026-10-04) DADO um texto
  cujo único bloqueio é `[PREENCHER: frase real de um cliente]` QUANDO verificado ENTÃO o estado é
  `AGUARDANDO_USUARIO` (não força REJECT) E DADO um texto com `[PREENCHER: dado]` e o placeholder
  `[Telefone]` QUANDO verificado ENTÃO o estado é `BLOQUEADA` (o bloqueio real vence).
- **U1-01m** (idem) DADO a frase "Eu cubro o Congresso <ano atual> e o Congresso <ano seguinte>
  para expositores" e uma frase longa em 1ª pessoa com "**mais de 300 empresas**" e "desde 2010"
  QUANDO verificado ENTÃO há um único alerta, o da frase longa (ano atual ou futuro é nome de
  evento, não dado concreto) E a frase citada sai sem marcadores de markdown, cortada em 160
  caracteres com "…".

**U1-02 — Runner com trava** (contrato do prompt)
- **U1-02a** DADO `runner.pipeline.md` QUANDO a seção de revisão é lida ENTÃO ela manda rodar
  `_opencrew/core/scripts/verificar.mjs` antes de todo passo com `on_reject`, nas saídas desde o
  passo apontado por `on_reject`.
- **U1-02b** ENTÃO a regra diz que `VERIFICACAO:BLOQUEADA` força REJECT, seja qual for a nota.
- **U1-02c** ENTÃO no limite de ciclos o usuário recebe as 3 opções (corrigir / aceitar
  registrado / abortar).
- **U1-02d** ENTÃO a aprovação final mostra o resumo da verificação e pergunta os `[PREENCHER]`.

**U1-03 — Revisor**
- **U1-03a** DADO `best-practices/review.md` QUANDO lido ENTÃO proíbe estimar contagens, proíbe
  APPROVE com bloqueio e limita a nota a 7/10 com alerta não resolvido nem justificado.

**U1-04 — Veracidade**
- **U1-04a** DADO `runner.pipeline.md` QUANDO o carregamento de agentes é lido ENTÃO há o bloco
  de veracidade com `[PREENCHER:` para passos de criação.
- **U1-04b** DADO `build.prompt.md` e `copywriting.md` ENTÃO ambos trazem a regra de não inventar
  e o marcador `[PREENCHER: …]`.

**U1-05 — Formatos**
- **U1-05a** DADO os best-practices QUANDO lidos ENTÃO nenhum usa `max_hashtags`; Instagram feed
  tem `carousel_max_slides: 10` e 1080x1350.
- **U1-05b** DADO `image-creator`, `template-designer` e os modelos-base QUANDO lidos ENTÃO
  nenhum carrossel/post de feed do Instagram em 1440.

**U1-upg — Chega a quem já usa** (regra 14 do AGENTS.md; teste criado logo depois da fase, texto
da faxina de 2026-10-04)
- **U1-upg** DADO um workspace anterior à 1.5.0 (sem a pasta `scripts/`, `instagram-feed.md` com
  `max_hashtags` e 1080x1440, runner antigo, `CLAUDE.md` com a seção que cita `STATUS.md`) e dados
  do usuário (memória da crew com `- Nunca usar "preço baixo"`, `company.md` preenchido) QUANDO
  roda o `update` ENTÃO a versão carimbada é a do pacote E existem `verificar.mjs` e
  `verificar/regras.mjs` E o runner traz `VERIFICACAO:BLOQUEADA` E o `instagram-feed.md` traz
  `hashtags_max: 30` e 1080x1350 E o `CLAUDE.md` deixa de citar `STATUS.md` E o `company.md`
  continua igual E o verificador entregue bloqueia um texto com "preço baixo" usando a memória
  antiga da crew.

## 9. O que o humano confere na tela
- [x] No terminal, na pasta do Projeto A (só leitura):
      `node "<repo>\templates\_opencrew\core\scripts\verificar.mjs" --crew crews/<crew> --arquivo <post do run de agosto>,<legendas do run de agosto>`
      → aparecem os mesmos defeitos que o revisor aprovou (título, meta, placeholder do
      WhatsApp) e a última linha é `VERIFICACAO:BLOQUEADA`.
      Feito em 2026-10-02 (§14; linha da conferência offline em `docs/jornada/medicoes.md`).
- [ ] Depois do `update` para a 1.5.0 num projeto real, rodar uma crew: a revisão mostra
      "Verificação automática" com números, e a aprovação final pergunta o que estiver em
      `[PREENCHER]`. Anotar em `docs/jornada/medicoes.md`.
      Pendente: os Projetos A e B já foram atualizados (estão na 1.6.0), mas não há registro de
      uma execução real com o verificador no laço de revisão (H2-14) → jornada de referência
      (U0), com o dono.

## 10. Critérios de aceite
- [ ] Cenários U1-01a…U1-05b com teste de mesmo ID, vistos vermelhos antes do código.
      Pendente: os testes com os mesmos IDs existem, mas não há registro de que foram vistos
      vermelhos (teste e código entraram no mesmo commit).
- [x] `npm run verify` verde; alerta de tamanho cobre os scripts do runtime.
      A 1.5.0 foi publicada pela tag, e o publish roda `npm run verify` antes de publicar.
- [x] Conferência da seção 9 (1º item) feita; o 2º item entra na jornada de referência (U0).
      O 2º item continua pendente (H2-14).
- [x] CHANGELOG 1.5.0; `npm version minor --no-git-tag-version`; push/tag só com confirmação.
      A 1.5.0 saiu com tag no GitHub e no npm em 2026-10-02.

## 11. Fora de escopo → destino

| O que não entra | Alocação |
|---|---|
| Ler fontes do projeto (decisões, calendário, pasta de marca) | → U2 |
| Gravar correções na memória no checkpoint; propagar ao `company.md` | → U2 |
| Conferir existência de assets (logo) antes do design | → U2 |
| Detectar invenção sem marcas de 1ª pessoa (ex.: dado de terceiros sem fonte) | → sem fase — exige checagem de fonte; o alerta cobre o caso mais comum |
| Verificar e-mail (assunto) e WhatsApp | → U3a, junto com a entrega por canal (H2-13, E-07) |
| Reaplicar o verificador em crews antigas que não têm `on_reject` | → U4 (repair) |

## 12. Limites conhecidos
- A regra 7 é seguida pela IA que executa o runner; os testes garantem o texto da regra e o
  comportamento do script, não a obediência do modelo → jornada de referência (U0).
- Detecção de seções depende de cabeçalhos ("Legenda Instagram", "Post LinkedIn"); cabeçalhos
  muito diferentes não são verificados → U3a padroniza a estrutura de saída por canal.
  Feito em parte na R1 (1.6.1): com formato declarado, basta o cabeçalho dizer a peça (R1-01w), a
  escrita com rótulos é lida (R1-01a) e o arquivo sem peça reconhecida sai como "Não medido"
  (R1-01e). Sem formato declarado, a detecção continua dependendo das palavras do cabeçalho
  → U3a na entrega e → U4 no laço de revisão (§12 da spec R1, H2-03).

**Achados da revisão de 2026-10-04** (`docs/auditoria/2026-10-04-revisao-specs.md`, §3 e §7).
Defeitos da 1.6.0. Em alguns o código não faz o que esta spec promete (H2-07,
H2-10, H2-11): a promessa continua valendo. Nos outros o código segue a regra como ela está
escrita, e o que falha é a regra, o alcance dela, a trava ou um texto do script (bloqueio falso,
medição que não acontece, regra que não chega a crews antigas, comentário desatualizado). Nenhuma
regra do corpo foi apagada: cada linha diz o que acontece na 1.6.0 e para onde vai a correção.
Atualização de 2026-10-05: nas linhas com "feito na R1 (1.6.1)" o defeito foi corrigido, e o
cenário citado é a trava; o que vale agora está na §14 (entrada de 2026-10-05).

| Achado | Onde | O que acontece na 1.6.0 | Destino |
|---|---|---|---|
| H2-01 | regra 2; §6 | Texto no formato que os próprios best-practices ensinam (`=== TITLE ===`, `=== CAPTION ===`, `=== HASHTAGS ===`) não é reconhecido: nada é medido e o relatório diz "Nada a apontar", com `VERIFICACAO:OK`. Blog só é medido com frontmatter `title`/`titulo` | feito na R1 (1.6.1) — R1-01a, R1-01c, R1-01d; sem medição, o relatório diz "Não medido" (R1-01e) |
| H2-02 | regra 3; §3 × regra 7.1 | Cor hexadecimal com seis dígitos iguais (`#666666`, `#000000`) vira "Placeholder" e força REJECT. O runner manda verificar todas as saídas e o script não confere o tipo do arquivo (a §3 diz `.md`) | feito na R1 (1.6.1) — R1-02a (cor); só texto é verificado: R1-02b, R1-02c, R1-02f |
| E-07 | regra 3 | `{{…}}` é sempre bloqueio, mas os best-practices de WhatsApp e de newsletter mandam usar `{{name}}` | feito na R1 (1.6.1) — R1-02e: em formato `email-*` ou `whatsapp-*` vira nota informativa; nos demais continua bloqueio (R1-02j) |
| H2-15 | regra 3 | Bloqueio falso em texto verdadeiro: "XXX Congresso" (numeral romano) e qualquer número com seis ou mais dígitos iguais seguidos, como "2000000" ou um CEP sem hífen terminado em 000000 | feito na R1 (1.6.1) — R1-02d; em link continua bloqueio (R1-02h) |
| H2-04 | regra 4 | O termo proibido casa dentro de outra palavra ("IA" bloqueia "dia a dia"); toda aspa da linha vira termo proibido, inclusive o termo que o usuário mandou preferir | feito na R1 (1.6.1) — R1-03a a R1-03i |
| H2-11 | regra 2 | Uma linha `---` encerra a seção: 12 slides separados por `---` contam 1/10 e as hashtags depois do separador contam 0. Um cabeçalho-pai que também tenha "legenda" e "instagram" (ex.: "Legendas para Instagram") soma as legendas-filhas e gera bloqueio falso. Slide só conta em cabeçalho de nível 3 a 6 (`### Slide N`) ou em negrito (`**Slide N`), sob um cabeçalho com "instagram" e "carrossel". Não há cenário de carrossel nem de tweet | feito na R1 (1.6.1) — R1-01h (`---`), R1-01g e R1-01r (título-pai), R1-01b e R1-01s (slides), R1-01j e R1-01p (tweet) |
| H2-10 | §3; §6 | `--crew` inexistente não é erro (exit 0, com a nota "a crew não tem memories.md"); `--formato` sem best-practice correspondente vira só nota (exit 0); a mensagem "sem limite definido no formato" não existe (o item some do relatório); arquivo em `best-practices.local/` sem `constraints:` desliga os limites do formato, sem recuar para o core; arquivo com BOM não tem o frontmatter lido | feito na R1 (1.6.1) — R1-05b (crew), R1-04c (limite ausente), R1-04a (overlay sem `constraints:`), R1-01i (BOM); formato sem best-practice continua nota, com código 0, e o arquivo sai como "limites não medidos" (R1-05g) |
| H2-12 | §4; §6 | Tudo ou nada: um caminho inexistente na lista dá exit 1 e nenhum arquivo é verificado; uma pasta na lista, ou um link malformado num post de blog (com o site no `company.md`), derruba o script com exceção, sem mensagem em PT-BR | feito na R1 (1.6.1) — R1-05c, R1-05j, R1-05e, R1-05h |
| H2-06 | regra 7.4 | `max_review_cycles` não é definido em nenhum arquivo do payload; o runner só trata o limite de ciclos "com bloqueio" (limite atingido sem bloqueio ficou sem instrução) | feito na R1 (1.6.1) — R1-07b (padrão 3; contrato de prompt); o `build.prompt.md` grava o campo em crew nova, pelo tier (Express 1, Standard 2, Full 3); crew já criada segue no padrão 3 → U4 |
| H2-08 | regra 9 | "Nota máxima 7/10 com alerta" e "checklist só com o que foi medido" moram no `review.md`, lido só na criação da crew: crews criadas antes da 1.5.0 não recebem essas duas regras com o `update` | feito na R1 (1.6.1) — R1-07c: o runner injeta as regras em todo passo com `on_reject`; o runner chega com o `update` (R1-upg) |
| H2-18 | §13; §14 | A trava U1-05 só procura 1080×1440 em `instagram-feed.md` e em 5 arquivos de skills. Nos 4 arquivos da 4ª correção de 2026-10-02 (§14), uma volta do 1080×1440 passaria na porta; o `max_hashtags` segue coberto em todos os best-practices. Hoje não há resíduo | feito na R1 (1.6.1) — R1-09c |
| A-34, H2-09 | §3; §4 | Os comentários de `verificar.mjs` (cabeçalho e `main`) ainda citam só dois estados, e a nota de formato não encontrado cita só `_opencrew/core/best-practices/`, sem o overlay local | feito na R1 (1.6.1) — comentários com os três estados (critério da §10 da spec R1); linha de uso: R1-05k; nota com o overlay local: R1-05g |
| H2-07 | regra 7.4 | "Aceitar assim mesmo (fica registrado)" não registra nada: o `runs.md` só aceita Aprovado, Rejeitado, Publicado ou Abortado, e o estado da execução não vai a disco | → U3a (gravar o aceite); o "(fica registrado)" saiu do texto da opção na R1 (1.6.1) — R1-07b |
| H2-13, E-07 | regra 1; §11 | Máximos de `constraints:` sem medição: assunto de e-mail, mensagem de WhatsApp, hashtags do tweet, palavras por slide, título do YouTube e do artigo do LinkedIn. O script só carrega o formato de blog pedido, `instagram-feed`, `linkedin-post` e `twitter-post` | → U3a (assunto e prévia de e-mail, WhatsApp, thread); o resto → U5. Na R1 (1.6.1), formato declarado fora da tabela passa a sair como "Não medido" (R1-01y) |
| H2-16 | §4; regra 7.2 | O script só escreve no stdout; quem grava `verificacao-ciclo-{N}.md` é a IA, copiando a saída | → U5 |
| H2-05 | regra 8; §6 | Proibições sem aspas (as gravadas antes da 1.5.0) não viram trava; a nota fica só no relatório e a aprovação final não a mostra; o registro de fim de execução ainda não pede aspas | → U4; o registro de fim de execução passou a pedir aspas, na forma canônica: feito na R1 (1.6.1) — R1-07f |
| H2-17 | regra 6 | A contagem é a mesma em todos os canais; no X/Twitter cada emoji vale 2 e cada link vale 23 | → U5 |

Destinos: R1 = reparos da 1.6.0 (1.6.1) · U3a = entrega por canal (1.7.0) · U4 = modo equipe +
histórico confiável (1.9.0) · U5 = rápido, barato e em PT-BR (contínuo).

## 13. Travas que esta spec deixa
- `tests/verificar.test.js` (cenários U1-01).
- `tests/runtime-contracts.test.js`: contratos U1-02…U1-05.
- `scripts/check-size.js`: categoria nova para scripts do runtime (`templates/**/scripts/*.mjs`).
- `tests/package.test.js`: o verificador vai no tarball.
- `tests/upgrade.test.js` (U1-upg): o `update` entrega a fase a um workspace anterior à 1.5.0
  (regra 14 do AGENTS.md).

## 14. Correções
- 2026-10-02 — Regra 5/7: `[PREENCHER]` como bloqueio comum faria a revisão entrar em loop (o
  redator não tem o dado). Novo estado `VERIFICACAO:AGUARDANDO_USUARIO` quando os únicos
  bloqueios são `[PREENCHER]`: não força REJECT; a aprovação final pede o dado. Cenário U1-01l.
- 2026-10-02 — Conferência real (seção 9) no Projeto A: o verificador pegou título (123/70),
  meta (215/160), o placeholder do WhatsApp e a história inventada que o revisor aprovou com
  8,4. Ela revelou 3 ajustes, todos com teste (U1-01a reforçado, U1-01m):
  o placeholder vinha com resíduo de markdown (agora só a URL); ano atual/futuro ("Congresso
  2026") não conta como dado concreto; a frase citada sai sem marcadores e com "…".
- 2026-10-02 — A porta passou a rodar o lint também em `templates/_opencrew/core/scripts/`.
- 2026-10-02 — `image-design.md`, `social-networks-publishing.md`, `image-fetcher` e
  `instagram-reels.md` também tinham 1080×1440 / `max_hashtags`: corrigidos junto (U1-05).
- 2026-10-04 — Faxina de documentos, sem mudança de código (revisão
  `docs/auditoria/2026-10-04-revisao-specs.md`; A-34, H2-09). O corpo passou a citar os três
  estados do verificador (§4, regras 2, 7.3 e 9, U1-01g). Os cenários U1-01l e U1-01m (até aqui
  só citados nesta seção) e U1-upg (só no teste) ganharam texto na §8; a §13 cita
  `tests/upgrade.test.js`. A §3 cita o overlay local da U2. A regra 5 foi alinhada a
  `verificar/regras.mjs`, que também cobra "criamos", "entregamos", "US$", "N projetos/pessoas" e
  só conta ano anterior ao atual. A regra 9 e o U1-03a foram alinhados a
  `best-practices/review.md`: o teto de 7/10 vale para alerta "não resolvido nem justificado", e
  `[PREENCHER]` sozinho não força REJECT (vai ao usuário na aprovação final).
- 2026-10-04 — Destinos: a U3 foi dividida em U3a (entrega por canal) e U3b (documento Word);
  "→ U3" virou "→ U3a" nas §11 e §12. Os defeitos achados na revisão (do código e das próprias
  regras) entraram na §12, cada um com destino (R1, U3a, U4 ou U5).
- 2026-10-04 — Status e caixas das §9 e §10 (H2-14): marcado só o que a conferência de 2026-10-02
  e a publicação da 1.5.0 provam. A execução real com o verificador no laço de revisão continua
  pendente (U0).
- 2026-10-05 — R1 (1.6.1): `specs/fase-r1-reparos-1-6-1.md` corrigiu os achados da §12 marcados
  "feito na R1", cada um com teste. O corpo desta spec fica como contrato da 1.5.0. Onde a R1
  mudou a regra de propósito, vale o que está abaixo.
  - §3 e regra 7.1 — formato por arquivo: cada item de `--arquivo` pode ser `caminho=formato`. O
    runner passa o `format:` do passo que gerou o arquivo e deixou de passar `--formato`
    (R1-07a, R1-01f). `--formato` continua aceito: só escolhe os limites de blog do item sem
    `=formato` que tem título no frontmatter.
  - §3, §4, §6 e §7 — erro de uso: código 1, sem linha `VERIFICACAO:`, com opção obrigatória
    faltando, pasta sem `_opencrew/`, crew inexistente, crew ou caminho fora do projeto, ou
    nenhum caminho da lista existente (R1-05a, R1-05b, R1-05d, R1-05i, R1-05k). Caminho absoluto
    de dentro do projeto é aceito (R1-05f). O U1-01j continua valendo quando nenhum caminho
    existe.
  - §4 e §6 — verifica o que der: item ausente, pasta ou erro numa regra vira alerta "Não
    verificado", e os outros arquivos seguem (R1-05c, R1-05j, R1-05h). Link malformado fica fora
    da contagem de links (R1-05e). Arquivo que não é texto sai numa linha só, sem bloqueio
    (R1-02c, R1-02f, R1-02g). Em HTML valem o texto visível e os links (R1-02b, R1-02k).
  - §4 — relatório: o resumo passou a ser "X bloqueios, Y alertas, Z não medidos". Entraram as
    linhas "Não medido — …" e "Não verificado — …" e a seção "Notas" (R1-01e, R1-04c). "✅ Nada a
    apontar." só aparece quando ao menos uma peça foi medida; sem medição, o relatório diz que os
    limites não foram medidos (R1-01o, R1-04e).
  - Regra 2 — o que é medido: a escrita com rótulos (`=== CAPTION ===`, `=== HOOK ===`,
    `=== TITLE ===`, `=== TWEET ===`) é medida (R1-01a, R1-01c, R1-01d, R1-01p). Com formato
    declarado, basta o cabeçalho dizer a peça (R1-01w). Em blog declarado, cabeçalho é conteúdo
    (R1-01m). O título-pai não soma os filhos (R1-01g, R1-01r). A linha `---` não encerra a seção
    (R1-01h). Os slides são contados nas escritas comuns (R1-01b). O BOM é ignorado (R1-01i).
  - Regra 3 — placeholders (alterada pela regra 8 da R1): dígitos repetidos só bloqueiam em link
    ou com 10 dígitos ou mais; cor hexadecimal nunca; "XXX" seguido de palavra iniciada por
    maiúscula é numeral romano (R1-02a, R1-02d, R1-02h, R1-02i). `{{variável}}` em formato
    `email-*` ou `whatsapp-*` vira nota informativa; nos demais continua bloqueio (R1-02e, R1-02j).
  - Regra 4 — termos proibidos (regras 10 e 11 da R1): o termo casa como palavra inteira, com o
    plural simples; sigla em maiúsculas compara diferenciando maiúsculas (R1-03a, R1-03c a
    R1-03f). O termo que vem depois de um marcador de troca ("prefira", "use", "→", ou "por" logo
    antes de um termo entre aspas) é preferido, não proibido, e sai numa nota (R1-03b, R1-03g a
    R1-03i).
  - §3 e §6 — limites: o overlay local soma aos limites do core, chave a chave, em vez de
    substituí-los; overlay sem `constraints:` usa os do core e gera nota (R1-04a, R1-04b, R1-04d).
    Peça achada em formato sem o limite sai como "Não medido — …: sem limite definido no formato
    …" (R1-04c). Formato declarado sem best-practice continua nota, com código 0, e a nota cita o
    overlay local e o core (R1-05g).
  - Regra 7.4 e U1-02c — fim do laço: ciclo é uma passada do revisor; o máximo é
    `max_review_cycles`, com padrão 3. No limite, o usuário recebe as três opções: com o último
    relatório em `VERIFICACAO:BLOQUEADA`, vê os bloqueios; com qualquer outro status, o parecer
    do revisor. A opção 2 é só "Aceitar assim mesmo", sem "(fica registrado)" (R1-07b); gravar o
    aceite → U3a (H2-07). Em crew nova, o `build.prompt.md` grava o campo pelo tier (Express 1,
    Standard 2, Full 3); crew já criada segue no padrão 3 → U4.
  - Regra 9 — revisor: o runner injeta as quatro regras do revisor em todo passo com `on_reject`
    (R1-07c). Crew criada antes da 1.5.0 as recebe com o `update`, que entrega o runner (R1-upg).
  - Regra 8 e §6 — aprovação final: mostra também a quantidade e a lista dos itens não medidos ou
    não verificados, as linhas de "Notas" do relatório, e repete o aviso de verificação que não
    rodou (R1-07d, R1-07e).
  - Revisão do código antes da tag (§14 da spec R1): cabeçalho que começa por "hashtags" soma à
    peça do canal que ele cita; em blog declarado, a seção de outro canal sai como "Não medido";
    a negação vale até 3 palavras antes do marcador de troca; limite do overlay que não é número
    inteiro é ignorado, com nota; arquivo `.md`, `.txt` ou `.html` fora do UTF-8 vira alerta "Não
    verificado" (UTF-16 com marca é lido); `[PREENCHER: …]` é visto com qualquer tamanho.
  - §13 — travas: a procura do 1080×1440 varre todo o `templates/`, fora
    `skills/opencrew-skill-creator/` (R1-09c). Entraram `tests/verificar-pecas.test.js`,
    `tests/verificar-formatos.test.js`, `tests/verificar-regras.test.js`,
    `tests/verificar-contrato.test.js` e `tests/runtime-contracts-r1.test.js`;
    `tests/upgrade.test.js` ganhou o R1-upg (1.6.0 → 1.6.1).
  - A-34, H2-09 — os comentários de cabeçalho e a linha de uso de `verificar.mjs` citam os três
    estados, `caminho=formato` e os códigos de saída (linha de uso: R1-05k).
  - As regras do runner (7, 8 e 9) continuam sendo texto de prompt: os testes R1-07 garantem o
    texto, não a obediência do modelo → U0. O que a §12 manda para U3a, U4 e U5 continua lá; os
    limites novos estão na §12 da spec R1.
