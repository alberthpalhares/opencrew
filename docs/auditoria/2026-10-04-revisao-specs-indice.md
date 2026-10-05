# Revisão das specs (2026-10-04) — índice dos achados

> Lista bruta dos 265 achados da revisão, antes da consolidação. O documento que importa é
> `2026-10-04-revisao-specs.md`; este índice existe para rastrear os IDs citados lá.
> Severidade e veredito são os do segundo revisor (o que tentou refutar). Há repetição entre
> lentes de propósito: cada revisor trabalhou sem ver os outros.

## A — Coerência interna e testabilidade da U3 (37)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| A-01 | Alta | confirmado | U3 | «Só o aprovado» depende de um «passo final» que não lista saídas e de uma aprovação que não fica gravada em disco |
| A-02 | Alta | em parte | U3 | `vN` é contador por pasta e por passo, não versão do arquivo: «nunca mistura versões» é impossível e U3-01a não pega a implementação errada |
| A-03 | Alta | confirmado | U3 | `titulo:` no frontmatter de toda saída aciona as regras de Blog do verificador: bloqueio falso em documento, e-mail e post |
| A-04 | Alta | confirmado | U3 | Canais do frontmatter, pastas da saída e formatos do produto não batem: WhatsApp sem pasta, Twitter/X e YouTube sem canal, um e-mail só por run |
| A-05 | Alta | confirmado | U3 | `destino` é uma pasta só por crew: crew recorrente empilha `-v2`, `-v3` e mistura execuções diferentes |
| A-06 | Alta | confirmado | U3 | Crews que já existem não recebem a separação por canal com o `update` (regra 14), e o aceite manda testar justamente nelas |
| A-07 | Média | em parte | U3 | Regra 10: achado dentro de uma fonte pode fazer o `--corrigir` reescrever documento do usuário e parar o run toda vez |
| A-08 | Média | confirmado | U3 | Regra 3 se contradiz: título «Canal por frontmatter», texto «separados por seção»; arquivo com dois canais não cabe em `canal:` |
| A-09 | Média | confirmado | U3 | Origem de `hashtags.txt`, `seo.txt` (slug), `assunto.txt` e `artigo.md` não está definida; `hashtags.txt` conflita com «byte a byte» |
| A-10 | Média | em parte | U3 | «Pronto para colar» × «byte a byte»: a U1 conta o texto sem `**`, a U3 entrega com `**` |
| A-11 | Média | confirmado | U3 | Regra de imagens aplica o limite da API à entrega manual e deixa de fora peças válidas (imagem única, PNG, LinkedIn, Stories) |
| A-12 | Média | confirmado | U3 | Imagens: não está dito de qual pasta, em que ordem, com que nome, com que tolerância, nem o que entra quando há 11 |
| A-13 | Média | confirmado | U3 | Limites de imagem (2–10, 4:5–1,91:1) ficam em prosa e num segundo medidor, fora do `constraints:` — contra a regra 12 |
| A-14 | Média | confirmado | U3 | `ENTREGA:INCOMPLETA` tem dois sentidos; «aviso», código de saída, texto impresso e cópia para `destino` com pendência não estão definidos |
| A-15 | Média | confirmado | U3 | «Verificador em tudo que vai para entrega/» não funciona sobre `.txt`, e a entrega não sabe o `--formato` |
| A-16 | Média | confirmado | U3 | Regra 8 só cobre o caminho feliz do runner: falta o que fazer com pendência, com falha do script, com edição depois da entrega e com run antigo |
| A-17 | Média | confirmado | U3 | A entrega roda «ao fim», depois dos passos de publicação: o LEIA-ME manda postar o que já foi publicado, e sem publicação concluída não há entrega |
| A-18 | Média | confirmado | U3 | Regra 10: «citados», «pasta citada» e «parecidos» não têm definição; só há um cenário, e positivo |
| A-19 | Média | confirmado | U3 | Regra 9 (PDF): não diz o que acontece com crew existente que tem passo `format: pdf`, nem qual das quatro «listas de formatos» muda |
| A-20 | Média | confirmado | U3 | Testes e docs atuais exigem o contrário da regra 9, e o §13/§10 não os citam |
| A-21 | Média | confirmado | U3 | DOCX: a lista de recursos da regra 5 não fecha com as três partes exigidas em U3-02b, e as asserções não são verificáveis |
| A-22 | Alta | em parte | U3 | Nome `<titulo>.docx` sem regra: caracteres inválidos no Windows, título repetido ou ausente, e caminho que sai da pasta |
| A-23 | Média | confirmado | U3 | `entrega:` não tem quem preencha, `documentos: [docx]` não tem efeito descrito e `--destino` não tem regra |
| A-24 | Média | confirmado | U3 | Regra 11 (`update` e os blocos): faltam os casos de arquivo sem bloco (instalação até 1.4.1, como A e B), arquivo ausente, `.env.example` e repetição |
| A-25 | Média | confirmado | U3 | Rastreabilidade: regras 7, 2, 3, 5, 6 e 11 e duas linhas do §6 não têm cenário; nenhum cenário afirma `ENTREGA:OK` |
| A-26 | Baixa | em parte | U3 | Cenários agregados ou sem DADO/QUANDO: difícil ver vermelho por comportamento |
| A-27 | Média | confirmado | U3 | Herança perdida: a decisão do dashboard está alocada à U3 e não aparece na spec |
| A-28 | Média | confirmado | U3 | Herança perdida: a U1 mandou para a U3 a verificação de e-mail (assunto) e WhatsApp; a U3 entrega esses canais sem medir |
| A-29 | Baixa | em parte | U3 | Faltam na U3 seções e itens que U1/U2 têm: tabela de entradas, código de saída, o que a porta não cobre, travas de pacote e tamanho, aceite em checklist |
| A-30 | Média | confirmado | U3 | «O que o humano confere» custa um run inteiro, cai no fallback em A/B e não mede o objetivo |
| A-31 | Média | confirmado | U3 | O uso que motivou o DOCX (Projeto B) acontece fora do pipeline: com `--run` obrigatório, a conversão não alcança esses documentos |
| A-32 | Média | confirmado | U3 | `destino`: validação e erros de escrita incompletos (pasta inexistente, pastas reservadas, atalho para fora, «igual/diferente», arquivo aberto no Word) |
| A-33 | Baixa | confirmado | U3 | Nomes que confundem: pasta `fontes/` × «Fontes do projeto» do glossário; «Canal» sem definição; sufixo `-v2` × pastas `vN` |
| A-34 | Baixa | confirmado | U1 | U1 §4, glossário e comentário do script ainda descrevem dois estados do verificador; o terceiro (`AGUARDANDO_USUARIO`) só está nas Correções — e a regra 2 da U3 depende dele |
| A-35 | Baixa | confirmado | U2 | U2 §13 aponta os cenários do `update` para o arquivo de teste errado |
| A-36 | Baixa | confirmado | U3 | Itens empurrados para a U4 (papel timbrado, `repair` de crews antigas) não têm entrada no IDEIAS.md |
| A-37 | Baixa | confirmado | U3 | Zip «com node:zlib»: o CRC-32 pronto do Node só existe a partir do 20.15/22.2, e o pacote aceita Node 20.0 |

