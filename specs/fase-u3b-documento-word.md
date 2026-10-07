# Spec — Fase U3b: Documento Word, com perfil de documento oficial (1.10.0)

- **Fase:** U3b · **Módulos:** Runtime (`templates/_opencrew/core/`: `scripts/documento.mjs`, `scripts/documento/`, `scripts/entrega/documentos.mjs` e os pontos de `scripts/entrega/` que ganham a pasta nova, `modelos/documento-oficial.md`, `best-practices/documento-oficial.md`, `_catalog.yaml`, `prompts/documento.prompt.md`, `prompts/design.prompt.md`; `templates/AGENTS.md`) + `AGENTS.md` + README + testes. O CLI (`src/`) não muda · **Status:** implementada (1.10.0, 2026-10-07)
- **Termos novos no GLOSSARIO.md:** sim — Documento Word, Perfil de documento oficial, Timbre, Marcação de documento, Aviso de conversão
- **Modelo sugerido:** execução Sonnet 5.5 · alto (o Word não tolera improviso no XML)
- **Origem:** reescrita da spec de 2026-10-04 (786 linhas, 59 cenários; está no histórico do git), depois de o dono abrir uma ata oficial real e o script antigo do projeto dele (critério F-20 da spec anterior, cumprido em 2026-10-07). O que a ata tem — timbre, assinaturas, título centralizado, quebra de página — é o que a spec anterior mandava para "sem fase". `IDEIAS.md`: "Documentos oficiais em DOCX/PDF" e "Papel timbrado".
- **Depende de:** U3a fatia 1 (1.8.0, `specs/fase-u3a1-pasta-de-entrega.md`). Da 1.9.0 (`specs/fase-u3a2-entrega-no-projeto.md`) não usa nada: a cópia para o projeto leva `documentos/` junto, como qualquer pasta da entrega. Se a 1.9.0 mudar `entregar.mjs`, o grupo U3b-05 é relido contra o código dela antes do BDD.

**Decisões que o dono confirma ao aprovar** (a opção recomendada já está aplicada no texto):
1. **(aceita em 2026-10-07) Perfil de documento oficial, um por projeto**, num arquivo de texto do
   projeto: logotipo PNG, três linhas do cabeçalho, rodapé com "Página X de Y", margens e letra.
   Tamanhos e cores são os da ata real, fixos no gerador (§4).
2. **(aceita) Três marcações a mais no markdown:** título e subtítulo centralizados, quebra de
   página e bloco de assinaturas (regra 8).
3. **(aceita) Gerador próprio, sem dependência; não lê nem regrava `.dotx`.**
4. **O perfil mora em `_opencrew/_memory/documento-oficial.md`**, que o `update` não toca. Nasce
   de um modelo do pacote, por `--criar-perfil`, e nunca é sobrescrito.
5. **Título é marcação própria (`::: titulo`), não o primeiro `#`:** o `#` continua sendo sempre
   Título 1 (as seções "I.", "II."), e o anexo pode ter o seu título centralizado.
6. **Lista com marcador é lista do Word; número escrito pelo autor vai como texto.** "1.", "6.1.",
   "a)" e "§ 1º" nunca são renumerados: é o texto oficial.
7. **Um arquivo por chamada; o Word tem o nome do `.md`.** Se já existe um Word diferente com
   esse nome, nada é gravado sem `--substituir` (regra 3 do AGENTS.md).
8. **Zip sem compressão:** alguns KB a mais, e o mesmo arquivo, byte a byte, em qualquer máquina.
   Não adotado: `deflateRawSync`, cujo resultado muda com a versão da zlib.
9. **Entrega: integração mínima.** Item `=documento-oficial` vira `entrega/documentos/<nome>.docx`
   (grupo U3b-05, o único que toca código da 1.8.0; pode sair para a 1.10.1 sem mexer no resto).
10. **Fonte e tamanho do corpo: Arial 11.** A conferência da ata não registrou os dois valores;
    são chaves do perfil, ajustadas na comparação lado a lado.

## 1. Objetivo
Hoje, para ter uma ata em papel timbrado, o dono mantém um script Python de 641 linhas com o texto
da ata escrito dentro do código: cada documento novo exige mexer no script. Depois desta fase ele
escreve (ou a crew escreve) o texto em markdown e um comando gera o Word: cabeçalho com logotipo,
rodapé com "Página X de Y", margens e letra do perfil do projeto, títulos, tabelas e assinaturas —
com **as mesmas palavras e os mesmos números, na mesma ordem**. Funciona avulso, para qualquer
`.md` do projeto, e dentro da entrega de uma execução. O PDF continua saindo pelo Word.

## 2. O que esta fase herda
| Origem | Item | Exige daqui |
|---|---|---|
| Ata real e script antigo (2026-10-07) | Timbre, rodapé, margens, estilos, tabelas, assinaturas, anexo em página nova | §4, regras 5 a 9; U3b-08, 09, 10a |
| Spec anterior, D-01, D-17 | "Abre no Word sem aviso de reparo" não é verificável pela porta | regras 2 a 4, U3b-01; §9 |
| D-07 | `zlib.crc32` não existe em todo Node 20 | CRC-32 próprio (regra 1, U3b-01b) |
| D-03, D-10, D-11 | Numeração automática muda o texto oficial; caractere de controle; palavras coladas | decisão 6, regra 4; U3b-02b, 02i |
| 1.8.0 | `entregar.mjs` manda arquivo sem canal para `outros/`, como `.md` | regra 12, U3b-05 |
| AGENTS.md, regras 2, 3, 14 e 15 | Payload sem dado do mantenedor; não sobrescrever; chegar com um `update`; script só escreve onde foi combinado | regras 10 a 14 |
| Motor (decisão de 2026-10-04) | Descartados: biblioteca npm (não há `node_modules` no projeto do usuário); RTF e HTML salvo como `.doc`; Word, LibreOffice ou pandoc instalados | regra 1 |
| Fora daqui | Ver §8 | — |

## 3. Entradas
```
node _opencrew/core/scripts/documento.mjs "<arquivo.md>" [--saida <arquivo.docx|pasta>]
     [--perfil <arquivo>] [--sem-perfil] [--substituir] [--ajuda]
node _opencrew/core/scripts/documento.mjs --criar-perfil
```
| Entrada | Obrigatória | Validação |
|---|---|---|
| pasta atual do comando (raiz do projeto) | sim | contém `_opencrew/` |
| `<arquivo.md>` (um só) | sim, sem `--criar-perfil` | dentro do projeto; `.md` ou `.txt`; UTF-8; com texto |
| `--saida` | não (padrão: ao lado do texto, mesmo nome, `.docx`) | dentro do projeto; termina em `.docx` ou é pasta (criada se faltar). Nome que não existe e tem outra extensão (`notas.txt`), ou arquivo que não é `.docx`, é recusado |
| `--perfil` | não (padrão: `_opencrew/_memory/documento-oficial.md`, se existir) | dentro do projeto; existe; válido (regra 10) |
| `--sem-perfil` | não | ignora o perfil do projeto: sem timbre, com os padrões da §4 |
| `--substituir` | não | autoriza trocar um `.docx` diferente que já existe |
| item `caminho=documento-oficial` na lista do `entregar.mjs` | não | `.md` ou `.txt` vira Word; outro tipo é copiado como está |

