# Spec — Fase U3b: Documento Word (1.9.0)

- **Fase:** U3b · **Módulos:** Runtime (`templates/_opencrew/core/scripts/documento.mjs`, `scripts/docx/`, `scripts/verificar.mjs`, `scripts/entregar.mjs` e `scripts/entrega/` da U3a, `best-practices/documento-oficial.md`, `_catalog.yaml`, `prompts/entrega.prompt.md`, `prompts/design.prompt.md`, `templates/AGENTS.md`) + testes (`tests/_helpers.js`, `tests/fixtures/`) + docs (`AGENTS.md` regras 7 e 15, README) · **Status:** aguardando aprovação
- **Termos novos no GLOSSARIO.md:** sim — Documento Word, Documento oficial (formato), Perfil fechado, Marcador literal, Aviso de conversão, Conversão avulsa, Modo plano, Carimbo da conferência
- **Modelo sugerido:** execução Sonnet 5.5 · alto (o Word não tolera improviso no XML)
- **Origem:** `docs/auditoria/2026-10-04-revisao-specs.md` §2.5, §2.6 e §7 (os IDs entre parênteses são de lá). Substitui a parte de documentos de `specs/fase-u3-entrega-no-projeto.md`, que não foi aprovada.
- **Depende de:** R1 (`specs/fase-r1-reparos-1-6-1.md`) e U3a (`specs/fase-u3a-entrega-por-canal.md`). Parte do código como ele fica depois das duas.

## Decisões que o dono confirma ao aprovar
Cada uma já está aplicada no texto, com a opção recomendada.

*O que você vai notar:*

1. **Formato da página** (regra 4): A4; margens de 3 cm (superior e esquerda) e 2 cm (inferior e
   direita); Arial 12; entrelinha 1,15 e 6 pt depois do parágrafo; justificado; título 1 no centro.
   Os demais valores (títulos 2 a 4, tabela, código e citação) estão na regra 4. Não há
   alinhamento por parágrafo: data à direita e assinatura no centro não saem (seção 12).
2. **Número de página** (regra 13): ligado por padrão, só o número, no centro do rodapé.
   `entrega.numero_pagina: nao` desliga. Na conversão avulsa sem `--crew`, fica sempre ligado.
3. **Arquivo marcado como documento vai inteiro para o Word** (regra 11): um título de seção com
   nome de rede social ("## Divulgação no LinkedIn") é texto do documento. Não vira post
   separado e não é medido como post.
4. **Duas perguntas novas, cada uma feita uma vez, antes de chamar a entrega** (regra 18): quais
   `.md` viram Word, e se você quer também cada Word solto numa pasta do projeto, com a data no
   nome. Quem grava a resposta no `crew.yaml` é o script, como na U3a. Não adotado: perguntar
   depois da entrega, o que deixaria duas pastas da mesma execução na pasta de cópia de quem já
   tem uma (`entrega.destino`).
5. **Word de qualquer texto, fora de uma execução** (conversão avulsa, regra 14): pela rota
   `/opencrew documento <arquivo>` ou pela opção nova do menu. O Word fica ao lado do texto ou
   na pasta que você disser. Se o texto está na pasta de uma execução, a IA pergunta antes em
   que pasta do projeto gravar.
6. **Pedido em texto não ativa o OpenCrew em conversa nova** (regra 14): "gera o Word de…" só
   segue a rota com o OpenCrew já ativo na conversa; fora disso, vale a rota do item 5. As
   pontes das IDEs não mudam (convivência, U6). Não adotado: pôr o pedido de documento na frase
   de ativação das 9 pontes, o que mexe em `src/lib/ides.js`, no U2-08a e no teste de upgrade
   (seção 11, → U4).

*Detalhes já aplicados:*

7. **Modo plano entra nesta fase** (regra 12): a cópia solta, com a data no nome, na pasta de
   `entrega.documentos_em`.
8. **Arquivo de formato de documento que não é `.md` nem `.txt`** (regra 11): é copiado como está
   para `documentos/`, com aviso, e não para `outros/` (canal = plataforma, como na U3a).
9. **Avisos antes da revisão** (regra 8): o verificador mostra os avisos de conversão como nota,
   antes do revisor, para o redator poder consertar.
10. **Carimbo da conferência** (regra 16): se o gerador mudar um byte do documento de referência,
    a porta reprova até o carimbo novo estar no `.json` e na seção 14, com a data e a versão do
    Word. Se o arquivo foi mesmo aberto no Word, a porta não vê: isso é regra de trabalho.

Antes do BDD, só você pode fazer: abrir um documento oficial do Projeto B e o script antigo e
anotar o que ele fazia além disto (capa, timbre, sumário, alinhamento de data e assinatura). O
Projeto B não foi lido na revisão (F-20). O que faltar entra na seção 11, com destino. É o
primeiro critério de aceite (seção 10).

## 1. Objetivo
Um texto em markdown vira um documento Word (`.docx`) pronto para imprimir, protocolar ou enviar:
em A4, com títulos de verdade, tabelas com borda e **as mesmas palavras e os mesmos números, na
mesma ordem**. Funciona dentro da entrega de uma execução e também fora dela, para qualquer texto
do projeto. O objetivo é dispensar, para gerar o Word, o script feito à parte (dor 6 do uso real,
Projeto B); o que ele fazia além disto só fica mapeado com a conferência do dono (seção 10). O
PDF continua saindo pelo Word, à mão.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| D-01, D-17, G-21 | "Abre sem aviso de reparo" não é verificável pela porta; zip e XML sem método de prova | U3b-01, U3b-ref, regras 15 e 16 |
| D-02, A-21, F-19, E-12 | Lista de partes incompleta; títulos sem estilo; sem A4 nem número de página | U3b-01a, U3b-01e, U3b-01f, U3b-02a |
| D-03, F-20 | Numeração automática muda o texto oficial | U3b-02b, U3b-02c |
| D-05, A-22, B-22, C-18, E-13, F-13, I-03 | Nome do arquivo vindo do título cru: arquivo vazio no Windows, erro, fuga da pasta | U3b-03 |
| D-08, D-09, B-22, I-08 | Subconjunto de markdown indefinido; quebra de página com duas leituras; link e imagem sem regra | U3b-02 |
| D-10, D-11, I-08 | Formato da página; caractere de controle; palavras coladas sem `xml:space` | U3b-01c, U3b-01e, U3b-02d, U3b-02i |
| D-07, C-17, Z-13 (o CRC) | `zlib.crc32` não existe em todo Node 20 | U3b-01b |
| D-13 (parte) | `.docx` diferente a cada geração | U3b-01d, U3b-05f |
| D-14, D-15, G-19 | Tamanho dos módulos; motor escolhido sem registrar as alternativas | regras 1 e 20, nota abaixo |
| A-31, B-16, E-05, F-18, Z-06 | O uso que motivou o Word acontece fora do pipeline | U3b-04 |
| D-04 | `titulo:` de documento medido como título de blog | U3b-04e, U3b-05c (a base é da R1) |
| F-10 | Resultados guardados em pastas planas, com data no nome | U3b-05f |
| E-21 | O que muda no Word não volta para a crew | seção 12, U3b-04b, U3b-05b |
| Regra 14 do AGENTS.md | Crew que já existe recebe a melhoria sem ser recriada | U3b-05c, U3b-05i, U3b-upg, U3b-upg-b |
| U3a, seções 9 e 11 | Documentos saem em `outros/`, como `.md`, até esta fase | U3b-05b |
| Z-08 (parte), enviado pela U3a | O texto aprovado não acompanha o `.docx` | seção 11 |
| U2-08 (convivência, U6) | A ponte só ativa o OpenCrew com `/opencrew` ou pedido sobre crews | regra 14, seções 11 e 12 |
| Fora daqui | Ver seção 11 | — |

**Alternativas descartadas para o motor** (D-15, G-19). Biblioteca npm: os scripts rodam no projeto
do usuário sem `node_modules`, e instalar exigiria rede. RTF: não é `.docx`. HTML salvo como `.doc`:
abre em modo web. Word, LibreOffice ou pandoc instalados: o usuário comum não tem, e a saída
mudaria de máquina para máquina.

**O que esta spec usa das outras duas.** Da R1 e da U3a: as mensagens de erro de uso, com o
mesmo texto (seção 6). Da R1: formato por arquivo (`caminho=formato`) e, em formato fora da tabela
dela, o título do frontmatter fora da medida de blog. Da R1 e da regra 5 da U3a: formato fora da
tabela passa só pelas checagens gerais, e em texto longo cabeçalho é conteúdo. A regra 11 daqui
diz isso para o documento e troca, para ele, a linha "Não medido" da regra 6 da R1. Da U3a: a
lista `--arquivo` e a pasta `entrega/`, refeita do zero (regras 1 e 12); canal = `platform:` do
formato (regra 3); arquivo que não é texto copiado como está (regra 8); o leitor do bloco
`entrega:` do `crew.yaml` (seção 3 dela) e a validação única de destino (regra 13); cópia,
reentrega e saída determinística (regras 14 e 15); pergunta feita uma vez e gravada pelo script
(regra 16); pendência por canal, ressalva e os três finais (regras 17 a 19); o texto em
`prompts/entrega.prompt.md` (regra 21); a regra 15 do AGENTS.md (regra 33).

