# Spec — Fase U6, fatia 3: Medição — peso do X, trecho visível e acréscimo ao best-practice (1.20.0)

- **Fase:** U6-3 · **Módulos:** Runtime (`templates/_opencrew/core/scripts/verificar/` — `peso.mjs` e `visivel.mjs` novos, `medicao.mjs` e `leitura.mjs` ajustados; `runner.pipeline.md` (troca de linhas, sem crescer) + `runner/fim-da-execucao.md`; `best-practices/twitter-post.md` (texto e `version`); skill `opencrew-best-practice-creator`) + CLI (`src/lib/locais.js` novo, `src/commands/update.js`, `src/lib/resumo.js`) + `AGENTS.md` (regras 12 e 14) + README + CHANGELOG + GLOSSARIO + CONTRIBUTING + testes · **Status:** escrita em 2026-10-12; **aguarda aprovação do dono**
- **Termos novos no GLOSSARIO.md:** sim — Peso (do tweet), Trecho visível (gancho), Acréscimo (best-practice local)
- **Modelo sugerido:** execução Sonnet 5.5 · médio
- **Origem:** `specs/fase-u6-roteiro.md` (fatia 3); `IDEIAS.md` — "Contagem de caracteres por canal (X/Twitter)", "Trecho visível da legenda e do post: limite declarado e não medido", "Overlay local: arquivo de acréscimo em vez de cópia inteira + aviso no `update`".

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **O tweet passa a ser medido pelo peso do X, não pelo número de caracteres:** cada emoji vale 2 e
   cada link vale 23, seja qual for o tamanho dele. O limite continua 280. Efeito nos dois sentidos:
   tweet com emojis que hoje passa, mas o X recusa, passa a ser bloqueado; tweet com link longo que
   hoje é bloqueado sem motivo passa a passar. É a única mudança desta fatia que pode **bloquear o
   que não bloqueava**; por isso o aceite pede a conferência nas crews reais (item 5).
2. **O trecho visível só alerta, nunca bloqueia.** O limite (125 na legenda, 210 no post do LinkedIn)
   não é um máximo: o texto pode ser maior. O que se mede é se o **gancho** (a primeira frase do texto)
   cabe antes do "ver mais". Se não cabe, é alerta, com o trecho que o leitor vê. Se a peça inteira
   cabe, ou o gancho cabe, é "ok".
3. **O acréscimo é um best-practice local que só leva o que é do usuário.** Arquivo em
   `_opencrew/best-practices.local/<formato>.md` com `extends: core` no cabeçalho: o runner lê o do core
   **e** o acréscimo, e o do usuário vale quando os dois discordam. Quem muda um best-practice do core
   deixa de copiar o arquivo inteiro. O que o runner grava como aprendizado técnico vai para o acréscimo.
4. **A cópia inteira que já existe continua valendo, sem mudança e sem conversão automática** (regra 3
   do `AGENTS.md`). O `update` só **avisa**, uma vez por execução do comando, quando a cópia do usuário
   está numa versão mais velha que a do core, e diz como trocar por um acréscimo. A conversão é feita pela
   IA, com a conferência do usuário e `.bak` — nunca por script do `update`.
5. **Aceite com a sua conferência:** antes do release, rodo o verificador novo e o da 1.17.0 sobre os
   textos de saída das crews reais (só leitura) e mostro, item a item, o que mudou de nível. Nada é
   publicado se aparecer bloqueio novo que você não reconheça como certo.
6. **Fica de fora:** CJK e outros caracteres que o X conta como 2, link sem `http`/`www` (domínio solto),
   `twitter-thread` (não está na tabela do verificador), `effective_chars`, trecho visível do Reels
   (formato fora da tabela), "ver mais" por número de linhas (o Instagram também corta por linhas),
   conversão automática das cópias inteiras.