## B — U3 × runtime (payload) (24)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| B-01 | Alta | confirmado | U3 | Regra 1 não é implementável como escrita: não há registro do que foi aprovado nem do 'passo final', e vN não é a versão de um arquivo |
| B-02 | Alta | confirmado | U3 | A convenção de saída da U3 não existe no runtime e contradiz o 'Output Format' que o runner injeta dos best-practices |
| B-03 | Alta | confirmado | U3 | Crews já criadas (Projetos A e B) não recebem a separação por canal nem o DOCX; o aceite da própria spec depende delas |
| B-04 | Alta | confirmado | U3 | `titulo:` no frontmatter faz o verificador da U1 tratar o arquivo como blog e bloquear título acima de 70 caracteres |
| B-05 | Alta | confirmado | U3 | Destino fixo com nomes fixos: do segundo run em diante a pasta mistura execuções com `-v2`, `-v3` |
| B-06 | Alta | confirmado | U3 | Limites de imagem ficam fora dos `constraints:` e são medidos só na entrega, depois da revisão (regra 12 do AGENTS.md) |
| B-07 | Média | confirmado | U3 | A entrega roda 'ao fim', depois do passo irreversível; o publicador monta outra legenda e escolhe as imagens por outro critério |
| B-08 | Média | confirmado | U3 | Seleção de imagens: a regra trata toda imagem do run como carrossel de Instagram |
| B-09 | Média | confirmado | U3 | HTML dos slides: a spec copia se existir, mas nada garante que exista nem que abra fora da pasta de origem |
| B-10 | Média | confirmado | U3 | Regra 2 (verificação antes da entrega) deixa em aberto o que verificar, com qual formato e o que fazer com cada resultado |
| B-11 | Média | confirmado | U3 | Separação por seção: 'byte a byte' não combina com o leitor de seções do verificador nem com 'pronto para colar' |
| B-12 | Média | confirmado | U3 | Arquivos de §4 sem regra de origem e lista de canais diferente do catálogo de formatos |
| B-13 | Média | confirmado | U3 | Mais de uma peça do mesmo canal no run colide nos nomes fixos |
| B-14 | Média | confirmado | U3 | Export PDF: a regra 9 não aponta o que muda, e os testes e a doc atuais afirmam o contrário |
| B-15 | Média | confirmado | U3 | Ninguém pergunta o destino nem escreve `entrega:`; o bloco não é legível pelos leitores que os scripts têm hoje |
| B-16 | Média | confirmado | U3 | A entrega só existe no fim de um run de pipeline; o uso real do Projeto B é tarefa avulsa |
| B-17 | Baixa | em parte | U3 | Orçamento de linhas não declarado: runner, build e design já estão na faixa crítica e a U3 acrescenta texto aos três |
| B-18 | Média | confirmado | U3 | A decisão sobre o dashboard, alocada à U3, não aparece na spec |
| B-19 | Média | confirmado | U3 | Regra 10 (arquivos citados dentro das fontes): `--corrigir` passaria a editar o documento do usuário, e 'parecidos' não tem critério |
| B-20 | Média | confirmado | U3 | Item herdado da U1 ('verificar e-mail (assunto) e WhatsApp → U3') não aparece na U3 |
| B-21 | Média | confirmado | U3 | Crews que não produzem conteúdo de rede: falso 'INCOMPLETA' e entregáveis sem canal |
| B-22 | Alta | confirmado | U3 | DOCX: nome do arquivo sem saneamento, sintaxe da quebra de página com duas leituras e construções comuns sem regra |
| B-23 | Baixa | confirmado | U3 | ZIP sem dependências: `zlib.crc32` não existe em todo Node 20 aceito pelo pacote |
| B-24 | Baixa | confirmado | U3 | LEIA-ME: idioma do usuário, passo a passo que supõe o celular e canais sem imagem |

