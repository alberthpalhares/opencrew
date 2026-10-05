# Revisão das specs — 2026-10-04

> **Pedido do dono:** revisar as specs antes de aprovar a U3 (`specs/fase-u3-entrega-no-projeto.md`).
> **Status:** sugestões aguardando análise do dono. Nenhuma spec e nenhum código foram alterados.
>
> **Método:** 11 revisores independentes, um por lente (coerência interna, runtime, CLI,
> viabilidade técnica, produto, saídas reais, coerência entre documentos, as três specs já
> implementadas contra o código, segurança). Cada achado passou por um segundo revisor instruído
> a refutá-lo. Um crítico de completude procurou o que ficou de fora. Resultado bruto: 265 achados
> (204 confirmados, 61 confirmados em parte, 0 refutados), com muita repetição entre lentes.
> Este documento consolida. Os IDs entre parênteses remetem a
> [`2026-10-04-revisao-specs-indice.md`](2026-10-04-revisao-specs-indice.md).
> Os dois projetos reais aparecem anonimizados (A e B), sem texto de cliente.

## 1. Resultado

1. **A spec U3 não está pronta para aprovação.** Ela descreve a entrega sem olhar o que o runtime
   grava hoje em disco. São cinco problemas de base (§2), cada um achado por seis ou mais
   revisores sem combinar entre si.
2. **Há defeitos no que já está publicado (1.6.0)**, quase todos no verificador da U1. Reproduzi
   oito deles com o código publicado (§3). Alguns desligam o "Revisor com dentes" sem aviso.
3. **As specs implementadas (F1, U1, U2) têm trechos que não batem mais com o código** (§4).
   São correções de documento, baratas.

Caminho que proponho (§5): corrigir primeiro o que já está publicado (1.6.1), reescrever a U3 com
as decisões do §2 e entregá-la em duas partes.

## 2. U3 — os cinco problemas de base

### 2.1 "Só o aprovado" e "última versão" não existem em disco

(A-01, A-02, B-01, C-04, E-17, F-01, F-02, G-04, G-05, I-12, Z-03, Z-07)

- O estado da execução não é gravado (`runner.pipeline.md:916`, "does NOT persist to disk"). Não
  existe "passo final" que liste saídas, nem marca de aprovação.
- `vN` não é a versão de um arquivo. É um contador por pasta que sobe a cada passo
  (`runner.pipeline.md:447-456`): pesquisa em `v1`, post em `v2`, legendas em `v3`, parecer do
  revisor em `v4`. "Só v2 entra" (U3-01a) entregaria apenas o último arquivo gravado.
- A pasta da execução também guarda andaime: relatório do verificador, respostas de checkpoint,
  `caption.txt`, `export/temp.html`. Sem lista fechada, isso iria para a entrega.
- Evidência real, a confirmar (§6): a execução mais recente do Projeto A (crew criada e rodada na
  1.6.0, pelo Cowork) deixou os arquivos soltos em `output/`, sem pasta de execução e sem `vN`.

**Decisão D1 — quem diz o que é entregue?** Recomendo: o script não julga aprovação. O runner o
chama logo depois da aprovação final e passa a lista de arquivos (argumento ou um `entrega.json`
na pasta da execução); o script confere se cada um existe. A unidade de versão é a execução do
passo: a pasta `vN` mais alta que contém o `outputFile` daquele passo, com todos os arquivos dela
e só eles. Sem lista (execução antiga, arquivos soltos): modo `--arquivo`.

### 2.2 A convenção de canal não existe e colide com o verificador

(A-03, A-08, A-09, A-10, B-02, B-04, B-11, C-02, C-08, C-19, D-04, E-03, E-04, F-04, F-05, F-06,
G-01, G-10, G-11, G-14, H2-03, Z-01)

- `titulo:` em toda saída faz o verificador tratar documento, e-mail e post como blog: bloqueio
  falso "Título (SEO) ≤ 70" (`verificar/regras.mjs:41-46`). Reproduzido.
- Nenhum prompt, best-practice ou skill gera `canal:`, `## Legenda Instagram` ou
  `## Post LinkedIn`. Os 14 best-practices de formato, que o runner injeta em todo passo com
  `format:`, ensinam outro formato: `=== CAPTION ===`, `=== HASHTAGS ===`, `=== HOOK ===`.