## 1. Objetivo
Três limites que o produto já promete e o verificador não media direito: o do tweet (o X conta emoji e
link de outro jeito; hoje o verificador erra nos dois sentidos), o do "ver mais" (o gancho passa do corte
sem aviso) e a cópia de best-practice que congela o que o `update` corrige. Depois desta fatia o
verificador conta o tweet como o X conta, avisa quando o gancho fica pela metade, e o usuário personaliza
um formato sem perder as correções que o core receber depois. Chega a quem já usa com um `update`; quem
tem cópia inteira recebe um aviso e nada é alterado.

## 2. O que esta fatia herda
| Origem | O que existe hoje | Exige daqui |
|---|---|---|
| `verificar/regras.mjs` (`contar`, `grafemas`) | conta grafema: emoji vale 1, URL pelo tamanho | o peso reaproveita `grafemas` e só troca o valor do emoji e do link (regras 1 a 3) |
| `verificar/medicao.mjs` | `LIMITE.tweet = tweet_max_chars`; `medir(p)`; `PRINCIPAL`; `semLimite` | o tweet usa `peso`; a legenda e o post ganham o item do trecho visível (regras 5 a 8) |
| `verificar/pecas.mjs` | peças `legenda`, `post`, `tweet` com `texto` já separado | nada muda na leitura das peças |
| `best-practices/*.md` | `caption_visible_chars` (`instagram-feed`), `post_visible_chars` (`linkedin-post`), `effective_chars` no frontmatter | os dois primeiros passam a ser medidos (regra 12 do `AGENTS.md`); `effective_chars` fica sem medida e sem promessa |
| `verificar/leitura.mjs` (`lerLimites`) | os `constraints:` do local cobrem os do core chave a chave; nota se o local não declara limites | o acréscimo não gera essa nota (regra 13) |
| `runner.pipeline.md` 138–141 | "lê o local; se não existe, o core" | passa a ler o acréscimo por cima do core (regra 9); **o núcleo não cresce** (teto 560; hoje 558) |
| `runner/fim-da-execucao.md` | aprendizado técnico: "copie o core para o local antes" | grava no acréscimo (regra 11) |
| `src/commands/update.js` | não toca em `best-practices.local/` | passa a **ler** essa pasta e avisar (regra 15); continua sem gravar nada ali |
| `AGENTS.md` regra 3 | `update` nunca sobrescreve o que o usuário editou | o aviso é só leitura; a conversão é feita pela IA, com `.bak` e o sim do usuário |

## 3. Entradas
- O texto da peça já lido por `lerPecas` (tweet, legenda, post), e os `constraints:` do formato.
- Para o acréscimo: `_opencrew/best-practices.local/<formato>.md` com `extends: core`, e o do core.
- Para o aviso: `_opencrew/best-practices.local/*.md` e `_opencrew/core/best-practices/*.md` (só `version:` e `extends:` do cabeçalho).

## 4. Saídas
- **Verificador:** no relatório, o item do tweet vira `Tweet — peso (emoji vale 2, link vale 23)`, com o
  detalhe dos dois números quando diferem; legenda e post ganham `… — trecho visível`; nada novo em
  arquivo.
- **Runner:** o formato carregado é core + acréscimo; o aprendizado técnico cria ou acrescenta ao arquivo
  `extends: core`.
- **`update`:** uma seção "Cópias de best-practice atrasadas" no resumo, só quando há alguma; nenhum
  arquivo do usuário é gravado.

## 5. Regras
**Peso do X**
1. **Peso do texto:** cada grafema vale 1; o grafema de emoji vale 2 (pictográfico, bandeira, sequência
   com ZWJ, teclado `1️⃣`); cada link vale 23, no lugar dos caracteres dele. Link é `http://…`,
   `https://…` ou `www.…`, até o primeiro espaço, sem a pontuação final (`.`, `,`, `;`, `:`, `!`, `?`, `)`).
2. **Só o tweet:** o peso vale para as peças `tweet` do `twitter-post` e para o `tweet_max_chars`. O
   número medido é o peso; o limite, o do formato (280, ou o que o acréscimo/cópia local declarar).
   Peso acima do limite é **bloqueio**, como hoje.