**Perfil** (`_opencrew/_memory/documento-oficial.md`). Só são lidas as linhas `chave: valor` em que
a chave tem letras minúsculas, dígitos e `_` e começa na primeira coluna; qualquer outra linha é
comentário (o espaço depois dos dois-pontos é opcional; `https://…` não é chave). Valor vazio vale
"não tem" (nas chaves de formato, o padrão). Aspas em volta do valor são retiradas; número aceita
vírgula ou ponto. Chave repetida: vale a última. Todas as chaves são opcionais:
```
logotipo: Ativos/Marca/logo.png
logotipo_largura_cm: 2,5
cabecalho_1: ASSOCIAÇÃO EXEMPLO DE MORADORES
cabecalho_2: CNPJ 00.000.000/0001-00 · Fundada em 1990
cabecalho_3: www.exemplo.org · contato@exemplo.org
rodape: Associação Exemplo de Moradores — documento oficial
numero_pagina: sim
margem_esquerda_cm: 3,0
margem_direita_cm: 2,0
margem_superior_cm: 2,5
margem_inferior_cm: 2,5
fonte: Arial
tamanho_corpo_pt: 11
```
Faixas: margens de 1 a 6 cm; `logotipo_largura_cm` de 1 a 6; `tamanho_corpo_pt` de 8 a 14 (aceita
meio ponto); `fonte` com até 40 letras, dígitos e espaços; `numero_pagina` é `sim` ou `nao`
(`não` vale igual). `logotipo`: caminho relativo à raiz, dentro do projeto, arquivo PNG de até
2 MB (confere a assinatura de 8 bytes e lê largura e altura do bloco IHDR, para a proporção).

## 4. Saídas
- **Comando:** o `.docx` e um relatório em PT-BR (textos na §6): onde gravou, qual perfil usou, os
  avisos de conversão e duas dicas. Última linha `DOCUMENTO:OK`, código 0. Em qualquer outro caso:
  código 1, a mensagem da §6, sem linha `DOCUMENTO:` e nada gravado. `--ajuda`: o uso, código 0.
- **`--criar-perfil`:** grava o perfil a partir do modelo, se ele não existir; última linha
  `PERFIL:CRIADO` ou `PERFIL:JA-EXISTE`, código 0.
- **Na entrega:** `entrega/documentos/<nome>.docx` e a seção `## Documentos` no LEIA-ME (regra 12).
- **Para a entrega chamar** (exportadas por `documento.mjs`): `gerarDocx({ texto, perfil, logotipo })`
  → `{ bytes, avisos, vazio }`, que não toca o disco (perfil já lido, logotipo já em bytes; `avisos`
  são os textos da §6; `vazio` diz que o texto não tem nada a converter); e
  `lerPerfilDoProjeto(raiz, arquivo)` → `{ perfil, logotipo }` ou `{ erro }` (a mensagem da §6, com
  a linha). `PERFIL` é o caminho padrão do perfil. O comando usa as mesmas funções.

> **Medido na ata real em 2026-10-07 (vale no lugar dos valores com †):** corpo na fonte do tema
> do Word, **Aptos 11 pt**, justificado, 5 pt depois, entrelinha 1,15. Título 14 pt negrito
> centralizado, **8 pt antes e 4 depois**. Subtítulo 10 pt itálico centralizado, cor `333333`,
> **16 pt depois**. Título 1: 12 pt negrito, **14 pt antes e 4 depois**. Título 2: 11 pt negrito,
> **10 antes e 3 depois**. Título 3: 10,5 pt negrito itálico, cor `333333`, **8 antes e 2
> depois**. Rodapé em **8,5 pt**. Tabelas com colunas de larguras iguais (confere com a regra).
> Padrão do gerador sem perfil: Arial 11 (a Aptos só existe no Word recente); o perfil do caso
> de aceite usa `fonte: Aptos`. O espaço das assinaturas não foi medido.

**Página e texto** (valores da ata real, com os medidos em 2026-10-07 já aplicados; † = escolhido
aqui, a conferir lado a lado: só restam a fonte e o tamanho do corpo sem perfil e o espaço das
assinaturas). Medidas no arquivo: twips = `Math.round(cm × 566,93)`; letra em meios-pontos;
espaço antes e depois em vigésimos de ponto.

| Item | Valor |
|---|---|
| Papel | A4 em pé, 11906 × 16838 |
| Margens (padrão) | esquerda 3,0 cm (1701) · direita 2,0 (1134) · superior e inferior 2,5 (1417); cabeçalho e rodapé a 1,2 cm da borda (680) |
| Corpo (`Normal`) | `fonte` do perfil (Arial†) no `tamanho_corpo_pt` (11†); justificado; entrelinha 1,15 (`line="276"`, automática); 5 pt depois (`after="100"`); idioma pt-BR |
| `::: titulo` (`Titulo`, nome "Título do documento") | 14 pt, negrito, centralizado, 8 pt antes (`160`) e 4 depois (`80`) |
| `::: subtitulo` (`Subtitulo`, nome "Subtítulo do documento") | 10 pt, itálico, cor `333333`, centralizado, 16 pt depois (`320`) |
| `#` (`Heading1`, nome `heading 1`) | 12 pt, negrito, caixa alta por formatação (`w:caps`: o texto não muda), `keepNext`, 14 pt antes (`280`) e 4 depois (`80`); nível de tópico 1 (aparece no painel de navegação) |
| `##` (`Heading2`) · `###` (`Heading3`) | 11 pt, negrito, 10 pt antes (`200`) e 3 depois (`60`) · 10,5 pt, negrito e itálico, cor `333333`, 8 pt antes (`160`) e 2 depois (`40`); os dois com `keepNext`, à esquerda, níveis de tópico 2 e 3 |
| Lista | marcador `•` do Word, recuo de 0,75 cm por nível (425 e 850, com 283 pendurados para o marcador), 2 níveis; linha recuada sem marcador (item com número escrito): recuo de 0,75 cm, sem marcador |
| Tabela | largura da área de texto, colunas iguais (a parte inteira da divisão; leiaute fixo); bordas simples finas `CCCCCC`; primeira linha em negrito com fundo `F0F0F0`; nenhuma linha parte entre páginas (`cantSplit`); células à esquerda, sem espaço depois |
| Linha horizontal | parágrafo vazio com borda inferior fina `AAAAAA` |
| Cabeçalho (timbre) | tabela sem bordas, de 2 colunas, com uma linha preta de 1 pt embaixo: à esquerda o logotipo, na largura do perfil (2,5 cm) e altura proporcional; à direita `cabecalho_1` (12 pt, negrito), `cabecalho_2` (10 pt) e `cabecalho_3` (10 pt, `666666`). Sem logotipo: uma coluna só. A coluna do logotipo tem a largura dele mais 0,4 cm; depois da tabela vem um parágrafo vazio |
| Rodapé | um parágrafo com linha fina `AAAAAA` em cima: `rodape` em itálico `666666`, 8,5 pt, à esquerda; "Página X de Y" à direita (tabulação à direita na largura do texto; campos `PAGE` e `NUMPAGES`, escritos com `w:fldChar`, com "1" até o Word calcular), 8,5 pt |
| Assinaturas | tabela sem bordas, de 2 colunas, `cantSplit`; em cada célula, um parágrafo centralizado com borda superior (a linha), 36 pt antes† e recuo de 0,75 cm de cada lado, com o nome em negrito e caixa alta por formatação; abaixo, o cargo, centralizado. Número ímpar: a última fica sozinha, no centro (célula mesclada, recuo de 4 cm de cada lado) |

