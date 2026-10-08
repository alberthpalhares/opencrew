# Changelog

All notable changes to opencrew are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.15.0] — 2026-10-08

Fase U5, fatia 4: "Modo equipe" (`specs/fase-u5d-modo-equipe.md`). Chega a quem já usa com um
`npx @aksp/opencrew@latest update`; nenhuma crew precisa mudar.

Esta é a última versão da fase de fechamento: **o projeto entra em manutenção**. O que ficou de
fora está no `IDEIAS.md`, e o `CONTRIBUTING.md` diz como retomar.

### Added
- **`/opencrew pedir <nome> "<tarefa>"` — pedido avulso à crew.** Uma tarefa só, fora do pipeline:
  um agente da crew faz, com a memória, as proibições, as fontes e o guia do tipo de texto; o
  verificador confere (e o revisor, se a crew tem um); você aprova, pede ajuste ou cancela; sai a
  entrega de sempre e o pedido entra no histórico da crew, com o tema começado por "Pedido:".
  Também vale em texto ("peça à crew X: …"). Se a conversa cair, `/opencrew retomar` continua.
  Um pedido não publica nem envia, e usa um agente só.
- **Documento Word por pedido em texto.** "Transforma {arquivo} em Word", dito em qualquer conversa,
  leva ao mesmo caminho do `/opencrew documento`.
- **"Nenhum" é uma resposta no conserto.** Se a crew não precisa ler arquivo do projeto, o
  `/opencrew repair` grava isso (`fontes: []`) e o ponto deixa de aparecer como pendente.

### Changed
- **Correção pedida no meio da execução tem procedimento.** Quando você pede uma mudança numa
  aprovação do meio, o agente que escreveu o arquivo reescreve, numa versão nova, o arquivo é
  conferido e a aprovação é mostrada de novo — antes o texto só mandava anotar na memória e seguir,
  e o revisor podia receber o texto sem a correção. Dado que você fornece para um `[PREENCHER]`
  segue o mesmo caminho e não conta como correção.
- O executor de pipeline ficou 6 linhas menor (554): essa regra foi para uma parte lida só quando
  há correção.

### Limites
- Quem escolhe o agente e o formato do pedido é a IA; você confere na pergunta "Posso começar?".
- O pedido não procura sozinho o que a crew produziu antes: diga qual arquivo.

## [1.14.0] — 2026-10-08

Fase U5, fatia 3: "Execução registrada" (`specs/fase-u5c-execucao-registrada.md`). Chega a quem já
usa com um `npx @aksp/opencrew@latest update`; as crews e as execuções antigas ficam como estão.

Ainda não nesta versão: o pedido avulso à crew (1.15.0).

### Added
- **`/opencrew retomar <nome>`.** A execução que parou no meio — a conversa caiu, o contexto
  acabou — continua de onde parou, em qualquer conversa nova. A IA mostra o tema, o que já está
  pronto e de que passo vai seguir, e espera o seu sim. O que foi gravado e conferido não é
  refeito; o passo que estava no meio é refeito inteiro.
- **Registro da execução.** Cada execução deixa na pasta dela um `execucao.json`, gravado por
  script a cada passo: o tema, os passos conferidos, as suas respostas nas aprovações e os
  vereditos da revisão. A IA não escreve nesse arquivo. Não há comando a mais por passo: o
  registro pega carona no que a execução já rodava.
- **`/opencrew repair` olha o histórico.** Pasta de execução sem linha no `runs.md` vira um ponto
  do conserto: ele pergunta o tema e grava a linha como `Registrada depois`, com cópia
  `runs.md.bak`. Linha sem pasta e pasta vazia são só apontadas: nada é apagado.

### Changed
- **O histórico (`runs.md`) é gravado pelo script, não pela IA** — também quando a execução é
  abortada ou rejeitada, que antes ficavam de fora. As colunas são as mesmas, e as linhas que já
  existem não mudam.
- **O Score tem uma definição só:** aprovações suas sem pedido de correção, sobre as aprovações
  que você respondeu (`2/3`). Quem conta é o script. Antes o texto dava duas contas diferentes, e
  numa crew real saiu uma nota.
- **Regra de Ouro contada de verdade.** As correções ficam no registro de cada execução; no fim, o
  script mostra as das 10 últimas e a IA procura ali o que se repetiu em 3 ou mais. Antes ela
  procurava na memória da crew, que não guarda dado de execução. A seção se chama
  `## Regras de Ouro`, um nome só.
- O `LEIA-ME.md` da entrega abre com o tema da execução, quando o registro tem um.

### Limites
- O registro só sabe o que os comandos contam: se a IA pular o aviso de uma aprovação, o score
  sai errado para menos.
- Execução feita antes desta versão não tem registro: não dá para retomar, e só entra no
  histórico pelo conserto.
- Ao retomar, o que foi combinado só na conversa anterior, sem ter sido gravado, não volta.

## [1.13.0] — 2026-10-07

Fase U5, fatia 2: "Runner dividido" (`specs/fase-u5b-runner-dividido.md`). Chega a quem já usa
com um `npx @aksp/opencrew@latest update`. Nenhuma regra mudou de texto: mudou de lugar.

### Changed
- **O executor de pipeline ficou menor.** O `runner.pipeline.md`, lido no começo de toda execução,
  foi de 872 para 543 linhas. Sete blocos que só valem em alguma condição passaram para arquivos
  próprios em `_opencrew/core/runner/`, lidos só quando é o caso: seleção de agentes, migração do
  formato da memória, Escritório, tarefas do agente, contrato de saída, fontes pendentes e o fim
  da execução (memória, histórico, reflexão e menu final). No lugar de cada um ficou um trecho
  curto que diz quando ler o arquivo. Numa execução comum a IA lê 654 linhas em vez de 872, e as
  regras do fim da execução são lidas no fim, quando valem.
- O painel (Escritório) só custa leitura para quem o ligou.

### Removed
- O resumo "Step Execution Order", que repetia a ordem dos passos já descrita logo acima dele.
## [1.12.0] — 2026-10-07

Fase U5, fatia 1: "Polimento do uso" (`specs/fase-u5a-polimento-do-uso.md`). A U5 é a fase de
fechamento do projeto, em quatro fatias (`specs/fase-u5-roteiro.md`). Chega a quem já usa com um
`npx @aksp/opencrew@latest update`.

Ainda não nesta versão: o runner dividido (1.13.0), o histórico confiável e o "retomar" (1.14.0)
e o pedido avulso à crew (1.15.0).

### Added
- **Formato `texto-livre`** (o 24º guia): para o texto que não é post nem documento para
  imprimir ou assinar — proposta, minuta que vira HTML ou PDF, plano, relatório interno. Não tem
  limite de tamanho, não gera Word, e a entrega leva o arquivo inteiro para `outros/`. O
  `/opencrew repair` passa a propô-lo para esse tipo de passo.
- **O que o Word não vai converter aparece antes do revisor.** No passo com
  `format: documento-oficial`, o verificador avisa de imagem, de marcação `:::` desconhecida e
  de bloco de assinaturas sem fim. São alertas: quem decide é o revisor.
- Aviso de conversão quando uma linha de tabela tem mais células que o cabeçalho.

### Changed
- **O nome da execução (`run_id`) vem do script**, com a data e a hora do computador
  (`caminho.mjs <crew> pasta`, sem `--run`). Antes a IA montava a hora por conta própria.
- **Conferência de fontes:** o resumo concorda em número ("1 fonte", "1 alerta"); quando há
  caminho com sugestão, o relatório diz como corrigir; com `--corrigir`, cada arquivo alterado
  aparece com o nome da cópia que ficou, e o relatório sai uma vez só.
- Depois de um conserto por veto, o runner confere o arquivo de novo.
- O runner não cita mais ferramenta de uma IDE só ("Task tool", `.claude/settings.local.json`).
- **Perfil de documento oficial:** chave escrita quase certa (`Logotipo:`, `rodapé:`, com
  espaço antes) agora é erro que diz a grafia certa; antes a linha era ignorada em silêncio.
- O onboarding grava o `company.md` com seis cabeçalhos fixos e tira a marca
  `NOT CONFIGURED` dos dois arquivos.
- A linha "Não medido" some para formato que não declara limite (`documento-oficial`,
  `texto-livre`).