- O canal já existe nos dados: `format:` do passo (`build.prompt.md:396`) aponta para um
  best-practice que tem `platform:`. Crews antigas e novas têm isso.
- As saídas reais do Projeto A são um arquivo por canal, com vários posts dentro
  (`## LinkedIn — Post`, `## LinkedIn — Primeiro comentário`). A spec só prevê `post.txt`.
- "Byte a byte" não combina com "pronto para colar": a legenda aprovada tem `**negrito**` e
  rótulos de estrutura. `hashtags.txt` separado contradiz a legenda inteira.

**Decisão D2 — de onde vem o canal?** Recomendo: canal = `format:` do passo → `platform:` do
best-practice. As seções são achadas pela mesma função do verificador, que passa a aceitar
cabeçalho por palavras e os marcadores `=== RÓTULO ===`. `canal:` no frontmatter vira só uma
sobrescrita opcional. Documento oficial é declarado em `entrega:` no `crew.yaml`. Sem `titulo:`
obrigatório. "Byte a byte" vira "mesmas palavras, na mesma ordem; saem rótulos de estrutura e
sintaxe de markdown", e o verificador conta o texto que será entregue. Itens repetidos são
numerados (`post-1.txt`, `post-1-comentario.txt`). Uma tabela única "canal → arquivos ← origem"
na spec serve ao `entregar.mjs` e ao `verificar.mjs`.

### 2.3 Crews que já existem não recebem a melhoria (regra 14)

(A-06, B-03, C-05, E-02, G-02, Z-01)

- A §12 admite que crews antigas "só recebem a cópia dos arquivos (→ repair na U4)". A §9 manda
  conferir justamente nos Projetos A e B. O `update` nunca toca em `crews/`.
- A decisão D2 resolve: o canal sai de dados que toda crew já tem, sem migração.

**O que muda na spec:** tirar o limite da §12; escrever "o `update` não altera `crews/`"; trocar
o U3-upg por um cenário com crew antiga de verdade (passos e execução antigos) entregue sem editar
arquivo da crew.

### 2.4 Destino fixo com nomes fixos: da 2ª execução em diante, tudo se mistura

(A-05, A-23, B-05, B-15, C-07, D-13, E-01, E-08, F-10, G-16, G-17, I-01, I-02, I-05, Z-05, Z-12)

- Crew semanal: `legenda.txt` vira `legenda-v2.txt`. O LEIA-ME novo manda colar `legenda.txt`,
  que é a da semana anterior.
- O `.docx` gerado duas vezes do mesmo texto difere (data dentro do zip): cada reexecução cria
  `-v2`, `-v3`.
- A entrega incompleta também é copiada. O arquivo ruim fica com o nome limpo; o corrigido vira
  `-v2`.
- Ninguém pergunta o destino. O público não técnico não edita YAML. Sem destino, a entrega mora
  em `crews/*/output/`, fora do git e apagada junto com a crew.
- No uso real, os resultados ficam em pastas planas por assunto, com data no nome do arquivo.

**Decisão D3 — forma do destino.** Recomendo: `<destino>/<run_id>/…` como padrão (o `run_id` já
existe, tem data e é único). O sufixo `-v2` só vale para reentrega da mesma execução. Saída
determinística (data fixa no zip, LEIA-ME sem hora). O runner pergunta o destino uma vez, ao fim
da primeira execução sem `entrega.destino`, e grava no `crew.yaml` com `.bak` (o "não" também
fica gravado). A decidir por você: um "modo plano" para documentos
(`AAAA-MM-DD_titulo.docx` direto na pasta) entra agora ou depois.

**Decisão D4 — pendências.** Recomendo três finais: `ENTREGA:OK`, `ENTREGA:COM_RESSALVA`
(bloqueio que o usuário aceitou, registrado de forma legível por script) e `ENTREGA:INCOMPLETA`.
A decisão é por canal: um canal vai inteiro ou não vai. Incompleta nunca é copiada para o
destino. Depende de a opção "Aceitar assim mesmo (fica registrado)" da U1 passar a registrar de
fato; hoje ela não grava nada (H2-07).

### 2.5 DOCX: viável, mas a promessa e as regras precisam mudar