## C — U3 × CLI e scripts existentes (24)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| C-01 | Média | em parte | U3 | Regra 11 duplica o `.env.example` e o `.gitignore` em projetos instalados antes da 1.4.2 (sem marcador) — e a chave vazia do bloco vence |
| C-02 | Alta | confirmado | U3 | A convenção `titulo:` no frontmatter faz o verificador tratar documento e e-mail como post de blog |
| C-03 | Alta | confirmado | U3 | 'Verificar tudo o que vai para entrega/' mede a coisa errada: texto separado perde os limites e o HTML dos slides vira bloqueio |
| C-04 | Alta | confirmado | U3 | 'Só o aprovado' e 'última vN' não têm de onde ser lidos: o estado do run não vai para o disco e a vN é por pasta, não por arquivo |
| C-05 | Alta | em parte | U3 | Crews que já existem (Projetos A e B) não recebem a entrega por canal nem o .docx, e nenhum fluxo grava `entrega:` no crew.yaml |
| C-06 | Média | em parte | U3 | Regra 10 reaproveita 'pendência' e 'sugestão': o `--corrigir` passaria a reescrever o documento do usuário e um logo passaria a parar todo run |
| C-07 | Alta | confirmado | U3 | Várias execuções no mesmo `destino` se misturam (`01-v2.jpg`, `LEIA-ME-v2.md`) e um destino que mudou de lugar é recriado em silêncio |
| C-08 | Média | confirmado | U3 | O script não tem como saber o formato de cada arquivo: `canal:` não corresponde aos ids dos best-practices |
| C-09 | Média | confirmado | U3 | Bloqueio que o usuário já aceitou vira `ENTREGA:INCOMPLETA` para sempre; e o runner não sabe o que fazer com `INCOMPLETA` |
| C-10 | Média | confirmado | U3 | Regra 10 não diz o que é 'citar', onde procurar, o que é 'parecido' nem o que fazer com pastas — e o script atual não tem nada disso |
| C-11 | Baixa | em parte | U3 | Renovar o bloco apaga em silêncio o que o usuário mudou dentro dele; e a regra não diz o que fazer quando o arquivo não existe |
| C-12 | Média | confirmado | U3 | Três itens que os documentos mandam para a U3 não aparecem na spec: verificação de e-mail/WhatsApp, decisão do dashboard e a tabela única de canais |
| C-13 | Média | confirmado | U3 | Tirar o PDF quebra travas e promessas que existem hoje, e crew antiga com passo `format: pdf` fica sem caminho |
| C-14 | Média | confirmado | U3 | Travas da seção 13: arquivo de teste errado para U3-06a, teste de upgrade que nasce verde e travas que faltam |
| C-15 | Baixa | em parte | U3 | A spec não reserva espaço: `conferir-fontes.mjs` está em 189/200, `entregar.mjs` não cabe em um arquivo e o runner já está em 229% do alvo |
| C-16 | Média | confirmado | U3 | Padrões dos scripts: a spec segue a última linha `ENTREGA:…`, mas não fixa API, código de saída, validação de `--crew`/`--run` nem o que o runner faz se o script falhar |
| C-17 | Média | confirmado | U3 | DOCX 'sem dependências': `zlib.crc32` não existe em todo Node 20, não há parser de XML para o teste, e listas e cabeçalho são o que mais gera 'reparo' no Word |
| C-18 | Alta | confirmado | U3 | `documentos/<titulo>.docx` sem regra de nome: caractere proibido no Windows, caminho longo e dois documentos com o mesmo título |
| C-19 | Média | confirmado | U3 | 'Byte a byte' não se sustenta com o leitor de seções que já existe; `hashtags.txt` e `slug` não têm origem definida |
| C-20 | Média | confirmado | U3 | Regra 4 aplica a regra do carrossel do Instagram a toda imagem e não diz a que canal a imagem pertence |
| C-21 | Média | confirmado | U3 | A entrega roda 'ao fim', depois do passo de publicar — que hoje escolhe imagens e monta a legenda por conta própria |
| C-22 | Baixa | confirmado | U3 | A pasta `fontes/` da entrega usa uma palavra que o glossário já reservou para outra coisa |
| C-23 | Baixa | confirmado | U3 | Rodar o `entregar.mjs` duas vezes no mesmo run: 'nunca apaga' deixa sobras em `entrega/` |
| C-24 | Baixa | confirmado | U2 | A spec U2 aponta a trava dos cenários de update para o arquivo de teste errado |

## D — Viabilidade técnica (DOCX, zip, JPEG) (17)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| D-01 | Alta | em parte | U3 | A promessa "abre no Word e no LibreOffice sem aviso de reparo" não é verificável pela porta; U3-02a/b passam com .docx defeituoso |
| D-02 | Média | em parte | U3 | U3-02b lista só 3 partes; com elas os títulos viram texto comum e a numeração das listas some |
| D-03 | Alta | confirmado | U3 | Lista numerada automática muda o texto do documento oficial ("3." vira "1.", "2026." vira "1.", alíneas e parágrafos se fundem) |
| D-04 | Alta | confirmado | U3 | `titulo:` no frontmatter (seção 3) aciona a regra de blog do verificador: documento com título acima de 70 caracteres fica BLOQUEADO |
| D-05 | Alta | confirmado | U3 | `documentos/<titulo>.docx` sem regra de nome: no Windows, ":" grava um arquivo de 0 byte sem erro; "/", "?" e aspas dão ENOENT |
| D-06 | Alta | confirmado | U3 | Limites de imagem (2–10, 4:5–1,91:1) ficam fora de `constraints:`, são medidos depois da aprovação e valem para qualquer canal |
| D-07 | Baixa | em parte | U3 | `zlib.crc32` não existe no Node 20.0–20.14 (nem 22.0–22.1); `engines` promete >=20.0.0 e o CI não pega |
| D-08 | Média | confirmado | U3 | "quebra de página (`---` entre `<!-- pagina -->`)" é ambígua e conflita com U3-02d, com o frontmatter e com "HTML solto" |
| D-09 | Média | confirmado | U3 | O subconjunto de Markdown do documento oficial não está definido, e nenhum best-practice ensina o redator a ficar dentro dele |
| D-10 | Média | em parte | U3 | Faltam as decisões de formato do documento (A4, margens, fonte, idioma, bordas) e a entrada de cabeçalho/rodapé |
| D-11 | Média | confirmado | U3 | U3-02c não cobre caractere de controle; o resultado é um zip válido com XML que o Word não abre |
| D-12 | Média | confirmado | U3 | Leitura do JPEG: a spec não diz como ler nem a tolerância; comparação estrita recusa 1200×628, e um `.jpg` pode ser PNG por dentro |
| D-13 | Alta | confirmado | U3 | "Rodar de novo não duplica" exige .docx idêntico byte a byte; data no zip ou no LEIA-ME quebra isso, e o destino único mistura runs |
| D-14 | Média | em parte | U3 | A fase soma cerca de 1.200 linhas de script em ~11 módulos (o runtime inteiro tem 538); a spec não prevê a divisão e `conferir-fontes.mjs` estoura o alvo |
| D-15 | Baixa | em parte | U3 | Motor do .docx: registrar a decisão; recomendo gerador próprio em perfil fechado, sem compressão e sem numeração automática |
| D-16 | Média | confirmado | U3 | PDF: a regra 9 manda abrir o Word, mas o README promete "PDF … sem abrir editor nenhum"; o aceite não cita o README |
| D-17 | Média | confirmado | U3 | Os cenários não dizem como provar "zip válido" e "XML válido" com `node:test` (o Node não tem leitor de zip nem parser XML) |