- Na entrega sem canal de rede, "O que não foi conferido" não cita imagens nem redes.
- Prompts de criação: dez contradições que a execução real da 1.11.0 achou ganharam uma frase
  cada (a pergunta de tier com modelo, `extends:` × "do zero", dependências de agente lidas
  também do "Context Loading", skills nativas fora da conferência, exemplo de saída com 15
  linhas, a pergunta 1 quando o comando já traz a descrição, entre outras).

### Fixed
- **Uma frase errada da 1.11.0.** O `/opencrew repair`, o README e este arquivo diziam que texto
  sem formato "é medido como post de blog". Isso só acontece quando o arquivo tem `title:` no
  frontmatter. O que acontece sempre, sem o formato: o redator não recebe o guia do tipo de
  texto, e o verificador procura no arquivo peças de rede (legenda, post). A frase foi trocada
  em todos os lugares.

## [1.11.0] — 2026-10-07

Fase U4, fatia 1: "Conserto de crews e caminho de criação" (`specs/fase-u4a-conserto-de-crews.md`).
Chega a quem já usa com um `npx @aksp/opencrew@latest update`; as suas crews só mudam quando você
pede o conserto e diz sim a cada ponto.

Ainda não nesta versão: histórico confiável, retomar uma execução interrompida e pedido avulso à
crew (`/opencrew pedir`), que ficaram para a fase U5 (`specs/fase-u5-roteiro.md`). O conserto não reordena passos: crew
sem revisão, sem aprovação final ou que publica antes da revisão é apontada e resolvida com
`/opencrew edit`.

### Added
- **`/opencrew repair <crew>` conserta crews antigas.** Ele lê a crew e mostra, em português, o
  que falta para as melhorias das versões seguintes valerem nela: passo sem o formato do texto
  (o redator ficava sem o guia do tipo de texto), crew sem os arquivos do projeto que deve ler,
  proibição sem trecho entre aspas (que o verificador não consegue barrar), nomes dos agentes,
  passo que publica sem a marca. Conserta um ponto por vez, com o seu sim; cada arquivo alterado
  ganha uma cópia `.bak`. Quem grava é um script (`_opencrew/core/scripts/conserto.mjs`), não a
  IA; sem `--aplicar` ele só lê.
- **Proibição que é regra de conteúdo** ("nunca prever votação por aclamação") pode ser marcada
  como `(revisão humana)`: fica para o revisor e deixa de aparecer como pendência do verificador.
- **Crew de documento na criação.** Pedir uma crew de ata, ofício, contrato ou proposta leva a
  perguntas próprias (quais documentos, quem assina e quem recebe, papel timbrado, quais arquivos
  mandam no texto), sem a oferta de investigar perfis de referência, e os passos já saem com o
  formato `documento-oficial`.
- **Formato da crew escrito num lugar só** (`_opencrew/core/formato-da-crew.md`): `crew.yaml`,
  `pipeline.yaml`, os campos de cada passo e o `id` do agente, com um exemplo completo. A criação,
  o runner e o conserto seguem esse arquivo; as formas que versões antigas gravaram continuam
  sendo lidas.
- Depois do `update`, quando o projeto tem ao menos uma crew, o resumo lembra do
  `/opencrew repair`.

### Changed
- **`max_review_cycles` no `crew.yaml` passa a valer.** O runner só lia o limite de ciclos de
  revisão no passo de revisão; crews que o declaravam no `crew.yaml` recebiam sempre 3.
- **Tier Express tem passo de revisão**, feito pelo próprio redator: o verificador automático roda
  também nele. Antes o texto dizia "o redator se revisa" e, em outro ponto, "toda crew precisa de
  revisor".
- **Checkpoint que guarda a resposta em arquivo** deixa de usar sempre o formato de "foco de
  pesquisa": fora do checkpoint do pesquisador, grava o título, a sua resposta e a data.
- O Architect lista os prompts de cada fase da criação, e o ponto de entrada diz onde ele está;
  antes um apontava para o outro.
- Pasta de `crews/` sem `crew.yaml` (os modelos instalados) não aparece mais como crew nas
  listas.

### Fixed
- `init --ide=<lista> --yes` (e `--all`) instalava as pontes das 9 IDEs; agora a lista vence.
  `--yes` sem `--ide` continua instalando todas.
- Uma frase cortada no meio nas instruções instaladas (`_opencrew/core/system.md`, desde a
  1.10.0): a rota do documento Word e o pedido de entrega de uma execução encerrada não exigem o
  onboarding.
- O Build exigia um checkpoint imediatamente antes de cada passo que publica, o que era
  impossível com dois passos de publicação seguidos.

## [1.10.0] — 2026-10-07

Fase U3b "Documento Word, com perfil de documento oficial" (`specs/fase-u3b-documento-word.md`).
Chega a quem já usa com um `npx @aksp/opencrew@latest update`; o papel timbrado é criado só quando
você pede.

Ainda não nesta versão: imagem no corpo do texto, link clicável, sumário, nota de rodapé e
numeração automática; logotipo em JPEG ou SVG; ler ou regravar um modelo `.dotx`; mais de um
perfil por projeto na entrega; PDF direto (o Word salva como PDF). O resultado foi conferido no
Word; no LibreOffice e no Google Docs, não.

### Added
- **Documento Word.** O texto em markdown (`.md` ou `.txt`) vira um arquivo do Word (`.docx`) com
  as mesmas palavras e os mesmos números, na mesma ordem. No chat: `/opencrew documento <arquivo>`
  (ou "Documento Word" no menu). No terminal:
  `node _opencrew/core/scripts/documento.mjs "<arquivo.md>"`. O Word sai ao lado do texto, com o
  mesmo nome; `--saida` escolhe outra pasta ou outro nome. Antes, quem precisava de um documento
  oficial mantinha um script à parte, com o texto dentro do código.
- **Papel timbrado (perfil de documento oficial).** Um arquivo de texto do projeto,
  `_opencrew/_memory/documento-oficial.md`, guarda o logotipo (PNG), três linhas de cabeçalho, o
  rodapé com "Página X de Y", as margens, a fonte e o tamanho da letra. Na primeira vez a IA
  pergunta se você quer configurar e preenche o arquivo com as suas respostas; `--criar-perfil`
  cria o arquivo a partir do modelo. O `update` não toca nele, e nenhum comando o sobrescreve.
- **Três marcações para documento.** `::: titulo` e `::: subtitulo` (centralizados),
  `::: quebra-de-pagina` (o anexo começa em página nova) e `::: assinaturas` … `:::` (as linhas
  de assinatura, duas por linha, com o nome e o cargo). Títulos `#`, `##` e `###`, tabelas, listas,
  negrito e itálico saem como estilos do Word.
- **O texto oficial não muda.** Número de item escrito por você ("1.", "6.1.", "a)", "§ 1º") vai
  como texto: nada é renumerado, reordenado nem corrigido.
- **Na entrega, a pasta `documentos/`.** O passo com `format: documento-oficial` sai como
  `entrega/documentos/<nome>.docx`, com o papel timbrado do projeto, e o LEIA-ME ganha a seção
  "Documentos", com o que conferir no Word. Sem papel timbrado configurado, a entrega avisa e
  diz como criar. A cópia para a pasta do projeto leva `documentos/`
  junto.
- **Guia `documento-oficial`** (o 23º guia de melhores práticas): ensina o redator a escrever um
  texto que vira documento — um parágrafo por linha, número escrito à mão, anexo depois da quebra
  de página, assinaturas no fim. Crews novas recebem esse formato no passo cujo resultado é um
  documento para imprimir, assinar ou protocolar.
- **Avisos de conversão.** O relatório diz o que ficou como texto (imagem, marcação `:::`
  desconhecida, bloco de assinaturas sem o `:::` final) e quantos caracteres inválidos foram
  removidos. Aviso não impede o documento.

### Changed
- **Um Word que já existe não é trocado em silêncio.** Se há um `.docx` diferente no destino, nada
  é gravado e a IA pergunta antes de substituir (`--substituir`). Igual, byte a byte: nada a fazer.
- **Perfil com erro não gera documento.** Chave desconhecida, valor fora da faixa, logotipo que
  não existe, não é PNG ou passa de 2 MB: a mensagem diz a linha, e nada é gravado.
- O menu "Mais opções" ganha "Documento Word".