(A-21, A-22, A-31, B-16, B-22, C-17, C-18, D-01 a D-17, E-05, E-12, E-13, F-13, F-18, F-19, F-20,
G-19, G-21, I-03, I-08, Z-06)

- **Viável.** Um protótipo com 9 partes abriu no Word 16 sem aviso, em A4, com estilos de título
  reais.
- **"Abre sem aviso de reparo" não é verificável pela porta.** Dois arquivos com zip íntegro e
  XML bem formado foram recusados pelo Word ("aparentemente corrompido"): célula de tabela sem
  parágrafo e referência sem relação. Os cenários U3-02a/b passariam com esses arquivos.
- **Lista numerada automática muda o texto de documento oficial.** "3." vira "1."; a linha
  "2026. Ano em que…" perde o "2026"; "§ 1º" e "§ 2º" em linhas seguidas se fundem.
- **Nome do arquivo a partir do título.** No Windows, um título com dois-pontos grava um arquivo
  de 0 byte sem dar erro; com `/`, `?` ou aspas o script quebra; com `../` escapa da pasta.
- **Faltam definições.** A lista de partes (U3-02b cita 3; os recursos da regra 5 pedem de 6 a
  9), o subconjunto de markdown aceito, o formato da página (A4, margens, fonte, bordas de
  tabela), a sintaxe da quebra de página (a regra 5 e o U3-02d dizem coisas diferentes),
  caracteres de controle.
- **Node.** `zlib.crc32` só existe a partir do Node 20.15 / 22.2; o pacote promete 20.0. Um
  CRC-32 próprio tem 10 linhas.
- **Tamanho.** Pela estimativa do protótipo, a fase soma cerca de 1.200 linhas de script em uns
  11 módulos. O runtime inteiro tem 538 hoje.
- **O uso que motivou o DOCX acontece fora do pipeline.** No Projeto B, depois da primeira
  execução, tudo foi tarefa avulsa. Com `--run` obrigatório, a conversão não alcança esses
  documentos e o script improvisado continua necessário.

**Decisão D5 — o gerador.** Recomendo manter o gerador próprio, em "perfil fechado":
lista fixa de partes; marcador literal, nunca numeração automática; A4 com margens e fonte que
você escolher; saída determinística; CRC-32 próprio; regra de nome de arquivo; tabela fechada
"construção de markdown → resultado"; um best-practice `documento-oficial.md` ensinando o redator
a ficar dentro do subconjunto. Testes: leitor de zip mínimo em `tests/` e três invariantes que o
Word provou exigir (toda célula termina em parágrafo; toda referência tem relação; toda parte
tem tipo de conteúdo). A promessa passa a ser: "a porta garante a estrutura; abrir no Word é
conferência humana, refeita a cada mudança no gerador". O LibreOffice sai da promessa (não há
como conferir aqui) ou entra na sua conferência. Recomendo também o modo avulso
`--arquivo texto.md`: converte qualquer markdown do projeto, sem dizer "aprovado".

### 2.6 Demais pontos da U3