## 5. Regras

**O pacote**
1. **Gerador próprio.** Node puro, só com APIs do Node 20.0, sem dependência e sem rede. Não
   importa `node:zlib`: toda entrada do zip é gravada sem compressão (método 0), com CRC-32
   próprio e data fixa (1980-01-01 00:00). O contêiner (cabeçalho local, diretório central e
   registro final) é escrito à mão; nomes em UTF-8, com `/`.
2. **Partes, nesta ordem:** `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`,
   `word/_rels/document.xml.rels`, `word/styles.xml`, `word/settings.xml`, `word/numbering.xml`;
   depois, só quando existem: `word/header1.xml` (há logotipo ou alguma linha de cabeçalho),
   `word/_rels/header1.xml.rels` e `word/media/logo.png` (há logotipo; os bytes são os do arquivo
   do usuário), `word/footer1.xml` (há `rodape` ou número de página). Nunca `docProps/`, relação
   externa, data, hora, usuário ou caminho local. `settings.xml` declara o modo de compatibilidade
   15 (o Word não mostra "Modo de Compatibilidade").
3. **Invariantes de estrutura**, para qualquer texto e perfil: (a) toda parte tem tipo de
   conteúdo: `rels`, `xml` e `png` por extensão; documento, estilos, ajustes, numeração, cabeçalho
   e rodapé por parte; (b) `_rels/.rels` aponta `word/document.xml`; toda outra parte de `word/`
   é alvo de uma relação com o tipo dela, e todo `r:id` e `r:embed` usado tem relação, na parte
   de relações do arquivo que o usa; (c) todo estilo e todo `numId` usado está definido; (d) toda
   célula de tabela termina em parágrafo, e toda tabela tem `w:tblGrid`; tabela no fim do corpo ou
   seguida de outra tabela ganha um parágrafo vazio depois; (e) todo `w:t` leva
   `xml:space="preserve"`; (f) toda parte é XML 1.0 bem formado, em UTF-8, sem caractere proibido;
   (g) os filhos de cada elemento saem na ordem do formato:

   | Elemento | Ordem dos filhos (só os que o gerador usa) |
   |---|---|
   | `w:body` | os blocos; `w:sectPr` por último |
   | `w:sectPr` | `headerReference`, `footerReference`, `pgSz`, `pgMar` |
   | `w:pPr` | `pStyle`, `keepNext`, `pageBreakBefore`, `numPr`, `pBdr`, `tabs`, `spacing`, `ind`, `jc`, `outlineLvl` |
   | `w:rPr` | `rFonts`, `b`, `i`, `caps`, `color`, `sz`, `szCs`, `lang` |
   | `w:tbl` | `tblPr` (`tblW`, `jc`, `tblBorders`, `tblLayout`, `tblCellMar`), `tblGrid`, linhas |
   | `w:trPr` · `w:tcPr` | `cantSplit` · `tcW`, `gridSpan`, `tcBorders`, `shd`, `vAlign` |
   | bordas (`pBdr`, `tblBorders`, `tcBorders`) · `tblCellMar` | `top`, `left`, `bottom`, `right`, `insideH`, `insideV` · `top`, `left`, `bottom`, `right` |
   | `styles.xml` · `numbering.xml` | `docDefaults` antes dos estilos · `abstractNum` antes de `num` |
4. **Texto seguro e determinismo.** `&`, `<` e `>` são escapados no texto, e as aspas, nos
   atributos, inclusive nos textos do perfil. Caractere inválido em XML 1.0 (U+0000 a U+0008,
   U+000B, U+000C, U+000E a U+001F, U+FFFE, U+FFFF, metade solta de par substituto) é removido,
   com aviso. CRLF e LF dão o mesmo resultado; o BOM é ignorado. Mesmo texto, mesmo perfil e
   mesmo logotipo dão os mesmos bytes.

**O texto**
5. **O texto oficial não muda.** O gerador não numera, não reordena, não corrige e não acrescenta
   palavra. Caixa alta de título e de nome de assinatura é formatação, não troca de letra.
6. **Um parágrafo por linha.** Linha não vazia é um parágrafo; linhas seguidas não se juntam;
   linha vazia não gera parágrafo. Tabulação no meio da linha vira tabulação.
7. **Tabela fechada: markdown → Word.** O que não está aqui sai como texto, igual ao que foi escrito.

   | No markdown | No Word |
   |---|---|
   | Frontmatter: começa na primeira linha com `---`, termina na próxima `---`, e toda linha não vazia do meio é `chave: valor` ou continuação recuada | Fora do documento. Bloco sem essa forma não é frontmatter |
   | `#`, `##`, `###` (com espaço depois) | Título 1, 2 e 3. De `####` em diante: parágrafo comum em negrito. Sem o espaço (`#texto`), fica como texto |
   | `**a**`, `__a__` · `*a*`, `_a_` · `***a***` | Negrito · itálico · os dois. Só em par, na mesma linha, colado ao texto e com espaço, pontuação ou borda da linha do lado de fora: `2 * 3 * 4`, `nome_do_arquivo`, URL e e-mail não mudam. `\*` e `\_` dão o sinal |
   | Linha iniciada por `- ` ou `* ` | Item de lista com marcador; com 2 espaços ou mais (ou tabulação) no início, nível 2 |
   | Linha iniciada por número ou letra de item (`1.`, `6.1.`, `a)`, `I -`) | Parágrafo comum, com o número como texto. Só o recuo no início da linha (2 espaços ou mais, ou tabulação) desloca o parágrafo um nível — e isso vale para qualquer parágrafo comum, com número ou sem |
   | Tabela (linha de cabeçalho, linha separadora, linhas) | Tabela da §4. Vale o número de colunas da linha mais longa; as outras são completadas. Alinhamento pedido é ignorado. Sem linha separadora, fica como texto. Negrito e itálico valem dentro da célula; `\|` dá a barra |
   | Linha só com três ou mais `-`, `*` ou `_` iguais (`---`, `***`, `___`; fora do frontmatter) | Linha horizontal |
   | `[texto](url)` | `texto (url)`, como texto; se o texto é a própria URL, só ela |
   | `![descrição](arquivo)` | Fica como texto, com aviso |