## 3. Entradas
| Entrada | Tipo | Obrigatória | Validação |
|---|---|---|---|
| `documento.mjs --arquivo` | lista separada por vírgula | sim | dentro do projeto; `.md` ou `.txt`; UTF-8; com texto |
| `documento.mjs --destino` | pasta | não (padrão: a pasta do arquivo de origem) | validação de destino da U3a; é criada se não existir |
| `documento.mjs --crew` | pasta da crew | não | dentro do projeto e existente; dá cabeçalho, rodapé, número de página e proibições |
| `documento.mjs --ajuda` | opção | não | só imprime o uso |
| pasta atual do comando | raiz do projeto | sim | contém `_opencrew/` |
| item `caminho=formato` na lista da entrega, com formato de plataforma `documento` | formato | não | `.md` e `.txt` viram Word; outro tipo é copiado como está, com aviso (regra 11) |
| `entrega.documentos` no `crew.yaml` | arquivos de saída separados por vírgula, ou `nao` | não | cada item como no `outputFile` do passo, sem `crews/<crew>/output/`; vale para `.md` sem formato ou sem canal conhecido (regra 11); `nao` = "já perguntei" |
| `entrega.documentos_em` | pasta do projeto, ou `nao` | não | validação de destino da U3a; `nao` = "já perguntei", sem cópia |
| `entrega.cabecalho`, `entrega.rodape` | texto simples, uma linha | não | markdown não é interpretado |
| `entrega.numero_pagina` | `nao` desliga | não | ausente: ligado |
| `entregar.mjs --lembrar-documentos` | lista separada por vírgula, ou `nao` | não | cada item termina em `.md` e não tem `..`; antes de gravar, o script tira `crews/<crew>/output/`, a pasta da execução e `vN/` (a normalização da regra 11); grava `entrega.documentos` |
| `entregar.mjs --lembrar-documentos-em` | pasta, ou `nao` | não | validação de destino da U3a; grava `entrega.documentos_em` |
| `titulo:` (ou `título:`) ou `title:` no frontmatter | texto | não | só serve para o nome do arquivo |

As chaves de `entrega:` são lidas pelo leitor da U3a: `chave: valor`, um nível abaixo de
`entrega:`, com aspas e comentário no fim da linha aceitos. Nas três chaves que aceitam `nao`
(`documentos`, `documentos_em` e `numero_pagina`) e nas duas opções `--lembrar-…`, `nao`, `não` e
`no` valem o mesmo, sem diferenciar maiúsculas, como na U3a. O script grava sempre `nao`.

```yaml
entrega:
  documentos: "ata.md, parecer.md"   # para crews sem `format: documento-oficial`
  documentos_em: Documentos/Atas     # cópia direta, com data no nome
  cabecalho: "Clube Exemplo — Assembleia Geral"
```
Entrega (o uso da U3a, com as duas opções novas):
```
node _opencrew/core/scripts/entregar.mjs --crew crews/<crew> --arquivo "<lista>" [--run <id>]
     [--destino <pasta>] [--lembrar-destino <pasta|nao>] [--lembrar-documentos <lista|nao>]
     [--lembrar-documentos-em <pasta|nao>] [--aceitar-pendencias]
     [--vai-publicar <canal>] [--publicado <canal>[=<link>]] [--ajuda]
```
Conversão avulsa: `node _opencrew/core/scripts/documento.mjs --arquivo textos/ata.md [--destino
Documentos/Atas] [--crew crews/<nome>] [--ajuda]`

## 4. Saídas
- **Conversão avulsa:** `<pasta do arquivo ou --destino>/<nome>.docx` e um relatório em PT-BR com,
  por arquivo, onde gravou, o título inteiro (como foi escrito, antes da normalização da regra 9;
  sem título, o nome do arquivo de origem), os avisos de conversão e a "Conferência do texto
  (informativa)"; no fim, as três dicas da regra 14. Última linha: `DOCUMENTO:OK` (todo arquivo
  pedido tem o seu `.docx`) ou `DOCUMENTO:PENDENTE` (ao menos um não foi gerado).
- **Código de saída:** 0 quando ao menos um arquivo da lista existe, mesmo que nenhum seja gerado
  (a última linha é `DOCUMENTO:PENDENTE`); 1 em erro de uso (as linhas da conversão avulsa com
  "código 1" na seção 6), sem linha `DOCUMENTO:` e sem gravar nada. `--ajuda` só imprime o uso,
  com código 0.
- **Na entrega:** `entrega/documentos/<nome>.docx`, a cópia de destino da U3a e, no modo plano,
  `<documentos_em>/AAAA-MM-DD_<nome>.docx`. O resumo e o LEIA-ME tratam `documentos` como mais um
  canal. A última linha continua sendo a da U3a; não há estado novo.
- **Para a entrega chamar:** duas funções exportadas, que não tocam o disco: texto e opções →
  bytes, título e avisos; título e origem → nome do arquivo (regra 9). O comando usa as mesmas.

## 5. Regras de negócio

**O gerador**
1. **Gerador próprio, em perfil fechado.** Node puro, sem dependência e sem rede, só com APIs do
   Node 20.0. Não importa `node:zlib`: o zip não é comprimido e o CRC-32 é próprio (`zlib.crc32`
   só existe a partir do Node 20.15 e 22.2 — D-07). Fora das partes da regra 2 e das construções
   da regra 7, nada é gerado.
2. **Partes fixas, nesta ordem:** `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`,
   `word/_rels/document.xml.rels`, `word/styles.xml`, `word/settings.xml`; depois, quando
   existirem, `word/header1.xml` e `word/footer1.xml` (regra 13). Não há `numbering.xml`,
   `docProps/` nem relação externa.
3. **Determinismo.** Mesmo texto e mesmas opções dão os mesmos bytes, em qualquer sistema: zip no
   método 0, data fixa (1980-01-01 00:00) em toda entrada, nenhuma data, hora, usuário ou caminho
   dentro do arquivo. CRLF e LF dão o mesmo resultado; o BOM é ignorado. É isso que deixa a U3a
   reconhecer a cópia igual (regra 14 dela).
4. **Formato da página, fixo:**

   | Item | Valor |
   |---|---|
   | Papel e margens | A4 em pé (21 × 29,7 cm; no arquivo, 11906 × 16838); superior 3 cm · esquerda 3 cm · direita 2 cm · inferior 2 cm |
   | Texto | Arial 12, justificado, entrelinha 1,15, 6 pt depois do parágrafo, sem recuo de primeira linha |
   | Títulos 1 a 4 | estilos `Heading1` a `Heading4`, com os nomes `heading 1` a `heading 4` (é o que faz o Word mostrar "Título 1" a "Título 4") e nível de tópico; Arial, todos em negrito: 14 no centro · 13 · 12 · 12 itálico; do 2 ao 4, à esquerda; 12 pt antes e 6 pt depois |
   | Recuo e código | 0,75 cm por nível (regra 6); citação: 2 cm, justificada; código em Courier New 10, à esquerda |
   | Tabela; cabeçalho e rodapé da página | tabela com bordas simples, na largura da área de texto, colunas iguais; texto das células à esquerda, sem espaço depois do parágrafo; cabeçalho e rodapé em Arial 10, no centro |
   | Idioma e modo | pt-BR; modo de compatibilidade 15 (o Word não mostra "Modo de Compatibilidade") |
5. **Invariantes de estrutura**, para qualquer texto: (a) toda célula de tabela termina em
   parágrafo; (b) todo `r:id` usado tem relação, e a parte apontada existe no zip; (c) toda parte
   tem tipo de conteúdo, e as de `word/` (fora os `.rels`) têm o tipo próprio delas (documento
   principal, estilos, ajustes, cabeçalho, rodapé), declarado por parte; (d) todo estilo usado
   está em `styles.xml`; (e) todo trecho de texto leva `xml:space="preserve"`; (f) toda parte é
   XML bem-formado, sem caractere proibido no XML 1.0; (g) `_rels/.rels` aponta
   `word/document.xml` como documento principal, e toda outra parte de `word/` (fora os `.rels`)
   é alvo de uma relação em `word/_rels/document.xml.rels`, com o tipo dela (estilos, ajustes,
   cabeçalho, rodapé). (a), (b) e (c) vêm do que o Word provou exigir (D-01). (g) vem do formato:
   parte sem relação é ignorada, e sem estilos e ajustes os títulos viram texto comum e o arquivo
   abre em modo de compatibilidade (D-02, D-10).

**O texto**
6. **O texto oficial não muda.** O gerador nunca numera, nunca reordena e nunca corrige. O número
   ou a letra que o autor escreveu (`1.`, `3.`, `a)`, `I -`, `§ 1º`) vai como texto, no mesmo
   parágrafo: é o marcador literal. O nível vem do espaço no início da linha (tabulação vale 4
   espaços), comparado com as linhas não vazias de cima, até a última sem recuo: recuo maior que
   o da linha anterior desce um nível; igual mantém; menor volta ao nível da linha mais próxima
   com o mesmo recuo e, se nenhuma tinha esse recuo, fica um nível abaixo da mais próxima com
   recuo menor; linha sem recuo zera. Passou de 3 níveis, fica no 3, com aviso.