## E — Produto e jornada do usuário (22)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| E-01 | Alta | confirmado | U3 | Mesmo destino toda semana: a regra do sufixo -v2 mistura execuções e deixa o carrossel inutilizável |
| E-02 | Alta | em parte | U3 | Crews criadas antes da 1.7.0 não ganham a entrega por canal: a regra 14 fica adiada para a U4 e a conferência da §9 não fecha com os Projetos A e B |
| E-03 | Alta | confirmado | U3 | A estrutura de saída por canal não está definida — e o payload hoje ensina os agentes a escrever em outro formato (=== CAPTION ===) |
| E-04 | Alta | confirmado | U3 | 'titulo:' em toda saída faz o verificador tratar tudo como post de blog: falso bloqueio 'Título (SEO)' em documentos e redes |
| E-05 | Média | em parte | U3 | O Word só nasce dentro de uma execução completa; o uso real do Projeto B acontece fora do pipeline |
| E-06 | Média | confirmado | U3 | 'Ao fim' roda depois da publicação automática: o LEIA-ME manda postar o que já foi postado e a conferência de imagem chega tarde |
| E-07 | Média | confirmado | U3 | WhatsApp e e-mail: o best-practice manda usar {{name}}, o verificador bloqueia {{…}}, e a herança 'verificar e-mail e WhatsApp' da U1 não está na §2 |
| E-08 | Média | confirmado | U3 | O destino só existe para quem edita o crew.yaml: ninguém pergunta onde guardar |
| E-09 | Média | confirmado | U3 | Formatos do catálogo sem canal e imagens tratadas todas como carrossel de Instagram: saída aprovada pode sumir da entrega |
| E-10 | Média | confirmado | U3 | Pesquisa e análise não têm caminho de entrega definido (e o Discovery ainda oferece 'PDF report') |
| E-11 | Média | confirmado | U3 | PDF: 'exportar pelo Word' só é aceitável se o LEIA-ME ensinar; README, runner e crews com 'format: pdf' continuam prometendo PDF |
| E-12 | Média | confirmado | U3 | O .docx especificado não garante o mínimo de um documento oficial: sem A4, sem estilos reais, sem número de página |
| E-13 | Média | confirmado | U3 | Nome do documento: '<titulo>.docx' sem regra de caracteres, tamanho, data ou versão |
| E-14 | Média | em parte | U3 | LEIA-ME sem alertas, sem identificação e sem 'o que não foi conferido': ENTREGA:OK lê-se como 'pode publicar' |
| E-15 | Média | em parte | U3 | Passos e formatos pensados para quem é técnico: 'abra o app' com as imagens no computador; LEIA-ME.md, artigo.md e corpo.md |
| E-16 | Média | confirmado | U3 | ENTREGA:INCOMPLETA não diz o que acontece com os arquivos nem o que o runner oferece; conflita com 'Aceitar assim mesmo' |
| E-17 | Média | confirmado | U3 | 'Saída listada no passo final' e 'saída aprovada' não existem em disco: o script não tem como saber o que entra |
| E-18 | Baixa | em parte | U3 | A spec junta cinco entregas independentes; a menor U3 que resolve cabe em fatias publicáveis |
| E-19 | Baixa | confirmado | U3 | Decisão do dashboard, alocada para a U3, não aparece na spec |
| E-20 | Baixa | confirmado | U3 | Pasta 'fontes/' na entrega colide com o termo 'Fontes do projeto' da U2 |
| E-21 | Baixa | confirmado | U3 | Rodadas com a diretoria: o que for alterado no Word não volta para a crew — limite não declarado |
| E-22 | Baixa | em parte | U3 | Reentrega depois de 'editar este conteúdo': não está dito se a entrega/ do run é refeita |