8. **Três marcações de documento.** Linha que começa por `:::`, a partir da primeira coluna.
   Nomes sem diferenciar maiúsculas e acentos (`título`, `quebra-de-página`). Texto comum quase
   nunca começa por `:::`, e, sem o gerador, a linha continua legível como está.

   | Marcação | Resultado |
   |---|---|
   | `::: titulo Texto` · `::: subtitulo Texto` (uma linha cada) | Parágrafo centralizado no estilo da §4. Vale em qualquer ponto e quantas vezes for preciso (o anexo tem o seu). Negrito e itálico valem |
   | `::: quebra-de-pagina` (sozinha na linha) | O bloco seguinte começa em página nova (`pageBreakBefore`; antes de tabela, num parágrafo vazio próprio). No início ou no fim do texto, e repetida, não gera página a mais |
   | `::: assinaturas`, uma linha `Nome \| Cargo` por pessoa, e `:::` para fechar | Bloco de assinaturas da §4, na ordem escrita, da esquerda para a direita e de cima para baixo. Linha sem barra: só o nome. Linhas vazias do bloco são ignoradas |
   Marcação desconhecida (`::: nota`; também `::: titulo` sem texto, `::: quebra-de-pagina` com
   texto depois e um `:::` solto) fica como texto, igual ao que foi escrito, com aviso. Bloco de
   assinaturas sem o `:::` final: a linha `::: assinaturas` fica como texto, com o aviso próprio, e
   as linhas seguintes são lidas como texto comum, uma a uma. Dentro do bloco de assinaturas
   fechado nada mais é interpretado; `Nome | Cargo` parte na primeira barra. O espaço depois de
   `:::` é opcional. Linha recuada que começa por `:::` é texto comum.
9. **Avisos de conversão:** imagem não incluída, marcação desconhecida, bloco de assinaturas sem
   fim, caractere inválido removido. Cada um diz a quantidade. Aviso não muda o status nem o código.

**O perfil e a gravação**
10. **Perfil.** Lido de `_opencrew/_memory/documento-oficial.md` (ou de `--perfil`). Sem arquivo de
    perfil, ou com `--sem-perfil`: os padrões da §4, sem cabeçalho, com "Página X de Y" no rodapé,
    e o relatório diz como criar o perfil. Perfil com chave desconhecida, valor fora da faixa,
    logotipo que não existe, está fora do projeto, não é PNG ou passa de 2 MB: código 1, a mensagem
    diz a linha e nada é gravado — documento oficial não sai com o timbre errado em silêncio.
11. **O perfil nasce do modelo e nunca é sobrescrito.** `--criar-perfil` copia
    `_opencrew/core/modelos/documento-oficial.md` para `_opencrew/_memory/documento-oficial.md` só
    se ele não existir. O modelo traz todas as chaves — as de conteúdo vazias, as de formato com o
    padrão —, uma linha de explicação por chave e nenhum dado do mantenedor (regra 2 do AGENTS.md).
    Nenhum outro comando grava nesse arquivo: quem preenche é o usuário, ou a IA a pedido dele.
12. **Gravação.** O arquivo é montado na memória, gravado num temporário ao lado do destino e
    renomeado; em falha não fica arquivo pela metade. Destino que já existe: igual, byte a byte,
    nada é gravado e o resultado é `DOCUMENTO:OK`; diferente, só é trocado com `--substituir`. O
    comando só escreve o `.docx` pedido (e o perfil, pela regra 11) e nunca apaga nada.
    **Na entrega** (decisão 9): a plataforma `documento` ganha a pasta `documentos/`, depois de
    `youtube`. Item `documento-oficial`, `.md` ou `.txt`, vira `documentos/<nome do arquivo>.docx`,
    inteiro (nenhuma peça é separada), com o perfil do projeto, se existir, e não vai para
    `outros/`. Outro tipo de arquivo é copiado como está, com aviso. Erro ao converter, inclusive
    perfil inválido, é pendência de `documentos`: o final é `ENTREGA:INCOMPLETA` e os outros
    canais seguem. O LEIA-ME ganha `## Documentos` (situação, arquivos com a origem, avisos em
    `Atenção:`, passos da §6) e, em "O que não foi conferido", "Como o documento abre no Word.".

**Prompts e projeto**
13. **Rota e prompt.** `templates/AGENTS.md` ganha a linha `/opencrew documento <arquivo>` → ler
    `_opencrew/core/prompts/documento.prompt.md`, e a opção "Documento Word" em "More options".
    O prompt manda: (a) sem arquivo, perguntar qual; (b) sem perfil, perguntar se o usuário quer
    papel timbrado: com "sim", rodar `--criar-perfil`, perguntar logotipo, as três linhas e o
    rodapé, e preencher o arquivo; com "não", seguir sem perfil; (c) rodar o comando com o caminho
    entre aspas e mostrar o relatório; (d) se o Word já existe e é diferente, perguntar antes de
    passar `--substituir`; (e) se o comando falhar, mostrar a mensagem e não gerar por outro meio.
14. **Best-practice `documento-oficial`**, no catálogo, com `platform: "documento"` e sem
    `constraints:` (não há limite de tamanho prometido). Ensina o redator: um parágrafo por linha;
    `::: titulo` e `::: subtitulo` no começo; `#`, `##` e `###` para as seções, com o número
    escrito à mão; tabela simples; `::: quebra-de-pagina` antes de anexo; `::: assinaturas` no
    fim; sem imagem, HTML, rótulos `=== … ===` nem seção de notas. O `design.prompt.md` dá esse
    formato ao passo cujo resultado é um documento para imprimir, assinar ou protocolar.
    **Quem já usa:** tudo mora em `_opencrew/core/` e chega com um `update`; o perfil é criado sob
    demanda. Módulos de até 200 linhas: `documento.mjs` (a casca) e, em `scripts/documento/`:
    `argumentos`, `zip`, `xml`, `png`, `perfil` (leitura e validação, sem disco), `projeto` (o
    perfil e o logotipo no disco, `--criar-perfil`), `markdown`, `marcacoes`, `linha` (texto em
    linha), `corpo`, `tabelas`, `estilos`, `timbre`, `pacote` e `gravar`.

## 6. Textos
Erros de uso que `comum.mjs` já tem (pasta sem `_opencrew/`, caminho fora do projeto) saem com o
texto de lá. `{n}` concorda em número.