### Internal
- `documento.mjs` e os módulos de `scripts/documento/` (sem dependência, sem `node:zlib`, até 200
  linhas cada): zip sem compressão, com CRC-32 próprio e data fixa — o mesmo texto, com o mesmo
  perfil, dá o mesmo arquivo, byte a byte. `modelos/documento-oficial.md` é o modelo do perfil;
  `prompts/documento.prompt.md`, o prompt da rota. O `src/` não mudou; o runner não cresceu (874
  linhas).
- `AGENTS.md`: a regra 15 cita o `documento.mjs`; a regra 7 diz que abrir o `.docx` no Word não é
  conferido pela porta.

## [1.9.0] — 2026-10-07

Fase U3a, fatia 2 "Entrega no projeto" (`specs/fase-u3a2-entrega-no-projeto.md`). Chega a quem já
usa com um `npx @aksp/opencrew@latest update`, e funciona nas crews que já existem.

Ainda não nesta versão: a crew que publica sozinha continua publicando como na 1.8.0 (o publicador
ainda não lê a pasta da entrega); legenda, post e tweet continuam medidos sem as hashtags no fim
(só o alerta); documento Word fica para a 1.10.0.

### Added
- **A entrega vai para uma pasta do seu projeto.** Na primeira entrega de cada crew, a IA pergunta
  "Quer que eu copie o resultado para uma pasta do projeto?". Com a pasta escolhida (por exemplo,
  `Conteudo/Prontos`), cada execução ganha a sua subpasta, `<pasta>/<execução>/`, com o LEIA-ME e
  as pastas dos canais prontos. Antes, a entrega só existia em `crews/<crew>/output/…/entrega/`,
  fora do git, e quem queria guardar copiava à mão.
- **A pergunta é feita uma vez.** A resposta — também o "não" — fica na linha `entrega.destino` do
  `crew.yaml` da crew; o arquivo anterior é guardado em `crew.yaml.bak`.
- **Nada do que foi copiado é sobrescrito.** Entregar de novo sem mudança não cria nada; canal que
  ficou pronto depois entra na mesma pasta; se algo já copiado mudou, a entrega nova vai para
  `<execução>-reentrega-2`, ao lado, e o LEIA-ME da anterior avisa. Arquivo seu dentro da cópia
  nunca é tocado: você pode editar a cópia à vontade, porque a entrega seguinte é comparada com o
  que foi copiado, e não com o que você mudou depois.
- **"Entregar assim mesmo".** Quando um canal não está pronto, a crew oferece três saídas: corrigir
  agora, entregar assim mesmo ou deixar para depois. Em "entregar assim mesmo", o que falta fica
  escrito como ressalva no começo do LEIA-ME, o canal aparece como "Pronto, com ressalva" e é
  copiado com os outros. Pendência nova depois do aceite pede novo aceite — também a que foi
  resolvida e voltou.
- **Legenda de Instagram sem marcador.** Arquivo de legenda que é só o texto, pronto para colar,
  sai como `instagram/legenda.txt`, com um aviso para conferir e com o alerta de tamanho. Antes, o
  arquivo ia inteiro, sem ser medido.
- **Mudar a pasta da cópia depois.** Peça à IA ("muda a pasta de entrega", "não quero mais cópia",
  "volta a copiar"): ela refaz a entrega da última execução e grava a resposta nova.
- **"Não tenho esse dado".** Na aprovação final, se você não tem a informação de um `[PREENCHER]`,
  a crew não insiste e não inventa: deixa o `[PREENCHER]` no texto e você decide na entrega.

### Changed
- **PDF e "posts formatados" deixaram de ser gerados.** O PDF era prometido e o método não
  funcionava; o "post formatado" foi substituído pela entrega por canal. Para ter um PDF, abra o
  arquivo e use Imprimir → Salvar como PDF (o LEIA-ME ensina). Crew antiga com um passo de
  `format: pdf` ou `format: formatted-post`: a execução avisa que o formato não é mais gerado e o
  passo grava o texto em markdown (`.md`); nenhum `.pdf` é criado. O CSV continua.
- **Canal que não está pronto não é copiado para o projeto.** Ele continua em `entrega/`, marcado
  como "Não está pronto", e entra na cópia quando ficar pronto ou quando você aceitar a ressalva.
- **"Corrigir agora" corrige no arquivo de origem**, verifica o texto de novo e só então monta a
  entrega. Antes, a correção podia ser feita sem nova verificação.
- **`[PREENCHER]` aparece no relatório como "✏️ A preencher"**, e não mais como "❌ Bloqueio"; o
  resumo conta à parte ("1 a preencher"). O que impede a entrega não mudou: texto com `[PREENCHER]`
  continua "Não está pronto" até você preencher ou aceitar.
- No LEIA-ME, o aviso de trecho que ficou fora do texto para colar diz em qual arquivo de origem
  ele está.
- No laço de revisão, "Aceitar assim mesmo" diz que a escolha fica registrada na entrega.
- **`update` em instalação que não terminou** (`_opencrew/core` sem o registro de versão): não
  altera nada e pede `npx @aksp/opencrew init`, que conclui. Antes, atualizava mostrando a versão
  "unknown".

### Fixed
- **O relatório de cada ciclo de revisão é gravado pelo verificador**
  (`verificacao-ciclo-N.md`). Antes, a IA copiava a saída à mão e podia truncar.
- **`.gitignore` com um marcador do bloco sem o par** (só `# opencrew:start` ou só
  `# opencrew:end`): o `update` guarda o arquivo como estava em `.opencrew-backup/<data>/`, põe um
  bloco completo no fim e lista a cópia. Nenhuma linha sua é apagada.

### Internal
- O bloco do `.gitignore` começa por `# gerenciado pelo OpenCrew: suas linhas ficam fora deste
  bloco` (o primeiro `update` regrava só o bloco).
- `entregar.mjs` ganha `--destino`, `--lembrar-destino` e `--aceitar-pendencias`; `verificar.mjs`
  ganha `--relatorio`; módulos novos em `scripts/entrega/` e `scripts/verificar/` (sem dependência,
  até 200 linhas cada). `export.prompt.md` fica só com o CSV. O runner não cresceu (874 linhas).

## [1.8.0] — 2026-10-07

Fase U3a, fatia 1 "Pasta de entrega" (`specs/fase-u3a1-pasta-de-entrega.md`). Chega a quem já usa
com um `npx @aksp/opencrew@latest update`, e funciona nas crews que já existem, sem mexer nelas.

Ainda não nesta versão: PDF e "posts formatados" não são gerados pela entrega (`artigo.md`,
`corpo.md` e os roteiros saem em markdown, e o LEIA-ME ensina a salvar como PDF pelo "Imprimir");
copiar a entrega para uma pasta do projeto, registrar "entregar assim mesmo" e marcar "já
publicado" ficam para a 1.9.0. O LEIA-ME e os nomes dos arquivos são só em português.

### Added
- **Pasta `entrega/`: o que você usa, separado por canal.** Depois da aprovação final, a crew
  monta `crews/<crew>/output/<execução>/entrega/` com uma pasta por canal (`instagram/`,
  `linkedin/`, `blog/`, `email/`, `whatsapp/`, `twitter/`, `youtube/`; só os que a execução tem).
  Antes, você recebia a pasta da execução com `v1`, `v2`, relatórios e textos cheios de `#`, `**`
  e rótulos.
- **Texto pronto para colar.** `legenda.txt`, `post.txt` e `tweet.txt` saem sem `#`, `**`, rótulos
  nem recados internos, com as hashtags no fim. O primeiro comentário do LinkedIn vem em arquivo
  à parte; a thread, em `tweet-1.txt`, `tweet-2.txt`…; o blog, em `seo.txt` (título, meta
  description, palavra-chave, slug) e `artigo.md`; o e-mail, em `assunto.txt`, `previa.txt` e
  `corpo.md`; o WhatsApp, em `mensagem.txt`. As imagens vão para a pasta do canal com o nome
  original, sem alteração; o HTML dos slides, para `editaveis/`.
- **`LEIA-ME.md` em cada entrega.** Diz o que fazer com cada arquivo, canal por canal, em passos
  numerados; marca cada canal como "Pronto" ou "Não está pronto"; lista em "Antes de usar" o que
  falta; e diz o que não foi conferido (links e fatos, texto dentro das imagens, aparência final
  em cada rede).