7. **Tabela fechada: construção de markdown → resultado no `.docx`.** O que não está aqui sai
   como texto simples.

   | No markdown | No `.docx` |
   |---|---|
   | Frontmatter: bloco que começa na primeira linha com `---`, termina na próxima linha `---`, tem ao menos uma linha `chave: valor` (a chave não tem espaço: letras, com ou sem acento, dígitos, `_` e `-`) e em que toda linha não vazia é `chave: valor` ou continuação recuada | Fora do corpo; só dá o nome do arquivo (regra 9). Bloco que não tem essa forma não é frontmatter: nada é retirado |
   | `#` a `####` · `#####` e `######` | Título 1 a 4 · parágrafo comum em negrito |
   | Linha não vazia | Um parágrafo. Linhas seguidas não se juntam; linha vazia não gera parágrafo |
   | Recuo no início da linha | Nível 1 a 3 (regra 6); nunca vira bloco de código |
   | Linha iniciada por `- ` | O marcador vira `•`; o resto fica igual (`- [ ] x` sai como `• [ ] x`). Só o hífen: `* ` e `+ ` no início da linha ficam como texto, com o sinal que o autor escreveu |
   | `**a**`, `__a__` · `*a*`, `_a_` · `***a***` | Negrito · itálico · os dois. O marcador só vale em par, na mesma linha e colado ao texto: o que abre vem depois de início de linha, espaço ou pontuação e antes de algo que não é espaço; o que fecha vem depois de algo que não é espaço e antes de fim de linha, espaço ou pontuação. Sem par, fica como está: `2 * 3 * 4`, `2*3*4`, `valor*` e `nome_do_arquivo` não mudam. Nunca dentro de URL (`http…`, `www.`; solta, em `[texto](url)` ou em `<url>`) nem de e-mail: o endereço sai igual |
   | Barra invertida antes de `*`, `_`, `#` ou da barra vertical | O caractere, sem a barra invertida |
   | `> texto` | Parágrafo recuado 2 cm, sem mudar a letra |
   | `[texto](url)` | `texto (url)`, como texto. A URL só aparece se começar por `http://`, `https://` ou `mailto:`. `<url>` vira `url` |
   | Código entre crases · bloco entre cercas de três crases | Courier New. No bloco, cada linha é um parágrafo, inclusive a vazia, e nada é interpretado |
   | `![descrição](arquivo)` | O texto `[imagem não incluída: descrição]`, com aviso |
   | Tag HTML da lista: `a`, `b`, `blockquote`, `br`, `center`, `code`, `div`, `em`, `font`, `h1` a `h6`, `hr`, `i`, `img`, `li`, `ol`, `p`, `pre`, `s`, `small`, `span`, `strong`, `sub`, `sup`, `table`, `tbody`, `td`, `th`, `thead`, `tr`, `u`, `ul` (de abertura, de fechamento ou `<x/>`, sozinha (`<b>`, `</b>`, `<br/>`) ou com atributo na forma `nome=valor`, sem diferenciar maiúsculas) | A tag sai e o texto fica (`<br>` e `<hr>` viram espaço), com aviso, que conta as linhas que tinham tag. Qualquer outro `<nome>` e `a < b` ficam como estão (`<data>`, `<nome do requerente>`). `<a definir>` não é tag e fica como está |
   | Comentário `<!-- … -->` | Sai, sem aviso (anotação interna), inclusive quando ocupa várias linhas. Sem o `-->`, fica como texto |
   | Linha só com `<!-- pagina -->` (vale também `página`, com ou sem espaços, sem diferenciar maiúsculas) | Quebra de página antes do bloco seguinte. No início ou no fim do texto é ignorada; duas seguidas valem uma |
   | Linha só com `---`, `***` ou `___` | Ignorada: não vira linha, título nem quebra |
   | Tabela (primeira linha, linha separadora, linhas) | Primeira linha em negrito. Vale o número de colunas da linha mais longa; as outras são completadas com células vazias. O alinhamento pedido é ignorado. Sem linha separadora, fica como texto. Tabela seguida de outra tabela, ou no fim do texto, ganha um parágrafo vazio depois; seguida de texto, não |
   | Tabulação no meio da linha · `&`, `<`, `>`, aspas, acentos, emoji | Tabulação (no início da linha conta como recuo, regra 6) · iguais no Word |
   | Caractere de controle inválido em XML 1.0 | Removido, com aviso |
   | Nota de rodapé, linha de `===`, entidade HTML | Sem tratamento: sai como texto |
8. **Avisos de conversão:** imagem não incluída, tag HTML retirada, recuo acima de 3 níveis,
   caractere inválido removido e nome encurtado pelo limite do caminho (regra 9). Cada um diz o
   arquivo e, quando há o que contar, a quantidade. Aviso não muda status nem código de saída.
   Aparece no relatório da conversão avulsa, no LEIA-ME e, para arquivo de formato de plataforma
   `documento`, como nota no relatório do verificador.

**O arquivo**
9. **Nome do arquivo.** Vem, nesta ordem, de `titulo:` (ou `título:`), de `title:`, do primeiro
   título de nível 1 (`# `) ou do nome do arquivo de origem. O título entra como aparece no
   documento, sem a sintaxe de markdown (`# **ATA** da reunião` dá `ATA da reunião`).
   Normalização: forma NFC; `\ / : * ? " < > |` e caracteres de controle viram `-` (vários
   seguidos, um só); espaços seguidos viram um; saem ponto, espaço e hífen das duas pontas; no
   máximo 80 caracteres, sem partir um caractere (emoji e letra acentuada contam 1); depois de
   cada corte, saem de novo ponto, espaço e hífen do fim; acentos ficam; nome vazio vira
   `documento`; nome reservado do Windows, sem diferenciar maiúsculas (`CON`, `PRN`, `AUX`,
   `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`), ganha `_` na frente. Caminho absoluto do arquivo gravado
   acima de 240 caracteres: o nome é encurtado até caber, nunca abaixo de 20 caracteres, com
   aviso; se nem com 20 couber, grava com 20 e o aviso diz que o caminho continua longo. Na
   entrega, mede-se o caminho de `entrega/documentos/`, e as cópias usam o mesmo nome.
10. **Nunca sobrescreve, nunca apaga (fora de `entrega/`).** A pasta `entrega/` é refeita do zero
    pela U3a (regra 12 dela); fora dela, nada que já existia é trocado nem apagado. Dois
    documentos com o mesmo nome na mesma entrega ou na mesma chamada (sem diferenciar
    maiúsculas): o segundo ganha `-2`, o terceiro `-3`. Na conversão avulsa e no modo plano, o
    arquivo vai para o primeiro nome livre entre `<nome>.docx`, `<nome>-v2.docx`,
    `<nome>-v3.docx`…; se um deles já é idêntico, nada é gravado. Aqui o sufixo é a versão do
    documento. A gravação nunca substitui um arquivo e é conferida pela listagem da pasta: nome
    esperado e tamanho gerado.

**Onde o documento nasce**
11. **Na entrega.** A plataforma `documento` ganha a pasta `documentos/`, a oitava pasta de canal
    da U3a, e a tabela "Formato → pasta" dela ganha a linha `documento-oficial` →
    `documentos/<nome>.docx`. Conta como documento:
    - (a) o item cujo formato tem `platform: "documento"`: o `documento-oficial` do core ou um
      formato do usuário em `best-practices.local/`;
    - (b) o item sem canal conhecido (sem formato declarado, tenha ou não seção com palavra de
      canal ou rótulo; com formato sem best-practice; sem `platform:`; ou de plataforma
      desconhecida) cujo caminho, sem `crews/<crew>/output/`, sem a pasta da execução e sem
      `vN/`, está em `entrega.documentos`. A comparação é pelo caminho relativo inteiro, com `/`
      (a barra invertida é aceita e trocada), sem diferenciar maiúsculas.

    Para os documentos de (a) e de (b):
    - **O que vira Word.** No item de (a), `.md` e `.txt`; outro tipo é copiado como está para
      `documentos/`, com aviso (regras 3 e 8 da U3a). No item de (b), só `.md`. O arquivo
      convertido não vai para `outros/`.
    - **A declaração do usuário vale sobre a detecção.** No item de (a) e no de (b), cabeçalho e
      rótulo são conteúdo: a regra 5 da U3a não se aplica, e nenhuma peça é separada nem medida.
      O texto convertido é o corpo inteiro do arquivo de origem, pela regra 7: as regras 4 a 6 da
      U3a (peças, texto para colar e bloco de serviço) não se aplicam ao documento, e só o
      comentário `<!-- … -->` some.
    - **Verificação.** O item de (b) é verificado, na entrega, como `documento-oficial`. Formato
      de plataforma `documento` passa só pelas checagens gerais, sem medir título de blog, e não
      gera a linha "Não medido — o verificador ainda não mede os limites…" da R1: documento não
      tem limite de tamanho (regra 17). Sem achado, o relatório diz `⚪ Nada a apontar nas
      checagens gerais (documento: não há limite de tamanho a medir)`, e essa linha não conta em
      não medidos. Vale no verificador antes do revisor e na entrega.
    - **Pendência e falha.** Pendência, ressalva, cópia e reentrega seguem a U3a, sem mudança:
      `documentos` com pendência "não está pronto" e não é copiado. Falha ao converter é
      pendência de `documentos` e nunca vira ressalva; falha ao gravar segue a regra 15 da U3a.
    - **LEIA-ME.** O título da seção é `## Documentos`, depois de `## YouTube` e antes de
      `## Outros arquivos`. Ela traz a situação, como as outras seções de canal, e, por
      documento, nome do arquivo, título inteiro, origem e avisos. O canal entra como mais um
      item do quadro "Passos por canal" da U3a, com este texto: primeiro, "Não edite o Word
      dentro da `entrega/` da execução: ela é refeita a cada entrega. Para mexer, use a cópia na
      pasta do projeto ou salve com outro nome em outra pasta."; depois, as três dicas da regra
      14. A frase não diz "desta pasta" porque o LEIA-ME da cópia é o mesmo arquivo (seção 4 da
      U3a). "O que não foi conferido" ganha a linha "como o documento abre no Word". Com
      `documentos` não pronto, a seção traz só a situação, as pendências e o arquivo de origem,
      como na U3a; os passos só aparecem quando há `.docx` gerado em `documentos/`.
12. **Modo plano.** Com `entrega.documentos_em`, cada `.docx` gerado, de canal pronto, é copiado
    também para essa pasta como `AAAA-MM-DD_<nome>.docx`, pela regra 10. A data são os 10
    primeiros caracteres do `run_id`, quando têm a forma `AAAA-MM-DD`; se não têm, e em entrega
    avulsa, o nome sai sem data: `<nome>.docx`. Pasta recusada: a cópia não é feita e a última
    linha é `ENTREGA:INCOMPLETA`, como no destino recusado da U3a. O resumo da entrega diz, por
    documento, onde ficou a cópia do modo plano, com as mensagens da regra 10 (seção 6). O
    LEIA-ME não cita essa cópia: o nome depende do que já existe na pasta, e o LEIA-ME tem de
    sair igual a cada vez (regra 15 da U3a).
13. **Cabeçalho, rodapé e número de página.** `entrega.cabecalho` gera `header1.xml`. `footer1.xml`
    existe quando há `entrega.rodape` ou número de página ligado (`entrega.numero_pagina: nao`
    desliga), e mostra `texto — N`, só `N` ou só o texto. Sem nenhum dos três, nenhuma das duas
    partes existe. Os dois textos vão como foram escritos, sem interpretar markdown, com `&`, `<`
    e `>` escapados (regra 5, item f).