3. **O relatório diz os dois números** só quando diferem: "280 caracteres escritos; peso 292 (3 emojis
   valem 2; 1 link vale 23)". Quando são iguais, a linha é a de hoje com o nome novo.
4. **Tweet por parágrafo** (várias peças numa seção): vale a regra de hoje — só o que passa do limite
   gera linha — agora pelo peso.

**Trecho visível**
5. **Gancho** é a primeira frase do texto da peça, sem marcadores de negrito/itálico: vai até o primeiro
   `.`, `!` ou `?` seguido de espaço ou fim, ou até a primeira quebra de linha, o que vier antes. Sem
   pontuação nem quebra, o gancho é o texto inteiro.
6. **Quando se mede:** legenda do `instagram-feed` (`caption_visible_chars`) e post do `linkedin-post`
   (`post_visible_chars`), quando o formato declara o limite como número. Sem o limite, não há item e
   não há "Não medido" (é um limite opcional).
7. **O que sai:** peça de até `L` caracteres → `ok`, "cabe inteira". Peça maior e gancho de até `L` →
   `ok`, "o gancho cabe". Peça maior e gancho acima de `L` → **alerta** (nunca bloqueio), com o tamanho
   do gancho e os primeiros `L` caracteres entre aspas, cortados num grafema inteiro.
8. **Contagem** pela mesma `contar` da legenda e do post (emoji vale 1: o corte do Instagram e do
   LinkedIn é por caractere visível, não por peso).

**Acréscimo**
9. **Leitura:** `_opencrew/best-practices.local/<id>.md` com `extends: core` é um acréscimo: o runner lê
   `_opencrew/core/best-practices/<id>.md` e, depois, o corpo do acréscimo, que vale por cima quando os
   dois discordam. Sem `extends`, é cópia inteira e vale sozinha, exatamente como hoje. Acréscimo sem
   formato de mesmo id no core vale como arquivo inteiro, sem erro.
10. **Conteúdo:** o corpo é livre (regras e técnicas do usuário); o cabeçalho pode ter `constraints:`
    só com as chaves que o usuário muda, `platform:` e `version:`.
11. **Aprendizado técnico** (`fim-da-execucao.md`): grava no acréscimo do formato — cria o arquivo com
    `extends: core` e a seção, ou acrescenta ao que já existe. Se já há cópia inteira, grava nela como
    hoje. Nunca copia o core para o local.
12. **Quem muda um formato do core** (`opencrew-best-practice-creator`): cria o acréscimo, não a cópia.
    A skill ganha o procedimento "Trocar a cópia inteira por um acréscimo": a IA mostra o que a cópia
    tem de diferente do core, pergunta, e só grava com o sim, deixando `.bak` da cópia.
13. **Verificador:** `lerLimites` não dá a nota "não declara limites" a um acréscimo; os limites do
    acréscimo cobrem os do core chave a chave (já é assim). `canalDoFormato` não muda (o `platform:` do
    local, senão o do core).
14. **Sem conversão sozinha:** nenhum script do produto cria, troca ou apaga arquivo de
    `best-practices.local/`.
15. **O aviso do `update`:** para cada `<id>.md` de `best-practices.local/` **sem** `extends: core`, com
    formato de mesmo id no core e `version:` do core maior que a da cópia (ou cópia sem `version:`),
    o resumo lista o `<id>` e as duas versões. Até 5 nomes; o resto vira "e mais N". Só leitura; erro de
    leitura de um arquivo o deixa de fora, sem derrubar o `update`; sem cópia atrasada, o resumo não muda.
16. **Quem mantém o core:** mudou o conteúdo de um best-practice do core, sobe o `version:` dele
    (`CONTRIBUTING.md`) — é o que faz o aviso da regra 15 funcionar. Esta fatia sobe o de `twitter-post`
    (texto do peso do X).