- **O que não está pronto fica marcado.** Texto com `[PREENCHER]`, acima de um limite ou arquivo
  que faltou: o canal aparece como "Não está pronto" e a crew pergunta se você quer corrigir agora
  ou seguir assim. Se a legenda, o post ou o tweet passar do limite por causa das hashtags no fim,
  o LEIA-ME traz um alerta.
- **Arquivo sem canal não se perde.** Proposta, minuta, relatório ou formato que não é de rede
  nenhuma vai inteiro para `outros/`, com o nome original, e aparece no LEIA-ME.
- **Entrega de uma execução antiga.** Peça à IA para montar a entrega de uma execução já
  encerrada: ela lista os arquivos, pede o seu "sim" e monta a pasta.
- Crew que publica sozinha (Instagram, por exemplo): a entrega é montada antes da publicação, e
  o LEIA-ME avisa "Esta crew publica este canal sozinha. Antes de postar à mão, confira se já saiu."

### Changed
- **O fim da execução aponta para `entrega/` e para o LEIA-ME**, não mais para a pasta da execução
  e para um "arquivo final" que ninguém dizia qual era. A cópia do arquivo final na raiz da
  execução deixa de ser feita.
- A pasta `entrega/` é refeita do zero a cada entrega e fica fora do git: o que você editar ali se
  perde. Para guardar, copie a pasta para outro lugar do projeto (o LEIA-ME avisa).
- Se o script da entrega não rodar (sem Node, por exemplo), a execução não para: a crew avisa e
  lista os arquivos aprovados.

### Fixed
- **O título do arquivo era lido como legenda.** Num arquivo com `# Legenda — …` no topo e a
  legenda de verdade mais abaixo, o verificador media duas legendas e podia dar alerta falso.
  Agora o título do arquivo não conta como peça.

### Internal
- `_opencrew/core/scripts/entregar.mjs` e os módulos de `scripts/entrega/` (sem dependência, até
  200 linhas cada); `_opencrew/core/prompts/entrega.prompt.md`; seção `### Entrega` no runner, que
  perde "Save final output", "Run folder" e "Output saved to".
- Regra 15 do `AGENTS.md`: script do runtime só escreve onde foi combinado.
- Travas novas: `tests/entregar*.test.js`, `tests/runtime-contracts-u3a.test.js`,
  `tests/upgrade-u3a.test.js` e o U3a-14c em `tests/package.test.js`.
- Roteiro renumerado: U3a fatia 2 = 1.9.0, U3b = 1.10.0, U4 = 1.11.0.

## [1.7.1] — 2026-10-06

Fase R3 "Reparos do runner em uso real" (`specs/fase-r3-runner-em-uso-real.md`): dois defeitos
achados numa execução real de crew, seguindo o runner ao pé da letra. Chega a quem já usa com um
`npx @aksp/opencrew@latest update`. Execuções antigas continuam legíveis.

### Fixed
- **A crew parava no segundo passo com "Input … not found".** O passo procurava o arquivo de
  entrada num caminho em que o passo anterior não tinha gravado (a pesquisa estava em `v1/`, e a
  entrada era procurada fora dela). Agora a entrada de um passo é sempre a saída mais nova daquele
  arquivo, em qualquer pasta de versão.
- **No Windows, cada conferência dependia de a IA traduzir um comando de bash** (`test -s`,
  `grep`, `ls | sort | tail`, `mkdir -p`). Um erro de tradução virava validação que falhava sem
  motivo. Esses comandos saíram do runner.
- O Architect proibia criar pasta por comando e o runner mandava criar: os dois agora dizem a
  mesma coisa (ninguém cria pasta por comando).

### Changed
- **Quem calcula os caminhos da execução é um script, não a IA.** O runner roda um comando curto
  (`_opencrew/core/scripts/caminho.mjs`), igual em qualquer sistema, para criar a pasta da
  execução, saber onde cada passo grava, achar a entrada e conferir o arquivo gravado. Existência,
  número de seções e TL;DR saem numa conferência só; antes eram até três.
- A pasta de versão continua subindo como antes (`v1`, `v2`, `v3`… a cada passo que grava), agora
  em ordem numérica (`v10` vem depois de `v9`). O script só cria pastas, e só dentro de
  `crews/<crew>/output/<execução>/`; nunca cria, altera nem apaga arquivo.
- Se o script não rodar (sem Node, por exemplo), a execução não para: o runner avisa uma vez,
  segue pela regra escrita e lista esses arquivos como "não verificado" na aprovação final.
- Saber se a memória da crew está no formato novo e se o `runs.md` existe passa a ser feito lendo
  o arquivo, sem comando de terminal. Na criação de crew, as crews existentes são listadas pela
  ferramenta da IDE, não por `ls`.

### Internal
- Travas novas: `tests/caminho.test.js`, `tests/caminho-casca.test.js`,
  `tests/runtime-contracts-r3.test.js` e `tests/upgrade-r3.test.js`; os testes R2-04d que contavam
  comandos de bash no runner passam a proteger as aspas nos comandos novos.
## [1.7.0] — 2026-10-06

Fase E1 "Escritório ao vivo — a equipe trabalhando, em 8 bits"
(`specs/fase-e1-escritorio-ao-vivo.md`). Chega a quem já usa com um
`npx @aksp/opencrew@latest update`.

### Added
- **Escritório ao vivo.** Uma página em pixel-art, aberta no navegador, mostra a crew
  trabalhando: cada agente na sua mesa, digitando na vez dele, levando o papel ao colega na
  passagem de bastão, de mão levantada quando espera a sua resposta, com ✓ quando termina e "!"
  quando falha. Ao lado, o passo atual, a lista dos agentes com o status por extenso e o que cada
  um fez, e a última passagem de bastão. O título da aba acompanha a execução.
- **`/opencrew dashboard`** liga o Escritório, sobe a página e mostra o endereço
  (`http://127.0.0.1:4747`, ou a porta livre seguinte); repetir o comando devolve o mesmo
  endereço. **`/opencrew dashboard off`** desliga. Continua desligado por padrão.
- Roda só no seu computador, sem internet e sem medição: o servidor
  (`_opencrew/core/scripts/escritorio.mjs`) escuta só em `127.0.0.1`, só lê e não escreve em disco.
- Sem execução nenhuma, a página roda uma demonstração e troca sozinha para a execução real
  quando ela aparece (`?demo` no endereço força a demonstração). Com mais de uma crew, mostra a
  de atualização mais recente e um seletor com as outras.
- A página não mente sobre o que não sabe: execução há mais de 2 minutos sem novidade mostra há
  quanto tempo foi a última atualização; há mais de 20, o agente sai da pose de digitar e aparece
  "sem sinal". Servidor fora do ar: a página avisa e tenta de novo sozinha.

### Changed
- **Quem avisa o Escritório é um script, não a IA escrevendo JSON.** Com o Escritório ligado, o
  runner roda um comando curto por passo (`_opencrew/core/scripts/estado.mjs`). Checkpoint, agente
  pulado e execução que falha passam a aparecer; antes nunca eram gravados. Falha desse comando
  não para a execução: o runner avisa uma vez e segue.
- **Com o Escritório ligado, o estado final deixa de ser copiado para
  `crews/<crew>/output/<run>/state.json`.** O estado da execução mora só em
  `crews/<crew>/state.json`.
- `state.json`: os agentes ganham os status `checkpoint` e `failed` e o campo `label`; a
  execução ganha `checkpoint` e `failed`; `desk` e `delivering` deixam de ser gravados. Arquivo
  gravado por versão anterior continua sendo lido pela página.
- Os prompts de criar e de consertar crew não escrevem mais `state.json`.
- README: a nota "o dashboard não é instalado" deu lugar à seção "Escritório ao vivo".

### Removed
- A pasta `dashboard/` do repositório (o desenho antigo, que nunca foi instalado pelo `init`). O
  que servia migrou para `_opencrew/core/escritorio/`, sem os defeitos apontados na auditoria:
  nome de agente entrava na página como HTML, o modo ao vivo lia o arquivo no lugar errado e a
  página congelava se a primeira leitura falhasse.