14. **Conversão avulsa** (`documento.mjs`). Converte qualquer markdown do projeto, sem execução e
    sem crew. Não revisa e não usa a palavra "aprovado": as checagens gerais do verificador
    aparecem como "Conferência do texto (informativa)" e não mudam o status. A conferência usa o
    formato `documento-oficial` (regra 11: sem linha "Não medido"). A função do verificador passa
    a aceitar chamada sem crew, e só o `documento.mjs` a usa assim; a linha de comando do
    `verificar.mjs` continua exigindo `--crew`.
    - **`--crew`.** Com ele, valem as proibições, `entrega.cabecalho`, `entrega.rodape` e
      `entrega.numero_pagina` daquela crew. Sem ele, o documento sai sem cabeçalho, sem texto de
      rodapé e com o número de página (padrão da regra 13), e o relatório diz que não conferiu
      proibições.
    - **Onde grava.** Sem `--destino`, na pasta do arquivo de origem. Se ela é pasta reservada
      (`_opencrew/`, `skills/`, `.git/`, `node_modules/` ou `crews/` fora de `output/`), o
      comando pede `--destino`. Aqui `crews/<crew>/output/` é aceita; já o `--destino` segue a
      validação da U3a, que recusa `crews/` inteira.
    - **Três dicas no fim do relatório**, com este texto: "Para ter um PDF: abra o documento no
      Word e use Arquivo → Salvar como → PDF." · "O Word é uma cópia gerada do texto. O que você
      mudar nele não volta sozinho: peça a alteração no chat e gere de novo." · "Para usar
      papel timbrado: abra o seu modelo timbrado no Word e use Inserir → Objeto → Texto do
      arquivo, escolhendo o Word gerado."
    - **No sistema** (`templates/AGENTS.md`). A rota `/opencrew documento <arquivo>` roda este
      comando e mostra onde o arquivo ficou; sem arquivo, a IA pergunta qual. O menu "More
      options" ganha a quarta opção: gerar o Word de um texto do projeto. Com o OpenCrew já ativo
      na conversa, o pedido em texto ("gera o Word de…") segue a mesma rota. Em conversa nova, o
      pedido em texto não ativa o OpenCrew (a ponte só ativa com `/opencrew` ou pedido sobre
      crews): vale o comando.
    - **O que a IA faz na rota.** Passa `--crew crews/<nome>` quando o arquivo está em
      `crews/<nome>/`, e `--destino` quando o usuário diz a pasta. Se o arquivo está em
      `crews/<crew>/output/`, pergunta em que pasta do projeto gravar e passa `--destino`: o
      Word deixado na pasta de uma execução entraria na entrega seguinte como arquivo copiado.
      Se o comando pedir `--destino`, pergunta a pasta. Se o comando não rodar (sem Node, erro,
      sem linha `DOCUMENTO:`) ou terminar em `DOCUMENTO:PENDENTE`, mostra a mensagem do script e
      o que falta, e não gera o `.docx` por outro meio.

**Promessa e prova**
15. **Promessa honesta.** A porta garante a estrutura (regras 2, 3 e 5). Abrir no Word sem aviso
    de reparo é conferência humana (seção 9), refeita a cada mudança no gerador. LibreOffice e
    Google Docs ficam fora da promessa. O AGENTS.md (regra 7, "Não cobre") ganha "abrir o `.docx`
    no Word"; o README diz "abre no Word".
16. **Documento de referência e carimbo.** `tests/fixtures/documento-referencia.md` usa todas as
    construções da regra 7. `documento-referencia.json` guarda as opções usadas (texto do
    cabeçalho, texto do rodapé, número de página ligado), a estrutura esperada (partes, estilos e
    a sequência de blocos com o texto de cada um) e o carimbo: o SHA-256 do `.docx`. Os dois só
    mudam junto com nova conferência no Word. A conferência fica registrada na seção 14 desta
    spec, numa linha `Conferência no Word: <data> · Word <versão> · carimbo <SHA-256>`. Carimbo
    do `.json` que não está numa linha dessas reprova. Se o Word foi mesmo aberto, a porta não
    vê.

**Prompts, catálogo e quem já usa**
17. **Best-practice `documento-oficial`**, no catálogo, com `platform: "documento"` e sem
    `constraints:` (o formato não promete limite de tamanho; os 3 níveis de recuo são limite do
    conversor, igual para todos e medido por ele, com o aviso da regra 8, e por isso não moram em
    `constraints:`). Ensina o redator a ficar no subconjunto, em nove pontos: (1) um parágrafo
    por linha; (2) numeração escrita à mão; item sem número só com hífen (`- `), nunca com `*`
    nem `+`; (3) recuo de 2 espaços por nível, até 3 níveis;
    (4) tabela simples; (5) `<!-- pagina -->` para mudar de página; (6) título do documento na
    primeira linha do corpo, com `#` (é ele que aparece no Word), e `titulo:` no frontmatter só
    quando o nome do arquivo deve ser outro, mais curto; (7) anotação interna só em comentário
    `<!-- … -->`; (8) sem HTML e sem imagem; (9) sem rótulos `=== … ===` e sem seção de notas: o
    arquivo é só o frontmatter (opcional) e o texto do documento. O `design.prompt.md` passa a
    dar `format: documento-oficial` ao passo cujo resultado é um documento para imprimir,
    protocolar ou enviar.
18. **Perguntas feitas uma vez, antes de chamar a entrega** (texto em
    `prompts/entrega.prompt.md`). A resposta vai na própria chamada: não há segunda chamada só
    para isso.
    - (a) Crew sem a chave `entrega.documentos` e lista com `.md` sem formato ou sem canal
      conhecido: o runner pergunta "Quer algum destes em Word?" e passa
      `--lembrar-documentos "<lista>"` ou `--lembrar-documentos nao`.
    - (b) Crew sem a chave `entrega.documentos_em`, na primeira entrega que vai ter documento
      (regra 11, ou "sim" na pergunta (a)): pergunta "Quer também cada documento Word solto numa
      pasta do projeto, com a data no nome (por exemplo `2026-03-03_Ata.docx`)? Em qual pasta?"
      e passa `--lembrar-documentos-em <pasta>` ou `--lembrar-documentos-em nao`.

    As duas opções gravam no `crew.yaml`, dentro do bloco `entrega:` que já existir (nunca um
    segundo bloco; sem bloco, ele é criado), com a cópia `crew.yaml.bak` (se ela já existe,
    `crew.yaml.bak-<data-hora>`, como na regra 16 da U3a) e sem mexer no resto do arquivo, e já
    valem naquela entrega. Com mais de uma opção `--lembrar-…` na chamada, a gravação é uma
    só, e o `.bak` é o arquivo de antes dela. Opção `--lembrar-…` com o valor que já está
    gravado não regrava o `crew.yaml` nem cria `.bak`. A pergunta do destino da U3a continua
    onde está (regra 16 dela).
19. **Quem já usa.** Tudo desta fase mora em `_opencrew/core/`, que o `update` renova; as pontes
    das IDEs não mudam. O `update` não altera as crews do usuário. A conversão avulsa funciona em
    qualquer projeto atualizado, e crew antiga ganha Word pela pergunta da regra 18, sem ser
    recriada.
20. **Tamanho.** `documento.mjs` é o comando; `docx/` tem os módulos do gerador (zip, markdown,
    documento, partes e os que a divisão pedir); o que a entrega ganha nesta fase mora num módulo
    próprio, `scripts/entrega/documentos.mjs`. Nenhum passa de 200 linhas. O `runner.pipeline.md`
    não ganha linha nesta fase.

## 6. Erros e casos-limite
As mensagens com `{n}` concordam em número ("1 imagem não incluída", "2 imagens não incluídas").
As linhas sem prefixo são da conversão avulsa (`documento.mjs`); "Na entrega:" é do
`entregar.mjs`; "No sistema:" é o que a IA faz. Os erros de uso têm o texto da R1 e da U3a e são
conferidos na ordem da regra 13 da R1.

| Situação | Comportamento | Mensagem |
|---|---|---|
| Pasta atual sem `_opencrew/` | código 1 | "Não encontrei `_opencrew/` nesta pasta. Rode o comando a partir da pasta do projeto." |
| Opção desconhecida · `--arquivo` faltando | código 1 | "Opção desconhecida: {opção}." · "Falta a opção obrigatória --arquivo." Depois, o uso: "node _opencrew/core/scripts/documento.mjs --arquivo <texto.md> [--destino <pasta>] [--crew crews/<nome>] [--ajuda]" |
| Arquivo ou crew fora do projeto | código 1, nada lido nem gravado | "Caminho fora do projeto: {caminho}" |
| `--crew` inexistente | código 1 | "Crew não encontrada: {caminho}" |
| `--destino` recusado pela validação da U3a (absoluto, fora do projeto, raiz, pasta reservada, atalho para fora) | código 1 | "O destino precisa ser uma pasta dentro do projeto, fora de {pastas reservadas}. Recebi: {valor}." |
| Origem em pasta reservada (regra 14), sem `--destino` | código 1 | "Não gravo dentro de {pasta}. Escolha onde gravar com --destino." |
| Nenhum arquivo da lista existe | código 1 | "Nenhum arquivo da lista foi encontrado." |
| Um arquivo da lista não existe · não tem texto · não é UTF-8 · tem outra extensão | aquele não é gerado; os outros são; `DOCUMENTO:PENDENTE` | "Não encontrei {arquivo}." · "{arquivo} não tem texto para converter." · "{arquivo} não está em UTF-8. Salve como UTF-8 e tente de novo." · "{arquivo}: só converto texto em markdown (.md ou .txt)." |
| Falha ao gravar (permissão, disco, nuvem) · erro inesperado ao converter | aquele não é gerado; não fica arquivo pela metade; os outros seguem | "Não consegui gravar {arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo." · "Não consegui converter {arquivo}: {motivo}." |
| Já existe arquivo idêntico · diferente (vale também para "Na entrega: modo plano") | nada é gravado (conta como gerado) · grava com sufixo | "{nome}.docx já existe e está igual. Nada a fazer." · "Já existia {nome}.docx, diferente. Gravei {nome}-v2.docx; o anterior ficou como estava." |
| Caminho absoluto acima de 240 caracteres · ainda acima com o nome em 20 | encurta o nome; aviso · grava com 20; aviso | "O caminho ficou longo demais para o Windows. Encurtei o nome para {nome}." · "O caminho continua longo demais para o Windows. Mova a pasta para um lugar mais curto." |
| Construção fora do subconjunto | aviso de conversão | "{n} imagens não incluídas." · "{n} linhas com HTML: as tags saíram e o texto ficou." · "{n} linhas com mais de 3 níveis de recuo ficaram no nível 3." · "{n} caracteres inválidos removidos." |
| Na entrega: item de `entrega.documentos` que não existe na execução, não é `.md` ou está na lista com formato de outro canal conhecido (o de plataforma `documento` já vira Word pela regra 11 (a): sem aviso) | aviso no LEIA-ME; a entrega segue | "{item}: não encontrei um arquivo .md sem canal com esse nome nesta execução." |
| Na entrega: item de formato de plataforma `documento` que não é `.md` nem `.txt` | copiado como está para `documentos/`; aviso no LEIA-ME | "{arquivo}: só converto .md ou .txt em Word. Copiei o arquivo como está." |
| Na entrega: falha ao converter um documento | pendência de `documentos`, que nunca vira ressalva; `ENTREGA:INCOMPLETA`; os outros canais seguem | "Não consegui converter {arquivo}: {motivo}." |
| Na entrega: falha ao gravar um documento | regra 15 da U3a, sem mudança: nada pela metade, a `entrega/` anterior fica como estava; `ENTREGA:INCOMPLETA` | "Não consegui gravar {arquivo}. Feche o arquivo, ou espere a sincronização da pasta, e rode de novo." |
| Na entrega: `entrega.documentos_em` recusado | sem a cópia do modo plano; `ENTREGA:INCOMPLETA` | "Não copiei os documentos: o destino precisa ser uma pasta dentro do projeto, fora de {pastas reservadas}. Recebi: {valor}." |
| Na entrega: `--lembrar-documentos` ou `--lembrar-documentos-em` inválido | código 1; `crew.yaml` intacto | "Valor inválido para {opção}: {valor}." · a mensagem do destino recusado |
| No sistema: `documento.mjs` não rodou (sem Node, erro, sem linha `DOCUMENTO:`) | a IA avisa, não gera o Word por outro meio e diz onde está o texto | "⚠️ A conversão para Word não rodou: {motivo}. O texto continua em {arquivo}." |