## 6. Textos
- Item do tweet: `Tweet — peso (emoji vale 2, link vale 23)`; detalhe quando diferem:
  `280 caracteres escritos; peso 292 (3 emojis valem 2; 1 link vale 23)` (singular/plural corretos).
- Item do trecho: `Legenda — trecho visível` · `Post LinkedIn — trecho visível`; detalhe `ok`:
  `a legenda cabe inteira antes do "ver mais"` / `o gancho cabe antes do "ver mais"`; alerta:
  `o primeiro período tem 168 caracteres e o "ver mais" corta em 125 — o gancho fica pela metade. O leitor vê: "…"`.
- Resumo do `update`: `Cópias de best-practice atrasadas: a sua cópia de <id> está na versão 1.0.0 e o core
  tem a 1.1.0, então as melhorias do core não chegam nela. Nada foi alterado. Para trocar por um
  acréscimo (só o que é seu), peça na sua IDE: "troque minha cópia de <id> por um acréscimo".`
- Tudo em PT-BR com acentos (regra 13 do `AGENTS.md`).

## 7. Cenários
- **U6c-01a** tweet de 270 caracteres com 6 emojis: peso 276 → `ok`; com 11 emojis: peso 281 → bloqueio; o detalhe traz os dois números.
- **U6c-01b** tweet com link de 90 caracteres e 200 de texto: hoje 290 (bloqueio), agora peso 223 → `ok`; dois links valem 46; `www.exemplo.com.br/abc.` não leva o ponto final.
- **U6c-01c** emoji composto (família com ZWJ, bandeira, `1️⃣`, pele) vale 2, uma vez; texto sem emoji nem link: peso = caracteres e a linha é a de hoje com o nome novo.
- **U6c-01d** `tweet_max_chars` declarado no acréscimo/cópia local (ex. 200) vale; tweet por parágrafo só gera linha acima do limite.
- **U6c-01e** `twitter-thread` e `effective_chars` seguem como estão (sem peso e sem item novo).
- **U6c-02a** legenda de 400 caracteres cujo primeiro período tem 168: alerta, com o trecho entre aspas; primeiro período de 80: `ok`; legenda de 100 caracteres: `ok`, "cabe inteira".
- **U6c-02b** post do LinkedIn com `post_visible_chars: 210`: gancho de 230 → alerta; a quebra de linha antes de 210 fecha o gancho.
- **U6c-02c** texto sem pontuação nem quebra: o gancho é o texto inteiro; marcadores `**` não contam; o corte não racha um emoji.
- **U6c-02d** formato sem `caption_visible_chars` (ou com valor que não é número): nenhum item e nenhum "Não medido"; alerta nunca muda o código de saída.
- **U6c-03a** acréscimo (`extends: core`) com um corpo e uma chave de `constraints:`: `lerLimites` devolve os limites do core com a chave do usuário e **sem** nota; cópia inteira sem `constraints:` continua dando a nota de hoje.
- **U6c-03b** o runner (contrato do prompt): lê o core e depois o acréscimo; acréscimo sem core vale inteiro; cópia inteira vale sozinha; o núcleo continua ≤ 560 linhas e núcleo + partes ≤ 1.030.
- **U6c-03c** `fim-da-execucao.md` manda gravar o aprendizado técnico no acréscimo (com `extends: core`), nunca copiar o core; `opencrew-best-practice-creator` manda criar o acréscimo e traz o procedimento de troca com `.bak` e confirmação.
- **U6c-04a** `update` num workspace com cópia inteira de `twitter-post` na versão `0.9.0` (core `1.1.0`): o resumo traz o aviso com as duas versões; o arquivo do usuário é byte a byte o mesmo; sem cópia atrasada o resumo é o de hoje.
- **U6c-04b** acréscimo (`extends: core`), cópia sem `version:`, cópia de formato que não existe no core, e arquivo ilegível: respectivamente sem aviso, com aviso, sem aviso e sem aviso (e o `update` termina); mais de 5 cópias: 5 nomes e "e mais N".
- **U6c-05a** (trava da regra 3) nenhum arquivo de `best-practices.local/` muda, aparece ou some em `update`; a árvore do projeto fora de `core/`, skills, pontes e versão é igual antes e depois.
- **U6c-upg-a** workspace 1.17.0 → `update` → o verificador novo instalado mede o peso e o trecho; `crews/` e `_memory/` intactos.