| Onde | Texto |
|---|---|
| Uso | "Uso: node _opencrew/core/scripts/documento.mjs \"<arquivo.md>\" [--saida <arquivo.docx\|pasta>] [--perfil <arquivo>] [--sem-perfil] [--substituir] [--ajuda]" e, na linha de baixo, "     node _opencrew/core/scripts/documento.mjs --criar-perfil" |
| Opção desconhecida · sem arquivo · mais de um | "Opção desconhecida: {opção}." · "Falta o arquivo de texto." · "Converto um arquivo por vez. Recebi {n}." — cada uma seguida do uso |
| Arquivo não existe · sem texto · não é UTF-8 · outra extensão | "Não encontrei {arquivo}." · "{arquivo} não tem texto para converter." · "{arquivo} não está em UTF-8. Salve como UTF-8 e tente de novo." · "Só converto texto em markdown (.md ou .txt). Recebi: {arquivo}." |
| `--saida` inválida | "A saída precisa ser um arquivo .docx ou uma pasta, dentro do projeto. Recebi: {valor}." |
| Já existe, diferente | "Já existe {arquivo}, diferente do que eu ia gravar. Para trocar, rode de novo com --substituir." |
| Falha ao gravar | "Não consegui gravar {arquivo}. Feche o arquivo no Word, ou espere a sincronização da pasta, e rode de novo." |
| Perfil: não encontrado (`--perfil`) · chave desconhecida · valor inválido | "Perfil não encontrado: {arquivo}." · "Perfil, linha {n}: não conheço a chave {chave}." · "Perfil, linha {n}: {chave} precisa ser {o que se espera}. Recebi: {valor}." |
| Perfil: o que se espera de cada chave | margens e `logotipo_largura_cm`: "um número de 1 a 6" · `tamanho_corpo_pt`: "um número de 8 a 14 (aceita meio ponto)" · `fonte`: "um nome com até 40 letras, dígitos e espaços" · `numero_pagina`: "sim ou nao" |
| Perfil: logotipo | "Perfil, linha {n}: não encontrei o logotipo {arquivo}." · "Perfil, linha {n}: o logotipo precisa ser um arquivo PNG de até 2 MB, dentro do projeto. Recebi: {arquivo}." |
| Relatório | "Documento gerado: {arquivo}" (ou "{arquivo} já existe e está igual. Nada a fazer.") · "Perfil: {arquivo}" ou "Perfil: nenhum (sem papel timbrado). Para criar o seu: node _opencrew/core/scripts/documento.mjs --criar-perfil" · "Avisos:" e a lista |
| Avisos (no relatório, um por linha, depois de "- ") | "{n} imagens não incluídas: o Word não leva imagem no texto." · "{n} linhas com marcação desconhecida (`:::`) ficaram como texto." · "Bloco de assinaturas sem a linha `:::` no fim: ficou como texto." · "{n} caracteres inválidos removidos." — com 1: "1 imagem não incluída: …", "1 linha com marcação desconhecida (`:::`) ficou como texto.", "1 caractere inválido removido."; com mais de um bloco sem fim: "{n} blocos de assinaturas sem a linha `:::` no fim: ficaram como texto." |
| Erro inesperado (leitura do arquivo, do perfil ou do modelo) | "Não consegui gerar o documento: {motivo}." — código 1, nada gravado |
| Dicas, no fim do relatório e nos passos do LEIA-ME | "Para ter um PDF: abra o documento no Word e use Arquivo → Salvar como → PDF." · "O Word é uma cópia do texto. O que você mudar nele não volta sozinho: altere o texto e gere de novo." |
| `--criar-perfil` | "Criei {arquivo}. Abra, preencha o logotipo, o cabeçalho e o rodapé, e gere o documento de novo." · "{arquivo} já existe. Não mexi nele." |
| LEIA-ME, passos de `## Documentos` | "Abra `documentos/{arquivo}` no Word e confira: cabeçalho, páginas, tabelas e assinaturas." · "Não edite o Word dentro desta pasta: ela é refeita a cada entrega. Para mexer, copie o arquivo para outra pasta do projeto." · as duas dicas |
| Entrega: outro tipo de arquivo · erro ao converter | "{arquivo}: só converto .md ou .txt em Word. Copiei o arquivo como está." · "Não consegui gerar o Word de {arquivo}: {motivo}." |
| Prompt: comando que não rodou | "⚠️ A conversão para Word não rodou: {motivo}. O texto continua em {arquivo}." |
| Prompt: primeira vez | "Este projeto ainda não tem papel timbrado configurado. Quer configurar agora (logotipo, cabeçalho e rodapé)? (sim / não)" |

## 7. Cenários
São 39. Os IDs sem nota vêm da spec anterior, com o texto daqui; os grupos 08, 09 e 10 são novos.
Sem QUANDO, a ação é rodar `documento.mjs`. Cada par DADO…ENTÃO vira um teste, com o ID no nome.
"Perfil completo" = as 13 chaves do exemplo da §3, com um PNG de 200 × 80. "Referência" =
`tests/fixtures/documento-referencia.md`, com todas as construções das regras 7 e 8.

**U3b-01 — Pacote**
- **U3b-01a** DADO o perfil completo ENTÃO o zip tem as 11 partes da regra 2, nessa ordem; DADO
  `--sem-perfil` ENTÃO tem as 7 fixas e `word/footer1.xml`; nunca `docProps/`.
- **U3b-01b** ENTÃO toda entrada tem método 0 e data fixa, e o CRC confere com uma implementação
  independente (bit a bit, no teste); o CRC-32 de `123456789` é `cbf43926`; nenhum módulo de
  `scripts/documento/` nem o `documento.mjs` importa `node:zlib` ou módulo de rede.
- **U3b-01c** DADOS a referência e os casos-limite (uma linha só; célula vazia; tabela no fim;
  duas tabelas seguidas; quebra antes de tabela; assinaturas no fim), com e sem perfil ENTÃO
  valem os invariantes (a) a (g) da regra 3, em todas as partes.
- **U3b-01d** DADO o mesmo texto gerado duas vezes, e com CRLF, com LF e com BOM ENTÃO os bytes
  são os mesmos.
- **U3b-01e** DADO `--sem-perfil` ENTÃO a seção declara 11906 × 16838, as margens 1701, 1134,
  1417 e 1417, e cabeçalho e rodapé a 680; `Normal` é Arial 11, justificado, com `line="276"` e
  `after="100"`; `Heading1` a `Heading3`, `Titulo` e `Subtitulo` têm os tamanhos da §4, com
  `keepNext` nos três títulos e `w:caps` no 1; `settings.xml` tem o modo 15.
- **U3b-01g** (os auxiliares têm dentes) DADOS um zip com CRC trocado, um XML com tag aberta e um
  XML com U+000C ENTÃO o leitor de zip e o conferidor de XML dos testes reprovam os três.
- **U3b-01h** (o conferidor tem dentes) DADOS, um por vez, pacotes com: célula sem parágrafo;
  `r:embed` sem relação; parte sem tipo de conteúdo; estilo ou `numId` usado e não definido;
  `w:t` sem `xml:space`; `w:jc` antes de `w:spacing` ENTÃO o conferidor reprova cada um.