## F — Saídas reais (Projeto A; o B estava inacessível) (23)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| F-01 | Alta | confirmado | U3 | Regra 1 trata `vN` como versão do pacote; no runner ela é um contador por grupo que sobe a cada passo |
| F-02 | Alta | em parte | U3 | «Saída listada no passo final» e «aprovado» não existem em disco de forma legível por script |
| F-03 | Média | em parte | U3 | O único run aprovado real (crew criada e rodada na 1.6.0) não tem pasta de run nem `vN` |
| F-04 | Alta | em parte | U3 | Regra 3 depende de `canal:` e de cabeçalhos que não existem; o canal já está no `format:` do passo |
| F-05 | Média | em parte | U3 | As seções reais misturam texto de colar com metadados; hashtags ficam dentro da legenda — «byte a byte» e `hashtags.txt` se contradizem |
| F-06 | Média | confirmado | U3 | Um run real traz vários posts do mesmo canal no mesmo arquivo; §4 só prevê `post.txt` |
| F-07 | Média | confirmado | U3 | Lista fechada de canais não cobre o uso real (canal de best-practice local, WhatsApp, apresentação em HTML) |
| F-08 | Alta | confirmado | U3 | Regra 4 descarta todas as imagens de uma crew real: o runtime gera PNG, em pasta própria, e mistura canais |
| F-09 | Média | confirmado | U3 | Entrega final em HTML/PDF não tem regra; o HTML de um documento pode cair em `fontes/slides-html/` |
| F-10 | Alta | confirmado | U3 | `destino` como pasta fixa que recebe a árvore `entrega/` inteira não representa como os resultados são guardados |
| F-11 | Média | confirmado | U3 | «Ao fim» do runner não diz o que fazer com rascunho, passo irreversível e crew que já copia para o projeto |
| F-12 | Média | confirmado | U3 | O run aprovado real tem `[PREENCHER]` em todos os canais; a spec não diz o que a entrega INCOMPLETA produz |
| F-13 | Alta | confirmado | U3 | `documentos/<titulo>.docx`: título real tem dois-pontos; no Windows o Node grava um arquivo vazio sem dar erro |
| F-14 | Média | confirmado | U3 | Regra 10 aplicada ao manual de marca real gera ~15 pendências em todo run e arrisca reescrever a fonte do usuário |
| F-15 | Baixa | em parte | U3 | Workspace real na 1.6.0 não tem bloco marcado no `.gitignore` nem no `.env.example`; U3-06a só prevê «renovar o bloco» |
| F-16 | Baixa | em parte | U3 | Projetos reais ficam em pasta sincronizada (OneDrive, Google Drive); a spec não prevê erro de leitura/escrita nem abrir o `.docx` no Google |
| F-17 | Média | confirmado | U3 | O exemplo de `entrega:` tem comentário na linha e caminhos reais têm espaço e acento; falta dizer como o script lê o `crew.yaml` e o que o runner faz se o script falhar |
| F-18 | Média | confirmado | U3 | A entrega só existe amarrada a um run; no Projeto B quase tudo foi tarefa avulsa, fora do pipeline |
| F-19 | Média | em parte | U3 | U3-02b lista três partes do `.docx`, mas a regra 5 promete recursos que exigem outras |
| F-20 | Média | em parte | U3 | Documentos institucionais (Projeto B): a numeração tem de sair literal — não pude conferir os arquivos |
| F-21 | Média | confirmado | U3 | Blog: a spec pede `titulo:` e slug; o real usa `title:`, não tem slug e o `.md` não é «pronto para colar» |
| F-22 | Baixa | confirmado | U3 | Pasta `fontes/` da entrega colide com o termo «Fontes do projeto» do glossário |
| F-23 | Média | confirmado | U3 | Itens que outros documentos alocam na U3 e a spec não herda nem descarta (dashboard; verificação de e-mail e WhatsApp) |

## G — Coerência entre documentos e portão de fase (30)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| G-01 | Alta | confirmado | U3 | `titulo:` obrigatório em toda saída faz o verificador tratar documento, e-mail e WhatsApp como post de blog (título até 70) |
| G-02 | Alta | confirmado | U3 | Crews já existentes (inclusive as dos Projetos A e B) ficam sem pastas por canal e sem .docx até a U4: fere a regra 14 e torna a conferência da §9 inexecutável |
| G-03 | Alta | confirmado | U3 | Limites de imagem (2 a 10, 4:5 a 1,91:1, só JPEG) ficam fixos no `entregar.mjs`: contraria a regra 12 e a decisão da U1 sobre o que é bloqueio |
| G-04 | Alta | confirmado | U3 | `vN` não é a versão do arquivo: é uma pasta por grupo que sobe a cada passo. "Só v2 entra" perde entregáveis e "nunca mistura versões" é impossível |
| G-05 | Média | em parte | U3 | "Saída aprovada" e "passo final" não existem em disco: o script não tem como saber o que entregar sem depender de itens da U4 |
| G-06 | Média | confirmado | U3 | Ordem entre entrega e publicação não está definida; o publicador usa outra legenda e outra seleção de imagens |
| G-07 | Média | confirmado | U3 | Verificador rodando de novo na entrega colide com decisões da U1 (aceitar assim mesmo, AGUARDANDO_USUARIO, `--formato`, falha do script) |
| G-08 | Média | confirmado | U3 | Portão de entrada: a decisão do dashboard (publicar ou remover) foi alocada para a U3 e sumiu da spec |
| G-09 | Média | confirmado | U3 | Portão de entrada: "verificar e-mail (assunto) e WhatsApp", prometido pela U1 para a U3, não foi herdado; a U3 cria os canais sem medir |
| G-10 | Média | confirmado | U3 | Portão de entrada: "U3 padroniza a estrutura de saída por canal" (limite da U1) não virou contrato; nenhum prompt manda usar os cabeçalhos de que a entrega depende |
| G-11 | Média | confirmado | U3 | "Byte a byte" contradiz a contagem da U1 (que ignora negrito/itálico) e o arquivo `hashtags.txt` contradiz a legenda inteira |
| G-12 | Baixa | confirmado | U3 | A pasta `fontes/` da entrega usa o termo que o GLOSSARIO reserva para "Fontes do projeto" (U2) |
| G-13 | Média | confirmado | U3 | Conferir arquivos citados dentro das fontes: do jeito escrito, o `--corrigir` da U2 reescreveria o documento do usuário e o run pararia em toda execução |
| G-14 | Média | confirmado | U3 | `canal:` duplica o `platform:` que os best-practices já têm, deixa Twitter e YouTube de fora e não resolve arquivo com vários canais |
| G-15 | Média | confirmado | U3 | GLOSSARIO desatualizado para "Bloqueio" e "Verificador"; "pendência" e "aviso" não têm verbete nem efeito definido sobre `ENTREGA:` |
| G-16 | Média | em parte | U3 | No destino, o sufixo `-v2` usa a mesma notação do `vN` do run e mistura execuções na mesma pasta; destino que não existe não tem regra |
| G-17 | Média | confirmado | U3 | Ninguém pergunta ao usuário onde entregar: `entrega.destino` só existe se ele editar o YAML à mão |
| G-18 | Média | confirmado | U3 | Tirar o PDF: a spec só cita o `export.prompt.md`, mas README, Discovery, runner e uma trava de teste ainda exigem o PDF |
| G-19 | Baixa | em parte | U3 | A escolha do motor de DOCX/PDF, que o IDEIAS reservou para aprovação do dono, chega decidida e sem alternativas; o motivo do "PDF sem fase" não vale para slides |
| G-20 | Média | confirmado | U3 | Itens empurrados sem motivo ou para destino sem relação: `.dotx` → U4, "publicação automática → sem fase", e `entrega.cabecalho` meio dentro, meio fora |
| G-21 | Média | confirmado | U3 | A U3 cria promessas novas sem trava e sem lugar no AGENTS.md (script que escreve no projeto do usuário; .docx que "abre sem reparo") |
| G-22 | Baixa | em parte | U3 | Tamanho (regra 6): um único `entregar.mjs` para sete trabalhos, `conferir-fontes.mjs` a 11 linhas do alvo e runner já em 916 linhas |
| G-23 | Média | confirmado | U3 | Spec mais rasa que U1/U2 no contrato do script: sem tabela de entradas, sem código de saída, e várias regras sem cenário (logo, sem teste) |
| G-24 | Baixa | em parte | U3 | O aceite não mede o objetivo da fase: a jornada de referência (U0) ficou de fora e não há rodada completa registrada desde a 1.5.0 |
| G-25 | Baixa | em parte | U3 | O portão da U3 parte de inventário velho: sem auditoria de fim de fase da U1 e da U2, emenda com cerca de 20 achados sem trilha, IDEIAS e README desatualizados |
| G-26 | Baixa | em parte | U3 | Dor real sem dono: "caminhos de saída congelados no 1º run" (Projeto B) não entrou na U2 nem na U3, e a entrega depende desses caminhos |
| G-27 | Baixa | confirmado | U3 | `update` renovando `.gitignore` e `.env.example`: só um cenário, e faltam os casos de instalação antiga e de arquivo ausente |
| G-28 | Baixa | confirmado | U3 | LEIA-ME fixo em PT-BR contradiz a regra de idioma do `system.md` para quem escolheu outro idioma |
| G-29 | Baixa | em parte | U3 | Exemplos da spec usam nomes de pasta e de arquivo dos projetos reais; os da U2 já foram parar no payload e nos testes |
| G-30 | Baixa | confirmado | U3 | "Modelo sugerido" foi copiado das outras specs, mas a U3 tem um bloco de formato binário que nenhum teste automático valida por inteiro |

