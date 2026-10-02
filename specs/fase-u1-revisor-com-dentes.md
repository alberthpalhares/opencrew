# Spec — Fase U1: Revisor com dentes (1.5.0)

- **Fase:** U1 · **Módulo:** Runtime (`templates/`) · **Status:** aguardando aprovação
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

Os limites vêm **sempre** do frontmatter `constraints:` dos best-practices (fonte única).

## 4. Saídas
- Relatório em PT-BR (markdown) no stdout, uma seção por arquivo: tabela *Item · Medido · Limite
  · Resultado*, depois a lista de alertas e um resumo ("2 bloqueios, 1 alerta").
- **Última linha**: `VERIFICACAO:OK` (nenhum bloqueio) ou `VERIFICACAO:BLOQUEADA`.
- Código de saída: 0 sempre que conseguiu verificar (OK ou BLOQUEADA); 1 em erro de uso
  (opção faltando, arquivo inexistente).
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
     informação sua"); termo proibido → **bloqueio**; afirmação a confirmar → **alerta**.
3. **Placeholders** (bloqueio): sequências de 6+ dígitos repetidos (ex.: `wa.me/5584999999999`);
   colchetes com Empresa/Cliente/Nome/Feira/Evento/Produto/Cidade/Link/URL/Telefone/E-mail/Data
   que **não** sejam link markdown (`[Empresa X]` sim, `[Empresa parceira](https://…)` não);
   `lorem ipsum`; `XXX`; `{{…}}`; `example.com`, `seusite.com`, `suaempresa.com`.
4. **Termos proibidos**: tudo o que estiver **entre aspas** (`"…"`, `'…'`, `“…”`, `` `…` ``) nos
   itens da seção `## Proibições Explícitas` do `memories.md` da crew; comparação sem
   diferenciar maiúsculas e acentos.
5. **Afirmações a confirmar** (alerta, com a frase): frase com marca de 1ª pessoa (eu, nós,
   nosso/a/s, investimos, atendemos, fizemos, ajudamos, fundamos, começamos, nossa equipe) **e**
   um dado concreto (R$, %, ano 19xx/20xx, "N clientes/empresas/eventos/anos").
6. **Contagem de caracteres** = caracteres visíveis do texto (sem os marcadores de markdown de
   negrito/itálico), contando emojis como 1.
7. **Runner** — antes de todo passo com `on_reject:` (revisão):
   1. roda o verificador nas saídas de **todos** os passos (não checkpoint) desde o passo
      apontado por `on_reject` até o anterior à revisão, usando os caminhos já transformados
      (run_id/vN); `--formato` = o `format:` de blog desses passos, se houver;
   2. grava o relatório e o injeta no contexto do revisor (`--- VERIFICAÇÃO AUTOMÁTICA ---`);
   3. **se a última linha for `VERIFICACAO:BLOQUEADA`, o veredito é REJECT**, qualquer que seja a
      nota, e o relatório vai ao redator junto com o feedback do revisor;
   4. ao atingir o máximo de ciclos com bloqueio, mostra o relatório ao usuário com as opções:
      *1. Corrigir eu mesmo · 2. Aceitar assim mesmo (fica registrado) · 3. Abortar*.
8. **Aprovação final** (checkpoint depois da revisão) mostra o resumo do último relatório
   ("Verificação automática: 0 bloqueios, 2 alertas"), a lista de alertas, e **pergunta ao
   usuário** o conteúdo de cada `[PREENCHER: …]` restante antes de aprovar.
9. **Revisor** (`best-practices/review.md`): copia os números do relatório, nunca estima
   contagens; não pode dar APPROVE com bloqueio; com alerta não resolvido, a nota máxima é 7/10;
   o checklist só marca ✓ o que o relatório confirma.
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
  bloqueio "falta informação sua".
- **U1-01h** DADO `[Empresa parceira](https://exemplo.org)` (link) e `[Empresa X]` QUANDO
  verificado ENTÃO só o segundo é placeholder.
- **U1-01i** DADO um best-practice de teste com `title_max_chars: 200` QUANDO o mesmo título de
  125 caracteres é verificado ENTÃO o título passa (os limites vêm do formato).
- **U1-01j** DADO um arquivo inexistente QUANDO verificado ENTÃO exit 1 e mensagem em PT-BR.
- **U1-01k** DADO vários arquivos QUANDO um deles tem bloqueio ENTÃO a última linha agregada é
  `VERIFICACAO:BLOQUEADA`.

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
  APPROVE com bloqueio e limita a nota a 7/10 com alerta não resolvido.

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

## 9. O que o humano confere na tela
- [ ] No terminal, na pasta do Projeto A (só leitura):
      `node "<repo>\templates\_opencrew\core\scripts\verificar.mjs" --crew crews/<crew> --arquivo <post do run de agosto>,<legendas do run de agosto>`
      → aparecem os mesmos defeitos que o revisor aprovou (título, meta, placeholder do
      WhatsApp) e a última linha é `VERIFICACAO:BLOQUEADA`.
- [ ] Depois do `update` para a 1.5.0 num projeto real, rodar uma crew: a revisão mostra
      "Verificação automática" com números, e a aprovação final pergunta o que estiver em
      `[PREENCHER]`. Anotar em `docs/jornada/medicoes.md`.

## 10. Critérios de aceite
- [ ] Cenários U1-01a…U1-05b com teste de mesmo ID, vistos vermelhos antes do código.
- [ ] `npm run verify` verde; alerta de tamanho cobre os scripts do runtime.
- [ ] Conferência da seção 9 (1º item) feita; o 2º item entra na jornada de referência (U0).
- [ ] CHANGELOG 1.5.0; `npm version minor --no-git-tag-version`; push/tag só com confirmação.

## 11. Fora de escopo → destino

| O que não entra | Alocação |
|---|---|
| Ler fontes do projeto (decisões, calendário, pasta de marca) | → U2 |
| Gravar correções na memória no checkpoint; propagar ao `company.md` | → U2 |
| Conferir existência de assets (logo) antes do design | → U2 |
| Detectar invenção sem marcas de 1ª pessoa (ex.: dado de terceiros sem fonte) | → sem fase — exige checagem de fonte; o alerta cobre o caso mais comum |
| Verificar e-mail (assunto) e WhatsApp | → U3, junto com a entrega por canal |
| Reaplicar o verificador em crews antigas que não têm `on_reject` | → U4 (repair) |

## 12. Limites conhecidos
- A regra 7 é seguida pela IA que executa o runner; os testes garantem o texto da regra e o
  comportamento do script, não a obediência do modelo → jornada de referência (U0).
- Detecção de seções depende de cabeçalhos ("Legenda Instagram", "Post LinkedIn"); cabeçalhos
  muito diferentes não são verificados → U3 padroniza a estrutura de saída por canal.

## 13. Travas que esta spec deixa
- `tests/verificar.test.js` (cenários U1-01).
- `tests/runtime-contracts.test.js`: contratos U1-02…U1-05.
- `scripts/check-size.js`: categoria nova para scripts do runtime (`templates/**/scripts/*.mjs`).
- `tests/package.test.js`: o verificador vai no tarball.

## 14. Correções
(preenchida durante a implementação)