### Internal
- `npm run verify`: o lint passa a cobrir `templates/_opencrew/core/escritorio/` (com os nomes
  globais de navegador) e o alerta de tamanho mede os `.js` dessa pasta. Travas novas:
  `tests/estado*.test.js`, `tests/escritorio*.test.js`, `tests/runtime-contracts-e1.test.js`,
  `tests/docs-e1.test.js` e os cenários E1-07a, E1-07c e E1-upg nos testes de pacote, de
  referências e de upgrade. A trava de conteúdo do mantenedor passa a ler também `.mjs` e `.css`.

## [1.6.3] — 2026-10-06

**O Node mínimo subiu para o 20.17, numa versão de correção.** O pacote dizia 20.0, mas a lista
de IDEs do `init` só abria a partir do 20.12 e as dependências só garantem o 20.17. Quem está no
Node 20.0 a 20.16 precisa atualizar o Node antes de rodar `init` ou `update` (saída de emergência:
`npx @aksp/opencrew@1.6.2 update`).

Fase R2 "update e envio seguros" (`specs/fase-r2-update-e-envio-seguros.md`): só defeitos já
achados em revisão. Chega a quem já usa com um `npx @aksp/opencrew@latest update`.

### Changed
- **`blotato` e `resend` pedem confirmação antes de agir.** Mostram a prévia (contas ou
  destinatários, texto, quando) e só publicam, enviam, agendam ou apagam depois da palavra
  `publicar`, `enviar` ou `apagar`. Crew que hoje envia sem perguntar vai parar e pedir. Em falha,
  não repetem sozinhas.
- **`.mcp.json`: o servidor Playwright é entregue uma última vez.** Depois, se você o remover ou
  apagar o arquivo, o `update` não repõe. A versão fixada não é trocada, e o arquivo é copiado
  antes de qualquer regravação, mantendo a indentação.
- **Primeiro `update` para esta versão copia o `.gitignore`** para `.opencrew-backup/`, mesmo sem
  edição sua: o bloco do OpenCrew mudou (passa a ignorar `.opencrew-backup/`) e as versões
  anteriores não registravam o bloco.
- **O reparo de pontes só roda com o pacote na mesma versão do projeto.** Com outra versão, para
  sem alterar nada e pede o `update`.
- As frases do resumo do `update` saem em português e só afirmam o que foi feito.

### Fixed
- **Ponte de IDE que você não instalou**: um `CLAUDE.md`, `GEMINI.md`, `QWEN.md` ou
  `copilot-instructions.md` seu que só citava "opencrew" fazia o `update` criar a ponte e pôr um
  bloco no seu arquivo. A IDE agora se prova pelo arquivo de ponte. O resumo não cita mais o
  Codex sem ele estar instalado.
- **Bloco do OpenCrew editado por dentro** (em `AGENTS.md`, `CLAUDE.md`, `.gitignore`…) era
  regravado sem cópia. Agora o arquivo inteiro é copiado antes, e o fim de linha é mantido.
- **Texto antigo das pontes** (instalações até a 1.2.2), que mandava adotar o papel do OpenCrew
  sempre, é retirado, com cópia, quando está idêntico ao gerado; se foi editado, só aviso.
- **Manifesto ilegível** vira aviso e a atualização segue; `.mcp.json` fora do formato não derruba
  mais o `update` no meio.
- **A dica de reinstalar** não manda mais apagar `_opencrew/`, que guarda a sua memória.
- **Restos do OpenSquad**: o aviso não promete mais "apagar com segurança" para arquivo que pode
  ser seu, e cobre mais sete caminhos. Nada é apagado.
- **Texto do usuário em linha de comando**: o prompt de imagem vai por arquivo (`--prompt-file`),
  nome de arquivo com caractere inseguro não entra em comando, e caminhos e URLs vão entre aspas.
- **Conferência de fontes**: o `--corrigir` não grava mais fora da crew por um link; caminho de
  rede e endereço de site citados viram alerta "não conferido", sem tocar a rede e sem parar a
  execução; erro de leitura sai com mensagem.
- **Publicação**: a tag só publica depois do CI verde (Ubuntu e Windows, Node 20.17 e 22) e da
  auditoria de segurança. Três das cinco últimas versões saíram com o CI vermelho.

### Internal
- CLI em módulos novos (`blocos`, `deteccao`, `legado`, `mcp`, `resumo`, `node-version`); 47
  cenários R2 com teste de mesmo ID; teste de upgrade 1.6.2 → 1.6.3.

## [1.6.2] — 2026-10-05

Correção da 1.6.1. Chega a quem já usa com um `npx @aksp/opencrew@latest update`.

### Fixed
- **Node 20: o verificador não esgota mais a memória com texto grande.** Um post, tweet ou
  legenda de dezenas de milhares de caracteres numa peça só derrubava o verificador no Node 20,
  sem relatório (o runner avisava que a verificação não rodou). A contagem de caracteres passou a
  ser feita em janelas, com o mesmo resultado. O defeito vinha da 1.5.0; Node 22 e 24 não o
  tinham.

### Internal
- Release: a tag só sai depois do CI verde nas quatro células (Ubuntu e Windows, Node 20 e 22).
  A 1.6.1 foi publicada com o CI do Node 20 vermelho, porque a publicação roda só no Node 22.

## [1.6.1] — 2026-10-05

Fase R1 "Reparos da 1.6.0: o verificador mede de verdade" (`specs/fase-r1-reparos-1-6-1.md`),
vinda da revisão das specs (`docs/auditoria/2026-10-04-revisao-specs.md`). Chega a quem já usa com
um `npx @aksp/opencrew@latest update`.

### Fixed
- **O verificador mede o texto escrito com rótulos**, do jeito que os próprios best-practices
  ensinam (`=== CAPTION ===`, `=== HASHTAGS ===`, `=== SLIDES ===`, `=== HOOK ===`, `=== TWEET ===`,
  `=== TITLE ===`). Antes respondia "Nada a apontar" sem medir.
- **"Não medido" é dito**: com o formato informado e a peça principal não achada, o relatório
  alerta em vez de aprovar em silêncio. O resumo passa a ser
  `X bloqueios, Y alertas, Z não medidos`.
- **Bloqueios falsos**: cor hexadecimal (`#666666`), número comum, CEP e "XXX Congresso" não são
  mais "Placeholder"; `{{name}}` em e-mail e WhatsApp vira nota; termo proibido vale como palavra
  inteira ("IA" não bloqueia "dia a dia"); o termo que o usuário mandou preferir não é proibido.
- **Arquivo local sem limites não desliga o verificador**: os limites de
  `_opencrew/best-practices.local/` somam aos do core, chave a chave.
- **Erros que passavam por OK**: rodar fora da pasta do projeto ou com crew inexistente agora dá
  erro (código 1), sem linha de status; um arquivo ausente na lista não derruba a verificação dos
  outros; imagem e `.docx` não são lidos como texto; no HTML, só o texto visível e os links;
  arquivo de texto fora do UTF-8 vira alerta "Não verificado" (UTF-16 com marca é lido).
- **Relatório que não saía**: com o projeto aberto por junção ou link de pasta, os dois scripts
  terminavam sem imprimir nada.
- **Várias peças no mesmo arquivo** são medidas uma a uma (três posts não viram uma soma); a linha
  `---` não encerra mais a seção; slides contados nas escritas comuns ("📌 Slide 2", "Slide #3").
  Título e meta description em bloco YAML (`>-`, `|`) são medidos inteiros; `[PREENCHER: …]`
  longo não escapa; imagem e link de âncora não contam como link.