## 8. Fora desta fatia
| Item | Destino |
|---|---|
| Caracteres que o X conta como 2 (CJK) e domínio solto como link | → sem fase — o produto é em PT-BR; volta com um caso real |
| `twitter-thread`, `effective_chars`, Reels, corte do "ver mais" por linhas | → sem fase — projeto pausado (formato fora da tabela do verificador) |
| Converter cópias inteiras sozinho no `update` | → sem fase — nunca sem o usuário (regra 3) |
| Medir "como será colado", imagens, mais de um canal | → sem fase — projeto pausado (continua no `IDEIAS.md`) |

## 9. Critérios de aceite
- [ ] Os cenários da §7 têm teste com o mesmo ID e `npm run verify` passa; conferido num checkout limpo.
- [ ] Revisão independente, em especial: o regex de link (não pode ficar quadrático nem comer texto), o emoji composto, e o que o `update` lê.
- [ ] **Conferência do dono (decisão 5):** o verificador novo contra o da 1.17.0 sobre os textos reais das crews dos projetos A e B (só leitura), com a tabela do que mudou de nível, mostrada a você antes do release.
- [ ] Execução real por IA em pasta de teste: um tweet com emoji e link; uma legenda com gancho comprido; um acréscimo criado pelo aprendizado técnico e lido na execução seguinte; a troca de uma cópia inteira por acréscimo com `.bak`.
- [ ] Com o sim do dono: release; `update` em A e B (B: com o `J:` montado); aviso do `update` lido nas duas.
- [ ] README, CHANGELOG, GLOSSARIO, CONTRIBUTING, `AGENTS.md` (regras 12 e 14), `IDEIAS.md` (itens entregues saem) no mesmo commit; `STATUS.md` atualizado.

## 10. Limites conhecidos
- O peso é o do X para letras latinas, emoji e link; CJK e domínio solto contam como 1 e como texto.
- O "ver mais" do Instagram e do LinkedIn depende também do aparelho e das quebras de linha: o alerta é um aviso, não uma garantia de onde o corte cai.
- O aviso do `update` depende de o core subir o `version:` quando muda; cópia que o usuário editou à mão e que ainda tem a versão do core não gera aviso.
- Uma cópia inteira que o usuário nunca converte continua congelada: esta fatia avisa, não força.

## 11. Travas que esta spec deixa
| Regra do `AGENTS.md` | Trava nova |
|---|---|
| 12 | `tests/verificar-peso-x.test.js` (U6c-01), `tests/verificar-trecho-visivel.test.js` (U6c-02): os dois limites declarados passam a ser medidos |
| 3 | `tests/locais-update.test.js` (U6c-04, 05a: o `update` só lê `best-practices.local/`) |
| 14 | `tests/runtime-contracts-u6c.test.js` (U6c-03, U6c-upg-a) |
| 6 | núcleo do runner ≤ 560, núcleo + partes ≤ 1.030 (U6c-03b) |

## 12. O que mudou em relação ao texto aprovado
(Preencher na implementação.)

## Esforço estimado
Três blocos independentes, na ordem do risco: (A) peso do X — pequeno (um módulo de ~40 linhas, o item do
tweet, testes); (B) trecho visível — pequeno a médio (um módulo, o item novo em duas peças, testes de
borda do gancho); (C) acréscimo — o maior (edição de 3 prompts com o teto do runner em 558/560, a skill,
`lerLimites`, um módulo novo no CLI com o aviso do `update` e os testes de `update`). Cerca de metade do
trabalho da 1.17.0, com a conferência nas crews reais no fim. Revisão independente única, ao final.