## 7. Segurança
Lê e grava só dentro do projeto: `--arquivo`, `--destino`, `--crew` e `entrega.documentos_em` são
resolvidos com o caminho real (atalho que leva para fora é recusado) e conferidos contra a raiz
antes de qualquer leitura. As pastas reservadas só valem para onde se grava: `--destino` e
`entrega.documentos_em`, pela função única de destino da U3a, e a pasta do arquivo de origem,
pela regra 14. O nome do arquivo nunca vem cru do título: sem separador de pasta, não sai da
pasta de destino. Não faz rede e não executa nada do texto. Link não vira relação: só texto, e só
com `http`, `https` ou `mailto`. Fora de `entrega/` (que a U3a refaz do zero a cada entrega,
regra 12 dela), nunca sobrescreve nem apaga arquivo que já existia; a única remoção é a do
arquivo temporário que o próprio comando criou. O `crew.yaml` só muda com as opções
`--lembrar-…`, com `.bak`. O `.docx` não leva caminho local, usuário nem data.

## 8. Cenários BDD
Cada par DADO/ENTÃO vira um teste próprio, com o ID do cenário no nome; em lista "um por vez",
cada caso é conferido.

**U3b-01 — Pacote e estrutura**
- **U3b-01a** DADO número de página desligado, sem cabeçalho nem rodapé ENTÃO o zip tem só as 6
  partes fixas, na ordem da regra 2; com os dois, 8; nunca `numbering.xml` nem `docProps/`.
- **U3b-01b** ENTÃO toda entrada tem método 0, data fixa e CRC conferido por implementação
  independente; o CRC-32 de `123456789` é `cbf43926`; o gerador não importa `node:zlib` nem
  módulo de rede.
- **U3b-01c** DADO o documento de referência e os casos-limite (uma linha só; célula vazia; tabela
  no fim; duas tabelas seguidas; quebra antes de tabela) ENTÃO valem os invariantes (a) a (g) da
  regra 5; na tabela no fim, o último bloco do corpo é um parágrafo.
- **U3b-01d** DADO o mesmo texto gerado duas vezes, e também com CRLF, com LF e com BOM ENTÃO os
  bytes do `.docx` são sempre os mesmos.
- **U3b-01e** ENTÃO a seção declara A4 (11906 × 16838) e as margens da regra 4; `styles.xml` tem
  Arial 12 e pt-BR; o estilo do texto é justificado, com entrelinha 1,15 e 6 pt depois;
  `Heading1` é centralizado; `Heading2` a `Heading4` são negrito e ficam à esquerda;
  `settings.xml` tem o modo de compatibilidade 15.
- **U3b-01f** DADO cabeçalho ENTÃO existem `header1.xml`, o tipo de conteúdo, a relação e a
  referência na seção; DADO rodapé "Interno" com número ENTÃO o rodapé tem "Interno — " e o campo
  de página; DADO nenhum dos três ENTÃO nenhuma das duas partes existe; DADO o cabeçalho
  `Exemplo & Filhos <matriz>` ENTÃO `header1.xml` é XML bem-formado e o texto lido é igual.
- **U3b-01g** (os auxiliares têm dentes) DADO um zip com CRC trocado, um XML com tag aberta e um
  XML com U+000C ENTÃO o leitor de zip e o conferidor de XML dos testes reprovam os três.
- **U3b-01h** (o conferidor de invariantes tem dentes) DADOS seis `.docx` montados no teste
  (célula de tabela sem parágrafo; `r:id` sem relação; parte sem o tipo de conteúdo próprio dela;
  estilo usado e não definido; `styles.xml` sem relação; trecho de texto sem
  `xml:space="preserve"`) ENTÃO o conferidor dos invariantes da regra 5 reprova os seis.

**U3b-02 — Conversão do texto**
- **U3b-02a** DADO `#` a `####` ENTÃO os parágrafos usam `Heading1` a `Heading4`, cada estilo com
  o seu nível de tópico e, no `styles.xml`, com o nome `heading 1` a `heading 4`; DADO `#####`
  ENTÃO parágrafo comum em negrito.
- **U3b-02b** DADO os itens `1.` e `2.`, um parágrafo e o item `3.` ENTÃO o documento traz "1.",
  "2." e "3.", nessa ordem, sem numeração automática; DADA a linha "2026. Ano de referência."
  ENTÃO o parágrafo começa por "2026."; DADAS "§ 1º …" e "§ 2º …" seguidas ENTÃO dois parágrafos.
- **U3b-02c** DADAS "a) …" e "b) …" recuadas sob um item ENTÃO dois parágrafos de nível 1; DADO
  `- item` ENTÃO o texto começa por "• "; DADO `- [ ] tarefa` ENTÃO "• [ ] tarefa"; DADAS as
  linhas `* Valores em reais` e `+ 10% de multa` ENTÃO saem iguais, com o sinal, e sem "•"; DADO
  sub-itens recuados com 2 espaços num trecho e com 4 em outro ENTÃO os dois ficam no nível 1;
  DADAS linhas com 0, 4, 2 e 4 espaços ENTÃO os níveis são 0, 1, 1 e 2; DADA uma linha iniciada
  por tabulação ENTÃO nível 1; DADO um quarto nível ENTÃO fica no 3, com aviso.