**U3b-02 — Texto**
- **U3b-02a** DADO `#`, `##`, `###` ENTÃO `Heading1` a `Heading3`; DADO `####` ENTÃO negrito comum.
- **U3b-02b** DADOS `1.` e `2.`, um parágrafo e `3.` ENTÃO o texto traz "1.", "2." e "3.", nessa
  ordem, sem `numPr`; DADAS "6.1. Texto" e "§ 1º Texto" ENTÃO dois parágrafos que começam assim.
- **U3b-02c** DADOS `- item` e `* item` ENTÃO dois itens com `numPr`, nível 0, sem o sinal no
  texto; DADO `  - sub` ENTÃO nível 1; DADO `  a) alínea` ENTÃO parágrafo recuado, sem `numPr`.
- **U3b-02d** DADO `a **b** c` ENTÃO "a b c", com "b" em negrito; DADO `*i*` ENTÃO itálico; DADOS
  `nome_do_arquivo`, `2 * 3 * 4` e `ana_maria@exemplo.org` ENTÃO saem iguais, sem itálico; DADO
  `\*x\*` ENTÃO "*x*".
- **U3b-02e** DADO `[edital](https://exemplo.org/?a=1&b=2)` ENTÃO "edital
  (https://exemplo.org/?a=1&b=2)", sem relação externa; DADO `![logo](logo.png)` ENTÃO a linha
  sai como texto e há um aviso.
- **U3b-02h** DADA uma tabela com uma linha mais curta ENTÃO a primeira linha tem negrito e fundo
  `F0F0F0`, as bordas são `CCCCCC`, toda linha tem `cantSplit`, as colunas são iguais e a linha
  curta foi completada; DADAS linhas com barras, sem linha separadora ENTÃO ficam como texto;
  DADA uma linha `---` no meio do texto ENTÃO um parágrafo vazio com borda inferior, sem quebra.
- **U3b-02i** DADOS `&`, `<`, `>`, aspas, acentos e emoji ENTÃO o texto lido do Word é igual;
  DADOS U+000B e U+000C ENTÃO somem e o aviso conta 2; DADA uma tabulação no meio ENTÃO `w:tab`.
- **U3b-02k** DADO um frontmatter com `titulo:` e uma continuação recuada ENTÃO nada dele está no
  documento; DADO um texto que começa por `---`, um `#` e um parágrafo ENTÃO os dois estão.

**U3b-03 e U3b-04 — Gravação e comando**
- **U3b-03a** (reescrito) DADO `Atas/ata.md` ENTÃO existe `Atas/ata.docx`; DADO `--saida Docs`
  ENTÃO a pasta é criada, com `ata.docx`; DADO `--saida Docs/Ata-final.docx` ENTÃO é esse o arquivo.
- **U3b-03f** (reescrito) DADO o `.docx` idêntico já na pasta ENTÃO nada é gravado e a última
  linha é `DOCUMENTO:OK`; DADO um diferente ENTÃO código 1, a mensagem da §6 e o arquivo antigo
  igual, byte a byte; com `--substituir` ENTÃO é trocado; DADA uma falha ao gravar (injetada)
  ENTÃO código 1, a mensagem cita o arquivo e não sobra temporário nem arquivo pela metade.
- **U3b-04a** DADO um `.md` e nenhum perfil ENTÃO o `.docx` existe, o relatório traz "Perfil:
  nenhum" com o comando de criar e as duas dicas, a última linha é `DOCUMENTO:OK` e o código é
  0; DADO um `.txt` ENTÃO também; DADO `--ajuda` ENTÃO o uso, código 0 e nada gravado.
- **U3b-04g** DADO, um por vez: pasta sem `_opencrew/`; `--saidaa x`; nenhum arquivo; dois
  arquivos; `../fora.md`; arquivo inexistente; arquivo só com frontmatter; arquivo em Latin-1;
  `.pdf`; `--saida ../x`; `--saida notas.txt`; `--perfil nao-existe.md` ENTÃO código 1, a
  mensagem da §6, nenhuma linha `DOCUMENTO:` e nada gravado.
- **U3b-04j** DADO cada cenário de `tests/documento*.test.js` ENTÃO, fora do arquivo de saída (e
  do perfil, em `--criar-perfil`), a árvore do projeto é igual antes e depois.

**U3b-08 — Perfil (novos)**
- **U3b-08a** DADO um projeto sem perfil QUANDO roda `--criar-perfil` ENTÃO o arquivo é igual ao
  modelo e a última linha é `PERFIL:CRIADO`; QUANDO roda de novo, com o arquivo já editado ENTÃO
  ele fica igual, byte a byte, e a última linha é `PERFIL:JA-EXISTE`; o modelo, lido como perfil,
  é válido e não gera cabeçalho.
- **U3b-08b** DADO o perfil completo ENTÃO `header1.xml` tem uma tabela de 2 colunas, com borda
  inferior preta e um `w:drawing` cujo `r:embed` tem relação em `word/_rels/header1.xml.rels`;
  `word/media/logo.png` tem os bytes do arquivo do usuário; a largura é 900000 (2,5 cm) e a
  altura 360000 (proporção de 200 × 80); as três linhas estão na ordem, com 12 pt negrito, 10 pt
  e 10 pt `666666`; DADO um perfil sem logotipo ENTÃO uma coluna só, sem `word/media/` nem
  `header1.xml.rels`; DADO um perfil só com margens ENTÃO não existe `header1.xml`.
- **U3b-08c** DADO o perfil completo ENTÃO `footer1.xml` tem o texto do rodapé em itálico
  `666666`, a borda superior `AAAAAA` e, depois de uma tabulação, "Página ", o campo `PAGE`,
  " de " e o campo `NUMPAGES`; DADO `numero_pagina: nao` e rodapé vazio ENTÃO não existe
  `footer1.xml` nem referência na seção.
- **U3b-08d** DADO `margem_esquerda_cm: 2,5`, `fonte: Calibri` e `tamanho_corpo_pt: 10.5` ENTÃO a
  seção tem 1417 à esquerda e `Normal` é Calibri com `sz="21"`; DADAS linhas de texto livre,
  `cabecalho_1: "Exemplo & Filhos <matriz>"` e uma chave com valor vazio ENTÃO o perfil é válido,
  o cabeçalho lido é `Exemplo & Filhos <matriz>` e o XML é bem formado.
- **U3b-08e** DADO, um por vez: `logotpo: x.png`; `margem_esquerda_cm: 12`; `numero_pagina:
  talvez`; logotipo inexistente; logotipo `../fora.png`; um `.jpg` renomeado para `.png`; um PNG
  de 3 MB ENTÃO código 1, a mensagem da §6 com o número da linha, e nada gravado.

**U3b-09 — Marcações (novos)**
- **U3b-09a** DADAS `::: titulo ATA DA ASSEMBLEIA` e `::: subtítulo Realizada em 3 de março`
  ENTÃO dois parágrafos, nos estilos `Titulo` e `Subtitulo`, centralizados, com esse texto.
- **U3b-09b** DADA `::: quebra-de-pagina` antes de um parágrafo ENTÃO ele tem `pageBreakBefore`;
  antes de uma tabela ENTÃO há um parágrafo vazio com `pageBreakBefore` antes dela; DADA a
  marcação no início, no fim e duas vezes seguidas (uma delas `::: Quebra-de-Página`) ENTÃO o
  documento tem uma quebra só.
- **U3b-09c** DADO um bloco com `Ana Lima | Presidente` e `Rui Sá | Secretário` ENTÃO uma tabela
  sem bordas, de uma linha e 2 colunas, com `cantSplit`; em cada célula, o nome com `w:caps` e
  borda superior, e o cargo abaixo; o texto lido é "Ana Lima", "Presidente", "Rui Sá",
  "Secretário"; DADAS três pessoas ENTÃO a terceira ocupa a segunda linha inteira (`gridSpan`
  2); DADA uma linha sem barra ENTÃO a célula tem só o nome.
- **U3b-09d** DADA `::: nota Texto` ENTÃO a linha sai como texto, com aviso; DADO um bloco
  `::: assinaturas` sem o `:::` final ENTÃO as linhas saem como texto, com o aviso próprio; DADA
  uma linha com `:::` no meio (`Nota ::: titulo`) ENTÃO texto comum, sem aviso; DADO `**x**`
  dentro do bloco de assinaturas ENTÃO o nome é `**x**`.

**U3b-10 — As mesmas palavras (novos)**
- **U3b-10a** DADAS a referência e `tests/fixtures/ata-exemplo.md` (fictícia, com a forma da ata
  real: título e subtítulo, seções "I." a "XII.", subseções "6.1.", lista numerada escrita pelo
  autor, três tabelas — a do anexo com 4 colunas —, três assinaturas e um anexo depois de uma
  quebra), com o perfil completo ENTÃO a sequência de
  palavras lida de `word/document.xml` (os `w:t`, na ordem, com espaço em fim de parágrafo e de
  célula) é igual à do markdown, tirada por um extrator do teste que não importa o gerador (tira
  frontmatter, sinais de título, lista, negrito e itálico, barras e linha separadora de tabela,
  réguas e os nomes das marcações `:::`; troca `[t](u)` por `t (u)`); a ata tem 3 tabelas de
  dados, 1 de assinaturas, 1 quebra e nenhum aviso.
- **U3b-10b** (o extrator tem dentes) DADO um `.docx` em que o teste trocou "2026" por "2025", e
  outro em que inverteu dois parágrafos ENTÃO a comparação reprova os dois.

**U3b-05 — Na entrega**
- **U3b-05b** DADO um item `ata.md=documento-oficial` e o perfil completo ENTÃO existe
  `entrega/documentos/ata.docx`, igual, byte a byte, ao do comando para o mesmo texto; o `.md`
  não está em `outros/`; o LEIA-ME traz `## Documentos` entre `## YouTube` e `## Outros
  arquivos`, com a origem, os passos da §6 e a linha do Word em "O que não foi conferido"; o
  final é `ENTREGA:OK`; DADO o item com uma imagem ENTÃO o aviso está em `Atenção:` e o final
  não muda; DADO um `.pdf` com esse formato ENTÃO está em `documentos/`, como veio, com o aviso.
- **U3b-05j** DADO um perfil inválido, ou um erro ao converter (injetado) ENTÃO `documentos` não
  está pronto, a mensagem cita o arquivo, os outros canais saem e o final é `ENTREGA:INCOMPLETA`.
- **U3b-05n** (novo) DADA uma entrega sem item `documento-oficial` ENTÃO não existe
  `documentos/` e os testes da U3a passam sem mudança.

**U3b-06 e U3b-07 — Contratos, pacote e upgrade**
- **U3b-06a** `documento-oficial.md` existe, está no `_catalog.yaml`, tem `platform: "documento"`,
  não tem `constraints:` e ensina os pontos da regra 14; o exemplo do guia usa as três marcações
  e converte sem aviso; `design.prompt.md` dá `format: documento-oficial` ao passo de documento.
- **U3b-06d** `templates/AGENTS.md` tem a rota `/opencrew documento` e a opção do menu, e aponta
  `prompts/documento.prompt.md`, que existe, cita `_opencrew/core/scripts/documento.mjs` e traz
  os cinco pontos da regra 13, com os textos da §6.
- **U3b-07a** o tarball tem `documento.mjs`, os módulos de `documento/`, `entrega/documentos.mjs`,
  `modelos/documento-oficial.md`, o prompt e o best-practice; o modelo não cita nome, CNPJ, site
  nem caminho do mantenedor.
- **U3b-07b** o AGENTS.md cita o `documento.mjs` na regra 15 (grava o `.docx` pedido e o perfil
  que faltava) e "abrir o `.docx` no Word" em "Não cobre" (regra 7); o README descreve o
  documento Word e o perfil, não promete LibreOffice nem Google Docs e diz "23 guias de melhores
  práticas"; nenhum módulo novo passa de 200 linhas e o `runner.pipeline.md` não ganha linha.
- **U3b-upg** DADO um workspace 1.8.0 com uma crew, um `.md` e `_opencrew/_memory/` já editado
  QUANDO roda o `update` e depois `documento.mjs` nesse `.md` ENTÃO o `.docx` é gerado, o catálogo
  tem o formato novo, nada da crew nem de `_memory/` mudou, e `--criar-perfil` cria o perfil.

## 8. Fora desta fase
| O que não entra | Alocação |
|---|---|
| Ler ou regravar o `.dotx` do usuário | → sem fase — o perfil cobre o caso real; só com pedido novo |
| Logotipo JPEG ou SVG | → sem fase — o PNG atende; cada formato abre um leitor de cabeçalho próprio |
| Imagem no corpo; hyperlink clicável; nota de rodapé; sumário automático | → sem fase — cada um abre partes e relações novas |
| Numeração automática de seções e de listas | → sem fase — muda o texto oficial (decisão 6) |
| Tamanhos, cores e estilos por documento ou por perfil (além de margens, fonte e tamanho do corpo) | → sem fase — só depois da comparação lado a lado, se algo não bater |
| Mais de um perfil por projeto, ou perfil por crew, na entrega (`--perfil` atende o comando avulso) | → sem fase — só com pedido real |
| Largura de coluna e alinhamento por coluna nas tabelas; data à direita | → sem fase — entra em `IDEIAS.md` se a comparação da ata pedir |
| PDF direto, sem o Word | → sem fase — precisa de motor de renderização; o Word salva como PDF |
| Da spec anterior: nome do arquivo pelo título e sufixo `-v2`; vários arquivos por chamada; `--crew` e a "conferência do texto"; modo plano (`entrega.documentos_em`) e as perguntas `--lembrar-documentos…`; `entrega.documentos` para `.md` sem formato; cabeçalho e rodapé por crew; citação, código e limpeza de HTML e de comentários; 3 níveis de recuo; carimbo SHA-256 da conferência | → sem fase — não servem ao caso real; a cópia para o projeto é da 1.9.0. Entram em `IDEIAS.md` numa entrada só, "Documento Word: o que a 1.10.0 não fez" |
| Dar `format: documento-oficial` aos passos de crews antigas; ativar por pedido em texto em conversa nova; tarefa avulsa no histórico | → U4 — conserto de crews antigas e modo equipe |
| Documento em outro idioma ("Página X de Y" e avisos só em PT-BR) | → U5 |
| Linha "Não medido" do verificador para `documento-oficial` | → U5 — o formato não tem limite a medir; hoje a linha aparece e não bloqueia |

## 9. Critérios de aceite
- [ ] Cenários com teste de mesmo ID, vistos vermelhos antes do código.
- [ ] `npm run verify` verde; os testes da R1 à U3a continuam passando (os que afirmam "sete
      pastas de canal" ganham a oitava, com entrada de correção na spec U3a-1).
- [ ] **Validação estrutural automática**, por teste: o pacote é relido por um leitor de zip
      próprio dos testes (diretório central, cabeçalhos locais, CRC por implementação
      independente), e conferem-se `[Content_Types].xml`, relações, XML bem formado e a ordem dos
      elementos (U3b-01), na referência e na ata de exemplo.
- [ ] **Execução real por agente**, no `sandbox/`, no papel da IA da IDE: `/opencrew documento`
      num `.md` sem perfil (pergunta do papel timbrado, `--criar-perfil`, perfil preenchido, Word
      gerado); nova geração com o texto alterado (a pergunta antes do `--substituir`); uma crew
      com um passo `documento-oficial` até a entrega. Registrar aqui o que ocorreu.
      *Feita em 2026-10-07, num projeto novo fora do repositório (Node 24):* as três partes
      rodaram; `DOCUMENTO:OK` com timbre, rodapé e logotipo no pacote; "já existe e está igual";
      a pergunta antes do `--substituir` (com "não" o arquivo não mudou); crew de ata com
      `format: documento-oficial` até `entrega/documentos/`, com o timbre, e `ENTREGA:OK`. Nada
      bloqueou. Quatro ajustes entraram antes da tag (a rota não exige onboarding; aviso de
      entrega sem papel timbrado; "Antes de usar" no LEIA-ME de documento; erro de perfil no
      prompt da entrega); o resto está em `IDEIAS.md`. O Word não foi aberto nessa execução.
- [x] **A ata como caso de aceite (dono):** o texto da ata real é escrito em markdown, no projeto
      dele (fora deste repositório), com o perfil e o logotipo reais; o Word é gerado e comparado
      com o original, lado a lado: cabeçalho, rodapé com "Página X de Y", margens, título,
      seções, as 3 tabelas, as assinaturas e o anexo em página nova. As diferenças são anotadas
      aqui; as de valor (†) viram ajuste antes da tag.
      *Feito em 2026-10-07:* o dono comparou a ata real, lado a lado, no Word, e aprovou ("mudou
      pouca coisa"). Os valores medidos na ata nesse dia estão na nota do começo da §4. A versão
      do Word usada na comparação não foi registrada.
- [ ] **Abrir no Word é conferência do dono**, não da porta: abre sem aviso de reparo e sem "Modo
      de Compatibilidade"; os títulos aparecem no painel de navegação; "Arquivo → Salvar como →
      PDF" gera o PDF. Data e versão do Word registradas aqui.
      *Pré-conferência automática em 2026-10-07 (não substitui a do dono):* a ata de exemplo
      (`tests/fixtures/ata-exemplo.md`, com perfil e logotipo fictícios) foi aberta por automação
      num Word 16.0 (build 16.0.20430), só para leitura e sem a opção de reparo: abriu, modo de
      compatibilidade 15, 4 páginas, 1 imagem e 1 tabela no cabeçalho, 2 campos no rodapé e 15
      títulos com nível de tópico (12 de nível 1, 3 de nível 2). A aparência e o PDF não foram vistos.
- [ ] No mesmo commit (regra 9): README, CHANGELOG 1.10.0, `GLOSSARIO.md`, `AGENTS.md` (regras 7 e
      15), `IDEIAS.md` (saem "Documentos oficiais em DOCX/PDF" e "Papel timbrado"; entra a
      entrada da §8) e a correção na spec U3a-1.
- [ ] `npm version minor --no-git-tag-version`; push do `main`, CI verde nas 4 células e só então
      a tag `v1.10.0`, com confirmação do dono.

## 10. Limites conhecidos
- A porta prova a estrutura, não a aparência: se o Word abre sem reparo e se o resultado bate com
  a ata, só o dono vê. LibreOffice e Google Docs ficam fora da promessa.
- Os valores com † (a fonte e o tamanho do corpo sem perfil, e o espaço das assinaturas) não vêm
  da ata: a ata usa Aptos 11, que entra pelo perfil. Tabelas saem com
  colunas iguais e texto à esquerda; a ata real pode ter larguras próprias.
- Um parágrafo por linha: texto partido em várias linhas vira vários parágrafos. Depende de o
  redator seguir o guia; crew antiga não o lê (→ U4).
- Número de item vai como texto: no Word, a numeração não continua sozinha. O que for mudado no
  Word não volta para o texto. Sem imagem no corpo, link clicável, sumário ou nota de rodapé.
- Um perfil por projeto; mudá-lo não muda os documentos já gerados. O logotipo vai inteiro para
  dentro de cada `.docx`. Linha que começa por `:::` e nome de marcação é sempre marcação.
- "Só APIs do Node 20.0" é regra de escrita: a porta só prova que `node:zlib` não é importado. A
  rota e a pergunta do papel timbrado são seguidas pela IA: os testes garantem o texto do prompt.

## 11. Travas que esta spec deixa
`tests/documento-pacote.test.js` (U3b-01) · `tests/documento-texto.test.js` (U3b-02) ·
`tests/documento-marcacoes.test.js` (U3b-09) · `tests/documento-perfil.test.js` (U3b-08) ·
`tests/documento-palavras.test.js`, com `tests/fixtures/documento-referencia.md` e
`tests/fixtures/ata-exemplo.md` (U3b-10) · `tests/documento.test.js` (U3b-03, 04) ·
`tests/entregar-documentos.test.js` (U3b-05; o U3a-14b passa a valer também para ele) ·
`tests/documento-contratos.test.js` (U3b-06, 07b) · `tests/package.test.js` (U3b-07a) ·
`tests/upgrade-u3b.test.js` (U3b-upg) · `tests/_documento.js` (leitor de zip, CRC independente,
leitor de XML, gerador de PNG e o `rodar` que prova o U3b-04j) e `tests/_documento-conferir.js`
(conferidor dos invariantes e da ordem, e os dois extratores de palavras), sem dependência
(U3b-01g, 01h, 10b) · `tests/template-refs.test.js` cobre os caminhos novos citados nos prompts ·
alerta de tamanho: nenhum módulo de `scripts/` acima de 200 linhas; nenhum teste acima de 300.