## H1 — Spec F1 (1.4.2) × código (20)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| H1-01 | Média | em parte | F1 | Crews criadas antes da 1.4.2 continuam sem as proteções F1-08/F1-09, e o destino do conserto ('F3') não existe mais |
| H1-02 | Baixa | em parte | F1 | O update sobre uma instalação interrompida carimba o workspace como completo e o init passa a se recusar a retomar |
| H1-03 | Média | confirmado | U3 | U3-06 herda da F1 o 'update renova o bloco do .gitignore', mas só cobre workspace 1.6.0 e só o .gitignore |
| H1-04 | Média | confirmado | F1 | blotato e resend seguem sem confirmação explícita e sem side_effects: irreversible; o item (T-M4) ficou sem trilha |
| H1-05 | Baixa | em parte | F1 | F1-01d deixou de ser verdade na 1.6.0: o update recria um CLAUDE.md que não existia |
| H1-06 | Média | em parte | U2 | Detecção de IDE pela palavra 'opencrew' cria ponte de IDE que o usuário nunca instalou |
| H1-07 | Média | confirmado | U3 | A U3 não diz se a entrega roda antes ou depois dos passos irreversíveis definidos na F1 |
| H1-08 | Média | confirmado | U3 | O publicador do Instagram remonta a legenda na hora de publicar; a U3 cria outra legenda oficial (legenda.txt) |
| H1-09 | Média | confirmado | U3 | A regra 4 da U3 aplica à entrega manual os limites do publicador de carrossel: post de 1 imagem e Stories 9:16 ficam de fora |
| H1-10 | Média | confirmado | F1 | A regra 'irreversível imediatamente depois de um checkpoint' não fecha quando há dois passos de publicação |
| H1-11 | Baixa | em parte | F1 | A spec diz que a legenda 'nunca' vai interpolada no shell, mas o publish.js ainda aceita --caption |
| H1-12 | Média | confirmado | F1 | Status 'implementada' com a conferência manual de publicação nunca registrada |
| H1-13 | Média | confirmado | U3 | A decisão 'dashboard: publicar ou remover' foi alocada na U3 e não aparece na spec U3 |
| H1-14 | Baixa | em parte | F1 | Destinos 'F2', 'F3' e 'F4' apontam para fases que deixaram de existir; um dos itens já foi feito |
| H1-15 | Baixa | confirmado | F1 | O --dry-run do Instagram já envia as imagens ao imgBB e cria os contêineres; a spec não define o que o dry-run faz |
| H1-16 | Baixa | confirmado | F1 | Mensagens e códigos de saída de §4 e §6 não batem com o CLI |
| H1-17 | Baixa | confirmado | F1 | §13 cita arquivos de teste errados e a F1-11a não tem teste com o ID |
| H1-18 | Baixa | confirmado | F1 | 'Byte a byte' não vale para arquivo em CRLF ou com linhas em branco no fim |
| H1-19 | Baixa | confirmado | F1 | publish.js é ESM com extensão .js; o limite (T-B14) não está na spec e o destino 'F4' morreu |
| H1-20 | Baixa | em parte | U3 | U3 §6 não cobre uso errado do entregar.mjs (a lição do parser estrito da F1) |