| Tema | Problema | Recomendação | Achados |
|---|---|---|---|
| Quando a entrega roda | "Ao fim" é depois de publicar: o LEIA-ME manda postar o que já saiu; se a publicação falha, não há entrega; o publicador monta outra legenda | Rodar logo após a aprovação final, antes de qualquer passo irreversível; o publicador usa a legenda e as imagens da entrega; depois de publicar, o LEIA-ME marca "já publicado" | A-17, B-07, C-21, E-06, G-06, H1-07, H1-08 |
| Imagens | O runtime grava PNG por padrão; a regra 4 só copia JPEG, então quem posta à mão recebe a pasta vazia; "2 a 10" barra post de imagem única; limites fora de `constraints:` (regra 12) | Regra por canal; PNG é copiado (aviso de JPEG só quando a crew publica por API); limites em `constraints:`; validar pelo conteúdo do arquivo; dizer pasta, ordem e nomes | A-11, A-12, A-13, B-06, B-08, C-20, D-06, D-12, F-08, G-03, H1-09, I-16 |
| Canais × catálogo | WhatsApp sem pasta; Twitter/X, YouTube, Reels, Stories e artigo do LinkedIn sem canal; pesquisa e análise sem regra; HTML e PDF finais sem regra | Tabela canal ← formatos do catálogo; pasta `outros/` para o que não foi classificado, listada no LEIA-ME (nada some) | A-04, B-12, B-13, B-21, E-09, E-10, F-07, F-09 |
| PDF e export | `tests/docs.test.js` exige o PDF; o README promete "PDF, CSV e posts formatados, sem abrir editor"; o discovery oferece "PDF report"; `formatted-post` duplica a entrega | A regra 9 decide o export inteiro; README, discovery e testes mudam no mesmo commit; o LEIA-ME ensina "Salvar como PDF"; crew antiga com `format: pdf` recebe aviso em PT-BR | A-19, A-20, B-14, C-13, D-16, E-11, G-18, Z-10 |
| Regra 10 (arquivos citados nas fontes) | Como escrita, o `--corrigir` reescreveria o manual de marca do usuário e a execução pararia toda vez; no manual real são cerca de 15 pendências sem solução; "citado" e "parecido" sem definição | Vira aviso que não para a execução nem muda `FONTES:`; `--corrigir` nunca toca em fonte; definir extração e "parecido". Ou adiar | A-07, A-18, B-19, C-06, C-10, F-14, G-13, I-11 |
| Regra 11 (`update` e os blocos) | Instalações até a 1.4.1 não têm marcador (caso de A e B): o bloco é anexado e as linhas se repetem; no `.env.example` a chave vazia repetida vence; o teste de upgrade nasceria verde | Tirar o `.env.example` da regra (não muda desde a 1.0); `.gitignore` igual a um template antigo vira bloco; cenários para arquivo sem marcador, ausente e segundo `update`; fixture literal | A-24, C-01, C-11, C-14, F-15, G-27, H1-03, I-10 |
| Herança perdida | A decisão do dashboard (publicar ou remover) está alocada na U3 em dois documentos e sumiu da spec; a U1 mandou para a U3 a verificação de assunto de e-mail e de WhatsApp | Decidir se entram ou saem, com destino e motivo | A-27, A-28, B-18, B-20, C-12, E-19, F-23, G-08, G-09, H1-13, H2-13, H3-20 |
| Verificador na entrega | Rodar em "tudo que vai para `entrega/`" mede errado: o texto separado perde o cabeçalho e passa; o HTML dos slides bloqueia | Verificar os `.md` de origem antes de separar; não verificar imagem, `.docx` nem HTML | A-15, B-10, C-03, C-09, G-07 |
| Contrato do script | Sem tabela de entradas, código de saída, validação de `--crew`, `--run` e `--destino`; rodar duas vezes deixa sobras; falha de escrita (nuvem, arquivo aberto no Word) sem regra; "raiz do projeto" é a pasta atual do terminal | Seguir o padrão das specs U1 e U2; raiz sem `_opencrew/` é erro; lista dos casos de destino recusado; `entrega/` refeita do zero a cada execução | A-14, A-16, A-25, A-29, A-32, C-16, C-23, G-23, H1-20, I-04, I-06, I-07, I-13, Z-02 |
| Nomes e LEIA-ME | A pasta `fontes/` colide com "Fontes do projeto" do glossário; `-v2` confunde com `vN`; LEIA-ME sem alertas e sem "o que não foi conferido"; os passos supõem o celular | Renomear para `editaveis/`; LEIA-ME abre com pendências e ressalvas; declarar o limite de idioma (só PT-BR) | A-33, B-24, C-22, E-14, E-15, E-20, F-22, G-12, G-15, G-28, Z-11 |
| Travas e regras | A §13 não cita testes que hoje exigem o contrário; não há regra para script do runtime que escreve no projeto do usuário | Completar a §13; regra nova no AGENTS.md ("script do runtime só escreve em `output/` e no destino; nunca sobrescreve nem apaga"); "abrir o .docx" entra no "Não cobre" da regra 7 | A-20, C-14, D-17, G-21 |
| Tamanho | Runner com 916 linhas (alvo 400) e a regra 8 acrescenta texto; `conferir-fontes.mjs` com 189 de 200 | O texto da entrega mora em `prompts/entrega.prompt.md`; o runner só ganha a chamada | B-17, C-15, D-14, G-22 |

## 3. Já publicado (1.6.0): defeitos encontrados

"Reproduzi" = rodei eu mesmo o código publicado numa pasta de rascunho e vi o resultado.