- **U3b-02d** DADO `a **b** c` ENTÃO o texto é "a b c", com "b" em negrito; DADO `*i*` ENTÃO
  itálico; DADO `nome_do_arquivo` ENTÃO nada em itálico; DADO `\*x\*` ENTÃO o texto é "*x*";
  DADOS `2 * 3 * 4`, `2*3*4` e `preço* e prazo*` ENTÃO o texto sai igual, com os asteriscos, e
  nada fica em itálico; DADO `Veja https://exemplo.org/_docs_/edital e ana_maria@exemplo.org`
  ENTÃO o texto sai igual e nada fica em itálico; DADO
  `[edital](https://exemplo.org/_docs_/edital)` ENTÃO o texto é "edital
  (https://exemplo.org/_docs_/edital)".
- **U3b-02e** DADO `[site](https://exemplo.org/?a=1&b=2)` ENTÃO o texto é "site
  (https://exemplo.org/?a=1&b=2)", sem relação externa; DADO `[x](javascript:alert(1))` ENTÃO só
  "x"; DADO `<https://exemplo.org>` ENTÃO só a URL; DADO `> citação` ENTÃO parágrafo recuado 2 cm.
- **U3b-02f** DADO `![logo](logo.png)` ENTÃO "[imagem não incluída: logo]" e um aviso; DADO
  `<div align="center">Texto</div>` ENTÃO "Texto" e um aviso; DADO `linha um<br>linha dois` ENTÃO
  "linha um linha dois"; DADOS `<revogado>`, `Cidade, <data>` e `a < b` ENTÃO ficam como estão,
  sem aviso; DADO `Data: <a definir>` ENTÃO fica como está, sem aviso; DADO `<!-- nota -->`,
  numa linha ou em três ENTÃO some, sem aviso; DADO `<!--` sem `-->` ENTÃO fica como texto.
- **U3b-02g** DADA a linha `<!-- pagina -->` ENTÃO o bloco seguinte começa em página nova (antes
  de tabela, num parágrafo próprio); DADA a linha `<!-- Página -->` ENTÃO também quebra; no
  início, no fim e repetida, não gera página a mais; DADA uma linha `---` ENTÃO não há quebra,
  linha nem título; DADO frontmatter ENTÃO o texto dele não aparece no documento.
- **U3b-02h** DADA uma tabela com uma linha mais curta ENTÃO primeira linha em negrito, bordas,
  colunas iguais, texto das células à esquerda e a linha completada; DADAS duas tabelas seguidas
  ENTÃO há um parágrafo entre elas; DADA uma tabela seguida de texto ENTÃO não há parágrafo vazio
  entre os dois; DADAS linhas com barras, sem linha separadora ENTÃO ficam como texto.
- **U3b-02i** DADO `&`, `<`, aspas, acentos e emoji ENTÃO aparecem iguais; DADO U+000B e U+000C
  ENTÃO somem e o aviso conta 2; DADA uma tabulação no meio da linha ENTÃO vira tabulação.
- **U3b-02j** DADO um bloco entre cercas com `**x**`, `# y`, uma linha vazia e `<!-- pagina -->`
  ENTÃO os três saem como texto, em Courier New, à esquerda, e a linha vazia é um parágrafo;
  DADO código entre crases ENTÃO Courier New; DADO `[^1]`, `&nbsp;` e uma linha `===` ENTÃO saem
  como texto.
- **U3b-02k** DADO um texto que começa por `---`, um título `#`, um parágrafo e outra linha `---`
  ENTÃO o título e o parágrafo estão no documento; DADO um frontmatter com `titulo:` e uma linha
  de continuação recuada ENTÃO nada dele aparece no documento; DADO um frontmatter com `titulo:`,
  `meta_description:` e `data-da-reuniao:` ENTÃO nada dele aparece no documento.

**U3b-03 — Nome e gravação** (rodam no Windows e no Ubuntu)
- **U3b-03a** DADO `titulo:` ENTÃO o nome vem dele; DADO `título:`, com acento ENTÃO também; sem
  ele, de `title:`; sem os dois, do primeiro `# `; sem título nenhum, do nome do arquivo de
  origem; DADO `# **ATA** da reunião` ENTÃO `ATA da reunião.docx`; DADO um texto só com
  `## Seção` ENTÃO o nome vem do arquivo de origem.
- **U3b-03b** DADO `titulo: "Ata 03/2026: assembleia geral?"` ENTÃO a listagem da pasta tem um
  único arquivo, `Ata 03-2026- assembleia geral.docx`, com mais de 0 byte.
- **U3b-03c** DADO `titulo: "../../fora"` ENTÃO o arquivo é `fora.docx`, na pasta de destino, e
  nada é criado fora dela.
- **U3b-03d** DADO um título de 150 letras ENTÃO o nome tem 80; DADO um título longo em que o 80º
  caractere é um espaço ENTÃO o nome não termina em espaço; DADO um título de 100 emojis ENTÃO o
  nome tem 80, sem caractere partido; DADO `CON` ENTÃO `_CON.docx`; DADO `con` ENTÃO `_con.docx`;
  DADO `???` ENTÃO `documento.docx`; DADO "Relatório final." ENTÃO `Relatório final.docx`.
- **U3b-03e** DADOS dois documentos de título "Parecer" e "parecer" na mesma chamada ENTÃO
  existem `Parecer.docx` e `parecer-2.docx`.
- **U3b-03f** DADO um `Ata.docx` diferente já na pasta ENTÃO é gravado `Ata-v2.docx` e o anterior
  fica igual, byte a byte; DADO um `Ata.docx` idêntico ENTÃO nada é gravado e o relatório diz
  "já existe e está igual".
- **U3b-03g** DADA uma pasta em que o caminho absoluto passa de 240 caracteres ENTÃO o nome é
  encurtado até caber, com aviso, e nunca fica com menos de 20 caracteres; DADA uma pasta em que
  nem com 20 cabe ENTÃO o arquivo é gravado com 20 e o aviso diz que o caminho continua longo.

**U3b-04 — Conversão avulsa**
- **U3b-04a** DADO `--arquivo textos/ata.md` ENTÃO existe `textos/<nome>.docx`, com `footer1.xml`
  só com o número de página e sem `header1.xml`, a última linha é `DOCUMENTO:OK` e o código é 0;
  DADO `--arquivo textos/notas.txt` ENTÃO existe o `.docx`; DADO `--destino` com pasta que não
  existe ENTÃO ela é criada; DADO `--ajuda` ENTÃO o uso, código 0 e nada gravado.
- **U3b-04b** ENTÃO o relatório está em PT-BR, traz o título inteiro e as três dicas da regra 14,
  com o texto dela, e não tem a palavra "aprovado"; DADO um texto com uma imagem e uma tag HTML
  ENTÃO o relatório traz os dois avisos, a última linha é `DOCUMENTO:OK` e o código é 0.
- **U3b-04c** DADO um texto com `[PREENCHER: data]` e `[Nome]` ENTÃO o `.docx` é gerado, os dois
  aparecem em "Conferência do texto (informativa)", que não tem linha "Não medido", e a última
  linha é `DOCUMENTO:OK`.
- **U3b-04d** DADO `--crew` de uma crew com a proibição "barato", cabeçalho e rodapé ENTÃO o
  relatório aponta o termo e o `.docx` tem os dois; DADA a mesma crew com `numero_pagina: nao` e
  sem rodapé ENTÃO não existe `footer1.xml`; sem `--crew` ENTÃO o relatório diz que não conferiu
  proibições.
- **U3b-04e** DADO `titulo:` de 90 caracteres ENTÃO o relatório não tem item de título de blog.
- **U3b-04f** DADOS um arquivo bom e, um por vez, um inexistente, um só com frontmatter, um em
  Latin-1 e um `.pdf` ENTÃO o bom é gerado, o outro recebe a sua mensagem da seção 6, o código é
  0 e a última linha é `DOCUMENTO:PENDENTE`.
- **U3b-04g** DADO, um por vez: pasta sem `_opencrew/`; `--destno x`; sem `--arquivo`; `--arquivo
  ../fora.md`; `--crew ../x`; `--crew crews/nao-existe`; `--destino ../x`; `--destino
  _opencrew/x`; origem em `_opencrew/_memory/` sem `--destino`; só arquivos inexistentes ENTÃO
  código 1, a mensagem da linha correspondente da seção 6, nenhuma linha `DOCUMENTO:` e nada
  gravado.
- **U3b-04h** DADA uma falha ao gravar, ou um erro inesperado ao converter um de dois arquivos
  (injetados no teste) ENTÃO a mensagem cita o arquivo, não fica arquivo pela metade, o outro
  arquivo é gerado e a última linha é `DOCUMENTO:PENDENTE`.
- **U3b-04i** DADA uma origem em `crews/x/output/` sem `--destino` ENTÃO o `.docx` fica ao lado
  dela.
- **U3b-04j** DADO cada cenário de `tests/documento.test.js` ENTÃO, fora da pasta de gravação, a
  árvore do projeto é igual antes e depois.

**U3b-05 — Na execução**
- **U3b-05a** DADO um `.md` com uma imagem, verificado com `=documento-oficial` ENTÃO o relatório
  do verificador traz a nota "1 imagem não incluída" e o status não muda; o relatório diz "⚪
  Nada a apontar nas checagens gerais (documento: não há limite de tamanho a medir)", não tem
  linha "Não medido" e o resumo conta 0 não medidos.
- **U3b-05b** DADO um item `=documento-oficial`, `entrega.cabecalho` e `entrega.rodape` ENTÃO a
  entrega tem `documentos/<nome>.docx` com cabeçalho e rodapé, o `.md` não está em `outros/`, o
  resumo lista o canal `documentos`, e o LEIA-ME traz a seção `## Documentos`, com a situação,
  a frase "Não edite o Word dentro da `entrega/` da execução", o título inteiro, a origem e as
  três dicas da regra 14, com o texto dela, e em "O que não foi conferido", a linha do Word;
  DADOS o mesmo item, um roteiro `=youtube-script` e um `.md` sem formato ENTÃO os títulos do
  LEIA-ME vêm nesta ordem: `## YouTube`, `## Documentos`, `## Outros arquivos`.
- **U3b-05c** DADO um item sem formato em `…/<run_id>/v2/parecer.md`, com
  `entrega.documentos: "parecer.md"` e `titulo:` de 90 caracteres ENTÃO ele vira `.docx`, não há
  pendência de título e os outros `.md` sem formato ficam em `outros/`; DADO o mesmo item com
  `=technical-writing` (formato sem `platform:`) ou com `=formato-que-nao-existe` ENTÃO ele
  também vira `.docx`; DADO um item com um formato do usuário de `platform: "documento"` ENTÃO
  ele vira `.docx`; DADO o item `…/<run_id>/docs/v2/parecer.md` ENTÃO ele casa com
  `entrega.documentos: "docs/parecer.md"` e com `"Docs/Parecer.md"`, e não casa com
  `"parecer.md"` (que gera o aviso da seção 6); DADO um item sem formato com a seção
  `## Divulgação no LinkedIn`, de 3.500 caracteres, listado em `entrega.documentos` ENTÃO ele
  vira `.docx` com a seção dentro, não existe `linkedin/`, o relatório não tem item de LinkedIn
  e o LEIA-ME não traz o aviso da seção 6; DADO o mesmo texto como `=documento-oficial` ENTÃO o
  mesmo resultado.
- **U3b-05d** DADO um documento com HTML ENTÃO o aviso aparece no LEIA-ME e o final da entrega é o
  mesmo que seria sem o aviso.
- **U3b-05e** DADO um documento com `[PREENCHER: data]`, um destino e `documentos_em` ENTÃO
  `documentos` não está pronto, o LEIA-ME não cita arquivo de `documentos/`, nada dele vai para
  o destino nem para `documentos_em` e a última linha é `ENTREGA:INCOMPLETA`; com
  `--aceitar-pendencias` ENTÃO vai para os dois, com
  `ENTREGA:COM_RESSALVA`.
- **U3b-05f** DADO `documentos_em: Documentos/Atas` e o `run_id` `2026-03-03-143022` ENTÃO existe
  `Documentos/Atas/2026-03-03_<nome>.docx`, e o resumo cita esse caminho; DADA a mesma entrega
  repetida, com destino ENTÃO nenhum arquivo novo e nenhuma pasta `-reentrega-`; DADO o texto
  alterado e nova entrega ENTÃO `…-v2.docx`, com o primeiro intacto, e o resumo diz que gravou
  o `-v2`; DADA uma entrega sem `--run` ENTÃO o nome não tem data;
  DADO `--run semana-12` ENTÃO existe `Documentos/Atas/<nome>.docx`, sem data.
- **U3b-05g** DADO `documentos_em: ../fora` ENTÃO nada é gravado fora, `entrega/documentos/` está
  completa e a última linha é `ENTREGA:INCOMPLETA`.
- **U3b-05h** DADO `entrega.documentos` com um item inexistente e um `.html` ENTÃO dois avisos no
  LEIA-ME e a entrega segue; DADO um item de `entrega.documentos` que está na lista como
  `=blog-post` ENTÃO ele fica em `blog/` e o LEIA-ME traz o mesmo aviso; DADO um item de
  `entrega.documentos` que está na lista como `=documento-oficial` ENTÃO ele vira `.docx` e o
  LEIA-ME não traz o aviso; DADO um `.pdf` listado
  como `=documento-oficial` ENTÃO ele está em `documentos/`, com o nome original, e o LEIA-ME
  traz o aviso da seção 6 ("só converto .md ou .txt em Word"); DADO um `notas.txt` listado como
  `=documento-oficial` ENTÃO existe `documentos/<nome>.docx`, o `.txt` não está na entrega e
  não há aviso.
- **U3b-05i** DADO `--lembrar-documentos "parecer.md"` ENTÃO o `crew.yaml` tem
  `entrega.documentos`, `crew.yaml.bak` é o arquivo anterior, as outras linhas não mudam e o
  `.docx` já sai nesta entrega; DADO `nao` ENTÃO fica `documentos: nao`; DADO
  `--lembrar-documentos não` ENTÃO também fica `documentos: nao`; DADOS
  `--lembrar-documentos "crews/x/output/<run_id>/v2/parecer.md"` e `"docs\parecer.md"` ENTÃO
  ficam gravados `parecer.md` e `docs/parecer.md`; DADOS `--lembrar-documentos "../a.md"` e
  `--lembrar-documentos-em ../fora` ENTÃO código 1 e `crew.yaml` intacto; DADO `--ajuda` ENTÃO o
  uso cita as duas opções.
- **U3b-05j** DADO um erro ao converter um documento (injetado) ENTÃO `documentos` não está
  pronto, a mensagem cita o arquivo, os outros canais são entregues e a última linha é
  `ENTREGA:INCOMPLETA`; com `--aceitar-pendencias` ENTÃO continua `ENTREGA:INCOMPLETA`; DADA
  uma falha ao gravar um documento (injetada), numa execução que já tinha `entrega/` ENTÃO a
  `entrega/` anterior continua igual, byte a byte, não sobra pasta `.tmp`, a mensagem cita o
  arquivo e a última linha é `ENTREGA:INCOMPLETA`.
- **U3b-05k** DADO um `crew.yaml` que já tem `entrega:` com `destino:` e a opção
  `--lembrar-documentos-em Documentos/Atas` ENTÃO `documentos_em` entra no mesmo bloco `entrega:`
  (continua um bloco só), `destino:` e as outras linhas não mudam, `crew.yaml.bak` é o arquivo
  anterior e a cópia do modo plano já sai nesta entrega; DADO `--lembrar-documentos-em nao`
  ENTÃO fica `documentos_em: nao` e não há cópia; DADAS as duas opções `--lembrar-…` na mesma
  chamada ENTÃO há uma gravação só, com as duas chaves, e o `.bak` é o arquivo de antes dela;
  DADO `documentos_em: não` no `crew.yaml` ENTÃO não há cópia e nenhuma pasta com esse nome é
  criada; DADO um `crew.yaml.bak` que já existia ENTÃO ele continua igual, byte a byte, e a
  cópia nova é `crew.yaml.bak-<data-hora>`; DADA a mesma chamada repetida, com as mesmas opções
  `--lembrar-…` ENTÃO o `crew.yaml` fica igual, byte a byte, e nenhum `.bak` novo nasce.
- **U3b-05l** DADA uma entrega já copiada para o destino, com o `.md` em `outros/`, e nova
  chamada com `--lembrar-documentos` ENTÃO existe `<run_id>-reentrega-2/documentos/<nome>.docx`;
  em `<run_id>/`, só o LEIA-ME muda (ganha o aviso da pasta nova) e os outros arquivos ficam
  iguais, byte a byte; o resumo aponta a pasta nova.
- **U3b-05m** DADO o item da U3b-05b ENTÃO o `.docx` é igual, byte a byte, ao da conversão avulsa
  do mesmo arquivo com `--crew`; DADOS, um por vez, `entrega.numero_pagina: nao` e
  `entrega.numero_pagina: não`, sem rodapé ENTÃO o `.docx` não tem `footer1.xml`; DADO um
  documento com a linha `=== NOTES ===`, texto abaixo dela e um comentário ENTÃO a linha e o
  texto estão no `.docx`, e o comentário não.

**U3b-06 — Contratos de prompt**
- **U3b-06a** `documento-oficial.md` existe, está no `_catalog.yaml`, tem `platform: "documento"`
  e ensina os nove pontos da regra 17; não tem linha `=== … ===`; o exemplo do próprio guia tem o
  título no corpo, com `#`, e, convertido, não gera aviso e só tem texto do documento.
- **U3b-06b** `design.prompt.md` dá `format: documento-oficial` ao passo de documento.
- **U3b-06c** `entrega.prompt.md` traz as duas perguntas da regra 18, com o texto de cada uma,
  feitas uma vez e antes da chamada da entrega, com a resposta passada ao script na mesma chamada
  (`--lembrar-documentos`, `--lembrar-documentos-em`), inclusive o "não", e não manda editar o
  `crew.yaml` à mão.
- **U3b-06d** `templates/AGENTS.md` tem a rota `/opencrew documento`, a opção no menu "More
  options" e cita `_opencrew/core/scripts/documento.mjs`; traz as instruções da regra 14:
  perguntar o arquivo quando falta, `--crew`, `--destino`, perguntar a pasta e passar
  `--destino` quando o arquivo está em `crews/<crew>/output/`, `DOCUMENTO:PENDENTE` e o script
  que não rodou (o aviso da seção 6, sem gerar o `.docx` por outro meio).

**U3b-07 — Travas, pacote e upgrade**
- **U3b-ref** DADO `tests/fixtures/documento-referencia.md` e as opções do
  `documento-referencia.json` ENTÃO a estrutura gerada é igual à do `.json`, o SHA-256 é igual ao
  carimbo e o carimbo está numa linha "Conferência no Word" da seção 14 desta spec; a mensagem de
  falha manda refazer a conferência da seção 9.
- **U3b-07a** o tarball tem `documento.mjs`, os módulos de `docx/`, `entrega/documentos.mjs` e
  `documento-oficial.md`.
- **U3b-07b** o AGENTS.md cita abrir o `.docx` no Word em "Não cobre" (regra 7) e a conversão
  avulsa na regra 15; o README descreve o documento Word e a conversão avulsa, não promete
  LibreOffice nem Google Docs e diz "23 guias de melhores práticas", o mesmo número de arquivos
  `.md` de `templates/_opencrew/core/best-practices/`.
- **U3b-07c** nenhum arquivo de `scripts/docx/`, nem `documento.mjs`, nem
  `scripts/entrega/documentos.mjs` passa de 200 linhas; o `runner.pipeline.md` não tem mais
  linhas do que tinha na 1.8.0.
- **U3b-upg** DADO um workspace 1.8.0 (sem `documento.mjs`, sem `docx/`, sem
  `documento-oficial.md` e sem a entrada dele no catálogo) com uma crew antiga e um `.md` dela
  QUANDO roda o `update` e depois a conversão avulsa nesse `.md`, com `--destino` ENTÃO o `.docx`
  é gerado, o catálogo tem a entrada e nenhum arquivo da crew mudou.
- **U3b-upg-b** DADO o mesmo workspace 1.8.0, com uma crew antiga (passo sem `format:`, saída
  `.md` numa execução antiga) QUANDO roda o `update` e, depois, `entregar.mjs` com a lista e
  `--lembrar-documentos "<arquivo>.md"` ENTÃO existe `entrega/documentos/<nome>.docx` e, em
  `crews/<crew>/` fora de `output/`, só mudou o `crew.yaml`, e nasceu o `crew.yaml.bak`.

## 9. O que o humano confere na tela
- [ ] Gerar o documento de referência como a porta o gera: copiar
      `tests/fixtures/documento-referencia.md` para o `sandbox/`; criar ali uma crew de teste com
      `entrega.cabecalho` e `entrega.rodape` iguais aos do `documento-referencia.json`; rodar a
      conversão avulsa com `--crew` dessa crew; conferir que o SHA-256 do arquivo gerado é o
      carimbo (no PowerShell: `Get-FileHash <arquivo>.docx`). Só então abrir no Word: abre sem
      aviso de reparo e sem "Modo de Compatibilidade"; A4 e margens certas; letra Arial 12, texto
      justificado, título 1 no centro e títulos 2 a 4 à esquerda; títulos no painel de
      navegação; "1.", "3.", "a)" e "§ 1º" iguais ao texto; tabela com bordas, com o texto das
      células à esquerda, com célula vazia e separada da tabela seguinte; quebra de página;
      cabeçalho, rodapé e número de página; "texto (url)"; "Arquivo → Salvar como → PDF" gera o
      PDF; num documento em branco, "Inserir → Objeto → Texto do arquivo" traz o texto do
      `.docx`.
- [ ] Copiar um `.md` de verdade do Projeto B para o `sandbox/` (fora do git) e converter ali,
      pela conversão avulsa. Ler o Word ao lado do `.md`: nenhuma palavra e nenhum número mudou.
      Comparar com o Word que o script antigo gerou para o mesmo texto e anotar as diferenças na
      seção 14. Se a pasta do Projeto B fica no Google Drive, copiar o `.docx` gerado para lá,
      olhar a prévia do Drive e anotar o que viu (não entra na promessa).
- [ ] Um título com dois-pontos e barra: o arquivo aparece no Explorer com o nome esperado e abre.
- [ ] No `sandbox/`, rodar uma crew com um passo de documento até a entrega:
      `entrega/documentos/`, a seção `## Documentos` no LEIA-ME e, com o modo plano, o arquivo
      com data na pasta escolhida.
- [ ] Registrar na seção 14 a linha da regra 16: data, versão do Word e carimbo.

## 10. Critérios de aceite
- [ ] Antes do BDD: o dono abriu um documento oficial e o script antigo do Projeto B; o que
      faltou está na seção 11, com destino (F-20).
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código.
- [ ] `npm run verify` verde no Windows e no Ubuntu; os testes da R1 e da U3a continuam passando
      (os da U3a conferem cada formato pelo nome: a pasta `documentos/` não muda o U3a-02a).
- [ ] Conferência da seção 9 feita e registrada na seção 14 **antes da tag**.
- [ ] No mesmo commit (regra 9): AGENTS.md (regra 7; e a regra 15 passa a citar a conversão
      avulsa: pasta do arquivo de origem ou `--destino`), README (inclusive "23 guias de melhores
      práticas", no lugar de 22), GLOSSARIO.md, CHANGELOG 1.9.0, a entrada de correção na spec
      U3a (oitava pasta de canal; seção `## Documentos` no LEIA-ME e o item dela no quadro
      "Passos por canal"; as regras 4 a 6 dela não valem para documento; regra 17: item listado
      em `entrega.documentos` é verificado como `documento-oficial`; seção 3: a linha de uso
      ganha `[--lembrar-documentos <lista|nao>] [--lembrar-documentos-em <pasta|nao>]`; seção 7:
      o `crew.yaml` muda também com essas duas opções; as áreas novas do
      U3a-14b, ver seção 13), a entrada de correção na spec R1 (regra 3, item (c), e regra 6:
      em formato de plataforma `documento`, cabeçalho é conteúdo e não sai a linha "Não medido";
      a função do verificador aceita chamada sem crew) e IDEIAS.md (sai "Documentos oficiais em
      DOCX/PDF"; entram os itens da seção 11 que não têm entrada, sejam sem fase, da U4 ou da
      U5; o item "Modo equipe" passa a dizer que a conversão avulsa e a rota
      `/opencrew documento` já existem — Z-06).
- [ ] `npm version minor`; release (commit + tag) só com confirmação; atualizar A e B só com
      autorização.

**A porta não cobre:** abrir o `.docx` no Word (seção 9), nem se ele foi mesmo aberto antes de
trocar o carimbo; LibreOffice e Google Docs; rodar em Node 20.0 a 20.14 (o CI usa a versão 20
mais recente); a IA seguindo o best-practice, as perguntas da regra 18 e a rota da regra 14 numa
execução real (→ U0).

## 11. Fora de escopo → destino
| O que não entra | Alocação |
|---|---|
| Papel timbrado e modelo `.dotx` do usuário | → sem fase — só com pedido real; exige ler e regravar o modelo do usuário |
| Imagem embutida, hyperlink real, sumário automático, nota de rodapé | → sem fase — cada um abre partes e relações novas no perfil fechado |
| Alinhamento por parágrafo (à direita, no centro) | → sem fase — só com pedido real; depende do que o dono anotar no Projeto B |
| Documento em outro idioma | → U5 — limite declarado: só PT-BR |
| PDF direto, sem o Word | → sem fase — precisa de motor de renderização; o Word salva como PDF |
| PDF só de imagens para o carrossel do LinkedIn (G-19) | → sem fase — escopo novo; entra no IDEIAS.md |
| Artigo de blog em HTML pronto para colar | → sem fase — já está assim na U3a (seção 11); só com pedido real |
| O que foi alterado no Word voltar para a crew (E-21) | → sem fase — limite declarado na seção 12 e no LEIA-ME |
| Tarefa avulsa no histórico (`runs.md`) e na memória (Z-06) | → U4 — modo equipe e histórico confiável |
| Ativar o OpenCrew por pedido de documento em texto, em conversa nova | → U4 — é a entrada do modo equipe; muda a frase de ativação das 9 pontes (`src/lib/ides.js`) e a convivência (U6) |
| O `.md` aprovado ao lado do `.docx`, com a dica "para a crew continuar desta versão, aponte `fontes:` para este arquivo" (parte de Z-08, enviada pela U3a) | → U4 — é o ciclo de rodadas do modo equipe; até lá o LEIA-ME aponta o arquivo de origem |
| Dar `format: documento-oficial` aos passos de crews antigas | → U4 — conserto de crews antigas |
| LibreOffice e Google Docs na promessa | → sem fase — não há como conferir aqui |
| Data no nome do arquivo na conversão avulsa | → sem fase — o título pode trazer a data; o modo plano cobre a execução |
| Subir o Node mínimo do pacote e conferir a versão nos scripts (C-18 da auditoria geral de 2026-10-02; Z-13, a parte do Node mínimo) | → U5 — esta fase só usa APIs do Node 20.0 |
| Export, PDF no README e no discovery, imagens e destino por execução (D-06, D-12, D-16, parte do D-13) | → U3a — já estão na spec dela |

## 12. Limites conhecidos
- É um conversor simples: sem imagem, sem link clicável, sem sumário, sem estilos de marca e sem
  alinhamento por parágrafo (o texto sai sempre justificado: data à direita e assinatura no
  centro não saem). Linha longa de item recuado volta para a margem do recuo; o alinhamento de
  coluna é ignorado.
- O documento é marcado como pt-BR, e os textos que o conversor insere ("[imagem não incluída:
  …]") saem em português, mesmo em documento de outro idioma.
- Lista e numeração vão como texto: ao editar no Word, a numeração não continua sozinha (D-03).
  Só `- ` vira `•`: lista escrita com `* ` ou `+ ` sai com o sinal, como texto.
- O que você mudar no Word não volta para a crew: peça a alteração no chat e gere de novo (E-21).
- "Um parágrafo por linha" depende de o redator seguir o best-practice: parágrafo partido em
  várias linhas vira vários parágrafos. Em crew antiga, o passo não lê esse guia; os avisos de
  conversão só aparecem na entrega, no LEIA-ME; e, na revisão, um `titulo:` longo no frontmatter
  ainda é medido como blog, e uma seção com palavra de canal, como peça desse canal (regra da R1
  para arquivo sem formato: a revisão não lê `entrega.documentos`).
- Por `entrega.documentos` só `.md` vira Word. O `.txt` vira com formato de documento no passo
  ou pela conversão avulsa.
- Título que está só no frontmatter não aparece no documento: o guia manda escrevê-lo no corpo.
- Texto que começa por `---`, seguido só de linhas `palavra: valor` até outra `---`, é lido como
  frontmatter e não aparece no documento.
- Letra solta entre sinais (`<A>`, `<b>`, `<i>`) é lida como tag e sai, com aviso.
- Fora de uma conversa iniciada por `/opencrew`, o pedido em texto ("gera o Word de…") não chega
  ao OpenCrew: a ponte só ativa com `/opencrew` ou com pedido sobre crews (U2, U6). O caminho
  garantido é `/opencrew documento <arquivo>`.
- Na conversão avulsa, `entrega.destino` e `entrega.documentos_em` não valem: o Word fica ao lado
  do texto ou em `--destino`. Sem `--crew`, o número de página fica sempre ligado.
- Word gerado à mão dentro da pasta de uma execução entra na entrega seguinte como arquivo
  copiado. Por isso a rota pergunta a pasta (regra 14); o comando, chamado direto, não pergunta.
- O Word dentro de `entrega/documentos/` é refeito a cada entrega: o que for editado ali se perde
  (regra 12 da U3a). O LEIA-ME avisa.
- No destino vai só o `.docx`: o `.md` aprovado fica na pasta da execução, e o LEIA-ME aponta
  para ele (Z-08, seção 11).
- Chamar a entrega de novo com `--lembrar-documentos` depois de uma cópia já feita gera
  `<run_id>-reentrega-2`: o `.md` sai de `outros/`, e arquivo copiado que sai da entrega é cópia
  diferente (regra 14 da U3a). Por isso as perguntas vêm antes da chamada.
- O limite de 240 caracteres é medido em `entrega/documentos/`: a cópia no destino pode ficar com
  caminho mais longo.
- Nome de arquivo com vírgula não cabe em `entrega.documentos`.
- A pasta se chama `documentos/` e a plataforma, `documento`: é a única pasta de canal com nome
  diferente da plataforma.
- O protótipo que abriu no Word 16 tinha 9 partes, com numeração automática (D-15). O perfil
  desta spec tem 6 mais 2 e só fica provado com a primeira conferência da seção 9.
- O carimbo prova que o gerador não mudou desde a última conferência; se o Word foi mesmo aberto,
  a porta não vê.
- "Só APIs do Node 20.0" é regra de escrita do código: a porta só prova que `node:zlib` não é
  importado.
- O Projeto B não foi lido na revisão: o que o script antigo fazia não está mapeado (F-20). É o
  primeiro critério de aceite (seção 10).
- `design.prompt.md` (701 linhas, alvo 400) ganha cerca de 5 linhas; a divisão fica na U5.
- As regras 17 e 18 e a rota da regra 14 são seguidas pela IA; os testes garantem o texto dos
  prompts (→ U0). A conversão avulsa não grava em `runs.md` nem na memória da crew (→ U4).

## 13. Travas que esta spec deixa
`tests/docx.test.js` (U3b-01, U3b-07c) · `tests/docx-texto.test.js` (U3b-02) ·
`tests/docx-nome.test.js` (U3b-03) · `tests/documento.test.js` (U3b-04) ·
`tests/verificar.test.js` (U3b-05a) · `tests/entregar-documentos.test.js` (U3b-05b a U3b-05m; o
U3a-14b passa a valer também para este arquivo, com duas áreas a mais: a pasta de
`entrega.documentos_em` e o `crew.yaml` + `.bak` com `--lembrar-documentos` e
`--lembrar-documentos-em`) · `tests/documento-contratos.test.js` (U3b-06) ·
`tests/docx-referencia.test.js` com `tests/fixtures/documento-referencia.md` e `.json` (U3b-ref) ·
`tests/package.test.js` (U3b-07a) · `tests/documento-docs.test.js` (U3b-07b) ·
`tests/upgrade.test.js` (U3b-upg e U3b-upg-b, 1.8.0 → 1.9.0) · `tests/_helpers.js`: leitor de zip
mínimo, conferidor de XML bem-formado e conferidor dos invariantes da regra 5, sem dependência
nova (U3b-01g, U3b-01h) · `tests/template-refs.test.js` já cobre os caminhos novos citados nos
prompts · alerta de tamanho: `scripts/check-size.js` já alcança `scripts/docx/` e
`scripts/entrega/`; os contratos e os testes de documentação desta fase ficam em arquivos
próprios porque `tests/docs.test.js` (328 linhas) já passa do alvo de 300, e a R1 e a U3a
também puseram os contratos delas em arquivos próprios (`runtime-contracts-r1.test.js`,
`runtime-contracts-u3a.test.js`); arquivo de teste que passar de 300 linhas é dividido por grupo
de cenários.

## 14. Correções
(preenchida durante a implementação)