## H2 — Spec U1 (1.5.0) × código (18)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| H2-01 | Alta | confirmado | U1 | O verificador não reconhece o formato de saída que os próprios best-practices ensinam; o relatório diz "Nada a apontar" |
| H2-02 | Alta | confirmado | U1 | Spec diz `--arquivo` = `.md`, mas o runner manda verificar todas as saídas (HTML, imagem); uma cor `#666666` vira "Placeholder" e força REJECT |
| H2-03 | Alta | confirmado | U3 | Convenção da U3 (`titulo:` em toda saída) colide com a detecção de blog da U1: documento com título longo é bloqueado como "Título (SEO)" |
| H2-04 | Média | confirmado | U1 | Termo proibido casa dentro de outras palavras, e o termo que o usuário mandou PREFERIR também vira proibido |
| H2-05 | Média | confirmado | U1 | Proibições antigas (sem aspas) não viram trava e o usuário não é avisado |
| H2-06 | Média | confirmado | U1 | `max_review_cycles` não é definido em lugar nenhum, e a U1 apagou a saída do laço quando o limite chega SEM bloqueio |
| H2-07 | Média | confirmado | U1 | "Aceitar assim mesmo (fica registrado)" não tem onde ser registrado; a U3 não sabe que o bloqueio foi aceito |
| H2-08 | Média | confirmado | U1 | As regras do revisor (regra 9) só chegam a crews novas; crews já criadas não as recebem com o `update` |
| H2-09 | Baixa | em parte | U1 | Corpo da spec desatualizado: terceiro estado `AGUARDANDO_USUARIO`, três IDs de teste sem cenário, overlay local e listas da regra 5 |
| H2-10 | Média | confirmado | U1 | Validações e mensagens prometidas que o script não tem: `--crew` inexistente passa; "sem limite definido no formato" nunca aparece |
| H2-11 | Média | confirmado | U1 | Leitura de seções frágil: `---` corta a seção, cabeçalho-pai soma as legendas, e a contagem de slides quase nunca acontece |
| H2-12 | Média | confirmado | U1 | Verificação "tudo ou nada": um caminho ruim ou um link malformado derruba a checagem de todos os arquivos |
| H2-13 | Média | confirmado | U3 | "Verificar e-mail (assunto) e WhatsApp → U3" não foi herdado pela U3; outros limites de `constraints:` seguem sem medição e sem destino |
| H2-14 | Média | confirmado | U1 | Status "implementada" com critérios de aceite em aberto: nenhuma execução real com o verificador no laço foi registrada |
| H2-15 | Baixa | confirmado | U1 | Placeholders com falso positivo em texto verdadeiro: "XXX Congresso", CEP e números com seis dígitos iguais |
| H2-16 | Baixa | em parte | U1 | O relatório é salvo pela IA (transcrição do stdout), não pelo script |
| H2-17 | Baixa | confirmado | U1 | Contagem de caracteres igual para todos os canais; o X/Twitter conta emoji e link com peso diferente |
| H2-18 | Baixa | confirmado | U1 | Trava do U1-05 não cobre os 4 arquivos corrigidos depois (1080×1440) |

## H3 — Spec U2 (1.6.0) × código (21)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| H3-01 | Alta | confirmado | U2 | Overlay local (regra 6): cópia inteira congela os limites e arquivo local sem `constraints:` desliga o verificador em silêncio |
| H3-02 | Média | confirmado | U2 | C-12 consta como herdado e coberto, mas `--repair-bridges` sem `--ide` ainda cria pontes de todas as IDEs |
| H3-03 | Média | em parte | U2 | `fontes:` não chega às crews que já existem: só o discovery/build de crew nova pergunta e grava |
| H3-04 | Média | confirmado | U2 | A conferência não vê `fontes:` com comentário na linha (formato do exemplo do próprio build) nem caminhos em tasks e agentes |
| H3-05 | Média | confirmado | U2 | Contrato do runner para a conferência: falha do script, ordem de leitura e recarga depois de corrigir não estão definidas |
| H3-06 | Média | confirmado | U2 | Convivência não chega às instalações mais antigas: ponte sem marcadores (≤ 1.2.2) continua mandando "adotar o papel" depois do update |
| H3-07 | Média | confirmado | U2 | Best-practice criada no overlay local não é enxergada por discovery, design e build |
| H3-08 | Média | confirmado | U2 | T-M5 (Regra de Ouro) consta como herdado em U2-04, mas não tem regra nem cenário e continua quebrado |
| H3-09 | Média | confirmado | U2 | `.mcp.json`: o update cria o arquivo, repõe o servidor que o usuário removeu e regrava sem cópia — a regra 14 só fala em merge |
| H3-10 | Média | confirmado | U2 | Detecção de IDE por "contém a palavra opencrew" cria ponte de IDE não instalada; o resumo cita Codex indevidamente |
| H3-11 | Média | confirmado | U2 | Agentes-base, config e templates de crew nunca recebem melhoria, mesmo sem edição do usuário; template apagado volta a cada update |
| H3-12 | Média | confirmado | U2 | Itens adiados e itens feitos sem rastro nos documentos de roteiro; sem auditoria de fim de fase da U2 |
| H3-13 | Baixa | confirmado | U2 | §13 e cabeçalho apontam arquivos errados; testes U2-06d/U2-06e não têm cenário em §8 |
| H3-14 | Baixa | confirmado | U2 | Manifesto corrompido: o "aviso" prometido não existe; `{"files": null}` derruba o update; sem teste |
| H3-15 | Baixa | confirmado | U2 | Mensagens da conferência que enganam: "Nada a corrigir." com pendência, pasta sem barra final e limite de 20.000 entradas calado |
| H3-16 | Baixa | confirmado | U2 | Alerta "não é portátil" nunca vira oferta de correção, e a spec não diz que o status fica OK |
| H3-17 | Baixa | confirmado | U2 | §7 afirma "só lê/escreve dentro do projeto", mas `--crew` não é validado e `--corrigir` altera arquivo fora |
| H3-18 | Baixa | confirmado | U2 | A jornada U0 não confere o que a spec manda para ela; a lista de regras "seguidas pela IA" está incompleta |
| H3-19 | Baixa | em parte | U2 | "Restos antigos" cobre só 5 pastas e só `.md`; `_build/` e logs na raiz, citados na herança, não geram aviso |
| H3-20 | Média | confirmado | U3 | Decisão do dashboard está alocada para a U3 em dois documentos e a spec U3 não a herdou |
| H3-21 | Baixa | confirmado | U2 | Termos novos da U2 fora do GLOSSARIO: manifesto e cópia de segurança; definição de best-practice ficou só "core" |