- **Conferência de fontes**: enxerga `caminho:` com comentário ou aspas e os arquivos de `agents/`
  (agentes e tasks); recusa crew de fora do projeto; mensagens corrigidas ("Não há correção
  automática…", aviso de busca parcial); caminho com marcador de modelo (`AAAA-MM-DD`) e comando
  entre crases não são conferidos; o `--corrigir` troca só o caminho citado (antes trocava
  qualquer trecho igual) e nunca aponta o destino de gravação de um agente para um arquivo que
  já existe.
- **`init --repair-bridges`** sem `--ide` regrava só as IDEs instaladas (antes criava as pontes
  das 9); `--all` regrava todas; o resumo lista as cópias de segurança. Numa pasta sem workspace,
  para com erro em vez de instalar; num workspace sem manifesto, não cria um.

### Changed
- **Runner**: passa o formato de cada arquivo ao verificador (`caminho=formato`); laço de revisão
  com 3 ciclos por padrão (`max_review_cycles`) e saída também quando não há bloqueio; regras do
  revisor injetadas em toda execução (valem para crews já criadas); avisa quando um script não
  rodou; a conferência de fontes roda antes de carregar as fontes; a aprovação final mostra o que
  ficou sem medir e as notas do relatório.
- Crew nova recebe o limite de ciclos de revisão pelo tier: Express 1, Standard 2, Full 3.
- Em blog, a seção com cabeçalho de outro canal ("Como postar no LinkedIn") não é medida como
  post, e o relatório diz isso ("Não medido").
- Hashtags sob um cabeçalho que cita o canal ("Hashtags LinkedIn") somam à peça desse canal.
- "Aceitar assim mesmo" não promete mais registro: o registro chega com a entrega por canal.
- Texto solto depois de uma linha `---` passa a contar na peça de cima. Telefone falso de 8 ou 9
  dígitos, fora de link, deixa de ser pego.

### Internal
- Scripts do runtime em módulos (`verificar/`, `conferir-fontes/`, `comum.mjs`); leitor de peças
  exportado para a próxima fase. Todos os cenários R1 com teste de mesmo ID; teste de upgrade
  1.6.0 → 1.6.1.
- Revisão do código antes da tag: sete leituras independentes e duas rodadas de conserto com
  teste; o que ficou adiado tem destino na spec (§11 e §12).
- Revisão das specs (265 achados) e faxina de documentos; specs R1, U3a e U3b.

## [1.6.0] — 2026-10-02

Trilha U2 "Crew que conhece o projeto" + U6 "Convivência" (`specs/fase-u2-crew-que-conhece-o-projeto.md`).

### Added
- **`fontes:` no `crew.yaml`** — arquivos/pastas do projeto (caminho relativo) que a crew lê em todo
  run e trata como verdade; o discovery pergunta quais são.
- **Conferência de fontes** (`_opencrew/core/scripts/conferir-fontes.mjs`) no início de cada run:
  arquivo movido → acha o novo lugar e oferece corrigir (`--corrigir`, com `.bak`); nome diferente →
  lista a pasta; caminho absoluto → alerta "não é portátil". No uso real (Projeto B) achou os 5
  caminhos quebrados pela reorganização, cada um com o lugar exato.
- **Correção gravada na hora** — o que o usuário corrige num checkpoint vai para a memória antes do
  próximo passo; termo removido vira proibição entre aspas (trava do verificador); conflito com o
  `company.md` gera a pergunta "Atualizo o perfil da empresa?".
- **`_opencrew/best-practices.local/`** — best-practices do usuário (aprendidas/criadas), lidas antes
  das do core e nunca tocadas pelo `update`; o verificador também lê os limites dali primeiro.

### Changed
- **`update` completo e seguro**: entrega pastas novas do framework (agentes-base, config, templates
  de crew) sem sobrescrever; guarda em `.opencrew-backup/<data>/` o que o usuário editou antes de
  substituir (manifesto `_opencrew/manifest.json`); recusa voltar para versão mais antiga; atualiza
  as pontes **só das IDEs instaladas**; faz merge do Playwright no `.mcp.json` (saída em
  `_opencrew/logs/playwright/`, outros servidores intactos); avisa sobre pontes antigas (`opensquad`).
- **Convivência**: pontes e bloco do `AGENTS.md` só ativam o OpenCrew com `/opencrew` (ou pedido
  sobre crews) e apontam direto para `_opencrew/core/system.md`; outras instruções do projeto têm
  prioridade no resto.
- Migração do formato de memória faz `memories.md.bak` e avisa (fim do reset silencioso); regra única
  sobre o que vai para a memória (só feedback explícito).
- `_build/discovery.yaml` agora em `crews/{code}/_build/`; build grava caminhos relativos à raiz.

## [1.5.0] — 2026-10-02

Trilha U1 "Revisor com dentes" — primeira melhoria vinda do uso real
(`docs/jornada/2026-10-02-uso-real.md`, `specs/fase-u1-revisor-com-dentes.md`).

### Added
- **Verificador automático** (`_opencrew/core/scripts/verificar.mjs`, Node puro): mede o texto
  ANTES do revisor usando os limites `constraints:` dos best-practices — título e meta description
  do blog, legenda e hashtags do Instagram, slides do carrossel, post do LinkedIn, tweets, links
  (alerta quando abaixo do mínimo). Bloqueia placeholders (`wa.me/55…9999…`, `[Empresa X]`,
  `lorem ipsum`…), termos entre aspas em `## Proibições Explícitas` da memória da crew e
  `[PREENCHER: …]`; alerta afirmações em 1ª pessoa com dado concreto (R$, %, ano passado,
  "N clientes"). Relatório em PT-BR com valor medido × limite; última linha
  `VERIFICACAO:OK | BLOQUEADA | AGUARDANDO_USUARIO`.
- **Regras de veracidade** injetadas em todo passo de criação: nunca inventar casos, depoimentos,
  números ou histórias em 1ª pessoa — usar `[PREENCHER: o que falta]`.

### Changed
- **Revisão com trava**: antes de todo passo com `on_reject`, o runner verifica **todas** as saídas
  desde o redator (não só a entrada do revisor — no uso real as legendas nunca eram revisadas);
  `VERIFICACAO:BLOQUEADA` força REJECT seja qual for a nota; no limite de ciclos o usuário escolhe
  corrigir, aceitar (registrado) ou abortar; a aprovação final mostra o resumo e pede os
  `[PREENCHER]`.
- `review.md`: o revisor copia os números do relatório (nunca estima), não aprova com bloqueio e
  tem nota máxima 7/10 com alerta não resolvido. `copywriting.md` e o build: regra de não inventar.
- **Instagram em 4:5**: carrossel/feed agora 1080×1350 (a API do Instagram só publica de 4:5 a
  1,91:1), no máximo 10 slides; presets do `image-creator`, `template-designer` (e modelos-base),
  `image-fetcher` e best-practices atualizados. Limites com nomes canônicos (`hashtags_max`).

### Internal
- Docs de jornada (`docs/jornada/`: uso real, roteiro de teste U0, medições) e roadmap de trilhas U.
- Regras de dev 12 (limite só vale se medido) e 13 (PT-BR para o usuário); alerta de tamanho e
  lint cobrem os scripts do runtime.

## [1.4.2] — 2026-10-02

Hotfix "parar de causar dano" (Fase 1 da auditoria — `specs/fase-1-hotfix.md`).

### Fixed
- **`CLAUDE.md` gerado não traz mais o fluxo STATUS.md do mantenedor** (vazado na 1.4.0/1.4.1);
  o `update` remove a seção de instalações existentes, sem tocar no texto do usuário.
  `STATUS.md` saiu do `.gitignore` do template.
- **`--help` nunca executa comando**: `update --help` / `-h` e `init --help` só mostram a ajuda.
  Parser estrito (`node:util.parseArgs`): opção desconhecida, `--ide` sem id válido ou
  argumento solto (`init minha-pasta`) falham com exit 1 **antes** de escrever qualquer arquivo.
  `--ide claude-code` (com espaço) e `-yv` funcionam. `update --dry-run` = `--check`.
- **`update` sem `AGENTS.md`** cria a ponte em vez de quebrar com ENOENT.
- **Migração do `AGENTS.md` legado faz backup** em `AGENTS.md.bak` (ou `.bak-<timestamp>`).
- **`.env.example` e `.gitignore` do usuário não são mais sobrescritos/ignorados**: recebem um
  bloco `# opencrew:start … # opencrew:end` no fim; as linhas do usuário ficam intactas.
  O bloco do `.gitignore` agora cobre `.claude/settings.local.json`, `crews/*/state.json` e
  `crews/*/_investigations/`.
- **Ctrl+C no prompt de IDEs não deixa instalação pela metade**: as IDEs são escolhidas antes
  da primeira escrita; cancelamento sai com 130 e "Cancelled — nothing was written.". Uma
  instalação interrompida (core sem stamp de versão) é **retomada** pelo próximo `init`.
- Erros inesperados mostram uma linha `✗ <mensagem>` (stack só com `OPENCREW_DEBUG=1`).
- Marcadores de bloco: um `start` órfão (fim apagado à mão) não faz mais a regravação engolir
  linhas do usuário.
- Skills: caminho do `image-ai-generator` corrigido (`{skill_path}/scripts/generate.py`, nota
  `py -3` no Windows); `instagram-publisher` lê as imagens da pasta do run atual; o
  `image-creator` renderiza JPEG quando o destino é Instagram.
- Runner: o toggle do dashboard reconhece o formato `- **Dashboard:** enabled` gravado no
  onboarding.

### Security
- **Publicar/enviar é sempre o último trecho do pipeline**: `… → Review → Final Approval
  checkpoint → [Publish/Send]` (design), com o novo Gate 2c BLOCKING no build. Passos com
  `side_effects: irreversible` rodam inline e **nunca** têm retry automático nem auto-correção
  de veto — o runner avisa que a ação pode já ter acontecido e pergunta.
- **`instagram-publisher`**: legenda via `--caption-file` (nunca interpolada no shell); só
  aceita `.jpg`/`.jpeg` dentro de `crews/*/output/`; upload no imgBB expira em 24h; token da
  Graph API no corpo dos POST, não na URL; fluxo preview → `--dry-run` → confirmação explícita
  ("publish"/"publicar") → publicação única.

### Changed
- Template `templates/AGENTS.md` (o `system.md` instalado) compactado (−24%) sem mudar o roteamento.

### Internal
- Testes por cenário da spec (F1-01a…F1-13a); trava nova: nenhum arquivo de `templates/`
  carrega conteúdo do mantenedor. `KNOWN_BROKEN` de referências zerado.

### Added (governança do repositório — Fase 0)
- Auditoria geral da v1.4.1 com roadmap por fases: `docs/auditoria/2026-10-02-auditoria-geral.md`.
- Regras de desenvolvimento em `AGENTS.md` (project-standards T3, tabela Regra → Trava);
  `CLAUDE.md` da raiz vira apontador versionado.
- Porta de verificação única `npm run verify` (`scripts/verify.js`): lint (agora inclui
  `bin/`), testes (descobertos automaticamente em `tests/`), version-sync e alerta de
  tamanho (`scripts/check-size.js`). CI e publish chamam a mesma porta.
- Travas novas: `tests/package.test.js` (conteúdo do tarball × README),
  `tests/template-refs.test.js` (caminhos citados nos prompts existem),
  `tests/verify.test.js` e `tests/check-size.test.js` (provetas).
- `GLOSSARIO.md`; `IDEIAS.md` reformatado com triagem e `Alocação: →`.

### Changed (governança do repositório — Fase 0)
- Dogfood do mantenedor sai da raiz e vai para `sandbox/` (fora do git).
- `publish.yml` confere a tag contra a versão do `package.json` e roda `npm run verify`;
  CI e publish usam só `npm ci` (sem fallback que esconde drift do lockfile).

### Docs (Fase 0)
- README: o dashboard não é instalado pelo `init`; `update` não atualiza as pontes de IDE
  (use `init --repair-bridges`); migração do `AGENTS.md` legado perde instruções extras;
  flags `upgrade`, `--ide`, `--all`/`-y`, `--repair-bridges` documentadas; contagens
  corrigidas (22 guias, 13 prompts); Windsurf removido da lista; promessa "30-70% de
  economia" sem base removida.

## [1.4.1] — 2026-08-04

### Fixed
- **NPM publish**: v1.4.0 já existia no registro. Re-publicado como 1.4.1.

## [1.4.0] — 2026-08-04

### Added
- **Seleção automática de agentes (IDEIAS #8)**: o Pipeline Runner agora analisa
  a solicitação do usuário contra uma matriz de decisão e sugere quais agentes são
  realmente necessários para aquela tarefa. O usuário confirma ou ajusta a seleção
  antes da execução. Agentes excluídos têm seus steps pulados automaticamente.
  - `runner.pipeline.md` — step 4b (Pre-Execution Agent Selection) com matriz de
    6 sinais PT-BR/EN, menu multi-select IDE-neutral, alertas de dependências
    quebradas, e step 0 de skip condicional no loop de execução.
  - `crew.yaml` — novo campo `agent_dependencies:` (opcional). O step de seleção
    só dispara quando o campo existe — crews antigas mantêm comportamento idêntico.
  - `build.prompt.md` — schema do `agent_dependencies:`, campo `agent:` opcional
    em checkpoints, gate de validação.
  - `AGENTS.md` — step 7b na seção Loading the Pipeline Runner.
  - 3 novos testes de contrato em `docs.test.js`.

> Itens desta versão que ficaram de fora da entrada original (acrescentados na auditoria
> de 2026-10-02):
- **Pontes `.agents/`** para Antigravity, Gemini CLI e Qwen Code
  (`.agents/skills/opencrew/SKILL.md`, `.agents/workflows/opencrew.md`).
- **`init --repair-bridges`**: regrava as pontes de IDE num workspace existente.
- **`update` migra `AGENTS.md` legado** (pré-1.3, sistema completo) para a ponte fina.
- **Fix Antigravity**: frontmatter no workflow para registrar `/opencrew`.
- ⚠️ **Regressão**: o `CLAUDE.md` gerado passou a conter a seção "STATUS.md (gestão de
  sessão)" do fluxo pessoal do mantenedor, e `templates/gitignore` ganhou `STATUS.md`.
  Correção prevista na 1.4.2 (F1-01).

## [1.3.3] — 2026-08-03

### Fixed
- **Auditoria D3 — cobertura de testes**: `--all` test agora verifica os 10 bridges
  (eram 5). Teste de scaffold verifica `_opencrew/agents/`. +2 testes no update
  (`--check` mismatch + refresh de `system.md`/bridge).

### Security
- **Auditoria D4 — segurança e robustez**: `escapeRx` verificada para todos os
  caracteres especiais regex. Todos os paths usam `path.join` (zero concatenação).

## [1.3.2] — 2026-08-03

### Fixed
- **Auditoria D2 — consistência de prompts**: coluna `Score` adicionada à migração
  OLD_FORMAT do `runs.md`. Passos de injeção do runner renumerados (memory=4,
  format=5, skill=6) para refletir a ordem real de composição. Números de fase
  corrigidos no `skills.engine.md` (3.5/5 → descritivos) e `discovery.prompt.md`
  (Phase 2 → 3). Campo `domains` reconciliado entre discovery e design.
  Referência ao diretório inexistente `ide-templates/` removida.

## [1.3.1] — 2026-08-03

### Fixed
- **Auditoria D1 — código TypeScript**: `--version`/`-v` não executa mais `init`.
  `--yes`/`-y` agora funciona (seleciona todos os IDEs automaticamente).
  `writeBridgeFile` não corrompe mais arquivos com frontmatter YAML (SKILL.md,
  `.mdc`). `--ide` sem valor não produz mais warning "Unknown IDE 'true'".
  Fase G.5 renomeada para H.5 no `architect.agent.yaml`. `model_tier` de
  pesquisador alinhado entre build e design/runner (`fast`).
  `template_selection` adicionado ao schema do `design.yaml`. Tier e domains
  de templates agora persistem no `discovery.yaml`.

## [1.3.0] — 2026-08-03

### Added
- **Instalação não-destrutiva**: `writeBridgeFile` com estratégia de blocos
  marcados (`<!-- opencrew:start/end -->`). `AGENTS.md` agora é uma ponte fina;
  sistema completo em `_opencrew/core/system.md`. Merge preserva conteúdo
  existente em todos os arquivos de bridge (CLAUDE.md, GEMINI.md, QWEN.md, etc.).
- **Sherlock multi-fonte**: novos extratores `sherlock-web.md` (pesquisa em
  sites públicos), `sherlock-seo.md` (keywords e content gaps), e
  `sherlock-trends.md` (trending topics de 9 fontes). Orquestração multi-fonte
  no `sherlock-shared.md` com matriz de seleção por tipo de crew.
- **Templates de crew por setor**: 4 templates em `templates/crews/`:
  blog-semanal, instagram-carrossel, newsletter-mensal, lancamento-produto.
  Template selection no Step 0 do Discovery.
- **Exportação multi-formato**: `export.prompt.md` com suporte a PDF
  (Playwright), CSV (compatível Excel), e formatted-post (por plataforma).
- **Criação por papéis**: `design.prompt.md` refatorado — Phase D = Role
  Proposal (sugere pessoas, não ferramentas), Phase E = Skill Mapping
  (resolve skills automaticamente). Tabela de mapeamento para 12 papéis.
- **Tiers de crew**: usuário escolhe Express/Standard/Full na criação.
  Impacto no número de agentes, checkpoints, Sherlock, e model_tier.
  Campo `tier` no `design.yaml` e `Default Tier` no `preferences.md`.
- **Aprendizado contínuo**: Post-Run Reflection com detecção de padrões
  recorrentes. Regras de Ouro após 3+ ocorrências. Crew Memory Rules
  injetadas no prompt dos agentes. Coluna `Score` no `runs.md`.
- **Registro compartilhado de agentes**: 5 agentes base em
  `_opencrew/agents/` (researcher, copywriter, reviewer, designer,
  strategist). Sistema `extends:` para herança de agentes. Gate 0c
  para validação de referências.
- **Criação dinâmica de skills**: Operation 3a no `skills.engine.md`
  para geração automática de SKILL.md. Skills geradas em
  `skills/.custom/` (não afetadas por `update`).

### Changed
- **85→91 testes** (eram 64 na v1.2.2). 103 arquivos no pacote npm.
- **Todas as 8 ideias do `IDEIAS.md` implementadas** (backlog zerado).

## [1.2.2] — 2026-08-02

### Fixed
- **`parseArgs` truncates values containing `=`**: flags like `--description=foo=bar`
  no longer lose everything after the second `=`.
- **`version` npm script uses `require()` in ESM project**: extracted to a dedicated
  `scripts/stamp-version.js` that uses proper ESM imports.
- **`skills.engine.md` numbering was out of order** in Operation 2 (Install a Skill):
  steps 3/4 repeated instead of continuing 5–9. Cross-references updated accordingly.
- **`init` now aborts when a workspace already exists** instead of proceeding with
  `overwrite: false` (which silently did nothing). It prints instructions to use
  `update` or reinstall from scratch.
- **`deleteDir` semantics**: now returns `false` when the path does not exist (was `true`).
- **`.env.example` placeholders** (`[REDACTED:API key param]`) removed — these were
  security-redaction artifacts from the tooling, not real file content. No code change.

### Added
- **Short flags**: `-y` (yes), `-v` (version), `-h` (help) now work alongside their
  `--long-form` equivalents.
- **`OPENCREW_CATALOG_URL` env var**: forks can override the skill catalog base URL
  without editing `catalog.json`. Documented in `CONTRIBUTING.md` → Forking.
- **`update` now warns** that catalog skills are fully overwritten before refreshing them.
- **`readJson` error messages now include the file path** (e.g. `Failed to read
  /path/to/package.json: file not found`).
- **`pickIdes` validates preselected IDs**: unknown IDs from `--ide` are filtered with
  a warning instead of being passed through silently.
- **`c.gray` removed** (unused). **`confirm()` removed** (dead code, never imported).
- **ESLint** (`eslint.config.js` + `npm run lint` + CI step) with `@eslint/js` flat config.
- **55 tests** (up from 30): new coverage for `paths.js`, `ui.js`, `fsx.js` error
  scenarios, `normalizeIdes` string input, CLI smoke tests.

### Changed
- **CI `npm audit` raised from `moderate` to `high`** to avoid spurious build failures
  from dev-dependency vulnerabilities without attack vectors.
- **Playwright config**: `channel: "chrome"` removed — uses bundled Chromium for better
  portability. `.mcp.json` now includes a `_comment` field explaining how to upgrade the
  pinned `@playwright/mcp` version.
- **Node version check** in `cli.js` now uses a proper semver comparison that handles
  `||` ranges (e.g. `>=18.0.0 || >=20.0.0`).

### Docs
- **`discovery.prompt.md`**: `crew_code` uniqueness is now self-service (`ls crews/`)
  instead of depending on the orchestrator to pass a list.
- **`runner.pipeline.md`**: language contract table documents all fixed PT-BR headers
  and the policy for adding new ones.
- **`CONTRIBUTING.md`**: new "Forking" section with catalog URL, package name, and
  publish instructions.

## [1.2.1] — 2026-08-02

### Changed
- **Menu discovery for repair**: the "My crews" menu entry now mentions `repair`, so the
  command introduced in 1.2.0 is discoverable from the menu and not only from the command
  routing table.
- **README**: standardized the project name as "OpenCrew" in prose (commands and the npm
  package name stay lowercase).

## [1.2.0] — 2026-08-02

### Fixed
- **Crews created without agent names**: some crews rendered their agents' functions
  (e.g. "Pesquisador") but not their persona names (e.g. "Pedro Pesquisa"). Root cause:
  `build.prompt.md` never specified the `crew-party.csv` schema, so the manifest could be
  generated without a `displayName` column — the exact column the Pipeline Runner reads to
  render agent names — even though the correct two-word names were present in each
  `.agent.md`. Build now documents the full CSV schema (header + example) and enforces it
  with a new blocking **Gate 0b: Crew-Party Manifest** that checks `displayName` exists and
  matches each agent's `.agent.md` `name:`.

### Added
- **`/opencrew repair <crew>`**: repairs an already-created crew whose manifest is missing
  agent names. It rebuilds `crew-party.csv` from the persona names already stored in each
  `.agent.md` (no re-generation of agents, research, or pipeline). New prompt at
  `_opencrew/core/prompts/repair.prompt.md`, routed via `AGENTS.md`.

### Migration
- To fix an existing crew that shows functions but no names:
  1. `npx @aksp/opencrew update` — refreshes the framework and installs the repair command.
  2. `/opencrew repair <crew>` — rewrites the crew's manifest with the correct names.
  `update` intentionally never touches `crews/`, so the repair step is required in addition
  to updating.

## [1.1.0] — 2026-08-01

### Fixed
- **Skill catalog URLs**: `/opencrew install` now fetches skills from the correct fork
  (`alberthpalhares/opencrew/templates/skills/`) instead of the upstream OpenSquad repo.
- **Publish workflow**: restored `push: tags` as the sole trigger — the actual release
  flow is `npm version` + `git push --tags`, not GitHub Releases. Documented in
  `CONTRIBUTING.md`.
- **Cross-platform test script**: replaced shell glob (`tests/*.test.js`) with an
  explicit file list so `npm test` works on Windows PowerShell + Node 20.
- **CI matrix**: test suite now runs on Ubuntu and Windows on every push/PR.

### Added
- **Test suite**: 30 tests (`node:test`) covering `fsx.js`, init, update, IDE bridge
  validation, and documentation contracts.
- **CI version-sync check**: `scripts/check-version-sync.js` fails the build if
  `.opencrew-version` drifts from `package.json`.
- **Playwright plugin warning**: `init` now warns Claude Code users to disable the
  native Playwright extension (opencrew ships its own via `.mcp.json`).

### Changed
- **Dashboard opt-in**: Pipeline Runner `state.json` writes are now gated on
  `Dashboard: enabled` in `preferences.md` (default: disabled). Removed the
  unconditional 10-second sleep at the end of every pipeline run.
- **Smaller fixes**: removed `AskUserQuestion` references from IDE-neutral files,
  corrected `update.js` comment about overwrite behavior, pinned `@playwright/mcp`
  version, removed stale root `skills/` directory (drifted duplicate of
  `templates/skills/`).

## [1.0.1] — 2026-08-01

### Changed
- API keys for optional skills are now requested conversationally in chat (during crew
  creation or skill install) instead of requiring the user to manually copy/edit `.env`
  beforehand. Values are collected and written to `.env` automatically.
- `init` no longer tells users to configure `.env` as a next step — no setup is required
  to start using opencrew.

## [1.0.0] — 2026-08-01

### Added
- npm-style installer: `npx @aksp/opencrew init` scaffolds a full opencrew workspace.
- `npx @aksp/opencrew update` refreshes only the framework (`_opencrew/core`, catalog
  skills, `AGENTS.md`) while preserving `crews/`, `_memory/`, IDE bridges and `.env`.
- Interactive IDE selection during `init` (or `--ide=`, `--all`, non-interactive fallback).
- Single source of truth: `AGENTS.md`. Every IDE receives only a thin bridge file that
  points to it — adding a new IDE is one entry in `src/lib/ides.js`.
- Version stamping via `_opencrew/.opencrew-version`, read by `update`.

### Notes
- Reformulation of the OpenSquad framework (originally by Renato Asse) published under
  the `opencrew` name by [aksp](https://www.npmjs.com/~aksp). MIT licensed.