| # | O que acontece | Onde | Achados | Reproduzi |
|---|---|---|---|---|
| 1 | Texto no formato que os próprios best-practices ensinam (`=== CAPTION ===`) não é medido: legenda com mais de 3.000 caracteres e 40 hashtags dá `VERIFICACAO:OK` | `verificar/regras.mjs:59-72` | H2-01, B-02, E-03 | sim |
| 2 | Cor hexadecimal (`#666666`, `#000000`) vira "Placeholder": bloqueio falso e rejeição forçada em crew de carrossel, inclusive num brief de design em `.md` | `verificar/regras.mjs:83` | H2-02, C-03 | sim |
| 3 | Os best-practices de WhatsApp e newsletter mandam usar `{{name}}`; o verificador bloqueia `{{…}}` | `regras.mjs:87` | E-07 | sim |
| 4 | Termo proibido casa dentro de outra palavra ("IA" bloqueia "dia a dia"); o termo que o usuário mandou preferir também vira proibido | `regras.mjs:117-119` | H2-04 | sim |
| 5 | Arquivo em `best-practices.local/` sem `constraints:` desliga o verificador daquele formato, sem aviso; cópia inteira congela os limites | `verificar/leitura.mjs:44-48` | H3-01 | sim |
| 6 | Rodado de fora da raiz do projeto, o verificador responde `OK` sem medir nada | `verificar.mjs:19-22, 91` | Z-02 | sim |
| 7 | `fontes:` com comentário na linha (o formato do exemplo do próprio build) não é conferida | `conferir-fontes.mjs:45` | H3-04 | sim |
| 8 | `init --repair-bridges` sem `--ide` cria pontes das 9 IDEs | `src/commands/init.js:27` | H3-02 | sim |
| 9 | `max_review_cycles` não é definido em lugar nenhum; a saída do laço quando o limite chega sem bloqueio foi apagada na U1 | `runner.pipeline.md:697-698` | H2-06 | não |
| 10 | "Aceitar assim mesmo (fica registrado)" não registra nada | `runner.pipeline.md:704` | H2-07 | não |
| 11 | As regras do revisor (nota máxima 7 com alerta; checklist só com o que foi medido) só chegam a crews novas | `runner.pipeline.md:687-688` | H2-08 | não |
| 12 | Um `CLAUDE.md` do usuário que só cita "opencrew" faz o `update` criar a ponte do Claude Code; o resumo cita o Codex sem ele estar instalado | `src/lib/migrations.js:26-46` | H3-10, H1-06 | não |
| 13 | `.mcp.json`: o `update` recria o arquivo apagado, repõe o servidor removido e regrava sem cópia | `src/lib/migrations.js:72-87` | H3-09 | não |
| 14 | Ponte antiga sem marcador (até a 1.2.2) continua mandando "adotar o papel" depois do `update` | `src/lib/fsx.js:97-101` | H3-06 | não |
| 15 | `blotato` e `resend` não têm prévia, confirmação nem `side_effects: irreversible` | `templates/skills/blotato`, `resend` | H1-04 | não |
| 16 | O `--dry-run` do Instagram já envia as imagens ao imgBB; o publicador remonta a legenda a partir dos slides, não da legenda aprovada | `instagram-publisher/scripts/publish.js:154-175`, `SKILL.md:51` | H1-15, H1-08 | não |
| 17 | `update` sobre instalação interrompida carimba o workspace como completo | `src/commands/update.js:28-31, 95-97` | H1-02 | não |

Menores, no índice: H2-05, H2-10, H2-11, H2-12, H2-15, H2-17, H2-18, H3-03, H3-05, H3-07, H3-11,
H3-14, H3-15, H3-16, H3-17, H3-19, I-14, H1-10, H1-11, H1-18, H1-19.

Os itens 1 a 7 atingem a promessa central da U1 ("o revisor mede") e falham em silêncio. A U3
usaria esse mesmo verificador como porta da entrega.

## 4. Specs implementadas que não batem mais com o código (regra 9)

- **F1:** destinos "F2", "F3" e "F4" apontam para fases que deixaram de existir (H1-14, H1-01);
  o cenário F1-01d deixou de ser verdade na 1.6.0 (H1-05); a §13 cita arquivos de teste errados e
  o F1-11a não tem teste com o ID (H1-17); mensagens e códigos de saída da §4 e da §6 diferem do
  CLI (H1-16); status "implementada" sem a conferência manual registrada (H1-12).