## I — Segurança e proteção do dado (16)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| I-01 | Alta | confirmado | U3 | Destino fixo + nomes fixos por canal + sufixo por arquivo: do 2º run em diante a pasta de destino mistura execuções |
| I-02 | Alta | confirmado | U3 | ENTREGA:INCOMPLETA também é copiada para o destino; a versão com bloqueio fica para sempre na pasta oficial com o nome limpo |
| I-03 | Alta | confirmado | U3 | Nome do .docx vem do `titulo:` cru: dois-pontos grava arquivo vazio no Windows, `../` escapa da pasta, `/ ? "` derrubam o script |
| I-04 | Média | em parte | U3 | Rodar o entregar.mjs duas vezes no mesmo run: "nunca apaga" contradiz "nunca mistura versões" |
| I-05 | Média | confirmado | U3 | Idempotência não se sustenta: .docx e LEIA-ME mudam a cada execução; "igual" não está definido; variantes com sufixo não são comparadas |
| I-06 | Média | confirmado | U3 | "Destino validado" não diz qual validação: a checagem usada hoje aceita a raiz, pastas do sistema e junction que sai do projeto |
| I-07 | Média | confirmado | U3 | Falha de escrita no meio da cópia (pasta de nuvem, arquivo aberto no Word, sem permissão) não tem comportamento definido |
| I-08 | Média | confirmado | U3 | DOCX: escapar `&` e `<` não basta para "abrir sem aviso de reparo"; links e imagens do markdown não têm destino definido |
| I-09 | Baixa | em parte | U3 | HTML dos slides leva o caminho absoluto do computador do usuário para a pasta compartilhada, e não reabre em outro computador |
| I-10 | Média | em parte | U3 | Regra 11: renovar o bloco apaga, sem cópia, o que o usuário mudou dentro dele; instalação até 1.4.1 ganha tudo duplicado |
| I-11 | Média | confirmado | U3 | Regra 10: `--corrigir` passaria a reescrever documentos do usuário (manual de marca); leitura sem limite e fora do projeto; pendência repetida a cada run |
| I-12 | Média | confirmado | U3 | "Só o aprovado": não existe marca de aprovação em disco para o script ler |
| I-13 | Baixa | confirmado | U3 | `--crew` e `--run` do entregar.mjs sem validação declarada (a U1 tem tabela; a U3 não) |
| I-14 | Baixa | confirmado | U2 | U2: a spec promete "só lê/escreve dentro do projeto", mas o conferir-fontes aceita `--crew` e caminhos de fora; `caminho:` com comentário no fim é ignorado em silêncio |
| I-15 | Baixa | em parte | U3 | Zip "com node:zlib": `zlib.crc32` só existe a partir do Node 20.15 / 22.2, e o pacote promete Node 20.0 |
| I-16 | Baixa | confirmado | U3 | Imagem: validar pelo conteúdo, não pela extensão (PNG salvo com nome .jpg) |

## Z — Crítico de completude (13)

| ID | Sev. | Veredito | Spec | Achado |
|---|---|---|---|---|
| Z-01 | Alta | em parte | U3 | Contradição entre achados: fonte do «canal» (frontmatter × `format:` do passo) e migração das crews antigas pelo `update` × «crews/ nunca é tocado» |
| Z-02 | Média | confirmado | U3 | «Raiz do projeto» é o diretório atual do terminal: fora dela o verificador responde OK sem medir e o `destino` cai na pasta errada |
| Z-03 | Média | confirmado | U3 | Seleção de agentes por run não entra na conta: passo pulado vira «saída faltando», run sem revisor não tem «aprovado» e run «só texto» recebe aviso de imagem |
| Z-04 | Média | em parte | U3 | Contradição entre achados: «INCOMPLETA não vai para o destino» (I-02) × «bloqueio aceito e [PREENCHER] existem no run real» (C-09, F-12, E-16, H2-07) |
| Z-05 | Média | em parte | U3 | Contradição entre achados: três formatos de `destino` que não valem juntos (subpasta por run × pasta por tipo de entrega × data no nome do arquivo) |
| Z-06 | Média | confirmado | U3 | Contradição entre achados: entrega de tarefa avulsa (A-31, B-16, E-05, F-18) × «só o aprovado, verificado antes» (regras 1 e 2; A-01, B-01, C-04, I-12) × modo equipe alocado na U4 |
| Z-07 | Média | em parte | U3 | Andaime do pipeline pode ir parar na entrega: relatórios e arquivos de serviço na pasta do run, e seções de serviço dentro dos textos |
| Z-08 | Baixa | em parte | U3 | U2 × U3: o ciclo fonte → entrega → fonte não fecha (destino dentro de uma pasta de `fontes:`; o `.md` aprovado não é entregue) |
| Z-09 | Baixa | em parte | U3 | Ordem e risco: a parte com mais decisões abertas (entrega por canal) depende da U4; DOCX, `.gitignore` e PDF não dependem de nada e podem sair antes |
| Z-10 | Média | confirmado | U3 | A regra 9 só trata o PDF: `formatted-post` e `csv` do mesmo export continuam prometidos, sem caminho de uso e em conflito com a entrega |
| Z-11 | Baixa | confirmado | U3 | Idioma: nomes de pasta, arquivo e chave em PT-BR contrariam o `system.md`, e a separação por canal depende de cabeçalho que o agente traduz |
| Z-12 | Baixa | confirmado | U3 | Sem `destino`, a entrega mora numa área descartável e difícil de reencontrar |
| Z-13 | Baixa | confirmado | U3 | Node mínimo: os cinco achados do `zlib.crc32` e o C-18 da auditoria são a mesma decisão, e os scripts do runtime não conferem a versão |