- **U1:** o corpo da spec descreve dois estados do verificador; o terceiro
  (`AGUARDANDO_USUARIO`) só está nas Correções (A-34, H2-09); validações e mensagens prometidas
  que o script não tem (H2-10); status "implementada" sem execução real registrada (H2-14).
- **U2:** a §13 aponta os cenários do `update` para o arquivo de teste errado (A-35, C-24, H3-13);
  C-12 e T-M5 constam como herdados e cobertos, e não foram feitos (H3-02, H3-08); a §7 afirma
  "só lê e escreve dentro do projeto", mas `--crew` não é validado (H3-17, I-14); termos novos
  fora do glossário (H3-21).
- **Outros documentos:** o `IDEIAS.md` ainda lista duas ideias entregues na 1.6.0; o glossário
  está desatualizado em "Bloqueio" e "Verificador" (G-15); o README fala em "Fase 4"; o AGENTS.md
  cita só `@inquirer/checkbox` e o `package.json` também tem `@inquirer/confirm`; não há
  auditoria de fim de fase da U1 nem da U2, e cerca de 20 achados da auditoria ficaram sem trilha
  (G-25, H3-12); itens que a U3 empurra para a U4 não têm entrada no `IDEIAS.md` (A-36, G-20).

## 5. Caminho proposto

1. **1.6.1 — correção do que já está publicado.** Itens 1 a 9 e 11 do §3. Ciclo T3 próprio: uma
   spec curta, para você aprovar. Os itens 10 e 16 entram na U3 (decisões D4 e "quando a entrega
   roda"). Os itens 12 a 15 e 17: você decide se vão junto ou esperam.
2. **Faxina de documentos**, sem código: o §4 inteiro, num commit.
3. **U3 reescrita** com as decisões D1 a D5 e a tabela do §2.6, em duas entregas:
   - **U3a (1.7.0) — Entrega por canal:** `entregar.mjs`, pasta por execução, destino perguntado,
     LEIA-ME, funcionamento em crews antigas, export e PDF acertados, `.gitignore` no `update`.
   - **U3b (1.8.0) — Documento Word:** gerador em perfil fechado, modo avulso, conferência no
     Word antes da tag.
   A ordem das duas é escolha sua: a U3a serve à crew de conteúdo, a U3b à de documentos. A U4
   passa a 1.9.0.
4. **Conferências que só você pode fazer:** ver se a unidade do Projeto B está montada (ela não
   estava durante a revisão) e como os caminhos de saída ficaram presos lá (G-26, F-20);
   confirmar se a execução de 1.6.0 no Projeto A deixou mesmo os arquivos soltos em `output/`
   (F-03).

## 6. Limites desta revisão

- **Projeto B não foi lido** (unidade não montada). O que se diz dele vem dos documentos deste
  repositório.
- **Projeto A foi lido por um revisor só.** O segundo revisor não teve acesso à pasta, então os
  fatos sobre as saídas reais (arquivos soltos, cabeçalhos, vários posts por arquivo, pastas
  planas) não passaram pela segunda conferência.
- **Não conferido:** LibreOffice (não instalado); Node 20.0 a 20.14 (a ausência de `zlib.crc32`
  vem da documentação do Node); a pasta de trabalho e o Node dentro do Cowork; com que frequência
  os defeitos do §3 aparecem em execução real (não há execução registrada com o verificador no
  laço).
- **Word.** Pedi aos revisores que não abrissem o Word. O verificador da lente técnica abriu os
  protótipos por automação invisível, em modo leitura. Nenhum documento seu foi tocado e não
  ficou processo do Word aberto. O resultado é útil (prova a viabilidade e os dois casos de
  recusa), mas foi além do que eu tinha pedido.
- **Zero achados refutados em 265 é incomum.** Os segundos revisores corrigiram 61 e rebaixaram
  várias severidades. Por isso reproduzi eu mesmo os oito primeiros itens do §3 e o bloqueio
  falso do `titulo:` (§2.2). O restante se apoia na conferência dos revisores.
- **Evidência bruta** (com caminhos locais e a estrutura dos projetos reais): arquivo local, fora
  do git, `docs/auditoria/2026-10-04-revisao-specs.achados.local.json`.
